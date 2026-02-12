import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { 
  Home, Users, FolderKanban, LogOut, Settings, FileText, 
  BarChart, Hourglass, ClipboardList, DatabaseZap, Send, Building,
  ChevronLeft, ChevronRight 
} from 'lucide-react';
import NotificationBanner from '../NotificationBanner';
import SubscriptionBanner from '../SubscriptionBanner';
import { apiRequest } from '../../services/apiService';
import { fetchActiveSystemNotifications } from '../../services/notificationService';
import { parseISO } from 'date-fns';

const getInitialCount = () => {
  try {
    const saved = localStorage.getItem('sidebar_pending_count');
    return saved ? parseInt(saved, 10) : 0;
  } catch { return 0; }
};

function CorporateAdminLayout({ 
  activeMenuItem, 
  onLogout, 
  customerName, 
  subscriptionStatus, 
  subscriptionEndDate 
}) {
  const [pendingCount, setPendingCount] = useState(getInitialCount());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(true);

  const isExpired = subscriptionStatus === 'expired';
  const isGrace = subscriptionStatus === 'grace';

  // Memoized Growth logic to ensure it recalculates correctly
  const growthRatio = useMemo(() => {
    if (!subscriptionEndDate) return 0;
    const endDate = typeof subscriptionEndDate === 'string' ? parseISO(subscriptionEndDate) : new Date(subscriptionEndDate);
    const today = new Date();
    const diffMs = endDate.getTime() - today.getTime();
    const daysRemaining = diffMs / (1000 * 60 * 60 * 24);
    
    if (isExpired || isGrace) {
      const graceDaysElapsed = Math.abs(daysRemaining);
      return Math.min(0.5 + (graceDaysElapsed / 30) * 0.5, 1.0);
    } else {
      if (daysRemaining > 30) return 0;
      if (daysRemaining <= 0) return 0.5;
      return (30 - daysRemaining) / 30 * 0.5;
    }
  }, [subscriptionEndDate, isExpired, isGrace]);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const activeNotifs = await fetchActiveSystemNotifications();
        setNotifications(activeNotifs);
      } catch (error) {
        console.error('Failed to load corporate notifications:', error);
      } finally {
        setIsLoadingNotifs(false);
      }
    }
    loadNotifications();
  }, []);

  const fetchPendingCount = useCallback(async () => {
    try {
      const data = await apiRequest('/corporate-admin/approval-requests/', 'GET');
      const pending = data.filter(req => req.status === 'PENDING');
      const count = pending.length;
      setPendingCount(count);
      localStorage.setItem('sidebar_pending_count', count.toString());
    } catch (err) {
      console.error("Failed to fetch pending count", err);
    }
  }, []);

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 300000);
    return () => clearInterval(interval);
  }, [fetchPendingCount]);

  return (
    <div className="relative flex h-screen bg-[#f8fafc] overflow-hidden">
      {/* BACKGROUND BLOBS */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-500 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-700 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none"></div>

      <aside className={`${isCollapsed ? 'w-20' : 'w-72'} bg-white/80 backdrop-blur-md shadow-lg border-r border-gray-200 flex flex-col flex-shrink-0 transition-all duration-300 relative z-10`}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-10 bg-white border border-gray-200 rounded-full p-1 shadow-md z-10 hover:bg-gray-50"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        <div className="py-4 px-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-center space-x-2">
            <img src="/growlogonleaf.png" alt="Logo" style={{ width: isCollapsed ? '40px' : '80px', height: 'auto' }} />
            {!isCollapsed && <h1 className="text-xl font-bold text-gray-800">Treasury Platform</h1>}
          </div>
          {!isCollapsed && <p className="text-sm text-gray-500 text-center mt-1">Corporate Admin</p>}
        </div>

        <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
          {/* Overview */}
          <div className="pb-2">
            {!isCollapsed && <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Overview</p>}
            <Link to="/corporate-admin/dashboard" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeMenuItem === 'corporate-admin-dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <Home className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!isCollapsed && <span>Dashboard</span>}
            </Link>
          </div>

          {/* Issuance */}
          <div className="pb-2">
             {!isCollapsed && <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Issuance</p>}
             <Link to="/corporate-admin/issuance/requests" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeMenuItem === 'issuance-requests' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
               <Send className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
               {!isCollapsed && <span>Requests Inbox</span>}
             </Link>
             <Link to="/corporate-admin/issuance/facilities" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeMenuItem === 'issuance-facilities' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
               <Building className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
               {!isCollapsed && <span>Bank Facilities</span>}
             </Link>
          </div>

          {/* LG Management */}
          <div className="pb-2">
            {!isCollapsed && <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">LG Management</p>}
            <Link to="/corporate-admin/lg-records" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeMenuItem === 'lg-records' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <FolderKanban className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!isCollapsed && <span>All LG Records</span>}
            </Link>
            
            <Link to="/corporate-admin/approval-requests" className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md ${activeMenuItem === 'pending-approvals' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <div className={`flex items-center ${isCollapsed ? 'mx-auto' : ''}`}>
                <Hourglass className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && <span>Pending Approvals</span>}
              </div>
              {!isCollapsed && pendingCount > 0 && (
                <span className="inline-flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </Link>

            <Link to="/corporate-admin/action-center" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeMenuItem === 'action-center' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <ClipboardList className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!isCollapsed && <span>Action Center</span>}
            </Link>
          </div>

          {/* Configuration */}
          {!isExpired && (
            <div className="pb-2">
              {!isCollapsed && <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Configuration</p>}
              <Link to="/corporate-admin/users" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeMenuItem === 'user-management' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Users className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
                {!isCollapsed && <span>User Management</span>}
              </Link>
              <Link to="/corporate-admin/module-configs" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeMenuItem === 'module-configs' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Settings className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
                {!isCollapsed && <span>Settings</span>}
              </Link>
              <Link to="/corporate-admin/lg-categories" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeMenuItem === 'lg-categories' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <FileText className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
                {!isCollapsed && <span>LG Categories</span>}
              </Link>
            </div>
          )}

          {/* System */}
          <div className="pb-2">
            {!isCollapsed && <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">System</p>}
            <Link to="/corporate-admin/audit-logs" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeMenuItem === 'audit-logs' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <FileText className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!isCollapsed && <span>Audit Logs</span>}
            </Link>
            <Link to="/corporate-admin/reports" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeMenuItem === 'reports' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <BarChart className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!isCollapsed && <span>Reports</span>}
            </Link>
            <Link to="/corporate-admin/migration-hub" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeMenuItem === 'migration-hub' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <DatabaseZap className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!isCollapsed && <span>Migration Hub</span>}
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center mb-1">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-500 text-white text-sm font-semibold flex-shrink-0">CA</span>
            {!isCollapsed && (
              <div className="ml-3">
                <p className="text-sm font-semibold text-gray-800">Corporate Admin</p>
                <p className="text-xs text-gray-500">{customerName ? `Org: ${customerName}` : 'Org: N/A'}</p>
              </div>
            )}
          </div>
          <button onClick={onLogout} className="w-full flex items-center justify-center p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut className={`h-5 w-5 ${isCollapsed ? '' : 'mr-2'}`} />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative z-10">
        {(isGrace || isExpired) && (
          <div className="sticky top-0 z-20">
            <SubscriptionBanner 
              subscriptionEndDate={subscriptionEndDate} 
              isExpired={isExpired}
              growthRatio={growthRatio}
            />
          </div>
        )}

        <div className="p-8">
          {!isLoadingNotifs && notifications.length > 0 && (
            <div className="mb-4">
              <NotificationBanner notifications={notifications} />
            </div>
          )}

          {isExpired ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white/50 backdrop-blur-sm rounded-xl border border-red-200 shadow-sm">
              <h2 className="text-xl font-bold text-gray-800">Account Restricted</h2>
              <p className="text-gray-600">Your subscription has expired. Please renew to restore full access.</p>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
}

export default CorporateAdminLayout;