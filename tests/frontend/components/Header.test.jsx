import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Header from '../../../src/components/Header';
import { BrowserRouter, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

vi.mock('react-i18next', () => ({
  useTranslation: vi.fn()
}));

vi.mock('../../../src/components/Sidebar', () => ({
  default: ({ isOpen, cityName, onClose }) => (
    <div data-testid="mock-sidebar">
      Status: {isOpen ? 'Open' : 'Closed'}, City: {cityName}
      <button onClick={onClose} data-testid="btn-close-mock">Close</button>
    </div>
  )
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn()
  };
});

describe('Header Component', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    localStorage.clear();
    useParams.mockReturnValue({ city: 'roma' });
    useTranslation.mockReturnValue({ 
      t: (key) => key, 
      i18n: { resolvedLanguage: 'it' } 
    });
  });

  it('renders header in dark mode by default and toggles sidebar on click', () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    
    const sidebar = screen.getByTestId('mock-sidebar');
    expect(sidebar).toHaveTextContent('Status: Closed');
    expect(sidebar).toHaveTextContent('City: Roma');

    const menuButton = screen.getByRole('button', { name: /Apri Menu/i });
    fireEvent.click(menuButton);
    
    expect(sidebar).toHaveTextContent('Status: Open');
    expect(document.body.style.overflow).toBe('hidden');
    
    const logoImg = screen.getByAltText('Logo');
    fireEvent.error(logoImg);
    expect(logoImg.style.display).toBe('none');
    
    const mockCloseBtn = screen.getByTestId('btn-close-mock');
    fireEvent.click(mockCloseBtn);
    
    expect(sidebar).toHaveTextContent('Status: Closed');
  });

  it('renders header on home page without city param', () => {
    useParams.mockReturnValue({}); 
    
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    
    const sidebar = screen.getByTestId('mock-sidebar');
    expect(sidebar).toHaveTextContent('City:');
  });

  it('renders header in light mode when saved in localStorage', () => {
    localStorage.setItem('theme', 'light');
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('uses "it" as default language fallback when not resolved', () => {
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
