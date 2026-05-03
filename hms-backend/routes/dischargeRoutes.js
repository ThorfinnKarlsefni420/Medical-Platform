const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const {
  getAllDischarges,
  getDischargeById,
  createDischarge,
  updateDischarge,
  deleteDischarge,
} = require('../controllers/dischargeController');

router.use(authenticate);

router.get('/',    authorize('admin', 'doctor'),              getAllDischarges);
router.get('/:id', authorize('admin', 'doctor', 'nurse'),     getDischargeById);
router.post('/',   authorize('admin', 'doctor'),              createDischarge);
router.put('/:id', authorize('admin', 'doctor'),              updateDischarge);
router.delete('/:id', authorize('admin'),                     deleteDischarge);

module.exports = router;
