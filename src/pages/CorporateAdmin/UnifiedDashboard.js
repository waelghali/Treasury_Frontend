import React, { useState } from 'react';
import CorporateAdminDashboard from './CorporateAdminDashboard';
import TreasuryDashboard from './TreasuryDashboard';

function UnifiedDashboard({ hasCustodyModule, hasIssuanceModule, isGracePeriod }) {
  const getDefaultView = () => {
    if (hasIssuanceModule && hasCustodyModule) return 'issuance';
    if (hasIssuanceModule) return 'issuance';
    return 'custody';
  };

  const [activeView, setActiveView] = useState(getDefaultView);
  const showToggle = hasCustodyModule && hasIssuanceModule;

  return (
    <div>
      {showToggle && (
        <div className="flex justify-end mb-4">
          <div className="inline-flex rounded-lg p-0.5 bg-gray-100 border border-gray-200">
            <button
              onClick={() => setActiveView('issuance')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
                activeView === 'issuance'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Issuance
            </button>
            <button
              onClick={() => setActiveView('custody')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
                activeView === 'custody'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Custody
            </button>
          </div>
        </div>
      )}

      {activeView === 'issuance' ? (
        <TreasuryDashboard />
      ) : (
        <CorporateAdminDashboard isGracePeriod={isGracePeriod} />
      )}
    </div>
  );
}

export default UnifiedDashboard;
