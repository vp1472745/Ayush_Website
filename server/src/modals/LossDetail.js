const mongoose = require('mongoose');

const lossDetailSchema = new mongoose.Schema(
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
    trackingId: {
      type: String,
      default: '',
      trim: true,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    reason: {
      type: String,
      default: 'Parcel damage/loss',
      trim: true,
    },
    riderName: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Recovered', 'Not Recovered'],
      default: 'Not Recovered',
    },
    remark: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('LossDetail', lossDetailSchema);
