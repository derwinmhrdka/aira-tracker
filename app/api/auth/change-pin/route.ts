import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'
import { verifyPin, hashPin } from '@/lib/auth'

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json()
    const oldPin = String(body.old_pin ?? '')
    const newPin = String(body.new_pin ?? '')

    if (!oldPin || !newPin) {
      return NextResponse.json({ error: 'PIN lama dan baru wajib diisi' }, { status: 400 })
    }

    if (newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
      return NextResponse.json(
        { error: 'PIN baru harus 4-6 digit angka' },
        { status: 400 }
      )
    }

    const valid = await verifyPin(oldPin)
    if (!valid) {
      return NextResponse.json({ error: 'PIN lama salah' }, { status: 401 })
    }

    const user = await prisma.user.findFirst()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { pinHash: await hashPin(newPin) },
    })

    return NextResponse.json({ success: true })
  })
}
