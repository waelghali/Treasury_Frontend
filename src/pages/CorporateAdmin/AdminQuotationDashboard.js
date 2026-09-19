import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../services/apiClient';
import ResultsView from '../EndUser/Quotations/ResultsView';
import AdminRevisionModal from '../../components/Modals/AdminRevisionModal';
import MarketSpreadTicker from '../../components/Quotations/MarketSpreadTicker';
import { getRfqTimingState } from '../../utils/quotationTiming';
import {
    Bell, Check, X, BarChart3, Landmark, Building, History, ChevronRight, Clock,
    Search, Filter, AlertCircle, TrendingUp, ArrowUpRight, ArrowDownRight, FileText, Download,
    Undo2, RefreshCw, Sparkles, Trophy, AlertTriangle, Shield, ShieldAlert, Info, Loader2
} from 'lucide-react';

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

const formatDateTime = (d) => {
    if (!d) return '—';
    try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return d;
        const day = String(date.getDate()).padStart(2, '0');
        const month = MONTHS[date.getMonth()];
        const year = date.getFullYear();
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${day} ${month} ${year}, ${time}`;
    } catch {
        return d;
    }
};

export default function AdminQuotationDashboard() {
    const handleExportCSV = async () => {
        try {
            const response = await apiClient.get('/end-user/quotations/export-csv', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `admin_quotation_detailed_report_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.warn('Backend export unavailable, using fallback client export:', err);
            if (!history || history.length === 0) {
                alert('No quotation history to export.');
                return;
            }
            const headers = ['RFQ Ref', 'Type', 'Direction', 'Amount', 'Buy Currency', 'Sell Currency', 'Value Date', 'Status', 'Creator', 'Created At'];
            const rows = history.map(r => [
                `"${r.ref_no || ''}"`,
                `"${r.type || ''}"`,
                `"${r.direction || ''}"`,
                r.amount || 0,
                `"${r.buy_currency || ''}"`,
                `"${r.sell_currency || ''}"`,
                `"${r.value_date || ''}"`,
                `"${r.status || ''}"`,
                `"${r.creator_name || ''}"`,
                `"${r.created_at ? new Date(r.created_at).toLocaleString() : ''}"`
            ]);
            const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `admin_quotation_history_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState([]);
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [cancellationRequests, setCancellationRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRfqId, setSelectedRfqId] = useState(null);
    const [revisionModalRfq, setRevisionModalRfq] = useState(null);
    const [approvingRfq, setApprovingRfq] = useState(null);
    const [adminLegalAccepted, setAdminLegalAccepted] = useState(false);
    const [isApproving, setIsApproving] = useState(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [entityFilter, setEntityFilter] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const [pendingRes, cancelRes, historyRes, statsRes] = await Promise.all([
                apiClient.get('/corporate-admin/quotations/pending-approvals').catch(() => ({ data: [] })),
                apiClient.get('/corporate-admin/quotations/cancellation-requests').catch(() => ({ data: [] })),
                apiClient.get('/end-user/quotations/').catch(() => ({ data: [] })),
                apiClient.get('/end-user/quotations/stats?trade_type=FX_SPOT').catch(() => ({ data: [] })),
            ]);
            setPendingApprovals(pendingRes.data);
            setCancellationRequests(cancelRes.data);
            setHistory(historyRes.data);
            setStats(statsRes.data);
        } catch (err) {
            console.error('Failed to fetch quotation data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const executeApprove = async (rfqId) => {
        setIsApproving(true);
        try {
            await apiClient.post(`/corporate-admin/quotations/${rfqId}/approve`, {
                legal_disclaimer_accepted: true
            });
            toast.success("Quotation approved and released to banks!");
            setApprovingRfq(null);
            fetchData();
        } catch (err) {
            toast.error("Failed to approve: " + (err.response?.data?.detail || err.message));
        } finally {
            setIsApproving(false);
        }
    };

    const handleApprove = async (rfqId) => {
        const rfq = pendingApprovals.find(r => r.id === rfqId);
        if (!rfq) return;
        let diffMins = null;
        if (rfq?.window_end) {
            const closingTime = new Date(rfq.window_end);
            const now = new Date();
            diffMins = Math.round((closingTime - now) / 60000);
            if (diffMins < 0) {
                toast.error("The window for this quotation has already closed.");
                return;
            }
        }
        if (rfq.quotation_base === 'Indicative') {
            // Indicative quotation has no binding settlement and no disclaimer modal will appear.
            // Warn only if time is tight (< 30 min)
            if (diffMins !== null && diffMins < 30) {
                if (!window.confirm(`This quotation has only ${diffMins} minutes remaining. Are you sure you want to approve and release it?`)) {
                    return;
                }
            }
            executeApprove(rfq.id);
        } else {
            // Firm Execution quotation requires explicit legal commitment authorization
            // Opens the disclaimer modal directly without interrupting popup message
            setAdminLegalAccepted(false);
            setApprovingRfq(rfq);
        }
    };

    const handleReject = async (rfqId) => {
        if (!window.confirm("Are you sure you want to reject this quotation?")) return;
        try {
            await apiClient.post(`/corporate-admin/quotations/${rfqId}/reject`);
            toast.success("Quotation rejected.");
            fetchData();
        } catch (err) {
            toast.error("Failed to reject quotation.");
        }
    };

    const handleApproveCancellation = async (rfqId) => {
        const rfq = cancellationRequests.find(r => r.id === rfqId);
        if (!window.confirm(`Approve cancellation of RFQ ${rfq?.ref_no || rfqId}? This will officially withdraw the tender and notify all counterparties.`)) return;
        try {
            await apiClient.post(`/corporate-admin/quotations/${rfqId}/approve-cancellation`);
            toast.success("Cancellation approved. Counterparties notified of withdrawal.");
            fetchData();
        } catch (err) {
            toast.error("Failed to approve cancellation: " + (err.response?.data?.detail || err.message));
        }
    };

    const handleRejectCancellation = async (rfqId) => {
        const reason = window.prompt("Enter optional feedback for maker:");
        if (reason === null) return;
        try {
            await apiClient.post(`/corporate-admin/quotations/${rfqId}/reject-cancellation`, { rejection_notes: reason || undefined });
            toast.info("Cancellation request rejected. RFQ restored to active schedule.");
            fetchData();
        } catch (err) {
            toast.error("Failed to reject cancellation: " + (err.response?.data?.detail || err.message));
        }
    };

    // Compute summary stats
    const totalRfqs = history.length;
    const activeRfqs = history.filter(r => r.status === 'PENDING' || r.status === 'PENDING_APPROVAL' || r.status === 'NEEDS_REVISION').length;
    const completedRfqs = history.filter(r => r.status === 'COMPLETED' || r.status === 'EVALUATING').length;
    const rejectedRfqs = history.filter(r => r.status === 'REJECTED').length;

    const uniqueEntities = Array.from(
        new Map(
            history.filter(r => r.entity_id && (r.entity_name || r.entity_code)).map(r => [r.entity_id, { id: r.entity_id, name: r.entity_name || `Entity ${r.entity_id}`, code: r.entity_code }])
        ).values()
    );

    // Filtered history
    const filteredHistory = history.filter(rfq => {
        const matchesStatus = statusFilter === 'ALL' || rfq.status === statusFilter;
        const matchesType = typeFilter === 'ALL' || rfq.type === typeFilter;
        const matchesEntity = entityFilter === 'ALL' || String(rfq.entity_id) === String(entityFilter);
        const matchesSearch = !searchTerm ||
            (rfq.ref_no?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (rfq.entity_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (rfq.creator_name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        return matchesStatus && matchesType && matchesEntity && matchesSearch;
    });


    if (loading) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
                <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Loading quotation data...</p>
            </div>
        </div>
    );

    return (
        <div className="w-full space-y-6 sm:space-y-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-light tracking-tight mb-1 text-gray-900">Quotation Control Center</h1>
                    <p className="text-gray-500 italic font-serif">Monitor, approve, and analyze all quotation activity.</p>
                </div>
                <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-black/10"
                >
                    <Download size={14} /> Export Report (CSV)
                </button>
            </header>

            {/* Zero-Knowledge Collaborative Market Intelligence */}
            <MarketSpreadTicker currencyPair="USD/EGP" tradeType="FX_SPOT" />

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-black/5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500">
                            <FileText size={18} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Total RFQs</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{totalRfqs}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-black/5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                            <Clock size={18} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Active</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-amber-600">{activeRfqs}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-black/5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                            <Check size={18} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Completed</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{completedRfqs}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-black/5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center text-red-400">
                            <X size={18} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Rejected</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-red-500">{rejectedRfqs}</p>
                </div>
            </div>

            {/* Cancellation Requests */}
            {cancellationRequests.length > 0 && (
                <section className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-rose-600 mb-4 flex items-center gap-2">
                        <AlertTriangle size={14} className="animate-bounce" /> Action Required: {cancellationRequests.length} Cancellation Request{cancellationRequests.length > 1 ? 's' : ''}
                    </h3>
                    <div className="space-y-4">
                        {cancellationRequests.map((rfq) => (
                            <div key={rfq.id} className="bg-white p-5 sm:p-6 rounded-2xl shadow-md border border-rose-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <span className="font-mono text-sm font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200">{rfq.ref_no}</span>
                                        <span className="text-xs font-bold text-gray-400 uppercase">{rfq.type === 'TBILL' ? 'T-Bill' : 'FX Spot'}</span>
                                        <span className="text-xs font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">Cancellation Pending</span>
                                    </div>
                                    <div className="text-base sm:text-lg font-bold text-gray-900">
                                        {rfq.type === 'TBILL' ? `${rfq.direction} Quotation` : `${rfq.direction} ${rfq.amount?.toLocaleString()} ${rfq.buy_currency}`}
                                    </div>
                                    <div className="text-xs text-rose-900 mt-2 p-3 bg-rose-50/70 rounded-xl border border-rose-100 space-y-1">
                                        <div><span className="font-bold">Stated Reason:</span> {rfq.cancellation_reason || 'Administrative Rescheduling'}</div>
                                        {rfq.cancellation_notes && (
                                            <div className="italic text-rose-800"><span className="font-semibold not-italic">Notes:</span> "{rfq.cancellation_notes}"</div>
                                        )}
                                        <div className="text-[11px] text-gray-500 pt-1">
                                            Requested by {rfq.creator_name || 'End User'} &bull; {formatDateTime(rfq.cancellation_requested_at || rfq.created_at)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2.5 shrink-0">
                                    <button
                                        onClick={() => setSelectedRfqId(rfq.id)}
                                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 font-semibold transition-all text-xs cursor-pointer"
                                    >
                                        <ChevronRight size={15} /> Review Deal
                                    </button>
                                    <button
                                        onClick={() => handleRejectCancellation(rfq.id)}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold transition-all text-xs cursor-pointer"
                                        title="Reject cancellation and keep the quotation scheduled"
                                    >
                                        <X size={15} /> Decline Cancellation
                                    </button>
                                    <button
                                        onClick={() => handleApproveCancellation(rfq.id)}
                                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 font-bold shadow-md shadow-rose-200 transition-all text-xs cursor-pointer"
                                        title="Withdraw quotation and deactivate counterparty links"
                                    >
                                        <Check size={15} /> Approve Cancellation
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Pending Approvals */}
            {pendingApprovals.length > 0 && (
                <section className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-4 flex items-center gap-2">
                        <Bell size={14} className="animate-pulse" /> Action Required: {pendingApprovals.length} Pending Approval{pendingApprovals.length > 1 ? 's' : ''}
                    </h3>
                    <div className="space-y-4">
                        {pendingApprovals.map((rfq) => (
                            <div key={rfq.id} className="bg-white p-5 sm:p-6 rounded-2xl shadow-md border border-orange-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <span className="font-mono text-sm font-bold bg-orange-50 text-orange-700 px-2 py-0.5 rounded">{rfq.ref_no}</span>
                                        <span className="text-xs font-bold text-gray-400 uppercase">{rfq.type === 'TBILL' ? 'T-Bill' : 'FX Spot'}</span>
                                        {rfq.entity_name && (
                                            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                                🏢 {rfq.entity_name}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-base sm:text-lg font-bold text-gray-900">
                                        {rfq.type === 'TBILL' ? `${rfq.direction} Quotation` : `${rfq.direction} ${rfq.amount?.toLocaleString()} ${rfq.buy_currency}`}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">
                                        Requested by {rfq.creator_name || 'End User'} • {formatDateTime(rfq.created_at)}
                                    </div>
                                    {rfq.window_end && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <Clock size={12} className="text-gray-400" />
                                            <span className="text-xs text-gray-500">
                                                Window closes: {formatDateTime(rfq.window_end)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Assigned Counterparties Breakdown */}
                                    {rfq.assigned_banks && rfq.assigned_banks.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-orange-100 flex flex-wrap items-center gap-2">
                                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                                Counterparties ({rfq.assigned_banks.length}):
                                            </span>
                                            {rfq.assigned_banks.map((b, bIdx) => (
                                                <span
                                                    key={bIdx}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs"
                                                >
                                                    <Landmark size={12} className="text-slate-400" />
                                                    <strong className="text-slate-900">{b.bank_name}</strong>
                                                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                                        (b.quotation_base || rfq.quotation_base) === 'Execution'
                                                            ? 'bg-amber-100 text-amber-900'
                                                            : 'bg-purple-100 text-purple-900'
                                                    }`}>
                                                        {b.quotation_base || rfq.quotation_base || 'Execution'}
                                                    </span>
                                                    {b.value_date && (
                                                        <span className={`text-[11px] font-mono ${
                                                            b.is_custom_value_date ? 'text-blue-700 font-bold' : 'text-gray-500'
                                                        }`}>
                                                            • {b.value_date}
                                                            {b.is_custom_value_date && ' (custom)'}
                                                        </span>
                                                    )}
                                                    {b.allow_alternative_value_date && (
                                                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1 rounded">
                                                            Alt Date
                                                        </span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2.5 shrink-0">
                                    <button
                                        onClick={() => setSelectedRfqId(rfq.id)}
                                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 font-semibold transition-all text-xs"
                                    >
                                        <ChevronRight size={15} /> Review
                                    </button>
                                    <button
                                        onClick={() => setRevisionModalRfq(rfq)}
                                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold transition-all text-xs border border-amber-200"
                                        title="Send back to creator with revision comments"
                                    >
                                        <Undo2 size={15} /> Return for Revision
                                    </button>
                                    <button
                                        onClick={() => handleReject(rfq.id)}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600 font-bold transition-all text-xs"
                                    >
                                        <X size={15} /> Reject
                                    </button>
                                    <button
                                        onClick={() => handleApprove(rfq.id)}
                                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-black text-white hover:bg-gray-800 font-bold shadow-lg shadow-gray-200 transition-all text-xs"
                                    >
                                        <Check size={15} /> Approve
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Bank Performance Analytics */}
            {stats.length > 0 && (
                <section>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-5 flex items-center gap-2">
                        <BarChart3 size={14} /> Bank Performance Analytics
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                        {stats.map((bank, index) => (
                            <div
                                key={bank.bank_id}
                                className="bg-white p-5 rounded-2xl shadow-sm border border-black/5 hover:shadow-md transition-all"
                                style={{ animationDelay: `${index * 80}ms` }}
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 shrink-0">
                                        <Landmark size={16} />
                                    </div>
                                    <h4 className="font-bold text-sm truncate">{bank.bank_name}</h4>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Win Rate</label>
                                        <div className="flex items-end gap-2">
                                            <span className="text-xl font-bold">{bank.win_rate.toFixed(1)}%</span>
                                            <span className="text-xs text-gray-400 mb-0.5">({bank.total_won}/{bank.total_participated})</span>
                                        </div>
                                        <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                            <div
                                                className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${bank.win_rate}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-1.5">
                                        <div className="text-center p-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                                            <span className="block text-[8px] font-bold text-emerald-600 uppercase mb-0.5">1st</span>
                                            <span className="text-sm font-bold text-emerald-700">{bank.ranks[1]}</span>
                                        </div>
                                        <div className="text-center p-1.5 bg-blue-50 rounded-lg border border-blue-100">
                                            <span className="block text-[8px] font-bold text-blue-600 uppercase mb-0.5">2nd</span>
                                            <span className="text-sm font-bold text-blue-700">{bank.ranks[2]}</span>
                                        </div>
                                        <div className="text-center p-1.5 bg-gray-50 rounded-lg border border-gray-100">
                                            <span className="block text-[8px] font-bold text-gray-600 uppercase mb-0.5">3rd</span>
                                            <span className="text-sm font-bold text-gray-700">{bank.ranks[3]}</span>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-gray-50">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Avg. Spread</span>
                                            <span className={`text-xs font-bold flex items-center gap-1 ${bank.avg_spread < 0.1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {bank.avg_spread < 0.1 ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                                                +{bank.avg_spread.toFixed(3)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* All Quotation History */}
            <section>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                        <History size={14} /> All Quotation Requests
                    </h3>
                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search ref or user..."
                                className="pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/5 transition-all w-44"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/5"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="PENDING_APPROVAL">Needs Approval</option>
                            <option value="NEEDS_REVISION">Needs Revision</option>
                            <option value="PENDING">Live</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="EVALUATING">Evaluating</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="EXPIRED">Expired</option>
                        </select>
                        <select
                            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/5"
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                        >
                            <option value="ALL">All Types</option>
                            <option value="FX_SPOT">FX Spot</option>
                            <option value="TBILL">T-Bill</option>
                        </select>
                        {uniqueEntities.length > 1 && (
                            <select
                                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/5"
                                value={entityFilter}
                                onChange={e => setEntityFilter(e.target.value)}
                            >
                                <option value="ALL">All Legal Entities ({uniqueEntities.length})</option>
                                {uniqueEntities.map(ent => {
                                    const entityName = ent.entity_name || ent.name || ent.code;
                                    const label = ent.code && ent.code !== entityName
                                        ? `${entityName} (${ent.code})`
                                        : entityName;
                                    return (
                                        <option key={ent.id} value={ent.id}>
                                            {label}
                                        </option>
                                    );
                                })}
                            </select>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-3.5 py-3 text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">Ref No</th>
                                    <th className="px-3.5 py-3 text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">Entity</th>
                                    <th className="px-3 py-3 text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">Type</th>
                                    <th className="px-3 py-3 text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">Maker / Date</th>
                                    <th className="px-3 py-3 text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">Details</th>
                                    <th className="px-3 py-3 text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">Amount</th>
                                    <th className="px-3 py-3 text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">Winning Counterparty & Rate</th>
                                    <th className="px-3 py-3 text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">Status</th>
                                    <th className="px-2.5 py-3 text-[10px] font-bold text-gray-400 uppercase text-right whitespace-nowrap w-8"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredHistory.map((rfq) => (
                                    <tr
                                        key={rfq.id}
                                        className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                        onClick={() => setSelectedRfqId(rfq.id)}
                                    >
                                        <td className="px-3.5 py-3 whitespace-nowrap">
                                            <div className="font-mono text-xs sm:text-sm font-bold text-gray-900 whitespace-nowrap">{rfq.ref_no}</div>
                                            {rfq.parent_rfq_ref && (
                                                <div className="text-[10px] text-indigo-600 font-mono flex items-center gap-1 mt-0.5 whitespace-nowrap" title={`Re-tendered from ${rfq.parent_rfq_ref}`}>
                                                    <RefreshCw size={10} /> ↳ from {rfq.parent_rfq_ref}
                                                </div>
                                            )}
                                            {rfq.internal_notes && (
                                                <div className="text-[10px] text-blue-600 truncate max-w-[130px] flex items-center gap-1 mt-0.5" title={`Internal Note: ${rfq.internal_notes}`}>
                                                    <FileText size={10} className="text-blue-500 shrink-0" />
                                                    <span className="truncate">{rfq.internal_notes}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3.5 py-3 whitespace-nowrap">
                                            {rfq.entity_name ? (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-xl" title={rfq.entity_name}>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                                    <span className="truncate max-w-[130px]">{rfq.entity_name}</span>
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400 font-mono">—</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider whitespace-nowrap ${rfq.type === 'TBILL' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                {rfq.type === 'TBILL' ? 'T-Bill' : 'FX Spot'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            <div className="text-xs font-semibold text-gray-800 truncate max-w-[120px]">{rfq.creator_name || 'corp.admin'}</div>
                                            <div className="text-[10px] text-gray-400">{formatDate(rfq.created_at)}</div>
                                        </td>
                                        <td className="px-3 py-3 text-xs font-semibold text-gray-800 whitespace-nowrap">
                                            {rfq.type === 'TBILL' ? rfq.direction : `${rfq.buy_currency}/${rfq.sell_currency}`}
                                        </td>
                                        <td className="px-3 py-3 text-xs font-mono font-medium text-gray-900 whitespace-nowrap">
                                            {rfq.type === 'TBILL'
                                                ? `Min: ${new Intl.NumberFormat().format(rfq.min_ticket_amount || 0)}`
                                                : new Intl.NumberFormat().format(rfq.amount || 0)}
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            {(() => {
                                                const timing = getRfqTimingState(rfq);
                                                if (rfq.winner_bank_name) {
                                                    return (
                                                        <div className="flex flex-col">
                                                            <span className="inline-flex items-center gap-1.5 font-bold text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-xl w-fit shadow-xs">
                                                                <Trophy size={12} className="text-amber-500 shrink-0" />
                                                                <span className="truncate max-w-[130px] lg:max-w-[160px]">{rfq.winner_bank_name}</span>
                                                            </span>
                                                            <div className="text-[11px] font-mono font-bold text-slate-800 mt-1 pl-1 flex items-center gap-1.5">
                                                                <span>@ {typeof rfq.winner_rate === 'number' ? rfq.winner_rate.toFixed(4) : rfq.winner_rate}</span>
                                                                {rfq.saved_vs_avg ? (
                                                                    <span className="text-[10px] text-emerald-600 font-sans font-semibold bg-emerald-50 px-1 py-0.2 rounded" title="Savings vs average market quote">
                                                                        +{parseFloat(rfq.saved_vs_avg).toFixed(4)}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                if (rfq.status === 'COMPLETED') {
                                                    return <span className="text-xs text-gray-400 italic">No quotes (Inconclusive)</span>;
                                                }
                                                if (rfq.status === 'PENDING_APPROVAL') {
                                                    return <span className="text-xs text-orange-600 font-medium">Pending Approval</span>;
                                                }
                                                if (rfq.status === 'NEEDS_REVISION') {
                                                    return <span className="text-xs text-amber-700 font-medium">Needs Revision</span>;
                                                }
                                                if (rfq.status === 'CANCEL_REQUESTED') {
                                                    return (
                                                        <span className="inline-flex items-center gap-1.5 text-xs text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                                            Cancel Requested
                                                        </span>
                                                    );
                                                }
                                                if (rfq.status === 'CANCELLED') {
                                                    return <span className="text-xs text-gray-400 italic">Withdrawn / Cancelled</span>;
                                                }
                                                if (timing.isLive) {
                                                    return (
                                                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg shadow-2xs">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            Live Bidding
                                                        </span>
                                                    );
                                                }
                                                if (timing.isScheduled) {
                                                    return (
                                                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                                                            <Clock size={12} className="text-slate-400 shrink-0" />
                                                            {timing.counterpartyLabel}
                                                        </span>
                                                    );
                                                }
                                                return (
                                                    <span className="text-xs text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-lg">
                                                        {timing.counterpartyLabel || 'Evaluating quotes...'}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            {(() => {
                                                const timing = getRfqTimingState(rfq);
                                                return (
                                                    <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wide whitespace-nowrap ${timing.style}`}>
                                                        {timing.label}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-2.5 py-3 text-right whitespace-nowrap w-8">
                                            <div className="flex items-center justify-end">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedRfqId(rfq.id); }}
                                                    className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors inline-flex"
                                                    title="View Details"
                                                >
                                                    <ChevronRight size={17} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredHistory.length === 0 && (
                                    <tr>
                                        <td colSpan="8" className="py-12 text-center text-gray-400 italic">
                                            {searchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL'
                                                ? 'No quotations match your filters.'
                                                : 'No quotation data available yet. End users can create quotation requests from their dashboard.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Selected RFQ Detail Modal */}
            {selectedRfqId && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 overflow-hidden">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl xl:max-w-6xl max-h-[85vh] sm:max-h-[82vh] overflow-hidden flex flex-col animate-fade-in-up">
                        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-white z-10">
                            <h3 className="font-bold text-sm sm:text-base text-gray-900 truncate pr-4">
                                RFQ Details: {history.find(r => r.id === selectedRfqId)?.ref_no || pendingApprovals.find(r => r.id === selectedRfqId)?.ref_no || cancellationRequests.find(r => r.id === selectedRfqId)?.ref_no}
                            </h3>
                            <button
                                onClick={() => setSelectedRfqId(null)}
                                className="text-gray-400 hover:text-black hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium shrink-0"
                            >
                                Close
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-50/30">
                            <ResultsView rfqId={selectedRfqId} />
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Return for Revision Modal */}
            {revisionModalRfq && (
                <AdminRevisionModal
                    rfq={revisionModalRfq}
                    onClose={() => setRevisionModalRfq(null)}
                    onSuccess={fetchData}
                />
            )}

            {/* Corporate Admin Execution Commitment & Approval Modal */}
            {approvingRfq && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-amber-200 animate-scale-up">
                        <div className="p-5 sm:p-6 bg-amber-500 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                                    <ShieldAlert size={22} className="text-white" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-100 block">Corporate Execution Release</span>
                                    <h3 className="text-base sm:text-lg font-bold">Binding Execution Authorization</h3>
                                </div>
                            </div>
                            <button
                                onClick={() => { if (!isApproving) setApprovingRfq(null); }}
                                className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Summary Card */}
                            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-2">
                                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                                    <span className="text-slate-500 font-medium">RFQ Reference:</span>
                                    <span className="font-mono font-bold text-slate-900">{approvingRfq.ref_no}</span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                                    <span className="text-slate-500 font-medium">Requesting Entity:</span>
                                    <span className="font-bold text-indigo-700">{approvingRfq.entity_name || 'Legal Entity'}</span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                                    <span className="text-slate-500 font-medium">Deal Type & Volume:</span>
                                    <span className="font-bold text-slate-900">
                                        {approvingRfq.type === 'TBILL'
                                            ? `${approvingRfq.direction} T-Bill Quotation`
                                            : `${approvingRfq.direction} ${approvingRfq.amount?.toLocaleString()} ${approvingRfq.buy_currency}/${approvingRfq.sell_currency}`}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-medium">Quotation Base:</span>
                                    {(() => {
                                        const bases = Array.from(new Set((approvingRfq.assigned_banks || []).map(b => b.quotation_base).filter(Boolean)));
                                        const isMixed = bases.length > 1;
                                        const displayBase = isMixed ? 'Mixed Bases' : (bases[0] || approvingRfq.quotation_base || 'Firm Execution');
                                        return (
                                            <span className={`font-bold px-2 py-0.5 rounded border ${
                                                isMixed 
                                                    ? 'text-indigo-700 bg-indigo-50 border-indigo-200' 
                                                    : displayBase === 'Indicative' 
                                                        ? 'text-purple-700 bg-purple-50 border-purple-200'
                                                        : 'text-amber-700 bg-amber-50 border-amber-200'
                                            }`}>
                                                {isMixed ? `⚡ ${displayBase} (${bases.join(', ')})` : (displayBase === 'Execution' ? 'Firm Execution' : displayBase)}
                                            </span>
                                        );
                                    })()}
                                </div>
                                {approvingRfq.assigned_banks && approvingRfq.assigned_banks.length > 0 && (
                                    <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                            Assigned Counterparties ({approvingRfq.assigned_banks.length}):
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {approvingRfq.assigned_banks.map((b, idx) => (
                                                <span key={idx} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] text-slate-800 shadow-2xs">
                                                    <strong>{b.bank_name}</strong>
                                                    <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                                                        (b.quotation_base || approvingRfq.quotation_base) === 'Execution'
                                                            ? 'bg-amber-100 text-amber-900'
                                                            : 'bg-purple-100 text-purple-900'
                                                    }`}>
                                                        {b.quotation_base || approvingRfq.quotation_base || 'Execution'}
                                                    </span>
                                                    {b.value_date && (
                                                        <span className={`font-mono text-[10px] ${b.is_custom_value_date ? 'text-blue-700 font-bold' : 'text-slate-500'}`}>
                                                            {b.value_date}
                                                        </span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {approvingRfq.window_end && (() => {
                                    const diff = Math.round((new Date(approvingRfq.window_end) - new Date()) / 60000);
                                    if (diff > 0 && diff < 30) {
                                        return (
                                            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/60 text-amber-800 font-semibold">
                                                <Clock size={13} className="text-amber-600 shrink-0" />
                                                <span>Note: Quotation window closes in <strong>{diff} minutes</strong></span>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>

                            {/* Mandatory Legal Disclaimer & Liability Acknowledgment */}
                            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border-2 border-amber-300 text-amber-950 text-xs leading-relaxed space-y-2.5 transition-all">
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        id="adminLegalConfirmed"
                                        checked={adminLegalAccepted}
                                        onChange={e => setAdminLegalAccepted(e.target.checked)}
                                        className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0"
                                    />
                                    <label htmlFor="adminLegalConfirmed" className="cursor-pointer select-none space-y-1.5">
                                        <span className="font-bold text-[11px] uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                                            <Shield size={14} className="text-amber-700 shrink-0" />
                                            MANDATORY COUNTERPARTY LIABILITY & EXECUTION ACKNOWLEDGMENT <span className="text-rose-600">*</span>
                                        </span>
                                        <p className="text-xs text-amber-950 leading-relaxed">
                                            I confirm and authorize this Firm Execution RFQ on behalf of <strong className="underline text-slate-900">{approvingRfq.entity_name ? (approvingRfq.entity_code ? `${approvingRfq.entity_name} (${approvingRfq.entity_code})` : approvingRfq.entity_name) : 'our legal entity'}</strong>. I acknowledge that selecting invited bank counterparties is solely our responsibility and that the winning quote automatically awarded at window closure constitutes a direct, legally enforceable settlement obligation between our legal entity and the winning bank. I acknowledge that Grow Treasury operates solely as an independent communications and workflow venue (&ldquo;AS IS&rdquo;) and bears no transaction, credit, execution, or settlement liability.
                                        </p>
                                    </label>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    disabled={isApproving}
                                    onClick={() => setApprovingRfq(null)}
                                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={!adminLegalAccepted || isApproving}
                                    onClick={() => executeApprove(approvingRfq.id)}
                                    className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    {isApproving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                                    {isApproving ? 'Authorizing & Releasing...' : 'Confirm & Release to Banks'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
