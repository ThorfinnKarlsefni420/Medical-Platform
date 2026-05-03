const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const {
  getAllAdmissions,
  getAdmissionById,
  createAdmission,
  updateAdmission,
  deleteAdmission,
} = require('../controllers/admissionController');

router.use(authenticate);

router.get('/',    authorize('admin', 'doctor', 'nurse'),    getAllAdmissions);
router.get('/:id', authorize('admin', 'doctor', 'nurse'),    getAdmissionById);
router.post('/',   authorize('admin', 'doctor'),              createAdmission);
router.put('/:id', authorize('admin', 'doctor', 'nurse'),     updateAdmission);
router.delete('/:id', authorize('admin'),                     deleteAdmission);

module.exports = router;
