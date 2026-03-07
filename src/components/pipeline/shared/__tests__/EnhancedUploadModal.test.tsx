/**
 * EnhancedUploadModal Component Tests
 *
 * Tests the 3.7 Phase 1 modal UI:
 * - Description reconciliation sections render
 * - Action buttons present / hidden based on assetType
 * - Edit Image input toggle
 * - Accept calls onAccept with final description + image
 * - Cancel closes modal
 * - Action buttons trigger callbacks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedUploadModal } from '../EnhancedUploadModal';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Default props factory
// ---------------------------------------------------------------------------

function defaultProps(overrides: Partial<Parameters<typeof EnhancedUploadModal>[0]> = {}) {
  return {
    isOpen: true,
    onClose: vi.fn(),
    assetName: 'John Doe',
    assetType: 'character',
    currentDescription: 'A tall man with dark hair',
    extractedDescription: 'A man in a blue suit standing upright',
    suggestedMerge: 'A tall man with dark hair wearing a blue suit',
    confidence: 0.85,
    initialImageUrl: 'https://storage.example.com/uploaded.png',
    onEditImage: vi.fn().mockResolvedValue({ jobId: 'edit-job' }),
    onApplyStyle: vi.fn().mockResolvedValue({ jobId: 'style-job' }),
    onRemoveBackground: vi.fn().mockResolvedValue({ jobId: 'bg-job' }),
    onRegenerate: vi.fn().mockResolvedValue({ jobId: 'regen-job' }),
    onPollJob: vi.fn().mockResolvedValue({ status: 'completed', publicUrl: 'https://storage.example.com/new.png' }),
    onAccept: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EnhancedUploadModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Rendering
  // =========================================================================
  describe('renders correctly', () => {
    it('should show dialog title', () => {
      render(<EnhancedUploadModal {...defaultProps()} />);
      expect(screen.getByText('Review Uploaded Image')).toBeInTheDocument();
    });

    it('should show asset name', () => {
      render(<EnhancedUploadModal {...defaultProps()} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should show confidence badge', () => {
      render(<EnhancedUploadModal {...defaultProps()} />);
      expect(screen.getByText('85% match')).toBeInTheDocument();
    });

    it('should show current description', () => {
      render(<EnhancedUploadModal {...defaultProps()} />);
      expect(screen.getByText('A tall man with dark hair')).toBeInTheDocument();
    });

    it('should show extracted description', () => {
      render(<EnhancedUploadModal {...defaultProps()} />);
      expect(screen.getByText('A man in a blue suit standing upright')).toBeInTheDocument();
    });

    it('should show editable final description with suggested merge', () => {
      render(<EnhancedUploadModal {...defaultProps()} />);
      const textarea = screen.getByPlaceholderText('Edit the final description...');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue('A tall man with dark hair wearing a blue suit');
    });

    it('should NOT show current description section when empty', () => {
      render(<EnhancedUploadModal {...defaultProps({ currentDescription: '' })} />);
      expect(screen.queryByText('Current Description')).not.toBeInTheDocument();
    });

    it('should show uploaded image', () => {
      render(<EnhancedUploadModal {...defaultProps()} />);
      const img = screen.getByAltText('John Doe');
      expect(img).toHaveAttribute('src', 'https://storage.example.com/uploaded.png');
    });
  });

  // =========================================================================
  // Action Buttons
  // =========================================================================
  describe('action buttons', () => {
    it('should show Edit Image button', () => {
      render(<EnhancedUploadModal {...defaultProps()} />);
      expect(screen.getByText('Edit Image')).toBeInTheDocument();
    });

    it('should show Apply Style button', () => {
      render(<EnhancedUploadModal {...defaultProps()} />);
      expect(screen.getByText('Apply Style')).toBeInTheDocument();
    });

    it('should show Regenerate button', () => {
      render(<EnhancedUploadModal {...defaultProps()} />);
      expect(screen.getByText('Regenerate')).toBeInTheDocument();
    });

    it('should show Remove BG button for character type', () => {
      render(<EnhancedUploadModal {...defaultProps({ assetType: 'character' })} />);
      expect(screen.getByText('Remove BG')).toBeInTheDocument();
    });

    it('should show Remove BG button for prop type', () => {
      render(<EnhancedUploadModal {...defaultProps({ assetType: 'prop' })} />);
      expect(screen.getByText('Remove BG')).toBeInTheDocument();
    });

    it('should show Remove BG button for extra_archetype type', () => {
      render(<EnhancedUploadModal {...defaultProps({ assetType: 'extra_archetype' })} />);
      expect(screen.getByText('Remove BG')).toBeInTheDocument();
    });

    it('should NOT show Remove BG button for location type', () => {
      render(<EnhancedUploadModal {...defaultProps({ assetType: 'location' })} />);
      expect(screen.queryByText('Remove BG')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Edit Image Input Toggle
  // =========================================================================
  describe('edit image input', () => {
    it('should not show edit input initially', () => {
      render(<EnhancedUploadModal {...defaultProps()} />);
      expect(screen.queryByPlaceholderText(/change suit/i)).not.toBeInTheDocument();
    });

    it('should show edit input after clicking Edit Image', async () => {
      render(<EnhancedUploadModal {...defaultProps()} />);
      fireEvent.click(screen.getByText('Edit Image'));
      expect(screen.getByPlaceholderText(/change suit/i)).toBeInTheDocument();
    });

    it('should show Go button when edit input is visible', () => {
      render(<EnhancedUploadModal {...defaultProps()} />);
      fireEvent.click(screen.getByText('Edit Image'));
      expect(screen.getByText('Go')).toBeInTheDocument();
    });

    it('should hide edit input when Edit Image is clicked again', () => {
      render(<EnhancedUploadModal {...defaultProps()} />);
      fireEvent.click(screen.getByText('Edit Image'));
      expect(screen.getByPlaceholderText(/change suit/i)).toBeInTheDocument();

      fireEvent.click(screen.getByText('Edit Image'));
      expect(screen.queryByPlaceholderText(/change suit/i)).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Accept / Cancel
  // =========================================================================
  describe('accept and cancel', () => {
    it('should show Accept and Cancel buttons', () => {
      render(<EnhancedUploadModal {...defaultProps()} />);
      expect(screen.getByText('Accept')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should call onAccept with final description and current image on Accept', () => {
      const props = defaultProps();
      render(<EnhancedUploadModal {...props} />);
      fireEvent.click(screen.getByText('Accept'));

      expect(props.onAccept).toHaveBeenCalledWith(
        'A tall man with dark hair wearing a blue suit',
        'https://storage.example.com/uploaded.png'
      );
    });

    it('should call onAccept with edited description', async () => {
      const user = userEvent.setup();
      const props = defaultProps();
      render(<EnhancedUploadModal {...props} />);

      const textarea = screen.getByPlaceholderText('Edit the final description...');
      await user.clear(textarea);
      await user.type(textarea, 'Custom description');
      fireEvent.click(screen.getByText('Accept'));

      expect(props.onAccept).toHaveBeenCalledWith(
        'Custom description',
        'https://storage.example.com/uploaded.png'
      );
    });

    it('should call onClose on Accept', () => {
      const props = defaultProps();
      render(<EnhancedUploadModal {...props} />);
      fireEvent.click(screen.getByText('Accept'));
      expect(props.onClose).toHaveBeenCalled();
    });

    it('should call onClose on Cancel', () => {
      const props = defaultProps();
      render(<EnhancedUploadModal {...props} />);
      fireEvent.click(screen.getByText('Cancel'));
      expect(props.onClose).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Action Callbacks
  // =========================================================================
  describe('action callbacks', () => {
    it('should call onApplyStyle with reference image and description', async () => {
      const props = defaultProps();
      render(<EnhancedUploadModal {...props} />);
      fireEvent.click(screen.getByText('Apply Style'));

      await waitFor(() => {
        expect(props.onApplyStyle).toHaveBeenCalledWith({
          referenceImageUrl: 'https://storage.example.com/uploaded.png',
          description: 'A tall man with dark hair wearing a blue suit',
        });
      });
    });

    it('should call onRemoveBackground with reference image and description', async () => {
      const props = defaultProps();
      render(<EnhancedUploadModal {...props} />);
      fireEvent.click(screen.getByText('Remove BG'));

      await waitFor(() => {
        expect(props.onRemoveBackground).toHaveBeenCalledWith({
          referenceImageUrl: 'https://storage.example.com/uploaded.png',
          description: 'A tall man with dark hair wearing a blue suit',
        });
      });
    });

    it('should call onRegenerate with description only', async () => {
      const props = defaultProps();
      render(<EnhancedUploadModal {...props} />);
      fireEvent.click(screen.getByText('Regenerate'));

      await waitFor(() => {
        expect(props.onRegenerate).toHaveBeenCalledWith({
          description: 'A tall man with dark hair wearing a blue suit',
        });
      });
    });

    it('should call onEditImage with instructions, reference, and description', async () => {
      const user = userEvent.setup();
      const props = defaultProps();
      render(<EnhancedUploadModal {...props} />);

      // Open edit input
      fireEvent.click(screen.getByText('Edit Image'));
      const input = screen.getByPlaceholderText(/change suit/i);
      await user.type(input, 'make hair blonde');
      fireEvent.click(screen.getByText('Go'));

      await waitFor(() => {
        expect(props.onEditImage).toHaveBeenCalledWith({
          referenceImageUrl: 'https://storage.example.com/uploaded.png',
          editInstructions: 'make hair blonde',
          description: 'A tall man with dark hair wearing a blue suit',
        });
      });
    });
  });

  // =========================================================================
  // Carousel Navigation
  // =========================================================================
  describe('carousel navigation', () => {
    it('should not show carousel nav with only one image', () => {
      render(<EnhancedUploadModal {...defaultProps()} />);
      expect(screen.queryByText(/1 \/ 1/)).not.toBeInTheDocument();
    });

    it('should show carousel nav after a successful action', async () => {
      const props = defaultProps();
      render(<EnhancedUploadModal {...props} />);

      // Trigger an action that completes
      fireEvent.click(screen.getByText('Apply Style'));

      await waitFor(() => {
        expect(screen.getByText('2 / 2')).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // Fallback: no suggestedMerge
  // =========================================================================
  describe('fallback descriptions', () => {
    it('should use extractedDescription if suggestedMerge is empty', () => {
      render(
        <EnhancedUploadModal
          {...defaultProps({ suggestedMerge: '' })}
        />
      );

      const textarea = screen.getByPlaceholderText('Edit the final description...');
      expect(textarea).toHaveValue('A man in a blue suit standing upright');
    });
  });
});
