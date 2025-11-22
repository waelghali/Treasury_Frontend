// frontend/src/pages/SystemOwner/Customers/TrialRegistrationDetailsModal.js

import React from 'react';
import { X } from 'lucide-react';
// import { API_BASE_URL } from 'services/apiService'; // No longer needed
import { apiRequest } from 'services/apiService'; // ADDED: For authenticated API call
import { toast } from 'react-toastify'; // ADDED: For user feedback

function TrialRegistrationDetailsModal({ registration, onClose }) {
  if (!registration) return null;

  // The direct link logic is removed as it causes the "Could not validate credentials" error.
  
  const registeredDate = new Date(registration.accepted_terms_at).toLocaleString();

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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative p-8 bg-white w-full max-w-2xl rounded-lg shadow-xl">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Registration Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Organization Name</p>
              <p className="mt-1 text-sm text-gray-900">{registration.organization_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Admin Email</p>
              <p className="mt-1 text-sm text-gray-900">{registration.admin_email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Super Admin Name</p>
              <p className="mt-1 text-sm text-gray-900">{registration.contact_admin_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Contact Phone</p>
              <p className="mt-1 text-sm text-gray-900">{registration.contact_phone}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm font-medium text-gray-500">Organization Address</p>
              <p className="mt-1 text-sm text-gray-900">{registration.organization_address}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Entities Count</p>
              <p className="mt-1 text-sm text-gray-900">{registration.entities_count}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  registration.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  registration.status === 'approved' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                {registration.status === 'pending' ? 'Pending Review' :
                 registration.status === 'approved' ? 'Approved' : 'Rejected'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Registered At</p>
              <p className="mt-1 text-sm text-gray-900">{registeredDate}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Registration IP</p>
              <p className="mt-1 text-sm text-gray-900">{registration.accepted_terms_ip || 'N/A'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm font-medium text-gray-500">Commercial Register Document</p>
              {registration.commercial_register_document_path ? (
                // Replaced the <a> tag with a <button> for secure, authenticated access
                <button 
                  onClick={() => handleViewDocument(registration.commercial_register_document_path)} 
                  className="text-blue-600 hover:underline text-sm font-medium hover:text-blue-800"
                >
                  View Document (Securely)
                </button>
              ) : (
                <p className="text-sm text-gray-500 italic">No document uploaded.</p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-5 pt-3 border-t border-gray-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

export default TrialRegistrationDetailsModal;