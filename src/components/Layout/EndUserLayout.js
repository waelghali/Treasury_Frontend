import React, { useState, useEffect, useMemo } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { 
  Home, FileText, PlusCircle, BarChart, LogOut, 
  FolderKanban, Users, ListTodo, ChevronLeft, ChevronRight 
} from 'lucide-react';
import NotificationBanner from '../NotificationBanner';
import SubscriptionBanner from '../SubscriptionBanner'; 
import { fetchActiveSystemNotifications } from '../../services/notificationService';
import { parseISO } from 'date-fns';

function EndUserLayout({ onLogout, activeMenuItem, customerName, headerTitle, subscriptionStatus, subscriptionEndDate }) { 
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const activeNotifs = await fetchActiveSystemNotifications();
        setNotifications(activeNotifs);
      } catch (error) {
        console.error('Failed to load end-user notifications:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadNotifications();
  }, []); 

  const isExpired = subscriptionStatus === 'expired';
  const isGracePeriod = subscriptionStatus === 'grace';

  // Calculate growthRatio with precision to ensure it grows bigger over time
  const growthRatio = useMemo(() => {
    if (!subscriptionEndDate) return 0;
    
    const endDate = typeof subscriptionEndDate === 'string' 
      ? parseISO(subscriptionEndDate) 
      : new Date(subscriptionEndDate);
    const today = new Date();
    
    // Difference in decimal days
    const diffMs = endDate.getTime() - today.getTime();
    const daysRemaining = diffMs / (1000 * 60 * 60 * 24);
    
    if (isExpired || isGracePeriod) {
      // During grace period, grow from 0.5 to 1.0
      const graceDaysElapsed = Math.abs(daysRemaining);
      return Math.min(0.5 + (graceDaysElapsed / 30) * 0.5, 1.0);
    } else {
      // Within 30 days of expiry, grow from 0 to 0.5
      if (daysRemaining > 30) return 0;
      if (daysRemaining <= 0) return 0.5;
      return (30 - daysRemaining) / 30 * 0.5;
    }
  }, [subscriptionEndDate, isExpired, isGracePeriod]);

  return (
    <div className="relative flex h-screen bg-[#f8fafc] overflow-hidden">
      {/* BACKGROUND BLOBS */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-500 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-700 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none" style={{ animationDelay: '3s' }}></div>
      <div className="hidden lg:block fixed top-1/4 left-10 w-32 h-32 bg-gradient-to-tr from-blue-400 to-blue-600 rounded-full opacity-10 animate-float pointer-events-none"></div>
      <div className="hidden lg:block fixed bottom-1/3 right-12 w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full opacity-10 animate-float-delayed pointer-events-none"></div>

      {/* SIDEBAR */}
      <aside 
        className={`${
          isCollapsed ? 'w-20' : 'w-72'
        } bg-white/80 backdrop-blur-md shadow-lg border-r border-gray-200 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out relative z-10`}
      >
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-12 bg-white border border-gray-200 rounded-full p-1 shadow-md hover:text-blue-600 z-50 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="py-6 px-4 border-b border-gray-200 flex-shrink-0">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-start ml-2'} space-x-2`}>
            <img src="/growlogonleaf.png" alt="Logo" style={{ width: '40px', height: 'auto' }} />
            {!isCollapsed && (
              <h1 className="text-xl font-bold text-gray-800 whitespace-nowrap overflow-hidden">
                Treasury
              </h1>
            )}
          </div>
          {!isCollapsed && <p className="text-xs text-gray-500 text-center mt-2 font-medium uppercase tracking-wider">End User Edition</p>}
        </div>

        <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
          <Link
            to="/end-user/dashboard"
            title={isCollapsed ? "Dashboard" : ""}
            className={`flex items-center px-3 py-3 rounded-lg transition-colors duration-200 ${
              activeMenuItem === 'end-user-dashboard' ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Home className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3 text-sm">Dashboard</span>}
          </Link>

          <Link
            to="/end-user/action-center"
            title={isCollapsed ? "Action Center" : ""}
            className={`flex items-center px-3 py-3 rounded-lg transition-colors duration-200 ${
              activeMenuItem === 'end-user-action-center' ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ListTodo className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3 text-sm">Action Center</span>}
          </Link>

          <Link
            to="/end-user/lg-records/new"
            title={isCollapsed ? "Record New LG" : ""}
            className={`flex items-center px-3 py-3 rounded-lg transition-colors duration-200 ${
              activeMenuItem === 'end-user-record-new-lg' ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <PlusCircle className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3 text-sm">Record New LG</span>}
          </Link>

          <Link
            to="/end-user/lg-records"
            title={isCollapsed ? "Manage LG Records" : ""}
            className={`flex items-center px-3 py-3 rounded-lg transition-colors duration-200 ${
              activeMenuItem === 'end-user-manage-lg-records' ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FolderKanban className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3 text-sm">Manage LG Records</span>}
          </Link>

          <Link
            to="/end-user/pending-approvals"
            title={isCollapsed ? "Withdraw Request" : ""}
            className={`flex items-center px-3 py-3 rounded-lg transition-colors duration-200 ${
              activeMenuItem === 'end-user-pending-approvals' ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FileText className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3 text-sm">Withdraw Request</span>}
          </Link>

          <Link
            to="/end-user/internal-owners"
            title={isCollapsed ? "Manage Internal Owners" : ""}
            className={`flex items-center px-3 py-3 rounded-lg transition-colors duration-200 ${
              activeMenuItem === 'end-user-internal-owners' ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Users className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3 text-sm">Internal Owners</span>}
          </Link>

          <Link
            to="/end-user/reports"
            title={isCollapsed ? "Reports" : ""}
            className={`flex items-center px-3 py-3 rounded-lg transition-colors duration-200 ${
              activeMenuItem === 'end-user-reports' ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BarChart className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3 text-sm">Reports</span>}
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <div className={`flex items-center mb-4 ${isCollapsed ? 'justify-center' : 'ml-2'}`}>
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-500 text-white text-xs font-bold flex-shrink-0">
              EU
            </span>
            {!isCollapsed && (
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-semibold text-gray-800 truncate">End User</p>
                <p className="text-[10px] text-gray-500 truncate">Org: {customerName}</p>
              </div>
            )}
          </div>
          <button
            onClick={onLogout}
            title={isCollapsed ? "Sign Out" : ""}
            className="w-full flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-2 text-sm font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto relative z-10">
        {/* Banner area becomes sticky to ensure visibility as it grows */}
        {(isGracePeriod || isExpired) && (
          <div className="sticky top-0 z-20">
            <SubscriptionBanner 
              subscriptionEndDate={subscriptionEndDate} 
              isExpired={isExpired}
              growthRatio={growthRatio}
            />
          </div>
        )}

        <div className="p-8">
          {!isLoading && notifications.length > 0 && (
            <div className="mb-4">
              <NotificationBanner notifications={notifications} />
            </div>
          )}

          {isExpired ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white/50 backdrop-blur-sm rounded-xl border border-red-200 shadow-sm text-center px-4">
              <h2 className="text-xl font-bold text-gray-800">Account Restricted</h2>
              <p className="text-gray-600">Your subscription has expired. Please contact your administrator to restore access.</p>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
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

export default EndUserLayout;