# Edge Load Balancer TLS Certificates

The TLS profile (`load-balancer.conf`) expects two files mounted at
`/etc/nginx/ssl/` inside the load-balancer container:

- `fullchain.pem` — server certificate + intermediates
- `privkey.pem`  — private key

## Staging / internal: self-signed pair (30 seconds)

From the repo root (`C:\trackit\esb-trackit`), PowerShell:

```powershell
$sslDir = "deploy/nginx/ssl"
New-Item -ItemType Directory -Force -Path $sslDir | Out-Null

# 1) Private key
openssl genrsa -out "$sslDir/privkey.pem" 2048

# 2) Self-signed certificate valid 825 days (CN must NOT be set for SAN certs)
openssl req -x509 -new -nodes `
  -key "$sslDir/privkey.pem" `
  -sha256 -days 825 `
  -subj "/C=ID/O=ESB/CN=trackit.esb.co.id" `
  -addext "subjectAltName=DNS:trackit.esb.co.id,DNS:localhost,IP:127.0.0.1" `
  -out "$sslDir/fullchain.pem"
```

(Any Git for Windows / WSL / [OpenSSL for Windows](`https://slproweb.com/products/Win32OpenSSL.html`) build provides `openssl`.)

Or Linux/macOS one-liner:

```bash
mkdir -p deploy/nginx/ssl && openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
  -keyout deploy/nginx/ssl/privkey.pem -out deploy/nginx/ssl/fullchain.pem \
  -subj "/C=ID/O=ESB/CN=trackit.esb.co.id" \
  -addext "subjectAltName=DNS:trackit.esb.co.id,DNS:localhost,IP:127.0.0.1"
```

## Production: Let's Encrypt (certbot, webroot)

```bash
sudo certbot certonly --webroot -w /var/www/certbot \
  -d trackit.esb.co.id --email helpdesk@esb.co.id --agree-tos

# then copy/symlink:
sudo cp /etc/letsencrypt/live/trackit.esb.co.id/fullchain.pem deploy/nginx/ssl/
sudo cp /etc/letsencrypt/live/trackit.esb.co.id/privkey.pem  deploy/nginx/ssl/
```

Automate renewal with `certbot renew --deploy-hook "docker compose -f docker-compose.ha.yml restart load-balancer"`.

## Keep the files out of git

`deploy/nginx/ssl/*` is git-ignored. Never commit private keys.
