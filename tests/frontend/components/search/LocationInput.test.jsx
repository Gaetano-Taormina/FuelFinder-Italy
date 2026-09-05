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

    it('renders all sub-components and inputs', () => {
        renderComponent();
        expect(screen.getByPlaceholderText('ph_location')).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /search/i }).length).toBeGreaterThan(0);
        expect(screen.getByRole('button', { name: 'title_gps' })).toBeInTheDocument();
    });

    it('invokes fetchSuggestions when typing queries', async () => {
        renderComponent();
        const input = screen.getByPlaceholderText('ph_location');
        
        fireEvent.change(input, { target: { value: 'Roma' } });
        
        await waitFor(() => {
            expect(mockFetchSuggestions).toHaveBeenCalledWith('Roma');
        }, { interval: 5 });
    });

    it('clears suggestions when input text is too short', () => {
        renderComponent();
        const input = screen.getByPlaceholderText('ph_location');
        
        fireEvent.change(input, { target: { value: 'Ro' } });
        expect(mockClearSuggestions).toHaveBeenCalled();
    });

    it('executes coordinate search on search button click', async () => {
        renderComponent();
        const input = screen.getByPlaceholderText('ph_location');
        fireEvent.change(input, { target: { value: 'Milano' } });
        
        const searchBtn = screen.getAllByRole('button', { name: 'btn_search' })[0];
        fireEvent.click(searchBtn);

        await waitFor(() => {
            expect(mockSearchCoords).toHaveBeenCalledWith('Milano');
        }, { interval: 5 });
    });

    it('displays an alert when location search fails', async () => {
        mockSearchCoords.mockResolvedValueOnce(null);
        window.alert = vi.fn();
        
        renderComponent();
        const input = screen.getByPlaceholderText('ph_location');
        fireEvent.change(input, { target: { value: 'PostoInesistente' } });
        
        const searchBtn = screen.getAllByRole('button', { name: 'btn_search' })[0];
        fireEvent.click(searchBtn);

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('dyn_not_found');
        }, { interval: 5 });
        delete window.alert;
    });

    it('handles suggestion selection and updates input value', async () => {
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
        }, { interval: 5 });
    });

    it('sets dyn_current_pos on successful GPS location retrieval', async () => {
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
        }, { interval: 5 });
    });

    it('does not trigger search when input is empty or whitespace', () => {
        renderComponent();
        const input = screen.getByPlaceholderText('ph_location');
        fireEvent.change(input, { target: { value: '   ' } });
        
        const searchBtn = screen.getAllByRole('button', { name: 'btn_search' })[0];
        fireEvent.click(searchBtn);
        
        expect(mockSearchCoords).not.toHaveBeenCalled();
    });

    it('does not trigger search when input is dyn_current_pos', () => {
        renderComponent();
        const input = screen.getByPlaceholderText('ph_location');
        fireEvent.change(input, { target: { value: 'dyn_current_pos' } });
        
        const searchBtn = screen.getAllByRole('button', { name: 'btn_search' })[0];
        fireEvent.click(searchBtn);
        
        expect(mockSearchCoords).not.toHaveBeenCalled();
    });
});
