import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Trophy, Landmark, Clock, ArrowRight, AlertCircle, Mail, ExternalLink, FileText, MessageSquare, CheckCircle2, Check, Printer, Shield, X, Award, RefreshCw, Calendar, Info, XCircle, AlertTriangle, Undo2, Building, User, Users, UserCheck, Layers, Loader2, Lock } from 'lucide-react';
import apiClient from '../../../services/apiClient';
import { getCurrentUserId, getUserRole } from '../../../utils/authUtils';
import ReTenderModal from '../../../components/Modals/ReTenderModal';
import QuotationCancellationModal from '../../../components/Modals/QuotationCancellationModal';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatDate = (d) => {
    if (!d) return '—';
    try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return d;
        const day = String(date.getDate()).padStart(2, '0');
        const month = MONTHS[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    } catch {
        return d;
    }
};

const formatLocalDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatLocalTime = (d) => {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

const getDefaultScheduleTime = (targetRfq) => {
    const now = new Date();
    const qTimeRaw = targetRfq?.window_start || targetRfq?.window_end;
    let defaultDate = null;

    if (qTimeRaw) {
        const quotationTime = new Date(qTimeRaw);
        if (!isNaN(quotationTime.getTime())) {
            const oneHourBefore = new Date(quotationTime.getTime() - 60 * 60 * 1000);
            if (oneHourBefore.getTime() > now.getTime() + 2 * 60 * 1000) {
                defaultDate = oneHourBefore;
            } else {
                const soon = new Date(now.getTime() + 2 * 60 * 1000);
                if (targetRfq?.window_end) {
                    const wEnd = new Date(targetRfq.window_end);
                    if (!isNaN(wEnd.getTime()) && soon.getTime() >= wEnd.getTime()) {
                        defaultDate = new Date(Math.max(now.getTime() + 60 * 1000, wEnd.getTime() - 60 * 1000));
                    } else {
                        defaultDate = soon;
                    }
                } else {
                    defaultDate = soon;
                }
            }
        }
    }

    if (!defaultDate) {
        defaultDate = new Date(now.getTime() + 10 * 60 * 1000);
    }

    return {
        date: formatLocalDate(defaultDate),
        time: formatLocalTime(defaultDate)
    };
};

const formatAmount = (val) => {
    if (val === null || val === undefined || val === '') return '0.00';
    const num = Number(val);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const renderApprovalBadge = (result) => {
    if (!result || !result.approval_status) return null;

    const status = (result.approval_status || '').toUpperCase();
    if (status === 'PENDING') {
        return (
            <span 
                className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider"
                title="Awaiting internal bank approver authorization before quoting"
            >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Pending Bank Approval
            </span>
        );
    }
    if (status === 'APPROVED') {
        const approvedDetail = [
            result.approved_by_email ? `Approved by: ${result.approved_by_email}` : null,
            result.approved_at ? `At: ${new Date(result.approved_at).toLocaleString()}` : null,
            result.approval_notes ? `Notes: ${result.approval_notes}` : null
        ].filter(Boolean).join('\n');

        return (
            <span 
                className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider cursor-help"
                title={approvedDetail || 'Bank approver authorized participation'}
            >
                <CheckCircle2 size={11} className="text-emerald-600" />
                Bank Approved
            </span>
        );
    }
    if (status === 'DECLINED') {
        const declinedDetail = [
            result.approved_by_email ? `Declined by: ${result.approved_by_email}` : null,
            result.approved_at ? `At: ${new Date(result.approved_at).toLocaleString()}` : null,
            result.approval_notes ? `Reason: ${result.approval_notes}` : null
        ].filter(Boolean).join('\n');

        return (
            <span 
                className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full uppercase tracking-wider cursor-help"
                title={declinedDetail || 'Bank approver declined participation'}
            >
                <AlertCircle size={11} className="text-rose-600" />
                Bank Declined
            </span>
        );
    }
    if (status === 'EXPIRED') {
        return (
            <span 
                className="inline-flex items-center gap-1 text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-300 px-2 py-0.5 rounded-full uppercase tracking-wider cursor-help"
                title="Quotation window closed without approver response. Excluded from quoting."
            >
                <Clock size={11} className="text-gray-500" />
                Excluded — No Response
            </span>
        );
    }
    return null;
};

export default function ResultsView({ rfqId }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [results, setResults] = useState([]);
    const [rfq, setRfq] = useState(null);
    const [legs, setLegs] = useState([]);
    const [selectedLegIndex, setSelectedLegIndex] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [sendingResults, setSendingResults] = useState(false);
    const userRole = localStorage.getItem('user_role') || getUserRole();
    const isCorporateAdmin = location.pathname.startsWith('/corporate-admin') || decodeURIComponent(location.pathname).startsWith('/corporate admin') || (userRole || '').toLowerCase().includes('corporate_admin');

    const currentUserId = getCurrentUserId();
    const isMaker = Boolean(
        (rfq?.created_by_user_id && currentUserId && Number(currentUserId) === Number(rfq.created_by_user_id)) ||
        (!rfq?.created_by_user_id && !isCorporateAdmin)
    );
    const isDelegate = Boolean(rfq?.delegated_to_user_id && currentUserId && Number(currentUserId) === Number(rfq.delegated_to_user_id));
    const canAcceptOrDecline = isCorporateAdmin || isMaker || isDelegate;
    const canDelegate = isCorporateAdmin || isMaker;

    // Delegation state
    const [showDelegateModal, setShowDelegateModal] = useState(false);
    const [colleagues, setColleagues] = useState([]);
    const [selectedDelegateId, setSelectedDelegateId] = useState('');
    const [delegating, setDelegating] = useState(false);

    const handleOpenDelegateModal = async () => {
        try {
            const res = await apiClient.get('/end-user/quotations/delegation-colleagues');
            const list = res.data || [];
            setColleagues(list);
            if (list.length > 0) {
                setSelectedDelegateId(list[0].id);
            }
            setShowDelegateModal(true);
        } catch (err) {
            console.error('Fetch colleagues failed:', err);
            toast.error('Could not load colleagues for delegation.');
        }
    };

    const handleConfirmDelegation = async () => {
        if (!selectedDelegateId) {
            toast.warning('Please select a colleague to delegate to.');
            return;
        }
        try {
            setDelegating(true);
            const res = await apiClient.patch(`/end-user/quotations/${rfqId}/delegate`, {
                delegated_to_user_id: Number(selectedDelegateId)
            });
            toast.success(res.data.message || 'Deal acceptance delegated successfully.');
            setShowDelegateModal(false);
            fetchResults();
        } catch (err) {
            console.error('Delegation failed:', err);
            toast.error(err.response?.data?.detail || err.message || 'Failed to delegate deal acceptance.');
        } finally {
            setDelegating(false);
        }
    };

    const [resultsMeta, setResultsMeta] = useState({});
    const [showAuditPack, setShowAuditPack] = useState(false);
    const [showReTenderModal, setShowReTenderModal] = useState(false);
    const [showCancellationModal, setShowCancellationModal] = useState(false);
    const [copiedToken, setCopiedToken] = useState(null);
    const [isAcceptingDeal, setIsAcceptingDeal] = useState(false);
    const [isDecliningDeal, setIsDecliningDeal] = useState(false);
    const [selectedLegDecisions, setSelectedLegDecisions] = useState({});

    // Reset selection when switching RFQs
    useEffect(() => {
        setSelectedLegDecisions({});
    }, [rfqId]);

    // Ensure all winning legs default to selected when legs are loaded or updated
    useEffect(() => {
        if (legs && legs.length > 0) {
            setSelectedLegDecisions(prev => {
                const next = { ...prev };
                let changed = false;
                legs.forEach((l, idx) => {
                    const id = l.id !== undefined ? l.id : (l.leg_id !== undefined ? l.leg_id : idx);
                    const isWinning = Boolean(l.winner_bank_name && !l.is_inconclusive);
                    if (next[id] === undefined) {
                        next[id] = isWinning;
                        changed = true;
                    } else if (isWinning && prev[`_manual_${id}`] !== true && next[id] === false) {
                        next[id] = true;
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
        }
    }, [legs, rfqId]);

    const toggleLegSelection = (id) => {
        setSelectedLegDecisions(prev => ({
            ...prev,
            [id]: prev[id] === false ? true : false,
            [`_manual_${id}`]: true
        }));
    };

    const toggleAllLegsSelection = () => {
        const eligible = (legs || []).filter(l => Boolean(l.winner_bank_name && !l.is_inconclusive));
        const allSelected = eligible.every(l => {
            const id = l.id !== undefined ? l.id : (l.leg_id !== undefined ? l.leg_id : l);
            return selectedLegDecisions[id] !== false;
        });
        const next = {};
        (legs || []).forEach((l, idx) => {
            const id = l.id !== undefined ? l.id : (l.leg_id !== undefined ? l.leg_id : idx);
            const isWinning = Boolean(l.winner_bank_name && !l.is_inconclusive);
            next[id] = isWinning ? !allSelected : false;
            next[`_manual_${id}`] = true;
        });
        setSelectedLegDecisions(next);
    };

    // Inline Approval & Scheduling State (Corporate Admin)
    const [showApprovalPanel, setShowApprovalPanel] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [approvalReleaseMode, setApprovalReleaseMode] = useState('IMMEDIATE');
    const [approvalScheduledDate, setApprovalScheduledDate] = useState('');
    const [approvalScheduledTime, setApprovalScheduledTime] = useState('');
    const [approvalLegalAccepted, setApprovalLegalAccepted] = useState(false);

    const legBases = Array.from(new Set((legs || []).map(l => (l.quotation_base || rfq?.quotation_base || 'Execution')).concat((results || []).map(r => r.quotation_base).filter(Boolean))));
    const isMixedPackage = legBases.length > 1;

    const handleCopyBiddingLink = (token) => {
        const link = `${window.location.origin}/public-quotation/${token}`;
        navigator.clipboard.writeText(link);
        setCopiedToken(token);
        toast.success('Bidding link copied to clipboard!');
        setTimeout(() => setCopiedToken(null), 2000);
    };

    const isWindowClosed = Boolean(
        rfq && (
            ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(rfq.status) ||
            (rfq.window_end && new Date() > new Date(rfq.window_end))
        )
    );

    const isAutoRejected = rfq?.acceptance_status === 'AUTO_REJECTED';
    const isDeclined = rfq?.status === 'REJECTED' || rfq?.acceptance_status === 'REJECTED' || isAutoRejected;
    const isAccepted = Boolean(
        !isDeclined && (
            rfq?.acceptance_status === 'ACCEPTED' ||
            rfq?.acceptance_status === 'AUTO_ACCEPTED' ||
            (rfq?.status === 'COMPLETED' && !rfq?.acceptance_status)
        )
    );
    const isAwaitingAcceptance = Boolean(
        isWindowClosed &&
        !isDeclined &&
        !isAccepted &&
        (rfq?.acceptance_status === 'PENDING' || rfq?.status === 'EVALUATING' || (isWindowClosed && !rfq?.acceptance_status && rfq?.status !== 'COMPLETED'))
    );

    const [acceptanceSecondsRemaining, setAcceptanceSecondsRemaining] = useState(null);

    useEffect(() => {
        if (!isAwaitingAcceptance || !rfq?.acceptance_deadline) {
            setAcceptanceSecondsRemaining(null);
            return;
        }

        const updateTimer = () => {
            const now = new Date().getTime();
            const deadline = new Date(rfq.acceptance_deadline).getTime();
            const diff = Math.max(0, Math.floor((deadline - now) / 1000));
            setAcceptanceSecondsRemaining(diff);
        };

        updateTimer();
        const intervalId = setInterval(updateTimer, 1000);
        return () => clearInterval(intervalId);
    }, [isAwaitingAcceptance, rfq?.acceptance_deadline]);

    const fetchResults = async () => {
        if (!rfqId) return null;
        try {
            const res = await apiClient.get(`/end-user/quotations/${rfqId}/results`);
            // Axios auto-parses JSON into res.data
            setResults(res.data.results || []);
            setRfq(res.data.rfq);
            setLegs(res.data.legs || []);

            setResultsMeta({
                winnerBankId: res.data.winner_bank_id,
                isInconclusive: res.data.is_inconclusive,
                inconclusiveReason: res.data.inconclusive_reason,
                bestIndicativeRate: res.data.best_indicative_rate,
                bestExecutionRate: res.data.best_execution_rate,
                deviationPercent: res.data.deviation_percent,
                hasExecutionBanks: res.data.has_execution_banks,
                liveTelemetry: res.data.live_telemetry,
                savingsSummary: res.data.savings_summary
            });
            return res.data.rfq?.status;
        } catch (err) {
            console.error(err);
            return null;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let interval = null;
        let isMounted = true;

        const initFetch = async () => {
            const currentStatus = await fetchResults();
            if (!isMounted) return;

            if (currentStatus && ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(currentStatus)) {
                return; // Terminal state reached, do not poll
            }

            // High-efficiency 1.5s live polling during active bidding window
            interval = setInterval(async () => {
                if (typeof document !== 'undefined' && document.hidden) return; // Conserve resources when tab is unfocused
                const updatedStatus = await fetchResults();
                if (updatedStatus && ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(updatedStatus)) {
                    if (interval) clearInterval(interval);
                }
            }, 1500);
        };

        initFetch();

        return () => {
            isMounted = false;
            if (interval) clearInterval(interval);
        };
    }, [rfqId]);


    const handleResendInvite = async (qBankId, bankName) => {
        try {
            await apiClient.post(`/end-user/quotations/${rfqId}/resend-invite/${qBankId}`);
            alert(`Invitation email resent to ${bankName}!`);
        } catch (err) {
            console.error('Resend failed:', err);
            alert('Failed to resend invite: ' + (err.response?.data?.detail || err.message));
        }
    };

    if (loading) return <div className="p-8 text-center">Calculating results...</div>;



    const handleOpenApprovalPanel = () => {
        if (rfq?.window_end) {
            const closingTime = new Date(rfq.window_end);
            const now = new Date();
            const diffMins = Math.round((closingTime - now) / 60000);

            if (diffMins < 0) {
                toast.error("The window for this quotation has already closed. It cannot be approved.");
                return;
            }
        }
        const def = getDefaultScheduleTime(rfq);
        setApprovalScheduledDate(def.date);
        setApprovalScheduledTime(def.time);

        const bases = Array.from(new Set([
            ...((results || []).map(b => b.quotation_base).filter(Boolean)),
            ...((rfq?.assigned_banks || []).map(b => b.quotation_base).filter(Boolean)),
            ...((legs || []).map(l => l.quotation_base).filter(Boolean)),
            rfq?.quotation_base
        ].filter(Boolean)));
        const hasExecution = bases.some(b => b?.toLowerCase() === 'execution') || rfq?.quotation_base === 'Mixed' || (rfq?.quotation_base || '').toLowerCase() === 'execution';
        setApprovalLegalAccepted(!hasExecution);
        setShowApprovalPanel(true);
    };

    const executeApprove = async () => {
        let scheduledReleaseIso = null;
        if (approvalReleaseMode === 'SCHEDULED') {
            if (!approvalScheduledDate || !approvalScheduledTime) {
                toast.error("Please pick both a date and time for scheduled release.");
                return;
            }
            const combined = new Date(`${approvalScheduledDate}T${approvalScheduledTime}:00`);
            if (combined <= new Date()) {
                toast.error("Scheduled release time must be in the future.");
                return;
            }
            scheduledReleaseIso = combined.toISOString();
        }

        setIsApproving(true);
        try {
            const res = await apiClient.post(`/corporate-admin/quotations/${rfqId}/approve`, {
                legal_disclaimer_accepted: true,
                scheduled_release_at: scheduledReleaseIso
            });
            toast.success(res.data?.message || "Quotation approved and released successfully!");
            setShowApprovalPanel(false);
            fetchResults();
        } catch (err) {
            console.error('Approval failed:', err);
            toast.error("Failed to approve: " + (err.response?.data?.detail || err.message));
        } finally {
            setIsApproving(false);
        }
    };

    const executeReject = async () => {
        if (!window.confirm("Are you sure you want to reject this quotation request?")) return;
        try {
            await apiClient.post(`/corporate-admin/quotations/${rfqId}/reject`);
            toast.success("Quotation Request Rejected.");
            setShowApprovalPanel(false);
            fetchResults();
        } catch (err) {
            console.error('Rejection failed:', err);
            toast.error("Action failed: " + (err.response?.data?.detail || err.message));
        }
    };

    const handleAcceptDeal = async () => {
        const isMulti = legs && legs.length > 1;
        let acceptedIds = [];
        let declinedIds = [];

        if (isMulti) {
            legs.forEach((leg, idx) => {
                const legId = leg.id || leg.leg_id || idx;
                const isSelected = selectedLegDecisions[legId] !== false;
                const hasWinner = Boolean(leg.winner_bank_name && !leg.is_inconclusive);
                if (isSelected && hasWinner) {
                    acceptedIds.push(leg.id || leg.leg_id);
                } else {
                    declinedIds.push(leg.id || leg.leg_id);
                }
            });

            if (acceptedIds.length === 0) {
                if (!window.confirm("No currency pair legs are selected for execution. Declining all legs will mark the quotation as rejected. Proceed?")) return;
                return handleDeclineDeal();
            }

            const promptMsg = acceptedIds.length === legs.length
                ? `Accept all ${legs.length} currency pairs for RFQ ${rfq?.ref_no || rfqId}? This will confirm trade execution and dispatch confirmation emails.`
                : `Execute ${acceptedIds.length} of ${legs.length} legs (and decline the remaining ${declinedIds.length}) for RFQ ${rfq?.ref_no || rfqId}? Proceed with trade confirmation?`;

            if (!window.confirm(promptMsg)) return;
        } else {
            if (!window.confirm(`Accept winning deal for RFQ ${rfq?.ref_no || rfqId}? This will confirm trade execution and dispatch confirmation emails.`)) return;
        }

        try {
            setIsAcceptingDeal(true);
            const payload = isMulti ? { accepted_leg_ids: acceptedIds, declined_leg_ids: declinedIds } : {};
            const acceptUrl = isCorporateAdmin ? `/corporate-admin/quotations/${rfqId}/accept-deal` : `/end-user/quotations/${rfqId}/accept-deal`;
            const res = await apiClient.post(acceptUrl, payload);
            toast.success(res.data?.message || "Deal accepted! Trade execution confirmed.");
            fetchResults();
        } catch (err) {
            console.error("Failed to accept deal:", err);
            toast.error("Failed to accept deal: " + (err.response?.data?.detail || err.message));
        } finally {
            setIsAcceptingDeal(false);
        }
    };

    const handleDeclineDeal = async () => {
        const reason = window.prompt("Please enter the reason for declining this deal:", "Price exceeded internal budget / market volatility");
        if (reason === null) return;
        try {
            setIsDecliningDeal(true);
            const declineUrl = isCorporateAdmin ? `/corporate-admin/quotations/${rfqId}/decline-deal` : `/end-user/quotations/${rfqId}/decline-deal`;
            const res = await apiClient.post(declineUrl, { reason });
            toast.info(res.data?.message || "Deal declined.");
            fetchResults();
        } catch (err) {
            console.error("Failed to decline deal:", err);
            toast.error("Failed to decline deal: " + (err.response?.data?.detail || err.message));
        } finally {
            setIsDecliningDeal(false);
        }
    };

    const handleSendResults = async () => {
        if (!window.confirm("Are you sure you want to send winner and regret emails to all assigned Execution banks? This will use your configured email settings.")) return;

        try {
            setSendingResults(true);
            await apiClient.post(`/end-user/quotations/${rfqId}/send-results`);
            alert("Result emails have been sent successfully.");
        } catch (err) {
            console.error('Failed to send results:', err);
            alert('Failed to send emails: ' + (err.response?.data?.detail || err.message));
        } finally {
            setSendingResults(false);
        }
    };

    const renderFxCounterpartyCard = (result, index, legContext = null) => {
        const targetPair = legContext ? (legContext.currency_pair || `${legContext.buy_currency}/${legContext.sell_currency}`) : `${rfq?.buy_currency}/${rfq?.sell_currency}`;
        const targetAmount = legContext ? legContext.amount : rfq?.amount;
        const targetValueDate = legContext ? legContext.value_date : rfq?.value_date;
        const targetDirection = legContext ? legContext.direction : rfq?.direction;
        const isLegRejected = Boolean(legContext && (legContext.status === 'REJECTED' || legContext.status === 'DECLINED' || legContext.status === 'CANCELLED'));
        const isRfqRejected = Boolean(rfq && (rfq.status === 'REJECTED' || rfq.status === 'DECLINED' || rfq.status === 'CANCELLED'));
        const winnerId = (isLegRejected || (!legContext && isRfqRejected)) ? null : (legContext ? legContext.winner_bank_id : resultsMeta.winnerBankId);
        const isWinner = (!isLegRejected && !isRfqRejected) && Boolean(winnerId ? (result.bank_id === winnerId) : (!legContext && index === 0 && result.price && rfq?.status === 'ACCEPTED'));
        const effectiveValueDate = result.offered_value_date || result.assigned_value_date;
        const isDiffValueDate = Boolean(
            result.is_custom_value_date ||
            result.is_alternative_value_date ||
            (effectiveValueDate && targetValueDate && String(effectiveValueDate).split('T')[0] !== String(targetValueDate).split('T')[0])
        );

        return (
            <div
                key={result.bank_name || result.bank_id || index}
                className={`p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all duration-300 transform translate-x-0 opacity-100 ${
                    isWinner && result.price ? 'bg-emerald-50 border-emerald-200 ring-2 ring-emerald-500/20' : 'bg-white border-gray-100'
                }`}
            >
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                        isWinner && result.price ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                        {isWinner && result.price ? <Trophy size={20} /> : <Landmark size={20} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-lg">{result.bank_name}</h4>
                            {isWinner && (
                                <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded uppercase tracking-wider">Winner</span>
                            )}
                            {result.is_cross_entity && (
                                <span className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1" title="Group Counterparty Benchmark (Indicative Reference Only)">
                                    🌐 Group Benchmark
                                </span>
                            )}
                            {result.quotation_base && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${result.quotation_base === 'Execution' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'}`}>
                                    {result.quotation_base}
                                </span>
                            )}
                            {renderApprovalBadge(result)}
                            {effectiveValueDate && (
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                                    isDiffValueDate 
                                        ? 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-300/40' 
                                        : 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}>
                                    <Calendar size={11} className={isDiffValueDate ? 'text-amber-600' : 'text-slate-400'} />
                                    <span>Val: {formatDate(effectiveValueDate)}</span>
                                    {isDiffValueDate && (
                                        <span className="text-[9px] font-bold bg-amber-200 text-amber-900 px-1 py-0.2 rounded ml-0.5">
                                            Alt Date
                                        </span>
                                    )}
                                </span>
                            )}
                            {result.is_document_visible === false && (
                                <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded uppercase">Doc Hidden</span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {result.submitted_at ? (
                                <p className="text-xs text-gray-400">
                                    Submitted at {new Date(result.submitted_at).toLocaleTimeString()}
                                    {result.submitted_by_email && (
                                        <span className="ml-2 font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                            by {result.submitted_by_email}
                                        </span>
                                    )}
                                </p>
                            ) : isWindowClosed ? (
                                <p className="text-xs text-slate-400 font-medium">Window closed &bull; No quote submitted</p>
                            ) : (
                                <p className="text-xs text-amber-500 font-medium">No quote submitted</p>
                            )}
                            {result.token && (
                                <button
                                    onClick={() => handleCopyBiddingLink(result.token)}
                                    className={`text-[10px] flex items-center gap-1 font-medium transition-colors cursor-pointer ${
                                        copiedToken === result.token 
                                            ? 'text-emerald-700 font-bold' 
                                            : 'text-blue-600 hover:underline'
                                    }`}
                                    title={copiedToken === result.token ? "Copied!" : "Copy bidding link"}
                                >
                                    {copiedToken === result.token ? <Check size={10} className="text-emerald-700" /> : <ExternalLink size={10} />}
                                    {copiedToken === result.token ? 'Copied!' : 'Link'}
                                </button>
                            )}
                            {result.quotation_bank_id && (
                                <button
                                    onClick={() => handleResendInvite(result.quotation_bank_id, result.bank_name)}
                                    className="text-[10px] text-emerald-600 hover:underline flex items-center gap-1 font-medium"
                                    title="Resend invitation email to this bank"
                                >
                                    <Mail size={10} /> Resend Invite
                                </button>
                            )}
                        </div>
                        {result.approval_status === 'DECLINED' && result.approval_notes && (
                            <div className="mt-2 text-xs bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5 text-rose-800 flex items-start gap-2 max-w-lg">
                                <AlertCircle size={13} className="text-rose-500 shrink-0 mt-0.5" />
                                <span className="leading-snug"><strong className="text-rose-900 font-semibold">Approver Decline Reason:</strong> {result.approval_notes}</span>
                            </div>
                        )}
                        {result.notes && (
                            <div className="mt-2 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 flex items-start gap-2 max-w-lg">
                                <MessageSquare size={13} className="text-blue-500 shrink-0 mt-0.5" />
                                <span className="leading-snug"><strong className="text-slate-900 font-semibold">Trader Notes:</strong> {result.notes}</span>
                            </div>
                        )}
                        {/* Value Date & Settlement Policy Badge */}
                        {rfq?.type === 'FX_SPOT' && (
                            <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold ${
                                    isDiffValueDate 
                                        ? 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-300/40' 
                                        : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}>
                                    <Calendar size={12} className={isDiffValueDate ? 'text-amber-600' : 'text-slate-400'} />
                                    <span>
                                        Value Date: <strong>{formatDate(effectiveValueDate || targetValueDate)}</strong>
                                    </span>
                                    {isDiffValueDate && (
                                        <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded ml-1">
                                            Alt Date
                                        </span>
                                    )}
                                </span>
                                {result.allow_alternative_value_date ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                        Alternative Date Permitted
                                    </span>
                                ) : isDiffValueDate ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded">
                                        Custom Settlement Date
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 bg-gray-100 border border-gray-200/60 px-2 py-0.5 rounded">
                                        Fixed Settlement Date
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {result.price && result.finalPrice ? (
                    <div className="text-right flex flex-wrap items-center gap-4 sm:gap-6 w-full md:w-auto">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Bank Quote</label>
                            <p className="text-sm font-mono text-gray-500">{result.price.toFixed(5)}</p>
                        </div>
                        <ArrowRight className="text-gray-300 hidden sm:block" size={16} />
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">All-In Price</label>
                            <p className="text-sm font-mono font-semibold text-gray-700">{result.finalPrice.toFixed(5)}</p>
                        </div>
                        {result.is_alternative_value_date && result.normalized_price ? (
                            <>
                                <ArrowRight className="text-gray-300 hidden sm:block" size={16} />
                                <div>
                                    <div className="flex items-center justify-end gap-1 mb-1">
                                        <label className="block text-[10px] font-bold text-blue-600 uppercase">TVM Eval Price</label>
                                        <span className="text-[9px] font-mono font-bold bg-blue-100 text-blue-800 px-1 rounded">
                                            {result.time_value_adjustment >= 0 ? '+' : ''}{result.time_value_adjustment.toFixed(4)}
                                        </span>
                                    </div>
                                    <p className={`text-2xl font-bold font-mono ${isWinner ? 'text-emerald-600' : 'text-blue-950'}`}>
                                        {result.normalized_price.toFixed(5)}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <ArrowRight className="text-gray-300 hidden sm:block" size={16} />
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Adjusted Price</label>
                                    <p className={`text-2xl font-bold font-mono ${isWinner ? 'text-emerald-600' : 'text-gray-900'}`}>
                                        {result.finalPrice.toFixed(5)}
                                    </p>
                                </div>
                            </>
                        )}
                        <div className="pl-4 border-l border-gray-100">
                            <button
                                onClick={() => {
                                    const refNo = rfq?.ref_no || '';
                                    const executedValueDate = result.offered_value_date || result.assigned_value_date || targetValueDate;
                                    const subject = encodeURIComponent(isWinner
                                        ? `Deal Confirmation: RFQ ${refNo} - ${targetPair}`
                                        : `RFQ Result: RFQ ${refNo} - ${targetPair}`
                                    );

                                    const body = encodeURIComponent(isWinner
                                        ? `Dear ${result.bank_name} FX Desk,\n\nWe are pleased to confirm the execution of the following trade based on your winning quote:\n\nREFERENCE: ${refNo}\n- Pair: ${targetPair}\n- Direction: ${targetDirection || 'BUY'}\n- Amount: ${targetAmount}\n- Executed Rate: ${result.price.toFixed(5)}\n- Value Date: ${formatDate(executedValueDate)}\n\nPlease proceed with the standard settlement instructions.\n\nBest regards,\nTreasury Team`
                                        : `Dear ${result.bank_name} FX Desk,\n\nThank you for participating in our Request for Quotation (RFQ) for ${targetPair}.\n\nREFERENCE: ${refNo}\n\nWe are writing to inform you that your quote was not selected for this specific transaction as we have executed with another counterparty at a more competitive all-in rate.\n\nWe appreciate your participation and look forward to your quotes on future requests.\n\nBest regards,\nTreasury Team`
                                    );

                                    window.open(`mailto:${result.bank_emails}?subject=${subject}&body=${body}`, '_blank');
                                }}
                                title={isWinner ? "Draft Confirmation Email" : "Draft Regret Email"}
                                className={`p-3 rounded-xl transition-all flex items-center gap-2 ${isWinner
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                            >
                                <Mail size={18} />
                                <span className="text-xs font-bold sm:hidden">Email</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-right w-full md:w-auto">
                        {result.approval_status === 'DECLINED' ? (
                            <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg inline-block">
                                Declined by Bank
                            </span>
                        ) : result.approval_status === 'EXPIRED' ? (
                            <span className="text-xs font-bold text-gray-500 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg inline-block">
                                Approval Expired
                            </span>
                        ) : result.approval_status === 'PENDING' ? (
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg inline-block ${
                                isWindowClosed ? 'text-gray-500 bg-gray-100 border border-gray-200' : 'text-amber-600 bg-amber-50 border border-amber-200'
                            }`}>
                                {isWindowClosed ? 'Approval Expired' : 'Pending Bank Approval'}
                            </span>
                        ) : isWindowClosed ? (
                            <span className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg inline-block">
                                No Offer Received
                            </span>
                        ) : (
                            <span className="text-sm font-bold text-gray-400">Awaiting Submission</span>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 flex items-center gap-2 mb-1">
                        <Trophy size={14} /> Quotation Results
                    </h3>
                    {rfq && <p className="text-sm font-mono font-bold text-gray-600">{rfq.ref_no}</p>}
                </div>
                <div className="flex items-center gap-3 mt-2 sm:mt-0 flex-wrap">
                    {!isCorporateAdmin && rfq?.status === 'NEEDS_REVISION' && (
                        <button
                            onClick={() => navigate(`/end-user/quotations/active?revision_rfq_id=${rfq.id}`)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-200 cursor-pointer"
                            title="Open quotation in builder to revise parameters and resubmit"
                        >
                            <Undo2 size={13} /> Revise & Resubmit
                        </button>
                    )}
                    {isWindowClosed && !isCorporateAdmin && (
                        <button
                            onClick={() => navigate(`/end-user/quotations/active?retrade_rfq_id=${rfq.id}`)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 cursor-pointer"
                            title="Clone deal parameters into quotation builder with a fresh bidding window"
                        >
                            <RefreshCw size={13} /> ⚡ 1-Click Re-Tender
                        </button>
                    )}
                    {isWindowClosed && canAcceptOrDecline && !resultsMeta.isInconclusive && rfq?.status !== 'CANCELLED' && (
                        isDeclined ? (
                            <span className="px-3 py-1.5 bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs">
                                <XCircle size={14} /> {isAutoRejected ? 'Deal Auto-Rejected (Timeout)' : 'Deal Declined'}
                            </span>
                        ) : isAccepted ? (
                            <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs">
                                <CheckCircle2 size={14} className="text-emerald-600" /> {rfq?.acceptance_status === 'AUTO_ACCEPTED' ? 'Deal Auto-Accepted' : 'Deal Executed & Confirmed'}
                            </span>
                        ) : acceptanceSecondsRemaining !== null ? (
                            <span className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs" title={`Default action on timeout: ${rfq?.acceptance_timeout_action || 'AUTO_REJECT'}`}>
                                <Clock size={13} className="text-amber-600 animate-spin" /> Acceptance Window ({acceptanceSecondsRemaining}s left)
                            </span>
                        ) : null
                    )}
                    {canDelegate && !isAccepted && !isDeclined && rfq?.status !== 'CANCELLED' && (
                        <button
                            type="button"
                            onClick={handleOpenDelegateModal}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                            title="Authorize another corporate treasury colleague to review or accept/decline this quotation on your behalf"
                        >
                            <Users size={13} className="text-indigo-600" />
                            {rfq?.delegated_to_name ? `Delegated: ${rfq.delegated_to_name}` : 'Delegate Authority'}
                        </button>
                    )}
                    {isAccepted && !resultsMeta.isInconclusive && (
                        <button
                            onClick={handleSendResults}
                            disabled={sendingResults}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${sendingResults ? 'bg-gray-100 text-gray-400' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200'
                                }`}
                        >
                            <Mail size={14} /> {sendingResults ? 'Sending...' : 'Send Result Emails (Direct)'}
                        </button>
                    )}
                    {/* Cancellation & Withdrawal Controls */}
                    {rfq?.status === 'CANCEL_REQUESTED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold shadow-xs">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            Cancellation Pending Admin Approval
                        </span>
                    )}
                    {['PENDING', 'PENDING_APPROVAL', 'APPROVED_SCHEDULED'].includes(rfq?.status) && !isWindowClosed && (
                        (() => {
                            const isDirect = ['PENDING_APPROVAL', 'APPROVED_SCHEDULED'].includes(rfq?.status);
                            const windowStart = rfq?.window_start ? new Date(rfq.window_start).getTime() : null;
                            const isCutoffLocked = rfq?.status === 'PENDING' && windowStart && (windowStart - Date.now() < 15 * 60 * 1000);

                            if (isCutoffLocked) {
                                return (
                                    <button
                                        disabled
                                        className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 text-gray-400 border border-gray-200 rounded-xl text-xs font-bold cursor-not-allowed shadow-2xs"
                                        title="Cancellation locked: auctions scheduled to open within 15 minutes cannot be cancelled per treasury governance rules."
                                    >
                                        <Lock size={13} /> Cancellation Locked (&lt;15m)
                                    </button>
                                );
                            }

                            return (
                                <button
                                    onClick={() => setShowCancellationModal(true)}
                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                                    title={isDirect ? "Withdraw or cancel this quotation immediately" : "Request quotation cancellation (requires Corporate Admin review)"}
                                >
                                    <XCircle size={13} /> {
                                        rfq?.status === 'PENDING_APPROVAL'
                                            ? 'Cancel Draft'
                                            : rfq?.status === 'APPROVED_SCHEDULED'
                                            ? 'Cancel Scheduled RFQ'
                                            : 'Request Cancellation'
                                    }
                                </button>
                            );
                        })()
                    )}
                    {isWindowClosed ? (
                        <span className="text-xs font-medium text-gray-400 italic">Quotation concluded</span>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold shadow-xs">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span>Live Sync (1.5s)</span>
                            </span>
                            <button
                                onClick={() => fetchResults()}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                title="Force refresh live standings"
                            >
                                <RefreshCw size={13} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Corporate Admin Approval Required Banner (Promoted to the very top for instant visibility) */}
            {rfq?.status === 'PENDING_APPROVAL' && (
                <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 rounded-2xl border-2 border-amber-300 shadow-sm animate-fade-in-up">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                                <AlertCircle size={22} />
                            </div>
                            <div>
                                <h4 className="text-base font-bold text-amber-950 flex items-center gap-2">
                                    <span>Corporate Admin Approval Required</span>
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">Action Needed</span>
                                </h4>
                                <p className="text-xs text-amber-800 mt-1 max-w-2xl leading-relaxed">
                                    {isCorporateAdmin 
                                        ? 'This quotation request has been submitted and requires your authorization. Counterparties will only be notified once you approve and release this RFQ.'
                                        : 'This quotation request has been submitted and is currently awaiting Corporate Admin authorization before bank links are dispatched.'}
                                </p>
                            </div>
                        </div>
                        {isCorporateAdmin && !showApprovalPanel && (
                            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200">
                                <button
                                    onClick={executeReject}
                                    className="px-4 py-2 bg-white text-rose-700 border border-rose-300 font-bold rounded-xl hover:bg-rose-50 transition-all text-xs cursor-pointer shadow-2xs"
                                >
                                    Reject Request
                                </button>
                                <button
                                    onClick={handleOpenApprovalPanel}
                                    className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-md text-xs cursor-pointer flex items-center gap-1.5"
                                >
                                    <CheckCircle2 size={14} className="text-emerald-400" />
                                    <span>Approve & Release RFQ</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Inline Scheduling & Legal Acknowledgment Panel (Zero Modal-inside-Modal) */}
                    {isCorporateAdmin && showApprovalPanel && (
                        <div className="mt-4 pt-4 border-t border-amber-300/80 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            {/* Panel Header */}
                            <div className="flex items-center justify-between bg-amber-100/70 p-3 rounded-xl border border-amber-200">
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-amber-800 shrink-0" />
                                    <span className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                                        Release Dispatch & Compliance Authorization
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowApprovalPanel(false)}
                                    className="text-xs font-semibold text-amber-900 hover:text-black underline cursor-pointer"
                                >
                                    Collapse
                                </button>
                            </div>

                            {/* Release Timing Selector */}
                            <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-slate-800 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5 uppercase tracking-wider">
                                        <Clock size={14} className="text-blue-700" />
                                        Bank Email Dispatch Timing
                                    </label>
                                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                                        {approvalReleaseMode === 'IMMEDIATE' ? 'Immediate' : 'Delayed Scheduled'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setApprovalReleaseMode('IMMEDIATE')}
                                        className={`py-2 px-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                                            approvalReleaseMode === 'IMMEDIATE'
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        ⚡ Release Immediately
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setApprovalReleaseMode('SCHEDULED')}
                                        className={`py-2 px-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                                            approvalReleaseMode === 'SCHEDULED'
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        🕒 Schedule for Later
                                    </button>
                                </div>

                                {approvalReleaseMode === 'SCHEDULED' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 animate-in fade-in duration-200">
                                        <div>
                                            <label className="text-[11px] font-semibold text-slate-700 mb-1 block">
                                                Release Date <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={approvalScheduledDate}
                                                min={new Date().toISOString().split('T')[0]}
                                                onChange={e => setApprovalScheduledDate(e.target.value)}
                                                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-semibold text-slate-700 mb-1 block">
                                                Release Time (Cairo) <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="time"
                                                value={approvalScheduledTime}
                                                onChange={e => setApprovalScheduledTime(e.target.value)}
                                                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                                            />
                                        </div>
                                        <p className="text-[11px] text-blue-700 sm:col-span-2 italic leading-tight">
                                            * Emails and OTP links will be dispatched automatically to bank dealers at this time.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-white/80 rounded-xl border border-blue-100 text-[11px] text-slate-600 leading-relaxed">
                                        Approval will immediately broadcast quotation invitation emails to all {results.length || (rfq.assigned_banks?.length) || 'assigned'} counterparties.
                                    </div>
                                )}
                            </div>

                            {/* Legal Disclaimer & Liability Acknowledgment (Conditional: Mandatory for Execution/Mixed, Informational for Indicative) */}
                            {(() => {
                                const bases = Array.from(new Set([
                                    ...((results || []).map(b => b.quotation_base).filter(Boolean)),
                                    ...((rfq?.assigned_banks || []).map(b => b.quotation_base).filter(Boolean)),
                                    ...((legs || []).map(l => l.quotation_base).filter(Boolean)),
                                    rfq?.quotation_base
                                ].filter(Boolean)));
                                const hasExecution = bases.some(b => b?.toLowerCase() === 'execution') || rfq?.quotation_base === 'Mixed' || (rfq?.quotation_base || '').toLowerCase() === 'execution';
                                const isMixed = rfq?.quotation_base === 'Mixed' || bases.length > 1;
                                const isPureIndicative = !hasExecution && (rfq?.quotation_base || '').toLowerCase() === 'indicative';

                                if (isPureIndicative) {
                                    return (
                                        <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-indigo-950 text-xs leading-relaxed space-y-1.5 transition-all">
                                            <div className="flex items-start gap-2.5">
                                                <Info size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <span className="font-bold text-[11px] uppercase tracking-wider text-indigo-900 block">
                                                        Indicative Market Discovery Quotation
                                                    </span>
                                                    <p className="text-xs text-indigo-900/90 leading-relaxed mt-0.5">
                                                        This RFQ is requested for <strong>Indicative pricing discovery / market color only</strong>. Submitted bank quotes are non-binding and do not constitute a direct settlement obligation. Authorization will release this RFQ to the assigned counterparties for price indications without triggering binding execution acceptance.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/70 border border-amber-300 text-amber-950 text-xs leading-relaxed space-y-2 transition-all">
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                id="inlineAdminLegalConfirmed"
                                                checked={approvalLegalAccepted}
                                                onChange={e => setApprovalLegalAccepted(e.target.checked)}
                                                className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0"
                                            />
                                            <label htmlFor="inlineAdminLegalConfirmed" className="cursor-pointer select-none space-y-1">
                                                <span className="font-bold text-[11px] uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                                                    <Shield size={14} className="text-amber-700 shrink-0" />
                                                    MANDATORY COUNTERPARTY LIABILITY & EXECUTION ACKNOWLEDGMENT <span className="text-rose-600">*</span>
                                                </span>
                                                <p className="text-xs text-amber-950 leading-relaxed">
                                                    I confirm and authorize this {isMixed ? 'Mixed (Execution & Indicative)' : 'Firm Execution'} RFQ on behalf of <strong className="underline text-slate-900">{rfq?.entity_name ? (rfq?.entity_code ? `${rfq.entity_name} (${rfq.entity_code})` : rfq.entity_name) : 'our legal entity'}</strong>. I acknowledge that selecting invited bank counterparties is solely our responsibility and that any quote awarded on execution legs at window closure constitutes a direct, legally enforceable settlement obligation between our legal entity and the winning bank.
                                                </p>
                                            </label>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    disabled={isApproving}
                                    onClick={() => setShowApprovalPanel(false)}
                                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={(() => {
                                        const bases = Array.from(new Set([
                                            ...((results || []).map(b => b.quotation_base).filter(Boolean)),
                                            ...((rfq?.assigned_banks || []).map(b => b.quotation_base).filter(Boolean)),
                                            ...((legs || []).map(l => l.quotation_base).filter(Boolean)),
                                            rfq?.quotation_base
                                        ].filter(Boolean)));
                                        const hasExecution = bases.some(b => b?.toLowerCase() === 'execution') || rfq?.quotation_base === 'Mixed' || (rfq?.quotation_base || '').toLowerCase() === 'execution';
                                        const isPureIndicative = !hasExecution && (rfq?.quotation_base || '').toLowerCase() === 'indicative';
                                        return (!isPureIndicative && !approvalLegalAccepted) || isApproving;
                                    })()}
                                    onClick={executeApprove}
                                    className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer ${
                                        approvalReleaseMode === 'SCHEDULED' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                                    }`}
                                >
                                    {isApproving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                                    {isApproving ? 'Authorizing...' : (approvalReleaseMode === 'SCHEDULED' ? 'Confirm & Schedule Release' : 'Confirm & Release to Banks')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Post-Window Deal Decision Panel (Maker / Admin / Delegate) */}
            {isWindowClosed && canAcceptOrDecline && !resultsMeta.isInconclusive && rfq?.status !== 'CANCELLED' && rfq?.status !== 'PENDING_APPROVAL' && (
                <div className={`p-5 sm:p-6 rounded-2xl border transition-all animate-fade-in-up ${
                    isDeclined
                        ? 'bg-rose-50/90 border-rose-200 text-rose-950 shadow-sm'
                        : isAccepted
                        ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950 shadow-sm'
                        : 'bg-white border-amber-300 shadow-lg ring-1 ring-amber-400/30'
                }`}>
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                isDeclined
                                    ? 'bg-rose-100 text-rose-700'
                                    : isAccepted
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-800'
                            }`}>
                                {isDeclined ? <XCircle size={22} /> : isAccepted ? <CheckCircle2 size={22} /> : <Clock size={20} className="animate-spin text-amber-700" />}
                            </div>
                            <div>
                                <h4 className="text-base font-bold text-slate-900">
                                    {isAutoRejected
                                        ? 'Quotation Deal Auto-Rejected (Timeout)'
                                        : isDeclined
                                        ? 'Quotation Deal Declined'
                                        : isAccepted
                                        ? (rfq?.acceptance_status === 'AUTO_ACCEPTED' ? 'Quotation Deal Auto-Accepted & Executed' : 'Quotation Deal Accepted & Executed')
                                        : 'Deal Acceptance Required'}
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {isAutoRejected
                                        ? 'Corporate acceptance window expired without confirmation. Quotation was automatically rejected.'
                                        : isDeclined
                                        ? `Deal execution was declined by Corporate Treasury${rfq?.admin_revision_notes ? `: "${rfq.admin_revision_notes}"` : '.'} No binding contracts will be executed.`
                                        : isAccepted
                                        ? 'Winning quotes have been confirmed and officially executed. Trade confirmation emails dispatched to counterparties.'
                                        : 'Quotation window closed. Select winning currency pair legs to execute, or decline tender.'}
                                </p>
                            </div>
                        </div>

                        {isAwaitingAcceptance && acceptanceSecondsRemaining !== null && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold shrink-0 self-start sm:self-auto">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                {acceptanceSecondsRemaining}s remaining
                            </span>
                        )}
                    </div>

                    {/* Currency Pair Leg Selection (Multi-Leg) */}
                    {isAwaitingAcceptance && legs && legs.length > 1 && (
                        <div className="py-4 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold uppercase tracking-wider text-slate-700">
                                    Awarded Currency Pairs:
                                </span>
                                <div className="flex items-center gap-3">
                                    <span className="font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                                        {legs.filter(l => (selectedLegDecisions[l.id !== undefined ? l.id : (l.leg_id !== undefined ? l.leg_id : l)] !== false) && l.winner_bank_name && !l.is_inconclusive).length} of {legs.filter(l => Boolean(l.winner_bank_name && !l.is_inconclusive)).length} selected
                                    </span>
                                    <button
                                        type="button"
                                        onClick={toggleAllLegsSelection}
                                        className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                                    >
                                        {legs.filter(l => Boolean(l.winner_bank_name && !l.is_inconclusive)).every(l => selectedLegDecisions[l.id !== undefined ? l.id : (l.leg_id !== undefined ? l.leg_id : l)] !== false) ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {legs.map((leg, idx) => {
                                    const legId = leg.id !== undefined ? leg.id : (leg.leg_id !== undefined ? leg.leg_id : idx);
                                    const isChecked = selectedLegDecisions[legId] !== false;
                                    const pair = leg.currency_pair || `${leg.buy_currency}/${leg.sell_currency}`;
                                    const hasWinner = Boolean(leg.winner_bank_name && !leg.is_inconclusive);
                                    const isBuy = (leg.direction || 'BUY').toUpperCase() === 'BUY';

                                    return (
                                        <div
                                            key={legId}
                                            onClick={() => hasWinner && !isAcceptingDeal && !isDecliningDeal && toggleLegSelection(legId)}
                                            className={`p-4 rounded-xl border-2 transition-all ${
                                                !hasWinner
                                                    ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                                                    : isChecked
                                                    ? 'bg-white border-emerald-500 shadow-sm ring-1 ring-emerald-500/20 cursor-pointer'
                                                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 cursor-pointer'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5">
                                                    <input
                                                        type="checkbox"
                                                        disabled={!hasWinner || isAcceptingDeal || isDecliningDeal}
                                                        checked={isChecked && hasWinner}
                                                        onChange={() => toggleLegSelection(legId)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer h-4 w-4 shrink-0"
                                                    />
                                                    <span className={`uppercase text-[10px] font-black px-2 py-0.5 rounded ${
                                                        isBuy ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                                    }`}>
                                                        {leg.direction || 'BUY'}
                                                    </span>
                                                    <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                                                        {pair}
                                                    </span>
                                                </div>
                                                <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
                                                    {formatAmount(leg.amount)} {leg.buy_currency || ''}
                                                </span>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-slate-100 gap-2">
                                                {hasWinner ? (
                                                    <div className="flex items-center gap-1.5 text-slate-800 font-semibold truncate">
                                                        <Trophy size={14} className="text-amber-500 shrink-0" />
                                                        <span className="font-bold text-slate-900 truncate">{leg.winner_bank_name}</span>
                                                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0 ml-1">
                                                            @ {typeof leg.winner_rate === 'number' ? leg.winner_rate.toFixed(4) : leg.winner_rate}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic text-[11px]">
                                                        No winning quote / Inconclusive
                                                    </span>
                                                )}

                                                {hasWinner && !isChecked && (
                                                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
                                                        Excluded
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Action Bar */}
                    {isAwaitingAcceptance && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
                            <span className="text-xs text-slate-400">
                                {rfq?.acceptance_timeout_action ? `Timeout action: ${rfq.acceptance_timeout_action.replace('_', ' ')}` : 'Timeout action: Auto-Reject on expiration'}
                            </span>
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                <button
                                    type="button"
                                    onClick={handleDeclineDeal}
                                    disabled={isDecliningDeal || isAcceptingDeal}
                                    className="px-4 py-2.5 bg-white text-rose-700 hover:bg-rose-50 border border-rose-300 font-bold rounded-xl transition-all text-xs cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    <XCircle size={14} />
                                    <span>{isDecliningDeal ? 'Declining...' : 'Decline Tender'}</span>
                                </button>
                                {(() => {
                                    const eligibleCount = (legs || []).filter(l => Boolean(l.winner_bank_name && !l.is_inconclusive)).length;
                                    const selectedCount = (legs || []).filter(l => (selectedLegDecisions[l.id !== undefined ? l.id : (l.leg_id !== undefined ? l.leg_id : l)] !== false) && l.winner_bank_name && !l.is_inconclusive).length;
                                    const isZeroSelected = (legs && legs.length > 1) && selectedCount === 0;

                                    return (
                                        <button
                                            type="button"
                                            onClick={handleAcceptDeal}
                                            disabled={isDecliningDeal || isAcceptingDeal || isZeroSelected}
                                            className={`px-5 py-2.5 font-bold rounded-xl transition-all text-xs flex items-center gap-1.5 shadow-sm ${
                                                isZeroSelected
                                                    ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 cursor-pointer'
                                            }`}
                                        >
                                            <CheckCircle2 size={14} />
                                            <span>
                                                {isAcceptingDeal
                                                    ? 'Accepting...'
                                                    : isZeroSelected
                                                    ? 'Select at least 1 leg'
                                                    : (legs && legs.length > 1)
                                                    ? (selectedCount === eligibleCount ? 'Accept All Legs & Execute' : `Accept Selected (${selectedCount}/${eligibleCount}) & Execute`)
                                                    : 'Accept Deal & Execute'}
                                            </span>
                                        </button>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Cancellation Status Banners */}
            {rfq?.status === 'CANCEL_REQUESTED' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in shadow-xs">
                    <div className="flex items-start sm:items-center gap-3">
                        <AlertTriangle className="text-rose-600 shrink-0 mt-0.5 sm:mt-0" size={22} />
                        <div>
                            <h4 className="font-bold text-xs uppercase tracking-wide text-rose-800">Cancellation Request Pending Corporate Admin Review</h4>
                            <p className="text-xs text-rose-700 mt-0.5">
                                Reason: <span className="font-semibold">{rfq.cancellation_reason || 'Administrative Rescheduling'}</span>
                                {rfq.cancellation_notes ? ` — "${rfq.cancellation_notes}"` : ''}
                            </p>
                        </div>
                    </div>
                    <span className="text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 px-3 py-1 rounded-xl shrink-0">
                        Under Admin Review
                    </span>
                </div>
            )}

            {rfq?.status === 'CANCELLED' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-100 border border-slate-300 text-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
                    <div className="flex items-start sm:items-center gap-3">
                        <XCircle className="text-slate-500 shrink-0 mt-0.5 sm:mt-0" size={22} />
                        <div>
                            <h4 className="font-bold text-xs uppercase tracking-wide text-slate-700">Quotation Withdrawn &amp; Cancelled</h4>
                            <p className="text-xs text-slate-600 mt-0.5">
                                This quotation request was officially withdrawn. Counterparty submission links have been deactivated.
                            </p>
                        </div>
                    </div>
                    {!isCorporateAdmin && (
                        <button
                            onClick={() => navigate(`/end-user/quotations/active?retrade_rfq_id=${rfq.id}`)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 shrink-0 cursor-pointer"
                        >
                            <RefreshCw size={14} /> ⚡ Clone as New Quotation (Re-Trade)
                        </button>
                    )}
                </div>
            )}

            {resultsMeta.isInconclusive && (
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-start gap-4">
                        <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={24} />
                        <div>
                            <h4 className="font-bold text-sm uppercase tracking-wide">Quotation Closed Without Winner</h4>
                            <p className="text-xs mt-1 leading-relaxed text-amber-800">{resultsMeta.inconclusiveReason}</p>
                            {resultsMeta.bestIndicativeRate !== null && resultsMeta.bestExecutionRate !== null && (
                                <div className="flex items-center gap-6 mt-3 pt-3 border-t border-amber-200/60 text-xs font-mono">
                                    <div><span className="font-sans text-[10px] uppercase font-bold text-amber-600 block">Indicative Benchmark</span>{resultsMeta.bestIndicativeRate.toFixed(4)}</div>
                                    <div><span className="font-sans text-[10px] uppercase font-bold text-amber-600 block">Best Execution Quote</span>{resultsMeta.bestExecutionRate.toFixed(4)}</div>
                                    <div><span className="font-sans text-[10px] uppercase font-bold text-amber-600 block">Deviation</span>{resultsMeta.deviationPercent ? `${resultsMeta.deviationPercent.toFixed(2)}%` : 'N/A'}</div>
                                </div>
                            )}
                        </div>
                    </div>
                    {!isCorporateAdmin && (
                        <button
                            onClick={() => navigate(`/end-user/quotations/active?retrade_rfq_id=${rfq.id}`)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 shrink-0 cursor-pointer"
                        >
                            <RefreshCw size={14} /> ⚡ 1-Click Re-Tender
                        </button>
                    )}
                </div>
            )}

            {/* Needs Revision Attention Banner */}
            {rfq?.status === 'NEEDS_REVISION' && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3 animate-fade-in">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 text-amber-900 font-bold text-sm">
                            <AlertCircle className="text-amber-600 shrink-0" size={18} />
                            Action Required: This quotation request was returned for revision by Corporate Admin
                        </div>
                        {!isCorporateAdmin && (
                            <button
                                onClick={() => navigate(`/end-user/quotations/active?revision_rfq_id=${rfq.id}`)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
                            >
                                <Undo2 size={14} /> Open in Quotation Builder
                            </button>
                        )}
                    </div>
                    {rfq.admin_revision_notes && (
                        <div className="bg-white/90 rounded-2xl p-4 border border-amber-200 text-xs text-amber-950 italic">
                            <span className="font-bold text-amber-900 not-italic block mb-1 uppercase text-[10px]">Corporate Admin Feedback:</span>
                            "{rfq.admin_revision_notes}"
                        </div>
                    )}
                </div>
            )}

            {/* Phase 2: Live Trading Floor Telemetry Pulse */}
            {!isWindowClosed && resultsMeta.liveTelemetry && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-md border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center">
                            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative"></span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Live Trading Floor Telemetry</span>
                                <span className="text-[10px] text-slate-400 font-medium hidden md:inline">&bull; Real-time Blind Pulse</span>
                            </div>
                            <p className="text-sm font-bold text-slate-100 mt-0.5">
                                {resultsMeta.liveTelemetry.desks_active} of {resultsMeta.liveTelemetry.total_invited} Desks Active
                                <span className="mx-2 text-slate-500">•</span>
                                <span className="text-emerald-400">{resultsMeta.liveTelemetry.quotes_locked} Quote{resultsMeta.liveTelemetry.quotes_locked !== 1 ? 's' : ''} Locked In</span>
                                {resultsMeta.liveTelemetry.approvals_pending > 0 && (
                                    <span className="ml-2 text-amber-400 text-xs font-normal">
                                        ({resultsMeta.liveTelemetry.approvals_pending} Awaiting Approver Authorization)
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 self-end sm:self-center bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60" title="Blind bidding rules strictly protect bank pricing and identities until bidding window closes.">
                        <Shield size={13} className="text-emerald-400" />
                        <span>Blind Bidding Protected</span>
                    </div>
                </div>
            )}

            {!isWindowClosed && (
                <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-500">
                    <Info size={13} className="text-slate-400 shrink-0" />
                    <span>
                        <strong className="text-slate-700 font-semibold">Transmission & Telemetry Notice:</strong> Standings and trading floor signals update via continuous high-speed synchronization. Local connectivity or ISP latency across counterparties may introduce minor variance. The system accepts no liability for third-party transmission delays.
                    </span>
                </div>
            )}

            {/* Phase 2: Best Execution & Monetary Savings Hero Card */}
            {legs && legs.length > 1 ? (
                (() => {
                    const isLegValid = (l) => l.status !== 'REJECTED' && l.status !== 'DECLINED' && l.status !== 'CANCELLED';
                    const activeLegs = legs.filter(isLegValid);
                    const totalSavedVsAvg = activeLegs.reduce((acc, l) => acc + (l.saved_vs_avg || l.savings_summary?.saved_vs_avg || 0), 0);
                    const totalQuotesCount = legs.reduce((acc, l) => acc + (l.savings_summary?.total_quotes || (l.results || []).filter(r => r.price != null).length || 0), 0);
                    const awardedLegs = legs.filter(l => isLegValid(l) && l.winner_bank_name && !l.is_inconclusive);

                    if (awardedLegs.length === 0 && !resultsMeta.savingsSummary) return null;

                    return (
                        <div className={`p-6 rounded-3xl text-white shadow-xl border space-y-4 ${
                            isAccepted
                                ? 'bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950 border-emerald-500/30'
                                : 'bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 border-slate-700'
                        }`}>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                        isAccepted
                                            ? 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-300'
                                            : 'bg-slate-700/50 border border-slate-600 text-slate-300'
                                    }`}>
                                        <Trophy size={26} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                                                isAccepted
                                                    ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30'
                                                    : 'text-amber-400 bg-amber-500/20 border-amber-500/30'
                                            }`}>
                                                {isAccepted ? 'Certified Best Execution Portfolio' : 'Provisional Best Execution Standings'}
                                            </span>
                                            <span className="text-xs text-slate-300 font-mono">Multi-Currency Package ({legs.length} Legs)</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white mt-1">
                                            {isAccepted ? (
                                                awardedLegs.length === legs.length 
                                                    ? `All ${legs.length} Currency Pairs Successfully Awarded` 
                                                    : `${awardedLegs.length} of ${legs.length} Pairs Awarded`
                                            ) : (
                                                `Provisional Standings — Awaiting Acceptance (${awardedLegs.length} of ${legs.length} Pairs Quoted)`
                                            )}
                                        </h3>
                                    </div>
                                </div>
                                {isAccepted ? (
                                    <button
                                        onClick={() => setShowAuditPack(true)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white text-emerald-950 hover:bg-emerald-50 transition-all shadow-md active:scale-95 shrink-0"
                                    >
                                        <FileText size={14} className="text-emerald-700" /> Best Execution Audit Pack
                                    </button>
                                ) : (
                                    <span className="text-[11px] font-medium text-amber-200/90 bg-amber-950/40 border border-amber-600/30 px-3 py-1.5 rounded-xl shrink-0">
                                        🔒 Audit Pack unlocks after deal acceptance
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                                <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/20">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/80 block mb-1">
                                        Total Value Generated vs Avg
                                    </span>
                                    <p className="text-xl sm:text-2xl font-black font-mono text-emerald-300">
                                        EGP {totalSavedVsAvg?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <span className="text-[10px] text-emerald-200/60 mt-0.5 block">
                                        Combined savings across awarded currency pairs
                                    </span>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/20">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300/80 block mb-1">
                                        Winning Counterparties
                                    </span>
                                    <div className="space-y-1 mt-1">
                                        {legs.map((l, i) => (
                                            <div key={i} className="flex items-center justify-between text-xs font-mono">
                                                <span className="text-slate-300 font-bold">{l.currency_pair || `${l.buy_currency}/${l.sell_currency}`}:</span>
                                                <span className={`${l.status === 'REJECTED' || l.status === 'DECLINED' ? 'text-rose-300' : 'text-emerald-300'} font-semibold truncate ml-2`}>
                                                    {l.status === 'REJECTED' || l.status === 'DECLINED' 
                                                        ? 'Declined / Not Awarded' 
                                                        : (l.winner_bank_name ? `${l.winner_bank_name} @ ${l.winner_rate}` : 'Inconclusive')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/20">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300/80 block mb-1">
                                        Competitive Bids Evaluated
                                    </span>
                                    <p className="text-xl sm:text-2xl font-black font-mono text-white">
                                        {totalQuotesCount} Total Bids
                                    </p>
                                    <span className="text-[10px] text-slate-300/70 mt-0.5 block">
                                        Simultaneous competitive tender across {legs.length} currency pairs
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })()
            ) : (() => {
                const effectiveSavings = resultsMeta.savingsSummary || (legs && legs.length === 1 ? legs[0].savings_summary : null);
                if (!effectiveSavings || rfq?.status === 'REJECTED' || (legs && legs[0] && (legs[0].status === 'REJECTED' || legs[0].is_inconclusive))) return null;
                return (
                    <div className={`p-6 rounded-3xl text-white shadow-xl border space-y-4 ${
                        isAccepted
                            ? 'bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950 border-emerald-500/30'
                            : 'bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 border-slate-700'
                    }`}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                    isAccepted
                                        ? 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-300'
                                        : 'bg-slate-700/50 border border-slate-600 text-slate-300'
                                }`}>
                                    <Trophy size={26} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                                            isAccepted
                                                ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30'
                                                : 'text-amber-400 bg-amber-500/20 border-amber-500/30'
                                        }`}>
                                            {isAccepted ? 'Certified Best Execution' : 'Provisional Best Quote'}
                                        </span>
                                        <span className="text-xs text-slate-300 font-mono">Regulatory & Governance Standard</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mt-1">
                                        {isAccepted ? `Awarded to ${effectiveSavings.winner_bank_name} @ ${effectiveSavings.winner_rate}` : `Leading Quote: ${effectiveSavings.winner_bank_name} @ ${effectiveSavings.winner_rate} (Pending Acceptance)`}
                                    </h3>
                                </div>
                            </div>
                            {isAccepted ? (
                                <button
                                    onClick={() => setShowAuditPack(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white text-emerald-950 hover:bg-emerald-50 transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
                                >
                                    <FileText size={14} className="text-emerald-700" /> Best Execution Audit Pack
                                </button>
                            ) : (
                                <span className="text-[11px] font-medium text-amber-200/90 bg-amber-950/40 border border-amber-600/30 px-3 py-1.5 rounded-xl shrink-0">
                                    🔒 Audit Pack unlocks after deal acceptance
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                            <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/20">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/80 block mb-1">
                                    Net Value Generated vs Avg
                                </span>
                                <p className="text-xl sm:text-2xl font-black font-mono text-emerald-300">
                                    {effectiveSavings.currency} {effectiveSavings.saved_vs_avg?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <span className="text-[10px] text-emerald-200/60 mt-0.5 block">
                                    Benchmarked against average bid of {effectiveSavings.avg_rate}
                                </span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/20">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300/80 block mb-1">
                                    Max Protection vs Worst Quote
                                </span>
                                <p className="text-xl sm:text-2xl font-black font-mono text-teal-300">
                                    {effectiveSavings.currency} {effectiveSavings.saved_vs_worst?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <span className="text-[10px] text-teal-200/60 mt-0.5 block">
                                    Protected against worst quote of {effectiveSavings.worst_rate}
                                </span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/20">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300/80 block mb-1">
                                    Competitive Bids Evaluated
                                </span>
                                <p className="text-xl sm:text-2xl font-black font-mono text-white">
                                    {effectiveSavings.total_quotes} Bids Received
                                </p>
                                <span className="text-[10px] text-slate-300/70 mt-0.5 block">
                                    Simultaneous blind competitive tender
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {rfq && (
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5 mb-6">
                    {/* Header Row: Direction, Amount, Currency, Entity, and Value Date */}
                    {legs && legs.length > 1 ? (
                        <div className="space-y-4 pb-4 border-b border-slate-100">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Trade Specifications</span>
                                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
                                        <Layers size={13} className="text-indigo-600" />
                                        Multi-Currency Portfolio ({legs.length} Pairs)
                                    </span>
                                    {rfq.entity_name && (
                                        <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
                                            <Building size={13} className="text-slate-600" />
                                            {rfq.entity_name}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-slate-500 font-mono">
                                    Ref: <strong className="text-slate-800">{rfq.ref_no}</strong>
                                </div>
                            </div>

                            {/* Portfolio Legs Cards Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {legs.map((leg, lIdx) => {
                                    const pair = leg.currency_pair || `${leg.buy_currency}/${leg.sell_currency}`;
                                    const isBuy = (leg.direction || '').toUpperCase() === 'BUY';
                                    return (
                                        <div 
                                            key={leg.leg_id || lIdx}
                                            onClick={() => setSelectedLegIndex(lIdx)}
                                            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                                                selectedLegIndex === lIdx
                                                    ? 'bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-500/20'
                                                    : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/60'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    Leg #{lIdx + 1}
                                                </span>
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-2xs ${
                                                    isBuy ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                                                }`}>
                                                    {leg.direction || 'BUY'}
                                                </span>
                                            </div>
                                            <div className="flex items-baseline justify-between gap-2">
                                                <span className="text-lg font-black text-slate-900 font-mono">
                                                    {new Intl.NumberFormat().format(leg.amount || 0)}
                                                </span>
                                                <span className="text-sm font-bold text-slate-700">
                                                    {pair}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200/60">
                                                <span>Val: {formatDate(leg.value_date)}</span>
                                                {leg.winner_bank_name ? (
                                                    <span className="font-bold text-emerald-700 text-[11px] truncate ml-1">
                                                        🏆 {leg.winner_bank_name}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-[11px] italic">Competitive</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Trade Specifications</span>
                                    {rfq.entity_name && (
                                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
                                            <Building size={13} className="text-indigo-600" />
                                            {rfq.entity_name}
                                        </span>
                                    )}
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${
                                        isMixedPackage 
                                            ? 'bg-purple-100 text-purple-900 border-purple-300' 
                                            : ((rfq.quotation_base === 'Execution' || legBases[0] === 'Execution')
                                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                                : 'bg-slate-100 text-slate-700 border-slate-200')
                                    }`}>
                                        {isMixedPackage 
                                            ? `⚡📊 Mixed Package (${legBases.join(', ')})`
                                            : ((rfq.quotation_base === 'Execution' || legBases[0] === 'Execution')
                                                ? '⚡ Firm Execution'
                                                : '👁️ Indicative')}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3 pt-0.5">
                                    <span className={`inline-flex items-center justify-center font-black text-sm px-3.5 py-1 rounded-lg uppercase tracking-wider shadow-xs ${
                                        (rfq.direction || '').toUpperCase() === 'BUY'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-blue-600 text-white'
                                    }`}>
                                        {rfq.direction || 'BUY'}
                                    </span>
                                    <div className="flex items-baseline gap-2.5">
                                        <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                                            {rfq.type === 'TBILL'
                                                ? `T-Bill (${rfq.direction})`
                                                : new Intl.NumberFormat().format(rfq.amount || 0)}
                                        </span>
                                        {rfq.type !== 'TBILL' && (
                                            <span className="text-xl sm:text-2xl font-bold text-slate-700">
                                                {rfq.buy_currency}/{rfq.sell_currency}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Value Date Box */}
                            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 text-right flex flex-col items-start md:items-end justify-center min-w-[220px] shrink-0 shadow-2xs">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Calendar size={13} className="text-slate-600" /> Settlement (Value Date)
                                </span>
                                <span className="text-lg font-bold text-slate-900 font-sans mt-1">{formatDate(rfq.value_date)}</span>
                                {(() => {
                                    const hasCustomDates = (results || []).some(r => {
                                        const eff = r.offered_value_date || r.assigned_value_date;
                                        return r.is_custom_value_date || r.is_alternative_value_date || (eff && rfq?.value_date && String(eff).split('T')[0] !== String(rfq.value_date).split('T')[0]);
                                    });
                                    if (hasCustomDates) {
                                        return (
                                            <span className="inline-block text-[10px] font-bold mt-1 px-2 py-0.5 rounded border text-amber-800 bg-amber-50 border-amber-300">
                                                • Custom Dates Present
                                            </span>
                                        );
                                    }
                                    return null;
                                })()}
                                {rfq.type === 'FX_SPOT' && (
                                    <span className={`inline-block text-xs font-semibold mt-1.5 px-2.5 py-0.5 rounded-md border ${
                                        rfq.allow_alternative_value_date 
                                            ? 'text-blue-700 bg-blue-50 border-blue-200' 
                                            : 'text-slate-700 bg-white border-slate-200'
                                    }`}>
                                        {rfq.allow_alternative_value_date ? 'Alternative Date Permitted' : 'Fixed Date Only'}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Deal Parameters Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Requesting Entity</span>
                            <span className="text-sm font-bold text-slate-900 truncate block" title={rfq.entity_name || '—'}>
                                {rfq.entity_name || '—'}
                            </span>
                        </div>
                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Quotation Base</span>
                            <span className="text-sm font-bold text-slate-900 block">
                                {isMixedPackage ? (
                                    <span className="inline-flex items-center gap-1 text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded text-xs">
                                        ⚡📊 Mixed (Exec / Indic)
                                    </span>
                                ) : (rfq.quotation_base || 'Execution')}
                            </span>
                        </div>
                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Max Tolerance</span>
                            <span className="text-sm font-bold text-slate-900 font-mono block">
                                {rfq.max_tolerance_percent ? `${rfq.max_tolerance_percent}%` : 'None'}
                            </span>
                        </div>
                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                                {rfq.type === 'FX_SPOT' && rfq.allow_alternative_value_date 
                                    ? 'Valuation Eval Rate' 
                                    : (rfq.type === 'TBILL' && rfq.eval_rate ? 'Evaluation Rate' : 'Min Ticket Amount')}
                            </span>
                            <span className="text-sm font-bold text-slate-900 font-mono block">
                                {rfq.type === 'FX_SPOT' && rfq.allow_alternative_value_date 
                                    ? `${rfq.eval_rate ?? 19.75}% (CBE Mid + Margin)`
                                    : (rfq.type === 'TBILL' && rfq.eval_rate 
                                        ? `${rfq.eval_rate}%` 
                                        : (rfq.min_ticket_amount ? rfq.min_ticket_amount.toLocaleString() : 'N/A'))}
                            </span>
                        </div>
                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Creator</span>
                            <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5 truncate">
                                <User size={14} className="text-slate-500 shrink-0" />
                                <span className="truncate">{rfq.creator_name || 'End User'}</span>
                            </span>
                        </div>
                    </div>

                    {/* Quotation Window Details */}
                    <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <Clock size={16} className="text-blue-600" />
                                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">Quotation Window Timeline</span>
                            </div>
                            {(() => {
                                const now = new Date();
                                const start = rfq.window_start ? new Date(rfq.window_start) : null;
                                const end = rfq.window_end ? new Date(rfq.window_end) : null;
                                if (!start || !end) return null;
                                if (now < start) {
                                    return <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1 rounded-full uppercase tracking-wider"><span className="w-2 h-2 rounded-full bg-slate-400"></span>Scheduled</span>;
                                }
                                if (now >= start && now <= end) {
                                    return <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 px-3 py-1 rounded-full uppercase tracking-wider shadow-2xs"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>Live Bidding Open</span>;
                                }
                                const validityHrs = rfq.token_validity_hours || 24;
                                const linkExpiry = new Date(end.getTime() + validityHrs * 60 * 60 * 1000);
                                if (now > end && now <= linkExpiry) {
                                    return <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300 px-3 py-1 rounded-full uppercase tracking-wider"><span className="w-2 h-2 rounded-full bg-amber-500"></span>Bidding Closed — Link Active</span>;
                                }
                                return <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-rose-50 text-rose-600 border border-rose-300 px-3 py-1 rounded-full uppercase tracking-wider"><span className="w-2 h-2 rounded-full bg-rose-400"></span>Expired</span>;
                            })()}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Sent to Banks</span>
                                <span className="text-sm font-bold text-slate-900 block">{rfq.admin_reviewed_at ? formatDate(rfq.admin_reviewed_at) : formatDate(rfq.created_at)}</span>
                                <span className="text-xs font-medium text-slate-500 block mt-0.5">{new Date(rfq.admin_reviewed_at || rfq.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Window Opens</span>
                                <span className="text-sm font-bold text-slate-900 block">{rfq.window_start ? formatDate(rfq.window_start) : '—'}</span>
                                {rfq.window_start && <span className="text-xs font-medium text-slate-500 block mt-0.5">{new Date(rfq.window_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Window Closes</span>
                                <span className="text-sm font-bold text-slate-900 block">{rfq.window_end ? formatDate(rfq.window_end) : '—'}</span>
                                {rfq.window_end && <span className="text-xs font-medium text-slate-500 block mt-0.5">{new Date(rfq.window_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Window Duration</span>
                                <div>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-blue-50 text-blue-800 border border-blue-200">
                                        ⏱️ {(() => {
                                            if (!rfq.window_start || !rfq.window_end) return '—';
                                            const diffMs = new Date(rfq.window_end) - new Date(rfq.window_start);
                                            const totalMins = Math.round(diffMs / 60000);
                                            if (totalMins < 60) return `${totalMins} min`;
                                            const hrs = Math.floor(totalMins / 60);
                                            const mins = totalMins % 60;
                                            return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
                                        })()}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Link Expires</span>
                                {rfq.window_end ? (
                                    <>
                                        <span className="text-sm font-bold text-slate-900 block">{formatDate(new Date(new Date(rfq.window_end).getTime() + (rfq.token_validity_hours || 24) * 3600000))}</span>
                                        <span className="text-xs font-medium text-slate-500 block mt-0.5">{new Date(new Date(rfq.window_end).getTime() + (rfq.token_validity_hours || 24) * 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </>
                                ) : <span className="text-sm font-bold text-slate-900 block">—</span>}
                            </div>
                        </div>
                    </div>

                    {rfq.document_path && (
                        <div className="pt-3 border-t border-gray-100">
                            <span className="font-sans text-[10px] font-bold text-gray-400 uppercase block mb-2">Attached Documents</span>
                            <div className="flex flex-wrap gap-2">
                                {(() => {
                                    let docs = [];
                                    try {
                                        const parsed = JSON.parse(rfq.document_path);
                                        docs = Array.isArray(parsed) ? parsed : [{ name: 'Attached Document', path: rfq.document_path }];
                                    } catch {
                                        docs = rfq.document_path.split(',').map(p => ({ name: p.trim(), path: p.trim() }));
                                    }
                                    return docs.map((d, i) => (
                                        <a
                                            key={i}
                                            href={d.path?.startsWith('http') ? d.path : `http://localhost:8000${d.path?.startsWith('/') ? '' : '/'}${d.path}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs font-medium text-blue-600 hover:bg-gray-100"
                                        >
                                            <FileText size={14} className="text-gray-400" /> {d.name || `Document ${i+1}`}
                                        </a>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}

                    {rfq.internal_notes && (
                        <div className="pt-3 border-t border-gray-100">
                            <span className="font-sans text-[10px] font-bold text-blue-600 uppercase block mb-1.5 flex items-center gap-1.5">
                                <FileText size={12} className="text-blue-500" /> Internal Notes / Related Invoices & Payments
                            </span>
                            <div className="p-3 bg-gray-50 border border-gray-200/80 rounded-xl text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {rfq.internal_notes}
                            </div>
                        </div>
                    )}

                    {rfq.comments_to_banks && (
                        <div className="pt-3 border-t border-gray-100">
                            <span className="font-sans text-[10px] font-bold text-emerald-700 uppercase block mb-1.5 flex items-center gap-1.5">
                                <MessageSquare size={12} className="text-emerald-600" /> Special Instructions / Comments to Banks
                            </span>
                            <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs text-emerald-950 leading-relaxed whitespace-pre-wrap font-medium">
                                {rfq.comments_to_banks}
                            </div>
                        </div>
                    )}
                </div>
            )}



            {rfq?.status === 'REJECTED' && (
                <div className="p-5 mb-6 bg-red-50/90 rounded-2xl border border-red-200 flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                        <AlertCircle className="text-red-600" size={22} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-red-900">
                            {rfq?.acceptance_status === 'AUTO_REJECTED'
                                ? 'Quotation Request Auto-Rejected (Corporate Acceptance Window Expired)'
                                : 'Quotation Request Rejected by Corporate Admin'}
                        </h4>
                        <p className="text-xs text-red-700 mt-1 leading-relaxed">
                            {rfq?.admin_revision_notes || (rfq?.acceptance_status === 'AUTO_REJECTED'
                                ? 'The corporate acceptance window expired without confirmation. Submitted bank quotes are preserved below for historical audit and rate comparison.'
                                : 'This quotation request was rejected. Submitted bank quotes are preserved below for historical review.')}
                        </p>
                    </div>
                </div>
            )}

            {results.length === 0 ? (
                <div className="p-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-center">
                    <Clock className="mx-auto text-gray-300 mb-4" size={32} />
                    <p className="text-gray-500">No counterparties assigned to this quotation request.</p>
                </div>
            ) : rfq?.type === 'TBILL' ? (
                <div className="space-y-6">
                    {results.map((result, index) => (
                        <div
                            key={result.bank_name}
                            className={`p-6 rounded-3xl border transition-all duration-300 ${index === 0 && result.best_score ? 'bg-emerald-50 border-emerald-200 ring-2 ring-emerald-500/10' : 'bg-white border-gray-100 shadow-sm opacity-100'}`}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${index === 0 && result.best_score ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                        {index === 0 && result.best_score ? <Trophy size={18} /> : <Landmark size={20} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-bold text-lg">{result.bank_name}</h4>
                                            {index === 0 && result.best_score && <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded uppercase tracking-wider">Winner</span>}
                                            {result.is_cross_entity && (
                                                <span className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1" title="Group Counterparty Benchmark (Indicative Reference Only)">
                                                    🌐 Group Benchmark
                                                </span>
                                            )}
                                            {result.quotation_base && (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${result.quotation_base === 'Execution' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'}`}>
                                                    {result.quotation_base}
                                                </span>
                                            )}
                                            {renderApprovalBadge(result)}
                                            {(() => {
                                                const effDate = result.offered_value_date || result.assigned_value_date;
                                                const isDiff = Boolean(
                                                    result.is_custom_value_date ||
                                                    result.is_alternative_value_date ||
                                                    (effDate && rfq?.value_date && String(effDate).split('T')[0] !== String(rfq.value_date).split('T')[0])
                                                );
                                                if (!effDate) return null;
                                                return (
                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                                                        isDiff 
                                                            ? 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-300/40' 
                                                            : 'bg-slate-50 text-slate-600 border-slate-200'
                                                    }`}>
                                                        <Calendar size={11} className={isDiff ? 'text-amber-600' : 'text-slate-400'} />
                                                        <span>Val: {formatDate(effDate)}</span>
                                                        {isDiff && <span className="text-[9px] font-bold bg-amber-200 text-amber-900 px-1 rounded ml-0.5">Alt Date</span>}
                                                    </span>
                                                );
                                            })()}
                                            {result.is_document_visible === false && (
                                                <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded uppercase">Doc Hidden</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400">{result.bank_emails}</p>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-3">
                                    {result.best_score && (
                                        <div className="text-right mr-3">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Best Score</p>
                                            <p className="text-sm font-mono font-bold text-emerald-600">{result.best_score.toFixed(6)}</p>
                                        </div>
                                    )}
                                    {result.token && (
                                        <button
                                            onClick={() => handleCopyBiddingLink(result.token)}
                                            className={`text-[10px] font-bold px-3 py-1.5 rounded uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer ${
                                                copiedToken === result.token 
                                                    ? 'bg-emerald-600 text-white shadow-xs' 
                                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                            }`}
                                            title={copiedToken === result.token ? "Copied!" : "Copy secure bidding link for this bank"}
                                        >
                                            {copiedToken === result.token ? <Check size={12} /> : <ExternalLink size={12} />}
                                            {copiedToken === result.token ? 'Copied' : 'Bidding Link'}
                                        </button>
                                    )}
                                    {result.quotation_bank_id && (
                                        <button
                                            onClick={() => handleResendInvite(result.quotation_bank_id, result.bank_name)}
                                            className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded uppercase tracking-wider hover:bg-emerald-100 transition-colors flex items-center gap-1"
                                            title="Resend invitation email to this bank"
                                        >
                                            <Mail size={12} /> Resend Invite
                                        </button>
                                    )}
                                    <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded uppercase tracking-wider">
                                        {result.offers?.length || 0} Lines
                                    </span>
                                </div>
                            </div>

                            {result.approval_status === 'DECLINED' && result.approval_notes && (
                                <div className="mb-4 text-xs bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2 text-rose-800 flex items-start gap-2">
                                    <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                                    <span className="leading-snug"><strong className="text-rose-900 font-semibold">Approver Decline Reason:</strong> {result.approval_notes}</span>
                                </div>
                            )}

                            {result.notes && (
                                <div className="mb-4 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-700 flex items-start gap-2">
                                    <MessageSquare size={14} className="text-blue-500 shrink-0 mt-0.5" />
                                    <span className="leading-snug"><strong className="text-slate-900 font-semibold">Trader Notes:</strong> {result.notes}</span>
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="text-[10px] font-bold text-gray-400 uppercase border-b border-gray-50">
                                            <th className="pb-2">Settlement</th>
                                            <th className="pb-2">Maturity</th>
                                            <th className="pb-2">Discount Rate (%)</th>
                                            <th className="pb-2">Max Amount</th>
                                            <th className="pb-2 text-right">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {result.offers?.map((offer, i) => (
                                             <tr key={i} className="group hover:bg-gray-50/50">
                                                <td className="py-3 font-medium">{formatDate(offer.settlement_date)}</td>
                                                <td className="py-3 font-medium">{formatDate(offer.maturity_date)}</td>
                                                <td className="py-3 font-mono font-bold text-emerald-600">{offer.discount_rate.toFixed(4)}%</td>
                                                <td className="py-3 font-mono font-bold">{new Intl.NumberFormat().format(offer.max_amount)}</td>
                                                <td className="py-3 text-right text-xs text-gray-400">
                                                    {new Date(offer.submitted_at).toLocaleTimeString()}
                                                </td>
                                            </tr>
                                        ))}
                                        {(!result.offers || result.offers.length === 0) && (
                                            <tr>
                                                <td colSpan="5" className="py-8 text-center text-gray-400 italic">
                                                    {result.approval_status === 'DECLINED'
                                                        ? 'Participation declined by bank approver.'
                                                        : (result.approval_status === 'EXPIRED' || (isWindowClosed && result.approval_status === 'PENDING'))
                                                        ? 'Excluded: Bank approval window expired without response.'
                                                        : result.approval_status === 'PENDING'
                                                        ? 'Awaiting internal bank approver authorization before quoting.'
                                                        : isWindowClosed
                                                        ? 'Window closed without receiving any offers.'
                                                        : 'No offers submitted yet.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Leg Switcher Tab Bar for Multi-Leg RFQs */}
                    {legs && legs.length > 1 && (
                        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 overflow-x-auto">
                            <button
                                onClick={() => setSelectedLegIndex('ALL')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                                    selectedLegIndex === 'ALL'
                                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                }`}
                            >
                                <span>All Currency Pairs</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    selectedLegIndex === 'ALL' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
                                }`}>
                                    {legs.length}
                                </span>
                            </button>
                            {legs.map((leg, lIdx) => {
                                const isSelected = selectedLegIndex === lIdx;
                                const pair = leg.currency_pair || `${leg.buy_currency}/${leg.sell_currency}`;
                                return (
                                    <button
                                        key={leg.leg_id || lIdx}
                                        onClick={() => setSelectedLegIndex(lIdx)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                                            isSelected
                                                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                        }`}
                                    >
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                            (leg.direction || '').toUpperCase() === 'BUY' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {leg.direction || 'BUY'}
                                        </span>
                                        <span>{pair}</span>
                                        {leg.status === 'REJECTED' || leg.status === 'DECLINED' ? (
                                            <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                                                ❌ Declined
                                            </span>
                                        ) : leg.winner_bank_name && !leg.is_inconclusive && (
                                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                                🏆 {leg.winner_bank_name}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Multi-Leg Bidding Ladders */}
                    {legs && legs.length > 1 ? (
                        selectedLegIndex === 'ALL' ? (
                            <div className="space-y-8">
                                {legs.map((leg, lIdx) => {
                                    const legPair = leg.currency_pair || `${leg.buy_currency}/${leg.sell_currency}`;
                                    const legWinner = leg.winner_bank_name;
                                    const isBuy = (leg.direction || '').toUpperCase() === 'BUY';
                                    return (
                                        <div key={leg.leg_id || lIdx} className="bg-slate-50/70 rounded-3xl p-5 sm:p-6 border border-slate-200/80 space-y-4">
                                            {/* Leg Header Banner */}
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className="text-xs font-black uppercase tracking-wider text-slate-400 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                                        Leg #{lIdx + 1}
                                                    </span>
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                                                        isBuy ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                                                    }`}>
                                                        {leg.direction || 'BUY'}
                                                    </span>
                                                    <span className="text-xl font-black text-slate-900 font-mono">
                                                        {new Intl.NumberFormat().format(leg.amount || 0)}
                                                    </span>
                                                    <span className="text-base font-bold text-slate-700">
                                                        {legPair}
                                                    </span>
                                                    <span className="text-xs text-slate-500 font-medium">
                                                        &bull; Settlement: <strong>{formatDate(leg.value_date)}</strong>
                                                    </span>
                                                    <span className="text-[11px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded uppercase">
                                                        {leg.quotation_base || 'Execution'}
                                                    </span>
                                                </div>
                                                {leg.status === 'REJECTED' || leg.status === 'DECLINED' ? (
                                                    <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-2xs">
                                                        <span>❌ Declined by Treasury / Not Awarded</span>
                                                    </div>
                                                ) : legWinner && !leg.is_inconclusive && (
                                                    <div className="flex items-center gap-2 bg-emerald-100/90 border border-emerald-300 text-emerald-950 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-2xs">
                                                        <Trophy size={14} className="text-emerald-700" />
                                                        <span>Awarded to {legWinner} @ {leg.winner_rate}</span>
                                                        {leg.saved_vs_avg > 0 && (
                                                            <span className="text-emerald-800 font-mono text-[11px]">
                                                                (+{leg.saved_vs_avg.toLocaleString(undefined, { minimumFractionDigits: 2 })} {leg.savings_summary?.currency || 'EGP'})
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Counterparty Rows for this leg */}
                                            <div className="space-y-3">
                                                {(leg.results || []).map((res, rIdx) => renderFxCounterpartyCard(res, rIdx, leg))}
                                                {(!leg.results || leg.results.length === 0) && (
                                                    <div className="p-8 text-center text-slate-400 italic bg-white rounded-2xl border border-dashed border-slate-200">
                                                        No quotes submitted for this currency pair yet.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            (() => {
                                const currentLeg = legs[selectedLegIndex] || legs[0];
                                const legPair = currentLeg.currency_pair || `${currentLeg.buy_currency}/${currentLeg.sell_currency}`;
                                const isBuy = (currentLeg.direction || '').toUpperCase() === 'BUY';
                                return (
                                    <div className="bg-slate-50/70 rounded-3xl p-5 sm:p-6 border border-slate-200/80 space-y-4">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className="text-xs font-black uppercase tracking-wider text-slate-400 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                                    Leg #{Number(selectedLegIndex) + 1}
                                                </span>
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                                                    isBuy ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                                                }`}>
                                                    {currentLeg.direction || 'BUY'}
                                                </span>
                                                <span className="text-xl font-black text-slate-900 font-mono">
                                                    {new Intl.NumberFormat().format(currentLeg.amount || 0)}
                                                </span>
                                                <span className="text-base font-bold text-slate-700">
                                                    {legPair}
                                                </span>
                                                <span className="text-xs text-slate-500 font-medium">
                                                    &bull; Settlement: <strong>{formatDate(currentLeg.value_date)}</strong>
                                                </span>
                                                <span className="text-[11px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded uppercase">
                                                    {currentLeg.quotation_base || 'Execution'}
                                                </span>
                                            </div>
                                            {currentLeg.status === 'REJECTED' || currentLeg.status === 'DECLINED' ? (
                                                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-2xs">
                                                    <span>❌ Declined by Treasury / Not Awarded</span>
                                                </div>
                                            ) : currentLeg.winner_bank_name && !currentLeg.is_inconclusive && (
                                                <div className="flex items-center gap-2 bg-emerald-100/90 border border-emerald-300 text-emerald-950 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-2xs">
                                                    <Trophy size={14} className="text-emerald-700" />
                                                    <span>Awarded to {currentLeg.winner_bank_name} @ {currentLeg.winner_rate}</span>
                                                    {currentLeg.saved_vs_avg > 0 && (
                                                        <span className="text-emerald-800 font-mono text-[11px]">
                                                            (+{currentLeg.saved_vs_avg.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currentLeg.savings_summary?.currency || 'EGP'})
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            {(currentLeg.results || []).map((res, rIdx) => renderFxCounterpartyCard(res, rIdx, currentLeg))}
                                            {(!currentLeg.results || currentLeg.results.length === 0) && (
                                                <div className="p-8 text-center text-slate-400 italic bg-white rounded-2xl border border-dashed border-slate-200">
                                                    No quotes submitted for this currency pair yet.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()
                        )
                    ) : (
                        <div className="space-y-4">
                            {results.map((result, index) => renderFxCounterpartyCard(result, index))}
                        </div>
                    )}
                </div>
            )}

            {results.length > 0 && rfq?.type !== 'TBILL' && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                    <AlertCircle className="text-amber-500 mt-0.5 shrink-0" size={16} />
                    <p className="text-xs text-amber-700 leading-relaxed">
                        Final Adjusted Price includes the bank's quote plus the pre-configured additional costs (Min, %, Max, Flat).
                        The winner is selected based on the lowest Final Adjusted Price.
                    </p>
                </div>
            )}
            {results.length > 0 && rfq?.type === 'TBILL' && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
                    <AlertCircle className="text-blue-500 mt-0.5 shrink-0" size={16} />
                    <p className="text-xs text-blue-700 leading-relaxed">
                        T-Bill results are displayed as submitted. No automatic ranking or winner selection is applied in this phase.
                        Normalization using the Evaluation Interest Rate is for internal review only.
                    </p>
                </div>
            )}

            {/* Certified Best Execution Audit Pack Modal */}
            {showAuditPack && typeof document !== 'undefined' && createPortal(
                <div 
                    id="audit-certificate-portal"
                    className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
                    onClick={(e) => {
                        if (e.target.id === 'audit-certificate-portal') {
                            setShowAuditPack(false);
                        }
                    }}
                >
                    <div 
                        id="audit-certificate-card"
                        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-900"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Printable Certificate Scoped Stylesheet */}
                        <style>{`
                            @media print {
                                @page {
                                    size: A4 portrait;
                                    margin: 10mm 12mm;
                                }
                                html, body {
                                    background: #ffffff !important;
                                    margin: 0 !important;
                                    padding: 0 !important;
                                    width: 100% !important;
                                    height: auto !important;
                                    min-height: auto !important;
                                    overflow: visible !important;
                                }
                                body > *:not(#audit-certificate-portal) {
                                    display: none !important;
                                }
                                #audit-certificate-portal {
                                    display: block !important;
                                    position: static !important;
                                    width: 100% !important;
                                    height: auto !important;
                                    min-height: auto !important;
                                    margin: 0 !important;
                                    padding: 0 !important;
                                    background: transparent !important;
                                    overflow: visible !important;
                                }
                                #audit-certificate-card {
                                    display: block !important;
                                    position: static !important;
                                    width: 100% !important;
                                    max-width: 100% !important;
                                    height: auto !important;
                                    max-height: none !important;
                                    overflow: visible !important;
                                    border: none !important;
                                    box-shadow: none !important;
                                    border-radius: 0 !important;
                                    background: #ffffff !important;
                                    color: #0f172a !important;
                                    margin: 0 !important;
                                    padding: 0 !important;
                                }
                                .audit-print-header {
                                    display: flex !important;
                                    border-bottom: 2px solid #059669 !important;
                                    padding-bottom: 12px !important;
                                    margin-bottom: 16px !important;
                                    background: transparent !important;
                                    color: #0f172a !important;
                                }
                                .audit-screen-header {
                                    display: none !important;
                                }
                                .audit-modal-body {
                                    overflow: visible !important;
                                    max-height: none !important;
                                    height: auto !important;
                                    padding: 0 !important;
                                    display: block !important;
                                }
                                .no-print {
                                    display: none !important;
                                    visibility: hidden !important;
                                }
                                * {
                                    -webkit-print-color-adjust: exact !important;
                                    print-color-adjust: exact !important;
                                }
                                .avoid-break {
                                    break-inside: avoid !important;
                                    page-break-inside: avoid !important;
                                }
                                table {
                                    page-break-inside: auto !important;
                                    width: 100% !important;
                                    border-collapse: collapse !important;
                                }
                                tr {
                                    break-inside: avoid !important;
                                    page-break-inside: avoid !important;
                                    page-break-after: auto !important;
                                }
                                thead {
                                    display: table-header-group !important;
                                }
                            }
                        `}</style>

                        {/* Print-Only Executive Letterhead */}
                        <div className="audit-print-header hidden pb-4 mb-4 border-b-2 border-emerald-600 justify-between items-start">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-xl bg-emerald-50 border-2 border-emerald-600 flex items-center justify-center text-emerald-700">
                                    <Shield size={26} />
                                </div>
                                <div>
                                    <div className="text-[10px] font-extrabold tracking-widest text-emerald-700 uppercase">
                                        Corporate Treasury &bull; Best Execution Certificate
                                    </div>
                                    <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                                        Competitive Tender Audit Record
                                    </h1>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Official institutional verification of blind competitive bidding, quote ranking, and value delivery
                                    </p>
                                </div>
                            </div>
                            <div className="text-right font-mono text-[10px] border border-slate-200 rounded-xl p-2.5 bg-slate-50 min-w-[200px]">
                                <div className="font-bold text-slate-900 text-xs">RFQ #{rfq?.ref_no}</div>
                                <div className="text-slate-500 mt-0.5">
                                    {new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="text-emerald-700 font-bold mt-1 inline-block px-1.5 py-0.5 bg-emerald-100 rounded text-[9px]">
                                    STATUS: EXECUTED & AUDITED
                                </div>
                            </div>
                        </div>

                        {/* Modal Screen Header */}
                        <div className="audit-screen-header p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                                    <Shield size={22} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white tracking-wide">
                                        Best Execution Audit Certificate
                                    </h3>
                                    <p className="text-xs text-slate-400 font-mono">
                                        RFQ #{rfq?.ref_no} &bull; Generated {new Date().toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 no-print">
                                <button
                                    onClick={() => window.print()}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                                    title="Print or Save as PDF"
                                >
                                    <Printer size={14} /> Print / Export PDF
                                </button>
                                <button
                                    onClick={() => setShowAuditPack(false)}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
                                    title="Close Certificate"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Printable Certificate Body */}
                        <div className="audit-modal-body p-6 sm:p-8 overflow-y-auto space-y-6 text-sm">
                            {/* Executive Summary */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs avoid-break">
                                <div>
                                    <span className="font-sans text-[10px] font-bold text-slate-400 uppercase block mb-1">Trade Instrument</span>
                                    <span className="font-bold text-slate-900 block leading-snug">
                                        {rfq?.type === 'TBILL' 
                                            ? 'T-Bill Auction' 
                                            : (legs && legs.length > 1 
                                                ? `FX Portfolio (${legs.length} Pairs)` 
                                                : `FX Spot (${rfq?.buy_currency}/${rfq?.sell_currency})`)}
                                    </span>
                                </div>
                                <div>
                                    <span className="font-sans text-[10px] font-bold text-slate-400 uppercase block mb-1">Trade Volume</span>
                                    {legs && legs.length > 1 ? (
                                        <div className="flex flex-col gap-0.5 font-bold text-slate-900 leading-snug">
                                            {legs.map((l, idx) => (
                                                <div key={idx} className="whitespace-nowrap">
                                                    <span className="text-[10px] text-slate-400 font-sans font-semibold mr-1">L{idx + 1}:</span>
                                                    <span>{formatAmount(l.amount)} {l.buy_currency}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="font-bold text-slate-900 block leading-snug">
                                            {formatAmount(rfq?.amount)} {rfq?.buy_currency}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <span className="font-sans text-[10px] font-bold text-slate-400 uppercase block mb-1">Value Date</span>
                                    {legs && legs.length > 1 ? (
                                        <div className="flex flex-col gap-0.5 font-bold text-slate-900 leading-snug">
                                            {legs.map((l, idx) => (
                                                <div key={idx} className="whitespace-nowrap">
                                                    <span className="text-[10px] text-slate-400 font-sans font-semibold mr-1">L{idx + 1}:</span>
                                                    <span>{formatDate(l.value_date)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="font-bold text-slate-900 block leading-snug">
                                            {formatDate(rfq?.value_date)}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <span className="font-sans text-[10px] font-bold text-slate-400 uppercase block mb-1">Tender Mechanism</span>
                                    <span className="font-bold text-emerald-700 block leading-snug">Blind Simultaneous Tender</span>
                                </div>
                            </div>

                            {/* Savings Certification Block */}
                            {legs && legs.length > 1 ? (
                                (() => {
                                    const totalSavedVsAvg = legs.reduce((acc, l) => acc + (l.saved_vs_avg || l.savings_summary?.saved_vs_avg || 0), 0);
                                    return (
                                        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 avoid-break">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Award size={18} className="text-emerald-700" />
                                                <h4 className="font-bold text-emerald-900 text-sm">Audit Findings & Quantified Portfolio Value Delivery</h4>
                                            </div>
                                            <p className="text-xs text-emerald-800 leading-relaxed mb-3">
                                                Portfolio executed across {legs.length} currency pairs via competitive blind tender. Net quantified savings of <strong className="font-mono font-semibold">EGP {totalSavedVsAvg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> achieved across all evaluated legs relative to average market bids.
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                                                {legs.map((l, idx) => {
                                                    const pair = l.currency_pair || `${l.buy_currency}/${l.sell_currency}`;
                                                    const isWin = Boolean(l.winner_bank_name);
                                                    const isPending = l.status === 'PENDING_APPROVAL';
                                                    return (
                                                        <div key={idx} className="bg-white/80 p-2.5 rounded-xl border border-emerald-200/60 flex items-center justify-between gap-2">
                                                            <span className="font-bold text-slate-700">{pair} ({formatAmount(l.amount)} {l.buy_currency}):</span>
                                                            <strong className="text-emerald-950 text-right">
                                                                {isWin 
                                                                    ? `${l.winner_bank_name} @ ${typeof l.winner_rate === 'number' ? l.winner_rate.toFixed(4) : l.winner_rate}` 
                                                                    : isPending 
                                                                        ? 'Pending Corporate Approval' 
                                                                        : 'Inconclusive / No Quote'}
                                                            </strong>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()
                            ) : resultsMeta.savingsSummary ? (
                                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 avoid-break">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Award size={18} className="text-emerald-700" />
                                        <h4 className="font-bold text-emerald-900 text-sm">Audit Findings & Quantified Value Delivery</h4>
                                    </div>
                                    <p className="text-xs text-emerald-800 leading-relaxed">
                                        Awarded counterparty <strong className="font-semibold text-emerald-950">{resultsMeta.savingsSummary.winner_bank_name}</strong> submitted the optimal rate of <strong className="font-mono font-semibold">{resultsMeta.savingsSummary.winner_rate}</strong>. 
                                        Execution achieved a net verified savings of <strong className="font-mono font-semibold">{resultsMeta.savingsSummary.currency} {resultsMeta.savingsSummary.saved_vs_avg?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> compared to the mean quote of <strong className="font-mono">{resultsMeta.savingsSummary.avg_rate}</strong> across {resultsMeta.savingsSummary.total_quotes} participating banking desks.
                                    </p>
                                </div>
                            ) : null}

                            {/* Audit Trail Table */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Counterparty Submission Audit Log</h4>
                                {legs && legs.length > 1 ? (
                                    <div className="space-y-4">
                                        {legs.map((leg, lIdx) => {
                                            const legPair = leg.currency_pair || `${leg.buy_currency}/${leg.sell_currency}`;
                                            const legWinnerBankId = leg.winner_bank_id;
                                            return (
                                                <div key={leg.leg_id || lIdx} className="border border-slate-200 rounded-2xl overflow-hidden avoid-break mb-4">
                                                    <div className="bg-slate-100 px-3.5 py-2.5 font-bold text-xs text-slate-800 border-b border-slate-200 flex items-center justify-between">
                                                        <span>Leg #{lIdx + 1}: {legPair} &bull; {formatAmount(leg.amount)} {leg.buy_currency}</span>
                                                        <span className="text-[10px] text-slate-500 font-mono">Val: {formatDate(leg.value_date)}</span>
                                                    </div>
                                                    <table className="w-full text-left text-xs">
                                                        <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-500">
                                                            <tr>
                                                                <th className="py-2.5 px-3">Rank / Counterparty</th>
                                                                <th className="py-2.5 px-3">Type</th>
                                                                <th className="py-2.5 px-3 font-mono">Bank Quote</th>
                                                                <th className="py-2.5 px-3 font-mono">Final Price</th>
                                                                <th className="py-2.5 px-3">Submission Timestamp</th>
                                                                <th className="py-2.5 px-3 text-right">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {(leg.results || []).map((res, idx) => {
                                                                const isWin = Boolean(legWinnerBankId && res.bank_id === legWinnerBankId && !leg.is_inconclusive);
                                                                const isIndicativeQuote = (res.quotation_base || '').toLowerCase() === 'indicative' || Boolean(res.is_cross_entity);
                                                                const isLegPending = leg.status === 'PENDING_APPROVAL';

                                                                return (
                                                                    <tr key={idx} className={isWin ? 'bg-emerald-50/70 font-semibold' : 'hover:bg-slate-50'}>
                                                                        <td className="py-2.5 px-3 flex items-center gap-2">
                                                                            {isWin ? (
                                                                                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                                                                            ) : (
                                                                                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                                                                            )}
                                                                            <span>{res.bank_name}</span>
                                                                        </td>
                                                                        <td className="py-2.5 px-3 text-slate-500">{res.quotation_base || 'Execution'}</td>
                                                                        <td className="py-2.5 px-3 font-mono">{res.price ? res.price.toFixed(5) : '—'}</td>
                                                                        <td className="py-2.5 px-3 font-mono text-emerald-700">{res.finalPrice ? res.finalPrice.toFixed(5) : '—'}</td>
                                                                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                                                                            {res.submitted_at ? new Date(res.submitted_at).toLocaleTimeString() : 'No Submission'}
                                                                        </td>
                                                                        <td className="py-2.5 px-3 text-right">
                                                                            {isWin ? (
                                                                                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase">Awarded</span>
                                                                            ) : isIndicativeQuote ? (
                                                                                <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold uppercase">Benchmark</span>
                                                                            ) : isLegPending ? (
                                                                                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase">Pending Approval</span>
                                                                            ) : leg.is_inconclusive ? (
                                                                                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase">Inconclusive</span>
                                                                            ) : res.submitted_at ? (
                                                                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">Competitive</span>
                                                                            ) : (
                                                                                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold uppercase">Unquoted</span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="border border-slate-200 rounded-2xl overflow-hidden avoid-break">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-500">
                                                <tr>
                                                    <th className="py-2.5 px-3">Rank / Counterparty</th>
                                                    <th className="py-2.5 px-3">Type</th>
                                                    <th className="py-2.5 px-3 font-mono">Bank Quote</th>
                                                    <th className="py-2.5 px-3 font-mono">Final Price</th>
                                                    <th className="py-2.5 px-3">Submission Timestamp</th>
                                                    <th className="py-2.5 px-3 text-right">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {results.map((res, idx) => {
                                                    const isWin = Boolean(resultsMeta.winnerBankId && res.bank_id === resultsMeta.winnerBankId && !resultsMeta.isInconclusive);
                                                    const isIndicativeQuote = (res.quotation_base || '').toLowerCase() === 'indicative' || Boolean(res.is_cross_entity);
                                                    return (
                                                        <tr key={idx} className={isWin ? 'bg-emerald-50/70 font-semibold' : 'hover:bg-slate-50'}>
                                                            <td className="py-2.5 px-3 flex items-center gap-2">
                                                                {isWin ? <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">1</span> : <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>}
                                                                <span>{res.bank_name}</span>
                                                            </td>
                                                            <td className="py-2.5 px-3 text-slate-500">{res.quotation_base || 'Execution'}</td>
                                                            <td className="py-2.5 px-3 font-mono">{res.price ? res.price.toFixed(5) : '—'}</td>
                                                            <td className="py-2.5 px-3 font-mono text-emerald-700">{res.finalPrice ? res.finalPrice.toFixed(5) : (res.best_score ? res.best_score.toFixed(6) : '—')}</td>
                                                            <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{res.submitted_at ? new Date(res.submitted_at).toLocaleTimeString() : 'No Submission'}</td>
                                                            <td className="py-2.5 px-3 text-right">
                                                                {isWin ? (
                                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase">Awarded</span>
                                                                ) : isIndicativeQuote ? (
                                                                    <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold uppercase">Benchmark</span>
                                                                ) : resultsMeta.isInconclusive ? (
                                                                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase">Inconclusive</span>
                                                                ) : res.submitted_at ? (
                                                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">Competitive</span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold uppercase">Unquoted</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Compliance Sign-off */}
                            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500 avoid-break">
                                <div>
                                    <p className="font-semibold text-slate-800">Compliance & Regulatory Attestation</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        This transaction adhered to Corporate Treasury competitive guidelines and blind bidding policy.
                                    </p>
                                </div>
                                <div className="font-mono text-[10px] text-right bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                                    <div>AUDIT HASH: {rfq?.ref_no ? `TX-${rfq.ref_no}-OK` : 'N/A'}</div>
                                    <div className="text-slate-400">System Verified &bull; Corporate Treasury Engine</div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="no-print p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setShowAuditPack(false)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-200 cursor-pointer"
                            >
                                <Printer size={14} /> Print / Export PDF
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* 1-Click Re-Tender Modal */}
            {showReTenderModal && rfq && (
                <ReTenderModal
                    rfq={rfq}
                    onClose={() => setShowReTenderModal(false)}
                    onSuccess={() => {
                        fetchResults();
                    }}
                />
            )}

            {/* Quotation Cancellation Request Modal */}
            {showCancellationModal && rfq && (
                <QuotationCancellationModal
                    rfq={rfq}
                    isOpen={showCancellationModal}
                    onClose={() => setShowCancellationModal(false)}
                    onSuccess={() => {
                        fetchResults();
                    }}
                />
            )}

            {/* Delegate Acceptance Authority Modal */}
            {showDelegateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Delegate Acceptance Authority</h3>
                                    <p className="text-xs text-indigo-200/80 font-mono">RFQ #{rfq?.ref_no}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDelegateModal(false)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Designate a corporate treasury colleague who is authorized to review quotes, accept winning deals, or decline counterparties on your behalf for this RFQ.
                            </p>
                            {rfq?.delegated_to_name && (
                                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-800">
                                    Currently delegated to: <span className="font-bold">{rfq.delegated_to_name}</span>
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">
                                    Select Corporate Colleague
                                </label>
                                {colleagues.length === 0 ? (
                                    <p className="text-xs text-gray-500 italic p-2 border border-dashed rounded-lg">No other corporate colleagues found in your organization.</p>
                                ) : (
                                    <select
                                        value={selectedDelegateId}
                                        onChange={(e) => setSelectedDelegateId(e.target.value)}
                                        className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-medium"
                                    >
                                        {colleagues.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.display_name || c.email} ({c.role})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setShowDelegateModal(false)}
                                disabled={delegating}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelegation}
                                disabled={delegating || !selectedDelegateId || colleagues.length === 0}
                                className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-200 cursor-pointer disabled:opacity-50"
                            >
                                <UserCheck size={14} /> {delegating ? 'Delegating...' : 'Authorize Colleague'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
