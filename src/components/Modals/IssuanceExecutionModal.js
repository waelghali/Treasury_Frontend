import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/apiService';
import { X, Loader2, AlertTriangle, Check, ShieldCheck, Banknote } from 'lucide-react';
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

  useEffect(() => {
    async function loadOptions() {
      try {
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
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Execute Issuance (Smart Mode)</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500"><X className="h-6 w-6" /></button>
            </div>

            <div className="mb-6 bg-blue-50 p-4 rounded-md border border-blue-100 flex justify-between items-center">
              <div>
                <p className="text-sm text-blue-700"><strong>Beneficiary:</strong> {request.beneficiary_name}</p>
                <p className="text-xs text-blue-500 mt-1">{request.business_details?.project_name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-700">Request Amount</p>
                <p className="text-xl font-bold text-blue-800">{request.currency?.code} {parseFloat(request.amount).toLocaleString()}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* SMART FACILITY SELECTION */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Best Bank Option</label>
                {fetchingFacilities ? (
                   <div className="flex items-center text-gray-500"><Loader2 className="h-4 w-4 animate-spin mr-2"/> Analyzing best rates...</div>
                ) : facilities.length === 0 ? (
                   <div className="text-red-600 flex items-center"><AlertTriangle className="h-4 w-4 mr-2"/> No sufficient limits found.</div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {facilities.map((fac, idx) => {
                      const isSelected = selectedOption?.sub_limit_id === fac.sub_limit_id;
                      const isBest = fac.recommendation_tags?.includes("BEST_OPTION");
                      
                      return (
                        <div 
                          key={idx} 
                          onClick={() => setSelectedOption(fac)}
                          className={`relative p-3 rounded-lg cursor-pointer border-2 transition-all ${isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:border-blue-300'}`}
                        >
                          {/* RECOMMENDED BADGE */}
                          {isBest && (
                            <span className="absolute -top-3 right-4 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center">
                                <Check className="h-3 w-3 mr-1"/> BEST PRICE
                            </span>
                          )}

                          <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center">
                                  <span className="font-bold text-gray-900">{fac.facility_bank}</span>
                                  <span className="mx-2 text-gray-300">|</span>
                                  <span className="text-sm text-gray-600">{fac.sub_limit_name}</span>
                              </div>
                              <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded">
                                Avail: {parseFloat(fac.limit_available).toLocaleString()}
                              </span>
                          </div>

                          {/* COST BREAKDOWN GRID */}
                          <div className="grid grid-cols-2 gap-4 mt-2 text-xs text-gray-500 bg-white p-2 rounded border border-gray-100">
                             <div className="flex items-center">
                                <Banknote className="h-3 w-3 mr-1 text-gray-400"/>
                                <span>Commission: <strong>{fac.price_commission_rate}%</strong></span>
                                <span className="ml-1 text-gray-400">({parseInt(fac.estimated_commission_cost).toLocaleString()})</span>
                             </div>
                             <div className="flex items-center">
                                <ShieldCheck className="h-3 w-3 mr-1 text-gray-400"/>
                                <span>Cash Margin: <strong>{fac.price_cash_margin_pct}%</strong></span>
                                {fac.price_cash_margin_pct === 0 && <span className="ml-2 text-blue-600 font-bold text-[10px]">ZERO MARGIN</span>}
                             </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* REST OF FORM */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Bank Ref Number</label>
                    <input 
                      type="text" required
                      className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm"
                      placeholder="e.g. LG-2025-001"
                      value={issuedRefNumber}
                      onChange={(e) => setIssuedRefNumber(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Issue Date</label>
                    <input 
                      type="date" required
                      className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                    />
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={loading || !selectedOption}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-3 text-base font-medium text-white ${loading || !selectedOption ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirm Issuance"}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}