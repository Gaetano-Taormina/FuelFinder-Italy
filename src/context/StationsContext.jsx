import { createContext, useState, useEffect, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import useSWR from 'swr';

const StationsContext = createContext();

export const useStations = () => useContext(StationsContext);

const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Network response was not ok');
  return res.json();
};

export const StationsProvider = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Mapping for URL translation
  const fuelToEn = { 'Benzina': 'Petrol', 'Gasolio': 'Diesel', 'GPL': 'LPG', 'Metano': 'CNG' };
  const enToFuel = { 'Petrol': 'Benzina', 'Diesel': 'Gasolio', 'LPG': 'GPL', 'CNG': 'Metano' };

  const rawFuel = searchParams.get('fuel') || searchParams.get('carburante');
  let initialFuel = 'Benzina';
  if (rawFuel) {
      initialFuel = enToFuel[rawFuel] || rawFuel;
  }

  // Filters State
  const [locationStr, setLocationStr] = useState('');
  const [radius, setRadius] = useState(5);
  const [fuelType, setFuelTypeInternal] = useState(initialFuel);
  const [serviceType, setServiceType] = useState('1'); // '1' = self, '0' = served, 'entrambi' = both

  const setFuelType = (type) => {
    setFuelTypeInternal(type);
    const newParams = new URLSearchParams(searchParams);
    
    // Check current language from pathname
    const isEn = window.location.pathname.startsWith('/en');
    const urlFuel = isEn ? (fuelToEn[type] || type) : type;
    const key = isEn ? 'fuel' : 'carburante';
    const oldKey = isEn ? 'carburante' : 'fuel';
    
    newParams.delete(oldKey);
    newParams.set(key, urlFuel);
    setSearchParams(newParams, { replace: true });
  };

  // Map and user location state
  const [userPos, setUserPos] = useState(null); // { lat, lng }
  
  // Selected Station State
  const [selectedStation, setSelectedStation] = useState(null);
  const [routeData, setRouteData] = useState(null);

  // SWR Fetch for Stations (Caching & Optimistic UI)
  const stationsUrl = userPos 
    ? `/api/stations?lat=${userPos.lat}&lng=${userPos.lng}&radius=${radius}&fuelType=${encodeURIComponent(fuelType)}&serviceType=${serviceType}` 
    : null;

  const { data: stationsData, error, isLoading, isValidating } = useSWR(stationsUrl, fetcher, {
    keepPreviousData: true, // Abilita Optimistic UI (mostra i vecchi dati mentre carica i nuovi)
    revalidateOnFocus: false, // Evita chiamate inutili tornando alla tab
    dedupingInterval: 10000 // Cache le richieste identiche per 10 secondi
  });

  const stations = stationsData?.stations || (Array.isArray(stationsData) ? stationsData : []);
  const totalStations = stationsData?.totalCount || stations.length || 0;
  
  // Usiamo isValidating per capire se SWR sta facendo un fetch in background,
  // così possiamo mostrare uno skeleton o dimming senza far sparire la tabella.
  const loading = isLoading;
  const isFetchingBackground = isValidating && !isLoading;

  // Fetch route when a station is selected
  useEffect(() => {
    if (!selectedStation || !userPos) {
      setRouteData(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${userPos.lng},${userPos.lat};${selectedStation.lng},${selectedStation.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          setRouteData({
            geometry: data.routes[0].geometry,
            distance: data.routes[0].distance,
            duration: data.routes[0].duration
          });
        }
      } catch (err) {
        console.error("OSRM Route Error", err);
      }
    };
    fetchRoute();
  }, [selectedStation, userPos]);

  const handleNavigation = (station) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);
    const stationName = encodeURIComponent(station.brand || station.name);

    if (isAndroid) {
        // Su Android, geo: triggera il menu nativo del sistema operativo (es. Maps, Waze, ecc.)
        window.location.href = `geo:${station.lat},${station.lng}?q=${station.lat},${station.lng}(${stationName})`;
    } else if (isIOS) {
        // Su iOS, aprirà Mappe nativamente
        window.location.href = `maps://?q=${stationName}&ll=${station.lat},${station.lng}`;
    } else {
        // Su PC/Desktop va dritto a Google Maps nel browser
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`, '_blank');
    }
  };

  return (
    <StationsContext.Provider value={{
      stations, totalStations,
      loading, isFetchingBackground, error,
      locationStr, setLocationStr,
      radius, setRadius,
      fuelType, setFuelType,
      serviceType, setServiceType,
      userPos, setUserPos,
      selectedStation, setSelectedStation,
      routeData,
      handleNavigation
    }}>
      {children}
    </StationsContext.Provider>
  );
};
