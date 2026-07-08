import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'
import { replaceManagedUpload } from '@/lib/upload-files'

export async function GET() {
  return withAuth(async () => {
    const profile = await prisma.babyProfile.findFirst()
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    return NextResponse.json({
      id: profile.id,
      name: profile.name,
      birth_date: profile.birthDate.toISOString().split('T')[0],
      birth_weight_kg: profile.birthWeightKg,
      birth_height_cm: profile.birthHeightCm,
      blood_type: profile.bloodType,
      parent_names: profile.parentNames,
      photo_url: profile.photoUrl,
      gender: profile.gender,
    })
  })
}

export async function PATCH(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json()
    const profile = await prisma.babyProfile.findFirst()
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const newPhotoUrl =
      body.photo_url !== undefined ? (body.photo_url as string | null) : undefined

    if (newPhotoUrl !== undefined && newPhotoUrl !== profile.photoUrl) {
      await replaceManagedUpload(profile.photoUrl, newPhotoUrl)
    }

    const updated = await prisma.babyProfile.update({
      where: { id: profile.id },
      data: {
        name: body.name ?? undefined,
        birthDate: body.birth_date ? new Date(body.birth_date) : undefined,
        birthWeightKg: body.birth_weight_kg ?? undefined,
        birthHeightCm: body.birth_height_cm ?? undefined,
        bloodType: body.blood_type ?? undefined,
        parentNames: body.parent_names ?? undefined,
        photoUrl: newPhotoUrl,
        gender: body.gender ?? undefined,
      },
    })

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      birth_date: updated.birthDate.toISOString().split('T')[0],
      birth_weight_kg: updated.birthWeightKg,
      birth_height_cm: updated.birthHeightCm,
      blood_type: updated.bloodType,
      parent_names: updated.parentNames,
      photo_url: updated.photoUrl,
      gender: updated.gender,
    })
  })
}
