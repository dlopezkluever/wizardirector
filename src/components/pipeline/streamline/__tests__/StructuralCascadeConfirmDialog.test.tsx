import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StructuralCascadeConfirmDialog } from '../StructuralCascadeConfirmDialog';

describe('StructuralCascadeConfirmDialog', () => {
  it('renders nothing interactive when closed', () => {
    render(<StructuralCascadeConfirmDialog open={false} items={[]} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByText(/this answer affects the plot/i)).not.toBeInTheDocument();
  });

  it('shows each affected file and its diff summary when open', () => {
    render(
      <StructuralCascadeConfirmDialog
        open
        items={[{ fileName: 'beat-sheet.txt', diffSummary: 'Re-split scene 3 into two beats.' }]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText(/this answer affects the plot/i)).toBeInTheDocument();
    expect(screen.getByText('beat-sheet.txt')).toBeInTheDocument();
    expect(screen.getByText('Re-split scene 3 into two beats.')).toBeInTheDocument();
  });

  it('calls onConfirm when the apply button is clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <StructuralCascadeConfirmDialog open items={[{ fileName: 'a.txt', diffSummary: 'x' }]} onConfirm={onConfirm} onCancel={vi.fn()} />
    );

    await user.click(screen.getByRole('button', { name: /apply and continue/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <StructuralCascadeConfirmDialog open items={[{ fileName: 'a.txt', diffSummary: 'x' }]} onConfirm={vi.fn()} onCancel={onCancel} />
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
