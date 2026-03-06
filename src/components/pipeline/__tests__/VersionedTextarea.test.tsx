/**
 * VersionedTextarea Component Tests
 *
 * Tests: version counter display, navigation arrows, save button, lock toggle,
 * character count, disabled states.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VersionedTextarea } from '../VersionedTextarea';
import type { TextFieldVersion } from '@/lib/services/textFieldVersionService';

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeVersion(overrides: Partial<TextFieldVersion> = {}): TextFieldVersion {
  return {
    id: 'v1',
    entityType: 'shot',
    entityId: 'shot-1',
    fieldName: 'frame_prompt',
    content: 'Version 1 content',
    isSelected: true,
    source: 'user_save',
    versionNumber: 1,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderWithQueryClient(ui: React.ReactElement) {
  const qc = createQueryClient();
  return render(
    <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VersionedTextarea', () => {
  const defaultProps = {
    fetchVersions: vi.fn().mockResolvedValue([]),
    createVersion: vi.fn().mockResolvedValue(makeVersion({ id: 'v-new', versionNumber: 2 })),
    selectVersion: vi.fn().mockResolvedValue(makeVersion()),
    queryKey: ['test-versions', 'shot-1', 'frame_prompt'],
    value: 'Current text',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps.fetchVersions.mockResolvedValue([]);
  });

  describe('basic rendering', () => {
    it('should render a textarea with the provided value', () => {
      renderWithQueryClient(
        <VersionedTextarea {...defaultProps} value="Hello world" placeholder="Type here..." />
      );

      const textarea = screen.getByPlaceholderText('Type here...');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue('Hello world');
    });

    it('should render label when provided', () => {
      renderWithQueryClient(
        <VersionedTextarea {...defaultProps} label="Frame Prompt" />
      );

      expect(screen.getByText('Frame Prompt')).toBeInTheDocument();
    });

    it('should call onChange when user types', () => {
      const onChange = vi.fn();
      renderWithQueryClient(
        <VersionedTextarea {...defaultProps} onChange={onChange} placeholder="Type..." />
      );

      fireEvent.change(screen.getByPlaceholderText('Type...'), { target: { value: 'New text' } });
      expect(onChange).toHaveBeenCalledWith('New text');
    });
  });

  describe('character count', () => {
    it('should display character count when maxLength is set', () => {
      renderWithQueryClient(
        <VersionedTextarea {...defaultProps} value="Hello" maxLength={100} />
      );

      expect(screen.getByText('5/100 characters')).toBeInTheDocument();
    });

    it('should not show character count when maxLength is not set', () => {
      renderWithQueryClient(
        <VersionedTextarea {...defaultProps} value="Hello" />
      );

      expect(screen.queryByText(/characters/)).not.toBeInTheDocument();
    });
  });

  describe('lock toggle', () => {
    it('should show lock toggle when showLockToggle is true', () => {
      renderWithQueryClient(
        <VersionedTextarea
          {...defaultProps}
          showLockToggle
          locked={true}
          onLockChange={vi.fn()}
        />
      );

      expect(screen.getByText('Locked')).toBeInTheDocument();
    });

    it('should show Editing when unlocked', () => {
      renderWithQueryClient(
        <VersionedTextarea
          {...defaultProps}
          showLockToggle
          locked={false}
          onLockChange={vi.fn()}
        />
      );

      expect(screen.getByText('Editing')).toBeInTheDocument();
    });

    it('should call onLockChange when toggle is clicked', () => {
      const onLockChange = vi.fn();
      renderWithQueryClient(
        <VersionedTextarea
          {...defaultProps}
          showLockToggle
          locked={true}
          onLockChange={onLockChange}
        />
      );

      fireEvent.click(screen.getByText('Locked'));
      expect(onLockChange).toHaveBeenCalledWith(false);
    });

    it('should disable textarea when locked', () => {
      renderWithQueryClient(
        <VersionedTextarea
          {...defaultProps}
          showLockToggle
          locked={true}
          placeholder="Test..."
        />
      );

      expect(screen.getByPlaceholderText('Test...')).toBeDisabled();
    });

    it('should not show lock toggle when showLockToggle is false', () => {
      renderWithQueryClient(
        <VersionedTextarea {...defaultProps} showLockToggle={false} />
      );

      expect(screen.queryByText('Locked')).not.toBeInTheDocument();
      expect(screen.queryByText('Editing')).not.toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('should disable textarea when disabled prop is true', () => {
      renderWithQueryClient(
        <VersionedTextarea {...defaultProps} disabled={true} placeholder="Disabled..." />
      );

      expect(screen.getByPlaceholderText('Disabled...')).toBeDisabled();
    });
  });

  describe('version counter and navigation', () => {
    it('should show version counter when versions exist', async () => {
      // Versions are newest-first: v2 at index 0 (selected), v1 at index 1
      // displayNumber = totalVersions - selectedIndex = 2 - 0 = 2
      const versions = [
        makeVersion({ id: 'v2', versionNumber: 2, isSelected: true }),
        makeVersion({ id: 'v1', versionNumber: 1, isSelected: false }),
      ];
      defaultProps.fetchVersions.mockResolvedValue(versions);

      renderWithQueryClient(
        <VersionedTextarea {...defaultProps} />
      );

      await waitFor(() => {
        expect(screen.getByText('(v2 of 2)')).toBeInTheDocument();
      });
    });

    it('should show navigation arrows when 2+ versions exist', async () => {
      const versions = [
        makeVersion({ id: 'v2', versionNumber: 2, isSelected: true }),
        makeVersion({ id: 'v1', versionNumber: 1, isSelected: false }),
      ];
      defaultProps.fetchVersions.mockResolvedValue(versions);

      renderWithQueryClient(
        <VersionedTextarea {...defaultProps} />
      );

      await waitFor(() => {
        expect(screen.getByTitle('Older version')).toBeInTheDocument();
        expect(screen.getByTitle('Newer version')).toBeInTheDocument();
      });
    });

    it('should not show arrows when only 1 version exists', async () => {
      defaultProps.fetchVersions.mockResolvedValue([makeVersion()]);

      renderWithQueryClient(
        <VersionedTextarea {...defaultProps} />
      );

      await waitFor(() => {
        expect(screen.getByText('(v1 of 1)')).toBeInTheDocument();
      });

      expect(screen.queryByTitle('Older version')).not.toBeInTheDocument();
    });

    it('should not show arrows when 0 versions exist', () => {
      defaultProps.fetchVersions.mockResolvedValue([]);

      renderWithQueryClient(
        <VersionedTextarea {...defaultProps} />
      );

      expect(screen.queryByTitle('Older version')).not.toBeInTheDocument();
    });
  });

  describe('save button', () => {
    it('should show Save button when value differs from selected version', async () => {
      const versions = [makeVersion({ content: 'Original' })];
      defaultProps.fetchVersions.mockResolvedValue(versions);

      renderWithQueryClient(
        <VersionedTextarea {...defaultProps} value="Modified text" />
      );

      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument();
      });
    });

    it('should not show Save button when value matches selected version', async () => {
      const versions = [makeVersion({ content: 'Current text' })];
      defaultProps.fetchVersions.mockResolvedValue(versions);

      renderWithQueryClient(
        <VersionedTextarea {...defaultProps} value="Current text" />
      );

      await waitFor(() => {
        expect(screen.getByText('(v1 of 1)')).toBeInTheDocument();
      });

      expect(screen.queryByText('Save')).not.toBeInTheDocument();
    });

    it('should not show Save button when field is locked', async () => {
      const versions = [makeVersion({ content: 'Original' })];
      defaultProps.fetchVersions.mockResolvedValue(versions);

      renderWithQueryClient(
        <VersionedTextarea
          {...defaultProps}
          value="Modified"
          showLockToggle
          locked={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('(v1 of 1)')).toBeInTheDocument();
      });

      expect(screen.queryByText('Save')).not.toBeInTheDocument();
    });

    it('should call createVersion when Save is clicked', async () => {
      const versions = [makeVersion({ content: 'Original' })];
      defaultProps.fetchVersions.mockResolvedValue(versions);
      const createVersion = vi.fn().mockResolvedValue(makeVersion({ id: 'v-new', content: 'Modified', versionNumber: 2 }));

      renderWithQueryClient(
        <VersionedTextarea
          {...defaultProps}
          createVersion={createVersion}
          value="Modified"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(createVersion).toHaveBeenCalledWith('Modified', 'user_save');
      });
    });
  });
});
