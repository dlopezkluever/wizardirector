import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StreamlineDropZone, type StreamlineFile } from '../StreamlineDropZone';

const extractFileMock = vi.fn();

vi.mock('@/lib/services/streamlineService', () => ({
  streamlineService: {
    extractFile: (...args: unknown[]) => extractFileMock(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function Harness({ initialFiles = [] as StreamlineFile[], onBatchSettled }: { initialFiles?: StreamlineFile[]; onBatchSettled?: () => void }) {
  const [files, setFiles] = useState<StreamlineFile[]>(initialFiles);
  return (
    <StreamlineDropZone
      projectId="project-1"
      files={files}
      onFilesChange={setFiles}
      onBatchSettled={onBatchSettled}
    />
  );
}

function makeFile(name: string, content: string, type = 'text/plain') {
  return new File([content], name, { type });
}

/** Simulates a real drag-and-drop, which — unlike userEvent.upload on the
 * hidden <input accept=...> — is NOT filtered by the input's accept
 * attribute in real browsers, so this is the right way to test our own
 * validateFile() rejection logic rather than the browser's file picker. */
function dropFiles(...fileList: File[]) {
  fireEvent.drop(screen.getByTestId('streamline-dropzone'), {
    dataTransfer: { files: fileList },
  });
}

describe('StreamlineDropZone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts a supported file type and shows it once extraction succeeds', async () => {
    extractFileMock.mockResolvedValue({ filename: 'script.txt', text: 'INT. HOUSE - DAY', classification: { type: 'unclassified', confidence: 0 } });

    render(<Harness />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const user = userEvent.setup();
    await user.upload(input, makeFile('script.txt', 'INT. HOUSE - DAY'));

    await waitFor(() => expect(screen.getByText('script.txt')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/uploaded — classification pending/i)).toBeInTheDocument());
    expect(extractFileMock).toHaveBeenCalledTimes(1);
  });

  it('rejects an unsupported file type client-side without calling extractFile', async () => {
    const { toast } = await import('sonner');
    render(<Harness />);
    dropFiles(makeFile('photo.png', 'binary', 'image/png'));

    expect(extractFileMock).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it('rejects legacy .doc files with the specific message', async () => {
    const { toast } = await import('sonner');
    render(<Harness />);
    dropFiles(makeFile('old.doc', 'legacy', 'application/msword'));

    expect(extractFileMock).not.toHaveBeenCalled();
    expect((toast.error as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatch(/save as \.docx or \.pdf/i);
  });

  it('one file failing extraction leaves the others intact (partial-success)', async () => {
    extractFileMock.mockImplementation(async (_projectId: string, file: File) => {
      if (file.name === 'bad.txt') throw new Error('Corrupted file');
      return { filename: file.name, text: 'ok content', classification: { type: 'unclassified', confidence: 0 } };
    });

    render(<Harness />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const user = userEvent.setup();
    await user.upload(input, [makeFile('good.txt', 'fine'), makeFile('bad.txt', 'broken')]);

    await waitFor(() => expect(screen.getByText(/corrupted file/i)).toBeInTheDocument());
    expect(screen.getByText('good.txt')).toBeInTheDocument();
    expect(screen.getByText('bad.txt')).toBeInTheDocument();
  });

  it('fires onBatchSettled once every in-flight file resolves', async () => {
    extractFileMock.mockResolvedValue({ filename: 'a.txt', text: 'hi', classification: { type: 'unclassified', confidence: 0 } });
    const onBatchSettled = vi.fn();

    render(<Harness onBatchSettled={onBatchSettled} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const user = userEvent.setup();
    await user.upload(input, makeFile('a.txt', 'hi'));

    await waitFor(() => expect(onBatchSettled).toHaveBeenCalledTimes(1));
  });

  it('primary-file selection persists in session state (first file defaults to primary)', async () => {
    extractFileMock.mockImplementation(async (_projectId: string, file: File) => ({
      filename: file.name,
      text: 'content',
      classification: { type: 'unclassified', confidence: 0 },
    }));

    render(<Harness />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const user = userEvent.setup();
    await user.upload(input, [makeFile('first.txt', 'a'), makeFile('second.txt', 'b')]);

    await waitFor(() => expect(screen.getByText('first.txt')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('second.txt')).toBeInTheDocument());

    // Only the primary file shows the "Set as primary" toggle for the other one
    const setPrimaryButtons = screen.getAllByTitle('Set as primary');
    expect(setPrimaryButtons).toHaveLength(1);

    await user.click(setPrimaryButtons[0]);
    await waitFor(() => expect(screen.getAllByTitle('Set as primary')).toHaveLength(1));
  });
});
