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
import ActivityAndControlsPage from '../pages/CorporateAdmin/ActivityAndControlsPage';
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
// Bank Reconciliation Oversight & Governance Module
import ReconciliationAdminOverview from '../pages/CorporateAdmin/BankReconciliation/ReconciliationAdminOverview';
import ReconciliationWorkspace from '../pages/CorporateAdmin/BankReconciliation/ReconciliationWorkspace';
import RuleManagement from '../pages/CorporateAdmin/BankReconciliation/RuleManagement';
import AccountingExport from '../pages/CorporateAdmin/BankReconciliation/AccountingExport';
// NEW: Import Admin Quotation Dashboard
import AdminQuotationDashboard from '../pages/CorporateAdmin/AdminQuotationDashboard';
import ResultsView from '../pages/EndUser/Quotations/ResultsView';
import InboxPage from '../pages/EndUser/InboxPage';
import InboxScheduleConfigPage from '../pages/CorporateAdmin/InboxScheduleConfigPage';

// NEW: Import the generic ReportsPage and module-specific report components
import ReportsPage from '../pages/Reports/ReportsPage';
import CustomerLGPerformanceReport from '../pages/Reports/CustomerLGPerformanceReport';
import IssuanceAnalyticsReport from '../pages/Reports/IssuanceAnalyticsReport';
import { isCachedTrialSession } from '../components/Trial/useTrialExperience';

function CorporateAdminRoutes({ onLogout, subscriptionStatus, customerId, isTrial = false, hasIssuanceModule, hasCustodyModule, hasQuotationModule = true, hasReconciliationModule = true }) {
  const isGracePeriod = subscriptionStatus === 'grace';
  const effectiveIsTrial = Boolean(isTrial || isCachedTrialSession(customerId));
  const isQuotationOnly = !effectiveIsTrial && !hasCustodyModule && !hasIssuanceModule && hasQuotationModule;
  const isReconOnly = !effectiveIsTrial && !hasCustodyModule && !hasIssuanceModule && !hasQuotationModule && hasReconciliationModule;
  const nonLgLanding = isQuotationOnly ? "quotations" : isReconOnly ? "reconciliation" : null;

  const corporateAdminReports = [
    ...(hasIssuanceModule
      ? [
          {
            name: "LG Issuance Intelligence",
            description: "Portfolio exposure, facility headroom, bank SLA & pricing scorecard, and velocity.",
            path: "issuance-intelligence",
            iconName: "Send",
          },
        ]
      : []),
    ...(hasCustodyModule
      ? [
          {
            name: "LG Custody Ops Health",
            description: "Incoming guarantee custody telemetry, instruction backlogs, and expiry risks.",
            path: "customer-lg-performance",
            iconName: "FileText",
          },
        ]
      : []),
  ];

  const defaultReportPath = hasIssuanceModule ? "issuance-intelligence" : "customer-lg-performance";

  return (
    <Routes>
      <Route path="dashboard" element={nonLgLanding ? <Navigate to={`../${nonLgLanding}`} replace /> : <UnifiedDashboard hasCustodyModule={hasCustodyModule} hasIssuanceModule={hasIssuanceModule} isGracePeriod={isGracePeriod} />} />
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
        <Route index element={<Navigate to={defaultReportPath} replace />} />
        <Route path="issuance-intelligence" element={<IssuanceAnalyticsReport />} />
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
      <Route
        path="activity"
        element={
          <ActivityAndControlsPage
            hasCustodyModule={hasCustodyModule}
            hasIssuanceModule={hasIssuanceModule}
            hasQuotationModule={hasQuotationModule}
            hasReconciliationModule={hasReconciliationModule}
            isGracePeriod={isGracePeriod}
          />
        }
      />

      {/* Issuance Module Routes — Corporate Admin is Checker/Oversight (no maker creation/edit routes) */}
      <Route path="issuance/request-new" element={<Navigate to="../issuance/requests" replace />} />
      <Route path="issuance/requests/new" element={<Navigate to="../issuance/requests" replace />} />
      <Route path="issuance/requests" element={<IssuanceRequestsPage />} />
      <Route path="issuance/requests/edit/:id" element={<Navigate to="../issuance/requests" replace />} />
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

      {/* Bank Reconciliation Oversight & Governance Routes */}
      {hasReconciliationModule ? (
        <>
          <Route path="reconciliation" element={<ReconciliationAdminOverview />} />
          <Route path="reconciliation/dashboard" element={<ReconciliationAdminOverview />} />
          <Route path="reconciliation/workspace" element={<ReconciliationWorkspace readOnly={true} />} />
          <Route path="reconciliation/workspace/:statementId" element={<ReconciliationWorkspace readOnly={true} />} />
          <Route path="reconciliation/rules" element={<RuleManagement />} />
          <Route path="reconciliation/export" element={<AccountingExport />} />
        </>
      ) : (
        <Route path="reconciliation/*" element={<Navigate to={`../${nonLgLanding || 'dashboard'}`} replace />} />
      )}

      {/* Quotation Module Route */}
      <Route path="quotations" element={<AdminQuotationDashboard />} />
      <Route path="quotations/dashboard" element={<AdminQuotationDashboard />} />
      <Route path="quotations/approvals" element={<AdminQuotationDashboard />} />
      <Route path="quotations/results/:id" element={<ResultsView />} />

      {/* Smart Inbox Routes */}
      <Route path="inbox" element={<InboxPage />} />
      <Route path="inbox/schedule" element={<InboxScheduleConfigPage />} />

      <Route path="*" element={<Navigate to={nonLgLanding || "dashboard"} replace />} />
    </Routes>
  );
}

export default CorporateAdminRoutes;