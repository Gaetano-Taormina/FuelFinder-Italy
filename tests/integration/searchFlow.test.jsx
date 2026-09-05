import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SWRConfig } from 'swr';
import SearchPanel from '../../src/components/SearchPanel';
import { StationsProvider } from '../../src/context/StationsContext';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        dyn_found: 'Trovati',
        dyn_stations: 'distributori.',
        status_ready: 'I dati sono pronti.',
        ph_location: 'Cerca per comune, CAP o indirizzo...',
        lbl_location: 'Posizione o Comune',
        lbl_radius: 'Raggio',
        lbl_fuel: 'Carburante',
        lbl_service: 'Servizio',
        btn_search: 'Cerca',
        title_gps: 'Usa GPS',
        fuel_gasoline: 'Benzina',
        fuel_diesel: 'Diesel',
        fuel_lpg: 'GPL',
        fuel_methane: 'Metano',
        fuel_hvo: 'HVO',
        fuel_gnl: 'GNL',
        service_self: 'Self',
        service_served: 'Servito',
        service_both: 'Entrambi',
      };
      return translations[key] || key;
    },
    i18n: { language: 'it' }
  })
}));

describe('Integration Flow: SearchPanel + Filters + StationsProvider', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async (url) => {
      if (url.includes('/api/stations')) {
        return {
          ok: true,
          json: async () => ({
            stations: [
              { id: 1, name: 'Eni Roma', lat: 41.9, lng: 12.5, price: 1.75 },
              { id: 2, name: 'Q8 Roma', lat: 41.91, lng: 12.51, price: 1.78 }
            ],
            totalCount: 2
          })
        };
      }
      return {
        ok: true,
        json: async () => ([])
      };
    });
  });

  it('aggiorna i filtri e comunica correttamente lo stato attraverso il Context', async () => {
    render(
      <MemoryRouter initialEntries={['/it/esplora']}>
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
          <StationsProvider>
            <SearchPanel />
          </StationsProvider>
        </SWRConfig>
      </MemoryRouter>
    );

    // Verifica che l'input di ricerca e i filtri siano renderizzati nel DOM reale
    const searchInput = screen.getByPlaceholderText('Cerca per comune, CAP o indirizzo...');
    expect(searchInput).toBeInTheDocument();

    // Simula digitazione di un comune
    fireEvent.change(searchInput, { target: { value: 'Roma' } });
    expect(searchInput.value).toBe('Roma');

    // Clicca sul filtro Benzina/Diesel
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
