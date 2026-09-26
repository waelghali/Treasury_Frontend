import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../../../services/apiClient';
import ResultsView from './ResultsView';
import ReTenderModal from '../../../components/Modals/ReTenderModal';
import MarketSpreadTicker from '../../../components/Quotations/MarketSpreadTicker';
import { getRfqTimingState } from '../../../utils/quotationTiming';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';
import {
    Check, X, Bell, Download, BarChart3, Landmark, Building, History, ChevronRight,
    RefreshCw, AlertCircle, Radio, Clock, Undo2, ArrowUpRight, CheckCircle2, Trophy, XCircle, FileText,
    Search, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, Filter
} from 'lucide-react';
import QuotationCancellationModal from '../../../components/Modals/QuotationCancellationModal';
import { useLocation, useNavigate } from 'react-router-dom';

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

const formatAmount = (val) => {
    if (val === null || val === undefined || val === '') return '0.00';
    const num = Number(val);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

export default function QuotationHistoryDashboard() {
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState([]);
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRfqId, setSelectedRfqId] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'LIVE' | 'ARCHIVE'
    const [entityFilter, setEntityFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'FX_SPOT' | 'TBILL'
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [sortField, setSortField] = useState('created_at');
    const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'
    const [reTenderModalRfq, setReTenderModalRfq] = useState(null);
    const [cancelModalRfq, setCancelModalRfq] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();

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



    // Filter lists
    const liveRfqs = history.filter(r => ['PENDING', 'OPEN', 'EVALUATING', 'PENDING_APPROVAL', 'NEEDS_REVISION', 'CANCEL_REQUESTED'].includes(r.status));
    const archivedRfqs = history.filter(r => ['COMPLETED', 'INCONCLUSIVE', 'EXPIRED', 'REJECTED', 'CANCELLED'].includes(r.status));
    const needsRevisionRfqs = history.filter(r => r.status === 'NEEDS_REVISION');

    const uniqueEntities = Array.from(
        new Map(
            history.filter(r => r.entity_id && (r.entity_name || r.entity_code)).map(r => [r.entity_id, { id: r.entity_id, name: r.entity_name || `Entity ${r.entity_id}`, code: r.entity_code }])
        ).values()
    );

    const baseRfqs = activeTab === 'LIVE' ? liveRfqs : activeTab === 'ARCHIVE' ? archivedRfqs : history;

    const hasActiveFilters = searchQuery.trim() !== '' || typeFilter !== 'ALL' || statusFilter !== 'ALL' || entityFilter !== 'ALL';

    const resetAllFilters = () => {
        setSearchQuery('');
        setTypeFilter('ALL');
        setStatusFilter('ALL');
        setEntityFilter('ALL');
        setSortField('created_at');
        setSortDirection('desc');
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection(field === 'created_at' || field === 'amount' ? 'desc' : 'asc');
        }
    };

    const displayedRfqs = useMemo(() => {
        let list = baseRfqs;

        if (entityFilter !== 'ALL') {
            list = list.filter(r => String(r.entity_id) === String(entityFilter));
        }

        if (typeFilter !== 'ALL') {
            if (typeFilter === 'FX_PORTFOLIO') {
                list = list.filter(r => r.type !== 'TBILL' && r.legs && r.legs.length > 1);
            } else if (typeFilter === 'FX_SPOT') {
                list = list.filter(r => r.type !== 'TBILL' && (!r.legs || r.legs.length <= 1));
            } else {
                list = list.filter(r => r.type === typeFilter);
            }
        }

        if (statusFilter !== 'ALL') {
            list = list.filter(r => r.status === statusFilter);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(r => {
                const refNo = (r.ref_no || '').toLowerCase();
                const entityName = (r.entity_name || '').toLowerCase();
                const type = (r.type || '').toLowerCase();
                const direction = (r.direction || '').toLowerCase();
                const buyCurr = (r.buy_currency || '').toLowerCase();
                const sellCurr = (r.sell_currency || '').toLowerCase();
                const notes = (r.internal_notes || '').toLowerCase();
                const creator = (r.creator_name || '').toLowerCase();
                const winner = (r.winner_bank_name || r.winning_bank_name || '').toLowerCase();
                const status = (r.status || '').toLowerCase();
                const details = (r.type === 'TBILL' ? r.direction : `${r.buy_currency}/${r.sell_currency}`) || '';
                
                // Multi-leg fields search
                const legDetails = (r.legs || []).map(l => `${l.buy_currency} ${l.sell_currency} ${l.currency_pair || ''} ${l.winner_bank_name || ''} ${l.amount || ''}`).join(' ').toLowerCase();

                return refNo.includes(q) ||
                    entityName.includes(q) ||
                    type.includes(q) ||
                    direction.includes(q) ||
                    buyCurr.includes(q) ||
                    sellCurr.includes(q) ||
                    notes.includes(q) ||
                    creator.includes(q) ||
                    winner.includes(q) ||
                    status.includes(q) ||
                    details.toLowerCase().includes(q) ||
                    legDetails.includes(q);
            });
        }

        return [...list].sort((a, b) => {
            let valA, valB;
            switch (sortField) {
                case 'ref_no':
                    valA = a.ref_no || '';
                    valB = b.ref_no || '';
                    return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);

                case 'entity':
                    valA = a.entity_name || '';
                    valB = b.entity_name || '';
                    return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);

                case 'type':
                    valA = a.type === 'TBILL' ? 'TBILL' : (a.legs && a.legs.length > 1 ? 'FX_PORTFOLIO' : 'FX_SPOT');
                    valB = b.type === 'TBILL' ? 'TBILL' : (b.legs && b.legs.length > 1 ? 'FX_PORTFOLIO' : 'FX_SPOT');
                    return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);

                case 'details':
                    valA = a.type === 'TBILL' ? (a.direction || '') : (a.legs && a.legs.length > 1 ? a.legs.map(l => l.currency_pair || `${l.buy_currency}/${l.sell_currency}`).join(' ') : `${a.buy_currency}/${a.sell_currency}`);
                    valB = b.type === 'TBILL' ? (b.direction || '') : (b.legs && b.legs.length > 1 ? b.legs.map(l => l.currency_pair || `${l.buy_currency}/${l.sell_currency}`).join(' ') : `${b.buy_currency}/${b.sell_currency}`);
                    return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);

                case 'amount':
                    valA = a.legs && a.legs.length > 1 ? a.legs.reduce((acc, l) => acc + (Number(l.amount) || 0), 0) : (Number(a.amount) || 0);
                    valB = b.legs && b.legs.length > 1 ? b.legs.reduce((acc, l) => acc + (Number(l.amount) || 0), 0) : (Number(b.amount) || 0);
                    return sortDirection === 'asc' ? valA - valB : valB - valA;

                case 'status':
                    valA = a.status || '';
                    valB = b.status || '';
                    return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);

                case 'created_at':
                default:
                    valA = a.created_at ? new Date(a.created_at).getTime() : 0;
                    valB = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return sortDirection === 'asc' ? valA - valB : valB - valA;
            }
        });
    }, [baseRfqs, entityFilter, typeFilter, statusFilter, searchQuery, sortField, sortDirection]);

    if (loading) return <div className="p-12 text-center text-gray-500">Loading quotation history...</div>;

    return (
        <div className="w-full space-y-6 sm:space-y-8">
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
                                        <span className="text-xs text-gray-700 font-semibold">{rfq.direction} {formatAmount(rfq.amount)} {rfq.buy_currency}</span>
                                    </div>
                                    {rfq.admin_revision_notes && (
                                        <p className="text-xs text-amber-950 mt-1.5 italic pl-2 border-l-2 border-amber-400">
                                            Admin Feedback: "{rfq.admin_revision_notes}"
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => navigate(`/end-user/quotations/active?revision_rfq_id=${rfq.id}`)}
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
                                        {rfq.type === 'TBILL' ? `${rfq.direction} Quotation` : `${rfq.direction} ${formatAmount(rfq.amount)} ${rfq.buy_currency}`}
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

                    {uniqueEntities.length > 1 && (
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500 font-semibold flex items-center gap-1">
                                <Building size={14} className="text-indigo-600" /> Entity:
                            </label>
                            <select
                                value={entityFilter}
                                onChange={(e) => setEntityFilter(e.target.value)}
                                className="text-xs font-semibold bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700 outline-none focus:border-indigo-500 shadow-2xs"
                            >
                                <option value="ALL">All Legal Entities ({uniqueEntities.length})</option>
                                {uniqueEntities.map(e => (
                                    <option key={e.id} value={e.id}>{e.code ? `[${e.code}] ` : ''}{e.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Filter & Search Toolbar */}
                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[220px] max-w-md">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by Ref #, entity, pair, notes..."
                            className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Filter & Quick Sort Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Type Filter */}
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="text-xs font-semibold bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                        >
                            <option value="ALL">All Types</option>
                            <option value="FX_SPOT">FX Spot (Single Leg)</option>
                            <option value="FX_PORTFOLIO">FX Portfolio (Multi-Leg)</option>
                            <option value="TBILL">T-Bills</option>
                        </select>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="text-xs font-semibold bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="OPEN">Open (Bidding)</option>
                            <option value="AWAITING_ACCEPTANCE">Awaiting Acceptance</option>
                            <option value="PENDING">Pending Window</option>
                            <option value="PENDING_APPROVAL">Pending Approval</option>
                            <option value="NEEDS_REVISION">Needs Revision</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>

                        {/* Quick Sort Dropdown */}
                        <div className="flex items-center gap-1.5 pl-1.5 border-l border-gray-200">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden md:inline">Sort:</span>
                            <select
                                value={`${sortField}_${sortDirection}`}
                                onChange={(e) => {
                                    const [field, dir] = e.target.value.split('_');
                                    setSortField(field);
                                    setSortDirection(dir);
                                }}
                                className="text-xs font-semibold bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-2.5 py-2 text-gray-700 outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                            >
                                <option value="created_at_desc">Date: Newest First</option>
                                <option value="created_at_asc">Date: Oldest First</option>
                                <option value="amount_desc">Amount: High → Low</option>
                                <option value="amount_asc">Amount: Low → High</option>
                                <option value="ref_no_asc">Ref No: A → Z</option>
                                <option value="ref_no_desc">Ref No: Z → A</option>
                                <option value="status_asc">Status: A → Z</option>
                            </select>
                        </div>

                        {/* Reset Filters */}
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={resetAllFilters}
                                className="px-2.5 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                                title="Reset all filters and sorting"
                            >
                                <RotateCcw size={11} /> Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Summary Count Bar */}
                <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                    <span>
                        Showing <strong className="text-gray-800">{displayedRfqs.length}</strong> of {baseRfqs.length} quotation{baseRfqs.length === 1 ? '' : 's'}
                        {hasActiveFilters && <span className="text-blue-600 font-semibold ml-1.5">(filtered)</span>}
                    </span>
                    <span className="text-[11px] text-gray-400 hidden sm:inline">
                        Click column headers to sort ascending / descending
                    </span>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th
                                        className={`px-3.5 py-3 text-[10px] font-bold uppercase whitespace-nowrap cursor-pointer select-none transition-colors ${
                                            sortField === 'ref_no' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100/50'
                                        }`}
                                        onClick={() => handleSort('ref_no')}
                                        title="Click to sort by Ref No"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>Ref No</span>
                                            {sortField === 'ref_no' ? (
                                                sortDirection === 'asc' ? <ArrowUp size={11} className="text-blue-600" /> : <ArrowDown size={11} className="text-blue-600" />
                                            ) : (
                                                <ArrowUpDown size={11} className="text-gray-300 opacity-60" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className={`px-3.5 py-3 text-[10px] font-bold uppercase whitespace-nowrap cursor-pointer select-none transition-colors ${
                                            sortField === 'entity' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100/50'
                                        }`}
                                        onClick={() => handleSort('entity')}
                                        title="Click to sort by Entity"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>Entity</span>
                                            {sortField === 'entity' ? (
                                                sortDirection === 'asc' ? <ArrowUp size={11} className="text-blue-600" /> : <ArrowDown size={11} className="text-blue-600" />
                                            ) : (
                                                <ArrowUpDown size={11} className="text-gray-300 opacity-60" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className={`px-3 py-3 text-[10px] font-bold uppercase whitespace-nowrap cursor-pointer select-none transition-colors ${
                                            sortField === 'type' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100/50'
                                        }`}
                                        onClick={() => handleSort('type')}
                                        title="Click to sort by Type"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>Type</span>
                                            {sortField === 'type' ? (
                                                sortDirection === 'asc' ? <ArrowUp size={11} className="text-blue-600" /> : <ArrowDown size={11} className="text-blue-600" />
                                            ) : (
                                                <ArrowUpDown size={11} className="text-gray-300 opacity-60" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className={`px-3 py-3 text-[10px] font-bold uppercase whitespace-nowrap cursor-pointer select-none transition-colors ${
                                            sortField === 'created_at' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100/50'
                                        }`}
                                        onClick={() => handleSort('created_at')}
                                        title="Click to sort by Date"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>Date</span>
                                            {sortField === 'created_at' ? (
                                                sortDirection === 'asc' ? <ArrowUp size={11} className="text-blue-600" /> : <ArrowDown size={11} className="text-blue-600" />
                                            ) : (
                                                <ArrowUpDown size={11} className="text-gray-300 opacity-60" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className={`px-3 py-3 text-[10px] font-bold uppercase whitespace-nowrap cursor-pointer select-none transition-colors ${
                                            sortField === 'details' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100/50'
                                        }`}
                                        onClick={() => handleSort('details')}
                                        title="Click to sort by Details"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>Details</span>
                                            {sortField === 'details' ? (
                                                sortDirection === 'asc' ? <ArrowUp size={11} className="text-blue-600" /> : <ArrowDown size={11} className="text-blue-600" />
                                            ) : (
                                                <ArrowUpDown size={11} className="text-gray-300 opacity-60" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className={`px-3 py-3 text-[10px] font-bold uppercase whitespace-nowrap cursor-pointer select-none transition-colors ${
                                            sortField === 'amount' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100/50'
                                        }`}
                                        onClick={() => handleSort('amount')}
                                        title="Click to sort by Amount"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>Amount</span>
                                            {sortField === 'amount' ? (
                                                sortDirection === 'asc' ? <ArrowUp size={11} className="text-blue-600" /> : <ArrowDown size={11} className="text-blue-600" />
                                            ) : (
                                                <ArrowUpDown size={11} className="text-gray-300 opacity-60" />
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-3 py-3 text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">Winning Counterparty & Rate</th>
                                    <th
                                        className={`px-3 py-3 text-[10px] font-bold uppercase whitespace-nowrap cursor-pointer select-none transition-colors ${
                                            sortField === 'status' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100/50'
                                        }`}
                                        onClick={() => handleSort('status')}
                                        title="Click to sort by Status"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>Status</span>
                                            {sortField === 'status' ? (
                                                sortDirection === 'asc' ? <ArrowUp size={11} className="text-blue-600" /> : <ArrowDown size={11} className="text-blue-600" />
                                            ) : (
                                                <ArrowUpDown size={11} className="text-gray-300 opacity-60" />
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-3 py-3 text-[10px] font-bold text-gray-400 uppercase text-right whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {displayedRfqs.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <AlertCircle size={24} className="text-gray-300" />
                                                <p className="text-sm font-semibold text-gray-600">No quotations match your filter criteria</p>
                                                {hasActiveFilters && (
                                                    <button
                                                        type="button"
                                                        onClick={resetAllFilters}
                                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 underline mt-1 cursor-pointer"
                                                    >
                                                        Reset filters to view all quotations
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    displayedRfqs.map((rfq) => (
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
                                                <div className="text-[10px] text-gray-500 truncate max-w-[150px] flex items-center gap-1 mt-0.5" title={`Internal Note: ${rfq.internal_notes}`}>
                                                    <FileText size={10} className="text-gray-400 shrink-0" />
                                                    <span className="truncate">{rfq.internal_notes}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3.5 py-3 whitespace-nowrap">
                                            {rfq.entity_name ? (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-lg" title={rfq.entity_name}>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                                    <span className="truncate max-w-[120px]">{rfq.entity_name}</span>
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
                                        <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                                            {formatDate(rfq.created_at)}
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
                                                <span className="font-semibold text-gray-900">Min: {formatAmount(rfq.min_ticket_amount || 0)}</span>
                                            ) : rfq.legs && rfq.legs.length > 1 ? (
                                                <div className="flex flex-col gap-0.5 py-0.5 font-mono text-xs">
                                                    {rfq.legs.map((leg, idx) => (
                                                        <div key={leg.id || idx} className="flex items-center gap-1 whitespace-nowrap text-slate-900">
                                                            <span className="text-[9px] text-slate-400 font-sans font-semibold">L{idx + 1}:</span>
                                                            <span className="font-bold">{formatAmount(leg.amount)}</span>
                                                            <span className="text-[10px] text-slate-500 font-semibold">{leg.buy_currency}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="whitespace-nowrap font-mono">
                                                    <span className="font-bold text-gray-900">{formatAmount(rfq.amount || 0)}</span>
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
                                        <td className="px-3 py-3 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {rfq.status === 'NEEDS_REVISION' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/end-user/quotations/active?revision_rfq_id=${rfq.id}`);
                                                        }}
                                                        className="px-2.5 py-1 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                                        title="Revise Quotation in Builder"
                                                    >
                                                        <Undo2 size={13} /> Revise
                                                    </button>
                                                )}
                                                {['PENDING', 'PENDING_APPROVAL'].includes(rfq.status) && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCancelModalRfq(rfq);
                                                        }}
                                                        className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors inline-flex cursor-pointer"
                                                        title={rfq.status === 'PENDING_APPROVAL' ? 'Cancel Draft Quotation' : 'Request Cancellation'}
                                                    >
                                                        <XCircle size={15} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/end-user/quotations/active?retrade_rfq_id=${rfq.id}`);
                                                    }}
                                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 rounded-lg transition-colors inline-flex cursor-pointer"
                                                    title="Re-Trade in Builder"
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
                                ))
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

            {/* Quotation Cancellation Modal */}
            {cancelModalRfq && (
                <QuotationCancellationModal
                    rfq={cancelModalRfq}
                    isOpen={Boolean(cancelModalRfq)}
                    onClose={() => setCancelModalRfq(null)}
                    onSuccess={fetchData}
                />
            )}
        </div>
    );
}
