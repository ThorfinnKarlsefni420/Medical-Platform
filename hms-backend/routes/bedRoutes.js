const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const {
  getAllBeds,
  getBedById,
  createBed,
  updateBed,
  deleteBed,
} = require('../controllers/bedController');

router.use(authenticate);

router.get('/',    authorize('admin', 'doctor', 'nurse'),    getAllBeds);
router.get('/:id', authorize('admin', 'doctor', 'nurse'),    getBedById);
router.post('/',   authorize('admin'),                        createBed);
router.put('/:id', authorize('admin', 'nurse'),               updateBed);
router.delete('/:id', authorize('admin'),                     deleteBed);

module.exports = router;
