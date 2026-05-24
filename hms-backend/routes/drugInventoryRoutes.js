const express      = require('express');
const multer       = require('multer');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const {
  getAllDrugs,
  getDrugById,
  createDrug,
  updateDrug,
  adjustStock,
  deleteDrug,
  importDrugs,
} = require('../controllers/drugInventoryController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    cb(null, allowed.includes(file.mimetype) || file.originalname.match(/\.(csv|xls|xlsx)$/i));
  },
});

router.use(authenticate);

router.get('/',            authorize('admin', 'pharmacist'),        getAllDrugs);
router.get('/:id',         authorize('admin', 'pharmacist'),        getDrugById);
router.post('/',           authorize('admin', 'pharmacist'),        createDrug);
router.put('/:id',         authorize('admin', 'pharmacist'),        updateDrug);
router.patch('/:id/stock', authorize('admin', 'pharmacist'),                    adjustStock);
router.post('/import',     authorize('admin', 'pharmacist'), upload.single('file'), importDrugs);
router.delete('/:id',      authorize('admin'),                                      deleteDrug);

module.exports = router;
