import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GPSButton from '../../../../src/components/search/GPSButton';
import { useGeolocation } from '../../../../src/hooks/useGeolocation';

vi.mock('../../../../src/hooks/useGeolocation', () => ({
    useGeolocation: vi.fn()
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key
    })
}));

describe('GPSButton Component', () => {
    it('dovrebbe renderizzare il bottone GPS', () => {
        useGeolocation.mockReturnValue({ isLocating: false, locate: vi.fn() });
        render(<GPSButton onLocationFound={vi.fn()} />);
        const btn = screen.getByRole('button', { name: 'title_gps' });
        expect(btn).toBeInTheDocument();
        expect(btn).not.toBeDisabled();
    });

    it('dovrebbe chiamare locate e onLocationFound quando cliccato', async () => {
        const mockLocate = vi.fn().mockResolvedValue({ lat: 45, lng: 9 });
        useGeolocation.mockReturnValue({ isLocating: false, locate: mockLocate });
        const mockOnLocationFound = vi.fn();
        
        render(<GPSButton onLocationFound={mockOnLocationFound} />);
        fireEvent.click(screen.getByRole('button', { name: 'title_gps' }));
        
        await waitFor(() => {
            expect(mockLocate).toHaveBeenCalled();
            expect(mockOnLocationFound).toHaveBeenCalledWith({ lat: 45, lng: 9 });
        });
    });

    it('dovrebbe mostrare un alert in caso di errore GPS', async () => {
        const mockLocate = vi.fn().mockRejectedValue(new Error('GPS Error'));
        useGeolocation.mockReturnValue({ isLocating: false, locate: mockLocate });
        window.alert = vi.fn();
        
        render(<GPSButton onLocationFound={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'title_gps' }));
        
        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('dyn_gps_error');
        });
        
        delete window.alert;
    });

    it('dovrebbe essere disabilitato se isLocating è true', () => {
        useGeolocation.mockReturnValue({ isLocating: true, locate: vi.fn() });
        render(<GPSButton onLocationFound={vi.fn()} />);
        expect(screen.getByRole('button', { name: 'title_gps' })).toBeDisabled();
    });
});
