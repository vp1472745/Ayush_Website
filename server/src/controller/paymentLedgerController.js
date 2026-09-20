const PaymentLedger = require('../modals/PaymentLedger');
const RiderPayout = require('../modals/RiderPayout');

// @desc    Get all payment ledger records filtered by company & month
// @route   GET /api/payments
// @access  Private
const getPayments = async (req, res, next) => {
  try {
    const { companyId, month, status } = req.query;
    const filter = {};

    if (companyId && companyId !== 'all') {
      filter.companyId = companyId;
    }
    if (month && month !== 'all') {
      filter.month = month;
    }
    if (status && status !== 'ALL') {
      filter.paymentStatus = new RegExp(`^${status}$`, 'i');
    }

    const payments = await PaymentLedger.find(filter)
      .populate('companyId', 'name code')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update single payment status in ledger and sync with RiderPayout
// @route   PATCH /api/payments/:id/status
// @access  Private
const updatePaymentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      res.status(400);
      throw new Error('Status is required.');
    }

    const payment = await PaymentLedger.findById(req.params.id);
    if (!payment) {
      res.status(404);
      throw new Error('Payment record not found.');
    }

    const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    payment.paymentStatus = normalizedStatus;
    const updated = await payment.save();
    await updated.populate('companyId', 'name code');

    // Also update matching RiderPayout if present
    if (payment.payoutId) {
      await RiderPayout.findByIdAndUpdate(payment.payoutId, {
        paymentStatus: status.toUpperCase(),
      });
    }

    res.json({
      success: true,
      message: 'Payment status updated',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create manual payment disbursement voucher
// @route   POST /api/payments
// @access  Private
const createPayment = async (req, res, next) => {
  try {
    const {
      companyId,
      month,
      riderName,
      riderId,
      payout = 0,
      loss = 0,
      advance = 0,
      paymentStatus = 'Paid',
      paymentDate,
      remark,
    } = req.body;

    if (!companyId || !month || !riderName) {
      res.status(400);
      throw new Error('Company, Month, and Rider Name are required.');
    }

    const grossPayout = Number(payout) || 0;
    const lossDed = Number(loss) || 0;
    const advDed = Number(advance) || 0;
    const finalPayout = grossPayout - lossDed - advDed;

    const payment = await PaymentLedger.create({
      transactionId: `TXN-${Date.now().toString().slice(-6)}`,
      companyId,
      month,
      riderName,
      riderId: riderId || `${Math.floor(100000 + Math.random() * 900000)}`,
      payout: grossPayout,
      loss: lossDed,
      advance: advDed,
      finalPayout,
      paymentStatus: paymentStatus || 'Paid',
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      remark: remark || 'Direct Bank Disbursement',
    });

    await payment.populate('companyId', 'name code');

    res.status(201).json({
      success: true,
      message: 'Payment disbursement voucher recorded',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPayments,
  updatePaymentStatus,
  createPayment,
};
