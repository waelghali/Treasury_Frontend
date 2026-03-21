import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiRequest } from '../../services/apiService';
import { Loader2, CheckCircle, XCircle, Eye, Shield, Search, Inbox, RotateCcw, ArrowUp, ArrowDown, X, AlertTriangle, FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import IssuanceRequestDetailsModal from '../../components/Modals/IssuanceRequestDetailsModal';

export default function IssuanceApprovalInboxPage() {
    // Tab state
    const [activeTab, setActiveTab] = useState('requests');

    // === ISSUANCE REQUESTS STATE ===
    const [requests, setRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRequest, setSelectedRequest] = useState(null);

    // === DISCREPANCY REVIEWS STATE ===
    const [discrepancyLGs, setDiscrepancyLGs] = useState([]);
    const [loadingDiscrepancies, setLoadingDiscrepancies] = useState(true);
    const [discSearchTerm, setDiscSearchTerm] = useState('');
    const [processingDiscId, setProcessingDiscId] = useState(null);
    const [discNotes, setDiscNotes] = useState({});

    // === FETCH FUNCTIONS ===
    const fetchPendingApprovals = useCallback(async () => {
        try {
            setLoadingRequests(true);
            const data = await apiRequest('/issuance/my-pending-approvals', 'GET');
            setRequests(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch pending approvals:', err);
            toast.error('Failed to load pending approvals.');
        } finally {
            setLoadingRequests(false);
        }
    }, []);

    const fetchDiscrepancyReviews = useCallback(async () => {
        try {
            setLoadingDiscrepancies(true);
            const data = await apiRequest('/issuance/issued-lgs', 'GET');
            const allLGs = Array.isArray(data) ? data : [];
            // Filter for LGs with discrepancy verification status
            setDiscrepancyLGs(allLGs.filter(lg => lg.verification_status === 'DISCREPANCY'));
        } catch (err) {
            console.error('Failed to fetch discrepancy reviews:', err);
            toast.error('Failed to load discrepancy reviews.');
        } finally {
            setLoadingDiscrepancies(false);
        }
    }, []);

    useEffect(() => {
        fetchPendingApprovals();
        fetchDiscrepancyReviews();
    }, [fetchPendingApprovals, fetchDiscrepancyReviews]);

    // === REQUEST ACTIONS ===
    const handleAction = async (requestId, action, endpoint) => {
        if (!window.confirm(`Are you sure you want to ${action} this request?`)) return;
        try {
            setProcessingId(requestId);
            await apiRequest(`/issuance/requests/${requestId}/${endpoint}`, 'POST');
            toast.success(`Request ${action}d successfully`);
            fetchPendingApprovals();
        } catch (err) {
            toast.error(`Failed to ${action} request: ${err.message || 'Unknown error'}`);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReturnForRevision = async (requestId) => {
        const notes = window.prompt('Enter revision notes for the requestor (optional):');
        if (notes === null) return;
        try {
            setProcessingId(requestId);
            await apiRequest(`/issuance/requests/${requestId}/return-for-revision`, 'POST', {
                revision_notes: notes || null
            });
            toast.success('Request returned for revision — requestor will be notified');
            fetchPendingApprovals();
        } catch (err) {
            toast.error(`Failed to return request: ${err.message || 'Unknown error'}`);
        } finally {
            setProcessingId(null);
        }
    };

    // === DISCREPANCY ACTIONS ===
    const handleDiscrepancyApprove = async (lgId) => {
        const notes = discNotes[lgId] || '';
        if (!notes.trim()) {
            toast.error('Please provide a reason for accepting the discrepancies.');
            return;
        }
        if (!window.confirm('Accept these discrepancies and confirm the LG?')) return;
        try {
            setProcessingDiscId(lgId);
            await apiRequest(`/issuance/lg-records/${lgId}/verify`, 'PATCH', {
                force_accept: true,
                verification_notes: notes,
            });
            toast.success('Discrepancies accepted — LG confirmed.');
            fetchDiscrepancyReviews();
        } catch (err) {
            toast.error(`Failed to accept: ${err.message || 'Unknown error'}`);
        } finally {
            setProcessingDiscId(null);
        }
    };

    const handleDiscrepancyReject = async (lgId) => {
        if (!window.confirm('Reject these discrepancies? The end user will need to re-upload a corrected LG copy.')) return;
        try {
            setProcessingDiscId(lgId);
            await apiRequest(`/issuance/lg-records/${lgId}/verify`, 'PATCH', {
                force_accept: false,
                verification_notes: discNotes[lgId] || 'Discrepancies rejected by corporate admin.',
            });
            toast.success('Discrepancies rejected — end user will need to re-upload.');
            fetchDiscrepancyReviews();
        } catch (err) {
            toast.error(`Failed to reject: ${err.message || 'Unknown error'}`);
        } finally {
            setProcessingDiscId(null);
        }
    };

    // === SORTING ===
    const [sortField, setSortField] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');

    const toggleSort = (field) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return <ArrowUp className="w-3 h-3 text-gray-300 opacity-0 group-hover/th:opacity-100 transition-opacity" />;
        return sortDir === 'asc'
            ? <ArrowUp className="w-3 h-3 text-blue-600" />
            : <ArrowDown className="w-3 h-3 text-blue-600" />;
    };

    const filteredRequests = useMemo(() => {
        const term = searchTerm.toLowerCase();
        let result = requests.filter(req => {
            return !searchTerm ||
                (req.beneficiary_name?.toLowerCase() || '').includes(term) ||
                (req.requestor_name?.toLowerCase() || '').includes(term) ||
                (req.serial_number?.toLowerCase() || '').includes(term) ||
                (req.department?.toLowerCase() || '').includes(term) ||
                (req.reference_number?.toLowerCase() || '').includes(term);
        });

        result.sort((a, b) => {
            let valA, valB;
            switch (sortField) {
                case 'serial_number': valA = a.serial_number || ''; valB = b.serial_number || ''; break;
                case 'amount': valA = parseFloat(a.amount) || 0; valB = parseFloat(b.amount) || 0; break;
                case 'beneficiary_name': valA = a.beneficiary_name || ''; valB = b.beneficiary_name || ''; break;
                default: valA = a.created_at || ''; valB = b.created_at || ''; break;
            }
            if (typeof valA === 'number') return sortDir === 'asc' ? valA - valB : valB - valA;
            return sortDir === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
        });

        return result;
    }, [requests, searchTerm, sortField, sortDir]);

    const filteredDiscrepancies = useMemo(() => {
        const term = discSearchTerm.toLowerCase();
        return discrepancyLGs.filter(lg => {
            return !discSearchTerm ||
                (lg.beneficiary_name?.toLowerCase() || '').includes(term) ||
                (lg.lg_ref_number?.toLowerCase() || '').includes(term) ||
                (lg.bank_name?.toLowerCase() || '').includes(term) ||
                (lg.bank_lg_number?.toLowerCase() || '').includes(term);
        });
    }, [discrepancyLGs, discSearchTerm]);

    const formatCurrency = (amount, currency) => {
        if (!amount) return 'N/A';
        const num = parseFloat(amount);
        const formatted = num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return currency?.iso_code ? `${formatted} ${currency.iso_code}` : formatted;
    };

    const totalPending = requests.length + discrepancyLGs.length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Shield className="h-7 w-7 text-blue-600" />
                        Approval Center
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        All items requiring your approval — issuance requests, discrepancy reviews, and more
                    </p>
                </div>
                <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                    <span className="text-sm font-medium text-blue-700">{totalPending} pending</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`relative px-5 py-3 text-sm font-semibold transition-colors ${
                        activeTab === 'requests'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Issuance Requests
                    {requests.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">
                            {requests.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('discrepancies')}
                    className={`relative px-5 py-3 text-sm font-semibold transition-colors ${
                        activeTab === 'discrepancies'
                            ? 'text-amber-600 border-b-2 border-amber-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Discrepancy Reviews
                    {discrepancyLGs.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-full animate-pulse">
                            {discrepancyLGs.length}
                        </span>
                    )}
                </button>
            </div>

            {/* ============================================= */}
            {/* TAB: ISSUANCE REQUESTS                        */}
            {/* ============================================= */}
            {activeTab === 'requests' && (
                <>
                    {loadingRequests ? (
                        <div className="flex justify-center items-center p-16">
                            <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
                        </div>
                    ) : (
                        <>
                            {/* Search */}
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                <div className="flex gap-3 items-center">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by serial, beneficiary, requestor, department..."
                                            className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    {searchTerm && (
                                        <button onClick={() => setSearchTerm('')} className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium">
                                            <X className="w-3.5 h-3.5" /> Clear
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Count */}
                            <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>Showing <strong className="text-gray-700">{filteredRequests.length}</strong> of <strong className="text-gray-700">{requests.length}</strong> pending approvals</span>
                                {sortField !== 'created_at' && (
                                    <button onClick={() => { setSortField('created_at'); setSortDir('desc'); }} className="text-blue-600 hover:text-blue-700 font-medium">Reset sort</button>
                                )}
                            </div>

                            {/* Table */}
                            {filteredRequests.length === 0 ? (
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                                    <Inbox className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-600">No Pending Request Approvals</h3>
                                    <p className="text-sm text-gray-400 mt-1">
                                        {requests.length === 0
                                            ? 'You have no issuance requests awaiting your approval.'
                                            : 'No requests match your search criteria.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none group/th hover:text-gray-700 transition-colors" onClick={() => toggleSort('serial_number')}>
                                                        <div className="flex items-center gap-1">Serial / Requestor <SortIcon field="serial_number" /></div>
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none group/th hover:text-gray-700 transition-colors" onClick={() => toggleSort('beneficiary_name')}>
                                                        <div className="flex items-center gap-1">Beneficiary <SortIcon field="beneficiary_name" /></div>
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none group/th hover:text-gray-700 transition-colors" onClick={() => toggleSort('amount')}>
                                                        <div className="flex items-center gap-1">Amount <SortIcon field="amount" /></div>
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Step</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {filteredRequests.map(req => (
                                                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900">{req.serial_number || `#${req.id}`}</div>
                                                            <div className="text-xs text-gray-500">{req.requestor_name || 'Treasury'}</div>
                                                            <div className="text-xs text-gray-400">{req.requestor_email}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900">{req.beneficiary_name}</div>
                                                            <div className="text-xs text-gray-500">{req.beneficiary_country}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-semibold text-gray-900">
                                                                {formatCurrency(req.amount, req.currency)}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-700">{req.department || 'General'}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                                Step {req.current_approval_step || 1}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => setSelectedRequest(req)}
                                                                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                                                                    title="View Details"
                                                                >
                                                                    <Eye className="h-3.5 w-3.5 mr-1" /> View
                                                                </button>
                                                                <button
                                                                    onClick={() => handleAction(req.id, 'approve', 'approve')}
                                                                    disabled={processingId === req.id}
                                                                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                                                                    title="Approve"
                                                                >
                                                                    {processingId === req.id ? (
                                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                    ) : (
                                                                        <><CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve</>
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleReturnForRevision(req.id)}
                                                                    disabled={processingId === req.id}
                                                                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50"
                                                                    title="Return for Revision"
                                                                >
                                                                    {processingId === req.id ? (
                                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                    ) : (
                                                                        <><RotateCcw className="h-3.5 w-3.5 mr-1" /> Revise</>
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleAction(req.id, 'reject', 'reject')}
                                                                    disabled={processingId === req.id}
                                                                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                                                                    title="Reject"
                                                                >
                                                                    {processingId === req.id ? (
                                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                    ) : (
                                                                        <><XCircle className="h-3.5 w-3.5 mr-1" /> Reject</>
                                                                    )}
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
                        </>
                    )}
                </>
            )}

            {/* ============================================= */}
            {/* TAB: DISCREPANCY REVIEWS                      */}
            {/* ============================================= */}
            {activeTab === 'discrepancies' && (
                <>
                    {loadingDiscrepancies ? (
                        <div className="flex justify-center items-center p-16">
                            <Loader2 className="animate-spin h-8 w-8 text-amber-600" />
                        </div>
                    ) : (
                        <>
                            {/* Search */}
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                <div className="flex gap-3 items-center">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by LG reference, beneficiary, bank, bank LG #..."
                                            className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 border p-2"
                                            value={discSearchTerm}
                                            onChange={e => setDiscSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    {discSearchTerm && (
                                        <button onClick={() => setDiscSearchTerm('')} className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium">
                                            <X className="w-3.5 h-3.5" /> Clear
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Count */}
                            <div className="text-xs text-gray-500">
                                Showing <strong className="text-gray-700">{filteredDiscrepancies.length}</strong> of <strong className="text-gray-700">{discrepancyLGs.length}</strong> LGs with discrepancies
                            </div>

                            {/* Cards or Empty */}
                            {filteredDiscrepancies.length === 0 ? (
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                                    <CheckCircle className="h-12 w-12 text-emerald-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-600">No Discrepancies to Review</h3>
                                    <p className="text-sm text-gray-400 mt-1">
                                        All LG verifications are clean — no discrepancies pending your approval.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredDiscrepancies.map(lg => {
                                        const req = lg.request;
                                        return (
                                            <div key={lg.id} className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden">
                                                {/* Card Header */}
                                                <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                                                        <div>
                                                            <div className="font-bold text-gray-900">{lg.lg_ref_number || `LG #${lg.id}`}</div>
                                                            <div className="text-xs text-gray-500">
                                                                {lg.beneficiary_name} &middot; {lg.bank_name} &middot; {lg.currency_code} {parseFloat(lg.current_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="px-3 py-1 text-xs font-bold bg-amber-100 text-amber-800 rounded-full">
                                                        DISCREPANCY
                                                    </span>
                                                </div>

                                                {/* Discrepancy Details */}
                                                <div className="px-6 py-4 space-y-3">
                                                    {/* What was requested vs what bank confirmed */}
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Requested</p>
                                                            <p className="text-gray-700">Amount: {lg.currency_code} {req ? parseFloat(req.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : 'N/A'}</p>
                                                            <p className="text-gray-700">Beneficiary: {req?.beneficiary_name || lg.beneficiary_name}</p>
                                                            <p className="text-gray-700">Expiry: {req?.requested_expiry_date || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Bank Confirmed</p>
                                                            <p className="text-gray-700">Amount: {lg.currency_code} {parseFloat(lg.current_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                                            <p className="text-gray-700">Bank LG #: {lg.bank_lg_number || 'N/A'}</p>
                                                            <p className="text-gray-700">Expiry: {lg.expiry_date || 'N/A'}</p>
                                                        </div>
                                                    </div>

                                                    {/* Verification Notes (from AI comparison) */}
                                                    {lg.verification_notes && (
                                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Discrepancy Details</p>
                                                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{lg.verification_notes}</p>
                                                        </div>
                                                    )}

                                                    {/* Admin Notes Input */}
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-600 mb-1">Your Notes (required to accept)</label>
                                                        <textarea
                                                            rows={2}
                                                            value={discNotes[lg.id] || ''}
                                                            onChange={e => setDiscNotes(prev => ({ ...prev, [lg.id]: e.target.value }))}
                                                            placeholder="Explain why these discrepancies are acceptable..."
                                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:border-amber-400 focus:ring-amber-400"
                                                        />
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex items-center justify-end gap-3 pt-2">
                                                        <button
                                                            onClick={() => handleDiscrepancyReject(lg.id)}
                                                            disabled={processingDiscId === lg.id}
                                                            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
                                                        >
                                                            {processingDiscId === lg.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                                            ) : (
                                                                <XCircle className="h-4 w-4 mr-1" />
                                                            )}
                                                            Reject — Request Re-upload
                                                        </button>
                                                        <button
                                                            onClick={() => handleDiscrepancyApprove(lg.id)}
                                                            disabled={processingDiscId === lg.id || !(discNotes[lg.id] || '').trim()}
                                                            className="inline-flex items-center px-4 py-2 text-sm font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                                        >
                                                            {processingDiscId === lg.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                                            ) : (
                                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                            )}
                                                            Accept Discrepancies
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* Detail Modal */}
            {selectedRequest && (
                <IssuanceRequestDetailsModal
                    show={!!selectedRequest}
                    request={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                />
            )}
        </div>
    );
}
