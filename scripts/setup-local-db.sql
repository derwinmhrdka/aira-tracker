-- Jalankan di pgAdmin atau psql sebagai user postgres
-- Buat user & database untuk development lokal

CREATE USER baby_tracker WITH PASSWORD 'baby_tracker';
CREATE DATABASE baby_tracker OWNER baby_tracker;
GRANT ALL PRIVILEGES ON DATABASE baby_tracker TO baby_tracker;
