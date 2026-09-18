import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StationsProvider, useStations } from '../../../src/context/StationsContext';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SWRConfig } from 'swr';

const originalLocation = window.location;

const TestInitConsumer = () => {
  const { fuelType } = useStations();
  return <div data-testid="fuelType">{fuelType}</div>;
};

describe('StationsContext - Initialization & URL Parsing', () => {
  beforeEach(() => {
    delete window.location;
    window.location = { ...originalLocation, pathname: '/it/', href: '' };
  });

  afterEach(() => {
    window.location = originalLocation;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const renderWithProvider = (initialEntries = ['/it/']) => {
    return render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/:lang/:fuel?" element={<StationsProvider><TestInitConsumer /></StationsProvider>} />
            <Route path="*" element={<StationsProvider><TestInitConsumer /></StationsProvider>} />
          </Routes>
        </MemoryRouter>
      </SWRConfig>
    );
  };

  it('initializes with Benzina when no URL param is provided', () => {
    renderWithProvider(['/it/']);
    expect(screen.getByTestId('fuelType').textContent).toBe('Benzina');
  });

  it('initializes from "carburante" search parameter in Italian', () => {
    renderWithProvider(['/it/?carburante=Gasolio']);
    expect(screen.getByTestId('fuelType').textContent).toBe('Gasolio');
  });

  it('initializes from "fuel" search parameter in English and maps it (Petrol -> Benzina)', () => {
    renderWithProvider(['/en/?fuel=Petrol']);
    expect(screen.getByTestId('fuelType').textContent).toBe('Benzina');
  });

  it('initializes with unmapped fuel as fallback', () => {
    renderWithProvider(['/it/?carburante=Idrogeno']);
    expect(screen.getByTestId('fuelType').textContent).toBe('Idrogeno');
  });

  it('fetches OSRM route and calculates fallback if OSRM fails', async () => {
    const TestRouteConsumer = () => {
      const { routeData, setSelectedStation, setUserPos } = useStations();
      return (
        <div>
          <button 
            data-testid="select-station" 
            onClick={() => {
              setUserPos({ lat: 41.9, lng: 12.5 });
              setSelectedStation({ id: 1, lat: 41.95, lng: 12.55, brand: 'Eni' });
            }}
          >
            Set Station
          </button>
          <button 
            data-testid="clear-station" 
            onClick={() => setSelectedStation(null)}
          >
            Clear
          </button>
          <div data-testid="route-dist">{routeData ? routeData.distance : 'none'}</div>
          <div data-testid="route-fallback">{routeData ? String(Boolean(routeData.isFallback)) : 'none'}</div>
        </div>
      );
    };

    // Test fallback when fetch rejects
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
    const { getByTestId, findByText } = render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
        <MemoryRouter initialEntries={['/it/']}>
          <StationsProvider><TestRouteConsumer /></StationsProvider>
        </MemoryRouter>
      </SWRConfig>
    );

    getByTestId('select-station').click();
    await findByText('true'); // routeData.isFallback is true
    expect(getByTestId('route-dist').textContent).not.toBe('none');

    // Clear station resets routeData
    getByTestId('clear-station').click();
    await waitFor(() => {
      expect(getByTestId('route-dist').textContent).toBe('none');
    });
  });
});
