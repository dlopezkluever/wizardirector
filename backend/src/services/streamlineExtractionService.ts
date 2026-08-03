/**
 * Streamline Phase 2 — server-side text extraction (spec §2.7).
 * One file per call; dispatch by MIME type (falling back to file extension,
 * since browsers are inconsistent about MIME types for .md/.rtf uploads).
 */

import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { stripRtf } from 'rtf-to-text';

export class UnsupportedFileTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedFileTypeError';
  }
}

function extOf(filename: string): string {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function extractRtf(buffer: Buffer): string {
  return stripRtf(buffer.toString('utf-8'));
}

function extractPlainText(buffer: Buffer): string {
  return buffer.toString('utf-8');
}

/**
 * Extracts plain text from an uploaded file's buffer. Throws
 * UnsupportedFileTypeError for legacy .doc (binary Word 97-2003, needs a
 * system-level tool — not worth the infra for this build) and anything else
 * not in the supported set.
 */
export async function extractText(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
  const ext = extOf(filename);

  if (mimeType === 'application/msword' || ext === 'doc') {
    throw new UnsupportedFileTypeError('Legacy .doc files are not supported — please save as .docx or .pdf.');
  }

  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return extractPdf(buffer);
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'docx'
  ) {
    return extractDocx(buffer);
  }

  if (mimeType === 'text/rtf' || mimeType === 'application/rtf' || ext === 'rtf') {
    return extractRtf(buffer);
  }

  if (mimeType === 'text/plain' || mimeType === 'text/markdown' || ext === 'txt' || ext === 'md') {
    return extractPlainText(buffer);
  }

  throw new UnsupportedFileTypeError(
    `Unsupported file type "${mimeType || ext}". Supported: .txt, .md, .pdf, .docx, .rtf.`
  );
}
