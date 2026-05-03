const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const {
  getAllDispensings,
  getDispensingById,
  createDispensing,
  updateDispensing,
  deleteDispensing,
} = require('../controllers/dispensingController');

router.use(authenticate);

router.get('/',    authorize('admin', 'pharmacist'),    getAllDispensings);
router.get('/:id', authorize('admin', 'pharmacist'),    getDispensingById);
router.post('/',   authorize('admin', 'pharmacist'),    createDispensing);
router.put('/:id', authorize('admin', 'pharmacist'),    updateDispensing);
router.delete('/:id', authorize('admin'),               deleteDispensing);

module.exports = router;
