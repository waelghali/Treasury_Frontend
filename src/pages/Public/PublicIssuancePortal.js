// frontend/src/pages/Public/PublicIssuancePortal.js

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // To read the ?token=
import { Loader2, CheckCircle, AlertCircle, Upload, Save } from 'lucide-react';
import { apiRequest, API_BASE_URL } from 'services/apiService'; // Reuse your service
import { toast } from 'react-toastify';

export default function PublicIssuancePortal() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get('token');

  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    amount: '',
    currency_id: 1, // Default to USD or similar
    beneficiary_name: '',
    requested_issue_date: '',
    project_name: '',
    tender_reference: '',
    description: ''
  });

  // 1. Validate Token on Load
  useEffect(() => {
    async function validateAccess() {
      if (!token) {
        setError('Access token is missing.');
        setIsLoading(false);
        return;
      }

      try {
        // We use a special public endpoint that doesn't need Auth Header
        // You might need to adjust apiRequest to skip Auth if it detects public URL
        const response = await fetch(`${API_BASE_URL}/public-issuance/validate-access?token=${token}`);
        const data = await response.json();

        if (response.ok && data.valid) {
          setIsValid(true);
          setDepartment(data.department);
        } else {
          setError('Invalid or expired access link.');
        }
      } catch (err) {
        setError('Unable to verify access. Please check your connection.');
      } finally {
        setIsLoading(false);
      }
    }
    validateAccess();
  }, [token]);

  // 2. Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const payload = {
      amount: parseFloat(formData.amount),
      currency_id: parseInt(formData.currency_id),
      beneficiary_name: formData.beneficiary_name,
      requested_issue_date: formData.requested_issue_date,
      transaction_type: "NEW_ISSUANCE",
      business_details: {
        project_name: formData.project_name,
        tender_reference: formData.tender_reference,
        description: formData.description
      }
    };

    try {
        // Direct fetch to avoid Auth Interceptor issues for public pages
        const response = await fetch(`${API_BASE_URL}/public-issuance/submit?token=${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            toast.success("Request submitted successfully!");
            // Reset or show success screen
            setIsValid(false); 
            setError("Success! Your request has been sent to Treasury."); 
        } else {
            toast.error(result.detail || "Submission failed");
        }
    } catch (err) {
        toast.error("Network error");
    } finally {
        setIsLoading(false);
    }
  };

  // --- RENDER ---

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
    </div>
  );

  if (error || !isValid) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        {error.includes("Success") ? (
             <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        ) : (
             <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        )}
        <h2 className="text-xl font-bold text-gray-900 mb-2">
            {error.includes("Success") ? "Request Submitted" : "Access Denied"}
        </h2>
        <p className="text-gray-600">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">LG Issuance Request</h1>
            <p className="mt-2 text-gray-600">
                Department: <span className="font-semibold text-blue-600">{department}</span>
            </p>
        </div>

        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
            <div className="p-6 md:p-8 space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Beneficiary Name</label>
                            <input 
                                type="text" required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                value={formData.beneficiary_name}
                                onChange={e => setFormData({...formData, beneficiary_name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Amount</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <input 
                                    type="number" required
                                    className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 border p-2"
                                    value={formData.amount}
                                    onChange={e => setFormData({...formData, amount: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Required Date</label>
                            <input 
                                type="date" required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                value={formData.requested_issue_date}
                                onChange={e => setFormData({...formData, requested_issue_date: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* Business Details */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Project / Purpose</label>
                        <input 
                            type="text" required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                            value={formData.project_name}
                            onChange={e => setFormData({...formData, project_name: e.target.value})}
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            {isLoading ? "Submitting..." : "Submit Request"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
}