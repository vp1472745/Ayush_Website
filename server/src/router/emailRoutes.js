const express = require('express');
const router = express.Router();
const { sendReportEmail } = require('../controller/emailController');

// POST /api/email/send-report
router.post('/send-report', sendReportEmail);

module.exports = router;
