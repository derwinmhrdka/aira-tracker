import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const IMMUNIZATIONS = [
  { vaccineName: 'HB0 (24 jam)', scheduledAgeMonths: 0 },
  { vaccineName: 'BCG', scheduledAgeMonths: 1 },
  { vaccineName: 'DPT-HB-Hib 1', scheduledAgeMonths: 2 },
  { vaccineName: 'Polio 1', scheduledAgeMonths: 2 },
  { vaccineName: 'RV 1', scheduledAgeMonths: 2 },
  { vaccineName: 'DPT-HB-Hib 2', scheduledAgeMonths: 3 },
  { vaccineName: 'Polio 2', scheduledAgeMonths: 3 },
  { vaccineName: 'RV 2', scheduledAgeMonths: 3 },
  { vaccineName: 'DPT-HB-Hib 3', scheduledAgeMonths: 4 },
  { vaccineName: 'Polio 3', scheduledAgeMonths: 4 },
  { vaccineName: 'IPV', scheduledAgeMonths: 4 },
  { vaccineName: 'RV 3', scheduledAgeMonths: 4 },
  { vaccineName: 'Campak-Rubella', scheduledAgeMonths: 9 },
  { vaccineName: 'Japanese Encephalitis', scheduledAgeMonths: 9 },
]

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

  const immCount = await prisma.immunization.count()
  if (immCount === 0) {
    await prisma.immunization.createMany({
      data: IMMUNIZATIONS.map((i) => ({
        vaccineName: i.vaccineName,
        scheduledAgeMonths: i.scheduledAgeMonths,
      })),
    })
    console.log(`Seeded ${IMMUNIZATIONS.length} immunizations`)
  }

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
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
