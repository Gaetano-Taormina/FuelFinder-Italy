import { render, renderHook, screen, act, fireEvent, waitFor } from '@testing-library/react';
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
      if (typeof url === 'string' && url.startsWith('https://router.project-osrm.org/')) {
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

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('router.project-osrm.org/route/v1/driving/'),
      expect.objectContaining({ signal: expect.any(Object) })
    );
  });


  it('handles OSRM fetch rejection gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi.fn(async (url) => {
      if (typeof url === 'string' && url.startsWith('https://router.project-osrm.org/')) {
        throw new Error('Network error');
      }
      return { ok: true, json: async () => ({}) };
    });

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

  it('handles OSRM timeout and executes timeout rejection fallback', async () => {
    vi.useFakeTimers();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.startsWith('https://router.project-osrm.org/')) {
        return new Promise(() => {});
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderWithProvider();

    act(() => {
      fireEvent.click(screen.getByText('Set Pos'));
      fireEvent.click(screen.getByText('Set Selected Station'));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(consoleSpy).toHaveBeenCalledWith('OSRM Fetch Error:', expect.any(Error));
    consoleSpy.mockRestore();
    vi.useRealTimers();
  });

  it('handleNavigation early returns when station is invalid or missing coordinates', () => {
    const wrapper = ({ children }) => (
      <SWRConfig value={{ provider: () => new Map() }}>
        <MemoryRouter initialEntries={['/it/']}>
          <StationsProvider>{children}</StationsProvider>
        </MemoryRouter>
      </SWRConfig>
    );

    const { result } = renderHook(() => useStations(), { wrapper });

    result.current.handleNavigation(null);
    result.current.handleNavigation({});
    result.current.handleNavigation({ lat: 'invalid', lng: 13 });
    result.current.handleNavigation({ lat: 42, lng: 'invalid' });
    expect(window.open).not.toHaveBeenCalled();
  });

  it('handleNavigation omits origin if userPos has type: station or matches station coords', () => {
    const wrapper = ({ children }) => (
      <SWRConfig value={{ provider: () => new Map() }}>
        <MemoryRouter initialEntries={['/it/']}>
          <StationsProvider>{children}</StationsProvider>
        </MemoryRouter>
      </SWRConfig>
    );

    const { result } = renderHook(() => useStations(), { wrapper });

    // Matching coordinates -> sets routeData to null and omits origin in navigation
    act(() => {
      result.current.setUserPos({ lat: 41.9, lng: 12.5, type: 'station' });
      result.current.setSelectedStation({ lat: 41.9, lng: 12.5 });
    });

    act(() => {
      result.current.handleNavigation({ lat: 41.9, lng: 12.5, name: 'Eni Roma' });
    });

    expect(window.open).toHaveBeenCalledWith('https://www.google.com/maps/dir/?api=1&destination=41.9,12.5', '_blank');
  });

  it('handleNavigation uses Google Maps directions on Desktop (with origin if userPos set)', () => {
    renderWithProvider();
    act(() => {
      fireEvent.click(screen.getByText('Set Pos'));
    });
    act(() => {
      fireEvent.click(screen.getByText('Navigate Name'));
    });
    expect(window.open).toHaveBeenCalledWith(expect.stringContaining('google.com/maps/dir/?api=1&origin=41,12&destination=42,13'), '_blank');
  });

  it('handleNavigation uses Google Maps directions without origin on Desktop when userPos is null', () => {
    renderWithProvider();
    act(() => {
      fireEvent.click(screen.getByText('Navigate Name'));
    });
    expect(window.open).toHaveBeenCalledWith('https://www.google.com/maps/dir/?api=1&destination=42,13', '_blank');
  });

  it('handleNavigation triggers native geo: on Android to prompt app chooser', () => {
    vi.stubGlobal('navigator', { userAgent: 'Android' });
    renderWithProvider();
    act(() => {
      fireEvent.click(screen.getByText('Navigate Brand'));
    });
    expect(window.location.href).toContain('geo:42,13?q=42,13(Q8)');
  });

  it('handleNavigation uses native maps:// on iOS with start and destination', () => {
    vi.stubGlobal('navigator', { userAgent: 'iPhone' });
    renderWithProvider();
    act(() => {
      fireEvent.click(screen.getByText('Set Pos'));
    });
    act(() => {
      fireEvent.click(screen.getByText('Navigate Brand'));
    });
    expect(window.location.href).toContain('maps://?daddr=42,13&saddr=41,12&q=Q8');
  });

  it('handleNavigation uses native maps:// on iOS without userPos and fallback name', () => {
    vi.stubGlobal('navigator', { userAgent: 'iPhone' });
    renderWithProvider();
    act(() => {
      fireEvent.click(screen.getByText('Navigate Fallback'));
    });
    expect(window.location.href).toBe('maps://?daddr=42,13&q=Distributore');
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
      if (typeof url === 'string' && url.startsWith('https://router.project-osrm.org/')) {
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
      if (typeof url === 'string' && url.startsWith('https://router.project-osrm.org/')) {
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

  it('handles res.ok false from OSRM without crashing', async () => {
    global.fetch = vi.fn(async (url) => {
      if (typeof url === 'string' && url.startsWith('https://router.project-osrm.org/')) {
        return { ok: false };
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

  it('handles AbortError from OSRM fetch gracefully without logging error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.startsWith('https://router.project-osrm.org/')) {
        const abortErr = new Error('Request aborted');
        abortErr.name = 'AbortError';
        return Promise.reject(abortErr);
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderWithProvider();

    act(() => {
      fireEvent.click(screen.getByText('Set Pos'));
      fireEvent.click(screen.getByText('Set Selected Station'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('routeData').textContent).toBe('null');
    }, { interval: 5 });

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('handles generic network rejection and logs error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.startsWith('https://router.project-osrm.org/')) {
        return Promise.reject(new Error('Network failure'));
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderWithProvider();

    act(() => {
      fireEvent.click(screen.getByText('Set Pos'));
      fireEvent.click(screen.getByText('Set Selected Station'));
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('OSRM Fetch Error:', expect.any(Error));
    }, { interval: 5 });

    consoleSpy.mockRestore();
  });
});

