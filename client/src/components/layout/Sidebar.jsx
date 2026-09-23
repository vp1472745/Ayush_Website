import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  IndianRupee,
  Users,
  Wallet,
  AlertTriangle,
  Building2,
  FileText,
  BarChart3,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import websiteLogo from '../../wesbite_image_folder/wesbitelogo.png';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/my-payment', label: 'Franchise Payments', icon: IndianRupee },
  { path: '/payout-details', label: 'Rider Payout', icon: Users },
  { path: '/advanced', label: 'Rider Advances', icon: Wallet },
  { path: '/loss-details', label: 'Loss & Recovery', icon: AlertTriangle },
  { path: '/hub-expenses', label: 'Hub Expenses', icon: Building2 },
  { path: '/transactions', label: 'Transaction Ledger', icon: FileText },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/profile', label: 'Profile', icon: User },
];

export const Sidebar = ({ isCollapsed, onToggleCollapse }) => {
  return (
    <aside
      className={`
        fixed top-0 bottom-0 left-0 z-40 bg-[#0f172a] border-r border-[#1e293b] flex flex-col justify-between
        transition-all duration-200 ease-in-out h-screen shadow-lg
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
    >
      <div>
        {/* Top Branding */}
        <div className={`h-14 flex items-center border-b border-[#1e293b] bg-[#0d1527] ${isCollapsed ? 'justify-center px-2' : 'px-4 justify-start gap-2.5'}`}>
          <img
            src={websiteLogo}
            alt="Logo"
            className="w-9 h-9 object-contain rounded-lg shrink-0 drop-shadow-sm ring-1 ring-white/10"
          />
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="text-sm font-bold text-white tracking-tight leading-tight">
                AYUSH <span className="text-[#E53935]">HUB</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                Management
              </span>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1.5 overflow-y-auto">
          {!isCollapsed && (
            <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Main Menu
            </div>
          )}
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) => `
                  relative flex items-center rounded-xl text-xs font-semibold transition-all duration-150 group
                  ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3.5 py-2.5'}
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-[#e53935] to-[#f43f5e] text-white font-bold shadow-md shadow-red-500/25'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Collapse Toggle */}
      <div className="p-2.5 border-t border-[#1e293b] bg-[#0c1424] flex items-center justify-center">
        <button
          type="button"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
