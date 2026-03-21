// src/routes/CheckerRoutes.js
// Checker role: business-side approver only. Limited access to approval inbox.
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import IssuanceApprovalInboxPage from '../pages/CorporateAdmin/IssuanceApprovalInboxPage';
import PendingApprovalsPage from '../pages/CorporateAdmin/PendingApprovalsPage';
import IssuedLGsPage from '../pages/EndUser/IssuedLGsPage';

function CheckerRoutes() {
  return (
    <Routes>
      {/* Primary: Approval Inbox */}
      <Route path="approval-inbox" element={<IssuanceApprovalInboxPage />} />
      
      {/* Custody Approval Center */}
      <Route path="approval-requests" element={<PendingApprovalsPage />} />

      {/* View-only: Issued LGs (readOnly mode is enforced inside the page via JWT role detection) */}
      <Route path="issuance/issued-lgs" element={<IssuedLGsPage />} />

      {/* Catch-all: redirect to approval inbox */}
      <Route path="*" element={<Navigate to="approval-inbox" replace />} />
    </Routes>
  );
}

export default CheckerRoutes;
