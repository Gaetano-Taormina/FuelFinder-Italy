import { useTranslation } from 'react-i18next';
import { useGeolocation } from '../../hooks/useGeolocation';

export default function GPSButton({ onLocationFound }) {
    const { t } = useTranslation();
    const { isLocating, locate } = useGeolocation();

    const handleGPS = async () => {
        try {
            const coords = await locate();
            onLocationFound(coords);
        } catch (err) {
            alert(t('dyn_gps_error'));
        }
    };

    return (
        <button 
            onClick={handleGPS} 
            aria-label={t('title_gps')} 
            disabled={isLocating} 
            title={t('title_gps')} 
            className="btn-secondary"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6" />
            </svg>
        </button>
    );
}
