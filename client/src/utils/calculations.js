/**
 * Calculation Architecture
 * 
 * IMPORTANT:
 * DO NOT invent or hardcode complex business formulas in UI components.
 * Real formulas will be plugged into these utility functions later.
 * Currently returns mock values or basic data aggregations.
 */

/**
 * Calculate rider payout based on exact Google Sheet formula:
 * =sum(Primary * RateCard + Clubbed * 6)
 */
export const calculateRiderPayout = (riderOrPrimary, clubbedArg, rateCardArg) => {
  if (typeof riderOrPrimary === 'object' && riderOrPrimary !== null) {
    const primary = Number(riderOrPrimary.primary) || 0;
    const clubbed = Number(riderOrPrimary.clubbed) || 0;
    const rateCard = Number(riderOrPrimary.rateCard) || 12;
    return (primary * rateCard) + (clubbed * 6);
  }
  const primary = Number(riderOrPrimary) || 0;
  const clubbed = Number(clubbedArg) || 0;
  const rateCard = Number(rateCardArg) || 12;
  return (primary * rateCard) + (clubbed * 6);
};

/**
 * Calculate rider final payout based on exact Google Sheet formula:
 * =sum(Payout - Loss - Advance)
 */
export const calculateFinalPayout = (riderOrPayout, lossArg, advanceArg) => {
  if (typeof riderOrPayout === 'object' && riderOrPayout !== null) {
    const payout = riderOrPayout.payout !== undefined && riderOrPayout.payout !== '' && !isNaN(riderOrPayout.payout)
      ? Number(riderOrPayout.payout)
      : calculateRiderPayout(riderOrPayout);
    const loss = Number(riderOrPayout.loss) || 0;
    const advance = Number(riderOrPayout.advance) || 0;
    return payout - loss - advance;
  }
  const payout = Number(riderOrPayout) || 0;
  const loss = Number(lossArg) || 0;
  const advance = Number(advanceArg) || 0;
  return payout - loss - advance;
};

/**
 * Calculate company summary aggregations based on its riders
 */
export const calculateCompanyStats = (companyId, riders = []) => {
  const companyRiders = riders.filter((r) => r.companyId === companyId);
  
  const totalRiders = companyRiders.length;
  const totalDeliveries = companyRiders.reduce((sum, r) => sum + (Number(r.deliveredPickupTotal) || 0), 0);
  const totalPayout = companyRiders.reduce((sum, r) => sum + (Number(r.payout) || 0), 0);
  const totalLoss = companyRiders.reduce((sum, r) => sum + (Number(r.loss) || 0), 0);
  const totalAdvance = companyRiders.reduce((sum, r) => sum + (Number(r.advance) || 0), 0);
  const finalPayout = companyRiders.reduce((sum, r) => sum + (Number(r.finalPayout) || 0), 0);
  const pendingPayments = companyRiders
    .filter((r) => r.paymentStatus === 'Pending' || r.paymentStatus === 'Hold')
    .reduce((sum, r) => sum + (Number(r.finalPayout) || 0), 0);

  return {
    totalRiders,
    totalDeliveries,
    totalPayout,
    totalLoss,
    totalAdvance,
    finalPayout,
    pendingPayments,
  };
};

/**
 * Format currency with Indian Rupee symbol
 */
export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

/**
 * Format standard numbers
 */
export const formatNumber = (num) => {
  return new Intl.NumberFormat('en-IN').format(Number(num) || 0);
};
