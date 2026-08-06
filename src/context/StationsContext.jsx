import { createContext, useState, useEffect, useContext } from 'react';

const StationsContext = createContext();

export const useStations = () => useContext(StationsContext);

export const StationsProvider = ({ children }) => {
  const [stations, setStations] = useState([]);
  const [totalStations, setTotalStations] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters State
  const [locationStr, setLocationStr] = useState('');
  const [radius, setRadius] = useState(5);
  const [fuelType, setFuelType] = useState('Benzina');
  const [serviceType, setServiceType] = useState('1'); // '1' = self, '0' = served, 'entrambi' = both

  // Map and user location state
  const [userPos, setUserPos] = useState(null); // { lat, lng }
  
  // Selected Station State
  const [selectedStation, setSelectedStation] = useState(null);
  const [routeData, setRouteData] = useState(null);

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
  
  useEffect(() => {
    if (!userPos) {
      setStations([]);
      setTotalStations(0);
      setLoading(false);
      return;
    }
    const loadData = async () => {
      setLoading(true);
      try {
        const url = `/api/stations?lat=${userPos.lat}&lng=${userPos.lng}&radius=${radius}&fuelType=${encodeURIComponent(fuelType)}&serviceType=${serviceType}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        if (data && data.stations) {
            setStations(data.stations);
            setTotalStations(data.totalCount || data.stations.length);
        } else if (Array.isArray(data)) {
            setStations(data);
            setTotalStations(data.length);
        } else {
            setStations([]);
            setTotalStations(0);
        }
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userPos, radius, fuelType, serviceType]);

  return (
    <StationsContext.Provider value={{
      stations, setStations, totalStations,
      loading, error,
      locationStr, setLocationStr,
      radius, setRadius,
      fuelType, setFuelType,
      serviceType, setServiceType,
      userPos, setUserPos,
      selectedStation, setSelectedStation,
      routeData
    }}>
      {children}
    </StationsContext.Provider>
  );
};
