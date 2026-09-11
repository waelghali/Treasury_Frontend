import React, { useState } from 'react';
import { Send, X, AlertCircle, Clock, DollarSign, MessageSquare } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { toast } from 'react-toastify';

export default function ResubmitRevisionModal({ rfq, onClose, onSuccess }) {
    const [amount, setAmount] = useState(rfq?.amount || '');
    const [windowMinutes, setWindowMinutes] = useState(30);
    const [userNotes, setUserNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!rfq) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const parsedAmount = parseFloat(amount);
        if (!parsedAmount || parsedAmount <= 0) {
            toast.error('Please specify a valid trade amount.');
            return;
        }

        setIsSubmitting(true);
        try {
            await apiClient.post(`/end-user/quotations/${rfq.id}/resubmit`, {
                amount: parsedAmount,
                window_minutes: parseInt(windowMinutes, 10) || 30,
                user_notes: userNotes.trim() || undefined
            });
            toast.success(`RFQ ${rfq.ref_no} resubmitted for Corporate Admin approval!`);
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Resubmission failed:', err);
            toast.error(err.response?.data?.detail || 'Failed to resubmit quotation.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-slate-900 space-y-5 animate-scale-up">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                            <Send size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Revise & Resubmit Quotation</h3>
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

                {/* Admin Feedback Box */}
                {rfq.admin_revision_notes && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-amber-800 uppercase tracking-wide text-[10px]">
                            <AlertCircle size={14} className="text-amber-600" />
                            Corporate Admin Revision Note:
                        </div>
                        <p className="font-medium pl-5 italic">
                            "{rfq.admin_revision_notes}"
                        </p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Amount Field */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Trade Amount ({rfq.buy_currency || 'USD'})
                        </label>
                        <div className="relative">
                            <DollarSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="number"
                                step="any"
                                min="1"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                required
                            />
                        </div>
                    </div>

                    {/* Window Duration */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Quotation Window Duration
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {[15, 30, 60].map((mins) => (
                                <button
                                    key={mins}
                                    type="button"
                                    onClick={() => setWindowMinutes(mins)}
                                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                        windowMinutes === mins
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    <Clock size={13} /> {mins} Mins
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Maker Comment Field */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Response / Adjustment Notes (Optional)
                        </label>
                        <div className="relative">
                            <textarea
                                value={userNotes}
                                onChange={(e) => setUserNotes(e.target.value)}
                                rows={2}
                                placeholder="E.g. Adjusted volume per latest treasury committee review..."
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                        >
                            <Send size={14} />
                            {isSubmitting ? 'Resubmitting...' : 'Resubmit for Approval'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
