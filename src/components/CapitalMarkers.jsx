
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const capitals = [
    { name: 'Italy', capital: 'Rome', lat: 41.9028, lng: 12.4964, code: 'it', rotation: '12deg', isMirrored: false },
    { name: 'San Marino', capital: 'San Marino', lat: 43.9424, lng: 12.4578, code: 'sm', rotation: '8deg', isMirrored: false },
    { name: 'Vatican City', capital: 'Vatican', lat: 41.9022, lng: 12.4533, code: 'va', rotation: '-15deg', isMirrored: true, isSticker: false },
    { name: 'France', capital: 'Paris', lat: 48.8566, lng: 2.3522, code: 'fr', rotation: '-5deg', isMirrored: false },
    { name: 'Switzerland', capital: 'Bern', lat: 46.9480, lng: 7.4474, code: 'ch', rotation: '5deg', isMirrored: false },
    { name: 'Austria', capital: 'Vienna', lat: 48.2082, lng: 16.3738, code: 'at', rotation: '10deg', isMirrored: false },
    { name: 'Slovenia', capital: 'Ljubljana', lat: 46.0569, lng: 14.5058, code: 'si', rotation: '-8deg', isMirrored: false }
];

const flagSvgs = {
    it: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="1" height="2" fill="#009246"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ce2b37"/></svg>',
    fr: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="1" height="2" fill="#002395"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ed2939"/></svg>',
    at: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="3" height="2" fill="#ed2939"/><rect y="0.666" width="3" height="0.667" fill="#fff"/></svg>',
    ch: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#FF0000"/><path d="M13 6h6v7h7v6h-7v7h-6v-7H6v-6h7z" fill="#FFF"/></svg>',
    si: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 3"><rect width="6" height="3" fill="#ed1c24"/><rect width="6" height="2" fill="#005ce6"/><rect width="6" height="1" fill="#fff"/><rect x="1.2" y="0.5" width="1" height="1" rx="0.5" fill="#005ce6" stroke="#fff" stroke-width="0.1"/></svg>',
    sm: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="#5cb8e4"/><rect width="4" height="1.5" fill="#fff"/><circle cx="2" cy="1.5" r="0.6" fill="#fbbf24"/><rect x="1.7" y="1" width="0.6" height="1" fill="#fff"/></svg>',
    va: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><rect width="2" height="2" fill="#ffe000"/><rect x="1" width="1" height="2" fill="#fff"/><circle cx="1.5" cy="1" r="0.4" fill="#d4af37"/><path d="M1.3 0.8l0.4 0.4M1.7 0.8l-0.4 0.4" stroke="#000" stroke-width="0.1"/></svg>'
};

const capitalIcon = (code, rotation, isMirrored = false, isSticker = false) => {
    if (isSticker) {
        return L.divIcon({
            className: 'custom-capital-container',
            html: `
                <div class="hover:scale-110 transition-transform duration-300 z-50 flex flex-col items-center justify-end" 
                     style="width: 40px; height: 60px; filter: drop-shadow(2px 4px 4px rgba(0,0,0,0.5));">
                    <svg viewBox="0 0 24 24" fill="#fbbf24" stroke="#78350f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">
                        <path d="M4 22h16v-8l-8-5-8 5v8z" />
                        <path d="M10 22v-5a2 2 0 0 1 4 0v5" fill="#78350f" />
                        <path d="M8 9l4-3 4 3V4h-8z" />
                        <circle cx="12" cy="6.5" r="1.5" fill="#78350f" />
                        <path d="M12 1v3" />
                        <path d="M10.5 2.5h3" />
                    </svg>
                    <div style="width: 6px; height: 6px; background: #78350f; border-radius: 50%; margin-top: -3px; z-index: 10;"></div>
                </div>
            `,
            iconSize: [40, 60],
            iconAnchor: [20, 60]
        });
    }

    const anchorX = isMirrored ? 46 : 2;
    const typeClass = isMirrored ? 'mirrored' : 'normal';
    const waveClass = isMirrored ? 'animate-wave-mirrored' : 'animate-wave';

    return L.divIcon({
        className: 'custom-capital-container',
        html: `
            <div class="hover:scale-110 transition-transform duration-300 group z-50 flag-marker-wrapper">
                <div class="flag-wrapper flag-${code}">
                    <div class="flag-pole ${typeClass} bg-slate-700 dark:bg-slate-400 shadow-md border border-slate-800 dark:border-slate-300 group-hover:bg-blue-600 transition-colors"></div>
                    <div class="flag-finial ${typeClass}"></div>
                    <div class="flag-fabric ${typeClass} ${waveClass} shadow-lg border-y ${isMirrored ? 'border-l' : 'border-r'} border-slate-200/50 dark:border-slate-600/50">
                        <img src="data:image/svg+xml;utf8,${encodeURIComponent(flagSvgs[code] || flagSvgs['it'])}" class="flag-image ${typeClass}" alt="Bandiera" width="24" height="24">
                    </div>
                </div>
            </div>
        `,
        iconSize: [48, 56],
        iconAnchor: [anchorX, 56]
    });
};

export default function CapitalMarkers() {
    return (
        <>
            {capitals.map(cap => (
                <Marker 
                    key={cap.code} 
                    position={[cap.lat, cap.lng]} 
                    icon={capitalIcon(cap.code, cap.rotation, cap.isMirrored, cap.isSticker)} 
                    zIndexOffset={1000}
                >
                    <Popup className="custom-capital-popup" closeButton={false}>
                        <div className="text-center p-4 min-w-44 relative overflow-hidden rounded-2xl shadow-xl border-2 border-slate-300 dark:border-slate-600">
                            <div className="absolute inset-0 bg-cover bg-center opacity-90 dark:opacity-70" style={{ backgroundImage: `url('data:image/svg+xml;utf8,${encodeURIComponent(flagSvgs[cap.code] || flagSvgs['it'])}')` }}></div>
                            <div className="absolute inset-0 bg-white/30 dark:bg-slate-900/60"></div>
                            <div className="relative z-10 flex flex-col items-center">
                                <h4 className="font-black text-2xl text-slate-900 dark:text-white drop-shadow-lg tracking-wide uppercase mt-1">{cap.name}</h4>
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-3 bg-white/80 dark:bg-slate-800/80 px-3 py-1 rounded-full shadow-sm border border-slate-200/50 dark:border-slate-600/50">
                                    Capital: <span className="text-blue-700 dark:text-blue-400">{cap.capital}</span>
                                </div>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </>
    );
}
