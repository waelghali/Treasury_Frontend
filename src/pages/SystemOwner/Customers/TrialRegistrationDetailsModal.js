// frontend/src/pages/SystemOwner/Customers/TrialRegistrationDetailsModal.js

import React from 'react';
import { X } from 'lucide-react';
import { API_BASE_URL } from 'services/apiService';

function TrialRegistrationDetailsModal({ registration, onClose }) {
  if (!registration) return null;

  // *** UPDATED: Point to the new, secure System Owner endpoint for GCS access ***
  // Assuming API_BASE_URL resolves to the root/api/v1 of the server.
  const documentUrl = `${API_BASE_URL}/system-owner/trial/download-register-document/?gcs_uri=${encodeURIComponent(registration.commercial_register_document_path)}`;
  
  const registeredDate = new Date(registration.accepted_terms_at).toLocaleString();

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
                <a 
                  href={documentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:underline text-sm"
                >
                  View Document
                </a>
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