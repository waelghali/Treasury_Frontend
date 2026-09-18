import React, { useState } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../services/apiClient';
import { X, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';

const CANCELLATION_REASONS = [
    'Transaction Timing / Delayed Underlying Operation',
    'Trade Parameters / Currency Amount Adjustment',
    'Commercial Requirement Cancelled',
    'Duplicate or Erroneous Submission',
    'Administrative / Re-Tender Rescheduling'
];

export default function QuotationCancellationModal({ rfq, isOpen, onClose, onSuccess }) {
    const [reason, setReason] = useState(CANCELLATION_REASONS[0]);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen || !rfq) return null;

    const isPendingApproval = rfq.status === 'PENDING_APPROVAL';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await apiClient.post(`/end-user/quotations/${rfq.id}/request-cancellation`, {
                reason,
                notes: notes.trim() || undefined
            });

            if (isPendingApproval) {
                toast.success(res.data?.message || 'Draft quotation cancelled successfully.');
            } else {
                toast.info(res.data?.message || 'Cancellation request submitted for Corporate Admin approval.');
            }

            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to request cancellation:', err);
            toast.error(err.response?.data?.detail || 'Failed to submit cancellation request.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-rose-50 to-orange-50 border-b border-rose-100 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                {isPendingApproval ? 'Cancel Quotation Draft' : 'Request Quotation Cancellation'}
                            </h3>
                            <p className="text-xs font-mono font-semibold text-slate-500">{rfq.ref_no}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-white/60 transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Deal Context Summary */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-1.5">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Instrument / Flow:</span>
                            <span className="font-bold text-slate-800">{rfq.type} &bull; {rfq.direction || 'Buy'} {rfq.buy_currency || 'EGP'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Amount:</span>
                            <span className="font-bold text-slate-800">{rfq.amount?.toLocaleString()} {rfq.buy_currency}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Scheduled Window:</span>
                            <span className="font-mono text-slate-700">{rfq.window_start ? new Date(rfq.window_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} &rarr; {rfq.window_end ? new Date(rfq.window_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                        </div>
                    </div>

                    {/* Standard Reason Dropdown */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            Reason for Cancellation <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                        >
                            {CANCELLATION_REASONS.map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>

                    {/* Additional Notes */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            Internal Treasury Notes <span className="text-slate-400 font-normal lowercase">(optional context for admin)</span>
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Provide any additional detail for the Corporate Admin approval desk..."
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                        />
                    </div>

                    {/* Counterparty Optics Protection Box */}
                    <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-4 text-xs space-y-1.5 text-sky-950">
                        <div className="flex items-center gap-2 font-bold text-sky-900">
                            <ShieldCheck size={16} className="text-sky-600 shrink-0" />
                            Counterparty Privacy Guarantee
                        </div>
                        <p className="text-[11px] leading-relaxed text-sky-800">
                            Your internal cancellation reason will <strong>never</strong> be shown to participating bank desks. Banks will receive an official notification stating: <em>"This quotation request was officially withdrawn by the corporate treasury desk. No quotation is required."</em>
                        </p>
                    </div>

                    {!isPendingApproval && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <Clock size={14} className="text-amber-500 shrink-0" />
                            <span>15-Minute Cutoff Policy: Auctions scheduled to open within 15 minutes cannot be cancelled.</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        >
                            Back
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-200 transition-all cursor-pointer"
                        >
                            {submitting ? 'Submitting...' : isPendingApproval ? 'Confirm Cancellation' : 'Submit Cancellation Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
