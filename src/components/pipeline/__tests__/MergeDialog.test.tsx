/**
 * MergeDialog Component Tests
 *
 * Tests the Phase A UI enhancements:
 * - Cross-type warning (amber alert) shown/hidden
 * - Type badges visible next to asset names
 * - Description section with AI Merge button
 * - Survivor description textarea present
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MergeDialog } from '../MergeDialog';
import type { ProjectAsset } from '@/types/asset';

// Mock projectAssetService (for AI merge button)
vi.mock('@/lib/services/projectAssetService', () => ({
  projectAssetService: {
    mergeDescriptions: vi.fn().mockResolvedValue('Merged description result'),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeAsset(overrides: Partial<ProjectAsset> & { id: string; name: string; asset_type: ProjectAsset['asset_type'] }): ProjectAsset {
  return {
    project_id: 'proj-1',
    description: '',
    image_prompt: '',
    image_key_url: null,
    locked: false,
    deferred: false,
    scene_numbers: [],
    global_asset_id: null,
    overridden_fields: [],
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  } as ProjectAsset;
}

const characterAsset = makeAsset({
  id: 'char-1',
  name: 'John',
  asset_type: 'character',
  description: 'A tall man with dark hair',
  scene_numbers: [1, 2],
});

const propAsset = makeAsset({
  id: 'prop-1',
  name: 'Magic Sword',
  asset_type: 'prop',
  description: 'A glowing blue sword',
  scene_numbers: [2, 3],
});

const anotherCharacter = makeAsset({
  id: 'char-2',
  name: 'Jane',
  asset_type: 'character',
  description: 'A woman in red',
  scene_numbers: [1],
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MergeDialog', () => {
  const mockOnConfirm = vi.fn().mockResolvedValue(undefined);
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Cross-type warning', () => {
    it('should show amber warning when assets have different types', () => {
      render(
        <MergeDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          assets={[characterAsset, propAsset]}
          projectId="proj-1"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText(/different types/i)).toBeInTheDocument();
      expect(screen.getByText(/will keep its type/i)).toBeInTheDocument();
    });

    it('should NOT show amber warning when all assets have same type', () => {
      render(
        <MergeDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          assets={[characterAsset, anotherCharacter]}
          projectId="proj-1"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.queryByText(/different types/i)).not.toBeInTheDocument();
    });
  });

  describe('Type badges', () => {
    it('should show type badge next to each asset name', () => {
      render(
        <MergeDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          assets={[characterAsset, propAsset]}
          projectId="proj-1"
          onConfirm={mockOnConfirm}
        />
      );

      // Character badge for John
      expect(screen.getByText('Character')).toBeInTheDocument();
      // Prop badge for Magic Sword
      expect(screen.getByText('Prop')).toBeInTheDocument();
    });

    it('should display Extra/Archetype for extra_archetype type', () => {
      const extraAsset = makeAsset({
        id: 'extra-1',
        name: 'Crowd',
        asset_type: 'extra_archetype',
        scene_numbers: [1],
      });

      render(
        <MergeDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          assets={[characterAsset, extraAsset]}
          projectId="proj-1"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText('Extra/Archetype')).toBeInTheDocument();
    });
  });

  describe('Description section', () => {
    it('should show AI Merge button', () => {
      render(
        <MergeDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          assets={[characterAsset, propAsset]}
          projectId="proj-1"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText('AI Merge')).toBeInTheDocument();
    });

    it('should show absorbed descriptions header', () => {
      render(
        <MergeDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          assets={[characterAsset, propAsset]}
          projectId="proj-1"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText('Absorbed Descriptions')).toBeInTheDocument();
    });

    it('should show survivor description header and textarea', () => {
      render(
        <MergeDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          assets={[characterAsset, propAsset]}
          projectId="proj-1"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText('Survivor Description')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/edit the merged description/i)).toBeInTheDocument();
    });

    it('should display absorbed asset descriptions as read-only', () => {
      render(
        <MergeDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          assets={[characterAsset, propAsset]}
          projectId="proj-1"
          onConfirm={mockOnConfirm}
        />
      );

      // propAsset is absorbed (characterAsset is default survivor)
      // "Magic Sword" appears in both RadioGroup and absorbed section, so use getAllByText
      expect(screen.getAllByText('Magic Sword').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('A glowing blue sword')).toBeInTheDocument();
    });
  });

  describe('Dialog basics', () => {
    it('should render dialog title with asset count', () => {
      render(
        <MergeDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          assets={[characterAsset, propAsset]}
          projectId="proj-1"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText('Merge 2 Assets')).toBeInTheDocument();
    });

    it('should show Confirm Merge button', () => {
      render(
        <MergeDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          assets={[characterAsset, propAsset]}
          projectId="proj-1"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText('Confirm Merge')).toBeInTheDocument();
    });

    it('should render nothing when fewer than 2 assets', () => {
      const { container } = render(
        <MergeDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          assets={[characterAsset]}
          projectId="proj-1"
          onConfirm={mockOnConfirm}
        />
      );

      expect(container.innerHTML).toBe('');
    });

    it('should show scene number badges', () => {
      render(
        <MergeDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          assets={[characterAsset, propAsset]}
          projectId="proj-1"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getAllByText('Sc.1')).toHaveLength(1);
      expect(screen.getAllByText('Sc.2')).toHaveLength(2); // Both assets have scene 2
      expect(screen.getAllByText('Sc.3')).toHaveLength(1);
    });
  });

  describe('Summary section', () => {
    it('should show absorbed count and survivor name', () => {
      render(
        <MergeDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          assets={[characterAsset, propAsset]}
          projectId="proj-1"
          onConfirm={mockOnConfirm}
        />
      );

      // "1 asset will be absorbed into John"
      expect(screen.getByText(/will be absorbed into/)).toBeInTheDocument();
    });
  });
});
