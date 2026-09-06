// frontend/src/components/CustomerCashbackWidget.js
import React, { useState, useEffect } from 'react';
import { Gift, ChevronRight, CheckCircle2, Clock, X, Building2, AlertCircle } from 'lucide-react';
import apiClient from '../services/apiClient';

const CustomerCashbackWidget = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await apiClient.get('/customer/campaigns/cashback-summary');
        if (res.data && res.data.active_campaign) {
          setSummary(res.data);
        }
      } catch (err) {
        // Silent catch if no customer context or campaigns disabled
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading || !summary || !summary.active_campaign) {
    return null; // Don't show if no active campaign applies
  }

  const { active_campaign, claims_used, claims_limit, total_earned, total_paid, claims } = summary;
  const progressPercent = Math.min(100, Math.round((claims_used / claims_limit) * 100));

  return (
    <>
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-xl p-4 shadow-md border border-indigo-700/50 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Active Partner Cashback Offer
              </span>
              <span className="bg-indigo-700/60 text-indigo-200 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">
                {active_campaign.bank ? active_campaign.bank.name : 'All Banks'}
              </span>
            </div>
            <h3 className="font-bold text-white text-base leading-tight mt-0.5">
              {active_campaign.name}
            </h3>
            <p className="text-xs text-indigo-200 mt-0.5">
              Earn {(Number(active_campaign.cashback_percentage) * 100).toFixed(2)}% cashback up to EGP{' '}
              {Number(active_campaign.max_cashback_per_lg).toLocaleString()} per eligible LG.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5 self-end md:self-center">
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Accrued</span>
            <span className="text-lg font-black text-emerald-400">
              EGP {Number(total_earned).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="w-28 text-left">
            <div className="flex justify-between text-[11px] font-bold text-indigo-200 mb-1">
              <span>Quota</span>
              <span>
                {claims_used} / {claims_limit}
              </span>
            </div>
            <div className="w-full bg-indigo-950/70 h-2 rounded-full overflow-hidden border border-indigo-700/40">
              <div
                className="bg-gradient-to-r from-emerald-400 to-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition border border-white/20"
          >
            Claims ({claims.length})
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Modal: View Claims Details */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Your Cashback Claims Ledger</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block font-medium">Eligible Quota</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {claims_used} / {claims_limit} LGs
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Total Earned</span>
                  <span className="font-bold text-emerald-600 text-sm">
                    EGP {Number(total_earned).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Disbursed (Paid)</span>
                  <span className="font-bold text-indigo-600 text-sm">
                    EGP {Number(total_paid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">LG Number</th>
                      <th className="p-3">Bank</th>
                      <th className="p-3">LG Amount</th>
                      <th className="p-3">Cashback</th>
                      <th className="p-3">Verification Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {claims.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-6 text-slate-400">
                          No LGs claimed yet. Record an eligible LG to earn cashback.
                        </td>
                      </tr>
                    ) : (
                      claims.map((c) => {
                        const statusColors = {
                          CALCULATED: 'bg-blue-50 text-blue-700 border-blue-200',
                          RECONCILED: 'bg-amber-50 text-amber-700 border-amber-200',
                          PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          REJECTED: 'bg-rose-50 text-rose-700 border-rose-200'
                        };

                        const statusLabels = {
                          CALCULATED: 'Calculated (Scan Saved)',
                          RECONCILED: 'Reconciled via Bank Report',
                          PAID: 'Disbursed / Paid ✅',
                          REJECTED: 'Declined'
                        };

                        return (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-slate-900">{c.lg_number}</td>
                            <td className="p-3 text-slate-600">{c.bank_name || 'Emirates NBD'}</td>
                            <td className="p-3 font-semibold text-slate-800">
                              {c.currency_symbol} {Number(c.lg_amount).toLocaleString()}
                            </td>
                            <td className="p-3 font-bold text-emerald-600">
                              {c.currency_symbol} {Number(c.cashback_amount).toLocaleString()}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  statusColors[c.status] || 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}
                              >
                                {statusLabels[c.status] || c.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Payout Schedule:</strong> Verified cashback relating to transactions completed during a
                  calendar month is processed and disbursed directly by Grow before the 10th of the following month.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CustomerCashbackWidget;
