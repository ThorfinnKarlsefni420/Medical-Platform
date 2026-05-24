const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} = require('../controllers/appointmentController');

router.use(authenticate);

router.get('/',    authorize('admin', 'receptionist', 'doctor', 'nurse'),                     getAllAppointments);
router.get('/:id', authorize('admin', 'receptionist', 'doctor', 'nurse', 'patient'),          getAppointmentById);
router.post('/',   authorize('admin', 'receptionist', 'doctor'),                               createAppointment);
router.put('/:id', authorize('admin', 'receptionist', 'doctor'),                               updateAppointment);
router.delete('/:id', authorize('admin'),                                                      deleteAppointment);

module.exports = router;
