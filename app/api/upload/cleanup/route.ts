import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { deleteUploadIfManaged } from '@/lib/upload-files'
import { isManagedUploadUrl } from '@/lib/upload-url'

export async function POST(request: NextRequest) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const url = body.url

    if (!url || typeof url !== 'string' || !isManagedUploadUrl(url)) {
      return NextResponse.json({ error: 'Invalid upload url' }, { status: 400 })
    }

    await deleteUploadIfManaged(url)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}
