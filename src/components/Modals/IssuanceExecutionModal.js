import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/apiService';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';

export default function IssuanceExecutionModal({ request, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [facilities, setFacilities] = useState([]);
  const [fetchingFacilities, setFetchingFacilities] = useState(true);

  // Form State
  const [selectedOption, setSelectedOption] = useState(null); 
  const [issuedRefNumber, setIssuedRefNumber] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(request.requested_expiry_date || '');

  // 1. Fetch Suitable Facilities on Mount
  useEffect(() => {
    async function loadOptions() {
      try {
        // CORRECTION: URL First, Method Second
        const data = await apiRequest(`/issuance/requests/${request.id}/suitable-facilities`, 'GET');
        setFacilities(data);
      } catch (err) {
        toast.error("Failed to load bank facilities.");
      } finally {
        setFetchingFacilities(false);
      }
    }
    loadOptions();
  }, [request.id]);

  // 2. Handle Execute
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOption) {
      toast.error("Please select a bank facility.");
      return;
    }
    
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        sub_limit_id: selectedOption.sub_limit_id,
        issued_ref_number: issuedRefNumber,
        issue_date: issueDate,
      });
      if (expiryDate) queryParams.append('expiry_date', expiryDate);

      // CORRECTION: URL First, Method Second
      await apiRequest(`/issuance/requests/${request.id}/execute?${queryParams.toString()}`, 'POST');
      
      toast.success("LG Issued Successfully!");
      onSuccess(); 
      onClose();
    } catch (err) {
      toast.error("Failed to execute issuance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                Execute Issuance
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4 bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-700">
                <strong>Request:</strong> {request.currency?.code} {parseFloat(request.amount).toLocaleString()} <br/>
                <strong>Beneficiary:</strong> {request.beneficiary_name}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* 1. Facility Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Bank Facility</label>
                {fetchingFacilities ? (
                   <div className="text-sm text-gray-500 flex items-center"><Loader2 className="h-4 w-4 animate-spin mr-2"/> Checking limits...</div>
                ) : facilities.length === 0 ? (
                   <div className="text-sm text-red-600 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2"/> No facilities found with sufficient limit.
                   </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                    {facilities.map((fac, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedOption(fac)}
                        className={`p-2 rounded-md cursor-pointer border ${selectedOption?.sub_limit_id === fac.sub_limit_id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:bg-gray-50'}`}
                      >
                        <div className="flex justify-between">
                            <span className="font-medium text-sm text-gray-900">{fac.facility_bank} - {fac.sub_limit_name}</span>
                            <span className="text-xs text-green-600 font-bold">Avail: {parseFloat(fac.limit_available).toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-gray-500">Price: {fac.price_commission}%</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. LG Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Issued LG Reference (Bank Ref)</label>
                <input 
                  type="text" required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g. LG-2025-001"
                  value={issuedRefNumber}
                  onChange={(e) => setIssuedRefNumber(e.target.value)}
                />
              </div>

              {/* 3. Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Issue Date</label>
                    <input 
                      type="date" required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                    <input 
                      type="date" 
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                </div>
              </div>

              <div className="mt-5 sm:mt-6">
                <button
                  type="submit"
                  disabled={loading || !selectedOption}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:text-sm ${loading || !selectedOption ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-offset-2 focus:ring-green-500'}`}
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirm & Issue LG"}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}