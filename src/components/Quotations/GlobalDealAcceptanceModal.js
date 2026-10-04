import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Clock, 
    AlertTriangle, 
    CheckCircle2, 
    X, 
    ExternalLink, 
    TrendingUp, 
    Building2, 
    Layers, 
    Minimize2, 
    Maximize2, 
    Volume2, 
    VolumeX,
    ShieldCheck
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
    const [declineReason, setDeclineReason] = useState('Price exceeded internal limit / market shift');
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
            
            // Dispatch event to live components (ResultsView, QuotationRequestDashboard)
            window.dispatchEvent(new CustomEvent('quotation-deal-resolved', {
                detail: { rfqId: deal.rfq_id, status: 'ACCEPTED' }
            }));

            if (onResolve) onResolve();

            // Smoothly navigate to the confirmed deal standings
            const targetUrl = isCorporateAdmin
                ? `/corporate-admin/quotations/results/${deal.rfq_id}`
                : `/end-user/quotations/results/${deal.rfq_id}`;
            navigate(targetUrl);
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

            // Dispatch event to live components
            window.dispatchEvent(new CustomEvent('quotation-deal-resolved', {
                detail: { rfqId: deal.rfq_id, status: 'REJECTED' }
            }));

            if (onResolve) onResolve();

            const targetUrl = isCorporateAdmin
                ? `/corporate-admin/quotations/results/${deal.rfq_id}`
                : `/end-user/quotations/results/${deal.rfq_id}`;
            navigate(targetUrl);
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
                style={{ filter: 'drop-shadow(0 10px 25px rgba(0, 0, 0, 0.15))' }}
            >
                <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-md transition-all duration-300 ${
                    isUrgent 
                        ? 'bg-rose-50/95 border-rose-300 text-rose-950 shadow-lg shadow-rose-200' 
                        : 'bg-white/95 border-amber-300 text-slate-900 shadow-lg shadow-amber-100'
                }`}>
                    <div className="relative flex items-center justify-center">
                        <span className={`w-3 h-3 rounded-full animate-ping absolute ${isUrgent ? 'bg-rose-500' : 'bg-amber-500'}`} />
                        <Clock className={`w-5 h-5 ${isUrgent ? 'text-rose-600' : 'text-amber-600'}`} />
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                Deal Acceptance Awaiting Decision
                            </span>
                            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                isUrgent ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                                {secondsLeft}s
                            </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-semibold truncate max-w-[220px]">
                            {deal.ref_no} &bull; {deal.winner_bank_name || 'Winning Bank'} @ {formatNum(deal.winner_rate, 2, 4)}
                        </div>
                    </div>

                    <button
                        onClick={() => setIsMinimized(false)}
                        className="ml-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-transform active:scale-95 flex items-center gap-1 shadow-sm cursor-pointer"
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
            className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs transition-all duration-300 animate-fade-in"
            role="dialog"
            aria-modal="true"
        >
            <div className={`relative w-full max-w-2xl bg-white border rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${
                isUrgent ? 'border-rose-300 ring-2 ring-rose-400/30' : 'border-amber-300 ring-1 ring-amber-400/20'
            }`}>
                {/* Top Urgency Progress Strip */}
                <div className="w-full h-1.5 bg-slate-100 relative overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-1000 ease-linear ${
                            isUrgent 
                                ? 'bg-rose-500 animate-pulse' 
                                : 'bg-gradient-to-r from-amber-400 to-amber-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                {/* Header (Aligned with Platform Modal Header Standards) */}
                <div className={`px-6 py-4 flex items-center justify-between border-b transition-colors ${
                    isUrgent ? 'bg-gradient-to-r from-rose-50 to-orange-50 border-rose-100' : 'bg-gradient-to-r from-amber-50/80 via-orange-50/40 to-slate-50 border-amber-100'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                            isUrgent ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'
                        }`}>
                            {isUrgent ? <AlertTriangle size={20} className="animate-pulse" /> : <Clock size={20} />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-900">
                                    Deal Acceptance Required
                                </h3>
                                <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    Bidding Closed
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                Tender window concluded. Confirm trade binding execution with winning counterparty.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setSoundMuted(!soundMuted)}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors cursor-pointer"
                            title={soundMuted ? "Unmute desk alert chimes" : "Mute desk alert chimes"}
                        >
                            {soundMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                        </button>
                        <button
                            onClick={() => setIsMinimized(true)}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors cursor-pointer"
                            title="Minimize to floating ticker badge"
                        >
                            <Minimize2 size={17} />
                        </button>
                    </div>
                </div>

                {/* Live Countdown & Expiry Policy Banner */}
                <div className={`px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b ${
                    isUrgent ? 'bg-rose-50/70 border-rose-200 text-rose-950' : 'bg-amber-50/50 border-amber-100 text-amber-950'
                }`}>
                    <div className="flex items-center gap-2.5">
                        <Clock className={`w-4 h-4 ${isUrgent ? 'text-rose-600 animate-pulse' : 'text-amber-600'}`} />
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                                Decision Time Window
                            </span>
                            <div className="flex items-baseline gap-1.5">
                                <span className={`text-xl font-bold font-mono ${
                                    isUrgent ? 'text-rose-600 animate-pulse' : 'text-amber-800'
                                }`}>
                                    00:{String(secondsLeft).padStart(2, '0')}s
                                </span>
                                <span className="text-xs text-slate-500">remaining</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Expiry Policy Action
                        </span>
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg border ${
                            deal.timeout_action === 'AUTO_ACCEPT'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                            {deal.timeout_action === 'AUTO_ACCEPT' ? 'Auto-Accept on Expiry' : 'Auto-Reject on Expiry'}
                        </span>
                    </div>
                </div>

                {/* Deal Body Content */}
                <div className="p-6 space-y-4 max-h-[58vh] overflow-y-auto custom-scrollbar">
                    {/* Uncontested / Sole-Source Advisory Banner */}
                    {(deal.is_uncontested || deal.legs?.some(l => l.is_uncontested)) && (
                        <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold">Sole-Source Advisory (Single Quote):</span>{' '}
                                <span className="text-amber-800">
                                    {deal.uncontested_reason || "One or more legs received only 1 quote. No competing offers were received to establish market spread."}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Primary Deal Parameter Card */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                                    {deal.ref_no}
                                </span>
                                <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                    {deal.type === 'TBILL' ? 'T-Bill Auction' : (deal.is_multi_leg ? 'Multi-Currency Basket' : 'FX Spot Execution')}
                                </span>
                            </div>

                            <div className="text-xs font-bold text-slate-700">
                                <span className="uppercase text-slate-500 font-semibold">{deal.direction || 'BUY'}</span>{' '}
                                <span className="text-slate-900 font-mono">{formatNum(deal.amount, 0, 2)}</span>{' '}
                                <span className="text-blue-700 font-bold">{deal.buy_currency || deal.currency_pair}</span>
                            </div>
                        </div>

                        {/* Counterparty Standings Highlight */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="p-3.5 rounded-xl bg-white border border-emerald-200 flex items-center gap-3 shadow-2xs">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                                    <Building2 size={20} />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block truncate">
                                        Best Counterparty Rate
                                    </span>
                                    <p className="text-sm font-bold text-slate-900 truncate">
                                        {deal.winner_bank_name || 'Winning Counterparty'}
                                    </p>
                                    <div className="text-xs font-mono font-bold text-emerald-800">
                                        Rate: {deal.winner_rate !== null && deal.winner_rate !== undefined ? formatNum(deal.winner_rate, 4, 4) : 'Ready'}
                                    </div>
                                    {deal.is_uncontested && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 shrink-0 mt-1">
                                            <AlertTriangle size={11} className="text-amber-600 shrink-0" />
                                            Single Quote Received
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center gap-3 shadow-2xs">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                        Estimated Desk Savings
                                    </span>
                                    <p className="text-sm font-bold text-slate-900 font-mono">
                                        {deal.saved_vs_avg ? `+ ${formatNum(deal.saved_vs_avg, 2, 2)} EGP` : 'Best in Market'}
                                    </p>
                                    <span className="text-[11px] text-slate-500">vs market desk average</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Multi-Leg Basket Legs Checklist (if multi-leg) */}
                    {isMultiLeg && (
                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-slate-700" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                        Awarded Currency Pairs ({selectedLegIds.length}/{deal.legs.length} selected)
                                    </span>
                                </div>
                                <div className="flex gap-2 text-xs font-bold">
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedLegIds(deal.legs.filter(l => !l.is_inconclusive).map(l => String(l.leg_id)))}
                                        className="text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                                    >
                                        Select All
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedLegIds([])}
                                        className="text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
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
                                                    ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                                                    : isSelected
                                                        ? 'bg-emerald-50/80 border-emerald-300 text-slate-900 shadow-2xs'
                                                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    disabled={isInconclusive}
                                                    onChange={() => {}}
                                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-900 font-mono">
                                                            {leg.currency_pair}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500 font-mono">
                                                            {formatNum(leg.amount, 0, 2)}
                                                        </span>
                                                        {leg.is_uncontested && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 shrink-0" title={leg.uncontested_reason || "Single quote received"}>
                                                                <AlertTriangle size={11} className="text-amber-600 shrink-0" />
                                                                Single Quote
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500">
                                                        {isInconclusive ? (
                                                            <span className="text-amber-700 font-semibold">No quotes received</span>
                                                        ) : (
                                                            <span>Winner: <strong className="text-slate-900 font-bold">{leg.winner_bank_name}</strong> @ <span className="font-mono text-emerald-700 font-bold">{formatNum(leg.winner_rate, 4, 4)}</span></span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                {leg.saved_vs_avg && !isInconclusive ? (
                                                    <span className="text-xs font-mono text-emerald-700 font-bold">
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

                    {/* Inline Decline Reason Form */}
                    {showDeclineInput && (
                        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 space-y-2.5 animate-fade-in">
                            <label className="block text-xs font-bold text-rose-900 uppercase tracking-wider">
                                Reason for Declining Tender
                            </label>
                            <input
                                type="text"
                                value={declineReason}
                                onChange={(e) => setDeclineReason(e.target.value)}
                                placeholder="E.g., Price exceeded limit / delayed internal approval"
                                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                            />
                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowDeclineInput(false)}
                                    className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDecline}
                                    disabled={isDeclining}
                                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                                >
                                    {isDeclining ? 'Confirming Decline...' : 'Confirm Decline & Notify Banks'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions (Matching Platform Standards) */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={handleInspectOrderBook}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                    >
                        <ExternalLink size={14} />
                        Inspect Order Book & Standings &rarr;
                    </button>

                    <div className="flex items-center gap-3 ml-auto">
                        {!showDeclineInput && (
                            <button
                                type="button"
                                onClick={() => setShowDeclineInput(true)}
                                disabled={isAccepting || isDeclining}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Decline Tender
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleAccept}
                            disabled={isAccepting || isDeclining || secondsLeft <= 0}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center gap-2 cursor-pointer"
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
