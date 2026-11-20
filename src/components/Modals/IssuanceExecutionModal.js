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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Building className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {isReserved ? 'Execute Reserved Issuance' : 'Execute Issuance'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-5">
          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200/70 flex justify-between items-center gap-4">
            <div>
              <p className="text-sm text-blue-900"><strong>Beneficiary:</strong> {request.beneficiary_name}</p>
              <p className="text-xs text-blue-600 mt-0.5">{request.business_details?.project_name}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Request Amount</p>
              <p className="text-lg font-bold text-blue-900">{request.currency?.code || request.currency?.iso_code} {parseFloat(request.amount).toLocaleString()}</p>
            </div>
          </div>

          {/* RESERVED STATE — show reserved facility info + actions */}
          {isReserved ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center gap-2 mb-1.5">
                  <Lock className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-bold text-amber-800">Facility Reserved</span>
                </div>
                <p className="text-sm text-amber-700">
                  Capacity is held on the selected facility. To proceed with issuance, close this modal and use <strong>&quot;Issue to Bank&quot;</strong> from the request details.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleRelease}
                  disabled={loading}
                  className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-xs transition-colors"
                >
                  <Unlock className="h-4 w-4" />
                  Release Reservation
                </button>
              </div>
            </div>
          ) : (
            /* NORMAL STATE — facility selection */
            <div className="space-y-4">
              {/* FACILITY SELECTION */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  <BarChart3 className="inline w-4 h-4 mr-1 text-blue-600" />
                  Select Bank Facility
                </label>
                {fetchingFacilities ? (
                  <div className="flex items-center text-sm text-slate-500 py-4"><Loader2 className="h-4 w-4 animate-spin mr-2 text-blue-600" /> Analyzing facilities...</div>
                ) : facilities.length === 0 ? (
                  <div className="text-amber-700 flex items-center bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-sm">
                    <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>No matching facilities found for this currency. Use &quot;Issue to Bank&quot; from the request details to proceed without a facility.</span>
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-64 overflow-y-auto pt-3 pb-1 px-0.5 pr-1">
                    {facilities.map((fac, idx) => {
                      const isSelected = selectedOption?.sub_limit_id === fac.sub_limit_id;
                      const isBest = fac.recommendation_tags?.includes("BEST_PRICE");
                      const isInsufficient = !fac.has_sufficient_limit;

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedOption(fac)}
                          className={`relative p-3.5 rounded-xl cursor-pointer border-2 transition-all ${isSelected
                            ? (isInsufficient ? 'border-amber-500 bg-amber-50/70' : 'border-blue-600 bg-blue-50/60')
                            : (isInsufficient ? 'border-slate-200 opacity-75 hover:opacity-100 hover:border-amber-300' : 'border-slate-200 hover:border-blue-300')
                            }`}
                        >
                          {isBest && (
                            <span className="absolute -top-2.5 right-4 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center">
                              <Check className="h-3 w-3 mr-1" /> BEST PRICE
                            </span>
                          )}
                          {isInsufficient && (
                            <span className="absolute -top-2.5 left-4 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center">
                              <AlertTriangle className="h-3 w-3 mr-1" /> INSUFFICIENT
                            </span>
                          )}

                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center">
                              <span className="font-bold text-slate-900">{fac.facility_bank}</span>
                              <span className="mx-2 text-slate-300">|</span>
                              <span className="text-sm text-slate-600">{fac.sub_limit_name}</span>
                            </div>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${isInsufficient ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                              }`}>
                              Avail: {parseFloat(fac.limit_available).toLocaleString()}
                            </span>
                          </div>

                          <UtilizationBar used={fac.total_used} total={fac.total_limit} pct={fac.utilization_pct} />

                          <div className="grid grid-cols-2 gap-3 mt-2.5 text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/80">
                            <div className="flex items-center">
                              <Banknote className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                              <span>Commission: <strong>{fac.price_commission_rate}%</strong></span>
                              <span className="ml-1 text-slate-400">({parseInt(fac.estimated_commission_cost).toLocaleString()})</span>
                            </div>
                            <div className="flex items-center">
                              <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                              <span>Cash Margin: <strong>{fac.price_cash_margin_pct}%</strong></span>
                              {parseFloat(fac.price_cash_margin_pct) === 0 && <span className="ml-2 text-blue-600 font-bold text-[10px]">ZERO MARGIN</span>}
                            </div>
                            {fac.agreed_sla_days && (
                              <div className="col-span-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 text-slate-600">
                                <span>
                                  ⚡ <strong>SLA:</strong> {fac.agreed_sla_days}d agreed
                                  {fac.actual_avg_sla_days ? ` • ${fac.actual_avg_sla_days}d actual (${fac.sla_commitment_pct}% on-time)` : ''}
                                </span>
                                {fac.recommendation_tags?.includes("FAST_TRACK") && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                                    FAST TRACK
                                  </span>
                                )}
                                {fac.recommendation_tags?.includes("SLA_SLIPPAGE_RISK") && (
                                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200">
                                    SLA DELAY RISK
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 shrink-0">
          {!isReserved && facilities.length > 0 ? (
            <p className="text-xs text-slate-500">
              To issue, close this and use <strong>&quot;Issue to Bank&quot;</strong> from request details.
            </p>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-colors"
            >
              Close
            </button>
            {!isReserved && facilities.length > 0 && (
              <button
                type="button"
                onClick={handleReserve}
                disabled={reserveLoading || !selectedOption}
                className={`inline-flex justify-center items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${!selectedOption
                  ? 'border-slate-200 text-slate-400 bg-slate-100 cursor-not-allowed'
                  : 'border-amber-400 text-amber-800 bg-amber-50 hover:bg-amber-100 shadow-xs'
                  }`}
              >
                {reserveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                Reserve Only
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}