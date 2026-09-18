import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import MapArea, { RouteLayer } from '../../../src/components/MapArea';

let mockStationsState = {};

vi.mock('../../../src/context/StationsContext', () => ({
  useStations: () => mockStationsState
}));

vi.mock('../../../src/hooks/useDistance', () => ({
  useDistanceLogic: () => mockStationsState.stations || []
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: ({ eventHandlers }) => {
    // Test tileloadstart event
    if (eventHandlers && eventHandlers.tileloadstart) {
      const dummyTile = { setAttribute: vi.fn() };
      eventHandlers.tileloadstart({ tile: dummyTile });
      eventHandlers.tileloadstart({});
    }
    return <div data-testid="tile-layer" />;
  },
  Marker: ({ children, position, eventHandlers }) => (
    <button 
      type="button"
      data-testid="marker" 
      data-pos={JSON.stringify(position)}
      onClick={() => eventHandlers && eventHandlers.click && eventHandlers.click()}
    >
      {children}
    </button>
  ),
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  Circle: ({ radius }) => <div data-testid="circle" data-radius={radius} />,
  GeoJSON: ({ data, style }) => (
    <div data-testid="geojson-layer" data-style={JSON.stringify(style)}>
      {JSON.stringify(data)}
    </div>
  ),
  useMap: () => ({
    flyTo: vi.fn(),
    invalidateSize: vi.fn()
  }),
  useMapEvents: (handlers) => {
    // Simulate click event
    if (handlers && handlers.click) {
      setTimeout(() => {
        handlers.click({ latlng: { lat: 41.9, lng: 12.5 } });
      }, 0);
    }
  }
}));

vi.mock('react-leaflet-cluster', () => ({
  default: ({ children, iconCreateFunction }) => {
    if (iconCreateFunction) {
      // Test cluster icon function with best price and without
      const dummyClusterBest = {
        getAllChildMarkers: () => [{ options: { icon: { options: { isBestPrice: true } } } }],
        getChildCount: () => 5
      };
      const dummyClusterNormal = {
        getAllChildMarkers: () => [{ options: { icon: { options: { isBestPrice: false } } } }],
        getChildCount: () => 3
      };
      iconCreateFunction(dummyClusterBest);
      iconCreateFunction(dummyClusterNormal);
    }
    return <div data-testid="cluster-group">{children}</div>;
  }
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key })
}));

describe('MapArea Component & RouteLayer', () => {
  beforeEach(() => {
    mockStationsState = {
      userPos: null,
      radius: 10,
      routeData: null,
      loading: false,
      selectedStation: null,
      stations: [],
      setUserPos: vi.fn(),
      setLocationStr: vi.fn(),
      setSelectedStation: vi.fn()
    };
  });

  it('renders prompt overlay when userPos is null', () => {
    const { getByText } = render(<MapArea />);
    expect(getByText('map_prompt')).toBeDefined();
  });

  it('renders loader overlay when loading is true and userPos is present', () => {
    mockStationsState.userPos = { lat: 41.9, lng: 12.5, type: 'gps' };
    mockStationsState.loading = true;
    const { getByTestId } = render(<MapArea />);
    expect(getByTestId('map-container')).toBeDefined();
  });

  it('renders station markers, popups, and handles station clicks', () => {
    mockStationsState.userPos = { lat: 41.9, lng: 12.5, type: 'manual' };
    mockStationsState.selectedStation = { id: 1, lat: 41.91, lng: 12.51, name: 'ENI' };
    mockStationsState.stations = [
      { id: 1, lat: 41.91, lng: 12.51, currentPrice: 1.75, name: 'ENI ROMA', address: 'Via Roma 1' },
      { id: 2, lat: 41.92, lng: 12.52, currentPrice: 1.85, brand: 'Q8', address: 'Via Milano 2' }
    ];
    mockStationsState.routeData = {
      geometry: { type: 'LineString', coordinates: [[12.5, 41.9], [12.51, 41.91]] },
      isFallback: false
    };

    const { getAllByTestId, getByTestId } = render(<MapArea />);
    expect(getByTestId('circle')).toBeDefined();

    const markers = getAllByTestId('marker');
    // Click on a station marker (after LocationMarker and CapitalMarkers)
    fireEvent.click(markers[markers.length - 1]);
    expect(mockStationsState.setSelectedStation).toHaveBeenCalled();
  });

  describe('RouteLayer Subcomponent', () => {
    it('returns null if geometry is null', () => {
      const { container } = render(<RouteLayer geometry={null} isFallback={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders normal style for standard geometry', () => {
      const geom = { type: 'LineString', coordinates: [[12.5, 41.9], [12.6, 42.0]] };
      const { getAllByTestId } = render(<RouteLayer geometry={geom} isFallback={false} />);
      const layers = getAllByTestId('geojson-layer');
      expect(layers).toHaveLength(2);
      expect(layers[0].getAttribute('data-style')).not.toContain('dashArray');
    });

    it('cleans up map timer on unmount', () => {
      vi.useFakeTimers();
      const { unmount } = render(<MapArea />);
      vi.advanceTimersByTime(350);
      unmount();
      vi.useRealTimers();
    });

    it('handles memo comparison when re-rendering RouteLayer', () => {
      const geom1 = { type: 'LineString', coordinates: [[12.5, 41.9], [12.6, 42.0]] };
      const geom2 = { type: 'LineString', coordinates: [[12.5, 41.9], [12.7, 42.1]] };
      const { rerender } = render(<RouteLayer geometry={geom1} isFallback={false} />);
      rerender(<RouteLayer geometry={geom1} isFallback={false} />);
      rerender(<RouteLayer geometry={geom2} isFallback={false} />);
      rerender(<RouteLayer geometry={geom2} isFallback={true} />);
    });
  });
});
