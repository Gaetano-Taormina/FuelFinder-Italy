import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RoutePanel from '../../../src/components/RoutePanel';
import * as StationsContext from '../../../src/context/StationsContext';

// Mocks to prevent issues with complex contexts or third party libraries during basic render tests
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key })
}));

describe('RoutePanel Component', () => {
  let mockSetSelectedStation;
  let mockHandleNavigation;

  beforeEach(() => {
    mockSetSelectedStation = vi.fn();
    mockHandleNavigation = vi.fn();
    
    vi.spyOn(StationsContext, 'useStations').mockReturnValue({
      selectedStation: {
        id: 1,
        name: 'Test Station',
        address: '123 Test St',
        currentPrice: 1.50,
        dist: 5
      },
      setSelectedStation: mockSetSelectedStation,
      routeData: null,
      handleNavigation: mockHandleNavigation
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('non dovrebbe renderizzare nulla se nessuna stazione è selezionata', () => {
    vi.spyOn(StationsContext, 'useStations').mockReturnValue({ selectedStation: null });
    const { container } = render(<RoutePanel />);
    expect(container.firstChild).toBeNull();
  });

  it('dovrebbe renderizzare i dettagli della stazione selezionata', () => {
    render(<RoutePanel />);
    expect(screen.getByText('Test Station')).toBeInTheDocument();
    expect(screen.getByText('123 Test St')).toBeInTheDocument();
    expect(screen.getByText(/1.5/)).toBeInTheDocument();
  });

  it('dovrebbe chiamare setSelectedStation(null) quando si clicca il pulsante di chiusura (bug fix check)', () => {
    render(<RoutePanel />);
    // Assicurati che cliccando btn_close, il componente scateni l'azione per chiudersi
    const closeBtn = screen.getByText('btn_close');
    fireEvent.click(closeBtn);
    expect(mockSetSelectedStation).toHaveBeenCalledWith(null);
  });

  it('dovrebbe chiamare handleNavigation quando si clicca sul nome della stazione', () => {
    render(<RoutePanel />);
    const nameBtn = screen.getByText('Test Station');
    fireEvent.click(nameBtn);
    expect(mockHandleNavigation).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it('dovrebbe renderizzare tempi e distanze calcolati se routeData è presente', () => {
    vi.spyOn(StationsContext, 'useStations').mockReturnValue({
      selectedStation: { id: 1, dist: 5 },
      routeData: { duration: 120, distance: 2000 },
      handleNavigation: vi.fn()
    });
    render(<RoutePanel />);
    expect(screen.getByText('2 min')).toBeInTheDocument();
    expect(screen.getByText('2.0 km')).toBeInTheDocument();
  });

  it('dovrebbe renderizzare -- se routeData e dist non sono disponibili', () => {
    vi.spyOn(StationsContext, 'useStations').mockReturnValue({
      selectedStation: { id: 1, name: 'Test' }, // Senza dist
      routeData: null,
      handleNavigation: vi.fn()
    });
    render(<RoutePanel />);
    expect(screen.getByText('-- min')).toBeInTheDocument();
    expect(screen.getByText('-- km')).toBeInTheDocument();
  });
});
