const express = require('express');
const router = express.Router();
const {
  getPayments,
  updatePaymentStatus,
  createPayment,
} = require('../controller/paymentLedgerController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getPayments)
  .post(createPayment);

router.patch('/:id/status', updatePaymentStatus);

module.exports = router;
