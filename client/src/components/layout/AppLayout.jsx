import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useLock } from '../../context/LockContext';
import { Lock, Unlock, X } from 'lucide-react';

export const AppLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { isLocked, toggleLock } = useLock();

  return (
    <div className="h-screen w-screen bg-[#F7F8FA] font-sans antialiased flex overflow-hidden">
      {/* Fixed Sidebar on Left */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
      />

      {/* Main Layout Container (Offset by sidebar width: w-64 or w-20) */}
      <div
        className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-200 ${
          isCollapsed ? 'pl-20' : 'pl-64'
        }`}
      >
        {/* Fixed Header directly above main content */}
        <div
          className={`fixed top-0 right-0 z-30 transition-all duration-200 ${
            isCollapsed ? 'left-20' : 'left-64'
          }`}
        >
          <Header />
        </div>

        {/* Main Content Container: Fixed height on Desktop, Responsive on Mobile */}
        <div className="pt-14 flex-1 flex flex-col h-[calc(100vh-3.5rem)] min-h-0 overflow-hidden">
          {/* Global Lock Alert Banner */}
          {isLocked && !bannerDismissed && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-1 flex items-center justify-between text-xs text-amber-900 shrink-0 z-20">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  <strong className="font-semibold">Locked Mode Active:</strong> Turn on Edit Mode to edit tables.
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleLock}
                  className="font-semibold text-amber-900 underline hover:text-amber-950 flex items-center gap-1 cursor-pointer"
                >
                  <Unlock className="w-3 h-3" />
                  Enable Edit Mode
                </button>
                <button
                  type="button"
                  onClick={() => setBannerDismissed(true)}
                  className="text-amber-500 hover:text-amber-700 p-0.5 cursor-pointer"
                  title="Dismiss banner"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Page Body: Full-height flex child */}
          <main className="flex-1 p-2 sm:p-2.5 w-full flex flex-col min-h-0 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
