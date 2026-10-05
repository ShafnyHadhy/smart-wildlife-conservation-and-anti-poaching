import React from 'react';
import { Sidebar, NavPage } from './Sidebar';
import { TopBar } from './TopBar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
  alertsCount?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function DashboardLayout({
  children,
  activePage,
  onNavigate,
  alertsCount = 0,
  onRefresh,
  isRefreshing = false,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-[#F5F5DC] text-stone-800 font-sans antialiased overflow-hidden">
      {/* Fixed Desktop Sidebar */}
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        alertsCount={alertsCount}
      />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onRefresh={onRefresh} isRefreshing={isRefreshing} />

        {/* Scrollable Content Container */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#F5F5DC]">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
