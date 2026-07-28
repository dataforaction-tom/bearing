const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = new Set(['application/pdf', 'text/csv'])

export function validateFile(
  filename: string,
  mimeType: string,
  size: number,
): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.has(mimeType)) {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (ext !== 'pdf' && ext !== 'csv') {
      return { valid: false, error: 'Only PDF or CSV files are supported.' }
    }
  }
  if (size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File must be under 5MB.' }
  }
  return { valid: true }
}

export function extractTextFromCsv(buffer: Buffer): string {
  return buffer.toString('utf-8')
}

// pdf-parse (via pdfjs-dist) needs DOMMatrix for some PDFs — forms, embedded
// Type3/TrueType fonts, and similar structures pdf.js measures via a
// canvas-style transform even during plain text extraction. Node has no
// native DOMMatrix; @napi-rs/canvas (already a pdf-parse dependency) ships
// one, per pdf.js's own documented Node polyfill requirement.
async function ensureDomMatrixPolyfill(): Promise<void> {
  if (typeof globalThis.DOMMatrix !== 'undefined') return
  const { DOMMatrix } = await import('@napi-rs/canvas')
  globalThis.DOMMatrix = DOMMatrix as unknown as typeof globalThis.DOMMatrix
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  await ensureDomMatrixPolyfill()
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  const result = await parser.getText()
  await parser.destroy()
  return result.text
}

export async function extractText(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return extractTextFromPdf(buffer)
  }
  return extractTextFromCsv(buffer)
}

export function fileToBase64DataUrl(buffer: Buffer, mimeType: string): string {
  const base64 = buffer.toString('base64')
  return `data:${mimeType};base64,${base64}`
}
