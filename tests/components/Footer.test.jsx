import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Footer from '../../src/components/Footer';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      if (key === 'footer_text') return 'Mocked Footer Text <a href="#">Link</a>';
      return key;
    },
  }),
}));

describe('Footer Component', () => {
  it('should render the footer with translated text', () => {
    render(<Footer />);
    const footerElement = screen.getByRole('contentinfo');
    expect(footerElement).toBeInTheDocument();
    expect(footerElement).toHaveTextContent(/Mocked Footer Text/i);
  });
});
