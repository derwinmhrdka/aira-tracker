# Menjalankan di Lokal (Windows) — Tanpa pgAdmin

## Cara termudah: script otomatis

Buka PowerShell di folder project, lalu jalankan:

```powershell
cd D:\derwin.mahardika-iu\Documents\Apps\aira-tracker
.\scripts\setup-local-db.ps1
```

Script akan:
1. Minta password user `postgres` (yang kamu set saat install PostgreSQL)
2. Buat user & database `baby_tracker`
3. Jalankan `prisma db push` + seed data

Lalu jalankan app:

```powershell
npm run dev
```

Buka **http://localhost:3000** → login PIN **`1234`**

---

## Alternatif: manual via psql (command line)

```powershell
# Ganti YOUR_POSTGRES_PASSWORD dengan password postgres kamu
$env:PGPASSWORD = "YOUR_POSTGRES_PASSWORD"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost -f scripts\setup-local-db.sql
Remove-Item Env:PGPASSWORD

npm run db:setup
npm run dev
```

---

## Alternatif: Docker (tanpa install apa pun)

1. Buka **Docker Desktop** (pastikan running)
2. Jalankan:

```powershell
docker compose up -d
npm run db:setup
npm run dev
```

`.env` sudah dikonfigurasi untuk kredensial Docker.

---

## Perintah berguna

| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Dev server |
| `npm run db:setup` | Push schema + seed |
| `npm run db:studio` | GUI lihat/edit data (alternatif pgAdmin) |

---

## Troubleshooting

**Lupa password postgres?**
- Edit `pg_hba.conf` (biasanya di `C:\Program Files\PostgreSQL\16\data\`)
- Ubah method `scram-sha-256` → `trust` untuk baris localhost
- Restart service PostgreSQL, lalu reset password:
  ```sql
  ALTER USER postgres PASSWORD 'passwordbaru';
  ```

**`Prisma Studio` sebagai pengganti pgAdmin:**
```powershell
npm run db:studio
```
Buka http://localhost:5555 — bisa lihat & edit semua tabel.
