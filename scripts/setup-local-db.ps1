# Setup database lokal tanpa pgAdmin
# Jalankan: .\scripts\setup-local-db.ps1

$ErrorActionPreference = "Stop"

$psqlPaths = @(
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\15\bin\psql.exe",
    "C:\Program Files\PostgreSQL\14\bin\psql.exe"
)

$psql = $psqlPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $psql) {
    Write-Host "psql tidak ditemukan. Pastikan PostgreSQL terinstall." -ForegroundColor Red
    Write-Host "Atau pakai Docker: docker compose up -d" -ForegroundColor Yellow
    exit 1
}

Write-Host "Menggunakan: $psql" -ForegroundColor Cyan
Write-Host ""
Write-Host "Masukkan password user 'postgres' (password saat install PostgreSQL):" -ForegroundColor Yellow
$pgPassword = Read-Host -AsSecureString
$pgPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgPassword)
)

$env:PGPASSWORD = $pgPasswordPlain

$sql = @"
DO `$`$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'baby_tracker') THEN
    CREATE USER baby_tracker WITH PASSWORD 'baby_tracker';
  END IF;
END
`$`$;

SELECT 'CREATE DATABASE baby_tracker OWNER baby_tracker'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'baby_tracker')\gexec

GRANT ALL PRIVILEGES ON DATABASE baby_tracker TO baby_tracker;
"@

Write-Host "Membuat user & database..." -ForegroundColor Cyan
& $psql -U postgres -h localhost -c $sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "Gagal. Cek password postgres kamu." -ForegroundColor Red
    exit 1
}

Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Database siap! Menjalankan prisma db push & seed..." -ForegroundColor Green

Set-Location (Split-Path $PSScriptRoot -Parent)
npm run db:setup

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Selesai! Jalankan: npm run dev" -ForegroundColor Green
    Write-Host "Buka http://localhost:3000 — PIN: 1234" -ForegroundColor Green
} else {
    Write-Host "Prisma gagal. Coba manual: npm run db:setup" -ForegroundColor Red
}
