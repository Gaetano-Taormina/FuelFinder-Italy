import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LocationAutocomplete from '../../../../src/components/search/LocationAutocomplete';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key
    })
}));

describe('LocationAutocomplete Component', () => {
    const mockProps = {
        value: '',
        onChange: vi.fn(),
        onSearch: vi.fn(),
        suggestions: [],
        showSuggestions: false,
        setShowSuggestions: vi.fn(),
        onSuggestionClick: vi.fn()
    };

    it('dovrebbe renderizzare l\'input', () => {
        render(<LocationAutocomplete {...mockProps} />);
        expect(screen.getByPlaceholderText('ph_location')).toBeInTheDocument();
    });

    it('dovrebbe gestire il focus e onKeyDown', () => {
        render(<LocationAutocomplete {...mockProps} suggestions={[{place_id: 1}]} />);
        const input = screen.getByPlaceholderText('ph_location');
        
        fireEvent.focus(input);
        expect(mockProps.setShowSuggestions).toHaveBeenCalledWith(true);
        
        fireEvent.keyDown(input, { key: 'Escape' });
        expect(mockProps.onSearch).not.toHaveBeenCalled();

        fireEvent.keyDown(input, { key: 'Enter' });
        expect(mockProps.onSearch).toHaveBeenCalled();
    });

    it('dovrebbe renderizzare i suggerimenti e gestire il click', () => {
        const suggestions = [{ place_id: '1', display_name: 'Roma' }];
        render(<LocationAutocomplete {...mockProps} suggestions={suggestions} showSuggestions={true} />);
        
        const listItem = screen.getByText('Roma');
        expect(listItem).toBeInTheDocument();
        
        fireEvent.click(listItem);
        expect(mockProps.onSuggestionClick).toHaveBeenCalledWith(suggestions[0]);
    });

    it('dovrebbe chiudere i suggerimenti cliccando fuori', () => {
        render(
            <div>
                <div data-testid="outside">Outside</div>
                <LocationAutocomplete {...mockProps} suggestions={[{place_id: 1}]} showSuggestions={true} />
            </div>
        );
        
        fireEvent.mouseDown(screen.getByTestId('outside'));
        expect(mockProps.setShowSuggestions).toHaveBeenCalledWith(false);
    });

    it('non dovrebbe chiudere i suggerimenti cliccando dentro', () => {
        mockProps.setShowSuggestions.mockClear();
        render(<LocationAutocomplete {...mockProps} suggestions={[{place_id: 1}]} showSuggestions={true} />);
        
        fireEvent.mouseDown(screen.getByPlaceholderText('ph_location'));
        expect(mockProps.setShowSuggestions).not.toHaveBeenCalledWith(false);
    });
});
