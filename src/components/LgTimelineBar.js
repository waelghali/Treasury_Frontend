import React, { useState, useEffect, useMemo, useRef } from 'react';
import moment from 'moment';
import {
    Loader2,
    FileText,
    Eye,
    ArrowRight,
    Clock,
    AlertCircle,
    CalendarClock,
    TrendingDown,
    Repeat,
    X
} from 'lucide-react';
import { apiRequest } from '../services/apiService';
import {
    getEventIcon,
    formatActionTypeLabel,
    formatEventDetails
} from '../utils/timelineHelpers';

const MILESTONE_ACTION_TYPES = [
    'LG_CREATED',
    'MIGRATION_IMPORT_RECORD',
    'LG_EXTENDED',
    'LG_AMENDED',
    'AUDIT_ACTION_TYPE_LG_AMENDED',
    'LG_DECREASED_AMOUNT',
    'LG_RELEASED',
    'LG_LIQUIDATED_FULL',
    'LG_LIQUIDATED_PARTIAL',
    'LG_REMINDER_SENT_TO_BANK',
    'LG_ACTIVATE_NON_OPERATIVE',
    'LG_ACTIVATED'
];

const formatCurrencyValue = (amount, currencyCode) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return null;
    const formatted = num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return currencyCode ? `${currencyCode} ${formatted}` : formatted;
};

const getInstructionStatusBadge = (instruction) => {
    if (!instruction) return null;
    if (instruction.status === 'Canceled') {
        return {
            label: 'Canceled',
            className: 'bg-rose-50 text-rose-700 border-rose-200'
        };
    }
    if (!instruction.delivery_date) {
        return {
            label: 'Awaiting Bank Delivery',
            className: 'bg-amber-50 text-amber-800 border-amber-200'
        };
    }
    if (!instruction.bank_reply_date) {
        return {
            label: 'Awaiting Bank Reply',
            className: 'bg-blue-50 text-blue-700 border-blue-200'
        };
    }
    return {
        label: 'Confirmed by Bank',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
};

const LgTimelineBar = ({
    lgRecord,
    inFlightInstructions = [],
    onViewLetter = null,
    onViewDocument = null,
    onJumpToHistory = null,
}) => {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const [hoveredClusterId, setHoveredClusterId] = useState(null);
    const [pinnedClusterId, setPinnedClusterId] = useState(null);
    const [hoveredMarker, setHoveredMarker] = useState(null);
    const containerRef = useRef(null);

    const instructionsSignature = useMemo(
        () =>
            (lgRecord?.instructions || [])
                .map((i) => `${i.id}:${i.status}:${i.delivery_date || ''}:${i.bank_reply_date || ''}`)
                .join('|'),
        [lgRecord?.instructions]
    );

    useEffect(() => {
        const handleOutsideMouseDown = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setPinnedClusterId(null);
            }
        };
        document.addEventListener('mousedown', handleOutsideMouseDown);
        return () => document.removeEventListener('mousedown', handleOutsideMouseDown);
    }, []);

    useEffect(() => {
        if (!lgRecord?.id) return undefined;
        let isCancelled = false;

        const loadEvents = async () => {
            setIsLoading(true);
            setError(false);
            try {
                const history = await apiRequest(
                    `/end-user/lg-records/${lgRecord.id}/lifecycle-history`,
                    'GET'
                );
                if (isCancelled) return;
                const filtered = (Array.isArray(history) ? history : [])
                    .filter((ev) => MILESTONE_ACTION_TYPES.includes(ev.action_type))
                    .sort((a, b) => moment(a.timestamp).valueOf() - moment(b.timestamp).valueOf());
                setEvents(filtered);
            } catch (err) {
                console.error('Failed to fetch LG lifecycle history for timeline:', err);
                if (!isCancelled) {
                    setError(true);
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        loadEvents();
        return () => {
            isCancelled = true;
        };
    }, [lgRecord?.id, lgRecord?.expiry_date, lgRecord?.lg_status?.name, instructionsSignature]);

    const inFlightIdSet = useMemo(
        () => new Set((inFlightInstructions || []).map((inst) => Number(inst.id))),
        [inFlightInstructions]
    );

    const resolveInstructionForEvent = useMemo(() => {
        const instructions = lgRecord?.instructions || [];
        return (eventItem) => {
            if (!eventItem || instructions.length === 0) return null;
            if (eventItem.entity_type === 'LGInstruction' && eventItem.entity_id) {
                const byEntity = instructions.find(
                    (inst) => Number(inst.id) === Number(eventItem.entity_id)
                );
                if (byEntity) return byEntity;
            }
            const details = eventItem.details || {};
            const idFromDetails =
                details.generated_instruction_id ||
                details.instruction_id ||
                details.new_instruction_id ||
                details.target_instruction_id;
            if (idFromDetails) {
                const byDetailId = instructions.find(
                    (inst) => Number(inst.id) === Number(idFromDetails)
                );
                if (byDetailId) return byDetailId;
            }
            const serialFromDetails =
                details.instruction_serial ||
                details.serial_number ||
                details.instruction_serial_number;
            if (serialFromDetails) {
                const bySerial = instructions.find(
                    (inst) => inst.serial_number === serialFromDetails
                );
                if (bySerial) return bySerial;
            }
            return null;
        };
    }, [lgRecord?.instructions]);

    const timelineModel = useMemo(() => {
        const creationEvent = events.find(
            (e) => e.action_type === 'LG_CREATED' || e.action_type === 'MIGRATION_IMPORT_RECORD'
        );
        const startDate = lgRecord?.issuance_date
            ? moment(lgRecord.issuance_date).startOf('day')
            : creationEvent
                ? moment(creationEvent.timestamp).startOf('day')
                : moment().startOf('day');
        const expiryDate = lgRecord?.expiry_date
            ? moment(lgRecord.expiry_date).startOf('day')
            : moment().add(30, 'days').startOf('day');
        const today = moment().startOf('day');

        const totalDays = Math.max(1, expiryDate.diff(startDate, 'days'));
        const elapsedDays = Math.max(0, today.diff(startDate, 'days'));
        const remainingDays = expiryDate.diff(today, 'days');
        const statusName = lgRecord?.lg_status?.name || 'Unknown';
        const isLgValid = statusName === 'Valid';
        const todayPct =
            isLgValid && remainingDays > 0
                ? Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100))
                : 100;

        // Status pill & fill gradient styling
        let fillGradientClass = 'bg-gradient-to-r from-emerald-500 to-teal-500';
        let statusPillText = `${remainingDays} days remaining`;
        let statusPillClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        let statusDotClass = 'bg-emerald-500';

        if (!isLgValid) {
            if (statusName === 'Expired') {
                fillGradientClass = 'bg-gradient-to-r from-rose-500 to-red-600';
                statusPillText = 'Expired';
                statusPillClass = 'bg-rose-50 text-rose-700 border-rose-200';
                statusDotClass = 'bg-rose-500';
            } else if (statusName === 'Released') {
                fillGradientClass = 'bg-slate-400';
                statusPillText = 'Released';
                statusPillClass = 'bg-slate-100 text-slate-700 border-slate-200';
                statusDotClass = 'bg-slate-500';
            } else if (statusName === 'Liquidated') {
                fillGradientClass = 'bg-gradient-to-r from-purple-500 to-fuchsia-600';
                statusPillText = 'Liquidated';
                statusPillClass = 'bg-purple-50 text-purple-700 border-purple-200';
                statusDotClass = 'bg-purple-500';
            } else {
                fillGradientClass = 'bg-slate-400';
                statusPillText = statusName;
                statusPillClass = 'bg-slate-100 text-slate-700 border-slate-200';
                statusDotClass = 'bg-slate-500';
            }
        } else if (remainingDays <= 0) {
            fillGradientClass = 'bg-gradient-to-r from-rose-500 to-red-600';
            statusPillText = 'Expired';
            statusPillClass = 'bg-rose-50 text-rose-700 border-rose-200';
            statusDotClass = 'bg-rose-500';
        } else if (remainingDays <= 30) {
            fillGradientClass = 'bg-gradient-to-r from-rose-500 to-red-600';
            statusPillText = `${remainingDays} days remaining · Critical`;
            statusPillClass = 'bg-rose-50 text-rose-700 border-rose-200';
            statusDotClass = 'bg-rose-500';
        } else if (remainingDays <= 60) {
            fillGradientClass = 'bg-gradient-to-r from-amber-400 to-orange-500';
            statusPillText = `${remainingDays} days remaining · Renewal Window`;
            statusPillClass = 'bg-amber-50 text-amber-800 border-amber-200';
            statusDotClass = 'bg-amber-500';
        }

        // Pending extension projection
        const pendingExtension = (inFlightInstructions || []).find(
            (inst) =>
                (inst.instruction_type || '').includes('EXTENSION') &&
                inst.details?.old_expiry_date
        );
        let priorExpiryMoment = null;
        let priorExpiryPct = null;
        if (pendingExtension?.details?.old_expiry_date) {
            const parsedPrior = moment(pendingExtension.details.old_expiry_date).startOf('day');
            if (parsedPrior.isValid()) {
                priorExpiryMoment = parsedPrior;
                priorExpiryPct = Math.min(
                    98,
                    Math.max(2, (parsedPrior.diff(startDate, 'days') / totalDays) * 100)
                );
            }
        }

        // Historical extension rollovers & original expiry
        const extensionEvents = events.filter((e) => e.action_type === 'LG_EXTENDED');
        const extensionCount = extensionEvents.length;
        let originalExpiryMoment = null;
        let origExpiryPct = null;
        if (extensionEvents[0]?.details?.old_expiry_date) {
            const parsedOrig = moment(extensionEvents[0].details.old_expiry_date).startOf('day');
            if (parsedOrig.isValid()) {
                const candidatePct = (parsedOrig.diff(startDate, 'days') / totalDays) * 100;
                if (
                    candidatePct > 3 &&
                    candidatePct < 96 &&
                    (priorExpiryPct === null || Math.abs(candidatePct - priorExpiryPct) >= 2)
                ) {
                    originalExpiryMoment = parsedOrig;
                    origExpiryPct = candidatePct;
                }
            }
        }

        // Original amount reduction badge
        const reductionEvents = events.filter(
            (e) =>
                (e.action_type === 'LG_DECREASED_AMOUNT' ||
                    e.action_type === 'LG_LIQUIDATED_PARTIAL') &&
                e.details?.old_amount !== undefined &&
                e.details?.old_amount !== null &&
                !isNaN(parseFloat(e.details.old_amount))
        );
        let reducedFromLabel = null;
        if (reductionEvents.length > 0) {
            const earliestReduction = reductionEvents[0];
            const oldAmountNum = parseFloat(earliestReduction.details.old_amount);
            const currentAmountNum = parseFloat(lgRecord?.lg_amount || 0);
            if (oldAmountNum > currentAmountNum) {
                const currencyCode =
                    earliestReduction.details?.lg_currency ||
                    earliestReduction.details?.currency ||
                    lgRecord?.lg_currency?.iso_code ||
                    '';
                const formatted = formatCurrencyValue(oldAmountNum, currencyCode);
                if (formatted) {
                    reducedFromLabel = `Reduced from ${formatted}`;
                }
            }
        }

        // 60-day and 30-day decision zone on future side
        let notice60Moment = null;
        let notice60Pct = null;
        let notice30Pct = null;
        if (isLgValid && remainingDays > 60) {
            const m60 = expiryDate.clone().subtract(60, 'days');
            const m30 = expiryDate.clone().subtract(30, 'days');
            notice60Moment = m60;
            notice60Pct = Math.min(100, Math.max(0, (m60.diff(startDate, 'days') / totalDays) * 100));
            notice30Pct = Math.min(100, Math.max(0, (m30.diff(startDate, 'days') / totalDays) * 100));
        }
        const showNotice60Tick =
            notice60Pct !== null && notice60Pct > todayPct + 4 && notice60Pct < 96;

        // Position & cluster milestone events
        const positionedEvents = events.map((ev) => {
            const evMoment = moment(ev.timestamp).startOf('day');
            const rawPct = (evMoment.diff(startDate, 'days') / totalDays) * 100;
            const clampedPct = Math.min(98.5, Math.max(1.5, rawPct));
            return {
                event: ev,
                pct: clampedPct,
                instruction: resolveInstructionForEvent(ev),
            };
        });

        const clusters = [];
        positionedEvents.forEach((item) => {
            const lastCluster = clusters[clusters.length - 1];
            if (lastCluster && Math.abs(item.pct - lastCluster.anchorPct) <= 3.5) {
                lastCluster.items.push(item);
                const sum = lastCluster.items.reduce((acc, it) => acc + it.pct, 0);
                lastCluster.positionPct = Math.min(98.5, Math.max(1.5, sum / lastCluster.items.length));
            } else {
                clusters.push({
                    id: `cluster-${item.event.id || clusters.length}`,
                    anchorPct: item.pct,
                    positionPct: item.pct,
                    items: [item],
                });
            }
        });

        const hasNearbyClusterToToday = clusters.some(
            (cluster) => Math.abs(cluster.positionPct - todayPct) <= 3
        );

        return {
            startDate,
            expiryDate,
            today,
            totalDays,
            elapsedDays,
            remainingDays,
            isLgValid,
            todayPct,
            fillGradientClass,
            statusPillText,
            statusPillClass,
            statusDotClass,
            pendingExtension,
            priorExpiryMoment,
            priorExpiryPct,
            extensionCount,
            originalExpiryMoment,
            origExpiryPct,
            reducedFromLabel,
            notice60Moment,
            notice60Pct,
            notice30Pct,
            showNotice60Tick,
            clusters,
            hasNearbyClusterToToday,
        };
    }, [events, lgRecord, inFlightInstructions, resolveInstructionForEvent]);

    const {
        startDate,
        expiryDate,
        today,
        elapsedDays,
        remainingDays,
        isLgValid,
        todayPct,
        fillGradientClass,
        statusPillText,
        statusPillClass,
        statusDotClass,
        pendingExtension,
        priorExpiryMoment,
        priorExpiryPct,
        extensionCount,
        originalExpiryMoment,
        origExpiryPct,
        reducedFromLabel,
        notice60Moment,
        notice60Pct,
        notice30Pct,
        showNotice60Tick,
        clusters,
        hasNearbyClusterToToday,
    } = timelineModel;

    const pendingStartPct =
        priorExpiryPct !== null ? Math.max(todayPct, priorExpiryPct) : null;
    const pendingWidthPct =
        pendingStartPct !== null ? Math.max(0, 100 - pendingStartPct) : 0;

    return (
        <div ref={containerRef} className="relative">
            {/* Top Metadata Row */}
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">
                        Issued {startDate.format('DD-MMM-YYYY')}
                    </span>

                    {extensionCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                            <Repeat className="h-3 w-3" />
                            Extended {extensionCount}×
                        </span>
                    )}

                    {reducedFromLabel && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-semibold">
                            <TrendingDown className="h-3 w-3" />
                            {reducedFromLabel}
                        </span>
                    )}

                    {pendingExtension && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                            <Clock className="h-3 w-3 text-amber-600" />
                            Pending Extension
                        </span>
                    )}

                    {isLoading && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading milestones...
                        </span>
                    )}

                    {!isLoading && error && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="h-3 w-3 text-rose-600" />
                            Timeline events unavailable
                        </span>
                    )}
                </div>

                <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${statusPillClass}`}
                >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`} />
                    <span>{statusPillText}</span>
                </div>
            </div>

            {/* Unified Interactive Bar Track */}
            <div className="relative py-2.5 select-none">
                <div className="relative w-full h-4">
                    {/* Inner Clipped Bar */}
                    <div className="w-full h-full bg-slate-100 border border-slate-200/80 rounded-xl overflow-hidden relative">
                        {/* Future Decision Zones (60d amber / 30d rose) */}
                        {notice60Pct !== null && (
                            <div
                                className="absolute inset-y-0 bg-amber-100/70"
                                style={{
                                    left: `${notice60Pct}%`,
                                    width: `${Math.max(0, 100 - notice60Pct)}%`,
                                }}
                            />
                        )}
                        {notice30Pct !== null && (
                            <div
                                className="absolute inset-y-0 bg-rose-100/70"
                                style={{
                                    left: `${notice30Pct}%`,
                                    width: `${Math.max(0, 100 - notice30Pct)}%`,
                                }}
                            />
                        )}

                        {/* Elapsed Progress Fill */}
                        <div
                            className={`h-full rounded-xl ${fillGradientClass} transition-all duration-500 ease-out`}
                            style={{ width: `${todayPct}%` }}
                        />

                        {/* Pending Extension Striped Overlay */}
                        {pendingExtension && pendingWidthPct > 0 && (
                            <div
                                className="absolute inset-y-0 border-l-2 border-dashed border-blue-500"
                                style={{
                                    left: `${pendingStartPct}%`,
                                    width: `${pendingWidthPct}%`,
                                    backgroundImage:
                                        'repeating-linear-gradient(45deg, rgba(59,130,246,0.22), rgba(59,130,246,0.22) 6px, rgba(245,158,11,0.22) 6px, rgba(245,158,11,0.22) 12px)',
                                }}
                            />
                        )}
                    </div>

                    {/* Prior Expiry Tick (for In-Flight Extension) */}
                    {pendingExtension && priorExpiryPct !== null && priorExpiryMoment && (
                        <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 cursor-help"
                            style={{ left: `${priorExpiryPct}%` }}
                            onMouseEnter={() => setHoveredMarker('pendingExt')}
                            onMouseLeave={() => setHoveredMarker(null)}
                        >
                            <div className="w-0.5 h-5 bg-blue-600 rounded-full mx-auto" />
                            {hoveredMarker === 'pendingExt' && (
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-slate-900 text-white text-[11px] rounded-xl px-2.5 py-2 shadow-lg z-30 pointer-events-none">
                                    Prior Expiry: {priorExpiryMoment.format('DD-MMM-YYYY')} → Pending bank confirmation to {expiryDate.format('DD-MMM-YYYY')}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Original Expiry Tick (from historical rollovers) */}
                    {originalExpiryMoment && origExpiryPct !== null && (
                        <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 cursor-help"
                            style={{ left: `${origExpiryPct}%` }}
                            onMouseEnter={() => setHoveredMarker('origExpiry')}
                            onMouseLeave={() => setHoveredMarker(null)}
                        >
                            <div className="w-0.5 h-4 bg-slate-500/80 rounded-full mx-auto" />
                            {hoveredMarker === 'origExpiry' && (
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-[11px] rounded-xl px-2.5 py-1.5 shadow-lg z-30 pointer-events-none">
                                    Original Expiry: {originalExpiryMoment.format('DD-MMM-YYYY')}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 60-Day Renewal / Decision Cutoff Marker */}
                    {showNotice60Tick && notice60Moment && (
                        <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 cursor-help"
                            style={{ left: `${notice60Pct}%` }}
                            onMouseEnter={() => setHoveredMarker('notice')}
                            onMouseLeave={() => setHoveredMarker(null)}
                        >
                            <div className="w-2.5 h-2.5 rotate-45 bg-amber-400 border border-amber-700 shadow-sm" />
                            {hoveredMarker === 'notice' && (
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-slate-900 text-white text-[11px] rounded-xl px-2.5 py-2 shadow-lg z-30 pointer-events-none leading-relaxed">
                                    <p className="font-semibold text-amber-300 flex items-center gap-1">
                                        <CalendarClock className="h-3 w-3" />
                                        60-Day Decision Cutoff: {notice60Moment.format('DD-MMM-YYYY')}
                                    </p>
                                    <p className="mt-0.5 text-slate-200">
                                        {lgRecord?.auto_renewal
                                            ? 'Auto-Renewal is ON — decide before this date to release or stop automatic renewal.'
                                            : 'Auto-Renewal is OFF — decide before this date to extend or release.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Today Playhead Marker */}
                    {isLgValid && remainingDays > 0 && (
                        hasNearbyClusterToToday ? (
                            <div
                                className="absolute inset-y-0 -translate-x-1/2 z-10 pointer-events-none"
                                style={{ left: `${todayPct}%` }}
                            >
                                <div className="w-0.5 h-full bg-slate-800/80 mx-auto" />
                                <span className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-slate-800 text-white text-[9px] font-bold uppercase tracking-wider whitespace-nowrap shadow-sm">
                                    Today
                                </span>
                            </div>
                        ) : (
                            <div
                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 cursor-pointer"
                                style={{ left: `${todayPct}%` }}
                                onMouseEnter={() => setHoveredMarker('today')}
                                onMouseLeave={() => setHoveredMarker(null)}
                            >
                                <div className="relative flex items-center justify-center">
                                    {inFlightInstructions.length > 0 && (
                                        <span className="absolute w-6 h-6 rounded-full bg-amber-400/50 animate-ping" />
                                    )}
                                    <div className="w-4 h-4 rounded-full bg-white border-[3px] border-slate-800 shadow relative" />
                                </div>
                                {hoveredMarker === 'today' && (
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-[11px] rounded-xl px-2.5 py-1.5 shadow-lg z-30 pointer-events-none">
                                        Today · {today.format('DD-MMM-YYYY')} ({Math.round(todayPct)}% elapsed)
                                    </div>
                                )}
                            </div>
                        )
                    )}

                    {/* Clustered Milestone Pins */}
                    {clusters.map((cluster) => {
                        const primaryItem = cluster.items[cluster.items.length - 1];
                        const primaryEvent = primaryItem.event;
                        const isPinned = pinnedClusterId === cluster.id;
                        const isOpen = isPinned || hoveredClusterId === cluster.id;

                        const hasInFlight = cluster.items.some(
                            (it) =>
                                it.instruction &&
                                (inFlightIdSet.has(Number(it.instruction.id)) ||
                                    (it.instruction.status !== 'Canceled' &&
                                        it.instruction.status !== 'Confirmed by Bank' &&
                                        (!it.instruction.delivery_date || !it.instruction.bank_reply_date)))
                        );
                        const hasRiskEvent = cluster.items.some((it) =>
                            [
                                'LG_LIQUIDATED_FULL',
                                'LG_LIQUIDATED_PARTIAL',
                                'LG_REMINDER_SENT_TO_BANK',
                            ].includes(it.event.action_type)
                        );

                        const borderClass = hasInFlight
                            ? 'border-amber-500 ring-2 ring-amber-200/70'
                            : hasRiskEvent
                                ? 'border-rose-500'
                                : 'border-emerald-500';

                        const popoverAlignmentClass =
                            cluster.positionPct < 18
                                ? 'left-0'
                                : cluster.positionPct > 82
                                    ? 'right-0'
                                    : 'left-1/2 -translate-x-1/2';

                        return (
                            <div
                                key={cluster.id}
                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20"
                                style={{ left: `${cluster.positionPct}%` }}
                                onMouseEnter={() => setHoveredClusterId(cluster.id)}
                                onMouseLeave={() =>
                                    setHoveredClusterId((prev) =>
                                        prev === cluster.id ? null : prev
                                    )
                                }
                            >
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPinnedClusterId((prev) =>
                                            prev === cluster.id ? null : cluster.id
                                        );
                                    }}
                                    aria-label={formatActionTypeLabel(primaryEvent.action_type)}
                                    className={`relative w-6 h-6 rounded-full border-2 ${borderClass} bg-white shadow-sm flex items-center justify-center transition-transform duration-150 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-indigo-400`}
                                >
                                    {getEventIcon(primaryEvent.action_type, 13)}
                                    {cluster.items.length > 1 && (
                                        <span className="absolute -top-2 -right-2 bg-slate-800 text-white text-[10px] font-bold px-1 py-0.5 rounded-full leading-none shadow">
                                            ×{cluster.items.length}
                                        </span>
                                    )}
                                </button>

                                {/* Interactive Cluster Popover */}
                                {isOpen && (
                                    <div
                                        className={`absolute top-full pt-2 ${popoverAlignmentClass} z-30`}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 text-left">
                                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                    {cluster.items.length > 1
                                                        ? `${cluster.items.length} Lifecycle Milestones`
                                                        : 'Lifecycle Milestone'}
                                                </span>
                                                {isPinned && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setPinnedClusterId(null)}
                                                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                                                        aria-label="Close milestone popover"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-0.5">
                                                {cluster.items.map((item, idx) => {
                                                    const { event: ev, instruction } = item;
                                                    const detailText = formatEventDetails(
                                                        ev.action_type,
                                                        ev.details
                                                    );
                                                    const instStatus =
                                                        getInstructionStatusBadge(instruction);
                                                    const docId =
                                                        ev.details?.amendment_document_id ||
                                                        ev.details?.document_id;

                                                    return (
                                                        <div
                                                            key={ev.id || idx}
                                                            className={`${
                                                                idx > 0
                                                                    ? 'pt-2.5 border-t border-slate-100'
                                                                    : ''
                                                            } space-y-1.5`}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                    <span className="shrink-0">
                                                                        {getEventIcon(
                                                                            ev.action_type,
                                                                            14
                                                                        )}
                                                                    </span>
                                                                    <span className="text-xs font-bold text-slate-900 truncate">
                                                                        {formatActionTypeLabel(
                                                                            ev.action_type
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[11px] font-medium text-slate-500 shrink-0 tabular-nums">
                                                                    {moment(ev.timestamp).format(
                                                                        'DD-MMM-YYYY'
                                                                    )}
                                                                </span>
                                                            </div>

                                                            {detailText && (
                                                                <p className="text-[11px] text-slate-600 leading-snug">
                                                                    {detailText}
                                                                </p>
                                                            )}

                                                            {instStatus && (
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    {instruction?.serial_number && (
                                                                        <span className="text-[10px] font-mono font-semibold text-slate-500">
                                                                            {instruction.serial_number}
                                                                        </span>
                                                                    )}
                                                                    <span
                                                                        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${instStatus.className}`}
                                                                    >
                                                                        {instStatus.label}
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {(instruction?.id || docId || onJumpToHistory) && (
                                                                <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
                                                                    {instruction?.id && onViewLetter && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                onViewLetter(
                                                                                    instruction.id
                                                                                )
                                                                            }
                                                                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                                                                        >
                                                                            <FileText className="h-3 w-3" />
                                                                            View Letter
                                                                        </button>
                                                                    )}
                                                                    {docId && onViewDocument && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                onViewDocument(docId)
                                                                            }
                                                                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
                                                                        >
                                                                            <Eye className="h-3 w-3" />
                                                                            View Doc
                                                                        </button>
                                                                    )}
                                                                    {onJumpToHistory && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setPinnedClusterId(null);
                                                                                setHoveredClusterId(null);
                                                                                onJumpToHistory(
                                                                                    instruction?.id ||
                                                                                        null
                                                                                );
                                                                            }}
                                                                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
                                                                        >
                                                                            History
                                                                            <ArrowRight className="h-3 w-3" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Date Axis */}
            <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium tabular-nums">
                    {startDate.format('DD-MMM-YYYY')}
                </span>
                <span className="hidden sm:inline text-[11px] text-slate-400">
                    {isLgValid && remainingDays > 0
                        ? `${elapsedDays}d elapsed (${Math.round(todayPct)}%) · Click any milestone icon for details`
                        : 'Click any milestone icon for details'}
                </span>
                <span className="font-medium tabular-nums">
                    {pendingExtension ? 'Proposed Exp: ' : ''}
                    {expiryDate.format('DD-MMM-YYYY')}
                </span>
            </div>
        </div>
    );
};

export default LgTimelineBar;
