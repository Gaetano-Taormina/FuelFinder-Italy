import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import CapitalMarkers from '../../../src/components/CapitalMarkers';

vi.mock('react-leaflet', () => ({
  Marker: ({ children, position }) => (
    <div data-testid="capital-marker" data-pos={JSON.stringify(position)}>
      {children}
    </div>
  ),
  Popup: ({ children }) => <div data-testid="capital-popup">{children}</div>
}));

describe('CapitalMarkers Component', () => {
  it('renders all capital markers and popups correctly', () => {
    const { getAllByTestId } = render(<CapitalMarkers />);
    const markers = getAllByTestId('capital-marker');
    expect(markers.length).toBe(7); // Italy, San Marino, Vatican, France, Switzerland, Austria, Slovenia

    const popups = getAllByTestId('capital-popup');
    expect(popups.length).toBe(7);
  });
});
