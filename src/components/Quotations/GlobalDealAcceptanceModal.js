import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Clock, 
    AlertTriangle, 
    CheckCircle2, 
    ExternalLink, 
    TrendingUp, 
    Building2, 
    Layers, 
    Minimize2, 
    Maximize2, 
    Volume2, 
    VolumeX,
    ShieldAlert,
    ArrowUpRight,
    Coins,
    Calendar,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    BarChart2,
    XCircle,
    Info
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

/**
 * Evaluates quoted winning rate directly against the market reference rate.
 * Returns direct expected rate, exact difference, and explicit status/color (Green = Better, Red = Worse).
 */
const getRateReferenceAssessment = (winnerRate, benchmark, direction = 'BUY') => {
    if (!winnerRate || !benchmark) return null;
    
    // Direct expected reference rate from empirical model, CBE fixing, or live mid
    const expectedRate = benchmark.suggested_reference_rate || benchmark.live_mid || benchmark.cbe_official_mid;
    if (!expectedRate) return null;

    const numWinner = Number(winnerRate);
    const numExpected = Number(expectedRate);
    const diff = numWinner - numExpected;
    const absDiff = Math.abs(diff);
    const isBuy = (direction || 'BUY').toUpperCase() === 'BUY';
    
    // For BUY: paying less is better (diff < 0), paying more is worse (diff > 0)
    // For SELL: receiving more is better (diff > 0), receiving less is worse (diff < 0)
    const isBetter = isBuy ? diff < -0.0001 : diff > 0.0001;
    const isWorse = isBuy ? diff > 0.0001 : diff < -0.0001;
    const isTight = absDiff <= 0.0001 || (benchmark.quote_evaluation?.variance_vs_ref_bps !== undefined && Math.abs(benchmark.quote_evaluation.variance_vs_ref_bps) <= 5.0);

    let status = 'within';
    let label = 'Within expected rate';
    let colorClass = 'text-emerald-800 bg-emerald-50 border-emerald-300';
    let icon = '🟢';

    if (isTight) {
        status = 'within';
        label = 'Within expected rate';
        colorClass = 'text-emerald-800 bg-emerald-50/80 border-emerald-300 font-semibold';
        icon = '🟢';
    } else if (isBetter) {
        status = 'better';
        label = `${absDiff.toFixed(4)} better than expected`;
        colorClass = 'text-emerald-800 bg-emerald-100 border-emerald-400 font-bold';
        icon = '🟢';
    } else if (isWorse) {
        status = 'worse';
        const directionWord = isBuy ? 'higher' : 'lower';
        label = `+${absDiff.toFixed(4)} ${directionWord} than expected`;
        colorClass = 'text-rose-800 bg-rose-50 border-rose-300 font-bold';
        icon = '🔴';
    }

    return {
        expectedRate: numExpected,
        quotedRate: numWinner,
        diff,
        absDiff,
        status,
        label,
        colorClass,
        icon,
        isFrozen: Boolean(benchmark.is_frozen_snapshot)
    };
};

export default function GlobalDealAcceptanceModal({ deal, onClose, onResolve, userRole }) {
    const navigate = useNavigate();
    const [secondsLeft, setSecondsLeft] = useState(deal?.seconds_remaining ?? 30);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isAccepting, setIsAccepting] = useState(false);
    const [isDeclining, setIsDeclining] = useState(false);
    const [isDeclined, setIsDeclined] = useState(false);
    const [savedReason, setSavedReason] = useState(null);
    const [isUpdatingReason, setIsUpdatingReason] = useState(false);
    const [soundMuted, setSoundMuted] = useState(false);

    // Multi-leg selection state
    const isMultiLeg = Boolean(deal?.is_multi_leg && deal?.legs && deal.legs.length > 1);
    const winningBanks = isMultiLeg 
        ? Array.from(new Set((deal?.legs || []).map(l => l.winner_bank_name).filter(Boolean))) 
        : [deal?.winner_bank_name].filter(Boolean);
    const [selectedLegIds, setSelectedLegIds] = useState(() => {
        if (!deal?.legs) return [];
        return deal.legs.filter(l => !l.is_inconclusive).map(l => String(l.leg_id));
    });

    const isCorporateAdmin = userRole === 'corporate_admin' || userRole === 'checker' || userRole === 'system_owner';
    const playedEntranceChimeRef = useRef(false);

    // Entrance sound effect
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

    // Live countdown timer (halts if deal already declined)
    useEffect(() => {
        if (!deal?.acceptance_deadline || isDeclined) return;

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
    }, [deal?.acceptance_deadline, deal?.rfq_id, onResolve, soundMuted, isDeclined]);

    if (!deal) return null;

    const isUrgent = secondsLeft <= 10;
    const initialDuration = deal.type === 'TBILL' ? 120 : (deal.acceptance_timeout_seconds || 30);
    const progressPercent = Math.min(100, Math.max(0, (secondsLeft / initialDuration) * 100));

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
            try {
                tradingAudio.playResultOut('WINNER');
            } catch (e) {}

            toast.success(res.data?.message || "Trade deal accepted & binding execution confirmed!");
            
            window.dispatchEvent(new CustomEvent('quotation-deal-resolved', {
                detail: { rfqId: deal.rfq_id, status: 'ACCEPTED' }
            }));

            if (onResolve) onResolve();

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

    /**
     * Requirement 1: Immediate decline on customer action.
     * Rejects tender right away on backend, then smoothly presents optional reason collection.
     */
    const handleImmediateDecline = async () => {
        const declineEndpoint = isCorporateAdmin
            ? `/corporate-admin/quotations/${deal.rfq_id}/decline-deal`
            : `/end-user/quotations/${deal.rfq_id}/decline-deal`;

        try {
            setIsDeclining(true);
            const res = await apiClient.post(declineEndpoint, { reason: "Declined by corporate treasury desk" });
            
            try {
                tradingAudio.playResultOut('REJECTED');
            } catch (e) {}

            toast.info(res.data?.message || "Tender outcome declined.");

            window.dispatchEvent(new CustomEvent('quotation-deal-resolved', {
                detail: { rfqId: deal.rfq_id, status: 'REJECTED' }
            }));

            if (onResolve) onResolve();

            // Immediately switch to post-decline reason collection
            setIsDeclined(true);
        } catch (err) {
            console.error("Deal decline error:", err);
            toast.error(err.response?.data?.detail || "Failed to decline deal.");
        } finally {
            setIsDeclining(false);
        }
    };

    const handleSelectDeclineReason = async (reasonOption) => {
        setSavedReason(reasonOption);
        const declineEndpoint = isCorporateAdmin
            ? `/corporate-admin/quotations/${deal.rfq_id}/decline-deal`
            : `/end-user/quotations/${deal.rfq_id}/decline-deal`;

        try {
            setIsUpdatingReason(true);
            await apiClient.post(declineEndpoint, { reason: reasonOption });
            toast.success("Decline reason recorded.");
        } catch (err) {
            console.warn("Could not update decline reason:", err);
        } finally {
            setIsUpdatingReason(false);
        }
    };

    const handleFinishDeclinedClose = () => {
        const targetUrl = isCorporateAdmin
            ? `/corporate-admin/quotations/results/${deal.rfq_id}`
            : `/end-user/quotations/results/${deal.rfq_id}`;
        navigate(targetUrl);
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

    const toggleAllLegs = () => {
        const validLegs = (deal.legs || []).filter(l => !l.is_inconclusive);
        if (selectedLegIds.length === validLegs.length) {
            setSelectedLegIds([]);
        } else {
            setSelectedLegIds(validLegs.map(l => String(l.leg_id)));
        }
    };

    // --- POST-DECLINE COLLECTION SCREEN (Stress-free, deal is already safely declined) ---
    if (isDeclined) {
        return (
            <div 
                className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs transition-all duration-300 animate-fade-in"
                role="dialog"
                aria-modal="true"
            >
                <div className="relative w-full max-w-lg bg-white border border-slate-300 rounded-3xl shadow-2xl p-6 flex flex-col items-center text-center animate-fade-in">
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3 shadow-inner">
                        <XCircle size={28} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                        Tender {deal.ref_no} Has Been Declined
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                        The quotation outcome was rejected immediately. Counterparties have been notified.
                    </p>

                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 w-full text-left">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                            Help us improve: Reason for declining (Optional):
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                'Price exceeded limit',
                                'Market shifted / delayed internal approval',
                                'Internal liquidity shift',
                                'Re-tendering requested'
                            ].map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => handleSelectDeclineReason(r)}
                                    disabled={isUpdatingReason}
                                    className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-colors cursor-pointer ${
                                        savedReason === r 
                                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs' 
                                            : 'bg-white border-slate-200 hover:border-rose-400 hover:bg-rose-50/50 text-slate-700'
                                    }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                        {savedReason && (
                            <p className="text-[11px] text-emerald-600 font-semibold mt-2.5 flex items-center gap-1">
                                <CheckCircle2 size={13} /> Reason recorded: {savedReason}
                            </p>
                        )}
                    </div>

                    <div className="mt-5 w-full flex items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={handleFinishDeclinedClose}
                            className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                        >
                            Done & View Results
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- MINIMIZED FLOATING BADGE (Non-obstructive bottom right) ---
    if (isMinimized) {
        return (
            <div 
                className="fixed bottom-5 right-5 z-[9995] animate-bounce-subtle"
                style={{ filter: 'drop-shadow(0 10px 25px rgba(0, 0, 0, 0.15))' }}
            >
                <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border backdrop-blur-md transition-all duration-300 ${
                    isUrgent 
                        ? 'bg-rose-50/95 border-rose-300 text-rose-950 shadow-lg shadow-rose-200' 
                        : 'bg-white/95 border-amber-300 text-slate-900 shadow-lg shadow-amber-100'
                }`}>
                    <div className="relative flex items-center justify-center">
                        <span className={`w-3 h-3 rounded-full animate-ping absolute ${isUrgent ? 'bg-rose-500' : 'bg-amber-500'}`} />
                        <Clock className={`w-4 h-4 ${isUrgent ? 'text-rose-600' : 'text-amber-600'}`} />
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                Deal Decision Required
                            </span>
                            <span className={`text-[11px] font-mono font-bold px-2 py-0.2 rounded-full ${
                                isUrgent ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                                {secondsLeft}s
                            </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-semibold truncate max-w-[240px]">
                            {deal.ref_no} &bull; {deal.winner_bank_name || 'Winning Bank'} @ {formatNum(deal.winner_rate, 2, 4)}
                        </div>
                    </div>

                    <button
                        onClick={() => setIsMinimized(false)}
                        className="ml-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-transform active:scale-95 flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                        <Maximize2 size={13} />
                        Review
                    </button>
                </div>
            </div>
        );
    }

    // Single-leg reference evaluation (if single-leg deal)
    const singleRefEval = !isMultiLeg ? getRateReferenceAssessment(deal.winner_rate, deal.market_benchmark, deal.direction) : null;

    // --- FULL SCREEN ZERO-SCROLL COCKPIT (Optimized to fit up to 4 pairs seamlessly) ---
    return (
        <div 
            className="fixed inset-0 z-[9990] flex items-center justify-center p-2 sm:p-3 bg-slate-950/70 backdrop-blur-xs transition-all duration-300 animate-fade-in"
            role="dialog"
            aria-modal="true"
        >
            <div className={`relative w-full max-w-5xl xl:max-w-6xl max-h-[96vh] bg-white border rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 flex flex-col ${
                isUrgent ? 'border-rose-400 ring-4 ring-rose-400/20' : 'border-slate-300 ring-2 ring-slate-400/10'
            }`}>
                
                {/* 1. TOP PROGRESS STRIP */}
                <div className="w-full h-1 bg-slate-100 relative overflow-hidden shrink-0">
                    <div 
                        className={`h-full transition-all duration-1000 ease-linear ${
                            isUrgent 
                                ? 'bg-rose-500 animate-pulse' 
                                : 'bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                {/* 2. HEADER & CLOCK HUD (Compact Height ~42px) */}
                <div className="px-4 py-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isUrgent ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-400' : 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-400'
                        }`}>
                            {isUrgent ? <AlertTriangle size={15} className="animate-pulse" /> : <Clock size={15} />}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                                {deal.ref_no}
                            </span>
                            <span className="text-xs font-bold text-slate-200">
                                {deal.type === 'TBILL' ? 'T-Bill Auction' : (deal.is_multi_leg ? `Multi-Currency Basket (${deal.legs?.length} Legs)` : 'FX Spot Tender')}
                            </span>
                            <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                                (deal.direction || 'BUY').toUpperCase() === 'BUY' 
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}>
                                {deal.direction || 'BUY'}
                            </span>
                        </div>
                    </div>

                    {/* Clock & Action HUD */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-right">
                            <span className={`text-xl font-bold font-mono tracking-tight ${
                                isUrgent ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
                            }`}>
                                00:{String(secondsLeft).padStart(2, '0')}s
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                                {deal.timeout_action === 'AUTO_ACCEPT' ? '• Auto-Accepts' : '• Auto-Rejects'}
                            </span>
                        </div>

                        <div className="flex items-center gap-1 pl-2 border-l border-slate-700">
                            <button
                                onClick={() => setSoundMuted(!soundMuted)}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
                                title={soundMuted ? "Unmute chimes" : "Mute chimes"}
                            >
                                {soundMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                            </button>
                            <button
                                onClick={() => setIsMinimized(true)}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
                                title="Minimize to ticker badge"
                            >
                                <Minimize2 size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. SOLE-SOURCE GOVERNANCE ADVISORY (Compact 1-Line Height ~26px) */}
                {(deal.is_uncontested || deal.legs?.some(l => l.is_uncontested)) && (
                    <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-300 flex items-center justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <AlertTriangle size={14} className="text-amber-700 font-bold shrink-0" />
                            <span className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                                Sole-Source Tender:
                            </span>
                            <span className="text-xs text-amber-900 truncate font-medium">
                                {deal.uncontested_reason || "Single quote received — benchmarked against expected market reference rate."}
                            </span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 bg-amber-200 border border-amber-400 px-2 py-0.2 rounded shrink-0">
                            Uncontested Rate
                        </span>
                    </div>
                )}

                {/* 4. EXECUTIVE DECISION HUD (Ultra-Compact Single-Row Bar ~50px) */}
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {/* Stat 1: Volume */}
                        <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Trade Volume
                                </span>
                                <span className="text-xs font-bold font-mono text-slate-900 truncate block">
                                    {isMultiLeg ? `${deal.legs?.length || 0} Pairs Basket` : `${formatNum(deal.amount, 0, 2)} ${deal.buy_currency || deal.currency_pair}`}
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                                {deal.value_date ? String(deal.value_date) : 'Spot (T+2)'}
                            </span>
                        </div>

                        {/* Stat 2: Awarded Counterparties */}
                        <div className="bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs flex items-center justify-between">
                            <div className="min-w-0 pr-1">
                                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                                    {isMultiLeg ? 'Awarded Banks' : 'Winning Bank'}
                                </span>
                                <span className="text-xs font-bold text-slate-900 truncate block" title={winningBanks.join(', ') || deal.winner_bank_name}>
                                    {winningBanks.join(', ') || deal.winner_bank_name || 'Winning Bank'}
                                </span>
                            </div>
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded shrink-0">
                                {isMultiLeg ? `${winningBanks.length} Banks` : '#1 Rank'}
                            </span>
                        </div>

                        {/* Stat 3: Execution Pricing */}
                        <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                            <div className="min-w-0 pr-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    {isMultiLeg ? 'Pricing Mode' : 'Execution Rate'}
                                </span>
                                <span className="text-xs font-bold font-mono text-emerald-700 truncate block">
                                    {isMultiLeg ? 'Multi-Pair Rates' : formatNum(deal.winner_rate, 4, 4)}
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                                {isMultiLeg ? 'Per-Leg Benchmarks' : (deal.market_benchmark?.live_mid ? `Mid: ${formatNum(deal.market_benchmark.live_mid, 4, 4)}` : 'Best Quote')}
                            </span>
                        </div>

                        {/* Stat 4: Commercial Value */}
                        <div className="bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs flex items-center justify-between">
                            <div className="min-w-0 pr-1">
                                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                                    Commercial Value
                                </span>
                                <span className="text-xs font-bold font-mono text-emerald-800 truncate block">
                                    {deal.is_uncontested || !deal.saved_vs_avg || deal.saved_vs_avg <= 0
                                        ? 'Sole-Source Benchmarked'
                                        : `+${formatNum(deal.saved_vs_avg, 2, 2)} EGP Savings`}
                                </span>
                            </div>
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                                {deal.is_uncontested ? 'Audit Active' : 'vs Desk Mean'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 5. MULTI-LEG MATRIX / SINGLE-LEG DIRECT LADDER (Fits 4 pairs without scrolling) */}
                <div className="px-4 py-2 bg-white flex-1 overflow-y-auto custom-scrollbar">
                    {isMultiLeg ? (
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                            {/* Table Header */}
                            <div className="bg-slate-100/90 px-3 py-1.5 flex items-center justify-between border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider shrink-0">
                                <div className="flex items-center gap-1.5">
                                    <Layers size={13} className="text-slate-500" />
                                    <span>Awarded Currency Pairs ({selectedLegIds.length} of {deal.legs?.length} Selected)</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={toggleAllLegs}
                                    className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold lowercase first-letter:uppercase hover:underline cursor-pointer"
                                >
                                    {selectedLegIds.length === deal.legs?.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>

                            {/* Legs List - Designed for 4 items to fit perfectly */}
                            <div className="divide-y divide-slate-100">
                                {deal.legs.map((leg, idx) => {
                                    const legIdStr = String(leg.leg_id);
                                    const isSelected = selectedLegIds.includes(legIdStr);
                                    const isInconclusive = Boolean(leg.is_inconclusive);
                                    const offers = leg.counterparty_offers || [];
                                    const refEval = getRateReferenceAssessment(leg.winner_rate, leg.market_benchmark, leg.direction);

                                    return (
                                        <div 
                                            key={legIdStr || idx}
                                            className={`px-3 py-2 transition-colors ${
                                                isInconclusive 
                                                    ? 'bg-slate-50/70 text-slate-400'
                                                    : isSelected
                                                    ? 'bg-emerald-50/20 hover:bg-emerald-50/40 text-slate-900'
                                                    : 'bg-white hover:bg-slate-50 text-slate-600'
                                            }`}
                                        >
                                            {/* Main Row */}
                                            <div className="flex items-center justify-between gap-3">
                                                {/* Left: Checkbox + Pair Details */}
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        disabled={isInconclusive}
                                                        onChange={() => !isInconclusive && toggleLeg(legIdStr)}
                                                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer shrink-0"
                                                    />
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="font-bold font-mono text-sm text-slate-900">
                                                            {leg.currency_pair}
                                                        </span>
                                                        <span className="text-xs font-semibold text-slate-600 uppercase bg-slate-100 px-1.5 py-0.2 rounded">
                                                            {leg.direction || 'BUY'} {formatNum(leg.amount, 0, 2)}
                                                        </span>
                                                        {leg.is_uncontested && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded shrink-0">
                                                                <AlertTriangle size={11} className="text-amber-700" />
                                                                Sole-Source
                                                            </span>
                                                        )}
                                                        <span className="text-[11px] text-slate-400 hidden sm:inline">
                                                            {leg.value_date ? String(leg.value_date) : 'Spot (T+2)'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Center: Direct Rate Expectation Assessment */}
                                                {refEval ? (
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <div className="flex items-center gap-1.5 text-xs font-mono bg-slate-50 px-2 py-0.8 rounded-lg border border-slate-200">
                                                            <span className="text-slate-500 text-[11px] font-sans">Expected:</span>
                                                            <strong className="text-slate-700">{formatNum(refEval.expectedRate, 4, 4)}</strong>
                                                            {refEval.isFrozen && (
                                                                <span className="text-[10px]" title="Rate frozen at trade execution">🔒</span>
                                                            )}
                                                            <span className="text-slate-400">→</span>
                                                            <span className="text-slate-500 text-[11px] font-sans">Quoted:</span>
                                                            <strong className="text-slate-900">{formatNum(refEval.quotedRate, 4, 4)}</strong>
                                                        </div>
                                                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg border shadow-2xs ${refEval.colorClass}`}>
                                                            <span>{refEval.icon}</span>
                                                            <span>{refEval.label}</span>
                                                        </span>
                                                    </div>
                                                ) : leg.avg_rate && leg.total_quotes >= 2 ? (
                                                    <div className="text-xs text-slate-500 font-mono">
                                                        Desk Mean: <strong className="text-slate-700">{formatNum(leg.avg_rate, 4, 4)}</strong>
                                                    </div>
                                                ) : null}

                                                {/* Right: Best Executable Rate */}
                                                <div className="text-right shrink-0">
                                                    {!isInconclusive ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="text-right">
                                                                <div className="text-xs font-bold text-slate-800 leading-tight">
                                                                    {leg.winner_bank_name || 'Awarded Bank'}
                                                                </div>
                                                                <div className="font-mono font-bold text-emerald-700 text-sm sm:text-base leading-tight">
                                                                    {formatNum(leg.winner_rate, 4, 4)}
                                                                </div>
                                                            </div>
                                                            <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300">
                                                                Best
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 font-semibold text-xs bg-slate-100 px-2 py-0.5 rounded">
                                                            No Quote
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Micro Bids Strip */}
                                            {offers.length > 0 && !isInconclusive && (
                                                <div className="mt-1 pt-1 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                                                        Bids ({offers.length}):
                                                    </span>
                                                    {offers.map((offer, oIdx) => (
                                                        <div
                                                            key={offer.bank_id || oIdx}
                                                            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[11px] transition-all ${
                                                                offer.is_winner
                                                                    ? 'bg-emerald-100/90 text-emerald-950 font-bold border border-emerald-300'
                                                                    : offer.is_passed
                                                                    ? 'bg-slate-100 text-slate-400 border border-slate-200'
                                                                    : 'bg-slate-50 text-slate-700 border border-slate-200'
                                                            }`}
                                                        >
                                                            <span className="font-medium">{offer.bank_name}</span>
                                                            {offer.has_quote ? (
                                                                <span className={`font-mono ${offer.is_winner ? 'text-emerald-900 font-bold' : 'text-slate-700'}`}>
                                                                    {formatNum(offer.rate, 4, 4)}
                                                                    {offer.is_winner && ' ★'}
                                                                </span>
                                                            ) : offer.is_passed ? (
                                                                <span className="text-slate-400 text-[10px]">(Passed)</span>
                                                            ) : (
                                                                <span className="text-slate-400 text-[10px]">(No Quote)</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        /* Single-Leg Price Ladder with Direct Reference */
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs flex flex-col bg-white">
                            <div className="bg-slate-100/90 px-3 py-1.5 flex items-center justify-between border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                    <BarChart2 size={13} className="text-slate-500" />
                                    <span>
                                        Competitive Counterparty Ladder ({deal.counterparty_offers?.length || deal.total_quotes || 0} Banks Quoted)
                                    </span>
                                </div>
                                {singleRefEval && (
                                    <div className="flex items-center gap-2 font-mono text-xs">
                                        <span className="text-slate-500 font-sans">Expected Rate:</span>
                                        <strong>{formatNum(singleRefEval.expectedRate, 4, 4)}</strong>
                                        <span className={`px-2 py-0.5 rounded text-[11px] ${singleRefEval.colorClass}`}>
                                            {singleRefEval.icon} {singleRefEval.label}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {deal.counterparty_offers && deal.counterparty_offers.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {deal.counterparty_offers.map((offer, idx) => (
                                        <div
                                            key={offer.bank_id || idx}
                                            className={`px-3 py-2 flex items-center justify-between text-xs transition-colors ${
                                                offer.is_winner
                                                    ? 'bg-emerald-50/70'
                                                    : offer.is_passed
                                                    ? 'bg-slate-50/60 opacity-60'
                                                    : 'bg-white hover:bg-slate-50/80'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                                                    offer.is_winner
                                                        ? 'bg-emerald-600 text-white shadow-2xs'
                                                        : offer.rank
                                                        ? 'bg-slate-200 text-slate-700'
                                                        : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                    {offer.rank || '—'}
                                                </span>
                                                <span className={`text-xs ${offer.is_winner ? 'font-bold text-emerald-950' : 'font-semibold text-slate-800'}`}>
                                                    {offer.bank_name}
                                                </span>
                                                {offer.is_winner && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-300">
                                                        Awarded
                                                    </span>
                                                )}
                                                {offer.is_winner && deal.is_uncontested && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-950 bg-amber-200 border border-amber-400 px-1.5 py-0.2 rounded">
                                                        Sole-Source
                                                    </span>
                                                )}
                                            </div>

                                            <div className="text-right shrink-0">
                                                {offer.has_quote ? (
                                                    <span className={`font-mono text-sm font-bold ${offer.is_winner ? 'text-emerald-700' : 'text-slate-800'}`}>
                                                        {formatNum(offer.rate, 4, 4)}
                                                    </span>
                                                ) : offer.is_passed ? (
                                                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Passed</span>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">No Quote</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>

                {/* 6. MICRO DISCLAIMER FOOTNOTE (~18px) */}
                <div className="px-4 py-1 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400 flex items-center gap-1.5 shrink-0">
                    <Info size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">
                        Expected market reference rates are derived mathematically from live feeds & historical CBE official fixings. Indicative guidance only.
                    </span>
                </div>

                {/* 7. HIGH-VISIBILITY ACTION FOOTER (~48px) */}
                <div className="px-4 py-2 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={handleInspectOrderBook}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                        <ExternalLink size={13} />
                        <span>Inspect Full Order Book</span>
                    </button>

                    <div className="flex items-center gap-2.5">
                        {/* Requirement 1: Instant Decline Button */}
                        <button
                            type="button"
                            onClick={handleImmediateDecline}
                            disabled={isAccepting || isDeclining}
                            className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-300 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {isDeclining ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                                    <span>Declining...</span>
                                </>
                            ) : (
                                <>
                                    <XCircle size={14} />
                                    <span>Decline Tender</span>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={handleAccept}
                            disabled={isAccepting || isDeclining || secondsLeft <= 0}
                            className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center gap-2 cursor-pointer active:scale-98"
                        >
                            {isAccepting ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Executing Trade...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={15} />
                                    <span>Accept & Execute Trade</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
