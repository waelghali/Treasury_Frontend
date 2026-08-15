import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Import End User specific pages
import EndUserDashboard from 'pages/EndUser/EndUserDashboard';
import RecordNewLGPage from 'pages/EndUser/RecordNewLGPage';
import LGRecordList from 'pages/EndUser/LGRecordList';
import LGDetailsPage from 'pages/EndUser/LGDetailsPage';
import ManageInternalOwnersPage from 'pages/EndUser/ManageInternalOwnersPage';
import EndUserActionCenter from 'pages/EndUser/EndUserActionCenter';
import EndUserPendingApprovalsPage from 'pages/EndUser/EndUserPendingApprovalsPage';

// NEW: Import Quotation Dashboards
import QuotationRequestDashboard from 'pages/EndUser/Quotations/QuotationRequestDashboard';
import QuotationHistoryDashboard from 'pages/EndUser/Quotations/QuotationHistoryDashboard';
import ResultsView from 'pages/EndUser/Quotations/ResultsView';
import IssuanceRequestsPage from 'pages/CorporateAdmin/IssuanceRequestsPage';
import IssuanceRequestForm from 'pages/Public/PublicIssuanceForm';
import IssuedLGsPage from 'pages/EndUser/IssuedLGsPage';
import LGReconciliationPage from 'pages/EndUser/LGReconciliationPage';

// NEW: Import the generic ReportsPage and the single report component for this role
import ReportsPage from 'pages/Reports/ReportsPage';
import MyLGDashboardReport from 'pages/Reports/MyLGDashboardReport';

// Define the single report for the End User role
const endUserReports = [
  {
    name: "My LG Dashboard",
    description: "Overview of your assigned LGs and pending tasks.",
    path: "my-lg-dashboard",
    iconName: "LayoutDashboard"
  },
];

function EndUserRoutes({ onLogout, subscriptionStatus, hasCustodyModule, hasIssuanceModule }) { // NEW: Receive subscriptionStatus prop
  const isGracePeriod = subscriptionStatus === 'grace'; // NEW: Determine grace period status

  return (
    <Routes>
      {/* End User Dashboard */}
      <Route path="dashboard" element={<EndUserDashboard />} />

      {/* Action Center Page */}
      <Route path="action-center" element={<EndUserActionCenter />} />

      {/* LG Custody routes — only if customer has custody module */}
      {hasCustodyModule ? (
        <>
          <Route path="lg-records/new" element={<RecordNewLGPage isGracePeriod={isGracePeriod} />} />
          <Route path="lg-records" element={<LGRecordList isGracePeriod={isGracePeriod} />} />
          <Route path="lg-records/:id" element={<LGDetailsPage isGracePeriod={isGracePeriod} />} />
          <Route path="expiring-lgs" element={<LGRecordList isGracePeriod={isGracePeriod} />} />
          <Route path="internal-owners" element={<ManageInternalOwnersPage isGracePeriod={isGracePeriod} />} />
          <Route path="pending-approvals" element={<EndUserPendingApprovalsPage isGracePeriod={isGracePeriod} />} />
        </>
      ) : (
        <>
          {/* Redirect custody URLs to dashboard when module is not available */}
          <Route path="lg-records/*" element={<Navigate to="../dashboard" replace />} />
          <Route path="expiring-lgs" element={<Navigate to="../dashboard" replace />} />
          <Route path="internal-owners" element={<Navigate to="../dashboard" replace />} />
          <Route path="pending-approvals" element={<Navigate to="../dashboard" replace />} />
        </>
      )}

      {/* Quotation Module Routes */}
      <Route path="quotations/new" element={<QuotationRequestDashboard />} />
      <Route path="quotations/active" element={<QuotationRequestDashboard />} />
      <Route path="quotations/dashboard" element={<QuotationHistoryDashboard />} />
      <Route path="quotations/history" element={<QuotationHistoryDashboard />} />
      <Route path="quotations/results/:id" element={<ResultsView />} />

      {/* Issuance Module Routes — only if customer has issuance module */}
      {hasIssuanceModule ? (
        <>
          <Route path="issuance/request-new" element={<IssuanceRequestForm />} />
          <Route path="issuance/requests/new" element={<IssuanceRequestForm />} />
          <Route path="issuance/requests" element={<IssuanceRequestsPage />} />
          <Route path="issuance/requests/edit/:id" element={<IssuanceRequestForm />} />
          <Route path="issuance/issued-lgs" element={<IssuedLGsPage />} />
          <Route path="issuance/reconciliation" element={<LGReconciliationPage />} />
        </>
      ) : (
        <Route path="issuance/*" element={<Navigate to="../dashboard" replace />} />
      )}

      {/* Reports (Updated for End User) */}
      <Route path="reports" element={<ReportsPage reports={endUserReports} />}>
        {/* The index route navigates directly to the single report page */}
        <Route index element={<Navigate to="my-lg-dashboard" replace />} />
        <Route path="my-lg-dashboard" element={<MyLGDashboardReport />} />
      </Route>

      {/* Catch-all for End User paths, redirect to dashboard if no other match */}
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}

export default EndUserRoutes;