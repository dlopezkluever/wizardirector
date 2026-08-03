import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StreamlineReviewScreen } from '../StreamlineReviewScreen';
import type { StreamlineFile } from '../StreamlineDropZone';

function makeFile(overrides: Partial<StreamlineFile> & { id: string; name: string }): StreamlineFile {
  return {
    size: 100,
    mimeType: 'text/plain',
    isPrimary: false,
    status: 'success',
    source: 'upload',
    ...overrides,
  };
}

describe('StreamlineReviewScreen', () => {
  it('lists successful files and calls onConfirm when clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <StreamlineReviewScreen
        files={[makeFile({ id: '1', name: 'script.pdf', isPrimary: true })]}
        routing={{ lines: ['Stage 4 will be filled from script.pdf.'], creditEstimate: 'Free', canConfirm: true }}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('script.pdf')).toBeInTheDocument();
    expect(screen.getByText(/stage 4 will be filled/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /confirm & skip ahead/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables the confirm button and shows the blocked reason when canConfirm is false', () => {
    render(
      <StreamlineReviewScreen
        files={[]}
        routing={{ lines: ['Nothing to route yet.'], creditEstimate: 'Free', canConfirm: false, blockedReason: 'Add a file first.' }}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /confirm & skip ahead/i })).toBeDisabled();
    expect(screen.getByText('Add a file first.')).toBeInTheDocument();
  });

  it('surfaces a partial-failure notice without blocking the successful files', () => {
    render(
      <StreamlineReviewScreen
        files={[
          makeFile({ id: '1', name: 'good.txt', isPrimary: true }),
          makeFile({ id: '2', name: 'bad.txt', status: 'error', error: 'Corrupted' }),
        ]}
        routing={{ lines: ['Stage 4 will be filled from good.txt.'], creditEstimate: 'Free', canConfirm: true }}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('good.txt')).toBeInTheDocument();
    expect(screen.queryByText('bad.txt')).not.toBeInTheDocument();
    expect(screen.getByText(/1 file\(s\) failed to extract/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm & skip ahead/i })).not.toBeDisabled();
  });
});
