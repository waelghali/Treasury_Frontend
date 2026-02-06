import React, { useState, useEffect, useCallback } from 'react';
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

// --- BEYOND REACT: INSTANT CACHE READ ---
const getInitialCount = () => {
  try {
    const saved = localStorage.getItem('sidebar_pending_count');
    return saved ? parseInt(saved, 10) : 0;
  } catch { return 0; }
};
const initialValue = getInitialCount();

function CorporateAdminLayout({ 
  activeMenuItem, 
  onLogout, 
  customerName, 
  subscriptionStatus, 
  subscriptionEndDate 
}) {
  const [pendingCount, setPendingCount] = useState(initialValue);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(true);

  // Fetch notifications for Corporate Admin (Similar to EndUser logic)
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
  
  const isDashboard = activeMenuItem === 'corporate-admin-dashboard';

  return (
    <div className="relative flex h-screen bg-[#f8fafc] overflow-hidden">
      {/* BACKGROUND BLOBS & ORBS FROM LOGIN */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-500 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-700 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none" style={{ animationDelay: '3s' }}></div>
      <div className="hidden lg:block fixed top-1/4 left-10 w-32 h-32 bg-gradient-to-tr from-blue-400 to-blue-600 rounded-full opacity-10 animate-float pointer-events-none"></div>
      <div className="hidden lg:block fixed bottom-1/3 right-12 w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full opacity-10 animate-float-delayed pointer-events-none"></div>

      <aside className={`${isCollapsed ? 'w-20' : 'w-72'} bg-white/80 backdrop-blur-md shadow-lg border-r border-gray-200 flex flex-col flex-shrink-0 transition-all duration-300 relative z-10`}>
        
        {/* Collapse Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-10 bg-white border border-gray-200 rounded-full p-1 shadow-md z-10 hover:bg-gray-50"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        <div className="py-4 px-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-center space-x-2">
            <img src="/growlogonleaf.png" alt="Grow BD Logo" style={{ width: isCollapsed ? '40px' : '80px', height: 'auto' }} />
            {!isCollapsed && <h1 className="text-xl font-bold text-gray-800">Treasury Platform</h1>}
          </div>
          {!isCollapsed && <p className="text-sm text-gray-500 text-center mt-1">Corporate Admin</p>}
        </div>

        <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
          {/* Overview */}
          <div className="pb-2">
            {!isCollapsed && <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Overview</p>}
            <Link title="Dashboard" to="/corporate-admin/dashboard" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'corporate-admin-dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <Home className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!isCollapsed && <span>Dashboard</span>}
            </Link>
          </div>

          {/* Issuance */}
          <div className="pb-2">
             {!isCollapsed && <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Issuance</p>}
             <Link title="Requests Inbox" to="/corporate-admin/issuance/requests" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'issuance-requests' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
               <Send className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
               {!isCollapsed && <span>Requests Inbox</span>}
             </Link>
             <Link title="Bank Facilities" to="/corporate-admin/issuance/facilities" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'issuance-facilities' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
               <Building className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
               {!isCollapsed && <span>Bank Facilities</span>}
             </Link>
          </div>

          <div className="pb-2">
            {!isCollapsed && <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">LG Management</p>}
            <Link title="All LG Records" to="/corporate-admin/lg-records" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'lg-records' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <FolderKanban className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!isCollapsed && <span>All LG Records</span>}
            </Link>
            
            <Link 
              title="Pending Approvals"
              to="/corporate-admin/approval-requests" 
              className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'pending-approvals' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <div className={`flex items-center ${isCollapsed ? 'mx-auto' : ''}`}>
                <Hourglass className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && <span>Pending Approvals</span>}
              </div>
              
              {!isCollapsed && (
                <span 
                  className="inline-flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full text-[10px] font-bold transition-opacity duration-200"
                  style={{
                    backgroundColor: pendingCount > 0 ? '#ef4444' : 'transparent',
                    color: pendingCount > 0 ? 'white' : 'transparent',
                    opacity: pendingCount > 0 ? 1 : 0
                  }}
                >
                  {pendingCount > 9 ? '9+' : (pendingCount || 0)}
                </span>
              )}
            </Link>

            <Link title="Action Center" to="/corporate-admin/action-center" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'action-center' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <ClipboardList className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!isCollapsed && <span>Action Center</span>}
            </Link>
          </div>

          <div className="pb-2">
            {!isCollapsed && <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Configuration</p>}
            <Link title="User Management" to="/corporate-admin/users" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'user-management' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <Users className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!isCollapsed && <span>User Management</span>}
            </Link>
             <Link title="Settings" to="/corporate-admin/module-configs" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'module-configs' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <Settings className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!isCollapsed && <span>Settings</span>}
            </Link>
             <Link title="LG Categories" to="/corporate-admin/lg-categories" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'lg-categories' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <FileText className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!isCollapsed && <span>LG Categories</span>}
            </Link>
          </div>
          
           <div className="pb-2">
            {!isCollapsed && <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">System</p>}
            <Link title="Audit Logs" to="/corporate-admin/audit-logs" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'audit-logs' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <FileText className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!isCollapsed && <span>Audit Logs</span>}
            </Link>
             <Link title="Reports" to="/corporate-admin/reports" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'reports' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <BarChart className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!isCollapsed && <span>Reports</span>}
            </Link>
             <Link title="Migration Hub" to="/corporate-admin/migration-hub" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'migration-hub' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
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
          <button onClick={onLogout} className={`w-full flex items-center justify-center p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200`}>
            <LogOut className={`h-5 w-5 ${isCollapsed ? '' : 'mr-2'}`} />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto relative z-10">
        {/* Notifications appear on ALL pages now */}
        {!isLoadingNotifs && notifications.length > 0 && (
          <div className="mb-4">
            <NotificationBanner notifications={notifications} />
          </div>
        )}

        {isDashboard && (
          <div className="mb-6 space-y-4">
             <SubscriptionBanner status={subscriptionStatus} endDate={subscriptionEndDate} />
          </div>
        )}
        <Outlet />
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-40px) scale(1.05); } }
        @keyframes float-delayed { 0%, 100% { transform: translateY(0) scale(1.05); } 50% { transform: translateY(40px) scale(1); } }
        .animate-float { animation: float 10s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 12s ease-in-out infinite; }
      `}} />
    </div>
  );
}

export default CorporateAdminLayout;