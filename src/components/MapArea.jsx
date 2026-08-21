import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { useStations } from '../context/StationsContext';
import { useDistanceLogic } from '../hooks/useDistance';
import { formatStationName } from '../utils/formatters';
import CapitalMarkers from './CapitalMarkers';
import MarkerClusterGroup from 'react-leaflet-cluster';

// Fix default icon issue with Leaflet and Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/assets/img/marker-icon-2x.png',
  iconUrl: '/assets/img/marker-icon.png',
  shadowUrl: '/assets/img/marker-shadow.png',
});

const defaultCenter = [41.9028, 12.4964];

function LocationMarker() {
  const { t } = useTranslation();
  const { userPos, setUserPos, setLocationStr } = useStations();
  const map = useMap();

  useEffect(() => {
    if (userPos) {
      map.flyTo([userPos.lat, userPos.lng], 13, { duration: 4.5, easeLinearity: 0.25 });
    }
  }, [userPos, map]);

  useMapEvents({
    click(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      
      setUserPos({ lat, lng, type: 'click' });
      setLocationStr(t('dyn_map_point'));
    },
  });

  const gpsIcon = L.divIcon({
    className: 'custom-gps-marker',
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <div class="absolute inset-0 bg-blue-500 rounded-full opacity-50 animate-ping"></div>
        <div class="relative w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  const manualIcon = L.divIcon({
    className: 'custom-manual-marker',
    html: `
      <div class="relative flex flex-col items-center drop-shadow-md">
        <div class="w-5 h-5 bg-rose-500 border-2 border-white rounded-full z-10 flex items-center justify-center">
            <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
        <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-8 border-t-rose-500 -mt-1 z-0"></div>
      </div>
    `,
    iconSize: [20, 28],
    iconAnchor: [10, 28]
  });

  const activeIcon = userPos && userPos.type === 'gps' ? gpsIcon : manualIcon;

  return userPos ? (
    <Marker position={[userPos.lat, userPos.lng]} icon={activeIcon}>
      <Popup>{t('your_position')}</Popup>
    </Marker>
  ) : null;
}

function StationMarkers({ stations }) {
  const { t } = useTranslation();
  const { setSelectedStation } = useStations();
  
  const createIcon = (price, isBest) => {
    // Colori migliorati per alto contrasto (Orange per la scelta consigliata)
    const colorClass = isBest ? 'bg-orange-500 border-orange-700' : 'bg-blue-600 border-blue-800';
    const textColor = 'text-white';
    const triangleColor = isBest ? 'border-t-orange-700' : 'border-t-blue-800';
    
    return L.divIcon({
      className: 'custom-price-marker',
      isBestPrice: isBest,
      html: `
        <div class="relative flex flex-col items-center hover:scale-125 transition-transform origin-bottom drop-shadow-lg">
          <div class="${colorClass} ${textColor} font-black text-sm px-2.5 py-1.5 rounded-lg border-2 whitespace-nowrap flex items-center justify-center leading-none">
            ${price.toFixed(3)} €
          </div>
          <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-8 ${triangleColor} -mt-0.5"></div>
        </div>`,
      iconSize: [64, 42],
      iconAnchor: [32, 42] // La punta esatta del triangolo indica la coordinata GPS
    });
  };

  return stations.map((st, i) => (
    <Marker 
      key={st.id} 
      position={[st.lat, st.lng]} 
      icon={createIcon(st.currentPrice, i === 0)}
      eventHandlers={{
        click: () => setSelectedStation(st),
      }}
    >
      <Popup>
        <div className="font-bold text-lg dark:text-white">{formatStationName(st.brand || st.name)}</div>
        <div className="text-sm text-slate-700 dark:text-slate-300">{st.address}</div>
        <div className="text-blue-600 dark:text-blue-400 font-bold mt-2">{t('price_label')} {st.currentPrice} €</div>
      </Popup>
    </Marker>
  ));
}

function MapFixer() {
  const map = useMap();
  const { selectedStation } = useStations();

  useEffect(() => {
    // Forza il ricalcolo delle dimensioni della mappa dopo il mount 
    // e l'applicazione delle classi CSS per evitare glitch visivi
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300);
    return () => clearTimeout(timer);
  }, [map]);

  // Centra la mappa sulla stazione selezionata (es. quando cambia il tipo di carburante o si entra in una città)
  useEffect(() => {
    if (selectedStation) {
      // Zoom 15 per concentrarsi sul distributore
      map.flyTo([selectedStation.lat, selectedStation.lng], 15, { duration: 2 });
    }
  }, [selectedStation, map]);

  return null;
}

export default function MapArea() {
  const { userPos, radius, routeData, loading } = useStations();
  const filteredStations = useDistanceLogic();

  const europeBounds = [
    [34.0, -10.0], // Sud Ovest
    [71.0, 40.0]   // Nord Est
  ];

  return (
    <div className="w-full h-[55vh] md:h-150 rounded-[30px] shadow-lg overflow-hidden border-4 border-slate-300 dark:border-slate-600 relative z-0 mb-8 md:mb-0">
      {loading && (
        <div className="absolute inset-0 z-1000 flex items-center justify-center bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm animate-pulse">
          <div className="flex flex-col items-center gap-4">
               <svg className="w-16 h-16 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
               </svg>
               <div className="h-4 w-32 bg-slate-500 dark:bg-slate-400 rounded-full"></div>
          </div>
        </div>
      )}

      <MapContainer 
        center={defaultCenter} 
        zoom={6} 
        minZoom={5}
        maxBounds={europeBounds}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        tap={false}
      >
        <MapFixer />
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            tileloadstart: (e) => {
              if (e.tile) {
                e.tile.setAttribute('fetchpriority', 'high');
              }
            }
          }}
        />
        <LocationMarker />
        <CapitalMarkers />
        {userPos && <Circle center={[userPos.lat, userPos.lng]} radius={radius * 1000} color="#3b82f6" fillColor="#3b82f6" fillOpacity={0.1} />}
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={50}
          iconCreateFunction={(cluster) => {
            const hasBestPrice = cluster.getAllChildMarkers().some(m => m.options.icon.options.isBestPrice);
            
            const outerColor = hasBestPrice ? 'bg-amber-500/90 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-blue-600/90 shadow-[0_0_15px_rgba(37,99,235,0.5)]';
            const innerColor = hasBestPrice ? 'bg-amber-900/80 border-amber-300/50' : 'bg-slate-900/80 border-blue-300/50';
            const textColor = hasBestPrice ? 'text-amber-100' : 'text-white';

            return L.divIcon({
              html: `<div class="relative flex items-center justify-center w-12 h-12 ${outerColor} backdrop-blur-md rounded-full border-4 border-white/80 z-50 transition-transform hover:scale-110">
                       <div class="flex items-center justify-center w-8 h-8 ${innerColor} rounded-full border-2 shadow-inner">
                         <span class="${textColor} font-black text-sm drop-shadow-md">${cluster.getChildCount()}</span>
                       </div>
                     </div>`,
              className: 'custom-cluster-icon',
              iconSize: L.point(48, 48, true),
            });
          }}
        >
          <StationMarkers stations={filteredStations} />
        </MarkerClusterGroup>
        {routeData && (
          <>
            {/* Outline del percorso */}
            <GeoJSON 
              key={'outline-'+JSON.stringify(routeData.geometry)}
              data={routeData.geometry} 
              style={{ color: '#1e3a8a', weight: 8, opacity: 0.6, lineCap: 'round', lineJoin: 'round' }} 
            />
            {/* Linea interna del percorso */}
            <GeoJSON 
              key={'inner-'+JSON.stringify(routeData.geometry)}
              data={routeData.geometry} 
              style={{ color: '#3b82f6', weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }} 
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}
