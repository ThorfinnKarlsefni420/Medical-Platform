const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
} = require('../controllers/patientController');

// All routes require a valid JWT
router.use(authenticate);

//                                    ┌── who can do it
router.get('/',    authorize('admin', 'doctor', 'nurse'),             getAllPatients);
router.get('/:id', authorize('admin', 'doctor', 'nurse', 'patient'),  getPatientById);
router.post('/',   authorize('admin', 'doctor'),                       createPatient);
router.put('/:id', authorize('admin', 'doctor'),                       updatePatient);
router.delete('/:id', authorize('admin'),                              deletePatient);

module.exports = router;
