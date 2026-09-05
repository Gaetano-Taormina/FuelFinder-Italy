import zlib from 'node:zlib';

/**
 * Middleware di compressione nativo multi-formato a zero dipendenze.
 * Supporta in ordine di priorità:
 * 1. Zstandard (zstd) - massimo throughput e decompressione ultra-veloce (RFC 8878)
 * 2. Brotli (br) - standard per payload testuali web moderni
 * 3. Gzip (gzip) - compatibilità universale
 *
 * @param {object} [options]
 * @param {number} [options.threshold=1024] - Soglia minima in byte per attivare la compressione
 */
export function modernCompression(options = {}) {
    const threshold = options.threshold ?? 1024;
    const hasZstd = typeof zlib.createZstdCompress === 'function';
    const hasBrotli = typeof zlib.createBrotliCompress === 'function';

    return (req, res, next) => {
        const acceptEncoding = req.headers['accept-encoding'] || '';

        // Non comprimere per richieste HEAD o se il client non accetta encoding
        if (req.method === 'HEAD' || !acceptEncoding) {
            return next();
        }

        let selectedEncoding = null;
        let createCompressor = null;

        if (hasZstd && acceptEncoding.includes('zstd')) {
            selectedEncoding = 'zstd';
            createCompressor = () => zlib.createZstdCompress();
        } else if (hasBrotli && acceptEncoding.includes('br')) {
            selectedEncoding = 'br';
            createCompressor = () => zlib.createBrotliCompress({
                params: {
                    [zlib.constants.BROTLI_PARAM_QUALITY]: 4,
                }
            });
        } else if (acceptEncoding.includes('gzip')) {
            selectedEncoding = 'gzip';
            createCompressor = () => zlib.createGzip({ level: 6 });
        } else if (acceptEncoding.includes('deflate')) {
            selectedEncoding = 'deflate';
            createCompressor = () => zlib.createDeflate();
        }

        if (!selectedEncoding || !createCompressor) {
            return next();
        }

        res.setHeader('Vary', 'Accept-Encoding');

        const originalWrite = res.write.bind(res);
        const originalEnd = res.end.bind(res);

        const chunks = [];
        let totalLength = 0;
        let isEnded = false;

        res.write = function (chunk, encoding, callback) {
            if (isEnded) return false;
            if (!chunk) return true;

            const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof encoding === 'string' ? encoding : 'utf8');
            chunks.push(buf);
            totalLength += buf.length;
            if (typeof callback === 'function') callback();
            return true;
        };

        res.end = function (chunk, encoding, callback) {
            if (isEnded) return;
            isEnded = true;

            if (chunk) {
                const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof encoding === 'string' ? encoding : 'utf8');
                chunks.push(buf);
                totalLength += buf.length;
            }

            const fullBuffer = Buffer.concat(chunks, totalLength);

            const contentType = res.getHeader('Content-Type') || '';
            const isCompressible = typeof contentType === 'string' && (
                contentType.includes('json') ||
                contentType.includes('text') ||
                contentType.includes('javascript') ||
                contentType.includes('xml') ||
                contentType.includes('svg')
            );

            if (!isCompressible || totalLength < threshold || totalLength === 0) {
                return originalEnd(fullBuffer, callback);
            }

            res.setHeader('Content-Encoding', selectedEncoding);
            res.removeHeader('Content-Length');

            if (selectedEncoding === 'zstd' && typeof zlib.zstdCompressSync === 'function') {
                try {
                    const compressed = zlib.zstdCompressSync(fullBuffer);
                    res.setHeader('Content-Length', compressed.length);
                    return originalEnd(compressed, callback);
                } catch {}
            } else if (selectedEncoding === 'br' && typeof zlib.brotliCompressSync === 'function') {
                try {
                    const compressed = zlib.brotliCompressSync(fullBuffer, {
                        params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 }
                    });
                    res.setHeader('Content-Length', compressed.length);
                    return originalEnd(compressed, callback);
                } catch {}
            } else if (selectedEncoding === 'gzip') {
                try {
                    const compressed = zlib.gzipSync(fullBuffer, { level: 6 });
                    res.setHeader('Content-Length', compressed.length);
                    return originalEnd(compressed, callback);
                } catch {}
            }

            // Stream fallback
            const compressor = createCompressor();
            compressor.on('data', (c) => originalWrite(c));
            compressor.on('end', () => originalEnd(callback));
            compressor.end(fullBuffer);
        };

        next();
    };
}
