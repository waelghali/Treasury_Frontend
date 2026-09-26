import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../services/apiClient';
import ResultsView from '../EndUser/Quotations/ResultsView';
import AdminRevisionModal from '../../components/Modals/AdminRevisionModal';
import MarketSpreadTicker from '../../components/Quotations/MarketSpreadTicker';
import { getRfqTimingState } from '../../utils/quotationTiming';
import {
    Bell, Check, X, BarChart3, Landmark, Building, History, ChevronRight, Clock,
    Search, Filter, AlertCircle, TrendingUp, ArrowUpRight, ArrowDownRight, FileText, Download,
    Undo2, RefreshCw, Sparkles, Trophy, AlertTriangle, Shield, ShieldAlert, Info, Loader2,
    Calendar, CalendarClock, Zap
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

const PRE_BUFFER_MS = 10 * 60 * 1000; // 10 minutes before window start

const isRfqInLiveWindow = (rfq, nowMs = Date.now()) => {
    if (!rfq) return false;
    if (['OPEN', 'EVALUATING'].includes(rfq.status)) return true;

    const startTime = rfq.window_start ? new Date(rfq.window_start).getTime() : NaN;
    const endTime = rfq.window_end ? new Date(rfq.window_end).getTime() : NaN;
    const timeoutSeconds = Number(rfq.acceptance_timeout_seconds) || (rfq.type === 'TBILL' ? 120 : 30);
    const postBufferMs = (timeoutSeconds + 60) * 1000; // Acceptance timeout + 1 minute buffer

    if (!isNaN(startTime) && !isNaN(endTime)) {
        if (nowMs >= (startTime - PRE_BUFFER_MS) && nowMs <= (endTime + postBufferMs)) {
            if (['COMPLETED', 'REJECTED', 'CANCELLED'].includes(rfq.status) && nowMs > (endTime + 60 * 1000)) {
                return false;
            }
            return true;
        }
    }
    return false;
};

const checkHasActiveQuotations = (rfqList, pendingList, cancelList) => {
    if ((pendingList && pendingList.length > 0) || (cancelList && cancelList.length > 0)) {
        return true;
    }
    const now = Date.now();
    return (rfqList || []).some(rfq => isRfqInLiveWindow(rfq, now));
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
    const [isLiveSyncActive, setIsLiveSyncActive] = useState(false);
    const isFetchingRef = useRef(false);

    // Deep-linking via ?rfq_id= query parameter
    const [searchParams, setSearchParams] = useSearchParams();
    const rfqIdParam = searchParams.get('rfq_id');

    useEffect(() => {
        if (rfqIdParam) {
            setSelectedRfqId(rfqIdParam);
        }
    }, [rfqIdParam]);

    const handleCloseDetailModal = () => {
        setSelectedRfqId(null);
        if (searchParams.has('rfq_id')) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('rfq_id');
            setSearchParams(nextParams, { replace: true });
        }
    };

    // Scheduled release state
    const [releaseMode, setReleaseMode] = useState('IMMEDIATE'); // 'IMMEDIATE' | 'SCHEDULED'
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('10:00');
    const [rescheduleModalRfq, setRescheduleModalRfq] = useState(null);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleTime, setRescheduleTime] = useState('');
    const [isRescheduling, setIsRescheduling] = useState(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [entityFilter, setEntityFilter] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async (isInitial = false) => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        if (isInitial) setLoading(true);
        try {
            const [pendingRes, cancelRes, historyRes, statsRes] = await Promise.all([
                apiClient.get('/corporate-admin/quotations/pending-approvals').catch(() => ({ data: [] })),
                apiClient.get('/corporate-admin/quotations/cancellation-requests').catch(() => ({ data: [] })),
                apiClient.get('/end-user/quotations/').catch(() => ({ data: [] })),
                apiClient.get('/end-user/quotations/stats?trade_type=FX_SPOT').catch(() => ({ data: [] })),
            ]);
            setPendingApprovals(pendingRes.data || []);
            setCancellationRequests(cancelRes.data || []);
            setHistory(historyRes.data || []);
            setStats(statsRes.data || []);
        } catch (err) {
            console.error('Failed to fetch quotation data:', err);
        } finally {
            isFetchingRef.current = false;
            if (isInitial) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(true);
    }, [fetchData]);

    // Smart Auto-Refresh Scheduler:
    // Polls actively (every 3.5s) starting 10 minutes before window_start, throughout the quotation,
    // and up to (acceptance_timeout + 60s) after window close, or when approvals/cancellations are pending.
    // Otherwise runs a relaxed background poll (every 30s) to catch upcoming quotation windows.
    useEffect(() => {
        const isLive = checkHasActiveQuotations(history, pendingApprovals, cancellationRequests);
        setIsLiveSyncActive(isLive);

        const pollIntervalMs = isLive ? 3500 : 30000;

        const interval = setInterval(() => {
            if (typeof document !== 'undefined' && document.hidden) return;
            fetchData(false);
        }, pollIntervalMs);

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                fetchData(false);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [history, pendingApprovals, cancellationRequests, fetchData]);

    const formatLocalDate = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatLocalTime = (d) => {
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const getDefaultScheduleTime = (rfq) => {
        const now = new Date();
        const qTimeRaw = rfq?.window_start || rfq?.window_end;
        let defaultDate = null;

        if (qTimeRaw) {
            const quotationTime = new Date(qTimeRaw);
            if (!isNaN(quotationTime.getTime())) {
                const oneHourBefore = new Date(quotationTime.getTime() - 60 * 60 * 1000);
                // If 1 hour before quotation time is still at least 2 minutes in the future, use it
                if (oneHourBefore.getTime() > now.getTime() + 2 * 60 * 1000) {
                    defaultDate = oneHourBefore;
                } else {
                    // Remaining time is less than 1 hour (or 1 hour before is in the past) -> default to now (+ 2 minutes)
                    const soon = new Date(now.getTime() + 2 * 60 * 1000);
                    // Ensure it does not exceed the quotation window close time
                    if (rfq?.window_end) {
                        const wEnd = new Date(rfq.window_end);
                        if (!isNaN(wEnd.getTime()) && soon.getTime() >= wEnd.getTime()) {
                            defaultDate = new Date(Math.max(now.getTime() + 60 * 1000, wEnd.getTime() - 60 * 1000));
                        } else {
                            defaultDate = soon;
                        }
                    } else {
                        defaultDate = soon;
                    }
                }
            }
        }

        if (!defaultDate) {
            defaultDate = new Date(now.getTime() + 10 * 60 * 1000);
        }

        return {
            date: formatLocalDate(defaultDate),
            time: formatLocalTime(defaultDate)
        };
    };

    const executeApprove = async (rfqId) => {
        let scheduledReleaseIso = null;
        if (releaseMode === 'SCHEDULED') {
            if (!scheduledDate || !scheduledTime) {
                toast.error("Please pick both a date and time for scheduled release.");
                return;
            }
            const combined = new Date(`${scheduledDate}T${scheduledTime}:00`);
            if (combined <= new Date()) {
                toast.error("Scheduled release time must be in the future.");
                return;
            }
            scheduledReleaseIso = combined.toISOString();
        }

        setIsApproving(true);
        try {
            const res = await apiClient.post(`/corporate-admin/quotations/${rfqId}/approve`, {
                legal_disclaimer_accepted: true,
                scheduled_release_at: scheduledReleaseIso
            });
            toast.success(res.data?.message || "Quotation approved!");
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
        if (rfq?.window_end) {
            const closingTime = new Date(rfq.window_end);
            const now = new Date();
            const diffMins = Math.round((closingTime - now) / 60000);
            if (diffMins < 0) {
                toast.error("The window for this quotation has already closed.");
                return;
            }
        }
        const def = getDefaultScheduleTime(rfq);
        setScheduledDate(def.date);
        setScheduledTime(def.time);
        const legBases = (rfq.legs || []).map(l => l.quotation_base).filter(Boolean);
        const hasExecution = (rfq.quotation_base || '').toLowerCase() === 'execution' || rfq.quotation_base === 'Mixed' || legBases.some(b => b.toLowerCase() === 'execution') || ((rfq.quotation_base || '').toLowerCase() !== 'indicative' && legBases.length === 0);
        setAdminLegalAccepted(!hasExecution);
        setApprovingRfq(rfq);
    };

    const executeReleaseNow = async (rfqId) => {
        if (!window.confirm("Release this quotation to bank counterparties immediately?")) return;
        try {
            await apiClient.post(`/corporate-admin/quotations/${rfqId}/reschedule-release`, {
                release_now: true
            });
            toast.success("Quotation released to banks immediately!");
            fetchData();
        } catch (err) {
            toast.error("Failed to release: " + (err.response?.data?.detail || err.message));
        }
    };

    const executeCancelScheduledRelease = async (rfqId) => {
        if (!window.confirm("Cancel scheduled release and return quotation to pending approval?")) return;
        try {
            await apiClient.post(`/corporate-admin/quotations/${rfqId}/cancel-scheduled-release`);
            toast.success("Scheduled release cancelled. RFQ returned to pending approval.");
            fetchData();
        } catch (err) {
            toast.error("Failed to cancel scheduled release: " + (err.response?.data?.detail || err.message));
        }
    };

    const executeReschedule = async (rfqId) => {
        if (!rescheduleDate || !rescheduleTime) {
            toast.error("Please select both a date and time.");
            return;
        }
        const combined = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
        if (combined <= new Date()) {
            toast.error("Scheduled release time must be in the future.");
            return;
        }
        setIsRescheduling(true);
        try {
            await apiClient.post(`/corporate-admin/quotations/${rfqId}/reschedule-release`, {
                scheduled_release_at: combined.toISOString()
            });
            toast.success("Scheduled release updated successfully!");
            setRescheduleModalRfq(null);
            fetchData();
        } catch (err) {
            toast.error("Failed to reschedule: " + (err.response?.data?.detail || err.message));
        } finally {
            setIsRescheduling(false);
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
        const matchesType = typeFilter === 'ALL' ||
            (typeFilter === 'FX_PORTFOLIO' ? (rfq.type !== 'TBILL' && rfq.legs && rfq.legs.length > 1) :
             typeFilter === 'FX_SPOT' ? (rfq.type !== 'TBILL' && (!rfq.legs || rfq.legs.length <= 1)) :
             rfq.type === typeFilter);
        const matchesEntity = entityFilter === 'ALL' || String(rfq.entity_id) === String(entityFilter);
        const legDetails = (rfq.legs || []).map(l => `${l.buy_currency} ${l.sell_currency} ${l.currency_pair || ''} ${l.winner_bank_name || ''} ${l.amount || ''}`).join(' ').toLowerCase();
        const matchesSearch = !searchTerm ||
            (rfq.ref_no?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (rfq.entity_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (rfq.creator_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (rfq.winner_bank_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            legDetails.includes(searchTerm.toLowerCase());
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
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-3xl sm:text-4xl font-light tracking-tight mb-1 text-gray-900">Quotation Control Center</h1>
                        {isLiveSyncActive && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Live Auto-Refresh Active
                            </span>
                        )}
                    </div>
                    <p className="text-gray-500 italic font-serif">Monitor, approve, and analyze all quotation activity.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchData(false)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white text-gray-700 border border-gray-200 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
                        title="Manually refresh quotation data"
                    >
                        <RefreshCw size={13} className={isFetchingRef.current ? "animate-spin" : ""} /> Refresh
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-black/10 cursor-pointer"
                    >
                        <Download size={14} /> Export Report (CSV)
                    </button>
                </div>
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
                        <Bell size={14} className="animate-pulse" /> Action Required: {pendingApprovals.length} Quotation Request{pendingApprovals.length > 1 ? 's' : ''} (Pending / Scheduled)
                    </h3>
                    <div className="space-y-4">
                        {pendingApprovals.map((rfq) => (
                            <div key={rfq.id} className={`bg-white p-5 sm:p-6 rounded-2xl shadow-md border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 ${
                                rfq.status === 'APPROVED_SCHEDULED' ? 'border-blue-300 bg-blue-50/20 ring-1 ring-blue-100' : 'border-orange-100'
                            }`}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <span className={`font-mono text-sm font-bold px-2 py-0.5 rounded ${
                                            rfq.status === 'APPROVED_SCHEDULED' ? 'bg-blue-100 text-blue-800' : 'bg-orange-50 text-orange-700'
                                        }`}>
                                            {rfq.ref_no}
                                        </span>
                                        <span className="text-xs font-bold text-gray-400 uppercase">{rfq.type === 'TBILL' ? 'T-Bill' : 'FX Spot'}</span>
                                        {(() => {
                                            const legBases = Array.from(new Set((rfq.legs || []).map(l => l.quotation_base).filter(Boolean)));
                                            const isMixed = rfq.quotation_base === 'Mixed' || legBases.length > 1;
                                            const currentBase = isMixed ? 'Mixed' : (rfq.quotation_base || legBases[0] || 'Execution');
                                            return (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                                                    isMixed
                                                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                        : currentBase.toLowerCase() === 'indicative'
                                                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}>
                                                    {isMixed ? '⚡📊 Mixed Package' : (currentBase.toLowerCase() === 'indicative' ? '📊 Indicative' : '⚡ Execution')}
                                                </span>
                                            );
                                        })()}
                                        {rfq.entity_name && (
                                            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                                🏢 {rfq.entity_name}
                                            </span>
                                        )}
                                        {rfq.status === 'APPROVED_SCHEDULED' && (
                                            <span className="text-xs font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                                <Clock size={12} /> Scheduled for {formatDateTime(rfq.scheduled_release_at)}
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

                                    {/* Scheduled Info Alert */}
                                    {rfq.status === 'APPROVED_SCHEDULED' && (
                                        <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <CalendarClock size={16} className="text-blue-600 shrink-0" />
                                                <span>
                                                    <strong>Approved by Corporate Admin.</strong> Counterparty bank emails are scheduled for dispatch at{' '}
                                                    <span className="font-bold underline text-blue-800">{formatDateTime(rfq.scheduled_release_at)}</span>.
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Assigned Counterparties Breakdown */}
                                    {rfq.assigned_banks && rfq.assigned_banks.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
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
                                    {rfq.status === 'APPROVED_SCHEDULED' ? (
                                        <>
                                            <button
                                                onClick={() => executeReleaseNow(rfq.id)}
                                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all text-xs shadow-md shadow-emerald-600/20 cursor-pointer"
                                                title="Send invitation emails to bank dealers immediately"
                                            >
                                                <Zap size={14} /> Release Now
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setRescheduleModalRfq(rfq);
                                                    if (rfq.scheduled_release_at) {
                                                        const d = new Date(rfq.scheduled_release_at);
                                                        setRescheduleDate(formatLocalDate(d));
                                                        setRescheduleTime(formatLocalTime(d));
                                                    } else {
                                                        const def = getDefaultScheduleTime(rfq);
                                                        setRescheduleDate(def.date);
                                                        setRescheduleTime(def.time);
                                                    }
                                                }}
                                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold transition-all text-xs border border-blue-200 cursor-pointer"
                                                title="Change scheduled dispatch time"
                                            >
                                                <Clock size={14} /> Reschedule
                                            </button>
                                            <button
                                                onClick={() => executeCancelScheduledRelease(rfq.id)}
                                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-rose-50 hover:text-rose-700 font-bold transition-all text-xs border border-gray-200 cursor-pointer"
                                                title="Cancel scheduled dispatch and return to pending approval"
                                            >
                                                <X size={14} /> Cancel Release
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => setSelectedRfqId(rfq.id)}
                                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 font-semibold transition-all text-xs cursor-pointer"
                                            >
                                                <ChevronRight size={15} /> Review
                                            </button>
                                            <button
                                                onClick={() => setRevisionModalRfq(rfq)}
                                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold transition-all text-xs border border-amber-200 cursor-pointer"
                                                title="Send back to creator with revision comments"
                                            >
                                                <Undo2 size={15} /> Return for Revision
                                            </button>
                                            <button
                                                onClick={() => handleReject(rfq.id)}
                                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600 font-bold transition-all text-xs cursor-pointer"
                                            >
                                                <X size={15} /> Reject
                                            </button>
                                            <button
                                                onClick={() => handleApprove(rfq.id)}
                                                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-black text-white hover:bg-gray-800 font-bold shadow-lg shadow-gray-200 transition-all text-xs cursor-pointer"
                                            >
                                                <Check size={15} /> Approve
                                            </button>
                                        </>
                                    )}
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
                            <option value="FX_SPOT">FX Spot (Single Leg)</option>
                            <option value="FX_PORTFOLIO">FX Portfolio (Multi-Leg)</option>
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
                                            {rfq.type === 'TBILL' ? (
                                                <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider whitespace-nowrap bg-blue-50 text-blue-600">
                                                    T-Bill
                                                </span>
                                            ) : rfq.legs && rfq.legs.length > 1 ? (
                                                <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                    <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                                                        FX Portfolio
                                                    </span>
                                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800" title={`${rfq.legs.length} currency pairs in portfolio`}>
                                                        {rfq.legs.length}L
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider whitespace-nowrap bg-emerald-50 text-emerald-600">
                                                    FX Spot
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            <div className="text-xs font-semibold text-gray-800 truncate max-w-[120px]">{rfq.creator_name || 'corp.admin'}</div>
                                            <div className="text-[10px] text-gray-400">{formatDate(rfq.created_at)}</div>
                                        </td>
                                        <td className="px-3 py-3 text-xs whitespace-nowrap">
                                            {rfq.type === 'TBILL' ? (
                                                <span className="font-semibold text-gray-800">{rfq.direction}</span>
                                            ) : rfq.legs && rfq.legs.length > 1 ? (
                                                <div className="flex flex-col gap-1 py-0.5">
                                                    <div className="flex items-center gap-1.5 flex-wrap max-w-[240px]">
                                                        {rfq.legs.map((leg, idx) => {
                                                            const pair = leg.currency_pair || `${leg.buy_currency}/${leg.sell_currency}`;
                                                            return (
                                                                <span 
                                                                    key={leg.id || idx} 
                                                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded"
                                                                    title={`Leg ${idx + 1}: ${pair}${leg.value_date ? ` • Val: ${formatDate(leg.value_date)}` : ''}`}
                                                                >
                                                                    <span className="text-[9px] text-indigo-600 font-extrabold">L{idx + 1}</span>
                                                                    <span>{pair}</span>
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                    {(() => {
                                                        const legBases = Array.from(new Set(rfq.legs.map(l => l.quotation_base).filter(Boolean)));
                                                        const isMixed = rfq.quotation_base === 'Mixed' || legBases.length > 1;
                                                        if (isMixed) {
                                                            return <span className="text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.2 w-fit">⚡📊 Mixed</span>;
                                                        } else if ((rfq.quotation_base || legBases[0] || '').toLowerCase() === 'indicative') {
                                                            return <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.2 w-fit">📊 Indicative</span>;
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="text-xs sm:text-sm font-semibold whitespace-nowrap text-gray-800">
                                                        {rfq.buy_currency}/{rfq.sell_currency}
                                                    </div>
                                                    {rfq.value_date && (
                                                        <div className="text-[10px] text-gray-400 font-mono">
                                                            Val: {formatDate(rfq.value_date)}
                                                        </div>
                                                    )}
                                                    {(rfq.quotation_base || '').toLowerCase() === 'indicative' && (
                                                        <span className="block text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.2 w-fit mt-0.5">📊 Indicative</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-xs whitespace-nowrap font-mono">
                                            {rfq.type === 'TBILL' ? (
                                                <span className="font-semibold text-gray-900">Min: {new Intl.NumberFormat().format(rfq.min_ticket_amount || 0)}</span>
                                            ) : rfq.legs && rfq.legs.length > 1 ? (
                                                <div className="flex flex-col gap-0.5 py-0.5 font-mono text-xs">
                                                    {rfq.legs.map((leg, idx) => (
                                                        <div key={leg.id || idx} className="flex items-center gap-1 whitespace-nowrap text-slate-900">
                                                            <span className="text-[9px] text-slate-400 font-sans font-semibold">L{idx + 1}:</span>
                                                            <span className="font-bold">{new Intl.NumberFormat().format(leg.amount || 0)}</span>
                                                            <span className="text-[10px] text-slate-500 font-semibold">{leg.buy_currency}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="whitespace-nowrap font-mono">
                                                    <span className="font-bold text-gray-900">{new Intl.NumberFormat().format(rfq.amount || 0)}</span>
                                                    <span className="text-[10px] text-slate-500 font-semibold ml-1">{rfq.buy_currency}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap">
                                            {(() => {
                                                const timing = getRfqTimingState(rfq);
                                                const isMultiLeg = Boolean(rfq.legs && rfq.legs.length > 1);

                                                if (rfq.status === 'CANCELLED') {
                                                    return <span className="text-xs text-gray-400 italic">Withdrawn / Cancelled</span>;
                                                }
                                                if (rfq.status === 'CANCEL_REQUESTED') {
                                                    return (
                                                        <span className="inline-flex items-center gap-1.5 text-xs text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                                            Cancel Requested
                                                        </span>
                                                    );
                                                }
                                                if (rfq.status === 'PENDING_APPROVAL') {
                                                    return <span className="text-xs text-orange-600 font-medium">Pending Approval</span>;
                                                }
                                                if (rfq.status === 'NEEDS_REVISION') {
                                                    return <span className="text-xs text-amber-700 font-medium">Needs Revision</span>;
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

                                                // Concluded / Closed RFQ Display
                                                if (isMultiLeg) {
                                                    const legsWithWinner = rfq.legs.filter(l => l.winner_bank_name);
                                                    const legsPendingApproval = rfq.status === 'PENDING_APPROVAL' ? rfq.legs.filter(l => l.status === 'PENDING_APPROVAL') : [];
                                                    const hasAnyWinner = legsWithWinner.length > 0;

                                                    // If completely inconclusive / no quotes
                                                    if (!hasAnyWinner && legsPendingApproval.length === 0) {
                                                        if (rfq.status === 'COMPLETED') {
                                                            return <span className="text-xs text-gray-400 italic">No quotes (Inconclusive)</span>;
                                                        }
                                                        return (
                                                            <span className="text-xs text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-lg">
                                                                {timing.counterpartyLabel || 'Evaluating quotes...'}
                                                            </span>
                                                        );
                                                    }

                                                    // All legs won by the exact same bank
                                                    const allWonSameBank = hasAnyWinner && 
                                                        legsWithWinner.length === rfq.legs.length && 
                                                        rfq.legs.every(l => l.winner_bank_name && l.winner_bank_name === rfq.legs[0].winner_bank_name);

                                                    if (allWonSameBank) {
                                                        return (
                                                            <div className="flex flex-col">
                                                                <span className="inline-flex items-center gap-1.5 font-bold text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-xl w-fit shadow-xs">
                                                                    <Trophy size={12} className="text-amber-500 shrink-0" />
                                                                    <span className="truncate max-w-[130px] lg:max-w-[160px]">{rfq.legs[0].winner_bank_name}</span>
                                                                    <span className="text-[9px] text-emerald-700 bg-emerald-100/70 px-1 py-0.2 rounded font-bold">All {rfq.legs.length}L</span>
                                                                </span>
                                                                <div className="text-[10px] font-mono text-slate-600 mt-1 flex flex-col gap-0.5 pl-1">
                                                                    {rfq.legs.map((l, i) => (
                                                                        <div key={i} className="flex items-center gap-1">
                                                                            <span className="text-slate-400 font-sans">L{i + 1}:</span>
                                                                            <span className="font-bold text-slate-800">@{typeof l.winner_rate === 'number' ? l.winner_rate.toFixed(4) : l.winner_rate}</span>
                                                                            {l.saved_vs_avg ? <span className="text-[9px] text-emerald-600 font-sans font-semibold">+{parseFloat(l.saved_vs_avg).toFixed(2)}</span> : null}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    // Multi-leg breakdown (some won, some pending, some split)
                                                    return (
                                                        <div className="flex flex-col gap-1 py-0.5">
                                                            {rfq.legs.map((leg, idx) => {
                                                                const isLegWin = Boolean(leg.winner_bank_name);
                                                                const isLegPending = leg.status === 'PENDING_APPROVAL' && rfq.status === 'PENDING_APPROVAL';
                                                                const isLegInconclusive = leg.status === 'INCONCLUSIVE' || leg.is_inconclusive || (!isLegWin && (rfq.status === 'COMPLETED' || timing.badge === 'WINDOW_CLOSED'));

                                                                return (
                                                                    <div key={leg.id || idx} className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                                                                        <span className="text-[10px] font-mono text-slate-400 font-bold">L{idx + 1}:</span>
                                                                        {isLegWin ? (
                                                                            <div className="flex items-center gap-1">
                                                                                <span className="inline-flex items-center gap-1 font-bold text-[11px] text-emerald-900 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded-md">
                                                                                    <Trophy size={10} className="text-amber-500 shrink-0" />
                                                                                    <span className="truncate max-w-[100px]">{leg.winner_bank_name}</span>
                                                                                </span>
                                                                                <span className="font-mono font-bold text-slate-800 text-[11px]">
                                                                                    @{typeof leg.winner_rate === 'number' ? leg.winner_rate.toFixed(4) : leg.winner_rate}
                                                                                </span>
                                                                            </div>
                                                                        ) : isLegPending ? (
                                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                                                Pending Approval
                                                                            </span>
                                                                        ) : isLegInconclusive ? (
                                                                            <span className="text-[10px] text-gray-400 italic">Inconclusive</span>
                                                                        ) : (
                                                                            <span className="text-[10px] text-purple-600 font-medium">Evaluating...</span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                }

                                                // Single-leg display
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
                                                const isMultiLeg = Boolean(rfq.legs && rfq.legs.length > 1);
                                                const hasLegPendingApproval = isMultiLeg && rfq.status === 'PENDING_APPROVAL' && rfq.legs.some(l => l.status === 'PENDING_APPROVAL');

                                                if (hasLegPendingApproval) {
                                                    return (
                                                        <span className="text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wide whitespace-nowrap bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                            Action Required
                                                        </span>
                                                    );
                                                }

                                                if (isMultiLeg && (rfq.status === 'COMPLETED' || rfq.status === 'TRADED')) {
                                                    const legsWithWinner = rfq.legs.filter(l => l.winner_bank_name);
                                                    if (legsWithWinner.length > 0 && legsWithWinner.length < rfq.legs.length) {
                                                        return (
                                                            <span className="text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wide whitespace-nowrap bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1 w-fit">
                                                                Partially Awarded ({legsWithWinner.length}/{rfq.legs.length})
                                                            </span>
                                                        );
                                                    }
                                                }

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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-hidden">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[94vh] sm:max-h-[92vh] overflow-hidden flex flex-col border border-slate-200 animate-fade-in-up">
                        <div className="p-3.5 sm:p-5 border-b border-gray-100 flex justify-between items-center bg-white z-10 shrink-0">
                            <h3 className="font-bold text-sm sm:text-base text-gray-900 truncate pr-4">
                                RFQ Details: {history.find(r => r.id === selectedRfqId)?.ref_no || pendingApprovals.find(r => r.id === selectedRfqId)?.ref_no || cancellationRequests.find(r => r.id === selectedRfqId)?.ref_no || selectedRfqId}
                            </h3>
                            <button
                                onClick={handleCloseDetailModal}
                                className="text-gray-400 hover:text-black hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium shrink-0 cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-gray-50/40">
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 sm:p-6 animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl lg:max-w-5xl max-h-[88vh] flex flex-col overflow-hidden border border-amber-200 animate-scale-up">
                        {/* Modal Header (Fixed Sticky Top) */}
                        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between shrink-0 shadow-xs">
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
                                className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body (Scrollable with min-h-0) */}
                        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                            {/* 2-Column Grid: Summary on Left, Release Timing on Right */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                                {/* Left Column: RFQ Summary & Counterparties */}
                                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-2.5">
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                                        <span className="text-slate-500 font-medium">RFQ Reference:</span>
                                        <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{approvingRfq.ref_no}</span>
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
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                                        <span className="text-slate-500 font-medium">Quotation Base:</span>
                                        {(() => {
                                            const bases = Array.from(new Set([
                                                ...((approvingRfq.assigned_banks || []).map(b => b.quotation_base).filter(Boolean)),
                                                ...((approvingRfq.legs || []).map(l => l.quotation_base).filter(Boolean)),
                                                approvingRfq.quotation_base
                                            ].filter(Boolean)));
                                            const isMixed = approvingRfq.quotation_base === 'Mixed' || bases.length > 1;
                                            const displayBase = isMixed ? 'Mixed Bases' : (bases[0] || approvingRfq.quotation_base || 'Firm Execution');
                                            return (
                                                <span className={`font-bold px-2 py-0.5 rounded border ${
                                                    isMixed 
                                                        ? 'text-indigo-700 bg-indigo-50 border-indigo-200' 
                                                        : displayBase === 'Indicative' 
                                                            ? 'text-purple-700 bg-purple-50 border-purple-200'
                                                            : 'text-amber-700 bg-amber-50 border-amber-200'
                                                }`}>
                                                    {isMixed ? `⚡📊 ${displayBase} (${bases.join(', ')})` : (displayBase === 'Execution' ? 'Firm Execution' : displayBase)}
                                                </span>
                                            );
                                        })()}
                                    </div>

                                    {/* Counterparties list */}
                                    {approvingRfq.assigned_banks && approvingRfq.assigned_banks.length > 0 && (
                                        <div className="pt-1 space-y-1.5">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                                Assigned Counterparties ({approvingRfq.assigned_banks.length}):
                                            </span>
                                            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-white rounded-xl border border-slate-200/60">
                                                {approvingRfq.assigned_banks.map((b, idx) => (
                                                    <span key={idx} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-800">
                                                        <strong>{b.bank_name}</strong>
                                                        <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                                                            (b.quotation_base || approvingRfq.quotation_base) === 'Execution'
                                                                ? 'bg-amber-100 text-amber-900'
                                                                : 'bg-purple-100 text-purple-900'
                                                        }`}>
                                                            {b.quotation_base || approvingRfq.quotation_base || 'Execution'}
                                                        </span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {approvingRfq.window_end && (() => {
                                        const diff = Math.round((new Date(approvingRfq.window_end) - new Date()) / 60000);
                                        if (diff > 0 && diff < 30) {
                                            return (
                                                <div className="flex items-center gap-1.5 pt-1 text-amber-800 font-semibold text-[11px]">
                                                    <Clock size={13} className="text-amber-600 shrink-0" />
                                                    <span>Quotation window closes in <strong>{diff} minutes</strong></span>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>

                                {/* Right Column: Release Timing Selector */}
                                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-slate-800 flex flex-col justify-between space-y-3">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5 uppercase tracking-wider">
                                                <Clock size={14} className="text-blue-700" />
                                                Bank Email Dispatch Timing
                                            </label>
                                            <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                                                {releaseMode === 'IMMEDIATE' ? 'Immediate' : 'Delayed Scheduled'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <button
                                                type="button"
                                                onClick={() => setReleaseMode('IMMEDIATE')}
                                                className={`py-2 px-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                                                    releaseMode === 'IMMEDIATE'
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                ⚡ Release Immediately
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setReleaseMode('SCHEDULED')}
                                                className={`py-2 px-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                                                    releaseMode === 'SCHEDULED'
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                🕒 Schedule for Later
                                            </button>
                                        </div>

                                        {releaseMode === 'SCHEDULED' ? (
                                            <div className="grid grid-cols-2 gap-2.5 pt-1 animate-in fade-in duration-200">
                                                <div>
                                                    <label className="text-[11px] font-semibold text-slate-700 mb-1 block">
                                                        Release Date <span className="text-rose-500">*</span>
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={scheduledDate}
                                                        min={new Date().toISOString().split('T')[0]}
                                                        onChange={e => setScheduledDate(e.target.value)}
                                                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-semibold text-slate-700 mb-1 block">
                                                        Release Time (Cairo) <span className="text-rose-500">*</span>
                                                    </label>
                                                    <input
                                                        type="time"
                                                        value={scheduledTime}
                                                        onChange={e => setScheduledTime(e.target.value)}
                                                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                                                    />
                                                </div>
                                                <p className="text-[11px] text-blue-700 col-span-2 italic leading-tight">
                                                    * Emails and OTP links will be dispatched automatically to bank dealers at this time.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-white/80 rounded-xl border border-blue-100 text-[11px] text-slate-600 leading-relaxed">
                                                Approval will immediately broadcast quotation invitation emails to all {approvingRfq.assigned_banks?.length || 0} assigned bank trading desks.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Legal Disclaimer & Liability Acknowledgment (Conditional: Mandatory for Execution, Informational for Indicative) */}
                            {(() => {
                                const bases = Array.from(new Set([
                                    ...((approvingRfq.assigned_banks || []).map(b => b.quotation_base).filter(Boolean)),
                                    ...((approvingRfq.legs || []).map(l => l.quotation_base).filter(Boolean)),
                                    approvingRfq.quotation_base
                                ].filter(Boolean)));
                                const hasExecution = bases.some(b => b.toLowerCase() === 'execution') || approvingRfq.quotation_base === 'Mixed' || (approvingRfq.quotation_base || '').toLowerCase() === 'execution';
                                const isMixed = approvingRfq.quotation_base === 'Mixed' || bases.length > 1;
                                const isPureIndicative = !hasExecution && (approvingRfq.quotation_base || '').toLowerCase() === 'indicative';

                                if (isPureIndicative) {
                                    return (
                                        <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-indigo-950 text-xs leading-relaxed space-y-1.5 transition-all">
                                            <div className="flex items-start gap-2.5">
                                                <Info size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <span className="font-bold text-[11px] uppercase tracking-wider text-indigo-900 block">
                                                        Indicative Market Discovery Quotation
                                                    </span>
                                                    <p className="text-xs text-indigo-900/90 leading-relaxed mt-0.5">
                                                        This RFQ is requested for <strong>Indicative pricing discovery / market color only</strong>. Submitted bank quotes are non-binding and do not constitute a direct settlement obligation. Authorization will release this RFQ to the assigned counterparties for price indications without triggering binding execution acceptance.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/70 border border-amber-300 text-amber-950 text-xs leading-relaxed space-y-2 transition-all">
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                id="adminLegalConfirmed"
                                                checked={adminLegalAccepted}
                                                onChange={e => setAdminLegalAccepted(e.target.checked)}
                                                className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0"
                                            />
                                            <label htmlFor="adminLegalConfirmed" className="cursor-pointer select-none space-y-1">
                                                <span className="font-bold text-[11px] uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                                                    <Shield size={14} className="text-amber-700 shrink-0" />
                                                    MANDATORY COUNTERPARTY LIABILITY & EXECUTION ACKNOWLEDGMENT <span className="text-rose-600">*</span>
                                                </span>
                                                <p className="text-xs text-amber-950 leading-relaxed">
                                                    I confirm and authorize this {isMixed ? 'Mixed (Execution & Indicative)' : 'Firm Execution'} RFQ on behalf of <strong className="underline text-slate-900">{approvingRfq.entity_name ? (approvingRfq.entity_code ? `${approvingRfq.entity_name} (${approvingRfq.entity_code})` : approvingRfq.entity_name) : 'our legal entity'}</strong>. I acknowledge that selecting invited bank counterparties is solely our responsibility and that any quote awarded on execution legs at window closure constitutes a direct, legally enforceable settlement obligation between our legal entity and the winning bank.
                                                </p>
                                            </label>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Modal Footer (Always Visible Sticky Bottom) */}
                        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                disabled={isApproving}
                                onClick={() => setApprovingRfq(null)}
                                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={(() => {
                                    const bases = Array.from(new Set([
                                        ...((approvingRfq.assigned_banks || []).map(b => b.quotation_base).filter(Boolean)),
                                        ...((approvingRfq.legs || []).map(l => l.quotation_base).filter(Boolean)),
                                        approvingRfq.quotation_base
                                    ].filter(Boolean)));
                                    const hasExecution = bases.some(b => b.toLowerCase() === 'execution') || approvingRfq.quotation_base === 'Mixed' || (approvingRfq.quotation_base || '').toLowerCase() === 'execution';
                                    const isPureIndicative = !hasExecution && (approvingRfq.quotation_base || '').toLowerCase() === 'indicative';
                                    return (!isPureIndicative && !adminLegalAccepted) || isApproving;
                                })()}
                                onClick={() => executeApprove(approvingRfq.id)}
                                className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer ${
                                    releaseMode === 'SCHEDULED' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                                }`}
                            >
                                {isApproving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                                {isApproving ? 'Authorizing...' : (releaseMode === 'SCHEDULED' ? 'Confirm & Schedule Release' : 'Confirm & Release to Banks')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reschedule Release Modal */}
            {rescheduleModalRfq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden">
                        <div className="p-6 bg-linear-to-r from-blue-700 to-indigo-800 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm">
                                    <Clock size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base">Reschedule Bank Release</h3>
                                    <p className="text-blue-100 text-xs font-mono">{rescheduleModalRfq.ref_no}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setRescheduleModalRfq(null)}
                                className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer text-white/80 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-xs text-slate-600">
                                Counterparty invitations are currently scheduled for{' '}
                                <strong className="text-slate-900">{formatDateTime(rescheduleModalRfq.scheduled_release_at)}</strong>. You can update the dispatch date & time or release immediately.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-700 mb-1 block">New Release Date</label>
                                    <input
                                        type="date"
                                        value={rescheduleDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={e => setRescheduleDate(e.target.value)}
                                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-700 mb-1 block">New Release Time</label>
                                    <input
                                        type="time"
                                        value={rescheduleTime}
                                        onChange={e => setRescheduleTime(e.target.value)}
                                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const rfqId = rescheduleModalRfq.id;
                                        setRescheduleModalRfq(null);
                                        executeReleaseNow(rfqId);
                                    }}
                                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                                >
                                    <Zap size={14} /> Release Now Instead
                                </button>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setRescheduleModalRfq(null)}
                                        className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isRescheduling}
                                        onClick={() => executeReschedule(rescheduleModalRfq.id)}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        {isRescheduling ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                        Save New Time
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
