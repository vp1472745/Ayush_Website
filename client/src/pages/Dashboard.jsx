import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee,
  Users,
  Building2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  CreditCard,
  Layers,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { useTabRefresh } from '../context/RefreshContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatNumber } from '../utils/calculations';
import apiClient from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import { Badge, Button } from '../components/common';

export const Dashboard = () => {
  const navigate = useNavigate();
  const {
    companies,
    selectedCompanyFilter,
    selectedMonthFilter,
    selectedFinancialYear,
    fetchCompanies,
  } = useCompany();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [performanceTab, setPerformanceTab] = useState('month'); // 'month' or 'fy'
  const [lastUpdatedTime, setLastUpdatedTime] = useState('');

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

  // Load all dashboard financial datasets
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCompanyFilter && selectedCompanyFilter !== 'all') {
        params.companyId = selectedCompanyFilter;
      }
      if (selectedMonthFilter) {
        params.month = selectedMonthFilter;
      }
      if (selectedFinancialYear) {
        params.financialYear = selectedFinancialYear;
      }

      const [
        myPaymentsRes,
        riderPayoutsRes,
        hubExpensesRes,
        lossDetailsRes,
        advancesRes,
      ] = await Promise.allSettled([
        apiClient.get(ENDPOINTS.MY_PAYMENTS.GET_ALL, { params }),
        apiClient.get(ENDPOINTS.RIDER_PAYOUTS.GET_ALL, { params }),
        apiClient.get(ENDPOINTS.HUB_EXPENSES.GET_ALL, { params: { month: selectedMonthFilter } }),
        apiClient.get(ENDPOINTS.LOSS_DETAILS.GET_ALL, { params }),
        apiClient.get(ENDPOINTS.ADVANCES.GET_ALL, { params }),
      ]);

      if (myPaymentsRes.status === 'fulfilled') {
        setMyPayments(myPaymentsRes.value.data?.data || myPaymentsRes.value.data || []);
      }
      if (riderPayoutsRes.status === 'fulfilled') {
        setRiderPayouts(riderPayoutsRes.value.data?.data || riderPayoutsRes.value.data || []);
      }
      if (hubExpensesRes.status === 'fulfilled') {
        setHubExpenses(hubExpensesRes.value.data?.data || hubExpensesRes.value.data || []);
      }
      if (lossDetailsRes.status === 'fulfilled') {
        setLossDetails(lossDetailsRes.value.data?.data || lossDetailsRes.value.data || []);
      }
      if (advancesRes.status === 'fulfilled') {
        setAdvances(advancesRes.value.data?.data || advancesRes.value.data || []);
      }

      const now = new Date();
      setLastUpdatedTime(
        `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`
      );
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyFilter, selectedMonthFilter, selectedFinancialYear]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useTabRefresh(() => {
    loadDashboardData();
    if (typeof fetchCompanies === 'function') fetchCompanies();
  });

  // -------------------------------------------------------------
  // COMPUTED TOP METRICS
  // -------------------------------------------------------------
  // 1. Franchise Revenue Received (from MyPayment)
  const totalRevenue = useMemo(() => {
    return myPayments.reduce((sum, p) => sum + (Number(p.amount) || Number(p.finalPayable) || 0), 0);
  }, [myPayments]);

  // 2. Rider Payout Cost (from RiderPayout)
  const totalRiderPayout = useMemo(() => {
    return riderPayouts.reduce((sum, r) => sum + (Number(r.finalPayout) || Number(r.payout) || 0), 0);
  }, [riderPayouts]);

  // 3. Hub Expenses (from HubExpense)
  const totalHubExpenses = useMemo(() => {
    return hubExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [hubExpenses]);

  // 4. Losses & Deductions
  const totalLoss = useMemo(() => {
    return lossDetails.reduce((sum, l) => sum + (Number(l.price) || 0), 0);
  }, [lossDetails]);

  const unrecoveredLoss = useMemo(() => {
    return lossDetails
      .filter((l) => l.status !== 'Recovered')
      .reduce((sum, l) => sum + (Number(l.price) || 0), 0);
  }, [lossDetails]);

  // 5. Advances
  const totalAdvanceGiven = useMemo(() => {
    return advances.reduce((sum, a) => sum + (Number(a.advance) || 0), 0);
  }, [advances]);

  const totalAdvanceRecovered = useMemo(() => {
    return advances.reduce((sum, a) => sum + (Number(a.advanceCut) || 0), 0);
  }, [advances]);

  const totalAdvanceOutstanding = useMemo(() => {
    return advances.reduce((sum, a) => sum + (Number(a.remainingAmount) || (Number(a.advance) - Number(a.advanceCut)) || 0), 0);
  }, [advances]);

  // 6. Net Business Profit
  const netProfit = useMemo(() => {
    return totalRevenue - (totalRiderPayout + totalHubExpenses + unrecoveredLoss);
  }, [totalRevenue, totalRiderPayout, totalHubExpenses, unrecoveredLoss]);

  // Total Money Out = Rider Payouts + Hub Expenses + Advance Given + Loss
  const totalMoneyOut = useMemo(() => {
    return totalRiderPayout + totalHubExpenses + totalAdvanceGiven + unrecoveredLoss;
  }, [totalRiderPayout, totalHubExpenses, totalAdvanceGiven, unrecoveredLoss]);

  // Rider counts & status
  const riderStats = useMemo(() => {
    const total = riderPayouts.length;
    const paid = riderPayouts.filter((r) => r.paymentStatus === 'PAID').length;
    const pending = total - paid;
    const pendingAmount = riderPayouts
      .filter((r) => r.paymentStatus !== 'PAID')
      .reduce((s, r) => s + (Number(r.finalPayout) || Number(r.payout) || 0), 0);
    return { total, paid, pending, pendingAmount };
  }, [riderPayouts]);

  // -------------------------------------------------------------
  // MONEY IN BY COMPANY
  // -------------------------------------------------------------
  const moneyInByCompany = useMemo(() => {
    return activeCompanies.map((comp) => {
      const compId = comp.id || comp._id;
      const amount = myPayments
        .filter((p) => (p.companyId?._id || p.companyId?.id || p.companyId) === compId)
        .reduce((s, p) => s + (Number(p.amount) || Number(p.finalPayable) || 0), 0);
      return {
        id: compId,
        name: comp.name,
        amount,
      };
    });
  }, [activeCompanies, myPayments]);

  // -------------------------------------------------------------
  // FRANCHISE PERFORMANCE TABLE (Matrix by Company)
  // -------------------------------------------------------------
  const franchisePerformance = useMemo(() => {
    const data = activeCompanies.map((comp) => {
      const compId = comp.id || comp._id;
      const income = myPayments
        .filter((p) => (p.companyId?._id || p.companyId?.id || p.companyId) === compId)
        .reduce((s, p) => s + (Number(p.amount) || Number(p.finalPayable) || 0), 0);
      const payout = riderPayouts
        .filter((p) => (p.companyId?._id || p.companyId?.id || p.companyId) === compId)
        .reduce((s, p) => s + (Number(p.finalPayout) || Number(p.payout) || 0), 0);
      const loss = lossDetails
        .filter((l) => (l.companyId?._id || l.companyId?.id || l.companyId) === compId && l.status !== 'Recovered')
        .reduce((s, l) => s + (Number(l.price) || 0), 0);
      
      // Direct + shared hub expense
      const directExp = hubExpenses
        .filter((e) => (e.companyId?._id || e.companyId?.id || e.companyId) === compId)
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const sharedExp = hubExpenses
        .filter((e) => !e.companyId)
        .reduce((s, e) => s + (Number(e.amount) || 0), 0) / (activeCompanies.length || 1);
      const hubExpense = directExp + sharedExp;

      const net = income - (payout + hubExpense + loss);

      return {
        companyId: compId,
        name: comp.name,
        income,
        payout,
        hubExpense,
        loss,
        netProfit: net,
      };
    });

    return data;
  }, [activeCompanies, myPayments, riderPayouts, lossDetails, hubExpenses]);

  // -------------------------------------------------------------
  // EXPENSE BREAKDOWN CATEGORIES (Donut Chart & Legend)
  // -------------------------------------------------------------
  const expenseCategories = useMemo(() => {
    const catMap = {
      Rent: { name: 'Rent', color: '#3b82f6', amount: 0 },
      Fuel: { name: 'Fuel / Travel', color: '#10b981', amount: 0 },
      Electricity: { name: 'Electricity', color: '#f59e0b', amount: 0 },
      Maintenance: { name: 'Maintenance', color: '#8b5cf6', amount: 0 },
      Refreshments: { name: 'Tea & Snacks', color: '#06b6d4', amount: 0 },
      Other: { name: 'Other Expenses', color: '#64748b', amount: 0 },
    };

    hubExpenses.forEach((e) => {
      const text = (e.expenseName || '').toLowerCase();
      const amt = Number(e.amount) || 0;
      if (text.includes('rent') || text.includes('office')) {
        catMap.Rent.amount += amt;
      } else if (text.includes('fuel') || text.includes('travel') || text.includes('petrol')) {
        catMap.Fuel.amount += amt;
      } else if (text.includes('electric') || text.includes('bill') || text.includes('power')) {
        catMap.Electricity.amount += amt;
      } else if (text.includes('repair') || text.includes('maint')) {
        catMap.Maintenance.amount += amt;
      } else if (text.includes('tea') || text.includes('snack') || text.includes('food')) {
        catMap.Refreshments.amount += amt;
      } else {
        catMap.Other.amount += amt;
      }
    });

    const total = Object.values(catMap).reduce((s, c) => s + c.amount, 0) || 1;
    return Object.values(catMap).map((c) => ({
      ...c,
      percent: Math.round((c.amount / total) * 100),
    }));
  }, [hubExpenses]);

  // -------------------------------------------------------------
  // RECENT TRANSACTIONS LEDGER (Real Feed)
  // -------------------------------------------------------------
  const recentTransactions = useMemo(() => {
    const list = [];
    myPayments.slice(0, 3).forEach((p) => {
      list.push({
        id: p._id,
        date: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : selectedMonthFilter,
        type: 'Franchise Payment',
        typeColor: 'text-green-700 bg-green-50',
        franchise: p.companyId?.name || 'Franchise',
        amount: Number(p.amount) || Number(p.finalPayable) || 0,
        amountColor: 'text-green-600',
        isPositive: true,
      });
    });

    riderPayouts.slice(0, 3).forEach((r) => {
      list.push({
        id: r._id,
        date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : selectedMonthFilter,
        type: 'Rider Payout',
        typeColor: 'text-red-700 bg-red-50',
        franchise: r.riderName || 'Rider',
        amount: Number(r.finalPayout) || Number(r.payout) || 0,
        amountColor: 'text-red-600',
        isPositive: false,
      });
    });

    hubExpenses.slice(0, 2).forEach((e) => {
      list.push({
        id: e._id,
        date: e.date || (e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : selectedMonthFilter),
        type: 'Hub Expense',
        typeColor: 'text-amber-700 bg-amber-50',
        franchise: e.expenseName || 'Hub',
        amount: Number(e.amount) || 0,
        amountColor: 'text-amber-600',
        isPositive: false,
      });
    });

    return list.slice(0, 5);
  }, [myPayments, riderPayouts, hubExpenses, selectedMonthFilter]);

  // Helper for max bar height calculation
  const maxBarValue = useMemo(() => {
    let max = 1000;
    franchisePerformance.forEach((f) => {
      if (f.income > max) max = f.income;
      if (f.payout + f.hubExpense > max) max = f.payout + f.hubExpense;
      if (f.netProfit > max) max = f.netProfit;
    });
    return max;
  }, [franchisePerformance]);

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const companyOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Franchise', icon: Building2 },
      ...activeCompanies.map((c) => ({
        value: c.id || c._id,
        label: c.name,
        icon: Building2,
      })),
    ];
  }, [activeCompanies]);

  const financialYearOptions = useMemo(() => {
    const baseYear = 2024;
    const currentYr = new Date().getFullYear();
    const endYear = Math.max(currentYr + 4, 2030);
    const years = [];
    for (let y = baseYear; y <= endYear; y++) {
      const fyLabel = `${y}-${y + 1}`;
      years.push({
        value: fyLabel,
        label: fyLabel,
      });
    }
    return years;
  }, []);

  const monthOptions = useMemo(() => {
    return MONTHS.map((m) => ({
      value: m,
      label: m,
    }));
  }, []);

  return (
    <div className="space-y-4 pb-8">
      {/* 1. TOP HEADER & FILTER BAR */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-xs text-gray-500 font-medium">Complete business overview at a glance</p>
        </div>

        {/* Filters & Live Status */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Franchise Dropdown */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Franchise</span>
            <select
              value={selectedCompanyFilter || 'all'}
              onChange={(e) => setSelectedCompanyFilter(e.target.value)}
              className="bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-red-200 focus:border-[#E53935] cursor-pointer shadow-2xs"
            >
              {companyOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Financial Year Dropdown */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Date Range / FY</span>
            <select
              value={selectedFinancialYear}
              onChange={(e) => setSelectedFinancialYear(e.target.value)}
              className="bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-red-200 focus:border-[#E53935] cursor-pointer shadow-2xs"
            >
              {financialYearOptions.map((y) => (
                <option key={y.value} value={y.value}>
                  FY {y.label}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Payment Cycle / Month</span>
            <select
              value={selectedMonthFilter}
              onChange={(e) => setSelectedMonthFilter(e.target.value)}
              className="bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-red-200 focus:border-[#E53935] cursor-pointer shadow-2xs"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Live Status */}
          {lastUpdatedTime && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 mt-auto rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{lastUpdatedTime}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. TOP 4 EXECUTIVE KPI CARDS (Matching image position & color palette) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Franchise Revenue (Received) */}
        <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <IndianRupee className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">Franchise Revenue</div>
                <div className="text-[10px] text-gray-500 font-medium">(Received)</div>
              </div>
            </div>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-3 tracking-tight">
            {formatCurrency(totalRevenue)}
          </div>
          <div className="text-[11px] font-bold text-emerald-600 mt-1.5 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Active Contract Inflows</span>
          </div>
        </div>

        {/* Card 2: Rider Payout (For Riders) */}
        <div className="bg-white border border-rose-100 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-[#E53935] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">Rider Payout</div>
                <div className="text-[10px] text-gray-500 font-medium">(For Riders)</div>
              </div>
            </div>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-3 tracking-tight">
            {formatCurrency(totalRiderPayout)}
          </div>
          <div className="text-[11px] font-bold text-rose-600 mt-1.5 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{riderPayouts.length} Riders Compensated</span>
          </div>
        </div>

        {/* Card 3: Hub Expenses (Office + Operations) */}
        <div className="bg-white border border-amber-100 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">Hub Expenses</div>
                <div className="text-[10px] text-gray-500 font-medium">(Office + Operations)</div>
              </div>
            </div>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-3 tracking-tight">
            {formatCurrency(totalHubExpenses)}
          </div>
          <div className="text-[11px] font-bold text-amber-600 mt-1.5 flex items-center gap-1">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Rent, Power & Overheads</span>
          </div>
        </div>

        {/* Card 4: Net Profit (Business Profit) */}
        <div className="bg-white border border-blue-100 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">Net Profit</div>
                <div className="text-[10px] text-gray-500 font-medium">(Business Profit)</div>
              </div>
            </div>
          </div>
          <div className={`text-2xl font-extrabold mt-3 tracking-tight ${netProfit >= 0 ? 'text-blue-700' : 'text-[#E53935]'}`}>
            {formatCurrency(netProfit)}
          </div>
          <div className="text-[11px] font-bold text-blue-600 mt-1.5 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}% Net Operating Margin</span>
          </div>
        </div>
      </div>

      {/* 3. ROW 2: MONEY FLOW (LEFT) & FRANCHISE PERFORMANCE (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT BLOCK: Money Flow (This Month) */}
        <div className="lg:col-span-5 bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-gray-900 mb-3">
              Money Flow <span className="text-gray-400 font-normal">({selectedMonthFilter})</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Money In */}
              <div className="border border-emerald-100 rounded-xl p-3 bg-emerald-50/20">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                  <span>Money In</span>
                </div>
                <div className="text-base font-extrabold text-emerald-800 mt-1">
                  {formatCurrency(totalRevenue)}
                </div>

                <div className="mt-3 space-y-1.5 text-[11px] text-gray-600">
                  {moneyInByCompany.map((c) => (
                    <div key={c.id} className="flex justify-between">
                      <span className="truncate">{c.name}</span>
                      <strong className="text-gray-900">{formatCurrency(c.amount)}</strong>
                    </div>
                  ))}
                  {moneyInByCompany.length === 0 && (
                    <div className="text-gray-400 italic">No payments yet</div>
                  )}
                </div>
              </div>

              {/* Money Out */}
              <div className="border border-rose-100 rounded-xl p-3 bg-rose-50/20">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                  <div className="w-5 h-5 rounded-full bg-rose-100 text-[#E53935] flex items-center justify-center">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  </div>
                  <span>Money Out</span>
                </div>
                <div className="text-base font-extrabold text-[#E53935] mt-1">
                  {formatCurrency(totalMoneyOut)}
                </div>

                <div className="mt-3 space-y-1.5 text-[11px] text-gray-600">
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
                    <span>Loss / Claims</span>
                    <strong className="text-gray-900">{formatCurrency(unrecoveredLoss)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Totals Highlight Bar */}
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100 text-xs font-bold">
            <div className="bg-emerald-50 rounded-lg py-2 px-3 flex justify-between text-emerald-900">
              <span>Total In</span>
              <span>{formatCurrency(totalRevenue)}</span>
            </div>
            <div className="bg-rose-50 rounded-lg py-2 px-3 flex justify-between text-rose-900">
              <span>Total Out</span>
              <span>{formatCurrency(totalMoneyOut)}</span>
            </div>
          </div>
        </div>

        {/* RIGHT BLOCK: Franchise Performance (Profit & Loss Table) */}
        <div className="lg:col-span-7 bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-gray-900">
              Franchise Performance <span className="text-gray-400 font-normal">(Profit & Loss)</span>
            </div>
            <div className="bg-gray-100 p-0.5 rounded-lg flex text-[10px] font-bold text-gray-600">
              <button
                type="button"
                onClick={() => setPerformanceTab('month')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  performanceTab === 'month' ? 'bg-blue-600 text-white shadow-2xs' : 'hover:text-gray-900'
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setPerformanceTab('fy')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  performanceTab === 'fy' ? 'bg-blue-600 text-white shadow-2xs' : 'hover:text-gray-900'
                }`}
              >
                This FY
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-bold">
                  <th className="py-2 px-2.5">Particular</th>
                  {franchisePerformance.map((f) => (
                    <th key={f.companyId} className="py-2 px-2.5 text-right">{f.name}</th>
                  ))}
                  <th className="py-2 px-2.5 text-right text-gray-900">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2 px-2.5 font-medium text-gray-700">Franchise Income</td>
                  {franchisePerformance.map((f) => (
                    <td key={f.companyId} className="py-2 px-2.5 text-right font-medium text-gray-900">
                      {formatCurrency(f.income)}
                    </td>
                  ))}
                  <td className="py-2 px-2.5 text-right font-bold text-gray-900">
                    {formatCurrency(totalRevenue)}
                  </td>
                </tr>

                <tr>
                  <td className="py-2 px-2.5 font-medium text-gray-700">Rider Payout</td>
                  {franchisePerformance.map((f) => (
                    <td key={f.companyId} className="py-2 px-2.5 text-right font-medium text-gray-600">
                      {formatCurrency(f.payout)}
                    </td>
                  ))}
                  <td className="py-2 px-2.5 text-right font-bold text-gray-800">
                    {formatCurrency(totalRiderPayout)}
                  </td>
                </tr>

                <tr>
                  <td className="py-2 px-2.5 font-medium text-gray-700">Hub Expenses</td>
                  {franchisePerformance.map((f) => (
                    <td key={f.companyId} className="py-2 px-2.5 text-right font-medium text-gray-600">
                      {formatCurrency(f.hubExpense)}
                    </td>
                  ))}
                  <td className="py-2 px-2.5 text-right font-bold text-gray-800">
                    {formatCurrency(totalHubExpenses)}
                  </td>
                </tr>

                <tr>
                  <td className="py-2 px-2.5 font-medium text-gray-700">Loss / Deduction</td>
                  {franchisePerformance.map((f) => (
                    <td key={f.companyId} className="py-2 px-2.5 text-right font-medium text-amber-700">
                      {formatCurrency(f.loss)}
                    </td>
                  ))}
                  <td className="py-2 px-2.5 text-right font-bold text-amber-700">
                    {formatCurrency(unrecoveredLoss)}
                  </td>
                </tr>

                <tr className="bg-emerald-50/60 font-bold border-t-2 border-emerald-200">
                  <td className="py-2.5 px-2.5 text-emerald-900">Net Profit</td>
                  {franchisePerformance.map((f) => (
                    <td key={f.companyId} className={`py-2.5 px-2.5 text-right ${
                      f.netProfit >= 0 ? 'text-emerald-700' : 'text-[#E53935]'
                    }`}>
                      {formatCurrency(f.netProfit)}
                    </td>
                  ))}
                  <td className={`py-2.5 px-2.5 text-right ${
                    netProfit >= 0 ? 'text-emerald-700 font-extrabold' : 'text-[#E53935] font-extrabold'
                  }`}>
                    {formatCurrency(netProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. ROW 3: CHARTS & QUICK SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 1. Bar Chart: Revenue vs Expense vs Profit */}
        <div className="lg:col-span-5 bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
            <div className="text-xs font-bold text-gray-900">
              Revenue vs Expense vs Profit <span className="text-gray-400 font-normal">(All Franchise)</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Revenue
              </span>
              <span className="flex items-center gap-1 text-rose-600">
                <span className="w-2 h-2 rounded-full bg-[#E53935]" /> Expense
              </span>
              <span className="flex items-center gap-1 text-blue-600">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> Profit
              </span>
            </div>
          </div>

          {/* Bar Chart Visualizer */}
          <div className="h-44 flex items-end justify-around gap-2 pt-6 pb-2 border-b border-gray-100">
            {franchisePerformance.map((f) => {
              const revH = Math.max(12, Math.min(100, Math.round((f.income / (maxBarValue || 1)) * 100)));
              const expH = Math.max(12, Math.min(100, Math.round(((f.payout + f.hubExpense) / (maxBarValue || 1)) * 100)));
              const profH = Math.max(8, Math.min(100, Math.round((Math.max(0, f.netProfit) / (maxBarValue || 1)) * 100)));

              return (
                <div key={f.companyId} className="flex flex-col items-center gap-1 flex-1 max-w-[80px]">
                  <div className="w-full flex items-end justify-center gap-1 h-32">
                    {/* Revenue Bar */}
                    <div
                      title={`Revenue: ${formatCurrency(f.income)}`}
                      style={{ height: `${revH}%` }}
                      className="w-2.5 bg-emerald-500 rounded-t-sm transition-all duration-300 hover:opacity-80"
                    />
                    {/* Expense Bar */}
                    <div
                      title={`Expense: ${formatCurrency(f.payout + f.hubExpense)}`}
                      style={{ height: `${expH}%` }}
                      className="w-2.5 bg-[#E53935] rounded-t-sm transition-all duration-300 hover:opacity-80"
                    />
                    {/* Profit Bar */}
                    <div
                      title={`Profit: ${formatCurrency(f.netProfit)}`}
                      style={{ height: `${profH}%` }}
                      className="w-2.5 bg-blue-500 rounded-t-sm transition-all duration-300 hover:opacity-80"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 truncate max-w-[65px] text-center">
                    {f.name}
                  </span>
                </div>
              );
            })}

            {/* Total Aggregate Column */}
            <div className="flex flex-col items-center gap-1 flex-1 max-w-[80px]">
              <div className="w-full flex items-end justify-center gap-1 h-32">
                <div
                  title={`Total Revenue: ${formatCurrency(totalRevenue)}`}
                  style={{ height: '90%' }}
                  className="w-2.5 bg-emerald-500 rounded-t-sm"
                />
                <div
                  title={`Total Expense: ${formatCurrency(totalRiderPayout + totalHubExpenses)}`}
                  style={{ height: '75%' }}
                  className="w-2.5 bg-[#E53935] rounded-t-sm"
                />
                <div
                  title={`Total Profit: ${formatCurrency(netProfit)}`}
                  style={{ height: '45%' }}
                  className="w-2.5 bg-blue-500 rounded-t-sm"
                />
              </div>
              <span className="text-[10px] font-bold text-gray-900">Total</span>
            </div>
          </div>
        </div>

        {/* 2. Donut Chart: Expense Breakdown */}
        <div className="lg:col-span-4 bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="text-xs font-bold text-gray-900 mb-2">
            Expense Breakdown <span className="text-gray-400 font-normal">({selectedMonthFilter})</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            {/* Donut graphic */}
            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="4"
                  strokeDasharray="35 100"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="4"
                  strokeDasharray="25 100"
                  strokeDashoffset="-35"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="4"
                  strokeDasharray="20 100"
                  strokeDashoffset="-60"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="4"
                  strokeDasharray="20 100"
                  strokeDashoffset="-80"
                />
              </svg>
              <div className="absolute text-center">
                <div className="text-xs font-extrabold text-gray-900 leading-none">
                  {formatCurrency(totalHubExpenses)}
                </div>
                <div className="text-[9px] text-gray-400 font-medium mt-0.5">Total Hub</div>
              </div>
            </div>

            {/* Legend list */}
            <div className="space-y-1 text-[11px] flex-1">
              {expenseCategories.map((c) => (
                <div key={c.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="truncate">{c.name}</span>
                  </span>
                  <strong className="text-gray-900">{formatCurrency(c.amount)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Quick Summary: Riders & Advances */}
        <div className="lg:col-span-3 bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-gray-900 mb-3">Quick Summary</div>

            {/* Rider count box */}
            <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl p-2.5 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase">Total Riders</div>
                  <div className="text-sm font-extrabold text-gray-900">{riderStats.total}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold">
                <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{riderStats.paid}</span>
                </div>
                <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{riderStats.pending}</span>
                </div>
              </div>
            </div>

            {/* Advances details */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Advance Given</span>
                <strong className="text-gray-900">{formatCurrency(totalAdvanceGiven)}</strong>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Recovered</span>
                <strong className="text-emerald-600">{formatCurrency(totalAdvanceRecovered)}</strong>
              </div>
              <div className="flex justify-between text-gray-600 border-t border-gray-100 pt-1.5 font-bold">
                <span>Outstanding</span>
                <strong className="text-amber-600">{formatCurrency(totalAdvanceOutstanding)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. ROW 4: FRANCHISE-WISE CARDS, RECENT TRANSACTIONS & ATTENTION REQUIRED */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Franchise-wise Summary Cards */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-gray-900">Franchise-wise Summary</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {franchisePerformance.map((f, idx) => {
              const bgColors = [
                'border-rose-200 bg-rose-50/20 text-rose-700',
                'border-blue-200 bg-blue-50/20 text-blue-700',
                'border-amber-200 bg-amber-50/20 text-amber-700',
                'border-purple-200 bg-purple-50/20 text-purple-700',
              ];
              const tagClass = bgColors[idx % bgColors.length];

              return (
                <div key={f.companyId} className="bg-white border border-[#E5E7EB] rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] border ${tagClass}`}>
                      {f.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-gray-900 truncate">{f.name}</span>
                  </div>

                  <div className="space-y-1.5 text-[11px] text-gray-600">
                    <div className="flex justify-between">
                      <span>Revenue</span>
                      <strong className="text-gray-900">{formatCurrency(f.income)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Expense</span>
                      <strong className="text-gray-700">{formatCurrency(f.payout + f.hubExpense)}</strong>
                    </div>
                    <div className="flex justify-between border-t border-gray-100 pt-1 font-bold">
                      <span>Profit</span>
                      <strong className={f.netProfit >= 0 ? 'text-emerald-600' : 'text-[#E53935]'}>
                        {formatCurrency(f.netProfit)}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="lg:col-span-4 bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-gray-900">Recent Transactions</div>
            <button
              type="button"
              onClick={() => navigate('/transactions')}
              className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="text-gray-400 font-bold border-b border-gray-100">
                  <th className="pb-1.5">Date</th>
                  <th className="pb-1.5">Type</th>
                  <th className="pb-1.5">Party</th>
                  <th className="pb-1.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentTransactions.map((t, idx) => (
                  <tr key={t.id || idx} className="hover:bg-gray-50/50">
                    <td className="py-2 text-gray-500">{t.date}</td>
                    <td className="py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${t.typeColor}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="py-2 font-medium text-gray-800 truncate max-w-[80px]">{t.franchise}</td>
                    <td className={`py-2 text-right font-bold ${t.amountColor}`}>
                      {t.isPositive ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
                {recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-400 italic">
                      No recent transactions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attention Required Alerts */}
        <div className="lg:col-span-3 bg-white border border-rose-100 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                <AlertTriangle className="w-4 h-4 text-[#E53935]" />
                <span>Attention Required</span>
              </div>
              <span className="w-5 h-5 rounded-full bg-[#E53935] text-white flex items-center justify-center text-[10px] font-bold">
                {((riderStats.pending > 0 ? 1 : 0) + (totalAdvanceOutstanding > 0 ? 1 : 0) + (unrecoveredLoss > 0 ? 1 : 0)) || 0}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Alert 1: Pending Rider Payments */}
              <div
                onClick={() => navigate('/payout-details')}
                className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-100 hover:bg-rose-100/50 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-[#E53935]" />
                  <div>
                    <div className="font-bold text-gray-900 text-[11px]">{riderStats.pending} Rider Payouts Pending</div>
                  </div>
                </div>
                <strong className="text-[#E53935] text-[11px]">{formatCurrency(riderStats.pendingAmount)}</strong>
              </div>

              {/* Alert 2: Outstanding Advances */}
              <div
                onClick={() => navigate('/advanced')}
                className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100 hover:bg-amber-100/50 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-amber-600" />
                  <div>
                    <div className="font-bold text-gray-900 text-[11px]">Advance Outstanding</div>
                  </div>
                </div>
                <strong className="text-amber-700 text-[11px]">{formatCurrency(totalAdvanceOutstanding)}</strong>
              </div>

              {/* Alert 3: Loss Recovery Pending */}
              <div
                onClick={() => navigate('/loss-details')}
                className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100/60 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-gray-600" />
                  <div>
                    <div className="font-bold text-gray-900 text-[11px]">Loss Recovery Pending</div>
                  </div>
                </div>
                <strong className="text-gray-900 text-[11px]">{formatCurrency(unrecoveredLoss)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
