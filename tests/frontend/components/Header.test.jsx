import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Header from '../../../src/components/Header';
import { BrowserRouter, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// 1. Mock delle traduzioni
vi.mock('react-i18next', () => ({
  useTranslation: vi.fn()
}));

// 2. Mock della Sidebar
vi.mock('../../../src/components/Sidebar', () => ({
  default: ({ isOpen, cityName, onClose }) => (
    <div data-testid="mock-sidebar">
      Stato: {isOpen ? 'Aperta' : 'Chiusa'}, Città: {cityName}
      {/* Aggiungiamo un bottone finto per simulare la chiusura */}
      <button onClick={onClose} data-testid="btn-chiudi-mock">Chiudi</button>
    </div>
  )
}));


// Mock react-router-dom useParams dinamico
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn() // <-- Ora è una funzione vuota modificabile!
  };
});


describe('Header Component', () => {
    beforeEach(() => {
    document.documentElement.className = '';
    localStorage.clear();
    useParams.mockReturnValue({ city: 'roma' }); // <-- Aggiungi questo
    useTranslation.mockReturnValue({ 
      t: (key) => key, 
      i18n: { resolvedLanguage: 'it' } 
    });
  });


  it('dovrebbe renderizzare l\'header in dark mode (default) e aprire la sidebar al click', () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    
    // Verifica che l'header esista
    expect(screen.getByRole('banner')).toBeInTheDocument();
    
    // Verifica tema dark
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    
    // Verifica che la Sidebar sia renderizzata e chiusa di default con città "Roma"
    const sidebar = screen.getByTestId('mock-sidebar');
    expect(sidebar).toHaveTextContent('Stato: Chiusa');
    expect(sidebar).toHaveTextContent('Città: Roma');

    // Trova il bottone del menu
    const menuButton = screen.getByRole('button', { name: /Apri Menu/i });
    
    // Simula il click dell'utente sul bottone
    fireEvent.click(menuButton);
    
    // Verifica che la proprietà "isOpen" passata alla Sidebar sia diventata vera!
    expect(sidebar).toHaveTextContent('Stato: Aperta');
    
    // Verifica overflow su body
    expect(document.body.style.overflow).toBe('hidden');
    
    // Test onError handler for image
    const logoImg = screen.getByAltText('Logo');
    fireEvent.error(logoImg);
    expect(logoImg.style.display).toBe('none');
        // 1. Troviamo il bottone finto della sidebar
    const mockCloseBtn = screen.getByTestId('btn-chiudi-mock');
    
    // 2. Simuliamo che l'utente clicchi sulla X della sidebar per chiuderla
    fireEvent.click(mockCloseBtn);
    
    // 3. Verifichiamo che l'Header abbia reagito correttamente impostando isOpen a false!
    expect(sidebar).toHaveTextContent('Stato: Chiusa');

  });

  it('dovrebbe renderizzare l\'header nella home page (senza città)', () => {
    useParams.mockReturnValue({}); 
    
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    
    const sidebar = screen.getByTestId('mock-sidebar');
    expect(sidebar).toHaveTextContent('Città:');
  });

  it('dovrebbe renderizzare l\'header in light mode se specificato nel localStorage', () => {
    localStorage.setItem('theme', 'light');
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });


  it('usa "it" come lingua di default se non specificata', () => {
    // Togliamo la lingua per testare il fallback (|| 'it')
    useTranslation.mockReturnValue({
      t: (key) => key,
      i18n: {} 
    });
    
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

});
