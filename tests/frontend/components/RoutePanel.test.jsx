import { render, screen, fireEvent, act } from '@testing-library/react';
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

  it('matches station by coordinates when id is missing', () => {
    vi.spyOn(StationsContext, 'useStations').mockReturnValue({
      selectedStation: { lat: 45.46, lng: 9.19, name: 'Coord Station' },
      stations: [{ lat: 45.46, lng: 9.19, name: 'Coord Station' }],
      routeData: null,
      handleNavigation: vi.fn()
    });
    render(<RoutePanel />);
    expect(screen.getByText('rp_best_badge')).toBeInTheDocument();
  });

  it('matches station by name when id and coordinates are missing', () => {
    vi.spyOn(StationsContext, 'useStations').mockReturnValue({
      selectedStation: { name: 'Name Only Station' },
      stations: [{ name: 'Name Only Station' }],
      routeData: null,
      handleNavigation: vi.fn()
    });
    render(<RoutePanel />);
    expect(screen.getByText('rp_best_badge')).toBeInTheDocument();
  });

  it('renders station badge when rankIndex is -1 and isBest is false', () => {
    vi.spyOn(StationsContext, 'useStations').mockReturnValue({
      selectedStation: { id: 999, name: 'Unmatched Station', isBest: false },
      stations: [{ id: 1, name: 'Station 1' }],
      routeData: null,
      handleNavigation: vi.fn()
    });
    render(<RoutePanel />);
    expect(screen.getByText('rp_station_badge')).toBeInTheDocument();
    expect(screen.getByText('rp_selected_title')).toBeInTheDocument();
  });

  it('renders best badge when rankIndex is -1 and isBest is true', () => {
    vi.spyOn(StationsContext, 'useStations').mockReturnValue({
      selectedStation: { id: 999, name: 'Unmatched Station', isBest: true },
      stations: [{ id: 1, name: 'Station 1' }],
      routeData: null,
      handleNavigation: vi.fn()
    });
    render(<RoutePanel />);
    expect(screen.getByText('rp_best_badge')).toBeInTheDocument();
    expect(screen.getByText('rp_title')).toBeInTheDocument();
  });

  it('returns false in findIndex when station objects have no identifiers', () => {
    vi.spyOn(StationsContext, 'useStations').mockReturnValue({
      selectedStation: {},
      stations: [{}],
      routeData: null,
      handleNavigation: vi.fn()
    });
    render(<RoutePanel />);
    expect(screen.getByText('rp_station_badge')).toBeInTheDocument();
  });

  it('copies station share link to clipboard on share button click and resets timeout', async () => {
    vi.useFakeTimers();
    let resolveClipboard;
    const writeTextMock = vi.fn().mockImplementation(() => new Promise((resolve) => { resolveClipboard = resolve; }));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true
    });

    render(<RoutePanel />);
    const shareBtn = screen.getByRole('button', { name: 'btn_share' });
    expect(shareBtn).toBeInTheDocument();
    fireEvent.click(shareBtn);
    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('/it/citta/italia/stazione/1'));

    await act(async () => {
      resolveClipboard();
    });
    expect(screen.getByText('share_copied')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.queryByText('share_copied')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('handles clipboard failure gracefully when writeText rejects', async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true
    });

    render(<RoutePanel />);
    const shareBtn = screen.getByRole('button', { name: 'btn_share' });
    fireEvent.click(shareBtn);
    expect(writeTextMock).toHaveBeenCalled();
  });

  it('handles missing clipboard object safely', () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true
    });

    render(<RoutePanel />);
    const shareBtn = screen.getByRole('button', { name: 'btn_share' });
    fireEvent.click(shareBtn);
    expect(screen.queryByText('share_copied')).not.toBeInTheDocument();
  });

  it('generates share URL with station comune in english', () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true
    });

    vi.spyOn(StationsContext, 'useStations').mockReturnValue({
      selectedStation: { id: 50706, comune: 'Milano', name: 'ENI Milano', currentPrice: 1.80 },
      stations: [],
      setSelectedStation: vi.fn(),
      routeData: null,
      handleNavigation: vi.fn(),
      fuelType: 'diesel'
    });

    render(<RoutePanel />);
    const shareBtn = screen.getByRole('button', { name: 'btn_share' });
    fireEvent.click(shareBtn);
    expect(writeTextMock).toHaveBeenCalledWith(expect.stringMatching(/\/it\/citta\/[Mm]ilano\/stazione\/50706\/diesel/));
  });
});

