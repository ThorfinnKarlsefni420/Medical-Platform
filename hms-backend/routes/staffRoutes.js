const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const {
  getStaff,
  sendInvite,
  validateInvite,
  acceptInvite,
  updateStaffStatus,
  resendInvite,
} = require('../controllers/staffController');

// Public — no auth required
router.get('/invite/:token',         validateInvite);
router.post('/invite/:token/accept', acceptInvite);

// Admin only
router.use(authenticate);
router.get('/',                              authorize('admin'), getStaff);
router.post('/invite',                       authorize('admin'), sendInvite);
router.patch('/:id/status',                  authorize('admin'), updateStaffStatus);
router.post('/invites/:inviteId/resend',     authorize('admin'), resendInvite);

module.exports = router;
