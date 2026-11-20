// frontend/src/components/Modals/ApprovalRequestDetailsModal.js
import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, Check, FileText, AlertCircle, Loader2, XCircle, Sparkles, ArrowRight, Search } from 'lucide-react';
import moment from 'moment';
import { apiRequest } from '../../services/apiService';
import { toast } from 'react-toastify';
import { openInNewTab } from '../../utils/navUtils';

// NEW: A reusable component to provide a tooltip for disabled elements during the grace period.
const GracePeriodTooltip = ({ children, isGracePeriod }) => {
    if (isGracePeriod) {
        return (
            <div className="relative group inline-block">
                {children}
                <div className="opacity-0 w-max bg-slate-900 text-white text-xs rounded-xl py-2 px-3 absolute z-10 bottom-full left-1/2 -translate-x-1/2 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-lg">
                    This action is disabled during your subscription's grace period.
                    <svg className="absolute text-slate-900 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                        <polygon className="fill-current" points="0,0 127.5,127.5 255,0" />
                    </svg>
                </div>
            </div>
        );
    }
    return children;
};

const buttonBaseClassNames = "inline-flex items-center px-3 py-1.5 text-sm font-semibold rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200";

const formatActionType = (actionType) => {
    if (!actionType) return 'N/A';
    return String(actionType).replace(/_/g, ' ').split(' ').map(word => {
        const upper = word.toUpperCase();
        if (upper === 'LG' || upper === 'ID' || upper === 'RFQ') return upper;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
};

const ApprovalRequestDetailsModal = ({ request, onClose, onApprove, onReject, onWithdraw, isEndUserView, isGracePeriod }) => {
    const [liveRequest, setLiveRequest] = useState(request);
    const [lgRecordSnapshot, setLgRecordSnapshot] = useState(null);
    const [currentLgRecord, setCurrentLgRecord] = useState(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);
    const [detailsError, setDetailsError] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [bulkLgSearch, setBulkLgSearch] = useState('');
    const [isLoadingBulkLgs, setIsLoadingBulkLgs] = useState(false);

    const activeRequest = liveRequest || request;
    const isSingleLgRecord = Boolean(
        activeRequest?.entity_type === 'LGRecord' &&
        activeRequest?.action_type !== 'LG_CHANGE_BULK_LG_OWNER' &&
        activeRequest?.action_type !== 'LG_CHANGE_OWNER_DETAILS'
    );

    useEffect(() => {
        setLiveRequest(request);
        setBulkLgSearch('');
    }, [request]);

    useEffect(() => {
        const fetchLgRecordDetails = async () => {
            setIsLoadingDetails(true);
            setDetailsError('');

            // For Bulk LG Owner Handover, always hydrate fresh list of LGs & owner details
            if (request?.action_type === 'LG_CHANGE_BULK_LG_OWNER') {
                setIsLoadingBulkLgs(true);
                try {
                    let hydrated = request;
                    if (!isEndUserView && request.id) {
                        try {
                            const freshReq = await apiRequest(`/corporate-admin/approval-requests/${request.id}`, 'GET');
                            if (freshReq && freshReq.id) {
                                hydrated = freshReq;
                            }
                        } catch (e) {
                            // Ignore and fall back to client-side hydration below
                        }
                    }

                    const det = { ...(hydrated.request_details || {}) };
                    const hasBackendLgs = Array.isArray(det.affected_lgs) && (det.affected_lgs.length > 0 || hydrated.status !== 'PENDING');

                    if (!hasBackendLgs && det.old_internal_owner_contact_id) {
                        const [allLgs, allOwners] = await Promise.all([
                            apiRequest('/end-user/lg-records/', 'GET').catch(() => []),
                            apiRequest('/end-user/internal-owner-contacts/', 'GET').catch(() => []),
                        ]);
                        const oldId = Number(det.old_internal_owner_contact_id);
                        const newId = det.new_internal_owner_contact_id ? Number(det.new_internal_owner_contact_id) : null;

                        if (Array.isArray(allOwners)) {
                            const oldOwn = allOwners.find(o => Number(o.id) === oldId);
                            const newOwn = newId ? allOwners.find(o => Number(o.id) === newId) : null;
                            if (oldOwn && !det.old_owner_summary) det.old_owner_summary = oldOwn;
                            if (newOwn && !det.new_owner_summary) det.new_owner_summary = newOwn;
                        }

                        if (Array.isArray(allLgs)) {
                            const matchingLgs = allLgs
                                .filter(lg => Number(lg.internal_owner_contact_id ?? lg.internal_owner_contact?.id) === oldId)
                                .map(lg => ({
                                    id: lg.id,
                                    lg_number: lg.lg_number,
                                    issuer_name: lg.issuer_name,
                                    beneficiary_entity: lg.beneficiary_corporate?.entity_name || null,
                                    bank_name: lg.issuing_bank?.name || lg.foreign_bank_name || null,
                                    amount: lg.lg_amount !== undefined && lg.lg_amount !== null ? Number(lg.lg_amount) : 0,
                                    currency_code: lg.lg_currency?.iso_code || 'EGP',
                                    expiry_date: lg.expiry_date,
                                    status: lg.lg_status?.name || null,
                                }));
                            det.affected_lgs = matchingLgs;
                            det.affected_lg_numbers = matchingLgs.map(x => x.lg_number).filter(Boolean);
                            det.affected_lgs_count = matchingLgs.length;
                        }
                    }

                    setLiveRequest({ ...hydrated, request_details: det });
                } catch (err) {
                    console.error("Failed to hydrate bulk LG owner transfer preview:", err);
                } finally {
                    setIsLoadingBulkLgs(false);
                    setIsLoadingDetails(false);
                }
                return;
            }

            const lgRecordId = request?.entity_id;

            if (!lgRecordId || request.entity_type !== 'LGRecord') {
                setLgRecordSnapshot(request.lg_record || null);
                setCurrentLgRecord(null);
                if (!lgRecordId) {
                     setDetailsError("Entity ID for this request is missing. Cannot fetch current details for comparison.");
                } else if (request.entity_type !== 'LGRecord') {
                    setDetailsError(`Request is for entity type '${request.entity_type}', no direct LGRecord comparison available.`);
                }
                setIsLoadingDetails(false);
                return;
            }

            try {
                const currentLgResponse = await apiRequest(`/end-user/lg-records/${lgRecordId}`, 'GET');
                setCurrentLgRecord(currentLgResponse);
                setLgRecordSnapshot(request.lg_record || null);

            } catch (err) {
                console.error("Failed to fetch current LG record for comparison:", err);
                setDetailsError(`Failed to load current LG record details for comparison: ${err.message || 'An unexpected error occurred.'}`);
            } finally {
                setIsLoadingDetails(false);
            }
        };

        if (request) {
            fetchLgRecordDetails();
        }
    }, [request, isEndUserView]);

    const formatAmount = (amount, currencyCode) => {
        if (amount === null || amount === undefined || currencyCode === null || currencyCode === undefined || isNaN(parseFloat(amount))) {
            return 'N/A';
        }
        try {
            const num = parseFloat(amount);
            const formattedNumber = num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            return `${currencyCode || ''} ${formattedNumber}`;
        } catch (e) {
            console.error("Error formatting currency:", e);
            return `${currencyCode || ''} ${parseFloat(amount).toFixed(2)}`;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = moment(dateString);
        return date.isValid() ? date.format('DD-MMM-YYYY') : 'Invalid Date';
    };

    const getFieldDisplay = (label, snapshotValue, currentValue, type = 'text', colSpanClass = '') => {
        let isChanged = false;
        let displaySnapshot = snapshotValue;
        let displayCurrent = currentValue;

        const isLgRecordComparison = request.entity_type === 'LGRecord';

        if (isLgRecordComparison && typeof snapshotValue === 'object' && snapshotValue !== null) {
            if (label === 'Beneficiary') displaySnapshot = snapshotValue.entity_name;
            else if (label === 'Currency') displaySnapshot = snapshotValue.iso_code;
            else if (label === 'Status') displaySnapshot = snapshotValue.name;
            else if (label === 'Operational Status') displaySnapshot = snapshotValue.name;
            else if (label === 'LG Type') displaySnapshot = snapshotValue.name;
            else if (label === 'Internal Owner') displaySnapshot = snapshotValue.email;
            else if (label === 'Issuing Bank') displaySnapshot = snapshotValue.name;
            else if (label === 'Issuing Method') displaySnapshot = snapshotValue.name;
            else if (label === 'Applicable Rule') displaySnapshot = snapshotValue.name;
            else if (label === 'LG Category') displaySnapshot = snapshotValue.category_name;
        }
        if (isLgRecordComparison && typeof currentValue === 'object' && currentValue !== null) {
            if (label === 'Beneficiary') displayCurrent = currentValue.entity_name;
            else if (label === 'Currency') displayCurrent = currentValue.iso_code;
            else if (label === 'Status') displayCurrent = currentValue.name;
            else if (label === 'Operational Status') displayCurrent = currentValue.name;
            else if (label === 'LG Type') displayCurrent = currentValue.name;
            else if (label === 'Internal Owner') displayCurrent = currentValue.email;
            else if (label === 'Issuing Bank') displayCurrent = currentValue.name;
            else if (label === 'Issuing Method') displayCurrent = currentValue.name;
            else if (label === 'Applicable Rule') displayCurrent = currentValue.name;
            else if (label === 'LG Category') displayCurrent = currentValue.category_name;
        }

        if (type === 'amount') {
            const snapCurrency = lgRecordSnapshot?.lg_currency?.iso_code || lgRecordSnapshot?.lg_currency?.symbol;
            const currCurrency = currentLgRecord?.lg_currency?.iso_code || currentLgRecord?.lg_currency?.symbol;

            displaySnapshot = formatAmount(snapshotValue, snapCurrency);
            displayCurrent = formatAmount(currentValue, currCurrency);
            isChanged = parseFloat(snapshotValue || 0) !== parseFloat(currentValue || 0);
        } else if (type === 'date') {
            displaySnapshot = formatDate(snapshotValue);
            displayCurrent = formatDate(currentValue);
            isChanged = (String(snapshotValue) || '') !== (String(currentValue) || '');
        } else if (type === 'boolean') {
            displaySnapshot = snapshotValue ? 'Yes' : 'No';
            displayCurrent = currentValue ? 'Yes' : 'No';
            isChanged = snapshotValue !== currentValue;
        } else if (type === 'json_object') {
            const hasSnap = snapshotValue && typeof snapshotValue === 'object' && Object.keys(snapshotValue).length > 0;
            const hasCurr = currentValue && typeof currentValue === 'object' && Object.keys(currentValue).length > 0;
            displaySnapshot = hasSnap ? JSON.stringify(snapshotValue) : null;
            displayCurrent = hasCurr ? JSON.stringify(currentValue) : null;
            isChanged = (displaySnapshot || '') !== (displayCurrent || '');
        } else if (type === 'list') {
            displaySnapshot = Array.isArray(snapshotValue) ? snapshotValue.join(', ') : String(snapshotValue || '');
            displayCurrent = Array.isArray(currentValue) ? currentValue.join(', ') : String(currentValue || '');
            isChanged = JSON.stringify(snapshotValue) !== JSON.stringify(currentValue);
        }
         else {
            isChanged = (String(displaySnapshot || '') !== String(displayCurrent || ''));
        }

        let displayString;
        if (isChanged) {
            displayString = `${displaySnapshot || 'N/A'} ➔ ${displayCurrent || 'N/A'}`;
        } else {
            displayString = displayCurrent || 'N/A';
        }

        return (
            <div key={label} className={`leading-snug ${colSpanClass}`}>
                <strong className={isChanged ? 'text-red-700' : 'text-gray-700'}>
                    {label}:
                </strong>{' '}
                <span className={isChanged ? 'font-bold text-red-900 bg-red-50 px-1 rounded' : 'text-gray-800'}>
                    {displayString}
                </span>
                {isChanged && <span className="text-red-500 text-[11px] font-medium ml-1.5">(Changed)</span>}
            </div>
        );
    };

    const handleViewDocument = async (documentId) => {
		try {
			const response = await apiRequest(`/end-user/lg-documents/${documentId}/view`, 'GET');
			const targetUrl = response?.download_url || response?.signed_url;
			if (targetUrl) {
				openInNewTab(targetUrl);
			} else {
				toast.error("Failed to retrieve the document link.");
			}
		} catch (err) {
			toast.error(`Error retrieving document: ${err.message}`);
		}
	};

	const renderActionSpecificDetails = () => {
        if (!activeRequest || !activeRequest.request_details) return null;

        const details = activeRequest.request_details;

        switch (activeRequest.action_type) {
			case 'LG_DECREASE_AMOUNT':
				return (
					<div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
						<h4 className="font-semibold text-blue-800 mb-2">Decrease Amount Request Details:</h4>
						<p><strong>Amount to Decrease:</strong> {formatAmount(details.decrease_amount, request.lg_record?.lg_currency?.iso_code)}</p>
						<p><strong>Reason:</strong> {details.reason || 'No reason provided'}</p>
						<p><strong>Additional Notes:</strong> {details.notes || 'No notes provided'}</p>
						{/* FIX: Add conditional rendering for the supporting document */}
						{details.supporting_document_id && (
							<p className="mt-2">
								<FileText className="inline-block h-4 w-4 mr-1" />
								<button
									onClick={() => handleViewDocument(details.supporting_document_id)}
									className="text-blue-600 hover:underline focus:outline-none"
								>
									View Supporting Document (ID: {details.supporting_document_id})
								</button>
							</p>
						)}
					</div>
				);
			case 'LG_LIQUIDATE':
				return (
					<div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
						<h4 className="font-semibold text-blue-800 mb-2">LG Liquidation Request Details:</h4>
						<p><strong>Liquidation Type:</strong> {details.liquidation_type || 'N/A'}</p>
						{details.liquidation_type === 'partial' && (
							<p><strong>New Amount (for partial):</strong> {formatAmount(details.new_amount, request.lg_record?.lg_currency?.iso_code)}</p>
						)}
						<p><strong>Reason:</strong> {details.reason || 'No reason provided'}</p>
						<p><strong>Additional Notes:</strong> {details.notes || 'No notes provided'}</p>
						{request.lg_record?.mandatory_claim_statement && (
							<div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-md text-xs">
								<span className="font-semibold text-amber-900 flex items-center gap-1">
									<Sparkles className="w-3.5 h-3.5 text-amber-600 inline" />
									Original LG Mandatory Claim Clause:
								</span>
								<p className="text-amber-950 italic mt-1 font-mono">{request.lg_record.mandatory_claim_statement}</p>
							</div>
						)}
						{/* FIX: Add conditional rendering for the supporting document */}
						{details.supporting_document_id && (
							<p className="mt-2">
								<FileText className="inline-block h-4 w-4 mr-1" />
								<button
									onClick={() => handleViewDocument(details.supporting_document_id)}
									className="text-blue-600 hover:underline focus:outline-none"
								>
									View Supporting Document (ID: {details.supporting_document_id})
								</button>
							</p>
						)}
					</div>
				);
			case 'LG_RELEASE':
				return (
					<div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
						<h4 className="font-semibold text-blue-800 mb-2">LG Release Request Details:</h4>
						<p><strong>Reason:</strong> {details.reason || 'No reason provided'}</p>
						<p><strong>Additional Notes:</strong> {details.notes || 'No notes provided'}</p>
						{/* FIX: Add conditional rendering for the supporting document */}
						{details.supporting_document_id && (
							<p className="mt-2">
								<FileText className="inline-block h-4 w-4 mr-1" />
								<button
									onClick={() => handleViewDocument(details.supporting_document_id)}
									className="text-blue-600 hover:underline focus:outline-none"
								>
									View Supporting Document (ID: {details.supporting_document_id})
								</button>
							</p>
						)}
					</div>
				);
			case 'LG_AMEND':
				return (
					<div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
						<h4 className="font-semibold text-blue-800 mb-2">LG Amendment Request Details:</h4>
						<p><strong>Reason:</strong> {details.reason || 'No reason provided'}</p>
						{details.amendment_details && (
							<div>
								<p className="font-medium mt-2">Requested Amendments:</p>
								<ul className="list-disc list-inside ml-4">
									{Object.entries(details.amendment_details).map(([key, value]) => (
										<li key={key}>
											<strong>{formatActionType(key.replace(/_id$/, ''))}:</strong> {
												(key.includes('date') && value) ? formatDate(value) :
												(key.includes('amount') && value) ? formatAmount(value, request.lg_record?.lg_currency?.iso_code) :
												(typeof value === 'object' && value !== null) ? JSON.stringify(value) :
												String(value)
											}
										</li>
									))}
								</ul>
							</div>
						)}
						{details.amendment_document_id && (
							<p className="mt-2">
								<FileText className="inline-block h-4 w-4 mr-1" />
								{/* FIX: Use an onClick handler to fetch the signed URL */}
								<button
									onClick={() => handleViewDocument(details.amendment_document_id)}
									className="text-blue-600 hover:underline focus:outline-none"
								>
									View Amendment Letter (ID: {details.amendment_document_id})
								</button>
							</p>
						)}
					</div>
				);
            case 'LG_ACTIVATE_NON_OPERATIVE':
                const paymentCurrencyCode = details.currency_id ? (currentLgRecord?.lg_currency?.iso_code || currentLgRecord?.lg_currency?.symbol) : 'N/A';
                return (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <h4 className="font-semibold text-blue-800 mb-2">LG Activation Request Details:</h4>
                        <p><strong>Payment Method:</strong> {details.payment_method || 'N/A'}</p>
                        <p><strong>Amount:</strong> {formatAmount(details.amount, paymentCurrencyCode)}</p>
                        <p><strong>Payment Reference:</strong> {details.payment_reference || 'N/A'}</p>
                        <p><strong>Issuing Bank ID:</strong> {details.issuing_bank_id || 'N/A'}</p>
                        <p><strong>Payment Date:</strong> {formatDate(details.payment_date) || 'N/A'}</p>
						<p><strong>Additional Notes:</strong> {details.notes || 'No notes provided'}</p>
                        {/* FIX: Add conditional rendering for the supporting document */}
                        {details.supporting_document_id && (
                            <p className="mt-2">
                                <FileText className="inline-block h-4 w-4 mr-1" />
                                <button
                                    onClick={() => handleViewDocument(details.supporting_document_id)}
                                    className="text-blue-600 hover:underline focus:outline-none"
                                >
                                    View Supporting Document (ID: {details.supporting_document_id})
                                </button>
                            </p>
                        )}
                    </div>
                );
            case 'LG_CHANGE_OWNER_DETAILS':
                const oldOwnerSnapshot = request.lg_record_snapshot;
                return (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <h4 className="font-semibold text-blue-800 mb-2">Update Internal Owner Details:</h4>
                        <p><strong>Old Email:</strong> {oldOwnerSnapshot?.email || 'N/A'}</p>
                        <p><strong>New Email:</strong> {details.email || 'N/A'}</p>
                        <p><strong>New Phone:</strong> {details.phone_number || 'N/A'}</p>
                        <p><strong>New Manager Email:</strong> {details.manager_email || 'N/A'}</p>
                        <p><strong>Reason:</strong> {details.reason || 'No reason provided'}</p>
                    </div>
                );
            case 'LG_CHANGE_SINGLE_LG_OWNER':
            case 'LG_CHANGE_BULK_LG_OWNER': {
                const oldSummary = details.old_owner_summary || (activeRequest.entity_type === 'InternalOwnerContact' ? activeRequest.lg_record_snapshot : null) || {};
                const newSummary = details.new_owner_summary || details.new_internal_owner_contact_details || {};
                const affectedCount = Array.isArray(details.affected_lgs)
                    ? details.affected_lgs.length
                    : (Array.isArray(details.affected_lg_numbers) ? details.affected_lg_numbers.length : (details.lg_record_id ? 1 : 0));

                return (
                    <div className="mt-4 p-3 bg-blue-50/80 border border-blue-200 rounded-md space-y-2">
                        <div className="flex items-center justify-between border-b border-blue-200/70 pb-1.5">
                            <h4 className="font-semibold text-blue-900">{formatActionType(activeRequest.action_type)} Details</h4>
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                {affectedCount} Guarantee{affectedCount !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                            <div className="p-2 bg-white border border-gray-200 rounded-md">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-0.5">From (Current Owner)</p>
                                <p className="font-semibold text-gray-900 break-all">
                                    {oldSummary.email || (details.old_internal_owner_contact_id ? `Owner ID #${details.old_internal_owner_contact_id}` : 'N/A')}
                                </p>
                                {oldSummary.internal_id && <p className="text-[11px] text-gray-500">ID: {oldSummary.internal_id}</p>}
                                {oldSummary.manager_email && <p className="text-[11px] text-gray-500 break-all">Mgr: {oldSummary.manager_email}</p>}
                            </div>
                            <div className="p-2 bg-white border border-emerald-200 rounded-md">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 mb-0.5 flex items-center gap-1">
                                    <ArrowRight className="h-3 w-3" /> To (New Owner)
                                </p>
                                <p className="font-semibold text-emerald-950 break-all">
                                    {newSummary.email || (details.new_internal_owner_contact_id ? `Owner ID #${details.new_internal_owner_contact_id}` : 'N/A')}
                                </p>
                                {newSummary.internal_id && <p className="text-[11px] text-gray-600">ID: {newSummary.internal_id}</p>}
                                {newSummary.phone_number && <p className="text-[11px] text-gray-600">Tel: {newSummary.phone_number}</p>}
                                {newSummary.manager_email && <p className="text-[11px] text-gray-600 break-all">Mgr: {newSummary.manager_email}</p>}
                            </div>
                        </div>
                        <p className="text-gray-800 pt-0.5">
                            <strong>Reason:</strong> {details.reason || 'No reason provided'}
                        </p>
                    </div>
                );
            }
            case 'ISSUANCE_CHANGE_REQUESTOR': {
                const newReq = details.new_requestor || {};
                const lgIds = details.lg_ids || [];
                return (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <h4 className="font-semibold text-blue-800 mb-2">Issuance Ownership Transfer Details:</h4>
                        <div className="space-y-2 text-sm">
                            <p><strong>Affected LG Records:</strong> {lgIds.length} LG{lgIds.length !== 1 ? 's' : ''} (IDs: {lgIds.join(', ')})</p>
                            <div className="mt-3 p-3 bg-white border border-blue-100 rounded-lg">
                                <p className="font-semibold text-gray-700 mb-1">New Requestor:</p>
                                <p><strong>Name:</strong> {newReq.name || 'N/A'}</p>
                                <p><strong>Email:</strong> {newReq.email || 'N/A'}</p>
                                {newReq.department && <p><strong>Department:</strong> {newReq.department}</p>}
                                {newReq.job_title && <p><strong>Job Title:</strong> {newReq.job_title}</p>}
                                {newReq.phone_number && <p><strong>Phone:</strong> {newReq.phone_number}</p>}
                                {newReq.employee_id && <p><strong>Employee ID:</strong> {newReq.employee_id}</p>}
                            </div>
                        </div>
                    </div>
                );
            }
            case 'LG_CANCEL_LAST_INSTRUCTION': {
                const targetInst = currentLgRecord?.instructions?.find(
                    inst => Number(inst.id) === Number(details.instruction_id)
                ) || request.related_instruction || null;

                const instSerial = details.instruction_serial || targetInst?.serial_number || `ID #${details.instruction_id}`;
                const instTypeRaw = details.instruction_type || targetInst?.instruction_type;
                const instTypeFormatted = instTypeRaw ? formatActionType(instTypeRaw) : 'Instruction';
                const instStatus = details.instruction_status || targetInst?.status || 'N/A';
                const instMeta = targetInst?.details || {};
                const oldExpiry = details.old_expiry_date || instMeta.old_expiry_date;
                const newExpiry = details.new_expiry_date || instMeta.new_expiry_date;

                let rollbackSummary = 'Approving this request will mark the instruction as Canceled and roll back the LG to its prior state.';
                if (oldExpiry && newExpiry) {
                    rollbackSummary = `Expiry Date will roll back from ${formatDate(newExpiry)} ➔ ${formatDate(oldExpiry)}`;
                } else if (instTypeRaw === 'LG_DECREASE_AMOUNT' && instMeta.decrease_amount) {
                    rollbackSummary = `LG Amount will be restored by adding back ${formatAmount(instMeta.decrease_amount, currentLgRecord?.lg_currency?.iso_code || request.lg_record?.lg_currency?.iso_code)}`;
                } else if (instTypeRaw === 'LG_RELEASE' || instTypeRaw === 'LG_LIQUIDATE') {
                    rollbackSummary = 'LG Status will revert to Valid';
                }

                const handleViewTargetLetter = async () => {
                    if (!details.instruction_id) return;
                    try {
                        const response = await apiRequest(
                            `/end-user/lg-records/instructions/${details.instruction_id}/view-letter`,
                            'GET',
                            null,
                            'text/html',
                            'text'
                        );
                        const blob = new Blob([response], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        openInNewTab(url);
                    } catch (err) {
                        toast.error(`Failed to open instruction letter: ${err.message || 'Unexpected error'}`);
                    }
                };

                return (
                    <div className="mt-4 p-3.5 bg-rose-50/70 border border-rose-200 rounded-lg space-y-2 text-sm">
                        <div className="flex items-center justify-between border-b border-rose-200/80 pb-2 mb-1">
                            <h4 className="font-semibold text-rose-900">Instruction Cancellation Details</h4>
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                {instTypeFormatted}
                            </span>
                        </div>
                        <p className="text-gray-800">
                            <strong className="text-gray-700">Instruction Serial:</strong>{' '}
                            <span className="font-mono font-semibold text-gray-900">{instSerial}</span>
                        </p>
                        <p className="text-gray-800">
                            <strong className="text-gray-700">Instruction Status:</strong>{' '}
                            <span>{instStatus}</span>
                        </p>
                        <div className="p-2.5 bg-white border border-rose-200 rounded-md text-xs text-rose-900">
                            <strong className="block text-rose-800 mb-0.5">Rollback Impact on Approval:</strong>
                            {rollbackSummary}
                        </div>
                        <p className="text-gray-800">
                            <strong className="text-gray-700">Cancellation Reason:</strong>{' '}
                            <span className="italic text-gray-900">{(details.reason || '').trim() || 'No reason provided'}</span>
                        </p>
                        <div className="flex items-center justify-between pt-1">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                                <Check className="h-3.5 w-3.5" />
                                Maker Null & Void Declaration Confirmed
                            </span>
                            {details.instruction_id && (
                                <button
                                    type="button"
                                    onClick={handleViewTargetLetter}
                                    className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline focus:outline-none"
                                >
                                    <FileText className="h-3.5 w-3.5 mr-1" />
                                    View Instruction Letter
                                </button>
                            )}
                        </div>
                    </div>
                );
            }
            default:
                return (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <h4 className="font-semibold text-blue-800 mb-2">Generic Action Details:</h4>
                        {Object.keys(details || {}).length > 0 ? (
                            <pre className="text-sm overflow-x-auto p-2 bg-gray-100 rounded">
                                {JSON.stringify(details, null, 2)}
                            </pre>
                        ) : (
                            <p className="text-gray-500">No specific action details available for this type.</p>
                        )}
                    </div>
                );
        }
    };

    const areButtonsEnabled = request.status === 'PENDING';

    return (
        <Transition show={true} as={React.Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <TransitionChild
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
                </TransitionChild>

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-3 text-center sm:p-4">
                        <TransitionChild
                            as={React.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white border border-slate-200/80 text-left shadow-2xl transition-all my-auto w-full sm:max-w-5xl flex flex-col max-h-[90vh]">
                                {/* Sticky Header */}
                                <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex items-start justify-between gap-3 shrink-0">
                                    <div className="text-left min-w-0">
                                        <DialogTitle as="h3" className="text-base sm:text-lg font-bold leading-6 text-slate-900 tracking-tight flex items-center flex-wrap gap-2">
                                            <span>
                                                Review Approval Request:{' '}
                                                {activeRequest.action_type === 'LG_CHANGE_BULK_LG_OWNER'
                                                    ? `Bulk Handover (${activeRequest.request_details?.affected_lgs?.length ?? activeRequest.request_details?.affected_lg_numbers?.length ?? 0} LGs)`
                                                    : (activeRequest.lg_record?.lg_number || 'N/A')}{' '}
                                                - {formatActionType(activeRequest.action_type)}
                                            </span>
                                            <span className={`px-2.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full border ${
                                                activeRequest.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                activeRequest.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                activeRequest.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                'bg-slate-100 text-slate-700 border-slate-200'
                                            }`}>
                                                {activeRequest.status}
                                            </span>
                                        </DialogTitle>
                                        <p className="text-xs text-rose-600/90 mt-1">
                                            Review the details below. The data presented are based on the most recent information available, rather than the data at the time the request was submitted.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 shrink-0"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <X className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </div>

                                {/* Scrollable Body */}
                                <div className="px-5 py-4 overflow-y-auto flex-1">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-[13px] mb-3 items-start [&>div]:mt-0 [&_h4]:mb-1">
                                        <div className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-1 text-slate-700">
                                            <h4 className="font-semibold text-slate-900 mb-1">Request Information:</h4>
                                            <p><strong>Action Type:</strong> {formatActionType(request.action_type)}</p>
                                            <p><strong>Requested By:</strong> {request.maker_user?.email || 'N/A'}</p>
                                            <p><strong>Requested On:</strong> {moment(request.created_at).format('DD-MMM-YYYY HH:mm')}</p>
                                            {request.status === 'REJECTED' && request.reason && (
                                                 <p className="text-rose-600"><strong>Rejection Reason:</strong> {request.reason}</p>
                                            )}
                                            {request.status === 'APPROVED' && request.checker_user?.email && (
                                                <p className="text-emerald-600"><strong>Approved By:</strong> {request.checker_user.email} on {moment(request.updated_at).format('DD-MMM-YYYY HH:mm')}</p>
                                            )}
                                            {request.status !== 'PENDING' && !request.checker_user?.email && (
                                                <p className="text-slate-500 italic mt-1">This request was automatically {request.status.toLowerCase()}.</p>
                                            )}
                                        </div>
                                        {renderActionSpecificDetails()}
                                    </div>

                                    {/* Bulk LG Owner Transfer Portfolio Table */}
                                    {activeRequest.action_type === 'LG_CHANGE_BULK_LG_OWNER' && (() => {
                                        const rawLgs = Array.isArray(activeRequest.request_details?.affected_lgs)
                                            ? activeRequest.request_details.affected_lgs
                                            : (Array.isArray(activeRequest.request_details?.affected_lg_numbers)
                                                ? activeRequest.request_details.affected_lg_numbers.map((num, idx) => ({ id: idx, lg_number: num }))
                                                : []);

                                        const q = bulkLgSearch.trim().toLowerCase();
                                        const filteredLgs = q
                                            ? rawLgs.filter(lg =>
                                                (lg.lg_number || '').toLowerCase().includes(q) ||
                                                (lg.issuer_name || '').toLowerCase().includes(q) ||
                                                (lg.beneficiary_entity || '').toLowerCase().includes(q) ||
                                                (lg.bank_name || '').toLowerCase().includes(q)
                                            )
                                            : rawLgs;

                                        const totalsByCurrency = rawLgs.reduce((acc, lg) => {
                                            if (lg.amount !== undefined && lg.amount !== null && lg.currency_code) {
                                                acc[lg.currency_code] = (acc[lg.currency_code] || 0) + Number(lg.amount || 0);
                                            }
                                            return acc;
                                        }, {});

                                        return (
                                            <div className="mt-2 border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-sm">
                                                <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                                                    <div className="flex items-center flex-wrap gap-2">
                                                        <h4 className="text-xs sm:text-sm font-semibold text-slate-800">
                                                            Guarantees Being Transferred ({rawLgs.length})
                                                        </h4>
                                                        {Object.entries(totalsByCurrency).map(([ccy, sumAmt]) => (
                                                            <span
                                                                key={ccy}
                                                                className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200"
                                                            >
                                                                Total {formatAmount(sumAmt, ccy)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    {rawLgs.length > 5 && (
                                                        <div className="relative w-52">
                                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                                                            <input
                                                                type="text"
                                                                value={bulkLgSearch}
                                                                onChange={(e) => setBulkLgSearch(e.target.value)}
                                                                placeholder="Filter LG #, issuer, bank..."
                                                                className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {isLoadingBulkLgs && rawLgs.length === 0 ? (
                                                    <div className="p-4 flex items-center justify-center text-xs text-indigo-700 bg-indigo-50/40">
                                                        <Loader2 className="animate-spin h-4 w-4 mr-2 text-indigo-600" />
                                                        Loading guarantees being transferred...
                                                    </div>
                                                ) : rawLgs.length === 0 ? (
                                                    <div className="p-4 text-center text-xs text-amber-700 bg-amber-50/60">
                                                        No active LG records currently remain under this owner.
                                                    </div>
                                                ) : (
                                                    <div className="max-h-60 overflow-y-auto">
                                                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                                                            <thead className="bg-slate-50 sticky top-0 z-10">
                                                                <tr>
                                                                    <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">LG Number</th>
                                                                    <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">Applicant / Issuer</th>
                                                                    <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">Entity</th>
                                                                    <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">Bank</th>
                                                                    <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                                                                    <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">Expiry</th>
                                                                    <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white divide-y divide-slate-100">
                                                                {filteredLgs.map((lg, idx) => (
                                                                    <tr key={lg.id || lg.lg_number || idx} className="hover:bg-slate-50/80 transition-colors">
                                                                        <td className="px-3 py-2 whitespace-nowrap font-mono font-semibold text-indigo-700">
                                                                            {lg.lg_number || 'N/A'}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-slate-800 max-w-[180px] truncate" title={lg.issuer_name || ''}>
                                                                            {lg.issuer_name || '—'}
                                                                        </td>
                                                                        <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                                                                            {lg.beneficiary_entity || '—'}
                                                                        </td>
                                                                        <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                                                                            {lg.bank_name || '—'}
                                                                        </td>
                                                                        <td className="px-3 py-2 whitespace-nowrap text-right font-medium text-slate-900">
                                                                            {lg.amount !== undefined && lg.currency_code
                                                                                ? formatAmount(lg.amount, lg.currency_code)
                                                                                : '—'}
                                                                        </td>
                                                                        <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                                                                            {lg.expiry_date ? formatDate(lg.expiry_date) : '—'}
                                                                        </td>
                                                                        <td className="px-3 py-2 whitespace-nowrap">
                                                                            <span className={`px-2 py-0.5 inline-flex text-[11px] font-semibold rounded-full border ${
                                                                                (lg.status || '').toLowerCase() === 'valid'
                                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                                                            }`}>
                                                                                {lg.status || '—'}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Only show LG Record comparison for single-LG LGRecord entity types */}
                                    {isSingleLgRecord && (
                                    <>
                                    <h4 className="text-xs sm:text-sm font-semibold text-slate-800 mb-1.5 border-b border-slate-200 pb-1">LG Record Details (Snapshot vs. Current)</h4>

                                    {isLoadingDetails ? (
                                        <div className="flex justify-center items-center py-3">
                                            <Loader2 className="animate-spin h-5 w-5 text-indigo-600" />
                                            <p className="ml-2 text-xs text-slate-600">Loading LG record details...</p>
                                        </div>
                                    ) : detailsError ? (
                                        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 text-xs rounded-xl flex items-center">
                                            <AlertCircle className="mr-2" size={16} />
                                            {detailsError}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5 text-xs sm:text-[13px] text-slate-700 bg-slate-50/70 border border-slate-200/80 rounded-xl p-3">
                                            {getFieldDisplay('LG Number', lgRecordSnapshot?.lg_number, currentLgRecord?.lg_number)}
                                            {getFieldDisplay('Issuer Name', lgRecordSnapshot?.issuer_name, currentLgRecord?.issuer_name)}
                                            {getFieldDisplay('Beneficiary', lgRecordSnapshot?.beneficiary_corporate, currentLgRecord?.beneficiary_corporate)}
                                            {getFieldDisplay('Amount', lgRecordSnapshot?.lg_amount, currentLgRecord?.lg_amount, 'amount')}
                                            {getFieldDisplay('Currency', lgRecordSnapshot?.lg_currency, currentLgRecord?.lg_currency)}
                                            {getFieldDisplay('Issuance Date', lgRecordSnapshot?.issuance_date, currentLgRecord?.issuance_date, 'date')}
                                            {getFieldDisplay('Expiry Date', lgRecordSnapshot?.expiry_date, currentLgRecord?.expiry_date, 'date')}
                                            {getFieldDisplay('Auto Renewal', lgRecordSnapshot?.auto_renewal, currentLgRecord?.auto_renewal, 'boolean')}
                                            {getFieldDisplay('LG Type', lgRecordSnapshot?.lg_type, currentLgRecord?.lg_type)}
                                            {getFieldDisplay('Status', lgRecordSnapshot?.lg_status, currentLgRecord?.lg_status)}
                                            {getFieldDisplay('Operational Status', lgRecordSnapshot?.lg_operational_status, currentLgRecord?.lg_operational_status)}
                                            {getFieldDisplay('Payment Conditions', lgRecordSnapshot?.payment_conditions, currentLgRecord?.payment_conditions)}
                                            {getFieldDisplay('Issuing Bank', lgRecordSnapshot?.issuing_bank, currentLgRecord?.issuing_bank)}
                                            {getFieldDisplay('Internal Owner', lgRecordSnapshot?.internal_owner_contact, currentLgRecord?.internal_owner_contact)}
                                            {getFieldDisplay('LG Category', lgRecordSnapshot?.lg_category, currentLgRecord?.lg_category)}
                                            {getFieldDisplay('Applicable Rules Text', lgRecordSnapshot?.applicable_rules_text, currentLgRecord?.applicable_rules_text)}
                                            {getFieldDisplay('Other Conditions', lgRecordSnapshot?.other_conditions, currentLgRecord?.other_conditions)}
                                            {getFieldDisplay('Internal Contract/Project ID', lgRecordSnapshot?.internal_contract_project_id, currentLgRecord?.internal_contract_project_id)}
                                            {getFieldDisplay('Additional Fields', lgRecordSnapshot?.additional_field_values, currentLgRecord?.additional_field_values, 'json_object')}
                                            {getFieldDisplay('Notes', lgRecordSnapshot?.notes, currentLgRecord?.notes)}
                                            {getFieldDisplay('Description Purpose', lgRecordSnapshot?.description_purpose, currentLgRecord?.description_purpose, 'text', 'sm:col-span-2 lg:col-span-3')}
                                        </div>
                                    )}
                                    </>)}
                                </div>

                                {/* Sticky Footer */}
                                <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 shrink-0">
                                    {isEndUserView ? (
                                        <div className="flex items-center justify-between gap-3">
                                            {!areButtonsEnabled ? (
                                                <p className="text-slate-500 text-xs italic">
                                                    No actions available for this request (status is {request.status.toLowerCase()}).
                                                </p>
                                            ) : <span />}
                                            <div className="flex items-center gap-2">
                                                {areButtonsEnabled && (
                                                    <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                        <button
                                                            type="button"
                                                            className={`${buttonBaseClassNames} rounded-xl bg-rose-600 text-white hover:bg-rose-700 px-4 py-2 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            onClick={() => {
                                                                if (areButtonsEnabled && onWithdraw) {
                                                                    setIsProcessing(true);
                                                                    onWithdraw(request.id).finally(() => setIsProcessing(false));
                                                                }
                                                            }}
                                                            disabled={isProcessing || isGracePeriod}
                                                        >
                                                            {isProcessing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <XCircle className="h-4 w-4 mr-1.5" />}
                                                            {isProcessing ? 'Withdrawing...' : 'Withdraw Request'}
                                                        </button>
                                                    </GracePeriodTooltip>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={onClose}
                                                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-sm transition-colors"
                                                >
                                                    Close
                                                </button>
                                            </div>
                                        </div>
                                    ) : areButtonsEnabled ? (
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                                            <input
                                                type="text"
                                                placeholder="Reason for rejection (optional)..."
                                                value={rejectionReason}
                                                onChange={(e) => setRejectionReason(e.target.value)}
                                                className={`flex-1 rounded-xl border border-slate-300 bg-white shadow-sm text-xs sm:text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                disabled={isProcessing || isGracePeriod}
                                            />
                                            <div className="flex items-center justify-end gap-2 shrink-0">
                                                <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                    <button
                                                        type="button"
                                                        className={`${buttonBaseClassNames} rounded-xl bg-white text-rose-600 border border-rose-300 hover:bg-rose-50 px-4 py-2 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        onClick={() => {
                                                            if (areButtonsEnabled && onReject) {
                                                                setIsProcessing(true);
                                                                onReject(request.id, rejectionReason).finally(() => setIsProcessing(false));
                                                            }
                                                        }}
                                                        disabled={isProcessing || isGracePeriod}
                                                    >
                                                        {isProcessing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <X className="h-4 w-4 mr-1.5" />}
                                                        {isProcessing ? 'Rejecting...' : 'Reject'}
                                                    </button>
                                                </GracePeriodTooltip>
                                                <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                                    {(() => {
                                                        const isZeroBulkOwner = activeRequest?.action_type === 'LG_CHANGE_BULK_LG_OWNER'
                                                            && !isLoadingBulkLgs
                                                            && (Array.isArray(activeRequest?.request_details?.affected_lgs)
                                                                ? activeRequest.request_details.affected_lgs.length
                                                                : (activeRequest?.request_details?.affected_lg_numbers?.length || 0)) === 0;
                                                        return (
                                                            <button
                                                                type="button"
                                                                className={`${buttonBaseClassNames} rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 px-5 py-2 ${isGracePeriod || isZeroBulkOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                title={isZeroBulkOwner ? 'Cannot approve — 0 LG records remain under this owner (please reject this stale request)' : undefined}
                                                                onClick={() => {
                                                                    if (areButtonsEnabled && !isZeroBulkOwner && onApprove) {
                                                                        setIsProcessing(true);
                                                                        onApprove(request.id).finally(() => setIsProcessing(false));
                                                                    }
                                                                }}
                                                                disabled={isProcessing || isGracePeriod || isZeroBulkOwner}
                                                            >
                                                                {isProcessing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}
                                                                {isProcessing ? 'Approving...' : 'Approve'}
                                                            </button>
                                                        );
                                                    })()}
                                                </GracePeriodTooltip>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <p className="text-slate-500 text-xs italic">
                                                No actions available for this request (status is {request.status.toLowerCase()}).
                                            </p>
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-sm transition-colors"
                                            >
                                                Close
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default ApprovalRequestDetailsModal;