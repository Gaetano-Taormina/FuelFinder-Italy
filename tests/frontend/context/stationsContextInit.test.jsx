import { render, screen } from '@testing-library/react';
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
});
