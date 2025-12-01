// frontend/src/pages/CorporateAdmin/PendingApprovalsPage.js
import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { apiRequest } from '../../services/apiService';
import { Loader2, AlertCircle, Eye, Check, X, ChevronDown, ChevronUp, Download, XCircle, Search } from 'lucide-react';
import moment from 'moment';
import { toast } from 'react-toastify';
import ApprovalRequestDetailsModal from '../../components/Modals/ApprovalRequestDetailsModal';
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
            console.error("Failed to fetch approval requests:", err);
            setError(`Failed to load approval requests. ${err.message || 'An unexpected error occurred.'}`);
            toast.error(`Failed to load approval requests: ${err.message || 'An unexpected error occurred.'}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchApprovalRequests();
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

    return (
        <div className="card">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-semibold text-gray-800">Pending Approval Requests</h2>
                
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

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4 flex items-center" role="alert">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            {/* Filters Row */}
            <div className="mb-4 flex flex-col md:flex-row items-center flex-wrap gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="relative flex-grow min-w-[200px] w-full md:w-auto">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search LG No, Requestor, Authorizer..."
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
                                    {selectedStatuses.length === 0 ? 'Filter Status' : selectedStatuses.length === uniqueStatuses.length ? 'All Statuses' : `Selected (${selectedStatuses.length})`}
                                </span>
                                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                    <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                </span>
                            </Listbox.Button>
                            <Transition show={open} as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                {/* FIX: Added z-50 to ensure dropdown appears above sticky table content */}
                                <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                    {uniqueStatuses.map((status) => (
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

            {isLoading ? (
                <div className="text-center py-8">
                    <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto" />
                    <p className="text-gray-600 mt-2">Loading approval requests...</p>
                </div>
            ) : filteredAndSortedRequests.length === 0 ? (
                <div className="bg-gray-100 p-6 rounded-lg text-center border border-gray-200">
                    <p className="text-gray-700">No requests match your criteria.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg shadow relative">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {/* Standard Headers */}
                                {['lg_number', 'action_type', 'maker', 'created_at', 'checker', 'status'].map((col) => (
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
                                            {col === 'checker' && 'Auth/Rej By'}
                                            {col === 'status' && 'Status'}
                                            {renderSortIcon(col)}
                                        </div>
                                    </th>
                                ))}
                                {/* STICKY HEADER for Actions */}
                                <th scope="col" className="sticky right-0 z-10 bg-gray-50 border-l border-gray-200 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider shadow-sm">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredAndSortedRequests.map((request) => (
                                <tr 
                                    key={request.id} 
                                    className="group hover:bg-blue-50 transition-colors cursor-pointer"
                                    onClick={() => handleViewDetails(request)}
                                >
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                        {request.lg_record?.lg_number || 'N/A'}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{formatActionType(request.action_type)}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{request.maker_user?.email || 'N/A'}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{moment(request.created_at).format('DD-MMM-YYYY HH:mm')}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{getDeciderName(request)}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            request.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                            request.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                            request.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {request.status}
                                        </span>
                                    </td>

                                    {/* STICKY ACTION COLUMN */}
                                    <td className="sticky right-0 z-10 bg-white group-hover:bg-blue-50 border-l border-gray-200 px-4 py-4 whitespace-nowrap text-center text-sm font-medium transition-colors shadow-sm">
                                        <div className="flex justify-center space-x-2">
                                            {/* We use e.stopPropagation() so clicking the button doesn't trigger the row click */}
                                            <button
                                                onClick={(e) => handleActionClick(e, () => handleViewDetails(request))}
                                                className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-white"
                                                title="View Details"
                                            >
                                                <Eye className="h-5 w-5" />
                                            </button>
                                            
                                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                <button
                                                    onClick={(e) => handleActionClick(e, () => handleApprove(request.id))}
                                                    className={`text-green-600 hover:text-green-900 p-1 rounded-md hover:bg-white ${request.status !== 'PENDING' || isGracePeriod ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                    title="Approve"
                                                    disabled={request.status !== 'PENDING' || isGracePeriod}
                                                >
                                                    <Check className="h-5 w-5" />
                                                </button>
                                            </GracePeriodTooltip>
                                            
                                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                <button
                                                    onClick={(e) => handleActionClick(e, () => handleReject(request.id))}
                                                    className={`text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-white ${request.status !== 'PENDING' || isGracePeriod ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                    title="Reject"
                                                    disabled={request.status !== 'PENDING' || isGracePeriod}
                                                >
                                                    <X className="h-5 w-5" />
                                                </button>
                                            </GracePeriodTooltip>
                                        </div>
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
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isGracePeriod={isGracePeriod}
                />
            )}
        </div>
    );
}

export default PendingApprovalsPage;