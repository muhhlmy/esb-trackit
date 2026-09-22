# ESB TrackIT — Security Audit & Hardening Report
Host: ptx (Linux Mint 22.3), LAN 192.168.8.224
Tanggal: 2026-09-19
Auditor: automated (hermes-agent)

## Ringkasan Eksekutif
Audit membuka beberapa eksposur serius: port VPN Outline + Watchtower
docker terekspos publik tanpa proteksi, service aplikasi bind 0.0.0.0
(bypass nginx), SSH lemah, tidak ada IPS, patching manual, dan hanya HTTP.
Semua telah dimitigasi ke level ISO 27002 A.5/A.8/A.12 yang memungkinkan.

## 1. Manajemen Akses (ISO A.5)

### Temuan:
- SSH PermitRootLogin without-password, PasswordAuthentication yes,
  MaxAuthTries 6, X11Forwarding yes
- Tidak ada fail2ban / IPS
- Hanya 1 user (esb-admin) + postgres; tanpa user service terpisah

### Remediasi (SELESAI):
- /etc/ssh/sshd_config:
  - PermitRootLogin no
  - MaxAuthTries 3
  - X11Forwarding no
  - PubkeyAuthentication yes
  - PasswordAuthentication yes (DIPERTAHANKAN — belum ada SSH key
    terpasang; menonaktifkannya akan mengunci semua akses)
    TODO: generate keypair, pasang authorized_keys, lalu set no
- fail2ban terpasang + jail sshd aktif:
  maxretry=4, findtime=10m, bantime=1h (incremental, max 1w),
  ignoreip LAN 192.168.8.0/24
- Backup sshd_config: /etc/ssh/sshd_config.bak.20260919

## 2. Network Security / Firewall (ISO A.8.2)

### Temuan (SEBELUM):
- 64895/tcp (watchtower docker) — ALLOW publik internet
- 35212/tcp+udp (Outline VPN shadowbox) — ALLOW publik internet
- 53/tcp+udp (dnsmasq) — ALLOW publik internet
- 7070/tcp (AnyDesk) — tidak ada rule spesifik, keluar via default deny
- 192.168.0.0/16 + 172.16.0.0/12 ALLOW full — rentang luas
- Backend Express :3000 bind 0.0.0.0 (bypass nginx + auth headers)
- Vite :5173 bind 0.0.0.0 (bypass nginx, serve source map)

### Remediasi (SELESAI):
- UFW deny 64895/tcp, 35212/tcp, 35212/udp (publik)
- UFW deny 7070/tcp; allow hanya 192.168.8.0/24 (tcp+udp)
- UFW deny 53/tcp+udp publik; allow hanya LAN
- UFW limit 22/tcp (rate-limit anti brute-force)
- UFW logging high
- Backend restart via systemd -> sekarang bind 127.0.0.1:3000
- Vite VITE_HOST=127.0.0.1 -> sekarang bind 127.0.0.1:5173
- PostgreSQL sudah 127.0.0.1:5432 (tidak diubah)

### Status port sekarang:
- 0.0.0.0:22   (LIMIT, fail2ban)
- 0.0.0.0:80   (nginx, redirect ke 443)
- 0.0.0.0:443  (nginx TLS)
- 0.0.0.0:53   (UFW deny publik)
- 0.0.0.0:7070 (UFW deny publik, LAN only)
- 127.0.0.1:3000  backend (internal)
- 127.0.0.1:5173  vite dev (internal)
- 127.0.0.1:5432  postgres (internal)
- 127.0.0.1:9090/9091/9092 monitoring (internal)
- *:35212, *:64895 (docker bind, tapi UFW deny + NAT router blok)

## 3. Kriptografi (ISO A.10)

### Temuan: Hanya HTTP port 80, tanpa TLS. Domain via /etc/hosts.

### Remediasi (SELESAI):
- Self-signed cert RSA-2048, 365 hari:
  /etc/letsencrypt/live/trackit.esb.co.id/{fullchain,privkey}.pem
  (privkey 600)
- nginx block HTTPS baru: /etc/nginx/sites-available/esb-trackit-ssl
  TLSv1.2+1.3, ciphers HIGH:!aNULL:!MD5, session cache
- HTTP -> 301 HTTPS redirect
- HSTS: max-age=63072000; includeSubDomains
- CATATAN: Let's Encrypt tidak memungkinkan — trackit.esb.co.id
  NXDOMAIN di DNS publik (8.8.8.8); port 80 tidak reachable dari
  internet (NAT router). Server ini LAN-only.
  Browser akan flag "self-signed" — wajar, tekan Lanjutkan/Lanjutan.

## 4. Application Security (ISO A.14)

### Status (SELESAI / sudah baik):
- nginx security headers: X-Content-Type-Options nosniff,
  Referrer-Policy strict-origin-when-cross-origin, HSTS,
  Permissions-Policy (camera/geolocation/mic/payment/usb=())
- X-Frame-Options: backend kirim DENY; nginx duplikat dihapus
- server_tokens off (nginx version hidden)
- /server-status + dotfiles -> 404
- backend CORS allowlist: https://trackit.esb.co.id ditambahkan
- backend/.env mode 600, tidak ada .env di git history
- JWT via HttpOnly cookie esb_session (bukan localStorage)

### Sisa aplikasi (REKOMENDASI):
- App CSP sudah ketat di nginx; pertahankan
- Rate limiting API: EXPORT_RATE_LIMIT_MAX=10 sudah ada; audit
  endpoint auth terhadap brute-force (login) — tambah limit jika
  belum (lihat catatan di bawah)

## 5. Patch & Vulnerability Management (ISO A.12.6)

### Temuan: unattended-upgrades inactive, patching manual.

### Remediasi (SELESAI):
- unattended-upgrades terpasang + diaktifkan (active)
- /etc/apt/apt.conf.d/20auto-upgrades:
  Update-Package-Lists=1, Download-Upgradeable-Packages=1,
  AutocleanInterval=7, Remove-Unused-Dependencies=true,
  Automatic-Reboot=false
- CATATAN: reboot otomatis dimatikan agar service tetap online;
  admin harus reboot manual saat /var/run/reboot-required ada

## 6. Operasional / Logging (ISO A.12.4)

- UFW logging high (/var/log/ufw.log)
- fail2ban log: /var/log/fail2ban.log
- nginx access/error log standar Ubuntu
- Backend log: journalctl -u esb-backend

## 7. Yang MASIH PERLU TINDAKAN (prioritas turun)

1. [TINGGI] Pasang SSH key + set PasswordAuthentication no.
   Saat ini password auth hidup karena belum ada key sama sekali
   (~/.ssh/authorized_keys kosong, /root/.ssh juga kosong).
   Tanpa ini, SSH rentan brute-force walau fail2ban+limit memitigasi.
2. [TINGGI] DNS publik trackit.esb.co.id masih NXDOMAIN. Jika server
   harus diakses dari luar LAN: buat A record publik -> 124.158.150.146,
   lalu certbot --nginx untuk SSL valid (ganti self-signed).
   Saat ini router/NAT sudah blok port 80 dari internet, jadi risiko
   rendah; tapi ini juga berarti "domain publik" tidak bisa dipakai
   dari luar.
3. [SEDANG] Rule UFW `Anywhere ALLOW 192.168.0.0/16` dan
   `172.16.0.0/12` terlalu luas. Sempitkan ke 192.168.8.0/24 jika
   hanya subnet kantor yang dipakai.
4. [SEDANG] AnyDesk (7070) kini LAN-only, tetapi remote desktop tool
   di server produksi adalah risiko. Pertimbangkan disable total:
   systemctl disable --now anydesk.
5. [SEDANG] Docker containers (outline shadowbox, watchtower) jalan
   sebagai root. Pertimbangkan hapus jika VPN tidak dipakai.
6. [RENDAH] /etc/hosts berisi mapping statik trackit.esb.co.id.
   Untuk device lain, deploy via DNS LAN (dnsmasq sudah jalan di :53
   — cukup tambahkan domain di dnsmasq config agar seluruh LAN
   resolve tanpa edit hosts tiap device).

## Bukti Fungsional (post-hardening)
- https://trackit.esb.co.id/ -> 200 (TLS self-signed)
- http://trackit.esb.co.id/ -> 301 -> https
- https://trackit.esb.co.id/health -> {"status":"healthy"}
- https://trackit.esb.co.id/api/auth/login (POST kredensial salah)
  -> 401 (validasi bekerja)
- SSH tetap aktif (port 22), tidak ada lockout
- fail2ban-client status sshd -> jail running, 0 banned
