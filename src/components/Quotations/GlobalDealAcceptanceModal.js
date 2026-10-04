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
    XCircle
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
    const [showDeclineForm, setShowDeclineForm] = useState(false);
    const [declineReason, setDeclineReason] = useState('Price exceeded internal limit / market shift');
    const [soundMuted, setSoundMuted] = useState(false);

    // Multi-leg selection & expand state
    const isMultiLeg = Boolean(deal?.is_multi_leg && deal?.legs && deal.legs.length > 1);
    const [expandedLegId, setExpandedLegId] = useState(null);
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
            tradingAudio.playResultOut('WINNER');
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

    const handleDecline = async () => {
        const declineEndpoint = isCorporateAdmin
            ? `/corporate-admin/quotations/${deal.rfq_id}/decline-deal`
            : `/end-user/quotations/${deal.rfq_id}/decline-deal`;

        try {
            setIsDeclining(true);
            const res = await apiClient.post(declineEndpoint, { reason: declineReason });
            toast.info(res.data?.message || "Tender outcome declined.");

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
            setShowDeclineForm(false);
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

    const toggleAllLegs = () => {
        const validLegs = (deal.legs || []).filter(l => !l.is_inconclusive);
        if (selectedLegIds.length === validLegs.length) {
            setSelectedLegIds([]);
        } else {
            setSelectedLegIds(validLegs.map(l => String(l.leg_id)));
        }
    };

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

    // --- FULL SCREEN INTERCEPTING ZERO-SCROLL COCKPIT ---
    return (
        <div 
            className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs transition-all duration-300 animate-fade-in"
            role="dialog"
            aria-modal="true"
        >
            <div className={`relative w-full max-w-4xl bg-white border rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 flex flex-col ${
                isUrgent ? 'border-rose-400 ring-4 ring-rose-400/20' : 'border-slate-300 ring-2 ring-slate-400/10'
            }`}>
                
                {/* 1. TOP PROGRESS STRIP */}
                <div className="w-full h-1.5 bg-slate-100 relative overflow-hidden shrink-0">
                    <div 
                        className={`h-full transition-all duration-1000 ease-linear ${
                            isUrgent 
                                ? 'bg-rose-500 animate-pulse' 
                                : 'bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                {/* 2. HEADER & CLOCK HUD */}
                <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isUrgent ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-400' : 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-400'
                        }`}>
                            {isUrgent ? <AlertTriangle size={18} className="animate-pulse" /> : <Clock size={18} />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                                    {deal.ref_no}
                                </span>
                                <span className="text-xs font-bold text-slate-200">
                                    {deal.type === 'TBILL' ? 'Treasury Bill Auction' : (deal.is_multi_leg ? `Multi-Currency Basket (${deal.legs?.length} Legs)` : 'FX Spot Tender')}
                                </span>
                                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.2 rounded-full ${
                                    (deal.direction || 'BUY').toUpperCase() === 'BUY' 
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                }`}>
                                    {deal.direction || 'BUY'}
                                </span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                                Tender window closed &bull; Binding execution awaiting corporate sign-off
                            </span>
                        </div>
                    </div>

                    {/* Prominent Countdown & Expiry HUD */}
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                                <span className={`text-2xl font-bold font-mono tracking-tight ${
                                    isUrgent ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
                                }`}>
                                    00:{String(secondsLeft).padStart(2, '0')}s
                                </span>
                            </div>
                            <div className="flex items-center justify-end gap-1 text-[10px] font-bold">
                                {deal.is_auto_accept_halted ? (
                                    <span className="text-amber-400 flex items-center gap-1 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/30">
                                        <ShieldAlert size={10} /> Auto-Accept Halted
                                    </span>
                                ) : deal.timeout_action === 'AUTO_ACCEPT' ? (
                                    <span className="text-emerald-300 flex items-center gap-1">
                                        <CheckCircle2 size={10} /> Auto-Accepts on Timeout
                                    </span>
                                ) : (
                                    <span className="text-rose-300 flex items-center gap-1">
                                        <XCircle size={10} /> Auto-Rejects on Timeout
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Top Utility Controls */}
                        <div className="flex items-center gap-1 pl-2 border-l border-slate-700">
                            <button
                                onClick={() => setSoundMuted(!soundMuted)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
                                title={soundMuted ? "Unmute chimes" : "Mute chimes"}
                            >
                                {soundMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                            </button>
                            <button
                                onClick={() => setIsMinimized(true)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
                                title="Minimize to ticker badge"
                            >
                                <Minimize2 size={15} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. OPTIONAL SOLE-SOURCE ADVISORY CALLOUT (Compact Single Line) */}
                {(deal.is_uncontested || deal.legs?.some(l => l.is_uncontested)) && (
                    <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-xs text-amber-950 font-semibold shrink-0">
                        <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                        <span className="font-bold text-amber-900">Sole-Source Advisory:</span>
                        <span className="truncate text-amber-800">
                            {deal.uncontested_reason || "Single quote received. No competing counterparty offers were received to establish competitive spread."}
                        </span>
                    </div>
                )}

                {/* 4. EXECUTIVE DECISION HUD (4-COLUMN HIGH DENSITY GRID) */}
                <div className="p-4 bg-slate-50/70 border-b border-slate-200 shrink-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                        
                        {/* Box 1: Trade Package Volume */}
                        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Trade Volume
                            </span>
                            <div className="mt-1">
                                <span className="text-base font-bold font-mono text-slate-900 block truncate">
                                    {formatNum(deal.amount, 0, 2)}
                                </span>
                                <span className="text-xs font-bold text-blue-700 block truncate">
                                    {deal.buy_currency || deal.currency_pair}
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-500 mt-1 block truncate">
                                Value: {deal.value_date ? String(deal.value_date) : 'Spot (T+2)'}
                            </span>
                        </div>

                        {/* Box 2: Winning Counterparty */}
                        <div className="bg-white p-3 rounded-2xl border border-emerald-200 shadow-2xs flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                                    Winning Counterparty
                                </span>
                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono">
                                    #1 Rank
                                </span>
                            </div>
                            <div className="mt-1">
                                <span className="text-sm font-bold text-slate-900 block truncate" title={deal.winner_bank_name}>
                                    {deal.winner_bank_name || 'Winning Bank'}
                                </span>
                                <span className="text-[11px] text-slate-500 block truncate">
                                    {deal.total_quotes ? `${deal.total_quotes} counterparty quotes evaluated` : 'Best executable quote'}
                                </span>
                            </div>
                            <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
                                Counterparty Confirmed
                            </span>
                        </div>

                        {/* Box 3: Best Execution Rate */}
                        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Execution Rate
                            </span>
                            <div className="mt-1">
                                <span className="text-lg font-bold font-mono text-emerald-700 block tracking-tight">
                                    {deal.winner_rate !== null && deal.winner_rate !== undefined ? formatNum(deal.winner_rate, 4, 4) : '—'}
                                </span>
                                <span className="text-[11px] font-mono text-slate-500 block truncate">
                                    {deal.avg_rate ? `Desk Avg: ${formatNum(deal.avg_rate, 4, 4)}` : 'Market Competitive'}
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-500 mt-1 block">
                                {deal.is_uncontested ? '⚠️ Uncontested Bid' : 'Competitive Best'}
                            </span>
                        </div>

                        {/* Box 4: Total Commercial Savings */}
                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-3 rounded-2xl border border-emerald-300 shadow-2xs flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                                    Commercial Savings
                                </span>
                                <ArrowUpRight size={14} className="text-emerald-700" />
                            </div>
                            <div className="mt-1">
                                <span className="text-lg font-bold font-mono text-emerald-800 block tracking-tight">
                                    {deal.saved_vs_avg ? `+${formatNum(deal.saved_vs_avg, 2, 2)}` : 'Best in Market'}
                                </span>
                                <span className="text-[11px] font-semibold text-emerald-700 block">
                                    EGP vs Market Mean
                                </span>
                            </div>
                            <span className="text-[10px] text-emerald-800/80 font-medium mt-1 block">
                                Direct Treasury Benefit
                            </span>
                        </div>

                    </div>
                </div>

                {/* 5. MULTI-LEG MATRIX OR SINGLE-LEG COUNTERPARTY OFFERS LADDER (COMPACT ZERO-SCROLL) */}
                <div className="p-4 bg-white flex-1 overflow-hidden">
                    {isMultiLeg ? (
                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                            <div className="bg-slate-100/90 px-3.5 py-2 flex items-center justify-between border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                    <Layers size={13} className="text-slate-600" />
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

                            <div className="divide-y divide-slate-100 max-h-[175px] overflow-y-auto custom-scrollbar">
                                {deal.legs.map((leg, idx) => {
                                    const legIdStr = String(leg.leg_id);
                                    const isSelected = selectedLegIds.includes(legIdStr);
                                    const isInconclusive = Boolean(leg.is_inconclusive);
                                    const isExpanded = expandedLegId === legIdStr;
                                    const offers = leg.counterparty_offers || [];

                                    return (
                                        <div key={legIdStr || idx} className="divide-y divide-slate-50">
                                            <div
                                                className={`px-3.5 py-2.5 flex items-center justify-between text-xs transition-colors ${
                                                    isInconclusive 
                                                        ? 'bg-slate-50 text-slate-400'
                                                        : isSelected
                                                        ? 'bg-emerald-50/50 hover:bg-emerald-50 text-slate-900'
                                                        : 'bg-white hover:bg-slate-50 text-slate-600'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        disabled={isInconclusive}
                                                        onChange={() => !isInconclusive && toggleLeg(legIdStr)}
                                                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                                                    />
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold font-mono text-slate-900">
                                                                {leg.currency_pair}
                                                            </span>
                                                            <span className="text-[11px] font-bold text-slate-500 uppercase">
                                                                {leg.direction || 'BUY'} {formatNum(leg.amount, 0, 2)}
                                                            </span>
                                                            {leg.is_uncontested && (
                                                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                                                                    Single Quote
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[11px] text-slate-600 font-medium">
                                                                {isInconclusive ? 'No executable quote' : `${leg.winner_bank_name} (Winning)`}
                                                            </span>
                                                            {offers.length > 0 && !isInconclusive && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setExpandedLegId(isExpanded ? null : legIdStr);
                                                                    }}
                                                                    className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                                                >
                                                                    <span>{offers.length} {offers.length === 1 ? 'quote' : 'offers'}</span>
                                                                    {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    {!isInconclusive ? (
                                                        <>
                                                            <span className="font-mono font-bold text-emerald-700 block text-sm">
                                                                {formatNum(leg.winner_rate, 4, 4)}
                                                            </span>
                                                            {leg.saved_vs_avg && (
                                                                <span className="text-[11px] font-mono text-emerald-800 font-semibold block">
                                                                    +{formatNum(leg.saved_vs_avg, 2, 2)} EGP
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-400 font-semibold text-xs">Excluded</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Multi-Leg Expanded Counterparty Ladder Drawer */}
                                            {isExpanded && offers.length > 0 && (
                                                <div className="bg-slate-50/90 px-8 py-2 border-t border-slate-100 animate-fade-in text-[11px]">
                                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                                                        <span>Counterparty Quotes Received for {leg.currency_pair}</span>
                                                        {leg.avg_rate && (
                                                            <span className="font-mono normal-case">Leg Mean: <span className="font-bold text-slate-700">{formatNum(leg.avg_rate, 4, 4)}</span></span>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1">
                                                        {offers.map((offer, oIdx) => (
                                                            <div 
                                                                key={offer.bank_id || oIdx}
                                                                className={`px-2.5 py-1 rounded-lg flex items-center justify-between ${
                                                                    offer.is_winner 
                                                                        ? 'bg-emerald-100/70 text-emerald-950 font-bold border border-emerald-200' 
                                                                        : offer.is_passed
                                                                        ? 'bg-slate-100/50 text-slate-400'
                                                                        : 'bg-white text-slate-700 border border-slate-100'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
                                                                        offer.is_winner ? 'bg-emerald-600 text-white' : offer.rank ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-400'
                                                                    }`}>
                                                                        {offer.rank || '—'}
                                                                    </span>
                                                                    <span>{offer.bank_name}</span>
                                                                    {offer.is_winner && (
                                                                        <span className="text-[9px] uppercase px-1 bg-emerald-200 text-emerald-900 rounded font-bold">Awarded</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2 font-mono">
                                                                    {offer.has_quote ? (
                                                                        <>
                                                                            <span className={offer.is_winner ? 'text-emerald-800 font-bold' : 'text-slate-700 font-medium'}>
                                                                                {formatNum(offer.rate, 4, 4)}
                                                                            </span>
                                                                            {offer.spread_bps !== null && offer.spread_bps !== undefined && !offer.is_winner && (
                                                                                <span className="text-[10px] text-slate-400">+{offer.spread_bps} bps</span>
                                                                            )}
                                                                        </>
                                                                    ) : offer.is_passed ? (
                                                                        <span className="text-slate-400 text-[10px] font-medium">Passed</span>
                                                                    ) : (
                                                                        <span className="text-slate-400 text-[10px] italic">No Quote</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        /* Single-Leg Counterparty Offers Ladder & Benchmark Cockpit */
                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col bg-white">
                            <div className="bg-slate-100/90 px-3.5 py-2 flex items-center justify-between border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                    <BarChart2 size={13} className="text-slate-600" />
                                    <span>
                                        Counterparty Offers Ladder ({deal.counterparty_offers?.length || deal.total_quotes || 0} Banks Invited)
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-[11px] normal-case text-slate-500 font-semibold">
                                    {deal.avg_rate && (
                                        <span>Market Mean: <span className="font-bold text-slate-700 font-mono">{formatNum(deal.avg_rate, 4, 4)}</span></span>
                                    )}
                                    {deal.worst_rate && (
                                        <span>Worst: <span className="font-bold text-rose-600 font-mono">{formatNum(deal.worst_rate, 4, 4)}</span></span>
                                    )}
                                </div>
                            </div>

                            {/* Scrollable list of participating banks */}
                            {deal.counterparty_offers && deal.counterparty_offers.length > 0 ? (
                                <div className="divide-y divide-slate-100 max-h-[175px] overflow-y-auto custom-scrollbar">
                                    {deal.counterparty_offers.map((offer, idx) => (
                                        <div
                                            key={offer.bank_id || idx}
                                            className={`px-3.5 py-2.5 flex items-center justify-between text-xs transition-colors ${
                                                offer.is_winner
                                                    ? 'bg-emerald-50/70'
                                                    : offer.is_passed
                                                    ? 'bg-slate-50/50 opacity-60'
                                                    : 'bg-white hover:bg-slate-50/80'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                                    offer.is_winner
                                                        ? 'bg-emerald-600 text-white shadow-2xs'
                                                        : offer.rank
                                                        ? 'bg-slate-200 text-slate-700'
                                                        : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                    {offer.rank || '—'}
                                                </span>
                                                <div className="truncate">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`truncate text-xs ${offer.is_winner ? 'font-bold text-emerald-950' : 'font-semibold text-slate-800'}`}>
                                                            {offer.bank_name}
                                                        </span>
                                                        {offer.is_winner && (
                                                            <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-300">
                                                                Best Execution
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 block">
                                                        {offer.is_winner 
                                                            ? 'Selected for binding deal acceptance' 
                                                            : offer.has_quote 
                                                            ? `Competing bid • Rank #${offer.rank}` 
                                                            : offer.is_passed 
                                                            ? 'Bank submitted formal pass' 
                                                            : 'No quote submitted'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0 pl-3">
                                                {offer.has_quote ? (
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <span className={`font-mono text-sm font-bold ${offer.is_winner ? 'text-emerald-700 text-base' : 'text-slate-800'}`}>
                                                            {formatNum(offer.rate, 4, 4)}
                                                        </span>
                                                        {offer.spread_bps !== null && offer.spread_bps !== undefined && !offer.is_winner && (
                                                            <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                                +{offer.spread_bps} bps
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : offer.is_passed ? (
                                                    <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                                        Passed
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-slate-400 italic">
                                                        No Quote
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* Fallback 3-column benchmark cards if offers array not populated */
                                <div className="p-3.5 grid grid-cols-3 gap-2 text-center bg-slate-50/50">
                                    <div className="bg-white p-2.5 rounded-xl border border-emerald-300 shadow-2xs">
                                        <span className="text-[10px] font-bold text-emerald-700 uppercase block">1st Rank (Winning)</span>
                                        <span className="text-sm font-bold font-mono text-emerald-800 block mt-0.5">
                                            {deal.winner_rate ? formatNum(deal.winner_rate, 4, 4) : '—'}
                                        </span>
                                        <span className="text-[10px] font-semibold text-slate-600 truncate block mt-0.5">
                                            {deal.winner_bank_name}
                                        </span>
                                    </div>

                                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Market Desk Average</span>
                                        <span className="text-sm font-bold font-mono text-slate-800 block mt-0.5">
                                            {deal.avg_rate ? formatNum(deal.avg_rate, 4, 4) : 'Market Mean'}
                                        </span>
                                        <span className="text-[10px] text-slate-400 block mt-0.5">
                                            Baseline
                                        </span>
                                    </div>

                                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Worst Competitor Bid</span>
                                        <span className="text-sm font-bold font-mono text-slate-700 block mt-0.5">
                                            {deal.worst_rate ? formatNum(deal.worst_rate, 4, 4) : '—'}
                                        </span>
                                        <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">
                                            Avoided Spread
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 6. INLINE DECLINE PROMPT (ZERO LAYOUT SHIFT) */}
                {showDeclineForm && (
                    <div className="px-5 py-3 bg-rose-50 border-t border-rose-200 flex flex-wrap items-center justify-between gap-3 shrink-0 animate-fade-in">
                        <div className="flex-1 min-w-[280px]">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-rose-900 block mb-1">
                                Select Reason for Declining Tender
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    'Price exceeded limit',
                                    'Market shifted / delayed internal approval',
                                    'Internal liquidity shift',
                                    'Re-tendering requested'
                                ].map((reasonOption) => (
                                    <button
                                        key={reasonOption}
                                        type="button"
                                        onClick={() => setDeclineReason(reasonOption)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            declineReason === reasonOption
                                                ? 'bg-rose-600 text-white shadow-2xs'
                                                : 'bg-white text-slate-700 border border-slate-300 hover:border-rose-300'
                                        }`}
                                    >
                                        {reasonOption}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                            <button
                                type="button"
                                onClick={() => setShowDeclineForm(false)}
                                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-white transition-colors cursor-pointer"
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={handleDecline}
                                disabled={isDeclining}
                                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                {isDeclining ? 'Declining...' : 'Confirm Decline'}
                            </button>
                        </div>
                    </div>
                )}

                {/* 7. HIGH-VISIBILITY ACTION FOOTER */}
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={handleInspectOrderBook}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                        <ExternalLink size={13} />
                        <span>Inspect Full Order Book</span>
                    </button>

                    <div className="flex items-center gap-3">
                        {!showDeclineForm && (
                            <button
                                type="button"
                                onClick={() => setShowDeclineForm(true)}
                                disabled={isAccepting || isDeclining}
                                className="px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 hover:border-rose-300 transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Decline Tender
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleAccept}
                            disabled={isAccepting || isDeclining || secondsLeft <= 0}
                            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center gap-2 cursor-pointer active:scale-98"
                        >
                            {isAccepting ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Executing Trade...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={16} />
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
