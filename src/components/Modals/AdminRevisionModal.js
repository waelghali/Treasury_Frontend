import React, { useState } from 'react';
import { Undo2, X, AlertCircle } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { toast } from 'react-toastify';

export default function AdminRevisionModal({ rfq, onClose, onSuccess }) {
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!rfq) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmed = notes.trim();
        if (!trimmed) {
            toast.error('Please provide specific instructions or feedback for the maker.');
            return;
        }

        setIsSubmitting(true);
        try {
            await apiClient.post(`/corporate-admin/quotations/${rfq.id}/request-revision`, {
                revision_notes: trimmed
            });
            toast.success(`RFQ ${rfq.ref_no} returned to maker for revision.`);
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Revision request failed:', err);
            toast.error(err.response?.data?.detail || 'Failed to request revision.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-900 space-y-4 animate-scale-up">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <Undo2 size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Return to Maker for Revision</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                RFQ Ref: <span className="font-mono font-bold text-slate-800">{rfq.ref_no}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertCircle size={17} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                        Returning this quotation will pause authorization and notify the maker ({rfq.creator_name || 'Maker'}) with your feedback so they can tweak the trade parameters and resubmit.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Revision Instructions / Notes
                        </label>
                        <textarea
                            rows={3}
                            required
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g. Please invite HSBC and CIB to the counterparty roster and extend the bidding window to 30 minutes."
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500/20 outline-none resize-none leading-relaxed"
                        />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:bg-slate-300"
                        >
                            <Undo2 size={14} /> {isSubmitting ? 'Returning...' : 'Send Revision Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
