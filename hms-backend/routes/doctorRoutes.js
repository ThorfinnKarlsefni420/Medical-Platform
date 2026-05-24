const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} = require('../controllers/doctorController');

router.use(authenticate);

router.get('/',    authorize('admin', 'receptionist', 'doctor', 'nurse'),    getAllDoctors);
router.get('/:id', authorize('admin', 'receptionist', 'doctor', 'nurse'),    getDoctorById);
router.post('/',   authorize('admin'),                        createDoctor);
router.put('/:id', authorize('admin'),                        updateDoctor);
router.delete('/:id', authorize('admin'),                     deleteDoctor);

module.exports = router;
