const express = require('express');
const router = express.Router();
const {
  getLossDetails,
  createLossDetail,
  bulkImportLossDetails,
  updateLossDetail,
  deleteLossDetail,
  bulkDeleteLossDetails,
} = require('../controller/lossDetailController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getLossDetails)
  .post(createLossDetail);

router.post('/bulk-import', bulkImportLossDetails);
router.post('/bulk-delete', bulkDeleteLossDetails);

router.route('/:id')
  .patch(updateLossDetail)
  .delete(deleteLossDetail);

module.exports = router;
