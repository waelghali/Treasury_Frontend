import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Clock, 
    AlertTriangle, 
    CheckCircle2, 
    XCircle, 
    ArrowUpRight, 
    ExternalLink, 
    TrendingUp, 
    Building2, 
    Layers, 
    Minimize2, 
    Maximize2, 
    Volume2, 
    VolumeX,
    ShieldAlert
} from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../services/apiClient';
import tradingAudio from '../../utils/tradingAudioEngine';

const formatNum = (num, minDec = 2, maxDec = 4) => {
    if (num === null || num === undefined || isNaN(num)) return '-';
    return Number(num).toLocaleString('en-US', {
        minimumFractionDigits: minDec,
        maximumFractionDigits: maxDec
    });
};

export default function GlobalDealAcceptanceModal({ deal, onClose, onResolve, userRole }) {
    const navigate = useNavigate();
    const [secondsLeft, setSecondsLeft] = useState(deal?.seconds_remaining ?? 30);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isAccepting, setIsAccepting] = useState(false);
    const [isDeclining, setIsDeclining] = useState(false);
    const [showDeclineInput, setShowDeclineInput] = useState(false);
    const [declineReason, setDeclineReason] = useState('Corporate treasury desk price review / market shift');
    const [soundMuted, setSoundMuted] = useState(false);

    // Multi-leg selection state
    const isMultiLeg = Boolean(deal?.is_multi_leg && deal?.legs && deal.legs.length > 1);
    const [selectedLegIds, setSelectedLegIds] = useState(() => {
        if (!deal?.legs) return [];
        return deal.legs.filter(l => !l.is_inconclusive).map(l => String(l.leg_id));
    });

    const isCorporateAdmin = userRole === 'corporate_admin' || userRole === 'checker' || userRole === 'system_owner';
    const playedEntranceChimeRef = useRef(false);

    // Initial entrance chime
    useEffect(() => {
        if (!playedEntranceChimeRef.current && !soundMuted) {
            playedEntranceChimeRef.current = true;
            try {
                tradingAudio.playWindowOpened();
            } catch (err) {
                console.warn('[GlobalDealAcceptanceModal] Audio play error:', err);
            }
        }
    }, [deal?.rfq_id, soundMuted]);

    // Live countdown timer
    useEffect(() => {
        if (!deal?.acceptance_deadline) return;

        const syncTimer = () => {
            const now = new Date().getTime();
            const deadline = new Date(deal.acceptance_deadline).getTime();
            const diff = Math.max(0, Math.floor((deadline - now) / 1000));
            setSecondsLeft(diff);

            // Auditory urgency ticks in final 10 seconds
            if (diff <= 10 && diff > 0 && !soundMuted) {
                tradingAudio.playUrgencyTick(diff);
            }

            if (diff === 0) {
                // Window expired
                if (onResolve) onResolve();
            }
        };

        syncTimer();
        const intervalId = setInterval(syncTimer, 1000);
        return () => clearInterval(intervalId);
    }, [deal?.acceptance_deadline, deal?.rfq_id, onResolve, soundMuted]);

    if (!deal) return null;

    const isUrgent = secondsLeft <= 10;
    const progressPercent = Math.min(100, Math.max(0, (secondsLeft / (deal.type === 'TBILL' ? 120 : 30)) * 100));

    const handleAccept = async () => {
        if (isMultiLeg && selectedLegIds.length === 0) {
            toast.warn("Please select at least one currency pair to accept, or decline the tender.");
            return;
        }

        const acceptEndpoint = isCorporateAdmin
            ? `/corporate-admin/quotations/${deal.rfq_id}/accept-deal`
            : `/end-user/quotations/${deal.rfq_id}/accept-deal`;

        try {
            setIsAccepting(true);
            const payload = isMultiLeg ? {
                accepted_leg_ids: selectedLegIds,
                declined_leg_ids: deal.legs.map(l => String(l.leg_id)).filter(id => !selectedLegIds.includes(id))
            } : {};

            const res = await apiClient.post(acceptEndpoint, payload);
            tradingAudio.playResultOut('WINNER');
            toast.success(res.data?.message || "Trade deal accepted & binding execution confirmed!");
            if (onResolve) onResolve();
        } catch (err) {
            console.error("Deal acceptance error:", err);
            toast.error(err.response?.data?.detail || "Failed to execute deal acceptance.");
        } finally {
            setIsAccepting(false);
        }
    };

    const handleDecline = async () => {
        const declineEndpoint = isCorporateAdmin
            ? `/corporate-admin/quotations/${deal.rfq_id}/decline-deal`
            : `/end-user/quotations/${deal.rfq_id}/decline-deal`;

        try {
            setIsDeclining(true);
            const res = await apiClient.post(declineEndpoint, { reason: declineReason });
            toast.info(res.data?.message || "Tender outcome declined.");
            if (onResolve) onResolve();
        } catch (err) {
            console.error("Deal decline error:", err);
            toast.error(err.response?.data?.detail || "Failed to decline deal.");
        } finally {
            setIsDeclining(false);
            setShowDeclineInput(false);
        }
    };

    const handleInspectOrderBook = () => {
        const targetUrl = isCorporateAdmin
            ? `/corporate-admin/quotations/results/${deal.rfq_id}`
            : `/end-user/quotations/results/${deal.rfq_id}`;
        navigate(targetUrl);
        setIsMinimized(true);
    };

    const toggleLeg = (legId) => {
        const idStr = String(legId);
        setSelectedLegIds(prev => 
            prev.includes(idStr) ? prev.filter(x => x !== idStr) : [...prev, idStr]
        );
    };

    // --- MINIMIZED FLOATING BADGE (Bottom-Right Urgent Ticker) ---
    if (isMinimized) {
        return (
            <div 
                className="fixed bottom-5 right-5 z-[9995] animate-bounce-subtle"
                style={{ filter: 'drop-shadow(0 10px 25px rgba(0, 0, 0, 0.45))' }}
            >
                <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl transition-all duration-300 ${
                    isUrgent 
                        ? 'bg-rose-950/95 border-rose-500/80 text-white shadow-rose-900/50' 
                        : 'bg-slate-900/95 border-amber-500/80 text-white shadow-amber-900/40'
                }`}>
                    <div className="relative flex items-center justify-center">
                        <span className={`w-3 h-3 rounded-full animate-ping absolute ${isUrgent ? 'bg-rose-400' : 'bg-amber-400'}`} />
                        <Clock className={`w-5 h-5 ${isUrgent ? 'text-rose-400' : 'text-amber-400'}`} />
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black tracking-wide uppercase text-amber-300">
                                Deal Acceptance Awaiting Decision
                            </span>
                            <span className={`text-[11px] font-mono font-black px-1.5 py-0.5 rounded-full ${
                                isUrgent ? 'bg-rose-500 text-white animate-pulse' : 'bg-amber-500/20 text-amber-300'
                            }`}>
                                {secondsLeft}s
                            </span>
                        </div>
                        <div className="text-[11px] text-slate-300 font-medium truncate max-w-[200px]">
                            {deal.ref_no} • {deal.winner_bank_name || 'Winning Bank'} @ {formatNum(deal.winner_rate, 2, 4)}
                        </div>
                    </div>

                    <button
                        onClick={() => setIsMinimized(false)}
                        className="ml-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-lg transition-transform active:scale-95 flex items-center gap-1 shadow-md shadow-amber-500/20"
                    >
                        <Maximize2 size={13} />
                        Review Deal
                    </button>
                </div>
            </div>
        );
    }

    // --- FULL SCREEN INTERCEPTING MODAL ---
    return (
        <div 
            className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md transition-all duration-300"
            role="dialog"
            aria-modal="true"
        >
            <div className={`relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${
                isUrgent ? 'border-rose-500/80 shadow-rose-900/30' : 'border-amber-500/70 shadow-amber-900/20'
            }`}>
                {/* Top Urgency Progress Strip */}
                <div className="w-full h-2 bg-slate-800 relative overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-1000 ease-linear ${
                            isUrgent ? 'bg-gradient-to-r from-rose-600 via-red-500 to-amber-500 animate-pulse' : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                {/* Header Header Controls */}
                <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-slate-800/80">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-inner ${
                            isUrgent 
                                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse' 
                                : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        }`}>
                            <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-white tracking-wide">
                                    Binding Deal Acceptance Required
                                </h3>
                                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    Live Bidding Closed
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium">
                                Tender window closed. Review counterparty quotes and execute trade binding confirmation.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setSoundMuted(!soundMuted)}
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title={soundMuted ? "Unmute desk alert chimes" : "Mute desk alert chimes"}
                        >
                            {soundMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                        </button>
                        <button
                            onClick={() => setIsMinimized(true)}
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Minimize to floating ticker badge"
                        >
                            <Minimize2 size={17} />
                        </button>
                    </div>
                </div>

                {/* Live Countdown & Policy Strip */}
                <div className={`px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b ${
                    isUrgent ? 'bg-rose-950/40 border-rose-800/50' : 'bg-slate-800/40 border-slate-800'
                }`}>
                    <div className="flex items-center gap-2.5">
                        <Clock className={`w-5 h-5 ${isUrgent ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                Decision Countdown Window
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-2xl font-black font-mono tracking-tight ${
                                    isUrgent ? 'text-rose-400 animate-pulse' : 'text-amber-300'
                                }`}>
                                    00:{String(secondsLeft).padStart(2, '0')}s
                                </span>
                                <span className="text-[11px] text-slate-400">remaining</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Expiry Policy Action
                        </span>
                        <span className={`inline-flex items-center gap-1 text-xs font-black uppercase px-2 py-0.5 rounded-md ${
                            deal.timeout_action === 'AUTO_ACCEPT'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}>
                            {deal.timeout_action === 'AUTO_ACCEPT' ? 'Auto-Accept on Expiry' : 'Auto-Reject on Expiry'}
                        </span>
                    </div>
                </div>

                {/* Deal Body Content */}
                <div className="p-6 space-y-4 max-h-[58vh] overflow-y-auto custom-scrollbar">
                    {/* Primary Deal Card */}
                    <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-300 bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-700">
                                    {deal.ref_no}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                    {deal.type === 'TBILL' ? 'T-Bill Auction' : (deal.is_multi_leg ? 'Multi-Currency Basket' : 'FX Spot Execution')}
                                </span>
                            </div>

                            <div className="text-xs font-bold text-slate-300">
                                <span className="uppercase text-slate-400 font-semibold">{deal.direction || 'BUY'}</span>{' '}
                                <span className="text-white font-mono">{formatNum(deal.amount, 0, 2)}</span>{' '}
                                <span className="text-amber-400 font-bold">{deal.buy_currency || deal.currency_pair}</span>
                            </div>
                        </div>

                        {/* Counterparty Standings Highlight */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/40 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                                    <Building2 size={20} />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block truncate">
                                        Best Counterparty Rate
                                    </span>
                                    <p className="text-sm font-black text-white truncate">
                                        {deal.winner_bank_name || 'Winning Counterparty'}
                                    </p>
                                    <div className="text-xs font-mono font-black text-emerald-300">
                                        Rate: {deal.winner_rate !== null && deal.winner_rate !== undefined ? formatNum(deal.winner_rate, 4, 4) : 'Ready for acceptance'}
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                        Estimated Desk Savings
                                    </span>
                                    <p className="text-sm font-black text-white font-mono">
                                        {deal.saved_vs_avg ? `+ ${formatNum(deal.saved_vs_avg, 2, 2)} EGP` : 'Best In Market'}
                                    </p>
                                    <span className="text-[11px] text-slate-400">vs market desk average</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Multi-Leg Basket Legs Checklist (if multi-leg) */}
                    {isMultiLeg && (
                        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-amber-400" />
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                                        Multi-Leg Basket Allocation ({selectedLegIds.length}/{deal.legs.length} selected)
                                    </span>
                                </div>
                                <div className="flex gap-2 text-[10px] font-bold">
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedLegIds(deal.legs.filter(l => !l.is_inconclusive).map(l => String(l.leg_id)))}
                                        className="text-amber-400 hover:underline"
                                    >
                                        Select All
                                    </button>
                                    <span className="text-slate-600">|</span>
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedLegIds([])}
                                        className="text-slate-400 hover:underline"
                                    >
                                        Deselect
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {deal.legs.map((leg, idx) => {
                                    const legIdStr = String(leg.leg_id);
                                    const isSelected = selectedLegIds.includes(legIdStr);
                                    const isInconclusive = Boolean(leg.is_inconclusive);

                                    return (
                                        <div 
                                            key={legIdStr || idx}
                                            onClick={() => !isInconclusive && toggleLeg(legIdStr)}
                                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                                isInconclusive
                                                    ? 'bg-slate-900/50 border-slate-800 opacity-60 cursor-not-allowed'
                                                    : isSelected
                                                        ? 'bg-emerald-950/30 border-emerald-500/60 shadow-sm'
                                                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    disabled={isInconclusive}
                                                    onChange={() => {}}
                                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-800 border-slate-700"
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-white font-mono">
                                                            {leg.currency_pair}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            {formatNum(leg.amount, 0, 2)}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-400">
                                                        {isInconclusive ? (
                                                            <span className="text-amber-400">No quotes received</span>
                                                        ) : (
                                                            <span>Winner: <strong className="text-emerald-400">{leg.winner_bank_name}</strong> @ {formatNum(leg.winner_rate, 4, 4)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                {leg.saved_vs_avg && !isInconclusive ? (
                                                    <span className="text-xs font-mono text-emerald-400 font-bold">
                                                        +{formatNum(leg.saved_vs_avg, 2, 2)} EGP
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Inline Decline Reason Accordion */}
                    {showDeclineInput && (
                        <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-800/60 space-y-2 animate-fadeIn">
                            <label className="block text-xs font-bold text-rose-300 uppercase tracking-wider">
                                Reason for Declining Tender
                            </label>
                            <input
                                type="text"
                                value={declineReason}
                                onChange={(e) => setDeclineReason(e.target.value)}
                                placeholder="E.g., Rate exceeds limit / market volatility / delayed internal approval"
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                            />
                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowDeclineInput(false)}
                                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDecline}
                                    disabled={isDeclining}
                                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                                >
                                    {isDeclining ? 'Confirming Decline...' : 'Confirm Decline & Notify Banks'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls & Direct Action Buttons */}
                <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={handleInspectOrderBook}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-amber-400 transition-colors py-2"
                    >
                        <ExternalLink size={14} />
                        Inspect Order Book & Standings →
                    </button>

                    <div className="flex items-center gap-2.5 ml-auto">
                        {!showDeclineInput && (
                            <button
                                type="button"
                                onClick={() => setShowDeclineInput(true)}
                                disabled={isAccepting || isDeclining}
                                className="px-4 py-2.5 rounded-xl border border-slate-700 hover:border-rose-500/80 text-slate-300 hover:text-rose-400 text-xs font-bold transition-all hover:bg-rose-950/20 active:scale-95 disabled:opacity-50"
                            >
                                Decline Tender
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleAccept}
                            disabled={isAccepting || isDeclining || secondsLeft <= 0}
                            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs sm:text-sm font-black rounded-xl shadow-lg shadow-emerald-900/40 hover:shadow-emerald-900/60 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {isAccepting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Executing Trade...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={16} />
                                    <span>Accept Deal & Execute</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
