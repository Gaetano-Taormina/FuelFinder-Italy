import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StationsProvider, useStations } from '../../../src/context/StationsContext';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SWRConfig } from 'swr';

const originalLocation = window.location;
const originalOpen = window.open;

const TestNavConsumer = () => {
  const {
    setUserPos, setSelectedStation,
    routeData, handleNavigation
  } = useStations();

  return (
    <div>
      <div data-testid="routeData">{routeData ? routeData.distance : 'null'}</div>
      
      <button onClick={() => setUserPos({ lat: 41, lng: 12 })}>Set Pos</button>
      <button onClick={() => setSelectedStation({ lat: 42, lng: 13 })}>Set Selected Station</button>
      <button onClick={() => setUserPos(null)}>Clear Pos</button>
      <button onClick={() => setSelectedStation(null)}>Clear Selected Station</button>
      <button onClick={() => handleNavigation({ lat: 42, lng: 13, name: 'Senza Brand' })}>Navigate Name</button>
      <button onClick={() => handleNavigation({ lat: 42, lng: 13, brand: 'Q8', name: 'Senza Brand' })}>Navigate Brand</button>
      <button onClick={() => handleNavigation({ lat: 42, lng: 13 })}>Navigate Fallback</button>
    </div>
  );
};

describe('StationsContext - Navigation & OSRM Routing', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async (url) => {
      if (url.includes('router.project-osrm.org')) {
        return {
          ok: true,
          json: async () => ({ routes: [{ geometry: 'geo', distance: 100, duration: 200 }] })
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    window.open = vi.fn();
    delete window.location;
    window.location = { ...originalLocation, pathname: '/it/', href: '' };

    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' // Desktop
    });
  });

  afterEach(() => {
    window.location = originalLocation;
    window.open = originalOpen;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const renderWithProvider = () => {
    return render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
        <MemoryRouter initialEntries={['/it/']}>
          <Routes>
            <Route path="*" element={<StationsProvider><TestNavConsumer /></StationsProvider>} />
          </Routes>
        </MemoryRouter>
      </SWRConfig>
    );
  };

  it('performs OSRM route calculation when selectedStation and userPos are set', async () => {
    renderWithProvider();

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

  it('handles OSRM fetch rejection gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    renderWithProvider();

    act(() => {
      fireEvent.click(screen.getByText('Set Pos'));
      fireEvent.click(screen.getByText('Set Selected Station'));
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    }, { interval: 5 });

    consoleSpy.mockRestore();
  });

  it('handleNavigation uses Google Maps universal deep link on Desktop and Android', () => {
    renderWithProvider();
    fireEvent.click(screen.getByText('Navigate Name'));
    expect(window.open).toHaveBeenCalledWith(expect.stringContaining('google.com/maps/dir/?api=1&destination=42,13'), '_blank');
  });

  it('handleNavigation uses Apple Maps universal link on iOS and prioritizes brand', () => {
    vi.stubGlobal('navigator', { userAgent: 'iPhone' });
    renderWithProvider();
    fireEvent.click(screen.getByText('Navigate Brand'));
    expect(window.open).toHaveBeenCalledWith(expect.stringContaining('maps.apple.com/?q=Q8&ll=42,13'), '_blank');
  });

  it('handleNavigation handles fallback name when brand and name are missing', () => {
    vi.stubGlobal('navigator', { userAgent: 'iPhone' });
    renderWithProvider();
    fireEvent.click(screen.getByText('Navigate Fallback'));
    expect(window.open).toHaveBeenCalledWith(expect.stringContaining('maps.apple.com/?q=Distributore&ll=42,13'), '_blank');
  });

  it('handleNavigation avoids iOS uri scheme if window.MSStream is present', () => {
    vi.stubGlobal('navigator', { userAgent: 'iPhone' });
    window.MSStream = true;
    renderWithProvider();
    fireEvent.click(screen.getByText('Navigate Brand'));
    expect(window.open).toHaveBeenCalledWith(expect.stringContaining('google.com/maps/dir/?api=1&destination=42,13'), '_blank');
    delete window.MSStream;
  });

  it('handles empty routes array from OSRM gracefully', async () => {
    global.fetch = vi.fn(async (url) => {
      if (url.includes('router.project-osrm.org')) {
        return { ok: true, json: async () => ({ routes: [] }) }; 
      }
      return { ok: true, json: async () => ({}) };
    });

    renderWithProvider();

    act(() => {
      fireEvent.click(screen.getByText('Set Pos'));
      fireEvent.click(screen.getByText('Set Selected Station'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('routeData').textContent).toBe('null');
    }, { interval: 5 });
  });

  it('resets routeData when userPos is removed', async () => {
    renderWithProvider();
    act(() => {
      fireEvent.click(screen.getByText('Set Pos'));
      fireEvent.click(screen.getByText('Set Selected Station'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('routeData').textContent).toBe('100'); 
    }, { interval: 5 });

    act(() => {
      fireEvent.click(screen.getByText('Clear Pos'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('routeData').textContent).toBe('null'); 
    }, { interval: 5 });
  });

  it('resets routeData when selectedStation is removed', async () => {
    renderWithProvider();
    act(() => {
      fireEvent.click(screen.getByText('Set Pos'));
      fireEvent.click(screen.getByText('Set Selected Station'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('routeData').textContent).toBe('100'); 
    }, { interval: 5 });

    act(() => {
      fireEvent.click(screen.getByText('Clear Selected Station'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('routeData').textContent).toBe('null'); 
    }, { interval: 5 });
  });

  it('handles error payload from OSRM gracefully', async () => {
    global.fetch = vi.fn(async (url) => {
      if (url.includes('router.project-osrm.org')) {
        return { ok: true, json: async () => ({ error: 'Not found' }) }; 
      }
      return { ok: true, json: async () => ({}) };
    });

    renderWithProvider();

    act(() => {
      fireEvent.click(screen.getByText('Set Pos'));
      fireEvent.click(screen.getByText('Set Selected Station'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('routeData').textContent).toBe('null');
    }, { interval: 5 });
  });
});
