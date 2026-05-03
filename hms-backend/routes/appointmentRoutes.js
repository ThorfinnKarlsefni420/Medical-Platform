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

router.get('/',    authorize('admin', 'doctor', 'nurse'),                     getAllAppointments);
router.get('/:id', authorize('admin', 'doctor', 'nurse', 'patient'),          getAppointmentById);
router.post('/',   authorize('admin', 'doctor'),                               createAppointment);
router.put('/:id', authorize('admin', 'doctor'),                               updateAppointment);
router.delete('/:id', authorize('admin'),                                      deleteAppointment);

module.exports = router;
