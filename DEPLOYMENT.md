# Baby Tracker — Deployment ke VPS

Production URL: **https://aira.teknodika.com**

## Cara deploy (Docker — disarankan)

Sama pola dengan `airafin-dashboard`: Docker Compose di VPS + nginx di host + GitHub Actions auto-deploy.

### Prasyarat VPS

- Docker + Docker Compose plugin
- Nginx + Certbot
- DNS `aira.teknodika.com` → IP VPS
- Git repo ter-clone di `/apps/aira-tracker` (atau path lain)

### Setup pertama kali

```bash
# Di VPS
export REPO_URL=https://github.com/derwinmhrdka/aira-tracker.git
export APP_DIR=/apps/aira-tracker
bash deploy/setup-vps.sh

nano .env   # isi POSTGRES_PASSWORD, SESSION_SECRET, PIN, VAPID, CRON_SECRET

sudo cp deploy/aira.conf /etc/nginx/sites-available/aira.conf
sudo ln -sf /etc/nginx/sites-available/aira.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d aira.teknodika.com

bash deploy/docker-deploy.sh
```

### Auto-deploy (GitHub Actions)

Tambahkan repository secrets:

| Secret | Contoh |
|--------|--------|
| `VPS_HOST` | IP atau hostname VPS |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | private key SSH |
| `VPS_APP_DIR` | `/apps/aira-tracker` |
| `VPS_PORT` | `22` (opsional) |

Push ke branch `main` → workflow `.github/workflows/deploy.yml` menjalankan `git-sync.sh` + `docker-deploy.sh`.

### File deploy

| File | Fungsi |
|------|--------|
| `deploy/git-sync.sh` | `git pull` hard reset ke `origin/main` |
| `deploy/docker-deploy.sh` | build, migrate, seed, health check |
| `deploy/aira.conf` | nginx production (SSL) |
| `deploy/nginx-aira.conf.example` | template sebelum certbot |
| `deploy/setup-vps.sh` | bootstrap pertama kali |

### Port internal

- App Docker: `127.0.0.1:13082` → container `:3000`
- DB: hanya internal Docker network (tidak expose 5432)

### Yang tidak boleh masuk git / VPS sync

Lihat `.gitignore`: `.env`, `uploads/*`, `node_modules`, `.next`, logs, secrets.

Foto user disimpan di volume Docker `uploads_data` — persisten antar deploy.

---

## Alternatif: PM2 (tanpa Docker)

Panduan lama untuk standalone Node.js + PostgreSQL host:


## Prasyarat di VPS

- Ubuntu/Debian (atau distro Linux lain)
- Node.js 20+ (`nvm install 20`)
- PostgreSQL sudah berjalan
- Nginx + Certbot (Let's Encrypt)
- PM2 (`npm install -g pm2`)

## 1. Setup Database

```bash
sudo -u postgres psql

CREATE USER baby_tracker WITH PASSWORD 'your_secure_password';
CREATE DATABASE baby_tracker OWNER baby_tracker;
\q
```

## 2. Clone & Install

```bash
cd /apps
git clone https://github.com/derwinmhrdka/aira-tracker.git aira-tracker
cd aira-tracker
npm install
```

### Local dev (PostgreSQL via Docker)

```bash
docker compose -f docker-compose.dev.yml up -d
```

## 3. Environment

```bash
cp .env.example .env
nano .env
```

Isi variabel:
- `DATABASE_URL` — koneksi PostgreSQL lokal
- `SESSION_SECRET` — string acak minimal 32 karakter
- `INITIAL_PIN` — PIN login awal (4-6 digit)
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — untuk push notification (lihat §11)
- `VAPID_SUBJECT` — email kontak, mis. `mailto:admin@domain.com`
- `CRON_SECRET` — string acak untuk endpoint cron push (interval pengingat diatur lewat app → Pengaturan)

## 4. Prisma Migrate & Seed

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

Seed akan membuat:
- 1 user dengan PIN dari `INITIAL_PIN`
- Profil bayi default
- Daftar imunisasi & checklist perkembangan

## 5. Build & Jalankan dengan PM2

```bash
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # ikuti instruksi untuk auto-start saat reboot
```

## 6. Nginx Reverse Proxy + SSL

Salin dan sesuaikan `nginx.conf.example`:

```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/baby-tracker
sudo ln -s /etc/nginx/sites-available/baby-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d tracker.example.com
```

## 7. Keamanan Tambahan (Disarankan)

Karena ini app pribadi dengan data sensitif:

### Opsi A: Basic Auth di Nginx
Tambahkan di dalam `location /` block:

```nginx
auth_basic "Private";
auth_basic_user_file /etc/nginx/.htpasswd;
```

Buat file password:
```bash
sudo apt install apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd your_username
```

### Opsi B: Tailscale/VPN
Batasi akses hanya dari jaringan Tailscale — bind Nginx ke IP Tailscale atau gunakan ACL.

### Opsi C: Firewall
```bash
sudo ufw allow from <your-ip> to any port 443
```

## 8. Upload Foto

Foto disimpan di folder `uploads/` di root project.
Di-serve via endpoint `/api/files/[filename]` (dilindungi auth).

Alternatif Nginx static (jika pakai basic auth di level Nginx):

```nginx
location /uploads/ {
    alias /var/www/baby-tracker/uploads/;
    internal;  # hanya bisa diakses via X-Accel-Redirect
}
```

## 9. Update Aplikasi

```bash
cd /var/www/baby-tracker
git pull
npm install
npx prisma db push
npm run build
pm2 restart baby-tracker
```

## 10. PWA di iPhone

1. Buka `https://tracker.example.com` di Safari
2. Tap Share → "Add to Home Screen"
3. App akan terbuka fullscreen (`display: standalone`)

## 11. Push Notification (VAPID + Cron)

Push notification membutuhkan HTTPS di production.

### Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

Tambahkan ke `.env`:

```env
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:admin@yourdomain.com"
CRON_SECRET="random-secret-min-32-chars"
```

Restart app setelah mengubah `.env`:

```bash
pm2 restart baby-tracker
```

### Setup cron (pengingat saat app tertutup)

Cron memanggil `/api/push/cron` setiap 15 menit. Prioritas:
1. Vaksin terlambat
2. Pengingat menyusui

```bash
# Edit crontab
crontab -e
```

Tambahkan baris (ganti domain dan secret):

```cron
*/15 * * * * curl -sf -H "x-cron-secret: YOUR_CRON_SECRET" https://tracker.example.com/api/push/cron >> /var/log/baby-tracker-cron.log 2>&1
```

Atau gunakan script bantu:

```bash
chmod +x scripts/setup-cron.sh
CRON_SECRET="your-secret" APP_URL="https://tracker.example.com" ./scripts/setup-cron.sh
```

### Aktifkan push di app

1. Login ke app
2. Buka **Lainnya → Pengaturan**
3. Aktifkan **Pengingat Menyusui** dan izinkan notifikasi browser
4. Install PWA ke Home Screen (agar push lebih andal di mobile)

### Test cron manual

```bash
curl -H "x-cron-secret: YOUR_CRON_SECRET" https://tracker.example.com/api/push/cron
# Response: {"sent":false,"reason":"not_due"} atau {"sent":true,"count":1,"type":"feeding"}
```

## 12. Backup & Restore

Di app: **Pengaturan → Backup JSON** mengunduh semua data.
**Restore dari JSON** mengganti data log (PIN user tidak berubah).

Disarankan backup JSON berkala sebelum update major.

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| 401 Unauthorized | Cek `SESSION_SECRET` sama setelah restart |
| DB connection error | Pastikan PostgreSQL running & `DATABASE_URL` benar |
| Upload gagal | `chmod 755 uploads/` dan pastikan folder ada |
| PM2 crash loop | `pm2 logs baby-tracker` untuk detail error |
| Push tidak jalan | Cek `VAPID_*` di `.env`, HTTPS aktif, user sudah subscribe di Pengaturan |
| Cron tidak kirim push | Test manual dengan `curl` + `x-cron-secret`; cek `CRON_SECRET` sama |
