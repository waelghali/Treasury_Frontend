// frontend/src/pages/EndUser/EndUserPendingApprovalsPage.js
import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/apiService';
import { Loader2, AlertCircle, Eye, XCircle, CheckCircle } from 'lucide-react';
import moment from 'moment';
import { toast } from 'react-toastify';
import ApprovalRequestDetailsModal from '../../components/Modals/ApprovalRequestDetailsModal';
import { jwtDecode } from 'jwt-decode';

// NEW: A reusable component to provide a tooltip for disabled elements during the grace period.
const GracePeriodTooltip = ({ children, isGracePeriod }) => {
    if (isGracePeriod) {
        return (
            <div className="relative group inline-block">
                {children}
                <div className="opacity-0 w-max bg-slate-900 text-white text-xs rounded-lg py-2 px-3 absolute z-10 bottom-full left-1/2 -translate-x-1/2 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-lg">
                    This action is disabled during your subscription's grace period.
                    <svg className="absolute text-slate-900 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                        <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
                    </svg>
                </div>
            </div>
        );
    }
    return children;
};

const buttonBaseClassNames = "inline-flex items-center px-3 py-1 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200";

function EndUserPendingApprovalsPage({ isGracePeriod }) { // NEW: Accept isGracePeriod prop
    const [approvalRequests, setApprovalRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('jwt_token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setCurrentUserId(decoded.user_id);
            } catch (error) {
                console.error("Failed to decode token for user ID:", error);
                toast.error("Failed to retrieve user information. Please log in again.");
            }
        }
    }, []);

    const fetchApprovalRequests = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await apiRequest('/end-user/approval-requests/my-pending', 'GET');
            setApprovalRequests(response);
        } catch (err) {
            console.error("Failed to fetch approval requests:", err);
            setError(`Failed to load approval requests. ${err.message || 'An unexpected error occurred.'}`);
            toast.error(`Failed to load approval requests: ${err.message || 'An unexpected error occurred.'}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (currentUserId) {
            fetchApprovalRequests();
        }
    }, [currentUserId]);

    const handleViewDetails = (request) => {
        setSelectedRequest(request);
        setShowDetailsModal(true);
    };

    const handleWithdraw = async (requestId) => {
        if (isGracePeriod) { // NEW: Grace period check
            toast.warn("This action is disabled during your subscription's grace period.");
            return;
        }
        if (!window.confirm("Are you sure you want to WITHDRAW this request? This action cannot be undone.")) {
            return;
        }
        try {
            await apiRequest(`/end-user/approval-requests/${requestId}/withdraw`, 'POST');
            toast.success("Approval request withdrawn successfully!");
            fetchApprovalRequests();
            if (selectedRequest && selectedRequest.id === requestId) {
                setShowDetailsModal(false);
            }
        } catch (err) {
            console.error("Failed to withdraw request:", err);
            toast.error(`Failed to withdraw request: ${err.message || 'An unexpected error occurred.'}`);
        }
    };

    const formatActionType = (actionType) => {
        if (!actionType) return 'N/A';
        return actionType.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    };

    const canWithdraw = (request) => {
        return request.status === 'PENDING' && request.maker_user && request.maker_user.id === currentUserId;
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">My Pending Approval Requests</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Track the status of your submitted approval requests.</p>
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl relative mb-4 flex items-center text-sm" role="alert">
                    <AlertCircle className="h-5 w-5 mr-2 shrink-0" />
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-10">
                    <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto" />
                    <p className="text-slate-500 text-sm mt-2">Loading approval requests...</p>
                </div>
            ) : approvalRequests.length === 0 ? (
                <div className="bg-emerald-50/60 p-6 rounded-2xl text-center border border-dashed border-emerald-200">
                    <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-emerald-800 text-sm font-medium">No pending approval requests submitted by you at this time. All clear!</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200/90">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-3.5 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">LG Number</th>
                                <th scope="col" className="px-3.5 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Action Type</th>
                                <th scope="col" className="px-3.5 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Requested By</th>
                                <th scope="col" className="px-3.5 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Requested On</th>
                                <th scope="col" className="px-3.5 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-3.5 py-2.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {approvalRequests.map((request) => (
                                <tr
                                    key={request.id}
                                    onClick={() => handleViewDetails(request)}
                                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                                >
                                    <td className="px-3.5 py-2.5 whitespace-nowrap text-xs sm:text-sm font-semibold text-slate-900">
                                        {request.action_type === 'LG_CHANGE_BULK_LG_OWNER'
                                            ? `Bulk Handover (${request.request_details?.affected_lgs?.length ?? request.request_details?.affected_lg_numbers?.length ?? 0} LGs)`
                                            : (request.lg_record?.lg_number || 'N/A')}
                                    </td>
                                    <td className="px-3.5 py-2.5 whitespace-nowrap text-xs sm:text-sm text-slate-600">{formatActionType(request.action_type)}</td>
                                    <td className="px-3.5 py-2.5 max-w-[200px] truncate text-xs sm:text-sm text-slate-600" title={request.maker_user?.email || 'N/A'}>
                                        {request.maker_user?.email || 'N/A'}
                                    </td>
                                    <td className="px-3.5 py-2.5 whitespace-nowrap text-xs sm:text-sm text-slate-500 tabular-nums">{moment(request.created_at).format('DD-MMM-YYYY HH:mm')}</td>
                                    <td className="px-3.5 py-2.5 whitespace-nowrap text-xs">
                                        <span className={`px-2 py-0.5 inline-flex text-[11px] leading-4 font-semibold rounded-full ${
                                            request.status === 'PENDING' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                                            request.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                            request.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                            request.status === 'WITHDRAWN' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                                            'bg-slate-100 text-slate-700 border border-slate-200'
                                        }`}>
                                            {request.status}
                                        </span>
                                    </td>
                                    <td className="px-3.5 py-2.5 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => handleViewDetails(request)}
                                            className="text-blue-600 hover:text-blue-800 mr-1.5 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                                            title="View Details"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                        {canWithdraw(request) ? (
                                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                <button
                                                    onClick={() => handleWithdraw(request.id)}
                                                    className={`text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition-colors ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    title="Withdraw Request"
                                                    disabled={isGracePeriod} // NEW: Disable the button
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                </button>
                                            </GracePeriodTooltip>
                                        ) : (
                                            <span className="text-slate-400 text-xs italic">No actions</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showDetailsModal && selectedRequest && (
                <ApprovalRequestDetailsModal
                    request={selectedRequest}
                    onClose={() => setShowDetailsModal(false)}
                    onApprove={null}
                    onReject={null}
                    onWithdraw={canWithdraw(selectedRequest) ? handleWithdraw : null}
                    isEndUserView={true}
                    isGracePeriod={isGracePeriod} // NEW: Pass prop
                />
            )}
        </div>
    );
}

export default EndUserPendingApprovalsPage;