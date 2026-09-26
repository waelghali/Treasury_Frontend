import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Plus, Send, FileText, CheckCircle2, Clock, Landmark, Building, DollarSign, Copy, Check, ExternalLink, AlertCircle, Sparkles, Undo2, RefreshCw, ArrowLeft, Calendar, Shield, ShieldAlert, Info, RotateCcw, CheckSquare, Square, Trash2, Layers, SlidersHorizontal, ArrowLeftRight } from 'lucide-react';
import apiClient from '../../../services/apiClient';
import ResultsView from './ResultsView';

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

const toLocalISOString = (d) => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const getInitialFormData = (entityId = '') => {
    const now = new Date();
    const freshStart = toLocalISOString(new Date(now.getTime() + 60000));
    const todayDate = freshStart ? freshStart.split('T')[0] : '';
    return {
        entityId: entityId || '',
        type: 'FX_SPOT',
        direction: 'Buy',
        valueDate: todayDate,
        allowAlternativeValueDate: false,
        amount: '',
        minTicketAmount: '',
        buyCurrency: 'USD',
        sellCurrency: 'EGP',
        settlementDateStart: todayDate,
        settlementDateEnd: '',
        maturityDateStart: '',
        maturityDateEnd: '',
        evalRate: '',
        windowStart: freshStart,
        windowDuration: '60',
        quotationBase: 'Execution',
        maxTolerancePercent: '0.05',
        tokenValidityHours: '24',
        internalNotes: '',
    };
};

const getInitialPair = (valDate = '') => {
    const today = new Date().toISOString().split('T')[0];
    return {
        id: `pair-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        direction: 'Buy',
        buyCurrency: 'USD',
        sellCurrency: 'EGP',
        amount: '',
        minTicketAmount: '',
        valueDate: valDate || today,
        allowAlternativeValueDate: false,
        quotationBase: 'Execution',
        maxTolerancePercent: '0.05'
    };
};

export default function QuotationRequestDashboard() {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const revisionRfqId = queryParams.get('revision_rfq_id') || queryParams.get('edit_rfq_id');
    const retradeRfqId = queryParams.get('retrade_rfq_id') || queryParams.get('clone_rfq_id');

    const [sourceRfq, setSourceRfq] = useState(null);
    const [loadingSource, setLoadingSource] = useState(false);
    const [userNotes, setUserNotes] = useState('');
    const prevTypeRef = useRef('FX_SPOT');
    const isPrefillingRef = useRef(false);

    const [entities, setEntities] = useState([]);
    const [banks, setBanks] = useState([]);
    const [selectedBanks, setSelectedBanks] = useState([]);
    const [isSelectingAll, setIsSelectingAll] = useState(false);
    const [recommendations, setRecommendations] = useState([]);
    const [evalRateDetails, setEvalRateDetails] = useState(null);
    const hasUserChangedEvalRateRef = useRef(false);
    const [formData, setFormData] = useState(() => getInitialFormData(''));
    const [pairs, setPairs] = useState(() => [getInitialPair('')]);
    const [activePairIndex, setActivePairIndex] = useState(0);
    const [bankActivePairTab, setBankActivePairTab] = useState({});
    const [files, setFiles] = useState([]);
    const [existingDocs, setExistingDocs] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdRfq, setCreatedRfq] = useState(null);
    const [copiedToken, setCopiedToken] = useState(null);
    const [legalAcknowledged, setLegalAcknowledged] = useState(false);

    const handleReset = () => {
        if (location.search) {
            navigate('/end-user/quotations/active', { replace: true });
        }
        setSourceRfq(null);
        setUserNotes('');
        isPrefillingRef.current = false;
        hasUserChangedEvalRateRef.current = false;
        const defaultEntityId = entities.length === 1 ? entities[0].id : '';
        const initialForm = getInitialFormData(defaultEntityId);
        setFormData(initialForm);
        setPairs([getInitialPair(initialForm.valueDate)]);
        setActivePairIndex(0);
        setBankActivePairTab({});
        setSelectedBanks([]);
        setFiles([]);
        setExistingDocs([]);
        setCreatedRfq(null);
        setLegalAcknowledged(false);
        setCopiedToken(null);
        toast.info('Quotation form reset to original state.');
    };

    const handleAddPair = () => {
        if (pairs.length >= 8) {
            toast.warn('A maximum of 8 currency pairs can be quoted in a single session.');
            return;
        }
        const masterDate = formData.valueDate || (pairs[0] ? pairs[0].valueDate : '');
        const usedBuyCurrencies = new Set(pairs.map(p => p.buyCurrency));
        const candidateCurrencies = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'CHF', 'CAD', 'JPY'];
        const nextCurr = candidateCurrencies.find(c => !usedBuyCurrencies.has(c)) || 'EUR';

        const newPair = {
            id: `pair-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            direction: 'Buy',
            buyCurrency: nextCurr,
            sellCurrency: 'EGP',
            amount: '',
            minTicketAmount: '',
            valueDate: masterDate,
            allowAlternativeValueDate: formData.allowAlternativeValueDate || false,
            quotationBase: formData.quotationBase || 'Execution',
            maxTolerancePercent: formData.maxTolerancePercent || '0.05'
        };

        setPairs(prev => [...prev, newPair]);
        setActivePairIndex(pairs.length);
        toast.info(`Added Pair #${pairs.length + 1} (${nextCurr}/EGP)`);
    };

    const handleRemovePair = (indexToRemove) => {
        if (pairs.length <= 1) {
            toast.warn('At least one currency pair is required.');
            return;
        }
        const removed = pairs[indexToRemove];
        setPairs(prev => prev.filter((_, idx) => idx !== indexToRemove));
        setActivePairIndex(prev => (prev >= indexToRemove && prev > 0 ? prev - 1 : 0));
        toast.info(`Removed ${removed.buyCurrency}/${removed.sellCurrency}`);
    };

    const updateActivePair = (field, value) => {
        setPairs(prev => {
            const next = [...prev];
            if (!next[activePairIndex]) return prev;
            next[activePairIndex] = { ...next[activePairIndex], [field]: value };
            return next;
        });

        if (activePairIndex === 0) {
            setFormData(prev => ({
                ...prev,
                ...(field === 'buyCurrency' ? { buyCurrency: value } : {}),
                ...(field === 'sellCurrency' ? { sellCurrency: value } : {}),
                ...(field === 'amount' ? { amount: value } : {}),
                ...(field === 'minTicketAmount' ? { minTicketAmount: value } : {}),
                ...(field === 'valueDate' ? { valueDate: value } : {}),
                ...(field === 'direction' ? { direction: value } : {}),
                ...(field === 'quotationBase' ? { quotationBase: value } : {}),
                ...(field === 'maxTolerancePercent' ? { maxTolerancePercent: value } : {}),
                ...(field === 'allowAlternativeValueDate' ? { allowAlternativeValueDate: value } : {}),
            }));
        }
    };

    const handleSwapCurrencies = () => {
        const curBuy = pairs[activePairIndex]?.buyCurrency || 'USD';
        const curSell = pairs[activePairIndex]?.sellCurrency || 'EGP';
        setPairs(prev => {
            const next = [...prev];
            if (!next[activePairIndex]) return prev;
            next[activePairIndex] = {
                ...next[activePairIndex],
                buyCurrency: curSell,
                sellCurrency: curBuy
            };
            return next;
        });
        if (activePairIndex === 0) {
            setFormData(prev => ({
                ...prev,
                buyCurrency: curSell,
                sellCurrency: curBuy
            }));
        }
    };

    const applyValueDateToAllPairs = (dateVal) => {
        const d = dateVal || formData.valueDate || pairs[activePairIndex]?.valueDate;
        if (!d) return;
        setPairs(prev => prev.map(p => ({ ...p, valueDate: d })));
        setFormData(prev => ({ ...prev, valueDate: d }));
        toast.success(`Value Date (${formatDate(d)}) synced to all ${pairs.length} currency pair(s).`);
    };

    const toggleBankPairCustomization = (bankId, isCustomized) => {
        setSelectedBanks(prev => prev.map(b => {
            if (String(b.id) !== String(bankId)) return b;
            const existingPairConfigs = { ...(b.pairConfigs || {}) };
            if (isCustomized) {
                pairs.forEach(p => {
                    if (!existingPairConfigs[p.id]) {
                        existingPairConfigs[p.id] = {
                            costMin: b.costMin ?? 0,
                            costPercent: b.costPercent ?? 0,
                            costMax: b.costMax ?? 0,
                            costFlat: b.costFlat ?? 0,
                            quotationBase: b.quotationBase || formData.quotationBase || 'Execution',
                            valueDate: b.valueDate || p.valueDate || formData.valueDate || '',
                            allowAlternativeValueDate: b.allowAlternativeValueDate ?? p.allowAlternativeValueDate ?? false,
                            isDocumentVisible: b.isDocumentVisible !== false
                        };
                    }
                });
            }
            return {
                ...b,
                customPairTariffs: isCustomized,
                pairConfigs: existingPairConfigs
            };
        }));
    };

    const updateBankPairConfig = (bankId, pairId, field, value) => {
        setSelectedBanks(prev => prev.map(b => {
            if (String(b.id) !== String(bankId)) return b;
            const existingPairConfigs = b.pairConfigs || {};
            const currentPairConfig = existingPairConfigs[pairId] || {
                costMin: b.costMin,
                costPercent: b.costPercent,
                costMax: b.costMax,
                costFlat: b.costFlat,
                quotationBase: b.quotationBase,
                valueDate: b.valueDate,
                allowAlternativeValueDate: b.allowAlternativeValueDate,
                isDocumentVisible: b.isDocumentVisible
            };

            return {
                ...b,
                pairConfigs: {
                    ...existingPairConfigs,
                    [pairId]: {
                        ...currentPairConfig,
                        [field]: value
                    }
                }
            };
        }));
    };

    // Fetch accessible customer legal entities
    useEffect(() => {
        apiClient.get('/end-user/quotations/entities')
            .then(res => {
                const list = res.data || [];
                setEntities(list);
                if (list.length === 1 && !formData.entityId) {
                    setFormData(prev => ({ ...prev, entityId: list[0].id }));
                }
            })
            .catch(err => {
                console.warn("Could not fetch accessible entities:", err);
            });
    }, []);

    // Fetch CBE corridor evaluation benchmark rates (mid + customer margin)
    useEffect(() => {
        apiClient.get('/end-user/quotations/evaluation-rate')
            .then(res => {
                if (res.data) {
                    setEvalRateDetails(res.data);
                    if (!revisionRfqId && !retradeRfqId) {
                        setFormData(prev => {
                            if (prev.evalRate || hasUserChangedEvalRateRef.current) return prev;
                            return { ...prev, evalRate: String(res.data.eval_rate) };
                        });
                    }
                }
            })
            .catch(err => {
                console.warn("Could not fetch quotation evaluation rate info:", err);
            });
    }, [revisionRfqId, retradeRfqId]);

    // Pre-fill state when opening in Revision Mode or Re-Trade Mode
    useEffect(() => {
        const targetRfqId = revisionRfqId || retradeRfqId;
        if (!targetRfqId) return;

        setLoadingSource(true);
        isPrefillingRef.current = true;
        apiClient.get(`/end-user/quotations/${targetRfqId}/results`)
            .then(res => {
                const rfq = res.data?.rfq;
                const results = res.data?.results || [];
                if (!rfq) return;

                setSourceRfq(rfq);

                const now = new Date();
                const freshStart = toLocalISOString(new Date(now.getTime() + 60000));
                let preservedStart = freshStart;
                if (rfq.window_start) {
                    const parsedStart = new Date(rfq.window_start);
                    // Preserve original scheduled start time if in the future
                    if (!isNaN(parsedStart.getTime()) && parsedStart > now) {
                        preservedStart = toLocalISOString(parsedStart);
                    }
                }

                let durationSecs = '60';
                if (rfq.window_start && rfq.window_end) {
                    const diff = Math.round((new Date(rfq.window_end) - new Date(rfq.window_start)) / 1000);
                    if (diff > 0) durationSecs = String(diff);
                }

                prevTypeRef.current = rfq.type || 'FX_SPOT';

                const cleanD = (d) => d ? String(d).split('T')[0] : '';

                setFormData({
                    entityId: rfq.entity_id || '',
                    type: rfq.type || 'FX_SPOT',
                    direction: rfq.direction || 'Buy',
                    valueDate: cleanD(rfq.value_date),
                    allowAlternativeValueDate: rfq.allow_alternative_value_date || false,
                    amount: rfq.amount ? String(rfq.amount) : '',
                    minTicketAmount: rfq.min_ticket_amount ? String(rfq.min_ticket_amount) : '',
                    buyCurrency: rfq.buy_currency || 'USD',
                    sellCurrency: rfq.sell_currency || 'EGP',
                    settlementDateStart: cleanD(rfq.settlement_date_start),
                    settlementDateEnd: cleanD(rfq.settlement_date_end),
                    maturityDateStart: cleanD(rfq.maturity_date_start),
                    maturityDateEnd: cleanD(rfq.maturity_date_end),
                    evalRate: rfq.eval_rate !== null && rfq.eval_rate !== undefined 
                        ? String(rfq.eval_rate) 
                        : (evalRateDetails?.eval_rate ? String(evalRateDetails.eval_rate) : ''),
                    windowStart: preservedStart,
                    windowDuration: durationSecs,
                    quotationBase: rfq.quotation_base || 'Execution',
                    maxTolerancePercent: rfq.max_tolerance_percent !== null && rfq.max_tolerance_percent !== undefined ? String(rfq.max_tolerance_percent) : '0.05',
                    tokenValidityHours: rfq.token_validity_hours ? String(rfq.token_validity_hours) : '24',
                    internalNotes: rfq.internal_notes || '',
                });

                // Multi-pair leg prefill
                const rfqLegs = res.data?.legs || rfq.legs || [];
                if (rfqLegs && rfqLegs.length > 0) {
                    setPairs(rfqLegs.map((l, idx) => ({
                        id: l.id || `pair-${idx + 1}`,
                        direction: l.direction || rfq.direction || 'Buy',
                        buyCurrency: l.buy_currency || 'USD',
                        sellCurrency: l.sell_currency || 'EGP',
                        amount: l.amount ? String(l.amount) : '',
                        minTicketAmount: l.min_ticket_amount ? String(l.min_ticket_amount) : '',
                        valueDate: cleanD(l.value_date) || cleanD(rfq.value_date) || '',
                        allowAlternativeValueDate: l.allow_alternative_value_date || false,
                        quotationBase: l.quotation_base || rfq.quotation_base || 'Execution',
                        maxTolerancePercent: l.max_tolerance_percent !== null && l.max_tolerance_percent !== undefined ? String(l.max_tolerance_percent) : '0.05'
                    })));
                } else if (rfq.type === 'FX_SPOT') {
                    setPairs([{
                        id: 'pair-1',
                        direction: rfq.direction || 'Buy',
                        buyCurrency: rfq.buy_currency || 'USD',
                        sellCurrency: rfq.sell_currency || 'EGP',
                        amount: rfq.amount ? String(rfq.amount) : '',
                        minTicketAmount: rfq.min_ticket_amount ? String(rfq.min_ticket_amount) : '',
                        valueDate: cleanD(rfq.value_date),
                        allowAlternativeValueDate: rfq.allow_alternative_value_date || false,
                        quotationBase: rfq.quotation_base || 'Execution',
                        maxTolerancePercent: rfq.max_tolerance_percent !== null && rfq.max_tolerance_percent !== undefined ? String(rfq.max_tolerance_percent) : '0.05'
                    }]);
                }
                setActivePairIndex(0);

                if (results && results.length > 0) {
                    const prefilledBanks = results.map(r => ({
                        id: r.bank_id,
                        name: r.bank_name || `Bank ${r.bank_id}`,
                        costMin: r.cost_min ?? 0,
                        costPercent: r.cost_percent ?? 0,
                        costMax: r.cost_max ?? 0,
                        costFlat: r.cost_flat ?? 0,
                        quotationBase: r.quotation_base || rfq.quotation_base || 'Execution',
                        isDocumentVisible: r.is_document_visible !== false,
                        valueDate: cleanD(r.assigned_value_date) || cleanD(rfq.value_date) || '',
                        allowAlternativeValueDate: r.allow_alternative_value_date ?? rfq.allow_alternative_value_date ?? false,
                        _baseCustomized: Boolean(r.quotation_base && r.quotation_base !== rfq.quotation_base),
                        _dateCustomized: Boolean(r.assigned_value_date && cleanD(r.assigned_value_date) !== cleanD(rfq.value_date)),
                        _altCustomized: r.allow_alternative_value_date !== undefined && r.allow_alternative_value_date !== null && r.allow_alternative_value_date !== rfq.allow_alternative_value_date
                    }));
                    setSelectedBanks(prefilledBanks);
                }

                if (rfq.document_path) {
                    try {
                        const parsed = JSON.parse(rfq.document_path);
                        const docsArr = Array.isArray(parsed) ? parsed : [{ name: 'Attached Document', path: rfq.document_path }];
                        setExistingDocs(docsArr);
                    } catch {
                        const docsArr = rfq.document_path.split(',').map(p => ({ name: p.trim(), path: p.trim() }));
                        setExistingDocs(docsArr);
                    }
                } else {
                    setExistingDocs([]);
                }
            })
            .catch(err => {
                console.error("Failed to load source quotation:", err);
                toast.error("Could not load quotation details.");
            })
            .finally(() => {
                setLoadingSource(false);
                setTimeout(() => { isPrefillingRef.current = false; }, 300);
            });
    }, [revisionRfqId, retradeRfqId]);

    useEffect(() => {
        // Fetch banks configured for this customer, dynamically filtering by trade type and selected legal entity
        let url = `/end-user/quotations/banks?trade_type=${formData.type}`;
        if (formData.entityId) {
            url += `&entity_id=${formData.entityId}`;
        }
        apiClient.get(url)
            .then(res => setBanks(res.data))
            .catch(err => console.error("Error fetching banks", err));

        // Clear previously selected banks only when trade type changes manually, not during prefilling
        if (!isPrefillingRef.current && prevTypeRef.current !== formData.type) {
            setSelectedBanks([]);
            prevTypeRef.current = formData.type;
        }
    }, [formData.type, formData.entityId]);

    // Mind-Reader: Fetch counterparty recommendations based on asset type & currency pair
    useEffect(() => {
        apiClient.get('/end-user/quotations/recommendations', {
            params: {
                trade_type: formData.type,
                buy_currency: formData.type === 'FX_SPOT' ? formData.buyCurrency : undefined,
                sell_currency: formData.type === 'FX_SPOT' ? formData.sellCurrency : undefined,
            }
        })
        .then(res => {
            setRecommendations(res.data?.recommendations || []);
        })
        .catch(err => {
            console.error("Failed to load recommendations", err);
            setRecommendations([]);
        });
    }, [formData.type, formData.buyCurrency, formData.sellCurrency]);

    const todayStr = new Date().toISOString().split('T')[0];
    const nowLocalIso = toLocalISOString(new Date());

    const activePair = pairs[activePairIndex] || pairs[0] || {};

    // Value Date (Settlement Date) is the primary anchor set by Treasury.
    // The Quotation Window (bidding window) must occur on or before the Value Date (window <= valueDate).
    const targetValueDate = formData.type === 'TBILL' 
        ? formData.settlementDateStart 
        : (pairs.length > 0 ? pairs.map(p => p.valueDate).filter(Boolean).sort()[0] || formData.valueDate : formData.valueDate);

    const maxWindowDateTime = targetValueDate ? `${targetValueDate}T23:59` : undefined;
    const windowStartDate = formData.windowStart ? formData.windowStart.split('T')[0] : '';

    const hasInvalidPairValueDate = formData.type === 'FX_SPOT' && pairs.some(p => {
        return p.valueDate && windowStartDate && p.valueDate < windowStartDate;
    });

    const hasInvalidBankValueDate = formData.type === 'FX_SPOT' && selectedBanks.some(b => {
        if (b.customPairTariffs && b.pairConfigs) {
            return Object.values(b.pairConfigs).some(cfg => cfg.valueDate && windowStartDate && cfg.valueDate < windowStartDate);
        }
        const bDate = b.valueDate || formData.valueDate;
        return bDate && windowStartDate && bDate < windowStartDate;
    });

    const hasInvalidWindowDate = Boolean(
        targetValueDate && windowStartDate && windowStartDate > targetValueDate
    );
    const hasDateDiscrepancy = hasInvalidPairValueDate || hasInvalidBankValueDate || hasInvalidWindowDate;
    const hasUnsyncedBankDates = formData.type === 'FX_SPOT' && 
        selectedBanks.length > 0 && 
        Boolean(formData.valueDate) && 
        selectedBanks.some(b => b.valueDate && b.valueDate !== formData.valueDate);

    const handleApplySmartSelection = async () => {
        if (!recommendations || recommendations.length === 0 || !banks || banks.length === 0) return;
        
        const banksToSelect = [];
        for (const rec of recommendations) {
            const matchedBank = banks.find(b => b.bank_id === rec.bank_id);
            if (matchedBank && !banksToSelect.find(b => b.id === matchedBank.bank_id)) {
                const base = formData.quotationBase || 'Execution';
                let costData = { cost_min: 0, cost_percent: 0, cost_max: 0, cost_flat: 0 };
                try {
                    const costRes = await apiClient.get(`/end-user/quotations/banks/latest-costs?bank_id=${matchedBank.bank_id}`);
                    if (costRes.data) {
                        costData = costRes.data;
                    }
                } catch (e) {}

                const effectiveInitialDate = formData.valueDate || todayStr;
                banksToSelect.push({
                    id: matchedBank.bank_id,
                    name: matchedBank.bank?.name || `Bank ${matchedBank.bank_id}`,
                    costMin: costData.cost_min || 0,
                    costPercent: costData.cost_percent || 0,
                    costMax: costData.cost_max || 0,
                    costFlat: costData.cost_flat || 0,
                    quotationBase: base,
                    isDocumentVisible: base === 'Execution',
                    valueDate: effectiveInitialDate,
                    allowAlternativeValueDate: formData.allowAlternativeValueDate || false
                });
            }
        }
        if (banksToSelect.length > 0) {
            setSelectedBanks(banksToSelect);
        }
    };

    const handleSelectAllBanks = async () => {
        if (!banks || banks.length === 0 || isSelectingAll) return;
        setIsSelectingAll(true);
        try {
            const base = formData.quotationBase || 'Execution';
            const effectiveInitialDate = formData.valueDate || todayStr;

            const unselectedBanks = banks.filter(b => !selectedBanks.some(sb => String(sb.id) === String(b.bank_id)));

            const costPromises = unselectedBanks.map(async (bank) => {
                let fetchedCosts = { costMin: 0, costPercent: 0, costMax: 0, costFlat: 0 };
                try {
                    const res = await apiClient.get(`/end-user/quotations/banks/latest-costs?bank_id=${bank.bank_id}`);
                    if (res.data) {
                        fetchedCosts = {
                            costMin: res.data.cost_min ?? 0,
                            costPercent: res.data.cost_percent ?? 0,
                            costMax: res.data.cost_max ?? 0,
                            costFlat: res.data.cost_flat ?? 0
                        };
                    }
                } catch (err) {
                    console.warn('Could not fetch latest bank costs for bank', bank.bank_id, err);
                }

                return {
                    id: bank.bank_id,
                    name: bank.bank?.name || `Bank ${bank.bank_id}`,
                    emails: bank.emails,
                    contacts: bank.contacts || [],
                    costMin: fetchedCosts.costMin,
                    costPercent: fetchedCosts.costPercent,
                    costMax: fetchedCosts.costMax,
                    costFlat: fetchedCosts.costFlat,
                    quotationBase: base,
                    isDocumentVisible: base === 'Execution',
                    valueDate: effectiveInitialDate,
                    allowAlternativeValueDate: formData.allowAlternativeValueDate || false
                };
            });

            const newSelected = await Promise.all(costPromises);
            setSelectedBanks(prev => {
                const existingIds = new Set(prev.map(b => String(b.id)));
                const additions = newSelected.filter(b => !existingIds.has(String(b.id)));
                return [...prev, ...additions];
            });
        } finally {
            setIsSelectingAll(false);
        }
    };

    const handleDeselectAllBanks = () => {
        setSelectedBanks([]);
    };

    const handleBankToggle = async (bank) => {
        const bankId = bank.bank_id;
        const exists = selectedBanks.some(b => String(b.id) === String(bankId));
        if (exists) {
            setSelectedBanks(prev => prev.filter(b => String(b.id) !== String(bankId)));
        } else {
            const base = formData.quotationBase || 'Execution';
            let fetchedCosts = { costMin: 0, costPercent: 0, costMax: 0, costFlat: 0 };
            try {
                const res = await apiClient.get(`/end-user/quotations/banks/latest-costs?bank_id=${bankId}`);
                if (res.data) {
                    fetchedCosts = {
                        costMin: res.data.cost_min ?? 0,
                        costPercent: res.data.cost_percent ?? 0,
                        costMax: res.data.cost_max ?? 0,
                        costFlat: res.data.cost_flat ?? 0
                    };
                }
            } catch (err) {
                console.warn('Could not fetch latest bank costs:', err);
            }

            const effectiveInitialDate = formData.valueDate || todayStr;
            setSelectedBanks(prev => [
                ...prev.filter(b => String(b.id) !== String(bankId)), 
                { 
                    id: bank.bank_id, 
                    name: bank.bank?.name || `Bank ${bank.bank_id}`, 
                    emails: bank.emails, 
                    contacts: bank.contacts || [],
                    costMin: fetchedCosts.costMin, 
                    costPercent: fetchedCosts.costPercent, 
                    costMax: fetchedCosts.costMax, 
                    costFlat: fetchedCosts.costFlat,
                    quotationBase: base,
                    isDocumentVisible: base === 'Execution',
                    valueDate: effectiveInitialDate,
                    allowAlternativeValueDate: formData.allowAlternativeValueDate || false
                }
            ]);
        }
    };

    const handleMasterValueDateChange = (newVal) => {
        setFormData(prev => {
            const next = { ...prev, valueDate: newVal };
            // If quotation window is currently scheduled after this value date, clamp it to this value date
            if (newVal && prev.windowStart) {
                const currentWinDate = prev.windowStart.split('T')[0];
                if (currentWinDate > newVal) {
                    const timePart = prev.windowStart.split('T')[1] || '10:00';
                    next.windowStart = `${newVal}T${timePart}`;
                    toast.info(`Quotation window adjusted to ${formatDate(newVal)}: bidding must take place on or before Value Date.`);
                }
            }
            return next;
        });

        if (newVal) {
            setSelectedBanks(prev => prev.map(b => {
                if (b._dateCustomized) return b;
                if (!b.valueDate || b.valueDate === formData.valueDate || (windowStartDate && b.valueDate < windowStartDate)) {
                    return { ...b, valueDate: newVal };
                }
                return b;
            }));
        }
    };

    const handleTbillSettlementChange = (newSettlement) => {
        setFormData(prev => {
            const next = { ...prev, settlementDateStart: newSettlement };
            if (newSettlement && prev.windowStart) {
                const currentWinDate = prev.windowStart.split('T')[0];
                if (currentWinDate > newSettlement) {
                    const timePart = prev.windowStart.split('T')[1] || '10:00';
                    next.windowStart = `${newSettlement}T${timePart}`;
                    toast.info(`Quotation window adjusted to ${formatDate(newSettlement)}: bidding must take place on or before Settlement Date.`);
                }
            }
            return next;
        });
    };

    const handleWindowStartChange = (newStart) => {
        const newStartDate = newStart ? newStart.split('T')[0] : '';
        const limitDate = formData.type === 'TBILL' ? formData.settlementDateStart : formData.valueDate;

        if (limitDate && newStartDate && newStartDate > limitDate) {
            toast.error(`Quotation window cannot be scheduled after Value Date (${formatDate(limitDate)}). Bidding must occur on or before settlement.`);
            const timePart = newStart.split('T')[1] || '10:00';
            setFormData(prev => ({ ...prev, windowStart: `${limitDate}T${timePart}` }));
            return;
        }

        setFormData(prev => ({ ...prev, windowStart: newStart }));

        if (newStartDate) {
            setSelectedBanks(prev => prev.map(b => {
                if (b.valueDate && b.valueDate < newStartDate) {
                    return { ...b, valueDate: newStartDate };
                }
                return b;
            }));
        }
    };

    const applyValueDateToAllBanks = () => {
        if (!formData.valueDate) {
            toast.info("Please set a master value date first.");
            return;
        }
        setSelectedBanks(prev => prev.map(b => ({ ...b, valueDate: formData.valueDate, _dateCustomized: false })));
        toast.success(`Value Date (${formatDate(formData.valueDate)}) synced to all ${selectedBanks.length} selected banks.`);
    };

    const toggleMasterAlternativeValueDate = (enabled) => {
        setFormData(prev => ({ ...prev, allowAlternativeValueDate: enabled }));
        setSelectedBanks(prev => prev.map(b => {
            if (b._altCustomized) return b;
            return { ...b, allowAlternativeValueDate: enabled };
        }));
    };

    const handleApplyCbeBenchmarkRate = () => {
        if (evalRateDetails?.eval_rate) {
            hasUserChangedEvalRateRef.current = false;
            setFormData(prev => ({ ...prev, evalRate: String(evalRateDetails.eval_rate) }));
            toast.info(`Pre-filled Evaluation Rate: ${evalRateDetails.eval_rate}% (CBE Mid ${evalRateDetails.cbe_mid}% + Margin ${evalRateDetails.margin}%)`);
        }
    };

    const toggleAllAlternativeValueDate = (enabled) => {
        setFormData(prev => ({ ...prev, allowAlternativeValueDate: enabled }));
        setSelectedBanks(prev => prev.map(b => ({ ...b, allowAlternativeValueDate: enabled, _altCustomized: false })));
        toast.info(`${enabled ? 'Enabled' : 'Disabled'} alternative value date proposals for all selected banks.`);
    };

    const updateBankCost = (bankId, field, value) => {
        setSelectedBanks(prev => prev.map(b => {
            if (String(b.id) !== String(bankId)) return b;
            if (field === 'quotationBase') {
                return {
                    ...b,
                    quotationBase: value,
                    isDocumentVisible: value === 'Execution',
                    _baseCustomized: true
                };
            }
            if (field === 'valueDate') {
                return {
                    ...b,
                    valueDate: value,
                    _dateCustomized: true
                };
            }
            if (field === 'allowAlternativeValueDate') {
                return {
                    ...b,
                    allowAlternativeValueDate: value,
                    _altCustomized: true
                };
            }
            return { ...b, [field]: value };
        }));
    };

    const handleMasterQuotationBaseChange = (type) => {
        setFormData(prev => ({ ...prev, quotationBase: type }));
        setSelectedBanks(prev => prev.map(b => {
            if (b._baseCustomized) return b;
            return {
                ...b,
                quotationBase: type,
                isDocumentVisible: type === 'Execution'
            };
        }));
    };

    const applyQuotationBaseToAllBanks = () => {
        const base = formData.quotationBase || 'Execution';
        setSelectedBanks(prev => prev.map(b => ({
            ...b,
            quotationBase: base,
            isDocumentVisible: base === 'Execution',
            _baseCustomized: false
        })));
        toast.success(`Quotation Base (${base}) synced to all selected banks.`);
    };

    const uniqueBases = Array.from(new Set(selectedBanks.map(b => b.quotationBase || formData.quotationBase)));
    const hasMixedBases = selectedBanks.length > 1 && uniqueBases.length > 1;

    // Detect if any selected Execution bank has an internal Approver layer
    const selectedBanksWithApprovers = selectedBanks.filter(sb => {
        const isExecution = (sb.quotationBase || formData.quotationBase) === 'Execution';
        if (!isExecution) return false;
        const fullBank = banks.find(b => b.bank_id === sb.id);
        const contacts = fullBank?.contacts || sb.contacts || [];
        return contacts.some(c => c.role === 'APPROVER');
    });

    const windowStartMs = formData.windowStart ? new Date(formData.windowStart).getTime() : null;
    const nowMs = Date.now();
    const diffMinsToStart = windowStartMs !== null ? Math.round((windowStartMs - nowMs) / 60000) : null;
    const isApproverWindowTight = selectedBanksWithApprovers.length > 0 && diffMinsToStart !== null && diffMinsToStart < 30;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (selectedBanks.length === 1) {
            if (!window.confirm("You have only selected 1 bank. It is recommended to select multiple banks for competitive pricing. Do you want to proceed?")) {
                setIsSubmitting(false);
                return;
            }
        }

        const windowStart = new Date(formData.windowStart);
        const windowEnd = new Date(windowStart.getTime() + parseInt(formData.windowDuration) * 1000);

        // Date Consistency Check: Value Date and Settlement Date cannot precede quotation window date
        const windowStartDate = formData.windowStart ? formData.windowStart.split('T')[0] : '';
        if (windowStartDate) {
            if (formData.type === 'FX_SPOT') {
                for (let i = 0; i < pairs.length; i++) {
                    const p = pairs[i];
                    const pairNum = i + 1;
                    if (!p.amount || parseFloat(p.amount) <= 0) {
                        toast.error(`Please enter a valid amount for Pair #${pairNum} (${p.buyCurrency || 'USD'}/${p.sellCurrency || 'EGP'}).`);
                        setIsSubmitting(false);
                        return;
                    }
                    if (!p.buyCurrency || !p.sellCurrency || p.buyCurrency === p.sellCurrency) {
                        toast.error(`Pair #${pairNum} cannot have identical Buy and Sell currencies (${p.buyCurrency}).`);
                        setIsSubmitting(false);
                        return;
                    }
                    if (p.valueDate && p.valueDate < windowStartDate) {
                        toast.error(`Pair #${pairNum} (${p.buyCurrency}/${p.sellCurrency}) Value Date (${formatDate(p.valueDate)}) cannot be earlier than quotation window date (${formatDate(windowStartDate)}).`);
                        setIsSubmitting(false);
                        return;
                    }
                }

                for (const b of selectedBanks) {
                    if (b.customPairTariffs && b.pairConfigs) {
                        for (const [pId, cfg] of Object.entries(b.pairConfigs)) {
                            const effectiveValDate = cfg.valueDate || b.valueDate || formData.valueDate;
                            if (effectiveValDate && effectiveValDate < windowStartDate) {
                                toast.error(`Bank "${b.name || 'Selected Bank'}" has a custom Value Date (${formatDate(effectiveValDate)}) earlier than quotation window date (${formatDate(windowStartDate)}).`);
                                setIsSubmitting(false);
                                return;
                            }
                        }
                    } else {
                        const effectiveBankValDate = b.valueDate || formData.valueDate;
                        if (effectiveBankValDate && effectiveBankValDate < windowStartDate) {
                            toast.error(`Bank "${b.name || 'Selected Bank'}" has a Value Date (${formatDate(effectiveBankValDate)}) earlier than quotation window date (${formatDate(windowStartDate)}). Value date must be on or after the quotation window date.`);
                            setIsSubmitting(false);
                            return;
                        }
                    }
                }
            } else if (formData.type === 'TBILL') {
                if (formData.settlementDateStart && formData.settlementDateStart < windowStartDate) {
                    toast.error(`Settlement Date (${formatDate(formData.settlementDateStart)}) cannot be earlier than quotation window date (${formatDate(windowStartDate)}).`);
                    setIsSubmitting(false);
                    return;
                }
                if (formData.settlementDateEnd && formData.settlementDateEnd < formData.settlementDateStart) {
                    toast.error("Settlement Range End cannot be earlier than Settlement Date Start.");
                    setIsSubmitting(false);
                    return;
                }
                if (formData.maturityDateStart && formData.maturityDateStart <= formData.settlementDateStart) {
                    toast.error("Maturity Date must be strictly after Settlement Date.");
                    setIsSubmitting(false);
                    return;
                }
            }
        }

        // Approver Timing Notice Check: If window starts in less than 30 mins and approver layer is present
        if (isApproverWindowTight) {
            const bankNames = selectedBanksWithApprovers.map(b => b.name).join(', ');
            const leadTimeText = diffMinsToStart <= 0 ? 'immediately' : `in ${diffMinsToStart} minutes`;
            if (!window.confirm(
                `Notice: ${bankNames} require internal Bank Approver sign-off before quoting, but this quotation starts ${leadTimeText}.\n\nApprovers may not have sufficient lead time to authorize participation. Do you want to proceed anyway?`
            )) {
                setIsSubmitting(false);
                return;
            }
        }

        // Time Safety Check: If closing_time is less than 30 mins from now
        const now = new Date();
        const diffMins = Math.round((windowEnd - now) / 60000);
        if (diffMins < 30) {
            const msg = diffMins < 0
                ? "This quotation's window is already in the past. Are you sure you want to proceed?"
                : `This quotation has only ${diffMins} minutes remaining before it closes. Are you sure you want to proceed?`;
            if (!window.confirm(msg)) {
                setIsSubmitting(false);
                return;
            }
        }

        let uploadedDocs = [];
        if (files && files.length > 0) {
            try {
                const uploadData = new FormData();
                files.forEach(f => uploadData.append('files', f));
                const uploadRes = await apiClient.post('/end-user/quotations/upload-documents', uploadData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (uploadRes.data && uploadRes.data.documents) {
                    uploadedDocs = uploadRes.data.documents;
                }
            } catch (uploadErr) {
                console.error('Document upload failed:', uploadErr);
                alert('Warning: Failed to upload attached documents.');
            }
        }

        const formattedBanks = selectedBanks.map(b => ({
            id: b.id,
            costMin: b.costMin ?? 0,
            costPercent: b.costPercent ?? 0,
            costMax: b.costMax ?? 0,
            costFlat: b.costFlat ?? 0,
            quotationBase: b.quotationBase || formData.quotationBase || 'Execution',
            isDocumentVisible: b.isDocumentVisible !== false,
            valueDate: b.valueDate ? String(b.valueDate).split('T')[0] : (formData.valueDate ? String(formData.valueDate).split('T')[0] : null),
            allowAlternativeValueDate: b.allowAlternativeValueDate ?? formData.allowAlternativeValueDate ?? false
        }));

        let formattedPairs = undefined;
        if (formData.type === 'FX_SPOT' && pairs.length > 0) {
            formattedPairs = pairs.map((p, idx) => {
                const legBanks = selectedBanks.map(b => {
                    const cfg = (b.customPairTariffs && b.pairConfigs && b.pairConfigs[p.id]) ? b.pairConfigs[p.id] : null;
                    return {
                        id: b.id,
                        costMin: cfg?.costMin !== undefined ? cfg.costMin : (b.costMin ?? 0),
                        costPercent: cfg?.costPercent !== undefined ? cfg.costPercent : (b.costPercent ?? 0),
                        costMax: cfg?.costMax !== undefined ? cfg.costMax : (b.costMax ?? 0),
                        costFlat: cfg?.costFlat !== undefined ? cfg.costFlat : (b.costFlat ?? 0),
                        quotationBase: cfg?.quotationBase || b.quotationBase || p.quotationBase || formData.quotationBase || 'Execution',
                        isDocumentVisible: cfg?.isDocumentVisible !== undefined ? cfg.isDocumentVisible : (b.isDocumentVisible !== false),
                        valueDate: cfg?.valueDate ? String(cfg.valueDate).split('T')[0] : (b.valueDate ? String(b.valueDate).split('T')[0] : (p.valueDate ? String(p.valueDate).split('T')[0] : null)),
                        allowAlternativeValueDate: cfg?.allowAlternativeValueDate !== undefined ? cfg.allowAlternativeValueDate : (b.allowAlternativeValueDate ?? p.allowAlternativeValueDate ?? false)
                    };
                });

                return {
                    direction: p.direction || 'Buy',
                    buyCurrency: p.buyCurrency || 'USD',
                    sellCurrency: p.sellCurrency || 'EGP',
                    amount: p.amount ? parseFloat(p.amount) : null,
                    minTicketAmount: p.minTicketAmount ? parseFloat(p.minTicketAmount) : null,
                    valueDate: p.valueDate ? String(p.valueDate).split('T')[0] : null,
                    allowAlternativeValueDate: Boolean(p.allowAlternativeValueDate),
                    quotationBase: p.quotationBase || 'Execution',
                    maxTolerancePercent: p.maxTolerancePercent ? parseFloat(p.maxTolerancePercent) : null,
                    selectedBanks: legBanks
                };
            });
        }

        const combinedDocs = [...existingDocs, ...uploadedDocs];
        const finalDocPath = combinedDocs.length > 0 ? JSON.stringify(combinedDocs) : null;

        if (entities.length > 1 && !formData.entityId) {
            toast.error("Please select a Legal Entity for this quotation request.");
            setIsSubmitting(false);
            return;
        }

        const hasExecutionCounterparties = selectedBanks.some(b => (b.quotationBase || formData.quotationBase) === 'Execution') || (!selectedBanks.length && formData.quotationBase === 'Execution');
        if (hasExecutionCounterparties && !legalAcknowledged) {
            toast.error("Please accept the mandatory Counterparty Liability & Execution Acknowledgment before submitting.");
            setIsSubmitting(false);
            return;
        }

        const primaryPair = formattedPairs && formattedPairs[0] ? formattedPairs[0] : null;

        // If in Revision Mode, call resubmit endpoint to update existing RFQ and return to PENDING_APPROVAL
        if (revisionRfqId) {
            const revisionPayload = {
                entity_id: formData.entityId ? parseInt(formData.entityId, 10) : undefined,
                type: formData.type,
                direction: primaryPair ? primaryPair.direction : (formData.direction || null),
                value_date: primaryPair ? primaryPair.valueDate : (formData.valueDate || null),
                allow_alternative_value_date: primaryPair ? primaryPair.allowAlternativeValueDate : (formData.allowAlternativeValueDate || false),
                amount: primaryPair ? primaryPair.amount : (formData.amount ? parseFloat(formData.amount) : null),
                min_ticket_amount: primaryPair ? primaryPair.minTicketAmount : (formData.minTicketAmount ? parseFloat(formData.minTicketAmount) : null),
                buy_currency: primaryPair ? primaryPair.buyCurrency : (formData.buyCurrency || null),
                sell_currency: primaryPair ? primaryPair.sellCurrency : (formData.sellCurrency || null),
                settlement_date_start: formData.settlementDateStart || null,
                settlement_date_end: formData.settlementDateEnd || null,
                maturity_date_start: formData.maturityDateStart || null,
                maturity_date_end: formData.maturityDateEnd || null,
                eval_rate: formData.evalRate ? parseFloat(formData.evalRate) : null,
                window_start: windowStart.toISOString(),
                window_end: windowEnd.toISOString(),
                quotation_base: primaryPair ? primaryPair.quotationBase : (formData.quotationBase || null),
                max_tolerance_percent: primaryPair ? primaryPair.maxTolerancePercent : (formData.maxTolerancePercent ? parseFloat(formData.maxTolerancePercent) : null),
                document_path: finalDocPath,
                selected_banks: JSON.stringify(formattedBanks),
                token_validity_hours: parseInt(formData.tokenValidityHours, 10),
                user_notes: (userNotes || '').trim() || undefined,
                internal_notes: (formData.internalNotes || '').trim() || undefined,
                legal_disclaimer_accepted: hasExecutionCounterparties ? Boolean(legalAcknowledged) : false,
                legalDisclaimerAccepted: hasExecutionCounterparties ? Boolean(legalAcknowledged) : false,
                pairs: formattedPairs,
            };

            try {
                await apiClient.post(`/end-user/quotations/${revisionRfqId}/resubmit`, revisionPayload);
                toast.success(`RFQ ${sourceRfq?.ref_no || ''} revised and resubmitted for Corporate Admin approval!`);
                navigate('/end-user/quotations/history');
                return;
            } catch (err) {
                console.error('Revision resubmission error:', err);
                toast.error(err.response?.data?.detail || err.message || 'Resubmission failed');
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        // Prepare JSON payload according to backend schema (Standard or Re-Trade)
        const payload = {
            entity_id: formData.entityId ? parseInt(formData.entityId, 10) : undefined,
            type: formData.type,
            direction: primaryPair ? primaryPair.direction : (formData.direction || null),
            valueDate: primaryPair ? primaryPair.valueDate : (formData.valueDate || null),
            allowAlternativeValueDate: primaryPair ? primaryPair.allowAlternativeValueDate : (formData.allowAlternativeValueDate || false),
            amount: primaryPair ? primaryPair.amount : (formData.amount ? parseFloat(formData.amount) : null),
            minTicketAmount: primaryPair ? primaryPair.minTicketAmount : (formData.minTicketAmount ? parseFloat(formData.minTicketAmount) : null),
            buyCurrency: primaryPair ? primaryPair.buyCurrency : (formData.buyCurrency || null),
            sellCurrency: primaryPair ? primaryPair.sellCurrency : (formData.sellCurrency || null),
            settlementDateStart: formData.settlementDateStart || null,
            settlementDateEnd: formData.settlementDateEnd || null,
            maturityDateStart: formData.maturityDateStart || null,
            maturityDateEnd: formData.maturityDateEnd || null,
            evalRate: formData.evalRate ? parseFloat(formData.evalRate) : null,
            windowStart: windowStart.toISOString(),
            windowEnd: windowEnd.toISOString(),
            quotationBase: primaryPair ? primaryPair.quotationBase : (formData.quotationBase || null),
            maxTolerancePercent: primaryPair ? primaryPair.maxTolerancePercent : (formData.maxTolerancePercent ? parseFloat(formData.maxTolerancePercent) : null),
            documentPath: finalDocPath,
            selectedBanks: JSON.stringify(formattedBanks),
            token_validity_hours: parseInt(formData.tokenValidityHours, 10),
            parent_rfq_id: retradeRfqId || undefined,
            internal_notes: (formData.internalNotes || '').trim() || undefined,
            internalNotes: (formData.internalNotes || '').trim() || undefined,
            legal_disclaimer_accepted: hasExecutionCounterparties ? Boolean(legalAcknowledged) : false,
            legalDisclaimerAccepted: hasExecutionCounterparties ? Boolean(legalAcknowledged) : false,
            pairs: formattedPairs,
        };

        try {
            const res = await apiClient.post('/end-user/quotations/', payload);
            console.log('RFQ Created:', res.data);
            if (retradeRfqId) {
                toast.success(`Re-trade RFQ ${res.data.ref_no} launched successfully!`);
            } else {
                toast.success(`RFQ ${res.data.ref_no} created successfully!`);
            }
            setCreatedRfq(res.data);
        } catch (err) {
            console.error('RFQ Submission Error:', err);
            toast.error(err.response?.data?.detail || err.message || 'Submission failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (createdRfq) {
        return (
            <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div
                        className="lg:col-span-1 bg-white p-6 sm:p-8 rounded-xl border border-gray-100 h-fit lg:sticky lg:top-6 transition-all duration-500 ease-out transform translate-y-0 opacity-100"
                    >
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                                <CheckCircle2 size={24} />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-semibold">RFQ Active</h2>
                        </div>
                        <div className="mb-6 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Reference Number</label>
                            <p className="text-base sm:text-lg font-mono font-bold text-black break-all">{createdRfq.ref_no || 'Generating...'}</p>
                        </div>
                        <p className="text-gray-600 mb-5 text-sm">
                            Secure tokens generated for {selectedBanks.length} banks. Monitoring submissions in real-time.
                        </p>
                        <div className="space-y-3.5 max-h-none lg:max-h-[82vh] overflow-y-auto pr-1">
                            {createdRfq.assignments?.map((a) => {
                                const bank = selectedBanks.find(b => b.id === a.bankId);
                                // Adjusting link to point to the public portal segment
                                const publicRoute = window.location.origin.includes('localhost') ? 'http://localhost:3000' : window.location.origin;
                                const link = `${publicRoute}/public-quotation/${a.token}`;
                                return (
                                    <div key={a.token} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                                            <span className="font-medium text-sm text-gray-800">{bank?.name || `Bank ${a.bankId}`}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                readOnly
                                                value={link}
                                                className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] sm:text-xs font-mono text-gray-400 truncate"
                                            />
                                            <button
                                                onClick={() => window.open(link, '_blank')}
                                                title="Open Link"
                                                className="p-2 sm:px-3 sm:py-1.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shrink-0"
                                            >
                                                <ExternalLink size={16} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(link);
                                                    setCopiedToken(a.token);
                                                    toast.success('Link copied to clipboard!');
                                                    setTimeout(() => setCopiedToken(null), 2000);
                                                }}
                                                title={copiedToken === a.token ? "Copied!" : "Copy Link"}
                                                className={`p-2 sm:px-3 sm:py-1.5 rounded-lg transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                                                    copiedToken === a.token 
                                                        ? 'bg-emerald-600 text-white shadow-xs' 
                                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                }`}
                                            >
                                                {copiedToken === a.token ? <Check size={16} /> : <Copy size={16} />}
                                                {copiedToken === a.token && <span className="text-[10px] sm:text-xs font-semibold">Copied</span>}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            onClick={handleReset}
                            className="mt-6 w-full py-3 sm:py-4 border-2 border-black rounded-2xl font-medium hover:bg-black hover:text-white transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <RotateCcw size={16} />
                            Create New RFQ (Reset Form)
                        </button>
                    </div>

                    <div className="lg:col-span-2">
                        <ResultsView rfqId={createdRfq.rfq_id} />
                    </div>
                </div>
            </div>
        );
    }

    const hasExecutionBanks = selectedBanks.some(b => (b.quotationBase || formData.quotationBase) === 'Execution') || (!selectedBanks.length && formData.quotationBase === 'Execution');
    const selectedEntity = entities.find(e => String(e.id) === String(formData.entityId)) || (entities.length === 1 ? entities[0] : null);
    const selectedEntityName = selectedEntity ? `${selectedEntity.code ? `[${selectedEntity.code}] ` : ''}${selectedEntity.name}` : 'Your Legal Entity';

    return (
        <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-8">
            {revisionRfqId && (
                <div className="mb-6 p-5 sm:p-6 rounded-3xl bg-amber-50/90 border border-amber-200 text-amber-950 shadow-sm animate-fade-in space-y-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
                                <Undo2 size={20} />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Quotation Returned for Revision</span>
                                <h3 className="text-base font-bold text-amber-950 font-mono">
                                    Ref: {sourceRfq?.ref_no || revisionRfqId}
                                </h3>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/end-user/quotations/history')}
                            className="text-xs font-semibold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200/80 px-3.5 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                            <ArrowLeft size={13} /> Back to History
                        </button>
                    </div>

                    {sourceRfq?.admin_revision_notes && (
                        <div className="p-4 bg-white/90 rounded-2xl border border-amber-200 text-xs text-amber-900 shadow-xs">
                            <span className="font-bold text-amber-800 uppercase text-[10px] tracking-wide block mb-1 flex items-center gap-1.5">
                                <AlertCircle size={13} className="text-amber-600" />
                                Corporate Admin Revision Notes:
                            </span>
                            <p className="italic text-slate-800 font-medium pl-4 leading-relaxed">
                                "{sourceRfq.admin_revision_notes}"
                            </p>
                        </div>
                    )}

                    <div className="pt-1">
                        <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1.5">
                            Your Revision Response / Remarks for Corporate Admin (Optional)
                        </label>
                        <input
                            type="text"
                            value={userNotes}
                            onChange={(e) => setUserNotes(e.target.value)}
                            placeholder="e.g. Adjusted trade amount to 500,000 USD and added CIB to counterparties as requested."
                            className="w-full px-4 py-2.5 text-xs bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-800 font-medium placeholder:text-slate-400"
                        />
                    </div>
                </div>
            )}

            {retradeRfqId && (
                <div className="mb-6 p-5 sm:p-6 rounded-3xl bg-indigo-50/90 border border-indigo-200 text-indigo-950 shadow-sm animate-fade-in flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-200 text-indigo-900 flex items-center justify-center shrink-0">
                            <RefreshCw size={20} />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Re-Trade / Re-Tender Order</span>
                            <h3 className="text-base font-bold text-indigo-950">
                                Pre-filled from <span className="font-mono">{sourceRfq?.ref_no || retradeRfqId}</span>
                            </h3>
                            <p className="text-xs text-indigo-800 mt-0.5">
                                Original parameters and counterparties have been cloned. Tweak any values below and launch your new quotation.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleReset}
                        className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 hover:bg-indigo-50 px-3.5 py-2 rounded-xl transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
                    >
                        <RotateCcw size={13} />
                        Clear & Start Blank
                    </button>
                </div>
            )}

            <header className="mb-8 sm:mb-12">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                            {revisionRfqId
                                ? `Revise Quotation Request`
                                : retradeRfqId
                                ? `Re-Trade Quotation Request`
                                : `New Quotation Request`}
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">
                            Configure parameters, select counterparty banks, and submit your RFQ.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleReset}
                        title="Reset entire form and page to initial blank state"
                        className="self-start sm:self-auto px-4 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                        <RotateCcw size={14} className="text-gray-500" />
                        Reset Page
                    </button>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-4 mt-6">
                    {['FX_SPOT', 'TBILL'].map(type => (
                        <button
                            key={type}
                            type="button"
                            disabled={Boolean(retradeRfqId || revisionRfqId)}
                            onClick={() => {
                                setFormData(prev => ({
                                    ...prev,
                                    type: type,
                                    evalRate: (!prev.evalRate && !hasUserChangedEvalRateRef.current && type === 'TBILL' && evalRateDetails?.eval_rate)
                                        ? String(evalRateDetails.eval_rate)
                                        : prev.evalRate
                                }));
                            }}
                            className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border-2 flex-grow sm:flex-grow-0 ${
                                formData.type === type
                                    ? 'bg-black border-black text-white'
                                    : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                            } ${(retradeRfqId || revisionRfqId) ? 'cursor-not-allowed opacity-80' : ''}`}
                        >
                            {type === 'FX_SPOT' ? 'FX Spot' : 'Treasury Bills (T-Bills)'}
                        </button>
                    ))}
                </div>
            </header>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: RFQ Details */}
                <div className="xl:col-span-1 space-y-6">
                    <section className="bg-white p-5 sm:p-6 rounded-xl border border-gray-100">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-6 flex items-center gap-2">
                            <FileText size={14} /> {formData.type === 'TBILL' ? 'T-Bill Details' : 'Trade Details'}
                        </h3>

                        <div className="space-y-5">
                            {/* Legal Entity Selection */}
                            {entities.length > 1 ? (
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <Building size={13} className="text-indigo-600" />
                                            Requesting Legal Entity <span className="text-rose-500">*</span>
                                        </label>
                                        {retradeRfqId && (
                                            <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                                🔒 Locked
                                            </span>
                                        )}
                                    </div>
                                    <select
                                        required
                                        disabled={Boolean(retradeRfqId)}
                                        value={formData.entityId || ''}
                                        onChange={(e) => {
                                            const nextEntityId = e.target.value;
                                            setFormData(prev => ({ ...prev, entityId: nextEntityId }));
                                            setSelectedBanks([]);
                                        }}
                                        className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all ${
                                            retradeRfqId ? 'opacity-70 bg-gray-100 cursor-not-allowed' : ''
                                        }`}
                                    >
                                        <option value="">-- Select Legal Entity --</option>
                                        {entities.map(ent => {
                                            const entityName = ent.entity_name || ent.name || ent.code;
                                            const label = ent.code && ent.code !== entityName
                                                ? `${entityName} (${ent.code})`
                                                : entityName;
                                            return (
                                                <option key={ent.id} value={ent.id}>
                                                    {label}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        Quotes and bank counterparty routing will be specific to this legal entity.
                                    </p>
                                </div>
                            ) : entities.length === 1 ? (
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <Building size={14} className="text-indigo-600 shrink-0" />
                                        <div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Legal Entity</span>
                                            <span className="text-xs font-bold text-slate-900">
                                                {entities[0].code ? `[${entities[0].code}] ` : ''}{entities[0].name}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full uppercase">
                                        Active
                                    </span>
                                </div>
                            ) : (
                                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
                                    <AlertCircle size={14} className="shrink-0 text-amber-600" />
                                    <span>No legal entities assigned to your account. Contact your Corporate Administrator.</span>
                                </div>
                            )}

                            {formData.type === 'TBILL' ? (
                                <>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Direction</label>
                                        <div className="flex gap-2">
                                            {['Buy', 'Sell'].map(dir => (
                                                <button
                                                    key={dir}
                                                    type="button"
                                                    disabled={Boolean(retradeRfqId)}
                                                    onClick={() => setFormData({ ...formData, direction: dir })}
                                                    className={`flex-1 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${formData.direction === dir
                                                        ? 'bg-black text-white'
                                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                        } ${retradeRfqId ? 'cursor-not-allowed opacity-80' : ''}`}
                                                >
                                                    {dir}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase">Total Amount</label>
                                                {retradeRfqId && (
                                                    <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                                        🔒 Locked
                                                    </span>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    required
                                                    disabled={Boolean(retradeRfqId)}
                                                    placeholder="0.00"
                                                    style={{ paddingLeft: '1rem', paddingRight: '3.75rem' }}
                                                    className={`w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 sm:py-3 text-base font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-black/5 transition-all outline-none ${
                                                        retradeRfqId ? 'opacity-70 bg-gray-100 cursor-not-allowed' : ''
                                                    }`}
                                                    value={formData.amount}
                                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                                    onWheel={(e) => e.target.blur()}
                                                />
                                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs uppercase tracking-wider pointer-events-none select-none">
                                                    EGP
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Min Ticket Amount</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    required
                                                    placeholder="0.00"
                                                    style={{ paddingLeft: '1rem', paddingRight: '3.75rem' }}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 sm:py-3 text-base font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-black/5 transition-all outline-none"
                                                    value={formData.minTicketAmount}
                                                    onChange={e => setFormData({ ...formData, minTicketAmount: e.target.value })}
                                                    onWheel={(e) => e.target.blur()}
                                                />
                                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs uppercase tracking-wider pointer-events-none select-none">
                                                    EGP
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                                                Settlement Date {formData.direction === 'Sell' ? '(Fixed)' : '(Exact or Start)'}
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                min={todayStr}
                                                className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                                value={formData.settlementDateStart}
                                                onChange={e => handleTbillSettlementChange(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-[10px] font-bold text-gray-400 uppercase mb-1 ${formData.direction === 'Sell' ? 'opacity-30' : ''}`}>
                                                Settlement Range End (Optional)
                                            </label>
                                            <input
                                                type="date"
                                                disabled={formData.direction === 'Sell'}
                                                min={formData.settlementDateStart || todayStr}
                                                className={`w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all ${formData.direction === 'Sell' ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                value={formData.direction === 'Sell' ? '' : formData.settlementDateEnd}
                                                onChange={e => setFormData({
                                                    ...formData,
                                                    settlementDateEnd: e.target.value,
                                                    evalRate: (!formData.evalRate && !hasUserChangedEvalRateRef.current && evalRateDetails?.eval_rate)
                                                        ? String(evalRateDetails.eval_rate)
                                                        : formData.evalRate
                                                })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                                                Maturity Date {formData.direction === 'Sell' ? '(Fixed)' : '(Exact or Start)'}
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                min={formData.settlementDateStart || todayStr}
                                                className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                                value={formData.maturityDateStart}
                                                onChange={e => setFormData({ ...formData, maturityDateStart: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-[10px] font-bold text-gray-400 uppercase mb-1 ${formData.direction === 'Sell' ? 'opacity-30' : ''}`}>
                                                Maturity Range End (Optional)
                                            </label>
                                            <input
                                                type="date"
                                                disabled={formData.direction === 'Sell'}
                                                min={formData.maturityDateStart || formData.settlementDateStart || todayStr}
                                                className={`w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all ${formData.direction === 'Sell' ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                value={formData.direction === 'Sell' ? '' : formData.maturityDateEnd}
                                                onChange={e => setFormData({
                                                    ...formData,
                                                    maturityDateEnd: e.target.value,
                                                    evalRate: (!formData.evalRate && !hasUserChangedEvalRateRef.current && evalRateDetails?.eval_rate)
                                                        ? String(evalRateDetails.eval_rate)
                                                        : formData.evalRate
                                                })}
                                            />
                                        </div>
                                    </div>

                                    {formData.direction === 'Buy' && (formData.settlementDateEnd || formData.maturityDateEnd) && (
                                        <div className="animate-fade-in-up">
                                            <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase">
                                                    Evaluation Interest Rate (%)
                                                </label>
                                                {evalRateDetails?.eval_rate && (
                                                    <div className="flex items-center gap-1.5 text-[10px]">
                                                        <span className="text-blue-700 bg-blue-50/80 border border-blue-200/60 px-2 py-0.5 rounded-md font-medium">
                                                            CBE Mid ({evalRateDetails.cbe_mid}%) + Margin ({evalRateDetails.margin}%) = <span className="font-bold">{evalRateDetails.eval_rate}%</span>
                                                        </span>
                                                        {formData.evalRate !== String(evalRateDetails.eval_rate) && (
                                                            <button
                                                                type="button"
                                                                onClick={handleApplyCbeBenchmarkRate}
                                                                className="text-blue-600 hover:text-blue-800 underline font-semibold cursor-pointer"
                                                                title="Re-apply CBE Mid + Margin benchmark rate"
                                                            >
                                                                Pre-fill
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.0001"
                                                    required
                                                    placeholder={evalRateDetails?.eval_rate ? `e.g. ${evalRateDetails.eval_rate}` : "e.g. 18.5"}
                                                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all font-semibold text-gray-900"
                                                    value={formData.evalRate}
                                                    onChange={e => {
                                                        hasUserChangedEvalRateRef.current = true;
                                                        setFormData({ ...formData, evalRate: e.target.value });
                                                    }}
                                                    onWheel={(e) => e.target.blur()}
                                                />
                                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs uppercase tracking-wider pointer-events-none select-none">
                                                    %
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-gray-500 mt-1">
                                                Pre-filled with official CBE Mid-Corridor Rate plus customer margin. You can adjust or override this rate as needed.
                                            </p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* Multi-Pair FX Spot Workstation Header */}
                                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">
                                                Currency Pairs
                                            </span>
                                            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-full">
                                                {pairs.length} {pairs.length === 1 ? 'Pair' : 'Pairs'}
                                            </span>
                                        </div>
                                        {!retradeRfqId && (
                                            <button
                                                type="button"
                                                disabled={pairs.length >= 8}
                                                onClick={handleAddPair}
                                                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                                                title="Add another currency pair to this quotation session (up to 8 pairs)"
                                            >
                                                <Plus size={13} /> Add Pair ({pairs.length}/8)
                                            </button>
                                        )}
                                    </div>

                                    {/* Multi-Pair Pill Navigation Strip (Visible when multiple pairs exist or for quick switching) */}
                                    {pairs.length > 1 && (
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase">
                                                    Select Pair to Configure
                                                </label>
                                                <span className="text-[10px] text-gray-400 font-medium">
                                                    {activePairIndex + 1} of {pairs.length} active
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
                                                {pairs.map((p, idx) => {
                                                    const isActive = activePairIndex === idx;
                                                    const amountFormatted = p.amount ? Number(p.amount).toLocaleString() : '0';
                                                    return (
                                                        <div
                                                            key={p.id}
                                                            onClick={() => setActivePairIndex(idx)}
                                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all shrink-0 select-none ${
                                                                isActive
                                                                    ? 'bg-slate-900 border-slate-900 text-white shadow-sm ring-2 ring-blue-500/20'
                                                                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                                                            }`}
                                                        >
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                                                isActive ? 'bg-slate-800 text-blue-400' : 'bg-slate-200 text-slate-600'
                                                            }`}>
                                                                P{idx + 1}
                                                            </span>
                                                            <span className="font-bold tracking-tight">
                                                                {p.buyCurrency || 'USD'}/{p.sellCurrency || 'EGP'}
                                                            </span>
                                                            <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                                                                p.direction === 'Sell' 
                                                                    ? (isActive ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-50 text-rose-700')
                                                                    : (isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700')
                                                            }`}>
                                                                {p.direction || 'Buy'} {amountFormatted}
                                                            </span>
                                                            {!retradeRfqId && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRemovePair(idx);
                                                                    }}
                                                                    className={`p-1 rounded-md transition-colors ${
                                                                        isActive
                                                                            ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                                            : 'text-slate-400 hover:text-rose-600 hover:bg-slate-200'
                                                                    }`}
                                                                    title={`Remove ${p.buyCurrency}/${p.sellCurrency}`}
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Active Pair Card Editor */}
                                    <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-4">
                                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-800">
                                                    Pair #{activePairIndex + 1}: <span className="font-extrabold text-blue-900">{activePair.buyCurrency || 'USD'}/{activePair.sellCurrency || 'EGP'}</span>
                                                </span>
                                            </div>
                                            {pairs.length > 1 && (
                                                <span className="text-[10px] text-slate-500 font-medium">
                                                    Tab {activePairIndex + 1} of {pairs.length}
                                                </span>
                                            )}
                                        </div>

                                        {/* Direction Selector */}
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Trade Direction</label>
                                            <div className="flex gap-2">
                                                {['Buy', 'Sell'].map(dir => {
                                                    const isCurDir = (activePair.direction || 'Buy') === dir;
                                                    return (
                                                        <button
                                                            key={dir}
                                                            type="button"
                                                            disabled={Boolean(retradeRfqId)}
                                                            onClick={() => updateActivePair('direction', dir)}
                                                            className={`flex-1 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all border ${
                                                                isCurDir
                                                                    ? (dir === 'Buy' ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs' : 'bg-rose-600 border-rose-600 text-white shadow-xs')
                                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                                            } ${retradeRfqId ? 'cursor-not-allowed opacity-80' : ''}`}
                                                        >
                                                            {dir === 'Buy' ? 'Buy Currency' : 'Sell Currency'}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Currency Pair Pickers with Swap Button */}
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                                                Currency Pair ({activePair.direction === 'Sell' ? 'Selling / Buying' : 'Buying / Selling'})
                                            </label>
                                            <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
                                                <div>
                                                    <span className="block text-[9px] font-bold text-gray-500 mb-0.5">
                                                        {activePair.direction === 'Sell' ? 'Base (Sell)' : 'Base (Buy)'}
                                                    </span>
                                                    <select
                                                        disabled={Boolean(retradeRfqId)}
                                                        className={`w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-black/5 outline-none transition-all ${
                                                            retradeRfqId ? 'opacity-70 bg-gray-100 cursor-not-allowed' : ''
                                                        }`}
                                                        value={activePair.buyCurrency || 'USD'}
                                                        onChange={e => updateActivePair('buyCurrency', e.target.value)}
                                                    >
                                                        {['USD', 'EUR', 'GBP', 'EGP', 'AED', 'SAR', 'CHF', 'CAD', 'JPY', 'CNY', 'KWD'].map(c => (
                                                            <option key={c} value={c}>{c}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="pt-3">
                                                    <button
                                                        type="button"
                                                        disabled={Boolean(retradeRfqId)}
                                                        onClick={handleSwapCurrencies}
                                                        className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-2xs disabled:opacity-40"
                                                        title="Swap base and quote currencies"
                                                    >
                                                        <ArrowLeftRight size={13} />
                                                    </button>
                                                </div>

                                                <div>
                                                    <span className="block text-[9px] font-bold text-gray-500 mb-0.5">
                                                        {activePair.direction === 'Sell' ? 'Quote (Receive)' : 'Quote (Pay)'}
                                                    </span>
                                                    <select
                                                        disabled={Boolean(retradeRfqId)}
                                                        className={`w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-black/5 outline-none transition-all ${
                                                            retradeRfqId ? 'opacity-70 bg-gray-100 cursor-not-allowed' : ''
                                                        }`}
                                                        value={activePair.sellCurrency || 'EGP'}
                                                        onChange={e => updateActivePair('sellCurrency', e.target.value)}
                                                    >
                                                        {['EGP', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'CHF', 'CAD', 'JPY', 'CNY', 'KWD'].map(c => (
                                                            <option key={c} value={c}>{c}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Amount and Min Ticket Amount */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase">
                                                        {activePair.direction === 'Sell' ? 'Amount to Sell' : 'Amount to Buy'}
                                                    </label>
                                                    {retradeRfqId && (
                                                        <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                                                            🔒 Locked
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        required
                                                        disabled={Boolean(retradeRfqId)}
                                                        placeholder="0.00"
                                                        style={{ paddingLeft: '0.85rem', paddingRight: '3.75rem' }}
                                                        className={`w-full bg-white border border-slate-200 rounded-xl py-2 sm:py-2.5 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-black/5 outline-none transition-all ${
                                                            retradeRfqId ? 'opacity-70 bg-gray-100 cursor-not-allowed' : ''
                                                        }`}
                                                        value={activePair.amount || ''}
                                                        onChange={e => updateActivePair('amount', e.target.value)}
                                                        onWheel={(e) => e.target.blur()}
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs uppercase tracking-wider pointer-events-none select-none">
                                                        {activePair.buyCurrency || 'USD'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                                                    Min Split Ticket (Optional)
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        placeholder="Optional"
                                                        style={{ paddingLeft: '0.85rem', paddingRight: '3.75rem' }}
                                                        className="w-full bg-white border border-slate-200 rounded-xl py-2 sm:py-2.5 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                                        value={activePair.minTicketAmount || ''}
                                                        onChange={e => updateActivePair('minTicketAmount', e.target.value)}
                                                        onWheel={(e) => e.target.blur()}
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs uppercase tracking-wider pointer-events-none select-none">
                                                        {activePair.buyCurrency || 'USD'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Value Date & Alternative Value Date */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase">
                                                    Value Date (Settlement Date)
                                                </label>
                                                {pairs.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => applyValueDateToAllPairs(activePair.valueDate)}
                                                        className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
                                                        title="Sync this value date to all currency pairs"
                                                    >
                                                        <Copy size={11} /> Sync Date to All Pairs
                                                    </button>
                                                )}
                                            </div>
                                            <input
                                                type="date"
                                                required
                                                min={todayStr}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:ring-2 focus:ring-black/5 outline-none transition-all text-slate-800"
                                                value={activePair.valueDate || ''}
                                                onChange={e => {
                                                    const newVal = e.target.value;
                                                    updateActivePair('valueDate', newVal);
                                                    if (activePairIndex === 0) {
                                                        handleMasterValueDateChange(newVal);
                                                    }
                                                }}
                                            />

                                            <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl">
                                                <div className="flex items-center gap-2 pr-2">
                                                    <Calendar size={13} className="text-blue-600 shrink-0" />
                                                    <div>
                                                        <span className="text-xs font-semibold text-gray-900 block leading-tight">Allow Alternative Value Date</span>
                                                        <p className="text-[9px] text-gray-500 leading-tight">Counterparties may propose another settlement date for this pair</p>
                                                    </div>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={Boolean(activePair.allowAlternativeValueDate)}
                                                        onChange={e => updateActivePair('allowAlternativeValueDate', e.target.checked)}
                                                    />
                                                    <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Quotation Base for Active Pair */}
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                                                Quotation Base for This Pair
                                            </label>
                                            <div className="flex gap-2">
                                                {['Execution', 'Indicative'].map(baseType => (
                                                    <button
                                                        key={baseType}
                                                        type="button"
                                                        onClick={() => updateActivePair('quotationBase', baseType)}
                                                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                                            (activePair.quotationBase || formData.quotationBase || 'Execution') === baseType
                                                                ? 'bg-black border-black text-white'
                                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        {baseType}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Max Tolerance for Active Pair */}
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                                                Max Tolerance (%) vs Indicative
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.05"
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-black/5 outline-none transition-all font-semibold"
                                                    value={activePair.maxTolerancePercent !== undefined ? activePair.maxTolerancePercent : (formData.maxTolerancePercent || '0.05')}
                                                    onChange={e => updateActivePair('maxTolerancePercent', e.target.value)}
                                                    onWheel={(e) => e.target.blur()}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Portfolio Recap Bar for Multi-Pair RFQs */}
                                    {pairs.length > 1 && (
                                        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 border border-slate-200/80 text-xs shadow-2xs space-y-2">
                                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                                                <span className="flex items-center gap-1.5 uppercase tracking-wider text-slate-500 text-[10px]">
                                                    <Layers size={13} className="text-blue-600" />
                                                    Multi-Pair Portfolio Summary
                                                </span>
                                                <span className="text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                                                    {pairs.length} Legs
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                                                <div className="p-2 bg-white rounded-xl border border-slate-200/60">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase block">Earliest Settlement</span>
                                                    <span className="font-bold text-slate-900">{formatDate(targetValueDate)}</span>
                                                </div>
                                                <div className="p-2 bg-white rounded-xl border border-slate-200/60">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase block">Configured Pairs</span>
                                                    <span className="font-bold text-slate-900 truncate block">
                                                        {pairs.map(p => `${p.buyCurrency}/${p.sellCurrency}`).join(', ')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Internal Notes / Remarks */}
                            <div className="pt-2 border-t border-gray-100">
                                <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">
                                    Internal Notes / References (Optional)
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Add internal notes, list related payments, invoices, or business context..."
                                    className="w-full bg-gray-50 border border-gray-200/60 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:ring-2 focus:ring-black/5 outline-none transition-all resize-none"
                                    value={formData.internalNotes || ''}
                                    onChange={e => setFormData({ ...formData, internalNotes: e.target.value })}
                                />
                                <p className="text-[10px] text-gray-400 mt-1">
                                    Visible to Corporate Admin and stored in Quotation History. Counterparties cannot see this.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Time Window Section */}
                    <section className="bg-white p-5 sm:p-6 rounded-xl border border-gray-100">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-6 flex items-center gap-2">
                            <Clock size={14} /> Time Window & Validity
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase">Offer Window Start Time</label>
                                    {targetValueDate && (
                                        <span className="text-[10px] font-medium text-gray-500">
                                            Allowed: Today → {formatDate(targetValueDate)}
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="datetime-local"
                                    required
                                    min={nowLocalIso}
                                    max={maxWindowDateTime}
                                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                    value={formData.windowStart}
                                    onChange={e => handleWindowStartChange(e.target.value)}
                                />
                                {targetValueDate && (
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        Quotation window can be scheduled any day from today until Value Date ({formatDate(targetValueDate)}).
                                    </p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Duration</label>
                                    <select
                                        className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                        value={formData.windowDuration}
                                        onChange={e => setFormData({ ...formData, windowDuration: e.target.value })}
                                    >
                                        <option value="30">30s</option>
                                        <option value="60">1m</option>
                                        <option value="120">2m</option>
                                        <option value="180">3m</option>
                                        <option value="300">5m</option>
                                        <option value="600">10m</option>
                                        <option value="900">15m</option>
                                        <option value="1800">30m</option>
                                        <option value="3600">60m</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Link Validity</label>
                                    <select
                                        className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                        value={formData.tokenValidityHours}
                                        onChange={e => setFormData({ ...formData, tokenValidityHours: e.target.value })}
                                    >
                                        <option value="1">1 Hour</option>
                                        <option value="3">3 Hours</option>
                                        <option value="12">12 Hours</option>
                                        <option value="24">24 Hours (1 Day)</option>
                                        <option value="48">48 Hours (2 Days)</option>
                                        <option value="72">72 Hours (3 Days)</option>
                                    </select>
                                </div>
                            </div>
                            {isApproverWindowTight && (
                                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                                    <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="block font-bold text-amber-950 text-[11px] uppercase tracking-wide">
                                            Tight Approver Authorization Window
                                        </strong>
                                        <p className="mt-0.5 text-amber-800 leading-relaxed text-[11px]">
                                            {selectedBanksWithApprovers.map(b => b.name).join(', ')} {selectedBanksWithApprovers.length === 1 ? 'has' : 'have'} an internal Bank Approver layer configured. Since the quotation starts in {diffMinsToStart <= 0 ? 'less than a minute' : `${diffMinsToStart} minutes`}, bank approvers may have limited time to review parameters and authorize participation before bidding opens.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Documents Section */}
                    <section className="bg-white p-5 sm:p-6 rounded-xl border border-gray-100">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-4 flex items-center gap-2">
                            <FileText size={14} /> Supporting Documents
                        </h3>
                        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-black/20 hover:bg-gray-50 transition-all cursor-pointer relative overflow-hidden group">
                            <input
                                type="file"
                                multiple
                                className="absolute inset-0 opacity-0 cursor-pointer h-full w-full z-10"
                                onChange={e => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        setFiles(prev => [...prev, ...Array.from(e.target.files)]);
                                    }
                                }}
                            />
                            <Plus className="mx-auto text-gray-300 group-hover:text-black mb-2 transition-colors" />
                            <p className="text-xs sm:text-sm text-gray-500">Click or drag to attach files (Multiple allowed)</p>
                        </div>

                        {/* Existing Attachments from previous submission */}
                        {existingDocs.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Attached Documents</span>
                                {existingDocs.map((doc, idx) => (
                                    <div key={`existing-${idx}`} className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-xs">
                                        <span className="flex items-center gap-2 truncate text-blue-900 font-medium">
                                            <FileText size={14} className="text-blue-500 shrink-0" />
                                            <span className="truncate">{doc.name || doc.filename || 'Document'}</span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setExistingDocs(prev => prev.filter((_, i) => i !== idx))}
                                            className="text-red-500 hover:text-red-700 p-1 rounded font-bold text-xs shrink-0 cursor-pointer"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {files.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">New Files</span>
                                {files.map((f, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                                        <span className="flex items-center gap-2 truncate text-gray-700 font-medium">
                                            <FileText size={14} className="text-gray-400 shrink-0" />
                                            <span className="truncate">{f.name}</span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                                            className="text-red-500 hover:text-red-700 p-1 rounded font-bold text-xs shrink-0 cursor-pointer"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                {/* Right Column: Bank Selection */}
                <div className="xl:col-span-2 space-y-6">
                    <section className="bg-white p-5 sm:p-8 rounded-xl border border-gray-100 min-h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6 sm:mb-8 gap-3 flex-wrap">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 flex items-center gap-2">
                                <Landmark size={14} /> Bank Selection & Costs
                            </h3>
                            <div className="flex items-center gap-2 flex-wrap">
                                {banks && banks.length > 0 && (
                                    <>
                                        {selectedBanks.length < banks.length && (
                                            <button
                                                type="button"
                                                onClick={handleSelectAllBanks}
                                                disabled={isSelectingAll}
                                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                                                title="Select all available counterparty banks"
                                            >
                                                {isSelectingAll ? (
                                                    <RefreshCw size={12} className="animate-spin text-blue-600" />
                                                ) : (
                                                    <CheckSquare size={13} className="text-blue-600" />
                                                )}
                                                Select All
                                            </button>
                                        )}
                                        {selectedBanks.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={handleDeselectAllBanks}
                                                disabled={isSelectingAll}
                                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                                title="Deselect all counterparty banks"
                                            >
                                                <Square size={13} className="text-gray-500" /> Deselect All
                                            </button>
                                        )}
                                    </>
                                )}
                                <span className="text-xs font-medium bg-black text-white px-3 py-1 rounded-full shrink-0">
                                    {selectedBanks.length} Selected
                                </span>
                            </div>
                        </div>

                        {hasMixedBases && (
                            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm animate-fade-in-up">
                                <div className="flex items-center gap-2.5">
                                    <AlertCircle size={18} className="text-amber-600 shrink-0" />
                                    <div>
                                        <strong className="block text-amber-950 font-bold uppercase tracking-wider text-[10px]">Mixed Base Types Selected</strong>
                                        <span>
                                            {selectedBanks.filter(b => (b.quotationBase || formData.quotationBase) === 'Execution').length} Execution, {selectedBanks.filter(b => (b.quotationBase || formData.quotationBase) === 'Indicative').length} Indicative counterparty bases.
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleMasterQuotationBaseChange(formData.quotationBase)}
                                    className="px-3 py-1.5 bg-amber-200/90 hover:bg-amber-300 text-amber-950 font-bold rounded-xl text-[11px] transition-colors shrink-0 shadow-sm"
                                >
                                    Sync All to {formData.quotationBase}
                                </button>
                            </div>
                        )}

                        {/* 1-Click Alternative Value Date Toolbar for selected banks - appears only if dates are not synced */}
                        {formData.type === 'FX_SPOT' && selectedBanks.length > 0 && hasUnsyncedBankDates && (
                            <div className="mb-5 p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/70 via-slate-50 to-indigo-50/60 border border-blue-100 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs animate-fade-in-up">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                                        <Calendar size={15} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-extrabold text-blue-950 text-xs uppercase tracking-wide">Alternative Value Date Sync</span>
                                            <span className="text-[10px] font-bold bg-blue-100/90 text-blue-800 px-2 py-0.5 rounded-full">
                                                {selectedBanks.filter(b => b.allowAlternativeValueDate).length} of {selectedBanks.length} Allowed
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                            Master settlement date: <strong className="text-gray-800">{formData.valueDate ? formatDate(formData.valueDate) : 'Not specified'}</strong>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => toggleAllAlternativeValueDate(true)}
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[11px] transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                                        title="Allow all selected banks to propose alternative value dates"
                                    >
                                        <CheckCircle2 size={13} /> Allow for All Banks
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toggleAllAlternativeValueDate(false)}
                                        className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 font-semibold border border-gray-200 rounded-xl text-[11px] transition-colors shadow-2xs cursor-pointer"
                                        title="Lock all selected banks to fixed value date"
                                    >
                                        Disallow for All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={applyValueDateToAllBanks}
                                        className="px-3 py-1.5 bg-white hover:bg-gray-100 text-blue-700 font-semibold border border-blue-200 rounded-xl text-[11px] transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                                        title="Apply master value date to all selected banks"
                                    >
                                        <Copy size={12} /> Sync Master Date
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Mind-Reader Smart Recommendation Banner (Appears only when user hasn't selected counterparties yet) */}
                        {recommendations.length > 0 && selectedBanks.length === 0 && (
                            <div className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/90 to-sky-50/90 border border-blue-200/90 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-fade-in">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                                        <Sparkles size={17} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-extrabold text-blue-950 uppercase tracking-wide">
                                                Smart Counterparty Suggestions
                                            </span>
                                            <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                                                {formData.type === 'FX_SPOT' ? `${formData.buyCurrency}/${formData.sellCurrency}` : 'T-Bills'}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-blue-800/80 mt-0.5 font-medium">
                                            Historical leaders: {recommendations.map(r => r.bank_name).join(', ')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleApplySmartSelection}
                                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                                >
                                    <Sparkles size={13} /> Auto-Select Top {recommendations.length}
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-3 sm:gap-4 flex-1">
                            {banks.map(bank => {
                                const isSelected = selectedBanks.find(b => b.id === bank.bank_id);
                                const rec = recommendations.find(r => r.bank_id === bank.bank_id);
                                return (
                                    <div
                                        key={bank.id}
                                        className={`p-3.5 sm:p-5 rounded-2xl border transition-all h-fit ${isSelected ? 'border-black bg-gray-50 shadow-sm' : 'border-gray-100 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 mr-1">
                                                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                    <Landmark size={17} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <h4 className="font-semibold text-xs sm:text-base text-gray-900 truncate leading-tight">{bank.bank?.name || `Bank ${bank.bank_id}`}</h4>
                                                        {bank.contacts?.some(c => c.role === 'APPROVER') && (
                                                            <span className="text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider" title="Counterparty has internal bank approver contact configured">
                                                                Approver Layer
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] sm:text-xs text-gray-400 truncate mt-0.5">{bank.emails}</p>
                                                    {rec?.highlight && (
                                                        <div className="mt-1">
                                                            <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-blue-700 bg-blue-50/90 border border-blue-200/90 px-2 py-0.5 rounded-full">
                                                                <Sparkles size={10} className="text-blue-500 shrink-0" />
                                                                {rec.highlight}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleBankToggle(bank)}
                                                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 ${isSelected ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-black text-white hover:bg-gray-800'
                                                    }`}
                                            >
                                                {isSelected ? 'Remove' : 'Select'}
                                            </button>
                                        </div>

                                         {isSelected && (() => {
                                            const isMultiPairMode = formData.type === 'FX_SPOT' && pairs.length > 1;
                                            const curTabId = bankActivePairTab[bank.bank_id] || pairs[0]?.id;
                                            const curPair = pairs.find(p => p.id === curTabId) || pairs[0] || {};
                                            const activeCfg = (isSelected.customPairTariffs && isSelected.pairConfigs && isSelected.pairConfigs[curTabId])
                                                ? isSelected.pairConfigs[curTabId]
                                                : {
                                                    costMin: isSelected.costMin ?? 0,
                                                    costPercent: isSelected.costPercent ?? 0,
                                                    costMax: isSelected.costMax ?? 0,
                                                    costFlat: isSelected.costFlat ?? 0,
                                                    quotationBase: isSelected.quotationBase || formData.quotationBase || 'Execution',
                                                    isDocumentVisible: isSelected.isDocumentVisible !== false,
                                                    valueDate: isSelected.valueDate || '',
                                                    allowAlternativeValueDate: isSelected.allowAlternativeValueDate ?? false
                                                };

                                            return (
                                                <div className="animate-fade-in-up space-y-3 pt-3 mt-2 border-t border-gray-200">
                                                    {/* Multi-Pair Scope Switcher */}
                                                    {isMultiPairMode && (
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100/90 border border-slate-200 text-xs">
                                                                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                                                    <SlidersHorizontal size={12} className="text-blue-600" />
                                                                    Tariffs Scope:
                                                                </span>
                                                                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleBankPairCustomization(bank.bank_id, false)}
                                                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                                                            !isSelected.customPairTariffs ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                                                                        }`}
                                                                    >
                                                                        Same for All
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleBankPairCustomization(bank.bank_id, true)}
                                                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                                                            isSelected.customPairTariffs ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                                                                        }`}
                                                                    >
                                                                        Customize per Pair
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Bank Pair Tabs (when custom tariffs per pair enabled) */}
                                                            {isSelected.customPairTariffs && (
                                                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                                                                    {pairs.map((p, pIdx) => {
                                                                        const isTabActive = curTabId === p.id;
                                                                        return (
                                                                            <button
                                                                                key={p.id}
                                                                                type="button"
                                                                                onClick={() => setBankActivePairTab(prev => ({ ...prev, [bank.bank_id]: p.id }))}
                                                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border shrink-0 flex items-center gap-1 ${
                                                                                    isTabActive 
                                                                                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs' 
                                                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                                                                }`}
                                                                            >
                                                                                <span>{p.buyCurrency}/{p.sellCurrency}</span>
                                                                                <span className={`text-[8px] px-1 py-0.2 rounded font-semibold ${isTabActive ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-500'}`}>
                                                                                    P{pIdx + 1}
                                                                                </span>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}

                                                            {isSelected.customPairTariffs && (
                                                                <div className="text-[10px] font-semibold text-blue-700 bg-blue-50/70 border border-blue-200/60 px-2 py-1 rounded-lg">
                                                                    Configuring tariffs specifically for <span className="font-bold">{curPair.buyCurrency}/{curPair.sellCurrency}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                                                        <div>
                                                            <label className="block text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase mb-1">Min Cost</label>
                                                            <input
                                                                type="number"
                                                                className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-black font-semibold text-gray-900"
                                                                value={activeCfg.costMin}
                                                                onChange={e => {
                                                                    const val = parseFloat(e.target.value) || 0;
                                                                    if (isSelected.customPairTariffs) {
                                                                        updateBankPairConfig(bank.bank_id, curTabId, 'costMin', val);
                                                                    } else {
                                                                        updateBankCost(bank.bank_id, 'costMin', val);
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase mb-1">Cost %</label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-black font-semibold text-gray-900"
                                                                value={activeCfg.costPercent}
                                                                onChange={e => {
                                                                    const val = parseFloat(e.target.value) || 0;
                                                                    if (isSelected.customPairTariffs) {
                                                                        updateBankPairConfig(bank.bank_id, curTabId, 'costPercent', val);
                                                                    } else {
                                                                        updateBankCost(bank.bank_id, 'costPercent', val);
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase mb-1">Max Cost</label>
                                                            <input
                                                                type="number"
                                                                className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-black font-semibold text-gray-900"
                                                                value={activeCfg.costMax}
                                                                onChange={e => {
                                                                    const val = parseFloat(e.target.value) || 0;
                                                                    if (isSelected.customPairTariffs) {
                                                                        updateBankPairConfig(bank.bank_id, curTabId, 'costMax', val);
                                                                    } else {
                                                                        updateBankCost(bank.bank_id, 'costMax', val);
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase mb-1">Flat Fee</label>
                                                            <input
                                                                type="number"
                                                                className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-black font-semibold text-gray-900"
                                                                value={activeCfg.costFlat}
                                                                onChange={e => {
                                                                    const val = parseFloat(e.target.value) || 0;
                                                                    if (isSelected.customPairTariffs) {
                                                                        updateBankPairConfig(bank.bank_id, curTabId, 'costFlat', val);
                                                                    } else {
                                                                        updateBankCost(bank.bank_id, 'costFlat', val);
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Base Type:</label>
                                                            <select
                                                                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-black font-semibold text-gray-900"
                                                                value={activeCfg.quotationBase || formData.quotationBase || 'Execution'}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    if (isSelected.customPairTariffs) {
                                                                        updateBankPairConfig(bank.bank_id, curTabId, 'quotationBase', val);
                                                                    } else {
                                                                        updateBankCost(bank.bank_id, 'quotationBase', val);
                                                                    }
                                                                }}
                                                            >
                                                                <option value="Execution">Execution</option>
                                                                <option value="Indicative">Indicative</option>
                                                            </select>
                                                        </div>

                                                        <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-600 font-medium select-none">
                                                            <input
                                                                type="checkbox"
                                                                className="rounded border-gray-300 text-black focus:ring-black"
                                                                checked={activeCfg.isDocumentVisible !== false}
                                                                onChange={e => {
                                                                    const val = e.target.checked;
                                                                    if (isSelected.customPairTariffs) {
                                                                        updateBankPairConfig(bank.bank_id, curTabId, 'isDocumentVisible', val);
                                                                    } else {
                                                                        updateBankCost(bank.bank_id, 'isDocumentVisible', val);
                                                                    }
                                                                }}
                                                            />
                                                            Document Visible
                                                        </label>
                                                    </div>

                                                    {formData.type === 'FX_SPOT' && (
                                                        <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                                                            <div className="flex items-center gap-1.5">
                                                                <label className="text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">
                                                                    Value Date{isSelected.customPairTariffs ? ` (${curPair.buyCurrency}/${curPair.sellCurrency})` : ''}:
                                                                </label>
                                                                <input
                                                                    type="date"
                                                                    min={windowStartDate || todayStr}
                                                                    className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-black font-semibold text-gray-900"
                                                                    value={activeCfg.valueDate || ''}
                                                                    onChange={e => {
                                                                        const val = e.target.value;
                                                                        if (val && windowStartDate && val < windowStartDate) {
                                                                            toast.warn(`Value Date for ${bank.bank?.name || 'bank'} cannot be earlier than quotation window date (${formatDate(windowStartDate)}). Setting to ${formatDate(windowStartDate)}.`);
                                                                            if (isSelected.customPairTariffs) {
                                                                                updateBankPairConfig(bank.bank_id, curTabId, 'valueDate', windowStartDate);
                                                                            } else {
                                                                                updateBankCost(bank.bank_id, 'valueDate', windowStartDate);
                                                                            }
                                                                        } else {
                                                                            if (isSelected.customPairTariffs) {
                                                                                updateBankPairConfig(bank.bank_id, curTabId, 'valueDate', val);
                                                                            } else {
                                                                                updateBankCost(bank.bank_id, 'valueDate', val);
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-700 font-medium select-none bg-white border border-gray-200 hover:border-blue-300 px-2 py-1 rounded-lg transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                                                    checked={activeCfg.allowAlternativeValueDate ?? false}
                                                                    onChange={e => {
                                                                        const val = e.target.checked;
                                                                        if (isSelected.customPairTariffs) {
                                                                            updateBankPairConfig(bank.bank_id, curTabId, 'allowAlternativeValueDate', val);
                                                                        } else {
                                                                            updateBankCost(bank.bank_id, 'allowAlternativeValueDate', val);
                                                                        }
                                                                    }}
                                                                />
                                                                <span className={activeCfg.allowAlternativeValueDate ? 'text-blue-700 font-semibold' : 'text-gray-600'}>
                                                                    Allow Alt Date
                                                                </span>
                                                            </label>

                                                            {activeCfg.valueDate && windowStartDate && activeCfg.valueDate < windowStartDate && (
                                                                <div className="w-full text-[10px] font-semibold text-rose-600 flex items-center gap-1 mt-1">
                                                                    <AlertCircle size={11} /> Value Date ({formatDate(activeCfg.valueDate)}) cannot precede Offer Window ({formatDate(windowStartDate)})
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                );
                            })}
                            {banks.length === 0 && (
                                <div className="col-span-full py-12 text-center text-gray-400 italic">
                                    No quotation banks configured for this entity.
                                </div>
                            )}
                        </div>

                        {hasDateDiscrepancy && (
                            <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
                                <AlertCircle size={18} className="text-rose-600 shrink-0" />
                                <div>
                                    <strong className="block font-bold">Timing / Settlement Conflict</strong>
                                    <span>
                                        {hasInvalidWindowDate
                                            ? `Quotation window (${formatDate(windowStartDate)}) cannot be scheduled after Value Date (${formatDate(targetValueDate)}). Quotations must take place on or before settlement.`
                                            : `One or more counterparties has a Value Date earlier than the quotation Offer Window (${formatDate(windowStartDate)}). A transaction cannot settle before the quotation bidding window occurs.`}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Mandatory Legal & Execution Acknowledgment Checkbox (for Execution RFQs) */}
                        {hasExecutionBanks && (
                            <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-amber-50/90 border-2 border-amber-300 text-xs text-amber-950 space-y-2 shadow-sm animate-fade-in-up">
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        id="legalExecutionAcknowledgment"
                                        checked={legalAcknowledged}
                                        onChange={e => setLegalAcknowledged(e.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-amber-400 text-amber-700 focus:ring-amber-500 cursor-pointer shrink-0"
                                    />
                                    <label htmlFor="legalExecutionAcknowledgment" className="cursor-pointer font-medium leading-relaxed select-none">
                                        <span className="block text-amber-950 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                            <ShieldAlert size={15} className="text-amber-700" />
                                            Mandatory Counterparty Liability & Execution Acknowledgment <span className="text-rose-600">*</span>
                                        </span>
                                        I confirm and authorize this Firm Execution RFQ on behalf of <strong className="text-gray-900 underline font-semibold">{selectedEntityName}</strong>. I acknowledge that selecting invited bank counterparties is solely our responsibility and that the winning quote automatically awarded at window closure constitutes a direct, legally enforceable settlement obligation between our legal entity and the winning bank. I acknowledge that Grow Treasury operates solely as an independent communications and workflow venue (&ldquo;AS IS&rdquo;) and bears no transaction, credit, execution, or settlement liability.
                                    </label>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center gap-3">
                            <button
                                type="button"
                                onClick={handleReset}
                                title="Reset entire form to initial blank state"
                                className="w-full sm:w-auto px-6 py-3.5 sm:py-5 rounded-2xl sm:rounded-3xl font-semibold text-sm sm:text-base text-gray-700 bg-gray-100 hover:bg-gray-200 hover:text-gray-900 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer border border-gray-200"
                            >
                                <RotateCcw size={18} />
                                Reset
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || selectedBanks.length === 0 || hasDateDiscrepancy || (hasExecutionBanks && !legalAcknowledged)}
                                className={`w-full flex-1 py-3.5 sm:py-5 rounded-2xl sm:rounded-3xl font-semibold text-sm sm:text-lg flex items-center justify-center gap-2 sm:gap-3 transition-all shadow-xl disabled:opacity-30 disabled:cursor-not-allowed shrink-0 cursor-pointer ${
                                    revisionRfqId
                                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20'
                                        : retradeRfqId
                                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                                        : 'bg-black hover:bg-gray-800 text-white shadow-black/10'
                                }`}
                            >
                                {revisionRfqId ? <Undo2 size={18} /> : retradeRfqId ? <RefreshCw size={18} /> : <Send size={18} />}
                                {isSubmitting
                                    ? (revisionRfqId ? 'Resubmitting for Approval...' : retradeRfqId ? 'Launching Re-Trade...' : 'Processing...')
                                    : (revisionRfqId ? 'Resubmit Quotation for Approval' : retradeRfqId ? 'Launch Re-Trade Quotation' : 'Submit Request for Quotation')}
                            </button>
                        </div>
                    </section>
                </div>
            </form>
        </div>
    );
}
