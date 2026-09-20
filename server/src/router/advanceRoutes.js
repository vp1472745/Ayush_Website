const express = require('express');
const router = express.Router();
const {
  getAdvances,
  getOutstandingAdvances,
  carryForwardAdvances,
  createAdvance,
  bulkImportAdvances,
  updateAdvance,
  deleteAdvance,
  bulkDeleteAdvances,
} = require('../controller/advanceController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getAdvances)
  .post(createAdvance);

router.get('/outstanding', getOutstandingAdvances);
router.post('/carry-forward', carryForwardAdvances);
router.post('/bulk-import', bulkImportAdvances);
router.post('/bulk-delete', bulkDeleteAdvances);

router.route('/:id')
  .patch(updateAdvance)
  .delete(deleteAdvance);

module.exports = router;
