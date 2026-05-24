const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const {
  getAllLabOrders,
  getLabOrderById,
  getAdmissionLabOrders,
  createLabOrder,
  updateLabOrder,
  deleteLabOrder,
} = require('../controllers/labOrderController');

router.use(authenticate);

router.get('/',                       authorize('admin', 'doctor', 'lab_technician'),          getAllLabOrders);
router.get('/admission/:admissionId', authorize('admin', 'doctor', 'nurse', 'lab_technician'), getAdmissionLabOrders);
router.get('/:id',                    authorize('admin', 'doctor', 'lab_technician'),          getLabOrderById);
router.post('/',   authorize('admin', 'doctor'),                       createLabOrder);
router.put('/:id', authorize('admin', 'doctor', 'lab_technician'),    updateLabOrder);
router.delete('/:id', authorize('admin'),                              deleteLabOrder);

module.exports = router;
