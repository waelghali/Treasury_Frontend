import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { 
    Clock, Landmark, AlertCircle, CheckCircle2, TrendingUp, FileText, 
    Mail, KeyRound, UserCheck, Eye, History, RefreshCw, MessageSquare, Shield,
    BarChart2, ShieldAlert, WifiOff, FileQuestion, Calendar,
    Users, Lock, Zap, Info, Loader2
} from 'lucide-react';
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

    const [rfq, setRfq] = useState(null);
    const [error, setError] = useState(null);
    const [price, setPrice] = useState('');
    const [offeredValueDate, setOfferedValueDate] = useState('');
    const [traderNotes, setTraderNotes] = useState('');
    const [tbillLines, setTbillLines] = useState([{ settlementDate: '', maturityDate: '', discountRate: '', maxAmount: '' }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [timeLeft, setTimeLeft] = useState({ label: '', status: 'PRE', secondsRemaining: null });
    const [resultStatus, setResultStatus] = useState(null);
    const [timeOffset, setTimeOffset] = useState(0);

    // Live Ranking State
    const [liveRank, setLiveRank] = useState(null);

    // Attention cues for window opening and title
    const prevStatusRef = useRef(null);
    const [showWindowOpenedAlert, setShowWindowOpenedAlert] = useState(false);
    const originalTitleRef = useRef(typeof document !== 'undefined' ? document.title : 'Grow Treasury');

    // Active View Tab: 'LIVE' or 'HISTORY'
    const [activeTab, setActiveTab] = useState('LIVE');
    const [historyData, setHistoryData] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Authentication / OTP State
    const [authSession, setAuthSession] = useState(null);
    const [inputEmail, setInputEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [isRequestingOtp, setIsRequestingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [otpError, setOtpError] = useState('');

    // Approver Action State
    const [approvalNotes, setApprovalNotes] = useState('');
    const [isActioningApproval, setIsActioningApproval] = useState(false);
    const [approvalSuccessMsg, setApprovalSuccessMsg] = useState(null);

    // Fat-Finger Confirmation Modal (Triggers ONLY upon submit for genuine anomalies)
    const [fatFingerModal, setFatFingerModal] = useState(null);

    // Multi-Dealer Desk Concurrency State
    const [deskState, setDeskState] = useState(null);
    const [isTakingOver, setIsTakingOver] = useState(false);
    const [deskNotice, setDeskNotice] = useState(null);
    const [draftRestored, setDraftRestored] = useState(false);

    const storageKey = `quotation_auth_${token}`;

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
            }
        } catch (err) {
            const status = err.response?.status;
            const detail = err.response?.data?.detail;
            const detailStr = typeof detail === 'string' ? detail : (detail ? JSON.stringify(detail) : '');
            const rawMessage = detailStr || err.message || 'Failed to load quotation details';

            const isExpired = status === 410 || 
                              detailStr.toLowerCase().includes('expired') || 
                              detailStr.toLowerCase().includes('validity of this link');
            
            const isPendingApproval = status === 403 && 
                                      detailStr.toLowerCase().includes('awaiting internal corporate approval');

            const isInvalidToken = status === 404 || 
                                   detailStr.toLowerCase().includes('invalid token');

            const isNetworkError = !err.response || err.message === 'Network Error' || err.code === 'ERR_NETWORK';

            setError({
                status,
                message: rawMessage,
                isExpired,
                isPendingApproval,
                isInvalidToken,
                isNetworkError
            });
        }
    }, [token]);

    // 2. Fetch Result
    const checkResult = useCallback(async () => {
        if (!rfq) return null;
        try {
            const res = await quotationApi.get(`/api/v1/public-quotation/${token}/result`);
            const status = res.data.status;

            if (status === 'WINNER') {
                setResultStatus('WINNER');
            } else if (status === 'INCONCLUSIVE') {
                setResultStatus('INCONCLUSIVE');
            } else if (status === 'AWAITING_MANUAL_SELECTION' || status === 'PENDING') {
                setResultStatus('AWAITING_SELECTION');
            } else if (status === 'NOT_SELECTED') {
                setResultStatus('NOT_SELECTED');
            } else if (status === 'INDICATIVE_ONLY' || status === 'COMPLETED') {
                setResultStatus(status);
            }
            return status;
        } catch (err) {
            console.error(err);
            return null;
        }
    }, [rfq, token]);

    // 3. Auto-Auth via Magic Link or SessionStorage
    useEffect(() => {
        const stored = sessionStorage.getItem(storageKey);
        if (stored) {
            try {
                setAuthSession(JSON.parse(stored));
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
        const terminalStatuses = ['WINNER', 'NOT_SELECTED', 'INCONCLUSIVE', 'INDICATIVE_ONLY', 'COMPLETED'];
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
                }
            } catch (err) {
                // Background polling errors are ignored
            }
        };

        pollRank(); // Immediate fetch upon entering active window
        const interval = setInterval(pollRank, 1500); // 1.5s turbo refresh matching corporate/end-user dashboards
        return () => clearInterval(interval);
    }, [rfq?.is_live_ranking_enabled, timeLeft.status, token]);

    // 4c. Desk Session & Multi-Dealer Concurrency Polling (Every 2s while authenticated)
    useEffect(() => {
        if (!authSession?.email || !token) return;

        const syncDeskSession = async () => {
            try {
                const res = await quotationApi.post(`/api/v1/public-quotation/${token}/desk-heartbeat`, {
                    session_token: authSession.session_token,
                    email: authSession.email,
                    name: authSession.name || authSession.email.split('@')[0],
                    role: authSession.role || 'EXECUTION'
                });
                const data = res.data;
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
                }
            } catch (err) {
                // Background heartbeat polling error ignored
            }
        };

        syncDeskSession();
        const interval = setInterval(syncDeskSession, 2000); // 2.0s cadence
        return () => clearInterval(interval);
    }, [authSession, token]);

    // 5. Live Countdown Timer with Dynamic Browser Titles & Urgency Tracking
    useEffect(() => {
        if (!rfq) return;

        const timer = setInterval(() => {
            const now = new Date(Date.now() + timeOffset);
            const start = new Date(rfq.window_start);
            const end = new Date(rfq.window_end);

            if (now < start) {
                const diff = Math.max(0, Math.floor((start.getTime() - now.getTime()) / 1000));
                const mins = Math.floor(diff / 60);
                const secs = diff % 60;
                setTimeLeft({ label: `Starts in ${mins}:${secs.toString().padStart(2, '0')}`, status: 'PRE', secondsRemaining: diff });
                if (typeof document !== 'undefined') {
                    document.title = `Starts in ${mins}:${secs.toString().padStart(2, '0')} - Grow Treasury`;
                }
            } else if (now >= start && now <= end) {
                const diff = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
                const mins = Math.floor(diff / 60);
                const secs = diff % 60;
                setTimeLeft({ label: `Window Closes in ${mins}:${secs.toString().padStart(2, '0')}`, status: 'OPEN', secondsRemaining: diff });
                
                if (typeof document !== 'undefined') {
                    if (diff <= 5) {
                        document.title = `⚠️ [${diff}s] CLOSING SOON - Grow Treasury`;
                    } else if (diff <= 30) {
                        document.title = `⏱️ [${diff}s] Quote Now - Grow Treasury`;
                    } else {
                        document.title = `🟢 [OPEN] Quote Now - Grow Treasury`;
                    }
                }
            } else {
                setTimeLeft({ label: 'Window Closed', status: 'CLOSED', secondsRemaining: 0 });
                if (typeof document !== 'undefined') {
                    document.title = 'Window Closed - Grow Treasury';
                }
                clearInterval(timer);
                checkResult();
            }
        }, 1000);

        return () => {
            clearInterval(timer);
            if (typeof document !== 'undefined' && originalTitleRef.current) {
                document.title = originalTitleRef.current;
            }
        };
    }, [rfq, timeOffset, checkResult]);

    // 5b. Window Just Opened Transition Alert
    useEffect(() => {
        if (prevStatusRef.current === 'PRE' && timeLeft.status === 'OPEN') {
            setShowWindowOpenedAlert(true);
            const card = document.getElementById('bidding-quote-card');
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        prevStatusRef.current = timeLeft.status;
    }, [timeLeft.status]);

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
            if (rfq.offers && rfq.offers.length > 0) {
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
        } catch (err) {
            setOtpError(err.response?.data?.detail || 'Invalid or expired code.');
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem(storageKey);
        setAuthSession(null);
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
                session_token: authSession.session_token,
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
                    session_token: authSession.session_token,
                    email: authSession.email
                }
                : { 
                    token, 
                    price: priceToSubmit !== undefined && priceToSubmit !== null ? priceToSubmit : parseFloat(price),
                    offered_value_date: rfq.allow_alternative_value_date ? (offeredValueDate || rfq.value_date || undefined) : undefined,
                    notes: traderNotes.trim() || undefined,
                    session_token: authSession.session_token,
                    email: authSession.email
                };

            const res = await quotationApi.post(endpoint, body);
            setSubmitted(true);
            setFatFingerModal(null);
            try {
                sessionStorage.removeItem(`tbill_draft_${token}`);
            } catch (e) {}
            setDraftRestored(false);

            if (res.data?.live_rank) {
                setLiveRank({
                    is_enabled: true,
                    rank: res.data.live_rank.rank,
                    total_quotes: res.data.live_rank.total_quotes,
                    is_leading: res.data.live_rank.is_leading
                });
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
        if (authSession.role === 'VIEW_ONLY' || authSession.role === 'APPROVER') {
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

        if (isExpired) {
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
                            {isExpired 
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

    const isApprover = authSession?.role === 'APPROVER';
    const isViewOnly = authSession?.role === 'VIEW_ONLY' || (isApprover && rfq?.approval_status === 'APPROVED');
    const isSpectator = !!(deskState && !deskState.is_active_trader && !isViewOnly && authSession?.role === 'EXECUTION' && deskState.active_trader_email);

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
                                    </div>

                                    {otpError && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl text-left flex items-center gap-2">
                                            <AlertCircle size={14} className="shrink-0" />
                                            <span>{otpError}</span>
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { setOtpSent(false); setOtpError(''); }}
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

            {/* 2. Main Portal Workspace (Blurred & locked until verified) */}
            <div className={`w-full max-w-[1400px] mx-auto p-4 sm:p-6 font-sans transition-all duration-500 ${
                !authSession ? 'filter blur-2xl opacity-10 pointer-events-none select-none overflow-hidden max-h-[85vh]' : ''
            }`}>
                
                {/* Top Navigation & Brand Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 bg-slate-950 text-white rounded-2xl flex items-center justify-center shadow-md shrink-0">
                            <Landmark size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{rfq.bank_name}</h1>
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
                                    Treasury Desk
                                </span>
                            </div>
                            <p className="text-gray-400 text-xs mt-0.5">Counterparty Quotation Bidding & Execution System</p>
                        </div>
                    </div>

                    {/* View Tabs & Countdown */}
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                            <button
                                onClick={() => handleTabSwitch('LIVE')}
                                className={`px-3.5 py-1.5 rounded-lg transition-all ${activeTab === 'LIVE' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                ⚡ Live RFQ
                            </button>
                            <button
                                onClick={() => handleTabSwitch('HISTORY')}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${activeTab === 'HISTORY' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                <History size={14} /> Desk History
                            </button>
                        </div>

                        <div className={`px-4 py-2 rounded-xl font-mono text-xs sm:text-sm font-bold shadow-xs border shrink-0 transition-all ${
                            timeLeft.status === 'OPEN'
                                ? timeLeft.secondsRemaining !== null && timeLeft.secondsRemaining <= 5
                                    ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-400/50 animate-pulse font-extrabold flex items-center gap-1.5'
                                    : timeLeft.secondsRemaining !== null && timeLeft.secondsRemaining <= 30
                                    ? 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-400/40 animate-pulse flex items-center gap-1.5'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse'
                                : timeLeft.status === 'PRE'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                            {timeLeft.status === 'OPEN' && timeLeft.secondsRemaining !== null && timeLeft.secondsRemaining <= 5 ? (
                                <>
                                    <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                                    <span>⚠️ Closing in {timeLeft.secondsRemaining}s!</span>
                                </>
                            ) : timeLeft.status === 'OPEN' && timeLeft.secondsRemaining !== null && timeLeft.secondsRemaining <= 30 ? (
                                <>
                                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                                    <span>⏱️ {timeLeft.secondsRemaining}s remaining</span>
                                </>
                            ) : (
                                timeLeft.label
                            )}
                        </div>
                    </div>
                </div>

                {/* Authenticated User Status Bar */}
                {authSession && (
                    <div className="mb-4 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${
                                authSession.role === 'EXECUTION' 
                                    ? 'bg-emerald-50 text-emerald-600' 
                                    : authSession.role === 'APPROVER'
                                    ? 'bg-amber-50 text-amber-600'
                                    : 'bg-blue-50 text-blue-600'
                            }`}>
                                {authSession.role === 'EXECUTION' ? <UserCheck size={18} /> : authSession.role === 'APPROVER' ? <Shield size={18} /> : <Eye size={18} />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-900 font-mono">{authSession.email}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${
                                        authSession.role === 'EXECUTION' 
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                            : authSession.role === 'APPROVER'
                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                            : 'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}>
                                        {authSession.role === 'EXECUTION' 
                                            ? '⚡ AUTHORIZED EXECUTION DEALER' 
                                            : authSession.role === 'APPROVER'
                                            ? '🛡️ AUTHORIZED BANK APPROVER'
                                            : '👁️ VIEW-ONLY OBSERVER'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-gray-400">
                                    {authSession.role === 'EXECUTION' 
                                        ? 'Your quote submissions are binding and logged with your verified identity.' 
                                        : authSession.role === 'APPROVER'
                                        ? (rfq.approval_status === 'APPROVED' 
                                            ? 'Bank participation approved. You are viewing live standings in Approver Viewer Mode.' 
                                            : 'Action Required: Review deal specifications and authorize bank participation.')
                                        : 'You are viewing this RFQ in read-only mode.'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="text-xs text-gray-400 hover:text-red-600 transition-colors font-medium self-end sm:self-center cursor-pointer"
                        >
                            Switch Identity / Sign Out
                        </button>
                    </div>
                )}

                {/* TAB 1: LIVE RFQ VIEW */}
                {activeTab === 'LIVE' && (
                    <>
                        {/* Trade Execution / Outcome Result Banner */}
                        {resultStatus && (
                            <div
                                className={`mb-3.5 p-3.5 sm:p-4 rounded-2xl border text-center animate-fade-in-up ${
                                    resultStatus === 'WINNER' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                                    resultStatus === 'INCONCLUSIVE' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                                    resultStatus === 'AWAITING_SELECTION' ? 'bg-blue-50/70 border-blue-200 text-blue-900' :
                                    'bg-gray-50 border-gray-200 text-gray-600'
                                }`}
                            >
                                {resultStatus === 'WINNER' ? (
                                    <div className="flex flex-col items-center">
                                        <CheckCircle2 className="mb-1 text-emerald-500" size={24} />
                                        <h2 className="text-base sm:text-lg font-bold">Trade Execution Confirmed!</h2>
                                        <p className="text-xs sm:text-sm mt-0.5">Congratulations, your quote was selected as the winning offer. Our treasury team will contact you shortly.</p>
                                    </div>
                                ) : resultStatus === 'AWAITING_SELECTION' ? (
                                    <div className="flex flex-col items-center">
                                        <Clock className="mb-1 text-blue-500 animate-spin-slow" size={24} />
                                        <h2 className="text-base sm:text-lg font-bold">Selection in Progress</h2>
                                        <p className="text-xs sm:text-sm mt-0.5">Thank you for your quote. The corporate treasury team is currently evaluating all counterparties.</p>
                                    </div>
                                ) : resultStatus === 'INDICATIVE_ONLY' ? (
                                    <div className="flex flex-col items-center">
                                        <h2 className="text-base sm:text-lg font-bold text-gray-800">Indicative Quotation Completed</h2>
                                        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Thank you for providing market sounding pricing for this request.</p>
                                    </div>
                                ) : resultStatus === 'INCONCLUSIVE' ? (
                                    <div className="flex flex-col items-center">
                                        <AlertCircle className="mb-1 text-amber-500" size={24} />
                                        <h2 className="text-base sm:text-lg font-bold text-amber-900">Quotation Closed Without Winner</h2>
                                        <p className="text-xs sm:text-sm text-amber-700 mt-0.5">This quotation closed without trade execution due to tolerance limits or counterparty responses. Thank you for your participation.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <h2 className="text-base sm:text-lg font-bold">Quotation Completed</h2>
                                        <p className="text-xs sm:text-sm mt-0.5">Thank you for your prompt quote. Another counterparty was executed for this deal.</p>
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
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Corporate Client</p>
                                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{rfq.customer_name}</h2>
                                        </div>
                                        <div className="flex items-center sm:flex-col sm:items-end gap-1.5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest sm:block">RFQ Reference</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono font-bold text-black bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                                                    {rfq.ref_no}
                                                </span>
                                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                                                    rfq.quotation_base === 'Execution' ? 'bg-black text-white' : 'bg-blue-50 text-blue-700 border border-blue-200'
                                                }`}>
                                                    {rfq.quotation_base || 'Execution'}
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
                                        ) : (
                                            <>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Currency Pair</label>
                                                    <p className="text-xl sm:text-2xl font-bold text-emerald-900 bg-emerald-50 px-3 py-1 rounded-xl inline-block border border-emerald-200">
                                                        {rfq.buy_currency} / {rfq.sell_currency}
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
                                                {rfq.quotation_base === 'Execution'
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
                                ) : rfq.approval_status === 'PENDING' ? (
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
                                                        As an authorized Approver for <strong>{rfq.bank_name}</strong>, your authorization is required before execution dealers on your desk can submit binding quotes for this <strong>{rfq.quotation_base || 'Execution'}</strong> request from <strong>{rfq.customer_name}</strong>.
                                                    </p>

                                                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                                                        <div className="font-bold text-gray-900 mb-1">Deal Summary:</div>
                                                        <ul className="space-y-1 text-slate-600 font-medium">
                                                            <li>&bull; Reference: <span className="font-mono font-bold text-gray-900">{rfq.ref_no}</span></li>
                                                            <li>&bull; Product: <span className="font-bold text-gray-900">{rfq.type}</span></li>
                                                            {rfq.type === 'TBILL' ? (
                                                                <>
                                                                    <li>&bull; Min Ticket: <span className="font-bold text-gray-900">{new Intl.NumberFormat().format(rfq.min_ticket_amount || 0)}</span></li>
                                                                    <li>&bull; Settlement: <span className="font-bold text-gray-900">{formatDate(rfq.settlement_date_start)}</span></li>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <li>&bull; Pair: <span className="font-bold text-gray-900">{rfq.buy_currency}/{rfq.sell_currency}</span></li>
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
                                        {/* Success Status Notification Card when Quote is Active */}
                                        {submitted && !isViewOnly && (
                                            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3 text-center flex flex-col items-center justify-center animate-fade-in shadow-xs">
                                                <div className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-1">
                                                    <CheckCircle2 size={16} className="text-emerald-600" />
                                                </div>
                                                <h3 className="text-sm font-bold text-emerald-950">Quote Recorded Successfully</h3>
                                                <p className="text-xs text-emerald-800 mt-0.5">
                                                    {rfq.type === 'TBILL' ? 'Your T-Bill quote lines are actively registered with the client.' : 'Your spot price is actively registered with the client.'}
                                                </p>
                                            </div>
                                        )}

                                        {isApprover && rfq.approval_status === 'APPROVED' && (
                                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-900 flex items-center gap-2">
                                                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                                <span>
                                                    <strong>Participation Approved:</strong> You authorized this RFQ on {formatDate(rfq.approved_at)}. You are observing desk activity in Approver Viewer Mode.
                                                </span>
                                            </div>
                                        )}

                                        {/* Main Bidding Console Card */}
                                        <section
                                            id="bidding-quote-card"
                                            className={`p-5 sm:p-6 rounded-3xl shadow-xs border transition-all flex-1 flex flex-col ${
                                                isViewOnly
                                                    ? 'bg-slate-50 border-slate-200 opacity-80'
                                                    : timeLeft.status === 'OPEN' 
                                                        ? 'bg-white border-2 border-slate-950 shadow-md' 
                                                        : 'bg-white border-slate-200'
                                            }`}
                                        >
                                            {/* Bidding Header */}
                                            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                                                <div>
                                                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                                        <TrendingUp size={14} className="text-emerald-600" /> {rfq.type === 'TBILL' ? 'T-Bill Quotation Lines' : 'Your Price Quote'}
                                                    </h3>
                                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                                        {timeLeft.status === 'OPEN' ? 'Enter your binding rate for this quotation request.' : 'Quotation window is currently closed.'}
                                                    </p>
                                                </div>
                                                
                                                {submitted ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                        <CheckCircle2 size={14} className="text-emerald-600" /> Active Quote
                                                    </span>
                                                ) : isApprover ? (
                                                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-200">
                                                        🛡️ Approver Viewer Mode
                                                    </span>
                                                ) : isViewOnly ? (
                                                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full border border-blue-200">
                                                        👁️ View-Only Observer
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
                                            {rfq?.is_live_ranking_enabled && (
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
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shadow-xs ${
                                                                liveRank?.rank === 1
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

                                            {isViewOnly ? (
                                                <div className={`p-4 rounded-2xl text-xs leading-relaxed mb-4 border ${
                                                    isApprover ? 'bg-amber-50/60 border-amber-200 text-amber-900' : 'bg-blue-50/60 border-blue-200 text-blue-900'
                                                }`}>
                                                    <strong>{isApprover ? 'Approver Viewer Notice:' : 'View-Only Notice:'}</strong>{' '}
                                                    {isApprover
                                                        ? 'You have approved bank participation. As an Approver, you can monitor the live RFQ and submissions entered by your execution traders.'
                                                        : 'Your registered account has observer permissions. You can inspect trade parameters and history, but only dealers tagged for Execution can enter binding quotes.'}
                                                </div>
                                            ) : (
                                                <form id="quote-form" onSubmit={handleSubmit} className="space-y-4">
                                                    {/* Multi-Dealer Desk Concurrency Banner */}
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
                                                                {timeLeft.status === 'OPEN' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleTakeoverDesk}
                                                                        disabled={isTakingOver}
                                                                        className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer text-xs"
                                                                    >
                                                                        <Zap size={14} className={isTakingOver ? "animate-spin" : ""} />
                                                                        {isTakingOver ? "Taking Over..." : "⚡ Take Over Desk"}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {deskState?.is_active_trader && authSession?.role === 'EXECUTION' && (
                                                        <div className="p-2.5 px-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                <span className="font-bold text-emerald-900">Active Quoting Desk:</span>
                                                                <span className="text-emerald-800 font-semibold">You ({authSession?.email})</span>
                                                            </div>
                                                            {deskState.execution_colleagues_count > 0 ? (
                                                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-100/60 px-2.5 py-0.5 rounded-lg">
                                                                    <Users size={12} />
                                                                    <span>{deskState.execution_colleagues_count} Colleague Dealer{deskState.execution_colleagues_count > 1 ? 's' : ''} Online</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[11px] text-emerald-600 font-medium">Solo Execution Desk</span>
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
                                                                            } catch (e) {}
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
                                                                    {tbillLines.length > 1 && timeLeft.status === 'OPEN' && !isSpectator && (
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
                                                                                disabled={timeLeft.status !== 'OPEN' || isSpectator}
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
                                                                                disabled={timeLeft.status !== 'OPEN' || isSpectator}
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
                                                                                disabled={timeLeft.status !== 'OPEN' || isSpectator}
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
                                                                                disabled={timeLeft.status !== 'OPEN' || isSpectator}
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

                                                            {timeLeft.status === 'OPEN' && !isSpectator && (
                                                                <button
                                                                    type="button"
                                                                    onClick={addTbillLine}
                                                                    className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                                                                >
                                                                    + Add Line Item
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            <div>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">
                                                                        Spot Rate Quote ({rfq.sell_currency} per 1 {rfq.buy_currency})
                                                                    </label>
                                                                    {rfq.cbe_benchmark_rate && (
                                                                        <span className="text-[10px] font-mono text-gray-400 font-semibold" title="Central Bank of Egypt benchmark reference">
                                                                            CBE Ref: ~{parseFloat(rfq.cbe_benchmark_rate).toFixed(4)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="relative">
                                                                    <input
                                                                        type="number"
                                                                        step="0.0001"
                                                                        required
                                                                        disabled={timeLeft.status !== 'OPEN' || isSubmitting || isSpectator}
                                                                        onWheel={(e) => e.currentTarget.blur()}
                                                                        placeholder="Enter spot rate (e.g. 48.6500)"
                                                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-2xl font-bold focus:bg-white focus:ring-2 focus:ring-black/5 transition-all outline-none disabled:bg-slate-100 disabled:text-slate-400"
                                                                        value={price}
                                                                        onChange={e => setPrice(e.target.value)}
                                                                    />
                                                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">
                                                                        {rfq.sell_currency}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Proposed Settlement / Value Date */}
                                                            {rfq.allow_alternative_value_date ? (
                                                                <div>
                                                                    <div className="flex items-center justify-between mb-1.5">
                                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                                                                            <Calendar size={13} className="text-blue-600" />
                                                                            Proposed Value Date
                                                                        </label>
                                                                        <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                                                            Alternative Date Permitted
                                                                        </span>
                                                                    </div>
                                                                    <input
                                                                        type="date"
                                                                        min={rfq?.window_start ? rfq.window_start.split('T')[0] : new Date().toISOString().split('T')[0]}
                                                                        disabled={timeLeft.status !== 'OPEN' || isSubmitting || isSpectator}
                                                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-black/5 transition-all outline-none disabled:bg-slate-100 disabled:text-slate-400"
                                                                        value={offeredValueDate || rfq.value_date || ''}
                                                                        onChange={e => setOfferedValueDate(e.target.value)}
                                                                    />
                                                                    <p className="text-[10px] text-gray-400 mt-1">
                                                                        Client target: <strong className="text-gray-600">{formatDate(rfq.value_date)}</strong>. Cannot be earlier than quotation trade date ({formatDate(rfq.window_start)}).
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs">
                                                                    <div className="flex items-center gap-2">
                                                                        <Calendar size={14} className="text-gray-400" />
                                                                        <span className="text-gray-500 text-[11px]">Value Date:</span>
                                                                        <span className="font-semibold text-gray-800">{formatDate(rfq.value_date)}</span>
                                                                    </div>
                                                                    <span className="text-[10px] font-medium text-gray-400 bg-gray-200/60 px-2 py-0.5 rounded">
                                                                        Fixed Date
                                                                    </span>
                                                                </div>
                                                            )}
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
                                                            disabled={timeLeft.status !== 'OPEN' || isSubmitting || isSpectator}
                                                            placeholder="Add any settlement notes, execution remarks, or comments for the treasury desk..."
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-gray-800 focus:bg-white focus:ring-2 focus:ring-black/5 transition-all outline-none resize-none disabled:bg-slate-100 disabled:text-slate-400"
                                                            value={traderNotes}
                                                            onChange={(e) => setTraderNotes(e.target.value)}
                                                        />
                                                    </div>

                                                    {/* Form Submit Action directly below */}
                                                    <div className="pt-1">
                                                        {isSpectator ? (
                                                            <button
                                                                type="button"
                                                                onClick={handleTakeoverDesk}
                                                                disabled={timeLeft.status !== 'OPEN' || isTakingOver}
                                                                className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-2xl font-bold text-base transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                                                            >
                                                                <Zap size={16} className={isTakingOver ? "animate-spin" : ""} />
                                                                {isTakingOver ? 'Transferring Desk Control...' : '⚡ Take Over Desk to Submit Quote'}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="submit"
                                                                disabled={timeLeft.status !== 'OPEN' || isSubmitting || !authSession || (rfq.type === 'TBILL' ? tbillLines.some(l => !l.discountRate || !l.maxAmount) : !price)}
                                                                className={`w-full py-3.5 rounded-2xl font-bold text-base transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
                                                                    timeLeft.status === 'OPEN' && timeLeft.secondsRemaining !== null && timeLeft.secondsRemaining <= 10
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
                                                                        <span>⚡ {submitted ? 'Update Quote' : 'Submit Binding Quote'} • {String(timeLeft.secondsRemaining).padStart(2, '0')}s Left!</span>
                                                                    </>
                                                                ) : (
                                                                    submitted ? 'Update Quote' : 'Submit Binding Quote'
                                                                )}
                                                            </button>
                                                        )}
                                                        <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 mt-2">
                                                            <Shield size={12} className="text-emerald-600" />
                                                            <span>Institutional End-to-End Encryption & Audit Logging Active</span>
                                                        </div>

                                                        {/* Transmission Latency & Liability Limitation Advisory */}
                                                        <div className="mt-3.5 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[10.5px] leading-relaxed text-slate-500">
                                                            <div className="flex items-start gap-2">
                                                                <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                                                <div>
                                                                    <strong className="text-slate-700 font-semibold">Transmission & Telemetry Advisory:</strong>{' '}
                                                                    Quotations, desk concurrency, and live rankings are synchronized via high-frequency telemetry. Delivery timing is subject to local internet connectivity, ISP routing, and public internet conditions. The platform and client organization assume no liability for transmission latency, clock discrepancies, or submissions received after window expiry. Dealers are advised to transmit firm quotes well in advance of the cutoff time.
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </form>
                                            )}
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
                        <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <History className="text-blue-600" size={20} />
                                    Desk Quotation History with {rfq.customer_name}
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">Past request submissions, win rates, and execution status records for {rfq.bank_name}.</p>
                            </div>
                            <button
                                onClick={fetchHistory}
                                disabled={isLoadingHistory}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                                <RefreshCw size={14} className={isLoadingHistory ? 'animate-spin' : ''} /> Refresh
                            </button>
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
                                                <td className="py-3.5 px-4 font-mono font-bold text-gray-900">{h.ref_no}</td>
                                                <td className="py-3.5 px-4">
                                                    <span className="font-semibold text-gray-800">{h.type}</span> &bull; <span className="text-gray-500">{h.direction || 'N/A'}</span>
                                                </td>
                                                <td className="py-3.5 px-4 font-semibold text-gray-900">
                                                    {h.amount ? `${new Intl.NumberFormat().format(h.amount)}` : 'N/A'} {h.currency_pair ? `(${h.currency_pair})` : ''}
                                                </td>
                                                <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                                                    {h.best_quote !== null ? h.best_quote : <span className="text-gray-400 font-sans font-normal">No Quote</span>}
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
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                                        h.outcome === 'WON' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                                        h.outcome === 'NOT_SELECTED' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                        h.outcome === 'SUBMITTED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        'bg-gray-100 text-gray-600 border-gray-200'
                                                    }`}>
                                                        {h.outcome === 'WON' ? '🏆 Won Trade' :
                                                         h.outcome === 'NOT_SELECTED' ? 'Not Selected' :
                                                         h.outcome === 'SUBMITTED' ? '⏳ Submitted' : h.outcome}
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
                                {fatFingerModal.suggestedRate && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (fatFingerModal.isTBill && fatFingerModal.suggestedLines) {
                                                setTbillLines(fatFingerModal.suggestedLines);
                                                executeSubmit(null, fatFingerModal.suggestedLines);
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
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
