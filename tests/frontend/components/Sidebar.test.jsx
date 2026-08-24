import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from '../../../src/components/Sidebar';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key })
}));

describe('Sidebar Component', () => {
  it('dovrebbe renderizzare aperta con città specificata e chiudersi al click', () => {
    const handleClose = vi.fn();
    render(
      <BrowserRouter>
        <Sidebar isOpen={true} onClose={handleClose} cityName="Milano" langPrefix="it" />
      </BrowserRouter>
    );

    expect(screen.getByText('Milano')).toBeInTheDocument();
    expect(screen.getByText('FuelFinder')).toBeInTheDocument();

    // Trova il bottone di chiusura
    const closeBtn = screen.getByLabelText('Chiudi menu');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Clicca l'overlay
    // L'overlay non ha ruolo semantico facilmente accessibile se non è un button, ma possiamo prenderlo verificando la presenza della classe
    // Più facile: cliccare un link che ha onClick={onClose}
    const homeLink = screen.getByText('sidebar_home');
    fireEvent.click(homeLink);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('dovrebbe renderizzare chiusa e con città di default (Italia) e lingua inglese', () => {
    render(
      <BrowserRouter>
        <Sidebar isOpen={false} onClose={vi.fn()} cityName="" langPrefix="en" />
      </BrowserRouter>
    );

    // Quando non c'è cityName, usa "Italia" come fallback
    expect(screen.getByText('Italia')).toBeInTheDocument();
    
    // Il link explore dovrebbe puntare a /en/explore quando langPrefix è en
    const exploreLink = screen.getByText('sidebar_explore');
    expect(exploreLink.getAttribute('href')).toBe('/en/explore');
  });

  it('dovrebbe usare il fallback IT per explore se langPrefix è sconosciuto', () => {
    render(
      <BrowserRouter>
        <Sidebar isOpen={false} onClose={vi.fn()} cityName="" langPrefix="fr" />
      </BrowserRouter>
    );

    const exploreLink = screen.getByText('sidebar_explore');
    expect(exploreLink.getAttribute('href')).toBe('/fr/esplora');
  });
});
