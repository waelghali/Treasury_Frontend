// frontend/src/pages/SystemOwner/Customers/TrialRegistrationDetailsModal.js

import React from 'react';
import { X } from 'lucide-react';
// import { API_BASE_URL } from 'services/apiService'; // No longer needed
import { apiRequest } from 'services/apiService'; // ADDED: For authenticated API call
import { toast } from 'react-toastify'; // ADDED: For user feedback
import { formatDateTime } from 'utils/dateFormat';

function TrialRegistrationDetailsModal({ registration, onClose }) {
  if (!registration) return null;

  // The direct link logic is removed as it causes the "Could not validate credentials" error.
  
  const registeredDate = formatDateTime(registration.accepted_terms_at);

  // --- NEW FUNCTION TO HANDLE SECURE DOCUMENT VIEWING ---
  const handleViewDocument = async (gcsPath) => {
    if (!gcsPath) {
        toast.error("No document path available.");
        return;
    }

    try {
      // 1. Call backend securely to get the signed URL
      // This uses apiRequest() which includes the Authorization header
      const response = await apiRequest(
        `/system-owner/trial/get-document-url/?gcs_uri=${encodeURIComponent(gcsPath)}`, 
        'GET'
      );
      
      // 2. Open the signed URL (which is temporary and self-authenticating) in a new tab
      if (response && response.url) {
        window.open(response.url, '_blank');
      } else {
        toast.error("Failed to retrieve document URL.");
      }
    } catch (err) {
      console.error("Error fetching document URL:", err);
      toast.error(`Error opening document: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-slate-900">Registration Details</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-50/70 p-4 rounded-xl border border-slate-200/70">
            <div>
              <p className="text-xs font-semibold text-slate-500">Organization Name</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">{registration.organization_name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Admin Email</p>
              <p className="mt-0.5 text-sm text-slate-800 break-all">{registration.admin_email}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Super Admin Name</p>
              <p className="mt-0.5 text-sm text-slate-800">{registration.contact_admin_name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Contact Phone</p>
              <p className="mt-0.5 text-sm text-slate-800">{registration.contact_phone}</p>
            </div>
            <div className="col-span-1 md:col-span-2">
              <p className="text-xs font-semibold text-slate-500">Organization Address</p>
              <p className="mt-0.5 text-sm text-slate-800">{registration.organization_address}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Entities Count</p>
              <p className="mt-0.5 text-sm font-medium text-slate-900">{registration.entities_count}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Requested Modules</p>
              <div className="mt-1 flex gap-1.5 flex-wrap">
                {(registration.requested_modules || ['custody']).map(mod => {
                  const badgeMap = {
                    custody: { label: 'LG Custody', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                    issuance: { label: 'LG Issuance', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
                    quotations: { label: 'FX & T-Bill Quotations', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    reconciliation: { label: 'Bank Auto-Reconciliation', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
                  };
                  const b = badgeMap[mod] || { label: mod, cls: 'bg-slate-100 text-slate-700 border-slate-200' };
                  return (
                    <span key={mod} className={`px-2 py-0.5 text-xs font-medium rounded-full border ${b.cls}`}>
                      {b.label}
                    </span>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Status</p>
              <span className={`mt-1 px-2.5 py-0.5 inline-flex text-xs font-semibold rounded-full border ${
                  registration.status === 'pending' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                  registration.status === 'approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                  'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                {registration.status === 'pending' ? 'Pending Review' :
                 registration.status === 'approved' ? 'Approved' : 'Rejected'}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Registered At</p>
              <p className="mt-0.5 text-sm text-slate-800">{registeredDate}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Registration IP</p>
              <p className="mt-0.5 text-sm font-mono text-slate-700">{registration.accepted_terms_ip || 'N/A'}</p>
            </div>
            <div className="col-span-1 md:col-span-2">
              <p className="text-xs font-semibold text-slate-500 mb-1.5">Commercial Register Document</p>
              {registration.commercial_register_document_path ? (
                <button
                  type="button"
                  onClick={() => handleViewDocument(registration.commercial_register_document_path)}
                  className="inline-flex items-center px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 text-xs font-semibold transition-colors"
                >
                  View Document (Securely)
                </button>
              ) : (
                <p className="text-sm text-slate-500 italic">No document uploaded.</p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

export default TrialRegistrationDetailsModal;