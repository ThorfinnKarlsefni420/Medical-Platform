# HMS — Developer Handover & Deployment Checklist

**Project:** Busia Health Care Services HMS  
**Developer:** Abdulaziz Komara  
**Date:** May 2026  

> Work through this list top to bottom. Do not hand over credentials until every section is marked done.

---

## Pre-Deployment (Do Before Touching the Server)

### Confirm Payment
- [ ] KES 28,000 received in full (M-Pesa confirmation / bank reference saved)
- [ ] Screenshot of payment saved for your records

### Prepare Environment Variables
Create the production `.env` file for `hms-backend/`. Replace every placeholder below:

```env
PORT=3000
NODE_ENV=production

# Database
DB_HOST=<your_db_host>
DB_PORT=5432
DB_NAME=hms_db
DB_USER=hms_user
DB_PASSWORD=<strong_random_password>

# Auth — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=<256_bit_random_hex>

# CORS — set to your actual frontend domain
FRONTEND_URL=https://hms.busiahealthcare.co.ke
```

- [ ] `.env` file prepared locally (never commit to git)
- [ ] `JWT_SECRET` is a fresh 256-bit random value (not the dev placeholder)
- [ ] `DB_PASSWORD` is a strong unique password

---

## Server Setup

### Option A — VPS (Recommended: DigitalOcean, Linode, Hetzner)

**Minimum spec:** 1 vCPU, 1 GB RAM, 25 GB SSD, Ubuntu 22.04

```bash
# 1. Update and install essentials
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx postgresql nodejs npm certbot python3-certbot-nginx

# 2. Install Node 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install PM2 globally
sudo npm install -g pm2
```

- [ ] VPS provisioned with Ubuntu 22.04
- [ ] Node 18+ installed (`node --version`)
- [ ] PM2 installed (`pm2 --version`)
- [ ] PostgreSQL installed and running

### Option B — Render / Railway / Fly.io (easier, no manual server)
These platforms handle Node.js + PostgreSQL with zero server management. Suitable if the client doesn't have a sysadmin.
- Render.com: create a Web Service (backend) + PostgreSQL database
- Connect env vars in the Render dashboard
- Skip the Nginx and PM2 steps below

---

## Database Setup

```bash
# Connect to PostgreSQL
sudo -u postgres psql

-- Create database and user
CREATE DATABASE hms_db;
CREATE USER hms_user WITH PASSWORD '<strong_password>';
GRANT ALL PRIVILEGES ON DATABASE hms_db TO hms_user;
\q
```

Run all migrations in order:

```bash
cd hms-backend
psql -U hms_user -d hms_db -f database/migration_receptionist_role.sql
psql -U hms_user -d hms_db -f database/migration_drug_inventory.sql
psql -U hms_user -d hms_db -f database/migration_phase3_inpatient_orders.sql
# Run any other migration files in the database/ folder in date order
```

- [ ] Database created
- [ ] All migrations run without errors
- [ ] Verified with: `psql -U hms_user -d hms_db -c "\dt"` (should list all tables)

---

## Backend Deployment

```bash
# Clone the repo onto the server (or SCP the files)
git clone <your_repo_url> /home/ubuntu/hms
cd /home/ubuntu/hms/hms-backend

# Copy in your production .env
cp /path/to/your/.env .env

# Install dependencies
npm install --production

# Start with PM2
pm2 start server.js --name hms-backend
pm2 save
pm2 startup   # follow the printed command to enable auto-restart on reboot
```

- [ ] Backend running: `pm2 status` shows `online`
- [ ] Health check: `curl http://localhost:3000/api/health` (or any public route) returns 200
- [ ] PM2 set to start on boot

---

## Frontend Build & Deployment

```bash
cd /home/ubuntu/hms/frontend

# Set the production API URL
echo "VITE_API_URL=https://api.busiahealthcare.co.ke" > .env.production
# or if frontend and backend share the same domain via Nginx:
echo "VITE_API_URL=/api" > .env.production

# Build
npm install
npm run build
# Output goes to frontend/dist/
```

- [ ] Build completes without errors
- [ ] `dist/` folder created and contains `index.html`

---

## Nginx Configuration

Create `/etc/nginx/sites-available/hms`:

```nginx
server {
    listen 80;
    server_name hms.busiahealthcare.co.ke;

    # Serve React frontend
    root /home/ubuntu/hms/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node backend
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/hms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

- [ ] Nginx config created and enabled
- [ ] `nginx -t` passes
- [ ] Frontend loads in browser over HTTP

---

## SSL Certificate (HTTPS)

```bash
sudo certbot --nginx -d hms.busiahealthcare.co.ke
# Follow prompts — certbot will auto-edit the Nginx config for HTTPS
```

- [ ] SSL certificate issued
- [ ] Site loads on `https://`
- [ ] HTTP redirects to HTTPS automatically
- [ ] Certificate auto-renewal set up (certbot installs a cron by default)

---

## Post-Deploy Security Hardening

- [ ] Set `CORS` in `hms-backend/server.js` to the specific frontend domain (remove wildcard `*`)
- [ ] Confirm `NODE_ENV=production` in `.env`
- [ ] Confirm `.env` is not in git (check `.gitignore`)
- [ ] Verify `JWT_SECRET` is not the dev placeholder

Optional but strongly recommended before going live:
- [ ] Add rate limiting to auth endpoints (`npm install express-rate-limit` — see NEXT_STEPS.md)
- [ ] Add `helmet` HTTP security headers (`npm install helmet`)
- [ ] Move JWT from `localStorage` to `httpOnly` cookie (prevents XSS token theft)

---

## Smoke Test (Do on the Live Site)

Run through this checklist on the live URL before calling the client:

- [ ] Patient can self-register and log in
- [ ] Admin can log in with seeded credentials
- [ ] Admin can create a staff member and copy the invite URL
- [ ] Staff member can accept invite and set password
- [ ] Receptionist can register a patient and book an appointment
- [ ] Doctor can open the appointment and create a medical record
- [ ] Doctor can create a lab order from the medical record
- [ ] Lab technician can advance order status and enter a result
- [ ] Doctor can mark the result as reviewed
- [ ] Doctor can issue a prescription
- [ ] Pharmacist can view the prescription queue and record a dispense
- [ ] Drug inventory stock decrements on dispense
- [ ] Admin can admit a patient, add monitoring notes, and discharge
- [ ] Patient can log in and see their own records, appointments

---

## Seed the Admin Account

Before handover, create the client's first admin account directly in the database:

```sql
-- Password hash is generated with bcrypt (bcrypt.hashSync('ChosenPassword', 10))
-- Use a Node script or online bcrypt generator to get the hash

INSERT INTO users (first_name, last_name, email, password_hash, role, is_active)
VALUES ('Admin', 'Busia', 'admin@busiahealthcare.co.ke', '<bcrypt_hash>', 'admin', TRUE);
```

- [ ] Admin account created in production database
- [ ] Tested login with admin credentials
- [ ] Credentials written down and ready to hand over to client **in person** (not over unencrypted message)

---

## Client Handover Package

Prepare the following and deliver on handover day:

### Documents to Send
- [ ] `CLIENT_DELIVERY_LETTER.md` — already in this repo (convert to PDF for client)
- [ ] `Platform overview.txt` — full platform guide (already written)
- [ ] Admin credentials (first login email + password) — deliver in person or via encrypted message

### What to Cover in the Handover Session (1 hour)
1. Show admin how to log in
2. Demonstrate creating a staff member and sharing the invite URL
3. Walk through registering a test patient and booking an appointment
4. Show the doctor workflow (medical record, lab order, prescription)
5. Show pharmacist and lab technician dashboards
6. Show inpatient admission and discharge
7. Explain how to deactivate a staff account instantly if needed
8. Share your contact details for the 30-day support window

- [ ] Handover session completed
- [ ] Client has their admin credentials
- [ ] Client has the Platform Overview document
- [ ] Handover date recorded: _______________

---

## 30-Day Support Window

- Start date: _______________
- End date (30 days later): _______________
- Log any reported issues here and date of resolution:

| Date Reported | Issue | Date Resolved |
|---------------|-------|---------------|
| | | |

---

## Source Code Transfer (After Handover)

Once the client is happy and onboarded:

- [ ] Push final code to a private GitHub / GitLab repo under the client's account (or zip and transfer)
- [ ] Remove your own access to the production server if you were using a shared login
- [ ] Confirm client has their own server / hosting credentials and you no longer have access

---

## Future Work to Quote Separately

When the client comes back for more, reference these items from `NEXT_STEPS.md`:

| Item | Complexity | Notes |
|------|-----------|-------|
| Email dispatch for staff invites | Low | Hook into existing staffController TODO |
| MFA / two-factor authentication | Medium | Backend design already written in NEXT_STEPS.md |
| Patient SMS / email notifications | Medium | Africa's Talking integration |
| Reporting & analytics dashboard | Medium | No new schema needed, just new API endpoints + Recharts |
| Billing & M-Pesa integration | High | Largest remaining feature, separate discovery session needed |
| Medical document uploads | Medium | Cloudinary or S3 |

---

*This checklist is for the developer's use only. Do not share with the client.*
