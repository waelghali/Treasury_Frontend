import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/apiService';
import { 
  Loader2, CheckCircle, XCircle, Printer, Play, Search, Zap 
} from 'lucide-react';
import { toast } from 'react-toastify';
import IssuanceExecutionModal from '../../components/Modals/IssuanceExecutionModal';

export default function IssuanceRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedRequestForExecution, setSelectedRequestForExecution] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      // CORRECTED: URL First, Method Second
      const data = await apiRequest('/issuance/requests/', 'GET');
      setRequests(data);
    } catch (err) {
      // Don't toast error if it's just empty
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (requestId, action, endpoint) => {
    if (!window.confirm(`Are you sure you want to ${action} this request?`)) return;
    try {
      setProcessingId(requestId);
      // CORRECTED: URL First, Method Second
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
      'PENDING_APPROVAL': 'bg-yellow-100 text-yellow-800',
      'APPROVED_INTERNAL': 'bg-blue-100 text-blue-800',
      'ISSUED': 'bg-green-100 text-green-800',
      'REJECTED': 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status] || 'bg-gray-100'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const filteredRequests = requests.filter(req => {
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    const matchesSearch = 
      (req.beneficiary_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (req.requestor_name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
                type="text" 
                placeholder="Search beneficiary or requestor..." 
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
                <option value="DRAFT">Draft</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="APPROVED_INTERNAL">Ready for Bank</option>
                <option value="ISSUED">Issued</option>
                <option value="REJECTED">Rejected</option>
            </select>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID / Requestor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.length === 0 ? (
                <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500"><strong>This feature is coming soon</strong></td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">#{req.id}</div>
                      <div className="text-xs text-gray-500">{req.requestor_name || "Treasury"}</div>
                      <div className="text-xs text-blue-600">{req.business_details?.department}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 font-medium">{req.beneficiary_name}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">{req.business_details?.project_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {req.currency?.code || 'USD'} {parseFloat(req.amount).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                            {req.status === 'DRAFT' && (
                                <button onClick={() => handleStatusChange(req.id, 'submit', 'submit')} className="text-blue-600 hover:text-blue-900" title="Submit">
                                    <Play className="h-5 w-5" />
                                </button>
                            )}
                            {req.status === 'PENDING_APPROVAL' && (
                                <>
                                    <button onClick={() => handleStatusChange(req.id, 'approve', 'approve')} className="text-green-600 hover:text-green-900" title="Approve">
                                        <CheckCircle className="h-5 w-5" />
                                    </button>
                                    <button onClick={() => handleStatusChange(req.id, 'reject', 'reject')} className="text-red-600 hover:text-red-900" title="Reject">
                                        <XCircle className="h-5 w-5" />
                                    </button>
                                </>
                            )}
                            {req.status === 'APPROVED_INTERNAL' && (
                                <>
                                  <button onClick={() => handleDownloadPdf(req.id, req.id)} className="text-gray-600 hover:text-gray-900" title="Print Application">
                                      <Printer className="h-5 w-5" />
                                  </button>
                                  <button onClick={() => setSelectedRequestForExecution(req)} className="text-purple-600 hover:text-purple-900" title="Execute Issuance">
                                      <Zap className="h-5 w-5" />
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

      {selectedRequestForExecution && (
        <IssuanceExecutionModal 
           request={selectedRequestForExecution}
           onClose={() => setSelectedRequestForExecution(null)}
           onSuccess={fetchRequests}
        />
      )}
    </div>
  );
}