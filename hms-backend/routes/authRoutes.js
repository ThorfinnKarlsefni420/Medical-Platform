const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const { register, login, logout, getMe, updateProfile } = require('../controllers/authController');

router.post('/register', register);
router.post('/login',    login);
router.post('/logout',   logout);
router.get('/me',        authenticate, getMe);
router.put('/profile',   authenticate, updateProfile);

module.exports = router;
