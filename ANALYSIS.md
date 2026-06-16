# Codebase Analysis — Readiness & Scalability
*Busia Health Care Services HMS — May 2026*

---

## What Is Already Solid

- Parameterized queries everywhere — no SQL injection risk
- All FK columns are indexed in the schema
- `updated_at` auto-triggers on `patients` and `medical_records`
- Connection pooling configured (pg Pool, max 10)
- Atomic transactions on dispensing (stock deduction) and patient registration
- File upload size capped at 5 MB
- Role-based access control on every route
- Bed vacancy tracked on admission/discharge/delete

---

## Critical Issues — Fix Before Scale

### 1. Patient Ownership Not Enforced at the Controller Level
**Severity: HIGH — Active data breach risk**

`permissions.js` declares `read:own` for patients on medical records, appointments, lab results, and prescriptions. But none of the controllers actually check ownership. A logged-in patient can call `GET /api/medical-records/5` and read any other patient's record by guessing the ID.

**Fix:** Add an ownership check in each controller for patient role:
```js
// medicalRecordController.js — getMedicalRecordById
if (req.user.role === 'patient') {
  // verify the record belongs to this patient via appointment → patient_id
  if (record.patient_id !== req.user.patientId) return res.status(403).json(...)
}
```
Affects: `medicalRecordController`, `appointmentController`, `labResultController`, `prescriptionController`.

---

### 2. Bed Assignment Race Condition
**Severity: HIGH — Double-admission to same bed**

`createAdmission` does:
1. INSERT into admissions
2. UPDATE beds SET is_occupied = TRUE

Two concurrent requests for the same bed will both pass step 1 before either updates the bed. Both admissions land in the DB pointing to the same bed.

**Fix:** Wrap in a transaction with a `SELECT ... FOR UPDATE` on the bed row:
```js
await client.query('SELECT bed_id FROM beds WHERE bed_id = $1 AND is_occupied = FALSE FOR UPDATE', [bed_id])
// if no row → bed taken → ROLLBACK + 409
```

---

### 3. Drug Dispensing Race Condition + Silent Under-Stock
**Severity: MEDIUM**

`createDispensing` uses `GREATEST(0, quantity - delta)` which silently clamps to 0 instead of rejecting the dispense. A pharmacist can dispense 100 tablets when only 10 are in stock and the system accepts it without error.

**Fix:** Check stock before deducting:
```js
// SELECT quantity_in_stock FOR UPDATE, reject if insufficient
```

---

### 4. No Pagination on List Endpoints
**Severity: MEDIUM — Will break at scale**

`getAllPatients`, `getAllMedicalRecords`, `getAllAppointments`, `getAllDispensings` etc. return **every row** in the table. At 500+ patients or 5,000+ records this will cause slow responses and high memory usage.

**Fix:** Add `LIMIT` / `OFFSET` with a `?page=&limit=` query param pattern on every list endpoint. Default limit of 50.

---

### 5. Medical Records Are Hard-Deleted
**Severity: MEDIUM — Medical compliance**

`DELETE FROM medical_records WHERE record_id = $1` permanently removes clinical data. In healthcare, patient records should never be destroyed — they are the legal record of care.

**Fix:** Add `deleted_at TIMESTAMP` column to `medical_records`, `prescriptions`, `lab_orders`, `lab_results`. Change DELETE to `UPDATE SET deleted_at = NOW()`. Filter `WHERE deleted_at IS NULL` on all SELECTs.

---

### 6. No Audit Log
**Severity: MEDIUM — Medical compliance**

There is no record of who accessed or changed patient data. If a record is modified, there is no way to know who did it or when.

**Fix:** Add an `audit_log` table:
```sql
CREATE TABLE audit_log (
  id          SERIAL PRIMARY KEY,
  user_id     INT,
  role        VARCHAR(50),
  action      VARCHAR(20), -- READ, CREATE, UPDATE, DELETE
  resource    VARCHAR(100),
  resource_id INT,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
Log writes (CREATE/UPDATE/DELETE) at minimum; log reads on sensitive resources (medical records, lab results).

---

### 7. Invite URL Returned in API Response (Email Not Sent)
**Severity: MEDIUM — Security & UX**

`staffController.js:105` has `// TODO: send invite email`. The invite URL is returned in the JSON response body. The admin must copy-paste it manually, and it appears in server logs. If logs are not secured, tokens leak.

**Fix:** Integrate a transactional email provider (Resend, SendGrid, or Mailgun — all have free tiers). The invite URL should be emailed directly and **never** returned in the API response in production.

---

### 8. JWT Stored in `localStorage`
**Severity: LOW-MEDIUM**

`localStorage` is readable by any JavaScript running on the page. If an XSS vulnerability ever exists, the token is stolen.

**Fix (recommended):** Move to an `httpOnly` cookie. This requires changing the login response and the axios client. Helmet's CSP header (already added) reduces XSS risk significantly but does not eliminate it.

---

## Schema Issues

### 9. `schema.sql` Is Out of Sync with Migrations
`schema.sql` shows `lab_orders.record_id NOT NULL` and `prescriptions.record_id NOT NULL`, but `migration_phase3_inpatient_orders.sql` makes them nullable to support inpatient orders via `admission_id`. A fresh deploy using only `schema.sql` will break inpatient lab orders and prescriptions.

**Fix:** Update `schema.sql` to reflect the current production schema state. Either keep it as the single source of truth or remove it and document that migrations run in order.

---

## Scalability Roadmap

### Immediate (before going to 5+ concurrent staff users)
- [ ] Fix patient ownership enforcement (bug, not just scale)
- [ ] Fix bed race condition (bug, not just scale)
- [ ] Add pagination to all list endpoints
- [ ] Add `?search=` query param on patient list (search by name/phone)

### Short-term (before 50+ patients)
- [ ] Integrate email provider for staff invites
- [ ] Add soft deletes to clinical tables
- [ ] Add audit log table + middleware
- [ ] Add a `GET /api/appointments?date=today` filter so receptionists don't load all appointments

### Medium-term (before multi-facility or 500+ patients)
- [ ] Add DB indexes on `appointment_datetime` and `patients.last_name` for sort/filter performance
- [ ] Add response compression middleware (`compression` npm package — one line)
- [ ] Increase pool `max` to 20–25 and monitor idle connections
- [ ] Add a background job (cron or pg_cron) to expire old invites and flag low drug stock
- [ ] Move JWT to `httpOnly` cookie

### Long-term (multi-facility or public-facing)
- [ ] Add Redis for session/token revocation (replaces the DB `is_active` check on every request)
- [ ] Split read-heavy endpoints (patient lists, records) onto a read replica
- [ ] Add structured logging (Winston/Pino) with request IDs for tracing
- [ ] Set up database backups with point-in-time recovery (critical for medical data)
- [ ] Add a CDN in front of the React frontend (Vercel already handles this)

---

## Summary Scores

| Area | Status |
|---|---|
| SQL injection | Secure (parameterized queries) |
| Auth & RBAC | Mostly solid — patient ownership gap |
| Data integrity | Race conditions on bed + stock |
| Medical record safety | Hard deletes — needs soft delete |
| Compliance/audit | No audit log |
| Performance at scale | No pagination — will fail at ~500 records |
| Email/notifications | Not implemented |
| DB schema | schema.sql out of sync with migrations |
