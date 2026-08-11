import React, { useState, useEffect } from 'react';
import { Trophy, Landmark, Clock, ArrowRight, AlertCircle, Mail, ExternalLink } from 'lucide-react';
import apiClient from '../../../services/apiClient';

export default function ResultsView({ rfqId }) {
    const [results, setResults] = useState([]);
    const [rfq, setRfq] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sendingResults, setSendingResults] = useState(false);
    const userRole = localStorage.getItem('user_role'); // Check role

    const [resultsMeta, setResultsMeta] = useState({});

    const fetchResults = async () => {
        if (!rfqId) return null;
        try {
            const res = await apiClient.get(`/end-user/quotations/${rfqId}/results`);
            // Axios auto-parses JSON into res.data
            setResults(res.data.results || []);
            setRfq(res.data.rfq);
            setResultsMeta({
                winnerBankId: res.data.winner_bank_id,
                isInconclusive: res.data.is_inconclusive,
                inconclusiveReason: res.data.inconclusive_reason,
                bestIndicativeRate: res.data.best_indicative_rate,
                bestExecutionRate: res.data.best_execution_rate,
                deviationPercent: res.data.deviation_percent,
                hasExecutionBanks: res.data.has_execution_banks
            });
            return res.data.rfq?.status;
        } catch (err) {
            console.error(err);
            return null;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let interval = null;
        const initFetch = async () => {
            const currentStatus = await fetchResults();
            if (currentStatus && ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(currentStatus)) {
                return; // Terminal state reached, do not poll
            }
            interval = setInterval(async () => {
                const updatedStatus = await fetchResults();
                if (updatedStatus && ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(updatedStatus)) {
                    if (interval) clearInterval(interval);
                }
            }, 5000);
        };

        initFetch();

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [rfqId]);


    const handleResendInvite = async (qBankId, bankName) => {
        try {
            await apiClient.post(`/end-user/quotations/${rfqId}/resend-invite/${qBankId}`);
            alert(`Invitation email resent to ${bankName}!`);
        } catch (err) {
            console.error('Resend failed:', err);
            alert('Failed to resend invite: ' + (err.response?.data?.detail || err.message));
        }
    };

    if (loading) return <div className="p-8 text-center">Calculating results...</div>;

    const hasSubmissions = results.some(r =>
        rfq?.type === 'TBILL' ? (r.offers && r.offers.length > 0) : (r.price !== null && r.price !== undefined)
    );

    const handleApproval = async (status) => {
        try {
            if (status === 'PENDING') {
                // Time Safety Check
                if (rfq?.window_end) {
                    const closingTime = new Date(rfq.window_end);
                    const now = new Date();
                    const diffMins = Math.round((closingTime - now) / 60000);

                    if (diffMins < 0) {
                        alert("The window for this quotation has already closed. It cannot be approved.");
                        return;
                    }
                    if (diffMins < 30) {
                        if (!window.confirm(`This quotation has only ${diffMins} minutes remaining. Are you sure you want to approve and release it?`)) {
                            return;
                        }
                    }
                }

                await apiClient.post(`/corporate-admin/quotations/${rfqId}/approve`);
                alert(`Quotation Approved and Released successfully.`);
            } else {
                await apiClient.post(`/corporate-admin/quotations/${rfqId}/reject`);
                alert(`Quotation Request Rejected.`);
            }
            // Refresh explicitly after changing the status
            fetchResults();
        } catch (err) {
            console.error('Approval action failed:', err);
            alert('Action failed: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleSendResults = async () => {
        if (!window.confirm("Are you sure you want to send winner and regret emails to all assigned Execution banks? This will use your configured email settings.")) return;

        try {
            setSendingResults(true);
            await apiClient.post(`/end-user/quotations/${rfqId}/send-results`);
            alert("Result emails have been sent successfully.");
        } catch (err) {
            console.error('Failed to send results:', err);
            alert('Failed to send emails: ' + (err.response?.data?.detail || err.message));
        } finally {
            setSendingResults(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 flex items-center gap-2 mb-1">
                        <Trophy size={14} /> Quotation Results
                    </h3>
                    {rfq && <p className="text-sm font-mono font-bold text-gray-600">{rfq.ref_no}</p>}
                </div>
                <div className="flex items-center gap-4 mt-2 sm:mt-0">
                    {(rfq?.status === 'COMPLETED' || rfq?.status === 'EVALUATING') && !resultsMeta.isInconclusive && (
                        <button
                            onClick={handleSendResults}
                            disabled={sendingResults}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${sendingResults ? 'bg-gray-100 text-gray-400' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200'
                                }`}
                        >
                            <Mail size={14} /> {sendingResults ? 'Sending...' : 'Send Result Emails (Direct)'}
                        </button>
                    )}
                    <span className="text-xs font-medium text-gray-400 italic">Auto-refreshing every 5s</span>
                </div>
            </div>

            {resultsMeta.isInconclusive && (
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-4">
                    <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={24} />
                    <div>
                        <h4 className="font-bold text-sm uppercase tracking-wide">Quotation Closed Without Winner</h4>
                        <p className="text-xs mt-1 leading-relaxed text-amber-800">{resultsMeta.inconclusiveReason}</p>
                        {resultsMeta.bestIndicativeRate !== null && resultsMeta.bestExecutionRate !== null && (
                            <div className="flex items-center gap-6 mt-3 pt-3 border-t border-amber-200/60 text-xs font-mono">
                                <div><span className="font-sans text-[10px] uppercase font-bold text-amber-600 block">Indicative Benchmark</span>{resultsMeta.bestIndicativeRate.toFixed(4)}</div>
                                <div><span className="font-sans text-[10px] uppercase font-bold text-amber-600 block">Best Execution Quote</span>{resultsMeta.bestExecutionRate.toFixed(4)}</div>
                                <div><span className="font-sans text-[10px] uppercase font-bold text-amber-600 block">Deviation</span>{resultsMeta.deviationPercent ? `${resultsMeta.deviationPercent.toFixed(2)}%` : 'N/A'}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {rfq?.status === 'PENDING_APPROVAL' ? (
                <div className="p-8 bg-orange-50 rounded-3xl border border-orange-200">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <AlertCircle className="text-orange-500" size={48} />
                        <div>
                            <h4 className="text-lg font-bold text-orange-900 mb-1">Corporate Admin Approval Required</h4>
                            <p className="text-sm text-orange-700 max-w-lg mx-auto">
                                This quotation requires approval before being dispatched to the selected counterparties for bidding.
                            </p>
                        </div>
                        {userRole === 'corporate_admin' && (
                            <div className="flex items-center gap-4 mt-4">
                                <button
                                    onClick={() => handleApproval('REJECTED')}
                                    className="px-6 py-2.5 bg-white text-red-600 border border-red-200 font-bold rounded-xl hover:bg-red-50 transition-colors"
                                >
                                    Reject Request
                                </button>
                                <button
                                    onClick={() => handleApproval('PENDING')}
                                    className="px-6 py-2.5 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-black/20"
                                >
                                    Approve & Release RFQ
                                </button>
                            </div>
                        )}
                        {userRole !== 'corporate_admin' && (
                            <p className="text-xs font-medium text-orange-800 bg-orange-100 px-4 py-2 rounded-lg mt-4">
                                Waiting for Corporate Admin...
                            </p>
                        )}
                    </div>
                </div>
            ) : rfq?.status === 'REJECTED' ? (
                <div className="p-12 bg-red-50 rounded-3xl border border-red-100 text-center">
                    <AlertCircle className="mx-auto text-red-400 mb-4" size={32} />
                    <p className="text-red-700 font-medium tracking-tight">This quotation request was rejected by the Corporate Admin.</p>
                </div>
            ) : (!hasSubmissions && rfq?.status !== 'PENDING') ? (
                <div className="p-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-center">
                    <Clock className="mx-auto text-gray-300 mb-4" size={32} />
                    <p className="text-gray-500">Waiting for submissions or window to close...</p>
                </div>
            ) : rfq?.type === 'TBILL' ? (
                <div className="space-y-6">
                    {results.map((result, index) => (
                        <div
                            key={result.bank_name}
                            className={`p-6 rounded-3xl border transition-all duration-300 ${index === 0 && result.best_score ? 'bg-emerald-50 border-emerald-200 ring-2 ring-emerald-500/10' : 'bg-white border-gray-100 shadow-sm opacity-100'}`}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${index === 0 && result.best_score ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                        {index === 0 && result.best_score ? <Trophy size={18} /> : <Landmark size={20} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-bold text-lg">{result.bank_name}</h4>
                                            {index === 0 && result.best_score && <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded uppercase tracking-wider">Winner</span>}
                                            {result.quotation_base && (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${result.quotation_base === 'Execution' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'}`}>
                                                    {result.quotation_base}
                                                </span>
                                            )}
                                            {result.is_document_visible === false && (
                                                <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded uppercase">Doc Hidden</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400">{result.bank_emails}</p>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-3">
                                    {result.best_score && (
                                        <div className="text-right mr-3">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Best Score</p>
                                            <p className="text-sm font-mono font-bold text-emerald-600">{result.best_score.toFixed(6)}</p>
                                        </div>
                                    )}
                                    {result.token && (
                                        <button
                                            onClick={() => {
                                                const link = `${window.location.origin}/public-quotation/${result.token}`;
                                                navigator.clipboard.writeText(link);
                                                alert('Bidding link copied to clipboard!');
                                            }}
                                            className="text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1.5 rounded uppercase tracking-wider hover:bg-blue-100 transition-colors flex items-center gap-1"
                                            title="Copy secure bidding link for this bank"
                                        >
                                            <ExternalLink size={12} /> Bidding Link
                                        </button>
                                    )}
                                    {result.quotation_bank_id && (
                                        <button
                                            onClick={() => handleResendInvite(result.quotation_bank_id, result.bank_name)}
                                            className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded uppercase tracking-wider hover:bg-emerald-100 transition-colors flex items-center gap-1"
                                            title="Resend invitation email to this bank"
                                        >
                                            <Mail size={12} /> Resend Invite
                                        </button>
                                    )}
                                    <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded uppercase tracking-wider">
                                        {result.offers?.length || 0} Lines
                                    </span>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="text-[10px] font-bold text-gray-400 uppercase border-b border-gray-50">
                                            <th className="pb-2">Settlement</th>
                                            <th className="pb-2">Maturity</th>
                                            <th className="pb-2">Discount Rate (%)</th>
                                            <th className="pb-2">Max Amount</th>
                                            <th className="pb-2 text-right">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {result.offers?.map((offer, i) => (
                                            <tr key={i} className="group hover:bg-gray-50/50">
                                                <td className="py-3 font-medium">{new Date(offer.settlement_date).toLocaleDateString()}</td>
                                                <td className="py-3 font-medium">{new Date(offer.maturity_date).toLocaleDateString()}</td>
                                                <td className="py-3 font-mono font-bold text-emerald-600">{offer.discount_rate.toFixed(4)}%</td>
                                                <td className="py-3 font-mono font-bold">{new Intl.NumberFormat().format(offer.max_amount)}</td>
                                                <td className="py-3 text-right text-xs text-gray-400">
                                                    {new Date(offer.submitted_at).toLocaleTimeString()}
                                                </td>
                                            </tr>
                                        ))}
                                        {(!result.offers || result.offers.length === 0) && (
                                            <tr>
                                                <td colSpan="5" className="py-8 text-center text-gray-400 italic">No offers submitted yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {results.map((result, index) => (
                        <div
                            key={result.bank_name}
                            className={`p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all duration-300 transform translate-x-0 opacity-100 ${index === 0 && result.price ? 'bg-emerald-50 border-emerald-200 ring-2 ring-emerald-500/20' : 'bg-white border-gray-100'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${index === 0 && result.price ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'
                                    }`}>
                                    {index === 0 && result.price ? <Trophy size={20} /> : <Landmark size={20} />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-bold text-lg">{result.bank_name}</h4>
                                        {resultsMeta.winnerBankId && result.bank_id === resultsMeta.winnerBankId && (
                                            <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded uppercase tracking-wider">Winner</span>
                                        )}
                                        {result.quotation_base && (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${result.quotation_base === 'Execution' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'}`}>
                                                {result.quotation_base}
                                            </span>
                                        )}
                                        {result.is_document_visible === false && (
                                            <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded uppercase">Doc Hidden</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        {result.submitted_at ? (
                                            <p className="text-xs text-gray-400">Submitted at {new Date(result.submitted_at).toLocaleTimeString()}</p>
                                        ) : (
                                            <p className="text-xs text-amber-500 font-medium">No quote submitted</p>
                                        )}
                                        {result.token && (
                                            <button
                                                onClick={() => {
                                                    const link = `${window.location.origin}/public-quotation/${result.token}`;
                                                    navigator.clipboard.writeText(link);
                                                    alert('Bidding link copied to clipboard!');
                                                }}
                                                className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-medium"
                                                title="Copy bidding link"
                                            >
                                                <ExternalLink size={10} /> Link
                                            </button>
                                        )}
                                        {result.quotation_bank_id && (
                                            <button
                                                onClick={() => handleResendInvite(result.quotation_bank_id, result.bank_name)}
                                                className="text-[10px] text-emerald-600 hover:underline flex items-center gap-1 font-medium"
                                                title="Resend invitation email to this bank"
                                            >
                                                <Mail size={10} /> Resend Invite
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {result.price && result.finalPrice ? (
                                <div className="text-right flex flex-wrap items-center gap-4 sm:gap-8 w-full md:w-auto">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Bank Quote</label>
                                        <p className="text-sm font-mono text-gray-500">{result.price.toFixed(5)}</p>
                                    </div>
                                    <ArrowRight className="text-gray-300 hidden sm:block" size={16} />
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Adjusted Price</label>
                                        <p className={`text-2xl font-bold font-mono ${index === 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                                            {result.finalPrice.toFixed(5)}
                                        </p>
                                    </div>
                                    <div className="pl-4 border-l border-gray-100">
                                        <button
                                            onClick={() => {
                                                const isWinner = index === 0;
                                                const refNo = rfq?.ref_no || '';
                                                const subject = encodeURIComponent(isWinner
                                                    ? `Deal Confirmation: RFQ ${refNo} - ${rfq.buy_currency}/${rfq.sell_currency}`
                                                    : `RFQ Result: RFQ ${refNo} - ${rfq.buy_currency}/${rfq.sell_currency}`
                                                );

                                                const body = encodeURIComponent(isWinner
                                                    ? `Dear ${result.bank_name} FX Desk,\n\nWe are pleased to confirm the execution of the following trade based on your winning quote:\n\nREFERENCE: ${refNo}\n- Pair: ${rfq.buy_currency}/${rfq.sell_currency}\n- Amount: ${rfq.amount}\n- Executed Rate: ${result.price.toFixed(5)}\n- Value Date: ${rfq.value_date}\n\nPlease proceed with the standard settlement instructions.\n\nBest regards,\nTreasury Team`
                                                    : `Dear ${result.bank_name} FX Desk,\n\nThank you for participating in our Request for Quotation (RFQ) for ${rfq.buy_currency}/${rfq.sell_currency}.\n\nREFERENCE: ${refNo}\n\nWe are writing to inform you that your quote was not selected for this specific transaction as we have executed with another counterparty at a more competitive all-in rate.\n\nWe appreciate your participation and look forward to your quotes on future requests.\n\nBest regards,\nTreasury Team`
                                                );

                                                window.open(`mailto:${result.bank_emails}?subject=${subject}&body=${body}`, '_blank');
                                            }}
                                            title={index === 0 ? "Draft Confirmation Email" : "Draft Regret Email"}
                                            className={`p-3 rounded-xl transition-all flex items-center gap-2 ${index === 0
                                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}
                                        >
                                            <Mail size={18} />
                                            <span className="text-xs font-bold sm:hidden">Email</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-right w-full md:w-auto">
                                    <span className="text-sm font-bold text-gray-400">Awaiting Submission</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {results.length > 0 && rfq?.type !== 'TBILL' && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                    <AlertCircle className="text-amber-500 mt-0.5 shrink-0" size={16} />
                    <p className="text-xs text-amber-700 leading-relaxed">
                        Final Adjusted Price includes the bank's quote plus the pre-configured additional costs (Min, %, Max, Flat).
                        The winner is selected based on the lowest Final Adjusted Price.
                    </p>
                </div>
            )}
            {results.length > 0 && rfq?.type === 'TBILL' && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
                    <AlertCircle className="text-blue-500 mt-0.5 shrink-0" size={16} />
                    <p className="text-xs text-blue-700 leading-relaxed">
                        T-Bill results are displayed as submitted. No automatic ranking or winner selection is applied in this phase.
                        Normalization using the Evaluation Interest Rate is for internal review only.
                    </p>
                </div>
            )}
        </div>
    );
}
