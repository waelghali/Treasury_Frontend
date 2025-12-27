import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { 
  Home, Users, FolderKanban, LogOut, Settings, FileText, 
  BarChart, Hourglass, ClipboardList, DatabaseZap, Send, Building 
} from 'lucide-react';
import NotificationBanner from '../NotificationBanner';
import SubscriptionBanner from '../SubscriptionBanner';

function CorporateAdminLayout({ activeMenuItem, onLogout, customerName, headerTitle, systemNotifications, subscriptionStatus, subscriptionEndDate }) {
  const isDashboard = activeMenuItem === 'corporate-admin-dashboard';

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

        {/* Navigation Menu */}
        <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
          
          <div className="pb-2">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Overview</p>
            <Link to="/corporate-admin/dashboard" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'corporate-admin-dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <Home className="h-5 w-5 mr-3" />
              Dashboard
            </Link>
          </div>

          {/* --- ISSUANCE MODULE SECTION --- */}
          <div className="pb-2">
             <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Issuance</p>
             <Link to="/corporate-admin/issuance/requests" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'issuance-requests' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
               <Send className="h-5 w-5 mr-3" />
               Requests Inbox
             </Link>
             {/* NEW LINK: Bank Facilities */}
             <Link to="/corporate-admin/issuance/facilities" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'issuance-facilities' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
               <Building className="h-5 w-5 mr-3" />
               Bank Facilities
             </Link>
          </div>
          {/* ------------------------------- */}

          <div className="pb-2">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">LG Management</p>
            <Link to="/corporate-admin/lg-records" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'lg-records' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <FolderKanban className="h-5 w-5 mr-3" />
              All LG Records
            </Link>
            <Link to="/corporate-admin/approval-requests" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'pending-approvals' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <Hourglass className="h-5 w-5 mr-3" />
              Pending Approvals
            </Link>
            <Link to="/corporate-admin/action-center" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'action-center' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <ClipboardList className="h-5 w-5 mr-3" />
              Action Center
            </Link>
          </div>

          <div className="pb-2">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Configuration</p>
            <Link to="/corporate-admin/users" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'user-management' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <Users className="h-5 w-5 mr-3" />
              User Management
            </Link>
             <Link to="/corporate-admin/module-configs" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'module-configs' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <Settings className="h-5 w-5 mr-3" />
              Settings
            </Link>
             <Link to="/corporate-admin/lg-categories" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'lg-categories' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <FileText className="h-5 w-5 mr-3" />
              LG Categories
            </Link>
          </div>
          
           <div className="pb-2">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">System</p>
            <Link to="/corporate-admin/audit-logs" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'audit-logs' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <FileText className="h-5 w-5 mr-3" />
              Audit Logs
            </Link>
             <Link to="/corporate-admin/reports" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'reports' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <BarChart className="h-5 w-5 mr-3" />
              Reports
            </Link>
             <Link to="/corporate-admin/migration-hub" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeMenuItem === 'migration-hub' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <DatabaseZap className="h-5 w-5 mr-3" />
              Migration Hub
            </Link>
          </div>

        </nav>

        {/* Footer */}
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
        {isDashboard && (
          <div className="mb-6 space-y-4">
             <SubscriptionBanner status={subscriptionStatus} endDate={subscriptionEndDate} />
            {systemNotifications && systemNotifications.length > 0 && <NotificationBanner notifications={systemNotifications} />}
          </div>
        )}
        
        <Outlet />
      </main>
    </div>
  );
}

export default CorporateAdminLayout;