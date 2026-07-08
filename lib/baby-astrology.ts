export interface BabyAstrology {
  horoscope: string
  horoscopeEmoji: string
  shioAnimal: string
  shioElement: string
  shio: string
}

const HOROSCOPES: { name: string; emoji: string; start: [number, number]; end: [number, number] }[] = [
  { name: 'Capricorn', emoji: '♑', start: [12, 22], end: [1, 19] },
  { name: 'Aquarius', emoji: '♒', start: [1, 20], end: [2, 18] },
  { name: 'Pisces', emoji: '♓', start: [2, 19], end: [3, 20] },
  { name: 'Aries', emoji: '♈', start: [3, 21], end: [4, 19] },
  { name: 'Taurus', emoji: '♉', start: [4, 20], end: [5, 20] },
  { name: 'Gemini', emoji: '♊', start: [5, 21], end: [6, 20] },
  { name: 'Cancer', emoji: '♋', start: [6, 21], end: [7, 22] },
  { name: 'Leo', emoji: '♌', start: [7, 23], end: [8, 22] },
  { name: 'Virgo', emoji: '♍', start: [8, 23], end: [9, 22] },
  { name: 'Libra', emoji: '♎', start: [9, 23], end: [10, 22] },
  { name: 'Scorpio', emoji: '♏', start: [10, 23], end: [11, 21] },
  { name: 'Sagittarius', emoji: '♐', start: [11, 22], end: [12, 21] },
]

const SHIO_ANIMALS = [
  'Tikus',
  'Kerbau',
  'Harimau',
  'Kelinci',
  'Naga',
  'Ular',
  'Kuda',
  'Kambing',
  'Monyet',
  'Ayam',
  'Anjing',
  'Babi',
] as const

const SHIO_ELEMENTS = ['Kayu', 'Api', 'Tanah', 'Logam', 'Air'] as const

/** Tanggal Imlek (awal tahun shio) per tahun Masehi */
const LUNAR_NEW_YEAR: Record<number, [number, number]> = {
  1990: [1, 27],
  1991: [2, 15],
  1992: [2, 4],
  1993: [1, 23],
  1994: [2, 10],
  1995: [1, 31],
  1996: [2, 19],
  1997: [2, 7],
  1998: [1, 28],
  1999: [2, 16],
  2000: [2, 5],
  2001: [1, 24],
  2002: [2, 12],
  2003: [2, 1],
  2004: [1, 22],
  2005: [2, 9],
  2006: [1, 29],
  2007: [2, 18],
  2008: [2, 7],
  2009: [1, 26],
  2010: [2, 14],
  2011: [2, 3],
  2012: [1, 23],
  2013: [2, 10],
  2014: [1, 31],
  2015: [2, 19],
  2016: [2, 8],
  2017: [1, 28],
  2018: [2, 16],
  2019: [2, 5],
  2020: [1, 25],
  2021: [2, 12],
  2022: [2, 1],
  2023: [1, 22],
  2024: [2, 10],
  2025: [1, 29],
  2026: [2, 17],
  2027: [2, 6],
  2028: [1, 26],
  2029: [2, 13],
  2030: [2, 3],
  2031: [1, 23],
  2032: [2, 11],
  2033: [1, 31],
  2034: [2, 19],
  2035: [2, 8],
}

function parseBirthDate(birthDate: string) {
  const [year, month, day] = birthDate.split('-').map(Number)
  return { year, month, day }
}

function dayOfYear(month: number, day: number) {
  return month * 100 + day
}

function getHoroscope(month: number, day: number) {
  const current = dayOfYear(month, day)
  for (const sign of HOROSCOPES) {
    const start = dayOfYear(sign.start[0], sign.start[1])
    const end = dayOfYear(sign.end[0], sign.end[1])
    if (sign.start[0] > sign.end[0]) {
      if (current >= start || current <= end) return sign
    } else if (current >= start && current <= end) {
      return sign
    }
  }
  return HOROSCOPES[0]
}

function getChineseZodiacYear(year: number, month: number, day: number) {
  const lunar = LUNAR_NEW_YEAR[year] ?? [2, 5]
  if (month < lunar[0] || (month === lunar[0] && day < lunar[1])) {
    return year - 1
  }
  return year
}

export function getBabyAstrology(birthDate: string): BabyAstrology | null {
  if (!birthDate) return null

  const { year, month, day } = parseBirthDate(birthDate)
  if (!year || !month || !day) return null

  const horoscope = getHoroscope(month, day)
  const shioYear = getChineseZodiacYear(year, month, day)
  const shioAnimal = SHIO_ANIMALS[(shioYear - 4) % 12]
  const shioElement = SHIO_ELEMENTS[Math.floor(((shioYear - 4) % 10) / 2)]

  return {
    horoscope: horoscope.name,
    horoscopeEmoji: horoscope.emoji,
    shioAnimal,
    shioElement,
    shio: `${shioAnimal} ${shioElement}`,
  }
}
