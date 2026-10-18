import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import Maintenance from '../../../client/src/components/Maintenance';

describe('Maintenance Component', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('dark');
    });

    it('renders the maintenance heading and brand info', () => {
        render(<Maintenance />);
        expect(screen.getAllByText(/FuelFinder Italia/i).length).toBeGreaterThan(0);
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Sito Temporaneamente in Manutenzione/i);
        expect(screen.getByText(/Manutenzione Programmata/i)).toBeInTheDocument();
    });

    it('toggles theme when button is clicked and updates documentElement and localStorage', () => {
        render(<Maintenance />);
        const themeBtn = screen.getByRole('button', { name: /cambia tema/i });

        // Default starts as dark (set by localStorage or fallback)
        expect(document.documentElement.classList.contains('dark')).toBe(true);

        // Click to toggle to light
        fireEvent.click(themeBtn);
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(localStorage.getItem('theme')).toBe('light');

        // Click to toggle back to dark
        fireEvent.click(themeBtn);
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('initializes with theme stored in localStorage', () => {
        localStorage.setItem('theme', 'light');
        render(<Maintenance />);
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
});
