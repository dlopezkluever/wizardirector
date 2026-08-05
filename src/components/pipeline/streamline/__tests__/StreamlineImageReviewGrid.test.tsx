import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StreamlineImageReviewGrid } from '../StreamlineImageReviewGrid';
import type { StreamlineImageCard } from '@/lib/utils/streamlineRouting';

const classifyImageMock = vi.fn();

vi.mock('@/lib/services/streamlineService', () => ({
  streamlineService: {
    classifyImage: (...args: unknown[]) => classifyImageMock(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function Harness({ knownEntityNames = [] as string[] }: { knownEntityNames?: string[] }) {
  const [images, setImages] = useState<StreamlineImageCard[]>([]);
  return (
    <StreamlineImageReviewGrid
      projectId="project-1"
      images={images}
      onImagesChange={setImages}
      knownEntityNames={knownEntityNames}
    />
  );
}

function makeImageFile(name: string) {
  return new File(['fake-bytes'], name, { type: 'image/png' });
}

function dropImages(...files: File[]) {
  fireEvent.drop(screen.getByTestId('streamline-image-dropzone'), {
    dataTransfer: { files },
  });
}

describe('StreamlineImageReviewGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads and classifies a dropped image, defaulting to accepted', async () => {
    classifyImageMock.mockResolvedValue({
      imageUrl: 'https://example.com/marcus.png',
      filename: 'marcus.png',
      classification: { name: 'Marcus', type: 'character', description: 'A weary man.', confidence: 0.8 },
    });

    render(<Harness />);
    dropImages(makeImageFile('marcus.png'));

    await waitFor(() => expect(screen.getByDisplayValue('Marcus')).toBeInTheDocument());
    expect(classifyImageMock).toHaveBeenCalledTimes(1);
  });

  it('fuzzy-matches the guessed name against known entity names from the batch', async () => {
    classifyImageMock.mockResolvedValue({
      imageUrl: 'https://example.com/img.png',
      filename: 'photo.png',
      classification: { name: 'A man named Marcus', type: 'character', description: '', confidence: 0.6 },
    });

    render(<Harness knownEntityNames={['Marcus']} />);
    dropImages(makeImageFile('photo.png'));

    await waitFor(() => expect(screen.getByDisplayValue('Marcus')).toBeInTheDocument());
  });

  it('lets the user edit name/type/description freely regardless of the guess', async () => {
    classifyImageMock.mockResolvedValue({
      imageUrl: 'https://example.com/img.png',
      filename: 'photo.png',
      classification: { name: 'Guessed Name', type: 'character', description: '', confidence: 0.5 },
    });

    render(<Harness />);
    dropImages(makeImageFile('photo.png'));

    const nameInput = await screen.findByDisplayValue('Guessed Name');
    const user = userEvent.setup();
    await user.clear(nameInput);
    await user.type(nameInput, 'Renamed Character');

    expect(screen.getByDisplayValue('Renamed Character')).toBeInTheDocument();
  });

  it('toggling accept/skip is reflected for downstream routing (accepted starts true)', async () => {
    classifyImageMock.mockResolvedValue({
      imageUrl: 'https://example.com/img.png',
      filename: 'photo.png',
      classification: { name: 'Marcus', type: 'character', description: '', confidence: 0.7 },
    });

    render(<Harness />);
    dropImages(makeImageFile('photo.png'));

    await waitFor(() => expect(screen.getByDisplayValue('Marcus')).toBeInTheDocument());
    const acceptButton = screen.getByTitle(/accepted — click to skip/i);

    const user = userEvent.setup();
    await user.click(acceptButton);

    expect(screen.getByTitle(/skipped — click to accept/i)).toBeInTheDocument();
  });

  it('one image failing classification does not block the others', async () => {
    classifyImageMock.mockImplementation(async (_projectId: string, file: File) => {
      if (file.name === 'bad.png') throw new Error('Vision model unavailable');
      return {
        imageUrl: 'https://example.com/good.png',
        filename: file.name,
        classification: { name: 'Good Image', type: 'prop', description: '', confidence: 0.6 },
      };
    });

    render(<Harness />);
    dropImages(makeImageFile('good.png'), makeImageFile('bad.png'));

    await waitFor(() => expect(screen.getByDisplayValue('Good Image')).toBeInTheDocument());
    const { toast } = await import('sonner');
    expect(toast.error).toHaveBeenCalled();
  });
});
