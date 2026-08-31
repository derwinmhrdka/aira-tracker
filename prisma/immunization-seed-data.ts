// Jadwal imunisasi anak 0–18 tahun — rekomendasi IDAI 2024
// (Satgas Imunisasi IDAI / Pedoman Imunisasi di Indonesia Edisi 7).
//
// Digunakan oleh prisma/seed.ts. Jangan simpan di public/.

/** Kolom usia chart (minggu) — sinkron dengan lib/immunization-chart.ts */
const MG = {
  lahir: { min: 0, max: 3 },
  bln1: { min: 4, max: 7 },
  bln2: { min: 8, max: 11 },
  bln3: { min: 12, max: 14 },
  bln4: { min: 15, max: 21 },
  bln5: { min: 22, max: 25 },
  bln6: { min: 26, max: 35 },
  bln7: { min: 30, max: 35 },
  bln9: { min: 36, max: 51 },
  bln12: { min: 52, max: 64 },
  bln15: { min: 65, max: 77 },
  bln18: { min: 78, max: 83 },
  bln24: { min: 104, max: 155 },
} as const

function atMonth(col: keyof typeof MG) {
  return { minWeeks: MG[col].min, maxWeeks: MG[col].max }
}

export type ImmunizationSeed = {
  vaccineName: string
  scheduledAgeWeeks: number
  minWeeks?: number
  maxWeeks?: number
  doseLabel: string
  isNationalProgram: boolean
  notes?: string
}

/** Map IDAI week buckets → usia bulan untuk grouping UI */
export function weeksToScheduledMonths(weeks: number): number {
  const WEEK_TO_MONTH: Record<number, number> = {
    0: 0,
    8: 2,
    12: 3,
    16: 4,
    26: 6,
    36: 9,
    52: 12,
    65: 15,
    78: 18,
    104: 24,
    260: 60,
  }
  if (weeks in WEEK_TO_MONTH) return WEEK_TO_MONTH[weeks]
  return Math.max(0, Math.round((weeks * 12) / 52))
}

export function immunizationSeedKey(item: ImmunizationSeed): string {
  return `${item.vaccineName}|${item.doseLabel}|${item.scheduledAgeWeeks}`
}

/** Target seedKey untuk nama jadwal lama / custom agar bisa merge status Selesai. */
export function legacyImmunizationTargetKey(input: {
  vaccineName: string
  notes?: string | null
  isCustom?: boolean
}): string | null {
  const name = input.vaccineName.trim()
  const notes = (input.notes ?? '').toLowerCase()
  const lower = name.toLowerCase()

  const byExactName: Record<string, string> = {
    'HB0 (24 jam)': immunizationSeedKey({
      vaccineName: 'Hepatitis B0 (monovalen)',
      scheduledAgeWeeks: 0,
      doseLabel: 'HB0',
      isNationalProgram: true,
    }),
    BCG: immunizationSeedKey({
      vaccineName: 'BCG',
      scheduledAgeWeeks: 0,
      doseLabel: 'BCG 1',
      isNationalProgram: true,
    }),
    'DPT-HB-Hib 1': immunizationSeedKey({
      vaccineName: 'DPT-HB-Hib (Pentavalen/Hexavalen)',
      scheduledAgeWeeks: 8,
      doseLabel: 'DPT 1',
      isNationalProgram: true,
    }),
    'Polio 1': immunizationSeedKey({
      vaccineName: 'Polio 1 (OPV)',
      scheduledAgeWeeks: 8,
      doseLabel: 'Polio 1',
      isNationalProgram: true,
    }),
    'RV 1': immunizationSeedKey({
      vaccineName: 'Rotavirus (Monovalen atau Pentavalen)',
      scheduledAgeWeeks: 8,
      doseLabel: 'Rotavirus 1',
      isNationalProgram: true,
    }),
    'DPT-HB-Hib 2': immunizationSeedKey({
      vaccineName: 'DPT-HB-Hib (Pentavalen/Hexavalen)',
      scheduledAgeWeeks: 12,
      doseLabel: 'DPT 2',
      isNationalProgram: true,
    }),
    'Polio 2': immunizationSeedKey({
      vaccineName: 'Polio 2 (OPV)',
      scheduledAgeWeeks: 12,
      doseLabel: 'Polio 2',
      isNationalProgram: true,
    }),
    'RV 2': immunizationSeedKey({
      vaccineName: 'Rotavirus (Monovalen)',
      scheduledAgeWeeks: 16,
      doseLabel: 'Rotavirus 2 (Rotarix)',
      isNationalProgram: true,
    }),
    'DPT-HB-Hib 3': immunizationSeedKey({
      vaccineName: 'DPT-HB-Hib (Pentavalen/Hexavalen)',
      scheduledAgeWeeks: 16,
      doseLabel: 'DPT 3',
      isNationalProgram: true,
    }),
    'Polio 3': immunizationSeedKey({
      vaccineName: 'Polio 3 (OPV)',
      scheduledAgeWeeks: 16,
      doseLabel: 'Polio 3',
      isNationalProgram: true,
    }),
    IPV: immunizationSeedKey({
      vaccineName: 'IPV (Polio suntik)',
      scheduledAgeWeeks: 16,
      doseLabel: 'IPV 1',
      isNationalProgram: true,
    }),
    'RV 3': immunizationSeedKey({
      vaccineName: 'Rotavirus (Pentavalen)',
      scheduledAgeWeeks: 26,
      doseLabel: 'Rotavirus 3 (Rotateq)',
      isNationalProgram: true,
    }),
    'Campak-Rubella': immunizationSeedKey({
      vaccineName: 'Campak/MR',
      scheduledAgeWeeks: 36,
      doseLabel: 'MR 1',
      isNationalProgram: true,
    }),
    'Japanese Encephalitis': immunizationSeedKey({
      vaccineName: 'Japanese Encephalitis',
      scheduledAgeWeeks: 36,
      doseLabel: 'JE 1',
      isNationalProgram: false,
    }),
  }

  if (byExactName[name]) return byExactName[name]

  // Custom / nama bebas yang masih merujuk dosis jadwal
  if (
    /hb0|hepatitis\s*b0|hep\.?\s*b0/i.test(lower) ||
    (/hepatitis\s*b/i.test(lower) && /24\s*jam|dosis\s*0|monovalen/i.test(notes + ' ' + lower))
  ) {
    return immunizationSeedKey({
      vaccineName: 'Hepatitis B0 (monovalen)',
      scheduledAgeWeeks: 0,
      doseLabel: 'HB0',
      isNationalProgram: true,
    })
  }

  if (
    /polio\s*0|opv\s*0/i.test(lower) ||
    (/^polio$/i.test(name) && /opv\s*0|polio\s*0|dosis\s*0/i.test(notes))
  ) {
    return immunizationSeedKey({
      vaccineName: 'Polio 0 (OPV)',
      scheduledAgeWeeks: 0,
      doseLabel: 'Polio 0',
      isNationalProgram: true,
    })
  }

  return null
}

export const immunizationSeedData: ImmunizationSeed[] = [
  // ===================== BARU LAHIR =====================
  {
    vaccineName: 'Hepatitis B0 (monovalen)',
    scheduledAgeWeeks: 0,
    minWeeks: 0,
    maxWeeks: 0,
    doseLabel: 'HB0',
    isNationalProgram: true,
    notes:
      '0–24 jam setelah lahir. Kejar maksimal sebelum usia 7 hari. Bayi <2000g & ibu HBsAg negatif: tunda sampai 1 bulan. Ibu HBsAg positif: HB0 + HBIg dalam 24 jam.',
  },
  {
    vaccineName: 'Polio 0 (OPV)',
    scheduledAgeWeeks: 0,
    minWeeks: MG.lahir.min,
    maxWeeks: MG.bln1.max,
    doseLabel: 'Polio 0',
    isNationalProgram: true,
    notes:
      'Saat lahir (sebelum pulang RS). Bisa diberikan bersamaan saat BCG (usia 0–1 bulan).',
  },
  {
    vaccineName: 'BCG',
    scheduledAgeWeeks: 0,
    minWeeks: MG.lahir.min,
    maxWeeks: MG.bln1.max,
    doseLabel: 'BCG 1',
    isNationalProgram: true,
    notes:
      'Usia 0–1 bulan. Kejar maksimal sebelum usia 3 bulan. Jika >2 bulan, wajib uji tuberkulin dulu (hasil negatif).',
  },

  // ===================== 2 BULAN =====================
  {
    vaccineName: 'DPT-HB-Hib (Pentavalen/Hexavalen)',
    scheduledAgeWeeks: 8,
    ...atMonth('bln2'),
    doseLabel: 'DPT 1',
    isNationalProgram: true,
    notes:
      'Usia 2 bulan. Kejar segera saat teringat (jeda min. 4 minggu ke DPT 2). Skema DTPa (hexavalen): dosis berikutnya di bulan ke-4 & 6.',
  },
  {
    vaccineName: 'Polio 1 (OPV)',
    scheduledAgeWeeks: 8,
    ...atMonth('bln2'),
    doseLabel: 'Polio 1',
    isNationalProgram: true,
    notes: 'Usia 2 bulan. Kejar segera bersamaan DPT 1.',
  },
  {
    vaccineName: 'PCV',
    scheduledAgeWeeks: 8,
    ...atMonth('bln2'),
    doseLabel: 'PCV 1',
    isNationalProgram: true,
    notes: 'Usia 2 bulan. Bisa dikejar sampai usia 5 tahun.',
  },
  {
    vaccineName: 'Rotavirus (Monovalen atau Pentavalen)',
    scheduledAgeWeeks: 8,
    minWeeks: MG.bln2.min,
    maxWeeks: 14,
    doseLabel: 'Rotavirus 1',
    isNationalProgram: true,
    notes:
      'Usia 2 bulan. Wajib dosis 1 sebelum usia 12–15 minggu (tidak bisa diberikan jika usia >15 minggu).',
  },

  // ===================== 3 BULAN =====================
  {
    vaccineName: 'DPT-HB-Hib (Pentavalen/Hexavalen)',
    scheduledAgeWeeks: 12,
    ...atMonth('bln3'),
    doseLabel: 'DPT 2',
    isNationalProgram: true,
    notes: 'Usia 3 bulan (jeda min. 4 minggu dari DPT 1). Dikejar secepatnya, tidak perlu ulang dari awal.',
  },
  {
    vaccineName: 'Polio 2 (OPV)',
    scheduledAgeWeeks: 12,
    ...atMonth('bln3'),
    doseLabel: 'Polio 2',
    isNationalProgram: true,
    notes: 'Usia 3 bulan. Dikejar secepatnya bersamaan DPT 2.',
  },

  // ===================== 4 BULAN =====================
  {
    vaccineName: 'DPT-HB-Hib (Pentavalen/Hexavalen)',
    scheduledAgeWeeks: 16,
    ...atMonth('bln4'),
    doseLabel: 'DPT 3',
    isNationalProgram: true,
    notes: 'Usia 4 bulan (jeda min. 4 minggu dari DPT 2). Dikejar secepatnya, tidak perlu ulang dari awal.',
  },
  {
    vaccineName: 'Polio 3 (OPV)',
    scheduledAgeWeeks: 16,
    ...atMonth('bln4'),
    doseLabel: 'Polio 3',
    isNationalProgram: true,
    notes: 'Usia 4 bulan. Paling sedikit 1 dosis IPV diberikan bersamaan (lihat IPV 1).',
  },
  {
    vaccineName: 'IPV (Polio suntik)',
    scheduledAgeWeeks: 16,
    ...atMonth('bln4'),
    doseLabel: 'IPV 1',
    isNationalProgram: true,
    notes: 'Usia 4 bulan. Segera berikan jika terlewat (rekomendasi min. 2× IPV sebelum 1 tahun).',
  },
  {
    vaccineName: 'PCV',
    scheduledAgeWeeks: 16,
    minWeeks: 12,
    maxWeeks: MG.bln4.max,
    doseLabel: 'PCV 2',
    isNationalProgram: true,
    notes: 'Usia 4 bulan (jeda min. 4–8 minggu dari PCV 1). Bisa dikejar sampai usia 5 tahun.',
  },
  {
    vaccineName: 'Rotavirus (Monovalen)',
    scheduledAgeWeeks: 16,
    minWeeks: 12,
    maxWeeks: 24,
    doseLabel: 'Rotavirus 2 (Rotarix)',
    isNationalProgram: true,
    notes:
      'Usia 4 bulan (jeda min. 4 minggu dari Rota 1). Rotarix (2 dosis): maksimal sebelum 24 minggu (6 bulan).',
  },
  {
    vaccineName: 'Rotavirus (Pentavalen)',
    scheduledAgeWeeks: 16,
    minWeeks: 12,
    maxWeeks: 32,
    doseLabel: 'Rotavirus 2 (Rotateq)',
    isNationalProgram: true,
    notes:
      'Usia 4 bulan (jeda min. 4 minggu dari Rota 1). Rotateq: dosis 2 dikejar sebelum usia 24 minggu.',
  },

  // ===================== 6 BULAN =====================
  {
    vaccineName: 'Rotavirus (Pentavalen)',
    scheduledAgeWeeks: 26,
    minWeeks: MG.bln5.min,
    maxWeeks: 32,
    doseLabel: 'Rotavirus 3 (Rotateq)',
    isNationalProgram: true,
    notes: 'Usia 6 bulan. Maksimal dosis terakhir di usia 32 minggu (8 bulan).',
  },
  {
    vaccineName: 'DPT-HB-Hib (Pentavalen/Hexavalen)',
    scheduledAgeWeeks: 26,
    ...atMonth('bln6'),
    doseLabel: 'DPT 3 (skema DTPa saja)',
    isNationalProgram: true,
    notes: 'Khusus skema DTPa/hexavalen (jadwal 2, 4, 6 bulan). Tidak perlu jika pakai DTPw (2, 3, 4 bulan).',
  },
  {
    vaccineName: 'Influenza',
    scheduledAgeWeeks: 26,
    ...atMonth('bln6'),
    doseLabel: 'Flu 1',
    isNationalProgram: false,
    notes:
      'Usia 6 bulan (dosis awal). Bisa diberikan kapan saja di atas usia 6 bulan. Di bawah 9 tahun: 2 dosis interval 4 minggu, lalu 1×/tahun.',
  },
  {
    vaccineName: 'Influenza',
    scheduledAgeWeeks: 30,
    ...atMonth('bln7'),
    doseLabel: 'Flu 2',
    isNationalProgram: false,
    notes: 'Usia 7 bulan (jeda 4 minggu dari Flu 1). Diberikan 4 minggu setelah dosis 1, lalu diulang 1×/tahun.',
  },

  // ===================== 9 BULAN =====================
  {
    vaccineName: 'IPV (Polio suntik)',
    scheduledAgeWeeks: 36,
    ...atMonth('bln9'),
    doseLabel: 'IPV 2',
    isNationalProgram: true,
    notes: 'Usia 9 bulan (atau bersamaan DPT 3). Dikejar sebelum anak berusia 1 tahun.',
  },
  {
    vaccineName: 'Campak/MR',
    scheduledAgeWeeks: 36,
    ...atMonth('bln9'),
    doseLabel: 'MR 1',
    isNationalProgram: true,
    notes:
      'Usia 9 bulan. Jika belum di usia 9 bulan, segera berikan MR/MMR di usia berapa pun.',
  },
  {
    vaccineName: 'Japanese Encephalitis',
    scheduledAgeWeeks: 36,
    minWeeks: MG.bln9.min,
    maxWeeks: MG.bln12.max,
    doseLabel: 'JE 1',
    isNationalProgram: false,
    notes: 'Usia 9–12 bulan (endemis). Dikejar kapan saja. Booster 1–2 tahun kemudian.',
  },

  // ===================== 12–15 BULAN =====================
  {
    vaccineName: 'PCV',
    scheduledAgeWeeks: 52,
    minWeeks: MG.bln12.min,
    maxWeeks: MG.bln15.max,
    doseLabel: 'Booster PCV 3',
    isNationalProgram: true,
    notes: 'Usia 12–15 bulan. Dikejar sampai usia 5 tahun.',
  },
  {
    vaccineName: 'Varisela',
    scheduledAgeWeeks: 52,
    minWeeks: MG.bln12.min,
    maxWeeks: MG.bln18.max,
    doseLabel: 'Varisela 1',
    isNationalProgram: false,
    notes:
      'Usia 12–18 bulan. Dikejar sebelum masuk usia sekolah (dosis 2 jeda 6–12 minggu / usia 6 tahun).',
  },
  {
    vaccineName: 'Hepatitis A',
    scheduledAgeWeeks: 52,
    minWeeks: MG.bln12.min,
    maxWeeks: MG.bln24.max,
    doseLabel: 'Hepatitis A 1',
    isNationalProgram: false,
    notes: 'Usia 12–24 bulan. Dosis 2 jeda 6–12 bulan kemudian.',
  },
  {
    vaccineName: 'Hib',
    scheduledAgeWeeks: 65,
    ...atMonth('bln15'),
    doseLabel: 'Booster',
    isNationalProgram: true,
    notes: 'Booster Hib usia 12–15 bulan (jika skema primer memerlukan).',
  },

  // ===================== 18 BULAN =====================
  {
    vaccineName: 'DPT-HB-Hib',
    scheduledAgeWeeks: 78,
    ...atMonth('bln18'),
    doseLabel: 'Booster DPT 1',
    isNationalProgram: true,
    notes: 'Usia 18 bulan. Dikejar secepatnya sebelum anak berusia 5 tahun.',
  },
  {
    vaccineName: 'Polio (OPV/IPV)',
    scheduledAgeWeeks: 78,
    ...atMonth('bln18'),
    doseLabel: 'Booster Polio 3',
    isNationalProgram: true,
    notes: 'Usia 18 bulan. Diberikan bersamaan booster DPT.',
  },
  {
    vaccineName: 'MMR/MR',
    scheduledAgeWeeks: 78,
    ...atMonth('bln18'),
    doseLabel: 'Booster MR 2',
    isNationalProgram: false,
    notes:
      'Usia 18 bulan (atau diganti MMR). Dikejar jika usia 9 bulan sudah lewat 6 bulan.',
  },

  // ===================== 2 TAHUN =====================
  {
    vaccineName: 'Tifoid',
    scheduledAgeWeeks: 104,
    ...atMonth('bln24'),
    doseLabel: 'Dosis 1',
    isNationalProgram: false,
    notes: 'Diulang setiap 3 tahun.',
  },
  {
    vaccineName: 'Varisela',
    scheduledAgeWeeks: 104,
    ...atMonth('bln24'),
    doseLabel: 'Varisela 2',
    isNationalProgram: false,
    notes: 'Dosis 2 varisela (jeda 6–12 minggu dari dosis 1).',
  },

  // ===================== 5–7 TAHUN =====================
  {
    vaccineName: 'DPT',
    scheduledAgeWeeks: 260,
    doseLabel: 'Booster 2',
    isNationalProgram: true,
    notes: 'Usia 5–7 tahun, biasanya lewat program BIAS SD kelas 1.',
  },
  {
    vaccineName: 'Polio',
    scheduledAgeWeeks: 260,
    doseLabel: 'Booster',
    isNationalProgram: true,
  },
  {
    vaccineName: 'MR',
    scheduledAgeWeeks: 260,
    doseLabel: 'Booster',
    isNationalProgram: true,
  },
];

// =====================================================================
// CATATAN CATCH-UP PCV (kalau jadwal awal terlewat) — untuk referensi UI
// =====================================================================
// - Belum vaksin sampai usia 7-12 bulan: beri 2 dosis PCV interval 1 bulan,
//   lalu booster setelah usia 12 bulan (interval 2 bulan dari dosis terakhir).
// - Belum vaksin di usia 1-2 tahun: 2 dosis PCV, interval minimal 2 bulan (tanpa booster tambahan).
// - Belum vaksin di usia 2-5 tahun: PCV10 → 2 dosis interval 2 bulan; PCV13/PCV15 → cukup 1 dosis.
// - Usia >5 tahun dengan risiko tinggi yang belum pernah vaksin PCV: 1 dosis PCV13/PCV15.
//
// Kalau mau, field-field catch-up ini bisa dijadikan tabel terpisah
// (mis. `ImmunizationCatchUpRule`) supaya UI bisa otomatis kasih rekomendasi
// kalau ada dosis yang terlewat dari jadwal utama.
