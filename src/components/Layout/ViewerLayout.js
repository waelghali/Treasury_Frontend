import React, { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Home, LogOut, FolderKanban, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import NotificationBanner from '../NotificationBanner';
import SubscriptionBanner from '../SubscriptionBanner';

function ViewerLayout({ onLogout, activeMenuItem, customerName, headerTitle, systemNotifications, subscriptionStatus, subscriptionEndDate }) {
  const isDashboard = activeMenuItem === 'end-user-dashboard';
  const isGracePeriod = subscriptionStatus === 'grace';
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="relative flex h-screen bg-[#f8fafc] overflow-hidden" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* BACKGROUND BLOBS */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-500 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-700 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none" style={{ animationDelay: '3s' }}></div>

      {/* SIDEBAR — Dark Navy */}
      <aside
        className={`${isCollapsed ? 'w-20' : 'w-72'
          } flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out relative z-10`}
        style={{ backgroundColor: '#1e2a4a', borderRight: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-[0.04] bg-white -mr-24 -mt-24 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-[0.03] bg-blue-400 -ml-16 -mb-16 pointer-events-none" />

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-12 rounded-full p-1 shadow-md z-50 transition-colors border"
          style={{ backgroundColor: '#1e2a4a', borderColor: 'rgba(255,255,255,0.15)', color: '#93bbfc' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#60a5fa'; e.currentTarget.style.borderColor = '#60a5fa'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#93bbfc'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Logo area */}
        <div className="py-5 px-4 flex-shrink-0 flex flex-col items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <img src="/Grow logo Leaf Only NoBG.svg" alt="Logo" style={{ width: isCollapsed ? '36px' : '120px', height: 'auto', transition: 'width 0.3s ease' }} />
          {!isCollapsed && (
            <div className="mt-2 text-center">
              <span className="text-xl font-bold text-white tracking-tight">Grow</span>
              <span className="text-sm font-medium ml-1.5" style={{ color: '#60a5fa' }}>Treasury</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-grow p-3 space-y-1 overflow-y-auto relative z-10 dark-sidebar-nav">
          <Link
            to="/end-user/dashboard"
            title={isCollapsed ? "Dashboard" : ""}
            className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'end-user-dashboard' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
            style={activeMenuItem === 'end-user-dashboard' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
          >
            <Home className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3">Dashboard</span>}
          </Link>
          <Link
            to="/end-user/lg-records"
            title={isCollapsed ? "Manage LG Records" : ""}
            className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'end-user-manage-lg-records' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
            style={activeMenuItem === 'end-user-manage-lg-records' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
          >
            <FolderKanban className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3">Manage LG Records</span>}
          </Link>
          <Link
            to="/end-user/internal-owners"
            title={isCollapsed ? "Manage Internal Owners" : ""}
            className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeMenuItem === 'end-user-internal-owners' ? 'font-semibold' : 'hover:bg-white/[0.07]'}`}
            style={activeMenuItem === 'end-user-internal-owners' ? { backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' } : { color: '#cbd5e1' }}
          >
            <Users className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3">Manage Internal Owners</span>}
          </Link>
        </nav>

        {/* User info & Logout */}
        <div className="p-4 flex-shrink-0 relative z-10" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className={`flex items-center mb-4 ${isCollapsed ? 'justify-center' : 'ml-2'}`}>
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: '#2563eb' }}>
              EU
            </span>
            {!isCollapsed && (
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">End User</p>
                <p className="text-[10px] truncate" style={{ color: '#94a3b8' }}>{customerName || 'My Organization'}</p>
              </div>
            )}
          </div>
          <button
            onClick={onLogout}
            title={isCollapsed ? "Sign Out" : ""}
            className="w-full flex items-center justify-center p-2 rounded-lg transition-colors duration-200"
            style={{ color: '#f87171' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-2 text-sm font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 pb-24 overflow-y-auto relative z-10">
        {isGracePeriod && (
          <div className="sticky top-0 z-20">
            <SubscriptionBanner subscriptionEndDate={subscriptionEndDate} />
          </div>
        )}

        <div className="p-8">
          {isDashboard && <NotificationBanner notifications={systemNotifications} />}
          <Outlet />
        </div>
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-40px) scale(1.05); } }
        @keyframes float-delayed { 0%, 100% { transform: translateY(0) scale(1.05); } 50% { transform: translateY(40px) scale(1); } }
        .animate-float { animation: float 10s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 12s ease-in-out infinite; }
        /* Dark sidebar scrollbar */
        .dark-sidebar-nav::-webkit-scrollbar { width: 6px; }
        .dark-sidebar-nav::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 6px; }
        .dark-sidebar-nav::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.45); border-radius: 6px; }
        .dark-sidebar-nav::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.65); }
      `}} />
    </div>
  );
}

export default ViewerLayout;