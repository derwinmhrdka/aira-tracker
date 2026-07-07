import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { FullExportData } from './export-csv'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function exportHistoryPdf(items: FullExportData['history'], days: number) {
  const doc = new jsPDF()
  const date = new Date().toISOString().split('T')[0]

  doc.setFontSize(16)
  doc.text('Baby Tracker — Riwayat', 14, 18)
  doc.setFontSize(10)
  doc.text(`Periode: ${days} hari terakhir · ${date}`, 14, 26)

  autoTable(doc, {
    startY: 32,
    head: [['Tanggal', 'Jenis', 'Kategori', 'Detail']],
    body: items.map((i) => [
      formatDate(i.timestamp),
      i.type,
      i.category,
      i.details || '-',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [100, 130, 180] },
  })

  doc.save(`baby-tracker-riwayat-${days}hari-${date}.pdf`)
}

export function exportGrowthPdf(logs: FullExportData['growth']) {
  const doc = new jsPDF()
  const date = new Date().toISOString().split('T')[0]

  doc.setFontSize(16)
  doc.text('Baby Tracker — Pertumbuhan', 14, 18)
  doc.setFontSize(10)
  doc.text(`Diekspor: ${date}`, 14, 26)

  autoTable(doc, {
    startY: 32,
    head: [['Tanggal', 'Berat (kg)', 'Panjang (cm)', 'Kuning', 'Catatan']],
    body: logs.map((g) => [
      g.date,
      String(g.weight_kg),
      String(g.height_cm),
      g.is_jaundice ? 'Ya' : 'Tidak',
      g.notes || '-',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [100, 130, 180] },
  })

  doc.save(`baby-tracker-pertumbuhan-${date}.pdf`)
}

export function exportFullPdf(data: FullExportData) {
  const doc = new jsPDF()
  const date = new Date().toISOString().split('T')[0]
  let y = 18

  doc.setFontSize(16)
  doc.text('Baby Tracker — Laporan Lengkap', 14, y)
  y += 10
  doc.setFontSize(10)
  doc.text(`Periode riwayat: ${data.days} hari · ${date}`, 14, y)
  y += 10

  doc.setFontSize(12)
  doc.text('Riwayat Aktivitas', 14, y)
  autoTable(doc, {
    startY: y + 4,
    head: [['Tanggal', 'Jenis', 'Detail']],
    body: data.history.slice(0, 50).map((i) => [
      formatDate(i.timestamp),
      i.type,
      i.details || '-',
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [100, 130, 180] },
  })

  const afterHistory = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40
  void afterHistory

  doc.addPage()
  doc.setFontSize(12)
  doc.text('Pertumbuhan (KMS)', 14, 18)
  autoTable(doc, {
    startY: 24,
    head: [['Tanggal', 'Berat', 'Panjang', 'Catatan']],
    body: data.growth.map((g) => [
      g.date,
      `${g.weight_kg} kg`,
      `${g.height_cm} cm`,
      g.notes || '-',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [100, 130, 180] },
  })

  doc.addPage()
  doc.setFontSize(12)
  doc.text('Imunisasi', 14, 18)
  autoTable(doc, {
    startY: 24,
    head: [['Vaksin', 'Usia (bln)', 'Status', 'Tanggal', 'Catatan']],
    body: data.immunizations.map((v) => [
      v.vaccine_name,
      String(v.scheduled_age_months),
      v.is_done ? 'Selesai' : (v.status ?? 'Belum'),
      v.date_given || '-',
      v.notes || '-',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [100, 130, 180] },
  })

  doc.addPage()
  doc.setFontSize(12)
  doc.text('Milestone', 14, 18)
  autoTable(doc, {
    startY: 24,
    head: [['Tanggal', 'Judul', 'Deskripsi']],
    body: data.milestones.map((m) => [
      m.date,
      m.title,
      m.description || '-',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [100, 130, 180] },
  })

  doc.save(`baby-tracker-laporan-${data.days}hari-${date}.pdf`)
}
