import zlib from 'node:zlib';

/**
 * Middleware di compressione nativo multi-formato a zero dipendenze.
 * Supporta in ordine di priorità:
 * 1. Zstandard (zstd) - massimo throughput e decompressione ultra-veloce (RFC 8878)
 * 2. Brotli (br) - standard per payload testuali web moderni
 * 3. Gzip (gzip) - compatibilità universale
 * 4. Deflate (deflate)
 *
 * @param {object} [options]
 * @param {number} [options.threshold=1024] - Soglia minima in byte per attivare la compressione
 */
function toBuffer(chunk, encoding) {
    if (Buffer.isBuffer(chunk)) return chunk;
    return Buffer.from(chunk, typeof encoding === 'string' ? encoding : 'utf8');
}

export function modernCompression(options = {}) {
    const threshold = options.threshold ?? 1024;
    const hasZstd = typeof zlib.zstdCompressSync === 'function';
    const hasBrotli = typeof zlib.brotliCompressSync === 'function';

    return (req, res, next) => {
        const acceptEncoding = req.headers['accept-encoding'] || '';

        // Non comprimere per richieste HEAD o se il client non accetta encoding
        if (req.method === 'HEAD' || !acceptEncoding) {
            return next();
        }

        let selectedEncoding = null;
        let compressSync = null;

        if (hasZstd && acceptEncoding.includes('zstd')) {
            selectedEncoding = 'zstd';
            compressSync = (buf) => zlib.zstdCompressSync(buf);
        } else if (hasBrotli && acceptEncoding.includes('br')) {
            selectedEncoding = 'br';
            compressSync = (buf) => zlib.brotliCompressSync(buf, {
                params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 }
            });
        } else if (acceptEncoding.includes('gzip')) {
            selectedEncoding = 'gzip';
            compressSync = (buf) => zlib.gzipSync(buf, { level: 6 });
        } else if (acceptEncoding.includes('deflate')) {
            selectedEncoding = 'deflate';
            compressSync = (buf) => zlib.deflateSync(buf);
        }

        if (!selectedEncoding || !compressSync) {
            return next();
        }

        res.setHeader('Vary', 'Accept-Encoding');

        const originalEnd = res.end.bind(res);
        const chunks = [];
        let totalLength = 0;
        let isEnded = false;

        res.write = function (chunk, encoding, callback) {
            if (isEnded) return false;
            if (!chunk) return true;

            const buf = toBuffer(chunk, encoding);
            chunks.push(buf);
            totalLength += buf.length;
            if (typeof callback === 'function') callback();
            return true;
        };

        res.end = function (chunk, encoding, callback) {
            if (isEnded) return;
            isEnded = true;

            if (chunk) {
                const buf = toBuffer(chunk, encoding);
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

            const compressed = compressSync(fullBuffer);
            res.setHeader('Content-Encoding', selectedEncoding);
            res.setHeader('Content-Length', compressed.length);
            return originalEnd(compressed, callback);
        };

        next();
    };
}
