import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  CreditCard,
  Tags,
  TrendingDown,
  Receipt,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  Wallet,
  SlidersHorizontal,
} from 'lucide-react';

import websiteLogo from '../../wesbite_image_folder/wesbitelogo.png';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { path: '/payout-details', label: 'Payout Details', icon: Tags },
  { path: '/my-payment', label: 'My Payment', icon: Wallet },

  { path: '/hub-expenses', label: 'Hub Expenses', icon: Receipt },
  { path: '/advanced', label: 'Advanced', icon: SlidersHorizontal },
  { path: '/transactions', label: 'Transaction', icon: CreditCard },
  
  { path: '/loss-details', label: 'Loss Details', icon: TrendingDown },
  
  { path: '/settings', label: 'Settings', icon: Settings },
    
  
  { path: '/profile', label: 'Profile', icon: User },
];

export const Sidebar = ({ isCollapsed, onToggleCollapse }) => {
  return (
    <aside
      className={`
        fixed top-0 bottom-0 left-0 z-40 bg-white border-r border-[#E5E7EB] flex flex-col justify-between
        transition-all duration-200 ease-in-out h-screen
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
    >
      <div>
        {/* Top Branding */}
        <div className={`h-14 flex items-center border-b border-[#E5E7EB] ${isCollapsed ? 'justify-center px-2' : 'px-4 justify-start gap-2.5'}`}>
          <img
            src={websiteLogo}
            alt="Logo"
            className="w-9 h-9 object-contain rounded-lg shrink-0 drop-shadow-xs"
          />
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="text-sm font-bold text-gray-900 tracking-tight leading-tight">
                AYUSH <span className="text-[#E53935]">HUB</span>
              </span>
              <span className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">
                Management
              </span>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="p-2.5 space-y-1 overflow-y-auto">
          {!isCollapsed && (
            <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
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
                  relative flex items-center rounded-lg text-xs font-semibold transition-all duration-150 group
                  ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3.5 py-2.5'}
                  ${
                    isActive
                      ? 'bg-[#FFEBEE] text-[#E53935]'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#E53935] rounded-r-full" />
                    )}
                    <Icon
                      className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                        isActive ? 'text-[#E53935]' : 'text-gray-400 group-hover:text-gray-700'
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
      <div className="p-2 border-t border-gray-100 bg-gray-50/60 flex items-center justify-center">
        <button
          type="button"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-200/70 hover:text-gray-900 transition-colors cursor-pointer"
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
