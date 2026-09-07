import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RoutePanel from '../../../src/components/RoutePanel';
import * as StationsContext from '../../../src/context/StationsContext';

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
      stations: [
        {
          id: 1,
          name: 'Test Station',
          address: '123 Test St',
          currentPrice: 1.50,
          dist: 5
        }
      ],
      setSelectedStation: mockSetSelectedStation,
      routeData: null,
      handleNavigation: mockHandleNavigation
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when no station is selected', () => {
    vi.spyOn(StationsContext, 'useStations').mockReturnValue({ selectedStation: null });
    const { container } = render(<RoutePanel />);
    expect(container.firstChild).toBeNull();
  });

  it('renders selected station details correctly', () => {
    render(<RoutePanel />);
    expect(screen.getByText('Test Station')).toBeInTheDocument();
    expect(screen.getByText('123 Test St')).toBeInTheDocument();
    expect(screen.getByText(/1.5/)).toBeInTheDocument();
  });

  it('invokes setSelectedStation(null) on close button click', () => {
    render(<RoutePanel />);
    const closeBtn = screen.getByText('btn_close');
    fireEvent.click(closeBtn);
    expect(mockSetSelectedStation).toHaveBeenCalledWith(null);
  });

  it('invokes handleNavigation when station name is clicked', () => {
    render(<RoutePanel />);
    const nameBtn = screen.getByText('Test Station');
    fireEvent.click(nameBtn);
    expect(mockHandleNavigation).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it('renders calculated duration and distance when routeData is present', () => {
    vi.spyOn(StationsContext, 'useStations').mockReturnValue({
      selectedStation: { id: 1, dist: 5 },
      routeData: { duration: 120, distance: 2000 },
      handleNavigation: vi.fn()
    });
    render(<RoutePanel />);
    expect(screen.getByText('2 min')).toBeInTheDocument();
    expect(screen.getByText('2.0 km')).toBeInTheDocument();
  });

  it('renders fallback placeholders (--) when routeData and distance are unavailable', () => {
    vi.spyOn(StationsContext, 'useStations').mockReturnValue({
      selectedStation: { id: 1, name: 'Test' },
      routeData: null,
      handleNavigation: vi.fn()
    });
    render(<RoutePanel />);
    expect(screen.getByText('-- min')).toBeInTheDocument();
    expect(screen.getByText('-- km')).toBeInTheDocument();
  });

  it('renders "rp_best_badge" when selected station is rank 0', () => {
    vi.spyOn(StationsContext, 'useStations').mockReturnValue({
      selectedStation: { id: 1, name: 'Best Station' },
      stations: [{ id: 1, name: 'Best Station' }, { id: 2, name: 'Second Station' }],
      routeData: null,
      handleNavigation: vi.fn()
    });
    render(<RoutePanel />);
    expect(screen.getByText('rp_best_badge')).toBeInTheDocument();
    expect(screen.getByText('rp_title')).toBeInTheDocument();
  });

  it('renders rank number and "rp_selected_title" when selected station is not rank 0', () => {
    vi.spyOn(StationsContext, 'useStations').mockReturnValue({
      selectedStation: { id: 2, name: 'Second Station' },
      stations: [{ id: 1, name: 'Best Station' }, { id: 2, name: 'Second Station' }],
      routeData: null,
      handleNavigation: vi.fn()
    });
    render(<RoutePanel />);
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('rp_selected_title')).toBeInTheDocument();
  });
});
