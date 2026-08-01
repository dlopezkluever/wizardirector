import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContinuityBaseChooser } from '../Stage10FrameGeneration';
import type { GenerationContinuityPackage, ContinuityBaseCandidate } from '@/types/locationContinuity';

function makeCandidate(overrides: Partial<ContinuityBaseCandidate> = {}): ContinuityBaseCandidate {
  return {
    frameId: 'frame-1',
    sourceShotId: 'shot-1',
    sourceShotLabel: '1',
    imageUrl: 'https://img.test/frame-1.png',
    sameLocation: true,
    sameDirection: true,
    suitability: 'strong',
    confidence: 0.95,
    reason: 'Same canonical location and same camera direction.',
    ...overrides,
  };
}

function makePackage(overrides: Partial<GenerationContinuityPackage> = {}): GenerationContinuityPackage {
  const base: GenerationContinuityPackage = {
    shotId: 'shot-2',
    framePromptInstructions: '',
    startFrameReferenceManifest: [],
    endFrameReferenceManifest: [],
    providerReadyReferences: [],
    persistedStartFrameManifest: [],
    persistedEndFrameManifest: [],
    selectedContinuityBase: null,
    continuityBaseCandidates: [],
    preview: {
      shotId: 'shot-2',
      shotLabel: '2',
      locationState: {
        shotId: 'shot-2',
        shotLabel: '2',
        rawSetting: 'Kitchen',
        state: 'resolved',
        candidates: [],
      },
      strength: 'strong',
      generationMode: 'fresh',
      referenceManifest: [],
      fallbackChain: [],
      adaptationNotes: [],
      riskNotices: [],
      continuityBase: null,
      continuityBaseCandidates: [],
    },
  };
  return { ...base, ...overrides };
}

describe('ContinuityBaseChooser', () => {
  it('shows a loading state and no candidates while fetching', () => {
    render(
      <ContinuityBaseChooser
        packageData={undefined}
        isLoading={true}
        isUpdating={false}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />
    );

    expect(screen.getByText(/Loading continuity candidates/i)).toBeInTheDocument();
    expect(screen.queryByText(/No reusable base frames yet/i)).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no candidates and nothing selected', () => {
    render(
      <ContinuityBaseChooser
        packageData={makePackage()}
        isLoading={false}
        isUpdating={false}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />
    );

    expect(screen.getByText(/No reusable base frames yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Fresh generation/i)).toBeInTheDocument();
    // No "Fresh" clear button when nothing is selected.
    expect(screen.queryByRole('button', { name: /Fresh/i })).not.toBeInTheDocument();
  });

  it('lists ranked candidates and calls onSelect when "Use" is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const candidateA = makeCandidate({ frameId: 'frame-1', sourceShotLabel: '1', suitability: 'strong' });
    const candidateB = makeCandidate({
      frameId: 'frame-2',
      sourceShotLabel: '3',
      suitability: 'usable',
      reason: 'Same location; no direction pinned on either side.',
    });

    render(
      <ContinuityBaseChooser
        packageData={makePackage({ continuityBaseCandidates: [candidateA, candidateB] })}
        isLoading={false}
        isUpdating={false}
        onSelect={onSelect}
        onClear={vi.fn()}
      />
    );

    expect(screen.getByText('Shot 1')).toBeInTheDocument();
    expect(screen.getByText('Shot 3')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Use$/i })).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: /^Use$/i })[0]);

    expect(onSelect).toHaveBeenCalledWith('frame-1');
  });

  it('marks the selected base as "Using", disables its button, and calls onClear from "Fresh"', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    const selected = makeCandidate({ frameId: 'frame-1', sourceShotLabel: '1' });

    render(
      <ContinuityBaseChooser
        packageData={makePackage({
          selectedContinuityBase: selected,
          continuityBaseCandidates: [selected],
        })}
        isLoading={false}
        isUpdating={false}
        onSelect={vi.fn()}
        onClear={onClear}
      />
    );

    expect(screen.getByText(/Using Shot 1/i)).toBeInTheDocument();
    const usingButton = screen.getByRole('button', { name: /Using/i });
    expect(usingButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Fresh/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('disables selection controls while an update is in flight', () => {
    const selected = makeCandidate({ frameId: 'frame-1', sourceShotLabel: '1' });
    const other = makeCandidate({ frameId: 'frame-2', sourceShotLabel: '2', suitability: 'usable' });

    render(
      <ContinuityBaseChooser
        packageData={makePackage({
          selectedContinuityBase: selected,
          continuityBaseCandidates: [selected, other],
        })}
        isLoading={false}
        isUpdating={true}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Fresh/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Use$/i })).toBeDisabled();
  });
});
