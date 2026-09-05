import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Filters from '../../../../src/components/search/Filters';
import * as StationsContext from '../../../../src/context/StationsContext';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key })
}));

describe('Filters Component - Full Unit Coverage', () => {
  it('modifica raggio, tipo carburante e tipo servizio tramite context', () => {
    const setRadius = vi.fn();
    const setFuelType = vi.fn();
    const setServiceType = vi.fn();

    vi.spyOn(StationsContext, 'useStations').mockReturnValue({
      radius: 10,
      setRadius,
      fuelType: 'Benzina',
      setFuelType,
      serviceType: '1',
      setServiceType
    });

    render(<Filters />);

    // Test Radius change
    const radiusSelect = screen.getByLabelText('lbl_radius');
    fireEvent.change(radiusSelect, { target: { value: '20' } });
    expect(setRadius).toHaveBeenCalledWith(20);

    // Test Fuel change
    const fuelSelect = screen.getByLabelText('lbl_fuel');
    fireEvent.change(fuelSelect, { target: { value: 'Gasolio' } });
    expect(setFuelType).toHaveBeenCalledWith('Gasolio');

    // Test Service change
    const serviceSelect = screen.getByLabelText('lbl_service');
    fireEvent.change(serviceSelect, { target: { value: '0' } });
    expect(setServiceType).toHaveBeenCalledWith('0');
  });
});
