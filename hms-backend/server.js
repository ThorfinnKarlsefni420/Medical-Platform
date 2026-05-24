require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const authRoutes          = require('./routes/authRoutes');
const staffRoutes         = require('./routes/staffRoutes');
const patientRoutes       = require('./routes/patientRoutes');
const doctorRoutes        = require('./routes/doctorRoutes');
const wardRoutes          = require('./routes/wardRoutes');
const bedRoutes           = require('./routes/bedRoutes');
const appointmentRoutes   = require('./routes/appointmentRoutes');
const medicalRecordRoutes = require('./routes/medicalRecordRoutes');
const labOrderRoutes      = require('./routes/labOrderRoutes');
const labResultRoutes     = require('./routes/labResultRoutes');
const prescriptionRoutes  = require('./routes/prescriptionRoutes');
const dispensingRoutes    = require('./routes/dispensingRoutes');
const drugInventoryRoutes = require('./routes/drugInventoryRoutes');
const admissionRoutes     = require('./routes/admissionRoutes');
const dischargeRoutes     = require('./routes/dischargeRoutes');
const errorHandler        = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth',                authRoutes);
app.use('/api/staff',               staffRoutes);
app.use('/api/patients',            patientRoutes);
app.use('/api/doctors',             doctorRoutes);
app.use('/api/wards',               wardRoutes);
app.use('/api/beds',                bedRoutes);
app.use('/api/appointments',        appointmentRoutes);
app.use('/api/medical-records',     medicalRecordRoutes);
app.use('/api/lab-orders',          labOrderRoutes);
app.use('/api/lab-results',         labResultRoutes);
app.use('/api/prescriptions',       prescriptionRoutes);
app.use('/api/pharmacy-dispensing', dispensingRoutes);
app.use('/api/drug-inventory',      drugInventoryRoutes);
app.use('/api/admissions',          admissionRoutes);
app.use('/api/discharges',          dischargeRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`HMS server running on http://localhost:${PORT}`);
});
