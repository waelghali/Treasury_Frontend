import React, { useState, useEffect } from 'react';
import apiClient from '../../../services/apiClient';
import ResultsView from './ResultsView';
import ReTenderModal from '../../../components/Modals/ReTenderModal';
import ResubmitRevisionModal from '../../../components/Modals/ResubmitRevisionModal';
import MarketSpreadTicker from '../../../components/Quotations/MarketSpreadTicker';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';
import {
    Check, X, Bell, Download, BarChart3, Landmark, History, ChevronRight,
    RefreshCw, AlertCircle, Radio, Clock, Undo2, ArrowUpRight, CheckCircle2, Trophy
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

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

export default function QuotationHistoryDashboard() {
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState([]);
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRfqId, setSelectedRfqId] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'LIVE' | 'ARCHIVE'
    const [reTenderModalRfq, setReTenderModalRfq] = useState(null);
    const [resubmitModalRfq, setResubmitModalRfq] = useState(null);
    const location = useLocation();

    const fetchData = async () => {
        try {
            // Detect Role
            const token = localStorage.getItem('jwt_token');
            if (token) {
                const decoded = jwtDecode(token);
                setUserRole(decoded.role);

                // If admin, fetch pending approvals
                if (decoded.role === 'corporate_admin') {
                    const pendingRes = await apiClient.get('/corporate-admin/quotations/pending-approvals').catch(() => ({ data: [] }));
                    setPendingApprovals(pendingRes.data);
                }
            }

            // Fetch history
            const historyRes = await apiClient.get('/end-user/quotations/').catch(() => ({ data: [] }));
            setHistory(historyRes.data);

            // Check for rfq_id in URL for deep-linking
            const searchParams = new URLSearchParams(location.search);
            const rfqIdFromUrl = searchParams.get('rfq_id');
            if (rfqIdFromUrl) {
                setSelectedRfqId(rfqIdFromUrl);
            }

            // Fetch Stats for FX Spot
            const statsRes = await apiClient.get('/end-user/quotations/stats?trade_type=FX_SPOT').catch(() => ({ data: [] }));
            setStats(statsRes.data);

        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleApprove = async (rfqId) => {
        const rfq = pendingApprovals.find(r => r.id === rfqId);
        if (rfq && rfq.window_end) {
            const closingTime = new Date(rfq.window_end);
            const now = new Date();
            const diffMins = Math.round((closingTime - now) / 60000);

            if (diffMins < 0) {
                toast.error("The window for this quotation has already closed.");
                return;
            }
            if (diffMins < 30) {
                if (!window.confirm(`This quotation has only ${diffMins} minutes remaining. Are you sure you want to approve and release it?`)) {
                    return;
                }
            }
        }

        try {
            await apiClient.post(`/corporate-admin/quotations/${rfqId}/approve`);
            toast.success("Quotation approved and released to banks!");
            fetchData();
        } catch (err) {
            toast.error("Failed to approve quotation: " + (err.response?.data?.detail || err.message));
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

    const handleExportCSV = async () => {
        try {
            const response = await apiClient.get('/end-user/quotations/export-csv', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `quotation_detailed_report_${new Date().toISOString().slice(0, 10)}.csv`);
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
            link.setAttribute('download', `quotation_history_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'PENDING_APPROVAL': return 'bg-orange-100 text-orange-700';
            case 'NEEDS_REVISION': return 'bg-amber-100 text-amber-900 border border-amber-300';
            case 'PENDING':
            case 'OPEN': return 'bg-blue-100 text-blue-700';
            case 'EVALUATING': return 'bg-purple-100 text-purple-700';
            case 'COMPLETED': return 'bg-emerald-100 text-emerald-700';
            case 'REJECTED': return 'bg-red-100 text-red-700';
            case 'EXPIRED':
            case 'INCONCLUSIVE': return 'bg-gray-100 text-gray-600';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'PENDING_APPROVAL': return 'Needs Approval';
            case 'NEEDS_REVISION': return 'Needs Revision';
            case 'PENDING': return 'Live Desk';
            case 'OPEN': return 'Bidding Open';
            case 'EVALUATING': return 'Evaluating Quotes';
            case 'COMPLETED': return 'Traded';
            case 'REJECTED': return 'Rejected';
            case 'EXPIRED': return 'Expired';
            case 'INCONCLUSIVE': return 'Inconclusive';
            default: return status;
        }
    };

    // Filter lists
    const liveRfqs = history.filter(r => ['PENDING', 'OPEN', 'EVALUATING', 'PENDING_APPROVAL', 'NEEDS_REVISION'].includes(r.status));
    const archivedRfqs = history.filter(r => ['COMPLETED', 'INCONCLUSIVE', 'EXPIRED', 'REJECTED'].includes(r.status));
    const needsRevisionRfqs = history.filter(r => r.status === 'NEEDS_REVISION');

    const displayedRfqs = activeTab === 'LIVE' ? liveRfqs : activeTab === 'ARCHIVE' ? archivedRfqs : history;

    if (loading) return <div className="p-12 text-center text-gray-500">Loading quotation history...</div>;

    return (
        <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-8 space-y-8 sm:space-y-10">
            {/* Header */}
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Quotation Activity & Insights</h1>
                    <p className="text-sm text-gray-500 mt-1">Monitor live trading floor quotes, re-tender past trades, and review bank performance.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-md"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </header>

            {/* Zero-Knowledge Collaborative Market Intelligence */}
            <MarketSpreadTicker currencyPair="USD/EGP" tradeType="FX_SPOT" />

            {/* NEEDS_REVISION Attention Banner */}
            {needsRevisionRfqs.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-5 sm:p-6 shadow-md animate-fade-in space-y-3">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                        <AlertCircle className="text-amber-600 shrink-0" size={18} />
                        Action Required: {needsRevisionRfqs.length} Quotation{needsRevisionRfqs.length > 1 ? 's require' : ' requires'} revision from Corporate Admin
                    </div>
                    <div className="space-y-2">
                        {needsRevisionRfqs.map((rfq) => (
                            <div key={rfq.id} className="bg-white/80 backdrop-blur-xs rounded-2xl p-4 border border-amber-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">{rfq.ref_no}</span>
                                        <span className="text-xs text-gray-700 font-semibold">{rfq.direction} {rfq.amount?.toLocaleString()} {rfq.buy_currency}</span>
                                    </div>
                                    {rfq.admin_revision_notes && (
                                        <p className="text-xs text-amber-950 mt-1.5 italic pl-2 border-l-2 border-amber-400">
                                            Admin Feedback: "{rfq.admin_revision_notes}"
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => setResubmitModalRfq(rfq)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all shrink-0 cursor-pointer"
                                >
                                    <Undo2 size={14} /> Revise & Resubmit
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pending Approvals (Admin Only) */}
            {userRole === 'corporate_admin' && pendingApprovals.length > 0 && (
                <section className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-4 flex items-center gap-2">
                        <Bell size={14} className="animate-pulse" /> Action Required: Pending Approvals
                    </h3>
                    <div className="space-y-4">
                        {pendingApprovals.map((rfq) => (
                            <div key={rfq.id} className="bg-white p-5 sm:p-6 rounded-3xl shadow-md border border-orange-100 flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-mono text-sm font-bold bg-orange-50 text-orange-700 px-2 py-0.5 rounded">{rfq.ref_no}</span>
                                        <span className="text-xs font-bold text-gray-400 uppercase">{rfq.type === 'TBILL' ? 'T-Bill' : 'FX Spot'}</span>
                                    </div>
                                    <div className="text-lg font-bold text-gray-900">
                                        {rfq.type === 'TBILL' ? `${rfq.direction} Quotation` : `${rfq.direction} ${rfq.amount?.toLocaleString()} ${rfq.buy_currency}`}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">
                                        Requested by {rfq.creator_name || 'End User'} • {new Date(rfq.created_at).toLocaleString()}
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleReject(rfq.id)}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gray-50 text-gray-600 hover:bg-gray-100 font-bold text-xs transition-all"
                                    >
                                        <X size={16} /> Reject
                                    </button>
                                    <button
                                        onClick={() => handleApprove(rfq.id)}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-black text-white hover:bg-gray-800 font-bold text-xs shadow-lg shadow-gray-200 transition-all"
                                    >
                                        <Check size={16} /> Approve & Release
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Bank Performance Stats */}
            {stats.length > 0 && (
                <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-5 flex items-center gap-2">
                        <BarChart3 size={14} /> Bank Performance Analytics
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {stats.map((bank, index) => (
                            <div
                                key={bank.bank_id}
                                className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-black/5 animate-fade-in-up"
                                style={{ animationDelay: `${index * 80}ms` }}
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 shrink-0">
                                        <Landmark size={16} />
                                    </div>
                                    <h4 className="font-bold text-sm truncate">{bank.bank_name}</h4>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Win Rate</label>
                                        <div className="flex items-end gap-2">
                                            <span className="text-xl sm:text-2xl font-bold">{bank.win_rate.toFixed(1)}%</span>
                                            <span className="text-xs text-gray-400 mb-1">({bank.total_won}/{bank.total_participated})</span>
                                        </div>
                                        <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                            <div
                                                className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${bank.win_rate}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="text-center p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                                            <span className="block text-[8px] font-bold text-emerald-600 uppercase mb-0.5">1st</span>
                                            <span className="text-sm font-bold text-emerald-700">{bank.ranks[1]}</span>
                                        </div>
                                        <div className="text-center p-2 bg-blue-50 rounded-xl border border-blue-100">
                                            <span className="block text-[8px] font-bold text-blue-600 uppercase mb-0.5">2nd</span>
                                            <span className="text-sm font-bold text-blue-700">{bank.ranks[2]}</span>
                                        </div>
                                        <div className="text-center p-2 bg-gray-50 rounded-xl border border-gray-100">
                                            <span className="block text-[8px] font-bold text-gray-600 uppercase mb-0.5">3rd</span>
                                            <span className="text-sm font-bold text-gray-700">{bank.ranks[3]}</span>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-gray-50">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Avg. Spread</span>
                                            <span className={`text-xs font-bold ${bank.avg_spread < 0.1 ? 'text-emerald-600' : 'text-amber-600'}`}>
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

            {/* Quotations List with Tabs */}
            <section className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-2xl">
                        <button
                            onClick={() => setActiveTab('ALL')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'ALL'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            All ({history.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('LIVE')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'LIVE'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            Live Desk Monitor ({liveRfqs.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('ARCHIVE')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'ARCHIVE'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            Archive & Past Trades ({archivedRfqs.length})
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-4 sm:px-6 py-3.5 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">Ref No</th>
                                    <th className="px-4 sm:px-6 py-3.5 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">Type</th>
                                    <th className="px-4 sm:px-6 py-3.5 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">Date</th>
                                    <th className="px-4 sm:px-6 py-3.5 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">Details</th>
                                    <th className="px-4 sm:px-6 py-3.5 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">Amount</th>
                                    <th className="px-4 sm:px-6 py-3.5 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">Winning Counterparty & Rate</th>
                                    <th className="px-4 sm:px-6 py-3.5 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">Status</th>
                                    <th className="px-4 sm:px-6 py-3.5 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {displayedRfqs.map((rfq) => (
                                    <tr
                                        key={rfq.id}
                                        className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                        onClick={() => setSelectedRfqId(rfq.id)}
                                    >
                                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                                            <div className="font-mono text-xs sm:text-sm font-bold text-gray-900">{rfq.ref_no}</div>
                                            {rfq.parent_rfq_ref && (
                                                <div className="text-[10px] text-indigo-600 font-mono flex items-center gap-1 mt-0.5" title={`Re-tendered from ${rfq.parent_rfq_ref}`}>
                                                    <RefreshCw size={10} /> ↳ from {rfq.parent_rfq_ref}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                                            <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider whitespace-nowrap ${rfq.type === 'TBILL' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                {rfq.type === 'TBILL' ? 'T-Bill' : 'FX Spot'}
                                            </span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs text-gray-500 whitespace-nowrap">
                                            {formatDate(rfq.created_at)}
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold whitespace-nowrap">
                                            {rfq.type === 'TBILL' ? rfq.direction : `${rfq.buy_currency}/${rfq.sell_currency}`}
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap">
                                            {rfq.type === 'TBILL'
                                                ? `Min: ${new Intl.NumberFormat().format(rfq.min_ticket_amount || 0)}`
                                                : new Intl.NumberFormat().format(rfq.amount || 0)}
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                            {rfq.winner_bank_name ? (
                                                <div className="flex flex-col">
                                                    <span className="inline-flex items-center gap-1.5 font-bold text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl w-fit shadow-xs">
                                                        <Trophy size={13} className="text-amber-500 shrink-0" />
                                                        <span className="truncate max-w-[140px] sm:max-w-[170px]">{rfq.winner_bank_name}</span>
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
                                            ) : rfq.status === 'COMPLETED' ? (
                                                <span className="text-xs text-gray-400 italic">No quotes (Inconclusive)</span>
                                            ) : rfq.status === 'PENDING' || rfq.status === 'OPEN' ? (
                                                <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-lg">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                    Live Bidding
                                                </span>
                                            ) : rfq.status === 'EVALUATING' ? (
                                                <span className="text-xs text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-lg">
                                                    Evaluating quotes...
                                                </span>
                                            ) : rfq.status === 'PENDING_APPROVAL' ? (
                                                <span className="text-xs text-orange-600 font-medium">Pending Approval</span>
                                            ) : rfq.status === 'NEEDS_REVISION' ? (
                                                <span className="text-xs text-amber-700 font-medium">Needs Revision</span>
                                            ) : (
                                                <span className="text-xs text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                                            <span className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide whitespace-nowrap ${getStatusStyle(rfq.status)}`}>
                                                {getStatusLabel(rfq.status)}
                                            </span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {rfq.status === 'NEEDS_REVISION' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setResubmitModalRfq(rfq); }}
                                                        className="px-2.5 py-1 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition-colors flex items-center gap-1"
                                                        title="Revise & Resubmit"
                                                    >
                                                        <Undo2 size={13} /> Revise
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setReTenderModalRfq(rfq); }}
                                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 rounded-lg transition-colors inline-flex"
                                                    title="Re-Tender with New Window"
                                                >
                                                    <RefreshCw size={15} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedRfqId(rfq.id); }}
                                                    className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors inline-flex"
                                                    title="View Quotation Details"
                                                >
                                                    <ChevronRight size={17} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {displayedRfqs.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="py-12 text-center text-gray-400 italic">
                                            {activeTab === 'LIVE' ? 'No active quotes on the desk currently.' : 'No quotations found.'}
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
                                RFQ Details: {history.find(r => r.id === selectedRfqId)?.ref_no || selectedRfqId}
                            </h3>
                            <button
                                onClick={() => setSelectedRfqId(null)}
                                className="text-gray-400 hover:text-black hover:bg-gray-100 p-2 rounded-full transition-colors shrink-0"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-50/30">
                            <ResultsView rfqId={selectedRfqId} />
                        </div>
                    </div>
                </div>
            )}

            {/* 1-Click Re-Tender Modal */}
            {reTenderModalRfq && (
                <ReTenderModal
                    rfq={reTenderModalRfq}
                    onClose={() => setReTenderModalRfq(null)}
                    onSuccess={fetchData}
                />
            )}

            {/* Resubmit Revision Modal */}
            {resubmitModalRfq && (
                <ResubmitRevisionModal
                    rfq={resubmitModalRfq}
                    onClose={() => setResubmitModalRfq(null)}
                    onSuccess={fetchData}
                />
            )}
        </div>
    );
}
