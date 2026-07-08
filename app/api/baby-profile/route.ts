import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'
import { replaceManagedUpload } from '@/lib/upload-files'
import { getBabyAstrology } from '@/lib/baby-astrology'

function serializeProfile(
  profile: {
    id: string
    name: string
    birthDate: Date
    birthWeightKg: number
    birthHeightCm: number
    bloodType: string | null
    parentNames: string | null
    photoUrl: string | null
    gender: 'MALE' | 'FEMALE' | null
  },
  latestGrowth?: {
    date: Date
    weightKg: number
    heightCm: number
  } | null
) {
  const birth_date = profile.birthDate.toISOString().split('T')[0]
  const astrology = getBabyAstrology(birth_date)

  return {
    id: profile.id,
    name: profile.name,
    birth_date,
    birth_weight_kg: profile.birthWeightKg,
    birth_height_cm: profile.birthHeightCm,
    latest_weight_kg: latestGrowth?.weightKg ?? null,
    latest_height_cm: latestGrowth?.heightCm ?? null,
    latest_growth_date: latestGrowth?.date.toISOString().split('T')[0] ?? null,
    blood_type: profile.bloodType,
    parent_names: profile.parentNames,
    photo_url: profile.photoUrl,
    gender: profile.gender,
    horoscope: astrology?.horoscope ?? null,
    horoscope_emoji: astrology?.horoscopeEmoji ?? null,
    shio: astrology?.shio ?? null,
    shio_animal: astrology?.shioAnimal ?? null,
    shio_element: astrology?.shioElement ?? null,
  }
}

async function loadProfileResponse() {
  const [profile, latestGrowth] = await Promise.all([
    prisma.babyProfile.findFirst(),
    prisma.growthLog.findFirst({ orderBy: { date: 'desc' } }),
  ])
  if (!profile) return null
  return serializeProfile(profile, latestGrowth)
}

export async function GET() {
  return withAuth(async () => {
    const data = await loadProfileResponse()
    if (!data) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    return NextResponse.json(data)
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

    return NextResponse.json((await loadProfileResponse())!)
  })
}
