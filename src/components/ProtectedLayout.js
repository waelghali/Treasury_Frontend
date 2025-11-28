import React, { useState, useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import SidebarLayout from './Layout/SidebarLayout';
import CorporateAdminLayout from './Layout/CorporateAdminLayout';
import EndUserLayout from './Layout/EndUserLayout';
import ViewerLayout from './Layout/ViewerLayout'; 
import { fetchActiveSystemNotifications } from '../services/notificationService';

function ProtectedLayout({ onLogout, userRole, userPermissions, customerName, subscriptionStatus, subscriptionEndDate }) {
  const location = useLocation();
  const [activeMenuItem, setActiveMenuItem] = useState(null);
  const [headerTitle, setHeaderTitle] = useState('');
  const [systemNotifications, setSystemNotifications] = useState([]);
  
  const getActiveState = (currentPath, role) => {
    let activeItem = null;
    let title = '';

    if (!currentPath || !role) {
      return { activeItem, title };
    }
    
    if (role === 'system_owner') {
      if (currentPath.startsWith('/system-owner/dashboard')) { activeItem = 'dashboard'; title = 'Treasury Dashboard'; }
      else if (currentPath.startsWith('/system-owner/customers')) { activeItem = 'customer-management'; title = 'Customer Management'; }
      else if (currentPath.startsWith('/system-owner/subscription-plans')) { activeItem = 'subscription-plans'; title = 'Subscription Plans'; }
      else if (currentPath.startsWith('/system-owner/global-configurations')) { activeItem = 'global-configurations'; title = 'Global Configurations'; }
      else if (currentPath.startsWith('/system-owner/audit-logs')) { activeItem = 'audit-logs'; title = 'System Audit Logs'; }
      else if (currentPath.startsWith('/system-owner/reports')) { activeItem = 'reports'; title = 'System Reports'; }
      else if (currentPath.startsWith('/system-owner/system-notifications')) { activeItem = 'system-notifications'; title = 'System Notifications'; }
      else if (currentPath.startsWith('/system-owner/scheduler')) { activeItem = 'scheduler'; title = 'Scheduler Status'; }
    } 
    else if (role === 'corporate_admin') {
      if (currentPath.startsWith('/corporate-admin/dashboard')) { activeItem = 'corporate-admin-dashboard'; title = 'Corporate Dashboard'; }
      else if (currentPath.startsWith('/corporate-admin/users')) { activeItem = 'user-management'; title = 'User Management'; }
      else if (currentPath.startsWith('/corporate-admin/module-configs')) { activeItem = 'module-configs'; title = 'Module Configurations'; }
      else if (currentPath.startsWith('/corporate-admin/lg-categories')) { activeItem = 'lg-categories'; title = 'LG Categories'; }
      else if (currentPath.startsWith('/corporate-admin/approval-requests')) { activeItem = 'pending-approvals'; title = 'Pending Approvals'; }
      else if (currentPath.startsWith('/corporate-admin/lg-records')) { activeItem = 'lg-records'; title = 'LG Records'; }
      else if (currentPath.startsWith('/corporate-admin/audit-logs')) { activeItem = 'audit-logs'; title = 'Audit Logs'; }
      else if (currentPath.startsWith('/corporate-admin/reports')) { activeItem = 'reports'; title = 'Reports'; }
      else if (currentPath.startsWith('/corporate-admin/action-center')) { activeItem = 'action-center'; title = 'Action Center'; }
      else if (currentPath.startsWith('/corporate-admin/migration-hub')) { activeItem = 'migration-hub'; title = 'Migration Hub'; }
      
      // --- ISSUANCE MODULE ROUTES ---
      else if (currentPath.startsWith('/corporate-admin/issuance/requests')) { activeItem = 'issuance-requests'; title = 'Issuance Requests Inbox'; }
      else if (currentPath.startsWith('/corporate-admin/issuance/facilities')) { activeItem = 'issuance-facilities'; title = 'Bank Facilities Manager'; }
    }
    else if (role === 'end_user') {
      if (currentPath.startsWith('/end-user/dashboard')) { activeItem = 'end-user-dashboard'; title = 'My Dashboard'; }
      else if (currentPath.startsWith('/end-user/lg-records/new')) { activeItem = 'record-new-lg'; title = 'Record New LG'; }
      else if (currentPath.startsWith('/end-user/lg-records')) { activeItem = 'manage-lg-records'; title = 'Manage LG Records'; }
      else if (currentPath.startsWith('/end-user/internal-owners')) { activeItem = 'manage-internal-owners'; title = 'Manage Internal Owners'; }
      else if (currentPath.startsWith('/end-user/pending-approvals')) { activeItem = 'pending-approvals'; title = 'Pending Approvals'; }
      else if (currentPath.startsWith('/end-user/action-center')) { activeItem = 'action-center'; title = 'Action Center'; }
      else if (currentPath.startsWith('/end-user/reports')) { activeItem = 'reports'; title = 'Reports'; }
    }
    else if (role === 'viewer') {
       if (currentPath.startsWith('/end-user/dashboard')) { activeItem = 'end-user-dashboard'; title = 'Dashboard'; }
       else if (currentPath.startsWith('/end-user/lg-records')) { activeItem = 'manage-lg-records'; title = 'LG Records (View Only)'; }
       else if (currentPath.startsWith('/end-user/reports')) { activeItem = 'reports'; title = 'Reports'; }
    }

    return { activeItem, title };
  };

  useEffect(() => {
    const { activeItem, title } = getActiveState(location.pathname, userRole);
    setActiveMenuItem(activeItem);
    setHeaderTitle(title);
  }, [location.pathname, userRole]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const notifs = await fetchActiveSystemNotifications();
        setSystemNotifications(notifs);
      } catch (error) {
        console.error("Failed to load notifications:", error);
      }
    };
    if (userRole) {
      loadNotifications();
    }
  }, [userRole]);

  if (userRole === 'system_owner') {
    return (
      <SidebarLayout 
        onLogout={onLogout} 
        activeMenuItem={activeMenuItem}
        headerTitle={headerTitle} 
      >
        <Outlet />
      </SidebarLayout>
    );
  } else if (userRole === 'corporate_admin') {
    return (
      <CorporateAdminLayout
        onLogout={onLogout}
        activeMenuItem={activeMenuItem}
        customerName={customerName}
        headerTitle={headerTitle}
        systemNotifications={systemNotifications}
        subscriptionStatus={subscriptionStatus}
        subscriptionEndDate={subscriptionEndDate}
      >
        <Outlet />
      </CorporateAdminLayout>
    );
  } else if (userRole === 'end_user') {
    return (
      <EndUserLayout
        onLogout={onLogout}
        activeMenuItem={activeMenuItem}
        customerName={customerName}
        headerTitle={headerTitle}
        systemNotifications={systemNotifications}
        subscriptionStatus={subscriptionStatus}
        subscriptionEndDate={subscriptionEndDate}
        userPermissions={userPermissions}
      >
        <Outlet />
      </EndUserLayout>
    );
  } else if (userRole === 'viewer') {
    return (
      <ViewerLayout
        onLogout={onLogout}
        activeMenuItem={activeMenuItem}
        customerName={customerName}
        headerTitle={headerTitle}
        systemNotifications={systemNotifications}
      >
        <Outlet />
      </ViewerLayout>
    );
  } else {
    return (
      <div className="text-center py-8">
        <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }
}

export default ProtectedLayout;