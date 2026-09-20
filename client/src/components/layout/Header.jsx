import React, { useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Lock,
  Unlock,
  LogOut,
  Settings,
  Building2,
  Calendar,
  User,
} from 'lucide-react';
import { useLock } from '../../context/LockContext';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
import { Dropdown } from '../common/Dropdown';
import { CustomDropdown } from '../common/CustomDropdown';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const Header = () => {
  const { isLocked, toggleLock } = useLock();
  const { currentUser, logout } = useAuth();
  const {
    companies,
    selectedCompanyFilter,
    setSelectedCompanyFilter,
    selectedMonthFilter,
    setSelectedMonthFilter,
    selectedFinancialYear,
    setSelectedFinancialYear,
  } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();

  // Filter only Active companies for dropdown
  const activeCompanies = useMemo(() => {
    return companies.filter((c) => c.status === 'Active');
  }, [companies]);

  // Fallback to the first active company if selected company is no longer active or empty
  useEffect(() => {
    if (activeCompanies.length > 0) {
      if (
        !selectedCompanyFilter ||
        selectedCompanyFilter === 'all' ||
        !activeCompanies.some((c) => c.id === selectedCompanyFilter)
      ) {
        setSelectedCompanyFilter(activeCompanies[0].id || activeCompanies[0]._id);
      }
    }
  }, [selectedCompanyFilter, activeCompanies, setSelectedCompanyFilter]);

  // Page title lookup
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/transactions') return 'Transactions';
    if (path === '/payout-details') return 'Payout Details';
    if (path === '/loss-details') return 'Loss Details';
    if (path === '/hub-expenses' || path === '/expenses') return 'Hub Expenses';
    if (path === '/settings') return 'Settings';
    if (path === '/my-payment') return 'My Payment';
    if (path === '/advanced') return 'Advanced';
    if (path === '/profile') return 'Profile';
    if (path.startsWith('/companies/')) return 'Company Details';
    if (path === '/companies' || path === '/hub') return 'Companies';
    return 'Portal';
  };

  // Company Options for CustomDropdown (Only active individual companies)
  const companyOptions = useMemo(() => {
    return activeCompanies.map((c) => ({
      value: c.id,
      label: c.name,
      icon: Building2,
    }));
  }, [activeCompanies]);

  // Dynamic Financial Year Options (Formatted as 2024-2025, 2025-2026, 2026-2027, etc.)
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
        icon: Calendar,
      });
    }
    return years;
  }, []);

  // Month Options for CustomDropdown
  const monthOptions = useMemo(() => {
    return MONTHS.map((m) => ({
      value: m,
      label: m,
      icon: Calendar,
    }));
  }, []);

  return (
    <header className="h-14 w-full bg-white border-b border-[#E5E7EB] px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* LEFT SIDE: Page Title + Company + Financial Year + Month Filter + Edit/Lock Toggle */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
        {/* Page Title */}
        <span className="text-base sm:text-lg font-bold text-gray-900 tracking-tight shrink-0">
          {getPageTitle()}
        </span>

        <span className="text-gray-300 hidden sm:inline">|</span>

        {/* Global Company Filter Dropdown (Active Companies Only) */}
        <CustomDropdown
          value={selectedCompanyFilter}
          onChange={setSelectedCompanyFilter}
          options={companyOptions}
          icon={Building2}
          size="sm"
          searchable={true}
          minWidth="150px"
        />

        {/* Global Financial Year Dropdown */}
        <CustomDropdown
          value={selectedFinancialYear}
          onChange={setSelectedFinancialYear}
          options={financialYearOptions}
          icon={Calendar}
          size="sm"
          searchable={false}
          minWidth="130px"
        />

        {/* Global Month Filter Dropdown */}
        <CustomDropdown
          value={selectedMonthFilter}
          onChange={setSelectedMonthFilter}
          options={monthOptions}
          icon={Calendar}
          size="sm"
          searchable={true}
          minWidth="135px"
        />

        {/* GLOBAL LOCK/EDIT TOGGLE */}
        <button
          type="button"
          onClick={toggleLock}
          title={isLocked ? 'Currently locked. Click to enable Edit Mode' : 'Currently in Edit Mode. Click to lock'}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border cursor-pointer select-none shrink-0
            ${
              isLocked
                ? 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 shadow-xs'
                : 'bg-[#FFEBEE] text-[#E53935] border-[#FFCDD2] hover:bg-red-100 shadow-xs'
            }
          `}
        >
          {isLocked ? (
            <>
              <Lock className="w-3.5 h-3.5 text-gray-600" />
              <span>Locked Mode</span>
            </>
          ) : (
            <>
              <Unlock className="w-3.5 h-3.5 text-[#E53935]" />
              <span>Edit Mode</span>
            </>
          )}
        </button>
      </div>

      {/* RIGHT SIDE: Admin Profile Dropdown */}
      <div className="flex items-center shrink-0">
        <Dropdown
          align="right"
          trigger={
            <div className="flex items-center gap-2 pl-1 cursor-pointer select-none">
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={currentUser?.name || 'Admin'}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-200"
              />
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-gray-900 leading-none">{currentUser?.name || 'Admin User'}</div>
                <div className="text-[10px] text-gray-400 font-medium leading-tight mt-0.5">Super Admin</div>
              </div>
            </div>
          }
          items={[
            {
              label: currentUser?.email || 'admin@example.com',
              disabled: true,
            },
            { divider: true },
            {
              label: 'My Profile',
              icon: User,
              onClick: () => navigate('/profile'),
            },
            {
              label: 'Settings',
              icon: Settings,
              onClick: () => navigate('/settings'),
            },
            { divider: true },
            {
              label: 'Log Out',
              icon: LogOut,
              danger: true,
              onClick: () => {
                logout();
                navigate('/login');
              },
            },
          ]}
        />
      </div>
    </header>
  );
};
