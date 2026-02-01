// frontend/src/routes/SystemOwnerRoutes.js

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Import all System Owner Pages
import SystemOwnerDashboard from 'pages/SystemOwner/Dashboard';
import SubscriptionPlanList from 'pages/SystemOwner/SubscriptionPlans/SubscriptionPlanList';
import SubscriptionPlanForm from 'pages/SystemOwner/SubscriptionPlans/SubscriptionPlanForm';
import CustomerList from 'pages/SystemOwner/Customers/CustomerList';
import CustomerOnboardingForm from 'pages/SystemOwner/Customers/CustomerOnboardingForm';
import CustomerDetailsPage from 'pages/SystemOwner/Customers/CustomerDetailsPage';
import TrialRegistrationList from 'pages/SystemOwner/Customers/TrialRegistrationList.js'; // NEW IMPORT
import GlobalConfigurationList from 'pages/SystemOwner/GlobalConfigurations/GlobalConfigurationList';
import GlobalConfigurationForm from 'pages/SystemOwner/GlobalConfigurations/GlobalConfigurationForm';
import CommonListManagementPage from 'pages/SystemOwner/GlobalConfigurations/CommonListManagementPage';
import TemplateList from 'pages/SystemOwner/GlobalConfigurations/TemplateList';
import TemplateForm from 'pages/SystemOwner/GlobalConfigurations/TemplateForm';
import AuditLogs from 'pages/SystemOwner/AuditLogs';
import SchedulerPage from 'pages/SystemOwner/scheduler/SchedulerPage';
// NEW: Import System Notification pages
import SystemNotificationList from 'pages/SystemOwner/SystemNotifications/SystemNotificationList';
import SystemNotificationForm from 'pages/SystemOwner/SystemNotifications/SystemNotificationForm';

// NEW: Import LG Category management components from the Corporate Admin folder
import LGCategoryList from 'pages/CorporateAdmin/LGCategoryList';
import LGCategoryForm from 'pages/CorporateAdmin/LGCategoryForm';


// NEW: Import the generic ReportsPage and the single report component for this role
import ReportsPage from 'pages/Reports/ReportsPage';
import CustomerLGPerformanceReport from 'pages/Reports/CustomerLGPerformanceReport';

// Define the single report for the System Owner role
const systemOwnerReports = [
  {
    name: "System Usage Overview",
    description: "Monitor business traction, growth, and adoption.",
    path: "system-usage-overview",
    iconName: "BarChart" 
  },
];

/**
 * SystemOwnerRoutes component defines all routes accessible by a System Owner.
 */
function SystemOwnerRoutes({ onLogout }) {
  return (
    <Routes>
      {/* Dashboard */}
      <Route path="dashboard" element={<SystemOwnerDashboard onLogout={onLogout} />} />

      {/* Subscription Plans */}
      <Route path="subscription-plans" element={<SubscriptionPlanList onLogout={onLogout} />} />
      <Route path="subscription-plans/new" element={<SubscriptionPlanForm onLogout={onLogout} />} />
      <Route path="subscription-plans/edit/:id" element={<SubscriptionPlanForm onLogout={onLogout} />} />

      {/* Customer Management */}
      <Route path="customers" element={<CustomerList onLogout={onLogout} />} />
      <Route path="customers/onboard" element={<CustomerOnboardingForm onLogout={onLogout} />} />
      <Route path="customers/:id/details" element={<CustomerDetailsPage onLogout={onLogout} />} />
      {/* NEW ROUTE: Trial Registrations List */}
      <Route path="customers/trial-registrations" element={<TrialRegistrationList onLogout={onLogout} />} />

      {/* Global Configurations */}
      <Route path="global-configurations" element={<GlobalConfigurationList onLogout={onLogout} />} />
      <Route path="global-configurations/new" element={<GlobalConfigurationForm onLogout={onLogout} />} />
      <Route path="global-configurations/edit/:id" element={<GlobalConfigurationForm onLogout={onLogout} />} />
      <Route path="global-configurations/common-list/:listType" element={<CommonListManagementPage onLogout={onLogout} />} />
      <Route path="global-configurations/templates" element={<TemplateList onLogout={onLogout} />} />
      <Route path="global-configurations/templates/new" element={<TemplateForm onLogout={onLogout} />} />
      <Route path="global-configurations/templates/edit/:id" element={<TemplateForm onLogout={onLogout} />} />
      <Route path="scheduler" element={<SchedulerPage onLogout={onLogout} />} />

      {/* LG Category Management (NEW ROUTES FOR SYSTEM OWNER) */}
      <Route path="lg-categories/universal" element={<LGCategoryList onLogout={onLogout} userRole="system-owner" />} />
      <Route path="lg-categories/universal/new" element={<LGCategoryForm onLogout={onLogout} userRole="system-owner" />} />
      <Route path="lg-categories/universal/edit/:id" element={<LGCategoryForm onLogout={onLogout} userRole="system-owner" />} />
      
      {/* System Notifications (NEW ROUTES) */}
      <Route path="system-notifications" element={<SystemNotificationList onLogout={onLogout} />} />
      <Route path="system-notifications/new" element={<SystemNotificationForm onLogout={onLogout} />} />
      <Route path="system-notifications/edit/:id" element={<SystemNotificationForm onLogout={onLogout} />} />

      {/* Audit Logs */}
      <Route path="audit-logs" element={<AuditLogs onLogout={onLogout} />} />

      {/* Reports (Updated for System Owner) */}
      <Route path="reports" element={<ReportsPage reports={systemOwnerReports} />}>
        {/* The index route navigates directly to the single report page */}
        <Route index element={<Navigate to="system-usage-overview" replace />} />
        <Route path="system-usage-overview" element={<CustomerLGPerformanceReport />} />
      </Route>

      {/* Fallback for any unmatched path within /system-owner/* */}
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}

export default SystemOwnerRoutes;