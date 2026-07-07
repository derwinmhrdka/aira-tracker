import type {
  HistoryItem,
  GrowthLog,
  Milestone,
  Immunization,
  DevelopmentItem,
} from './api-client'

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

function downloadCsv(filename: string, rows: string[]) {
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportHistoryCsv(items: HistoryItem[], days: number) {
  const rows = [
    ['Tanggal', 'Selesai', 'Jenis', 'Kategori', 'Detail', 'Foto', 'Logged By'].join(','),
    ...items.map((i) =>
      [
        i.timestamp,
        i.timestampEnd || '',
        i.type,
        i.category,
        escapeCsv(i.details || ''),
        i.photo_url || '',
        i.loggedBy || '',
      ].join(',')
    ),
  ]
  const date = new Date().toISOString().split('T')[0]
  downloadCsv(`baby-tracker-riwayat-${days}hari-${date}.csv`, rows)
}

export function exportGrowthCsv(logs: GrowthLog[]) {
  const rows = [
    ['Tanggal', 'Berat (kg)', 'Panjang (cm)', 'Kuning', 'Bilirubin', 'Catatan'].join(','),
    ...logs.map((g) =>
      [
        g.date,
        g.weight_kg,
        g.height_cm,
        g.is_jaundice ? 'Ya' : 'Tidak',
        g.bilirubin_level ?? '',
        escapeCsv(g.notes || ''),
      ].join(',')
    ),
  ]
  const date = new Date().toISOString().split('T')[0]
  downloadCsv(`baby-tracker-pertumbuhan-${date}.csv`, rows)
}

export interface FullExportData {
  history: HistoryItem[]
  growth: GrowthLog[]
  milestones: Milestone[]
  immunizations: Immunization[]
  development: DevelopmentItem[]
  days: number
}

export function exportFullCsv(data: FullExportData) {
  const date = new Date().toISOString().split('T')[0]
  const rows = [
    '=== RIWAYAT ===',
    ['Tanggal', 'Selesai', 'Jenis', 'Kategori', 'Detail', 'Foto', 'Logged By'].join(','),
    ...data.history.map((i) =>
      [
        i.timestamp,
        i.timestampEnd || '',
        i.type,
        i.category,
        escapeCsv(i.details || ''),
        i.photo_url || '',
        i.loggedBy || '',
      ].join(',')
    ),
    '',
    '=== PERTUMBUHAN ===',
    ['Tanggal', 'Berat (kg)', 'Panjang (cm)', 'Kuning', 'Bilirubin', 'Catatan'].join(','),
    ...data.growth.map((g) =>
      [
        g.date,
        g.weight_kg,
        g.height_cm,
        g.is_jaundice ? 'Ya' : 'Tidak',
        g.bilirubin_level ?? '',
        escapeCsv(g.notes || ''),
      ].join(',')
    ),
    '',
    '=== MILESTONE ===',
    ['Tanggal', 'Judul', 'Deskripsi'].join(','),
    ...data.milestones.map((m) =>
      [m.date, escapeCsv(m.title), escapeCsv(m.description || '')].join(',')
    ),
    '',
    '=== IMUNISASI ===',
    ['Vaksin', 'Usia (bln)', 'Status', 'Tanggal', 'Catatan'].join(','),
    ...data.immunizations.map((i) =>
      [
        escapeCsv(i.vaccine_name),
        i.scheduled_age_months,
        i.is_done ? 'Selesai' : i.status || 'Pending',
        i.date_given || '',
        escapeCsv(i.notes || ''),
      ].join(',')
    ),
    '',
    '=== PERKEMBANGAN ===',
    ['Kelompok Usia', 'Pertanyaan', 'Dicentang', 'Tanggal'].join(','),
    ...data.development.map((d) =>
      [
        d.age_group_months,
        escapeCsv(d.question),
        d.is_checked ? 'Ya' : 'Tidak',
        d.date_checked || '',
      ].join(',')
    ),
  ]
  downloadCsv(`baby-tracker-lengkap-${data.days}hari-${date}.csv`, rows)
}

/** @deprecated use exportFullCsv */
export function exportAllCsv(items: HistoryItem[], growth: GrowthLog[], days: number) {
  exportFullCsv({ history: items, growth, milestones: [], immunizations: [], development: [], days })
}
