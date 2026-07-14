import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import {
  immunizationSeedData,
  immunizationSeedKey,
  legacyImmunizationTargetKey,
  weeksToScheduledMonths,
} from './immunization-seed-data'
import {
  developmentChecklistSeedData,
  developmentSeedKey,
} from './development-seed-data'

const prisma = new PrismaClient()

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

  // Merge duplikat jadwal lama / custom → entri IDAI baru, lalu hapus sumber
  const allImm = await prisma.immunization.findMany()
  const bySeedKey = new Map(
    allImm.filter((i) => i.seedKey).map((i) => [i.seedKey as string, i])
  )
  const deleteIds: string[] = []
  let immMerged = 0

  for (const legacy of allImm) {
    const isCurrentSeed =
      !!legacy.seedKey && seedKeys.includes(legacy.seedKey)
    if (isCurrentSeed) continue

    const targetKey = legacyImmunizationTargetKey({
      vaccineName: legacy.vaccineName,
      notes: legacy.notes,
      isCustom: legacy.isCustom,
    })
    if (!targetKey) continue

    const target = bySeedKey.get(targetKey)
    if (!target || target.id === legacy.id) continue

    if (legacy.isDone) {
      const dates = [target.dateGiven, legacy.dateGiven].filter(
        (d): d is Date => !!d
      )
      const earliest =
        dates.length > 0
          ? dates.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b))
          : null
      await prisma.immunization.update({
        where: { id: target.id },
        data: {
          isDone: true,
          dateGiven: earliest,
          notes: target.notes?.trim() || legacy.notes,
        },
      })
      target.isDone = true
      target.dateGiven = earliest
      target.notes = target.notes?.trim() || legacy.notes
      immMerged++
    }

    deleteIds.push(legacy.id)
  }

  if (deleteIds.length > 0) {
    await prisma.immunization.deleteMany({ where: { id: { in: deleteIds } } })
  }

  const removed = await prisma.immunization.deleteMany({
    where: {
      isCustom: false,
      isDone: false,
      OR: [{ seedKey: null }, { seedKey: { notIn: seedKeys } }],
    },
  })

  console.log(
    `Immunizations: +${immCreated} created, ~${immUpdated} updated, ↔${immMerged} merged, -${deleteIds.length + removed.count} duplicates/obsolete`
  )

  // Ganti checklist lama → CDC milestones (abaikan data sebelumnya)
  const removedDev = await prisma.developmentChecklist.deleteMany({})
  await prisma.developmentChecklist.createMany({
    data: developmentChecklistSeedData.map((d) => ({
      ageGroupMonths: d.ageGroupMonths,
      category: d.category,
      question: d.question,
      seedKey: developmentSeedKey(d),
    })),
  })
  console.log(
    `Development: replaced ${removedDev.count} old → ${developmentChecklistSeedData.length} CDC items`
  )

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
