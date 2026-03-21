import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../services/apiClient';
import ResultsView from '../EndUser/Quotations/ResultsView';
import {
    Bell, Check, X, BarChart3, Landmark, History, ChevronRight, Clock,
    Search, Filter, AlertCircle, TrendingUp, ArrowUpRight, ArrowDownRight, FileText
} from 'lucide-react';

export default function AdminQuotationDashboard() {
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState([]);
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRfqId, setSelectedRfqId] = useState(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const [pendingRes, historyRes, statsRes] = await Promise.all([
                apiClient.get('/corporate-admin/quotations/pending-approvals').catch(() => ({ data: [] })),
                apiClient.get('/end-user/quotations/').catch(() => ({ data: [] })),
                apiClient.get('/end-user/quotations/stats').catch(() => ({ data: [] })),
            ]);
            setPendingApprovals(pendingRes.data);
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

    const handleApprove = async (rfqId) => {
        const rfq = pendingApprovals.find(r => r.id === rfqId);
        if (rfq?.window_end) {
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
            toast.error("Failed to approve: " + (err.response?.data?.detail || err.message));
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

    // Compute summary stats
    const totalRfqs = history.length;
    const activeRfqs = history.filter(r => r.status === 'PENDING' || r.status === 'PENDING_APPROVAL').length;
    const completedRfqs = history.filter(r => r.status === 'COMPLETED' || r.status === 'EVALUATING').length;
    const rejectedRfqs = history.filter(r => r.status === 'REJECTED').length;

    // Filtered history
    const filteredHistory = history.filter(rfq => {
        const matchesStatus = statusFilter === 'ALL' || rfq.status === statusFilter;
        const matchesType = typeFilter === 'ALL' || rfq.type === typeFilter;
        const matchesSearch = !searchTerm ||
            (rfq.ref_no?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (rfq.creator_name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        return matchesStatus && matchesType && matchesSearch;
    });

    const getStatusStyle = (status) => {
        switch (status) {
            case 'PENDING_APPROVAL': return 'bg-orange-100 text-orange-700';
            case 'PENDING': return 'bg-amber-100 text-amber-700';
            case 'REJECTED': return 'bg-red-100 text-red-700';
            case 'COMPLETED':
            case 'EVALUATING': return 'bg-emerald-100 text-emerald-700';
            case 'EXPIRED': return 'bg-gray-100 text-gray-500';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'PENDING_APPROVAL': return 'Needs Approval';
            case 'PENDING': return 'Live';
            case 'EVALUATING': return 'Evaluating';
            case 'COMPLETED': return 'Completed';
            case 'REJECTED': return 'Rejected';
            case 'EXPIRED': return 'Expired';
            default: return status;
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
                <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Loading quotation data...</p>
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-8 space-y-8 sm:space-y-10">
            {/* Header */}
            <header>
                <h1 className="text-3xl sm:text-4xl font-light tracking-tight mb-1 text-gray-900">Quotation Control Center</h1>
                <p className="text-gray-500 italic font-serif">Monitor, approve, and analyze all quotation activity.</p>
            </header>

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
                                    </div>
                                    <div className="text-base sm:text-lg font-bold text-gray-900">
                                        {rfq.type === 'TBILL' ? `${rfq.direction} Quotation` : `${rfq.direction} ${rfq.amount?.toLocaleString()} ${rfq.buy_currency}`}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">
                                        Requested by {rfq.creator_name || 'End User'} • {new Date(rfq.created_at).toLocaleString()}
                                    </div>
                                    {rfq.window_end && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <Clock size={12} className="text-gray-400" />
                                            <span className="text-xs text-gray-500">
                                                Window closes: {new Date(rfq.window_end).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-3 shrink-0">
                                    <button
                                        onClick={() => setSelectedRfqId(rfq.id)}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 font-semibold transition-all text-sm"
                                    >
                                        <ChevronRight size={16} /> Review
                                    </button>
                                    <button
                                        onClick={() => handleReject(rfq.id)}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600 font-bold transition-all text-sm"
                                    >
                                        <X size={16} /> Reject
                                    </button>
                                    <button
                                        onClick={() => handleApprove(rfq.id)}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-black text-white hover:bg-gray-800 font-bold shadow-lg shadow-gray-200 transition-all text-sm"
                                    >
                                        <Check size={16} /> Approve
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
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">Ref No</th>
                                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">Type</th>
                                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">Created By</th>
                                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">Date</th>
                                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">Details</th>
                                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">Amount</th>
                                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">Status</th>
                                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase text-right">View</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredHistory.map((rfq) => (
                                    <tr
                                        key={rfq.id}
                                        className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                        onClick={() => setSelectedRfqId(rfq.id)}
                                    >
                                        <td className="px-4 sm:px-6 py-3 sm:py-4 font-mono text-xs sm:text-sm font-bold truncate max-w-[120px]">{rfq.ref_no}</td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                                            <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider whitespace-nowrap ${rfq.type === 'TBILL' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                {rfq.type === 'TBILL' ? 'T-Bill' : 'FX Spot'}
                                            </span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs text-gray-600 whitespace-nowrap">
                                            {rfq.creator_name || 'End User'}
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs text-gray-500 whitespace-nowrap">{new Date(rfq.created_at).toLocaleDateString()}</td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold whitespace-nowrap">
                                            {rfq.type === 'TBILL' ? rfq.direction : `${rfq.buy_currency}/${rfq.sell_currency}`}
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap">
                                            {rfq.type === 'TBILL'
                                                ? `Min: ${new Intl.NumberFormat().format(rfq.min_ticket_amount || 0)}`
                                                : new Intl.NumberFormat().format(rfq.amount || 0)}
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                                            <span className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide whitespace-nowrap ${getStatusStyle(rfq.status)}`}>
                                                {getStatusLabel(rfq.status)}
                                            </span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedRfqId(rfq.id); }}
                                                className="p-1.5 sm:p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors inline-flex"
                                            >
                                                <ChevronRight size={18} />
                                            </button>
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
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
                        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-white z-10">
                            <h3 className="font-bold text-sm sm:text-base text-gray-900 truncate pr-4">
                                RFQ Details: {history.find(r => r.id === selectedRfqId)?.ref_no || pendingApprovals.find(r => r.id === selectedRfqId)?.ref_no}
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
        </div>
    );
}
