// src/CorporateAdminRoutes.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Import all Corporate Admin Pages
import UnifiedDashboard from '../pages/CorporateAdmin/UnifiedDashboard';
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
import IssuanceMigrationPage from '../pages/CorporateAdmin/IssuanceMigrationPage';
import IssuanceRequestsPage from '../pages/CorporateAdmin/IssuanceRequestsPage';
import IssuanceApprovalInboxPage from '../pages/CorporateAdmin/IssuanceApprovalInboxPage';
import IssuanceFormConfigPage from '../pages/CorporateAdmin/IssuanceFormConfigPage';
// NEW: Import Facilities Page
import FacilitiesPage from '../pages/CorporateAdmin/FacilitiesPage';
import BankAccountsPage from '../pages/CorporateAdmin/BankAccountsPage';
import IssuedLGsPage from '../pages/EndUser/IssuedLGsPage';
import LGOwnerManagementPage from '../pages/EndUser/LGOwnerManagementPage';
import LGReconciliationPage from '../pages/EndUser/LGReconciliationPage';
import IssuanceRequestForm from '../pages/Public/PublicIssuanceForm';
// NEW: Import Bank Reconciliation Module
import ImportDashboard from '../pages/CorporateAdmin/BankReconciliation/ImportDashboard';
import ReconciliationWorkspace from '../pages/CorporateAdmin/BankReconciliation/ReconciliationWorkspace';
import RuleManagement from '../pages/CorporateAdmin/BankReconciliation/RuleManagement';
import AccountingExport from '../pages/CorporateAdmin/BankReconciliation/AccountingExport';
// NEW: Import Admin Quotation Dashboard
import AdminQuotationDashboard from '../pages/CorporateAdmin/AdminQuotationDashboard';
import TreasuryDashboard from '../pages/CorporateAdmin/TreasuryDashboard';
import InboxPage from '../pages/EndUser/InboxPage';
import InboxScheduleConfigPage from '../pages/CorporateAdmin/InboxScheduleConfigPage';

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

function CorporateAdminRoutes({ onLogout, subscriptionStatus, customerId, hasIssuanceModule, hasCustodyModule }) {
  const isGracePeriod = subscriptionStatus === 'grace';

  return (
    <Routes>
      <Route path="dashboard" element={<UnifiedDashboard hasCustodyModule={hasCustodyModule} hasIssuanceModule={hasIssuanceModule} isGracePeriod={isGracePeriod} />} />
      <Route path="lg-categories" element={<LGCategoryList onLogout={onLogout} isGracePeriod={isGracePeriod} />} />
      <Route path="lg-categories/new" element={<LGCategoryForm onLogout={onLogout} isGracePeriod={isGracePeriod} />} />
      <Route path="lg-categories/edit/:id" element={<LGCategoryForm onLogout={onLogout} isGracePeriod={isGracePeriod} />} />
      <Route path="users" element={<UserManagementPage onLogout={onLogout} isGracePeriod={isGracePeriod} hasIssuanceModule={hasIssuanceModule} />} />
      <Route path="users/new" element={<UserForm onLogout={onLogout} isGracePeriod={isGracePeriod} />} />
      <Route path="users/edit/:id" element={<UserForm onLogout={onLogout} isGracePeriod={isGracePeriod} />} />
      <Route path="module-configs" element={<CustomerConfigurationManagementPage onLogout={onLogout} isGracePeriod={isGracePeriod} customerId={customerId} />} />
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
      <Route path="expiring-lgs" element={<LGRecordListReadOnlyPage />} />
      <Route path="entities" element={<CustomerConfigurationManagementPage onLogout={onLogout} isGracePeriod={isGracePeriod} customerId={customerId} />} />
      <Route path="action-center" element={<ActionCenter />} />

      {/* Issuance Module Routes */}
      {/* Treasury Dashboard now merged into unified dashboard */}
      <Route path="issuance/request-new" element={<IssuanceRequestForm />} />
      <Route path="issuance/requests/new" element={<IssuanceRequestForm />} />
      <Route path="issuance/requests" element={<IssuanceRequestsPage />} />
      <Route path="issuance/requests/edit/:id" element={<IssuanceRequestForm />} />
      <Route path="issuance/form-config" element={<IssuanceFormConfigPage />} />
      {/* NEW: Facilities Route */}
      <Route path="issuance/facilities" element={<FacilitiesPage />} />
      <Route path="issuance/bank-accounts" element={<BankAccountsPage />} />
      <Route path="issuance/issued-lgs" element={<IssuedLGsPage />} />
      <Route path="issuance/owner-management" element={<LGOwnerManagementPage />} />
      <Route path="issuance/reconciliation" element={<LGReconciliationPage />} />
      <Route path="issuance/migration-hub" element={<IssuanceMigrationPage />} />
      {/* Issuance Approval Inbox (shared with checker role) */}
      <Route path="approval-inbox" element={<IssuanceApprovalInboxPage />} />

      {/* NEW: Reconciliation Module Route */}
      <Route path="reconciliation" element={<ImportDashboard />} />
      <Route path="reconciliation/workspace" element={<ReconciliationWorkspace />} />
      <Route path="reconciliation/workspace/:statementId" element={<ReconciliationWorkspace />} />
      <Route path="reconciliation/rules" element={<RuleManagement />} />
      <Route path="reconciliation/export" element={<AccountingExport />} />

      {/* Quotation Module Route */}
      <Route path="quotations" element={<AdminQuotationDashboard />} />
      <Route path="quotations/dashboard" element={<AdminQuotationDashboard />} />
      <Route path="quotations/approvals" element={<AdminQuotationDashboard />} />

      {/* Smart Inbox Routes */}
      <Route path="inbox" element={<InboxPage />} />
      <Route path="inbox/schedule" element={<InboxScheduleConfigPage />} />

      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}

export default CorporateAdminRoutes;