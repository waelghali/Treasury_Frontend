import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/apiService';
import { X, Loader2, AlertTriangle, Check, ShieldCheck, Banknote, BarChart3, Building, Lock, Unlock } from 'lucide-react';
import { toast } from 'react-toastify';

export default function IssuanceExecutionModal({ request, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [reserveLoading, setReserveLoading] = useState(false);
  const [facilities, setFacilities] = useState([]);
  const [fetchingFacilities, setFetchingFacilities] = useState(true);

  // Form State
  const [selectedOption, setSelectedOption] = useState(null);

  const isReserved = request.status === 'FACILITY_RESERVED';

  useEffect(() => {
    // Skip loading facilities if already reserved — just need to execute
    if (isReserved) {
      setFetchingFacilities(false);
      return;
    }
    async function loadOptions() {
      try {
        const facData = await apiRequest(`/issuance/requests/${request.id}/suitable-facilities`, 'GET');
        setFacilities(facData);
      } catch (err) {
        toast.error("Failed to load bank facilities.");
      } finally {
        setFetchingFacilities(false);
      }
    }
    loadOptions();
  }, [request.id, isReserved]);

  const handleReserve = async () => {
    if (!selectedOption) {
      toast.error("Please select a facility to reserve.");
      return;
    }
    setReserveLoading(true);
    try {
      await apiRequest(
        `/issuance/requests/${request.id}/reserve?sub_limit_id=${selectedOption.sub_limit_id}`,
        'POST'
      );
      toast.success("Facility reserved successfully! Capacity is now held.");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err?.message || "Failed to reserve facility.");
    } finally {
      setReserveLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!window.confirm("Release this reservation? The held capacity will be freed.")) return;
    setLoading(true);
    try {
      await apiRequest(`/issuance/requests/${request.id}/release-reservation`, 'POST');
      toast.success("Reservation released. Facility capacity freed.");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err?.message || "Failed to release reservation.");
    } finally {
      setLoading(false);
    }
  };



  const UtilizationBar = ({ used, total, pct }) => (
    <div className="w-full mt-1">
      <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
        <span>Used: {parseFloat(used).toLocaleString()}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">

            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {isReserved ? 'Execute Reserved Issuance' : 'Execute Issuance'}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500"><X className="h-6 w-6" /></button>
            </div>

            <div className="mb-6 bg-blue-50 p-4 rounded-md border border-blue-100 flex justify-between items-center">
              <div>
                <p className="text-sm text-blue-700"><strong>Beneficiary:</strong> {request.beneficiary_name}</p>
                <p className="text-xs text-blue-500 mt-1">{request.business_details?.project_name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-700">Request Amount</p>
                <p className="text-xl font-bold text-blue-800">{request.currency?.code || request.currency?.iso_code} {parseFloat(request.amount).toLocaleString()}</p>
              </div>
            </div>

            {/* RESERVED STATE — show reserved facility info + actions */}
            {isReserved ? (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-bold text-amber-800">Facility Reserved</span>
                  </div>
                  <p className="text-sm text-amber-700">
                    Capacity is held on the selected facility. To proceed with issuance, close this modal and use <strong>"Issue to Bank"</strong> from the request details.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleRelease}
                    disabled={loading}
                    className="flex-1 inline-flex justify-center items-center gap-2 rounded-md border-2 border-gray-300 px-4 py-3 text-base font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Unlock className="h-4 w-4" />
                    Release Reservation
                  </button>
                </div>
              </div>
            ) : (
              /* NORMAL STATE — facility selection */
              <div className="space-y-6">
                {/* FACILITY SELECTION */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <BarChart3 className="inline w-4 h-4 mr-1" />
                    Select Bank Facility
                  </label>
                  {fetchingFacilities ? (
                    <div className="flex items-center text-gray-500"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analyzing facilities...</div>
                  ) : facilities.length === 0 ? (
                    <div className="space-y-3">
                      <div className="text-amber-600 flex items-center bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="text-sm">No matching facilities found for this currency. Use "Issue to Bank" from the request details to proceed without a facility.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                      {facilities.map((fac, idx) => {
                        const isSelected = selectedOption?.sub_limit_id === fac.sub_limit_id;
                        const isBest = fac.recommendation_tags?.includes("BEST_PRICE");
                        const isInsufficient = !fac.has_sufficient_limit;

                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedOption(fac)}
                            className={`relative p-3 rounded-lg cursor-pointer border-2 transition-all ${isSelected
                              ? (isInsufficient ? 'border-amber-500 bg-amber-50' : 'border-blue-600 bg-blue-50')
                              : (isInsufficient ? 'border-gray-100 opacity-70 hover:opacity-100 hover:border-amber-300' : 'border-gray-100 hover:border-blue-300')
                              }`}
                          >
                            {isBest && (
                              <span className="absolute -top-3 right-4 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center">
                                <Check className="h-3 w-3 mr-1" /> BEST PRICE
                              </span>
                            )}
                            {isInsufficient && (
                              <span className="absolute -top-3 left-4 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center">
                                <AlertTriangle className="h-3 w-3 mr-1" /> INSUFFICIENT
                              </span>
                            )}

                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center">
                                <span className="font-bold text-gray-900">{fac.facility_bank}</span>
                                <span className="mx-2 text-gray-300">|</span>
                                <span className="text-sm text-gray-600">{fac.sub_limit_name}</span>
                              </div>
                              <span className={`text-xs font-semibold px-2 py-1 rounded ${isInsufficient ? 'text-amber-700 bg-amber-50' : 'text-green-700 bg-green-50'
                                }`}>
                                Avail: {parseFloat(fac.limit_available).toLocaleString()}
                              </span>
                            </div>

                            <UtilizationBar used={fac.total_used} total={fac.total_limit} pct={fac.utilization_pct} />

                            <div className="grid grid-cols-2 gap-4 mt-2 text-xs text-gray-500 bg-white p-2 rounded border border-gray-100">
                              <div className="flex items-center">
                                <Banknote className="h-3 w-3 mr-1 text-gray-400" />
                                <span>Commission: <strong>{fac.price_commission_rate}%</strong></span>
                                <span className="ml-1 text-gray-400">({parseInt(fac.estimated_commission_cost).toLocaleString()})</span>
                              </div>
                              <div className="flex items-center">
                                <ShieldCheck className="h-3 w-3 mr-1 text-gray-400" />
                                <span>Cash Margin: <strong>{fac.price_cash_margin_pct}%</strong></span>
                                {parseFloat(fac.price_cash_margin_pct) === 0 && <span className="ml-2 text-blue-600 font-bold text-[10px]">ZERO MARGIN</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>

                {facilities.length > 0 && (
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={handleReserve}
                    disabled={reserveLoading || !selectedOption}
                    className={`flex-1 inline-flex justify-center items-center gap-2 rounded-md border-2 px-4 py-3 text-base font-medium transition-all ${!selectedOption
                        ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                        : 'border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100'
                      }`}
                  >
                    {reserveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    Reserve Only
                  </button>
                  <p className="flex-1 text-xs text-gray-400 flex items-center justify-center text-center px-2">To issue, close this and use <strong className="mx-1">"Issue to Bank"</strong> from request details.</p>
                </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}