import React, { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, Check, Loader2, Clock, User, ArrowRight, ArrowUp, ArrowDown, GitCompareArrows } from 'lucide-react';
import moment from 'moment';

const formatActionType = (type) => {
    const map = {
        EXTEND: 'Extend Expiry',
        INCREASE_AMOUNT: 'Increase Amount',
        AMENDMENT: 'Amendment',
        ACTIVATE: 'Activate (Non-Operative)',
        CLOSE: 'Close / Return',
        LIQUIDATION: 'Liquidation',
        CHANGE_OWNERSHIP: 'Change Owner',
    };
    return map[type] || (type || '').replace(/_/g, ' ');
};

const formatCurrency = (amount, code) => {
    if (!amount && amount !== 0) return 'N/A';
    const num = parseFloat(amount);
    if (isNaN(num)) return 'N/A';
    const formatted = num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return code ? `${code} ${formatted}` : formatted;
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = moment(dateString);
    return d.isValid() ? d.format('DD-MMM-YYYY') : 'N/A';
};

// ── Visual comparison row: Current → Proposed ──
const ComparisonRow = ({ label, current, proposed, changed }) => (
    <tr className={changed ? 'bg-amber-50/70' : ''}>
        <td className="py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap align-top">{label}</td>
        <td className="py-2.5 px-3 text-sm text-gray-700 align-top">{current}</td>
        <td className="py-2.5 px-1 text-center align-top">
            {changed ? <ArrowRight className="h-4 w-4 text-amber-500 inline" /> : <span className="text-gray-300">—</span>}
        </td>
        <td className={`py-2.5 px-3 text-sm font-semibold align-top ${changed ? 'text-blue-700' : 'text-gray-400'}`}>
            {changed ? proposed : '—'}
        </td>
    </tr>
);

const MaintenanceActionApprovalModal = ({ action, onClose, onApprove, onReject }) => {
    const [rejectionReason, setRejectionReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    if (!action) return null;

    const handleApprove = async () => {
        if (!window.confirm('Approve this maintenance action?')) return;
        setIsProcessing(true);
        try { await onApprove(action.id); } finally { setIsProcessing(false); }
    };

    const handleReject = async () => {
        if (!window.confirm('Reject this maintenance action?')) return;
        setIsProcessing(true);
        try { await onReject(action.id, rejectionReason); } finally { setIsProcessing(false); }
    };

    const data = action.action_data || {};
    const currency = action.lg_currency_code;
    const currentAmount = action.lg_current_amount;
    const currentExpiry = action.lg_expiry_date;
    const currentBeneficiary = action.lg_beneficiary;

    // ── Build comparison rows based on action type ──
    const renderComparison = () => {
        switch (action.action_type) {
            case 'EXTEND': {
                const newExpiry = data.new_expiry_date;
                const currentDays = currentExpiry ? moment(newExpiry).diff(moment(currentExpiry), 'days') : null;
                return (
                    <div className="space-y-3">
                        <ComparisonTable>
                            <ComparisonRow label="Expiry Date" current={formatDate(currentExpiry)} proposed={formatDate(newExpiry)} changed={!!newExpiry} />
                            {currentDays !== null && currentDays > 0 && (
                                <tr className="bg-blue-50/50">
                                    <td className="py-2 px-3 text-xs font-semibold text-blue-600 uppercase" colSpan={4}>
                                        ↳ Extension of {currentDays} days
                                    </td>
                                </tr>
                            )}
                        </ComparisonTable>
                        {data.reason && <ReasonBlock reason={data.reason} />}
                    </div>
                );
            }
            case 'INCREASE_AMOUNT': {
                const newAmt = data.new_amount ? parseFloat(data.new_amount) : null;
                const currentAmt = currentAmount ? parseFloat(currentAmount) : null;
                const increaseBy = (newAmt && currentAmt) ? newAmt - currentAmt : null;
                return (
                    <div className="space-y-3">
                        <ComparisonTable>
                            <ComparisonRow label="Current Amount" current={formatCurrency(currentAmt, currency)} proposed={formatCurrency(newAmt, currency)} changed={!!newAmt} />
                            {increaseBy > 0 && (
                            <tr className="bg-green-50/70">
                                <td className="py-2 px-3 text-xs font-semibold text-green-600 uppercase" colSpan={2}>Increase By</td>
                                <td className="py-2 px-1 text-center"><ArrowUp className="h-4 w-4 text-green-500 inline" /></td>
                                <td className="py-2 px-3 text-sm font-bold text-green-700">+{formatCurrency(increaseBy, currency)}</td>
                            </tr>
                            )}
                        </ComparisonTable>
                        {data.reason && <ReasonBlock reason={data.reason} />}
                    </div>
                );
            }
            case 'AMENDMENT': {
                // Support both legacy Custody structure (data.amendment_details) 
                // and new Issuance structure (flat data with new_ prefix)
                const details = data.amendment_details || {};
                if (!data.amendment_details) {
                    if (data.new_beneficiary_name) details.beneficiary_name = data.new_beneficiary_name;
                    if (data.new_beneficiary_address) details.beneficiary_address = data.new_beneficiary_address;
                    if (data.new_lg_purpose) details.purpose = data.new_lg_purpose;
                    if (data.amendment_text) details.amendment_text = data.amendment_text;
                }
                const amendmentRows = [];
                // Map known amendment fields to their labels and current values
                const fieldMap = {
                    purpose: { label: 'Purpose', current: action.action_data?.snapshot_purpose || '—' },
                    beneficiary_name: { label: 'Beneficiary', current: currentBeneficiary || '—' },
                    beneficiary_address: { label: 'Beneficiary Address', current: data.snapshot_beneficiary_address || '—' },
                    amount: { label: 'Amount', current: formatCurrency(currentAmount, currency) },
                    expiry_date: { label: 'Expiry Date', current: formatDate(currentExpiry) },
                };
                Object.entries(details).forEach(([key, value]) => {
                    const mapped = fieldMap[key];
                    const label = mapped?.label || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    const currentVal = mapped?.current || '—';
                    const proposedVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
                    if (proposedVal && proposedVal !== currentVal) {
                        amendmentRows.push({ label, current: currentVal, proposed: proposedVal });
                    }
                });
                return (
                    <div className="space-y-3">
                        {amendmentRows.length > 0 ? (
                            <ComparisonTable>
                                {amendmentRows.map((row, i) => (
                                    <ComparisonRow key={i} label={row.label} current={row.current} proposed={row.proposed} changed />
                                ))}
                            </ComparisonTable>
                        ) : (
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-sm text-gray-600">
                                <p className="font-medium mb-1">Requested Changes:</p>
                                <pre className="text-xs bg-white p-2 rounded overflow-x-auto border">{JSON.stringify(details, null, 2)}</pre>
                            </div>
                        )}
                        {data.reason && <ReasonBlock reason={data.reason} />}
                    </div>
                );
            }
            case 'LIQUIDATION': {
                const liqType = data.liquidation_type || 'FULL';
                const liqAmount = data.liquidation_amount ? parseFloat(data.liquidation_amount) : null;
                const currentAmt = currentAmount ? parseFloat(currentAmount) : null;
                const remaining = (liqType !== 'FULL' && liqAmount && currentAmt) ? currentAmt - liqAmount : 0;
                return (
                    <div className="space-y-3">
                        <ComparisonTable>
                            <ComparisonRow label="Current Amount" current={formatCurrency(currentAmt, currency)} proposed={liqType === 'FULL' ? '0.00' : formatCurrency(remaining, currency)} changed />
                            <ComparisonRow label="Status" current={action.lg_status || 'ACTIVE'} proposed={liqType === 'FULL' ? 'LIQUIDATED' : 'ACTIVE (reduced)'} changed />
                            <tr className="bg-red-50/70">
                                <td className="py-2 px-3 text-xs font-semibold text-red-600 uppercase" colSpan={2}>
                                    {liqType === 'FULL' ? 'Full Liquidation' : 'Partial Liquidation'}
                                </td>
                                <td className="py-2 px-1 text-center"><ArrowDown className="h-4 w-4 text-red-500 inline" /></td>
                                <td className="py-2 px-3 text-sm font-bold text-red-700">
                                    {liqType === 'FULL' ? formatCurrency(currentAmt, currency) : `-${formatCurrency(liqAmount, currency)}`}
                                </td>
                            </tr>
                        </ComparisonTable>
                        {data.reason && <ReasonBlock reason={data.reason} />}
                    </div>
                );
            }
            case 'CLOSE': {
                return (
                    <div className="space-y-3">
                        <ComparisonTable>
                            <ComparisonRow label="Status" current={action.lg_status || 'ACTIVE'} proposed="PENDING_CLOSE" changed />
                        </ComparisonTable>
                        {data.reason && <ReasonBlock reason={data.reason} />}
                    </div>
                );
            }
            case 'ACTIVATE': {
                return (
                    <div className="space-y-3">
                        <ComparisonTable>
                            <ComparisonRow label="Operational Status" current={action.lg_operational_status || 'NON_OPERATIVE'} proposed="OPERATIVE" changed />
                            <ComparisonRow label="Payment Method" current="—" proposed={data.payment_method || 'N/A'} changed={!!data.payment_method} />
                            <ComparisonRow label="Payment Amount" current="—" proposed={formatCurrency(data.payment_amount || data.amount, currency)} changed />
                            <ComparisonRow label="Payment Ref" current="—" proposed={data.payment_reference || 'N/A'} changed={!!data.payment_reference} />
                        </ComparisonTable>
                        {data.reason && <ReasonBlock reason={data.reason} />}
                    </div>
                );
            }
            case 'CHANGE_OWNERSHIP': {
                return (
                    <div className="space-y-3">
                        <ComparisonTable>
                            <ComparisonRow label="Owner" current={data.current_owner_email || 'Current Owner'} proposed={data.new_owner_email || `User #${data.new_owner_user_id}`} changed />
                        </ComparisonTable>
                        {data.reason && <ReasonBlock reason={data.reason} />}
                    </div>
                );
            }
            default:
                return data && Object.keys(data).length > 0 ? (
                    <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto border">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                ) : null;
        }
    };

    const approvalHistory = action.approval_history || [];

    return (
        <Transition show={true} as={React.Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <TransitionChild
                    as={React.Fragment}
                    enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-gray-500/75 transition-opacity" />
                </TransitionChild>

                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <TransitionChild
                            as={React.Fragment}
                            enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel className="relative w-full max-w-5xl transform rounded-2xl bg-white shadow-2xl transition-all">
                                {/* ── Header ── */}
                                <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-t-2xl px-6 py-4 flex items-center justify-between">
                                    <div>
                                        <DialogTitle className="text-lg font-bold text-white tracking-tight">
                                            Review Maintenance Action
                                        </DialogTitle>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-white/20 text-white">
                                                {formatActionType(action.action_type)}
                                            </span>
                                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-yellow-400/90 text-yellow-900">
                                                Pending Approval
                                            </span>
                                        </div>
                                    </div>
                                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                                        <X className="h-6 w-6" />
                                    </button>
                                </div>

                                <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
                                    {/* ── LG Context (compact) ── */}
                                    <section>
                                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                                            LG Details
                                        </h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                                            <LGField label="Reference" value={action.lg_ref_number || `#${action.issued_lg_id}`} />
                                            <LGField label="Bank" value={action.lg_bank_name || '—'} />
                                            <LGField label="Beneficiary" value={action.lg_beneficiary || '—'} />
                                            <LGField label="Amount" value={formatCurrency(currentAmount, currency)} highlight />
                                            <LGField label="Issue Date" value={formatDate(action.lg_issue_date)} />
                                            <LGField label="Expiry Date" value={formatDate(currentExpiry)} />
                                            <LGField label="Status" value={action.lg_status || '—'} />
                                            {action.lg_bank_lg_number && <LGField label="Bank LG#" value={action.lg_bank_lg_number} />}
                                        </div>
                                    </section>

                                    {/* ── What's Changing (the key comparison) ── */}
                                    <section>
                                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <GitCompareArrows className="h-4 w-4 text-amber-500" />
                                            Proposed Changes — {formatActionType(action.action_type)}
                                        </h4>
                                        <div className="bg-white rounded-xl border-2 border-amber-200 overflow-hidden">
                                            {renderComparison()}
                                        </div>
                                    </section>

                                    {/* ── Requested By (enriched profile) ── */}
                                    <section className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Requested By</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <LGField label="Name" value={action.initiated_by_name || action.initiated_by_email || `User #${action.initiated_by_user_id || '—'}`} />
                                            <LGField label="Email" value={action.initiated_by_email || '—'} />
                                            {action.initiated_by_department && <LGField label="Department" value={action.initiated_by_department} />}
                                            {action.initiated_by_job_title && <LGField label="Title" value={action.initiated_by_job_title} />}
                                            <LGField label="Source" value={action.initiation_source?.replace(/_/g, ' ') || 'Internal'} />
                                            <LGField label="Submitted" value={action.created_at ? moment(action.created_at).format('DD-MMM-YYYY HH:mm') : '—'} />
                                        </div>
                                        {action.notes && (
                                            <p className="text-sm text-gray-500 italic border-t border-gray-200 pt-2 mt-2">
                                                <span className="font-medium text-gray-600">Notes:</span> {action.notes}
                                            </p>
                                        )}
                                    </section>

                                    {/* ── Supporting Documents ── */}
                                    {(action.supporting_documents || []).length > 0 && (
                                        <section>
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Supporting Documents</h4>
                                            <div className="space-y-1.5">
                                                {(action.supporting_documents || []).map((doc, i) => (
                                                    <div key={i} className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                                                        <span className="text-blue-600 text-lg">📄</span>
                                                        <span className="text-sm font-medium text-blue-800 truncate">{doc.file_name || `Document ${i + 1}`}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {/* ── Approval History ── */}
                                    {approvalHistory.filter(e => e.action !== 'SUBMITTED').length > 0 && (
                                        <section>
                                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                                                Approval History
                                            </h4>
                                            <div className="space-y-2">
                                                {approvalHistory.filter(e => e.action !== 'SUBMITTED').map((entry, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 text-sm bg-gray-50 rounded-lg px-4 py-2 border border-gray-100">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                            entry.action === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                            entry.action === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-700'
                                                        }`}>
                                                            {entry.action}
                                                        </span>
                                                        <span className="text-gray-600 font-medium">
                                                            {entry.user_name || entry.user_email || (entry.user_id ? `User #${entry.user_id}` : '')}
                                                        </span>
                                                        {entry.timestamp && (
                                                            <span className="text-gray-400 text-xs ml-auto">
                                                                {moment(entry.timestamp).format('DD-MMM-YYYY HH:mm')}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    )}
                                </div>

                                {/* ── Footer: Reject reason + Actions ── */}
                                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-2xl">
                                    <div className="mb-3">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Rejection reason (required if rejecting)
                                        </label>
                                        <input
                                            type="text"
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            placeholder="Enter reason..."
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                            disabled={isProcessing}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={handleReject}
                                            disabled={isProcessing}
                                            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
                                        >
                                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <X className="h-4 w-4 mr-1.5" />}
                                            Reject
                                        </button>
                                        <button
                                            onClick={handleApprove}
                                            disabled={isProcessing}
                                            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                                        >
                                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}
                                            Approve
                                        </button>
                                    </div>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

// ── Small helper components ──
const LGField = ({ label, value, highlight }) => (
    <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className={`text-sm font-medium truncate ${highlight ? 'text-blue-700' : 'text-gray-800'}`}>{value}</p>
    </div>
);

const ComparisonTable = ({ children }) => (
    <table className="w-full">
        <thead>
            <tr className="border-b border-amber-200 bg-amber-50/40">
                <th className="py-2 px-3 text-[10px] font-bold text-amber-700 uppercase tracking-wider text-left w-[130px]">Field</th>
                <th className="py-2 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Current</th>
                <th className="py-2 px-1 w-8"></th>
                <th className="py-2 px-3 text-[10px] font-bold text-blue-600 uppercase tracking-wider text-left">Proposed</th>
            </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
            {children}
        </tbody>
    </table>
);

const ReasonBlock = ({ reason }) => (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 mt-2">
        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Reason</p>
        <p className="text-sm text-slate-700">{reason}</p>
    </div>
);

export default MaintenanceActionApprovalModal;
