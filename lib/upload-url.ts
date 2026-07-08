export const MANAGED_UPLOAD_PREFIX = '/api/files/'

export function isManagedUploadUrl(
  url: string | null | undefined
): url is string {
  return (
    typeof url === 'string' &&
    url.startsWith(MANAGED_UPLOAD_PREFIX) &&
    !url.includes('..')
  )
}

export function filenameFromUploadUrl(url: string): string | null {
  if (!isManagedUploadUrl(url)) return null
  const filename = url.slice(MANAGED_UPLOAD_PREFIX.length)
  if (!filename || filename.includes('/')) return null
  return filename
}
