import React, { useState, useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { 
  Home, Users, FolderKanban, LogOut, Settings, FileText, 
  BarChart, Hourglass, ClipboardList, DatabaseZap, Send, Building 
} from 'lucide-react';
import NotificationBanner from '../NotificationBanner';
import SubscriptionBanner from '../SubscriptionBanner';
// Import the Corporate Admin specific service function
import { fetchActiveCorporateAdminNotifications } from '../../services/notificationService'; // Assumed correct path

// REMOVED 'systemNotifications' from props
function CorporateAdminLayout({ activeMenuItem, onLogout, customerName, headerTitle, subscriptionStatus, subscriptionEndDate }) {
  const [notifications, setNotifications] = useState([]); // <-- ADDED State
  const [isLoading, setIsLoading] = useState(true);   // <-- ADDED State
  const isDashboard = activeMenuItem === 'corporate-admin-dashboard';

  // ADDED useEffect to fetch notifications on mount
  useEffect(() => {
    async function loadNotifications() {
      try {
        // Use the Corporate Admin specific fetching function
        const activeNotifs = await fetchActiveCorporateAdminNotifications(); 
        setNotifications(activeNotifs);
      } catch (error) {
        console.error('Failed to load Corporate Admin notifications:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadNotifications();
  }, []);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <aside className="w-72 bg-white shadow-lg border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Header Section */}
        <div className="py-4 px-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-center space-x-2">
            <img src="/growlogonleaf.png" alt="Grow BD Logo" style={{ width: '80px', height: 'auto' }} />
            <h1 className="text-xl font-bold text-gray-800">Treasury Platform</h1>
          </div>
          <p className="text-sm text-gray-500 text-center mt-1">Corporate Admin</p>
        </div>

        {/* Navigation Menu (Unchanged) */}
        <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
          <Link
            to="/corporate-admin/dashboard"
            className={`flex items-center p-3 rounded-lg transition-colors duration-200 ${
              activeMenuItem === 'corporate-admin-dashboard' ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Home className="h-5 w-5 mr-3" />
            Dashboard
          </Link>
          
          <Link
            to="/corporate-admin/customer-entities"
            className={`flex items-center p-3 rounded-lg transition-colors duration-200 ${
              activeMenuItem === 'corporate-admin-customer-entities' ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Building className="h-5 w-5 mr-3" />
            Customer Entities
          </Link>

          <Link
            to="/corporate-admin/manage-users"
            className={`flex items-center p-3 rounded-lg transition-colors duration-200 ${
              activeMenuItem === 'corporate-admin-manage-users' ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Users className="h-5 w-5 mr-3" />
            Manage Users
          </Link>
          
          <Link
            to="/corporate-admin/lg-records"
            className={`flex items-center p-3 rounded-lg transition-colors duration-200 ${
              activeMenuItem === 'corporate-admin-manage-lg-records' ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FolderKanban className="h-5 w-5 mr-3" />
            Manage LG Records
          </Link>

          <Link
            to="/corporate-admin/pending-approvals"
            className={`flex items-center p-3 rounded-lg transition-colors duration-200 ${
              activeMenuItem === 'corporate-admin-pending-approvals' ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FileText className="h-5 w-5 mr-3" />
            Pending Approvals
          </Link>
          
          <Link
            to="/corporate-admin/action-center"
            className={`flex items-center p-3 rounded-lg transition-colors duration-200 ${
              activeMenuItem === 'corporate-admin-action-center' ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ClipboardList className="h-5 w-5 mr-3" />
            Action Center
          </Link>
          
          <Link
            to="/corporate-admin/reports"
            className={`flex items-center p-3 rounded-lg transition-colors duration-200 ${
              activeMenuItem === 'corporate-admin-reports' ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BarChart className="h-5 w-5 mr-3" />
            Reports
          </Link>
          
          <Link
            to="/corporate-admin/configuration"
            className={`flex items-center p-3 rounded-lg transition-colors duration-200 ${
              activeMenuItem === 'corporate-admin-configuration' ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Settings className="h-5 w-5 mr-3" />
            Configuration
          </Link>

        </nav>
        
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center mb-1">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-500 text-white text-sm font-semibold">CA</span>
            <div className="ml-3">
              <p className="text-sm font-semibold text-gray-800">Corporate Admin</p>
              <p className="text-xs text-gray-500">{customerName ? `Org: ${customerName}` : 'Org: N/A'}</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center justify-center p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200">
            <LogOut className="h-5 w-5 mr-2" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center pb-6 border-b border-gray-200 mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">{headerTitle}</h1>
        </header>

        {/* MODIFIED: Move NotificationBanner to an unconditional position */}
        <div className="mb-6 space-y-4">
          {/* Render UNCONDITIONALLY if notifications are loaded and present */}
          {!isLoading && notifications.length > 0 && (
            <NotificationBanner notifications={notifications} />
          )}
          
          <SubscriptionBanner status={subscriptionStatus} endDate={subscriptionEndDate} />
        </div>
        
        <Outlet />
      </main>
    </div>
  );
}

export default CorporateAdminLayout;