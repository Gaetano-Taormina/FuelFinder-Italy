import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import InstallModal from '../../../src/components/InstallModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key })
}));

describe('InstallModal Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<InstallModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with QR code and instructions when isOpen is true', () => {
    render(<InstallModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('install_modal_title')).toBeInTheDocument();
    expect(screen.getByText('install_modal_subtitle')).toBeInTheDocument();
    expect(screen.getByText('install_ios_title')).toBeInTheDocument();
    expect(screen.getByText('install_android_title')).toBeInTheDocument();
    expect(screen.getByAltText('QR Code FuelFinder')).toBeInTheDocument();
  });

  it('invokes onClose when clicking close button and backdrop', () => {
    const handleClose = vi.fn();
    render(<InstallModal isOpen={true} onClose={handleClose} />);

    const closeButtons = screen.getAllByLabelText('btn_close');
    fireEvent.click(closeButtons[0]); // backdrop
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.click(closeButtons[1]); // top close button
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('handles Escape key down on dialog to close modal, ignoring other keys', () => {
    const handleClose = vi.fn();
    render(<InstallModal isOpen={true} onClose={handleClose} />);

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Enter' });
    expect(handleClose).not.toHaveBeenCalled();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('copies link to clipboard successfully and resets state after timeout', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      configurable: true,
      writable: true
    });

    render(<InstallModal isOpen={true} onClose={vi.fn()} />);
    const copyBtn = screen.getByText('install_copy_link');

    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(mockWriteText).toHaveBeenCalledWith('https://fuelfinder-msn8.onrender.com/');
    expect(screen.getByText('install_link_copied')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2600);
    });

    expect(screen.getByText('install_copy_link')).toBeInTheDocument();
  });

  it('handles clipboard failure gracefully and shows copied status', async () => {
    const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard error'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      configurable: true,
      writable: true
    });

    render(<InstallModal isOpen={true} onClose={vi.fn()} />);
    const copyBtn = screen.getByText('install_copy_link');

    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(screen.getByText('install_link_copied')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2600);
    });

    expect(screen.getByText('install_copy_link')).toBeInTheDocument();
  });
});
