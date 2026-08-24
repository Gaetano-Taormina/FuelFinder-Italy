import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LocationInput from '../../../../src/components/search/LocationInput';
import { StationsProvider } from '../../../../src/context/StationsContext';
import { useNominatim } from '../../../../src/hooks/useNominatim';

vi.mock('../../../../src/hooks/useNominatim', () => ({
    useNominatim: vi.fn()
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key
    })
}));

describe('LocationInput Component', () => {
    let mockFetchSuggestions, mockClearSuggestions, mockSearchCoords;

    beforeEach(() => {
        mockFetchSuggestions = vi.fn().mockResolvedValue([]);
        mockClearSuggestions = vi.fn();
        mockSearchCoords = vi.fn().mockResolvedValue({ lat: 45, lng: 9 });

        useNominatim.mockReturnValue({
            suggestions: [],
            fetchSuggestions: mockFetchSuggestions,
            clearSuggestions: mockClearSuggestions,
            searchCoords: mockSearchCoords
        });
    });

    const renderComponent = () => {
        return render(
            <MemoryRouter>
                <StationsProvider>
                    <LocationInput />
                </StationsProvider>
            </MemoryRouter>
        );
    };

    it('dovrebbe renderizzare tutti i sotto-componenti', () => {
        renderComponent();
        expect(screen.getByPlaceholderText('ph_location')).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /search/i }).length).toBeGreaterThan(0);
        expect(screen.getByRole('button', { name: 'title_gps' })).toBeInTheDocument();
    });

    it('dovrebbe chiamare fetchSuggestions quando si digita testo lungo', async () => {
        renderComponent();
        const input = screen.getByPlaceholderText('ph_location');
        
        fireEvent.change(input, { target: { value: 'Roma' } });
        
        await waitFor(() => {
            expect(mockFetchSuggestions).toHaveBeenCalledWith('Roma');
        });
    });

    it('dovrebbe cancellare i suggerimenti se il testo è corto', () => {
        renderComponent();
        const input = screen.getByPlaceholderText('ph_location');
        
        fireEvent.change(input, { target: { value: 'Ro' } });
        expect(mockClearSuggestions).toHaveBeenCalled();
    });

    it('dovrebbe eseguire la ricerca su click del bottone search', async () => {
        renderComponent();
        const input = screen.getByPlaceholderText('ph_location');
        fireEvent.change(input, { target: { value: 'Milano' } });
        
        const searchBtn = screen.getAllByRole('button', { name: 'btn_search' })[0];
        fireEvent.click(searchBtn);

        await waitFor(() => {
            expect(mockSearchCoords).toHaveBeenCalledWith('Milano');
        });
    });

    it('dovrebbe mostrare un alert se la ricerca fallisce', async () => {
        mockSearchCoords.mockResolvedValueOnce(null);
        window.alert = vi.fn();
        
        renderComponent();
        const input = screen.getByPlaceholderText('ph_location');
        fireEvent.change(input, { target: { value: 'PostoInesistente' } });
        
        const searchBtn = screen.getAllByRole('button', { name: 'btn_search' })[0];
        fireEvent.click(searchBtn);

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('dyn_not_found');
        });
        delete window.alert;
    });

    it('dovrebbe gestire la selezione di un suggerimento', async () => {
        useNominatim.mockReturnValue({
            suggestions: [{ place_id: 1, display_name: 'Torino', lat: '45.0', lon: '7.6' }],
            fetchSuggestions: mockFetchSuggestions,
            clearSuggestions: mockClearSuggestions,
            searchCoords: mockSearchCoords
        });
        
        renderComponent();
        const input = screen.getByPlaceholderText('ph_location');
        fireEvent.change(input, { target: { value: 'Torino' } });
        fireEvent.focus(input);
        
        const listItem = screen.getByText('Torino');
        fireEvent.click(listItem);
        
        await waitFor(() => {
            expect(input.value).toBe('Torino');
        });
    });

    it('dovrebbe impostare dyn_current_pos al completamento del GPS', async () => {
        const mockGeolocation = {
            getCurrentPosition: vi.fn().mockImplementation((success) => 
                success({ coords: { latitude: 45, longitude: 9 } })
            ),
        };
        Object.defineProperty(global.navigator, 'geolocation', {
            value: mockGeolocation,
            configurable: true
        });
        
        renderComponent();
        const gpsBtn = screen.getByRole('button', { name: 'title_gps' });
        fireEvent.click(gpsBtn);
        
        await waitFor(() => {
            const input = screen.getByPlaceholderText('ph_location');
            expect(input.value).toBe('dyn_current_pos');
        });
    });

    it('non dovrebbe eseguire la ricerca se l\'input è vuoto', () => {
        renderComponent();
        const input = screen.getByPlaceholderText('ph_location');
        fireEvent.change(input, { target: { value: '   ' } });
        
        const searchBtn = screen.getAllByRole('button', { name: 'btn_search' })[0];
        fireEvent.click(searchBtn);
        
        expect(mockSearchCoords).not.toHaveBeenCalled();
    });

    it('non dovrebbe eseguire la ricerca se l\'input è dyn_current_pos', () => {
        renderComponent();
        const input = screen.getByPlaceholderText('ph_location');
        fireEvent.change(input, { target: { value: 'dyn_current_pos' } });
        
        const searchBtn = screen.getAllByRole('button', { name: 'btn_search' })[0];
        fireEvent.click(searchBtn);
        
        expect(mockSearchCoords).not.toHaveBeenCalled();
    });
});
