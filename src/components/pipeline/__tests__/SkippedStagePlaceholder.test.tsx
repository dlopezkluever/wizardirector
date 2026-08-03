import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SkippedStagePlaceholder } from '../SkippedStagePlaceholder';

describe('SkippedStagePlaceholder', () => {
  it('renders both CTAs by default and wires them to the correct callbacks', async () => {
    const onGenerateFromScript = vi.fn();
    const onWriteMyself = vi.fn();
    const user = userEvent.setup();

    render(
      <SkippedStagePlaceholder
        stageNumber={2}
        stageLabel="Treatment"
        onGenerateFromScript={onGenerateFromScript}
        onWriteMyself={onWriteMyself}
      />
    );

    expect(screen.getByText('SKIPPED')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /stage 2 — treatment was skipped/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /generate this now/i }));
    expect(onGenerateFromScript).toHaveBeenCalledTimes(1);
    expect(onWriteMyself).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /write this myself/i }));
    expect(onWriteMyself).toHaveBeenCalledTimes(1);
  });

  it('hides the "Generate this now" CTA when allowGenerate is false (Stage 4 has nothing to backfill from)', () => {
    render(
      <SkippedStagePlaceholder
        stageNumber={4}
        stageLabel="Master Script"
        onGenerateFromScript={vi.fn()}
        onWriteMyself={vi.fn()}
        allowGenerate={false}
      />
    );

    expect(screen.queryByRole('button', { name: /generate this now/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /write this myself/i })).toBeInTheDocument();
  });

  it('disables both buttons while a transition is in flight', () => {
    render(
      <SkippedStagePlaceholder
        stageNumber={3}
        stageLabel="Beat Sheet"
        onGenerateFromScript={vi.fn()}
        onWriteMyself={vi.fn()}
        isGenerating
      />
    );

    expect(screen.getByRole('button', { name: /generate this now/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /write this myself/i })).toBeDisabled();
  });
});
