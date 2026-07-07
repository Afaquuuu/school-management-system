# Deployment Guide — Oracle Cloud + PostgreSQL + Cloudflare

This guide matches your finalized stack:

1. **Oracle Cloud Always Free VM** — app, WhatsApp (Baileys), background queue  
2. **PostgreSQL on the same VPS** — shared school data (replaces browser-only localStorage)  
3. **Email (Brevo/SMTP)** — keep your current test settings in Admin → Communication for Phase 1  
4. **WhatsApp (QR/Baileys)** — keep your current test link for Phase 1  
5. **Cloudflare (free)** — DNS + HTTPS  

---

## What was added in the codebase

- **PostgreSQL tenant storage** — schools + per-school key/value data via Prisma (`School`, `TenantStorage`)
- **Database mode** — set `USE_DATABASE=true` and `NEXT_PUBLIC_USE_DATABASE=true`
- **API routes** — `/api/schools`, `/api/tenant-storage`, `/api/health`
- **Deploy scripts** — `deploy/setup-vps.sh`, Nginx config, PM2 config

Local development still works with **localStorage** when database mode is off (default).

---

## Step 1 — Create Oracle Cloud VM

1. Sign in at [Oracle Cloud](https://cloud.oracle.com/) and create an **Always Free** Ampere VM.
2. Choose **Ubuntu 22.04** or **24.04**.
3. Open inbound rules for **22**, **80**, and **443**.
4. SSH in:

```bash
ssh ubuntu@YOUR_VM_PUBLIC_IP
```

---

## Step 2 — Run the VPS setup script

```bash
git clone https://github.com/Afaquuuu/school-management-system.git
cd school-management-system
sudo bash deploy/setup-vps.sh
```

The script installs:

- Node.js 20  
- PostgreSQL  
- Nginx  
- PM2  
- Runs Prisma migrations  
- Builds and starts the app  

App path: `/var/www/school-management-system`

Verify:

```bash
curl http://127.0.0.1:3000/api/health
```

Expected:

```json
{"ok":true,"mode":"postgresql","database":"connected"}
```

---

## Step 3 — Cloudflare DNS + HTTPS

1. Add your domain to **Cloudflare** (free plan).
2. Create an **A record** pointing to your Oracle VM public IP (orange cloud **proxied**).
3. SSL/TLS mode: start with **Flexible** or **Full**.
4. Wait a few minutes, then open `https://yourdomain.com`.

Nginx on the VM proxies port 80 → Next.js on port 3000. Cloudflare terminates HTTPS for visitors.

---

## Step 4 — First school setup (Phase 1 testing)

1. Open `https://yourdomain.com/school-auth`
2. Register your school and admin account
3. Go to **Admin → Settings → Communication**
4. Keep your **current Brevo** and **WhatsApp** test settings:
   - Set **WhatsApp default country code** to `92` (Pakistan)
   - Link WhatsApp via QR
   - Enter Brevo SMTP key in the password field
5. Test **Announcements** and **Alerts** with email + WhatsApp checked

Data is now stored in **PostgreSQL**, so admin, teachers, and parents on different devices see the same records.

---

## Environment variables

Copy `.env.example` to `.env` on the server:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `USE_DATABASE` | Server reads/writes PostgreSQL |
| `NEXT_PUBLIC_USE_DATABASE` | Client syncs storage to PostgreSQL (**must be set before `npm run build`**) |
| `PORT` | App port (3000) |

After changing env vars:

```bash
cd /var/www/school-management-system
npm run build
pm2 restart school-app
```

---

## Useful commands on the VPS

```bash
# App logs
pm2 logs school-app

# Restart app
pm2 restart school-app

# Database migrations after pulling updates
cd /var/www/school-management-system
git pull
npm ci
npm run db:deploy
npm run build
pm2 restart school-app

# PostgreSQL shell
sudo -u postgres psql -d school_management
```

---

## Phase 2 (later — per-school SaaS)

No hosting change needed. Each school already has isolated:

- Communication settings (`schoolId`)
- WhatsApp session folder (`.whatsapp-sessions/{schoolId}/`)
- Queue jobs (`.whatsapp-queue/`)

Later improvements:

- Encrypt SMTP passwords at rest in PostgreSQL  
- Optional subdomain per school via Cloudflare (`schoola.yourdomain.com`)  

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `/api/health` shows `database: error` | Check `DATABASE_URL`, PostgreSQL running: `sudo systemctl status postgresql` |
| Blank page / 500 after deploy | `pm2 logs school-app`, then `rm -rf .next && npm run build` |
| WhatsApp QR fails | Ensure VM is always on; check `.whatsapp-sessions` permissions |
| Email not sending | Verify Brevo SMTP in Communication settings; port 587 outbound open |
| Data not shared | Confirm `NEXT_PUBLIC_USE_DATABASE=true` was set **before** build |

---

## Architecture

```
Users (HTTPS)
    ↓
Cloudflare (DNS + SSL)
    ↓
Oracle VM
├── Nginx :80 → Next.js :3000 (PM2)
├── PostgreSQL (local)
├── Brevo SMTP (per-school settings in DB)
└── WhatsApp Baileys + file queue (per schoolId)
```

---

## Local development (unchanged)

Without `.env` database flags, the app keeps using **localStorage**:

```bash
npm run dev
```

To test PostgreSQL locally:

```bash
cp .env.example .env
# Edit DATABASE_URL for local Postgres
npm run db:deploy
USE_DATABASE=true NEXT_PUBLIC_USE_DATABASE=true npm run dev
```
