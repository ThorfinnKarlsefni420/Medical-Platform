const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const {
  getAllMedicalRecords,
  getMedicalRecordById,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
} = require('../controllers/medicalRecordController');

router.use(authenticate);

router.get('/',    authorize('admin', 'doctor', 'nurse'),            getAllMedicalRecords);
router.get('/:id', authorize('admin', 'doctor', 'nurse', 'patient'), getMedicalRecordById);
router.post('/',   authorize('admin', 'doctor'),                      createMedicalRecord);
router.put('/:id', authorize('admin', 'doctor'),                      updateMedicalRecord);
router.delete('/:id', authorize('admin'),                             deleteMedicalRecord);

module.exports = router;
