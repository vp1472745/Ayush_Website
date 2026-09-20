const express = require('express');
const router = express.Router();
const {
  loginAdmin,
  getProfile,
  updateProfile,
  uploadAvatar,
} = require('../controller/authController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public route: Only login is accessible (No registration endpoint as requested!)
router.post('/login', loginAdmin);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/upload-avatar', protect, upload.single('avatar'), uploadAvatar);

module.exports = router;
