const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const companyRoutes = require('./companyRoutes');
const riderPayoutRoutes = require('./riderPayoutRoutes');
const lossDetailRoutes = require('./lossDetailRoutes');
const hubExpenseRoutes = require('./hubExpenseRoutes');
const paymentLedgerRoutes = require('./paymentLedgerRoutes');
const advanceRoutes = require('./advanceRoutes');
const myPaymentRoutes = require('./myPaymentRoutes');

// API Health Check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Ayush Rider Portal API Server is running smoothly!',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
router.use('/auth', authRoutes);
router.use('/companies', companyRoutes);
router.use('/rider-payouts', riderPayoutRoutes);
router.use('/loss-details', lossDetailRoutes);
router.use('/hub-expenses', hubExpenseRoutes);
router.use('/payments', paymentLedgerRoutes);
router.use('/advances', advanceRoutes);
router.use('/my-payments', myPaymentRoutes);

module.exports = router;
