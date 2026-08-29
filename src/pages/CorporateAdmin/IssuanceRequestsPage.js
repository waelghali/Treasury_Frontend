import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../../services/apiService';
import {
  Loader2, CheckCircle, XCircle, Printer, Play, Search, Zap, Link as LinkIcon, Copy, Eye,
  ArrowUp, ArrowDown, X, SlidersHorizontal, Edit3
} from 'lucide-react';
import { toast } from 'react-toastify';
import IssuanceExecutionModal from '../../components/Modals/IssuanceExecutionModal';
import IssuanceRequestDetailsModal from '../../components/Modals/IssuanceRequestDetailsModal';
import { useNavigate, useLocation } from 'react-router-dom';
import { SkeletonTable } from '../../components/SkeletonLoader';

export default function IssuanceRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  const [selectedRequestForExecution, setSelectedRequestForExecution] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const location = useLocation();
  const openRequestId = location.state?.openRequestId;
  const executeRequestId = location.state?.executeRequestId;

  // Auto-open requested modal if passed via navigation state
  useEffect(() => {
    if (requests.length > 0) {
      if (executeRequestId) {
        const match = requests.find(r => String(r.id) === String(executeRequestId));
        if (match && !selectedRequestForExecution) {
          setSelectedRequestForExecution(match);
          navigate(location.pathname, { replace: true, state: {} });
        }
      } else if (openRequestId) {
        const match = requests.find(r => String(r.id) === String(openRequestId));
        if (match && !selectedRequest) {
          setSelectedRequest(match);
          navigate(location.pathname, { replace: true, state: {} });
        }
      }
    }
  }, [openRequestId, executeRequestId, requests, selectedRequest, selectedRequestForExecution, navigate, location.pathname]);

  // --- Path B: Invite Testing State ---
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '' });
  const [generatedLink, setGeneratedLink] = useState('');

  // Get current user ID and role from JWT
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  useEffect(() => {
    try {
      const token = localStorage.getItem('jwt_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.user_id);
        setUserRole(payload.role);
      }
    } catch (e) { /* ignore parse errors */ }
  }, []);

  const isEndUser = userRole === 'end_user';
  const isCorporateAdmin = userRole === 'corporate_admin' || userRole === 'checker';

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/issuance/requests/', 'GET');
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvite = async (e) => {
    e.preventDefault();
    try {
      // Calls the specialized endpoint in public_issuance.py
      const response = await apiRequest('/public-issuance/generate-invite', 'POST', inviteData);
      setGeneratedLink(response.invite_link);
      toast.success("Invite link generated!");
    } catch (err) {
      toast.error("Failed to generate link. Ensure the email domain is registered.");
    }
  };

  const handleStatusChange = async (requestId, action, endpoint) => {
    if (!window.confirm(`Are you sure you want to ${action} this request?`)) return;
    try {
      setProcessingId(requestId);
      await apiRequest(`/issuance/requests/${requestId}/${endpoint}`, 'POST');
      toast.success(`Request ${action}d successfully`);
      fetchRequests();
    } catch (err) {
      toast.error(`Failed to ${action} request`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownloadPdf = async (requestId, refNumber) => {
    try {
      setProcessingId(requestId);
      const token = localStorage.getItem('jwt_token');
      const response = await fetch(`/api/v1/issuance/requests/${requestId}/print-form`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Application_${refNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      toast.error("Failed to download PDF application.");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'DRAFT': 'bg-gray-100 text-gray-800',
      'SUBMITTED': 'bg-blue-100 text-blue-800',
      'PENDING_APPROVAL': 'bg-yellow-100 text-yellow-800',
      'REVISION_REQUIRED': 'bg-amber-100 text-amber-800',
      'APPROVED_INTERNAL': 'bg-blue-100 text-blue-800',
      'FACILITY_RESERVED': 'bg-amber-100 text-amber-800',
      'INTERNAL_PROCESSING': 'bg-purple-100 text-purple-800',
      'ISSUED': 'bg-green-100 text-green-800',
      'REJECTED': 'bg-red-100 text-red-800',
      'CANCELLATION_REQUESTED': 'bg-red-100 text-red-800 border border-red-300',
      'EDIT_REQUESTED': 'bg-orange-100 text-orange-800 border border-orange-200',
      'CANCELLED': 'bg-gray-200 text-gray-600',
    };
    const labels = {
      'APPROVED_INTERNAL': 'Ready for Bank',
      'FACILITY_RESERVED': 'Reserved',
      'INTERNAL_PROCESSING': 'Processing',
      'CANCELLATION_REQUESTED': 'Cancel Pending',
      'EDIT_REQUESTED': 'Edit Pending',
      'CANCELLED': 'Cancelled',
    };
    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status.replace(/_/g, ' ')}
      </span>
    );
  };

  // Derive unique statuses dynamically
  const uniqueStatuses = useMemo(() => {
    return [...new Set(requests.map(r => r.status))].filter(Boolean).sort();
  }, [requests]);

  const statusLabelsMap = {
    'DRAFT': 'Draft',
    'SUBMITTED': 'Submitted',
    'PENDING_APPROVAL': 'Pending Approval',
    'REVISION_REQUIRED': 'Revision Required',
    'APPROVED_INTERNAL': 'Ready for Bank',
    'FACILITY_RESERVED': 'Reserved',
    'INTERNAL_PROCESSING': 'Processing',
    'ISSUED': 'Issued',
    'REJECTED': 'Rejected',
    'CANCELLATION_REQUESTED': 'Cancel Pending',
    'EDIT_REQUESTED': 'Edit Pending',
    'CANCELLED': 'Cancelled',
  };

  // Filter count for badge
  const activeFilterCount = [
    statusFilter !== 'ALL',
    dateFrom,
    dateTo,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setDateFrom('');
    setDateTo('');
  };

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
    const s = searchTerm.toLowerCase();
    let result = requests.filter(req => {
      const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
      const matchesSearch = !searchTerm ||
        (req.beneficiary_name?.toLowerCase() || '').includes(s) ||
        (req.requestor_name?.toLowerCase() || '').includes(s) ||
        (req.serial_number?.toLowerCase() || '').includes(s) ||
        (req.reference_number?.toLowerCase() || '').includes(s) ||
        String(req.id).includes(s);
      const matchDateFrom = !dateFrom || (req.created_at && req.created_at.slice(0, 10) >= dateFrom);
      const matchDateTo = !dateTo || (req.created_at && req.created_at.slice(0, 10) <= dateTo);
      return matchesStatus && matchesSearch && matchDateFrom && matchDateTo;
    });

    // Sort
    result.sort((a, b) => {
      let valA, valB;
      switch (sortField) {
        case 'serial_number': valA = a.serial_number || ''; valB = b.serial_number || ''; break;
        case 'amount': valA = parseFloat(a.amount) || 0; valB = parseFloat(b.amount) || 0; break;
        case 'beneficiary_name': valA = a.beneficiary_name || ''; valB = b.beneficiary_name || ''; break;
        case 'lg_type': valA = a.lg_type?.name || ''; valB = b.lg_type?.name || ''; break;
        case 'status': valA = a.status || ''; valB = b.status || ''; break;
        default: valA = a.created_at || ''; valB = b.created_at || ''; break;
      }
      if (typeof valA === 'number') return sortDir === 'asc' ? valA - valB : valB - valA;
      return sortDir === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });

    return result;
  }, [requests, searchTerm, statusFilter, dateFrom, dateTo, sortField, sortDir]);

  if (loading) return <div className="p-6"><SkeletonTable rows={6} cols={6} /></div>;

  return (
    <div className="space-y-6">
      {/* Header with Invite Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Issuance Requests</h1>
        {(isCorporateAdmin || isEndUser) && (
          <button
            onClick={() => { setShowInviteModal(true); setGeneratedLink(''); }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm"
          >
            <LinkIcon className="h-4 w-4" />
            Generate Invite
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by serial, beneficiary, requestor, reference..."
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              {uniqueStatuses.map(st => (
                  <option key={st} value={st}>{statusLabelsMap[st] || st.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters || activeFilterCount > 0 ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{activeFilterCount}</span>
            )}
          </button>
          {(activeFilterCount > 0 || searchTerm) && (
            <button onClick={clearAllFilters} className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Expanded date filter */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-100">
            <div className="min-w-[140px]">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Created From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div className="min-w-[140px]">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Created To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
          </div>
        )}
      </div>

      {/* Result Count */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Showing <strong className="text-gray-700">{filteredRequests.length}</strong> of <strong className="text-gray-700">{requests.length}</strong> requests</span>
        {sortField !== 'created_at' && (
          <button onClick={() => { setSortField('created_at'); setSortDir('desc'); }} className="text-blue-600 hover:text-blue-700 font-medium">Reset sort</button>
        )}
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none group/th hover:text-gray-700 transition-colors" onClick={() => toggleSort('serial_number')}>
                  <div className="flex items-center gap-1">Serial / Requestor <SortIcon field="serial_number" /></div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none group/th hover:text-gray-700 transition-colors" onClick={() => toggleSort('beneficiary_name')}>
                  <div className="flex items-center gap-1">Beneficiary <SortIcon field="beneficiary_name" /></div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none group/th hover:text-gray-700 transition-colors" onClick={() => toggleSort('lg_type')}>
                  <div className="flex items-center gap-1">LG Type <SortIcon field="lg_type" /></div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none group/th hover:text-gray-700 transition-colors" onClick={() => toggleSort('amount')}>
                  <div className="flex items-center gap-1">Amount <SortIcon field="amount" /></div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none group/th hover:text-gray-700 transition-colors" onClick={() => toggleSort('status')}>
                  <div className="flex items-center gap-1">Status <SortIcon field="status" /></div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-10 text-center text-gray-500">
                    {activeFilterCount > 0 || searchTerm
                      ? 'No requests match your filters. Try adjusting your criteria.'
                      : 'No requests found.'}
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-blue-50 transition-colors cursor-pointer" onClick={() => setSelectedRequest(req)}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{req.serial_number || `#${req.id}`}</div>
                      <div className="text-xs text-gray-500">{req.requestor_name || "Treasury"}</div>
                      <div className="text-xs text-blue-600">{req.business_details?.department}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900 font-medium">{req.beneficiary_name}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">{req.business_details?.project_name}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-bold text-gray-900">{req.lg_type?.name || '—'}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[120px]" title={req.lg_purpose}>{req.lg_purpose || ''}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {req.currency?.iso_code || ''} {parseFloat(req.amount).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end space-x-2">
                        {/* Edit — visible for all pre-issuance statuses */}
                        {!['ISSUED', 'REJECTED', 'INTERNAL_PROCESSING', 'COMPLETED', 'CANCELLED', 'CANCELLATION_REQUESTED', 'EDIT_REQUESTED'].includes(req.status) && !req.locked_for_issuance && (
                          <button onClick={() => navigate(`edit/${req.id}`)} className="text-amber-600 hover:text-amber-900" title="Edit Request">
                            <Edit3 className="h-5 w-5" />
                          </button>
                        )}
                        {req.status === 'DRAFT' && (
                          <button onClick={() => handleStatusChange(req.id, 'submit', 'submit')} className="text-blue-600 hover:text-blue-900" title="Submit">
                            <Play className="h-5 w-5" />
                          </button>
                        )}

                        {/* Approve actions — corporate_admin only, for PENDING_APPROVAL requests */}
                        {isCorporateAdmin && req.status === 'PENDING_APPROVAL' && req.pending_approver_users?.map(String).includes(String(currentUserId)) && (
                          <>
                            <button onClick={() => handleStatusChange(req.id, 'approve', 'approve')} className="text-green-600 hover:text-green-900" title="Approve">
                              <CheckCircle className="h-5 w-5" />
                            </button>
                            <button onClick={() => handleStatusChange(req.id, 'reject', 'reject')} className="text-red-600 hover:text-red-900" title="Reject">
                              <XCircle className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- PATH B: INVITE MODAL --- */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">Generate Unique Invite Link</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>

            {!generatedLink ? (
              <form onSubmit={handleGenerateInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requestor Email</label>
                  <input
                    type="email" required
                    placeholder="name@company.com"
                    className="block w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                    value={inviteData.email}
                    onChange={e => setInviteData({ ...inviteData, email: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Link will only work for this email domain.</p>
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-md font-semibold hover:bg-blue-700 transition">
                  Create Tokenized Link
                </button>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-400 uppercase font-bold mb-2">Secure Invite URL</p>
                  <p className="text-sm text-blue-700 font-mono break-all bg-white p-2 border rounded shadow-inner">
                    {generatedLink}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLink);
                      toast.info("Copied to clipboard!");
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-md font-semibold hover:bg-green-700 transition"
                  >
                    <Copy className="h-4 w-4" />
                    Copy to Test
                  </button>
                  <button
                    onClick={() => setGeneratedLink('')}
                    className="px-4 py-2.5 border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
                  >
                    Back
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center italic">
                  Paste this into a new browser tab to test the direct form access.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedRequestForExecution && (
        <IssuanceExecutionModal
          request={selectedRequestForExecution}
          onClose={() => setSelectedRequestForExecution(null)}
          onSuccess={fetchRequests}
        />
      )}

      {selectedRequest && (
        <IssuanceRequestDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onStatusChange={(action, req) => {
            if (action === 'EXECUTE') {
              setSelectedRequest(null);
              setSelectedRequestForExecution(req || selectedRequest);
            } else if (action === 'PRINT') {
              handleDownloadPdf((req || selectedRequest).id, (req || selectedRequest).id);
            } else {
              // Default: refresh list and close the modal (e.g. after issuance, approval, etc.)
              setSelectedRequest(null);
              fetchRequests();
            }
          }}
        />
      )}
    </div>
  );
}