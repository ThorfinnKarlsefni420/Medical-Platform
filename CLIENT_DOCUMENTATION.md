# Busia Health Care Services
## Hospital Management System — Platform Overview
**Prepared by:** Abdulaziz Komara
**Date:** May 2026
**Version:** 1.0

---

## What This Document Covers

This document explains how the Busia Health Care Services Hospital Management System (HMS) works — who uses it, how they access it, and what each person can do once they're in. It is intended to give you a clear picture of the platform before we proceed to full deployment.

---

## 1. How the Platform is Delivered

The HMS is a **web-based application** — there is nothing to install from an app store. Every member of staff and every patient accesses the same website from their phone, tablet, or computer.

### Installing it on a Personal Device (Phone or Tablet)

Because the platform is built as a **Progressive Web App (PWA)**, it can be installed on any device in seconds and behaves exactly like a native app — full screen, home screen icon, no browser bar.

**On Android (Chrome):**
1. Open Chrome and visit the HMS website
2. Tap the menu (three dots, top right)
3. Tap **"Add to Home Screen"** or **"Install App"**
4. Done — the app icon appears on the home screen

**On iPhone / iPad (Safari):**
1. Open Safari and visit the HMS website
2. Tap the **Share** button (box with an arrow, bottom centre)
3. Tap **"Add to Home Screen"**
4. Done — the app icon appears on the home screen

> **Note:** All staff and patients use the same website address. There is one link for everyone.

---

## 2. Who Uses the Platform

The platform has six roles. Each role sees only what is relevant to their work.

| Role | Who | What They Can Do |
|---|---|---|
| **Admin / Receptionist** | Front desk staff | Register patients, book appointments, manage patient records, create staff accounts |
| **Doctor** | Physicians | View appointments, write medical records, issue prescriptions, order lab tests |
| **Nurse** | Nursing staff | View patient information, appointments, and medical records (read access) |
| **Pharmacist** | Pharmacy staff | View and manage prescriptions and dispensing |
| **Lab Technician** | Laboratory staff | Manage lab orders and enter lab results |
| **Patient** | Registered patients | View their own appointments, medical records, lab results, and profile |

---

## 3. How Staff Get Access — The Invite System

Staff accounts are **never created by the staff member themselves.** The Admin (receptionist or designated manager) controls who has access to the system. This ensures no unauthorised person can create an account.

### Step-by-Step: Onboarding a New Staff Member

**Step 1 — Admin adds the staff member**
The Admin logs into the HMS, navigates to **Staff Management**, and fills in:
- Full name
- Email address
- Role (Doctor, Nurse, Pharmacist, etc.)

**Step 2 — System sends an invite email**
The staff member automatically receives an email from the system. The email contains a **secure invite link** — it looks like this:

> *"You have been invited to join the Busia Health Care Services HMS. Click the link below to set up your password. This link expires in 48 hours."*

**Step 3 — Staff member sets their own password**
The staff member clicks the link, chooses a personal password, and their account is activated. The link works only once and expires after 48 hours for security.

**Step 4 — Staff member logs in**
They visit the HMS website, enter their email and password, and land on their personalised dashboard based on their role.

### Why This Approach

- Passwords are **never sent over email** — only a one-time link is sent, keeping credentials secure
- Links **expire after 48 hours** — if the email is missed or intercepted, the link becomes useless
- The Admin has **full control** over who is on the system at all times
- Any staff member can be **deactivated instantly** if they leave the clinic

---

## 4. How Patients Get Access

Patients have two ways to register:

### Option A — Self-Registration (Web or Phone)
A patient visits the HMS website and clicks **"Create an account"** on the login page. They fill in:
- Personal details (name, date of birth, gender, blood type, phone, address)
- Email address and password

Their account is created immediately and they can log in straight away.

### Option B — Registered by the Receptionist
The receptionist registers the patient on their behalf at the front desk (walk-in, phone call, or referral). The receptionist can also optionally create a login account for the patient at the same time by ticking **"Also create a login account for this patient"** and entering a temporary password.

### What Patients See When They Log In

Once logged in, a patient can view:
- **My Profile** — their personal details (they can update their phone number and address)
- **My Appointments** — upcoming and past appointments
- **My Medical Records** — diagnoses and treatment notes from consultations

Patients **cannot** see any other patient's information. They see only their own.

---

## 5. The Receptionist's Daily Workflow

The receptionist is the primary day-to-day user of the in-house system. Their dashboard is designed as a **command centre** — everything they need is one click away.

**After logging in, the receptionist sees:**
- A **patient quick-search bar** — type a name, phone number, or email and the patient appears instantly
- **Today's schedule** — all appointments for the day listed with patient names and doctors
- Quick action buttons — **Register patient** and **Book appointment**

**Clicking on a patient** opens their full profile, with three tabs:
- **Overview** — demographics, next appointment, recent records
- **Appointments** — full history (upcoming and past)
- **Medical Records** — all consultation notes and diagnoses

The receptionist can **edit a patient's details** (phone number, address, etc.) directly from this page — useful when a patient calls to update their information.

---

## 6. The Doctor's Workflow

When a doctor logs in they see the same appointments schedule, but with clinical tools unlocked:
- **Create medical records** — write consultation notes, diagnosis, and treatment plan after a visit
- **Link records to appointments** — every record can be tied to the specific appointment it came from
- **View full patient history** — all past records for any patient they are treating

---

## 7. Security

### Current Security Features
- All passwords are **encrypted** before being stored — even system administrators cannot see passwords
- All communication between devices and the server is **encrypted (HTTPS)**
- Each staff member has a **personal login** — actions are traceable to the individual
- Patient data is **role-restricted** — a pharmacist cannot see medical records, a patient cannot see another patient's data
- Staff accounts can be **deactivated instantly** by the Admin

### Planned: Multi-Factor Authentication (MFA)
In a future update, staff will be able to enable **two-factor authentication** — after entering their password, a one-time code is sent to their phone. This adds a second layer of protection and is particularly valuable for doctors and administrators who have access to sensitive clinical data. The system is already designed to support this without any restructuring.

---

## 8. Summary of Access Flows

```
STAFF ONBOARDING
─────────────────
Admin creates staff account
        ↓
System emails invite link (expires 48hrs)
        ↓
Staff clicks link → sets own password
        ↓
Staff logs in → lands on role dashboard


PATIENT REGISTRATION
─────────────────────
Option A: Patient self-registers on website
Option B: Receptionist registers on their behalf
        ↓
Patient logs in → sees only their own data


DAILY USE
──────────
Open HMS website (or PWA icon on phone)
        ↓
Enter email + password → logged in
        ↓
Receptionist → patient search + booking dashboard
Doctor        → appointments + clinical tools
Nurse         → read-only patient & record access
Patient       → personal portal (appointments, records, profile)
```

---

## 9. What Comes Next

The following features are either in active development or planned for upcoming releases:

- **Staff invite system** — Admin creates and sends invite links to staff (in development)
- **PWA support** — Install on any device from the browser (in development)
- **Multi-factor authentication** — Extra login security for staff (planned)
- **Lab orders & results** — Lab technician workflow (backend ready, frontend pending)
- **Pharmacy & dispensing** — Pharmacist workflow (backend ready, frontend pending)
- **Patient notifications** — Email or SMS reminders for upcoming appointments (planned)
- **Reporting & analytics** — Daily/weekly summaries for management (planned)

---

*This document will be updated as the platform develops. For questions or feedback, contact the development team.*
