// frontend/src/pages/SystemOwner/Customers/TrialRegistrationList.js

import React, { useState, useEffect } from 'react';
import { apiRequest } from 'services/apiService.js';
import { toast } from 'react-toastify';
import { Eye, CheckCircle, XCircle } from 'lucide-react';
import TrialRegistrationDetailsModal from './TrialRegistrationDetailsModal'; // NEW IMPORT

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const statusText = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

function TrialRegistrationList() {
  const [registrations, setRegistrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedRegistration, setSelectedRegistration] = useState(null); // NEW STATE for modal

  const fetchRegistrations = async (statusFilter) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiRequest(`/system-owner/trial/trial-registrations/?status=${statusFilter}`, 'GET');
      setRegistrations(response);
    } catch (err) {
      console.error('Failed to fetch trial registrations:', err);
      setError(`Failed to load registrations: ${err.message || 'An unexpected error occurred.'}`);
      toast.error(`Failed to load registrations: ${err.message || ''}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations(activeTab);
  }, [activeTab]);

  const handleAction = async (registrationId, action) => {
    try {
      if (action === 'approve') {
        const response = await apiRequest(`/system-owner/trial/trial-registrations/${registrationId}/approve`, 'POST');
        toast.success(`Registration for ${response.name} approved successfully!`);
      } else if (action === 'reject') {
        await apiRequest(`/system-owner/trial/trial-registrations/${registrationId}/reject`, 'POST');
        toast.info(`Registration rejected.`);
      }
      fetchRegistrations(activeTab); // Refresh the list
    } catch (err) {
      console.error(`Failed to ${action} registration:`, err);
      toast.error(`Failed to ${action} registration: ${err.message || ''}`);
    }
  };

  const handleViewDetails = (registration) => {
    setSelectedRegistration(registration);
  };

  return (
    <>
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">Trial Registrations</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Pending
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'approved' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Approved
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'rejected' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Rejected
            </button>
          </div>
        </div>
        
        {error && <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50">{error}</div>}

        {isLoading ? (
          <div className="text-center py-8">
            <p>Loading registrations...</p>
          </div>
        ) : registrations.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No {activeTab} registrations found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entities</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered At</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {registrations.map((reg) => (
                  <tr key={reg.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{reg.organization_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reg.admin_email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reg.entities_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[reg.status]}`}>
                        {statusText[reg.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(reg.accepted_terms_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleViewDetails(reg)} className="text-gray-600 hover:text-gray-900 mr-4" title="View Details"><Eye className="h-5 w-5 inline" /></button>
                      {reg.status === 'pending' && (
                        <>
                          <button onClick={() => handleAction(reg.id, 'approve')} className="text-green-600 hover:text-green-900 mr-4" title="Approve Registration"><CheckCircle className="h-5 w-5 inline" /></button>
                          <button onClick={() => handleAction(reg.id, 'reject')} className="text-red-600 hover:text-red-900" title="Reject Registration"><XCircle className="h-5 w-5 inline" /></button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selectedRegistration && (
        <TrialRegistrationDetailsModal
          registration={selectedRegistration}
          onClose={() => setSelectedRegistration(null)}
        />
      )}
    </>
  );
}

export default TrialRegistrationList;