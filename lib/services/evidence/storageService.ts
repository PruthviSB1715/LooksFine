import fs from 'fs'
import path from 'path'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
])

export interface SaveFileOptions {
  inspectionId: string
  evidenceId: string
  fileName: string
  mimeType: string
  buffer: Buffer
}

export interface SavedFileResult {
  storagePath: string
  publicUrl: string
  fileSize: number
  mimeType: string
  fileName: string
}

/**
 * Sanitizes a filename to prevent path traversal vulnerabilities.
 */
export function sanitizeFileName(fileName: string): string {
  const basename = path.basename(fileName)
  return basename.replace(/\.\.+/g, '.').replace(/[^a-zA-Z0-9_.-]/g, '_')
}

/**
 * Validates image upload MIME type and file size.
 */
export function validateEvidenceFile(mimeType: string, fileSize: number): { valid: boolean; error?: string } {
  const normalizedMime = mimeType.toLowerCase()
  if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
    return {
      valid: false,
      error: `Unsupported file type: ${mimeType}. Allowed formats: JPG, JPEG, PNG, WEBP.`,
    }
  }

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds limit (${(fileSize / (1024 * 1024)).toFixed(2)}MB > 10MB limit).`,
    }
  }

  return { valid: true }
}

/**
 * Saves uploaded evidence buffer to safe local filesystem path:
 * public/uploads/inspections/{inspectionId}/{evidenceId}/{fileName}
 */
export async function saveEvidenceFile(options: SaveFileOptions): Promise<SavedFileResult> {
  const { inspectionId, evidenceId, fileName, mimeType, buffer } = options

  // Validate
  const validation = validateEvidenceFile(mimeType, buffer.length)
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid evidence file')
  }

  const safeName = sanitizeFileName(fileName)
  const sanitizedInspId = sanitizeFileName(inspectionId)
  const sanitizedEvId = sanitizeFileName(evidenceId)

  // Relative storage path under public/
  const relativeDir = path.join('uploads', 'inspections', sanitizedInspId, sanitizedEvId)
  const absoluteDir = path.join(process.cwd(), 'public', relativeDir)

  // Ensure target directory exists
  await fs.promises.mkdir(absoluteDir, { recursive: true })

  const absoluteFilePath = path.join(absoluteDir, safeName)
  await fs.promises.writeFile(absoluteFilePath, buffer)

  const publicUrl = `/${relativeDir.replace(/\\/g, '/')}/${safeName}`

  return {
    storagePath: absoluteFilePath,
    publicUrl,
    fileSize: buffer.length,
    mimeType: mimeType.toLowerCase(),
    fileName: safeName,
  }
}

/**
 * Retrieves absolute filesystem path for given evidence storage reference or public URL.
 */
export function getEvidenceFilePath(storagePathOrUrl: string): string {
  if (path.isAbsolute(storagePathOrUrl)) {
    return storagePathOrUrl
  }

  const cleanUrl = storagePathOrUrl.startsWith('/') ? storagePathOrUrl.substring(1) : storagePathOrUrl
  return path.join(process.cwd(), 'public', cleanUrl.replace(/\//g, path.sep))
}

/**
 * Deletes stored evidence file safely from filesystem.
 */
export async function deleteEvidenceFile(storagePathOrUrl: string): Promise<boolean> {
  try {
    const absPath = getEvidenceFilePath(storagePathOrUrl)
    if (fs.existsSync(absPath)) {
      await fs.promises.unlink(absPath)
      return true
    }
  } catch (err) {
    console.warn('[STORAGE-DELETE-WARN] Could not delete evidence file:', err)
  }
  return false
}
