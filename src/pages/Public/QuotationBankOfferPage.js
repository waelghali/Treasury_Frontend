import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
    Clock, Landmark, AlertCircle, CheckCircle2, TrendingUp, FileText, ExternalLink,
    Mail, KeyRound, UserCheck, Eye, History, RefreshCw, MessageSquare, Shield,
    BarChart2, ShieldAlert, WifiOff, FileQuestion,
    Users, Lock, Zap, Info, Loader2, Ban, Volume2, VolumeX, Copy, Check,
    RotateCw, AlertTriangle, Trophy, Crown, Sparkles, Hourglass, Download
} from 'lucide-react';
import tradingAudio from '../../utils/tradingAudioEngine';
import TradeExecutionConfetti from '../../components/Quotations/TradeExecutionConfetti';
import TradeAccoladePromotionToast from '../../components/Quotations/TradeAccoladePromotionToast';
import './quotation-animations.css';

const DIRECT_BACKEND_URL = 'https://api.growbusinessdevelopment.com';

const getApiBaseUrl = () => {
    // 1. Local development environment
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        let localEnv = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL;
        return localEnv ? localEnv.replace(/\/api\/v1\/?$/, '') : 'http://localhost:8000';
    }

    // 2. Production Vercel domain: use same-origin relative proxy path to eliminate bank firewall CORS/cross-domain blocking
    if (typeof window !== 'undefined' && (window.location.hostname === 'www.growbusinessdevelopment.com' || window.location.hostname === 'growbusinessdevelopment.com')) {
        return '';
    }

    // 3. Staging and any other hosted domains
    let url = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL;
    if (url) {
        return url.replace(/\/api\/v1\/?$/, '');
    }
    return DIRECT_BACKEND_URL;
};

const API_BASE_URL = getApiBaseUrl();

// Resilient API requester with automated fallback for production
const quotationApi = {
    get: async (path, config = {}) => {
        try {
            return await axios.get(`${API_BASE_URL}${path}`, config);
        } catch (err) {
            if (API_BASE_URL === '' && (!err.response || err.response.status >= 500)) {
                return await axios.get(`${DIRECT_BACKEND_URL}${path}`, config);
            }
            throw err;
        }
    },
    post: async (path, data, config = {}) => {
        try {
            return await axios.post(`${API_BASE_URL}${path}`, data, config);
        } catch (err) {
            if (API_BASE_URL === '' && (!err.response || err.response.status >= 500)) {
                return await axios.post(`${DIRECT_BACKEND_URL}${path}`, data, config);
            }
            throw err;
        }
    }
};

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

export default function QuotationBankOfferPage() {
    const { token } = useParams();
    const [searchParams] = useSearchParams();
    const magicTokenParam = searchParams.get('magic_token');
    const emailParam = searchParams.get('email');

    const [rfq, setRfq] = useState(null);
    const [error, setError] = useState(null);
    const [price, setPrice] = useState('');
    const [offeredValueDate, setOfferedValueDate] = useState('');
    const [traderNotes, setTraderNotes] = useState('');
    const [tbillLines, setTbillLines] = useState([{ settlementDate: '', maturityDate: '', discountRate: '', maxAmount: '' }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [timeLeft, setTimeLeft] = useState({ label: '', status: 'PRE', secondsRemaining: null, days: 0, hours: 0, mins: 0, secs: 0 });
    const [resultStatus, setResultStatus] = useState(null);
    const [outcomeData, setOutcomeData] = useState(null);
    const [timeOffset, setTimeOffset] = useState(0);
    const [copiedReceiptHash, setCopiedReceiptHash] = useState(false);

    const handleCopyReceiptHash = useCallback((hash) => {
        if (!hash) return;
        if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(hash);
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = hash;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
        setCopiedReceiptHash(true);
        setTimeout(() => setCopiedReceiptHash(false), 2000);
    }, []);

    const renderOutcomeReceiptAndDocs = (outcome) => {
        if (!outcome?.receipt && (!outcome?.released_documents || outcome.released_documents.length === 0)) {
            return null;
        }

        const hasDocs = Boolean(outcome?.released_documents && outcome.released_documents.length > 0);
        const hasBoth = Boolean(outcome?.receipt && hasDocs);

        return (
            <div className={`mt-2.5 w-full mx-auto text-left ${hasBoth ? 'max-w-5xl xl:max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-3.5' : 'max-w-2xl'}`}>
                {outcome?.receipt && (
                    <div className="p-3.5 rounded-xl bg-emerald-950/5 border border-emerald-500/30 text-emerald-950 text-xs font-sans shadow-xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between gap-2 border-b border-emerald-500/20 pb-1.5 mb-2">
                                <div className="flex items-center gap-1.5 font-bold text-emerald-900 min-w-0">
                                    <Shield size={14} className="text-emerald-600 shrink-0" />
                                    <span className="truncate">Cryptographic Deal Execution Receipt</span>
                                </div>
                                <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold border border-emerald-300/60 shrink-0 whitespace-nowrap">
                                    {outcome.receipt.receipt_id}
                                </span>
                            </div>

                            <div className="space-y-1.5 text-xs text-emerald-900">
                                <div>
                                    <div className="flex items-center justify-between text-emerald-800 mb-1">
                                        <span className="font-semibold text-xs">Digital Signature (HMAC-SHA256):</span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopyReceiptHash(outcome.receipt.signature_hash)}
                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-950 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded transition-colors cursor-pointer"
                                            title="Copy full cryptographic signature"
                                        >
                                            {copiedReceiptHash ? (
                                                <>
                                                    <Check size={12} className="text-emerald-700 stroke-[2.5]" />
                                                    <span className="font-bold text-emerald-800">Copied!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={12} />
                                                    <span>Copy Hash</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <div className="font-mono text-[11px] text-emerald-950 bg-white/90 border border-emerald-500/20 rounded-lg px-2.5 py-1.5 break-all select-all leading-relaxed shadow-inner">
                                        {outcome.receipt.signature_hash}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 mt-2 border-t border-emerald-500/15 text-xs space-y-1">
                            <div className="flex justify-between items-center">
                                <span className="text-emerald-700 font-medium">Execution Timestamp:</span>
                                <span className="font-mono text-xs text-emerald-950 font-medium">{outcome.receipt.executed_at}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-emerald-700 font-medium">Counterparty Leg Scope:</span>
                                <span className="text-emerald-950 font-bold">{outcome.receipt.scoped_legs_count} Leg(s) Won &amp; Executed</span>
                            </div>
                        </div>
                    </div>
                )}

                {hasDocs && (
                    <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-950 text-xs font-sans shadow-xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between gap-2 border-b border-blue-200/60 pb-1.5 mb-2">
                                <div className="flex items-center gap-1.5 font-bold text-blue-900 min-w-0">
                                    <FileText size={14} className="text-blue-600 shrink-0" />
                                    <span className="truncate">Trade Supporting Documents (Released for Executed Leg{outcome.released_documents.length > 1 ? 's' : ''})</span>
                                </div>
                                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold shrink-0 whitespace-nowrap">
                                    {outcome.released_documents.length} File{outcome.released_documents.length > 1 ? 's' : ''}
                                </span>
                            </div>

                            <div className="space-y-1.5">
                                {outcome.released_documents.map((doc, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white border border-blue-100 text-xs gap-2">
                                        <span className="flex items-center gap-2 font-medium text-slate-800 truncate min-w-0">
                                            <FileText size={14} className="text-blue-500 shrink-0" />
                                            <span className="truncate font-semibold">{doc.name}</span>
                                            {doc.pair && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-200 shrink-0">
                                                    {doc.pair}
                                                </span>
                                            )}
                                        </span>
                                        <a
                                            href={doc.path}
                                            target="_blank"
                                            rel="noreferrer"
                                            download
                                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors shrink-0"
                                        >
                                            <ExternalLink size={12} /> Download
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-2 mt-2 border-t border-blue-200/40 text-[11px] text-blue-700 flex items-center justify-between">
                            <span>Released exclusively for your executed position.</span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Live Ranking State
    const [liveRank, setLiveRank] = useState(null);

    // Multi-Pair Leg Quotes and Leg Live Ranks
    const [legQuotes, setLegQuotes] = useState({});
    const [legLiveRanks, setLegLiveRanks] = useState({});
    const [highlightedLegId, setHighlightedLegId] = useState(null);

    // Attention cues for window opening and title
    const prevStatusRef = useRef(null);
    const [showWindowOpenedAlert, setShowWindowOpenedAlert] = useState(false);
    const originalTitleRef = useRef(typeof document !== 'undefined' ? document.title : 'Grow Treasury');
    const resultStatusRef = useRef(resultStatus);
    useEffect(() => {
        resultStatusRef.current = resultStatus;
    }, [resultStatus]);

    // Trading Audio Engine (Desk Sound Effects)
    const [soundEnabled, setSoundEnabled] = useState(() => tradingAudio.isSoundEnabled());
    const lastTickedSecondRef = useRef(null);
    const hasPlayedResultSoundRef = useRef(false);

    const handleToggleSound = () => {
        const next = !soundEnabled;
        setSoundEnabled(next);
        tradingAudio.setSoundEnabled(next);
        if (next) {
            tradingAudio.playUrgencyTick(10);
        }
    };

    // Active View Tab: 'LIVE' or 'HISTORY'
    const [activeTab, setActiveTab] = useState('LIVE');
    const [historyData, setHistoryData] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Authentication / OTP State
    const [authSession, setAuthSession] = useState(null);
    const [inputEmail, setInputEmail] = useState(searchParams.get('email') || '');
    const [otpCode, setOtpCode] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otpError, setOtpError] = useState('');
    const [isRequestingOtp, setIsRequestingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [dealerAchievements, setDealerAchievements] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [targetTrophyId, setTargetTrophyId] = useState(null);
    const [unlockedTier, setUnlockedTier] = useState(null);
    const [animateMedals, setAnimateMedals] = useState(false);
    const [promotionAlert, setPromotionAlert] = useState(null);
    const prevAchievementsRef = useRef(null);
    const prevAuthEmailRef = useRef(null);
    const hasTriggeredCelebrationRef = useRef(false);

    useEffect(() => {
        const ep = searchParams.get('email');
        if (ep && !inputEmail) {
            setInputEmail(ep);
        }
    }, [searchParams]);

    // Approver Action State
    const [approvalNotes, setApprovalNotes] = useState('');
    const [isActioningApproval, setIsActioningApproval] = useState(false);
    const [approvalSuccessMsg, setApprovalSuccessMsg] = useState(null);

    // Fat-Finger Confirmation Modal (Triggers ONLY upon submit for genuine anomalies)
    const [fatFingerModal, setFatFingerModal] = useState(null);

    // Post-Window Acceptance Countdown Timer for Banks
    const [acceptanceSecondsRemaining, setAcceptanceSecondsRemaining] = useState(null);

    // Multi-Dealer Desk Concurrency State
    const [deskState, setDeskState] = useState(null);
    const [isTakingOver, setIsTakingOver] = useState(false);
    const [deskNotice, setDeskNotice] = useState(null);
    const [draftRestored, setDraftRestored] = useState(false);
    const tabSessionIdRef = useRef(null);
    if (!tabSessionIdRef.current) {
        tabSessionIdRef.current = 'tab_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    }

    const getEffectiveSessionToken = useCallback(() => {
        if (!authSession?.session_token) return undefined;
        return `${authSession.session_token}_tab_${tabSessionIdRef.current}`;
    }, [authSession?.session_token]);

    const storageKey = emailParam ? `quotation_auth_${token}_${emailParam.toLowerCase()}` : `quotation_auth_${token}`;

    // 1. Fetch RFQ
    const fetchRfq = useCallback(async () => {
        try {
            const res = await quotationApi.get(`/api/v1/public-quotation/${token}`);
            const data = res.data;

            const serverTime = new Date(data.serverTime).getTime();
            const localTime = Date.now();
            setTimeOffset(serverTime - localTime);
            setRfq(data);
            setError(null);
            if (data.is_live_ranking_enabled) {
                setLiveRank({
                    is_enabled: true,
                    rank: data.live_rank,
                    total_quotes: data.total_quotes,
                    is_leading: data.live_rank === 1
                });
                if (data.legs && Array.isArray(data.legs)) {
                    const initialRanks = {};
                    data.legs.forEach((l, idx) => {
                        const r = l.live_rank;
                        if (r) {
                            initialRanks[l.id] = r;
                            initialRanks[String(l.id)] = r;
                            initialRanks[idx] = r;
                            initialRanks[String(idx)] = r;
                            if (l.currency_pair) initialRanks[l.currency_pair] = r;
                        }
                    });
                    if (data.ranks_by_leg && Object.keys(data.ranks_by_leg).length > 0) {
                        Object.assign(initialRanks, data.ranks_by_leg);
                    }
                    if (Object.keys(initialRanks).length > 0) {
                        setLegLiveRanks(initialRanks);
                    }
                }
            } else {
                setLiveRank(null);
                setLegLiveRanks({});
            }
        } catch (err) {
            const status = err.response?.status;
            const detail = err.response?.data?.detail;
            const detailStr = typeof detail === 'string' ? detail : (detail ? JSON.stringify(detail) : '');
            const rawMessage = detailStr || err.message || 'Failed to load quotation details';

            const isCancelled = detailStr.toLowerCase().includes('withdrawn') ||
                detailStr.toLowerCase().includes('cancelled') ||
                detailStr.toLowerCase().includes('canceled');

            const isExpired = !isCancelled && (
                status === 410 ||
                detailStr.toLowerCase().includes('expired') ||
                detailStr.toLowerCase().includes('validity of this link')
            );

            const isPendingApproval = status === 403 &&
                detailStr.toLowerCase().includes('awaiting internal corporate approval');

            const isInvalidToken = status === 404 ||
                detailStr.toLowerCase().includes('invalid token');

            const isNetworkError = !err.response || err.message === 'Network Error' || err.code === 'ERR_NETWORK';

            setError({
                status,
                message: rawMessage,
                isCancelled,
                isExpired,
                isPendingApproval,
                isInvalidToken,
                isNetworkError
            });
        }
    }, [token]);

    // 2. Fetch Result
    const checkResult = useCallback(async () => {
        if (!rfq || timeLeft.status !== 'CLOSED' || rfq.approval_status === 'DECLINED') {
            setResultStatus(null);
            return null;
        }
        try {
            const res = await quotationApi.get(`/api/v1/public-quotation/${token}/result`);
            const data = res.data;
            setOutcomeData(data);
            const status = data?.status;

            // If window has not closed or bank declined participation, never evaluate or display selection/outcome banners
            if (status === 'SCHEDULED' || status === 'OPEN' || status === 'PARTICIPATION_DECLINED' || status === 'DECLINED' || timeLeft.status !== 'CLOSED' || rfq.approval_status === 'DECLINED') {
                setResultStatus(null);
                return null;
            }

            if (status === 'WINNER') {
                setResultStatus('WINNER');
            } else if (status === 'PARTIALLY_WON') {
                setResultStatus('PARTIALLY_WON');
            } else if (status === 'INCONCLUSIVE') {
                setResultStatus('INCONCLUSIVE');
            } else if (status === 'AWAITING_MANUAL_SELECTION' || status === 'PENDING') {
                setResultStatus('AWAITING_SELECTION');
            } else if (status === 'NOT_SELECTED' || status === 'UNEXECUTED') {
                setResultStatus('NOT_SELECTED');
            } else if (status === 'INDICATIVE_ONLY' || status === 'COMPLETED') {
                setResultStatus(status);
            } else if (status) {
                // Safety fallback: any unhandled terminal status should clear AWAITING_SELECTION
                setResultStatus('NOT_SELECTED');
            }
            return status;
        } catch (err) {
            console.error(err);
            return null;
        }
    }, [rfq, token, timeLeft.status]);

    // Acceptance Countdown Timer for Banks (Ticks down during corporate acceptance window)
    useEffect(() => {
        if (resultStatus !== 'AWAITING_SELECTION') {
            setAcceptanceSecondsRemaining(null);
            return;
        }

        const getDeadline = () => {
            if (outcomeData?.acceptance_deadline) {
                return new Date(outcomeData.acceptance_deadline).getTime();
            }
            if (rfq?.window_end && rfq?.acceptance_timeout_seconds) {
                return new Date(rfq.window_end).getTime() + (rfq.acceptance_timeout_seconds * 1000);
            }
            return null;
        };

        const deadline = getDeadline();
        if (!deadline) {
            setAcceptanceSecondsRemaining(null);
            return;
        }

        const updateTimer = () => {
            const now = Date.now() + (timeOffset || 0);
            const diff = Math.max(0, Math.floor((deadline - now) / 1000));
            setAcceptanceSecondsRemaining(diff);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [resultStatus, outcomeData?.acceptance_deadline, rfq?.window_end, rfq?.acceptance_timeout_seconds, timeOffset]);

    // 3. Auto-Auth via Magic Link or SessionStorage
    useEffect(() => {
        const stored = sessionStorage.getItem(storageKey);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (emailParam && parsed?.email && parsed.email.toLowerCase() !== emailParam.toLowerCase()) {
                    // Mismatched emailParam from URL, don't restore old session
                } else {
                    setAuthSession(parsed);
                }
            } catch (e) {
                sessionStorage.removeItem(storageKey);
            }
        }

        if (magicTokenParam) {
            const verifyMagic = async () => {
                setIsVerifyingOtp(true);
                try {
                    const res = await quotationApi.post('/api/v1/public-quotation/verify-otp', {
                        token,
                        magic_token: magicTokenParam
                    });
                    const session = res.data;
                    setAuthSession(session);
                    sessionStorage.setItem(storageKey, JSON.stringify(session));
                    prevAuthEmailRef.current = session.email;
                    try {
                        const achRes = await quotationApi.get(`/api/v1/public-quotation/${token}/dealer-achievements?email=${encodeURIComponent(session.email)}`);
                        if (achRes.data) {
                            setDealerAchievements(achRes.data);
                            prevAchievementsRef.current = achRes.data;
                        }
                    } catch (e) {}
                } catch (err) {
                    setOtpError('The magic link has expired or is invalid. Please request a new code.');
                } finally {
                    setIsVerifyingOtp(false);
                }
            };
            verifyMagic();
        }
    }, [token, magicTokenParam, storageKey]);

    useEffect(() => {
        fetchRfq();
    }, [fetchRfq]);

    // 4. Polling for results when closed
    useEffect(() => {
        let interval = null;
        const terminalStatuses = ['WINNER', 'PARTIALLY_WON', 'NOT_SELECTED', 'UNEXECUTED', 'INCONCLUSIVE', 'INDICATIVE_ONLY', 'COMPLETED'];
        const isTerminal = terminalStatuses.includes(resultStatus);

        if (timeLeft.status === 'CLOSED' && !isTerminal) {
            const startPolling = async () => {
                const initialStatus = await checkResult();
                if (initialStatus && terminalStatuses.includes(initialStatus)) return;
                interval = setInterval(async () => {
                    const status = await checkResult();
                    if (status && terminalStatuses.includes(status)) {
                        if (interval) clearInterval(interval);
                    }
                }, 3000);
            };
            startPolling();
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [timeLeft.status, resultStatus, checkResult]);

    // 4b. Live Ranking Polling (Every 1.5s while window open)
    useEffect(() => {
        if (!rfq?.is_live_ranking_enabled || timeLeft.status !== 'OPEN' || !token) return;

        const pollRank = async () => {
            try {
                const res = await quotationApi.get(`/api/v1/public-quotation/${token}/live-rank`);
                if (res.data && res.data.is_live_ranking_enabled) {
                    setLiveRank({
                        is_enabled: true,
                        rank: res.data.rank,
                        total_quotes: res.data.total_quotes,
                        is_leading: res.data.is_leading
                    });
                    if (res.data.ranks_by_leg && Object.keys(res.data.ranks_by_leg).length > 0) {
                        setLegLiveRanks(res.data.ranks_by_leg);
                    }
                }
            } catch (err) {
                // Background polling errors are ignored
            }
        };

        pollRank(); // Immediate fetch upon entering active window
        const interval = setInterval(pollRank, 1500); // 1.5s turbo refresh matching corporate/end-user dashboards
        return () => clearInterval(interval);
    }, [rfq?.is_live_ranking_enabled, timeLeft.status, token]);

    // 4c. Desk Session & Multi-Dealer Concurrency Polling
    // Runs starting 10 minutes before window start and ends (Corporate Acceptance Timeout + 1 minute) after window close
    useEffect(() => {
        if (!authSession?.email || !token || !rfq || rfq.status === 'CANCELLED' || error?.isCancelled) {
            return;
        }

        const acceptanceTimeoutSeconds = Number(rfq?.acceptance_timeout_seconds) || (rfq?.type === 'TBILL' ? 120 : 30);
        const PRE_BUFFER_MS = 10 * 60 * 1000; // 10 minutes before start
        const POST_BUFFER_MS = (acceptanceTimeoutSeconds + 60) * 1000;  // Corporate Acceptance Timeout + 1 minute buffer

        const startTime = rfq.window_start ? new Date(rfq.window_start).getTime() : NaN;
        const endTime = rfq.window_end ? new Date(rfq.window_end).getTime() : NaN;

        const checkEligibility = () => {
            if (!rfq || rfq.status === 'CANCELLED' || rfq.status === 'COMPLETED') {
                return false;
            }
            const now = Date.now() + timeOffset;
            if (!isNaN(startTime) && !isNaN(endTime)) {
                return now >= (startTime - PRE_BUFFER_MS) && now <= (endTime + POST_BUFFER_MS);
            }
            return timeLeft.status === 'OPEN';
        };

        if (!checkEligibility()) {
            return;
        }

        const syncDeskSession = async () => {
            try {
                const res = await quotationApi.post(`/api/v1/public-quotation/${token}/desk-heartbeat`, {
                    session_token: getEffectiveSessionToken(),
                    email: authSession.email,
                    name: authSession.name || authSession.email.split('@')[0],
                    role: authSession.role || 'EXECUTION'
                });
                const data = res.data;
                if (data.rfq_status === 'CANCELLED') {
                    setError({
                        status: 410,
                        message: 'This quotation request was officially withdrawn by the corporate treasury desk. No quotation is required.',
                        isCancelled: true,
                        isExpired: false,
                        isPendingApproval: false,
                        isInvalidToken: false,
                        isNetworkError: false
                    });
                    return;
                }
                setDeskState(data);

                // If colleague submitted quote or price was mirrored, update live if we are spectator
                if (!data.is_active_trader && data.mirrored_quote) {
                    if (data.mirrored_quote.price !== undefined && data.mirrored_quote.price !== null) {
                        setPrice(prev => {
                            const newP = String(data.mirrored_quote.price);
                            if (prev !== newP) {
                                setDeskNotice(`Quote updated by ${data.active_trader_name || data.active_trader_email}: ${newP}`);
                                setTimeout(() => setDeskNotice(null), 5000);
                            }
                            return newP;
                        });
                    }
                    if (data.mirrored_quote.notes !== undefined) {
                        setTraderNotes(data.mirrored_quote.notes || '');
                    }
                    if (data.mirrored_quote.legs_quotes && typeof data.mirrored_quote.legs_quotes === 'object') {
                        setLegQuotes(prev => {
                            const updated = { ...prev };
                            Object.entries(data.mirrored_quote.legs_quotes).forEach(([legKey, qData]) => {
                                if (qData && typeof qData === 'object') {
                                    updated[legKey] = {
                                        ...(updated[legKey] || {}),
                                        price: qData.price !== undefined && qData.price !== null ? String(qData.price) : (updated[legKey]?.price || ''),
                                        offered_value_date: qData.offered_value_date || updated[legKey]?.offered_value_date || '',
                                        notes: qData.notes !== undefined ? (qData.notes || '') : (updated[legKey]?.notes || '')
                                    };
                                }
                            });
                            return updated;
                        });
                    }
                }
            } catch (err) {
                const status = err.response?.status;
                const detail = err.response?.data?.detail;
                const detailStr = typeof detail === 'string' ? detail : (detail ? JSON.stringify(detail) : '');
                if (status === 410 || detailStr.toLowerCase().includes('withdrawn') || detailStr.toLowerCase().includes('cancelled') || detailStr.toLowerCase().includes('canceled')) {
                    setError({
                        status: 410,
                        message: detailStr || 'This quotation request was officially withdrawn by the corporate treasury desk. No quotation is required.',
                        isCancelled: true,
                        isExpired: false,
                        isPendingApproval: false,
                        isInvalidToken: false,
                        isNetworkError: false
                    });
                }
            }
        };

        syncDeskSession();
        const interval = setInterval(() => {
            if (!checkEligibility()) {
                clearInterval(interval);
                return;
            }
            syncDeskSession();
        }, 2000);

        return () => clearInterval(interval);
    }, [authSession, token, timeLeft.status, rfq?.window_start, rfq?.window_end, rfq?.status, rfq?.acceptance_timeout_seconds, error?.isCancelled, timeOffset, getEffectiveSessionToken]);

    // 4d. Real-Time Cancellation & Status Polling for Unauthenticated View
    useEffect(() => {
        if (authSession || error?.isCancelled || timeLeft.status === 'CLOSED') return;
        const statusPoll = setInterval(() => {
            fetchRfq();
        }, 4000);
        return () => clearInterval(statusPoll);
    }, [authSession, error?.isCancelled, timeLeft.status, fetchRfq]);

    // 4e. Fetch Cross-Corporate Dealer Accolades & Multi-Metal Achievements
    const fetchAchievements = useCallback(async () => {
        if (!token) return null;
        try {
            const emailQuery = authSession?.email ? `?email=${encodeURIComponent(authSession.email)}` : '';
            const res = await quotationApi.get(`/api/v1/public-quotation/${token}/dealer-achievements${emailQuery}`);
            if (res.data) {
                setDealerAchievements(res.data);
                // When logging in or switching authenticated dealer, update baseline so past achievements don't trigger false celebration
                if (!prevAchievementsRef.current || (authSession?.email && prevAuthEmailRef.current !== authSession.email)) {
                    prevAuthEmailRef.current = authSession?.email || null;
                    prevAchievementsRef.current = res.data;
                }
                return res.data;
            }
        } catch (err) {
            // Non-blocking background enhancement
        }
        return null;
    }, [token, authSession?.email]);

    useEffect(() => {
        fetchAchievements();
    }, [fetchAchievements]);

    // 5. Live Countdown Timer with Dynamic Browser Titles & Urgency Tracking
    useEffect(() => {
        if (!rfq || !rfq.window_start || !rfq.window_end) return;

        let timer = null;

        const updateCountdown = () => {
            const now = new Date(Date.now() + timeOffset);
            const start = new Date(rfq.window_start);
            const end = new Date(rfq.window_end);
            const acceptanceTimeoutSeconds = Number(rfq?.acceptance_timeout_seconds) || (rfq?.type === 'TBILL' ? 120 : 30);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

            if (now < start) {
                setResultStatus(null);
                const diff = Math.max(0, Math.floor((start.getTime() - now.getTime()) / 1000));
                const days = Math.floor(diff / 86400);
                const hours = Math.floor((diff % 86400) / 3600);
                const mins = Math.floor((diff % 3600) / 60);
                const secs = diff % 60;

                let labelText = '';
                if (days > 0) {
                    labelText = `Starts in ${days}d ${hours}h ${mins}m ${secs}s`;
                } else if (hours > 0) {
                    labelText = `Starts in ${hours}h ${mins}m ${secs}s`;
                } else {
                    labelText = `Starts in ${mins}:${secs.toString().padStart(2, '0')}`;
                }

                setTimeLeft({
                    label: labelText,
                    status: 'PRE',
                    secondsRemaining: diff,
                    acceptanceSecondsRemaining: acceptanceTimeoutSeconds,
                    days,
                    hours,
                    mins,
                    secs
                });

                if (typeof document !== 'undefined') {
                    if (days > 0) {
                        document.title = `Starts in ${days}d ${hours}h | Grow Treasury`;
                    } else if (hours > 0) {
                        document.title = `Starts in ${hours}h ${mins}m | Grow Treasury`;
                    } else {
                        document.title = `Starts in ${mins}:${secs.toString().padStart(2, '0')} | Grow Treasury`;
                    }
                }
            } else if (now >= start && now <= end) {
                setResultStatus(null);
                const diff = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
                const hours = Math.floor(diff / 3600);
                const mins = Math.floor((diff % 3600) / 60);
                const secs = diff % 60;

                let labelText = '';
                if (hours > 0) {
                    labelText = `Window Closes in ${hours}h ${mins}m ${secs}s`;
                } else {
                    labelText = `Window Closes in ${mins}:${secs.toString().padStart(2, '0')}`;
                }

                setTimeLeft({
                    label: labelText,
                    status: 'OPEN',
                    secondsRemaining: diff,
                    acceptanceSecondsRemaining: acceptanceTimeoutSeconds,
                    days: 0,
                    hours,
                    mins,
                    secs
                });

                if (typeof document !== 'undefined') {
                    if (diff <= 5) {
                        document.title = `⚠️ [${diff}s] CLOSING SOON | Grow Treasury`;
                    } else if (diff <= 30) {
                        document.title = `⏱️ [${diff}s] Quote Now | Grow Treasury`;
                    } else {
                        document.title = `🟢 [OPEN] Quote Now | Grow Treasury`;
                    }
                }
            } else if (now > end && now <= new Date(end.getTime() + (acceptanceTimeoutSeconds * 1000))) {
                const currentResult = resultStatusRef.current || resultStatus;
                const terminalStatuses = ['WINNER', 'PARTIALLY_WON', 'NOT_SELECTED', 'UNEXECUTED', 'INCONCLUSIVE', 'INDICATIVE_ONLY', 'COMPLETED'];
                if (terminalStatuses.includes(currentResult)) {
                    setTimeLeft({
                        label: (currentResult === 'WINNER' || currentResult === 'PARTIALLY_WON') ? 'Trade Execution Confirmed' : 'Quotation Concluded',
                        status: 'CLOSED',
                        secondsRemaining: 0,
                        acceptanceSecondsRemaining: 0,
                        days: 0,
                        hours: 0,
                        mins: 0,
                        secs: 0
                    });
                    if (typeof document !== 'undefined') {
                        if (currentResult === 'WINNER' || currentResult === 'PARTIALLY_WON') {
                            document.title = '🏆 Trade Execution Confirmed | Grow Treasury';
                        } else if (currentResult === 'INDICATIVE_ONLY') {
                            document.title = 'Quotation Closed — Thank You | Grow Treasury';
                        } else {
                            document.title = 'Quotation Concluded | Grow Treasury';
                        }
                    }
                    if (timer) clearInterval(timer);
                    return;
                }

                const isBankAllIndicative = Boolean(rfq?.is_all_indicative || (!rfq?.has_execution_legs) || (rfq?.quotation_base || '').toLowerCase() === 'indicative');
                if (isBankAllIndicative) {
                    setTimeLeft({
                        label: 'Quotation Closed',
                        status: 'CLOSED',
                        secondsRemaining: 0,
                        acceptanceSecondsRemaining: 0,
                        days: 0,
                        hours: 0,
                        mins: 0,
                        secs: 0
                    });
                    if (typeof document !== 'undefined') {
                        document.title = 'Quotation Closed — Thank You | Grow Treasury';
                    }
                    if (timer) clearInterval(timer);
                    checkResult();
                    return;
                }
                const acceptDiff = Math.max(0, Math.floor(((end.getTime() + (acceptanceTimeoutSeconds * 1000)) - now.getTime()) / 1000));
                setTimeLeft({
                    label: `Window Closed • Corporate Acceptance Window (${acceptDiff}s)`,
                    status: 'CLOSED',
                    secondsRemaining: 0,
                    acceptanceSecondsRemaining: acceptDiff,
                    days: 0,
                    hours: 0,
                    mins: 0,
                    secs: 0
                });
                if (typeof document !== 'undefined') {
                    document.title = `Acceptance Window (${acceptDiff}s) | Grow Treasury`;
                }
                checkResult();
            } else {
                const isBankAllIndicative = Boolean(rfq?.is_all_indicative || (!rfq?.has_execution_legs) || (rfq?.quotation_base || '').toLowerCase() === 'indicative');
                setTimeLeft({ label: isBankAllIndicative ? 'Quotation Closed' : 'Window Closed', status: 'CLOSED', secondsRemaining: 0, acceptanceSecondsRemaining: 0, days: 0, hours: 0, mins: 0, secs: 0 });
                if (typeof document !== 'undefined') {
                    document.title = isBankAllIndicative ? 'Quotation Closed — Thank You | Grow Treasury' : 'Window Closed | Grow Treasury';
                }
                if (timer) clearInterval(timer);
                checkResult();
            }
        };

        updateCountdown();
        timer = setInterval(updateCountdown, 1000);

        return () => {
            if (timer) clearInterval(timer);
            if (typeof document !== 'undefined' && originalTitleRef.current) {
                document.title = originalTitleRef.current;
            }
        };
    }, [rfq, timeOffset, checkResult, resultStatus]);

    // 5a-2. Concluded Result Document Title & Counter Freeze
    useEffect(() => {
        if (!resultStatus) return;
        const terminalStatuses = ['WINNER', 'PARTIALLY_WON', 'NOT_SELECTED', 'UNEXECUTED', 'INCONCLUSIVE', 'INDICATIVE_ONLY', 'COMPLETED'];
        if (terminalStatuses.includes(resultStatus)) {
            setTimeLeft(prev => ({
                ...prev,
                status: 'CLOSED',
                secondsRemaining: 0,
                acceptanceSecondsRemaining: 0,
                label: (resultStatus === 'WINNER' || resultStatus === 'PARTIALLY_WON') ? 'Trade Execution Confirmed' : 'Quotation Concluded'
            }));
            if (typeof document !== 'undefined') {
                if (resultStatus === 'WINNER' || resultStatus === 'PARTIALLY_WON') {
                    document.title = '🏆 Trade Execution Confirmed | Grow Treasury';
                } else if (resultStatus === 'INDICATIVE_ONLY') {
                    document.title = 'Quotation Closed — Thank You | Grow Treasury';
                } else {
                    document.title = 'Quotation Concluded | Grow Treasury';
                }
            }
        }
    }, [resultStatus]);

    // 5b. Cancellation Document Title
    useEffect(() => {
        if (error?.isCancelled && typeof document !== 'undefined') {
            document.title = 'Quotation Cancelled | Grow Treasury';
        }
    }, [error?.isCancelled]);

    // 5c. Window Just Opened Transition Alert & Audio Chime
    useEffect(() => {
        if (prevStatusRef.current === 'PRE' && timeLeft.status === 'OPEN') {
            setShowWindowOpenedAlert(true);
            tradingAudio.playWindowOpened();
            const card = document.getElementById('bidding-quote-card');
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        prevStatusRef.current = timeLeft.status;
    }, [timeLeft.status]);

    // 5d. Urgency Warning Audio Cues (Final 10 seconds before close)
    useEffect(() => {
        if (timeLeft.status === 'OPEN' && timeLeft.secondsRemaining !== null && timeLeft.secondsRemaining <= 10 && timeLeft.secondsRemaining > 0) {
            if (lastTickedSecondRef.current !== timeLeft.secondsRemaining) {
                lastTickedSecondRef.current = timeLeft.secondsRemaining;
                tradingAudio.playUrgencyTick(timeLeft.secondsRemaining);
            }
        }
    }, [timeLeft.status, timeLeft.secondsRemaining]);

    const initialStatusRef = useRef(null);
    useEffect(() => {
        if (!initialStatusRef.current && timeLeft.status) {
            initialStatusRef.current = timeLeft.status;
        }
    }, [timeLeft.status]);

    // 5e. Result Resolution Audio Cue & Trade Celebration (Only when authenticated and resolved live)
    useEffect(() => {
        if (!authSession || !resultStatus || timeLeft.status !== 'CLOSED') return;

        // If the RFQ was already closed when the page was first loaded, do not fire live celebration
        if (initialStatusRef.current === 'CLOSED') return;

        if (!hasPlayedResultSoundRef.current) {
            hasPlayedResultSoundRef.current = true;
            tradingAudio.playResultOut(resultStatus);
        }

        // Check for genuine achievement unlock upon winning live
        if ((resultStatus === 'WINNER' || resultStatus === 'PARTIALLY_WON') && !hasTriggeredCelebrationRef.current) {
            hasTriggeredCelebrationRef.current = true;

            // Fetch post-win achievements and detect if THIS dealer unlocked an accolade or tier promotion
            const evaluatePromotion = async () => {
                const oldData = prevAchievementsRef.current || dealerAchievements;
                const updated = await fetchAchievements();
                if (!updated) return;

                const oldTrophies = oldData?.trophies || [];
                const updatedTrophies = updated.trophies || [];

                let unlockedTrophy = null;
                for (const t of updatedTrophies) {
                    const prevT = oldTrophies.find(o => o.id === t.id);
                    if (prevT && prevT.current_tier !== t.current_tier && t.current_tier !== 'NONE') {
                        unlockedTrophy = t;
                        break;
                    }
                }

                const isTierUpgraded = oldData?.dealer_tier && updated.dealer_tier && oldData.dealer_tier !== updated.dealer_tier;

                // Immediately re-render the trophy medal color and tooltip progress numbers
                setDealerAchievements(updated);
                prevAchievementsRef.current = updated;

                // ONLY trigger fanfare & confetti if a genuine achievement was unlocked for THIS dealer
                if (unlockedTrophy) {
                    setTargetTrophyId(unlockedTrophy.id);
                    setUnlockedTier(unlockedTrophy.current_tier);
                    setShowConfetti(true);
                    setAnimateMedals(true);
                    setPromotionAlert({
                        icon: unlockedTrophy.icon || 'Trophy',
                        badgeText: 'Accolade Unlocked',
                        tier: `${unlockedTrophy.current_tier} Tier`,
                        unlockedTier: unlockedTrophy.current_tier,
                        title: unlockedTrophy.title,
                        description: unlockedTrophy.description || 'Verified to your personal dealer record.'
                    });
                    setTimeout(() => {
                        setPromotionAlert(null);
                    }, 2450);
                    setTimeout(() => {
                        setShowConfetti(false);
                        setAnimateMedals(false);
                        setTargetTrophyId(null);
                        setUnlockedTier(null);
                    }, 2500);
                } else if (isTierUpgraded) {
                    const tierUpper = (updated.dealer_tier || '').toUpperCase();
                    const detectedTier = tierUpper.includes('DIAMOND') || tierUpper.includes('PLATINUM') ? 'PLATINUM'
                        : tierUpper.includes('GOLD') ? 'GOLD'
                        : tierUpper.includes('SILVER') ? 'SILVER'
                        : 'BRONZE';

                    setTargetTrophyId('dealer-tier-pill');
                    setUnlockedTier(detectedTier);
                    setShowConfetti(true);
                    setAnimateMedals(true);
                    setPromotionAlert({
                        icon: 'Sparkles',
                        badgeText: 'Desk Promotion',
                        tier: updated.dealer_tier,
                        unlockedTier: detectedTier,
                        title: 'Dealer Tier Promoted!',
                        description: `Your verified track record has advanced to ${updated.dealer_tier}.`
                    });
                    setTimeout(() => {
                        setPromotionAlert(null);
                    }, 2450);
                    setTimeout(() => {
                        setShowConfetti(false);
                        setAnimateMedals(false);
                        setTargetTrophyId(null);
                        setUnlockedTier(null);
                    }, 2500);
                }
                // If no new accolade is unlocked, baseline achievements are cleanly updated without fanfare
            };

            evaluatePromotion();
        }
    }, [resultStatus, timeLeft.status, dealerAchievements, fetchAchievements, authSession]);

    // 6. Pre-fill existing offers
    useEffect(() => {
        if (!rfq) return;

        if (rfq.type === 'TBILL') {
            const isSettlementFixed = rfq.settlement_date_start && (!rfq.settlement_date_end || rfq.settlement_date_start === rfq.settlement_date_end);
            const isMaturityFixed = rfq.maturity_date_start && (!rfq.maturity_date_end || rfq.maturity_date_start === rfq.maturity_date_end);

            if (rfq.offers && rfq.offers.length > 0) {
                setTbillLines(rfq.offers.map((o) => ({
                    settlementDate: o.settlement_date,
                    maturityDate: o.maturity_date,
                    discountRate: o.discount_rate.toString(),
                    maxAmount: o.max_amount.toString()
                })));
                if (rfq.offers[0].notes) {
                    setTraderNotes(rfq.offers[0].notes);
                }
                setSubmitted(true);
            } else {
                let restored = false;
                try {
                    const saved = sessionStorage.getItem(`tbill_draft_${token}`);
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        if (Array.isArray(parsed.lines) && parsed.lines.length > 0) {
                            setTbillLines(parsed.lines);
                            if (parsed.notes) setTraderNotes(parsed.notes);
                            setDraftRestored(true);
                            restored = true;
                        }
                    }
                } catch (e) {
                    // Ignore sessionStorage parsing or access failure
                }

                if (!restored) {
                    setTbillLines([{
                        settlementDate: isSettlementFixed ? rfq.settlement_date_start : '',
                        maturityDate: isMaturityFixed ? rfq.maturity_date_start : '',
                        discountRate: '',
                        maxAmount: ''
                    }]);
                }
            }
        } else if (rfq.type === 'FX_SPOT') {
            if (rfq.legs && rfq.legs.length > 1) {
                const initialQuotes = {};
                let anySubmitted = false;
                rfq.legs.forEach(leg => {
                    const offer = (leg.offers && leg.offers.length > 0) ? leg.offers[0] : null;
                    if (offer) anySubmitted = true;
                    initialQuotes[leg.id] = {
                        price: offer ? String(offer.price) : '',
                        offered_value_date: offer?.offered_value_date || leg.value_date || '',
                        notes: offer?.notes || ''
                    };
                });
                setLegQuotes(initialQuotes);
                if (anySubmitted) setSubmitted(true);
            } else if (rfq.offers && rfq.offers.length > 0) {
                setPrice(rfq.offers[0].price.toString());
                if (rfq.offers[0].offered_value_date) {
                    setOfferedValueDate(rfq.offers[0].offered_value_date);
                } else if (rfq.value_date) {
                    setOfferedValueDate(rfq.value_date);
                }
                if (rfq.offers[0].notes) {
                    setTraderNotes(rfq.offers[0].notes);
                }
                setSubmitted(true);
            } else if (rfq.value_date) {
                setOfferedValueDate(rfq.value_date);
            }
        }
    }, [rfq, token]);

    // 6b. Persist uncommitted T-Bill draft to sessionStorage
    useEffect(() => {
        if (!rfq || rfq.type !== 'TBILL' || submitted || !token) return;
        const hasContent = tbillLines.some(l => l.discountRate || l.maxAmount || l.settlementDate || l.maturityDate) || Boolean(traderNotes);
        if (!hasContent) return;

        try {
            sessionStorage.setItem(`tbill_draft_${token}`, JSON.stringify({
                lines: tbillLines,
                notes: traderNotes,
                updatedAt: Date.now()
            }));
        } catch (e) {
            // Storage quota or strict browser restrictions ignored
        }
    }, [rfq, tbillLines, traderNotes, submitted, token]);

    // 7. Fetch Quotation History
    const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const res = await quotationApi.get(`/api/v1/public-quotation/${token}/history`);
            setHistoryData(res.data.history || []);
        } catch (err) {
            console.error('Failed to fetch quotation history:', err);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleExportHistory = () => {
        if (!historyData || historyData.length === 0) return;

        const headers = [
            'RFQ Reference',
            'Requesting Entity',
            'Product',
            'Direction',
            'Quotation Base',
            'Currency Pair / Instrument',
            'Deal Amount',
            'Value Date',
            'Submitted Rate / Price',
            'Submitted By',
            'Submission Date & Time',
            'Desk Outcome',
            'Trader Notes'
        ];

        const rows = [];
        historyData.forEach(h => {
            if (h.is_multi_leg && h.legs && h.legs.length > 0) {
                h.legs.forEach((leg, lIdx) => {
                    rows.push([
                        `"${(h.ref_no || '')} (Leg ${lIdx + 1})"`,
                        `"${(h.entity_name || rfq?.entity_name || rfq?.customer_name || '').replace(/"/g, '""')}"`,
                        `"${(h.type || 'FX_SPOT')}"`,
                        `"${(leg.direction || h.direction || 'BUY')}"`,
                        `"${(h.quotation_base || 'Execution')}"`,
                        `"${(leg.pair || h.currency_pair || '')}"`,
                        leg.amount || 0,
                        `"${(leg.value_date ? new Date(leg.value_date).toLocaleDateString() : '')}"`,
                        leg.submitted_price !== null && leg.submitted_price !== undefined ? leg.submitted_price : '',
                        `"${(h.submitted_by || '').replace(/"/g, '""')}"`,
                        `"${(h.submitted_at ? new Date(h.submitted_at).toLocaleString() : '')}"`,
                        `"${(leg.is_winner ? 'WON' : (leg.outcome || h.outcome || ''))}"`,
                        `"${(h.notes || '').replace(/"/g, '""')}"`
                    ]);
                });
            } else {
                rows.push([
                    `"${(h.ref_no || '')}"`,
                    `"${(h.entity_name || rfq?.entity_name || rfq?.customer_name || '').replace(/"/g, '""')}"`,
                    `"${(h.type || 'FX_SPOT')}"`,
                    `"${(h.direction || '')}"`,
                    `"${(h.quotation_base || 'Execution')}"`,
                    `"${(h.currency_pair || `${rfq?.buy_currency || ''}/${rfq?.sell_currency || ''}`)}"`,
                    h.amount || 0,
                    `"${(h.value_date ? new Date(h.value_date).toLocaleDateString() : '')}"`,
                    h.best_quote !== null && h.best_quote !== undefined ? h.best_quote : '',
                    `"${(h.submitted_by || '').replace(/"/g, '""')}"`,
                    `"${(h.submitted_at ? new Date(h.submitted_at).toLocaleString() : '')}"`,
                    `"${(h.outcome || '')}"`,
                    `"${(h.notes || '').replace(/"/g, '""')}"`
                ]);
            }
        });

        // Prepend UTF-8 BOM (\uFEFF) so Excel opens UTF-8 text and names flawlessly
        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const safeBankName = ((rfq?.bank_name || 'Desk').replace(/[^a-zA-Z0-9_-]/g, '_'));
        const safeEntity = ((rfq?.entity_name || rfq?.customer_name || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_'));
        const today = new Date().toISOString().slice(0, 10);
        link.setAttribute('href', url);
        link.setAttribute('download', `${safeBankName}_Quotation_History_${safeEntity}_${today}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleTabSwitch = (tab) => {
        setActiveTab(tab);
        if (tab === 'HISTORY' && historyData.length === 0) {
            fetchHistory();
        }
    };

    // 8. OTP Actions (Blind Work Email Verification)
    const handleRequestOtp = async (e) => {
        e?.preventDefault();
        const targetEmail = inputEmail.trim();
        if (!targetEmail) {
            setOtpError('Please enter your official bank desk email address.');
            return;
        }

        setIsRequestingOtp(true);
        setOtpError('');
        try {
            await quotationApi.post('/api/v1/public-quotation/request-otp', {
                token,
                email: targetEmail
            });
            setOtpSent(true);
        } catch (err) {
            setOtpError(err.response?.data?.detail || 'Verification failed. Please ensure your email is registered for this quotation desk.');
        } finally {
            setIsRequestingOtp(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e?.preventDefault();
        const targetEmail = inputEmail.trim();
        if (!otpCode || otpCode.trim().length !== 6) {
            setOtpError('Please enter the 6-digit access code.');
            return;
        }

        setIsVerifyingOtp(true);
        setOtpError('');
        try {
            const res = await quotationApi.post('/api/v1/public-quotation/verify-otp', {
                token,
                email: targetEmail,
                otp_code: otpCode.trim()
            });
            const session = res.data;
            setAuthSession(session);
            sessionStorage.setItem(storageKey, JSON.stringify(session));
            prevAuthEmailRef.current = session.email;
            try {
                const achRes = await quotationApi.get(`/api/v1/public-quotation/${token}/dealer-achievements?email=${encodeURIComponent(session.email)}`);
                if (achRes.data) {
                    setDealerAchievements(achRes.data);
                    prevAchievementsRef.current = achRes.data;
                }
            } catch (e) {}
        } catch (err) {
            setOtpError(err.response?.data?.detail || 'Invalid or expired code.');
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem(storageKey);
        if (emailParam) {
            sessionStorage.removeItem(`quotation_auth_${token}_${emailParam.toLowerCase()}`);
        }
        sessionStorage.removeItem(`quotation_auth_${token}`);
        setAuthSession(null);
        prevAchievementsRef.current = null;
        prevAuthEmailRef.current = null;
        hasTriggeredCelebrationRef.current = false;
        setOtpSent(false);
        setOtpCode('');
        setInputEmail('');
        setApprovalSuccessMsg(null);
    };

    // 8b. Approver Decision Handler
    const handleApproverDecision = async (action) => {
        if (!authSession || authSession.role !== 'APPROVER') return;
        const confirmText = action === 'APPROVE'
            ? 'Are you sure you want to APPROVE bank participation? This will notify your desk dealers to begin quoting.'
            : 'Are you sure you want to DECLINE participation for this quotation?';
        if (!window.confirm(confirmText)) return;

        setIsActioningApproval(true);
        try {
            await quotationApi.post(`/api/v1/public-quotation/${token}/approve`, {
                action,
                session_token: authSession.session_token,
                notes: approvalNotes.trim() || undefined
            });
            if (action === 'DECLINE') {
                setResultStatus(null);
            }
            setApprovalSuccessMsg(action === 'APPROVE' ? 'Bank participation approved! Execution dealers have been notified.' : 'Participation declined.');
            await fetchRfq();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || 'Failed to record approval decision.');
        } finally {
            setIsActioningApproval(false);
        }
    };

    // 8c. Desk Takeover Handler
    const handleTakeoverDesk = async () => {
        if (!authSession) return;
        setIsTakingOver(true);
        try {
            const res = await quotationApi.post(`/api/v1/public-quotation/${token}/desk-takeover`, {
                session_token: getEffectiveSessionToken(),
                email: authSession.email,
                name: authSession.name || authSession.email.split('@')[0],
                role: authSession.role || 'EXECUTION'
            });
            setDeskState(res.data);
            setDeskNotice("⚡ You have taken over desk control. You can now submit binding quotes.");
            setTimeout(() => setDeskNotice(null), 5000);
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to take over desk control.");
        } finally {
            setIsTakingOver(false);
        }
    };

    // 9. Submit Offer
    const executeSubmit = async (priceToSubmit, customTbillLines) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const isTBill = rfq.type === 'TBILL';
            const endpoint = isTBill ? '/api/v1/public-quotation/tbill-offer' : '/api/v1/public-quotation/offer';

            // Value Date cannot precede the quotation window trade date
            if (!isTBill && rfq.allow_alternative_value_date && offeredValueDate) {
                const tradeDateLimit = rfq?.window_start ? rfq.window_start.split('T')[0] : '';
                if (tradeDateLimit && offeredValueDate < tradeDateLimit) {
                    alert(`Proposed Value Date (${formatDate(offeredValueDate)}) cannot be earlier than quotation trade date (${formatDate(tradeDateLimit)}).`);
                    setIsSubmitting(false);
                    return;
                }
            }

            const linesToUse = customTbillLines || tbillLines;

            const body = isTBill
                ? {
                    token,
                    lines: linesToUse.map(l => ({ ...l, discountRate: parseFloat(l.discountRate), maxAmount: parseFloat(l.maxAmount) })),
                    notes: traderNotes.trim() || undefined,
                    session_token: getEffectiveSessionToken(),
                    email: authSession.email
                }
                : {
                    token,
                    price: priceToSubmit !== undefined && priceToSubmit !== null ? priceToSubmit : parseFloat(price),
                    offered_value_date: rfq.allow_alternative_value_date ? (offeredValueDate || rfq.value_date || undefined) : undefined,
                    notes: traderNotes.trim() || undefined,
                    session_token: getEffectiveSessionToken(),
                    email: authSession.email
                };

            const res = await quotationApi.post(endpoint, body);
            setSubmitted(true);
            setFatFingerModal(null);
            try {
                sessionStorage.removeItem(`tbill_draft_${token}`);
            } catch (e) { }
            setDraftRestored(false);

            if (rfq?.is_live_ranking_enabled && res.data?.live_rank) {
                setLiveRank({
                    is_enabled: true,
                    rank: res.data.live_rank.rank,
                    total_quotes: res.data.live_rank.total_quotes,
                    is_leading: res.data.live_rank.is_leading
                });
            }
            if (rfq?.is_live_ranking_enabled && res.data?.ranks_by_leg && Object.keys(res.data.ranks_by_leg).length > 0) {
                setLegLiveRanks(res.data.ranks_by_leg);
            }
            await fetchRfq();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || "Submission failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (isSubmitting) return;
        if (timeLeft.status !== 'OPEN') return;
        if (!authSession) {
            alert('Please authenticate first.');
            return;
        }

        const currentLegBases = Array.from(new Set((rfq?.legs || []).map(l => (l.quotation_base || rfq.quotation_base || 'Execution').toLowerCase())));
        const currentHasExecLegs = rfq?.has_execution_legs ?? (currentLegBases.length === 0 ? (rfq?.quotation_base || '').toLowerCase() !== 'indicative' : currentLegBases.includes('execution'));
        const isIndicative = !currentHasExecLegs;
        const hasExecutionDealers = rfq?.has_execution_dealers ?? true;
        const canApproverExecute = isIndicative || !hasExecutionDealers;

        if (authSession.role === 'VIEW_ONLY') {
            alert('Quotes cannot be submitted in read-only mode.');
            return;
        }
        if (authSession.role === 'APPROVER' && !canApproverExecute) {
            alert('Quotes can only be submitted by authorized Execution dealers.');
            return;
        }

        if (rfq.type === 'FX_SPOT') {
            const val = parseFloat(price);
            const bm = parseFloat(rfq?.cbe_benchmark_rate);

            if (!isNaN(val) && !isNaN(bm) && val > 0 && bm > 0) {
                // Check 1: Inverted / reciprocal rate (e.g. 0.0195 vs 51.28)
                const inv = 1 / val;
                if (Math.abs(inv - bm) / bm < 0.15) {
                    const suggested = (1 / val).toFixed(4);
                    setFatFingerModal({
                        enteredPrice: val,
                        benchmark: bm,
                        type: 'INVERSION',
                        suggestedRate: suggested,
                        title: '⚠️ Possible Inverted Rate Detected',
                        message: `You entered ${val}, which matches the reciprocal (inverted) quotation for ${rfq.buy_currency}/${rfq.sell_currency}. Prevailing CBE market benchmark is ~${bm.toFixed(4)}. Did you mean ${suggested}?`
                    });
                    return;
                }

                // Check 2: 10x Displaced Decimal (e.g. 512.8 or 5.128 vs 51.28)
                const ratio = val / bm;
                if (ratio >= 8 && ratio <= 12) {
                    const suggested = (val / 10).toFixed(4);
                    setFatFingerModal({
                        enteredPrice: val,
                        benchmark: bm,
                        type: 'DECIMAL_10X_HIGH',
                        suggestedRate: suggested,
                        title: '⚠️ Displaced Decimal Point (~10x High)',
                        message: `You entered ${val}, which appears approximately 10x higher than the prevailing CBE reference rate (~${bm.toFixed(4)}). Did you mean ${suggested}?`
                    });
                    return;
                }
                if (ratio >= 0.08 && ratio <= 0.12) {
                    const suggested = (val * 10).toFixed(4);
                    setFatFingerModal({
                        enteredPrice: val,
                        benchmark: bm,
                        type: 'DECIMAL_10X_LOW',
                        suggestedRate: suggested,
                        title: '⚠️ Displaced Decimal Point (~10x Low)',
                        message: `You entered ${val}, which appears approximately 10x lower than the prevailing CBE reference rate (~${bm.toFixed(4)}). Did you mean ${suggested}?`
                    });
                    return;
                }

                // Check 3: Extreme Market Deviation (> 25%)
                const pctDiff = ((val - bm) / bm) * 100;
                if (Math.abs(pctDiff) >= 25) {
                    setFatFingerModal({
                        enteredPrice: val,
                        benchmark: bm,
                        type: 'EXTREME_OUTLIER',
                        suggestedRate: null,
                        title: '⚠️ Significant Rate Deviation Warning',
                        message: `Your quote of ${val} deviates by ${pctDiff > 0 ? '+' : ''}${pctDiff.toFixed(1)}% from the prevailing CBE benchmark (~${bm.toFixed(4)}). Please confirm this is intentional.`
                    });
                    return;
                }
            }

            await executeSubmit(val);
        } else if (rfq.type === 'TBILL') {
            for (let i = 0; i < tbillLines.length; i++) {
                const line = tbillLines[i];
                const rate = parseFloat(line.discountRate);
                const amt = parseFloat(line.maxAmount);

                if (!isNaN(rate)) {
                    // Check 1: 10x high misplaced decimal (e.g., 270% instead of 27%)
                    if (rate >= 45) {
                        const suggested = (rate / 10).toString();
                        const suggestedLines = tbillLines.map((l, idx) => idx === i ? { ...l, discountRate: suggested } : { ...l });
                        setFatFingerModal({
                            isTBill: true,
                            lineIndex: i,
                            enteredPrice: `${rate}%`,
                            suggestedRate: `${suggested}%`,
                            suggestedLines,
                            type: 'TBILL_RATE_10X_HIGH',
                            title: `⚠️ Tranche ${i + 1}: High Displaced Decimal Rate (${rate}%)`,
                            message: `In Tranche ${i + 1}, you entered a discount rate of ${rate}%, which is unusually high for Treasury Bills (typically ~20% - 32%). Did you mean ${suggested}%?`
                        });
                        return;
                    }

                    // Check 2: 10x low misplaced decimal (e.g., 2.7% instead of 27%)
                    if (rate > 0 && rate <= 4) {
                        const suggested = (rate * 10).toString();
                        const suggestedLines = tbillLines.map((l, idx) => idx === i ? { ...l, discountRate: suggested } : { ...l });
                        setFatFingerModal({
                            isTBill: true,
                            lineIndex: i,
                            enteredPrice: `${rate}%`,
                            suggestedRate: `${suggested}%`,
                            suggestedLines,
                            type: 'TBILL_RATE_10X_LOW',
                            title: `⚠️ Tranche ${i + 1}: Low Displaced Decimal Rate (${rate}%)`,
                            message: `In Tranche ${i + 1}, you entered a discount rate of ${rate}%, which appears to be missing a digit or decimal shifted (typically ~20% - 32%). Did you mean ${suggested}%?`
                        });
                        return;
                    }
                }

                // Check 3: Extreme Volume Allocation (> 10x total RFQ amount)
                if (!isNaN(amt) && rfq.amount && !isNaN(parseFloat(rfq.amount))) {
                    const requestedAmt = parseFloat(rfq.amount);
                    if (amt > requestedAmt * 10) {
                        const suggestedAmt = (amt / 10).toString();
                        const suggestedLines = tbillLines.map((l, idx) => idx === i ? { ...l, maxAmount: suggestedAmt } : { ...l });
                        setFatFingerModal({
                            isTBill: true,
                            lineIndex: i,
                            enteredPrice: amt.toLocaleString(),
                            suggestedRate: (amt / 10).toLocaleString(),
                            suggestedLines,
                            type: 'TBILL_AMOUNT_10X_HIGH',
                            title: `⚠️ Tranche ${i + 1}: Unusually Large Allocation`,
                            message: `In Tranche ${i + 1}, you entered an allocation of ${amt.toLocaleString()} ${rfq.currency || 'EGP'}, which is over 10x the requested auction size of ${requestedAmt.toLocaleString()} ${rfq.currency || 'EGP'}. Did you mean ${(amt / 10).toLocaleString()}?`
                        });
                        return;
                    }
                }
            }

            await executeSubmit(null);
        } else {
            await executeSubmit(null);
        }
    };

    const updateLegQuote = (legId, field, value) => {
        setLegQuotes(prev => ({
            ...prev,
            [legId]: {
                ...(prev[legId] || {}),
                [field]: value
            }
        }));
    };

    const handleBatchSubmit = async (e) => {
        e?.preventDefault();
        if (isSubmitting) return;
        if (timeLeft.status !== 'OPEN') return;
        if (!authSession) {
            alert('Please authenticate first.');
            return;
        }

        const currentLegBases = Array.from(new Set((rfq?.legs || []).map(l => (l.quotation_base || rfq.quotation_base || 'Execution').toLowerCase())));
        const currentHasExecLegs = rfq?.has_execution_legs ?? (currentLegBases.length === 0 ? (rfq?.quotation_base || '').toLowerCase() !== 'indicative' : currentLegBases.includes('execution'));
        const isIndicative = !currentHasExecLegs;
        const hasExecutionDealers = rfq?.has_execution_dealers ?? true;
        const canApproverExecute = isIndicative || !hasExecutionDealers;

        if (authSession.role === 'VIEW_ONLY') {
            alert('Quotes cannot be submitted in read-only mode.');
            return;
        }
        if (authSession.role === 'APPROVER' && !canApproverExecute) {
            alert('Quotes can only be submitted by authorized Execution dealers.');
            return;
        }

        const quotesToSubmit = [];
        for (const leg of (rfq.legs || [])) {
            const q = legQuotes[leg.id];
            const p = q?.price ? parseFloat(q.price) : NaN;
            if (isNaN(p) || p <= 0) {
                alert(`Please enter a valid rate for leg ${leg.currency_pair || `${leg.buy_currency}/${leg.sell_currency}`}.`);
                return;
            }

            if (leg.allow_alternative_value_date && q?.offered_value_date) {
                const tradeDateLimit = rfq?.window_start ? rfq.window_start.split('T')[0] : '';
                if (tradeDateLimit && q.offered_value_date < tradeDateLimit) {
                    alert(`Proposed Value Date for ${leg.currency_pair || `${leg.buy_currency}/${leg.sell_currency}`} cannot be earlier than quotation trade date (${formatDate(tradeDateLimit)}).`);
                    return;
                }
            }

            quotesToSubmit.push({
                leg_id: leg.id,
                price: p,
                offered_value_date: leg.allow_alternative_value_date ? (q?.offered_value_date || leg.value_date || undefined) : undefined,
                notes: q?.notes?.trim() || undefined
            });
        }

        // Fat-Finger / Unreasonable Rate Safeguard across all multi-currency legs
        if (rfq.type === 'FX_SPOT') {
            // Check 0: Cross-Leg Swap Inversion Check (Synthetic Cross-Rate Triangulation)
            if ((rfq.legs || []).length > 1) {
                for (let i = 0; i < rfq.legs.length; i++) {
                    for (let j = i + 1; j < rfq.legs.length; j++) {
                        const legA = rfq.legs[i];
                        const legB = rfq.legs[j];
                        const qA = legQuotes[legA.id];
                        const qB = legQuotes[legB.id];
                        const pA = qA?.price ? parseFloat(qA.price) : NaN;
                        const pB = qB?.price ? parseFloat(qB.price) : NaN;
                        const bmA = parseFloat(legA.cbe_benchmark_rate || rfq.cbe_benchmark_rate);
                        const bmB = parseFloat(legB.cbe_benchmark_rate || rfq.cbe_benchmark_rate);

                        if (!isNaN(pA) && !isNaN(pB) && !isNaN(bmA) && !isNaN(bmB) && pA > 0 && pB > 0 && bmA > 0 && bmB > 0) {
                            const isSwapped = (bmA > bmB * 1.02 && pA < pB) || (bmB > bmA * 1.02 && pB < pA);
                            if (isSwapped) {
                                const pairA = legA.currency_pair || `${legA.buy_currency}/${legA.sell_currency}`;
                                const pairB = legB.currency_pair || `${legB.buy_currency}/${legB.sell_currency}`;
                                const impliedCross = (pA / pB).toFixed(4);
                                const benchmarkCross = (bmA / bmB).toFixed(4);

                                setFatFingerModal({
                                    isBatch: true,
                                    type: 'CROSS_LEG_SWAP',
                                    legA,
                                    legB,
                                    priceA: pA,
                                    priceB: pB,
                                    bmA,
                                    bmB,
                                    pairA,
                                    pairB,
                                    allQuotes: quotesToSubmit,
                                    title: `⚠️ Possible Accidental Rate Swap: ${pairA} vs ${pairB}`,
                                    message: `You entered ${pA} for ${pairA} and ${pB} for ${pairB}. Under current CBE benchmarks, ${pairA} (~${bmA.toFixed(4)}) trades ${bmA > bmB ? 'higher' : 'lower'} than ${pairB} (~${bmB.toFixed(4)}). Your entered quotes invert the implied cross-rate to ${impliedCross} (Expected benchmark cross: ~${benchmarkCross}). Did you accidentally swap the prices for these two legs?`
                                });
                                return;
                            }
                        }
                    }
                }
            }

            // Individual Leg Checks: Inversion, 10x Displaced Decimal, Extreme Outlier
            for (let lIdx = 0; lIdx < (rfq.legs || []).length; lIdx++) {
                const leg = rfq.legs[lIdx];
                const q = legQuotes[leg.id];
                const p = q?.price ? parseFloat(q.price) : NaN;
                const bm = parseFloat(leg.cbe_benchmark_rate || rfq.cbe_benchmark_rate);

                if (!isNaN(p) && !isNaN(bm) && p > 0 && bm > 0) {
                    const pair = leg.currency_pair || (leg.buy_currency && leg.sell_currency ? `${leg.buy_currency}/${leg.sell_currency}` : `Leg ${lIdx + 1}`);

                    // Collect other quotes that are valid for Lock & Isolate
                    const validQuotes = quotesToSubmit.filter(item => {
                        if (item.leg_id === leg.id) return false;
                        const otherLeg = (rfq.legs || []).find(l => l.id === item.leg_id);
                        const otherBm = parseFloat(otherLeg?.cbe_benchmark_rate || rfq.cbe_benchmark_rate);
                        if (!isNaN(otherBm) && otherBm > 0) {
                            const ratio = item.price / otherBm;
                            const diff = Math.abs(((item.price - otherBm) / otherBm) * 100);
                            if (ratio >= 8 || ratio <= 0.12 || diff >= 25) return false;
                        }
                        return true;
                    });

                    // Check 1: Inverted / reciprocal rate
                    const inv = 1 / p;
                    if (Math.abs(inv - bm) / bm < 0.15) {
                        const suggested = (1 / p).toFixed(4);
                        setFatFingerModal({
                            isBatch: true,
                            legId: leg.id,
                            enteredPrice: p,
                            benchmark: bm,
                            type: 'INVERSION',
                            suggestedRate: suggested,
                            validQuotes: validQuotes.length > 0 ? validQuotes : null,
                            validCount: validQuotes.length,
                            totalCount: rfq.legs.length,
                            title: `⚠️ Leg #${lIdx + 1} (${pair}): Possible Inverted Rate Detected`,
                            message: `For ${pair}, you entered ${p}, which matches the reciprocal (inverted) quotation. Prevailing CBE market benchmark is ~${bm.toFixed(4)}. Did you mean ${suggested}?`
                        });
                        return;
                    }

                    // Check 2: 10x Displaced Decimal (High)
                    const ratio = p / bm;
                    if (ratio >= 8 && ratio <= 12) {
                        const suggested = (p / 10).toFixed(4);
                        setFatFingerModal({
                            isBatch: true,
                            legId: leg.id,
                            enteredPrice: p,
                            benchmark: bm,
                            type: 'DECIMAL_10X_HIGH',
                            suggestedRate: suggested,
                            validQuotes: validQuotes.length > 0 ? validQuotes : null,
                            validCount: validQuotes.length,
                            totalCount: rfq.legs.length,
                            title: `⚠️ Leg #${lIdx + 1} (${pair}): Displaced Decimal Point (~10x High)`,
                            message: `For ${pair}, you entered ${p}, which appears approximately 10x higher than prevailing CBE reference rate (~${bm.toFixed(4)}). Did you mean ${suggested}?`
                        });
                        return;
                    }

                    // Check 2b: 10x Displaced Decimal (Low)
                    if (ratio >= 0.08 && ratio <= 0.12) {
                        const suggested = (p * 10).toFixed(4);
                        setFatFingerModal({
                            isBatch: true,
                            legId: leg.id,
                            enteredPrice: p,
                            benchmark: bm,
                            type: 'DECIMAL_10X_LOW',
                            suggestedRate: suggested,
                            validQuotes: validQuotes.length > 0 ? validQuotes : null,
                            validCount: validQuotes.length,
                            totalCount: rfq.legs.length,
                            title: `⚠️ Leg #${lIdx + 1} (${pair}): Displaced Decimal Point (~10x Low)`,
                            message: `For ${pair}, you entered ${p}, which appears approximately 10x lower than prevailing CBE reference rate (~${bm.toFixed(4)}). Did you mean ${suggested}?`
                        });
                        return;
                    }

                    // Check 3: Extreme Market Deviation (> 25%)
                    const pctDiff = ((p - bm) / bm) * 100;
                    if (Math.abs(pctDiff) >= 25) {
                        setFatFingerModal({
                            isBatch: true,
                            legId: leg.id,
                            enteredPrice: p,
                            benchmark: bm,
                            type: 'EXTREME_OUTLIER',
                            suggestedRate: null,
                            validQuotes: validQuotes.length > 0 ? validQuotes : null,
                            validCount: validQuotes.length,
                            totalCount: rfq.legs.length,
                            title: `⚠️ Leg #${lIdx + 1} (${pair}): Significant Rate Deviation Warning`,
                            message: `Your quote of ${p} for ${pair} deviates by ${pctDiff > 0 ? '+' : ''}${pctDiff.toFixed(1)}% from prevailing CBE benchmark (~${bm.toFixed(4)}). Please confirm this is intentional.`
                        });
                        return;
                    }
                }
            }
        }

        await executeBatchSubmit(quotesToSubmit);
    };

    const executeBatchSubmit = async (overrideQuotes = null) => {
        let quotesToSubmit = overrideQuotes;
        if (!quotesToSubmit) {
            quotesToSubmit = [];
            for (const leg of (rfq.legs || [])) {
                const q = legQuotes[leg.id];
                const p = q?.price ? parseFloat(q.price) : NaN;
                quotesToSubmit.push({
                    leg_id: leg.id,
                    price: p,
                    offered_value_date: leg.allow_alternative_value_date ? (q?.offered_value_date || leg.value_date || undefined) : undefined,
                    notes: q?.notes?.trim() || undefined
                });
            }
        }

        setIsSubmitting(true);
        setFatFingerModal(null);
        try {
            const res = await quotationApi.post('/api/v1/public-quotation/offers-batch', {
                token,
                quotes: quotesToSubmit,
                session_token: getEffectiveSessionToken(),
                email: authSession.email,
                notes: traderNotes.trim() || undefined
            });
            setSubmitted(true);
            if (rfq?.is_live_ranking_enabled && res.data?.ranks_by_leg) {
                setLegLiveRanks(res.data.ranks_by_leg);
            }
            await fetchRfq();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || "Batch submission failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const addTbillLine = () => {
        const isSettlementFixed = rfq.settlement_date_start && (!rfq.settlement_date_end || rfq.settlement_date_start === rfq.settlement_date_end);
        const isMaturityFixed = rfq.maturity_date_start && (!rfq.maturity_date_end || rfq.maturity_date_start === rfq.maturity_date_end);

        setTbillLines([...tbillLines, {
            settlementDate: isSettlementFixed ? rfq.settlement_date_start : '',
            maturityDate: isMaturityFixed ? rfq.maturity_date_start : '',
            discountRate: '',
            maxAmount: ''
        }]);
    };

    const removeTbillLine = (index) => {
        setTbillLines(tbillLines.filter((_, i) => i !== index));
    };

    const updateTbillLine = (index, field, value) => {
        const newLines = [...tbillLines];
        newLines[index] = { ...newLines[index], [field]: value };
        setTbillLines(newLines);
    };

    if (error) {
        const isCancelled = typeof error === 'object' && error?.isCancelled;
        const isExpired = typeof error === 'object' && error?.isExpired;
        const isPendingApproval = typeof error === 'object' && error?.isPendingApproval;
        const isInvalid = typeof error === 'object' && error?.isInvalidToken;
        const isNetwork = typeof error === 'object' && error?.isNetworkError;
        const rawMessage = typeof error === 'object' ? error?.message : error;

        let icon;
        let title = "Access Denied";
        let badge = { text: "Access Restricted", bg: "bg-rose-50 text-rose-700 border-rose-200" };
        let description = rawMessage || "This quotation link is not accessible.";
        let showRetry = false;

        if (isCancelled) {
            icon = (
                <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4 text-rose-600 shadow-sm">
                    <Ban size={36} />
                </div>
            );
            badge = { text: "Quotation Cancelled", bg: "bg-rose-50 text-rose-800 border-rose-300" };
            title = "Quotation Request Cancelled";
            description = "This Request for Quotation (RFQ) was officially cancelled and withdrawn by corporate treasury. No pricing or participation is required for this request.";
            showRetry = false;
        } else if (isExpired) {
            icon = (
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4 text-amber-600 shadow-sm">
                    <Clock size={36} />
                </div>
            );
            badge = { text: "Link Expired", bg: "bg-amber-50 text-amber-800 border-amber-300" };
            title = "Quotation Link Expired";
            description = "The participation window and secure token validity for this request for quotation have expired. In accordance with treasury governance and market integrity rules, pricing can no longer be viewed or submitted via this link.";
            showRetry = false;
        } else if (isPendingApproval) {
            icon = (
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-4 text-blue-600 shadow-sm">
                    <ShieldAlert size={36} />
                </div>
            );
            badge = { text: "Pending Approval", bg: "bg-blue-50 text-blue-800 border-blue-300" };
            title = "Awaiting Corporate Approval";
            description = "This quotation has been drafted but is currently awaiting internal approval by corporate treasury. The quotation link will activate automatically once approved.";
            showRetry = true;
        } else if (isInvalid) {
            icon = (
                <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4 text-slate-600 shadow-sm">
                    <FileQuestion size={36} />
                </div>
            );
            badge = { text: "Invalid Link", bg: "bg-slate-100 text-slate-700 border-slate-300" };
            title = "Quotation Link Not Found";
            description = "This quotation link is invalid or has been decommissioned. Please ensure you clicked the full URL provided in your invitation email.";
            showRetry = false;
        } else if (isNetwork) {
            icon = (
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4 text-amber-600 shadow-sm">
                    <WifiOff size={36} />
                </div>
            );
            badge = { text: "Connection Error", bg: "bg-amber-50 text-amber-800 border-amber-300" };
            title = "Connection Failed";
            description = "Unable to connect to the treasury portal. This may be due to a firewall, proxy filter, or network interruption.";
            showRetry = true;
        } else {
            icon = (
                <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4 text-rose-600 shadow-sm">
                    <AlertCircle size={36} />
                </div>
            );
        }

        return (
            <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-slate-50">
                <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200/80 text-center max-w-lg w-full animate-fade-in-up">
                    {icon}
                    <div className="mb-3">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border shadow-xs ${badge.bg}`}>
                            {badge.text}
                        </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold mb-3 text-slate-900">{title}</h2>
                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">{description}</p>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 text-left mb-6 space-y-1">
                        <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <Landmark size={14} className="text-slate-500" />
                            <span>Grow Treasury Portal</span>
                        </div>
                        <p>
                            {isCancelled
                                ? "This RFQ was officially withdrawn and cancelled by the corporate client. No further quotation submissions or actions are required."
                                : isExpired
                                    ? "If you are an authorized bank partner and require an extended or refreshed quotation window, please contact the issuing corporate treasury officer directly."
                                    : "For questions regarding this quotation, please contact the issuing corporate treasury desk."}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        {showRetry && (
                            <button
                                onClick={() => fetchRfq()}
                                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition shadow flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={15} />
                                <span>Check Status Again</span>
                            </button>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition border border-slate-200 flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={15} />
                            <span>Refresh Page</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!rfq) return <div className="p-8 text-center text-gray-500 animate-pulse mt-20">Loading Secure Quotation Link...</div>;

    const legBases = Array.from(new Set((rfq?.legs || []).map(l => (l.quotation_base || rfq.quotation_base || 'Execution').toLowerCase())));
    const isMixed = rfq?.is_mixed || (legBases.length > 1 && legBases.includes('execution') && legBases.includes('indicative'));
    const hasExecutionLegs = rfq?.has_execution_legs ?? (legBases.length === 0 ? (rfq?.quotation_base || '').toLowerCase() !== 'indicative' : legBases.includes('execution'));
    const isIndicative = Boolean(rfq?.is_all_indicative || (!hasExecutionLegs && (legBases.length <= 1 ? (legBases[0] || (rfq?.quotation_base || '')).toLowerCase() === 'indicative' : false)) || (rfq?.quotation_base || '').toLowerCase() === 'indicative');
    const hasExecutionDealers = rfq?.has_execution_dealers ?? true;
    const canApproverExecute = !hasExecutionDealers;

    const isApprover = authSession?.role === 'APPROVER';
    const isApproverViewer = isApprover && !canApproverExecute;
    const isViewOnly = authSession?.role === 'VIEW_ONLY';
    const isReadOnlyViewer = isViewOnly || isApproverViewer;
    const isSpectator = !!(timeLeft.status === 'OPEN' && deskState && !deskState.is_active_trader && !isReadOnlyViewer && (authSession?.role === 'EXECUTION' || canApproverExecute) && deskState.active_trader_email);

    // Real-time detection of cross-rate inversion / accidental price swap
    const crossInversion = (() => {
        if (!rfq?.legs || rfq.legs.length < 2 || rfq.type !== 'FX_SPOT') return null;
        for (let i = 0; i < rfq.legs.length; i++) {
            for (let j = i + 1; j < rfq.legs.length; j++) {
                const legA = rfq.legs[i];
                const legB = rfq.legs[j];
                const pA = parseFloat(legQuotes[legA.id]?.price);
                const pB = parseFloat(legQuotes[legB.id]?.price);
                const bmA = parseFloat(legA.cbe_benchmark_rate || rfq.cbe_benchmark_rate);
                const bmB = parseFloat(legB.cbe_benchmark_rate || rfq.cbe_benchmark_rate);
                if (isNaN(pA) || isNaN(pB) || isNaN(bmA) || isNaN(bmB) || pA <= 0 || pB <= 0 || bmA <= 0 || bmB <= 0) {
                    continue;
                }
                const pairA = legA.currency_pair || `${legA.buy_currency}/${legA.sell_currency}`;
                const pairB = legB.currency_pair || `${legB.buy_currency}/${legB.sell_currency}`;

                const isSwapped = (bmA > bmB * 1.02 && pA < pB) || (bmB > bmA * 1.02 && pB < pA);
                if (isSwapped) {
                    return { legA, legB, pairA, pairB, pA, pB, bmA, bmB };
                }
            }
        }
        return null;
    })();

    return (
        <div className="relative min-h-screen bg-slate-100/60">
            {/* 1. Security Gate Modal Overlay (Displayed whenever unauthenticated) */}
            {!authSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-2xl p-4 sm:p-6 overflow-y-auto animate-fade-in">
                    <div className="max-w-md w-full p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-slate-900 to-gray-950 text-white rounded-3xl shadow-2xl border border-slate-700/80 relative animate-fade-in-up">
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-4 border border-blue-500/30 shadow-lg shadow-blue-500/10">
                                <KeyRound size={24} />
                            </div>

                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2">
                                <Landmark size={13} className="text-blue-400" />
                                {rfq.bank_name} • Treasury Desk
                            </div>

                            {/* Bank Desk Verified Milestone Tier Badge */}
                            {dealerAchievements?.dealer_tier && (
                                <div className="flex items-center justify-center gap-2 mb-3">
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${dealerAchievements.dealer_tier.includes('Diamond')
                                            ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 shadow-cyan-900/30'
                                            : dealerAchievements.dealer_tier.includes('Gold')
                                                ? 'bg-amber-950/80 text-amber-300 border-amber-500/40 shadow-amber-900/30'
                                                : dealerAchievements.dealer_tier.includes('Silver')
                                                    ? 'bg-slate-800/90 text-slate-200 border-slate-600 shadow-slate-900/30'
                                                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                                        }`}>
                                        <Shield size={13} className={
                                            dealerAchievements.dealer_tier.includes('Diamond') ? 'text-cyan-400' :
                                                dealerAchievements.dealer_tier.includes('Gold') ? 'text-amber-400' :
                                                    dealerAchievements.dealer_tier.includes('Silver') ? 'text-slate-300' : 'text-emerald-400'
                                        } />
                                        <span>{dealerAchievements.dealer_tier}</span>
                                        <span className="text-[10px] opacity-75 font-normal">• {dealerAchievements.dealer_perk}</span>
                                    </div>
                                </div>
                            )}

                            <h3 className="text-lg sm:text-xl font-bold tracking-tight mb-2 text-white">
                                Trader Identity Verification
                            </h3>
                            <p className="text-slate-300 text-xs mb-6 leading-relaxed">
                                Enter your registered work email for <strong>{rfq.bank_name}</strong> to receive a secure 6-digit access code and unlock deal specifications.
                            </p>

                            {!otpSent ? (
                                <form onSubmit={handleRequestOtp} className="space-y-4">
                                    <div className="text-left">
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                                            <Mail size={13} className="text-blue-400" />
                                            Registered Desk Email
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            placeholder="e.g. name@bank.com"
                                            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium placeholder:text-slate-500"
                                            value={inputEmail}
                                            onChange={(e) => setInputEmail(e.target.value)}
                                            autoFocus
                                        />
                                    </div>

                                    {otpError && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl text-left flex items-center gap-2">
                                            <AlertCircle size={14} className="shrink-0" />
                                            <span>{otpError}</span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isRequestingOtp || !inputEmail.trim()}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                                    >
                                        {isRequestingOtp ? 'Sending Access Code...' : 'Send Access Code'}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleVerifyOtp} className="space-y-4">
                                    <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700 text-left">
                                        <p className="text-xs text-slate-300">
                                            Access code sent to <strong className="text-white font-mono">{inputEmail}</strong>.
                                        </p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Check your inbox or click the 1-click magic link in the email.</p>
                                    </div>

                                    <div className="text-left">
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                            Enter 6-Digit Code
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            maxLength={6}
                                            placeholder="123456"
                                            autoFocus
                                            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-center text-xl font-mono tracking-widest outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value)}
                                        />
                                        <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1.5 px-0.5">
                                            <span>Didn't receive or code expired?</span>
                                            <button
                                                type="button"
                                                onClick={handleRequestOtp}
                                                disabled={isRequestingOtp}
                                                className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer disabled:opacity-50"
                                            >
                                                {isRequestingOtp ? 'Sending...' : 'Resend Code'}
                                            </button>
                                        </div>
                                    </div>

                                    {otpError && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl text-left flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle size={14} className="shrink-0 text-red-400" />
                                                <span className="font-medium leading-relaxed">{otpError}</span>
                                            </div>
                                            {(otpError.toLowerCase().includes('request a new') || otpError.toLowerCase().includes('locked') || otpError.toLowerCase().includes('no longer valid') || otpError.toLowerCase().includes('expired')) && (
                                                <button
                                                    type="button"
                                                    onClick={handleRequestOtp}
                                                    disabled={isRequestingOtp}
                                                    className="self-start text-[11px] font-bold text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors cursor-pointer"
                                                >
                                                    {isRequestingOtp ? 'Sending New Code...' : '👉 Request New Verification Code Now'}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { setOtpSent(false); setOtpError(''); setOtpCode(''); }}
                                            className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                                        >
                                            Change Email
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isVerifyingOtp || otpCode.length !== 6}
                                            className="w-2/3 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                                        >
                                            {isVerifyingOtp ? 'Verifying...' : 'Unlock Workspace'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Accolade Promotion Notification Toast & Confetti (Only when authenticated) */}
            {authSession && (
                <>
                    <TradeAccoladePromotionToast
                        alert={promotionAlert}
                        targetTrophyId={targetTrophyId}
                        onClose={() => setPromotionAlert(null)}
                    />
                    {showConfetti && (
                        <TradeExecutionConfetti 
                            durationMs={2500} 
                            targetTrophyId={targetTrophyId} 
                            targetTier={unlockedTier || promotionAlert?.unlockedTier} 
                        />
                    )}
                </>
            )}

            {/* 2. Main Portal Workspace (Blurred & locked until verified) */}
            <div className={`w-full max-w-[1400px] mx-auto p-4 sm:p-6 font-sans transition-all duration-500 ${!authSession ? 'filter blur-2xl opacity-10 pointer-events-none select-none overflow-hidden max-h-[85vh]' : ''
                }`}>

                {/* Top Navigation & Brand Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 bg-slate-950 text-white rounded-2xl flex items-center justify-center shadow-md shrink-0">
                            <Landmark size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{rfq.bank_name}</h1>

                                {/* Institutional Bank Desk Standing Badge (Always visible, before & after login) */}
                                {(dealerAchievements?.bank_desk?.desk_tier || (!authSession && dealerAchievements?.dealer_tier)) && (() => {
                                    const deskTier = dealerAchievements?.bank_desk?.desk_tier || dealerAchievements?.dealer_tier;
                                    const deskPerk = dealerAchievements?.bank_desk?.desk_perk || dealerAchievements?.dealer_perk;
                                    const deskWon = dealerAchievements?.bank_desk?.personal_bests?.total_deals_won ?? dealerAchievements?.personal_bests?.total_deals_won ?? 0;
                                    const deskVolume = dealerAchievements?.bank_desk?.personal_bests?.total_volume_won_usd ?? dealerAchievements?.personal_bests?.total_volume_won_usd ?? 0;
                                    const deskTrophies = dealerAchievements?.bank_desk?.trophies || (!authSession ? dealerAchievements?.trophies : []) || [];
                                    const earnedDeskBadges = deskTrophies.filter(t => t.current_tier && t.current_tier !== 'NONE');

                                    const tierColorCls = deskTier.includes('Diamond')
                                        ? 'bg-gradient-to-r from-cyan-100 via-white to-cyan-200 text-cyan-950 border-cyan-400/80 shadow-2xs'
                                        : deskTier.includes('Gold')
                                            ? 'bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-200 text-amber-950 border-amber-400/90 shadow-2xs shadow-amber-300/30 ring-1 ring-yellow-200/50'
                                            : deskTier.includes('Silver')
                                                ? 'bg-gradient-to-r from-slate-100 via-white to-slate-200 text-slate-800 border-slate-400/80 shadow-2xs'
                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                                    return (
                                        <div id="bank-desk-header-badge" className="relative group cursor-pointer">
                                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide border shadow-2xs transition-all hover:scale-105 ${tierColorCls}`}>
                                                <Shield size={13} className={
                                                    deskTier.includes('Diamond') ? 'text-cyan-600 fill-cyan-400/30' :
                                                        deskTier.includes('Gold') ? 'text-amber-600 fill-amber-400/40' :
                                                            deskTier.includes('Silver') ? 'text-slate-600' : 'text-emerald-500'
                                                } />
                                                <span>{deskTier}</span>
                                            </div>

                                            {/* Tooltip popping downward */}
                                            <div className="absolute top-full left-0 mt-2 hidden group-hover:flex flex-col w-72 p-3.5 bg-slate-950 text-white rounded-xl shadow-2xl border border-slate-800 text-left z-50 pointer-events-none">
                                                <div className="absolute -top-1.5 left-4 w-3 h-3 bg-slate-950 border-t border-l border-slate-800 rotate-45" />
                                                <div className="flex items-center justify-between pb-1 border-b border-slate-800 mb-1.5">
                                                    <span className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                                                        <Landmark size={13} className="text-amber-400" />
                                                        <span>{rfq.bank_name} Standing</span>
                                                    </span>
                                                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">VERIFIED</span>
                                                </div>
                                                <div className="text-[11px] text-slate-300 mb-2">
                                                    {deskPerk || 'Official institutional counterparty tier based on verified interbank activity.'}
                                                </div>
                                                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                                                    <div>
                                                        <span className="text-slate-500 block">Deals Won:</span>
                                                        <span className="font-mono text-slate-200 font-bold">{deskWon} firm executions</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500 block">Total Volume:</span>
                                                        <span className="font-mono text-slate-200 font-bold">${Number(deskVolume).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                {earnedDeskBadges.length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-slate-800/80">
                                                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Earned Desk Badges:</span>
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            {earnedDeskBadges.map(b => {
                                                                const tierBadgeStyle = b.current_tier === 'PLATINUM'
                                                                    ? 'text-cyan-300 border-cyan-500/40 bg-cyan-950/60'
                                                                    : b.current_tier === 'GOLD'
                                                                        ? 'text-amber-300 border-amber-500/50 bg-amber-950/70 font-semibold shadow-xs shadow-amber-500/10'
                                                                        : b.current_tier === 'SILVER'
                                                                            ? 'text-slate-200 border-slate-500/50 bg-slate-800'
                                                                            : 'text-amber-400/80 border-amber-700/40 bg-amber-950/40';
                                                                return (
                                                                    <span key={b.id} className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${tierBadgeStyle}`}>
                                                                        {b.title} ({b.current_tier})
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                            <p className="text-gray-400 text-xs mt-0.5">Counterparty Quotation Bidding & Execution System</p>
                        </div>
                    </div>

                    {/* View Tabs & Countdown */}
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
                        <div className="flex items-center gap-3 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold shadow-2xs">
                            <button
                                type="button"
                                onClick={() => handleTabSwitch('LIVE')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap outline-none focus:outline-none focus:ring-0 ${activeTab === 'LIVE'
                                        ? 'bg-white text-gray-900 shadow-xs border border-slate-200/80 font-black'
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-slate-200/50 font-semibold'
                                    }`}
                                style={{ outline: 'none' }}
                            >
                                <Zap size={14} className={activeTab === 'LIVE' ? 'text-amber-500 fill-amber-500' : 'text-slate-400'} />
                                <span>Live RFQ</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTabSwitch('HISTORY')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap outline-none focus:outline-none focus:ring-0 ${activeTab === 'HISTORY'
                                        ? 'bg-white text-gray-900 shadow-xs border border-slate-200/80 font-black'
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-slate-200/50 font-semibold'
                                    }`}
                                style={{ outline: 'none' }}
                            >
                                <History size={14} className={activeTab === 'HISTORY' ? 'text-blue-600' : 'text-slate-400'} />
                                <span>Desk History</span>
                            </button>
                        </div>

                        {/* Institutional Audio Alerts Toggle */}
                        <button
                            type="button"
                            onClick={handleToggleSound}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 ${soundEnabled
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                                }`}
                            title={soundEnabled ? "Audio cues active: Trading Desk Chimes (Click to mute)" : "Audio cues muted (Click to enable)"}
                        >
                            {soundEnabled ? <Volume2 size={13} className="text-emerald-600" /> : <VolumeX size={13} className="text-slate-400" />}
                            <span className="hidden sm:inline">{soundEnabled ? 'Alerts On' : 'Muted'}</span>
                        </button>

                        {/* Executive Countdown Timer Badge */}
                        <div className="shrink-0">
                            {timeLeft.status === 'PRE' ? (
                                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-amber-300/80 bg-gradient-to-r from-amber-50 via-white to-amber-50/70 shadow-xs">
                                    <div className="flex items-center gap-1.5 text-amber-700">
                                        <Clock size={14} className="text-amber-600 shrink-0" />
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 whitespace-nowrap">
                                            Starts in
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 font-mono text-xs sm:text-sm font-bold text-gray-900">
                                        {timeLeft.days > 0 && (
                                            <span className="flex items-baseline bg-white px-1.5 py-0.5 rounded border border-amber-200/80 shadow-2xs">
                                                <span>{timeLeft.days}</span>
                                                <span className="text-[9px] font-semibold text-gray-500 ml-0.5">d</span>
                                            </span>
                                        )}
                                        {(timeLeft.days > 0 || timeLeft.hours > 0) && (
                                            <span className="flex items-baseline bg-white px-1.5 py-0.5 rounded border border-amber-200/80 shadow-2xs">
                                                <span>{String(timeLeft.hours ?? 0).padStart(2, '0')}</span>
                                                <span className="text-[9px] font-semibold text-gray-500 ml-0.5">h</span>
                                            </span>
                                        )}
                                        <span className="flex items-baseline bg-white px-1.5 py-0.5 rounded border border-amber-200/80 shadow-2xs">
                                            <span>{String(timeLeft.mins ?? 0).padStart(2, '0')}</span>
                                            <span className="text-[9px] font-semibold text-gray-500 ml-0.5">m</span>
                                        </span>
                                        <span className="flex items-baseline bg-white px-1.5 py-0.5 rounded border border-amber-200/80 shadow-2xs text-amber-800">
                                            <span>{String(timeLeft.secs ?? 0).padStart(2, '0')}</span>
                                            <span className="text-[9px] font-semibold text-amber-600 ml-0.5">s</span>
                                        </span>
                                    </div>
                                </div>
                            ) : timeLeft.status === 'OPEN' ? (
                                timeLeft.secondsRemaining !== null && timeLeft.secondsRemaining <= 5 ? (
                                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-rose-400 bg-rose-50 text-rose-800 shadow-xs ring-2 ring-rose-400/50 animate-pulse">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                                        </span>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 whitespace-nowrap">Closing Now</span>
                                        <span className="font-mono text-xs sm:text-sm font-black text-rose-950 bg-white px-1.5 py-0.5 rounded border border-rose-200">
                                            {timeLeft.secondsRemaining}s!
                                        </span>
                                    </div>
                                ) : timeLeft.secondsRemaining !== null && timeLeft.secondsRemaining <= 30 ? (
                                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-amber-400 bg-amber-50 text-amber-800 shadow-xs ring-2 ring-amber-400/40 animate-pulse">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600"></span>
                                        </span>
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 whitespace-nowrap">Closing in</span>
                                        <span className="font-mono text-xs sm:text-sm font-black text-amber-950 bg-white px-1.5 py-0.5 rounded border border-amber-200">
                                            {timeLeft.secondsRemaining}s
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 text-emerald-800 shadow-xs animate-pulse">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                                        </span>
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 whitespace-nowrap">Live • Closes in</span>
                                        <div className="flex items-center gap-1 font-mono text-xs sm:text-sm font-bold text-emerald-950">
                                            {timeLeft.hours > 0 && (
                                                <span className="flex items-baseline bg-white px-1.5 py-0.5 rounded border border-emerald-200 shadow-2xs">
                                                    <span>{String(timeLeft.hours).padStart(2, '0')}</span>
                                                    <span className="text-[9px] font-semibold text-emerald-600 ml-0.5">h</span>
                                                </span>
                                            )}
                                            <span className="flex items-baseline bg-white px-1.5 py-0.5 rounded border border-emerald-200 shadow-2xs">
                                                <span>{String(timeLeft.mins ?? 0).padStart(2, '0')}</span>
                                                <span className="text-[9px] font-semibold text-emerald-600 ml-0.5">m</span>
                                            </span>
                                            <span className="flex items-baseline bg-white px-1.5 py-0.5 rounded border border-emerald-200 shadow-2xs text-emerald-700">
                                                <span>{String(timeLeft.secs ?? 0).padStart(2, '0')}</span>
                                                <span className="text-[9px] font-semibold text-emerald-600 ml-0.5">s</span>
                                            </span>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-xs font-semibold">
                                    <Lock size={13} className="text-slate-400" />
                                    <span>Window Closed</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Authenticated User Status Bar */}
                {authSession && (() => {
                    const activeSeason = dealerAchievements?.active_seasons?.[0];

                    const renderSantaHat = () => (
                        <svg className="absolute -top-3.5 -right-2 w-6 h-6 pointer-events-none drop-shadow-md z-30 transform rotate-12" viewBox="0 0 32 32" fill="none">
                            <path d="M6 24 C10 14 18 7 24 5 C25 11 26 18 24 24 Z" fill="#DC2626" />
                            <path d="M19 8 C23 13 24 19 24 24 C21 24 19 22 17 19 Z" fill="#991B1B" opacity="0.6" />
                            <rect x="4" y="22" width="22" height="6" rx="3" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.75" />
                            <circle cx="25" cy="5" r="3.5" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.75" />
                        </svg>
                    );

                    const renderEasterBunny = () => (
                        <svg className="absolute -top-4 -right-2.5 w-7 h-7 pointer-events-none drop-shadow-md z-30 animate-bunny-ear" viewBox="0 0 32 32" fill="none">
                            {/* Painted Easter Egg at base */}
                            <ellipse cx="23" cy="22" rx="4.5" ry="5.5" fill="#FEF08A" stroke="#CA8A04" strokeWidth="0.75" transform="rotate(18 23 22)" />
                            <path d="M19 21 Q23 19 27 21" stroke="#EC4899" strokeWidth="0.8" fill="none" />
                            <path d="M19 24 Q23 22 27 24" stroke="#38BDF8" strokeWidth="0.8" fill="none" />
                            {/* Bunny Head */}
                            <circle cx="12" cy="18" r="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.75" />
                            <path d="M9 13 C7 7 7 2 9 1 C11 1 12 6 11 13 Z" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.75" />
                            <path d="M9 11 C8 7 8 4 9 3 C10 3 11 7 10 11 Z" fill="#F472B6" />
                            <path d="M14 13 C14 7 16 2 18 2 C20 3 18 8 16 13 Z" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.75" />
                            <path d="M15 11 C15 7 16 4 18 4 C19 5 18 8 16 11 Z" fill="#F472B6" />
                            <circle cx="10" cy="17" r="0.8" fill="#1E293B" />
                            <circle cx="14" cy="17" r="0.8" fill="#1E293B" />
                            <circle cx="12" cy="19" r="0.7" fill="#F472B6" />
                            <line x1="7" y1="18" x2="5" y2="17.5" stroke="#CBD5E1" strokeWidth="0.5" />
                            <line x1="7" y1="19.5" x2="5" y2="20" stroke="#CBD5E1" strokeWidth="0.5" />
                            <line x1="17" y1="18" x2="19" y2="17.5" stroke="#CBD5E1" strokeWidth="0.5" />
                            <line x1="17" y1="19.5" x2="19" y2="20" stroke="#CBD5E1" strokeWidth="0.5" />
                        </svg>
                    );

                    const renderEidCrescent = () => (
                        <svg className="absolute -top-3.5 -right-2.5 w-7 h-7 pointer-events-none drop-shadow-md z-30" viewBox="0 0 32 32" fill="none">
                            <path d="M21 5 C13 7 9 15 13 24 C10 21 9 15 13 10 C15 7 18 5 21 5 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="0.75" />
                            <path d="M21 11 L22 14 L25 14 L22.5 16 L23.5 19 L21 17 L18.5 19 L19.5 16 L17 14 L20 14 Z" fill="#FDE047" stroke="#D97706" strokeWidth="0.5" />
                            <circle cx="9" cy="8" r="1" fill="#F59E0B" />
                            <circle cx="26" cy="18" r="1.2" fill="#F59E0B" />
                        </svg>
                    );

                    const renderRamadanFanous = () => (
                        <div className="absolute -top-2 left-6 pointer-events-none z-30 animate-lantern-swing">
                            <svg className="w-6 h-12 drop-shadow-md" viewBox="0 0 24 48" fill="none">
                                <line x1="12" y1="0" x2="12" y2="12" stroke="#F59E0B" strokeWidth="1" strokeDasharray="1.5 1.5" />
                                <circle cx="12" cy="13" r="2" stroke="#D97706" strokeWidth="1.5" fill="none" />
                                <path d="M7 18 L12 15 L17 18 L19 21 L5 21 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="0.75" />
                                <path d="M5 21 L8 34 L16 34 L19 21 Z" fill="#FEF3C7" stroke="#D97706" strokeWidth="0.75" opacity="0.92" />
                                <circle cx="12" cy="27" r="3" fill="#F59E0B" />
                                <circle cx="12" cy="27" r="1.5" fill="#EF4444" />
                                <path d="M7 34 L5 38 L19 38 L17 34 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="0.75" />
                                <rect x="8" y="38" width="8" height="2" rx="1" fill="#D97706" />
                            </svg>
                        </div>
                    );

                    const renderSnowfall = () => (
                        <div className="absolute inset-x-0 top-0 h-10 overflow-hidden pointer-events-none z-10">
                            <span className="absolute top-0 left-[8%] text-sky-400/80 text-xs animate-snow-1">❄</span>
                            <span className="absolute top-0 left-[24%] text-sky-300/90 text-[10px] animate-snow-2">❅</span>
                            <span className="absolute top-0 left-[48%] text-sky-400/75 text-sm animate-snow-3">❄</span>
                            <span className="absolute top-0 left-[72%] text-sky-300/85 text-[11px] animate-snow-4">❅</span>
                            <span className="absolute top-0 left-[90%] text-sky-400/80 text-xs animate-snow-5">❄</span>
                        </div>
                    );

                    return (
                        <div className="relative z-30 mb-4 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 animate-fade-in">
                            {/* Festive Seasonal Ornaments (Clean, natural, zero artificial border lines) */}
                            {activeSeason?.season_id === 'YEAR_END_HOLIDAYS' && renderSnowfall()}
                            {activeSeason?.season_id === 'RAMADAN_TWILIGHT' && renderRamadanFanous()}

                            {/* Left Side: Dealer Identity, Role & Desk Status */}
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className={`p-2 rounded-xl ${authSession.role === 'EXECUTION'
                                            ? 'bg-emerald-50 text-emerald-600'
                                            : authSession.role === 'APPROVER'
                                                ? 'bg-amber-50 text-amber-600'
                                                : 'bg-blue-50 text-blue-600'
                                        }`}>
                                        {authSession.role === 'EXECUTION' ? <UserCheck size={18} /> : authSession.role === 'APPROVER' ? <Shield size={18} /> : <Eye size={18} />}
                                    </div>
                                    {/* Festive Avatar Headgear & Ornaments */}
                                    {activeSeason?.season_id === 'YEAR_END_HOLIDAYS' && renderSantaHat()}
                                    {activeSeason?.season_id === 'EASTER_SHAM_EL_NESSIM' && renderEasterBunny()}
                                    {(activeSeason?.season_id === 'EID_AL_FITR' || activeSeason?.season_id === 'EID_AL_ADHA') && renderEidCrescent()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-bold text-gray-900 font-mono">{authSession.email}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${authSession.role === 'EXECUTION'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : authSession.role === 'APPROVER'
                                                    ? (canApproverExecute ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200')
                                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                            }`}>
                                            {authSession.role === 'EXECUTION'
                                                ? '⚡ AUTHORIZED EXECUTION DEALER'
                                                : authSession.role === 'APPROVER'
                                                    ? (canApproverExecute ? '⚡ AUTHORIZED DEALER' : '🛡️ AUTHORIZED BANK APPROVER')
                                                    : '👁️ VIEW-ONLY OBSERVER'}
                                        </span>

                                        {/* Bank Desk Milestone Tier Pill */}
                                        {dealerAchievements?.dealer_tier && (
                                            <div id="trophy-badge-dealer-tier-pill" className="relative group cursor-pointer ml-1">
                                                <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border shadow-2xs transition-all hover:scale-105 ${dealerAchievements.dealer_tier.includes('Diamond')
                                                        ? 'bg-gradient-to-r from-cyan-100 via-white to-cyan-200 text-cyan-950 border-cyan-400/80 shadow-2xs'
                                                        : dealerAchievements.dealer_tier.includes('Gold')
                                                            ? 'bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-200 text-amber-950 border-amber-400/90 shadow-2xs shadow-amber-300/30 ring-1 ring-yellow-200/50'
                                                            : dealerAchievements.dealer_tier.includes('Silver')
                                                                ? 'bg-gradient-to-r from-slate-100 via-white to-slate-200 text-slate-800 border-slate-400/80 shadow-2xs'
                                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    }`}>
                                                    <Shield size={11} className={
                                                        dealerAchievements.dealer_tier.includes('Diamond') ? 'text-cyan-600 fill-cyan-400/30' :
                                                            dealerAchievements.dealer_tier.includes('Gold') ? 'text-amber-600 fill-amber-400/40' :
                                                                dealerAchievements.dealer_tier.includes('Silver') ? 'text-slate-600' : 'text-emerald-500'
                                                    } />
                                                    <span>{dealerAchievements.dealer_tier}</span>
                                                </div>
                                                {/* Tooltip popping downward into open space */}
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5 hidden group-hover:flex flex-col w-64 p-3 bg-slate-950 text-white rounded-xl shadow-2xl border border-slate-800 text-left z-50 pointer-events-none">
                                                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-950 border-t border-l border-slate-800 rotate-45" />
                                                    <div className="flex items-center justify-between pb-1 border-b border-slate-800 mb-1.5">
                                                        <span className="font-bold text-xs text-slate-200">{dealerAchievements.dealer_tier}</span>
                                                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">VERIFIED</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-300 leading-relaxed">
                                                        {dealerAchievements.dealer_perk || 'Desk performance rating based on verified interbank activity.'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Dynamic Festive / Seasonal Badge (Auto-calculated, Zero maintenance forever) */}
                                        {activeSeason && (
                                            <div id="seasonal-event-pill" className="relative group cursor-pointer ml-1">
                                                <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border shadow-2xs transition-all hover:scale-105 ${activeSeason.color === 'amber'
                                                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                                                        : activeSeason.color === 'emerald'
                                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                                            : activeSeason.color === 'teal'
                                                                ? 'bg-teal-50 text-teal-800 border-teal-300'
                                                                : activeSeason.color === 'sky'
                                                                    ? 'bg-sky-50 text-sky-800 border-sky-300'
                                                                    : 'bg-indigo-50 text-indigo-800 border-indigo-300'
                                                    }`}>
                                                    {activeSeason.icon === 'Moon' ? <span className="text-[12px] leading-none">🌙</span> :
                                                        activeSeason.icon === 'Snowflake' ? <span className="text-[12px] leading-none">❄️</span> :
                                                            activeSeason.icon === 'Sun' ? <span className="text-[12px] leading-none">🐰</span> :
                                                                <span className="text-[12px] leading-none">✨</span>}
                                                    <span>{activeSeason.badge}</span>
                                                    {activeSeason.season_id === 'EASTER_SHAM_EL_NESSIM' && <span className="text-[11px] leading-none">🌸</span>}
                                                    {activeSeason.season_id === 'YEAR_END_HOLIDAYS' && <span className="text-[11px] leading-none">🎄</span>}
                                                    {activeSeason.season_id === 'RAMADAN_TWILIGHT' && <span className="text-[11px] leading-none">🏮</span>}
                                                    {(activeSeason.season_id === 'EID_AL_FITR' || activeSeason.season_id === 'EID_AL_ADHA') && <span className="text-[11px] leading-none">🐑</span>}
                                                </div>
                                                {/* Tooltip */}
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5 hidden group-hover:flex flex-col w-64 p-3 bg-slate-950 text-white rounded-xl shadow-2xl border border-slate-800 text-left z-50 pointer-events-none">
                                                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-950 border-t border-l border-slate-800 rotate-45" />
                                                    <div className="flex items-center justify-between pb-1 border-b border-slate-800 mb-1.5">
                                                        <span className="font-bold text-xs text-slate-200">{activeSeason.name}</span>
                                                        <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1 rounded border border-amber-500/20">SEASONAL</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-300 leading-relaxed">
                                                        {activeSeason.description}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-400">
                                        {authSession.role === 'EXECUTION'
                                            ? 'Your quote submissions are binding and logged with your verified identity.'
                                            : authSession.role === 'APPROVER'
                                                ? (!hasExecutionDealers
                                                    ? 'Solo bank contact: You are authorized to submit binding quotes directly.'
                                                    : (rfq.approval_status === 'PENDING' && rfq.requires_bank_approval !== false && !isIndicative)
                                                        ? 'Action Required: Review deal specifications and authorize bank participation.'
                                                        : 'Bank participation authorized. You are observing live desk activity in Approver Monitoring Mode.')
                                                : 'You are viewing this RFQ in read-only mode.'}
                                    </p>
                                </div>
                            </div>

                            {/* Right Side: Accolade Showcase, Test Fanfare & Session Controls */}
                            <div className="flex items-center gap-2 self-end lg:self-center flex-wrap justify-end relative z-40">
                                {/* Discreet Dealer Accolade Badges */}
                                <div className="flex items-center gap-1.5">
                                    {(dealerAchievements?.trophies || [
                                        { id: 'READY_AT_THE_BELL', title: 'Ready at the Bell', current_tier: 'NONE', current_value: 0, target_value: 3, unit: 'sessions', progress_percent: 0, description: 'Terminal arrival authenticated as quotation window opens.' },
                                        { id: 'THE_RELIABLE_DESK', title: 'The Active Desk', current_tier: 'NONE', current_value: 0, target_value: 5, unit: 'tenders', progress_percent: 0, description: 'Consistent market liquidity provider across invited corporate tenders.' },
                                        { id: 'DEAL_CLOSER', title: 'Deal Closer', current_tier: 'NONE', current_value: 0, target_value: 3, unit: 'deals', progress_percent: 0, description: 'Successful firm tender executions completed on Grow.' },
                                        { id: 'VOLUME_TITAN', title: 'Liquidity Titan', current_tier: 'NONE', current_value: 0, target_value: 10000000, unit: 'USD', progress_percent: 0, description: 'Cumulative firm trade execution volume awarded across confirmed tenders.', is_currency: true },
                                        { id: 'TRIPLE_CROWN', title: 'The Triple Crown Cup', current_tier: 'NONE', current_value: 0, target_value: 3, unit: 'streak', progress_percent: 0, description: 'Consecutive winning firm execution tenders across the interbank market.' },
                                        { id: 'CURRENCY_EXPLORER', title: 'Market Versatility', current_tier: 'NONE', current_value: 0, target_value: 2, unit: 'pairs', progress_percent: 0, description: 'Active firm execution across distinct interbank currency pairs.' },
                                        { id: 'PRECISION_SPEED', title: 'Swift Execution', current_tier: 'NONE', current_value: 0, target_value: 5, unit: 'quotes', progress_percent: 0, description: 'Rapid, firm execution quotations submitted during live market tender windows.' },
                                        { id: 'MARKET_INTELLIGENCE', title: 'Market Intelligence', current_tier: 'NONE', current_value: 0, target_value: 5, unit: 'quotes', progress_percent: 0, description: 'Indicative & benchmark market intelligence pricing provided to corporate clients.' }
                                    ]).map((trophy, idx) => {
                                        const isEarned = trophy.current_tier && trophy.current_tier !== 'NONE';

                                        // Color configuration based on tier
                                        let containerCls = 'opacity-40 grayscale bg-slate-100/90 border-dashed border-slate-300 text-slate-400 hover:opacity-100 hover:grayscale-0 hover:border-slate-400';
                                        let iconCls = 'text-slate-400';
                                        let badgeCls = 'text-slate-400 bg-slate-800 border-slate-700';
                                        if (trophy.current_tier === 'PLATINUM') {
                                            containerCls = 'bg-gradient-to-b from-cyan-100 via-sky-200 to-cyan-300 border-cyan-400 text-cyan-950 shadow-xs shadow-cyan-400/40 ring-1 ring-white/90 hover:scale-110 hover:border-cyan-500 hover:shadow-cyan-400/70';
                                            iconCls = 'text-cyan-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]';
                                            badgeCls = 'text-cyan-950 bg-gradient-to-r from-cyan-200 via-white to-cyan-300 border-cyan-400 font-black shadow-xs';
                                        } else if (trophy.current_tier === 'GOLD') {
                                            containerCls = 'bg-gradient-to-b from-amber-200 via-yellow-300 to-amber-400 border-amber-500/90 text-amber-950 shadow-xs shadow-amber-500/40 ring-1 ring-yellow-100/90 hover:scale-110 hover:border-amber-600 hover:shadow-amber-500/70';
                                            iconCls = 'text-amber-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]';
                                            badgeCls = 'text-amber-950 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 border-amber-400 font-black shadow-xs';
                                        } else if (trophy.current_tier === 'SILVER') {
                                            containerCls = 'bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300/90 border-slate-400 text-slate-800 shadow-xs shadow-slate-400/40 ring-1 ring-white/80 hover:scale-110 hover:border-slate-500 hover:shadow-slate-400/60';
                                            iconCls = 'text-slate-800';
                                            badgeCls = 'text-slate-100 bg-slate-700 border-slate-500';
                                        } else if (trophy.current_tier === 'BRONZE') {
                                            containerCls = 'bg-gradient-to-b from-amber-100/90 via-amber-200/50 to-amber-800/20 border-amber-700/60 text-amber-900 shadow-xs ring-1 ring-amber-600/20 hover:scale-110 hover:border-amber-700/80';
                                            iconCls = 'text-amber-900';
                                            badgeCls = 'text-amber-200 bg-amber-900/60 border-amber-700/60 font-bold';
                                        }

                                        const renderIcon = (id) => {
                                            switch (id) {
                                                case 'READY_AT_THE_BELL': return <Hourglass size={15} />;
                                                case 'THE_RELIABLE_DESK': return <Shield size={15} />;
                                                case 'DEAL_CLOSER': return <Trophy size={15} />;
                                                case 'VOLUME_TITAN': return <Landmark size={15} />;
                                                case 'TRIPLE_CROWN': return <Crown size={15} />;
                                                case 'CURRENCY_EXPLORER': return <Sparkles size={15} />;
                                                case 'PRECISION_SPEED': return <Zap size={15} />;
                                                case 'MARKET_INTELLIGENCE': return <Eye size={15} />;
                                                default: return <Trophy size={15} />;
                                            }
                                        };

                                        // Tooltip alignment safe against window right edge
                                        const totalCount = dealerAchievements?.trophies?.length || 8;
                                        const tooltipAlignCls = idx >= totalCount - 3 ? 'right-0' : (idx <= 1 ? 'left-0' : 'left-1/2 -translate-x-1/2');
                                        const arrowAlignCls = idx >= totalCount - 3 ? 'right-3.5' : (idx <= 1 ? 'left-3.5' : 'left-1/2 -translate-x-1/2');

                                        const curVal = Number(trophy.current_value || 0);
                                        const tgtVal = Number(trophy.target_value || 0);
                                        const dynamicPct = (trophy.current_tier === 'PLATINUM' || trophy.next_tier === 'MAX')
                                            ? 100
                                            : (tgtVal > 0 ? Math.min(100, Math.max(0, (curVal / tgtVal) * 100)) : 0);

                                        const formattedCurrent = trophy.is_currency || trophy.unit === 'USD'
                                            ? `$${curVal.toLocaleString()}`
                                            : `${curVal.toLocaleString()}`;
                                        const formattedTarget = trophy.is_currency || trophy.unit === 'USD'
                                            ? `$${tgtVal.toLocaleString()}`
                                            : `${tgtVal.toLocaleString()} ${trophy.unit}`;

                                        return (
                                            <div key={trophy.id || idx} id={`trophy-badge-${trophy.id}`} data-tier={trophy.current_tier} className="relative group cursor-pointer rounded-xl">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-300 relative ${containerCls}`}>
                                                    {renderIcon(trophy.id)}
                                                    {!isEarned && (
                                                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-slate-800 text-white rounded-full flex items-center justify-center shadow-xs border border-slate-700">
                                                            <Lock size={8} />
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Tooltip popping downward into open space */}
                                                <div className={`absolute top-full ${tooltipAlignCls} mt-2.5 hidden group-hover:flex flex-col w-72 p-3.5 bg-slate-950 text-white rounded-xl shadow-2xl border border-slate-800 text-left z-50 pointer-events-none`}>
                                                    <div className={`absolute -top-1.5 ${arrowAlignCls} w-3 h-3 bg-slate-950 border-t border-l border-slate-800 rotate-45`} />
                                                    <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-800">
                                                        <span className="font-bold text-xs flex items-center gap-1.5 text-slate-200">
                                                            <span className={iconCls}>{renderIcon(trophy.id)}</span>
                                                            <span>{trophy.title}</span>
                                                        </span>
                                                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${badgeCls}`}>
                                                            {isEarned ? `${trophy.current_tier}` : 'IN PROGRESS'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                                                        {trophy.description}
                                                    </p>
                                                    {/* Progress bar with gradual thermal heat: stays all-light when early (e.g. 1/5) and transitions to dark heat as it fills (e.g. 4/5) */}
                                                    <div className="w-full bg-slate-800/90 h-1.5 rounded-full overflow-hidden mb-1.5 p-[0.5px]">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500 ease-out"
                                                            style={{
                                                                width: `${dynamicPct}%`,
                                                                background: 'linear-gradient(90deg, #fef08a 0%, #fde047 25%, #f59e0b 55%, #ea580c 80%, #b91c1c 100%)',
                                                                backgroundSize: `${dynamicPct > 0 ? (100 / dynamicPct) * 100 : 100}% 100%`,
                                                                backgroundPosition: 'left center',
                                                                backgroundRepeat: 'no-repeat',
                                                                boxShadow: dynamicPct >= 75
                                                                    ? '0 0 8px rgba(234, 88, 12, 0.6)'
                                                                    : dynamicPct >= 40
                                                                        ? '0 0 6px rgba(245, 158, 11, 0.4)'
                                                                        : '0 0 4px rgba(254, 240, 138, 0.25)'
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                                                        <span className="font-mono text-slate-300 font-medium">
                                                            {formattedCurrent} / {formattedTarget}
                                                        </span>
                                                        <span className="font-mono text-slate-400">
                                                            {isEarned
                                                                ? (trophy.next_tier !== 'MAX' ? `Next: ${trophy.next_tier}` : 'Mastered')
                                                                : (() => {
                                                                    const remaining = Math.max(0, tgtVal - curVal);
                                                                    if (trophy.unit === 'quotes') return `${remaining} more quote${remaining > 1 ? 's' : ''} to unlock`;
                                                                    if (trophy.unit === 'deals') return `${remaining} more win${remaining > 1 ? 's' : ''} to unlock`;
                                                                    if (trophy.unit === 'streak') return `${remaining} streak to unlock`;
                                                                    if (trophy.unit === 'sessions') return `${remaining} more arrival${remaining > 1 ? 's' : ''} to unlock`;
                                                                    if (trophy.unit === 'tenders') return `${remaining} more tender${remaining > 1 ? 's' : ''} to unlock`;
                                                                    if (trophy.unit === 'pairs') return `${remaining} more pair${remaining > 1 ? 's' : ''} to unlock`;
                                                                    if (trophy.unit === 'USD') return `$${(remaining >= 1000000 ? `${(remaining / 1000000).toFixed(1)}M` : remaining.toLocaleString())} to unlock`;
                                                                    return `${remaining} more to unlock`;
                                                                })()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="h-4 w-px bg-slate-200 hidden sm:block mx-1" />

                                <button
                                    onClick={handleLogout}
                                    className="text-xs text-gray-400 hover:text-red-600 transition-colors font-medium cursor-pointer"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* TAB 1: LIVE RFQ VIEW */}
                {activeTab === 'LIVE' && (
                    <>
                        {/* Trade Execution / Outcome Result Banner */}
                        {timeLeft.status === 'CLOSED' && (resultStatus || isIndicative) && rfq?.approval_status !== 'DECLINED' && (
                            <div
                                className={`mb-3.5 p-3.5 sm:p-4 rounded-2xl border text-center animate-fade-in-up ${resultStatus === 'WINNER' ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xs' :
                                        resultStatus === 'PARTIALLY_WON' ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xs' :
                                            (isIndicative || resultStatus === 'INDICATIVE_ONLY') ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 shadow-2xs' :
                                                resultStatus === 'AWAITING_SELECTION' ? 'bg-blue-50/70 border-blue-200 text-blue-900' :
                                                    'bg-slate-50 border-slate-200 text-slate-700'
                                    }`}
                            >
                                {(isIndicative || resultStatus === 'INDICATIVE_ONLY') ? (
                                    <div className="flex flex-col items-center">
                                        <CheckCircle2 className="mb-1 text-emerald-600" size={26} />
                                        <h2 className="text-base sm:text-lg font-bold text-gray-900">Quotation Closed — Thank You</h2>
                                        <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Indicative pricing received. Thank you for your quote.</p>
                                    </div>
                                ) : (resultStatus === 'WINNER' && (!outcomeData?.total_legs_count || outcomeData?.total_legs_count <= 1 || outcomeData?.won_legs_count === outcomeData?.total_legs_count)) ? (
                                    <div className="flex flex-col items-center">
                                        <CheckCircle2 className="mb-1 text-emerald-600" size={24} />
                                        <h2 className="text-base sm:text-lg font-bold">
                                            Trade Execution Confirmed{outcomeData?.total_legs_count > 1 ? ` — All ${outcomeData.total_legs_count} Pairs Won!` : '!'}
                                        </h2>
                                        <p className="text-xs sm:text-sm mt-0.5 text-emerald-800 text-center max-w-2xl">
                                            {outcomeData?.total_legs_count > 1
                                                ? `Congratulations, your quotes won every currency pair in this package (${outcomeData?.won_pairs?.join(', ')}). Our treasury team will contact you shortly.`
                                                : 'Congratulations, your quote was selected as the winning offer. Our treasury team will contact you shortly.'}
                                        </p>
                                        {renderOutcomeReceiptAndDocs(outcomeData)}
                                    </div>
                                ) : (resultStatus === 'PARTIALLY_WON' || (resultStatus === 'WINNER' && outcomeData?.won_legs_count < outcomeData?.total_legs_count)) ? (
                                    <div className="flex flex-col items-center">
                                        <CheckCircle2 className="mb-1 text-emerald-600" size={24} />
                                        <h2 className="text-base sm:text-lg font-bold">
                                            Trade Execution Confirmed — Partially Won ({outcomeData?.won_legs_count || outcomeData?.won_pairs?.length || 1} of {outcomeData?.total_legs_count || 2} Pairs)!
                                        </h2>
                                        <p className="text-xs sm:text-sm mt-0.5 text-emerald-800 text-center max-w-2xl">
                                            Congratulations, your quotes won: <strong className="font-mono">{outcomeData?.won_pairs?.join(', ')}</strong>.
                                            {outcomeData?.lost_pairs?.length > 0 && (
                                                <span> (Awarded to competing counterparties: <span className="font-mono">{outcomeData.lost_pairs.join(', ')}</span>).</span>
                                            )}
                                            {outcomeData?.inconclusive_pairs?.length > 0 && (
                                                <span> (Other pairs closed without execution / inconclusive: <span className="font-mono">{outcomeData.inconclusive_pairs.join(', ')}</span>).</span>
                                            )}
                                        </p>
                                        {renderOutcomeReceiptAndDocs(outcomeData)}
                                    </div>
                                ) : resultStatus === 'AWAITING_SELECTION' ? (
                                    <div className="flex flex-col items-center text-center">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <Clock className="text-blue-500 animate-spin-slow" size={24} />
                                            {acceptanceSecondsRemaining !== null && (
                                                <span className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${acceptanceSecondsRemaining > 0
                                                        ? 'bg-blue-100/80 text-blue-800 border-blue-200'
                                                        : 'bg-amber-100/80 text-amber-800 border-amber-200 animate-pulse'
                                                    }`}>
                                                    {acceptanceSecondsRemaining > 0 ? `⏱ ${acceptanceSecondsRemaining}s remaining` : 'Finalizing Decision...'}
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-base sm:text-lg font-bold text-blue-950">
                                            {acceptanceSecondsRemaining !== null && acceptanceSecondsRemaining === 0
                                                ? 'Finalizing Execution Decision'
                                                : 'Selection in Progress'}
                                        </h2>
                                        <p className="text-xs sm:text-sm mt-0.5 text-blue-800 max-w-lg leading-relaxed">
                                            {acceptanceSecondsRemaining !== null && acceptanceSecondsRemaining > 0
                                                ? `The bidding window has closed. Corporate Treasury is reviewing counterparty quotes (Decision window closes in ${acceptanceSecondsRemaining}s).`
                                                : 'Thank you for your quotation. The corporate treasury team is currently finalizing counterparty selection.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <h2 className="text-base sm:text-lg font-bold text-slate-800">Quotation Concluded</h2>
                                        <p className="text-xs sm:text-sm text-slate-600 mt-1 text-center max-w-lg">
                                            Thank you for submitting your quotation. This request has concluded and your offer was not selected for trade execution on this occasion. We appreciate your participation.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Window Just Opened Announcement Banner */}
                        {showWindowOpenedAlert && timeLeft.status === 'OPEN' && (
                            <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white shadow-md border border-emerald-400/40 flex items-center justify-between gap-4 animate-fade-in-up">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-xs text-white shrink-0">
                                        <CheckCircle2 size={24} className="animate-pulse text-emerald-100" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm sm:text-base font-extrabold tracking-tight flex items-center gap-2">
                                            🟢 Quotation Window is Now Live!
                                        </h3>
                                        <p className="text-xs text-emerald-100 mt-0.5 font-medium">
                                            The bidding window has opened. You can now enter your firm pricing and submit your quote.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowWindowOpenedAlert(false)}
                                    className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                                >
                                    Dismiss
                                </button>
                            </div>
                        )}

                        {/* Clean Symmetrical 2-Column Desktop Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">

                            {/* COLUMN 1: Left Side Specifications & Guidelines */}
                            <div className="flex flex-col gap-5">
                                {/* Top Card: Corporate Client & Trade Specifications */}
                                <section className="bg-white p-6 sm:p-7 rounded-3xl shadow-xs border border-slate-200">
                                    {/* Corporate Client & RFQ Ref Top Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-slate-100 gap-3">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                                                {rfq.is_cross_entity ? "Requesting Organization (Group Level)" : "Requesting Legal Entity"}
                                            </p>
                                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2 flex-wrap">
                                                <span>{rfq.entity_name || rfq.customer_name}</span>
                                                {rfq.is_cross_entity && (
                                                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full">
                                                        Group Benchmark
                                                    </span>
                                                )}
                                            </h2>
                                            {rfq.is_cross_entity ? (
                                                <p className="text-xs text-blue-700 bg-blue-50/80 border border-blue-200/60 px-2.5 py-1.5 rounded-lg mt-2 font-medium">
                                                    This request is sent on behalf of <strong>{rfq.customer_name}</strong> for comparative indicative price discovery. No trade execution commitment will be entered with your institution.
                                                </p>
                                            ) : (
                                                <>
                                                    {(rfq.entity_cr_number || rfq.entity_tax_id) && (
                                                        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 font-medium">
                                                            {rfq.entity_cr_number && <span>CR: <strong className="font-mono text-gray-700">{rfq.entity_cr_number}</strong></span>}
                                                            {rfq.entity_cr_number && rfq.entity_tax_id && <span>•</span>}
                                                            {rfq.entity_tax_id && <span>Tax ID: <strong className="font-mono text-gray-700">{rfq.entity_tax_id}</strong></span>}
                                                        </div>
                                                    )}
                                                    {rfq.customer_name && rfq.entity_name && rfq.customer_name !== rfq.entity_name && (
                                                        <p className="text-[11px] text-gray-400 mt-0.5">Group: {rfq.customer_name}</p>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center sm:flex-col sm:items-end gap-1.5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest sm:block">RFQ Reference</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono font-bold text-black bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                                                    {rfq.ref_no}
                                                </span>
                                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${isMixed
                                                        ? 'bg-purple-900 text-purple-100 border border-purple-700 shadow-2xs'
                                                        : (rfq.quotation_base || 'Execution').toLowerCase() === 'indicative'
                                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                            : 'bg-black text-white'
                                                    }`}>
                                                    {isMixed ? '⚡📊 MIXED (EXECUTION / INDICATIVE)' : (rfq.quotation_base || 'Execution')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Specifications Grid */}
                                    <div className="grid grid-cols-2 gap-y-5 gap-x-6 sm:gap-x-10">
                                        {rfq.type === 'TBILL' ? (
                                            <>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Direction</label>
                                                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{rfq.direction}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Min Ticket Amount</label>
                                                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{new Intl.NumberFormat().format(rfq.min_ticket_amount)}</p>
                                                </div>
                                                <div className="col-span-2 sm:col-span-1">
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Settlement Date</label>
                                                    <p className="text-sm sm:text-base font-semibold text-gray-900">
                                                        {formatDate(rfq.settlement_date_start)}
                                                        {rfq.settlement_date_end ? ` to ${formatDate(rfq.settlement_date_end)}` : ''}
                                                    </p>
                                                </div>
                                                <div className="col-span-2 sm:col-span-1">
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Maturity Date</label>
                                                    <p className="text-sm sm:text-base font-semibold text-gray-900">
                                                        {formatDate(rfq.maturity_date_start)}
                                                        {rfq.maturity_date_end ? ` to ${formatDate(rfq.maturity_date_end)}` : ''}
                                                    </p>
                                                </div>
                                            </>
                                        ) : (rfq.legs && rfq.legs.length > 1) ? (
                                            <div className="col-span-2 space-y-3">
                                                {/* RFQ Governance, Schedule & Smart Parameters (Replaces duplicate leg list) */}
                                                <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3 shadow-2xs">
                                                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                                            <FileText size={13} className="text-slate-400" />
                                                            <span>RFQ Governance & Schedule</span>
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-mono">
                                                            {rfq.legs.length} Currency Legs
                                                        </span>
                                                    </div>

                                                    {/* Timestamps & Creator Info */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                                        <div>
                                                            <span className="text-[10px] font-semibold text-gray-400 uppercase block mb-0.5">Created By</span>
                                                            <p className="font-semibold text-gray-800 font-mono text-[11px] truncate">
                                                                {rfq.created_by_email || rfq.created_by_name || `${rfq.customer_name} Treasury`}
                                                            </p>
                                                            {rfq.created_at && (
                                                                <span className="text-[10px] text-gray-400 block mt-0.5 font-mono">
                                                                    {new Date(rfq.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <span className="text-[10px] font-semibold text-gray-400 uppercase block mb-0.5">Quotation Window</span>
                                                            <p className="font-semibold text-gray-800 text-[11px]">
                                                                {rfq.window_start ? new Date(rfq.window_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                                {' → '}
                                                                {rfq.window_end ? new Date(rfq.window_end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                            </p>
                                                            <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">
                                                                {formatDate(rfq.window_start)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Contextual Smart Hints (Non-distracting, renders ONLY when triggered) */}
                                                    {(() => {
                                                        const legDates = rfq.legs.map(l => l.value_date).filter(Boolean);
                                                        const hasMultipleValueDates = new Set(legDates).size > 1;
                                                        const totalUSD = rfq.legs.reduce((acc, l) => {
                                                            const amt = Number(l.amount || 0);
                                                            const pair = (l.currency_pair || `${l.buy_currency}/${l.sell_currency}`).toUpperCase();
                                                            if (pair.includes('USD')) return acc + amt;
                                                            if (pair.includes('EUR')) return acc + (amt * 1.08);
                                                            if (pair.includes('GBP')) return acc + (amt * 1.30);
                                                            return acc + (amt / 50.0);
                                                        }, 0);
                                                        const isHighNotional = totalUSD >= 500000;
                                                        const hasAltDatesAllowed = rfq.legs.some(l => l.allow_alternative_value_date);

                                                        if (!hasMultipleValueDates && !isHighNotional && !hasAltDatesAllowed) return null;

                                                        return (
                                                            <div className="pt-2 border-t border-slate-200/80 flex flex-wrap gap-1.5">
                                                                {hasMultipleValueDates && (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                                                                        <span>⚠️</span>
                                                                        <span>Split Value Dates Across Legs</span>
                                                                    </span>
                                                                )}
                                                                {isHighNotional && (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs">
                                                                        <span>⚡</span>
                                                                        <span>High-Notional Package (~${Math.round(totalUSD).toLocaleString()} USD Eqv)</span>
                                                                    </span>
                                                                )}
                                                                {hasAltDatesAllowed && (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                                                                        <span>📅</span>
                                                                        <span>Alternative Value Date Allowed</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Currency Pair</label>
                                                    <p className="text-xl sm:text-2xl font-bold text-emerald-900 bg-emerald-50 px-3 py-1 rounded-xl inline-flex items-center gap-2 border border-emerald-200">
                                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase text-white ${(rfq.direction || 'BUY').toUpperCase() === 'BUY' ? 'bg-emerald-600' : 'bg-blue-600'
                                                            }`}>
                                                            {rfq.direction || 'BUY'}
                                                        </span>
                                                        <span>{rfq.buy_currency} / {rfq.sell_currency}</span>
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Amount to {rfq.direction || 'Trade'}</label>
                                                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{new Intl.NumberFormat().format(rfq.amount)} <span className="text-xs font-normal text-gray-500">{rfq.buy_currency}</span></p>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Target Value Date</label>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-base sm:text-lg font-semibold text-gray-900">{formatDate(rfq.value_date)}</p>
                                                        {rfq.allow_alternative_value_date ? (
                                                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                                                                Alternative Date Allowed
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                                                Fixed Date
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Quotation Base</label>
                                                    <p className="text-base sm:text-lg font-semibold text-gray-900">{rfq.quotation_base}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {((rfq.documents && rfq.documents.length > 0) || rfq.document_path) && (
                                        <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Supporting Documents</label>
                                            <div className="space-y-2">
                                                {(rfq.documents && rfq.documents.length > 0 ? rfq.documents : [{ name: 'Attached Supporting Document', path: rfq.document_path }]).map((doc, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={doc.path?.startsWith('http') ? doc.path : `${API_BASE_URL}${doc.path?.startsWith('/') ? '' : '/'}${doc.path}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all text-xs font-medium text-gray-800"
                                                    >
                                                        <span className="flex items-center gap-2 truncate">
                                                            <FileText size={16} className="text-slate-500 shrink-0" />
                                                            <span className="truncate">{doc.name || `Document ${idx + 1}`}</span>
                                                        </span>
                                                        <span className="text-[10px] font-bold bg-white text-slate-800 border border-slate-200 px-3 py-1 rounded-lg uppercase tracking-wider shrink-0 hover:bg-black hover:text-white transition-colors">
                                                            Download
                                                        </span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {rfq.comments_to_banks && (
                                        <div className="mt-5 pt-4 border-t border-slate-100">
                                            <label className="block text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                <MessageSquare size={13} className="text-emerald-600" />
                                                Special Instructions / Comments from Client
                                            </label>
                                            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-950 whitespace-pre-wrap leading-relaxed font-medium">
                                                {rfq.comments_to_banks}
                                            </div>
                                        </div>
                                    )}
                                </section>

                                {/* Bottom Card: Complete Trading Guidelines */}
                                <section className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200 flex-1">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3.5 flex items-center gap-2">
                                        <Clock size={14} className="text-blue-600" /> Trading Guidelines
                                    </h3>
                                    <ul className="space-y-3 text-xs text-gray-600 leading-relaxed">
                                        <li className="flex gap-3">
                                            <span className="w-5 h-5 bg-black text-white rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5">!</span>
                                            <span className="font-semibold text-gray-900">
                                                {isMixed
                                                    ? 'This is a MIXED package with both Execution and Indicative currency pairs. Execution legs are binding upon window close, while Indicative legs are for price discovery.'
                                                    : hasExecutionLegs
                                                        ? 'This is an EXECUTION request. Your submitted quote is binding upon window close.'
                                                        : 'This is an INDICATIVE request for market pricing sounding.'}
                                            </span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="w-5 h-5 bg-slate-200 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-700 mt-0.5">1</span>
                                            <span>Review currency volume, value dates, and document attachments thoroughly.</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="w-5 h-5 bg-slate-200 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-700 mt-0.5">2</span>
                                            <span>You may amend your quote in real-time as market conditions change until the window closes.</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="w-5 h-5 bg-slate-200 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-700 mt-0.5">3</span>
                                            <span>Trade confirmations will be dispatched to all registered desk contacts upon execution.</span>
                                        </li>
                                    </ul>
                                </section>
                            </div>

                            {/* COLUMN 2: Right Side Bidding & Execution Console */}
                            <div className="flex flex-col gap-4">
                                {approvalSuccessMsg && (
                                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl p-3.5 flex items-center justify-between animate-fade-in shadow-xs">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                            <span>{approvalSuccessMsg}</span>
                                        </div>
                                        <button onClick={() => setApprovalSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-0.5 cursor-pointer">×</button>
                                    </div>
                                )}

                                {rfq.approval_status === 'DECLINED' ? (
                                    <section className="bg-red-50/80 border border-red-200 rounded-3xl p-6 sm:p-8 text-center flex-1 flex flex-col items-center justify-center animate-fade-in shadow-xs">
                                        <div className="w-12 h-12 bg-red-100 text-red-700 rounded-2xl flex items-center justify-center mb-3">
                                            <AlertCircle size={24} className="text-red-600" />
                                        </div>
                                        <h3 className="text-base font-bold text-red-950">Bank Participation Declined</h3>
                                        <p className="text-xs text-red-800 mt-1 max-w-sm leading-relaxed">
                                            Your bank's authorized approver ({rfq.approved_by_email || 'Approver'}) declined participation in this quotation{rfq.approval_notes ? `: "${rfq.approval_notes}"` : '.'}
                                        </p>
                                        <p className="text-[11px] text-red-600/80 mt-2 font-medium">No quotes can be submitted for this request.</p>
                                    </section>
                                ) : rfq.approval_status === 'EXPIRED' ? (
                                    <section className="bg-slate-100 border border-slate-300 rounded-3xl p-6 sm:p-8 text-center flex-1 flex flex-col items-center justify-center animate-fade-in shadow-xs">
                                        <div className="w-12 h-12 bg-slate-200 text-slate-600 rounded-2xl flex items-center justify-center mb-3">
                                            <Clock size={24} className="text-slate-500" />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-800">Quotation Excluded — Late Response</h3>
                                        <p className="text-xs text-slate-600 mt-1 max-w-sm leading-relaxed">
                                            The quotation window closed before bank participation was authorized by your Approver. As per platform policy, late responses result in exclusion from this quotation.
                                        </p>
                                    </section>
                                ) : (rfq.approval_status === 'PENDING' && rfq.requires_bank_approval !== false && !isIndicative && hasExecutionDealers) ? (
                                    isApprover ? (
                                        <section className="bg-white p-6 sm:p-7 rounded-3xl shadow-md border-2 border-amber-500/60 flex-1 flex flex-col justify-between animate-fade-in">
                                            <div>
                                                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                                                    <div>
                                                        <h3 className="text-xs font-bold uppercase tracking-widest text-amber-700 flex items-center gap-2">
                                                            <Shield size={16} className="text-amber-600" /> Bank Participation Authorization
                                                        </h3>
                                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                                            Authorized approver review for {rfq.bank_name}
                                                        </p>
                                                    </div>
                                                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-200 animate-pulse">
                                                        ACTION REQUIRED
                                                    </span>
                                                </div>

                                                <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
                                                    <p>
                                                        As an authorized Approver for <strong>{rfq.bank_name}</strong>, your authorization is required before execution dealers on your desk can submit binding quotes for {isMixed ? (
                                                            <span>the execution legs of this <strong className="text-purple-900 font-bold">Mixed Package (Execution &amp; Indicative)</strong></span>
                                                        ) : (
                                                            <span>this <strong>{rfq.quotation_base || 'Execution'}</strong> request</span>
                                                        )} from <strong>{rfq.customer_name}</strong>.
                                                    </p>

                                                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                                                        <div className="font-bold text-gray-900 mb-1">Deal Summary:</div>
                                                        <ul className="space-y-1.5 text-slate-600 font-medium">
                                                            <li>&bull; Reference: <span className="font-mono font-bold text-gray-900">{rfq.ref_no}</span></li>
                                                            <li>&bull; Product: <span className="font-bold text-gray-900">{rfq.type}</span></li>
                                                            {rfq.type === 'TBILL' ? (
                                                                <>
                                                                    <li>&bull; Min Ticket: <span className="font-bold text-gray-900">{new Intl.NumberFormat().format(rfq.min_ticket_amount || 0)}</span></li>
                                                                    <li>&bull; Settlement: <span className="font-bold text-gray-900">{formatDate(rfq.settlement_date_start)}</span></li>
                                                                </>
                                                            ) : (rfq.legs && rfq.legs.length > 1) ? (
                                                                <>
                                                                    <li>&bull; Package: <span className="font-bold text-gray-900">{rfq.legs.length} Currency Pairs</span></li>
                                                                    {rfq.legs.map((l, i) => (
                                                                        <li key={l.id || i} className="pl-2 text-[11px] text-gray-600 flex items-center gap-1.5 flex-wrap">
                                                                            <span>&bull; Leg {i + 1}: <strong className="text-gray-900 font-mono">{l.currency_pair || `${l.buy_currency}/${l.sell_currency}`}</strong></span>
                                                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide ${(l.quotation_base || rfq.quotation_base || 'Execution').toLowerCase() === 'indicative'
                                                                                    ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                                                                    : 'bg-black text-white'
                                                                                }`}>
                                                                                {(l.quotation_base || rfq.quotation_base || 'Execution').toLowerCase() === 'indicative' ? '📊 INDICATIVE' : '⚡ EXECUTION'}
                                                                            </span>
                                                                            <span>&bull; {new Intl.NumberFormat().format(l.amount || 0)} {l.buy_currency} &bull; Val: {formatDate(l.value_date)}</span>
                                                                        </li>
                                                                    ))}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <li className="flex items-center gap-1.5">
                                                                        <span>&bull; Pair: <span className="font-bold text-gray-900">{rfq.buy_currency}/{rfq.sell_currency}</span></span>
                                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide ${(rfq.quotation_base || 'Execution').toLowerCase() === 'indicative'
                                                                                ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                                                                : 'bg-black text-white'
                                                                            }`}>
                                                                            {(rfq.quotation_base || 'Execution').toLowerCase() === 'indicative' ? '📊 INDICATIVE' : '⚡ EXECUTION'}
                                                                        </span>
                                                                    </li>
                                                                    <li>&bull; Amount: <span className="font-bold text-gray-900">{new Intl.NumberFormat().format(rfq.amount || 0)} {rfq.buy_currency}</span></li>
                                                                    <li>&bull; Value Date: <span className="font-bold text-gray-900">{formatDate(rfq.value_date)}</span></li>
                                                                </>
                                                            )}
                                                        </ul>
                                                    </div>

                                                    <div>
                                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1.5">
                                                            <MessageSquare size={13} className="text-slate-400" />
                                                            Approval / Decline Notes (Optional)
                                                        </label>
                                                        <textarea
                                                            rows={3}
                                                            placeholder="Add any internal remarks, instructions, or ticket limits for your trading desk..."
                                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-gray-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 resize-none font-sans"
                                                            value={approvalNotes}
                                                            onChange={(e) => setApprovalNotes(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                                                <button
                                                    type="button"
                                                    disabled={isActioningApproval || timeLeft.status === 'CLOSED'}
                                                    onClick={() => handleApproverDecision('DECLINE')}
                                                    className="flex-1 py-3 px-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                                >
                                                    🛑 Decline Participation
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isActioningApproval || timeLeft.status === 'CLOSED'}
                                                    onClick={() => handleApproverDecision('APPROVE')}
                                                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                                >
                                                    <CheckCircle2 size={15} /> Approve & Notify Dealers
                                                </button>
                                            </div>
                                        </section>
                                    ) : (
                                        <section className="bg-amber-50/70 border border-amber-200/80 rounded-3xl p-6 sm:p-8 text-center flex-1 flex flex-col items-center justify-center animate-fade-in shadow-xs">
                                            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mb-3">
                                                <Clock size={24} className="animate-spin-slow text-amber-600" />
                                            </div>
                                            <h3 className="text-base font-bold text-amber-950">Awaiting Bank Approval</h3>
                                            <p className="text-xs text-amber-800 mt-1 max-w-sm leading-relaxed">
                                                This quotation is currently awaiting authorization from your bank's designated Approver. You will receive an email notification as soon as participation is authorized.
                                            </p>
                                        </section>
                                    )
                                ) : (
                                    <>
                                        {/* Neutral Status Notification Card when Quote is Active */}
                                        {submitted && (
                                            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 text-center flex flex-col items-center justify-center animate-fade-in shadow-2xs">
                                                <div className="w-7 h-7 bg-slate-200/80 text-slate-700 rounded-full flex items-center justify-center mb-1">
                                                    <CheckCircle2 size={16} className="text-slate-600" />
                                                </div>
                                                <h3 className="text-sm font-semibold text-slate-800">Quote Recorded Successfully</h3>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {isReadOnlyViewer
                                                        ? 'Your bank’s active quotes have been successfully registered with the client.'
                                                        : (timeLeft.status === 'OPEN'
                                                            ? (rfq.type === 'TBILL' ? 'Your T-Bill quote lines are actively registered with the client.' : 'Your spot price is actively registered with the client.')
                                                            : (rfq.type === 'TBILL' ? 'Your T-Bill quote lines were received for evaluation.' : 'Your spot price was received for evaluation.')
                                                        )
                                                    }
                                                </p>
                                            </div>
                                        )}

                                        {isApprover && rfq.approval_status === 'APPROVED' && (
                                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-700 flex items-center gap-2">
                                                <CheckCircle2 size={16} className="text-slate-500 shrink-0" />
                                                <span>
                                                    <strong>Participation Approved:</strong> You authorized this RFQ on {formatDate(rfq.approved_at)}. You are observing desk activity in Approver Viewer Mode.
                                                </span>
                                            </div>
                                        )}

                                        {/* Main Bidding Console Card */}
                                        <section
                                            id="bidding-quote-card"
                                            className={`p-5 sm:p-6 rounded-3xl shadow-xs border transition-all flex-1 flex flex-col ${isReadOnlyViewer
                                                    ? 'bg-white border-slate-200'
                                                    : timeLeft.status === 'OPEN'
                                                        ? 'bg-white border-2 border-slate-950 shadow-md'
                                                        : 'bg-white border-slate-200'
                                                }`}
                                        >
                                            {/* Bidding Header */}
                                            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                                                <div>
                                                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                                        <TrendingUp size={14} className="text-slate-500" /> {rfq.type === 'TBILL' ? 'T-Bill Quotation Lines' : 'Your Price Quote'}
                                                    </h3>
                                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                                        {timeLeft.status === 'OPEN' ? 'Enter your binding rate for this quotation request.' : 'Quotation window is currently closed.'}
                                                    </p>
                                                </div>

                                                {submitted ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                        <CheckCircle2 size={13} className="text-slate-500" /> {timeLeft.status === 'OPEN' ? 'Active Quote' : 'Quote Submitted'}
                                                    </span>
                                                ) : isApproverViewer ? (
                                                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-200">
                                                        🛡️ Approver Viewer Mode
                                                    </span>
                                                ) : isApprover && canApproverExecute ? (
                                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200">
                                                        {isIndicative ? 'Indicative Pricing' : '⚡ Acting Execution Dealer'}
                                                    </span>
                                                ) : isViewOnly ? (
                                                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full border border-blue-200">
                                                        👁️ View-Only Observer
                                                    </span>
                                                ) : isMixed ? (
                                                    <span className="px-3 py-1 bg-purple-100 text-purple-900 text-[10px] font-bold rounded-full border border-purple-300">
                                                        ⚡📊 Mixed Package
                                                    </span>
                                                ) : isIndicative ? (
                                                    <span className="px-3 py-1 bg-blue-50 text-blue-800 text-[10px] font-bold rounded-full border border-blue-200">
                                                        Indicative Pricing
                                                    </span>
                                                ) : timeLeft.status === 'OPEN' && timeLeft.secondsRemaining !== null && timeLeft.secondsRemaining <= 30 ? (
                                                    timeLeft.secondsRemaining <= 5 ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                                                            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                                                            Closing in {timeLeft.secondsRemaining}s!
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                                            ⏱️ {timeLeft.secondsRemaining}s left
                                                        </span>
                                                    )
                                                ) : null}
                                            </div>

                                            {/* Live Ranking HUD Widget */}
                                            {rfq?.is_live_ranking_enabled && timeLeft.status === 'OPEN' && (
                                                <div
                                                    className="mb-4 overflow-hidden rounded-2xl border transition-all duration-300 shadow-xs"
                                                    style={{
                                                        background: liveRank?.rank === 1
                                                            ? 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)'
                                                            : liveRank?.rank
                                                                ? 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)'
                                                                : 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                                                        borderColor: liveRank?.rank === 1
                                                            ? '#6EE7B7'
                                                            : liveRank?.rank
                                                                ? '#93C5FD'
                                                                : '#E2E8F0'
                                                    }}
                                                >
                                                    <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shadow-xs ${liveRank?.rank === 1
                                                                    ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                                                                    : liveRank?.rank
                                                                        ? 'bg-blue-600 text-white shadow-blue-500/20'
                                                                        : 'bg-slate-200 text-slate-600'
                                                                }`}>
                                                                {liveRank?.rank ? `#${liveRank.rank}` : <BarChart2 size={18} />}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                                                                        Live Market Ranking
                                                                    </span>
                                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white/90 border border-slate-200 text-slate-700">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-1" />
                                                                        Real-Time
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                                                                    {liveRank?.rank === 1 ? (
                                                                        <span className="text-emerald-800 flex items-center gap-1">
                                                                            🏆 Leading Quote — Best in Market!
                                                                        </span>
                                                                    ) : liveRank?.rank ? (
                                                                        <span className="text-blue-900">
                                                                            Your Rank: #{liveRank.rank} of {liveRank.total_quotes || 1} submitted
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-600">
                                                                            Submit your quote to view competitive rank
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {liveRank?.rank && liveRank.rank > 1 && timeLeft.status === 'OPEN' && (
                                                            <div className="hidden sm:flex flex-col items-end">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full animate-pulse">
                                                                    Improve Quote to Lead
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="px-3.5 py-2 bg-black/[0.02] border-t border-black/[0.04] flex items-center justify-between text-[10px] text-slate-500">
                                                        <span>Indicative real-time telemetry feed</span>
                                                        <span className="italic text-slate-400">Subject to counterparty network transmission variance</span>
                                                    </div>
                                                </div>
                                            )}

                                            <form id="quote-form" onSubmit={(rfq?.legs && rfq.legs.length > 1) ? handleBatchSubmit : handleSubmit} className="space-y-4">
                                                {/* Viewer / Monitoring Mode Banner */}
                                                {isReadOnlyViewer && (
                                                    <div className={`p-4 rounded-2xl text-xs leading-relaxed border ${isApprover ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-blue-50/70 border-blue-200 text-blue-900'
                                                        }`}>
                                                        <div className="flex items-center gap-2 font-bold mb-1">
                                                            <Shield size={15} className={isApprover ? 'text-amber-600' : 'text-blue-600'} />
                                                            <span>{isApprover ? 'Approver Monitoring Mode' : 'View-Only Observer Mode'}</span>
                                                        </div>
                                                        <p className="text-[11.5px] leading-relaxed">
                                                            {isApprover
                                                                ? (deskState?.active_trader_name || deskState?.active_trader_email
                                                                    ? `Live RFQ desk is actively managed by ${deskState?.active_trader_name || deskState?.active_trader_email}. Rates and inputs entered by your execution desk are mirrored dynamically below in read-only mode.`
                                                                    : 'You are monitoring this quotation in read-only mode. Inputs entered by your bank’s execution dealers will be mirrored dynamically below.')
                                                                : 'Your registered account has observer permissions. You can inspect trade parameters and mirror live pricing entered by execution dealers.'}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Multi-Dealer Desk Concurrency Banner (Only for Execution Dealers in Spectator Mode) */}
                                                {isSpectator && (
                                                    <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl shadow-xs text-xs animate-fade-in-up">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                            <div className="flex items-start gap-3">
                                                                <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                                                                    <Lock size={18} />
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-amber-950 text-sm flex items-center gap-1.5">
                                                                        <span>Desk Actively Controlled by Colleague</span>
                                                                    </div>
                                                                    <p className="text-amber-800 text-xs mt-0.5">
                                                                        <strong>{deskState?.active_trader_name || deskState?.active_trader_email}</strong> ({deskState?.active_trader_email}) is currently the designated active dealer. Your desk inputs are locked in spectator mode to prevent pricing collisions.
                                                                    </p>
                                                                    {deskNotice && (
                                                                        <p className="text-blue-700 font-semibold mt-1 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200">
                                                                            ℹ️ {deskNotice}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={handleTakeoverDesk}
                                                                disabled={timeLeft.status === 'CLOSED' || isTakingOver}
                                                                className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <Zap size={14} className={isTakingOver ? "animate-spin" : ""} />
                                                                {isTakingOver ? "Taking Over..." : "⚡ Take Over Desk"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {deskState?.is_active_trader && (authSession?.role === 'EXECUTION' || canApproverExecute) && (
                                                    <div className={`p-2.5 px-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs ${timeLeft.status === 'OPEN'
                                                            ? 'bg-slate-100/90 border border-slate-200 text-slate-800'
                                                            : 'bg-slate-50 border border-slate-200 text-slate-700'
                                                        }`}>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-2 h-2 rounded-full ${timeLeft.status === 'OPEN' ? 'bg-sky-500 animate-pulse' : 'bg-slate-400'}`} />
                                                            <span className="font-semibold text-slate-900">Active Quoting Desk:</span>
                                                            <span className="text-slate-700 font-mono">You ({authSession?.email})</span>
                                                        </div>
                                                        {deskState.execution_colleagues_count > 0 ? (
                                                            <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800 bg-amber-100/70 border border-amber-300 px-2.5 py-0.5 rounded-lg">
                                                                <Users size={12} className="text-amber-700" />
                                                                <span>{deskState.execution_colleagues_count} Colleague Dealer{deskState.execution_colleagues_count > 1 ? 's' : ''} Online (Spectating)</span>
                                                            </div>
                                                        ) : (rfq?.total_execution_dealers > 1) ? (
                                                            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-200/60 px-2.5 py-0.5 rounded-lg">
                                                                <Users size={12} />
                                                                <span>Multi-Dealer Desk ({rfq.total_execution_dealers} Execution Contacts Configured &bull; Colleague Offline)</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[11px] text-slate-500 font-medium">Solo Execution Desk</span>
                                                        )}
                                                    </div>
                                                )}

                                                {rfq.type === 'TBILL' ? (
                                                    <div className="space-y-3.5">
                                                        {draftRestored && !submitted && (
                                                            <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900 animate-fadeIn">
                                                                <div className="flex items-center gap-2">
                                                                    <RefreshCw size={14} className="text-amber-600 shrink-0" />
                                                                    <span><strong>Draft Restored:</strong> Your previously uncommitted tranche inputs were recovered from this browser session.</span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        try {
                                                                            sessionStorage.removeItem(`tbill_draft_${token}`);
                                                                        } catch (e) { }
                                                                        setDraftRestored(false);
                                                                        const isSettlementFixed = rfq.settlement_date_start && (!rfq.settlement_date_end || rfq.settlement_date_start === rfq.settlement_date_end);
                                                                        const isMaturityFixed = rfq.maturity_date_start && (!rfq.maturity_date_end || rfq.maturity_date_start === rfq.maturity_date_end);
                                                                        setTbillLines([{
                                                                            settlementDate: isSettlementFixed ? rfq.settlement_date_start : '',
                                                                            maturityDate: isMaturityFixed ? rfq.maturity_date_start : '',
                                                                            discountRate: '',
                                                                            maxAmount: ''
                                                                        }]);
                                                                        setTraderNotes('');
                                                                    }}
                                                                    className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline ml-3 shrink-0 cursor-pointer"
                                                                >
                                                                    Discard Draft
                                                                </button>
                                                            </div>
                                                        )}
                                                        {tbillLines.map((line, index) => (
                                                            <div key={index} className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200 relative group">
                                                                {tbillLines.length > 1 && timeLeft.status === 'OPEN' && !isSpectator && !isReadOnlyViewer && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeTbillLine(index)}
                                                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm cursor-pointer"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                )}
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                    <div>
                                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Settlement Date</label>
                                                                        <input
                                                                            type="date"
                                                                            required
                                                                            disabled={timeLeft.status !== 'OPEN' || isSpectator || isReadOnlyViewer}
                                                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-black disabled:bg-slate-100 disabled:text-slate-400"
                                                                            value={line.settlementDate}
                                                                            onChange={e => updateTbillLine(index, 'settlementDate', e.target.value)}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Maturity Date</label>
                                                                        <input
                                                                            type="date"
                                                                            required
                                                                            disabled={timeLeft.status !== 'OPEN' || isSpectator || isReadOnlyViewer}
                                                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-black disabled:bg-slate-100 disabled:text-slate-400"
                                                                            value={line.maturityDate}
                                                                            onChange={e => updateTbillLine(index, 'maturityDate', e.target.value)}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Discount Rate (%)</label>
                                                                        <input
                                                                            type="number"
                                                                            step="0.0001"
                                                                            required
                                                                            disabled={timeLeft.status !== 'OPEN' || isSpectator || isReadOnlyViewer}
                                                                            onWheel={(e) => e.currentTarget.blur()}
                                                                            placeholder="e.g. 18.50"
                                                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-black disabled:bg-slate-100 disabled:text-slate-400"
                                                                            value={line.discountRate}
                                                                            onChange={e => updateTbillLine(index, 'discountRate', e.target.value)}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Max Amount</label>
                                                                        <input
                                                                            type="number"
                                                                            required
                                                                            disabled={timeLeft.status !== 'OPEN' || isSpectator || isReadOnlyViewer}
                                                                            onWheel={(e) => e.currentTarget.blur()}
                                                                            placeholder="e.g. 10000000"
                                                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-black disabled:bg-slate-100 disabled:text-slate-400"
                                                                            value={line.maxAmount}
                                                                            onChange={e => updateTbillLine(index, 'maxAmount', e.target.value)}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                {line.discountRate && line.maxAmount && (
                                                                    <div className="mt-2 text-right">
                                                                        <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 font-bold">
                                                                            Rate: {line.discountRate}% &bull; Cap: {new Intl.NumberFormat().format(line.maxAmount)}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}

                                                        {timeLeft.status === 'OPEN' && !isSpectator && !isReadOnlyViewer && (
                                                            <button
                                                                type="button"
                                                                onClick={addTbillLine}
                                                                className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                                                            >
                                                                + Add Line Item
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (rfq.legs && rfq.legs.length > 1) ? (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                                            <div>
                                                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                                                    <TrendingUp size={14} className="text-emerald-600" /> Multi-Pair Quoting Console
                                                                </h4>
                                                                <p className="text-[11px] text-slate-500 mt-0.5">
                                                                    Enter your firm quotes for all {rfq.legs.length} currency pair legs.
                                                                </p>
                                                            </div>
                                                            <span className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                                {Object.values(legQuotes).filter(q => q?.price && parseFloat(q.price) > 0).length} / {rfq.legs.length} Quoted
                                                            </span>
                                                        </div>

                                                        <div className="space-y-3.5">
                                                            {rfq.legs.map((leg, idx) => {
                                                                const q = legQuotes[leg.id] || { price: '', offered_value_date: leg.value_date || '', notes: '' };
                                                                const legPairName = leg.currency_pair || `${leg.buy_currency}/${leg.sell_currency}`;
                                                                const rawRank = rfq?.is_live_ranking_enabled ? (
                                                                    legLiveRanks[leg.id]
                                                                    || legLiveRanks[String(leg.id)]
                                                                    || legLiveRanks[idx]
                                                                    || legLiveRanks[String(idx)]
                                                                    || legLiveRanks[legPairName]
                                                                    || leg.live_rank
                                                                ) : null;
                                                                const legRank = (rfq?.is_live_ranking_enabled && rawRank)
                                                                    ? (typeof rawRank === 'number'
                                                                        ? { rank: rawRank, total_quotes: liveRank?.total_quotes || 1, is_leading: rawRank === 1 }
                                                                        : rawRank)
                                                                    : null;
                                                                const hasQuote = q.price && parseFloat(q.price) > 0;
                                                                const isHighlighted = highlightedLegId === leg.id;
                                                                const hasRecordedOffer = leg.offers && leg.offers.length > 0;

                                                                return (
                                                                    <div
                                                                        key={leg.id || idx}
                                                                        id={`leg-card-${leg.id}`}
                                                                        className={`p-4 rounded-2xl border transition-all ${isHighlighted
                                                                                ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-400 shadow-md animate-pulse'
                                                                                : hasQuote ? 'bg-white border-slate-300 shadow-xs' : 'bg-slate-50 border-slate-200'
                                                                            }`}
                                                                    >
                                                                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-black flex items-center justify-center font-mono">
                                                                                    {idx + 1}
                                                                                </span>
                                                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase text-white ${(leg.direction || 'BUY').toUpperCase() === 'BUY' ? 'bg-emerald-600' : 'bg-blue-600'
                                                                                    }`}>
                                                                                    {leg.direction || 'BUY'}
                                                                                </span>
                                                                                <span className="font-mono font-black text-sm text-slate-900">
                                                                                    {leg.currency_pair || `${leg.buy_currency}/${leg.sell_currency}`}
                                                                                </span>
                                                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded tracking-wide uppercase ${(leg.quotation_base || rfq.quotation_base || 'Execution').toLowerCase() === 'indicative'
                                                                                        ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                                                                        : 'bg-black text-white'
                                                                                    }`}>
                                                                                    {(leg.quotation_base || rfq.quotation_base || 'Execution').toLowerCase() === 'indicative' ? '📊 INDICATIVE' : '⚡ EXECUTION'}
                                                                                </span>
                                                                                <span className="text-xs text-slate-500 font-semibold">
                                                                                    ({new Intl.NumberFormat().format(leg.amount || 0)} {leg.buy_currency})
                                                                                </span>
                                                                            </div>

                                                                            {/* Status / Live Ranking / Awarding Outcome Stamp */}
                                                                            <div>
                                                                                {timeLeft.status === 'CLOSED' ? (
                                                                                    (() => {
                                                                                        const isSinglePair = !rfq.legs || rfq.legs.length <= 1;
                                                                                        const legOutcome = outcomeData?.legs_breakdown?.[leg.id]
                                                                                            || outcomeData?.legs_breakdown?.[String(leg.id)]
                                                                                            || outcomeData?.legs_breakdown?.[idx]
                                                                                            || outcomeData?.legs_breakdown?.[String(idx)]
                                                                                            || outcomeData?.legs_breakdown?.[legPairName]
                                                                                            || (outcomeData?.won_pairs?.includes(legPairName) ? { is_winner: true, status: 'WINNER' } : null)
                                                                                            || (outcomeData?.lost_pairs?.includes(legPairName) ? { is_winner: false, status: 'NOT_SELECTED' } : null)
                                                                                            || (outcomeData?.inconclusive_pairs?.includes(legPairName) ? { is_winner: false, status: 'INCONCLUSIVE' } : null);

                                                                                        const isLegWon = Boolean(
                                                                                            legOutcome?.status === 'WINNER' ||
                                                                                            legOutcome?.status === 'WON' ||
                                                                                            legOutcome?.is_winner ||
                                                                                            legOutcome?.won ||
                                                                                            outcomeData?.won_pairs?.includes(legPairName) ||
                                                                                            (isSinglePair && resultStatus === 'WINNER')
                                                                                        );
                                                                                        const isLegNotSelected = Boolean(
                                                                                            legOutcome?.status === 'NOT_SELECTED' ||
                                                                                            legOutcome?.status === 'LOST' ||
                                                                                            outcomeData?.lost_pairs?.includes(legPairName) ||
                                                                                            (isSinglePair && resultStatus === 'NOT_SELECTED')
                                                                                        );
                                                                                        const isLegInconclusive = Boolean(
                                                                                            legOutcome?.status === 'INCONCLUSIVE' ||
                                                                                            legOutcome?.raw_status === 'INCONCLUSIVE' ||
                                                                                            outcomeData?.inconclusive_pairs?.includes(legPairName) ||
                                                                                            (isSinglePair && resultStatus === 'INCONCLUSIVE')
                                                                                        );
                                                                                        const isLegIndicative = Boolean(
                                                                                            legOutcome?.status === 'INDICATIVE' ||
                                                                                            legOutcome?.status === 'INDICATIVE_ONLY' ||
                                                                                            (resultStatus === 'INDICATIVE_ONLY') ||
                                                                                            (leg.quotation_base || '').toLowerCase() === 'indicative'
                                                                                        );

                                                                                        if (isLegWon) {
                                                                                            return (
                                                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-2xs">
                                                                                                    🏆 WON (AWARDED)
                                                                                                </span>
                                                                                            );
                                                                                        } else if (isLegNotSelected) {
                                                                                            return (
                                                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs">
                                                                                                    ❌ NOT SELECTED
                                                                                                </span>
                                                                                            );
                                                                                        } else if (isLegIndicative) {
                                                                                            return (
                                                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">
                                                                                                    📊 INDICATIVE RECORDED
                                                                                                </span>
                                                                                            );
                                                                                        } else if (isLegInconclusive) {
                                                                                            return (
                                                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                                                                                    ⚠️ NO WINNER
                                                                                                </span>
                                                                                            );
                                                                                        } else {
                                                                                            return (
                                                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700">
                                                                                                    Quotation Closed
                                                                                                </span>
                                                                                            );
                                                                                        }
                                                                                    })()
                                                                                ) : rfq.is_live_ranking_enabled ? (
                                                                                    legRank?.rank === 1 ? (
                                                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white shadow-xs animate-pulse">
                                                                                            🏆 #1 Leading Quote
                                                                                        </span>
                                                                                    ) : legRank?.rank ? (
                                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono shadow-2xs">
                                                                                            Rank #{legRank.rank} of {legRank.total_quotes || 1}
                                                                                        </span>
                                                                                    ) : hasRecordedOffer ? (
                                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                                                                                            <CheckCircle2 size={12} className="text-emerald-600" /> Quote Recorded ({parseFloat(leg.offers[0].price).toFixed(4)})
                                                                                        </span>
                                                                                    ) : hasQuote ? (
                                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                                                                            ✍️ Draft (Ready to Submit)
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="text-[11px] text-slate-400 font-semibold bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                                                                                            ⏳ Awaiting Quote
                                                                                        </span>
                                                                                    )
                                                                                ) : hasRecordedOffer ? (
                                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                                                                                        <CheckCircle2 size={12} className="text-emerald-600" /> Quote Recorded ({parseFloat(leg.offers[0].price).toFixed(4)})
                                                                                    </span>
                                                                                ) : hasQuote ? (
                                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                                                                        ✍️ Draft Quote
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-[11px] text-slate-400 font-semibold bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                                                                                        ⏳ Awaiting Quote
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                                                                            <div className={leg.allow_alternative_value_date ? "sm:col-span-7" : "sm:col-span-8"}>
                                                                                <div className="flex items-center justify-between mb-1">
                                                                                    <label className="text-[10px] font-bold text-gray-500 uppercase">
                                                                                        Rate ({leg.sell_currency} per 1 {leg.buy_currency})
                                                                                    </label>
                                                                                    {leg.cbe_benchmark_rate && (
                                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs" title="Central Bank of Egypt Mid Benchmark">
                                                                                            <span className="text-[9px] uppercase tracking-wider text-blue-500 font-sans font-semibold">CBE Mid</span>
                                                                                            <span>~{parseFloat(leg.cbe_benchmark_rate).toFixed(4)}</span>
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="relative">
                                                                                    <input
                                                                                        type="number"
                                                                                        step="0.0001"
                                                                                        required
                                                                                        disabled={timeLeft.status !== 'OPEN' || isSubmitting || isSpectator || isReadOnlyViewer}
                                                                                        onWheel={(e) => e.currentTarget.blur()}
                                                                                        placeholder="Enter rate (e.g. 48.6500)"
                                                                                        className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2 text-base font-bold font-mono focus:bg-white outline-none disabled:bg-slate-100 disabled:text-slate-400 ${isHighlighted ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200 focus:border-slate-900'
                                                                                            }`}
                                                                                        value={q.price}
                                                                                        onChange={e => {
                                                                                            if (highlightedLegId === leg.id) setHighlightedLegId(null);
                                                                                            updateLegQuote(leg.id, 'price', e.target.value);
                                                                                        }}
                                                                                    />
                                                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs pointer-events-none">
                                                                                        {leg.sell_currency}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {leg.allow_alternative_value_date ? (
                                                                                <div className="sm:col-span-5">
                                                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                                                                        Proposed Value Date
                                                                                    </label>
                                                                                    <input
                                                                                        type="date"
                                                                                        min={rfq?.window_start ? rfq.window_start.split('T')[0] : new Date().toISOString().split('T')[0]}
                                                                                        disabled={timeLeft.status !== 'OPEN' || isSubmitting || isSpectator || isReadOnlyViewer}
                                                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-800 focus:bg-white focus:border-slate-900 outline-none disabled:bg-slate-100"
                                                                                        value={q.offered_value_date || leg.value_date || ''}
                                                                                        onChange={e => updateLegQuote(leg.id, 'offered_value_date', e.target.value)}
                                                                                    />
                                                                                </div>
                                                                            ) : (
                                                                                <div className="sm:col-span-4 flex flex-col justify-end">
                                                                                    <span className="text-[10px] text-slate-400 block mb-1">Value Date</span>
                                                                                    <span className="text-xs font-semibold text-slate-800 py-1.5">
                                                                                        {formatDate(leg.value_date)}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                                            <div>
                                                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                                                    <TrendingUp size={14} className="text-emerald-600" /> Spot FX Quoting Console
                                                                </h4>
                                                                <p className="text-[11px] text-slate-500 mt-0.5">
                                                                    {timeLeft.status === 'OPEN' ? 'Enter your firm quote for this currency pair.' : 'Quotation window is currently closed.'}
                                                                </p>
                                                            </div>
                                                            <span className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                                {(price && parseFloat(price) > 0) ? '1 / 1 Quoted' : '0 / 1 Quoted'}
                                                            </span>
                                                        </div>

                                                        <div className="space-y-3.5">
                                                            <div
                                                                className={`p-4 rounded-2xl border transition-all ${(price && parseFloat(price) > 0) ? 'bg-white border-slate-300 shadow-xs' : 'bg-slate-50 border-slate-200'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-black flex items-center justify-center font-mono">
                                                                            1
                                                                        </span>
                                                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase text-white ${(rfq.direction || 'BUY').toUpperCase() === 'BUY' ? 'bg-emerald-600' : 'bg-blue-600'
                                                                            }`}>
                                                                            {rfq.direction || 'BUY'}
                                                                        </span>
                                                                        <span className="font-mono font-black text-sm text-slate-900">
                                                                            {rfq.buy_currency}/{rfq.sell_currency}
                                                                        </span>
                                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded tracking-wide uppercase ${(rfq.quotation_base || 'Execution').toLowerCase() === 'indicative'
                                                                                ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                                                                : 'bg-black text-white'
                                                                            }`}>
                                                                            {(rfq.quotation_base || 'Execution').toLowerCase() === 'indicative' ? '📊 INDICATIVE' : '⚡ EXECUTION'}
                                                                        </span>
                                                                        <span className="text-xs text-slate-500 font-semibold">
                                                                            ({new Intl.NumberFormat().format(rfq.amount || 0)} {rfq.buy_currency})
                                                                        </span>
                                                                    </div>

                                                                    {/* Status / Live Ranking / Awarding Outcome Stamp */}
                                                                    <div>
                                                                        {timeLeft.status === 'CLOSED' ? (
                                                                            (() => {
                                                                                const isWon = resultStatus === 'WINNER';
                                                                                const isNotSelected = resultStatus === 'NOT_SELECTED';
                                                                                const isIndicativeClosed = (resultStatus === 'INDICATIVE_ONLY') || (rfq.quotation_base || '').toLowerCase() === 'indicative';
                                                                                const isInconclusive = resultStatus === 'INCONCLUSIVE';

                                                                                if (isWon) {
                                                                                    return (
                                                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-2xs">
                                                                                            🏆 WON (AWARDED)
                                                                                        </span>
                                                                                    );
                                                                                } else if (isNotSelected) {
                                                                                    return (
                                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs">
                                                                                            ❌ NOT SELECTED
                                                                                        </span>
                                                                                    );
                                                                                } else if (isIndicativeClosed) {
                                                                                    return (
                                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">
                                                                                            📊 INDICATIVE RECORDED
                                                                                        </span>
                                                                                    );
                                                                                } else if (isInconclusive) {
                                                                                    return (
                                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                                                                            ⚠️ NO WINNER
                                                                                        </span>
                                                                                    );
                                                                                } else {
                                                                                    return (
                                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700">
                                                                                            Quotation Closed
                                                                                        </span>
                                                                                    );
                                                                                }
                                                                            })()
                                                                        ) : rfq.is_live_ranking_enabled ? (
                                                                            liveRank?.rank === 1 ? (
                                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white shadow-xs animate-pulse">
                                                                                    🏆 #1 Leading Quote
                                                                                </span>
                                                                            ) : liveRank?.rank ? (
                                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono shadow-2xs">
                                                                                    Rank #{liveRank.rank} of {liveRank.total_quotes || 1}
                                                                                </span>
                                                                            ) : (price && parseFloat(price) > 0) ? (
                                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                                                                    ✍️ Draft (Ready to Submit)
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-[11px] text-slate-400 font-semibold bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                                                                                    ⏳ Awaiting Quote
                                                                                </span>
                                                                            )
                                                                        ) : (price && parseFloat(price) > 0) ? (
                                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                                                                ✍️ Draft Quote
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[11px] text-slate-400 font-semibold bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                                                                                ⏳ Awaiting Quote
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                                                                    <div className={rfq.allow_alternative_value_date ? "sm:col-span-7" : "sm:col-span-8"}>
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <label className="text-[10px] font-bold text-gray-500 uppercase">
                                                                                Rate ({rfq.sell_currency} per 1 {rfq.buy_currency})
                                                                            </label>
                                                                            {rfq.cbe_benchmark_rate && (
                                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs" title="Central Bank of Egypt Mid Benchmark">
                                                                                    <span className="text-[9px] uppercase tracking-wider text-blue-500 font-sans font-semibold">CBE Mid</span>
                                                                                    <span>~{parseFloat(rfq.cbe_benchmark_rate).toFixed(4)}</span>
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="relative">
                                                                            <input
                                                                                type="number"
                                                                                step="0.0001"
                                                                                required
                                                                                disabled={timeLeft.status !== 'OPEN' || isSubmitting || isSpectator || isReadOnlyViewer}
                                                                                onWheel={(e) => e.currentTarget.blur()}
                                                                                placeholder="Enter spot rate (e.g. 48.6500)"
                                                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-base font-bold font-mono focus:bg-white focus:border-slate-900 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                                                                                value={price}
                                                                                onChange={e => setPrice(e.target.value)}
                                                                            />
                                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs pointer-events-none">
                                                                                {rfq.sell_currency}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {rfq.allow_alternative_value_date ? (
                                                                        <div className="sm:col-span-5">
                                                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                                                                Proposed Value Date
                                                                            </label>
                                                                            <input
                                                                                type="date"
                                                                                min={rfq?.window_start ? rfq.window_start.split('T')[0] : new Date().toISOString().split('T')[0]}
                                                                                disabled={timeLeft.status !== 'OPEN' || isSubmitting || isSpectator || isReadOnlyViewer}
                                                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-800 focus:bg-white focus:border-slate-900 outline-none disabled:bg-slate-100"
                                                                                value={offeredValueDate || rfq.value_date || ''}
                                                                                onChange={e => setOfferedValueDate(e.target.value)}
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="sm:col-span-4 flex flex-col justify-end">
                                                                            <span className="text-[10px] text-slate-400 block mb-1">Value Date</span>
                                                                            <span className="text-xs font-semibold text-slate-800 py-1.5">
                                                                                {formatDate(rfq.value_date)}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Trader Comments / Notes */}
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1.5">
                                                        <MessageSquare size={13} className="text-gray-400" />
                                                        Trader Comments / Execution Notes (Optional)
                                                    </label>
                                                    <textarea
                                                        rows={2}
                                                        disabled={timeLeft.status !== 'OPEN' || isSubmitting || isSpectator || isReadOnlyViewer}
                                                        placeholder="Add any settlement notes, execution remarks, or comments for the treasury desk..."
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-gray-800 focus:bg-white focus:ring-2 focus:ring-black/5 transition-all outline-none resize-none disabled:bg-slate-100 disabled:text-slate-400"
                                                        value={traderNotes}
                                                        onChange={(e) => setTraderNotes(e.target.value)}
                                                    />
                                                </div>

                                                {/* Form Submit Action directly below */}
                                                <div className="pt-1 space-y-3">
                                                    {crossInversion && timeLeft.status === 'OPEN' && !isReadOnlyViewer && (
                                                        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950 animate-fade-in shadow-xs">
                                                            <div className="flex items-start gap-2.5">
                                                                <div className="w-7 h-7 rounded-lg bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                                                                    <AlertTriangle size={15} />
                                                                </div>
                                                                <div>
                                                                    <span className="font-bold block text-amber-900">
                                                                        ⚠️ Possible Accidental Rate Swap Detected
                                                                    </span>
                                                                    <p className="text-[11px] text-amber-800 leading-tight mt-0.5">
                                                                        <strong>{crossInversion.pairA}</strong> ({crossInversion.pA.toFixed(4)}) is quoted {crossInversion.pA > crossInversion.pB ? 'higher' : 'lower'} than <strong>{crossInversion.pairB}</strong> ({crossInversion.pB.toFixed(4)}), inverting prevailing market benchmark levels (CBE Mid: ~{crossInversion.bmA.toFixed(4)} vs ~{crossInversion.bmB.toFixed(4)}).
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    updateLegQuote(crossInversion.legA.id, 'price', String(crossInversion.pB));
                                                                    updateLegQuote(crossInversion.legB.id, 'price', String(crossInversion.pA));
                                                                }}
                                                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer self-end sm:self-center"
                                                            >
                                                                <RotateCw size={13} /> Swap Leg Rates
                                                            </button>
                                                        </div>
                                                    )}
                                                    {isReadOnlyViewer ? (
                                                        <div className="w-full py-3.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-2xl font-bold text-xs flex items-center justify-center gap-2">
                                                            <Shield size={16} className={isApprover ? 'text-amber-600' : 'text-blue-600'} />
                                                            <span>
                                                                {isApprover
                                                                    ? '🛡️ Approver Monitoring Mode • Submissions are managed by your execution desk'
                                                                    : '👁️ View-Only Observer Mode • Rates entered by execution dealers are mirrored above'}
                                                            </span>
                                                        </div>
                                                    ) : isSpectator ? (
                                                        <button
                                                            type="button"
                                                            onClick={handleTakeoverDesk}
                                                            disabled={timeLeft.status === 'CLOSED' || isTakingOver}
                                                            className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-2xl font-bold text-base transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                                                        >
                                                            <Zap size={16} className={isTakingOver ? "animate-spin" : ""} />
                                                            {isTakingOver ? 'Transferring Desk Control...' : '⚡ Take Over Desk to Submit Quote'}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="submit"
                                                            disabled={timeLeft.status !== 'OPEN' || isSubmitting || !authSession || (
                                                                rfq.type === 'TBILL'
                                                                    ? tbillLines.some(l => !l.discountRate || !l.maxAmount)
                                                                    : (rfq.legs && rfq.legs.length > 1)
                                                                        ? rfq.legs.some(l => !legQuotes[l.id]?.price || parseFloat(legQuotes[l.id].price) <= 0)
                                                                        : !price
                                                            )}
                                                            className={`w-full py-3.5 rounded-2xl font-bold text-base transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${timeLeft.status === 'OPEN' && timeLeft.secondsRemaining !== null && timeLeft.secondsRemaining <= 10
                                                                    ? 'bg-gradient-to-r from-amber-600 via-rose-600 to-red-600 hover:from-amber-700 hover:to-red-700 text-white animate-pulse shadow-red-500/25 ring-2 ring-red-400/50'
                                                                    : 'bg-slate-950 text-white hover:bg-slate-800'
                                                                }`}
                                                        >
                                                            {isSubmitting ? (
                                                                <>
                                                                    <Loader2 size={18} className="animate-spin text-white" />
                                                                    <span>Transmitting In-Flight Quote...</span>
                                                                </>
                                                            ) : timeLeft.status === 'PRE' ? (
                                                                'Waiting for Window to Open'
                                                            ) : timeLeft.status === 'CLOSED' ? (
                                                                'Window Closed'
                                                            ) : timeLeft.status === 'OPEN' && timeLeft.secondsRemaining !== null && timeLeft.secondsRemaining <= 10 ? (
                                                                <>
                                                                    <Zap size={18} className="animate-bounce text-amber-200" />
                                                                    <span>⚡ {
                                                                        (rfq.legs && rfq.legs.length > 1)
                                                                            ? (submitted ? `Update All Quotes (${rfq.legs.length} Pairs)` : `Submit All Quotes (${rfq.legs.length} Pairs)`)
                                                                            : submitted ? (isIndicative ? 'Update Indicative Quote' : 'Update Quote') : (isIndicative ? 'Submit Indicative Quote' : 'Submit Binding Quote')
                                                                    } • {String(timeLeft.secondsRemaining).padStart(2, '0')}s Left!</span>
                                                                </>
                                                            ) : (
                                                                (rfq.legs && rfq.legs.length > 1)
                                                                    ? (submitted ? `Update All Quotes (${rfq.legs.length} Pairs)` : `Submit All Quotes (${rfq.legs.length} Pairs)`)
                                                                    : submitted
                                                                        ? (isIndicative ? 'Update Indicative Quote' : 'Update Quote')
                                                                        : (isIndicative ? 'Submit Indicative Quote' : 'Submit Binding Quote')
                                                            )}
                                                        </button>
                                                    )}
                                                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 mt-2">
                                                        <Shield size={12} className="text-emerald-600" />
                                                        <span>Institutional End-to-End Encryption & Audit Logging Active</span>
                                                    </div>

                                                    {/* Transmission Latency & Legal Liability Limitation Advisory */}
                                                    <div className="mt-3.5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-[10.5px] leading-relaxed text-slate-500 space-y-2">
                                                        <div className="flex items-start gap-2">
                                                            <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                                            <div>
                                                                <strong className="text-slate-700 font-semibold">Transmission & Telemetry Advisory:</strong>{' '}
                                                                Quotations, desk concurrency, and live rankings are synchronized via high-frequency telemetry. Delivery timing is subject to local internet connectivity, ISP routing, and public internet conditions. The platform and client organization assume no liability for transmission latency, clock discrepancies, or submissions received after window expiry. Dealers are advised to transmit quotes well in advance of the cutoff time.
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-2 pt-2 border-t border-slate-200/60 text-slate-500">
                                                            <Shield size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                                            <div>
                                                                <strong className="text-slate-700 font-semibold">Platform Role & Liability Limitation:</strong>{' '}
                                                                Grow Treasury Platform operates solely as an independent communications and workflow routing technology (&ldquo;AS IS&rdquo;). Grow Treasury is not a principal, broker, or clearing party to this transaction and assumes zero transaction, credit, market, or settlement liability. All commercial terms, rate commitments, and trade execution obligations exist strictly and bilaterally between {rfq.entity_name || rfq.customer_name || 'the corporate legal entity'} and {rfq.bank_name || 'the participating bank'}.
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </form>
                                        </section>
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* TAB 2: COUNTERPARTY QUOTATION HISTORY */}
                {activeTab === 'HISTORY' && (
                    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-200 animate-fade-in-up">
                        <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4 flex-wrap gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <History className="text-blue-600" size={20} />
                                    Desk Quotation History with {rfq.entity_name || rfq.customer_name}
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">Past request submissions, win rates, and execution status records for {rfq.bank_name}.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleExportHistory}
                                    disabled={isLoadingHistory || historyData.length === 0}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                                    title="Export full desk quotation history to Excel-compatible CSV"
                                >
                                    <Download size={14} className="text-emerald-600" /> Export CSV
                                </button>
                                <button
                                    onClick={fetchHistory}
                                    disabled={isLoadingHistory}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                >
                                    <RefreshCw size={14} className={isLoadingHistory ? 'animate-spin' : ''} /> Refresh
                                </button>
                            </div>
                        </div>

                        {isLoadingHistory ? (
                            <div className="py-16 text-center text-slate-400 text-xs">Loading quotation history...</div>
                        ) : historyData.length === 0 ? (
                            <div className="py-16 text-center text-slate-400 text-xs">No previous quotations found for this desk.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                            <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider">RFQ Reference</th>
                                            <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider">Product & Direction</th>
                                            <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider">Deal Volume</th>
                                            <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider">Your Submitted Rate</th>
                                            <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider">Submitted By</th>
                                            <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-right">Outcome</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {historyData.map((h, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                                                    <div>{h.ref_no}</div>
                                                    {h.entity_name && (
                                                        <div className="text-[10px] font-sans font-medium text-slate-500 mt-0.5">
                                                            🏢 {h.entity_name}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className="font-semibold text-gray-800">{h.type}</span> &bull; <span className="text-gray-500">{h.direction || 'N/A'}</span>
                                                </td>
                                                <td className="py-3.5 px-4 font-semibold text-gray-900">
                                                    {h.is_multi_leg && h.legs && h.legs.length > 0 ? (
                                                        <div className="space-y-1">
                                                            <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                                                                <span>📦 Package</span>
                                                                <span className="text-[10px] text-slate-500 font-normal">({h.legs.length} Pairs)</span>
                                                            </div>
                                                            {h.legs.map((leg, lIdx) => (
                                                                <div key={lIdx} className="text-[10.5px] text-slate-600 font-mono">
                                                                    {new Intl.NumberFormat().format(leg.amount)} {leg.pair}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {h.amount ? `${new Intl.NumberFormat().format(h.amount)}` : 'N/A'} {h.currency_pair ? `(${h.currency_pair})` : ''}
                                                        </>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                                                    {h.is_multi_leg && h.legs && h.legs.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {h.legs.map((leg, lIdx) => (
                                                                <div key={lIdx} className="text-[10.5px] flex items-center gap-1.5">
                                                                    <span className="text-[10px] text-slate-400 font-sans font-semibold">{leg.pair}:</span>
                                                                    <span className={leg.is_winner ? 'text-emerald-600 font-black' : 'text-blue-600'}>
                                                                        {leg.submitted_price !== null ? leg.submitted_price : <span className="text-gray-400 font-normal">—</span>}
                                                                    </span>
                                                                    {leg.is_winner && <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-sans font-bold">WON</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        h.best_quote !== null ? h.best_quote : <span className="text-gray-400 font-sans font-normal">No Quote</span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-gray-500 font-mono">
                                                    <div>{h.submitted_by || '—'}</div>
                                                    {h.notes && (
                                                        <div className="text-[11px] font-sans text-slate-600 bg-slate-100 px-2 py-0.5 rounded mt-1 max-w-xs truncate" title={h.notes}>
                                                            💬 {h.notes}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-right">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${h.outcome === 'WON' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                                                            h.outcome === 'PARTIALLY_WON' ? 'bg-teal-50 text-teal-800 border-teal-300' :
                                                                h.outcome === 'NOT_SELECTED' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                                    h.outcome === 'SUBMITTED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                        h.outcome === 'PARTICIPATION_DECLINED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                                            h.outcome === 'EXPIRED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                                h.outcome === 'REJECTED' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                                                                    'bg-gray-100 text-gray-600 border-gray-200'
                                                        }`}>
                                                        {h.outcome === 'WON'
                                                            ? (h.is_multi_leg ? `🏆 Won (${h.won_legs_count || h.legs_count}/${h.legs_count} Pairs)` : '🏆 Won (Awarded)') :
                                                            h.outcome === 'PARTIALLY_WON'
                                                                ? `⚡ Won ${h.won_legs_count} of ${h.legs_count} Pairs` :
                                                                h.outcome === 'NOT_SELECTED' ? 'Not Selected' :
                                                                    h.outcome === 'SUBMITTED' ? '⏳ Submitted' :
                                                                        h.outcome === 'PARTICIPATION_DECLINED' ? '🚫 Declined' :
                                                                            h.outcome === 'EXPIRED' ? '⏰ Expired' :
                                                                                h.outcome === 'REJECTED' ? 'Unexecuted' : h.outcome}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Smart Fat-Finger Confirmation Modal (Triggered Only upon Submit for Genuine Anomalies) */}
                {fatFingerModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-900 space-y-4 animate-scale-up">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                    <AlertCircle size={22} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">{fatFingerModal.title}</h3>
                                    {fatFingerModal.benchmark !== null && fatFingerModal.benchmark !== undefined && (
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            CBE Market Benchmark: <span className="font-mono font-bold text-slate-800">~{Number(fatFingerModal.benchmark).toFixed(4)}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                                {fatFingerModal.message}
                            </div>

                            <div className="flex flex-col gap-2 pt-2">
                                {fatFingerModal.type === 'CROSS_LEG_SWAP' ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const pA = fatFingerModal.priceA;
                                                const pB = fatFingerModal.priceB;
                                                updateLegQuote(fatFingerModal.legA.id, 'price', String(pB));
                                                updateLegQuote(fatFingerModal.legB.id, 'price', String(pA));
                                                const swappedQuotes = (fatFingerModal.allQuotes || []).map(item => {
                                                    if (item.leg_id === fatFingerModal.legA.id) return { ...item, price: pB };
                                                    if (item.leg_id === fatFingerModal.legB.id) return { ...item, price: pA };
                                                    return item;
                                                });
                                                executeBatchSubmit(swappedQuotes);
                                            }}
                                            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            <RotateCw size={14} /> 🔄 Swap Leg Rates & Submit All Quotes
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => executeBatchSubmit(fatFingerModal.allQuotes)}
                                            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-all cursor-pointer"
                                        >
                                            Confirm & Submit Rates As-Is Anyway
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFatFingerModal(null)}
                                            className="w-full py-2 text-slate-500 hover:text-slate-800 font-semibold text-xs transition-colors cursor-pointer"
                                        >
                                            Cancel & Edit Quote
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {/* Lock & Isolate Valid Legs Button */}
                                        {fatFingerModal.validQuotes && fatFingerModal.validQuotes.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    const vQuotes = fatFingerModal.validQuotes;
                                                    const flaggedId = fatFingerModal.legId;
                                                    await executeBatchSubmit(vQuotes);
                                                    setFatFingerModal(null);
                                                    setHighlightedLegId(flaggedId);
                                                }}
                                                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                <Lock size={14} /> 🔒 Lock & Submit {fatFingerModal.validCount} Valid Leg(s) (Isolate Flagged Leg)
                                            </button>
                                        )}
                                        {fatFingerModal.suggestedRate && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (fatFingerModal.isTBill && fatFingerModal.suggestedLines) {
                                                        setTbillLines(fatFingerModal.suggestedLines);
                                                        executeSubmit(null, fatFingerModal.suggestedLines);
                                                    } else if (fatFingerModal.isBatch) {
                                                        const correctedPrice = fatFingerModal.suggestedRate;
                                                        updateLegQuote(fatFingerModal.legId, 'price', correctedPrice);
                                                        const updatedQuotes = [];
                                                        for (const leg of (rfq.legs || [])) {
                                                            const q = legQuotes[leg.id];
                                                            const p = leg.id === fatFingerModal.legId ? parseFloat(correctedPrice) : (q?.price ? parseFloat(q.price) : NaN);
                                                            updatedQuotes.push({
                                                                leg_id: leg.id,
                                                                price: p,
                                                                offered_value_date: leg.allow_alternative_value_date ? (q?.offered_value_date || leg.value_date || undefined) : undefined,
                                                                notes: q?.notes?.trim() || undefined
                                                            });
                                                        }
                                                        executeBatchSubmit(updatedQuotes);
                                                    } else {
                                                        const corrected = parseFloat(fatFingerModal.suggestedRate);
                                                        setPrice(fatFingerModal.suggestedRate);
                                                        executeSubmit(corrected);
                                                    }
                                                }}
                                                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                <CheckCircle2 size={15} /> Apply Suggested Value ({fatFingerModal.suggestedRate}) & Submit
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (fatFingerModal.isTBill) {
                                                    executeSubmit(null, tbillLines);
                                                } else if (fatFingerModal.isBatch) {
                                                    executeBatchSubmit();
                                                } else {
                                                    executeSubmit(fatFingerModal.enteredPrice);
                                                }
                                            }}
                                            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-all cursor-pointer"
                                        >
                                            Confirm & Submit {fatFingerModal.enteredPrice} Anyway
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFatFingerModal(null)}
                                            className="w-full py-2 text-slate-500 hover:text-slate-800 font-semibold text-xs transition-colors cursor-pointer"
                                        >
                                            Cancel & Edit Quote
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
