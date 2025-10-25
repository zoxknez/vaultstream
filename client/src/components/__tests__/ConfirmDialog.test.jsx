import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import ConfirmDialog from '../ConfirmDialog.jsx';

vi.mock('lucide-react', () => ({
  AlertTriangle: () => null,
  X: () => null,
}));

describe('ConfirmDialog', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    render(
      <ConfirmDialog
        open={false}
        title="Delete item"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders dialog content and handles confirm and cancel actions', async () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ConfirmDialog
        open
        title="Delete item"
        message="Are you sure?"
        confirmLabel="Delete"
        cancelLabel="Keep"
        danger
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    const dialog = screen.getByRole('dialog', { name: /delete item/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText(/keep/i, { selector: 'button' }));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('invokes cancel on overlay click and Escape key, removing listener when closed', async () => {
    const handleCancel = vi.fn();

    const { rerender } = render(
      <ConfirmDialog
        open
        title="Sign out"
        message="Confirm sign out"
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    const dialog = screen.getByRole('dialog', { name: /sign out/i });
    const user = userEvent.setup();

    await user.click(dialog);
    expect(handleCancel).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleCancel).toHaveBeenCalledTimes(2);

    rerender(
      <ConfirmDialog
        open={false}
        title="Sign out"
        message="Confirm sign out"
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleCancel).toHaveBeenCalledTimes(2);
  });
});
