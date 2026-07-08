import { NextResponse } from 'next/server'

export function formatGrowth(log: {
  id: string
  date: Date
  weightKg: number
  heightCm: number
  headCircumferenceCm: number | null
  isJaundice: boolean
  bilirubinLevel: number | null
  notes: string | null
}) {
  return {
    id: log.id,
    date: log.date.toISOString().split('T')[0],
    weight_kg: log.weightKg,
    height_cm: log.heightCm,
    head_circumference_cm: log.headCircumferenceCm,
    is_jaundice: log.isJaundice,
    bilirubin_level: log.bilirubinLevel,
    notes: log.notes,
  }
}

function parseOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : NaN
}

export function parseGrowthCreateBody(body: Record<string, unknown>) {
  if (!body.date || body.weight_kg == null || body.height_cm == null) {
    return {
      error: NextResponse.json(
        { error: 'date, weight_kg, and height_cm are required' },
        { status: 400 }
      ),
    }
  }

  const weightKg = Number(body.weight_kg)
  const heightCm = Number(body.height_cm)
  const headCircumferenceCm = parseOptionalNumber(body.head_circumference_cm)
  const bilirubinLevel = parseOptionalNumber(body.bilirubin_level)

  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm)) {
    return {
      error: NextResponse.json(
        { error: 'weight_kg and height_cm must be valid numbers' },
        { status: 400 }
      ),
    }
  }

  if (
    headCircumferenceCm !== undefined &&
    headCircumferenceCm !== null &&
    Number.isNaN(headCircumferenceCm)
  ) {
    return {
      error: NextResponse.json(
        { error: 'head_circumference_cm must be a valid number' },
        { status: 400 }
      ),
    }
  }

  if (
    bilirubinLevel !== undefined &&
    bilirubinLevel !== null &&
    Number.isNaN(bilirubinLevel)
  ) {
    return {
      error: NextResponse.json(
        { error: 'bilirubin_level must be a valid number' },
        { status: 400 }
      ),
    }
  }

  return {
    data: buildGrowthWriteData({
      date: new Date(String(body.date)),
      weightKg,
      heightCm,
      headCircumferenceCm: headCircumferenceCm ?? null,
      isJaundice: Boolean(body.is_jaundice),
      bilirubinLevel: bilirubinLevel ?? null,
      notes: body.notes != null ? String(body.notes) : null,
    }),
  }
}

function buildGrowthWriteData(input: {
  date: Date
  weightKg: number
  heightCm: number
  headCircumferenceCm?: number | null
  isJaundice?: boolean
  bilirubinLevel?: number | null
  notes?: string | null
}) {
  const data: Record<string, unknown> = {
    date: input.date,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    isJaundice: input.isJaundice ?? false,
  }

  if (input.headCircumferenceCm != null) {
    data.headCircumferenceCm = input.headCircumferenceCm
  }
  if (input.bilirubinLevel != null) {
    data.bilirubinLevel = input.bilirubinLevel
  }
  if (input.notes != null && input.notes !== '') {
    data.notes = input.notes
  }

  return data
}

export function parseGrowthUpdateBody(body: Record<string, unknown>) {
  const weightKg =
    body.weight_kg !== undefined ? Number(body.weight_kg) : undefined
  const heightCm =
    body.height_cm !== undefined ? Number(body.height_cm) : undefined
  const headCircumferenceCm = parseOptionalNumber(body.head_circumference_cm)
  const bilirubinLevel = parseOptionalNumber(body.bilirubin_level)

  if (weightKg !== undefined && !Number.isFinite(weightKg)) {
    return {
      error: NextResponse.json(
        { error: 'weight_kg must be a valid number' },
        { status: 400 }
      ),
    }
  }

  if (heightCm !== undefined && !Number.isFinite(heightCm)) {
    return {
      error: NextResponse.json(
        { error: 'height_cm must be a valid number' },
        { status: 400 }
      ),
    }
  }

  if (
    headCircumferenceCm !== undefined &&
    headCircumferenceCm !== null &&
    Number.isNaN(headCircumferenceCm)
  ) {
    return {
      error: NextResponse.json(
        { error: 'head_circumference_cm must be a valid number' },
        { status: 400 }
      ),
    }
  }

  if (
    bilirubinLevel !== undefined &&
    bilirubinLevel !== null &&
    Number.isNaN(bilirubinLevel)
  ) {
    return {
      error: NextResponse.json(
        { error: 'bilirubin_level must be a valid number' },
        { status: 400 }
      ),
    }
  }

  return {
    data: buildGrowthPatchData({
      date: body.date ? new Date(String(body.date)) : undefined,
      weightKg,
      heightCm,
      headCircumferenceCm,
      isJaundice:
        body.is_jaundice !== undefined ? Boolean(body.is_jaundice) : undefined,
      bilirubinLevel,
      notes: body.notes !== undefined ? (body.notes as string | null) : undefined,
    }),
  }
}

function buildGrowthPatchData(input: {
  date?: Date
  weightKg?: number
  heightCm?: number
  headCircumferenceCm?: number | null
  isJaundice?: boolean
  bilirubinLevel?: number | null
  notes?: string | null
}) {
  const data: Record<string, unknown> = {}

  if (input.date) data.date = input.date
  if (input.weightKg !== undefined) data.weightKg = input.weightKg
  if (input.heightCm !== undefined) data.heightCm = input.heightCm
  if (input.isJaundice !== undefined) data.isJaundice = input.isJaundice
  if (input.headCircumferenceCm !== undefined && input.headCircumferenceCm !== null) {
    data.headCircumferenceCm = input.headCircumferenceCm
  }
  if (input.bilirubinLevel !== undefined && input.bilirubinLevel !== null) {
    data.bilirubinLevel = input.bilirubinLevel
  }
  if (input.notes !== undefined) {
    data.notes = input.notes === '' ? null : input.notes
  }

  return data
}

export function growthApiError(error: unknown) {
  console.error('[growth]', error)

  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: string }).message)
      : ''

  if (message.includes('Unknown argument `headCircumferenceCm`')) {
    return NextResponse.json(
      {
        error:
          'Prisma client belum diperbarui. Hentikan dev server, jalankan: npx prisma generate, lalu npm run dev',
      },
      { status: 503 }
    )
  }

  if (error && typeof error === 'object' && 'name' in error) {
    const name = String((error as { name: string }).name)
    if (name === 'PrismaClientValidationError') {
      return NextResponse.json(
        {
          error:
            'Data pertumbuhan tidak valid. Coba restart dev server lalu jalankan: npx prisma generate',
        },
        { status: 400 }
      )
    }
  }

  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: string }).code)
    if (code === 'P2022' || code === 'P2021') {
      return NextResponse.json(
        {
          error:
            'Skema database belum sinkron. Jalankan: npx prisma db push',
        },
        { status: 503 }
      )
    }
    if (code === 'P2025') {
      return NextResponse.json(
        { error: 'Data pertumbuhan tidak ditemukan' },
        { status: 404 }
      )
    }
  }

  return NextResponse.json(
    { error: 'Gagal memproses data pertumbuhan' },
    { status: 500 }
  )
}
