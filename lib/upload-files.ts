import { unlink } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import {
  filenameFromUploadUrl,
  isManagedUploadUrl,
} from '@/lib/upload-url'

export function getUploadsDir() {
  return path.join(process.cwd(), 'uploads')
}

export async function isUploadReferenced(url: string): Promise<boolean> {
  if (!isManagedUploadUrl(url)) return false

  const [profile, note, milestone] = await Promise.all([
    prisma.babyProfile.findFirst({
      where: { photoUrl: url },
      select: { id: true },
    }),
    prisma.dailyNote.findFirst({
      where: { OR: [{ photoUrl: url }, { audioUrl: url }] },
      select: { id: true },
    }),
    prisma.milestone.findFirst({
      where: { photoUrl: url },
      select: { id: true },
    }),
  ])

  return !!(profile || note || milestone)
}

export async function deleteUploadIfManaged(
  url: string | null | undefined,
  force = false
): Promise<void> {
  const filename = url ? filenameFromUploadUrl(url) : null
  if (!filename) return

  if (!force && url && (await isUploadReferenced(url))) return

  try {
    await unlink(path.join(getUploadsDir(), filename))
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') {
      console.error('Failed to delete upload:', filename, err)
    }
  }
}

export async function deleteUploadsIfManaged(
  urls: (string | null | undefined)[],
  force = false
): Promise<void> {
  await Promise.all(urls.map((url) => deleteUploadIfManaged(url, force)))
}

export async function replaceManagedUpload(
  oldUrl: string | null | undefined,
  newUrl: string | null | undefined
): Promise<void> {
  if (!oldUrl || oldUrl === newUrl) return
  await deleteUploadIfManaged(oldUrl, true)
}
