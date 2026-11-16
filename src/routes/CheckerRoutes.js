// src/routes/CheckerRoutes.js
// Checker role: business-side approver only. Uses the unified Approval Center.
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import PendingApprovalsPage from '../pages/CorporateAdmin/PendingApprovalsPage';
import IssuedLGsPage from '../pages/EndUser/IssuedLGsPage';
import ActivityAndControlsPage from '../pages/CorporateAdmin/ActivityAndControlsPage';

function CheckerRoutes() {
  return (
    <Routes>
      {/* Unified Approval Center */}
      <Route path="approval-requests" element={<PendingApprovalsPage />} />

      {/* Activity & Signatory Controls */}
      <Route path="activity" element={<ActivityAndControlsPage />} />

      {/* View-only: Issued LGs (readOnly mode is enforced inside the page via JWT role detection) */}
      <Route path="issuance/issued-lgs" element={<IssuedLGsPage />} />

      {/* Catch-all: redirect to approval center */}
      <Route path="*" element={<Navigate to="approval-requests" replace />} />
    </Routes>
  );
}

export default CheckerRoutes;
