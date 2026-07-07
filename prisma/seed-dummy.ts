/**
 * Seed dummy data untuk demo semua fitur.
 * Jalankan: npm run db:dummy
 *
 * Menghapus data log lama dan mengisi ulang dengan data 30 hari terakhir.
 * User & PIN tidak diubah.
 */
import { PrismaClient, DiaperType, LoggedBy, FeedSide } from '@prisma/client'

const prisma = new PrismaClient()

const LOGGERS: LoggedBy[] = ['AYAH', 'IBU', 'PENGASUH']
const FEED_SIDES: FeedSide[] = ['LEFT', 'RIGHT', 'BOTH']

function daysAgo(n: number, hour = 12, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, minute, 0, 0)
  return d
}

function dateOnly(daysBack: number) {
  const d = daysAgo(daysBack)
  d.setHours(12, 0, 0, 0)
  return d
}

function pick<T>(arr: T[], seed: number) {
  return arr[seed % arr.length]
}

function rand(seed: number, min: number, max: number) {
  return min + (seed * 17 + 7) % (max - min + 1)
}

const BABY = {
  name: 'Aira',
  birthDate: new Date('2026-03-10'),
  birthWeightKg: 3.2,
  birthHeightCm: 49.5,
  bloodType: 'O',
  parentNames: 'Derwin & Ibu',
  gender: 'FEMALE' as const,
}

const GROWTH_DATA = [
  { monthsAgo: 4, weight: 3.2, height: 49.5, jaundice: true, bilirubin: 14.2 },
  { monthsAgo: 3, weight: 4.1, height: 53.0 },
  { monthsAgo: 2, weight: 4.9, height: 56.5 },
  { monthsAgo: 1, weight: 5.4, height: 59.2 },
  { monthsAgo: 0, weight: 5.8, height: 61.8 },
]

const MILESTONES = [
  { daysAgo: 85, title: 'Senyum pertama', description: 'Senyum responsif ke ayah!' },
  { daysAgo: 60, title: 'Angkat kepala', description: 'Saat tummy time 2 menit' },
  { daysAgo: 35, title: 'Tertawa keras', description: 'Ketika main peek-a-boo' },
  { daysAgo: 12, title: 'Balik badan', description: 'Dari tengkurap ke terlentang sendiri' },
]

const NOTE_PRESETS = [
  'Tummy time 🤸 — 5 menit, kuat angkat kepala',
  'Baby time 👶 — bonding pagi',
  'Mandi 🛁 — sabun bayi, senang',
  'Cerita buku 📖 — 3 buku karton',
  'Musik 🎵 — lagu pengantar tidur',
  'Keluarga datang berkunjung 👨‍👩‍👧',
  'Pertama kali ke taman 🌳',
]

const DONE_VACCINES = [
  { name: 'HB0 (24 jam)', ageMonths: 0, daysAfterBirth: 1 },
  { name: 'BCG', ageMonths: 1, daysAfterBirth: 35 },
  { name: 'DPT-HB-Hib 1', ageMonths: 2, daysAfterBirth: 62 },
  { name: 'Polio 1', ageMonths: 2, daysAfterBirth: 62 },
  { name: 'RV 1', ageMonths: 2, daysAfterBirth: 62 },
  { name: 'DPT-HB-Hib 2', ageMonths: 3, daysAfterBirth: 90 },
  { name: 'Polio 2', ageMonths: 3, daysAfterBirth: 90 },
  { name: 'RV 2', ageMonths: 3, daysAfterBirth: 90 },
]

const CHECKED_DEV = [
  'Mengangkat kepala sebentar saat tengkurap',
  'Mengikuti wajah dengan mata',
  'Merespons suara dengan hening',
  'Tersenyum spontan',
  'Tertawa keras',
  'Menggapai dan memegang mainan',
]

async function clearDemoData() {
  await prisma.$transaction([
    prisma.diaperLog.deleteMany(),
    prisma.feedingLog.deleteMany(),
    prisma.sleepLog.deleteMany(),
    prisma.growthLog.deleteMany(),
    prisma.dailyNote.deleteMany(),
    prisma.milestone.deleteMany(),
    prisma.pushSubscription.deleteMany(),
  ])
}

async function seedProfile() {
  const existing = await prisma.babyProfile.findFirst()
  if (existing) {
    await prisma.babyProfile.update({
      where: { id: existing.id },
      data: BABY,
    })
  } else {
    await prisma.babyProfile.create({ data: BABY })
  }
  console.log(`✓ Profil bayi: ${BABY.name} (${BABY.gender})`)
}

async function seedGrowth() {
  const birth = BABY.birthDate
  for (const g of GROWTH_DATA) {
    const d = new Date(birth)
    d.setMonth(d.getMonth() + (4 - g.monthsAgo))
    await prisma.growthLog.create({
      data: {
        date: d,
        weightKg: g.weight,
        heightCm: g.height,
        isJaundice: g.jaundice ?? false,
        bilirubinLevel: g.bilirubin ?? null,
        notes: g.jaundice ? 'Kontrol bilirubin di RS' : 'Timbang di posyandu',
      },
    })
  }
  console.log(`✓ ${GROWTH_DATA.length} data pertumbuhan`)
}

async function seedMilestones() {
  for (const m of MILESTONES) {
    await prisma.milestone.create({
      data: {
        date: dateOnly(m.daysAgo),
        title: m.title,
        description: m.description,
      },
    })
  }
  console.log(`✓ ${MILESTONES.length} milestone`)
}

async function seedImmunizations() {
  const vaccines = await prisma.immunization.findMany()
  if (vaccines.length === 0) {
    console.log('⚠ Imunisasi belum ada — jalankan npm run db:seed dulu')
    return
  }

  const birth = BABY.birthDate
  for (const v of vaccines) {
    const done = DONE_VACCINES.find((d) => d.name === v.vaccineName)
    if (done) {
      const given = new Date(birth)
      given.setDate(given.getDate() + done.daysAfterBirth)
      await prisma.immunization.update({
        where: { id: v.id },
        data: {
          isDone: true,
          dateGiven: given,
          notes: 'Puskesmas terdekat',
        },
      })
    } else {
      await prisma.immunization.update({
        where: { id: v.id },
        data: { isDone: false, dateGiven: null, notes: null },
      })
    }
  }
  console.log(`✓ Imunisasi: ${DONE_VACCINES.length} selesai, sisanya pending`)
}

async function seedDevelopment() {
  const items = await prisma.developmentChecklist.findMany()
  for (const item of items) {
    const checked = CHECKED_DEV.includes(item.question)
    await prisma.developmentChecklist.update({
      where: { id: item.id },
      data: {
        isChecked: checked,
        dateChecked: checked ? dateOnly(rand(item.id.length, 10, 60)) : null,
      },
    })
  }
  console.log(`✓ Perkembangan: ${CHECKED_DEV.length} item dicentang`)
}

async function seedDailyLogs() {
  let diaperCount = 0
  let feedCount = 0
  let sleepCount = 0
  let noteCount = 0

  for (let day = 29; day >= 0; day--) {
    const logger = pick(LOGGERS, day)

    // Popok: 5-7x per hari
    const diaperTimes = [7, 10, 13, 16, 19, 22]
    for (let i = 0; i < rand(day, 5, 7); i++) {
      const hour = diaperTimes[i] ?? rand(day + i, 6, 22)
      const roll = rand(day + i, 0, 10)
      const type =
        roll < 3 ? DiaperType.PUP : roll < 8 ? DiaperType.PIPIS : DiaperType.KEDUANYA
      await prisma.diaperLog.create({
        data: {
          timestamp: daysAgo(day, hour, rand(day + i, 0, 59)),
          type,
          loggedBy: pick(LOGGERS, day + i),
        },
      })
      diaperCount++
    }

    // Menyusui: 6-8x, interval ~2.5-3.5 jam
    const feedHours = [6, 9, 12, 15, 18, 21]
    for (let i = 0; i < rand(day, 6, 8); i++) {
      const startHour = feedHours[i] ?? 6 + i * 3
      const durationMin = rand(day + i, 12, 28)
      const start = daysAgo(day, startHour, rand(day, 0, 30))
      const end = new Date(start.getTime() + durationMin * 60 * 1000)

      // Hari ini: sesi terakhir 4 jam lalu (untuk test pengingat)
      const isTodayLastFeed = day === 0 && i === feedHours.length - 1
      const feedStart = isTodayLastFeed
        ? new Date(Date.now() - 4 * 60 * 60 * 1000)
        : start
      const feedEnd = isTodayLastFeed
        ? new Date(feedStart.getTime() + 20 * 60 * 1000)
        : end

      await prisma.feedingLog.create({
        data: {
          timestampStart: feedStart,
          timestampEnd: feedEnd,
          side: pick(FEED_SIDES, day + i),
          amountMl: rand(day + i, 80, 150),
          loggedBy: pick(LOGGERS, day + i + 1),
          notes: i === 0 && day % 5 === 0 ? 'Bangun lapar' : null,
        },
      })
      feedCount++
    }

    // Tidur: 3-4 sesi siang + malam
    const sleepSessions = [
      { startH: 9, durMin: 45 },
      { startH: 13, durMin: 90 },
      { startH: 16, durMin: 30 },
      { startH: 20, durMin: 480 },
    ]
    for (let i = 0; i < (day % 3 === 0 ? 3 : 4); i++) {
      const s = sleepSessions[i]
      if (!s) continue
      const sStart = daysAgo(day, s.startH, 0)
      const sEnd = new Date(sStart.getTime() + s.durMin * 60 * 1000)
      await prisma.sleepLog.create({
        data: {
          timestampStart: sStart,
          timestampEnd: sEnd,
          loggedBy: logger,
          notes: s.durMin > 120 ? 'Tidur malam' : null,
        },
      })
      sleepCount++
    }

    // Catatan: ~2-3 per minggu
    if (day % 4 === 0) {
      await prisma.dailyNote.create({
        data: {
          timestamp: daysAgo(day, 14, 30),
          content: pick(NOTE_PRESETS, day),
          loggedBy: logger,
        },
      })
      noteCount++
    }
  }

  // Hari ini: satu sesi tidur aktif (untuk demo timer)
  await prisma.sleepLog.create({
    data: {
      timestampStart: new Date(Date.now() - 35 * 60 * 1000),
      timestampEnd: null,
      loggedBy: 'IBU',
      notes: 'Tidur siang',
    },
  })
  sleepCount++

  console.log(`✓ ${diaperCount} popok, ${feedCount} menyusui, ${sleepCount} tidur, ${noteCount} catatan`)
}

async function main() {
  console.log('🌱 Seeding dummy data...\n')

  const user = await prisma.user.findFirst()
  if (!user) {
    console.error('❌ User belum ada. Jalankan: npm run db:seed')
    process.exit(1)
  }

  const immCount = await prisma.immunization.count()
  const devCount = await prisma.developmentChecklist.count()
  if (immCount === 0 || devCount === 0) {
    console.log('Menjalankan seed dasar dulu...')
    const { execSync } = await import('child_process')
    execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' })
  }

  await clearDemoData()
  console.log('✓ Data log lama dihapus')

  await seedProfile()
  await seedGrowth()
  await seedMilestones()
  await seedImmunizations()
  await seedDevelopment()
  await seedDailyLogs()

  console.log('\n✅ Dummy data siap!')
  console.log('   Login PIN: 1234 (dari .env INITIAL_PIN)')
  console.log('   Bayi: Aira, ~4 bulan, perempuan')
  console.log('   Data: 30 hari terakhir + timer tidur aktif + feed 4 jam lalu')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
