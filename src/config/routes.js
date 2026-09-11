export const ROUTES = {
  it: {
    home: '/',
    cityPrefix: 'citta',
    stationPrefix: 'stazione',
    explore: 'esplora'
  },
  en: {
    home: '/',
    cityPrefix: 'city',
    stationPrefix: 'station',
    explore: 'explore'
  }
};

export const getCityPath = (lang, city) => {
  const prefix = ROUTES[lang]?.cityPrefix || ROUTES.it.cityPrefix;
  return `/${lang}/${prefix}/${encodeURIComponent(city)}`;
};

export const getStationPath = (lang, city, stationId, fuel) => {
  const cityPrefix = ROUTES[lang]?.cityPrefix || ROUTES.it.cityPrefix;
  const stationPrefix = ROUTES[lang]?.stationPrefix || ROUTES.it.stationPrefix;
  const basePath = `/${lang}/${cityPrefix}/${encodeURIComponent(city)}/${stationPrefix}/${stationId}`;
  return fuel ? `${basePath}/${fuel.toLowerCase()}` : basePath;
};

export const getExplorePath = (lang) => {
  const explore = ROUTES[lang]?.explore || ROUTES.it.explore;
  return `/${lang}/${explore}`;
};

