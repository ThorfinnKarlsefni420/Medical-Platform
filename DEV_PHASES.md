# Busia Health Care Services — HMS Development Phases

**Prepared by:** Abdulaziz Komara
**Last revised:** May 2026
**Version:** 2.0

> This document is the authoritative scope reference for the HMS build.
> Each phase lists its goal, deliverables, implementation status, and what remains to be built.
> Confirm scope here before starting any sprint.

---

## Status Key

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete — backend + frontend |
| 🔧 | Backend ready, frontend missing |
| ❌ | Not built (backend + frontend both missing) |
| 🔒 | Deferred — confirmed out of scope for current build |

---

## Phase 1 — Foundation (Sprints 1–2)

**Goal:** Every user can log in. Patients can be registered and booked for appointments. Doctors can write a medical record after a consultation. Admins can onboard and manage staff.

### Deliverables

#### Epic 1 — Authentication & Access
| Feature | Status | Notes |
|---------|--------|-------|
| Patient self-registration (web form) | ✅ | |
| Patient login | ✅ | |
| Staff login | ✅ | |
| JWT session management | ✅ | |
| Role-based route protection | ✅ | |
| **Staff invite system** | ❌ | Admin sends secure one-time link → staff sets own password → link expires in 48 h. Backend invite token flow, email dispatch, and invite-acceptance page all missing. |
| **Staff management page** | ❌ | Admin needs to list all staff, see roles, and deactivate accounts instantly. `users.is_active` column exists but no API or UI to manage it. |

#### Epic 2 — Core Clinical Workflow
| Feature | Status | Notes |
|---------|--------|-------|
| Patient registration by receptionist | ✅ | |
| Patient search and profile view | ✅ | |
| Appointment booking | ✅ | |
| Appointment management (reschedule, cancel) | ✅ | |
| Medical records — create & edit | ✅ | |
| Medical records — link to appointment | ✅ | |
| Patient dashboard (appointments, records) | ✅ | |

### Phase 1 Build Remaining
- [ ] Staff invite API (generate token, validate token, set password)
- [ ] Invite email dispatch
- [ ] Invite acceptance page (frontend)
- [ ] Staff management page — list staff, deactivate/reactivate, resend invite

---

## Phase 2 — Outpatient Workflows (Sprints 3–4)

**Goal:** Connect the doctor's consultation to external departments. A doctor can order lab tests and issue prescriptions from within a Medical Record. Lab technicians and pharmacists have their own dashboards to action those orders.

> Note: Epics 3 and 4 are independent of each other and can be worked on in parallel.

### Deliverables

#### Epic 3 — Laboratory Module
| Feature | Status | Notes |
|---------|--------|-------|
| Lab order creation (doctor) | 🔧 | Backend complete (`/api/lab-orders`). No frontend. |
| Lab order status progression (`Ordered → Sample Collected → Processing → Completed`) | 🔧 | Backend complete. No frontend. |
| Lab result entry (lab technician) | 🔧 | Backend complete (`/api/lab-results`). No frontend. |
| Lab result review & status update (`Pending Review → Results Reviewed → Requires Follow-up`) | 🔧 | Backend complete. No frontend. |
| Lab results visible to ordering doctor | 🔧 | Backend complete. No frontend. |
| Lab results visible to patient (own results only) | 🔧 | Permission exists (`read:own`). No patient-facing page. |

#### Epic 4 — Pharmacy Module
| Feature | Status | Notes |
|---------|--------|-------|
| Prescription creation (doctor) | ✅ | |
| Prescription status flow (`Created → Sent to Pharmacy → Dispensed → Cancelled`) | ✅ | |
| Prescription queue (pharmacist view) | ✅ | |
| Dispense recording with quantity | ✅ | |
| Dispense history log | ✅ | |
| Drug inventory catalog | ✅ | |
| Stock adjustment (add / remove) | ✅ | |
| Low-stock alert banner | ✅ | |
| Stock auto-deduction on dispense | ✅ | |

### Phase 2 Build Remaining
- [ ] Lab page — Order Queue tab (doctor creates orders, lab tech updates status)
- [ ] Lab page — Results tab (lab tech enters results, doctor marks reviewed)
- [ ] Patient lab results view (patient sees own results under their profile)

---

## Phase 3 — Inpatient Workflows (Sprints 5–6)

**Goal:** Handle complex, multi-day hospital stays. A doctor can admit a patient to a bed, nurses can update monitoring notes, and the bed occupancy is tracked in real time.

### Deliverables

#### Epic 5 — Inpatient Module
| Feature | Status | Notes |
|---------|--------|-------|
| **Ward & bed setup (admin)** | 🔧 | Backend complete (`/api/wards`, `/api/beds`). No UI to create wards or add beds. This is a hard prerequisite — no admissions are possible without wards and beds in the DB. Must be the first deliverable in this phase. |
| Bed occupancy overview | 🔧 | Backend complete. No frontend. |
| Admit patient to bed (links to Medical Record) | 🔧 | Backend complete (`/api/admissions`). Auto-marks bed as occupied. No frontend. |
| Inpatient monitoring notes (nurse / doctor) | 🔧 | Backend complete. No frontend. |
| Admission status progression (`Admitted → Transferred → Discharged`) | 🔧 | Backend complete. No frontend. |
| **Inpatient clinical orders** | ❌ | **Design decision required.** Current schema routes all prescriptions and lab orders through `medical_records → appointments`. Admitted patients may need medications and lab tests without a new outpatient appointment. Two options: (A) create a standing "inpatient appointment" record per admission, or (B) add an optional `admission_id` FK to `prescriptions` and `lab_orders`. Must be decided and implemented before the frontend is built. |

### Phase 3 Build Remaining
- [ ] **Decide inpatient clinical orders design** (Option A or B above)
- [ ] Apply schema migration for chosen approach
- [ ] Ward & Bed management page (admin — create wards, add/remove beds, view occupancy)
- [ ] Admissions page (doctor/admin — admit patient, select ward and bed, add monitoring notes)
- [ ] Admissions list with current bed status (nurse/admin — read view)

---

## Phase 4 — Closure & Polish (Sprint 7)

**Goal:** Complete the patient lifecycle. A patient is discharged with a formal summary, a follow-up plan, and optionally a booked follow-up appointment. The system is validated end-to-end.

### Deliverables

#### Discharges
| Feature | Status | Notes |
|---------|--------|-------|
| Discharge creation with summary and follow-up plan | 🔧 | Backend complete (`/api/discharges`). Auto-sets admission to `Discharged` and frees the bed. No frontend. |
| Discharge record view | 🔧 | Backend complete. No frontend. |
| **Follow-up appointment booking from discharge** | ❌ | `discharges.follow_up_plan` is a free-text field. A "Book follow-up" action should pre-fill a new appointment form with the patient's details, closing the clinical loop back into Phase 1's appointment module. |
| Discharge history list | 🔧 | Backend complete. No frontend. |

#### Security & Quality
| Feature | Status | Notes |
|---------|--------|-------|
| **Multi-Factor Authentication (MFA)** | ❌ | Platform overview confirms the system is designed to support MFA without restructuring. TOTP or SMS OTP for staff (especially admin and doctors). Implement and activate in this phase. |
| End-to-end integration testing | ❌ | Full patient lifecycle walkthrough: register → book appointment → consultation → lab order → results → prescription → dispense → admit → monitor → discharge → follow-up appointment. |

### Phase 4 Build Remaining
- [ ] Discharges page (doctor/admin — create discharge, write summary and follow-up plan)
- [ ] "Book follow-up" action on discharge that pre-fills appointment form
- [ ] MFA backend (TOTP secret generation, OTP verification endpoint)
- [ ] MFA setup page (frontend — staff enables 2FA on their account)
- [ ] MFA login step (frontend — prompt for OTP after password)
- [ ] Integration test run across all modules

---

## Phase 5 — Operations & Intelligence (Sprint 8)

**Goal:** Give management visibility into platform activity. Notify patients automatically. This phase runs after the core clinical workflow is stable.

> This phase was listed as "Planned" in the platform overview but was absent from the original phase definitions. It is added here as a confirmed future phase, not blocking Phases 1–4.

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard analytics — daily patient count, appointments, bed occupancy | ❌ | Admin/doctor-facing summary cards on the dashboard. |
| Reporting — lab turnaround times, prescription volumes, discharge rates | ❌ | Exportable report views for management. |
| Patient notifications — appointment reminders (email/SMS) | ❌ | Triggered on appointment creation and 24 h before. Requires an email/SMS provider integration (e.g. SendGrid, Africa's Talking). |
| Patient notifications — lab results ready | ❌ | Notify patient when lab result status changes to `Results Reviewed`. |

---

## Build Order Summary

```
Phase 1 (remaining)
  └── Staff invite system + Staff management page

Phase 2 (remaining)
  └── Lab module frontend (order queue, results entry, patient view)

Phase 3 (remaining)
  ├── Inpatient clinical orders design decision + migration
  ├── Ward & Bed management page (admin)
  └── Admissions page + monitoring notes

Phase 4 (remaining)
  ├── Discharges page + follow-up appointment booking
  ├── MFA (backend + frontend)
  └── End-to-end integration test

Phase 5 (future)
  ├── Reporting & analytics
  └── Patient notifications
```

---

## Open Design Decisions

| # | Decision | Options | Owner | Due |
|---|----------|---------|-------|-----|
| 1 | Inpatient clinical orders — how are prescriptions and lab orders linked for admitted patients? | A) Standing inpatient appointment per admission B) Add `admission_id` FK to prescriptions and lab_orders | Dev lead | Before Phase 3 sprint start |

---

*This document should be updated at the start of each sprint to reflect completed items and any scope changes agreed with the client.*
