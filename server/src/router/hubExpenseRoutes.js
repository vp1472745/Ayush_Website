const express = require('express');
const router = express.Router();
const {
  getHubExpenses,
  createHubExpense,
  bulkImportHubExpenses,
  updateHubExpense,
  deleteHubExpense,
  bulkDeleteHubExpenses,
} = require('../controller/hubExpenseController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getHubExpenses)
  .post(createHubExpense);

router.post('/bulk-import', bulkImportHubExpenses);
router.post('/bulk-delete', bulkDeleteHubExpenses);

router.route('/:id')
  .patch(updateHubExpense)
  .delete(deleteHubExpense);

module.exports = router;
