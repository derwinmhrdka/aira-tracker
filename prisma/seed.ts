import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import {
  immunizationSeedData,
  immunizationSeedKey,
  weeksToScheduledMonths,
} from './immunization-seed-data'

const prisma = new PrismaClient()

const DEVELOPMENT_ITEMS: { ageGroupMonths: number; question: string }[] = [
  // 0-3 bulan
  { ageGroupMonths: 0, question: 'Mengangkat kepala sebentar saat tengkurap' },
  { ageGroupMonths: 0, question: 'Mengikuti wajah dengan mata' },
  { ageGroupMonths: 0, question: 'Merespons suara dengan hening' },
  { ageGroupMonths: 0, question: 'Tersenyum spontan' },
  // 3-6 bulan
  { ageGroupMonths: 3, question: 'Tertawa keras' },
  { ageGroupMonths: 3, question: 'Membalik badan dari tengkurap ke terlentang' },
  { ageGroupMonths: 3, question: 'Menggapai dan memegang mainan' },
  { ageGroupMonths: 3, question: 'Mengenali suara orang tua' },
  // 6-9 bulan
  { ageGroupMonths: 6, question: 'Duduk tanpa bantuan' },
  { ageGroupMonths: 6, question: 'Bergumam "mama" atau "papa"' },
  { ageGroupMonths: 6, question: 'Memindahkan mainan antar tangan' },
  { ageGroupMonths: 6, question: 'Merespons namanya' },
  // 9-12 bulan
  { ageGroupMonths: 9, question: 'Merangkak atau bergerak aktif' },
  { ageGroupMonths: 9, question: 'Berdiri berpegangan' },
  { ageGroupMonths: 9, question: 'Bertepuk tangan' },
  { ageGroupMonths: 9, question: 'Melambai bye-bye' },
  { ageGroupMonths: 9, question: 'Memahami kata "tidak"' },
]

async function main() {
  const pin = process.env.INITIAL_PIN || '1234'
  const pinHash = await bcrypt.hash(pin, 12)

  const existingUser = await prisma.user.findFirst()
  if (!existingUser) {
    await prisma.user.create({ data: { pinHash } })
    console.log(`Created user with PIN: ${pin}`)
  }

  const existingProfile = await prisma.babyProfile.findFirst()
  if (!existingProfile) {
    await prisma.babyProfile.create({
      data: {
        name: 'Baby',
        birthDate: new Date(),
        birthWeightKg: 3.0,
        birthHeightCm: 50,
        parentNames: 'Ayah & Ibu',
        gender: 'MALE',
      },
    })
    console.log('Created default baby profile')
  }

  const seedKeys = immunizationSeedData.map(immunizationSeedKey)
  let immCreated = 0
  let immUpdated = 0

  for (const item of immunizationSeedData) {
    const seedKey = immunizationSeedKey(item)
    const scheduleData = {
      vaccineName: item.vaccineName,
      scheduledAgeMonths: weeksToScheduledMonths(item.scheduledAgeWeeks),
      scheduledAgeWeeks: item.scheduledAgeWeeks,
      doseLabel: item.doseLabel,
      isNationalProgram: item.isNationalProgram,
      scheduleNotes: item.notes ?? null,
      minWeeks: item.minWeeks ?? null,
      maxWeeks: item.maxWeeks ?? null,
      seedKey,
      isCustom: false,
    }

    const existing = await prisma.immunization.findUnique({ where: { seedKey } })
    if (existing) {
      if (!existing.isDone) {
        await prisma.immunization.update({
          where: { id: existing.id },
          data: scheduleData,
        })
        immUpdated++
      }
    } else {
      await prisma.immunization.create({ data: scheduleData })
      immCreated++
    }
  }

  const removed = await prisma.immunization.deleteMany({
    where: {
      isCustom: false,
      isDone: false,
      OR: [{ seedKey: null }, { seedKey: { notIn: seedKeys } }],
    },
  })

  console.log(
    `Immunizations: +${immCreated} created, ~${immUpdated} updated, -${removed.count} obsolete`
  )

  const devCount = await prisma.developmentChecklist.count()
  if (devCount === 0) {
    await prisma.developmentChecklist.createMany({
      data: DEVELOPMENT_ITEMS.map((d) => ({
        ageGroupMonths: d.ageGroupMonths,
        question: d.question,
      })),
    })
    console.log(`Seeded ${DEVELOPMENT_ITEMS.length} development items`)
  }

  const titleCount = await prisma.title.count()
  if (titleCount === 0) {
    await prisma.title.createMany({
      data: [
        {
          category: 'physical',
          name: 'Snowball Roller',
          emoji: '⛄',
          description: 'Bisa berguling/bergerak aktif sendiri',
        },
        {
          category: 'cognitive',
          name: 'Little Snowflake Thinker',
          emoji: '❄️',
          description: 'Mulai memahami sebab-akibat sederhana',
        },
        {
          category: 'linguistic',
          name: 'Winter Whisperer',
          emoji: '🌬️',
          description: 'Mengucapkan kata pertama yang jelas',
        },
        {
          category: 'social',
          name: 'Cozy Cuddler',
          emoji: '🤗',
          description: 'Mulai tersenyum & merespons secara sosial',
        },
      ],
    })
    console.log('Seeded 4 titles')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
