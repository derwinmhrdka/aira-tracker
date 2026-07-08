import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { requireAuth } from '@/lib/auth'
import { getUploadsDir } from '@/lib/upload-files'
import { compressImageBuffer } from '@/lib/compress-upload'

const MAX_IMAGE_SIZE = 2 * 1024 * 1024 // 2MB after compression
const MAX_AUDIO_SIZE = 2 * 1024 * 1024 // 2MB voice notes
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const AUDIO_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
]

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/x-m4a': 'm4a',
}

const AUDIO_EXTENSIONS = new Set(['webm', 'm4a', 'mp3', 'ogg', 'wav'])
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

function normalizeMimeType(type: string) {
  return type.split(';')[0].trim().toLowerCase()
}

function getExtension(filename: string) {
  return filename.split('.').pop()?.toLowerCase() ?? ''
}

function classifyFile(file: File): 'image' | 'audio' | null {
  const mime = normalizeMimeType(file.type)
  if (IMAGE_TYPES.includes(mime)) return 'image'
  if (AUDIO_TYPES.includes(mime)) return 'audio'

  const ext = getExtension(file.name)
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio'
  if (IMAGE_EXTENSIONS.has(ext)) return 'image'

  return null
}

export async function POST(request: NextRequest) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const kind = classifyFile(file)

    if (!kind) {
      return NextResponse.json(
        { error: 'Only image or audio files allowed' },
        { status: 400 }
      )
    }

    const isAudio = kind === 'audio'
    const isImage = kind === 'image'
    const mime = normalizeMimeType(file.type)

    const maxSize = isAudio ? MAX_AUDIO_SIZE : MAX_IMAGE_SIZE
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: isAudio ? 'Audio too large (max 2MB)' : 'File too large (max 2MB)' },
        { status: 400 }
      )
    }

    const ext =
      EXT_BY_MIME[mime] ||
      getExtension(file.name) ||
      (isAudio ? 'webm' : 'jpg')
    const filename = `${randomUUID()}.${isImage ? 'jpg' : ext}`
    const uploadDir = getUploadsDir()

    await mkdir(uploadDir, { recursive: true })

    let buffer = Buffer.from(await file.arrayBuffer())
    if (isImage) {
      const compressed = await compressImageBuffer(buffer)
      buffer = Buffer.from(compressed.buffer)
      if (buffer.length > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: 'File too large (max 2MB)' },
          { status: 400 }
        )
      }
    }

    await writeFile(path.join(uploadDir, filename), buffer)

    const fileUrl = `/api/files/${filename}`
    return NextResponse.json(
      isAudio ? { audio_url: fileUrl } : { photo_url: fileUrl }
    )
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
