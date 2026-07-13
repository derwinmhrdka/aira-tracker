/** Wonder Weeks–style mental leaps (approx. windows by age in weeks from birth). */
export type BabyLeap = {
  number: number
  title: string
  titleEn: string
  emoji: string
  startWeek: number
  endWeek: number
  hint: string
  signs: string[]
  tips: string[]
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
    signs: [
      'Lebih rewel / mudah menangis',
      'Lebih clingy ingin digendong',
      'Tidur lebih gelisah',
      'Lebih sensitif suara & cahaya',
    ],
    tips: [
      'Kurangi stimulasi berlebih (lampu, suara keras)',
      'Kontak kulit & gendongan lebih sering',
      'Rutin tidur & menyusui tetap dijaga',
    ],
  },
  {
    number: 2,
    title: 'Pola',
    titleEn: 'Patterns',
    emoji: '🔷',
    startWeek: 7,
    endWeek: 9,
    hint: 'Mulai mengenali pola sederhana di sekitarnya',
    signs: [
      'Menatap lebih lama ke wajah / pola',
      'Lebih fussy tanpa sebab jelas',
      'Lebih sering ingin dekat orang tua',
      'Nafsu makan bisa naik-turun',
    ],
    tips: [
      'Tunjukkan pola sederhana (garis, wajah, mainan kontras)',
      'Ngobrol & nyanyi dengan ritme tetap',
      'Sabar — fussy biasanya sementara',
    ],
  },
  {
    number: 3,
    title: 'Transisi',
    titleEn: 'Smooth Transitions',
    emoji: '🌊',
    startWeek: 11,
    endWeek: 12,
    hint: 'Lebih mudah mengikuti gerakan dan suara yang mulus',
    signs: [
      'Mengikuti gerakan mata lebih mulus',
      'Lebih mudah “tersinggung”',
      'Menolak digendong lalu minta lagi',
      'Suara / tangisan berubah-ubah',
    ],
    tips: [
      'Gerakan gendong yang lembut & konsisten',
      'Main kejar pandang / goyang pelan',
      'Hindari jadwal yang terlalu padat',
    ],
  },
  {
    number: 4,
    title: 'Peristiwa',
    titleEn: 'Events',
    emoji: '🎬',
    startWeek: 14,
    endWeek: 19,
    hint: 'Mulai paham sebab-akibat sederhana',
    signs: [
      'Lebih penasaran menggapai benda',
      'Menangis bila rutin berubah',
      'Lebih banyak “eksperimen” suara',
      'Tidur siang bisa berantakan',
    ],
    tips: [
      'Main sebab-akibat sederhana (kerincing, tombol bunyi)',
      'Respons cepat saat dipanggil / digapai',
      'Pertahankan ritual tidur yang sama',
    ],
  },
  {
    number: 5,
    title: 'Hubungan',
    titleEn: 'Relationships',
    emoji: '💞',
    startWeek: 22,
    endWeek: 26,
    hint: 'Lebih clingy; mulai sadar jarak & orang tua',
    signs: [
      'Separation anxiety meningkat',
      'Hanya mau digendong orang tertentu',
      'Takut orang / tempat baru',
      'Menangis saat ditinggal sebentar',
    ],
    tips: [
      'Latihan perpisahan singkat & hangat',
      'Selalu bilang “sebentar ya” lalu kembali',
      'Bawa “comfort object” jika sudah aman usianya',
    ],
  },
  {
    number: 6,
    title: 'Kategori',
    titleEn: 'Categories',
    emoji: '🗂️',
    startWeek: 33,
    endWeek: 37,
    hint: 'Mulai mengelompokkan benda dan kata “tidak”',
    signs: [
      'Mulai bilang / paham “tidak”',
      'Mengelompokkan mainan mirip',
      'Lebih keras kepala',
      'Frustrasi saat main tidak “pas”',
    ],
    tips: [
      'Main sortir sederhana (warna / bentuk)',
      'Beri pilihan terbatas (2 opsi)',
      'Tetap konsisten pada batas aman',
    ],
  },
  {
    number: 7,
    title: 'Urutan',
    titleEn: 'Sequences',
    emoji: '🔗',
    startWeek: 41,
    endWeek: 47,
    hint: 'Belajar tindakan berurutan & meniru',
    signs: [
      'Meniru gerakan sederhana',
      'Main “urutan” (ambil–masukkan–ambil)',
      'Lebih mudah frustasi bila urutan gagal',
      'Ingin ikut rutin harian',
    ],
    tips: [
      'Ajarkan langkah demi langkah (cuci tangan, makan)',
      'Nyanyi lagu dengan gerakan berurut',
      'Puji usaha, bukan hanya hasil',
    ],
  },
  {
    number: 8,
    title: 'Program',
    titleEn: 'Programs',
    emoji: '🧩',
    startWeek: 50,
    endWeek: 54,
    hint: 'Mencapai tujuan dengan cara yang lebih fleksibel',
    signs: [
      'Lebih gigih menyelesaikan tugas',
      'Mencoba cara lain jika gagal',
      'Mood naik-turun saat belajar',
      'Lebih mandiri tapi tetap clingy',
    ],
    tips: [
      'Beri waktu mencoba sendiri dulu',
      'Bantu sedikit saja saat stuck',
      'Jaga rutinitas tidur tetap stabil',
    ],
  },
  {
    number: 9,
    title: 'Prinsip',
    titleEn: 'Principles',
    emoji: '🧭',
    startWeek: 59,
    endWeek: 65,
    hint: 'Mulai paham aturan sederhana & empati',
    signs: [
      'Mulai “tes” aturan orang tua',
      'Reaksi lebih emosional',
      'Mulai peduli reaksi orang lain',
      'Lebih sering “negosiasi”',
    ],
    tips: [
      'Aturan singkat, jelas, konsisten',
      'Contohkan empati (“teman sedih ya”)',
      'Hindari hukuman kasar; arahkan ulang',
    ],
  },
  {
    number: 10,
    title: 'Sistem',
    titleEn: 'Systems',
    emoji: '🌐',
    startWeek: 70,
    endWeek: 76,
    hint: 'Sadar sistem yang lebih kompleks di sekitarnya',
    signs: [
      'Lebih paham “aturan rumah”',
      'Ingin ikut keputusan kecil',
      'Bisa lebih bossy / opinionated',
      'Bahasa & imajinasi berkembang cepat',
    ],
    tips: [
      'Libatkan dalam rutin sederhana',
      'Jelaskan “kenapa” dengan singkat',
      'Beri ruang eksplorasi aman',
    ],
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
