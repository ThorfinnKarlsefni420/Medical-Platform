# HMS Screen Recording Guide
## Busia Health Care Services — System Walkthrough for Client

**Estimated recording time:** 20–30 minutes
**Audience:** Client / stakeholders
**Goal:** Demonstrate the full clinical workflow from patient registration through to pharmacy dispensing, with emphasis on the pharmacy module.

---

## Before You Start

Open two browser windows side by side (or use separate tabs):
- **Browser A:** Log in as **Admin** → `admin@hms.com` / `Admin1234`
- **Browser B:** You'll log in as other roles during the walkthrough

Make sure:
- Backend running at `http://localhost:3000`
- Frontend running at `http://localhost:5173`
- A few patients already exist (or register one live during the recording)

---

## Scene 1 — Admin Overview (2 min)

**Log in as Admin** (`admin@hms.com` / `Admin1234`)

> *"This is the HMS dashboard for Busia Health Care Services. As the administrator, I have full oversight of the entire platform."*

**Show the sidebar** — point out each module:
- Dashboard, Patients, Appointments, Medical Records, Laboratory, Inpatient, Pharmacy, Drug Inventory, Staff

> *"Every role in the hospital — doctors, nurses, pharmacists, lab technicians, and receptionists — each sees only the sections relevant to their work. The admin sees everything."*

---

## Scene 2 — Staff Management: Inviting a Staff Member (3 min)

Navigate to **Staff** in the sidebar.

> *"Staff accounts are not created directly — the admin sends a secure invite link. This prevents unauthorized account creation."*

1. Click **Invite Staff**
2. Fill in: First Name, Last Name, Email, Role → select **Pharmacist**
3. Click **Send Invite**
4. Show the **copyable invite URL** that appears

> *"Because we haven't yet connected an email provider, the URL is shown here for the admin to share manually. Once email is configured, this goes out automatically."*

5. Open the invite URL in a new browser tab
6. Show the **Accept Invite** page — enter a password (e.g. `Test1234`)
7. Click **Set password & activate account** — the pharmacist is logged in automatically

> *"The staff member clicks the link, sets their own password, and is immediately active. The link expires after 48 hours."*

---

## Scene 3 — Receptionist: Registering a Patient (2 min)

**Log out, then log in as Receptionist** (invite one first, or use an existing account)

> *"The receptionist handles front desk operations — registering new patients and scheduling appointments."*

Navigate to **Patients** → Click **+ New Patient**

Fill in:
- First Name: `James`
- Last Name: `Ochieng`
- Date of Birth: `1985-03-14`
- Gender: Male
- Address: `Busia Town`

Click **Register Patient**.

> *"Patient is now in the system. The receptionist can search, view, and update patient profiles at any time."*

Navigate to **Appointments** → Click **+ New Appointment**

- Select patient: `James Ochieng`
- Select doctor (any available doctor)
- Set date and time (e.g. today + 1 hour)
- Reason: `Chest pain and difficulty breathing`

Click **Book Appointment**.

> *"Appointment is confirmed and immediately visible to the assigned doctor."*

---

## Scene 4 — Doctor: Consultation & Prescription (4 min)

**Log out → Log in as Doctor**

Navigate to **Appointments** — show James Ochieng's appointment.

> *"The doctor sees all their scheduled appointments. They click through to the consultation."*

Click on the appointment → **Create Medical Record**

Fill in:
- Consultation Notes: `Patient presents with chest pain and shortness of breath. Vitals: BP 138/90, Temp 37.4°C, O2 sat 96%.`
- Diagnosis: `Hypertensive heart disease, suspected. Rule out pneumonia.`

Click **Save**.

> *"The medical record is linked directly to this appointment, creating a complete clinical trail."*

**Now order a lab test:**
Click **+ Order Lab Test** (on the medical record)
- Test Name: `Chest X-Ray`
- Click **Order**

> *"The doctor can order investigations directly from the consultation. The lab technician will see this immediately in the Lab module."*

**Now issue a prescription:**
Click **+ Add Prescription**
- Medication: `Amlodipine 5mg`
- Dosage: `1 tablet daily`
- Instructions: `Take in the morning with or without food`
- Click **Add**

Add a second prescription:
- Medication: `Amoxicillin 500mg`
- Dosage: `1 capsule three times daily`
- Instructions: `After meals, complete the full course`
- Click **Add**

> *"Both prescriptions are now in the system with status 'Created'. The doctor's next step is to send them to the pharmacy."*

**Change prescription status to "Sent to Pharmacy":**
Click the status dropdown or update button on each prescription → set to **Sent to Pharmacy**.

> *"The moment the doctor marks a prescription 'Sent to Pharmacy', it appears in the pharmacist's queue."*

---

## Scene 5 — Pharmacy Module: The Core Demo (7 min)

**This is the section the client specifically requested. Take your time here.**

**Log out → Log in as Pharmacist**

### 5a — Drug Inventory

Navigate to **Drug Inventory**.

> *"Before we dispense anything, let me show you the drug inventory system — this is the backbone of the pharmacy module."*

Show the drug list with:
- Medication names, units, quantity in stock
- **Status badges**: In Stock (green), Low Stock (amber), Out of Stock (red)
- **Alert banner** at the top if any drugs are low or out of stock

> *"The system automatically flags drugs that need restocking. The pharmacist and admin always know what's running low before it becomes a crisis."*

**Demonstrate: Add a single drug**
Click **+ Add Drug**
- Name: `Metformin 500mg`
- Unit: tablets
- Initial quantity: `200`
- Reorder threshold: `30`
- Click **Add Drug**

> *"Any new drug added to the formulary appears instantly."*

**Demonstrate: Adjust Stock**
Click **Adjust stock** next to any existing drug.
- Select: Add stock
- Quantity: `50`
- Click **Confirm**

> *"When a new delivery arrives, the pharmacist adjusts stock directly here. Same for removing expired stock."*

**Demonstrate: Bulk Import via CSV/Excel**
Click **↑ Import**
- Browse for the sample file (or show the expected format)
- Show the Import Result modal: Added X / Updated X / Total X

> *"For initial setup or bulk restocking, the pharmacist can import an entire spreadsheet in one click. The system matches by medication name — new drugs are added, existing ones are updated."*

**Expected CSV format (show this on screen if possible):**
```
medication_name,unit,quantity_in_stock,reorder_threshold
Paracetamol 500mg,tablets,500,50
ORS Sachets,sachets,200,30
```

### 5b — Prescription Queue

Navigate to **Pharmacy** → **Prescription Queue** tab.

> *"Now this is the pharmacist's main workspace. Every prescription sent by a doctor appears here."*

Show James Ochieng's prescriptions (Amlodipine + Amoxicillin) with status **Sent to Pharmacy**.

> *"The pharmacist can see the patient name, medication, dosage, and instructions at a glance. Let's dispense the Amlodipine."*

**Dispense a prescription:**
Click **Dispense** next to Amlodipine 5mg.

Show the Dispense modal:
- Current stock of the drug is shown automatically
- Enter quantity to dispense: `30` (30-day supply)
- Status: Medication Dispensed
- Click **Confirm Dispense**

> *"The prescription status updates to 'Dispensed' and — this is important — the stock count in the inventory is automatically decremented. No separate stock update needed."*

Show that the drug's quantity in Drug Inventory has dropped by 30.

Dispense the Amoxicillin 500mg:
- Quantity: `21` (3 capsules/day × 7 days)
- Confirm Dispense

> *"Every dispensing is permanently logged with the quantity, timestamp, and pharmacist. There's a complete audit trail."*

### 5c — Dispense History

Click the **Dispense History** tab.

> *"The pharmacist and admin can always look back at every medication that has ever been dispensed — patient, medication, quantity, date. This is critical for regulatory compliance."*

Show the two dispense records just created.

---

## Scene 6 — Laboratory Module (3 min)

**Stay logged in as Pharmacist, or switch to Lab Technician**

> *"Meanwhile, the chest X-ray ordered by the doctor has landed in the lab queue."*

**Log out → Log in as Lab Technician**

Navigate to **Laboratory** → **Order Queue** tab.

Show James Ochieng's Chest X-Ray order with status **Ordered**.

**Progress the order:**
Click **Collect Sample** → status moves to `Sample Collected`
Click **Start Processing** → status moves to `Processing`
Click **Mark Complete** → status moves to `Completed`

> *"The lab technician progresses the order through each stage. Once complete, they enter the result."*

**Enter the result:**
Click **Enter Result** on the completed order.
- Result data: `Chest X-Ray: Mild cardiomegaly noted. No consolidation or pleural effusion. Findings consistent with hypertensive heart disease.`
- Click **Submit Result**

Navigate to **Results** tab.

**Doctor reviews (switch back to Doctor login):**

> *"The result is now visible to the ordering doctor."*

Show the result in the Results tab.
Click **Mark Reviewed** → status updates to `Results Reviewed`

> *"The patient can also see their own lab results when they log in — only their own results, nothing else."*

---

## Scene 7 — Inpatient Module (3 min)

**Log in as Admin or Doctor**

> *"For patients who need to be admitted, the inpatient module manages the entire hospital stay."*

Navigate to **Inpatient** → **Wards & Beds** tab.

**Admin: Create a ward (if none exist):**
Click **+ Add Ward**
- Name: `Male General Ward`
- Type: General
- Click **Add Ward**

Click **+ Add Bed** → Bed number: `1A` → Add
Add a few more beds: `1B`, `1C`

> *"The admin configures wards and beds once. Bed occupancy is tracked in real time — green means available, red means occupied."*

**Admit James Ochieng:**
Click **+ Admit Patient** (top right)
- Patient: James Ochieng
- Medical Record: the record from today's consultation
- Ward: Male General Ward
- Bed: 1A
- Initial notes: `Patient admitted for monitoring and further investigation of hypertensive heart disease.`
- Click **Admit Patient**

Navigate to **Active Admissions** tab. Show James Ochieng in bed 1A.

**Inpatient orders (doctor):**
Click **Orders** next to James Ochieng.

Show the Inpatient Orders modal.
Click **+ Add** under Prescriptions:
- Medication: `Furosemide 40mg`
- Dosage: `1 tablet once daily`
- Click Add

Click **+ Add** under Lab Orders:
- Test: `Full Blood Count`
- Click Add

> *"Inpatient medications and lab tests are ordered directly against the admission — no appointment needed. These flow straight into the pharmacy queue and lab queue respectively."*

Click **Update Notes**:
- Add: `Day 1: Patient stable. BP 132/84 after Amlodipine. Continues on monitoring. Await FBC results.`
- Save

**Discharge when ready:**
Click **Discharge** on the admission.
- Discharge Summary: `Patient stabilised over 24 hours. BP controlled on Amlodipine 5mg. Diagnosis confirmed: Hypertensive Heart Disease Stage 2.`
- Follow-up Plan: `Return in 2 weeks for BP review. Continue Amlodipine. Avoid high-sodium diet.`
- Click **Discharge Patient**

Switch to **Discharge History** tab.

> *"The discharge record is permanent. And from here, the doctor can book the follow-up appointment directly."*

Click **Book Follow-up** on James Ochieng's discharge record:
- Select doctor
- Date: 2 weeks from today
- Reason is pre-filled from the follow-up plan
- Click **Book Appointment**

---

## Scene 8 — Patient Self-Service (1 min)

**Log out → Register as Patient** (or log in as an existing patient)

> *"Patients have their own portal. They can see their appointments, medical records, and lab results — all read-only."*

Show:
- **Dashboard**: upcoming appointments
- **Appointments**: list of all appointments
- **Medical Records**: consultation notes and diagnoses
- **My Profile → Lab Results**: James Ochieng's X-Ray result and FBC (once reviewed)

---

## Closing (30 sec)

Navigate back to the Admin dashboard.

> *"To summarise: a patient walks in, the receptionist registers them and books their appointment. The doctor sees them, writes a medical record, orders lab tests, and issues prescriptions. The pharmacist dispenses the medications and inventory updates automatically. The lab technician processes the tests and enters results. If the patient needs admission, the inpatient module tracks their bed, monitoring notes, and clinical orders throughout their stay. And when they're discharged, the follow-up appointment is booked before they leave."*

> *"This is a complete clinical workflow system — built specifically for Busia Health Care Services."*

---

## Tips for a Smooth Recording

- **Use incognito windows** for each role so you can be logged in as multiple users at once
- **Pre-populate data** before recording: have at least 2 patients, 1 doctor, and 10 drugs in inventory so the screens look realistic
- **Zoom in** on status badges and buttons as you click them — they're small and clients often miss them
- **Slow down at the pharmacy module** — that's what the client specifically asked about
- **Show the stock decrement** explicitly after dispensing — go to Drug Inventory and highlight the reduced number

---

## Role Login Quick Reference

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hms.com | Admin1234 |
| Doctor | (invite via Staff page) | set on accept |
| Pharmacist | (invite via Staff page) | set on accept |
| Lab Technician | (invite via Staff page) | set on accept |
| Nurse | (invite via Staff page) | set on accept |
| Receptionist | (invite via Staff page) | set on accept |
| Patient | (self-register via /register) | set on register |
