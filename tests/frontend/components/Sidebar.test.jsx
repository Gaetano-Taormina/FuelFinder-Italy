import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from '../../../src/components/Sidebar';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key })
}));

describe('Sidebar Component', () => {
  it('renders open state with specified city and closes on click / keyboard', () => {
    const handleClose = vi.fn();
    render(
      <BrowserRouter>
        <Sidebar isOpen={true} onClose={handleClose} cityName="Milano" langPrefix="it" />
      </BrowserRouter>
    );

    expect(screen.getByText('Milano')).toBeInTheDocument();
    expect(screen.getByText('FuelFinder')).toBeInTheDocument();

    const closeBtn = screen.getByLabelText('Chiudi menu');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const homeLink = screen.getByText('sidebar_home');
    fireEvent.click(homeLink);
    expect(handleClose).toHaveBeenCalledTimes(2);

    const overlay = document.querySelector('.fixed.inset-0.bg-slate-900\\/60');
    fireEvent.keyDown(overlay, { key: 'Enter', code: 'Enter' });
    expect(handleClose).toHaveBeenCalledTimes(3);
    
    // Ignored key does not trigger close
    fireEvent.keyDown(overlay, { key: 'A', code: 'KeyA' });
    expect(handleClose).toHaveBeenCalledTimes(3);
  });

  it('renders closed state with default city (Italia) and English language', () => {
    render(
      <BrowserRouter>
        <Sidebar isOpen={false} onClose={vi.fn()} cityName="" langPrefix="en" />
      </BrowserRouter>
    );

    expect(screen.getByText('Italia')).toBeInTheDocument();
    
    const exploreLink = screen.getByText('sidebar_explore');
    expect(exploreLink.getAttribute('href')).toBe('/en/explore');
  });

  it('falls back to IT explore route if langPrefix is not English', () => {
    render(
      <BrowserRouter>
        <Sidebar isOpen={false} onClose={vi.fn()} cityName="" langPrefix="fr" />
      </BrowserRouter>
    );

    const exploreLink = screen.getByText('sidebar_explore');
    expect(exploreLink.getAttribute('href')).toBe('/fr/esplora');
  });
});
