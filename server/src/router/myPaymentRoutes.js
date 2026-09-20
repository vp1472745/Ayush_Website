const express = require('express');
const router = express.Router();
const {
  getMyPayments,
  createMyPayment,
  bulkImportMyPayments,
  updateMyPayment,
  deleteMyPayment,
  bulkDeleteMyPayments,
} = require('../controller/myPaymentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getMyPayments)
  .post(createMyPayment);

router.post('/bulk-import', bulkImportMyPayments);
router.post('/bulk-delete', bulkDeleteMyPayments);

router.route('/:id')
  .patch(updateMyPayment)
  .delete(deleteMyPayment);

module.exports = router;
