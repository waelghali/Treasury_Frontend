import React, { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { apiRequest } from '../../services/apiService';
import { Loader2, AlertCircle, Eye, Check, X, ChevronDown, ChevronUp, Download, XCircle, Search, AlertTriangle, CheckCircle, RotateCcw, Shield, Settings, Wrench } from 'lucide-react';
import moment from 'moment';
import { toast } from 'react-toastify';
import ApprovalRequestDetailsModal from '../../components/Modals/ApprovalRequestDetailsModal';
import IssuanceRequestDetailsModal from '../../components/Modals/IssuanceRequestDetailsModal';
import MaintenanceActionApprovalModal from '../../components/Modals/MaintenanceActionApprovalModal';
import { Listbox, Transition, Menu } from '@headlessui/react';
import * as XLSX from 'xlsx';

// NEW: A reusable component to provide a tooltip for disabled elements during the grace period.
const GracePeriodTooltip = ({ children, isGracePeriod }) => {
    if (isGracePeriod) {
        return (
            <div className="relative group inline-block">
                {children}
                <div className="opacity-0 w-max bg-gray-800 text-white text-xs rounded-lg py-2 px-3 absolute z-10 bottom-full left-1/2 -translate-x-1/2 pointer-events-none group-hover:opacity-100 transition-opacity duration-200">
                    This action is disabled during your subscription's grace period.
                    <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                        <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
                    </svg>
                </div>
            </div>
        );
    }
    return children;
};

const buttonBaseClassNames = "inline-flex items-center px-3 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200";

function PendingApprovalsPage({ isGracePeriod }) { 
    const [approvalRequests, setApprovalRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);

    // User role (to hide irrelevant tabs for checkers)
    const [userRole, setUserRole] = useState(null);

    // Tab state
    const [activeTab, setActiveTab] = useState('lg-actions');

    // Discrepancy Reviews state
    const [discrepancyLGs, setDiscrepancyLGs] = useState([]);
    const [loadingDiscrepancies, setLoadingDiscrepancies] = useState(true);
    const [processingDiscId, setProcessingDiscId] = useState(null);

    // LG Cancellation Requests state
    const [cancelRequestedLGs, setCancelRequestedLGs] = useState([]);
    const [discNotes, setDiscNotes] = useState({});
    const [hasIssuanceModule, setHasIssuanceModule] = useState(false);

    // Issuance Request Approvals state
    const [issuanceRequests, setIssuanceRequests] = useState([]);
    const [loadingIssuance, setLoadingIssuance] = useState(true);
    const [processingIssuanceId, setProcessingIssuanceId] = useState(null);
    const [selectedIssuanceRequest, setSelectedIssuanceRequest] = useState(null);

    // Filters for Issuance tab
    const [issuanceStatusFilter, setIssuanceStatusFilter] = useState('ALL');
    const [issuanceSearch, setIssuanceSearch] = useState('');
    // Filters for Discrepancy tab
    const [discStatusFilter, setDiscStatusFilter] = useState('ALL');

    // K1: Admin Change Requests state
    const [adminChanges, setAdminChanges] = useState([]);
    const [loadingAdminChanges, setLoadingAdminChanges] = useState(true);
    const [processingChangeId, setProcessingChangeId] = useState(null);
    const [currentUserEmail, setCurrentUserEmail] = useState('');
    const [userLookup, setUserLookup] = useState({}); // id → email map

    // Maintenance Actions state
    const [maintenanceActions, setMaintenanceActions] = useState([]);
    const [loadingMaintenance, setLoadingMaintenance] = useState(true);
    const [processingMaintenanceId, setProcessingMaintenanceId] = useState(null);
    const [selectedMaintenanceAction, setSelectedMaintenanceAction] = useState(null);

    // Filtering and Sorting State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatuses, setSelectedStatuses] = useState([]);
    
    // Date Range State
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [sortColumn, setSortColumn] = useState('created_at');
    const [sortDirection, setSortDirection] = useState('desc');

    const fetchApprovalRequests = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await apiRequest('/corporate-admin/approval-requests/', 'GET');
            setApprovalRequests(response);
        } catch (err) {
            // Checkers don't have access to custody approval endpoints — silently skip
            if (err?.statusCode === 403) {
                setApprovalRequests([]);
            } else {
                console.error("Failed to fetch approval requests:", err);
                setError(`Failed to load approval requests. ${err.message || 'An unexpected error occurred.'}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDiscrepancyReviews = useCallback(async () => {
        try {
            setLoadingDiscrepancies(true);
            const data = await apiRequest('/issuance/issued-lgs', 'GET');
            const allLGs = Array.isArray(data) ? data : [];
            // Show DISCREPANCY (pending), ACCEPTED (approved history), DISCREPANCY_REJECTED (rejected history)
            setDiscrepancyLGs(allLGs.filter(lg => 
                lg.verification_status === 'DISCREPANCY' || 
                lg.verification_status === 'ACCEPTED' || 
                lg.verification_status === 'DISCREPANCY_REJECTED'
            ));
            // Extract LGs pending cancellation approval
            setCancelRequestedLGs(allLGs.filter(lg => lg.status === 'CANCEL_REQUESTED'));
            setHasIssuanceModule(true);
        } catch (err) {
            console.error('Failed to fetch discrepancy reviews:', err);
        } finally {
            setLoadingDiscrepancies(false);
        }
    }, []);

    const fetchIssuanceApprovals = useCallback(async () => {
        try {
            setLoadingIssuance(true);
            const data = await apiRequest('/issuance/my-approval-history', 'GET');
            setIssuanceRequests(Array.isArray(data) ? data : []);
            setHasIssuanceModule(true);
        } catch (err) {
            console.error('Failed to fetch issuance approvals:', err);
        } finally {
            setLoadingIssuance(false);
        }
    }, []);

    // K1: Fetch admin change requests + build user lookup map
    const fetchAdminChanges = useCallback(async () => {
        try {
            setLoadingAdminChanges(true);
            const [data, users] = await Promise.all([
                apiRequest('/issuance/admin/change-requests', 'GET'),
                apiRequest('/corporate-admin/users/', 'GET').catch(() => []),
            ]);
            setAdminChanges(Array.isArray(data) ? data : []);
            // Build id → email lookup
            const lookup = {};
            (Array.isArray(users) ? users : []).forEach(u => { if (u.id) lookup[u.id] = u.email || `User #${u.id}`; });
            setUserLookup(lookup);
        } catch (err) {
            // Checkers don't have access to admin change-request endpoint — silently skip
            if (err?.statusCode === 403) {
                setAdminChanges([]);
            } else {
                console.error('Failed to fetch admin changes:', err);
            }
        } finally {
            setLoadingAdminChanges(false);
        }
    }, []);

    // Fetch all maintenance actions (including history)
    const fetchMaintenanceActions = useCallback(async () => {
        try {
            setLoadingMaintenance(true);
            const data = await apiRequest('/issuance/maintenance/approval-history', 'GET');
            setMaintenanceActions(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch maintenance actions:', err);
        } finally {
            setLoadingMaintenance(false);
        }
    }, []);

    useEffect(() => {
        // Get current user role and email from token
        let userRole = null;
        try {
            const token = localStorage.getItem('jwt_token');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setCurrentUserEmail(payload.sub || '');
                userRole = payload.role;
                setUserRole(payload.role);
            }
        } catch (e) { /* ignore */ }

        // Fetch approval requests (Custody/Maintenance) for both roles, 
        // Admin changes still restricted to corporate_admin
        fetchApprovalRequests();
        if (userRole !== 'checker') {
            fetchAdminChanges();
        } else {
            setAdminChanges([]);
        }
        // These endpoints work for both corporate_admin and checker
        fetchDiscrepancyReviews();
        fetchIssuanceApprovals();
        fetchMaintenanceActions();
    }, []);

    const handleViewDetails = (request) => {
        setSelectedRequest(request);
        setShowDetailsModal(true);
    };

    const handleActionClick = (e, callback) => {
        e.stopPropagation();
        callback();
    };

    const handleApprove = async (requestId) => {
        if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
            return;
        }
        if (!window.confirm("Are you sure you want to APPROVE this request?")) {
            return;
        }
        try {
            await apiRequest(`/corporate-admin/approval-requests/${requestId}/approve`, 'POST');
            toast.success("Approval request approved successfully!");
            fetchApprovalRequests();
            if (selectedRequest && selectedRequest.id === requestId) {
                setShowDetailsModal(false);
            }
        } catch (err) {
            console.error("Failed to approve request:", err);
            toast.error(`Failed to approve request: ${err.message || 'An unexpected error occurred.'}`);
        }
    };

    const handleReject = async (requestId, reason = "") => {
        if (isGracePeriod) {
            toast.warn("This action is disabled during your subscription's grace period.");
            return;
        }
        const rejectionReason = window.prompt("Are you sure you want to REJECT this request? Please provide a reason (optional):", reason);
        if (rejectionReason === null) {
            return;
        }

        try {
            await apiRequest(`/corporate-admin/approval-requests/${requestId}/reject`, 'POST', { reason: rejectionReason });
            toast.success("Approval request rejected successfully!");
            fetchApprovalRequests();
            if (selectedRequest && selectedRequest.id === requestId) {
                setShowDetailsModal(false);
            }
        } catch (err) {
            console.error("Failed to reject request:", err);
            toast.error(`Failed to reject request: ${err.message || 'An unexpected error occurred.'}`);
        }
    };

    const formatActionType = (actionType) => {
        if (!actionType) return 'N/A';
        return actionType.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    };

    const getDeciderName = (request) => {
        if (request.status === 'PENDING' || request.status === 'WITHDRAWN') return '-';
        if (request.checker_user?.email) return request.checker_user.email;
        return 'System';
    };

    // --- Filtering and Sorting Logic ---

    const uniqueStatuses = useMemo(() => {
        const statuses = new Set();
        approvalRequests.forEach(request => {
            if (request.status) statuses.add(request.status);
        });
        return Array.from(statuses).sort();
    }, [approvalRequests]);

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setSelectedStatuses([]);
        setDateFrom('');
        setDateTo('');
    };

    const filteredAndSortedRequests = useMemo(() => {
        if (!approvalRequests || approvalRequests.length === 0) return [];

        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const fromDate = dateFrom ? moment(dateFrom).startOf('day') : null;
        const toDate = dateTo ? moment(dateTo).endOf('day') : null;

        const filtered = approvalRequests.filter(request => {
            const makerEmail = (request.maker_user?.email || '').toLowerCase();
            const checkerEmail = (getDeciderName(request) || '').toLowerCase();
            const lgNumber = (request.lg_record?.lg_number || '').toLowerCase();
            const actionType = formatActionType(request.action_type).toLowerCase();

            const matchesSearchTerm = (
                lgNumber.includes(lowerCaseSearchTerm) ||
                actionType.includes(lowerCaseSearchTerm) ||
                makerEmail.includes(lowerCaseSearchTerm) ||
                checkerEmail.includes(lowerCaseSearchTerm)
            );

            const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(request.status);
            
            let matchesDate = true;
            if (fromDate || toDate) {
                const requestDate = moment(request.created_at);
                if (fromDate && requestDate.isBefore(fromDate)) matchesDate = false;
                if (toDate && requestDate.isAfter(toDate)) matchesDate = false;
            }

            return matchesSearchTerm && matchesStatus && matchesDate;
        });

        const sorted = [...filtered];

        sorted.sort((a, b) => {
            let aValue, bValue;

            switch (sortColumn) {
                case 'lg_number': aValue = a.lg_record?.lg_number || ''; bValue = b.lg_record?.lg_number || ''; break;
                case 'action_type': aValue = a.action_type || ''; bValue = b.action_type || ''; break;
                case 'maker': aValue = a.maker_user?.email || ''; bValue = b.maker_user?.email || ''; break;
                case 'checker': aValue = getDeciderName(a); bValue = getDeciderName(b); break;
                case 'created_at': aValue = new Date(a.created_at); bValue = new Date(b.created_at); break;
                case 'status': aValue = a.status || ''; bValue = b.status || ''; break;
                default: aValue = a[sortColumn]; bValue = b[sortColumn];
            }

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [approvalRequests, searchTerm, selectedStatuses, dateFrom, dateTo, sortColumn, sortDirection]);

    const renderSortIcon = (column) => {
        if (sortColumn === column) {
            return sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />;
        }
        return null;
    };

    // --- Export Logic ---

    const flattenRequestForExport = (req) => {
        const base = {
            'LG Number': req.lg_record?.lg_number || 'N/A',
            'Action Type': formatActionType(req.action_type),
            'Requested By': req.maker_user?.email || 'N/A',
            'Requested On': moment(req.created_at).format('DD-MMM-YYYY HH:mm'),
            'Authorized/Rejected By': getDeciderName(req),
            'Status': req.status,
            'Rejection Reason': req.reason || '',
            'Snapshot Beneficiary': req.lg_record?.beneficiary_corporate?.entity_name || '',
            'Snapshot Amount': req.lg_record?.lg_amount || '',
            'Snapshot Currency': req.lg_record?.lg_currency?.iso_code || '',
        };

        const details = req.request_details || {};
        let specificDetails = {};

        switch (req.action_type) {
            case 'LG_DECREASE_AMOUNT':
                specificDetails = { 'Decrease Amount': details.decrease_amount, 'Request Reason': details.reason, 'Notes': details.notes };
                break;
            case 'LG_LIQUIDATE':
                specificDetails = { 'Liquidation Type': details.liquidation_type, 'Partial Amount': details.new_amount || '', 'Request Reason': details.reason, 'Notes': details.notes };
                break;
            case 'LG_RELEASE':
                specificDetails = { 'Request Reason': details.reason, 'Notes': details.notes };
                break;
            case 'LG_CHANGE_OWNER_DETAILS':
            case 'LG_CHANGE_SINGLE_LG_OWNER':
                specificDetails = { 'New Owner Email': details.email || details.new_internal_owner_contact_details?.email || '', 'New Owner Phone': details.phone_number || '', 'Request Reason': details.reason };
                break;
            case 'LG_ACTIVATE_NON_OPERATIVE':
                specificDetails = { 'Payment Method': details.payment_method, 'Activation Amount': details.amount, 'Payment Ref': details.payment_reference, 'Payment Date': details.payment_date };
                break;
            case 'LG_AMEND':
                specificDetails = { 'Request Reason': details.reason, 'Amendments': details.amendment_details ? JSON.stringify(details.amendment_details) : '' };
                break;
            default:
                specificDetails = { 'Additional Details': JSON.stringify(details) };
        }

        return { ...base, ...specificDetails };
    };

    const handleExportToExcel = (dataToExport) => {
        const exportData = dataToExport.map(flattenRequestForExport);
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Approvals");
        XLSX.writeFile(workbook, "Approval_Requests_Detailed.xlsx");
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
            await apiRequest(`/issuance/lg-records/${lgId}/reject-discrepancy`, 'POST', {
                notes: discNotes[lgId] || 'Discrepancies rejected by corporate admin.',
            });
            toast.success('Discrepancies rejected — end user must re-upload.');
            fetchDiscrepancyReviews();
        } catch (err) {
            toast.error(`Failed to reject: ${err.message || 'Unknown error'}`);
        } finally {
            setProcessingDiscId(null);
        }
    };

    // === ISSUANCE REQUEST ACTIONS ===
    const handleIssuanceApprove = async (requestId) => {
        if (!window.confirm('Approve this issuance request?')) return;
        try {
            setProcessingIssuanceId(requestId);
            await apiRequest(`/issuance/requests/${requestId}/approve`, 'POST');
            toast.success('Issuance request approved!');
            fetchIssuanceApprovals();
        } catch (err) {
            toast.error(`Failed to approve: ${err.message || 'Unknown error'}`);
        } finally {
            setProcessingIssuanceId(null);
        }
    };

    const handleIssuanceReject = async (requestId) => {
        if (!window.confirm('Reject this issuance request?')) return;
        try {
            setProcessingIssuanceId(requestId);
            await apiRequest(`/issuance/requests/${requestId}/reject`, 'POST');
            toast.success('Issuance request rejected.');
            fetchIssuanceApprovals();
        } catch (err) {
            toast.error(`Failed to reject: ${err.message || 'Unknown error'}`);
        } finally {
            setProcessingIssuanceId(null);
        }
    };

    const handleIssuanceRevise = async (requestId) => {
        const notes = window.prompt('Enter revision notes for the requestor (optional):');
        if (notes === null) return;
        try {
            setProcessingIssuanceId(requestId);
            await apiRequest(`/issuance/requests/${requestId}/return-for-revision`, 'POST', {
                revision_notes: notes || null
            });
            toast.success('Request returned for revision.');
            fetchIssuanceApprovals();
        } catch (err) {
            toast.error(`Failed: ${err.message || 'Unknown error'}`);
        } finally {
            setProcessingIssuanceId(null);
        }
    };

    const formatCurrency = (amount, currency) => {
        if (!amount) return 'N/A';
        const num = parseFloat(amount);
        const formatted = num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return currency?.iso_code ? `${formatted} ${currency.iso_code}` : formatted;
    };

    // K1: Admin Change Request actions
    const handleAdminChangeApprove = async (changeId) => {
        if (!window.confirm('Approve this configuration change?')) return;
        try {
            setProcessingChangeId(changeId);
            await apiRequest(`/issuance/admin/change-requests/${changeId}/action`, 'POST', {
                action: 'APPROVE'
            });
            toast.success('Configuration change approved and applied.');
            fetchAdminChanges();
        } catch (err) {
            toast.error(`Failed: ${err.message || 'Unknown error'}`);
        } finally {
            setProcessingChangeId(null);
        }
    };

    const handleAdminChangeReject = async (changeId) => {
        const reason = window.prompt('Reason for rejection (optional):');
        if (reason === null) return;
        try {
            setProcessingChangeId(changeId);
            await apiRequest(`/issuance/admin/change-requests/${changeId}/action`, 'POST', {
                action: 'REJECT',
                rejection_reason: reason || null
            });
            toast.success('Configuration change rejected.');
            fetchAdminChanges();
        } catch (err) {
            toast.error(`Failed: ${err.message || 'Unknown error'}`);
        } finally {
            setProcessingChangeId(null);
        }
    };

    const formatChangeType = (ct) => {
        const map = {
            FORM_CONFIG_UPDATE: 'Form Configuration',
            APPROVAL_MATRIX_UPDATE: 'Approval Matrix',
            DEPARTMENT_CREATE: 'New Department',
            DEPARTMENT_UPDATE: 'Update Department',
            GROUP_CREATE: 'New Approval Group',
            GROUP_UPDATE: 'Update Approval Group',
        };
        return map[ct] || ct;
    };

    const userStr = localStorage.getItem('user');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const currentUserId = currentUser?.id || currentUser?.user_id;
    const loggedInEmail = currentUser?.email || localStorage.getItem('userEmail');

    const pendingCustodyCount = approvalRequests.filter(r => r.status === 'PENDING' && r.maker_user?.email !== loggedInEmail).length;
    const pendingIssuanceCount = issuanceRequests.filter(r => r.status === 'PENDING_APPROVAL' && r.requestor_email !== loggedInEmail).length;
    const pendingDiscrepancyCount = discrepancyLGs.filter(lg => lg.verification_status === 'DISCREPANCY').length;
    const pendingAdminChangeCount = adminChanges.filter(c => c.status === 'PENDING' && c.requested_by_user_id !== currentUserId).length;
    const pendingMaintenanceCount = maintenanceActions.filter(a => a.status === 'PENDING_APPROVAL' && a.initiated_by_email !== loggedInEmail).length;
    
    // For LG cancellations, the requester is in the metadata
    const pendingCancelCount = cancelRequestedLGs.filter(lg => {
        const cancelMeta = lg.metadata_json?.pending_cancellation || lg.request?.metadata_json?.pending_cancellation || {};
        const metaUserId = cancelMeta.requested_by_user_id;
        return typeof metaUserId !== 'undefined' ? metaUserId !== currentUserId : true;
    }).length;

    const totalPending = pendingCustodyCount + pendingIssuanceCount + pendingDiscrepancyCount + pendingAdminChangeCount + pendingMaintenanceCount + pendingCancelCount;

    // LG Cancellation approve/reject handlers
    const handleLGCancelApprove = async (lgId) => {
        if (!window.confirm('Approve this LG cancellation? This will cancel the LG and reopen the request.')) return;
        try {
            setProcessingDiscId(lgId);
            await apiRequest(`/issuance/lg-records/${lgId}/resolve-cancellation`, 'POST', {
                approved: true,
                note: '',
            });
            toast.success('LG cancellation approved.');
            fetchDiscrepancyReviews();
        } catch (err) {
            toast.error(`Failed: ${err.message || 'Unknown error'}`);
        } finally {
            setProcessingDiscId(null);
        }
    };

    const handleLGCancelReject = async (lgId) => {
        const reason = window.prompt('Reason for rejecting the cancellation (optional):');
        if (reason === null) return;
        try {
            setProcessingDiscId(lgId);
            await apiRequest(`/issuance/lg-records/${lgId}/resolve-cancellation`, 'POST', {
                approved: false,
                note: reason || '',
            });
            toast.success('LG cancellation rejected — LG restored to previous status.');
            fetchDiscrepancyReviews();
        } catch (err) {
            toast.error(`Failed: ${err.message || 'Unknown error'}`);
        } finally {
            setProcessingDiscId(null);
        }
    };

    // Maintenance action approve/reject handlers
    const handleMaintenanceApprove = async (actionId) => {
        try {
            setProcessingMaintenanceId(actionId);
            await apiRequest(`/issuance/maintenance/${actionId}/approve`, 'POST');
            toast.success('Maintenance action approved!');
            fetchMaintenanceActions();
        } catch (err) {
            toast.error(`Failed to approve: ${err.message || 'Unknown error'}`);
        } finally {
            setProcessingMaintenanceId(null);
        }
    };

    const handleMaintenanceReject = async (actionId) => {
        const reason = window.prompt('Reason for rejection (optional):');
        if (reason === null) return;
        try {
            setProcessingMaintenanceId(actionId);
            await apiRequest(`/issuance/maintenance/${actionId}/reject`, 'POST', { reason: reason || '' });
            toast.success('Maintenance action rejected.');
            fetchMaintenanceActions();
        } catch (err) {
            toast.error(`Failed to reject: ${err.message || 'Unknown error'}`);
        } finally {
            setProcessingMaintenanceId(null);
        }
    };

    const formatMaintenanceType = (type) => {
        const map = {
            EXTEND: 'Extend Expiry',
            INCREASE_AMOUNT: 'Increase Amount',
            AMENDMENT: 'Amendment',
            ACTIVATE: 'Activate',
            CLOSE: 'Close / Return',
            LIQUIDATE: 'Liquidation',
            CHANGE_OWNER: 'Change Owner',
        };
        return map[type] || (type || '').replace(/_/g, ' ');
    };

    return (
        <div className="card">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-800">Approval Center</h2>
                    <p className="text-sm text-gray-500 mt-1">All items requiring your approval</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    {(searchTerm || selectedStatuses.length > 0 || dateFrom || dateTo) && (
                         <button
                         onClick={handleClearFilters}
                         className={`${buttonBaseClassNames} bg-gray-600 text-white hover:bg-gray-700`}
                     >
                         <XCircle className="h-4 w-4 mr-2" />
                         Clear Filters
                     </button>
                    )}

                    <Menu as="div" className="relative inline-block text-left">
                        <Menu.Button className={`${buttonBaseClassNames} bg-teal-600 text-white hover:bg-teal-700`}>
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Menu.Button>
                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            {/* FIX: Added z-50 to ensure dropdown appears above sticky table headers */}
                            <Menu.Items className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                <div className="py-1">
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button onClick={() => handleExportToExcel(filteredAndSortedRequests)} className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} block w-full text-left px-4 py-2 text-sm`}>
                                                Export Filtered ({filteredAndSortedRequests.length})
                                            </button>
                                        )}
                                    </Menu.Item>
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button onClick={() => handleExportToExcel(approvalRequests)} className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} block w-full text-left px-4 py-2 text-sm`}>
                                                Export All ({approvalRequests.length})
                                            </button>
                                        )}
                                    </Menu.Item>
                                </div>
                            </Menu.Items>
                        </Transition>
                    </Menu>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-4">
                <button
                    onClick={() => setActiveTab('lg-actions')}
                    className={`relative px-5 py-3 text-sm font-semibold transition-colors ${
                        activeTab === 'lg-actions'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    LG Actions
                    {(pendingCustodyCount + (hasIssuanceModule ? pendingMaintenanceCount + pendingCancelCount : 0)) > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">
                            {pendingCustodyCount + (hasIssuanceModule ? pendingMaintenanceCount + pendingCancelCount : 0)}
                        </span>
                    )}
                </button>
                {hasIssuanceModule && (
                    <>
                        <button
                            onClick={() => setActiveTab('issuance')}
                            className={`relative px-5 py-3 text-sm font-semibold transition-colors ${
                                activeTab === 'issuance'
                                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Issuance Requests
                            {pendingIssuanceCount > 0 && (
                                <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-700 rounded-full">
                                    {pendingIssuanceCount}
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
                            LG Discrepancy Reviews
                            {pendingDiscrepancyCount > 0 && (
                                <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-full animate-pulse">
                                    {pendingDiscrepancyCount}
                                </span>
                            )}
                        </button>
                    </>
                )}
                {hasIssuanceModule && userRole !== 'checker' && (
                    <button
                        onClick={() => setActiveTab('admin-changes')}
                        className={`relative px-5 py-3 text-sm font-semibold transition-colors ${
                            activeTab === 'admin-changes'
                                ? 'text-purple-600 border-b-2 border-purple-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Settings className="inline h-4 w-4 mr-1 -mt-0.5" />
                        Admin Changes
                        {pendingAdminChangeCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-purple-100 text-purple-700 rounded-full animate-pulse">
                                {pendingAdminChangeCount}
                            </span>
                        )}
                    </button>
                )}
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4 flex items-center" role="alert">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span className="block sm:inline">{error}</span>
                </div>
            )}
            {/* ===== LG ACTIONS TAB (Merged Custody + Maintenance) ===== */}
            {activeTab === 'lg-actions' && (() => {
                // Normalize custody and maintenance into a single mixed list
                const mergedRows = [
                    ...approvalRequests.map(r => {
                        const actionStr = (r.action_type || '').toUpperCase();
                        let dispSource = 'custody';
                        if (actionStr.includes('ISSUANCE')) dispSource = 'issuance';
                        else if (actionStr.includes('FACILITY') || actionStr.includes('MAINTENANCE')) dispSource = 'maintenance';
                        
                        return {
                            _source: 'custody',
                            _displaySource: dispSource,
                            _id: `custody-${r.id}`,
                            _raw: r,
                            lgNumber: r.lg_record?.lg_number || 'N/A',
                            actionType: formatActionType(r.action_type),
                            requestedBy: r.maker_user?.email || 'N/A',
                            createdAt: r.created_at,
                            status: r.status,
                            isPending: r.status === 'PENDING',
                        };
                    }),
                    ...(hasIssuanceModule ? maintenanceActions.map(m => ({
                        _source: 'maintenance',
                        _displaySource: 'maintenance',
                        _id: `maint-${m.id}`,
                        _raw: m,
                        lgNumber: m.lg_ref_number || `LG #${m.issued_lg_id}`,
                        actionType: formatMaintenanceType(m.action_type),
                        requestedBy: m.initiated_by_email || 'N/A',
                        createdAt: m.created_at,
                        status: m.status === 'PENDING_APPROVAL' ? 'PENDING' :
                                m.status === 'EXECUTED' ? 'APPROVED' :
                                m.status || 'UNKNOWN',
                        isPending: m.status === 'PENDING_APPROVAL',
                    })) : []),
                    // LG Cancellation requests
                    ...(hasIssuanceModule ? cancelRequestedLGs.map(lg => {
                        // Try request metadata first, then top-level, then custody_transfer_log fallback
                        const cancelMeta = lg.metadata_json?.pending_cancellation
                            || lg.request?.metadata_json?.pending_cancellation
                            || (() => {
                                const ctl = lg.custody_transfer_log || lg.action_history || [];
                                const entry = [...ctl].reverse().find(e => e.action === 'CANCEL_REQUESTED');
                                return entry ? { cancel_reason: entry.reason, previous_status: entry.previous_status, requested_by_user_id: entry.user_id, requested_at: entry.timestamp } : {};
                            })();
                        return {
                            _source: 'lg_cancel',
                            _displaySource: 'lg_cancel',
                            _id: `cancel-${lg.id}`,
                            _raw: lg,
                            lgNumber: lg.lg_ref_number || lg.internal_serial || `LG #${lg.id}`,
                            actionType: '🚫 LG Cancellation',
                            requestedBy: cancelMeta.requested_at ? `User #${cancelMeta.requested_by_user_id}` : 'N/A',
                            createdAt: cancelMeta.requested_at || lg.updated_at,
                            status: 'PENDING',
                            isPending: true,
                            cancelReason: cancelMeta.cancel_reason || '',
                        };
                    }) : []),
                ];

                // Apply filters
                const filtered = mergedRows.filter(row => {
                    if (searchTerm) {
                        const term = searchTerm.toLowerCase();
                        if (!row.lgNumber.toLowerCase().includes(term) &&
                            !row.actionType.toLowerCase().includes(term) &&
                            !row.requestedBy.toLowerCase().includes(term)) return false;
                    }
                    if (selectedStatuses.length > 0 && !selectedStatuses.includes(row.status)) return false;
                    if (dateFrom && row.createdAt && moment(row.createdAt).isBefore(moment(dateFrom), 'day')) return false;
                    if (dateTo && row.createdAt && moment(row.createdAt).isAfter(moment(dateTo), 'day')) return false;
                    return true;
                });

                // Sort
                filtered.sort((a, b) => {
                    let aVal, bVal;
                    if (sortColumn === 'created_at') { aVal = a.createdAt; bVal = b.createdAt; }
                    else if (sortColumn === 'lg_number') { aVal = a.lgNumber; bVal = b.lgNumber; }
                    else if (sortColumn === 'action_type') { aVal = a.actionType; bVal = b.actionType; }
                    else if (sortColumn === 'maker') { aVal = a.requestedBy; bVal = b.requestedBy; }
                    else if (sortColumn === 'status') { aVal = a.status; bVal = b.status; }
                    else { aVal = a.createdAt; bVal = b.createdAt; }
                    if (!aVal) return 1; if (!bVal) return -1;
                    const comp = String(aVal).localeCompare(String(bVal));
                    return sortDirection === 'asc' ? comp : -comp;
                });

                // All unique statuses for the filter dropdown
                const allStatuses = [...new Set(mergedRows.map(r => r.status).filter(Boolean))].sort();

                return (
                <>

            {/* Filters Row */}
            <div className="mb-4 flex flex-col md:flex-row items-center flex-wrap gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="relative flex-grow min-w-[200px] w-full md:w-auto">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search LG No, Action, Requestor..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center space-x-2 w-full md:w-auto">
                    <div className="relative w-full md:w-40">
                        <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-gray-500 text-xs">From:</span>
                        <input
                            type="date"
                            className="block w-full pl-10 pr-2 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                    </div>
                    <div className="relative w-full md:w-40">
                         <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-gray-500 text-xs">To:</span>
                        <input
                            type="date"
                            className="block w-full pl-10 pr-2 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            min={dateFrom}
                        />
                    </div>
                </div>

                <Listbox value={selectedStatuses} onChange={setSelectedStatuses} multiple>
                    {({ open }) => (
                        <div className="relative w-full md:w-56 shrink-0">
                            <Listbox.Button className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm">
                                <span className="block truncate">
                                    {selectedStatuses.length === 0 ? 'Filter Status' : selectedStatuses.length === allStatuses.length ? 'All Statuses' : `Selected (${selectedStatuses.length})`}
                                </span>
                                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                    <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                </span>
                            </Listbox.Button>
                            <Transition show={open} as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                    {allStatuses.map((status) => (
                                        <Listbox.Option key={status} className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}`} value={status}>
                                            {({ selected }) => (
                                                <>
                                                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{status}</span>
                                                    {selected ? <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600"><Check className="h-4 w-4" aria-hidden="true" /></span> : null}
                                                </>
                                            )}
                                        </Listbox.Option>
                                    ))}
                                </Listbox.Options>
                            </Transition>
                        </div>
                    )}
                </Listbox>
            </div>

            {(isLoading || loadingMaintenance) ? (
                <div className="text-center py-8">
                    <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto" />
                    <p className="text-gray-600 mt-2">Loading LG actions...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-gray-100 p-6 rounded-lg text-center border border-gray-200">
                    <p className="text-gray-700">No LG actions match your criteria.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg shadow relative">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                                {['lg_number', 'action_type', 'maker', 'created_at', 'status'].map((col) => (
                                    <th
                                        key={col}
                                        scope="col"
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                                        onClick={() => handleSort(col)}
                                    >
                                        <div className="flex items-center">
                                            {col === 'lg_number' && 'LG Number'}
                                            {col === 'action_type' && 'Action Type'}
                                            {col === 'maker' && 'Requested By'}
                                            {col === 'created_at' && 'Requested On'}
                                            {col === 'status' && 'Status'}
                                            {renderSortIcon(col)}
                                        </div>
                                    </th>
                                ))}
                                <th scope="col" className="sticky right-0 z-10 bg-gray-50 border-l border-gray-200 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider shadow-sm">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filtered.map((row) => (
                                <tr
                                    key={row._id}
                                    className={`group transition-colors cursor-pointer ${row._displaySource === 'lg_cancel' ? 'hover:bg-red-50' : row._displaySource === 'maintenance' ? 'hover:bg-teal-50' : row._displaySource === 'issuance' ? 'hover:bg-indigo-50' : 'hover:bg-blue-50'}`}
                                    onClick={() => {
                                        if (row._source === 'custody') { handleViewDetails(row._raw); }
                                        else if (row._source === 'maintenance') { setSelectedMaintenanceAction(row._raw); }
                                        // lg_cancel rows: no click-through modal, actions in-row
                                    }}
                                >
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                                            row._displaySource === 'custody'
                                                ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200'
                                                : row._displaySource === 'lg_cancel'
                                                    ? 'bg-red-50 text-red-600 ring-1 ring-red-200 animate-pulse'
                                                    : row._displaySource === 'issuance'
                                                        ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200'
                                                        : 'bg-teal-50 text-teal-600 ring-1 ring-teal-200'
                                        }`}>
                                            {row._displaySource === 'custody' ? 'Custody' : row._displaySource === 'lg_cancel' ? 'Cancel' : row._displaySource === 'issuance' ? 'Issuance' : 'Maint.'}
                                        </span>
                                    </td>
                                    <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${row._displaySource === 'lg_cancel' ? 'text-red-700' : row._displaySource === 'maintenance' ? 'text-teal-700' : row._displaySource === 'issuance' ? 'text-indigo-700' : 'text-blue-600'}`}>
                                        {row.lgNumber}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-gray-500">
                                        <div>{row.actionType}</div>
                                        {row._displaySource === 'lg_cancel' && row.cancelReason && (
                                            <div className="text-xs text-red-500 mt-0.5 max-w-[200px] truncate" title={row.cancelReason}>
                                                Reason: {row.cancelReason}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{row.requestedBy}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{row.createdAt ? moment(row.createdAt).format('DD-MMM-YYYY HH:mm') : ''}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            row.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                            row.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                            row.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {row.status}
                                        </span>
                                    </td>

                                    {/* STICKY ACTION COLUMN */}
                                    <td className={`sticky right-0 z-10 bg-white border-l border-gray-200 px-4 py-4 whitespace-nowrap text-center text-sm font-medium transition-colors shadow-sm ${row._displaySource === 'lg_cancel' ? 'group-hover:bg-red-50' : row._displaySource === 'maintenance' ? 'group-hover:bg-teal-50' : row._displaySource === 'issuance' ? 'group-hover:bg-indigo-50' : 'group-hover:bg-blue-50'}`}>
                                        <div className="flex justify-center space-x-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (row._source === 'custody') handleViewDetails(row._raw);
                                                    else if (row._source === 'maintenance') setSelectedMaintenanceAction(row._raw);
                                                    else if (row._source === 'lg_cancel') {
                                                        const meta = row._raw.metadata_json?.pending_cancellation
                                                            || row._raw.request?.metadata_json?.pending_cancellation
                                                            || (() => {
                                                                const ctl = row._raw.custody_transfer_log || [];
                                                                const entry = [...ctl].reverse().find(e => e.action === 'CANCEL_REQUESTED');
                                                                return entry ? { cancel_reason: entry.reason, previous_status: entry.previous_status, requested_at: entry.timestamp } : {};
                                                            })();
                                                        toast.info(
                                                            <div>
                                                                <strong>LG Cancellation Request</strong>
                                                                <p className="mt-1">Reason: {meta.cancel_reason || 'No reason provided'}</p>
                                                                <p className="text-xs mt-1 opacity-70">Previous status: {meta.previous_status || '—'}</p>
                                                                <p className="text-xs opacity-70">Requested at: {meta.requested_at ? new Date(meta.requested_at).toLocaleString() : '—'}</p>
                                                            </div>,
                                                            { autoClose: 8000 }
                                                        );
                                                    }
                                                }}
                                                className={`${row._source === 'lg_cancel' ? 'text-red-600 hover:text-red-900' : row._source === 'maintenance' ? 'text-teal-600 hover:text-teal-900' : 'text-blue-600 hover:text-blue-900'} p-1 rounded-md hover:bg-white`}
                                                title={row._source === 'lg_cancel' ? (row.cancelReason || 'View Reason') : 'View Details'}
                                            >
                                                <Eye className="h-5 w-5" />
                                            </button>

                                            {row._source === 'custody' && (
                                                <>
                                                    <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                        <button
                                                            onClick={(e) => handleActionClick(e, () => handleApprove(row._raw.id))}
                                                            className={`text-green-600 hover:text-green-900 p-1 rounded-md hover:bg-white ${!row.isPending || isGracePeriod ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                            title="Approve"
                                                            disabled={!row.isPending || isGracePeriod}
                                                        >
                                                            <Check className="h-5 w-5" />
                                                        </button>
                                                    </GracePeriodTooltip>
                                                    <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                        <button
                                                            onClick={(e) => handleActionClick(e, () => handleReject(row._raw.id))}
                                                            className={`text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-white ${!row.isPending || isGracePeriod ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                            title="Reject"
                                                            disabled={!row.isPending || isGracePeriod}
                                                        >
                                                            <X className="h-5 w-5" />
                                                        </button>
                                                    </GracePeriodTooltip>
                                                </>
                                            )}

                                            {row._source === 'lg_cancel' && row.isPending && (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleLGCancelApprove(row._raw.id); }}
                                                        className={`text-green-600 hover:text-green-900 p-1 rounded-md hover:bg-white ${processingDiscId === row._raw.id ? 'opacity-50 cursor-wait' : ''}`}
                                                        title="Approve Cancellation"
                                                        disabled={processingDiscId === row._raw.id}
                                                    >
                                                        <Check className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleLGCancelReject(row._raw.id); }}
                                                        className={`text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-white ${processingDiscId === row._raw.id ? 'opacity-50 cursor-wait' : ''}`}
                                                        title="Reject Cancellation"
                                                        disabled={processingDiscId === row._raw.id}
                                                    >
                                                        <X className="h-5 w-5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Custody Detail Modal */}
            {showDetailsModal && selectedRequest && (
                <ApprovalRequestDetailsModal
                    request={selectedRequest}
                    onClose={() => setShowDetailsModal(false)}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isGracePeriod={isGracePeriod}
                />
            )}

            {/* Maintenance Detail Modal */}
            {selectedMaintenanceAction && (
                <MaintenanceActionApprovalModal
                    action={selectedMaintenanceAction}
                    onClose={() => setSelectedMaintenanceAction(null)}
                    onApprove={async (actionId) => {
                        await handleMaintenanceApprove(actionId);
                        setSelectedMaintenanceAction(null);
                    }}
                    onReject={async (actionId, reason) => {
                        try {
                            setProcessingMaintenanceId(actionId);
                            await apiRequest(`/issuance/maintenance/${actionId}/reject`, 'POST', { reason: reason || '' });
                            toast.success('Maintenance action rejected.');
                            fetchMaintenanceActions();
                            setSelectedMaintenanceAction(null);
                        } catch (err) {
                            toast.error(`Failed to reject: ${err.message || 'Unknown error'}`);
                        } finally {
                            setProcessingMaintenanceId(null);
                        }
                    }}
                />
            )}

            </>
            );
            })()}

            {/* ===== ISSUANCE REQUESTS TAB ===== */}
            {activeTab === 'issuance' && (
                <>
                    {loadingIssuance ? (
                        <div className="text-center py-8">
                            <Loader2 className="animate-spin h-8 w-8 text-indigo-600 mx-auto" />
                            <p className="text-gray-600 mt-2">Loading issuance approvals...</p>
                        </div>
                    ) : issuanceRequests.length === 0 ? (
                        <div className="bg-gray-50 p-12 rounded-lg text-center border border-gray-200">
                            <CheckCircle className="h-12 w-12 text-emerald-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-600">No Issuance Requests</h3>
                            <p className="text-sm text-gray-400 mt-1">No issuance requests found.</p>
                        </div>
                    ) : (() => {
                        const filteredIssuance = issuanceRequests.filter(req => {
                            if (issuanceStatusFilter !== 'ALL' && req.status !== issuanceStatusFilter) return false;
                            if (issuanceSearch) {
                                const s = issuanceSearch.toLowerCase();
                                return (req.serial_number || '').toLowerCase().includes(s)
                                    || (req.beneficiary_name || '').toLowerCase().includes(s)
                                    || (req.requestor_name || '').toLowerCase().includes(s)
                                    || (req.requestor_email || '').toLowerCase().includes(s)
                                    || (req.department || '').toLowerCase().includes(s);
                            }
                            return true;
                        });
                        return (
                        <>
                            {/* Filter bar */}
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                                    {[
                                        { key: 'ALL', label: 'All', count: issuanceRequests.length },
                                        { key: 'PENDING_APPROVAL', label: 'Pending', count: issuanceRequests.filter(r => r.status === 'PENDING_APPROVAL').length },
                                        { key: 'CANCELLATION_REQUESTED', label: 'Cancel Pending', count: issuanceRequests.filter(r => r.status === 'CANCELLATION_REQUESTED').length },
                                        { key: 'APPROVED_INTERNAL', label: 'Approved', count: issuanceRequests.filter(r => r.status === 'APPROVED_INTERNAL').length },
                                        { key: 'REJECTED', label: 'Rejected', count: issuanceRequests.filter(r => r.status === 'REJECTED').length },
                                    ].map(f => (
                                        <button
                                            key={f.key}
                                            onClick={() => setIssuanceStatusFilter(f.key)}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                                issuanceStatusFilter === f.key
                                                    ? 'bg-white text-indigo-700 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            {f.label} {f.count > 0 && <span className="ml-1 text-gray-400">({f.count})</span>}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative flex-1 max-w-xs">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={issuanceSearch}
                                        onChange={e => setIssuanceSearch(e.target.value)}
                                        placeholder="Search serial, beneficiary..."
                                        className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-indigo-400 focus:ring-indigo-400"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 ml-auto">
                                    Showing {filteredIssuance.length} of {issuanceRequests.length}
                                </p>
                            </div>

                            {/* Dense compact table */}
                            <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
                                <table className="w-full table-fixed divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-[22%]">Serial</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-[22%]">Beneficiary</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-[14%]">Amount</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-[12%]">Dept</th>
                                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-[12%]">Status</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-[18%]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredIssuance.length === 0 ? (
                                            <tr><td colSpan={6} className="text-center py-6 text-gray-400 text-sm">No matching requests</td></tr>
                                        ) : filteredIssuance.map(req => (
                                            <tr key={req.id} className="hover:bg-blue-50 transition-colors cursor-pointer" onClick={() => setSelectedIssuanceRequest(req)}>
                                                <td className="px-3 py-2">
                                                    <div className="text-sm font-semibold text-gray-900 truncate">{req.serial_number || `#${req.id}`}</div>
                                                    <div className="text-[11px] text-gray-400 truncate">by {req.requestor_name || req.requestor_email || 'Treasury'} · {moment(req.created_at).fromNow()}</div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="text-sm text-gray-900 truncate">{req.beneficiary_name}</div>
                                                    <div className="text-[11px] text-gray-400 truncate">{req.beneficiary_country || ''}</div>
                                                </td>
                                                <td className="px-3 py-2 text-sm font-semibold text-gray-900 whitespace-nowrap">
                                                    {formatCurrency(req.amount, req.currency)}
                                                </td>
                                                <td className="px-3 py-2 text-xs text-gray-600 truncate">
                                                    {req.department || '—'}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap ${
                                                        req.status === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-800' :
                                                        req.status === 'APPROVED_INTERNAL' ? 'bg-green-100 text-green-800' :
                                                        req.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                        req.status === 'REVISION_REQUIRED' ? 'bg-orange-100 text-orange-800' :
                                                        req.status === 'INTERNAL_PROCESSING' ? 'bg-blue-100 text-blue-800' :
                                                        req.status === 'CANCELLATION_REQUESTED' ? 'bg-red-100 text-red-800 ring-1 ring-red-300 animate-pulse' :
                                                        req.status === 'CANCELLED' ? 'bg-gray-200 text-gray-600' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {req.status === 'PENDING_APPROVAL' ? 'Pending' : 
                                                         req.status === 'APPROVED_INTERNAL' ? 'Approved' : 
                                                         req.status === 'REVISION_REQUIRED' ? 'Revision' :
                                                         req.status === 'INTERNAL_PROCESSING' ? 'Processing' :
                                                         req.status === 'CANCELLATION_REQUESTED' ? '🚫 Cancel Pending' :
                                                         req.status === 'CANCELLED' ? 'Cancelled' :
                                                         req.status}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-right" onClick={e => e.stopPropagation()}>
                                                    {req.status === 'PENDING_APPROVAL' ? (
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button onClick={() => handleIssuanceApprove(req.id)} disabled={processingIssuanceId === req.id}
                                                                className="px-2 py-1 text-[11px] font-medium rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50" title="Approve">
                                                                {processingIssuanceId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3 inline mr-0.5" />Approve</>}
                                                            </button>
                                                            <button onClick={() => handleIssuanceRevise(req.id)} disabled={processingIssuanceId === req.id}
                                                                className="px-1.5 py-1 text-[11px] font-medium rounded text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50" title="Revise">
                                                                <RotateCcw className="h-3 w-3" />
                                                            </button>
                                                            <button onClick={() => handleIssuanceReject(req.id)} disabled={processingIssuanceId === req.id}
                                                                className="px-1.5 py-1 text-[11px] font-medium rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50" title="Reject">
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    ) : req.status === 'CANCELLATION_REQUESTED' ? (
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await apiRequest(`/issuance/requests/${req.id}/resolve-cancellation`, 'POST', { approved: true, note: '' });
                                                                        toast.success('Cancellation approved.');
                                                                        fetchIssuanceApprovals();
                                                                    } catch (err) { toast.error(err.message || 'Failed'); }
                                                                }}
                                                                className="px-2 py-1 text-[11px] font-medium rounded text-white bg-red-600 hover:bg-red-700" title="Approve Cancellation">
                                                                <Check className="h-3 w-3 inline mr-0.5" />Cancel
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await apiRequest(`/issuance/requests/${req.id}/resolve-cancellation`, 'POST', { approved: false, note: '' });
                                                                        toast.info('Cancellation rejected. Request restored.');
                                                                        fetchIssuanceApprovals();
                                                                    } catch (err) { toast.error(err.message || 'Failed'); }
                                                                }}
                                                                className="px-2 py-1 text-[11px] font-medium rounded text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300" title="Reject Cancellation">
                                                                <X className="h-3 w-3 inline mr-0.5" />Keep
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] text-gray-300">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                        );
                    })()}

                    {/* Issuance Request Detail Modal */}
                    {selectedIssuanceRequest && (
                        <IssuanceRequestDetailsModal
                            request={selectedIssuanceRequest}
                            onClose={() => setSelectedIssuanceRequest(null)}
                            onStatusChange={() => { setSelectedIssuanceRequest(null); fetchIssuanceApprovals(); }}
                        />
                    )}
                </>
            )}

            {/* ===== DISCREPANCY REVIEWS TAB ===== */}
            {activeTab === 'discrepancies' && (
                <>
                    {loadingDiscrepancies ? (
                        <div className="text-center py-8">
                            <Loader2 className="animate-spin h-8 w-8 text-amber-600 mx-auto" />
                            <p className="text-gray-600 mt-2">Loading discrepancy reviews...</p>
                        </div>
                    ) : discrepancyLGs.length === 0 ? (
                        <div className="bg-gray-50 p-12 rounded-lg text-center border border-gray-200">
                            <CheckCircle className="h-12 w-12 text-emerald-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-600">No Discrepancies to Review</h3>
                            <p className="text-sm text-gray-400 mt-1">
                                All LG verifications are clean — no discrepancies pending your approval.
                            </p>
                        </div>
                    ) : (() => {
                        const filteredDisc = discrepancyLGs.filter(lg => {
                            if (discStatusFilter === 'ALL') return true;
                            if (discStatusFilter === 'DISCREPANCY') return lg.verification_status === 'DISCREPANCY';
                            if (discStatusFilter === 'ACCEPTED') return lg.verification_status === 'ACCEPTED';
                            if (discStatusFilter === 'REJECTED') return lg.verification_status === 'DISCREPANCY_REJECTED';
                            return true;
                        });
                        return (
                        <>
                            {/* Filter bar */}
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                                    {[
                                        { key: 'ALL', label: 'All', count: discrepancyLGs.length },
                                        { key: 'DISCREPANCY', label: 'Pending', count: discrepancyLGs.filter(lg => lg.verification_status === 'DISCREPANCY').length },
                                        { key: 'ACCEPTED', label: 'Accepted', count: discrepancyLGs.filter(lg => lg.verification_status === 'ACCEPTED').length },
                                        { key: 'REJECTED', label: 'Rejected', count: discrepancyLGs.filter(lg => lg.verification_status === 'DISCREPANCY_REJECTED').length },
                                    ].map(f => (
                                        <button
                                            key={f.key}
                                            onClick={() => setDiscStatusFilter(f.key)}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                                discStatusFilter === f.key
                                                    ? 'bg-white text-amber-700 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            {f.label} {f.count > 0 && <span className="ml-1 text-gray-400">({f.count})</span>}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400 ml-auto">
                                    Showing {filteredDisc.length} of {discrepancyLGs.length}
                                </p>
                            </div>

                            <div className="space-y-4">
                            {filteredDisc.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-sm">No matching discrepancies</div>
                            ) : filteredDisc.map(lg => {
                                const req = lg.request;
                                const isPending = lg.verification_status === 'DISCREPANCY';
                                const isAccepted = lg.verification_status === 'ACCEPTED';
                                const borderColor = isPending ? 'border-amber-200' : isAccepted ? 'border-green-200' : 'border-red-200';
                                const headerBg = isPending ? 'bg-amber-50 border-amber-200' : isAccepted ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
                                const badgeStyle = isPending ? 'bg-amber-100 text-amber-800' : isAccepted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
                                const badgeText = isPending ? 'DISCREPANCY' : isAccepted ? 'ACCEPTED' : 'REJECTED';
                                return (
                                    <div key={lg.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${borderColor} ${!isPending ? 'opacity-80' : ''}`}>
                                        {/* Card Header */}
                                        <div className={`px-6 py-4 border-b flex items-center justify-between ${headerBg}`}>
                                            <div className="flex items-center gap-3">
                                                {isPending ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : isAccepted ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                                                <div>
                                                    <div className="font-bold text-gray-900">{lg.lg_ref_number || `LG #${lg.id}`}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {lg.beneficiary_name} &middot; {lg.bank_name} &middot; {lg.currency_code} {parseFloat(lg.current_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${badgeStyle}`}>
                                                {badgeText}
                                            </span>
                                        </div>

                                        {/* Discrepancy Details — field-by-field comparison */}
                                        <div className="px-6 py-4 space-y-3">
                                            {(() => {
                                                // Try to parse verification_notes as JSON (structured discrepancy data)
                                                let discrepancyFields = null;
                                                try {
                                                    let raw = lg.verification_notes || '';
                                                    // Extract just the array portion (may have rejection notes appended after)
                                                    const arrayMatch = raw.match(/^\s*\[[\s\S]*?\]\s*/);
                                                    if (arrayMatch) raw = arrayMatch[0];
                                                    // Handle Python str() format (single quotes, None)
                                                    const cleaned = raw.replace(/'/g, '"').replace(/\bNone\b/g, 'null').replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false');
                                                    const parsed = JSON.parse(cleaned);
                                                    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].field) {
                                                        discrepancyFields = parsed;
                                                    }
                                                } catch (e) { /* not parseable, fall through */ }

                                                const fieldLabels = {
                                                    amount: 'Amount',
                                                    expiry_date: 'Expiry Date',
                                                    beneficiary_name: 'Beneficiary',
                                                    currency: 'Currency',
                                                    lg_type: 'LG Type',
                                                    purpose: 'Purpose',
                                                    operational_status: 'Operational Status',
                                                };
                                                const severityColors = {
                                                    HIGH: 'bg-red-100 text-red-700',
                                                    MEDIUM: 'bg-amber-100 text-amber-700',
                                                    LOW: 'bg-blue-100 text-blue-700',
                                                };

                                                if (discrepancyFields) {
                                                    return (
                                                        <div className="border border-amber-200 rounded-lg overflow-hidden">
                                                            <table className="w-full text-sm">
                                                                <thead>
                                                                    <tr className="bg-amber-50 border-b border-amber-200">
                                                                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Field</th>
                                                                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Requested</th>
                                                                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Bank Confirmed</th>
                                                                        <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">Severity</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-amber-100">
                                                                    {discrepancyFields.map((d, i) => {
                                                                        const isMatch = d.match === true || d.severity === 'OK';
                                                                        return (
                                                                        <tr key={i} className={`hover:bg-amber-50/50 ${isMatch ? 'bg-green-50/30' : ''}`}>
                                                                            <td className="px-4 py-2 font-medium text-gray-700">{fieldLabels[d.field] || d.field}</td>
                                                                            <td className="px-4 py-2 text-gray-600">{d.requested || '—'}</td>
                                                                            <td className={`px-4 py-2 font-semibold ${isMatch ? 'text-gray-600' : 'text-red-700'}`}>{d.bank_confirmed || '—'}</td>
                                                                            <td className="px-4 py-2 text-center">
                                                                                {isMatch ? (
                                                                                    <CheckCircle className="w-4 h-4 text-emerald-500 inline" />
                                                                                ) : (
                                                                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${severityColors[d.severity] || 'bg-gray-100 text-gray-600'}`}>
                                                                                        {d.severity || 'INFO'}
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    );
                                                }

                                                // Fallback: show generic comparison + raw notes
                                                return (
                                                    <>
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
                                                        {lg.verification_notes && (
                                                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Discrepancy Details</p>
                                                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{lg.verification_notes}</p>
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}

                                            {/* Attached LG Copy — for admin to review */}
                                            {lg.lg_copy_documents && lg.lg_copy_documents.length > 0 && (
                                                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                                    <p className="text-xs font-bold text-indigo-700 uppercase mb-2 flex items-center gap-1">
                                                        <Eye className="w-3.5 h-3.5" /> Attached LG Copy
                                                    </p>
                                                    <div className="space-y-1.5">
                                                        {lg.lg_copy_documents.map(doc => (
                                                            <div key={doc.id} className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-lg border border-indigo-100">
                                                                <span className="text-xs text-gray-700 truncate flex-1">{doc.file_name}</span>
                                                                {doc.created_at && <span className="text-[10px] text-gray-400 whitespace-nowrap">{new Date(doc.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>}
                                                                <button
                                                                    onClick={async () => {
                                                                        try {
                                                                            const data = await apiRequest(`/issuance/requests/${lg.request?.id}/documents/${doc.id}/download`, 'GET');
                                                                            if (data?.download_url) window.open(data.download_url, '_blank');
                                                                            else toast.error('Download URL not available');
                                                                        } catch (err) { toast.error('Failed to open document'); }
                                                                    }}
                                                                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 transition-colors"
                                                                >
                                                                    <Eye className="w-3 h-3" /> View
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {isPending && (
                                            <>
                                            {/* End-user submission note */}
                                            {lg.bank_reply_notes && (
                                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                    <p className="text-xs font-bold text-blue-700 uppercase mb-1 flex items-center gap-1">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                                        End User Submission Note
                                                    </p>
                                                    <p className="text-sm text-blue-900 italic">{lg.bank_reply_notes}</p>
                                                </div>
                                            )}
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

                                            <div className="flex items-center justify-end gap-3 pt-2">
                                                <button
                                                    onClick={() => handleDiscrepancyReject(lg.id)}
                                                    disabled={processingDiscId === lg.id}
                                                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
                                                >
                                                    {processingDiscId === lg.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                                                    Reject — Request Re-upload
                                                </button>
                                                <button
                                                    onClick={() => handleDiscrepancyApprove(lg.id)}
                                                    disabled={processingDiscId === lg.id || !(discNotes[lg.id] || '').trim()}
                                                    className="inline-flex items-center px-4 py-2 text-sm font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                                >
                                                    {processingDiscId === lg.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                                                    Accept Discrepancies
                                                </button>
                                            </div>
                                            </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            </div>
                        </>
                        );
                    })()}
                </>
            )}

            {/* ===== ADMIN CHANGES TAB (K1) ===== */}
            {activeTab === 'admin-changes' && (
                <>
                    {loadingAdminChanges ? (
                        <div className="text-center py-8">
                            <Loader2 className="animate-spin h-8 w-8 text-purple-600 mx-auto" />
                            <p className="text-gray-600 mt-2">Loading admin change requests...</p>
                        </div>
                    ) : adminChanges.length === 0 ? (
                        <div className="bg-gray-50 p-12 rounded-lg text-center border border-gray-200">
                            <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-600">No Admin Change Requests</h3>
                            <p className="text-sm text-gray-400 mt-1">All configuration changes will appear here when dual-control is active.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {adminChanges.map(change => {
                                const payload = change.change_payload || {};
                                const newVal = payload.new_value || {};
                                const oldVal = payload.old_value || {};
                                
                                // Build detail rows based on change type
                                const renderPayloadDetails = () => {
                                    const ct = change.change_type;
                                    
                                    if (ct === 'DEPARTMENT_CREATE') {
                                        return (
                                            <div className="mt-3 bg-white rounded-lg border border-gray-200 p-3 space-y-1.5">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Department Details</h4>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                                                    {newVal.name && <><span className="text-gray-500">Name:</span><span className="font-medium text-gray-900">{newVal.name}</span></>}
                                                    {newVal.code && <><span className="text-gray-500">Code:</span><span className="font-medium text-gray-900">{newVal.code}</span></>}
                                                    {newVal.manager_user_id && <><span className="text-gray-500">Manager:</span><span className="font-medium text-gray-900">{userLookup[newVal.manager_user_id] || `User #${newVal.manager_user_id}`}</span></>}
                                                    {newVal.description && <><span className="text-gray-500 col-span-2">Description:</span><span className="text-gray-700 col-span-2 -mt-1">{newVal.description}</span></>}
                                                </div>
                                            </div>
                                        );
                                    }
                                    
                                    if (ct === 'DEPARTMENT_UPDATE') {
                                        return (
                                            <div className="mt-3 bg-white rounded-lg border border-gray-200 p-3 space-y-1.5">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Updated Fields (Dept #{payload.entity_id})</h4>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                                                    {Object.entries(newVal).map(([key, val]) => {
                                                        const isManagerId = key === 'manager_id' || key === 'manager_user_id';
                                                        const display = isManagerId ? (userLookup[val] || `User #${val}`) : String(val);
                                                        const label = isManagerId ? 'Manager' : key.replace(/_/g, ' ');
                                                        return (
                                                            <React.Fragment key={key}>
                                                                <span className="text-gray-500">{label}:</span>
                                                                <span className="font-medium text-gray-900">{display}</span>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    }
                                    
                                    if (ct === 'GROUP_CREATE') {
                                        return (
                                            <div className="mt-3 bg-white rounded-lg border border-gray-200 p-3 space-y-1.5">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Approval Group Details</h4>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                                                    {newVal.name && <><span className="text-gray-500">Name:</span><span className="font-medium text-gray-900">{newVal.name}</span></>}
                                                    {newVal.description && <><span className="text-gray-500">Description:</span><span className="font-medium text-gray-900">{newVal.description}</span></>}
                                                    {newVal.department_id && <><span className="text-gray-500">Department ID:</span><span className="font-medium text-gray-900">{newVal.department_id}</span></>}
                                                    {newVal.member_user_ids && (
                                                        <><span className="text-gray-500">Members:</span><span className="font-medium text-gray-900">{newVal.member_user_ids.length} user(s)</span></>
                                                    )}
                                                </div>
                                                    {newVal.member_user_ids && newVal.member_user_ids.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                            {newVal.member_user_ids.map(id => (
                                                                <span key={id} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5">
                                                                    {userLookup[id] || `User #${id}`}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                            </div>
                                        );
                                    }
                                    
                                    if (ct === 'GROUP_UPDATE') {
                                        return (
                                            <div className="mt-3 bg-white rounded-lg border border-gray-200 p-3 space-y-1.5">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Updated Fields (Group #{payload.entity_id})</h4>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                                                    {Object.entries(newVal).map(([key, val]) => {
                                                        const isUserIds = key === 'user_ids' || key === 'member_user_ids';
                                                        const isManagerId = key === 'manager_id' || key === 'manager_user_id';
                                                        let display;
                                                        if (isManagerId) {
                                                            display = userLookup[val] || `User #${val}`;
                                                        } else if (isUserIds && Array.isArray(val)) {
                                                            display = (
                                                                <span className="flex flex-wrap gap-1">
                                                                    {val.map(id => (
                                                                        <span key={id} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5">
                                                                            {userLookup[id] || `#${id}`}
                                                                        </span>
                                                                    ))}
                                                                </span>
                                                            );
                                                        } else {
                                                            display = Array.isArray(val) ? val.join(', ') : String(val);
                                                        }
                                                        return (
                                                            <React.Fragment key={key}>
                                                                <span className="text-gray-500">{key.replace(/_/g, ' ')}:</span>
                                                                <span className="font-medium text-gray-900">{display}</span>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    }
                                    
                                    if (ct === 'APPROVAL_MATRIX_UPDATE' || ct === 'FORM_CONFIG_UPDATE' || ct === 'CONFIG_UPDATE') {
                                        // Smart renderer for config changes — avoid raw JSON
                                        const renderConfigDiff = () => {
                                            // FORM_CONFIG_UPDATE: show field-level changes
                                            if (ct === 'FORM_CONFIG_UPDATE') {
                                                const newFields = newVal.field_configurations || newVal;
                                                const oldFields = oldVal.field_configurations || oldVal;
                                                
                                                // If both are objects with field keys, show a field-level diff
                                                if (typeof newFields === 'object' && !Array.isArray(newFields)) {
                                                    const allKeys = new Set([...Object.keys(newFields), ...Object.keys(oldFields || {})]);
                                                    const changes = [];
                                                    allKeys.forEach(key => {
                                                        const nf = newFields[key];
                                                        const of_ = oldFields?.[key];
                                                        const nStr = JSON.stringify(nf);
                                                        const oStr = JSON.stringify(of_);
                                                        if (nStr !== oStr) {
                                                            changes.push({
                                                                field: key.replace(/_/g, ' '),
                                                                isNew: !of_,
                                                                isRemoved: !nf,
                                                                newVisible: nf?.is_visible,
                                                                newMandatory: nf?.is_mandatory,
                                                                oldVisible: of_?.is_visible,
                                                                oldMandatory: of_?.is_mandatory,
                                                            });
                                                        }
                                                    });
                                                    
                                                    if (changes.length === 0) {
                                                        return <p className="text-xs text-gray-400 italic">No visible changes detected</p>;
                                                    }
                                                    
                                                    return (
                                                        <div className="space-y-2">
                                                            <p className="text-xs text-gray-500">
                                                                <span className="font-semibold text-gray-700">{changes.length}</span> field(s) modified out of {allKeys.size} total
                                                            </p>
                                                            <div className="grid gap-1 max-h-48 overflow-y-auto">
                                                                {changes.map(c => (
                                                                    <div key={c.field} className="flex items-center justify-between text-xs bg-gray-50 rounded px-3 py-1.5 border border-gray-100">
                                                                        <span className="font-medium text-gray-700 capitalize">{c.field}</span>
                                                                        <div className="flex items-center gap-2">
                                                                            {c.isNew && <span className="text-green-600 font-semibold">+ Added</span>}
                                                                            {c.isRemoved && <span className="text-red-600 font-semibold">- Removed</span>}
                                                                            {!c.isNew && !c.isRemoved && (
                                                                                <>
                                                                                    {c.newVisible !== c.oldVisible && (
                                                                                        <span className={c.newVisible ? 'text-green-600' : 'text-red-500'}>
                                                                                            {c.newVisible ? '👁 Visible' : '🙈 Hidden'}
                                                                                        </span>
                                                                                    )}
                                                                                    {c.newMandatory !== c.oldMandatory && (
                                                                                        <span className={c.newMandatory ? 'text-amber-600' : 'text-gray-400'}>
                                                                                            {c.newMandatory ? '⚠ Required' : 'Optional'}
                                                                                        </span>
                                                                                    )}
                                                                                    {c.newVisible === c.oldVisible && c.newMandatory === c.oldMandatory && (
                                                                                        <span className="text-blue-500">Modified</span>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            }
                                            
                                            // APPROVAL_MATRIX_UPDATE: show meaningful step details
                                            if (ct === 'APPROVAL_MATRIX_UPDATE') {
                                                // new_value is an array of approval step objects
                                                const steps = Array.isArray(newVal) ? newVal : Object.values(newVal || {});
                                                if (steps.length > 0) {
                                                    const conditionLabels = {
                                                        'ALWAYS': 'All Requests',
                                                        'AMOUNT_OVER': 'Amount Over',
                                                        'AMOUNT_RANGE': 'Amount Range',
                                                        'LG_TYPE': 'LG Type',
                                                        'DEPARTMENT': 'Department',
                                                    };
                                                    return (
                                                        <div className="space-y-1.5">
                                                            <p className="text-xs text-gray-500">
                                                                <span className="font-semibold text-gray-700">{steps.length}</span> approval step(s) defined
                                                            </p>
                                                            {steps.map((step, idx) => (
                                                                <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 rounded px-3 py-2 border border-gray-100">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold text-[10px]">
                                                                            Step {step.step_sequence || idx + 1}
                                                                        </span>
                                                                        <span className="text-gray-700 font-medium">
                                                                            {conditionLabels[step.condition_type] || step.condition_type || '—'}
                                                                            {step.condition_value ? ` (${step.condition_value})` : ''}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-gray-500 text-right">
                                                                        <span>{step.approver_type === 'GROUP' ? '👥 Group' : step.approver_type === 'ROLE' ? '🔑 Role' : step.approver_type || '—'}</span>
                                                                        {step.approver_values && step.approver_values.length > 0 && (
                                                                            <span className="text-gray-700 font-medium truncate max-w-[200px]" title={step.approver_values.join(', ')}>
                                                                                {step.approver_values.join(', ')}
                                                                            </span>
                                                                        )}
                                                                        <span className="font-semibold text-gray-700">{step.required_signatures || 1} sig(s)</span>
                                                                        {step.is_active === false && <span className="text-red-400 text-[10px]">(Inactive)</span>}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                }
                                            }
                                            
                                            // Generic config: show key-value pairs cleanly
                                            const allEntries = Object.entries(newVal || {});
                                            if (allEntries.length > 0) {
                                                return (
                                                    <div className="space-y-1.5">
                                                        {allEntries.slice(0, 10).map(([key, val]) => (
                                                            <div key={key} className="flex items-center justify-between text-xs bg-gray-50 rounded px-3 py-1.5 border border-gray-100">
                                                                <span className="font-medium text-gray-700 capitalize">{key.replace(/_/g, ' ')}</span>
                                                                <span className="text-gray-900 font-semibold truncate max-w-[200px]">
                                                                    {typeof val === 'object' ? (Array.isArray(val) ? `${val.length} item(s)` : `${Object.keys(val).length} key(s)`) : String(val)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        {allEntries.length > 10 && (
                                                            <p className="text-[10px] text-gray-400 italic">...and {allEntries.length - 10} more</p>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            
                                            return <p className="text-xs text-gray-400 italic">No details available</p>;
                                        };
                                        
                                        return (
                                            <div className="mt-3 bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Configuration Change</h4>
                                                {payload.config_key && (
                                                    <div className="text-sm"><span className="text-gray-500">Setting:</span> <span className="font-medium text-gray-900">{payload.config_key}</span></div>
                                                )}
                                                {renderConfigDiff()}
                                            </div>
                                        );
                                    }
                                    
                                    // Generic fallback — clean key-value summary
                                    if (Object.keys(payload).length > 0) {
                                        return (
                                            <div className="mt-3 bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Change Details</h4>
                                                <div className="grid gap-1">
                                                    {Object.entries(payload).slice(0, 12).map(([key, val]) => (
                                                        <div key={key} className="flex items-center justify-between text-xs bg-gray-50 rounded px-3 py-1.5 border border-gray-100">
                                                            <span className="font-medium text-gray-700 capitalize">{key.replace(/_/g, ' ')}</span>
                                                            <span className="text-gray-900 font-semibold truncate max-w-[250px]">
                                                                {val === null || val === undefined ? '—' :
                                                                 typeof val === 'object' ? (Array.isArray(val) ? `${val.length} item(s)` : `${Object.keys(val).length} key(s)`) :
                                                                 typeof val === 'boolean' ? (val ? 'Yes' : 'No') :
                                                                 String(val)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {Object.keys(payload).length > 12 && (
                                                        <p className="text-[10px] text-gray-400 italic pl-1">...and {Object.keys(payload).length - 12} more fields</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                };

                                return (
                                <div key={change.id} className={`border rounded-lg p-4 ${
                                    change.status === 'PENDING' ? 'border-purple-200 bg-purple-50/30' :
                                    change.status === 'APPROVED' ? 'border-green-200 bg-green-50/30' :
                                    'border-red-200 bg-red-50/30'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                                                change.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                change.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>{change.status}</span>
                                            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                                                {formatChangeType(change.change_type)}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            {moment(change.created_at).format('DD-MMM-YYYY HH:mm')}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-sm text-gray-600">
                                        <span className="font-medium">Requested by:</span> {change.requested_by_email || 'Unknown'}
                                        {change.approved_by_email && (
                                            <span className="ml-4"><span className="font-medium">{change.status === 'APPROVED' ? 'Approved' : 'Rejected'} by:</span> {change.approved_by_email}</span>
                                        )}
                                    </div>
                                    
                                    {/* Payload Details */}
                                    {renderPayloadDetails()}
                                    
                                    {change.rejection_reason && (
                                        <div className="mt-2 text-sm text-red-600">
                                            <span className="font-medium">Reason:</span> {change.rejection_reason}
                                        </div>
                                    )}
                                    {change.status === 'PENDING' && (
                                        <div className="mt-3 flex gap-2">
                                            {change.requested_by_email === currentUserEmail ? (
                                                <span className="text-xs text-gray-400 italic">Awaiting approval from another admin</span>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleAdminChangeApprove(change.id)}
                                                        disabled={processingChangeId === change.id}
                                                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                                    >
                                                        {processingChangeId === change.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                                                        Approve & Apply
                                                    </button>
                                                    <button
                                                        onClick={() => handleAdminChangeReject(change.id)}
                                                        disabled={processingChangeId === change.id}
                                                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
                                                    >
                                                        {processingChangeId === change.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <X className="h-4 w-4 mr-1" />}
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ===== MAINTENANCE ACTIONS TAB ===== */}
            {/* Maintenance tab content removed — now merged into LG Actions tab */}
        </div>
    );
}

export default PendingApprovalsPage;