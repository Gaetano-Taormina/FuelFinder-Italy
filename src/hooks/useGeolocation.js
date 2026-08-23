import { useState, useCallback } from 'react';

export function useGeolocation() {
    const [isLocating, setIsLocating] = useState(false);

    const locate = useCallback(() => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Geolocation not supported"));
                return;
            }

            setIsLocating(true);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setIsLocating(false);
                    resolve({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    });
                },
                (err) => {
                    setIsLocating(false);
                    reject(err);
                }
            );
        });
    }, []);

    return { isLocating, locate };
}
