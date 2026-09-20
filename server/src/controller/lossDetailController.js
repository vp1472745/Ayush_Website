import LossDetail from '../modals/LossDetail.js';

// @desc    Get all loss details filtered by company & month
// @route   GET /api/loss-details
// @access  Private
export const getLossDetails = async (req, res, next) => {
  try {
    const { companyId, month } = req.query;
    const filter = {};

    if (companyId && companyId !== 'all') {
      filter.companyId = companyId;
    }
    if (month && month !== 'all') {
      filter.month = month;
    }

    const lossItems = await LossDetail.find(filter)
      .populate('companyId', 'name code')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: lossItems.length,
      data: lossItems,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create single loss detail record
// @route   POST /api/loss-details
// @access  Private
export const createLossDetail = async (req, res, next) => {
  try {
    const {
      companyId,
      month,
      trackingId,
      price = 0,
      reason = 'Parcel damage/loss',
      riderName = '',
      status = 'Not Recovered',
      remark,
      ayushRemark,
    } = req.body;

    if (!companyId || !month) {
      res.status(400);
      throw new Error('Company and Month are required.');
    }

    const rawStat = (status || '').toString().trim().toLowerCase();
    const validStat = (rawStat === 'recovered' || rawStat === 'recover') ? 'Recovered' : 'Not Recovered';

    const lossItem = new LossDetail({
      companyId,
      month,
      trackingId: trackingId || `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`,
      price: Number(price) || 0,
      reason: reason || 'Parcel damage/loss',
      riderName: riderName ? riderName.trim() : '',
      status: validStat,
      remark: (remark ?? ayushRemark ?? '').toString().trim(),
    });

    const saved = await lossItem.save();
    await saved.populate('companyId', 'name code');

    res.status(201).json({
      success: true,
      message: 'Loss detail entry created',
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk Import CSV/Excel Loss Details (defaults to Not Recovered if empty/missing)
// @route   POST /api/loss-details/bulk-import
// @access  Private
export const bulkImportLossDetails = async (req, res, next) => {
  try {
    const { companyId, month, rows } = req.body;

    if (!companyId || !month || !Array.isArray(rows) || rows.length === 0) {
      res.status(400);
      throw new Error('Valid companyId, month, and array of loss rows are required.');
    }

    const docsToInsert = rows.map((r, index) => {
      const rawStat = (r.status || '').toString().trim().toLowerCase();
      const validStat = (rawStat === 'recovered' || rawStat === 'recover') ? 'Recovered' : 'Not Recovered';

      return {
        companyId,
        month,
        trackingId: r.trackingId || `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`,
        price: Number(r.price) || 0,
        reason: r.reason || 'Parcel damage/loss',
        riderName: r.riderName || '',
        status: validStat,
        remark: (r.remark ?? r.ayushRemark ?? '').toString().trim(),
      };
    });

    const inserted = await LossDetail.insertMany(docsToInsert);

    res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} loss records with default 'Not Recovered' status!`,
      count: inserted.length,
      data: inserted,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update single loss detail field or entire record
// @route   PATCH /api/loss-details/:id
// @access  Private
export const updateLossDetail = async (req, res, next) => {
  try {
    const lossItem = await LossDetail.findById(req.params.id);
    if (!lossItem) {
      res.status(404);
      throw new Error('Loss detail entry not found.');
    }

    if (req.body.trackingId !== undefined) lossItem.trackingId = req.body.trackingId;
    if (req.body.price !== undefined) lossItem.price = Number(req.body.price) || 0;
    if (req.body.reason !== undefined) lossItem.reason = req.body.reason;
    if (req.body.riderName !== undefined) lossItem.riderName = req.body.riderName;
    if (req.body.status !== undefined) {
      const rawStat = (req.body.status || '').toString().trim().toLowerCase();
      lossItem.status = (rawStat === 'recovered' || rawStat === 'recover') ? 'Recovered' : 'Not Recovered';
    }
    if (req.body.month !== undefined) lossItem.month = req.body.month;
    if (req.body.companyId !== undefined) lossItem.companyId = req.body.companyId;
    if (req.body.remark !== undefined) lossItem.remark = (req.body.remark || '').trim();
    if (req.body.ayushRemark !== undefined) lossItem.remark = (req.body.ayushRemark || '').trim();

    const updated = await lossItem.save();
    await updated.populate('companyId', 'name code');

    res.json({
      success: true,
      message: 'Loss detail entry updated',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete loss detail record
// @route   DELETE /api/loss-details/:id
// @access  Private
export const deleteLossDetail = async (req, res, next) => {
  try {
    const lossItem = await LossDetail.findById(req.params.id);
    if (!lossItem) {
      res.status(404);
      throw new Error('Loss detail entry not found.');
    }

    await LossDetail.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Loss detail entry deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk Delete loss detail records
// @route   POST /api/loss-details/bulk-delete
// @access  Private
export const bulkDeleteLossDetails = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400);
      throw new Error('Array of IDs is required for bulk deletion.');
    }

    await LossDetail.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: `Successfully deleted ${ids.length} loss records.`,
      count: ids.length,
    });
  } catch (error) {
    next(error);
  }
};
