# Compliance Requirements — HMS

This document lists what we need to confirm with the client before the platform goes into production. Nothing here is assumed; every item is a question that must be answered and signed off.

---

## 1. Jurisdiction & Governing Law

| # | Question | Client Answer |
|---|---|---|
| 1.1 | Which country and county/state is the facility registered in? | |
| 1.2 | Is the facility licensed under the Kenya Health Act (Cap. 242) or a facility-type-specific statute (e.g. private hospital, clinic, nursing home)? | |
| 1.3 | Is the facility subject to the **Kenya Data Protection Act, 2019** (DPA 2019) and its regulations? | |
| 1.4 | Are there county-level health bylaws that impose additional requirements? | |
| 1.5 | Does the facility handle data for patients from other jurisdictions (e.g. foreign nationals) that may trigger GDPR or other foreign law? | |

---

## 2. Health Records Retention

The current system **permanently deletes** patient profiles and appointment records when an admin clicks Delete. This must change before go-live.

| # | Question | Client Answer |
|---|---|---|
| 2.1 | What is the minimum retention period for patient health records? *(Kenya MoH guideline suggests 5 years for adults, longer for minors — confirm the exact requirement with the facility's legal/compliance officer.)* | |
| 2.2 | Should the retention clock start from the **last visit date** or **date of record creation**? | |
| 2.3 | For deceased patients, does the retention period change? | |
| 2.4 | For minors: should records be retained until the patient reaches majority plus the standard retention period? | |
| 2.5 | After the retention period expires, is **permanent erasure** required, or should records be archived (anonymised/pseudonymised)? | |
| 2.6 | Who in the facility is authorised to trigger permanent deletion after the retention period? | |

**Current gap:** Patient deletion is a hard delete. We will replace this with a soft-delete / deactivation model where:
- The patient record is flagged `deactivated_at` and hidden from normal workflows.
- All linked clinical data (appointments, medical records, lab orders, prescriptions) is retained.
- True purge is gated behind a separate admin action and is only unlocked after the retention period.

---

## 3. Patient Rights (Data Subject Rights under DPA 2019)

| # | Question | Client Answer |
|---|---|---|
| 3.1 | Does the facility need a process for **Subject Access Requests** (patients requesting a copy of all their data)? | |
| 3.2 | Does the facility need to support **Right to Rectification** (patients requesting correction of inaccurate data)? | |
| 3.3 | Does the facility have a process for **Right to Erasure** requests, and does the retention obligation override it? | |
| 3.4 | Within what timeframe must Subject Access Requests be fulfilled? *(DPA 2019 default: 21 days)* | |
| 3.5 | Should patients be able to export their records from within the app (PDF, CSV)? | |

---

## 4. Access Control & Role Definitions

| # | Question | Client Answer |
|---|---|---|
| 4.1 | Confirm the role list is complete: admin, receptionist, doctor, nurse, pharmacist, lab_technician, patient. Any missing roles? | |
| 4.2 | Should any role be restricted to read-only access to specific wards / departments? | |
| 4.3 | Should doctors only see patients assigned to them, or all patients? | |
| 4.4 | Are there records that should be accessible only to the treating doctor (e.g. psychiatric notes)? | |
| 4.5 | Should patient login access to their own records be enabled at launch or phased in later? | |

---

## 5. Audit Trail

The system currently logs READ, CREATE, UPDATE, and DELETE on clinical records. Confirm scope:

| # | Question | Client Answer |
|---|---|---|
| 5.1 | Is the current audit log scope (medical records, lab orders, lab results, prescriptions) sufficient, or should it extend to patient profiles and appointments? | |
| 5.2 | How long must audit logs be retained? *(Recommend minimum 3 years; Kenya DPA does not specify but regulators may request them during an investigation.)* | |
| 5.3 | Who can view the audit log? Admin only, or also the facility's compliance officer? | |
| 5.4 | Must the audit log be tamper-proof (append-only, off-system backup)? | |

---

## 6. Data Breach & Incident Response

| # | Question | Client Answer |
|---|---|---|
| 6.1 | Has the facility appointed a **Data Protection Officer (DPO)** as required by DPA 2019 for healthcare data controllers? | |
| 6.2 | Is the facility registered with the **Office of the Data Protection Commissioner (ODPC)** Kenya? | |
| 6.3 | What is the internal escalation path when a breach is detected? *(DPA 2019 requires notification to ODPC within 72 hours of becoming aware of a breach.)* | |
| 6.4 | Should the system provide automated alerts (email/SMS) to the DPO when suspicious access patterns are detected? | |

---

## 7. Consent Management

| # | Question | Client Answer |
|---|---|---|
| 7.1 | Is written patient consent obtained at registration? Is it recorded in the system or on paper? | |
| 7.2 | Should the system capture and store consent records digitally (consent type, date, version)? | |
| 7.3 | Are there specific consent categories required (e.g. treatment consent, data processing consent, research consent)? | |
| 7.4 | Can patients withdraw consent, and what happens to their data if they do? | |

---

## 8. Data Storage & Infrastructure

| # | Question | Client Answer |
|---|---|---|
| 8.1 | Where is the database hosted? *(Kenya DPA 2019 Section 50 restricts transfer of personal data outside Kenya unless adequate protections exist.)* | |
| 8.2 | Is data encrypted at rest? | |
| 8.3 | Is data encrypted in transit? *(Currently: yes — HTTPS enforced via Vercel.)* | |
| 8.4 | What is the backup frequency and retention period for database backups? | |
| 8.5 | Is there a tested disaster recovery plan and RTO/RPO target? | |

---

## 9. Interoperability & Reporting

| # | Question | Client Answer |
|---|---|---|
| 9.1 | Does the facility report to the Kenya Health Information System (**KHIS / DHIS2**)? If yes, which datasets? | |
| 9.2 | Are there Kenya Medical Research Institute (KEMRI) or county health department reporting obligations? | |
| 9.3 | Should the system generate MOH facility reports (e.g. MOH 705A/B outpatient registers)? | |
| 9.4 | Will the system need to integrate with the National Hospital Insurance Fund (**NHIF**) or SHA claims portal? | |
| 9.5 | Is HL7 FHIR or any other interoperability standard required? | |

---

## 10. Specific Facility Certifications

| # | Question | Client Answer |
|---|---|---|
| 10.1 | Is the facility pursuing or holding any ISO certification (e.g. ISO 27001 for information security)? | |
| 10.2 | Are there accreditation body requirements (e.g. Kenya Accreditation Service, SAAS) that impose IT system requirements? | |
| 10.3 | Does the facility conduct clinical research? If yes, are there IRB/ISERC requirements affecting record retention? | |

---

## Current System Compliance Status

| Area | Status | Notes |
|---|---|---|
| Clinical record soft-delete | Partially compliant | `deleted_records` table exists; medical records, lab orders, lab results, prescriptions are soft-deleted |
| Patient profile retention | **Non-compliant** | Hard delete — must be changed to soft-delete before go-live |
| Appointment retention | **Non-compliant** | Hard delete — must be changed to soft-delete |
| Audit log | Partial | Covers clinical record writes; does not cover patient profile access or appointment changes |
| Encryption in transit | Compliant | HTTPS via Vercel |
| Encryption at rest | Unknown | Depends on database host configuration — needs confirmation |
| Access control (RBAC) | Compliant | 7 roles with route-level enforcement |
| Data breach process | Not implemented | No automated alerting; manual process only |
| Consent management | Not implemented | No consent records in the system |
| ODPC registration | Unknown | Client to confirm |
| Retention period enforcement | Not implemented | No retention clock, no scheduled purge |

---

## Immediate Actions Required (Before Go-Live)

1. **Soft-delete patients and appointments** — replace hard delete with a `deactivated_at` flag; retain all data.
2. **Confirm retention period** with client's legal/compliance officer.
3. **Extend audit log** to cover patient profile reads and appointment changes.
4. **Confirm data hosting location** relative to Kenya DPA data localisation rules.
5. **Confirm ODPC registration** status and appoint DPO if not already done.
6. **Define and document the breach response procedure.**
7. **Obtain client sign-off** on this document before go-live.

---

*Document version: 1.0 — June 2026. To be updated after client responses are received.*
