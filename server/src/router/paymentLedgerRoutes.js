import express from 'express';
import {
  getPayments,
  updatePaymentStatus,
  createPayment,
} from '../controller/paymentLedgerController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getPayments)
  .post(createPayment);

router.patch('/:id/status', updatePaymentStatus);

export default router;
