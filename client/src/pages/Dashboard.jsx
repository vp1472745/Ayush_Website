import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee,
  Users,
  Building2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  AlertTriangle,
  ChevronRight,
  Bell,
  Check,
  CreditCard,
  CheckCircle2,
  RotateCw,
  Tag,
  Receipt,
  Plus,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { useTabRefresh } from '../context/RefreshContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatNumber } from '../utils/calculations';
import apiClient from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';

// Company matching helper - checks ObjectId or string ID
const isCompanyMatch = (recordComp, filterCompId) => {
  if (!filterCompId || filterCompId === 'all') return true;
  if (!recordComp) return false;
  const rawId = recordComp?._id || recordComp?.id || recordComp;
  return String(rawId).trim().toLowerCase() === String(filterCompId).trim().toLowerCase();
};

// Flexible cycle matching helper
const isCycleMatch = (recordCycle, filterCycle) => {
  if (!filterCycle || filterCycle === 'all') return true;
  if (!recordCycle) return false;
  const rc = recordCycle.toLowerCase().trim();
  const fc = filterCycle.toLowerCase().trim();
  if (rc === fc) return true;
  if ((fc.includes('cycle 1') || fc.includes('1st')) && (rc.includes('cycle 1') || rc.includes('1st'))) return true;
  if ((fc.includes('cycle 2') || fc.includes('16th')) && (rc.includes('cycle 2') || rc.includes('16th'))) return true;
  if (fc.includes('week 1') && rc.includes('week 1')) return true;
  if (fc.includes('week 2') && rc.includes('week 2')) return true;
  if (fc.includes('week 3') && rc.includes('week 3')) return true;
  if (fc.includes('week 4') && rc.includes('week 4')) return true;
  return false;
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const {
    companies,
    selectedCompanyFilter,
    selectedMonthFilter,
    selectedFinancialYear,
    selectedCycleFilter,
    fetchCompanies,
  } = useCompany();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState('');
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);
  const [hoveredCategory, setHoveredCategory] = useState(null);

  // Datasets from API
  const [myPayments, setMyPayments] = useState([]);
  const [riderPayouts, setRiderPayouts] = useState([]);
  const [hubExpenses, setHubExpenses] = useState([]);
  const [lossDetails, setLossDetails] = useState([]);
  const [advances, setAdvances] = useState([]);

  // Active companies
  const activeCompanies = useMemo(() => {
    return (companies || []).filter((c) => c.status === 'Active');
  }, [companies]);

  // Selected company object (if any)
  const isAllCompanies = !selectedCompanyFilter || selectedCompanyFilter === 'all';
  const isAllCycles = !selectedCycleFilter || selectedCycleFilter === 'all';
  const selectedCompany = useMemo(() => {
    if (isAllCompanies) return null;
    return (companies || []).find((c) => String(c.id || c._id) === String(selectedCompanyFilter)) || null;
  }, [companies, selectedCompanyFilter, isAllCompanies]);

  // Load all dashboard financial datasets (month & financial year governed by global header)
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const monthParams = (selectedMonthFilter && selectedMonthFilter !== 'all') ? { month: selectedMonthFilter } : {};
      const paymentParams = { ...monthParams };
      if (selectedFinancialYear && selectedFinancialYear !== 'all') {
        paymentParams.financialYear = selectedFinancialYear;
      }

      const [
        myPaymentsRes,
        riderPayoutsRes,
        hubExpensesRes,
        lossDetailsRes,
        advancesRes,
      ] = await Promise.allSettled([
        apiClient.get(ENDPOINTS.MY_PAYMENTS.GET_ALL, { params: paymentParams }),
        apiClient.get(ENDPOINTS.RIDER_PAYOUTS.GET_ALL, { params: monthParams }),
        apiClient.get(ENDPOINTS.HUB_EXPENSES.GET_ALL, { params: monthParams }),
        apiClient.get(ENDPOINTS.LOSS_DETAILS.GET_ALL, { params: monthParams }),
        apiClient.get(ENDPOINTS.ADVANCES.GET_ALL),
      ]);

      const extractList = (res) => {
        if (res.status !== 'fulfilled') return [];
        const val = res.value;
        if (Array.isArray(val)) return val;
        if (Array.isArray(val?.data)) return val.data;
        if (Array.isArray(val?.data?.data)) return val.data.data;
        return [];
      };

      setMyPayments(extractList(myPaymentsRes));
      setRiderPayouts(extractList(riderPayoutsRes));
      setHubExpenses(extractList(hubExpensesRes));
      setLossDetails(extractList(lossDetailsRes));
      setAdvances(extractList(advancesRes));

      const now = new Date();
      setLastUpdatedTime(
        `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`
      );
    } catch (err) {
      console.error('[Dashboard Data Load Error]:', err);
      toast.error('Failed to refresh dashboard data');
    } finally {
      setLoading(false);
    }
  }, [selectedMonthFilter, selectedFinancialYear, toast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useTabRefresh(() => {
    loadDashboardData();
    if (typeof fetchCompanies === 'function') fetchCompanies();
  });

  // -------------------------------------------------------------
  // FILTERED DATASETS ACCORDING TO HEADER FILTERS
  // -------------------------------------------------------------
  // Filtered Franchise Payments (MyPayment collection)
  const filteredPayments = useMemo(() => {
    return myPayments.filter((p) => {
      const matchComp = isAllCompanies || isCompanyMatch(p.companyId, selectedCompanyFilter);
      const matchCycle = isAllCycles || isCycleMatch(p.cycle, selectedCycleFilter);
      return matchComp && matchCycle;
    });
  }, [myPayments, selectedCompanyFilter, isAllCompanies, selectedCycleFilter, isAllCycles]);

  // Filtered Rider Payouts
  const filteredRiderPayouts = useMemo(() => {
    return riderPayouts.filter((r) => {
      return isAllCompanies || isCompanyMatch(r.companyId, selectedCompanyFilter);
    });
  }, [riderPayouts, selectedCompanyFilter, isAllCompanies]);

  // Filtered Loss Details
  const filteredLossDetails = useMemo(() => {
    return lossDetails.filter((l) => {
      return isAllCompanies || isCompanyMatch(l.companyId, selectedCompanyFilter);
    });
  }, [lossDetails, selectedCompanyFilter, isAllCompanies]);

  // Filtered Hub Expenses (Company direct expenses or shared overheads)
  const filteredHubExpenses = useMemo(() => {
    if (isAllCompanies) return hubExpenses;
    return hubExpenses.filter((e) => {
      return !e.companyId || isCompanyMatch(e.companyId, selectedCompanyFilter);
    });
  }, [hubExpenses, selectedCompanyFilter, isAllCompanies]);

  // Filtered Advances
  const filteredAdvances = useMemo(() => {
    if (isAllCompanies) return advances;
    return advances.filter((a) => {
      return !a.companyId || isCompanyMatch(a.companyId, selectedCompanyFilter);
    });
  }, [advances, selectedCompanyFilter, isAllCompanies]);

  // -------------------------------------------------------------
  // COMPUTED TOP METRICS (100% REAL FROM DATABASE, ZERO DUMMY DATA)
  // -------------------------------------------------------------
  // 1. Franchise Revenue Received (from MyPayment)
  const totalRevenue = useMemo(() => {
    return filteredPayments.reduce((s, p) => {
      const val = Number(p.amount) || Number(p.finalPayable) || 0;
      return s + val;
    }, 0);
  }, [filteredPayments]);

  // 2. Rider Payout Cost
  const totalRiderPayout = useMemo(() => {
    return filteredRiderPayouts.reduce((s, r) => s + (Number(r.finalPayout) || Number(r.payout) || 0), 0);
  }, [filteredRiderPayouts]);

  // 2b. Rate Card Average across filtered riders
  const avgRateCard = useMemo(() => {
    const ridersWithRate = filteredRiderPayouts.filter((r) => Number(r.rateCard) > 0);
    if (ridersWithRate.length === 0) return 0;
    const total = ridersWithRate.reduce((s, r) => s + Number(r.rateCard), 0);
    const avg = total / ridersWithRate.length;
    return Number(avg.toFixed(2));
  }, [filteredRiderPayouts]);

  const ridersWithRateCount = useMemo(() => {
    return filteredRiderPayouts.filter((r) => Number(r.rateCard) > 0).length;
  }, [filteredRiderPayouts]);

  // 3. Hub Expenses (office + operations)
  const totalHubExpenses = useMemo(() => {
    return filteredHubExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  }, [filteredHubExpenses]);

  // 4. Losses & Deductions
  const totalLoss = useMemo(() => {
    return filteredLossDetails.reduce((s, l) => s + (Number(l.price) || 0), 0);
  }, [filteredLossDetails]);

  const unrecoveredLoss = useMemo(() => {
    return filteredLossDetails
      .filter((l) => (l.status || '').toLowerCase() !== 'recovered')
      .reduce((s, l) => s + (Number(l.price) || 0), 0);
  }, [filteredLossDetails]);

  const recoveredLoss = useMemo(() => {
    return filteredLossDetails
      .filter((l) => (l.status || '').toLowerCase() === 'recovered')
      .reduce((s, l) => s + (Number(l.price) || 0), 0);
  }, [filteredLossDetails]);

  // 5. Advances
  const totalAdvanceGiven = useMemo(() => {
    return filteredAdvances.reduce((s, a) => s + (Number(a.advance) || 0), 0);
  }, [filteredAdvances]);

  const totalAdvanceRecovered = useMemo(() => {
    return filteredAdvances.reduce((s, a) => s + (Number(a.advanceCut) || 0), 0);
  }, [filteredAdvances]);

  const totalAdvanceOutstanding = useMemo(() => {
    return filteredAdvances.reduce((s, a) => {
      const rem = Number(a.remainingAmount);
      if (!isNaN(rem) && rem !== undefined && rem !== null && rem > 0) return s + rem;
      const adv = Number(a.advance) || 0;
      const cut = Number(a.advanceCut) || 0;
      return s + Math.max(0, adv - cut);
    }, 0);
  }, [filteredAdvances]);

  // 6. Net Business Profit = Revenue - Rider Payout - Hub Expenses - Unrecovered Loss
  const netProfit = useMemo(() => {
    return totalRevenue - totalRiderPayout - totalHubExpenses - unrecoveredLoss;
  }, [totalRevenue, totalRiderPayout, totalHubExpenses, unrecoveredLoss]);

  // 7. Total Money Out = Rider Payout + Hub Expenses + Unrecovered Loss + Advances Given
  const totalMoneyOut = useMemo(() => {
    return totalRiderPayout + totalHubExpenses + unrecoveredLoss + totalAdvanceGiven;
  }, [totalRiderPayout, totalHubExpenses, unrecoveredLoss, totalAdvanceGiven]);

  // 8. Opening & Closing Balance
  const openingBalance = 0;
  const closingBalance = useMemo(() => {
    return openingBalance + totalRevenue - totalMoneyOut;
  }, [openingBalance, totalRevenue, totalMoneyOut]);

  // 9. Rider stats
  const riderStats = useMemo(() => {
    const total = filteredRiderPayouts.length;
    const paid = filteredRiderPayouts.filter((r) => (r.paymentStatus || '').toUpperCase() === 'PAID').length;
    const pending = total - paid;
    const paidAmount = filteredRiderPayouts
      .filter((r) => (r.paymentStatus || '').toUpperCase() === 'PAID')
      .reduce((s, r) => s + (Number(r.finalPayout) || Number(r.payout) || 0), 0);
    const pendingAmount = filteredRiderPayouts
      .filter((r) => (r.paymentStatus || '').toUpperCase() !== 'PAID')
      .reduce((s, r) => s + (Number(r.finalPayout) || Number(r.payout) || 0), 0);
    return { total, paid, pending, paidAmount, pendingAmount };
  }, [filteredRiderPayouts]);

  // 10. Advance stats
  const advanceStats = useMemo(() => {
    const total = filteredAdvances.length;
    const recovered = filteredAdvances.filter((a) => {
      const rem = Number(a.remainingAmount);
      const adv = Number(a.advance) || 0;
      const cut = Number(a.advanceCut) || 0;
      return rem === 0 || (adv > 0 && cut >= adv);
    }).length;
    const pending = total - recovered;
    return { total, recovered, pending };
  }, [filteredAdvances]);

  // 11. Loss stats
  const lossStats = useMemo(() => {
    const total = filteredLossDetails.length;
    const recovered = filteredLossDetails.filter((l) => (l.status || '').toLowerCase() === 'recovered').length;
    const pending = total - recovered;
    return { total, recovered, pending };
  }, [filteredLossDetails]);

  // -------------------------------------------------------------
  // MONEY IN BY COMPANY (Real Franchise Payments for selected period)
  // -------------------------------------------------------------
  const moneyInByCompany = useMemo(() => {
    const targetCompanies = isAllCompanies
      ? activeCompanies
      : activeCompanies.filter((c) => isCompanyMatch(c.id || c._id, selectedCompanyFilter));

    return targetCompanies.map((comp) => {
      const compId = comp.id || comp._id;
      const compPayments = myPayments.filter((p) => {
        const matchComp = isCompanyMatch(p.companyId, compId);
        const matchCycle = isAllCycles || isCycleMatch(p.cycle, selectedCycleFilter);
        return matchComp && matchCycle;
      });

      const amount = compPayments.reduce((s, p) => s + (Number(p.amount) || Number(p.finalPayable) || 0), 0);

      return {
        id: compId,
        name: comp.name,
        amount,
        isSelected: !isAllCompanies && isCompanyMatch(compId, selectedCompanyFilter),
      };
    });
  }, [activeCompanies, myPayments, isAllCompanies, selectedCompanyFilter, isAllCycles, selectedCycleFilter]);

  // -------------------------------------------------------------
  // FRANCHISE PERFORMANCE TABLE (Matrix by Company from Real DB Data)
  // -------------------------------------------------------------
  const franchisePerformance = useMemo(() => {
    const targetCompanies = isAllCompanies
      ? activeCompanies
      : activeCompanies.filter((c) => isCompanyMatch(c.id || c._id, selectedCompanyFilter));

    return targetCompanies.map((comp) => {
      const compId = comp.id || comp._id;

      // Real income from Franchise Payments (MyPayment)
      const compPayments = myPayments.filter((p) => {
        const matchComp = isCompanyMatch(p.companyId, compId);
        const matchCycle = isAllCycles || isCycleMatch(p.cycle, selectedCycleFilter);
        return matchComp && matchCycle;
      });
      const income = compPayments.reduce((s, p) => s + (Number(p.amount) || Number(p.finalPayable) || 0), 0);

      // Real rider payout
      const compRiders = riderPayouts.filter((p) => isCompanyMatch(p.companyId, compId));
      const payout = compRiders.reduce((s, p) => s + (Number(p.finalPayout) || Number(p.payout) || 0), 0);

      // Real unrecovered loss
      const compLoss = lossDetails
        .filter((l) => isCompanyMatch(l.companyId, compId) && (l.status || '').toLowerCase() !== 'recovered')
        .reduce((s, l) => s + (Number(l.price) || 0), 0);

      // Real hub expenses (direct + shared proportion)
      const directExp = hubExpenses
        .filter((e) => isCompanyMatch(e.companyId, compId))
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);

      const sharedExp = hubExpenses
        .filter((e) => !e.companyId)
        .reduce((s, e) => s + (Number(e.amount) || 0), 0) / (activeCompanies.length || 1);

      const hubExpense = directExp + Math.round(sharedExp);
      const otherExpense = 0;
      const myPayment = 0;
      const compNetProfit = income - payout - hubExpense - compLoss;

      return {
        companyId: compId,
        name: comp.name,
        income,
        payout,
        hubExpense,
        otherExpense,
        loss: compLoss,
        myPayment,
        netProfit: compNetProfit,
        isSelected: !isAllCompanies && isCompanyMatch(compId, selectedCompanyFilter),
      };
    });
  }, [activeCompanies, myPayments, riderPayouts, lossDetails, hubExpenses, isAllCompanies, selectedCompanyFilter, isAllCycles, selectedCycleFilter]);

  // Aggregate totals across all companies for the performance matrix table
  const allCompaniesTotals = useMemo(() => {
    return franchisePerformance.reduce(
      (acc, f) => ({
        income: acc.income + f.income,
        payout: acc.payout + f.payout,
        hubExpense: acc.hubExpense + f.hubExpense,
        otherExpense: acc.otherExpense + f.otherExpense,
        loss: acc.loss + f.loss,
        myPayment: acc.myPayment + f.myPayment,
        netProfit: acc.netProfit + f.netProfit,
      }),
      { income: 0, payout: 0, hubExpense: 0, otherExpense: 0, loss: 0, myPayment: 0, netProfit: 0 }
    );
  }, [franchisePerformance]);

  // -------------------------------------------------------------
  // DYNAMIC BAR CHART SCALING (Adaptive multi-tier scaling)
  // -------------------------------------------------------------
  const chartMaxVal = useMemo(() => {
    let max = 0;
    franchisePerformance.forEach((f) => {
      const exp = f.payout + f.hubExpense;
      const prof = Math.max(0, f.netProfit);
      max = Math.max(max, f.income, exp, prof);
    });
    if (max <= 0) return 1000;
    if (max <= 500) return 500;
    if (max <= 1000) return 1000;
    if (max <= 2500) return 2500;
    if (max <= 5000) return 5000;
    if (max <= 10000) return 10000;
    if (max <= 25000) return 25000;
    if (max <= 50000) return 50000;
    if (max <= 100000) return 100000;
    return Math.ceil(max / 50000) * 50000;
  }, [franchisePerformance]);

  // -------------------------------------------------------------
  // DYNAMIC EXPENSE BREAKDOWN (From real Hub Expenses)
  // -------------------------------------------------------------
  const expenseCategories = useMemo(() => {
    if (filteredHubExpenses.length === 0) return [];

    const catMap = {};
    filteredHubExpenses.forEach((e) => {
      const name = (e.expenseName || 'General').trim();
      const amt = Number(e.amount) || 0;
      catMap[name] = (catMap[name] || 0) + amt;
    });

    const total = Object.values(catMap).reduce((s, v) => s + v, 0);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

    return Object.entries(catMap).map(([name, amount], idx) => {
      const percent = total > 0 ? Math.round((amount / total) * 100) : 0;
      return {
        name,
        color: colors[idx % colors.length],
        percent,
        amount,
      };
    });
  }, [filteredHubExpenses]);

  const activeExpenseCategory = useMemo(() => {
    if (!hoveredCategory) return null;
    return expenseCategories.find((c) => c.name === hoveredCategory) || null;
  }, [hoveredCategory, expenseCategories]);

  // -------------------------------------------------------------
  // DYNAMIC SHIPMENT SUMMARY (From real Rider Payouts)
  // -------------------------------------------------------------
  const shipmentSummary = useMemo(() => {
    const targetCompanies = isAllCompanies
      ? activeCompanies
      : activeCompanies.filter((c) => isCompanyMatch(c.id || c._id, selectedCompanyFilter));

    const rows = targetCompanies.map((c) => {
      const compId = c.id || c._id;
      const compRiders = riderPayouts.filter((r) => isCompanyMatch(r.companyId, compId));

      const delivered = compRiders.reduce((s, r) => s + (Number(r.delivered) || 0), 0);
      const pickup = compRiders.reduce((s, r) => s + (Number(r.pickup) || 0), 0);
      const primary = compRiders.reduce((s, r) => s + (Number(r.primary) || 0), 0);
      const clubbed = compRiders.reduce((s, r) => s + (Number(r.clubbed) || 0), 0);
      const total = compRiders.reduce(
        (s, r) =>
          s +
          (Number(r.deliveredPickupTotal) ||
            (Number(r.delivered) || 0) +
            (Number(r.pickup) || 0) +
            (Number(r.primary) || 0) +
            (Number(r.clubbed) || 0)),
        0
      );

      return {
        id: compId,
        name: c.name,
        total,
        delivered: delivered || (primary + clubbed),
        rto: 0,
        oda: 0,
        pending: pickup,
      };
    });

    const totals = rows.reduce(
      (acc, r) => ({
        total: acc.total + r.total,
        delivered: acc.delivered + r.delivered,
        rto: acc.rto + r.rto,
        oda: acc.oda + r.oda,
        pending: acc.pending + r.pending,
      }),
      { total: 0, delivered: 0, rto: 0, oda: 0, pending: 0 }
    );

    return { rows, totals };
  }, [activeCompanies, riderPayouts, isAllCompanies, selectedCompanyFilter]);

  // -------------------------------------------------------------
  // ATTENTION REQUIRED ITEMS (Real Pending Tasks)
  // -------------------------------------------------------------
  const attentionItems = useMemo(() => {
    const items = [];
    if (riderStats.pending > 0) {
      items.push({
        id: 'riders',
        icon: Users,
        iconColor: 'text-rose-500',
        title: `${riderStats.pending} Rider Payments Pending`,
        value: formatCurrency(riderStats.pendingAmount),
        path: '/payout-details',
      });
    }
    if (totalAdvanceOutstanding > 0) {
      items.push({
        id: 'advances',
        icon: Wallet,
        iconColor: 'text-amber-500',
        title: `${formatCurrency(totalAdvanceOutstanding)} Advance Outstanding`,
        value: `${advanceStats.pending} Riders`,
        path: '/advanced',
      });
    }
    if (unrecoveredLoss > 0) {
      items.push({
        id: 'losses',
        icon: AlertTriangle,
        iconColor: 'text-rose-500',
        title: `${formatCurrency(unrecoveredLoss)} Loss Recovery Pending`,
        value: `${lossStats.pending} Incidents`,
        path: '/loss-details',
      });
    }
    const pendingPayments = filteredPayments.filter((p) => p.status === 'Pending');
    if (pendingPayments.length > 0) {
      const pendingPayAmt = pendingPayments.reduce((s, p) => s + (Number(p.amount) || Number(p.finalPayable) || 0), 0);
      items.push({
        id: 'franchise-payments',
        icon: IndianRupee,
        iconColor: 'text-blue-500',
        title: `${pendingPayments.length} Franchise Payments Pending`,
        value: formatCurrency(pendingPayAmt),
        path: '/my-payment',
      });
    }
    return items;
  }, [riderStats, totalAdvanceOutstanding, advanceStats, unrecoveredLoss, lossStats, filteredPayments]);

  return (
    <div className="space-y-4 pb-8">
      {/* 1. TOP 5 EXECUTIVE KPI CARDS (Simple, Clean, Low-Height) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* Card 1: Franchise Revenue */}
        <div
          onClick={() => navigate('/my-payment')}
          className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-gray-500 truncate leading-tight">
              Franchise Revenue
            </div>
            <div className="text-xl font-bold text-gray-900 leading-tight mt-0.5">
              {formatCurrency(totalRevenue)}
            </div>
            <div className="text-[11px] text-gray-400 truncate mt-0.5">
              {filteredPayments.length > 0
                ? `${filteredPayments.length} Payment Cycle${filteredPayments.length > 1 ? 's' : ''}`
                : 'No payments recorded'}
            </div>
          </div>
        </div>

        {/* Card 2: Rider Payout */}
        <div
          onClick={() => navigate('/payout-details')}
          className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100/70 text-rose-500 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-gray-500 truncate leading-tight">
              Rider Payout
            </div>
            <div className="text-xl font-bold text-gray-900 leading-tight mt-0.5">
              {formatCurrency(totalRiderPayout)}
            </div>
            <div className="text-[11px] text-gray-400 truncate mt-0.5">
              {riderStats.total} Riders Total ({riderStats.pending} Pending)
            </div>
          </div>
        </div>

        {/* Card 3: Hub Expenses */}
        <div
          onClick={() => navigate('/hub-expenses')}
          className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100/70 text-amber-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-gray-500 truncate leading-tight">
              Hub Expenses
            </div>
            <div className="text-xl font-bold text-gray-900 leading-tight mt-0.5">
              {formatCurrency(totalHubExpenses)}
            </div>
            <div className="text-[11px] text-gray-400 truncate mt-0.5">
              {filteredHubExpenses.length} Expense Entries
            </div>
          </div>
        </div>

        {/* Card 4: Avg Rate Card (to the left of Net Profit) */}
        <div
          onClick={() => navigate('/payout-details')}
          className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100/70 text-purple-600 flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-gray-500 truncate leading-tight">
              Avg Rate Card
            </div>
            <div className="text-xl font-bold text-purple-700 leading-tight mt-0.5">
              ₹{avgRateCard > 0 ? (avgRateCard % 1 === 0 ? avgRateCard : avgRateCard.toFixed(1)) : '0'}
            </div>
            <div className="text-[11px] text-gray-400 truncate mt-0.5">
              {ridersWithRateCount > 0
                ? `Avg of ${ridersWithRateCount} Active Rider${ridersWithRateCount > 1 ? 's' : ''}`
                : 'No rate cards recorded'}
            </div>
          </div>
        </div>

        {/* Card 5: Net Profit */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              netProfit >= 0
                ? 'bg-blue-50 border-blue-100/70 text-blue-600'
                : 'bg-rose-50 border-rose-100/70 text-rose-600'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-gray-500 truncate leading-tight">
              Net Profit
            </div>
            <div
              className={`text-xl font-bold leading-tight mt-0.5 ${
                netProfit >= 0 ? 'text-blue-600' : 'text-rose-600'
              }`}
            >
              {formatCurrency(netProfit)}
            </div>
            <div className="text-[11px] text-gray-400 truncate mt-0.5">
              Revenue - Payout - Hub - Loss
            </div>
          </div>
        </div>
      </div>

      {/* 3. ROW 2: MONEY FLOW (LEFT) & FRANCHISE PERFORMANCE (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT BLOCK: Money Flow (This Month) - 3 Columns inside */}
        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5 flex-wrap">
              <span>Money Flow</span>
              <span className="text-gray-400 font-normal">({selectedMonthFilter})</span>
              {!isAllCycles && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  {selectedCycleFilter}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Money In */}
              <div className="border border-emerald-100 rounded-xl p-3 bg-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                    <span>Money In</span>
                  </div>

                  <div className="mt-2.5 space-y-1 text-[11px]">
                    <div className="flex justify-between font-bold text-gray-800">
                      <span>Franchise Payment</span>
                      <span>{formatCurrency(totalRevenue)}</span>
                    </div>
                    {moneyInByCompany.map((c) => (
                      <div key={c.id} className="flex justify-between text-gray-500 pl-2">
                        <span>{c.name}</span>
                        <span>{formatCurrency(c.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-gray-700 pt-1">
                      <span>Other Income</span>
                      <span>₹ 0</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Adjustments/Recovery</span>
                      <span>{formatCurrency(recoveredLoss)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-emerald-50">
                  <div className="bg-emerald-50 text-emerald-900 font-extrabold text-xs py-1.5 px-2 rounded-lg flex justify-between">
                    <span>Total Money In</span>
                    <span>{formatCurrency(totalRevenue + recoveredLoss)}</span>
                  </div>
                </div>
              </div>

              {/* 2. Money Out */}
              <div className="border border-rose-100 rounded-xl p-3 bg-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                    <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    </div>
                    <span>Money Out</span>
                  </div>

                  <div className="mt-2.5 space-y-1 text-[11px] text-gray-700">
                    <div className="flex justify-between">
                      <span>Rider Payout</span>
                      <strong className="text-gray-900">{formatCurrency(totalRiderPayout)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Hub Expenses</span>
                      <strong className="text-gray-900">{formatCurrency(totalHubExpenses)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Rider Advances</span>
                      <strong className="text-gray-900">{formatCurrency(totalAdvanceGiven)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Loss / Deduction</span>
                      <strong className="text-gray-900">{formatCurrency(unrecoveredLoss)}</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-rose-50">
                  <div className="bg-rose-50 text-rose-900 font-extrabold text-xs py-1.5 px-2 rounded-lg flex justify-between">
                    <span>Total Money Out</span>
                    <span>{formatCurrency(totalMoneyOut)}</span>
                  </div>
                </div>
              </div>

              {/* 3. Closing Balance */}
              <div className="border border-teal-100 rounded-xl p-3 bg-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800">
                    <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center">
                      <CreditCard className="w-3.5 h-3.5" />
                    </div>
                    <span>Closing Balance</span>
                  </div>

                  <div className="text-xl font-extrabold text-gray-900 mt-2">
                    {formatCurrency(closingBalance)}
                  </div>

                  <div className="mt-3 space-y-1 text-[11px] text-gray-600">
                    <div className="flex justify-between">
                      <span>Opening Balance</span>
                      <strong className="text-gray-900">{formatCurrency(openingBalance)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Total In</span>
                      <strong className="text-gray-900">{formatCurrency(totalRevenue)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Out</span>
                      <strong className="text-gray-900">{formatCurrency(totalMoneyOut)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT BLOCK: Franchise Performance (Profit & Loss Table) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
              <span>Franchise Performance</span>
              <span className="text-gray-400 font-normal">(Profit & Loss)</span>
              {!isAllCycles && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  {selectedCycleFilter}
                </span>
              )}
            </div>
            <div className="bg-gray-100 px-2.5 py-1 rounded-md text-[10px] font-bold text-gray-600">
              Profit & Loss
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-bold">
                  <th className="py-2 px-2">Particular</th>
                  {franchisePerformance.map((f) => (
                    <th key={f.companyId} className="py-2 px-2 text-right">
                      {f.name}
                    </th>
                  ))}
                  {isAllCompanies && <th className="py-2 px-2 text-right text-gray-900">Total</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-1.5 px-2 font-medium text-gray-700">Franchise Income</td>
                  {franchisePerformance.map((f) => (
                    <td key={f.companyId} className="py-1.5 px-2 text-right text-gray-900">
                      {formatCurrency(f.income)}
                    </td>
                  ))}
                  {isAllCompanies && (
                    <td className="py-1.5 px-2 text-right font-bold text-gray-900">
                      {formatCurrency(allCompaniesTotals.income)}
                    </td>
                  )}
                </tr>

                <tr>
                  <td className="py-1.5 px-2 font-medium text-gray-700">Rider Payout</td>
                  {franchisePerformance.map((f) => (
                    <td key={f.companyId} className="py-1.5 px-2 text-right text-gray-700">
                      {formatCurrency(f.payout)}
                    </td>
                  ))}
                  {isAllCompanies && (
                    <td className="py-1.5 px-2 text-right font-bold text-gray-800">
                      {formatCurrency(allCompaniesTotals.payout)}
                    </td>
                  )}
                </tr>

                <tr>
                  <td className="py-1.5 px-2 font-medium text-gray-700">Hub Expenses</td>
                  {franchisePerformance.map((f) => (
                    <td key={f.companyId} className="py-1.5 px-2 text-right text-gray-700">
                      {formatCurrency(f.hubExpense)}
                    </td>
                  ))}
                  {isAllCompanies && (
                    <td className="py-1.5 px-2 text-right font-bold text-gray-800">
                      {formatCurrency(allCompaniesTotals.hubExpense)}
                    </td>
                  )}
                </tr>

                <tr>
                  <td className="py-1.5 px-2 font-medium text-gray-700">Loss / Deduction</td>
                  {franchisePerformance.map((f) => (
                    <td key={f.companyId} className="py-1.5 px-2 text-right text-gray-700">
                      {formatCurrency(f.loss)}
                    </td>
                  ))}
                  {isAllCompanies && (
                    <td className="py-1.5 px-2 text-right font-bold text-gray-800">
                      {formatCurrency(allCompaniesTotals.loss)}
                    </td>
                  )}
                </tr>

                <tr className="bg-emerald-50/60 font-bold border-t border-emerald-200">
                  <td className="py-2 px-2 text-emerald-900">Net Profit</td>
                  {franchisePerformance.map((f) => (
                    <td
                      key={f.companyId}
                      className={`py-2 px-2 text-right font-extrabold ${f.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}
                    >
                      {formatCurrency(f.netProfit)}
                    </td>
                  ))}
                  {isAllCompanies && (
                    <td
                      className={`py-2 px-2 text-right font-black ${allCompaniesTotals.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}
                    >
                      {formatCurrency(allCompaniesTotals.netProfit)}
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. ROW 3: CHARTS & SHIPMENT SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 1. Bar Chart: Revenue vs Expense vs Profit */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between relative">
          <div>
            <div className="flex items-center justify-between gap-1 mb-1">
              <div>
                <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Revenue vs Expense vs Profit</span>
                </div>
                <div className="text-[10px] text-gray-400 font-medium">
                  {selectedMonthFilter} {isAllCycles ? '' : `• ${selectedCycleFilter}`}
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Revenue
                </span>
                <span className="flex items-center gap-1 text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Expense
                </span>
                <span className="flex items-center gap-1 text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Profit
                </span>
              </div>
            </div>

            {/* Bar Chart with interactive hover & guide grid */}
            <div className="h-48 flex items-end justify-between gap-2 pt-6 relative select-none">
              {/* Horizontal Grid Guide Lines */}
              <div className="absolute inset-x-0 bottom-6 top-6 flex flex-col justify-between pointer-events-none pl-12 pr-1 z-0">
                <div className="border-b border-dashed border-slate-100 w-full" />
                <div className="border-b border-dashed border-slate-100 w-full" />
                <div className="border-b border-dashed border-slate-100 w-full" />
                <div className="border-b border-slate-200/90 w-full" />
              </div>

              {/* Left Y-axis values */}
              <div className="flex flex-col justify-between h-36 text-[9px] text-gray-400 font-bold shrink-0 pr-2 pb-6 z-10">
                <span>{formatCurrency(chartMaxVal)}</span>
                <span>{formatCurrency(Math.round(chartMaxVal * 0.66))}</span>
                <span>{formatCurrency(Math.round(chartMaxVal * 0.33))}</span>
                <span>₹0</span>
              </div>

              {/* Bars container */}
              <div className="flex-1 flex items-end justify-around h-36 border-b border-slate-200/90 pb-0.5 z-10">
                {franchisePerformance.map((f, idx) => {
                  const isHovered = hoveredBarIndex === idx;
                  const isAnyHovered = hoveredBarIndex !== null;
                  const expTotal = f.payout + f.hubExpense;

                  // Compute bar heights with a visual minimum when > 0
                  const revH = f.income > 0 ? Math.max(6, Math.min(100, Math.round((f.income / chartMaxVal) * 100))) : 0;
                  const expH = expTotal > 0 ? Math.max(6, Math.min(100, Math.round((expTotal / chartMaxVal) * 100))) : 0;
                  const profVal = Math.max(0, f.netProfit);
                  const profH = profVal > 0 ? Math.max(6, Math.min(100, Math.round((profVal / chartMaxVal) * 100))) : 0;

                  return (
                    <div
                      key={f.companyId}
                      onMouseEnter={() => setHoveredBarIndex(idx)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                      className={`relative flex flex-col items-center justify-end h-full px-2 py-1 rounded-xl transition-all duration-200 cursor-pointer ${
                        isHovered ? 'bg-slate-100/90 shadow-2xs' : 'hover:bg-slate-50/70'
                      } ${isAnyHovered && !isHovered ? 'opacity-40' : 'opacity-100'}`}
                    >
                      {/* Floating Rich Tooltip */}
                      {isHovered && (
                        <div className="absolute bottom-[104%] left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md text-white rounded-xl p-3 shadow-2xl border border-slate-700/80 min-w-[210px] pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
                            <span className="font-bold text-xs text-white tracking-wide">{f.name}</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {selectedMonthFilter || 'Overview'}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-[11px]">
                            <div className="flex items-center justify-between text-slate-300">
                              <span className="flex items-center gap-1.5 font-medium">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                                Revenue:
                              </span>
                              <strong className="text-emerald-400 font-bold">{formatCurrency(f.income)}</strong>
                            </div>

                            <div className="flex items-center justify-between text-slate-300">
                              <span className="flex items-center gap-1.5 font-medium">
                                <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                                Expense:
                              </span>
                              <strong className="text-rose-400 font-bold">{formatCurrency(expTotal)}</strong>
                            </div>

                            {/* Sub-breakdown for Expense */}
                            {(f.payout > 0 || f.hubExpense > 0) && (
                              <div className="pl-3.5 pr-0.5 text-[10px] text-slate-400 space-y-0.5 pb-0.5">
                                <div className="flex justify-between">
                                  <span>• Rider Payout:</span>
                                  <span className="text-slate-300 font-medium">{formatCurrency(f.payout)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>• Hub Expense:</span>
                                  <span className="text-slate-300 font-medium">{formatCurrency(f.hubExpense)}</span>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-800">
                              <span className="flex items-center gap-1.5 font-bold text-slate-200">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${f.netProfit >= 0 ? 'bg-blue-400' : 'bg-rose-500'}`} />
                                Net Profit:
                              </span>
                              <strong className={`font-black ${f.netProfit >= 0 ? 'text-blue-300' : 'text-rose-400'}`}>
                                {formatCurrency(f.netProfit)}
                              </strong>
                            </div>

                            {f.income > 0 && (
                              <div className="text-[10px] text-right font-medium text-slate-400 pt-0.5">
                                Margin: <span className={f.netProfit >= 0 ? 'text-emerald-300' : 'text-rose-400'}>{((f.netProfit / f.income) * 100).toFixed(1)}%</span>
                              </div>
                            )}
                          </div>

                          {/* Pointer caret */}
                          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-r border-b border-slate-700/80 rotate-45" />
                        </div>
                      )}

                      {/* 3 Pillars (Revenue, Expense, Profit) */}
                      <div className="flex items-end gap-1.5 h-28 pb-0.5 relative z-10">
                        {/* Revenue Bar */}
                        <div className="flex flex-col items-center justify-end h-full w-3.5">
                          {revH > 0 ? (
                            <div
                              style={{ height: `${revH}%` }}
                              className="w-full bg-gradient-to-t from-emerald-600 via-emerald-500 to-emerald-400 rounded-t-md shadow-[0_2px_8px_rgba(16,185,129,0.3)] transition-all duration-300 group-hover:brightness-110"
                            />
                          ) : (
                            <div className="w-full h-1 bg-slate-200 rounded-full" title="Revenue: ₹0" />
                          )}
                        </div>

                        {/* Expense Bar */}
                        <div className="flex flex-col items-center justify-end h-full w-3.5">
                          {expH > 0 ? (
                            <div
                              style={{ height: `${expH}%` }}
                              className="w-full bg-gradient-to-t from-rose-600 via-rose-500 to-rose-400 rounded-t-md shadow-[0_2px_8px_rgba(244,63,94,0.3)] transition-all duration-300 group-hover:brightness-110"
                            />
                          ) : (
                            <div className="w-full h-1 bg-slate-200 rounded-full" title="Expense: ₹0" />
                          )}
                        </div>

                        {/* Profit Bar */}
                        <div className="flex flex-col items-center justify-end h-full w-3.5">
                          {profH > 0 ? (
                            <div
                              style={{ height: `${profH}%` }}
                              className="w-full bg-gradient-to-t from-blue-600 via-blue-500 to-indigo-400 rounded-t-md shadow-[0_2px_8px_rgba(59,130,246,0.3)] transition-all duration-300 group-hover:brightness-110"
                            />
                          ) : (
                            <div className="w-full h-1 bg-slate-200 rounded-full" title={`Profit: ${formatCurrency(f.netProfit)}`} />
                          )}
                        </div>
                      </div>

                      {/* Label */}
                      <span className="text-[10px] font-bold text-gray-700 truncate max-w-[65px] text-center mt-1 group-hover:text-indigo-600 transition-colors">
                        {f.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-gray-400">
            <span>Hover on any company to inspect live figures</span>
            <span className="font-semibold text-gray-500">{franchisePerformance.length} Franchises</span>
          </div>
        </div>

        {/* 2. Donut Chart: Expense Breakdown (Dynamic from Hub Expenses) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between relative">
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-amber-500" />
                <span>Expense Breakdown</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {filteredHubExpenses.length} Entries
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              {/* Donut graphic with interactive hover highlight */}
              <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                  {(() => {
                    let accumulated = 0;
                    return expenseCategories.map((c) => {
                      const offset = -accumulated;
                      accumulated += c.percent;
                      const isHovered = hoveredCategory === c.name;
                      return (
                        <circle
                          key={c.name}
                          cx="18"
                          cy="18"
                          r="15.9155"
                          fill="none"
                          stroke={c.color}
                          strokeWidth={isHovered ? 5.5 : 4}
                          strokeDasharray={`${c.percent} ${100 - c.percent}`}
                          strokeDashoffset={offset}
                          className="transition-all duration-200 cursor-pointer"
                          style={{
                            filter: isHovered ? `drop-shadow(0 0 4px ${c.color}aa)` : 'none',
                          }}
                          onMouseEnter={() => setHoveredCategory(c.name)}
                          onMouseLeave={() => setHoveredCategory(null)}
                        />
                      );
                    });
                  })()}
                </svg>

                {/* Center text showing active hovered category OR total */}
                <div className="absolute text-center max-w-[85px] pointer-events-none transition-all duration-200">
                  {activeExpenseCategory ? (
                    <div className="animate-in fade-in zoom-in-95 duration-150">
                      <div className="text-[9px] font-bold text-gray-400 truncate leading-tight">
                        {activeExpenseCategory.name}
                      </div>
                      <div
                        className="text-xs font-black leading-tight mt-0.5"
                        style={{ color: activeExpenseCategory.color }}
                      >
                        {formatCurrency(activeExpenseCategory.amount)}
                      </div>
                      <div className="text-[9px] font-bold text-gray-500 mt-0.5">
                        {activeExpenseCategory.percent}%
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-black text-gray-900 leading-tight">
                        {formatCurrency(totalHubExpenses)}
                      </div>
                      <div className="text-[9px] text-gray-400 font-medium mt-0.5 leading-tight">
                        Total Expense
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Legend list */}
              <div className="space-y-1.5 text-[11px] flex-1 max-h-36 overflow-y-auto pr-0.5">
                {expenseCategories.length === 0 ? (
                  <div className="py-2 text-center flex flex-col items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-1.5">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div className="text-[11px] font-bold text-gray-600">No Expenses Recorded</div>
                    <div className="text-[10px] text-gray-400">Zero hub entries for this period</div>
                    <button
                      type="button"
                      onClick={() => navigate('/hub-expenses')}
                      className="mt-2 text-[10px] font-bold text-amber-600 hover:text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Expense
                    </button>
                  </div>
                ) : (
                  expenseCategories.map((c) => {
                    const isHovered = hoveredCategory === c.name;
                    return (
                      <div
                        key={c.name}
                        onMouseEnter={() => setHoveredCategory(c.name)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        className={`flex items-center justify-between p-1.5 rounded-lg transition-all cursor-pointer ${
                          isHovered ? 'bg-slate-100/90 shadow-2xs' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 truncate max-w-[85px]">
                          <span
                            className="w-2 h-2 rounded-full shrink-0 transition-transform"
                            style={{
                              backgroundColor: c.color,
                              transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                            }}
                          />
                          <span className={`truncate font-medium ${isHovered ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
                            {c.name}
                          </span>
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                          <span className="text-[10px] font-semibold text-gray-400">{c.percent}%</span>
                          <strong className="text-gray-900 font-bold">{formatCurrency(c.amount)}</strong>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-gray-400">Hub & Operations</span>
            <button
              type="button"
              onClick={() => navigate('/hub-expenses')}
              className="text-amber-600 hover:underline font-bold cursor-pointer"
            >
              View Expenses →
            </button>
          </div>
        </div>

        {/* 3. Franchise-wise Shipment Summary Table */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-gray-900">Franchise-wise Shipment Summary</div>
            <button
              type="button"
              onClick={() => navigate('/payout-details')}
              className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold">
                  <th className="pb-1.5">Franchise</th>
                  <th className="pb-1.5 text-right">Total</th>
                  <th className="pb-1.5 text-right">Delivered</th>
                  <th className="pb-1.5 text-right">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shipmentSummary.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-1.5 font-bold text-gray-800">{r.name}</td>
                    <td className="py-1.5 text-right font-medium text-gray-700">{formatNumber(r.total)}</td>
                    <td className="py-1.5 text-right font-medium text-gray-700">{formatNumber(r.delivered)}</td>
                    <td className="py-1.5 text-right font-medium text-gray-700">{formatNumber(r.pending)}</td>
                  </tr>
                ))}
                {isAllCompanies && (
                  <tr className="font-extrabold text-gray-900 border-t border-gray-200">
                    <td className="py-2">Total</td>
                    <td className="py-2 text-right">{formatNumber(shipmentSummary.totals.total)}</td>
                    <td className="py-2 text-right">{formatNumber(shipmentSummary.totals.delivered)}</td>
                    <td className="py-2 text-right">{formatNumber(shipmentSummary.totals.pending)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. ROW 4: BOTTOM 4 SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Rider Payout Summary */}
        <div className="group relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-600 to-indigo-600" />
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 leading-tight block">Rider Payout Summary</span>
                  <span className="text-[10px] text-slate-400 font-medium">Monthly Payout Breakdown</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/payout-details')}
                className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100"
              >
                View All
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 border border-slate-100/80 p-2.5 rounded-xl">
                <div className="text-[10px] text-slate-400 font-medium">Total</div>
                <div className="text-xs font-black text-slate-900 mt-1">{formatCurrency(totalRiderPayout)}</div>
              </div>
              <div className="bg-emerald-50/50 border border-emerald-100/70 p-2.5 rounded-xl">
                <div className="text-[10px] text-emerald-600 font-medium">Paid</div>
                <div className="text-xs font-black text-emerald-700 mt-1">{formatCurrency(riderStats.paidAmount)}</div>
              </div>
              <div className="bg-rose-50/50 border border-rose-100/70 p-2.5 rounded-xl">
                <div className="text-[10px] text-rose-500 font-medium">Pending</div>
                <div className="text-xs font-black text-rose-600 mt-1">{formatCurrency(riderStats.pendingAmount)}</div>
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500">
            <span>{riderStats.total} Riders</span>
            <span>•</span>
            <span className="text-emerald-600">{riderStats.paid} Paid</span>
            <span>•</span>
            <span className="text-rose-500">{riderStats.pending} Pending</span>
          </div>
        </div>

        {/* Card 2: Advance Summary */}
        <div className="group relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/60">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 leading-tight block">Advance Summary</span>
                  <span className="text-[10px] text-slate-400 font-medium">Rider Advances</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/advanced')}
                className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100"
              >
                View All
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 border border-slate-100/80 p-2.5 rounded-xl">
                <div className="text-[10px] text-slate-400 font-medium">Given</div>
                <div className="text-xs font-black text-slate-900 mt-1">{formatCurrency(totalAdvanceGiven)}</div>
              </div>
              <div className="bg-emerald-50/50 border border-emerald-100/70 p-2.5 rounded-xl">
                <div className="text-[10px] text-emerald-600 font-medium">Recovered</div>
                <div className="text-xs font-black text-emerald-700 mt-1">{formatCurrency(totalAdvanceRecovered)}</div>
              </div>
              <div className="bg-amber-50/50 border border-amber-100/70 p-2.5 rounded-xl">
                <div className="text-[10px] text-amber-600 font-medium">Outstanding</div>
                <div className="text-xs font-black text-amber-700 mt-1">{formatCurrency(totalAdvanceOutstanding)}</div>
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500">
            <span>{advanceStats.total} Records</span>
            <span>•</span>
            <span className="text-emerald-600">{advanceStats.recovered} Recovered</span>
            <span>•</span>
            <span className="text-amber-600">{advanceStats.pending} Pending</span>
          </div>
        </div>

        {/* Card 3: Loss Summary */}
        <div className="group relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-pink-500" />
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100/60">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 leading-tight block">Loss Summary</span>
                  <span className="text-[10px] text-slate-400 font-medium">Incidents & Recoveries</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/loss-details')}
                className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100"
              >
                View All
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 border border-slate-100/80 p-2.5 rounded-xl">
                <div className="text-[10px] text-slate-400 font-medium">Total Loss</div>
                <div className="text-xs font-black text-slate-900 mt-1">{formatCurrency(totalLoss)}</div>
              </div>
              <div className="bg-emerald-50/50 border border-emerald-100/70 p-2.5 rounded-xl">
                <div className="text-[10px] text-emerald-600 font-medium">Recovered</div>
                <div className="text-xs font-black text-emerald-700 mt-1">{formatCurrency(recoveredLoss)}</div>
              </div>
              <div className="bg-rose-50/50 border border-rose-100/70 p-2.5 rounded-xl">
                <div className="text-[10px] text-rose-500 font-medium">Pending</div>
                <div className="text-xs font-black text-rose-600 mt-1">{formatCurrency(unrecoveredLoss)}</div>
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500">
            <span>{lossStats.total} Incidents</span>
            <span>•</span>
            <span className="text-emerald-600">{lossStats.recovered} Recovered</span>
            <span>•</span>
            <span className="text-rose-500">{lossStats.pending} Pending</span>
          </div>
        </div>

        {/* Card 4: Attention Required (100% Dynamic) */}
        <div className="group relative overflow-hidden bg-white border border-rose-200/80 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100/60">
                  <Bell className="w-4 h-4 fill-rose-100" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 leading-tight block">Attention Required</span>
                  <span className="text-[10px] text-slate-400 font-medium">Urgent Actions</span>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-white text-[10px] font-extrabold ${
                  attentionItems.length > 0 ? 'bg-rose-500 shadow-xs' : 'bg-emerald-500'
                }`}
              >
                {attentionItems.length}
              </span>
            </div>

            <div className="space-y-2 text-[11px]">
              {attentionItems.length === 0 ? (
                <div className="py-4 text-center text-emerald-600 flex flex-col items-center justify-center gap-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  <span className="text-xs font-bold">All Good</span>
                  <span className="text-[10px] text-slate-400">No urgent pending actions</span>
                </div>
              ) : (
                attentionItems.slice(0, 4).map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      className="p-2 rounded-xl bg-slate-50/70 hover:bg-rose-50/60 border border-slate-100/80 transition-colors cursor-pointer flex items-center justify-between text-slate-700"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ItemIcon className={`w-3.5 h-3.5 shrink-0 ${item.iconColor}`} />
                        <span className="truncate font-medium">{item.title}</span>
                      </div>
                      <div className="flex items-center gap-1 font-bold text-slate-900 shrink-0 ml-1">
                        <span>{item.value}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


