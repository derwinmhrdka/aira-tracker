/** Wonder Weeks–style mental leaps (approx. windows by age in weeks from birth). */
export type BabyLeap = {
  number: number
  title: string
  titleEn: string
  emoji: string
  startWeek: number
  endWeek: number
  hint: string
}

export const BABY_LEAPS: BabyLeap[] = [
  {
    number: 1,
    title: 'Sensasi',
    titleEn: 'Sensations',
    emoji: '✨',
    startWeek: 4,
    endWeek: 5,
    hint: 'Lebih sensitif terhadap cahaya, suara, dan sentuhan',
  },
  {
    number: 2,
    title: 'Pola',
    titleEn: 'Patterns',
    emoji: '🔷',
    startWeek: 7,
    endWeek: 9,
    hint: 'Mulai mengenali pola sederhana di sekitarnya',
  },
  {
    number: 3,
    title: 'Transisi',
    titleEn: 'Smooth Transitions',
    emoji: '🌊',
    startWeek: 11,
    endWeek: 12,
    hint: 'Lebih mudah mengikuti gerakan dan suara yang mulus',
  },
  {
    number: 4,
    title: 'Peristiwa',
    titleEn: 'Events',
    emoji: '🎬',
    startWeek: 14,
    endWeek: 19,
    hint: 'Mulai paham sebab-akibat sederhana',
  },
  {
    number: 5,
    title: 'Hubungan',
    titleEn: 'Relationships',
    emoji: '💞',
    startWeek: 22,
    endWeek: 26,
    hint: 'Lebih clingy; mulai sadar jarak & orang tua',
  },
  {
    number: 6,
    title: 'Kategori',
    titleEn: 'Categories',
    emoji: '🗂️',
    startWeek: 33,
    endWeek: 37,
    hint: 'Mulai mengelompokkan benda dan kata “tidak”',
  },
  {
    number: 7,
    title: 'Urutan',
    titleEn: 'Sequences',
    emoji: '🔗',
    startWeek: 41,
    endWeek: 47,
    hint: 'Belajar tindakan berurutan & meniru',
  },
  {
    number: 8,
    title: 'Program',
    titleEn: 'Programs',
    emoji: '🧩',
    startWeek: 50,
    endWeek: 54,
    hint: 'Mencapai tujuan dengan cara yang lebih fleksibel',
  },
  {
    number: 9,
    title: 'Prinsip',
    titleEn: 'Principles',
    emoji: '🧭',
    startWeek: 59,
    endWeek: 65,
    hint: 'Mulai paham aturan sederhana & empati',
  },
  {
    number: 10,
    title: 'Sistem',
    titleEn: 'Systems',
    emoji: '🌐',
    startWeek: 70,
    endWeek: 76,
    hint: 'Sadar sistem yang lebih kompleks di sekitarnya',
  },
]

export type LeapStatus =
  | {
      phase: 'active'
      leap: BabyLeap
      ageWeeks: number
      daysIntoLeap: number
      daysLeftInLeap: number
    }
  | {
      phase: 'upcoming'
      leap: BabyLeap
      ageWeeks: number
      daysUntilStart: number
    }
  | {
      phase: 'done'
      ageWeeks: number
    }
  | null

function ageDaysFromBirth(birthDate: string, now = new Date()) {
  const birth = new Date(`${birthDate}T12:00:00`)
  const today = new Date(now)
  today.setHours(12, 0, 0, 0)
  birth.setHours(12, 0, 0, 0)
  return Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24))
}

export function getLeapStatus(birthDate: string | null | undefined, now = new Date()): LeapStatus {
  if (!birthDate) return null
  const ageDays = ageDaysFromBirth(birthDate, now)
  if (ageDays < 0) return null

  const ageWeeks = ageDays / 7

  for (const leap of BABY_LEAPS) {
    if (ageWeeks >= leap.startWeek && ageWeeks < leap.endWeek + 1) {
      const daysIntoLeap = Math.max(0, Math.round(ageDays - leap.startWeek * 7))
      const daysLeftInLeap = Math.max(
        0,
        Math.round((leap.endWeek + 1) * 7 - ageDays)
      )
      return {
        phase: 'active',
        leap,
        ageWeeks: Math.round(ageWeeks * 10) / 10,
        daysIntoLeap,
        daysLeftInLeap,
      }
    }
  }

  for (const leap of BABY_LEAPS) {
    if (ageWeeks < leap.startWeek) {
      return {
        phase: 'upcoming',
        leap,
        ageWeeks: Math.round(ageWeeks * 10) / 10,
        daysUntilStart: Math.max(0, Math.round(leap.startWeek * 7 - ageDays)),
      }
    }
  }

  return { phase: 'done', ageWeeks: Math.round(ageWeeks * 10) / 10 }
}
