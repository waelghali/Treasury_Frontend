import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Crown, Zap, Shield, Sparkles, X } from 'lucide-react';

/**
 * Subtle Trade-Execution Promotion & Accolade Unlocked Alert.
 * Discreetly honors a dealer's accomplishment upon winning trade confirmation.
 * Synchronized with the 2.5s confetti suction animation:
 * - 0 - 1550ms: Sits prominently in the center top.
 * - 1550 - 2500ms: Gravitationally accelerates and shrinks directly into the target trophy badge along with the confetti!
 * - 2500 - 3850ms: Completely absorbed into the trophy icon as the golden glow pulse continues radiating smoothly.
 */
const TradeAccoladePromotionToast = ({ alert, targetTrophyId, onClose }) => {
    const toastRef = useRef(null);
    const [suctionStyle, setSuctionStyle] = useState(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    // Track the current alert instance to prevent unnecessary resets on parent re-renders
    const currentAlertRef = useRef(null);
    const hasStartedSuctionRef = useRef(false);

    useEffect(() => {
        if (!alert) {
            setSuctionStyle(null);
            currentAlertRef.current = null;
            hasStartedSuctionRef.current = false;
            return;
        }

        // If this same alert is already active and undergoing suction, do NOT reset styles
        if (currentAlertRef.current === alert && hasStartedSuctionRef.current) {
            return;
        }

        currentAlertRef.current = alert;
        hasStartedSuctionRef.current = false;
        setSuctionStyle(null);

        // At 1550ms, start the vortex suction in sync with the confetti particles
        const suctionTimer = setTimeout(() => {
            hasStartedSuctionRef.current = true;
            const toastElem = toastRef.current;
            const targetBadge = (targetTrophyId && document.getElementById(`trophy-badge-${targetTrophyId}`)) ||
                                document.getElementById('trophy-badge-dealer-tier-pill');

            if (toastElem && targetBadge) {
                const toastRect = toastElem.getBoundingClientRect();
                const targetRect = targetBadge.getBoundingClientRect();

                const toastCenterX = toastRect.left + toastRect.width / 2;
                const toastCenterY = toastRect.top + toastRect.height / 2;

                const targetCenterX = targetRect.left + targetRect.width / 2;
                const targetCenterY = targetRect.top + targetRect.height / 2;

                const deltaX = targetCenterX - toastCenterX;
                const deltaY = targetCenterY - toastCenterY;

                setSuctionStyle({
                    transform: `translate(calc(-50% + ${deltaX}px), ${deltaY}px) scale(0.02) rotate(12deg)`,
                    opacity: 0,
                    transition: 'transform 850ms cubic-bezier(0.4, 0, 0.2, 1), opacity 850ms ease-in',
                    pointerEvents: 'none'
                });
            } else {
                // Fallback exit if target trophy badge not found
                setSuctionStyle({
                    transform: 'translate(-50%, -20px) scale(0.8)',
                    opacity: 0,
                    transition: 'transform 500ms ease-in, opacity 500ms ease-in',
                    pointerEvents: 'none'
                });
            }
        }, 1550);

        // Unmount toast immediately after 850ms suction completes (1550ms + 850ms = 2400ms -> 2450ms)
        // so it never lingers or flashes back into view while trophy medal glow completes
        const closeTimer = setTimeout(() => {
            onCloseRef.current?.();
        }, 2450);

        return () => {
            clearTimeout(suctionTimer);
            clearTimeout(closeTimer);
        };
    }, [alert, targetTrophyId]);

    if (!alert) return null;

    const tierStr = (alert.tier || alert.unlockedTier || '').toUpperCase();
    const isPlatinum = tierStr.includes('PLATINUM') || tierStr.includes('CYAN') || tierStr.includes('DIAMOND');
    const isSilver = tierStr.includes('SILVER');
    const isBronze = tierStr.includes('BRONZE');

    const renderIcon = (iconType) => {
        const iconColor = isPlatinum ? 'text-cyan-400' 
            : isSilver ? 'text-slate-200' 
            : isBronze ? 'text-amber-500' 
            : 'text-amber-400';

        switch (iconType) {
            case 'Crown': return <Crown size={18} className={iconColor} />;
            case 'Zap': return <Zap size={18} className={isPlatinum ? 'text-cyan-400' : iconColor} />;
            case 'Shield': return <Shield size={18} className={iconColor} />;
            case 'Sparkles': return <Sparkles size={18} className={iconColor} />;
            default: return <Trophy size={18} className={iconColor} />;
        }
    };

    const defaultStyle = {
        transform: 'translate(-50%, 0) scale(1)',
        opacity: 1,
        transition: 'transform 300ms ease-out, opacity 300ms ease-out'
    };

    const borderCls = isPlatinum ? 'border-cyan-400/50 shadow-cyan-500/20'
        : isSilver ? 'border-slate-300/60 shadow-slate-400/20'
        : isBronze ? 'border-amber-700/60 shadow-amber-900/30'
        : 'border-amber-400/50 shadow-amber-500/20';

    const iconBoxCls = isPlatinum ? 'bg-cyan-500/15 border-cyan-400/40'
        : isSilver ? 'bg-slate-300/15 border-slate-300/40'
        : isBronze ? 'bg-amber-800/25 border-amber-700/50'
        : 'bg-amber-500/15 border-amber-400/40';

    const badgePillCls = isPlatinum ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40'
        : isSilver ? 'bg-slate-300/20 text-slate-100 border-slate-300/40'
        : isBronze ? 'bg-amber-800/30 text-amber-200 border-amber-700/50'
        : 'bg-amber-500/20 text-amber-200 border-amber-400/40';

    return (
        <div 
            ref={toastRef}
            style={suctionStyle || defaultStyle}
            className="fixed top-5 left-1/2 z-[9998] w-full max-w-md px-4 pointer-events-auto origin-center"
        >
            <div className={`flex items-center gap-3 p-3.5 bg-slate-950/95 backdrop-blur-md text-white border rounded-2xl shadow-2xl animate-fade-in-up ${borderCls}`}>
                {/* Glowing Icon Badge */}
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-inner ${iconBoxCls}`}>
                    {renderIcon(alert.icon)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgePillCls}`}>
                            {alert.badgeText || 'Accolade Milestone'}
                        </span>
                        {alert.tier && (
                            <span className="text-[10px] font-bold text-slate-300">
                                {alert.tier}
                            </span>
                        )}
                    </div>
                    <div className="text-xs font-bold text-white truncate mt-0.5">
                        {alert.title}
                    </div>
                    <div className="text-[11px] text-slate-300 truncate">
                        {alert.description}
                    </div>
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                >
                    <X size={15} />
                </button>
            </div>
        </div>
    );
};

export default TradeAccoladePromotionToast;
