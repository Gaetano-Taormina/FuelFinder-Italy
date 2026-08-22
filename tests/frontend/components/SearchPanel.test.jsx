import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SearchPanel from '../../../src/components/SearchPanel';
import { BrowserRouter } from 'react-router-dom';
import * as StationsContext from '../../../src/context/StationsContext';

// Mock delle traduzioni
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        dyn_found: 'Trovati',
        dyn_stations: 'distributori.',
        status_ready: 'I dati sono pronti.'
      };
      return translations[key] || key;
    }
  })
}));

// Mock dei componenti figli per isolare il test su SearchPanel
vi.mock('../../../src/components/search/LocationInput', () => ({
  default: () => <div data-testid="location-input-mock">Input</div>
}));
vi.mock('../../../src/components/search/Filters', () => ({
  default: () => <div data-testid="filters-mock">Filtri</div>
}));

describe('SearchPanel Component - Test Comportamentale', () => {
  it('mostra il messaggio "I dati sono pronti." quando non ci sono stazioni', () => {
    // Simuliamo che il Context ritorni un array vuoto
    vi.spyOn(StationsContext, 'useStations').mockReturnValue({
      stations: [],
      totalStations: 0
    });

    render(
      <BrowserRouter>
        <SearchPanel />
      </BrowserRouter>
    );

    // Verifichiamo che i figli siano renderizzati
    expect(screen.getByTestId('location-input-mock')).toBeInTheDocument();
    expect(screen.getByTestId('filters-mock')).toBeInTheDocument();

    // Verifichiamo il comportamento della UI: deve mostrare il messaggio di base
    expect(screen.getByText('I dati sono pronti.')).toBeInTheDocument();
  });

  it('mostra il numero di stazioni trovate se la ricerca produce risultati', () => {
    // Simuliamo che l'utente abbia cercato Roma e il Context ritorni 3 stazioni
    vi.spyOn(StationsContext, 'useStations').mockReturnValue({
      stations: [{ id: 1 }, { id: 2 }, { id: 3 }],
      totalStations: 10
    });

    render(
      <BrowserRouter>
        <SearchPanel />
      </BrowserRouter>
    );

    // Verifichiamo il comportamento: deve mostrare "Trovati 3 distributori." e "su 10"
    expect(screen.getByText(/Trovati/i)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/su 10/i)).toBeInTheDocument();
    expect(screen.getByText(/distributori/i)).toBeInTheDocument();
  });

  it('non mostra "su X" se tutte le stazioni sono visualizzate', () => {
    vi.spyOn(StationsContext, 'useStations').mockReturnValue({
      stations: [{ id: 1 }, { id: 2 }],
      totalStations: 2
    });

    render(
      <BrowserRouter>
        <SearchPanel />
      </BrowserRouter>
    );

    expect(screen.getByText(/Trovati/i)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.queryByText(/su/i)).not.toBeInTheDocument();
  });
});
