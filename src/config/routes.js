export const ROUTES = {
  it: {
    home: '/',
    cityPrefix: 'citta',
    explore: 'esplora'
  },
  en: {
    home: '/',
    cityPrefix: 'city',
    explore: 'explore'
  }
};

export const getCityPath = (lang, city) => {
  const prefix = ROUTES[lang]?.cityPrefix || ROUTES.it.cityPrefix;
  return `/${lang}/${prefix}/${encodeURIComponent(city)}`;
};

export const getExplorePath = (lang) => {
  const explore = ROUTES[lang]?.explore || ROUTES.it.explore;
  return `/${lang}/${explore}`;
};
