import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Loader from '../../../client/src/components/Loader.jsx';

const mockRefreshStations = vi.fn();
let mockContext = {
    error: null,
    loading: false,
    refreshStations: mockRefreshStations,
    stations: []
};

vi.mock('../../../client/src/context/StationsContext', () => ({
    useStations: () => mockContext
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key })
}));

describe('Loader Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockContext = {
            error: null,
            loading: false,
            refreshStations: mockRefreshStations,
            stations: []
        };
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns null when neither loading nor error exists', () => {
        const { container } = render(<Loader />);
        expect(container.firstChild).toBeNull();
    });

    it('renders retry button and triggers handleRetry on error', () => {
        mockContext.error = new Error('Network error');
        render(<Loader />);

        const retryButton = screen.getByText('btn_retry');
        expect(retryButton).toBeInTheDocument();

        fireEvent.click(retryButton);
        expect(mockRefreshStations).toHaveBeenCalledTimes(1);
    });

    it('handles retry safely when refreshStations is undefined', () => {
        mockContext.error = new Error('Network error');
        mockContext.refreshStations = null;
        render(<Loader />);

        const retryButton = screen.getByText('btn_retry');
        fireEvent.click(retryButton);
        expect(retryButton).toBeInTheDocument();
    });

    it('dismisses loader when close button is clicked', () => {
        mockContext.error = new Error('Network error');
        render(<Loader />);

        const closeButton = screen.getByText('btn_close');
        expect(closeButton).toBeInTheDocument();

        fireEvent.click(closeButton);
        expect(screen.queryByText('btn_retry')).not.toBeInTheDocument();
    });

    it('hides logo image when onError triggers', () => {
        mockContext.error = new Error('Network error');
        render(<Loader />);

        const img = screen.getByAltText('FuelFinder Logo');
        expect(img).toBeInTheDocument();
        fireEvent.error(img);
        expect(img.style.display).toBe('none');
    });

    it('simulates cold start progress and wakes server after 2.5s', () => {
        vi.useFakeTimers();
        mockContext.loading = true;

        const { rerender } = render(<Loader />);

        // Inizialmente connecting / scanning
        act(() => {
            vi.advanceTimersByTime(600);
        });

        // Dopo oltre 2500ms -> cold start e sveglia server
        act(() => {
            vi.advanceTimersByTime(2500);
        });

        expect(screen.getByText('dyn_server_waking')).toBeInTheDocument();
        expect(screen.getByText('Sveglia server...')).toBeInTheDocument();

        // Avanza ulteriormente finché il progress raggiunge e si ferma a 92%
        act(() => {
            vi.advanceTimersByTime(30000);
        });
        expect(screen.getByText('92%')).toBeInTheDocument();

        // Completamento del caricamento con stazioni trovate
        mockContext.loading = false;
        mockContext.stations = [{ id: 1 }, { id: 2 }];
        rerender(<Loader />);

        expect(screen.getByText('Trovati 2 distributori!')).toBeInTheDocument();

        // Timer di cleanup (350ms)
        act(() => {
            vi.advanceTimersByTime(400);
        });
    });

    it('simulates completion with 0 stations showing comparing prices message', () => {
        vi.useFakeTimers();
        mockContext.loading = true;
        const { rerender } = render(<Loader />);

        act(() => {
            vi.advanceTimersByTime(3000);
        });

        mockContext.loading = false;
        mockContext.stations = [];
        rerender(<Loader />);

        expect(screen.getByText('dyn_comparing_prices')).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(400);
        });
    });
});
