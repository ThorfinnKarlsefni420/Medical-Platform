# HMS — Next Steps: External Integrations & Final Hookups

**Status:** Core application complete (Phases 1–4). All clinical workflows are functional end-to-end.
This document lists every external service, API, and enhancement that must be hooked up to make the system production-ready.

---

## 1. Email Provider — Staff Invites & Notifications

**Why it's needed:** Staff invite URLs are currently returned in the API response and shown to the admin for manual sharing. The invite system is fully built — it just needs email dispatch wired in.

**Where to hook it in:** `hms-backend/controllers/staffController.js`

Look for the `TODO` comments in `sendInvite` and `resendInvite`:
```js
// TODO: send invite email once an email provider is configured
// invite_url is available here — pass it to your email client
```

**Recommended providers:**
- [Resend](https://resend.com) — simple REST API, generous free tier, good for transactional email
- [SendGrid](https://sendgrid.com) — industry standard, more feature-rich
- [Nodemailer](https://nodemailer.com) + SMTP — self-hosted option if you have an SMTP server

**Implementation steps:**
1. Add provider SDK to `package.json` (e.g. `npm install resend`)
2. Add `EMAIL_FROM`, `EMAIL_API_KEY` to `.env`
3. Create `hms-backend/utils/mailer.js` with a `sendEmail(to, subject, html)` helper
4. Call `sendEmail()` in `sendInvite` and `resendInvite` after the invite record is created
5. Build an HTML invite email template with the invite URL and expiry time

**Other emails to send once provider is wired:**
- Appointment confirmation to patient (on `createAppointment`)
- Appointment reminder 24 h before (requires a cron job — see Section 5)
- Lab result ready notification to patient (on result status → `Results Reviewed`)
- Low-stock drug alert to admin/pharmacist (on dispense when stock falls below threshold)

---

## 2. SMS / Push Notifications — Africa's Talking

**Why it's needed:** Many patients in Busia may not have reliable email but do have mobile phones. SMS is more reliable for appointment reminders and lab result alerts.

**Recommended provider:**
- [Africa's Talking](https://africastalking.com) — Kenya/East Africa-focused, supports SMS, USSD, voice. Has a sandbox for testing.

**Where to hook it in:**
- `hms-backend/controllers/appointmentController.js` — `createAppointment` and `updateAppointment` (cancellation)
- `hms-backend/controllers/labResultController.js` — `updateLabResult` when status changes to `Results Reviewed`

**Implementation steps:**
1. `npm install africastalking`
2. Add `AT_API_KEY`, `AT_USERNAME`, `AT_SENDER_ID` to `.env`
3. Create `hms-backend/utils/sms.js` with a `sendSMS(phone, message)` helper
4. Wire `sendSMS()` into the relevant controller actions
5. Ensure patient phone numbers are stored — add `phone_number` column to `patients` table if not already present

---

## 3. Scheduled Jobs — Appointment Reminders & Cron Tasks

**Why it's needed:** Reminder emails/SMS need to fire 24 h before each appointment. This can't be done inside a request handler — it needs a background job.

**Recommended approach:**
- [node-cron](https://www.npmjs.com/package/node-cron) for in-process scheduling (simple, no extra infrastructure)
- [BullMQ](https://bullmq.io/) + Redis for robust job queues with retries (better for production)

**Implementation steps:**
1. Create `hms-backend/jobs/appointmentReminders.js`
2. Query appointments scheduled for the next 24–25 h window
3. Send email/SMS for each that hasn't already received a reminder (add `reminder_sent BOOLEAN DEFAULT FALSE` to `appointments`)
4. Schedule the job to run every hour via `node-cron`
5. Start the job scheduler in `server.js` on startup

---

## 4. MFA — Multi-Factor Authentication (deferred from Phase 4)

**Why it's needed:** Staff accounts (especially admin and doctors) should be protected with a second factor.

**Recommended approach:** TOTP (Time-based One-Time Password) via an authenticator app (Google Authenticator, Authy).

**Implementation steps:**

**Backend:**
1. `npm install speakeasy qrcode`
2. Add `mfa_secret VARCHAR(255)`, `mfa_enabled BOOLEAN DEFAULT FALSE` to `users` table (migration)
3. New endpoints in `staffRoutes.js`:
   - `POST /api/staff/mfa/setup` — generates TOTP secret, returns QR code data URL
   - `POST /api/staff/mfa/verify` — verifies the 6-digit code and enables MFA
   - `POST /api/staff/mfa/disable` — disables MFA (requires current OTP)
4. Update `authController.js` login flow: if `mfa_enabled = TRUE`, return a partial session token and require OTP before issuing the full JWT

**Frontend:**
1. New MFA Setup page under Settings/Profile for staff
2. Login flow: after password validation, if MFA is enabled, show a "Enter your 6-digit code" step before redirecting to dashboard

---

## 5. Reporting & Analytics — Phase 5

**Why it's needed:** Management needs visibility into platform activity — daily patient counts, appointment volumes, bed occupancy trends, lab turnaround times, prescription volumes.

**Implementation approach:**

**Backend — Add reporting endpoints:**
```
GET /api/reports/summary        → daily counts: patients, appointments, admissions, beds occupied
GET /api/reports/lab-turnaround → average time from Ordered to Completed per test type
GET /api/reports/prescriptions  → volume by medication, dispensed vs. created ratio
GET /api/reports/admissions     → average length of stay per ward type
```

All queries run against existing tables — no new schema needed.

**Frontend — Dashboard enhancements:**
- Replace the current placeholder dashboard with real summary cards
- Add a `/reports` page (admin only) with date-range filters and exportable tables
- Recommended charting library: [Recharts](https://recharts.org) — React-native, lightweight

---

## 6. File Storage — Medical Document Uploads

**Why it's needed:** Doctors may want to attach scanned documents, X-rays, or referral letters to a medical record or admission.

**Recommended provider:**
- [Cloudinary](https://cloudinary.com) — handles images and PDFs, good free tier
- [AWS S3](https://aws.amazon.com/s3/) + [multer-s3](https://www.npmjs.com/package/multer-s3) — industry standard

**Where to hook it in:**
- `hms-backend/routes/medicalRecordRoutes.js` — add `POST /:id/attachments`
- Store file URL + metadata in a new `record_attachments` table
- Frontend: file upload button on the Medical Records detail view

---

## 7. Patient Portal Enhancements

**Currently available to patients:** appointments, medical records (read-only), lab results.

**Remaining patient-facing features to build:**
- **Online appointment booking** — patients self-schedule (select doctor, available slot)
- **Prescription refill requests** — patient requests a refill, pharmacist or doctor reviews
- **Bill / invoice view** — requires a billing module (see Section 8)
- **Push notifications** — browser push or mobile PWA notifications for appointment reminders

---

## 8. Billing & Payments

**Not yet designed.** This is the largest remaining feature gap.

**Scope:**
- Generate an invoice per patient visit (appointment + lab tests + prescriptions + admission days)
- Support payment recording (cash, M-Pesa, insurance)
- Link invoices to discharges for inpatient billing

**M-Pesa integration (STK Push):**
- [Daraja API](https://developer.safaricom.co.ke/) — Safaricom's official developer API
- Add `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY` to `.env`
- Implement STK Push for outpatient payments and deposit collection for admissions

---

## 9. Production Deployment Checklist

Before going live, ensure the following:

**Security:**
- [ ] Replace JWT `SECRET_KEY` in `.env` with a cryptographically random 256-bit value
- [ ] Enable HTTPS (TLS certificate via Let's Encrypt / Nginx)
- [ ] Set `CORS` origin in `server.js` to the specific frontend domain (remove wildcard)
- [ ] Add rate limiting to auth endpoints (`npm install express-rate-limit`)
- [ ] Add `helmet` middleware for HTTP security headers (`npm install helmet`)
- [ ] Audit all `authorize()` calls — confirm no privileged endpoints are accidentally public
- [ ] Enable PostgreSQL SSL connections in `config/db.js`

**Database:**
- [ ] Run all migrations in order on the production database
- [ ] Set up automated daily backups (pg_dump to S3 or local storage)
- [ ] Create read-only reporting user for analytics queries

**Infrastructure:**
- [ ] Use a process manager (PM2) to keep the Node server running: `pm2 start server.js`
- [ ] Set up Nginx as a reverse proxy in front of the Node server
- [ ] Move `hms_token` from `localStorage` to `httpOnly` cookies to prevent XSS token theft
- [ ] Add `NODE_ENV=production` to `.env` and ensure no dev-only debug output reaches logs

**Monitoring:**
- [ ] Set up uptime monitoring (e.g. UptimeRobot — free tier covers the basics)
- [ ] Add structured logging (`npm install winston` or `pino`)
- [ ] Configure error alerting to Slack or email on unhandled server errors

---

## 10. Environment Variables Reference

All secrets and config belong in `hms-backend/.env`. Full reference of what needs to be added:

```env
# Existing
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hms_db
DB_USER=hms_user
DB_PASSWORD=hms_3024
JWT_SECRET=<replace-with-256-bit-random>

# Email (add when provider is chosen)
EMAIL_PROVIDER=resend          # or sendgrid, smtp
EMAIL_API_KEY=<key>
EMAIL_FROM=noreply@busiahealthcare.co.ke

# SMS — Africa's Talking
AT_USERNAME=<username>
AT_API_KEY=<key>
AT_SENDER_ID=BusiaHMS

# MFA (when implemented)
MFA_ISSUER=BusiaHealthCare

# File storage (when implemented)
CLOUDINARY_CLOUD_NAME=<name>
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>

# M-Pesa (when billing is implemented)
MPESA_CONSUMER_KEY=<key>
MPESA_CONSUMER_SECRET=<secret>
MPESA_SHORTCODE=<shortcode>
MPESA_PASSKEY=<passkey>
MPESA_CALLBACK_URL=https://yourdomain.com/api/payments/mpesa/callback
```

---

*This document should be updated as integrations are completed. Each section maps to a discrete sprint of work and can be handed off independently.*
