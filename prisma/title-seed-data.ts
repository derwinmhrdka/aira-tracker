// Badge pencapaian — usia × kategori, tema winter/cozy.
// Unlock saat semua item checklist Perkembangan di usia+kategori itu dicentang.

export type TitleCategory =
  | 'physical'
  | 'cognitive'
  | 'linguistic'
  | 'social'

export type TitleSeed = {
  ageGroupMonths: number
  category: TitleCategory
  name: string
  emoji: string
  description: string
}

export function titleSeedKey(t: Pick<TitleSeed, 'ageGroupMonths' | 'category'>): string {
  return `${t.ageGroupMonths}|${t.category}`
}

/** Usia mengikuti checkpoint checklist (CDC + baru lahir). Tidak ada bulan 1. */
const AGE_TITLES: Record<
  number,
  Record<TitleCategory, { name: string; emoji: string; blurb: string }>
> = {
  0: {
    physical: {
      name: 'Rookie Snowball Roller',
      emoji: '⛄',
      blurb: 'Lengan-kaki sudah bergerak, kepala terangkat sebentar',
    },
    cognitive: {
      name: 'Newborn Aurora Watcher',
      emoji: '✨',
      blurb: 'Mata mulai mengikuti wajah & cahaya',
    },
    linguistic: {
      name: 'Tiny Echo Hatchling',
      emoji: '🔊',
      blurb: 'Bereaksi pertama ke suara keras',
    },
    social: {
      name: 'Cozy Nestling Cuddler',
      emoji: '🪺',
      blurb: 'Tenang digendong & menatap wajah',
    },
  },
  2: {
    physical: {
      name: 'Tummy-Time Glacier Scout',
      emoji: '🏔️',
      blurb: 'Angkat kepala tengkurap & telapak terbuka',
    },
    cognitive: {
      name: 'Wide-Eyed Flurry Follower',
      emoji: '👀',
      blurb: 'Mengikuti gerakan & menatap mainan',
    },
    linguistic: {
      name: 'Soft Coo Crystal',
      emoji: '🫧',
      blurb: 'Suara selain tangis mulai muncul',
    },
    social: {
      name: 'First Smile Snowflake',
      emoji: '😊',
      blurb: 'Senyum sosial & senang saat didekati',
    },
  },
  4: {
    physical: {
      name: 'Head-High Ice Guardian',
      emoji: '🧊',
      blurb: 'Kepala tegak, genggam, & dorong siku',
    },
    cognitive: {
      name: 'Bottle-Signal Sage',
      emoji: '🍼',
      blurb: 'Antisipasi susu & eksplorasi tangan',
    },
    linguistic: {
      name: 'Ooo-Ahh Wind Chime',
      emoji: '🎐',
      blurb: 'Suara vokal & balas obrolan',
    },
    social: {
      name: 'Giggle Magician',
      emoji: '🎩',
      blurb: 'Senyum untuk perhatian & terkekeh',
    },
  },
  6: {
    physical: {
      name: 'Flip Flurry Flipper',
      emoji: '🔄',
      blurb: 'Berguling & mulai duduk bertopang',
    },
    cognitive: {
      name: 'Mouth Explorer Scholar',
      emoji: '🔍',
      blurb: 'Eksplorasi mulut, meraih, & sinyal kenyang',
    },
    linguistic: {
      name: 'Raspberry Wind Whisperer',
      emoji: '🌬️',
      blurb: 'Giliran suara, raspberry, & pekikan',
    },
    social: {
      name: 'Mirror Ice Buddy',
      emoji: '🪞',
      blurb: 'Kenal familiar, cermin, & tertawa',
    },
  },
  9: {
    physical: {
      name: 'Sit-and-Scoop Snow Cub',
      emoji: '🐻',
      blurb: 'Duduk mandiri & jari mengais',
    },
    cognitive: {
      name: 'Object Permanence Detective',
      emoji: '🕵️',
      blurb: 'Cari benda jatuh & bunyikan dua benda',
    },
    linguistic: {
      name: 'Mama-Baba Babbler',
      emoji: '🗣️',
      blurb: 'Suku kata berulang & minta digendong',
    },
    social: {
      name: 'Peekaboo Frost Pixie',
      emoji: '👻',
      blurb: 'Nama, cilukba, & stranger wariness',
    },
  },
  12: {
    physical: {
      name: 'Cruise-Along Icicle Walker',
      emoji: ' congel',
      blurb: 'Tarik berdiri, cruise furniture, pincer',
    },
    cognitive: {
      name: 'Container Puzzle Pup',
      emoji: '🧩',
      blurb: 'Masukkan benda & cari yang disembunyikan',
    },
    linguistic: {
      name: 'Mama-Papa Name Caller',
      emoji: '📣',
      blurb: 'Dadah, mama/papa, paham “tidak”',
    },
    social: {
      name: 'Pat-a-Cake Partner',
      emoji: '👏',
      blurb: 'Main tepuk tangan bareng',
    },
  },
  15: {
    physical: {
      name: 'First-Step Frost Sprite',
      emoji: '🧚',
      blurb: 'Langkah sendiri & makan jari',
    },
    cognitive: {
      name: 'Tool Pretend Apprentice',
      emoji: '🛠️',
      blurb: 'Pakai benda benar & susun 2 balok',
    },
    linguistic: {
      name: 'Word Spark Igniter',
      emoji: '🔥',
      blurb: 'Kata baru, tunjuk, & paham nama benda',
    },
    social: {
      name: 'Hug & Show Blizzard Friend',
      emoji: '💝',
      blurb: 'Tunjuk kesukaan, peluk, & kasih sayang',
    },
  },
  18: {
    physical: {
      name: 'Free-Stroll Blizzard Buddy',
      emoji: '🚶',
      blurb: 'Jalan bebas, coret, cangkir, & sofa',
    },
    cognitive: {
      name: 'Domestic Drama Director',
      emoji: '🎬',
      blurb: 'Tiru pekerjaan rumah & main push-toy',
    },
    linguistic: {
      name: 'Three-Word Trailblazer',
      emoji: '🛤️',
      blurb: '3+ kata & perintah tanpa gestur',
    },
    social: {
      name: 'Check-In Explorer',
      emoji: '🧭',
      blurb: 'Jelajah sambil pastikan orang tua dekat',
    },
  },
  24: {
    physical: {
      name: 'Kick-Run Snow Leopard',
      emoji: '🐆',
      blurb: 'Tendang bola, lari, & naik tangga',
    },
    cognitive: {
      name: 'Two-Hand Gadget Geek',
      emoji: '🕹️',
      blurb: 'Dua tangan, saklar mainan, multi-toy',
    },
    linguistic: {
      name: 'Phrase Weaver',
      emoji: '🧵',
      blurb: '2 kata bersamaan & tunjuk tubuh',
    },
    social: {
      name: 'Empathy Ember',
      emoji: '❤️‍🔥',
      blurb: 'Sadar orang kesal & cek reaksi orang tua',
    },
  },
  30: {
    physical: {
      name: 'Twist-Jump Alpine Hopper',
      emoji: '🦘',
      blurb: 'Putar gagang, lompat, & balik halaman',
    },
    cognitive: {
      name: 'Color Clue Solver',
      emoji: '🎨',
      blurb: 'Pretend play, 2 langkah, & warna',
    },
    linguistic: {
      name: 'Fifty-Word Story Starter',
      emoji: '📚',
      blurb: '~50 kata, verb phrase, & aku/kamu',
    },
    social: {
      name: 'Look-at-Me Stage Star',
      emoji: '🌟',
      blurb: 'Main paralel & “lihat aku!”',
    },
  },
  36: {
    physical: {
      name: 'Bead-and-Fork Craftsman',
      emoji: '📿',
      blurb: 'Rangkai manik, pakai baju, makan garpu',
    },
    cognitive: {
      name: 'Circle Sketch Wizard',
      emoji: '⭕',
      blurb: 'Gambar lingkaran & hindari panas',
    },
    linguistic: {
      name: 'Who-What-Why Reporter',
      emoji: '📰',
      blurb: 'Tanya jawab, nama sendiri, bicara jelas',
    },
    social: {
      name: 'Playdate Diplomat',
      emoji: '🤝',
      blurb: 'Tenang ditinggal & ajak teman main',
    },
  },
  48: {
    physical: {
      name: 'Catch-&-Button Champion',
      emoji: '🧤',
      blurb: 'Tangkap bola, tuang, kancing, grip pensil',
    },
    cognitive: {
      name: 'Story Crystal Baller',
      emoji: '🔮',
      blurb: 'Warna, tebak cerita, gambar orang',
    },
    linguistic: {
      name: 'Four-Word Songbird',
      emoji: '🐦',
      blurb: 'Kalimat 4 kata, nyanyi, & cerita hari ini',
    },
    social: {
      name: 'Costume Empathy Hero',
      emoji: '🦸',
      blurb: 'Pretend role, hibur teman, & baca situasi',
    },
  },
  60: {
    physical: {
      name: 'Olympian Ice Explorer',
      emoji: '🏅',
      blurb: 'Kancing mandiri & lompat satu kaki',
    },
    cognitive: {
      name: 'Ten-Count Letter Legend',
      emoji: '🔤',
      blurb: 'Hitung 10, huruf nama, & fokus 5–10 menit',
    },
    linguistic: {
      name: 'Tale-Retell Orator',
      emoji: '🎤',
      blurb: 'Cerita ulang, tanya jawab buku, & sajak',
    },
    social: {
      name: 'Rule-Share Aurora Captain',
      emoji: '👑',
      blurb: 'Giliran, perform, & bantu pekerjaan rumah',
    },
  },
}

function ageLabel(months: number): string {
  if (months === 0) return 'baru lahir'
  if (months === 24) return '2 tahun'
  if (months === 30) return '2,5 tahun'
  if (months === 36) return '3 tahun'
  if (months === 48) return '4 tahun'
  if (months === 60) return '5 tahun'
  return `${months} bulan`
}

export const titleSeedData: TitleSeed[] = Object.entries(AGE_TITLES).flatMap(
  ([ageStr, cats]) => {
    const age = Number(ageStr)
    return (Object.keys(cats) as TitleCategory[]).map((category) => {
      const t = cats[category]
      return {
        ageGroupMonths: age,
        category,
        name: t.name,
        emoji: t.emoji,
        description: `${ageLabel(age)} · ${t.blurb}`,
      }
    })
  }
)
