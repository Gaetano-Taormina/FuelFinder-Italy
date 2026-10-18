import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MainApp from '../../client/src/App';
import { MemoryRouter } from 'react-router-dom';

// Mocks to prevent issues with complex contexts or third party libraries during basic render tests
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { resolvedLanguage: 'it', changeLanguage: vi.fn() } })
}));

describe('App Component', () => {
  const originalViteMode = import.meta.env.VITE_MAINTENANCE_MODE;
  const originalRawMode = import.meta.env.MAINTENANCE_MODE;

  beforeEach(() => {
    delete import.meta.env.VITE_MAINTENANCE_MODE;
    delete import.meta.env.MAINTENANCE_MODE;
  });

  afterEach(() => {
    import.meta.env.VITE_MAINTENANCE_MODE = originalViteMode;
    import.meta.env.MAINTENANCE_MODE = originalRawMode;
  });

  it('renders Maintenance component when maintenance mode is active', () => {
    import.meta.env.MAINTENANCE_MODE = 'true';
    render(
      <MemoryRouter initialEntries={['/it']}>
        <MainApp />
      </MemoryRouter>
    );
    expect(screen.getByText(/Sito Temporaneamente in Manutenzione/i)).toBeInTheDocument();
  });
});
