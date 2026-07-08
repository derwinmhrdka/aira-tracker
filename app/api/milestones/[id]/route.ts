import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'
import {
  deleteUploadIfManaged,
  replaceManagedUpload,
} from '@/lib/upload-files'

function formatMilestone(m: {
  id: string
  date: Date
  title: string
  description: string | null
  photoUrl: string | null
}) {
  return {
    id: m.id,
    date: m.date.toISOString().split('T')[0],
    title: m.title,
    description: m.description,
    photo_url: m.photoUrl,
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async () => {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.milestone.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const newPhotoUrl =
      body.photo_url !== undefined ? body.photo_url : existing.photoUrl

    if (body.photo_url !== undefined && newPhotoUrl !== existing.photoUrl) {
      await replaceManagedUpload(existing.photoUrl, newPhotoUrl)
    }

    const updated = await prisma.milestone.update({
      where: { id },
      data: {
        date: body.date ? new Date(body.date) : undefined,
        title: body.title ?? undefined,
        description: body.description !== undefined ? body.description : undefined,
        photoUrl: body.photo_url !== undefined ? body.photo_url : undefined,
      },
    })

    return NextResponse.json(formatMilestone(updated))
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async () => {
    const { id } = await params
    const existing = await prisma.milestone.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await deleteUploadIfManaged(existing.photoUrl, true)
    await prisma.milestone.delete({ where: { id } })
    return NextResponse.json({ success: true })
  })
}
