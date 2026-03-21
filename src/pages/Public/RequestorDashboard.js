import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL, publicApiRequest } from 'services/apiService';
import { toast } from 'react-toastify';
import {
    ShieldCheck, Plus, Clock, FileText, Search,
    AlertTriangle, CheckCircle, XCircle, Loader2,
    ArrowRight, Calendar, DollarSign, Building2,
    Trash2, Pencil, RotateCcw, Wrench, CalendarClock,
    ChevronDown, Send, TrendingUp, X
} from 'lucide-react';

const STATUS_CONFIG = {
    DRAFT: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700', icon: FileText },
    SUBMITTED: { label: 'Submitted', bg: 'bg-blue-100', text: 'text-blue-700', icon: ArrowRight },
    PENDING_APPROVAL: { label: 'Pending Approval', bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
    APPROVED: { label: 'Approved', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
    REJECTED: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    RETURNED_FOR_REVISION: { label: 'Returned for Revision', bg: 'bg-amber-100', text: 'text-amber-700', icon: RotateCcw },
    CANCELLED: { label: 'Cancelled', bg: 'bg-gray-100', text: 'text-gray-500', icon: XCircle },
    ISSUED: { label: 'Issued', bg: 'bg-emerald-100', text: 'text-emerald-800', icon: CheckCircle },
    PENDING_ISSUANCE: { label: 'Pending Issuance', bg: 'bg-indigo-100', text: 'text-indigo-700', icon: Clock },
};

function StatusBadge({ status }) {
    const config = STATUS_CONFIG[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-600', icon: FileText };
    const Icon = config.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
            <Icon className="w-3 h-3" />
            {config.label}
        </span>
    );
}

export default function RequestorDashboard() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [requests, setRequests] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // 4.1 Maintenance Portal State
    const [issuedLgs, setIssuedLgs] = useState([]);
    const [maintenanceActions, setMaintenanceActions] = useState([]);
    const [activeAction, setActiveAction] = useState(null); // { lgId, type }
    const [actionData, setActionData] = useState({});
    const [actionNotes, setActionNotes] = useState('');
    const [submittingAction, setSubmittingAction] = useState(false);
    const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'lgs'

    const fetchRequests = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/public-issuance/my-requests?token=${encodeURIComponent(token)}`);
            if (!res.ok) {
                if (res.status === 403) {
                    toast.error('Session expired. Please verify again.');
                    navigate('/portal/issuance');
                    return;
                }
                throw new Error('Failed to load requests');
            }
            const data = await res.json();
            setEmail(data.email || '');
            setRequests(data.requests || []);
        } catch (err) {
            toast.error(err.message || 'Failed to load your requests.');
        } finally {
            setLoading(false);
        }
    }, [token, navigate]);

    const fetchIssuedLgs = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/public-issuance/my-issued-lgs?token=${encodeURIComponent(token)}`);
            if (res.ok) {
                const data = await res.json();
                setIssuedLgs(data.issued_lgs || []);
            }
        } catch (err) {
            console.error('Failed to load issued LGs:', err);
        }
    }, [token]);

    const fetchMaintenanceActions = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/public-issuance/my-maintenance-actions?token=${encodeURIComponent(token)}`);
            if (res.ok) {
                const data = await res.json();
                setMaintenanceActions(data.actions || []);
            }
        } catch (err) {
            console.error('Failed to load maintenance actions:', err);
        }
    }, [token]);

    useEffect(() => {
        if (!token) {
            navigate('/portal/issuance');
            return;
        }
        fetchRequests();
        fetchIssuedLgs();
        fetchMaintenanceActions();
    }, [token, fetchRequests, fetchIssuedLgs, fetchMaintenanceActions, navigate]);

    const handleSubmitMaintenance = async () => {
        if (!activeAction) return;
        setSubmittingAction(true);
        try {
            const res = await fetch(
                `${API_BASE_URL}/public-issuance/issued-lgs/${activeAction.lgId}/maintenance?token=${encodeURIComponent(token)}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action_type: activeAction.type,
                        action_data: actionData,
                        notes: actionNotes || null
                    })
                }
            );
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || 'Failed to submit maintenance action');
            }
            toast.success(`${activeAction.type.replace('_', ' ')} request submitted successfully`);
            setActiveAction(null);
            setActionData({});
            setActionNotes('');
            fetchMaintenanceActions();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSubmittingAction(false);
        }
    };

    const filteredRequests = requests.filter(r => {
        if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
        if (search) {
            const term = search.toLowerCase();
            return (
                (r.serial_number || '').toLowerCase().includes(term) ||
                (r.beneficiary_name || '').toLowerCase().includes(term) ||
                (r.lg_type || '').toLowerCase().includes(term)
            );
        }
        return true;
    });

    const statusCounts = requests.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
    }, {});

    const handleNewRequest = () => {
        navigate(`/public-issuance/form?token=${encodeURIComponent(token)}`);
    };

    const formatDate = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatAmount = (amount, currency) => {
        if (!amount) return '—';
        const num = parseFloat(amount);
        return `${currency || ''} ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
    };

    const handleDeleteDraft = async (e, reqId) => {
        e.stopPropagation(); // Prevent row click
        if (!window.confirm('Are you sure you want to delete this draft? This cannot be undone.')) return;
        try {
            const safeToken = encodeURIComponent(token);
            await publicApiRequest(`/public-issuance/requests/${reqId}?token=${safeToken}`, 'DELETE');
            toast.success('Draft deleted');
            fetchRequests();
        } catch (err) {
            toast.error(err.message || 'Failed to delete draft');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                    <p className="text-gray-500">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-xl text-white">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">LG Request Portal</h1>
                            <p className="text-xs text-gray-500">{email}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleNewRequest}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5"
                    >
                        <Plus className="w-4 h-4" /> New Request
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
                        <p className="text-xs text-gray-500 mt-1">Total Requests</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-sm">
                        <p className="text-2xl font-bold text-amber-600">{statusCounts['PENDING_APPROVAL'] || 0}</p>
                        <p className="text-xs text-gray-500 mt-1">Pending Approval</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-sm">
                        <p className="text-2xl font-bold text-emerald-600">{(statusCounts['APPROVED'] || 0) + (statusCounts['ISSUED'] || 0)}</p>
                        <p className="text-xs text-gray-500 mt-1">Approved / Issued</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm">
                        <p className="text-2xl font-bold text-blue-600">{statusCounts['SUBMITTED'] || 0}</p>
                        <p className="text-xs text-gray-500 mt-1">Submitted</p>
                    </div>
                </div>

                {/* Search + Filter */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by serial number, beneficiary, or LG type..."
                            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white cursor-pointer focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="ALL">All Statuses</option>
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <option key={key} value={key}>{cfg.label} ({statusCounts[key] || 0})</option>
                        ))}
                    </select>
                </div>

                {/* Request Table */}
                {filteredRequests.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                        {requests.length === 0 ? (
                            <>
                                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">No requests yet</h3>
                                <p className="text-sm text-gray-400 mb-6">Start by submitting your first LG issuance request.</p>
                                <button
                                    onClick={handleNewRequest}
                                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
                                >
                                    <Plus className="w-4 h-4" /> New Request
                                </button>
                            </>
                        ) : (
                            <>
                                <Search className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                                <p className="text-gray-500">No requests match your search.</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50/80 border-b border-gray-200">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Serial #</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Beneficiary</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">LG Type</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dates</th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredRequests.map(req => (
                                        <tr key={req.id}
                                            className={`hover:bg-blue-50/40 transition-colors group ${(req.status === 'DRAFT' || req.status === 'RETURNED_FOR_REVISION') ? 'cursor-pointer' : ''}`}
                                            onClick={() => {
                                                if (req.status === 'DRAFT' || req.status === 'RETURNED_FOR_REVISION') {
                                                    navigate(`/public-issuance/form?token=${encodeURIComponent(token)}&editDraftId=${req.id}`);
                                                }
                                            }}
                                            title={req.status === 'DRAFT' ? 'Click to continue editing' : req.status === 'RETURNED_FOR_REVISION' ? 'Click to revise and resubmit' : ''}
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-blue-400 group-hover:text-blue-600 transition-colors" />
                                                    <div>
                                                        <span className="font-semibold text-gray-900">{req.serial_number}</span>
                                                        {req.is_urgent && (
                                                            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 rounded">URGENT</span>
                                                        )}
                                                        {req.entity_name && (
                                                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                                                <Building2 className="w-3 h-3" /> {req.entity_name}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <StatusBadge status={req.status} />
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-gray-800 font-medium">{req.beneficiary_name}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1.5 text-gray-800 font-medium">
                                                    <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                                                    {formatAmount(req.amount, req.currency)}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-gray-600">{req.lg_type || '—'}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(req.requested_issue_date)}
                                                    <span className="text-gray-300 mx-0.5">→</span>
                                                    {formatDate(req.requested_expiry_date)}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                {(req.status === 'DRAFT' || req.status === 'RETURNED_FOR_REVISION') && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); navigate(`/public-issuance/form?token=${encodeURIComponent(token)}&editDraftId=${req.id}`); }}
                                                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title={req.status === 'RETURNED_FOR_REVISION' ? 'Revise & Resubmit' : 'Edit Draft'}
                                                        >
                                                            {req.status === 'RETURNED_FOR_REVISION' ? <RotateCcw className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                                                        </button>
                                                        {req.status === 'DRAFT' && (
                                                            <button
                                                                onClick={(e) => handleDeleteDraft(e, req.id)}
                                                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Delete Draft"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 4.1 — Issued LGs and Maintenance Section */}
                <div className="mt-10">
                    {/* Tab Selector */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setActiveTab('requests')}
                            className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${activeTab === 'requests' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                        >
                            <FileText className="w-4 h-4 inline mr-1.5" /> My Requests ({requests.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('lgs')}
                            className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${activeTab === 'lgs' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                        >
                            <ShieldCheck className="w-4 h-4 inline mr-1.5" /> My Issued LGs ({issuedLgs.length})
                        </button>
                    </div>

                    {activeTab === 'lgs' && (
                        <div className="space-y-6">
                            {/* Issued LGs */}
                            {issuedLgs.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                                    <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <h3 className="text-lg font-semibold text-gray-700 mb-1">No Issued LGs</h3>
                                    <p className="text-sm text-gray-400">LGs linked to your requests will appear here once issued.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {issuedLgs.map(lg => (
                                        <div key={lg.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg transition-all">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{lg.lg_ref_number}</p>
                                                    <p className="text-xs text-gray-400">{lg.beneficiary_name}</p>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    lg.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                                                    lg.status === 'EXPIRED' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {lg.status}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                                                <div>
                                                    <span className="text-gray-400">Amount</span>
                                                    <p className="font-semibold text-gray-800">{lg.currency} {lg.current_amount?.toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400">Bank</span>
                                                    <p className="font-semibold text-gray-800">{lg.bank_name || '—'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400">Issue Date</span>
                                                    <p className="font-medium text-gray-700">{formatDate(lg.issue_date)}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400">Expiry Date</span>
                                                    <p className="font-medium text-gray-700">{formatDate(lg.expiry_date)}</p>
                                                </div>
                                            </div>

                                            {/* Maintenance Action Trigger */}
                                            {lg.status === 'ACTIVE' && (
                                                <div className="relative">
                                                    {activeAction?.lgId === lg.id ? (
                                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                                                            <div className="flex justify-between items-center">
                                                                <h4 className="text-sm font-bold text-blue-900">
                                                                    {activeAction.type.replace('_', ' ')} Request
                                                                </h4>
                                                                <button onClick={() => { setActiveAction(null); setActionData({}); setActionNotes(''); }} className="text-gray-400 hover:text-gray-600">
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>

                                                            {/* Action-specific fields */}
                                                            {activeAction.type === 'EXTEND' && (
                                                                <div>
                                                                    <label className="text-xs font-semibold text-gray-600">New Expiry Date</label>
                                                                    <input type="date" className="w-full mt-1 px-3 py-2 text-sm border rounded-lg" value={actionData.new_expiry_date || ''} onChange={e => setActionData({...actionData, new_expiry_date: e.target.value})} />
                                                                </div>
                                                            )}
                                                            {activeAction.type === 'INCREASE_AMOUNT' && (
                                                                <div>
                                                                    <label className="text-xs font-semibold text-gray-600">New Amount</label>
                                                                    <input type="number" className="w-full mt-1 px-3 py-2 text-sm border rounded-lg" placeholder="Enter new amount" value={actionData.new_amount || ''} onChange={e => setActionData({...actionData, new_amount: parseFloat(e.target.value) || 0})} />
                                                                </div>
                                                            )}
                                                            {activeAction.type === 'AMENDMENT' && (
                                                                <div>
                                                                    <label className="text-xs font-semibold text-gray-600">Amendment Details</label>
                                                                    <textarea className="w-full mt-1 px-3 py-2 text-sm border rounded-lg" rows="2" placeholder="Describe the amendment..." value={actionData.amendment_text || ''} onChange={e => setActionData({...actionData, amendment_text: e.target.value})} />
                                                                </div>
                                                            )}
                                                            {activeAction.type === 'CLOSE' && (
                                                                <p className="text-xs text-gray-500">The LG will be submitted for closure/return.</p>
                                                            )}

                                                            <div>
                                                                <label className="text-xs font-semibold text-gray-600">Notes (optional)</label>
                                                                <textarea className="w-full mt-1 px-3 py-2 text-sm border rounded-lg" rows="2" placeholder="Additional notes..." value={actionNotes} onChange={e => setActionNotes(e.target.value)} />
                                                            </div>

                                                            <button
                                                                onClick={handleSubmitMaintenance}
                                                                disabled={submittingAction || (activeAction.type === 'EXTEND' && !actionData.new_expiry_date) || (activeAction.type === 'INCREASE_AMOUNT' && !actionData.new_amount) || (activeAction.type === 'AMENDMENT' && !actionData.amendment_text)}
                                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                            >
                                                                {submittingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                                Submit Request
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            {[
                                                                { type: 'EXTEND', label: 'Extend', icon: CalendarClock, color: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100' },
                                                                { type: 'INCREASE_AMOUNT', label: 'Increase', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
                                                                { type: 'CLOSE', label: 'Close', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100' },
                                                                { type: 'AMENDMENT', label: 'Amend', icon: Pencil, color: 'text-violet-600 bg-violet-50 border-violet-200 hover:bg-violet-100' },
                                                            ].map(act => (
                                                                <button
                                                                    key={act.type}
                                                                    onClick={() => { setActiveAction({ lgId: lg.id, type: act.type }); setActionData({}); setActionNotes(''); }}
                                                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg transition-all ${act.color}`}
                                                                >
                                                                    <act.icon className="w-3.5 h-3.5" /> {act.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Maintenance Action History */}
                            {maintenanceActions.length > 0 && (
                                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            <Wrench className="w-4 h-4 text-violet-600" />
                                            Maintenance Action History
                                        </h3>
                                    </div>
                                    <div className="divide-y divide-gray-100">
                                        {maintenanceActions.map(a => (
                                            <div key={a.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {a.action_type.replace('_', ' ')} — {a.lg_ref}
                                                    </p>
                                                    <p className="text-xs text-gray-400">{a.lg_beneficiary} · {formatDate(a.created_at)}</p>
                                                    {a.notes && <p className="text-xs text-gray-500 mt-0.5 italic">{a.notes}</p>}
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    a.status === 'APPROVED' || a.status === 'EXECUTED' ? 'bg-emerald-100 text-emerald-700' :
                                                    a.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                    a.status === 'CANCELLED' ? 'bg-gray-100 text-gray-500' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {a.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center mt-8 space-x-4">
                    <a href="/portal/issuance" className="text-sm text-gray-400 hover:text-blue-600 transition-colors">← Back to Portal</a>
                    <span className="text-gray-300">|</span>
                    <a href="/login" className="text-sm text-gray-400 hover:text-blue-600 transition-colors">Login →</a>
                </div>
            </main>
        </div>
    );
}
