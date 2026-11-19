import React, { useState } from 'react';
import { Send, FileText } from 'lucide-react';
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
    <div className="space-y-4">
      {showToggle && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl px-4 py-2.5 shadow-xs">
          <div className="text-xs text-slate-500">
            <span className="font-bold text-slate-700">Executive Workspace:</span>{' '}
            {activeView === 'issuance'
              ? 'Viewing outgoing bank guarantees, credit lines & bank SLAs'
              : 'Viewing incoming beneficiary guarantees & custody operations'}
          </div>
          <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveView('issuance')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-none focus:ring-0 ${
                activeView === 'issuance'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>LG Issuance</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('custody')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-none focus:ring-0 ${
                activeView === 'custody'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>LG Custody</span>
            </button>
          </div>
        </div>
      )}

      {activeView === 'issuance' ? (
        <TreasuryDashboard isGracePeriod={isGracePeriod} />
      ) : (
        <CorporateAdminDashboard isGracePeriod={isGracePeriod} />
      )}
    </div>
  );
}

export default UnifiedDashboard;
