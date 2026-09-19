import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Trophy, Landmark, Clock, ArrowRight, AlertCircle, Mail, ExternalLink, FileText, MessageSquare, CheckCircle2, Check, Printer, Shield, X, Award, RefreshCw, Calendar, Info, XCircle, AlertTriangle, Undo2, Building, User } from 'lucide-react';
import apiClient from '../../../services/apiClient';
import ReTenderModal from '../../../components/Modals/ReTenderModal';
import QuotationCancellationModal from '../../../components/Modals/QuotationCancellationModal';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatDate = (d) => {
    if (!d) return '—';
    try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return d;
        const day = String(date.getDate()).padStart(2, '0');
        const month = MONTHS[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    } catch {
        return d;
    }
};

const renderApprovalBadge = (result) => {
    if (!result || !result.approval_status) return null;

    const status = (result.approval_status || '').toUpperCase();
    if (status === 'PENDING') {
        return (
            <span 
                className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider"
                title="Awaiting internal bank approver authorization before quoting"
            >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Pending Bank Approval
            </span>
        );
    }
    if (status === 'APPROVED') {
        const approvedDetail = [
            result.approved_by_email ? `Approved by: ${result.approved_by_email}` : null,
            result.approved_at ? `At: ${new Date(result.approved_at).toLocaleString()}` : null,
            result.approval_notes ? `Notes: ${result.approval_notes}` : null
        ].filter(Boolean).join('\n');

        return (
            <span 
                className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider cursor-help"
                title={approvedDetail || 'Bank approver authorized participation'}
            >
                <CheckCircle2 size={11} className="text-emerald-600" />
                Bank Approved
            </span>
        );
    }
    if (status === 'DECLINED') {
        const declinedDetail = [
            result.approved_by_email ? `Declined by: ${result.approved_by_email}` : null,
            result.approved_at ? `At: ${new Date(result.approved_at).toLocaleString()}` : null,
            result.approval_notes ? `Reason: ${result.approval_notes}` : null
        ].filter(Boolean).join('\n');

        return (
            <span 
                className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full uppercase tracking-wider cursor-help"
                title={declinedDetail || 'Bank approver declined participation'}
            >
                <AlertCircle size={11} className="text-rose-600" />
                Bank Declined
            </span>
        );
    }
    if (status === 'EXPIRED') {
        return (
            <span 
                className="inline-flex items-center gap-1 text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-300 px-2 py-0.5 rounded-full uppercase tracking-wider cursor-help"
                title="Quotation window closed without approver response. Excluded from quoting."
            >
                <Clock size={11} className="text-gray-500" />
                Excluded — No Response
            </span>
        );
    }
    return null;
};

export default function ResultsView({ rfqId }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [results, setResults] = useState([]);
    const [rfq, setRfq] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sendingResults, setSendingResults] = useState(false);
    const userRole = localStorage.getItem('user_role'); // Check role
    const isCorporateAdmin = location.pathname.startsWith('/corporate-admin') || (userRole || '').toLowerCase().includes('corporate_admin');

    const [resultsMeta, setResultsMeta] = useState({});
    const [showAuditPack, setShowAuditPack] = useState(false);
    const [showReTenderModal, setShowReTenderModal] = useState(false);
    const [showCancellationModal, setShowCancellationModal] = useState(false);
    const [copiedToken, setCopiedToken] = useState(null);

    const handleCopyBiddingLink = (token) => {
        const link = `${window.location.origin}/public-quotation/${token}`;
        navigator.clipboard.writeText(link);
        setCopiedToken(token);
        toast.success('Bidding link copied to clipboard!');
        setTimeout(() => setCopiedToken(null), 2000);
    };

    const isWindowClosed = Boolean(
        rfq && (
            ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(rfq.status) ||
            (rfq.window_end && new Date() > new Date(rfq.window_end))
        )
    );

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
                hasExecutionBanks: res.data.has_execution_banks,
                liveTelemetry: res.data.live_telemetry,
                savingsSummary: res.data.savings_summary
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
        let isMounted = true;

        const initFetch = async () => {
            const currentStatus = await fetchResults();
            if (!isMounted) return;

            if (currentStatus && ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(currentStatus)) {
                return; // Terminal state reached, do not poll
            }

            // High-efficiency 1.5s live polling during active bidding window
            interval = setInterval(async () => {
                if (typeof document !== 'undefined' && document.hidden) return; // Conserve resources when tab is unfocused
                const updatedStatus = await fetchResults();
                if (updatedStatus && ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(updatedStatus)) {
                    if (interval) clearInterval(interval);
                }
            }, 1500);
        };

        initFetch();

        return () => {
            isMounted = false;
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
                <div className="flex items-center gap-3 mt-2 sm:mt-0 flex-wrap">
                    {!isCorporateAdmin && rfq?.status === 'NEEDS_REVISION' && (
                        <button
                            onClick={() => navigate(`/end-user/quotations/active?revision_rfq_id=${rfq.id}`)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-200 cursor-pointer"
                            title="Open quotation in builder to revise parameters and resubmit"
                        >
                            <Undo2 size={13} /> Revise & Resubmit
                        </button>
                    )}
                    {isWindowClosed && !isCorporateAdmin && (
                        <button
                            onClick={() => navigate(`/end-user/quotations/active?retrade_rfq_id=${rfq.id}`)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 cursor-pointer"
                            title="Clone deal parameters into quotation builder with a fresh bidding window"
                        >
                            <RefreshCw size={13} /> ⚡ 1-Click Re-Tender
                        </button>
                    )}
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
                    {!isCorporateAdmin && ['PENDING', 'PENDING_APPROVAL'].includes(rfq?.status) && !isWindowClosed && (
                        <button
                            onClick={() => setShowCancellationModal(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                            title="Withdraw or request cancellation of this quotation"
                        >
                            <XCircle size={13} /> {rfq?.status === 'PENDING_APPROVAL' ? 'Cancel Draft' : 'Request Cancellation'}
                        </button>
                    )}
                    {isWindowClosed ? (
                        <span className="text-xs font-medium text-gray-400 italic">Quotation concluded</span>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold shadow-xs">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span>Live Sync (1.5s)</span>
                            </span>
                            <button
                                onClick={() => fetchResults()}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                title="Force refresh live standings"
                            >
                                <RefreshCw size={13} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Cancellation Status Banners */}
            {rfq?.status === 'CANCEL_REQUESTED' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in shadow-xs">
                    <div className="flex items-start sm:items-center gap-3">
                        <AlertTriangle className="text-rose-600 shrink-0 mt-0.5 sm:mt-0" size={22} />
                        <div>
                            <h4 className="font-bold text-xs uppercase tracking-wide text-rose-800">Cancellation Request Pending Corporate Admin Review</h4>
                            <p className="text-xs text-rose-700 mt-0.5">
                                Reason: <span className="font-semibold">{rfq.cancellation_reason || 'Administrative Rescheduling'}</span>
                                {rfq.cancellation_notes ? ` — "${rfq.cancellation_notes}"` : ''}
                            </p>
                        </div>
                    </div>
                    <span className="text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 px-3 py-1 rounded-xl shrink-0">
                        Under Admin Review
                    </span>
                </div>
            )}

            {rfq?.status === 'CANCELLED' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-100 border border-slate-300 text-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
                    <div className="flex items-start sm:items-center gap-3">
                        <XCircle className="text-slate-500 shrink-0 mt-0.5 sm:mt-0" size={22} />
                        <div>
                            <h4 className="font-bold text-xs uppercase tracking-wide text-slate-700">Quotation Withdrawn &amp; Cancelled</h4>
                            <p className="text-xs text-slate-600 mt-0.5">
                                This quotation request was officially withdrawn. Counterparty submission links have been deactivated.
                            </p>
                        </div>
                    </div>
                    {!isCorporateAdmin && (
                        <button
                            onClick={() => navigate(`/end-user/quotations/active?retrade_rfq_id=${rfq.id}`)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 shrink-0 cursor-pointer"
                        >
                            <RefreshCw size={14} /> ⚡ Clone as New Quotation (Re-Trade)
                        </button>
                    )}
                </div>
            )}

            {resultsMeta.isInconclusive && (
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-start gap-4">
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
                    {!isCorporateAdmin && (
                        <button
                            onClick={() => navigate(`/end-user/quotations/active?retrade_rfq_id=${rfq.id}`)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 shrink-0 cursor-pointer"
                        >
                            <RefreshCw size={14} /> ⚡ 1-Click Re-Tender
                        </button>
                    )}
                </div>
            )}

            {/* Needs Revision Attention Banner */}
            {rfq?.status === 'NEEDS_REVISION' && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3 animate-fade-in">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 text-amber-900 font-bold text-sm">
                            <AlertCircle className="text-amber-600 shrink-0" size={18} />
                            Action Required: This quotation request was returned for revision by Corporate Admin
                        </div>
                        {!isCorporateAdmin && (
                            <button
                                onClick={() => navigate(`/end-user/quotations/active?revision_rfq_id=${rfq.id}`)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
                            >
                                <Undo2 size={14} /> Open in Quotation Builder
                            </button>
                        )}
                    </div>
                    {rfq.admin_revision_notes && (
                        <div className="bg-white/90 rounded-2xl p-4 border border-amber-200 text-xs text-amber-950 italic">
                            <span className="font-bold text-amber-900 not-italic block mb-1 uppercase text-[10px]">Corporate Admin Feedback:</span>
                            "{rfq.admin_revision_notes}"
                        </div>
                    )}
                </div>
            )}

            {/* Phase 2: Live Trading Floor Telemetry Pulse */}
            {!isWindowClosed && resultsMeta.liveTelemetry && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-md border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center">
                            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative"></span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Live Trading Floor Telemetry</span>
                                <span className="text-[10px] text-slate-400 font-medium hidden md:inline">&bull; Real-time Blind Pulse</span>
                            </div>
                            <p className="text-sm font-bold text-slate-100 mt-0.5">
                                {resultsMeta.liveTelemetry.desks_active} of {resultsMeta.liveTelemetry.total_invited} Desks Active
                                <span className="mx-2 text-slate-500">•</span>
                                <span className="text-emerald-400">{resultsMeta.liveTelemetry.quotes_locked} Quote{resultsMeta.liveTelemetry.quotes_locked !== 1 ? 's' : ''} Locked In</span>
                                {resultsMeta.liveTelemetry.approvals_pending > 0 && (
                                    <span className="ml-2 text-amber-400 text-xs font-normal">
                                        ({resultsMeta.liveTelemetry.approvals_pending} Awaiting Approver Authorization)
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 self-end sm:self-center bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60" title="Blind bidding rules strictly protect bank pricing and identities until bidding window closes.">
                        <Shield size={13} className="text-emerald-400" />
                        <span>Blind Bidding Protected</span>
                    </div>
                </div>
            )}

            {!isWindowClosed && (
                <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-500">
                    <Info size={13} className="text-slate-400 shrink-0" />
                    <span>
                        <strong className="text-slate-700 font-semibold">Transmission & Telemetry Notice:</strong> Standings and trading floor signals update via continuous high-speed synchronization. Local connectivity or ISP latency across counterparties may introduce minor variance. The system accepts no liability for third-party transmission delays.
                    </span>
                </div>
            )}

            {/* Phase 2: Best Execution & Monetary Savings Hero Card */}
            {resultsMeta.savingsSummary && (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950 text-white shadow-xl border border-emerald-500/30 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-emerald-700/50 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                                <Trophy size={26} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                        Certified Best Execution
                                    </span>
                                    <span className="text-xs text-emerald-200/70 font-mono">Regulatory & Governance Standard</span>
                                </div>
                                <h3 className="text-lg font-bold text-white mt-1">
                                    Awarded to {resultsMeta.savingsSummary.winner_bank_name} @ {resultsMeta.savingsSummary.winner_rate}
                                </h3>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowAuditPack(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white text-emerald-950 hover:bg-emerald-50 transition-all shadow-md active:scale-95 shrink-0"
                        >
                            <FileText size={14} className="text-emerald-700" /> Best Execution Audit Pack
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                        <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/20">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/80 block mb-1">
                                Net Value Generated vs Avg
                            </span>
                            <p className="text-xl sm:text-2xl font-black font-mono text-emerald-300">
                                {resultsMeta.savingsSummary.currency} {resultsMeta.savingsSummary.saved_vs_avg?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <span className="text-[10px] text-emerald-200/60 mt-0.5 block">
                                Benchmarked against average bid of {resultsMeta.savingsSummary.avg_rate}
                            </span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/20">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300/80 block mb-1">
                                Max Protection vs Worst Quote
                            </span>
                            <p className="text-xl sm:text-2xl font-black font-mono text-teal-300">
                                {resultsMeta.savingsSummary.currency} {resultsMeta.savingsSummary.saved_vs_worst?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <span className="text-[10px] text-teal-200/60 mt-0.5 block">
                                Protected against worst quote of {resultsMeta.savingsSummary.worst_rate}
                            </span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/20">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300/80 block mb-1">
                                Competitive Bids Evaluated
                            </span>
                            <p className="text-xl sm:text-2xl font-black font-mono text-white">
                                {resultsMeta.savingsSummary.total_quotes} Bids Received
                            </p>
                            <span className="text-[10px] text-slate-300/70 mt-0.5 block">
                                Simultaneous blind competitive tender
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {rfq && (
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5 mb-6">
                    {/* Header Row: Direction, Amount, Currency, Entity, and Value Date */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                        <div className="space-y-2.5">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Trade Specifications</span>
                                {rfq.entity_name && (
                                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
                                        <Building size={13} className="text-indigo-600" />
                                        {rfq.entity_name}
                                    </span>
                                )}
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${
                                    (() => {
                                        const counterpartyBases = Array.from(new Set((results || []).map(r => r.quotation_base).filter(Boolean)));
                                        const isMixed = counterpartyBases.length > 1;
                                        if (isMixed) return 'bg-indigo-50 text-indigo-900 border-indigo-200';
                                        return (rfq.quotation_base === 'Execution' || counterpartyBases[0] === 'Execution')
                                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                                            : 'bg-slate-100 text-slate-700 border-slate-200';
                                    })()
                                }`}>
                                    {(() => {
                                        const counterpartyBases = Array.from(new Set((results || []).map(r => r.quotation_base).filter(Boolean)));
                                        const isMixed = counterpartyBases.length > 1;
                                        if (isMixed) return `⚡ Mixed Bases (${counterpartyBases.join(', ')})`;
                                        return (rfq.quotation_base === 'Execution' || counterpartyBases[0] === 'Execution')
                                            ? '⚡ Firm Execution'
                                            : '👁️ Indicative';
                                    })()}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 pt-0.5">
                                <span className={`inline-flex items-center justify-center font-black text-sm px-3.5 py-1 rounded-lg uppercase tracking-wider shadow-xs ${
                                    (rfq.direction || '').toUpperCase() === 'BUY'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-blue-600 text-white'
                                }`}>
                                    {rfq.direction || 'BUY'}
                                </span>
                                <div className="flex items-baseline gap-2.5">
                                    <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                                        {rfq.type === 'TBILL'
                                            ? `T-Bill (${rfq.direction})`
                                            : new Intl.NumberFormat().format(rfq.amount || 0)}
                                    </span>
                                    {rfq.type !== 'TBILL' && (
                                        <span className="text-xl sm:text-2xl font-bold text-slate-700">
                                            {rfq.buy_currency}/{rfq.sell_currency}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Value Date Box */}
                        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 text-right flex flex-col items-start md:items-end justify-center min-w-[220px] shrink-0 shadow-2xs">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Calendar size={13} className="text-slate-600" /> Settlement (Value Date)
                            </span>
                            <span className="text-lg font-bold text-slate-900 font-sans mt-1">{formatDate(rfq.value_date)}</span>
                            {(() => {
                                const hasCustomDates = (results || []).some(r => r.is_custom_value_date || (r.assigned_value_date && rfq.value_date && String(r.assigned_value_date).split('T')[0] !== String(rfq.value_date).split('T')[0]));
                                if (hasCustomDates) {
                                    return (
                                        <span className="inline-block text-[10px] font-bold mt-1 px-2 py-0.5 rounded border text-blue-700 bg-blue-50 border-blue-200">
                                            • Per-Bank Custom Dates
                                        </span>
                                    );
                                }
                                return null;
                            })()}
                            {rfq.type === 'FX_SPOT' && (
                                <span className={`inline-block text-xs font-semibold mt-1.5 px-2.5 py-0.5 rounded-md border ${
                                    rfq.allow_alternative_value_date 
                                        ? 'text-blue-700 bg-blue-50 border-blue-200' 
                                        : 'text-slate-700 bg-white border-slate-200'
                                }`}>
                                    {rfq.allow_alternative_value_date ? 'Alternative Date Permitted' : 'Fixed Date Only'}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Deal Parameters Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Requesting Entity</span>
                            <span className="text-sm font-bold text-slate-900 truncate block" title={rfq.entity_name || '—'}>
                                {rfq.entity_name || '—'}
                            </span>
                        </div>
                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Quotation Base</span>
                            <span className="text-sm font-bold text-slate-900 block">
                                {rfq.quotation_base || 'Execution'}
                            </span>
                        </div>
                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Max Tolerance</span>
                            <span className="text-sm font-bold text-slate-900 font-mono block">
                                {rfq.max_tolerance_percent ? `${rfq.max_tolerance_percent}%` : 'None'}
                            </span>
                        </div>
                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                                {rfq.type === 'FX_SPOT' && rfq.allow_alternative_value_date 
                                    ? 'Valuation Eval Rate' 
                                    : (rfq.type === 'TBILL' && rfq.eval_rate ? 'Evaluation Rate' : 'Min Ticket Amount')}
                            </span>
                            <span className="text-sm font-bold text-slate-900 font-mono block">
                                {rfq.type === 'FX_SPOT' && rfq.allow_alternative_value_date 
                                    ? `${rfq.eval_rate ?? 19.75}% (CBE Mid + Margin)`
                                    : (rfq.type === 'TBILL' && rfq.eval_rate 
                                        ? `${rfq.eval_rate}%` 
                                        : (rfq.min_ticket_amount ? rfq.min_ticket_amount.toLocaleString() : 'N/A'))}
                            </span>
                        </div>
                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Creator</span>
                            <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5 truncate">
                                <User size={14} className="text-slate-500 shrink-0" />
                                <span className="truncate">{rfq.creator_name || 'End User'}</span>
                            </span>
                        </div>
                    </div>

                    {/* Quotation Window Details */}
                    <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <Clock size={16} className="text-blue-600" />
                                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">Quotation Window Timeline</span>
                            </div>
                            {(() => {
                                const now = new Date();
                                const start = rfq.window_start ? new Date(rfq.window_start) : null;
                                const end = rfq.window_end ? new Date(rfq.window_end) : null;
                                if (!start || !end) return null;
                                if (now < start) {
                                    return <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1 rounded-full uppercase tracking-wider"><span className="w-2 h-2 rounded-full bg-slate-400"></span>Scheduled</span>;
                                }
                                if (now >= start && now <= end) {
                                    return <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 px-3 py-1 rounded-full uppercase tracking-wider shadow-2xs"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>Live Bidding Open</span>;
                                }
                                const validityHrs = rfq.token_validity_hours || 24;
                                const linkExpiry = new Date(end.getTime() + validityHrs * 60 * 60 * 1000);
                                if (now > end && now <= linkExpiry) {
                                    return <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300 px-3 py-1 rounded-full uppercase tracking-wider"><span className="w-2 h-2 rounded-full bg-amber-500"></span>Bidding Closed — Link Active</span>;
                                }
                                return <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-rose-50 text-rose-600 border border-rose-300 px-3 py-1 rounded-full uppercase tracking-wider"><span className="w-2 h-2 rounded-full bg-rose-400"></span>Expired</span>;
                            })()}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Sent to Banks</span>
                                <span className="text-sm font-bold text-slate-900 block">{rfq.admin_reviewed_at ? formatDate(rfq.admin_reviewed_at) : formatDate(rfq.created_at)}</span>
                                <span className="text-xs font-medium text-slate-500 block mt-0.5">{new Date(rfq.admin_reviewed_at || rfq.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Window Opens</span>
                                <span className="text-sm font-bold text-slate-900 block">{rfq.window_start ? formatDate(rfq.window_start) : '—'}</span>
                                {rfq.window_start && <span className="text-xs font-medium text-slate-500 block mt-0.5">{new Date(rfq.window_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Window Closes</span>
                                <span className="text-sm font-bold text-slate-900 block">{rfq.window_end ? formatDate(rfq.window_end) : '—'}</span>
                                {rfq.window_end && <span className="text-xs font-medium text-slate-500 block mt-0.5">{new Date(rfq.window_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Window Duration</span>
                                <div>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-blue-50 text-blue-800 border border-blue-200">
                                        ⏱️ {(() => {
                                            if (!rfq.window_start || !rfq.window_end) return '—';
                                            const diffMs = new Date(rfq.window_end) - new Date(rfq.window_start);
                                            const totalMins = Math.round(diffMs / 60000);
                                            if (totalMins < 60) return `${totalMins} min`;
                                            const hrs = Math.floor(totalMins / 60);
                                            const mins = totalMins % 60;
                                            return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
                                        })()}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Link Expires</span>
                                {rfq.window_end ? (
                                    <>
                                        <span className="text-sm font-bold text-slate-900 block">{formatDate(new Date(new Date(rfq.window_end).getTime() + (rfq.token_validity_hours || 24) * 3600000))}</span>
                                        <span className="text-xs font-medium text-slate-500 block mt-0.5">{new Date(new Date(rfq.window_end).getTime() + (rfq.token_validity_hours || 24) * 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </>
                                ) : <span className="text-sm font-bold text-slate-900 block">—</span>}
                            </div>
                        </div>
                    </div>

                    {rfq.document_path && (
                        <div className="pt-3 border-t border-gray-100">
                            <span className="font-sans text-[10px] font-bold text-gray-400 uppercase block mb-2">Attached Documents</span>
                            <div className="flex flex-wrap gap-2">
                                {(() => {
                                    let docs = [];
                                    try {
                                        const parsed = JSON.parse(rfq.document_path);
                                        docs = Array.isArray(parsed) ? parsed : [{ name: 'Attached Document', path: rfq.document_path }];
                                    } catch {
                                        docs = rfq.document_path.split(',').map(p => ({ name: p.trim(), path: p.trim() }));
                                    }
                                    return docs.map((d, i) => (
                                        <a
                                            key={i}
                                            href={d.path?.startsWith('http') ? d.path : `http://localhost:8000${d.path?.startsWith('/') ? '' : '/'}${d.path}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs font-medium text-blue-600 hover:bg-gray-100"
                                        >
                                            <FileText size={14} className="text-gray-400" /> {d.name || `Document ${i+1}`}
                                        </a>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}

                    {rfq.internal_notes && (
                        <div className="pt-3 border-t border-gray-100">
                            <span className="font-sans text-[10px] font-bold text-blue-600 uppercase block mb-1.5 flex items-center gap-1.5">
                                <FileText size={12} className="text-blue-500" /> Internal Notes / Related Invoices & Payments
                            </span>
                            <div className="p-3 bg-gray-50 border border-gray-200/80 rounded-xl text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {rfq.internal_notes}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {rfq?.status === 'PENDING_APPROVAL' && (
                <div className="p-8 bg-orange-50 rounded-3xl border border-orange-200 mb-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <AlertCircle className="text-orange-500" size={48} />
                        <div>
                            <h4 className="text-lg font-bold text-orange-900 mb-1">Corporate Admin Approval Required</h4>
                            <p className="text-sm text-orange-700 max-w-lg mx-auto">
                                Review the trade specifications and selected counterparty list above before releasing this quotation.
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
                    </div>
                </div>
            )}

            {rfq?.status === 'REJECTED' ? (
                <div className="p-12 bg-red-50 rounded-3xl border border-red-100 text-center">
                    <AlertCircle className="mx-auto text-red-400 mb-4" size={32} />
                    <p className="text-red-700 font-medium tracking-tight">This quotation request was rejected by the Corporate Admin.</p>
                </div>
            ) : results.length === 0 ? (
                <div className="p-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-center">
                    <Clock className="mx-auto text-gray-300 mb-4" size={32} />
                    <p className="text-gray-500">No counterparties assigned to this quotation request.</p>
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
                                            {renderApprovalBadge(result)}
                                            {result.assigned_value_date && (
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                                    result.is_custom_value_date 
                                                        ? 'bg-blue-50 text-blue-800 border-blue-200' 
                                                        : 'bg-slate-50 text-slate-600 border-slate-200'
                                                }`}>
                                                    Val: {result.assigned_value_date}
                                                    {result.is_custom_value_date && ' (Custom)'}
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
                                            onClick={() => handleCopyBiddingLink(result.token)}
                                            className={`text-[10px] font-bold px-3 py-1.5 rounded uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer ${
                                                copiedToken === result.token 
                                                    ? 'bg-emerald-600 text-white shadow-xs' 
                                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                            }`}
                                            title={copiedToken === result.token ? "Copied!" : "Copy secure bidding link for this bank"}
                                        >
                                            {copiedToken === result.token ? <Check size={12} /> : <ExternalLink size={12} />}
                                            {copiedToken === result.token ? 'Copied' : 'Bidding Link'}
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

                            {result.approval_status === 'DECLINED' && result.approval_notes && (
                                <div className="mb-4 text-xs bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2 text-rose-800 flex items-start gap-2">
                                    <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                                    <span className="leading-snug"><strong className="text-rose-900 font-semibold">Approver Decline Reason:</strong> {result.approval_notes}</span>
                                </div>
                            )}

                            {result.notes && (
                                <div className="mb-4 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-700 flex items-start gap-2">
                                    <MessageSquare size={14} className="text-blue-500 shrink-0 mt-0.5" />
                                    <span className="leading-snug"><strong className="text-slate-900 font-semibold">Trader Notes:</strong> {result.notes}</span>
                                </div>
                            )}

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
                                                <td className="py-3 font-medium">{formatDate(offer.settlement_date)}</td>
                                                <td className="py-3 font-medium">{formatDate(offer.maturity_date)}</td>
                                                <td className="py-3 font-mono font-bold text-emerald-600">{offer.discount_rate.toFixed(4)}%</td>
                                                <td className="py-3 font-mono font-bold">{new Intl.NumberFormat().format(offer.max_amount)}</td>
                                                <td className="py-3 text-right text-xs text-gray-400">
                                                    {new Date(offer.submitted_at).toLocaleTimeString()}
                                                </td>
                                            </tr>
                                        ))}
                                        {(!result.offers || result.offers.length === 0) && (
                                            <tr>
                                                <td colSpan="5" className="py-8 text-center text-gray-400 italic">
                                                    {result.approval_status === 'DECLINED'
                                                        ? 'Participation declined by bank approver.'
                                                        : (result.approval_status === 'EXPIRED' || (isWindowClosed && result.approval_status === 'PENDING'))
                                                        ? 'Excluded: Bank approval window expired without response.'
                                                        : result.approval_status === 'PENDING'
                                                        ? 'Awaiting internal bank approver authorization before quoting.'
                                                        : isWindowClosed
                                                        ? 'Window closed without receiving any offers.'
                                                        : 'No offers submitted yet.'}
                                                </td>
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
                                        {renderApprovalBadge(result)}
                                        {result.assigned_value_date && (
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                                result.is_custom_value_date 
                                                    ? 'bg-blue-50 text-blue-800 border-blue-200' 
                                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                            }`}>
                                                Val: {result.assigned_value_date}
                                                {result.is_custom_value_date && ' (Custom)'}
                                            </span>
                                        )}
                                        {result.is_document_visible === false && (
                                            <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded uppercase">Doc Hidden</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        {result.submitted_at ? (
                                            <p className="text-xs text-gray-400">
                                                Submitted at {new Date(result.submitted_at).toLocaleTimeString()}
                                                {result.submitted_by_email && (
                                                    <span className="ml-2 font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                                        by {result.submitted_by_email}
                                                    </span>
                                                )}
                                            </p>
                                        ) : isWindowClosed ? (
                                            <p className="text-xs text-slate-400 font-medium">Window closed &bull; No quote submitted</p>
                                        ) : (
                                            <p className="text-xs text-amber-500 font-medium">No quote submitted</p>
                                        )}
                                        {result.token && (
                                            <button
                                                onClick={() => handleCopyBiddingLink(result.token)}
                                                className={`text-[10px] flex items-center gap-1 font-medium transition-colors cursor-pointer ${
                                                    copiedToken === result.token 
                                                        ? 'text-emerald-700 font-bold' 
                                                        : 'text-blue-600 hover:underline'
                                                }`}
                                                title={copiedToken === result.token ? "Copied!" : "Copy bidding link"}
                                            >
                                                {copiedToken === result.token ? <Check size={10} className="text-emerald-700" /> : <ExternalLink size={10} />}
                                                {copiedToken === result.token ? 'Copied!' : 'Link'}
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
                                    {result.approval_status === 'DECLINED' && result.approval_notes && (
                                        <div className="mt-2 text-xs bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5 text-rose-800 flex items-start gap-2 max-w-lg">
                                            <AlertCircle size={13} className="text-rose-500 shrink-0 mt-0.5" />
                                            <span className="leading-snug"><strong className="text-rose-900 font-semibold">Approver Decline Reason:</strong> {result.approval_notes}</span>
                                        </div>
                                    )}
                                    {result.notes && (
                                        <div className="mt-2 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 flex items-start gap-2 max-w-lg">
                                            <MessageSquare size={13} className="text-blue-500 shrink-0 mt-0.5" />
                                            <span className="leading-snug"><strong className="text-slate-900 font-semibold">Trader Notes:</strong> {result.notes}</span>
                                        </div>
                                    )}
                                    {/* Value Date & Settlement Policy Badge (visible during approval and execution) */}
                                    {rfq?.type === 'FX_SPOT' && (
                                        <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold ${
                                                result.is_alternative_value_date 
                                                    ? 'bg-blue-50 text-blue-800 border-blue-200' 
                                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                                            }`}>
                                                <Calendar size={12} className={result.is_alternative_value_date ? 'text-blue-600' : 'text-slate-400'} />
                                                <span>
                                                    Value Date: <strong>{formatDate(result.offered_value_date || result.assigned_value_date || rfq?.value_date)}</strong>
                                                </span>
                                                {result.is_alternative_value_date && (
                                                    <span className="text-[10px] font-normal text-blue-600 ml-1">
                                                        (Target: {formatDate(rfq?.value_date)})
                                                    </span>
                                                )}
                                            </span>
                                            {result.allow_alternative_value_date ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                                    Alternative Date Permitted
                                                </span>
                                            ) : result.is_alternative_value_date ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                                                    Custom Settlement Date
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 bg-gray-100 border border-gray-200/60 px-2 py-0.5 rounded">
                                                    Fixed Settlement Date
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {result.price && result.finalPrice ? (
                                <div className="text-right flex flex-wrap items-center gap-4 sm:gap-6 w-full md:w-auto">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Bank Quote</label>
                                        <p className="text-sm font-mono text-gray-500">{result.price.toFixed(5)}</p>
                                    </div>
                                    <ArrowRight className="text-gray-300 hidden sm:block" size={16} />
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">All-In Price</label>
                                        <p className="text-sm font-mono font-semibold text-gray-700">{result.finalPrice.toFixed(5)}</p>
                                    </div>
                                    {result.is_alternative_value_date && result.normalized_price ? (
                                        <>
                                            <ArrowRight className="text-gray-300 hidden sm:block" size={16} />
                                            <div>
                                                <div className="flex items-center justify-end gap-1 mb-1">
                                                    <label className="block text-[10px] font-bold text-blue-600 uppercase">TVM Eval Price</label>
                                                    <span className="text-[9px] font-mono font-bold bg-blue-100 text-blue-800 px-1 rounded">
                                                        {result.time_value_adjustment >= 0 ? '+' : ''}{result.time_value_adjustment.toFixed(4)}
                                                    </span>
                                                </div>
                                                <p className={`text-2xl font-bold font-mono ${index === 0 ? 'text-emerald-600' : 'text-blue-950'}`}>
                                                    {result.normalized_price.toFixed(5)}
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <ArrowRight className="text-gray-300 hidden sm:block" size={16} />
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Adjusted Price</label>
                                                <p className={`text-2xl font-bold font-mono ${index === 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                                                    {result.finalPrice.toFixed(5)}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                    <div className="pl-4 border-l border-gray-100">
                                        <button
                                            onClick={() => {
                                                const isWinner = index === 0;
                                                const refNo = rfq?.ref_no || '';
                                                const executedValueDate = result.offered_value_date || rfq?.value_date;
                                                const subject = encodeURIComponent(isWinner
                                                    ? `Deal Confirmation: RFQ ${refNo} - ${rfq.buy_currency}/${rfq.sell_currency}`
                                                    : `RFQ Result: RFQ ${refNo} - ${rfq.buy_currency}/${rfq.sell_currency}`
                                                );

                                                const body = encodeURIComponent(isWinner
                                                    ? `Dear ${result.bank_name} FX Desk,\n\nWe are pleased to confirm the execution of the following trade based on your winning quote:\n\nREFERENCE: ${refNo}\n- Pair: ${rfq.buy_currency}/${rfq.sell_currency}\n- Amount: ${rfq.amount}\n- Executed Rate: ${result.price.toFixed(5)}\n- Value Date: ${formatDate(executedValueDate)}\n\nPlease proceed with the standard settlement instructions.\n\nBest regards,\nTreasury Team`
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
                                    {result.approval_status === 'DECLINED' ? (
                                        <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg inline-block">
                                            Declined by Bank
                                        </span>
                                    ) : result.approval_status === 'EXPIRED' ? (
                                        <span className="text-xs font-bold text-gray-500 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg inline-block">
                                            Approval Expired
                                        </span>
                                    ) : result.approval_status === 'PENDING' ? (
                                        <span className={`text-xs font-bold px-3 py-1.5 rounded-lg inline-block ${
                                            isWindowClosed ? 'text-gray-500 bg-gray-100 border border-gray-200' : 'text-amber-600 bg-amber-50 border border-amber-200'
                                        }`}>
                                            {isWindowClosed ? 'Approval Expired' : 'Pending Bank Approval'}
                                        </span>
                                    ) : isWindowClosed ? (
                                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg inline-block">
                                            No Offer Received
                                        </span>
                                    ) : (
                                        <span className="text-sm font-bold text-gray-400">Awaiting Submission</span>
                                    )}
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

            {/* Certified Best Execution Audit Pack Modal */}
            {showAuditPack && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-900">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                                    <Shield size={22} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white tracking-wide">
                                        Best Execution Audit Certificate
                                    </h3>
                                    <p className="text-xs text-slate-400 font-mono">
                                        RFQ #{rfq?.ref_no} &bull; Generated {new Date().toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                                    title="Print or Save as PDF"
                                >
                                    <Printer size={14} /> Print Audit Sheet
                                </button>
                                <button
                                    onClick={() => setShowAuditPack(false)}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Printable Certificate Body */}
                        <div className="p-6 overflow-y-auto space-y-6 text-sm">
                            {/* Executive Summary */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
                                <div>
                                    <span className="font-sans text-[10px] font-bold text-slate-400 uppercase block">Trade Instrument</span>
                                    <span className="font-bold text-slate-900">{rfq?.type === 'TBILL' ? 'T-Bill Auction' : `FX Spot (${rfq?.buy_currency}/${rfq?.sell_currency})`}</span>
                                </div>
                                <div>
                                    <span className="font-sans text-[10px] font-bold text-slate-400 uppercase block">Trade Volume</span>
                                    <span className="font-bold text-slate-900">{rfq?.amount?.toLocaleString()} {rfq?.buy_currency}</span>
                                </div>
                                <div>
                                    <span className="font-sans text-[10px] font-bold text-slate-400 uppercase block">Value Date</span>
                                    <span className="font-bold text-slate-900">{rfq?.value_date || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="font-sans text-[10px] font-bold text-slate-400 uppercase block">Tender Mechanism</span>
                                    <span className="font-bold text-emerald-700">Blind Simultaneous Tender</span>
                                </div>
                            </div>

                            {/* Savings Certification Block */}
                            {resultsMeta.savingsSummary && (
                                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Award size={18} className="text-emerald-700" />
                                        <h4 className="font-bold text-emerald-900 text-sm">Audit Findings & Quantified Value Delivery</h4>
                                    </div>
                                    <p className="text-xs text-emerald-800 leading-relaxed">
                                        Awarded counterparty <strong className="font-semibold text-emerald-950">{resultsMeta.savingsSummary.winner_bank_name}</strong> submitted the optimal rate of <strong className="font-mono font-semibold">{resultsMeta.savingsSummary.winner_rate}</strong>. 
                                        Execution achieved a net verified savings of <strong className="font-mono font-semibold">{resultsMeta.savingsSummary.currency} {resultsMeta.savingsSummary.saved_vs_avg?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> compared to the mean quote of <strong className="font-mono">{resultsMeta.savingsSummary.avg_rate}</strong> across {resultsMeta.savingsSummary.total_quotes} participating banking desks.
                                    </p>
                                </div>
                            )}

                            {/* Audit Trail Table */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Counterparty Submission Audit Log</h4>
                                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-500">
                                            <tr>
                                                <th className="py-2.5 px-3">Rank / Counterparty</th>
                                                <th className="py-2.5 px-3">Type</th>
                                                <th className="py-2.5 px-3 font-mono">Bank Quote</th>
                                                <th className="py-2.5 px-3 font-mono">Final Price</th>
                                                <th className="py-2.5 px-3">Submission Timestamp</th>
                                                <th className="py-2.5 px-3 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {results.map((res, idx) => {
                                                const isWin = res.bank_id === resultsMeta.winnerBankId || idx === 0;
                                                return (
                                                    <tr key={idx} className={isWin ? 'bg-emerald-50/70 font-semibold' : 'hover:bg-slate-50'}>
                                                        <td className="py-2.5 px-3 flex items-center gap-2">
                                                            {isWin ? <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">1</span> : <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>}
                                                            <span>{res.bank_name}</span>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-slate-500">{res.quotation_base || 'Execution'}</td>
                                                        <td className="py-2.5 px-3 font-mono">{res.price ? res.price.toFixed(5) : '—'}</td>
                                                        <td className="py-2.5 px-3 font-mono text-emerald-700">{res.finalPrice ? res.finalPrice.toFixed(5) : (res.best_score ? res.best_score.toFixed(6) : '—')}</td>
                                                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{res.submitted_at ? new Date(res.submitted_at).toLocaleTimeString() : 'No Submission'}</td>
                                                        <td className="py-2.5 px-3 text-right">
                                                            {isWin ? (
                                                                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase">Awarded</span>
                                                            ) : res.submitted_at ? (
                                                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">Competitive</span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold uppercase">Unquoted</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Compliance Sign-off */}
                            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
                                <div>
                                    <p className="font-semibold text-slate-800">Compliance & Regulatory Attestation</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        This transaction adhered to Corporate Treasury competitive guidelines and blind bidding policy.
                                    </p>
                                </div>
                                <div className="font-mono text-[10px] text-right bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                                    <div>AUDIT HASH: {rfq?.ref_no ? `TX-${rfq.ref_no}-OK` : 'N/A'}</div>
                                    <div className="text-slate-400">System Verified &bull; Corporate Treasury Engine</div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setShowAuditPack(false)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-200"
                            >
                                <Printer size={14} /> Print / Export PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 1-Click Re-Tender Modal */}
            {showReTenderModal && rfq && (
                <ReTenderModal
                    rfq={rfq}
                    onClose={() => setShowReTenderModal(false)}
                    onSuccess={() => {
                        fetchResults();
                    }}
                />
            )}

            {/* Quotation Cancellation Request Modal */}
            {showCancellationModal && rfq && (
                <QuotationCancellationModal
                    rfq={rfq}
                    isOpen={showCancellationModal}
                    onClose={() => setShowCancellationModal(false)}
                    onSuccess={() => {
                        fetchResults();
                    }}
                />
            )}
        </div>
    );
}
