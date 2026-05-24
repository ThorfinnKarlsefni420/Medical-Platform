const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const {
  getAllLabResults,
  getLabResultById,
  createLabResult,
  updateLabResult,
  deleteLabResult,
  getMyLabResults,
} = require('../controllers/labResultController');

router.use(authenticate);

router.get('/my',  authorize('patient'),                                              getMyLabResults);
router.get('/',    authorize('admin', 'doctor', 'nurse', 'lab_technician'),           getAllLabResults);
router.get('/:id', authorize('admin', 'doctor', 'nurse', 'lab_technician', 'patient'), getLabResultById);
router.post('/',   authorize('admin', 'lab_technician'),                               createLabResult);
router.put('/:id', authorize('admin', 'doctor', 'lab_technician'),                    updateLabResult);
router.delete('/:id', authorize('admin'),                                              deleteLabResult);

module.exports = router;
