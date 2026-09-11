import path from 'path';
import fs from 'fs';

const citiesDataPath = path.join(process.cwd(), 'server', 'data', 'cities.json');
const citiesData = JSON.parse(fs.readFileSync(citiesDataPath, 'utf8'));
export const cities = citiesData.map(c => c.name);

export const REGEX_EXPLORE = /^\/(it|en)\/(esplora|explore)\/?$/;
export const REGEX_CITY = /^\/(it|en)\/(citta|city)\/([^/]+)\/?(?:([^/]+)\/?)?$/;
export const REGEX_STATION = /^\/(it|en)\/(citta|city)\/([^/]+)\/(stazione|station)\/([0-9]+)(?:\/([^/]+))?\/?$/;
export const REGEX_HOME_LANG = /^\/(it|en)(?:\/([^/]+))?\/?$/;
export const REGEX_LANG_PREFIX = /^\/(it|en)/;

export const ALLOWED_FUELS = new Set(['benzina', 'gasolio', 'gpl', 'metano', 'hvo', 'gnl', 'petrol', 'diesel', 'lpg', 'methane', 'lng', 'cng']);

export const itToEnCities = Object.freeze({
    'roma': 'rome',
    'milano': 'milan',
    'napoli': 'naples',
    'venezia': 'venice',
    'firenze': 'florence',
    'torino': 'turin',
    'genova': 'genoa',
    'padova': 'padua',
    'siracusa': 'syracuse',
    'mantova': 'mantua'
});

export const enToItCities = Object.freeze({
    'rome': 'roma',
    'milan': 'milano',
    'naples': 'napoli',
    'venice': 'venezia',
    'florence': 'firenze',
    'turin': 'torino',
    'genova': 'genova',
    'padova': 'padova',
    'syracuse': 'siracusa',
    'mantua': 'mantova'
});

export const fuelToEn = Object.freeze({
    'Benzina': 'Petrol',
    'Gasolio': 'Diesel',
    'GPL': 'LPG',
    'Metano': 'CNG',
    'HVO': 'HVO',
    'GNL': 'LNG'
});

export const slugify = (text) => {
    return text.toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/['\s_]+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

export const escapeXml = (str) => {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
};

export const getSafeHost = (req) => {
    const rawHost = req?.get ? req.get('host') : null;
    if (rawHost && /^[a-zA-Z0-9.-]+(?::[0-9]{1,5})?$/.test(rawHost)) {
        const proto = req.protocol === 'http' && (rawHost.startsWith('localhost') || rawHost.startsWith('127.0.0.1')) ? 'http' : 'https';
        return `${proto}://${rawHost}`;
    }
    return 'https://fuelfinder-msn8.onrender.com';
};
