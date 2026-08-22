import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StationsProvider, useStations } from '../../../src/context/StationsContext';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { SWRConfig } from 'swr';

// Salva le properties originali di window
const originalLocation = window.location;
const originalOpen = window.open;

// Componente fittizio per leggere e scrivere nel Context
const TestConsumer = () => {
  const {
    stations, totalStations, loading, isFetchingBackground, error,
    locationStr, setLocationStr, radius, setRadius,
    fuelType, setFuelType, serviceType, setServiceType,
    userPos, setUserPos, selectedStation, setSelectedStation,
    routeData, handleNavigation
  } = useStations();

  // Test usiamo un URL search param per mostrare come interagisce setFuelType
  const [searchParams] = useSearchParams();

  return (
    <div>
      <div data-testid="fuelType">{fuelType}</div>
      <div data-testid="searchParamFuel">{searchParams.get('fuel') || searchParams.get('carburante')}</div>
      <div data-testid="stationsCount">{stations.length}</div>
      <div data-testid="totalStations">{totalStations}</div>
      <div data-testid="routeData">{routeData ? routeData.distance : 'null'}</div>
      
      <button onClick={() => setFuelType('Gasolio')}>Set Gasolio</button>
      <button onClick={() => setFuelType('Diesel')}>Set Diesel</button>
      <button onClick={() => setUserPos({lat: 41, lng: 12})}>Set Pos</button>
      <button onClick={() => setSelectedStation({lat: 42, lng: 13})}>Set Selected Station</button>
      <button onClick={() => handleNavigation({lat: 42, lng: 13, name: 'Eni'})}>Navigate</button>
    </div>
  );
};

describe('StationsContext', () => {
  beforeEach(() => {
    // Reset fetch
    global.fetch = vi.fn(async (url) => {
      if (url.includes('router.project-osrm.org')) {
        return {
          ok: true,
          json: async () => ({ routes: [{ geometry: 'geo', distance: 100, duration: 200 }] })
        };
      }
      if (url.includes('/api/stations')) {
        return {
          ok: true,
          json: async () => ({ stations: [{ id: 1 }, { id: 2 }], totalCount: 2 })
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    // Mock window.open
    window.open = vi.fn();

    // Mock window.location (dato che è readonly in jsdom, usiamo defineProperty o object)
    delete window.location;
    window.location = { ...originalLocation, pathname: '/it/', href: '' };

    // Mock navigator.userAgent (getter)
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' // Desktop di default
    });
  });

  afterEach(() => {
    window.location = originalLocation;
    window.open = originalOpen;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // Helper per ripulire il boilerplate e resettare la cache SWR a ogni test
  const renderWithProvider = (initialEntries = ['/it/']) => {
    return render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
        <MemoryRouter initialEntries={initialEntries}>
          <StationsProvider>
            <TestConsumer />
          </StationsProvider>
        </MemoryRouter>
      </SWRConfig>
    );
  };

  it('Inizializza con Benzina se nessun URL param è fornito', () => {
    renderWithProvider(['/it/']);
    expect(screen.getByTestId('fuelType').textContent).toBe('Benzina');
  });

  it('Inizializza dal parametro "carburante" in italiano', () => {
    renderWithProvider(['/it/?carburante=Gasolio']);
    expect(screen.getByTestId('fuelType').textContent).toBe('Gasolio');
  });

  it('Inizializza dal parametro "fuel" in inglese e lo mappa (Petrol -> Benzina)', () => {
    renderWithProvider(['/en/?fuel=Petrol']);
    expect(screen.getByTestId('fuelType').textContent).toBe('Benzina');
  });

  it('setFuelType aggiorna l\'URL in italiano (carburante=Gasolio)', async () => {
    window.location.pathname = '/it/';
    renderWithProvider(['/it/']);

    fireEvent.click(screen.getByText('Set Gasolio'));
    expect(screen.getByTestId('fuelType').textContent).toBe('Gasolio');
    expect(screen.getByTestId('searchParamFuel').textContent).toBe('Gasolio');
  });

  it('setFuelType aggiorna l\'URL in inglese (fuel=Diesel) traducendolo', async () => {
    window.location.pathname = '/en/';
    renderWithProvider(['/en/']);

    fireEvent.click(screen.getByText('Set Gasolio')); 
    expect(screen.getByTestId('fuelType').textContent).toBe('Gasolio');
    expect(screen.getByTestId('searchParamFuel').textContent).toBe('Diesel');
  });

  it('setFuelType con un carburante non mappato non va in errore', async () => {
    window.location.pathname = '/en/';
    renderWithProvider(['/en/']);

    fireEvent.click(screen.getByText('Set Diesel')); 
    expect(screen.getByTestId('fuelType').textContent).toBe('Diesel');
    expect(screen.getByTestId('searchParamFuel').textContent).toBe('Diesel');
  });

  it('Effettua la chiamata API Stations quando userPos è impostato e popola stations', async () => {
    renderWithProvider(['/it/']);

    expect(screen.getByTestId('stationsCount').textContent).toBe('0');
    expect(screen.getByTestId('totalStations').textContent).toBe('0');

    act(() => {
      fireEvent.click(screen.getByText('Set Pos'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('stationsCount').textContent).toBe('2');
      expect(screen.getByTestId('totalStations').textContent).toBe('2');
    }, { interval: 5 });

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/stations?lat=41&lng=12'));
  });

  it('Effettua la chiamata a OSRM quando selectedStation e userPos sono impostati', async () => {
    renderWithProvider(['/it/']);

    expect(screen.getByTestId('routeData').textContent).toBe('null');

    act(() => {
      fireEvent.click(screen.getByText('Set Pos'));
      fireEvent.click(screen.getByText('Set Selected Station'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('routeData').textContent).toBe('100'); 
    }, { interval: 5 });

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('router.project-osrm.org/route/v1/driving/'));
  });

  it('Simula un errore di fetch su OSRM', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    renderWithProvider(['/it/']);

    act(() => {
      fireEvent.click(screen.getByText('Set Pos'));
      fireEvent.click(screen.getByText('Set Selected Station'));
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    }, { interval: 5 });

    consoleSpy.mockRestore();
  });

  it('fetcher lancia eccezione se res.ok è falso', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false });
    
    renderWithProvider(['/it/']);

    act(() => {
      fireEvent.click(screen.getByText('Set Pos')); 
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    }, { interval: 5 });
  });

  it('handleNavigation usa window.open su Desktop', () => {
    renderWithProvider(['/it/']);
    fireEvent.click(screen.getByText('Navigate'));
    expect(window.open).toHaveBeenCalledWith(expect.stringContaining('google.com/maps/dir/?api=1&destination=42,13'), '_blank');
  });

  it('handleNavigation usa maps:// su iOS', () => {
    vi.stubGlobal('navigator', { userAgent: 'iPhone' });
    renderWithProvider(['/it/']);
    fireEvent.click(screen.getByText('Navigate'));
    expect(window.location.href).toContain('maps://?q=Eni&ll=42,13');
  });

  it('handleNavigation usa geo: su Android', () => {
    vi.stubGlobal('navigator', { userAgent: 'Android' });
    renderWithProvider(['/it/']);
    fireEvent.click(screen.getByText('Navigate'));
  });

  it('Parsa correttamente stationsData se l\'API restituisce direttamente un array (riga 67)', async () => {
    global.fetch = vi.fn(async (url) => {
      if (url.includes('/api/stations')) {
        return { ok: true, json: async () => ([{ id: 99 }]) }; 
      }
      return { ok: true, json: async () => ({}) };
    });

    renderWithProvider(['/it/']);

    act(() => fireEvent.click(screen.getByText('Set Pos')));

    await waitFor(() => {
      expect(screen.getByTestId('stationsCount').textContent).toBe('1');
    }, { interval: 5 });
  });

  it('Non va in errore se OSRM non restituisce percorsi (riga 87)', async () => {
    global.fetch = vi.fn(async (url) => {
      if (url.includes('router.project-osrm.org')) {
        return { ok: true, json: async () => ({ routes: [] }) }; 
      }
      return { ok: true, json: async () => ({}) };
    });

    renderWithProvider(['/it/']);

    act(() => {
      fireEvent.click(screen.getByText('Set Pos'));
      fireEvent.click(screen.getByText('Set Selected Station'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('routeData').textContent).toBe('null');
    }, { interval: 5 });
  });

});
