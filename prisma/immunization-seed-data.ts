// Jadwal imunisasi anak 0–18 tahun — rekomendasi IDAI 2024
// (Satgas Imunisasi IDAI / Pedoman Imunisasi di Indonesia Edisi 7).
//
// Digunakan oleh prisma/seed.ts. Jangan simpan di public/.

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

export const immunizationSeedData: ImmunizationSeed[] = [
  // ===================== BARU LAHIR (0 minggu) =====================
  {
    vaccineName: "Hepatitis B0 (monovalen)",
    scheduledAgeWeeks: 0,
    maxWeeks: 0,
    doseLabel: "Dosis 0",
    isNationalProgram: true,
    notes:
      "Diberikan maks. 24 jam setelah lahir, untuk bayi berat lahir ≥2000g. Jika <2000g dan ibu HBsAg negatif, tunda sampai usia 1 bulan. Jika ibu HBsAg positif, WAJIB diberikan HB0 + HBIg (imunoglobulin) dalam 24 jam pertama di sisi tubuh yang berbeda.",
  },
  {
    vaccineName: "Polio 0 (OPV)",
    scheduledAgeWeeks: 0,
    doseLabel: "Dosis 0",
    isNationalProgram: true,
    notes:
      "Jika lahir di rumah, berikan OPV-0 segera. Jika lahir di fasilitas kesehatan, OPV-0 diberikan saat bayi akan dipulangkan.",
  },
  {
    vaccineName: "BCG",
    scheduledAgeWeeks: 0,
    maxWeeks: 4,
    doseLabel: "Dosis Tunggal",
    isNationalProgram: true,
    notes:
      "Optimal diberikan usia 0-4 minggu (idealnya sebelum usia 2 bulan). Jika diberikan di usia ≥3 bulan, WAJIB didahului uji tuberkulin dulu (hasil harus negatif).",
  },

  // ===================== 2 BULAN (~8-9 minggu) =====================
  {
    vaccineName: "DPT-HB-Hib (Pentavalen/Hexavalen)",
    scheduledAgeWeeks: 8,
    doseLabel: "Dosis 1",
    isNationalProgram: true,
    notes:
      "Jika kombinasi HB dengan DTPw: jadwal di usia 2, 3, 4 bulan. Jika kombinasi HB dengan DTPa (aselular, biasanya di hexavalent swasta): jadwal di usia 2, 4, 6 bulan. Cek dulu jenis vaksin yang dipakai fasyankes/dokter untuk menentukan jadwal dosis 2 & 3.",
  },
  {
    vaccineName: "Polio 1 (OPV)",
    scheduledAgeWeeks: 8,
    doseLabel: "Dosis 1",
    isNationalProgram: true,
  },
  {
    vaccineName: "PCV",
    scheduledAgeWeeks: 8,
    doseLabel: "Dosis 1",
    isNationalProgram: true,
  },
  {
    vaccineName: "Rotavirus (Monovalen atau Pentavalen)",
    scheduledAgeWeeks: 8,
    minWeeks: 6,
    maxWeeks: 14,
    doseLabel: "Dosis 1",
    isNationalProgram: true,
    notes:
      "PENTING: dosis pertama TIDAK BOLEH diberikan pada usia ≥15 minggu, berapa pun jenis vaksinnya (monovalen/pentavalen). Kalau bayi sudah lewat 14 minggu dan belum mulai, seri rotavirus tidak bisa dimulai/dikejar lagi menurut jadwal IDAI.",
  },

  // ===================== 3 BULAN (~12-13 minggu) =====================
  {
    vaccineName: "DPT-HB-Hib (Pentavalen/Hexavalen)",
    scheduledAgeWeeks: 12,
    doseLabel: "Dosis 2",
    isNationalProgram: true,
    notes: "Hanya berlaku untuk skema kombinasi DTPw (jadwal 2,3,4 bulan). Skema DTPa: dosis 2 di bulan ke-4.",
  },
  {
    vaccineName: "Polio 2 (OPV)",
    scheduledAgeWeeks: 12,
    doseLabel: "Dosis 2",
    isNationalProgram: true,
  },
  {
    vaccineName: "Rotavirus (Monovalen)",
    scheduledAgeWeeks: 12,
    minWeeks: 10,
    maxWeeks: 24,
    doseLabel: "Dosis 2 (dosis terakhir monovalen)",
    isNationalProgram: true,
    notes:
      "Untuk vaksin monovalen: hanya 2 dosis total, interval minimal 4 minggu dari dosis 1, dan seluruh seri harus selesai sebelum usia 24 minggu.",
  },
  {
    vaccineName: "Rotavirus (Pentavalen)",
    scheduledAgeWeeks: 12,
    minWeeks: 10,
    maxWeeks: 32,
    doseLabel: "Dosis 2 dari 3",
    isNationalProgram: true,
    notes:
      "Untuk vaksin pentavalen: 3 dosis total, interval 4-10 minggu antar dosis, seluruh seri selesai sebelum usia 32 minggu.",
  },

  // ===================== 4 BULAN (~16-17 minggu) =====================
  {
    vaccineName: "DPT-HB-Hib (Pentavalen/Hexavalen)",
    scheduledAgeWeeks: 16,
    doseLabel: "Dosis 3 (skema DTPw) / Dosis 2 (skema DTPa)",
    isNationalProgram: true,
  },
  {
    vaccineName: "Polio 3 (OPV)",
    scheduledAgeWeeks: 16,
    doseLabel: "Dosis 3",
    isNationalProgram: true,
    notes: "Paling sedikit 1 dosis IPV harus diberikan bersamaan dengan Polio-3 ini (lihat entry IPV di bawah).",
  },
  {
    vaccineName: "IPV (Polio suntik)",
    scheduledAgeWeeks: 16,
    doseLabel: "Dosis 1",
    isNationalProgram: true,
    notes: "Diberikan 2 kali total: usia 4 bulan dan 9 bulan (update jadwal IDAI 2024).",
  },
  {
    vaccineName: "PCV",
    scheduledAgeWeeks: 16,
    doseLabel: "Dosis 2",
    isNationalProgram: true,
  },
  {
    vaccineName: "Rotavirus (Pentavalen)",
    scheduledAgeWeeks: 16,
    minWeeks: 14,
    maxWeeks: 32,
    doseLabel: "Dosis 3 dari 3",
    isNationalProgram: true,
  },

  // ===================== 6 BULAN (~24-26 minggu) =====================
  {
    vaccineName: "DPT-HB-Hib (Pentavalen/Hexavalen)",
    scheduledAgeWeeks: 26,
    doseLabel: "Dosis 3 (khusus skema DTPa: 2, 4, 6 bulan)",
    isNationalProgram: true,
  },
  {
    vaccineName: "PCV",
    scheduledAgeWeeks: 26,
    doseLabel: "Dosis 3",
    isNationalProgram: true,
  },
  {
    vaccineName: "Influenza",
    scheduledAgeWeeks: 26,
    doseLabel: "Dosis 1",
    isNationalProgram: false,
    notes:
      "Pemberian pertama pada usia <9 tahun: 2 dosis dengan interval minimal 4 minggu, lalu diulang 1x setahun seterusnya. Dosis 0.25mL untuk usia 6-36 bulan, 0.5mL untuk usia ≥36 bulan.",
  },

  // ===================== 9 BULAN (~36-39 minggu) =====================
  {
    vaccineName: "Campak/MR",
    scheduledAgeWeeks: 36,
    doseLabel: "Dosis 1",
    isNationalProgram: true,
    notes:
      "Kalau sampai usia 12 bulan belum dapat vaksin ini, bisa langsung diberikan MMR/MR sebagai gantinya.",
  },
  {
    vaccineName: "IPV (Polio suntik)",
    scheduledAgeWeeks: 36,
    doseLabel: "Dosis 2",
    isNationalProgram: true,
  },
  {
    vaccineName: "Japanese Encephalitis",
    scheduledAgeWeeks: 36,
    doseLabel: "Dosis 1",
    isNationalProgram: false,
    notes:
      "Direkomendasikan terutama di daerah endemis atau sebelum bepergian ke daerah endemis. Booster 1-2 tahun kemudian untuk perlindungan jangka panjang.",
  },

  // ===================== 12 BULAN (~52 minggu) =====================
  {
    vaccineName: "Hepatitis A",
    scheduledAgeWeeks: 52,
    doseLabel: "Dosis 1",
    isNationalProgram: false,
    notes: "2 dosis total, interval 6-12 bulan antar dosis.",
  },
  {
    vaccineName: "Varisela",
    scheduledAgeWeeks: 52,
    doseLabel: "Dosis 1",
    isNationalProgram: false,
    notes:
      "Diberikan setelah usia 12 bulan, idealnya sebelum masuk SD. 2 dosis, interval 6 minggu-3 bulan. Kalau diberikan setelah usia 13 tahun, interval minimal jadi 4-6 minggu.",
  },

  // ===================== 15 BULAN (~65 minggu) =====================
  {
    vaccineName: "MMR/MR",
    scheduledAgeWeeks: 65,
    doseLabel: "Dosis 2 (booster campak)",
    isNationalProgram: false,
    notes:
      "Kalau sudah dapat Campak/MR di usia 9 bulan, MMR/MR diberikan di usia 15 bulan (interval minimal 6 bulan dari dosis sebelumnya). Vaksin campak dosis ke-2 di usia 18 bulan TIDAK perlu diberikan lagi kalau sudah dapat MMR ini.",
  },
  {
    vaccineName: "Hib",
    scheduledAgeWeeks: 65,
    doseLabel: "Booster",
    isNationalProgram: true,
  },
  {
    vaccineName: "PCV",
    scheduledAgeWeeks: 65,
    doseLabel: "Booster",
    isNationalProgram: true,
    notes: "Booster diberikan di usia 12-15 bulan, minimal 2 bulan setelah dosis terakhir.",
  },

  // ===================== 18 BULAN (~78 minggu) =====================
  {
    vaccineName: "DPT-HB-Hib",
    scheduledAgeWeeks: 78,
    doseLabel: "Booster 1",
    isNationalProgram: true,
  },
  {
    vaccineName: "Polio (OPV/IPV)",
    scheduledAgeWeeks: 78,
    doseLabel: "Booster",
    isNationalProgram: true,
  },

  // ===================== 2 TAHUN (~104 minggu) =====================
  {
    vaccineName: "Tifoid",
    scheduledAgeWeeks: 104,
    doseLabel: "Dosis 1",
    isNationalProgram: false,
    notes: "Diulang setiap 3 tahun.",
  },
  {
    vaccineName: "Varisela",
    scheduledAgeWeeks: 104,
    doseLabel: "Dosis 2",
    isNationalProgram: false,
  },

  // ===================== 5-7 TAHUN (~260-364 minggu) =====================
  {
    vaccineName: "DPT",
    scheduledAgeWeeks: 260,
    doseLabel: "Booster 2",
    isNationalProgram: true,
    notes: "Diberikan di usia 5-7 tahun, biasanya lewat program BIAS di SD kelas 1.",
  },
  {
    vaccineName: "Polio",
    scheduledAgeWeeks: 260,
    doseLabel: "Booster",
    isNationalProgram: true,
  },
  {
    vaccineName: "MR",
    scheduledAgeWeeks: 260,
    doseLabel: "Booster",
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
