// src/CorporateAdminRoutes.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Import all Corporate Admin Pages
import CorporateAdminDashboard from '../pages/CorporateAdmin/CorporateAdminDashboard';
import LGCategoryList from '../pages/CorporateAdmin/LGCategoryList';
import LGCategoryForm from '../pages/CorporateAdmin/LGCategoryForm';
import UserManagementPage from '../pages/CorporateAdmin/UserManagementPage';
import UserForm from '../pages/CorporateAdmin/UserForm';
import CustomerConfigurationManagementPage from '../pages/CorporateAdmin/CustomerConfigurationManagementPage';
import PendingApprovalsPage from '../pages/CorporateAdmin/PendingApprovalsPage';
import LGDetailsReadOnlyPage from '../pages/CorporateAdmin/LGDetailsReadOnlyPage';
import LGRecordListReadOnlyPage from '../pages/CorporateAdmin/LGRecordListReadOnlyPage';
import AuditLogsCorporate from '../pages/CorporateAdmin/AuditLogsCorporate';
import ActionCenter from '../pages/CorporateAdmin/ActionCenter';
import MigrationUploadPage from '../pages/CorporateAdmin/MigrationUploadPage';
import IssuanceRequestsPage from '../pages/CorporateAdmin/IssuanceRequestsPage';
// NEW: Import Facilities Page
import FacilitiesPage from '../pages/CorporateAdmin/FacilitiesPage';

// NEW: Import the generic ReportsPage and the single report component for this role
import ReportsPage from '../pages/Reports/ReportsPage';
import CustomerLGPerformanceReport from '../pages/Reports/CustomerLGPerformanceReport';

// Define the single report for the Corporate Admin role
const corporateAdminReports = [
  { 
    name: "Customer LG Performance", 
    description: "View LG issuance, expiry, and costs by department/entity.", 
    path: "customer-lg-performance",
    iconName: "BarChart"
  },
];

function CorporateAdminRoutes({ onLogout, subscriptionStatus }) {
  const isGracePeriod = subscriptionStatus === 'grace';

  return (
    <Routes>
      <Route path="dashboard" element={<CorporateAdminDashboard />} />
      <Route path="lg-categories" element={<LGCategoryList onLogout={onLogout} isGracePeriod={isGracePeriod} />} />
      <Route path="lg-categories/new" element={<LGCategoryForm onLogout={onLogout} isGracePeriod={isGracePeriod} />} />
      <Route path="lg-categories/edit/:id" element={<LGCategoryForm onLogout={onLogout} isGracePeriod={isGracePeriod} />} />
      <Route path="users" element={<UserManagementPage onLogout={onLogout} isGracePeriod={isGracePeriod} />} />
      <Route path="users/new" element={<UserForm onLogout={onLogout} isGracePeriod={isGracePeriod} />} />
      <Route path="users/edit/:id" element={<UserForm onLogout={onLogout} isGracePeriod={isGracePeriod} />} />
      <Route path="module-configs" element={<CustomerConfigurationManagementPage onLogout={onLogout} isGracePeriod={isGracePeriod} />} />
      <Route path="approval-requests" element={<PendingApprovalsPage />} />

      {/* Reports */}
      <Route path="reports" element={<ReportsPage reports={corporateAdminReports} />}>
        <Route index element={<Navigate to="customer-lg-performance" replace />} />
        <Route path="customer-lg-performance" element={<CustomerLGPerformanceReport />} />
      </Route>

      <Route path="audit-logs" element={<AuditLogsCorporate onLogout={onLogout} />} />
      <Route path="migration-hub" element={<MigrationUploadPage onLogout={onLogout} />} />
      
      {/* Existing LG Records Views */}
      <Route path="lg-records" element={<LGRecordListReadOnlyPage />} />
      <Route path="lg-records/:id" element={<LGDetailsReadOnlyPage />} />
      <Route path="action-center" element={<ActionCenter />} />

      {/* Issuance Module Routes */}
      <Route path="issuance/requests" element={<IssuanceRequestsPage />} />
      {/* NEW: Facilities Route */}
      <Route path="issuance/facilities" element={<FacilitiesPage />} />

      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}

export default CorporateAdminRoutes;