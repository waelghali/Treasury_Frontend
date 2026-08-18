import React, { useState, useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import AIQueryAssistantModal from './AIQueryAssistantModal';

// Layout Imports

import SidebarLayout from './Layout/SidebarLayout';
import CorporateAdminLayout from './Layout/CorporateAdminLayout';
import EndUserLayout from './Layout/EndUserLayout';
import ViewerLayout from './Layout/ViewerLayout';

// Service Imports
import { fetchActiveSystemNotifications } from '../services/notificationService';

function ProtectedLayout({ onLogout, userRole, userPermissions, customerName, customerId, subscriptionStatus, subscriptionEndDate, hasCustodyModule, hasIssuanceModule, hasQuotationModule, hasReconciliationModule }) {
  const location = useLocation();
  const [activeMenuItem, setActiveMenuItem] = useState(null);
  const [headerTitle, setHeaderTitle] = useState('');
  const [systemNotifications, setSystemNotifications] = useState([]);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);


  // --- 1. LOGIC TO DETERMINE ACTIVE MENU ITEM & TITLE ---
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
      else if (currentPath.startsWith('/system-owner/global-configurations')) { activeItem = 'Global Configurations'; }
      else if (currentPath.startsWith('/system-owner/reports')) { activeItem = 'reports'; title = 'System Reports'; }
      else if (currentPath.startsWith('/system-owner/audit-logs')) { activeItem = 'audit-logs'; title = 'Audit Logs'; }
      else if (currentPath.startsWith('/system-owner/notifications')) { activeItem = 'notifications'; title = 'Notifications'; }
      else if (currentPath.startsWith('/system-owner/profile')) { activeItem = 'profile'; title = 'My Profile'; }
    }
    else if (role === 'corporate_admin') {
      if (currentPath.startsWith('/corporate-admin/dashboard')) { activeItem = 'corporate-admin-dashboard'; title = 'Dashboard'; }
      else if (currentPath.startsWith('/corporate-admin/approval-requests') || currentPath.startsWith('/corporate-admin/approval-inbox')) { activeItem = 'approval-center-page'; title = 'Approval Center'; }
      else if (currentPath.startsWith('/corporate-admin/issuance/requests')) { activeItem = 'issuance-requests'; title = 'Requests Inbox'; }
      else if (currentPath.startsWith('/corporate-admin/issuance/facilities')) { activeItem = 'issuance-facilities'; title = 'Bank Facilities'; }
      else if (currentPath.startsWith('/corporate-admin/issuance/bank-accounts')) { activeItem = 'issuance-bank-accounts'; title = 'Bank Accounts'; }
      else if (currentPath.startsWith('/corporate-admin/issuance/issued-lgs')) { activeItem = 'issuance-issued-lgs'; title = 'Issued LGs'; }
      else if (currentPath.startsWith('/corporate-admin/issuance/owner-management')) { activeItem = 'issuance-owner-management'; title = 'Owner Management'; }
      else if (currentPath.startsWith('/corporate-admin/issuance/reconciliation')) { activeItem = 'issuance-reconciliation'; title = 'Position Reconciliation'; }
      else if (currentPath.startsWith('/corporate-admin/issuance/migration-hub')) { activeItem = 'issuance-migration-hub'; title = 'Issuance Migration'; }
      else if (currentPath.startsWith('/corporate-admin/lg-records')) { activeItem = 'lg-records'; title = 'All LG Records'; }
      else if (currentPath.startsWith('/corporate-admin/action-center')) { activeItem = 'action-center'; title = 'Action Center'; }
      else if (currentPath.startsWith('/corporate-admin/reconciliation/rules')) { activeItem = 'reconciliation-rules'; title = 'Rules Engine'; }
      else if (currentPath.startsWith('/corporate-admin/reconciliation/export')) { activeItem = 'reconciliation-export'; title = 'Accounting Export'; }
      else if (currentPath.startsWith('/corporate-admin/reconciliation')) { activeItem = 'reconciliation-dashboard'; title = 'Statement Dash'; }
      else if (currentPath.startsWith('/corporate-admin/quotations')) { activeItem = 'quotation-control'; title = 'Quotation Control'; }
      else if (currentPath.startsWith('/corporate-admin/users')) { activeItem = 'user-management'; title = 'User Management'; }
      else if (currentPath.startsWith('/corporate-admin/module-configs')) { activeItem = 'module-configs'; title = 'Settings'; }
      else if (currentPath.startsWith('/corporate-admin/issuance/form-config')) { activeItem = 'issuance-form-config'; title = 'Issuance Form Config'; }
      else if (currentPath.startsWith('/corporate-admin/lg-categories')) { activeItem = 'lg-categories'; title = 'LG Categories'; }
      else if (currentPath.startsWith('/corporate-admin/audit-logs')) { activeItem = 'audit-logs'; title = 'Audit Logs'; }
      else if (currentPath.startsWith('/corporate-admin/reports')) { activeItem = 'reports'; title = 'Reports'; }
      else if (currentPath.startsWith('/corporate-admin/migration-hub')) { activeItem = 'migration-hub'; title = 'Migration Hub'; }
    }
    else if (role === 'end_user') {
      if (currentPath.startsWith('/end-user/dashboard')) { activeItem = 'end-user-dashboard'; title = 'Dashboard'; }
      else if (currentPath.startsWith('/end-user/action-center')) { activeItem = 'end-user-action-center'; title = 'Action Center'; }
      else if (currentPath.startsWith('/end-user/lg-records/new')) { activeItem = 'end-user-record-new-lg'; title = 'Record New LG'; }
      else if (currentPath.startsWith('/end-user/lg-records')) { activeItem = 'end-user-manage-lg-records'; title = 'Manage LG Records'; }
      else if (currentPath.startsWith('/end-user/pending-approvals')) { activeItem = 'end-user-pending-approvals'; title = 'Withdraw Request'; }
      else if (currentPath.startsWith('/end-user/internal-owners')) { activeItem = 'end-user-internal-owners'; title = 'Manage Internal Owners'; }
      else if (currentPath.startsWith('/end-user/quotations/active') || currentPath.startsWith('/end-user/quotations/new')) { activeItem = 'end-user-quotations-active'; title = 'Active Quotations'; }
      else if (currentPath.startsWith('/end-user/quotations/history') || currentPath.startsWith('/end-user/quotations/dashboard') || currentPath.startsWith('/end-user/quotations')) { activeItem = 'end-user-quotations-history'; title = 'Quotation History'; }
      else if (currentPath.startsWith('/end-user/issuance/requests')) { activeItem = 'issuance-requests'; title = 'Issuance Requests'; }
      else if (currentPath.startsWith('/end-user/issuance/issued-lgs')) { activeItem = 'issuance-issued-lgs'; title = 'Issued LGs'; }
      else if (currentPath.startsWith('/end-user/issuance/reconciliation')) { activeItem = 'issuance-reconciliation'; title = 'Pos. Reconciliation'; }
      else if (currentPath.startsWith('/end-user/reports')) { activeItem = 'end-user-reports'; title = 'Reports'; }
    }
    else if (role === 'viewer') {
      if (currentPath.startsWith('/viewer/dashboard')) { activeItem = 'dashboard'; title = 'Dashboard'; }
      else if (currentPath.startsWith('/viewer/lg-records')) { activeItem = 'lg-records'; title = 'LG Records'; }
      else if (currentPath.startsWith('/viewer/reports')) { activeItem = 'reports'; title = 'Reports'; }
      else if (currentPath.startsWith('/viewer/notifications')) { activeItem = 'notifications'; title = 'Notifications'; }
      else if (currentPath.startsWith('/viewer/profile')) { activeItem = 'profile'; title = 'My Profile'; }
    }

    return { activeItem, title };
  };

  useEffect(() => {
    const { activeItem, title } = getActiveState(location.pathname, userRole);
    setActiveMenuItem(activeItem);
    setHeaderTitle(title);
  }, [location.pathname, userRole]);

  // --- 2. NOTIFICATIONS LOGIC ---
  useEffect(() => {
    // Optimization: End Users AND Corporate Admins fetch their own notifications in their layouts.
    if (userRole === 'end_user' || userRole === 'corporate_admin') return;

    const loadNotifications = async () => {
      try {
        const data = await fetchActiveSystemNotifications();
        setSystemNotifications(data);
      } catch (error) {
        console.error("Failed to load system notifications in layout", error);
      }
    };
    loadNotifications();
  }, [userRole]);

  // Helper to wrap layout with AI Assistant trigger & modal
  const renderWithAiAssistant = (layoutComponent) => (
    <>
      {layoutComponent}

      {/* Floating AI Assistant Trigger Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsAiModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 group border border-white/20"
          title="AI Assistant — Experimental"
        >
          <Sparkles className="w-5 h-5 text-amber-300 animate-pulse group-hover:rotate-12 transition-transform" />
          <span className="font-bold text-sm tracking-wide">AI Assistant</span>
          <span className="bg-amber-400 text-slate-900 text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full">
            POC
          </span>
        </button>
      </div>

      <AIQueryAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        userRole={userRole}
      />
    </>
  );

  // --- 3. RENDERING ---
  if (userRole === 'system_owner') {
    return renderWithAiAssistant(
      <SidebarLayout
        onLogout={onLogout}
        activeMenuItem={activeMenuItem}
        headerTitle={headerTitle}
        systemNotifications={systemNotifications}
      >
        <Outlet />
      </SidebarLayout>
    );
  } else if (userRole === 'corporate_admin' || userRole === 'checker') {
    return renderWithAiAssistant(
      <CorporateAdminLayout
        onLogout={onLogout}
        activeMenuItem={activeMenuItem}
        customerName={customerName}
        customerId={customerId}
        headerTitle={headerTitle}
        // CorporateAdminLayout fetches its own notifications now
        subscriptionStatus={subscriptionStatus}
        subscriptionEndDate={subscriptionEndDate}
        hasCustodyModule={hasCustodyModule}
        hasIssuanceModule={hasIssuanceModule}
        hasQuotationModule={hasQuotationModule}
        hasReconciliationModule={hasReconciliationModule}
        isChecker={userRole === 'checker'}
      >
        <Outlet />
      </CorporateAdminLayout>
    );
  } else if (userRole === 'end_user') {
    return renderWithAiAssistant(
      <EndUserLayout
        onLogout={onLogout}
        activeMenuItem={activeMenuItem}
        customerName={customerName}
        customerId={customerId}
        headerTitle={headerTitle}
        subscriptionStatus={subscriptionStatus}
        subscriptionEndDate={subscriptionEndDate}
        userPermissions={userPermissions}
        hasCustodyModule={hasCustodyModule}
        hasIssuanceModule={hasIssuanceModule}
        hasQuotationModule={hasQuotationModule}
        hasReconciliationModule={hasReconciliationModule}
      >
        <Outlet />
      </EndUserLayout>
    );
  } else if (userRole === 'viewer') {
    return renderWithAiAssistant(
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
        <p className="mt-2 text-gray-500">Loading...</p>
      </div>
    );
  }
}


export default ProtectedLayout;