import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL, publicApiRequest } from 'services/apiService';
import { toast } from 'react-toastify';
import {
    ShieldCheck, Plus, Clock, FileText, Search,
    AlertTriangle, CheckCircle, XCircle, Loader2,
    ArrowRight, Calendar, DollarSign, Building2,
    Trash2, Pencil, RotateCcw, Wrench, CalendarClock,
    ChevronDown, Send, TrendingUp, X, Eye, MessageSquare,
    Upload, Paperclip, Users
} from 'lucide-react';
import MaintenanceActionModal from '../../components/Modals/MaintenanceActionModal';
import ChangeRequestorModal from '../../components/Modals/ChangeRequestorModal';

const STATUS_CONFIG = {
    DRAFT: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700', icon: FileText },
    PENDING_APPROVAL: { label: 'Pending Approval', bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
    REVISION_REQUIRED: { label: 'Returned for Revision', bg: 'bg-amber-100', text: 'text-amber-700', icon: RotateCcw },
    APPROVED_INTERNAL: { label: 'Approved (Internal)', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
    REJECTED_INTERNAL: { label: 'Rejected (Internal)', bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    BANK_PROCESSING: { label: 'Bank Processing', bg: 'bg-indigo-100', text: 'text-indigo-700', icon: Clock },
    REJECTED_BANK: { label: 'Bank Rejected', bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    ISSUED: { label: 'Issued', bg: 'bg-emerald-100', text: 'text-emerald-800', icon: CheckCircle },
    COMPLETED: { label: 'Completed', bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle },
    CANCELLED: { label: 'Cancelled', bg: 'bg-gray-100', text: 'text-gray-500', icon: XCircle },
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
    const [incomingHandovers, setIncomingHandovers] = useState([]);
    const [maintenanceActions, setMaintenanceActions] = useState([]);
    const [activeAction, setActiveAction] = useState(null); // { lgId, type }
    const [actionData, setActionData] = useState({});
    const [actionNotes, setActionNotes] = useState('');
    const [submittingAction, setSubmittingAction] = useState(false);
    const [actionDocuments, setActionDocuments] = useState([]); // [ { uri, file_name, size_bytes } ]
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [activeTab, setActiveTab] = useState('requests'); // 'requests', 'lgs', or 'actions'
    const [expandedLgId, setExpandedLgId] = useState(null); // which LG row has its action form open
    const [viewingRequest, setViewingRequest] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);
    
    // Handover Modal State
    const [showHandoverModal, setShowHandoverModal] = useState(false);
    const [selectedLgForHandover, setSelectedLgForHandover] = useState(null);

    const openRequestDetail = async (reqId) => {
        setViewLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/public-issuance/requests/${reqId}?token=${encodeURIComponent(token)}`);
            if (!res.ok) throw new Error('Failed to load request');
            const data = await res.json();
            setViewingRequest(data);
        } catch (err) {
            toast.error(err.message || 'Failed to load request details');
        } finally {
            setViewLoading(false);
        }
    };

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
                setIncomingHandovers(data.incoming_handovers || []);
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

    const handleUploadDocument = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { toast.error('File size must be under 10MB'); return; }
        setUploadingDoc(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`${API_BASE_URL}/public-issuance/maintenance/upload-document?token=${encodeURIComponent(token)}`, {
                method: 'POST', body: formData
            });
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            setActionDocuments(prev => [...prev, { uri: data.uri, file_name: data.file_name, size_bytes: data.size_bytes }]);
            toast.success(`Uploaded: ${data.file_name}`);
        } catch (err) {
            toast.error(err.message || 'Failed to upload document');
        } finally {
            setUploadingDoc(false);
            e.target.value = ''; // reset input
        }
    };

    const handleSubmitMaintenance = async (actionType, formData, file) => {
        if (!activeAction) return;
        setSubmittingAction(true);
        try {
            const submitData = { ...formData };
            
            // Handle file upload if present
            if (file) {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('document_type', 'SUPPORTING_DOCUMENT');

                const uploadRes = await fetch(`${API_BASE_URL}/public-issuance/upload?token=${encodeURIComponent(token)}`, {
                    method: 'POST',
                    body: fd
                });
                
                if (!uploadRes.ok) throw new Error('Failed to upload document');
                const uploadedDoc = await uploadRes.json();
                
                submitData.supporting_documents = [uploadedDoc];
            }
            
            const res = await fetch(
                `${API_BASE_URL}/public-issuance/issued-lgs/${activeAction.lg.id}/maintenance?token=${encodeURIComponent(token)}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action_type: actionType,
                        action_data: submitData,
                        notes: formData.notes || null
                    })
                }
            );
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || 'Failed to submit maintenance action');
            }
            toast.success(`${actionType.replace('_', ' ')} request submitted successfully`);
            setActiveAction(null);
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

    const handleAcceptHandover = async (lgId) => {
        try {
            await publicApiRequest(`/public_issuance/handover/resolve?token=${encodeURIComponent(token)}`, 'POST', { lg_id: lgId, action: 'ACCEPT' });
            toast.success('You have accepted ownership of the LG.');
            fetchIssuedLgs();
        } catch (err) {
            toast.error(err.message || 'Failed to accept handover');
        }
    };

    const handleRejectHandover = async (lgId) => {
        if (!window.confirm('Are you sure you want to reject this LG ownership?')) return;
        try {
            await publicApiRequest(`/public_issuance/handover/resolve?token=${encodeURIComponent(token)}`, 'POST', { lg_id: lgId, action: 'REJECT' });
            toast.success('You have rejected ownership of the LG.');
            fetchIssuedLgs();
        } catch (err) {
            toast.error(err.message || 'Failed to reject handover');
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
                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6">
                    <button
                        onClick={() => { setActiveTab('requests'); setSearch(''); setStatusFilter('ALL'); }}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'requests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <FileText className="w-4 h-4" /> My Requests ({requests.length})
                    </button>
                    <button
                        onClick={() => { setActiveTab('lgs'); setSearch(''); setStatusFilter('ALL'); setExpandedLgId(null); }}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'lgs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <ShieldCheck className="w-4 h-4" /> My Issued LGs ({issuedLgs.length})
                    </button>
                    {incomingHandovers.length > 0 && (
                        <button
                            onClick={() => { setActiveTab('handovers'); setSearch(''); setStatusFilter('ALL'); setExpandedLgId(null); }}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'handovers' ? 'border-amber-500 text-amber-600' : 'border-transparent text-amber-600/70 hover:text-amber-600 hover:border-amber-300'} relative`}
                        >
                            <Users className="w-4 h-4 animate-pulse" /> 
                            Incoming Handovers 
                            <span className="bg-amber-100 text-amber-700 py-0.5 px-2 rounded-full text-xs font-bold">{incomingHandovers.length}</span>
                        </button>
                    )}
                    <button
                        onClick={() => { setActiveTab('actions'); setSearch(''); setStatusFilter('ALL'); }}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'actions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <Wrench className="w-4 h-4" /> My Actions ({maintenanceActions.length})
                    </button>
                </div>

                {/* Stats Cards — only show for Requests tab */}
                {activeTab === 'requests' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
                        <p className="text-xs text-gray-500 mt-1">Total Requests</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-sm">
                        <p className="text-2xl font-bold text-amber-600">{(statusCounts['PENDING_APPROVAL'] || 0) + (statusCounts['REVISION_REQUIRED'] || 0)}</p>
                        <p className="text-xs text-gray-500 mt-1">Pending Actions</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-sm">
                        <p className="text-2xl font-bold text-emerald-600">
                            {(statusCounts['APPROVED_INTERNAL'] || 0) + (statusCounts['BANK_PROCESSING'] || 0) + (statusCounts['ISSUED'] || 0) + (statusCounts['COMPLETED'] || 0)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Approved & Active</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm">
                        <p className="text-2xl font-bold text-blue-600">
                            {requests.filter(r => r.status && r.status !== 'DRAFT').length}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Total Submitted</p>
                    </div>
                </div>
                )}

                {/* Search + Filter */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={activeTab === 'requests'
                                ? "Search by serial number, beneficiary, or LG type..."
                                : "Search by LG reference, beneficiary, or bank..."}
                            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                        />
                    </div>
                    {activeTab === 'requests' ? (
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
                    ) : activeTab === 'lgs' ? (
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white cursor-pointer focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="ACTIVE">Active</option>
                            <option value="EXPIRED">Expired</option>
                            <option value="CANCELLED">Cancelled</option>
                            <option value="CLOSED">Closed</option>
                            <option value="BANK_REJECTED">Bank Rejected</option>
                        </select>
                    ) : (
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white cursor-pointer focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="PENDING_APPROVAL">Pending Approval</option>
                            <option value="APPROVED">Approved</option>
                            <option value="EXECUTED">Executed</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    )}
                </div>

                {/* =============== REQUESTS TAB =============== */}
                {activeTab === 'requests' && (
                <>
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
                                            className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                                            onClick={() => {
                                                if (req.status === 'DRAFT' || req.status === 'REVISION_REQUIRED') {
                                                    navigate(`/public-issuance/form?token=${encodeURIComponent(token)}&editDraftId=${req.id}`);
                                                } else {
                                                    openRequestDetail(req.id);
                                                }
                                            }}
                                            title={req.status === 'DRAFT' ? 'Click to edit' : req.status === 'REVISION_REQUIRED' ? 'Click to revise' : 'Click to view details'}
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-blue-400 group-hover:text-blue-600 transition-colors" />
                                                    <div>
                                                        <span className="font-semibold text-gray-900">{req.serial_number}</span>
                                                        {req.is_urgent && (
                                                            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 rounded">URGENT</span>
                                                        )}
                                                        {req.lg_ref_number ? (
                                                            <div className="flex items-center gap-1 text-[10px] text-blue-500 mt-0.5">
                                                                <ArrowRight className="w-3 h-3" />
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setActiveTab('lgs'); setSearch(req.lg_ref_number); }}
                                                                    className="hover:underline font-medium"
                                                                    title="View issued LG"
                                                                >
                                                                    {req.lg_ref_number}
                                                                </button>
                                                            </div>
                                                        ) : req.entity_name && (
                                                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                                                <Building2 className="w-3 h-3" /> {req.entity_name}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <StatusBadge status={req.status} />
                                                {req.status === 'REVISION_REQUIRED' && req.revision_notes && (
                                                    <div className="mt-1.5 px-2 py-1 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-700 max-w-xs">
                                                        <span className="font-semibold">Approver note:</span> {req.revision_notes}
                                                    </div>
                                                )}
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
                                                <div className="flex items-center justify-end gap-2">
                                                    {(req.status === 'DRAFT' || req.status === 'REVISION_REQUIRED') ? (
                                                        <>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); navigate(`/public-issuance/form?token=${encodeURIComponent(token)}&editDraftId=${req.id}`); }}
                                                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title={req.status === 'REVISION_REQUIRED' ? 'Revise & Resubmit' : 'Edit Draft'}
                                                            >
                                                                {req.status === 'REVISION_REQUIRED' ? <RotateCcw className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
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
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openRequestDetail(req.id); }}
                                                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                            title="View Details"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                </>
                )}

                {/* =============== ISSUED LGs TAB =============== */}
                {activeTab === 'lgs' && (
                    <div className="space-y-6">
                        {(() => {
                            const filteredLgs = issuedLgs.filter(lg => {
                                if (statusFilter !== 'ALL' && lg.status !== statusFilter) return false;
                                if (search) {
                                    const term = search.toLowerCase();
                                    return (
                                        (lg.lg_ref_number || '').toLowerCase().includes(term) ||
                                        (lg.beneficiary_name || '').toLowerCase().includes(term) ||
                                        (lg.bank_name || '').toLowerCase().includes(term)
                                    );
                                }
                                return true;
                            });
                            return filteredLgs.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                                    <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <h3 className="text-lg font-semibold text-gray-700 mb-1">
                                        {issuedLgs.length === 0 ? 'No Issued LGs' : 'No LGs match your search'}
                                    </h3>
                                    <p className="text-sm text-gray-400">
                                        {issuedLgs.length === 0 ? 'LGs linked to your requests will appear here once issued.' : 'Try adjusting your search or filter.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200 text-left">
                                                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">LG Reference</th>
                                                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Beneficiary</th>
                                                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Bank</th>
                                                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Expiry</th>
                                                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredLgs.map(lg => (
                                                <React.Fragment key={lg.id}>
                                                    <tr className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-3">
                                                            <p className="font-bold text-gray-900">{lg.lg_ref_number}</p>
                                                            {lg.bank_lg_number && <p className="text-[10px] text-gray-400">{lg.bank_lg_number}</p>}
                                                            {lg.request_serial_number && (
                                                                <button
                                                                    onClick={() => { setActiveTab('requests'); setSearch(lg.request_serial_number); }}
                                                                    className="flex items-center gap-1 text-[10px] text-blue-500 hover:underline font-medium mt-0.5"
                                                                    title="View source request"
                                                                >
                                                                    <ArrowRight className="w-3 h-3 rotate-180" /> {lg.request_serial_number}
                                                                </button>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-700 max-w-[150px] truncate">{lg.beneficiary_name || '—'}</td>
                                                        <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{lg.currency} {lg.current_amount?.toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{lg.bank_name || '—'}</td>
                                                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell whitespace-nowrap">{formatDate(lg.expiry_date)}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                                                                lg.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                                                                lg.status === 'EXPIRED' ? 'bg-red-100 text-red-700' :
                                                                lg.status === 'CANCELLED' ? 'bg-gray-100 text-gray-500' :
                                                                lg.status === 'BANK_REJECTED' ? 'bg-red-100 text-red-600' :
                                                                'bg-gray-100 text-gray-600'
                                                            }`}>
                                                                {lg.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            {lg.status === 'ACTIVE' && (
                                                                <div className="flex items-center gap-1 justify-end">
                                                                    {[
                                                                        { type: 'EXTEND', icon: CalendarClock, tip: 'Extend', color: 'text-blue-600 hover:bg-blue-50' },
                                                                        { type: 'INCREASE_AMOUNT', icon: TrendingUp, tip: 'Increase', color: 'text-emerald-600 hover:bg-emerald-50' },
                                                                        { type: 'AMENDMENT', icon: Pencil, tip: 'Amend', color: 'text-violet-600 hover:bg-violet-50' },
                                                                    ].map(act => (
                                                                        <button
                                                                            key={act.type}
                                                                            title={act.tip}
                                                                            onClick={(e) => { e.stopPropagation(); setActiveAction({ lg: lg, type: act.type }); }}
                                                                            className={`p-1.5 rounded-lg transition-all ${act.color}`}
                                                                        >
                                                                            <act.icon className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    ))}
                                                                    <button
                                                                        title="Hand Over Ownership"
                                                                        onClick={(e) => { e.stopPropagation(); setSelectedLgForHandover(lg); setShowHandoverModal(true); }}
                                                                        className="p-1.5 rounded-lg transition-all text-orange-600 hover:bg-orange-50 ml-1"
                                                                    >
                                                                        <Users className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* =============== INCOMING HANDOVERS TAB =============== */}
                {activeTab === 'handovers' && incomingHandovers.length > 0 && (
                    <div className="space-y-4">
                        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 flex items-start gap-4">
                            <div className="p-3 bg-amber-100 text-amber-600 rounded-full mt-1">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-amber-800">Your colleagues have transferred LGs to you.</h3>
                                <p className="text-amber-700 text-sm mt-1">
                                    Please review and Accept the LGs below to take over the responsibility as the active Requestor.
                                </p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-left">
                                        <th className="px-5 py-4 font-semibold text-gray-500 uppercase tracking-wider">Reference</th>
                                        <th className="px-5 py-4 font-semibold text-gray-500 uppercase tracking-wider">Beneficiary</th>
                                        <th className="px-5 py-4 font-semibold text-gray-500 uppercase tracking-wider">Initiated By</th>
                                        <th className="px-5 py-4 font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {incomingHandovers.map(lg => (
                                        <tr key={lg.id} className="hover:bg-amber-50/30 transition-colors">
                                            <td className="px-5 py-4 font-bold text-gray-900">{lg.lg_ref_number || lg.bank_lg_number}</td>
                                            <td className="px-5 py-4 text-gray-700">{lg.beneficiary_name}</td>
                                            <td className="px-5 py-4">
                                                <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                                                    {lg.handover_initiated_by === 'ADMIN' ? 'Corporate Admin' : 'Colleague'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleAcceptHandover(lg.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-xs font-bold transition-colors">
                                                        <CheckCircle className="w-4 h-4" /> Accept
                                                    </button>
                                                    <button onClick={() => handleRejectHandover(lg.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold w-max transition-colors">
                                                        <XCircle className="w-4 h-4" /> Reject
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* =============== MY ACTIONS TAB =============== */}
                {activeTab === 'actions' && (
                    <div className="space-y-6">
                        {(() => {
                            const filteredActions = maintenanceActions.filter(a => {
                                if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
                                if (search) {
                                    const term = search.toLowerCase();
                                    return (
                                        (a.action_type || '').toLowerCase().includes(term) ||
                                        (a.lg_ref || '').toLowerCase().includes(term) ||
                                        (a.lg_beneficiary || '').toLowerCase().includes(term)
                                    );
                                }
                                return true;
                            });

                            const actionStatusBadge = (status) => {
                                const cfg = {
                                    'PENDING_APPROVAL': 'bg-amber-100 text-amber-700',
                                    'APPROVED': 'bg-blue-100 text-blue-700',
                                    'EXECUTED': 'bg-emerald-100 text-emerald-700',
                                    'REJECTED': 'bg-red-100 text-red-700',
                                    'CANCELLED': 'bg-gray-100 text-gray-500',
                                }[status] || 'bg-gray-100 text-gray-600';
                                return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg}`}>{status}</span>;
                            };

                            const instructionBadge = (iStatus) => {
                                if (!iStatus) return null;
                                const cfg = {
                                    'Instruction Issued': 'bg-indigo-100 text-indigo-700',
                                    'Instruction Delivered': 'bg-blue-100 text-blue-700',
                                    'Confirmed by Bank': 'bg-emerald-100 text-emerald-700',
                                    'Awaiting Confirmation': 'bg-amber-100 text-amber-700',
                                }[iStatus] || 'bg-gray-100 text-gray-600';
                                return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg}`}>{iStatus}</span>;
                            };

                            return filteredActions.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                                    <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <h3 className="text-lg font-semibold text-gray-700 mb-1">
                                        {maintenanceActions.length === 0 ? 'No Maintenance Actions' : 'No actions match your filter'}
                                    </h3>
                                    <p className="text-sm text-gray-400">
                                        {maintenanceActions.length === 0 ? 'When you request extensions, increases, or amendments they will appear here.' : 'Try adjusting your search or filter.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200 text-left">
                                                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                                                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">LG Reference</th>
                                                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Beneficiary</th>
                                                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Submitted</th>
                                                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                                <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Instruction</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredActions.map(a => (
                                                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                                            a.action_type === 'EXTEND' ? 'bg-blue-50 text-blue-700' :
                                                            a.action_type === 'INCREASE_AMOUNT' ? 'bg-emerald-50 text-emerald-700' :
                                                            a.action_type === 'CLOSE' ? 'bg-red-50 text-red-700' :
                                                            a.action_type === 'AMENDMENT' ? 'bg-violet-50 text-violet-700' :
                                                            'bg-gray-50 text-gray-700'
                                                        }`}>
                                                            {a.action_type === 'EXTEND' && <CalendarClock className="w-3 h-3" />}
                                                            {a.action_type === 'INCREASE_AMOUNT' && <TrendingUp className="w-3 h-3" />}
                                                            {a.action_type === 'CLOSE' && <XCircle className="w-3 h-3" />}
                                                            {a.action_type === 'AMENDMENT' && <Pencil className="w-3 h-3" />}
                                                            {a.action_type.replace('_', ' ')}
                                                        </span>
                                                        {a.notes && <p className="text-[10px] text-gray-400 mt-0.5 italic truncate max-w-[140px]">{a.notes}</p>}
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold text-gray-800">{a.lg_ref || '—'}</td>
                                                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell max-w-[120px] truncate">{a.lg_beneficiary || '—'}</td>
                                                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell whitespace-nowrap">{formatDate(a.created_at)}</td>
                                                    <td className="px-4 py-3">{actionStatusBadge(a.status)}</td>
                                                    <td className="px-4 py-3 hidden md:table-cell">{instructionBadge(a.instruction_status)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* Footer */}
                <div className="text-center mt-8 space-x-4">
                    <a href="/portal/issuance" className="text-sm text-gray-400 hover:text-blue-600 transition-colors">← Back to Portal</a>
                    <span className="text-gray-300">|</span>
                    <a href="/login" className="text-sm text-gray-400 hover:text-blue-600 transition-colors">Login →</a>
                </div>
            </main>

            {/* Read-only Request Detail Modal */}
            {(viewingRequest || viewLoading) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { if (!viewLoading) setViewingRequest(null); }}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        {viewLoading ? (
                            <div className="p-10 text-center">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">Loading request...</p>
                            </div>
                        ) : viewingRequest && (
                            <>
                                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900">{viewingRequest.serial_number}</h3>
                                        <StatusBadge status={viewingRequest.status} />
                                    </div>
                                    <button onClick={() => setViewingRequest(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
                                </div>
                                <div className="px-6 py-4 space-y-4">
                                    {/* Key Details */}
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        {viewingRequest.beneficiary_name && <div><span className="text-gray-400">Beneficiary</span><p className="font-semibold text-gray-800">{viewingRequest.beneficiary_name}</p></div>}
                                        {viewingRequest.amount && <div><span className="text-gray-400">Amount</span><p className="font-semibold text-gray-800">{viewingRequest.currency?.iso_code} {parseFloat(viewingRequest.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</p></div>}
                                        {viewingRequest.lg_type?.name && <div><span className="text-gray-400">LG Type</span><p className="font-semibold text-gray-800">{viewingRequest.lg_type.name}</p></div>}
                                        {viewingRequest.lg_purpose && <div><span className="text-gray-400">Purpose</span><p className="font-semibold text-gray-800">{viewingRequest.lg_purpose}</p></div>}
                                        {viewingRequest.requested_issue_date && <div><span className="text-gray-400">Issue Date</span><p className="font-medium text-gray-700">{formatDate(viewingRequest.requested_issue_date)}</p></div>}
                                        {viewingRequest.requested_expiry_date && <div><span className="text-gray-400">Expiry Date</span><p className="font-medium text-gray-700">{formatDate(viewingRequest.requested_expiry_date)}</p></div>}
                                        {viewingRequest.reference_type && <div><span className="text-gray-400">Reference</span><p className="font-medium text-gray-700">{viewingRequest.reference_type}: {viewingRequest.reference_number}</p></div>}
                                        {viewingRequest.department && <div><span className="text-gray-400">Department</span><p className="font-medium text-gray-700">{viewingRequest.department}</p></div>}
                                        {viewingRequest.lg_language && <div><span className="text-gray-400">LG Language</span><p className="font-medium text-gray-700">{viewingRequest.lg_language === 'EN' ? 'English' : 'Arabic'}</p></div>}
                                    </div>

                                    {/* Revision / Rejection Notes */}
                                    {viewingRequest.revision_notes && (
                                        <div className={`p-3 rounded-lg border text-xs ${viewingRequest.status === 'REJECTED' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                                            <span className={`font-bold uppercase tracking-wider ${viewingRequest.status === 'REJECTED' ? 'text-red-700' : 'text-amber-700'}`}>
                                                {viewingRequest.status === 'REJECTED' ? '✕ Rejection Reason' : '⟵ Revision Notes'}
                                            </span>
                                            <p className="text-gray-700 mt-1">{viewingRequest.revision_notes}</p>
                                        </div>
                                    )}

                                    {/* Activity Timeline */}
                                    {viewingRequest.approval_chain_audit?.length > 0 && (
                                        <div>
                                            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Activity Timeline</h4>
                                            <div className="space-y-1.5">
                                                {viewingRequest.approval_chain_audit.map((entry, idx) => {
                                                    const config = {
                                                        'SUBMITTED': { icon: Send, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Submitted for approval' },
                                                        'RESUBMITTED': { icon: RotateCcw, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Resubmitted after revision' },
                                                        'APPROVED': { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Approved' },
                                                        'APPROVED_STEP': { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Approved (step)' },
                                                        'FULLY_APPROVED': { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Fully approved' },
                                                        'REJECTED': { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Rejected' },
                                                        'REVISION_REQUIRED': { icon: RotateCcw, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Returned for revision' },
                                                        'SKIPPED_STEP': { icon: ArrowRight, color: 'text-gray-400', bg: 'bg-gray-50', label: `Step ${entry.step_sequence || '?'} skipped` },
                                                    }[entry.action] || { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50', label: entry.action };
                                                    const Icon = config.icon;
                                                    return (
                                                        <div key={idx} className={`flex items-start gap-2 p-2 rounded-lg ${config.bg}`}>
                                                            <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${config.color}`} />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-medium text-gray-800">{config.label}</span>
                                                                    {entry.timestamp && <span className="text-[10px] text-gray-400">{entry.timestamp}</span>}
                                                                </div>
                                                                {(entry.user_name || entry.step) && (
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        {entry.user_name && <span className="text-[10px] text-gray-500">by {entry.user_name}</span>}
                                                                        {entry.step && <span className="text-[10px] text-gray-400">· Step {entry.step}</span>}
                                                                    </div>
                                                                )}
                                                                {(entry.notes || entry.reason) && (
                                                                    <p className="text-[11px] text-gray-600 mt-0.5">"{entry.notes || entry.reason}"</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {viewingRequest.comments && (
                                        <div className="text-xs"><span className="text-gray-400">Comments</span><p className="text-gray-700 mt-0.5">{viewingRequest.comments}</p></div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Maintenance Action Modal */}
            <MaintenanceActionModal
                isOpen={!!activeAction}
                actionType={activeAction?.type}
                lg={activeAction?.lg}
                onClose={() => setActiveAction(null)}
                onSubmit={handleSubmitMaintenance}
                submitting={submittingAction}
            />

            {/* Change Requestor (Handover) Modal */}
            {showHandoverModal && selectedLgForHandover && (
                <ChangeRequestorModal
                    lgRecords={[selectedLgForHandover]}
                    onClose={() => { setShowHandoverModal(false); setSelectedLgForHandover(null); }}
                    onSuccess={() => { setShowHandoverModal(false); setSelectedLgForHandover(null); fetchIssuedLgs(); }}
                    isGracePeriod={false}
                    isPublicPortal={true}
                    publicToken={token}
                />
            )}
        </div>
    );
}
