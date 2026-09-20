const mongoose = require('mongoose');

const hubExpenseSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    month: {
      type: String,
      required: true,
      index: true,
    },
    expenseName: {
      type: String,
      required: [true, 'Expense name is required'],
      trim: true,
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    date: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('HubExpense', hubExpenseSchema);
