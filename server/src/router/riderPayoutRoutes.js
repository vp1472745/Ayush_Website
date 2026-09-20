const express = require('express');
const router = express.Router();
const {
  getRiderPayouts,
  createRiderPayout,
  bulkImportRiderPayouts,
  updateRiderPayout,
  deleteRiderPayout,
  bulkDeleteRiderPayouts,
  sendPayoutEmail,
} = require('../controller/riderPayoutController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getRiderPayouts)
  .post(createRiderPayout);

router.post('/bulk-import', bulkImportRiderPayouts);
router.post('/bulk-delete', bulkDeleteRiderPayouts);
router.post('/send-email', sendPayoutEmail);

router.route('/:id')
  .patch(updateRiderPayout)
  .delete(deleteRiderPayout);

module.exports = router;
