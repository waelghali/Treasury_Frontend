import React, { useState } from 'react';
import { RefreshCw, Clock, X, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { toast } from 'react-toastify';

export default function ReTenderModal({ rfq, onClose, onSuccess }) {
    const [preset, setPreset] = useState('15m');
    const [amount, setAmount] = useState(rfq?.amount || '');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!rfq) return null;

    const handleReTender = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const now = new Date();
            let windowStart = now;
            let windowEnd;

            if (preset === '15m') {
                windowEnd = new Date(now.getTime() + 15 * 60 * 1000);
            } else if (preset === '30m') {
                windowEnd = new Date(now.getTime() + 30 * 60 * 1000);
            } else if (preset === 'tomorrow') {
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(10, 0, 0, 0);
                windowStart = tomorrow;
                windowEnd = new Date(tomorrow.getTime() + 30 * 60 * 1000);
            } else if (preset === 'custom') {
                if (!customStart || !customEnd) {
                    toast.error('Please specify both start and end times for custom schedule.');
                    setIsSubmitting(false);
                    return;
                }
                windowStart = new Date(customStart);
                windowEnd = new Date(customEnd);
                if (windowEnd <= windowStart) {
                    toast.error('Window end time must be after start time.');
                    setIsSubmitting(false);
                    return;
                }
            }

            const payload = {
                window_start: windowStart.toISOString(),
                window_end: windowEnd.toISOString(),
                amount: amount ? parseFloat(amount) : rfq.amount
            };

            const res = await apiClient.post(`/end-user/quotations/${rfq.id}/re-tender`, payload);
            toast.success(`Quotation re-tendered successfully as ${res.data.ref_no}!`);
            if (onSuccess) {
                onSuccess(res.data);
            }
            onClose();
        } catch (err) {
            console.error('Re-tender failed:', err);
            toast.error(err.response?.data?.detail || 'Failed to re-tender quotation.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 sm:p-7 text-slate-900 space-y-5 animate-scale-up">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                            <RefreshCw size={22} className={isSubmitting ? 'animate-spin' : ''} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-slate-900">Re-Tender with New Window</h3>
                                <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
                                    Audited Lineage
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Re-quotes <span className="font-mono font-semibold text-slate-800">{rfq.ref_no}</span> with identical counterparties & terms.
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

                {/* Deal Recap Card */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5 font-medium">
                    <div className="flex justify-between text-slate-500">
                        <span>Trade Type:</span>
                        <span className="font-bold text-slate-900">{rfq.type === 'TBILL' ? 'Treasury Bills' : 'FX Spot'} ({rfq.direction || 'Buy'})</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                        <span>Currency / Pair:</span>
                        <span className="font-bold text-slate-900">{rfq.type === 'TBILL' ? rfq.direction : `${rfq.buy_currency}/${rfq.sell_currency}`}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                        <span>Notional Amount:</span>
                        <span className="font-mono font-bold text-slate-900">{new Intl.NumberFormat().format(rfq.amount || 0)} {rfq.buy_currency || ''}</span>
                    </div>
                </div>

                {/* Duration Presets */}
                <form onSubmit={handleReTender} className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Clock size={13} className="text-slate-400" /> Choose New Bidding Window
                        </label>
                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={() => setPreset('15m')}
                                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                    preset === '15m'
                                        ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
                                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                            >
                                <div className="text-xs font-bold">⚡ Next 15 Minutes</div>
                                <div className="text-[10px] text-slate-500 font-normal mt-0.5">Quick market spot check</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPreset('30m')}
                                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                    preset === '30m'
                                        ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
                                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                            >
                                <div className="text-xs font-bold">⏱️ Next 30 Minutes</div>
                                <div className="text-[10px] text-slate-500 font-normal mt-0.5">Recommended for FX</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPreset('tomorrow')}
                                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                    preset === 'tomorrow'
                                        ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
                                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                            >
                                <div className="text-xs font-bold">📅 Tomorrow 10:00 AM</div>
                                <div className="text-[10px] text-slate-500 font-normal mt-0.5">Morning clearing window</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPreset('custom')}
                                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                    preset === 'custom'
                                        ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
                                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                            >
                                <div className="text-xs font-bold">🛠️ Custom Schedule</div>
                                <div className="text-[10px] text-slate-500 font-normal mt-0.5">Specific time & date</div>
                            </button>
                        </div>
                    </div>

                    {/* Custom DateTime Fields */}
                    {preset === 'custom' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 animate-fade-in">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Window Open</label>
                                <input
                                    type="datetime-local"
                                    required
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-500"
                                    value={customStart}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Window Close</label>
                                <input
                                    type="datetime-local"
                                    required
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-500"
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Optional Amount Override */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Trade Amount (Optional Adjustment)
                        </label>
                        <input
                            type="number"
                            step="any"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            placeholder="Keep original amount or adjust"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:bg-slate-300"
                        >
                            {isSubmitting ? (
                                <>
                                    <RefreshCw size={14} className="animate-spin" /> Launching Re-Tender...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={14} /> Launch Re-Tender Now
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
