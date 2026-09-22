import { Marker, Popup } from 'react-leaflet';
import { memo, useMemo } from 'react';
import L from 'leaflet';

const capitals = [
    { name: 'Italy', capital: 'Rome', lat: 41.9028, lng: 12.4964, code: 'it', rotation: '12deg', isMirrored: false },
    { name: 'San Marino', capital: 'San Marino', lat: 43.9424, lng: 12.4578, code: 'sm', rotation: '8deg', isMirrored: true },
    { name: 'Vatican City', capital: 'Vatican', lat: 41.9022, lng: 12.4533, code: 'va', rotation: '-15deg', isMirrored: true },
    { name: 'France', capital: 'Paris', lat: 48.8566, lng: 2.3522, code: 'fr', rotation: '-5deg', isMirrored: false },
    { name: 'Switzerland', capital: 'Bern', lat: 46.9480, lng: 7.4474, code: 'ch', rotation: '5deg', isMirrored: false },
    { name: 'Austria', capital: 'Vienna', lat: 48.2082, lng: 16.3738, code: 'at', rotation: '10deg', isMirrored: false },
    { name: 'Slovenia', capital: 'Ljubljana', lat: 46.0569, lng: 14.5058, code: 'si', rotation: '-8deg', isMirrored: false }
];

const capitalIcon = (code, _rotation, isMirrored = false) => {
    const anchorX = isMirrored ? 46 : 2;
    const typeClass = isMirrored ? 'mirrored' : 'normal';
    const waveClass = isMirrored ? 'animate-wave-mirrored' : 'animate-wave';
    const flagUrl = `https://flagcdn.com/${code}.svg`;

    return L.divIcon({
        className: 'custom-capital-container',
        html: `
            <div class="hover:scale-110 transition-transform duration-300 group z-50 flag-marker-wrapper">
                <div class="flag-wrapper flag-${code}">
                    <div class="flag-pole ${typeClass} bg-slate-700 dark:bg-slate-400 shadow-md border border-slate-800 dark:border-slate-300 group-hover:bg-blue-600 transition-colors"></div>
                    <div class="flag-finial ${typeClass}"></div>
                    <div class="flag-fabric ${typeClass} ${waveClass} shadow-lg border-y ${isMirrored ? 'border-l' : 'border-r'} border-slate-200/50 dark:border-slate-600/50" style="overflow: hidden;">
                        <img src="${flagUrl}" class="flag-image ${typeClass}" alt="Bandiera" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                </div>
            </div>
        `,
        iconSize: [48, 56],
        iconAnchor: [anchorX, 56]
    });
};

const CapitalMarker = memo(function CapitalMarker({ cap }) {
    const position = useMemo(() => [cap.lat, cap.lng], [cap.lat, cap.lng]);
    const icon = useMemo(() => capitalIcon(cap.code, cap.rotation, cap.isMirrored), [cap.code, cap.rotation, cap.isMirrored]);
    const bgStyle = useMemo(() => ({ backgroundImage: `url('https://flagcdn.com/${cap.code}.svg')` }), [cap.code]);

    return (
        <Marker position={position} icon={icon} zIndexOffset={1000}>
            <Popup className="custom-capital-popup" closeButton={false}>
                <div className="text-center p-4 min-w-44 relative overflow-hidden rounded-2xl shadow-xl border-2 border-slate-300 dark:border-slate-600">
                    <div className="absolute inset-0 bg-cover bg-center opacity-90 dark:opacity-70" style={bgStyle}></div>
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
    );
});

export default function CapitalMarkers() {
    return (
        <>
            {capitals.map(cap => (
                <CapitalMarker key={cap.code} cap={cap} />
            ))}
        </>
    );
}
