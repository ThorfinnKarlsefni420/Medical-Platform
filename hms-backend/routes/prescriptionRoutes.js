const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const {
  getAllPrescriptions,
  getPrescriptionById,
  getAdmissionPrescriptions,
  createPrescription,
  updatePrescription,
  deletePrescription,
} = require('../controllers/prescriptionController');

router.use(authenticate);

router.get('/',                        authorize('admin', 'doctor', 'pharmacist'),                getAllPrescriptions);
router.get('/admission/:admissionId',  authorize('admin', 'doctor', 'nurse', 'pharmacist'),    getAdmissionPrescriptions);
router.get('/:id',                     authorize('admin', 'doctor', 'pharmacist', 'patient'),  getPrescriptionById);
router.post('/',   authorize('admin', 'doctor'),                                   createPrescription);
router.put('/:id', authorize('admin', 'doctor', 'pharmacist'),                    updatePrescription);
router.delete('/:id', authorize('admin'),                                          deletePrescription);

module.exports = router;
