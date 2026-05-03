const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const {
  getAllWards,
  getWardById,
  createWard,
  updateWard,
  deleteWard,
} = require('../controllers/wardController');

router.use(authenticate);

router.get('/',    authorize('admin', 'doctor', 'nurse'),    getAllWards);
router.get('/:id', authorize('admin', 'doctor', 'nurse'),    getWardById);
router.post('/',   authorize('admin'),                        createWard);
router.put('/:id', authorize('admin'),                        updateWard);
router.delete('/:id', authorize('admin'),                     deleteWard);

module.exports = router;
