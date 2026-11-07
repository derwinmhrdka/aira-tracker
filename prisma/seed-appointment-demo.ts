/**
 * One appointment today, a due vaccine, and notes since the previous visit.
 * Safe to re-run. Does not delete other logs.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TODAY_TITLE = 'Kontrol dokter (demo)'
const PREVIOUS_TITLE = 'Kontrol sebelumnya (demo)'
const VACCINE_NAME = 'Influenza (demo)'
const DEMO_NOTES = [
  'Tidur lebih nyenyak semalam',
  'Nafsu makan baik, ASI lancar',
  'Sedikit rewel sore hari',
]

function atHour(daysBack: number, hour: number) {
  const d = new Date()
  d.setDate(d.getDate() - daysBack)
  d.setHours(hour, 0, 0, 0)
  return d
}

async function main() {
  const profile = await prisma.babyProfile.findFirst()
  const birth = profile?.birthDate ?? new Date('2026-03-10')
  const ageMonths = Math.max(
    0,
    (new Date().getFullYear() - birth.getFullYear()) * 12 +
      (new Date().getMonth() - birth.getMonth())
  )

  const previous = await prisma.calendarEvent.upsert({
    where: { id: (await prisma.calendarEvent.findFirst({ where: { title: PREVIOUS_TITLE } }))?.id ?? 'missing' },
    update: {
      startAt: atHour(14, 9),
      endAt: atHour(14, 10),
      location: 'RS Hermina',
      meetWith: 'Dr. Andi',
      showSummary: false,
    },
    create: {
      title: PREVIOUS_TITLE,
      location: 'RS Hermina',
      meetWith: 'Dr. Andi',
      startAt: atHour(14, 9),
      endAt: atHour(14, 10),
      notes: 'Kontrol rutin',
      showSummary: false,
    },
  }).catch(() => null)

  const previousRow =
    previous ??
    (await prisma.calendarEvent.create({
      data: {
        title: PREVIOUS_TITLE,
        location: 'RS Hermina',
        meetWith: 'Dr. Andi',
        startAt: atHour(14, 9),
        endAt: atHour(14, 10),
        notes: 'Kontrol rutin',
        showSummary: false,
      },
    }))

  await prisma.calendarEvent.update({
    where: { id: previousRow.id },
    data: {
      startAt: atHour(14, 9),
      endAt: atHour(14, 10),
      showSummary: false,
    },
  })

  const todayExisting = await prisma.calendarEvent.findFirst({ where: { title: TODAY_TITLE } })
  const today = todayExisting
    ? await prisma.calendarEvent.update({
        where: { id: todayExisting.id },
        data: {
          location: 'RS Hermina',
          meetWith: 'Dr. Andi',
          startAt: atHour(0, 10),
          endAt: atHour(0, 11),
          notes: 'Bawa buku KIA',
          showSummary: true,
        },
      })
    : await prisma.calendarEvent.create({
        data: {
          title: TODAY_TITLE,
          location: 'RS Hermina',
          meetWith: 'Dr. Andi',
          startAt: atHour(0, 10),
          endAt: atHour(0, 11),
          notes: 'Bawa buku KIA',
          showSummary: true,
        },
      })

  await prisma.dailyNote.deleteMany({
    where: {
      OR: [
        { content: { startsWith: 'Demo catatan:' } },
        { content: { in: DEMO_NOTES } },
      ],
    },
  })
  await prisma.dailyNote.createMany({
    data: [
      { content: DEMO_NOTES[0], timestamp: atHour(3, 20), loggedBy: 'IBU' },
      { content: DEMO_NOTES[1], timestamp: atHour(2, 8), loggedBy: 'AYAH' },
      {
        content: DEMO_NOTES[2],
        timestamp: atHour(1, 16),
        loggedBy: 'IBU',
        photoUrl: '/kms-baby/baby-normal.jpg',
      },
    ],
  })

  const latest = await prisma.growthLog.findFirst({ orderBy: { date: 'desc' } })
  const todayDate = atHour(0, 12)
  const existingGrowth = await prisma.growthLog.findFirst({
    where: {
      date: {
        gte: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate()),
        lt: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 1),
      },
    },
  })
  if (!existingGrowth) {
    await prisma.growthLog.create({
      data: {
        date: todayDate,
        weightKg: latest ? Math.round((latest.weightKg + 0.2) * 10) / 10 : 6.4,
        heightCm: latest ? Math.round(latest.heightCm + 1) : 64,
        headCircumferenceCm: latest?.headCircumferenceCm
          ? Math.round((latest.headCircumferenceCm + 0.3) * 10) / 10
          : 42,
        notes: 'Ukuran demo untuk ringkasan janji temu',
      },
    })
  }

  const vaccine = await prisma.immunization.findFirst({ where: { vaccineName: VACCINE_NAME } })
  const vaccineData = {
    vaccineName: VACCINE_NAME,
    scheduledAgeMonths: ageMonths,
    scheduledAgeWeeks: ageMonths * 4,
    doseLabel: 'Dosis 1',
    isNationalProgram: false,
    isCustom: true,
    isDone: false,
    scheduleNotes: 'Demo — sudah waktunya di kunjungan hari ini',
    location: 'RS Hermina',
  }
  if (vaccine) {
    await prisma.immunization.update({ where: { id: vaccine.id }, data: vaccineData })
  } else {
    await prisma.immunization.create({ data: vaccineData })
  }

  console.log(
    JSON.stringify(
      {
        appointment: today.title,
        showSummary: today.showSummary,
        start: today.startAt.toISOString(),
        previous: previousRow.title,
        notes: 3,
        vaccine: VACCINE_NAME,
        ageMonths,
      },
      null,
      2
    )
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
