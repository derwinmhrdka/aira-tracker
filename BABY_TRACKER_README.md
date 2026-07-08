# 👶 Aira Tracker

Baby tracker PWA lengkap — Next.js 16, PostgreSQL, Prisma, iron-session.

**Production:** https://aira.teknodika.com

## Fitur utama

- **Dashboard** — quick-log popok, susu, tidur, pumping, catatan (teks/foto/suara)
- **Riwayat** — filter, pagination, edit/hapus, grouping per hari
- **Statistik** — tren aktivitas & grafik pertumbuhan (KMS/WHO)
- **Pertumbuhan** — berat, panjang, lingkar kepala, jaundice
- **Imunisasi** — jadwal IDAI + vaksin custom
- **Milestone, catatan, development checklist**
- **Offline queue** — log & catatan tersimpan lokal, sync otomatis
- **Multi-device sync** — polling 12 detik + event sync
- **Push notification** — pengingat menyusui (interval tersimpan di server)
- **Export** CSV/PDF, backup/restore JSON v2
- **PWA** — installable, service worker, tema gelap/terang

## Setup lokal

```bash
npm install
cp .env.example .env   # sesuaikan DATABASE_URL
npx prisma db push
npm run db:seed
npm run dev
```

PIN default dari seed: `1234` — **ganti segera di production**.

## Deploy

Lihat [DEPLOYMENT.md](./DEPLOYMENT.md). Setelah deploy schema baru:

```bash
npx prisma db push
```

## Catatan backup

- Backup JSON **tidak** menyertakan file di folder `uploads/` — backup foto/audio terpisah (volume Docker `uploads_data`).
- Backup v2 menyertakan `feed_type`, `audio_url`, `head_circumference_cm`, vaksin custom.

## CI

- `.github/workflows/ci.yml` — build check on push/PR
- `.github/workflows/deploy.yml` — auto-deploy ke VPS on `main`
