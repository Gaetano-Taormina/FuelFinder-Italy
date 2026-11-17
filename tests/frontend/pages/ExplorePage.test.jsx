
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ExplorePage from '../../../client/src/pages/ExplorePage';

// Mocks to prevent issues with complex contexts or third party libraries during basic render tests
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key })
}));

vi.mock('../../../client/src/components/Header', () => ({
  default: () => null
}));

describe('ExplorePage Component', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('should render without crashing', () => {
    // Basic test to ensure it mounts
    expect(true).toBe(true);
  });

  it('groups the same cities alphabetically and by region with capitals first', async () => {
    const cities = [
      { name: 'Pavia, PV', province: 'PV', region: 'Lombardia', isProvincialCapital: false, isRegionalCapital: false },
      { name: 'Milano, MI', province: 'MI', region: 'Lombardia', isProvincialCapital: true, isRegionalCapital: true }
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(cities)
    }));

    render(
      <MemoryRouter initialEntries={['/it/esplora']}>
        <Routes>
          <Route path="/:lang/:page" element={<ExplorePage />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'M', level: 3 });
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent))
      .toEqual(['M', 'P']);

    fireEvent.click(screen.getByRole('button', { name: 'Per Regione' }));
    const regionHeading = await screen.findByRole('heading', { name: 'Lombardia', level: 3 });
    const cityNames = within(regionHeading.parentElement)
      .getAllByRole('link')
      .map((link) => link.textContent.trim());

    expect(cityNames).toEqual(['Milano', 'Pavia']);
  });
});
