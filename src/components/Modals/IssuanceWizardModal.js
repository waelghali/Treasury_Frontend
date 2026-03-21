import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Building, FileText, FileSpreadsheet, Wifi, Check, Zap, Loader2, Send, AlertCircle, Lock, AlertTriangle, TrendingUp, Search, DollarSign } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiRequest } from '../../services/apiService';

/**
 * 3-step Issuance Wizard:
 * Step 1: Select Bank / Facility
 * Step 2: Choose Method (Company Letter, Bank Form, API)
 * Step 3: Execute & Confirm
 */
export default function IssuanceWizardModal({ request, matchedFacilities = [], onClose, onIssued }) {
    const [step, setStep] = useState(1);
    const [selectedFacility, setSelectedFacility] = useState(null);
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [methods, setMethods] = useState([]);
    const [loadingMethods, setLoadingMethods] = useState(false);
    const [additionalText, setAdditionalText] = useState('');
    const [issuedRefNumber, setIssuedRefNumber] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [allBanks, setAllBanks] = useState([]);
    const [otherBankId, setOtherBankId] = useState('');
    const [bankSearch, setBankSearch] = useState('');
    const [showBankDropdown, setShowBankDropdown] = useState(false);

    // Cost / Margin recording
    const [commissionRate, setCommissionRate] = useState('');
    const [minCommission, setMinCommission] = useState('');
    const [flatFee, setFlatFee] = useState('');
    const [cashMarginPct, setCashMarginPct] = useState('');

    // Missing fields state (for two-phase bank form fill)
    const [missingFields, setMissingFields] = useState([]);
    const [userFieldValues, setUserFieldValues] = useState({});
    const [showMissingFields, setShowMissingFields] = useState(false);
    const [formFillInfo, setFormFillInfo] = useState(null); // Stores form template info from Phase 1
    const [bankFormCompleted, setBankFormCompleted] = useState(false); // Tracks if bank form was already filled
    const [gapAnalysis, setGapAnalysis] = useState(null); // 3.2: Gap analysis results
    const [fxDrift, setFxDrift] = useState(null); // C5: FX rate drift warning
    const [loadingDrift, setLoadingDrift] = useState(false);

    // Load all banks for "Other Bank" option
    useEffect(() => {
        apiRequest('/end-user/banks/', 'GET')
            .then(data => setAllBanks(data || []))
            .catch(() => setAllBanks([]));
    }, []);

    // When facility/bank selection changes, load methods
    useEffect(() => {
        if (!selectedFacility) return;
        const bankId = selectedFacility.type === 'facility'
            ? selectedFacility.data.bank_id || selectedFacility.data.bank?.id
            : selectedFacility.bank_id;
        if (!bankId) return;

        setLoadingMethods(true);
        apiRequest(`/issuance/banks/${bankId}/issuance-options`, 'GET')
            .then(data => setMethods(data || []))
            .catch(() => {
                // Fallback: always show company letter
                setMethods([{
                    id: 'COMPANY_LETTER', strategy_code: 'COMPANY_LETTER',
                    display_name: 'Company Letter', description: 'Generate a signed company letter',
                    available: true
                }]);
            })
            .finally(() => setLoadingMethods(false));
    }, [selectedFacility]);

    // C5: Check FX drift when entering Step 3 for reserved requests
    useEffect(() => {
        if (step !== 3 || request.status !== 'FACILITY_RESERVED') return;
        setLoadingDrift(true);
        apiRequest(`/issuance/requests/${request.id}/pre-execution-check`, 'GET')
            .then(data => {
                if (data?.fx_drift?.exceeds_threshold) {
                    setFxDrift(data.fx_drift);
                } else {
                    setFxDrift(null);
                }
            })
            .catch(() => setFxDrift(null))
            .finally(() => setLoadingDrift(false));
    }, [step, request.id, request.status]);

    const getBankId = () => {
        if (!selectedFacility) return null;
        return selectedFacility.type === 'facility'
            ? (selectedFacility.data.bank_id || selectedFacility.data.bank?.id)
            : selectedFacility.bank_id;
    };

    const getBankName = () => {
        if (!selectedFacility) return '';
        return selectedFacility.type === 'facility'
            ? (selectedFacility.data.bank?.name || 'Unknown')
            : selectedFacility.bank_name;
    };

    const getSubLimitId = () => {
        if (!selectedFacility || selectedFacility.type !== 'facility') return null;
        // Return sub_limit_id if available, otherwise the facility_id from matching
        return selectedFacility.data.sub_limit_id || selectedFacility.data.id || null;
    };

    // Phase 2: Fill PDF with user-provided values
    const handleFillAndDownload = async (skipEmpty = false) => {
        setIsExecuting(true);
        try {
            const bankId = getBankId();
            const values = skipEmpty ? {} : { ...userFieldValues };

            const blob = await apiRequest(
                `/issuance/bank-forms/auto-fill/${request.id}?bank_id=${bankId}`,
                'POST', values, 'application/json', 'blob'
            );
            const blobUrl = window.URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
            // Show form-type-specific instruction
            const fType = formFillInfo?.form_type || '';
            if (fType === 'PHYSICAL_OVERLAY') {
                toast.info('📋 Place the pre-printed bank form in your printer, then print this overlay page on top of it.', { autoClose: 8000 });
            } else {
                toast.success('Bank form filled and opened in new tab.');
            }

            // Auto-open special wording attachment if applicable
            const swDocId = formFillInfo?.special_wording_doc_id;
            if (swDocId && request?.id) {
                try {
                    const docRes = await apiRequest(`/issuance/requests/${request.id}/documents/${swDocId}/download`);
                    if (docRes?.download_url) {
                        window.open(docRes.download_url, '_blank');
                        toast.info('📄 Special wording document opened in a new tab.', { autoClose: 5000 });
                    }
                } catch (swErr) {
                    console.warn('Could not auto-open special wording:', swErr);
                }
            }

            setShowMissingFields(false);
            setMissingFields([]);
            setBankFormCompleted(true); // Mark bank form as done so Confirm & Issue proceeds

            // 3.2: Run gap analysis after form fill
            try {
                const templateId = formFillInfo?.form_template_id;
                if (templateId && request?.id) {
                    const gaps = await apiRequest(
                        `/issuance/bank-forms/${templateId}/gap-analysis/${request.id}`, 'POST'
                    );
                    if (gaps?.has_gaps) {
                        setGapAnalysis(gaps);
                    }
                }
            } catch (gapErr) {
                console.warn('Gap analysis check skipped:', gapErr);
            }
        } catch (err) {
            toast.error(err.message || 'Failed to fill bank form.');
        } finally {
            setIsExecuting(false);
        }
    };

    // Step 3: Execute
    const handleExecute = async () => {
        if (!selectedMethod) return;
        setIsExecuting(true);
        try {
            const methodCode = selectedMethod.strategy_code;

            // If Company Letter, generate it first
            if (methodCode === 'COMPANY_LETTER') {
                const params = new URLSearchParams();
                if (additionalText) params.set('additional_text', additionalText);
                const url = `/issuance/requests/${request.id}/generate-letter${params.toString() ? '?' + params.toString() : ''}`;
                const blob = await apiRequest(url, 'GET', null, 'application/json', 'blob');
                const blobUrl = window.URL.createObjectURL(blob);
                window.open(blobUrl, '_blank');
            }

            // If Bank Form, auto-resolve the right template and fill it (skip if already done)
            if (methodCode === 'BANK_FORM' && !bankFormCompleted) {
                try {
                    const bankId = getBankId();
                    // Phase 1: Check for missing fields (send null body)
                    const response = await apiRequest(
                        `/issuance/bank-forms/auto-fill/${request.id}?bank_id=${bankId}`,
                        'POST', null
                    );

                    // If response is JSON with missing_fields → show inline form
                    if (response && response.status === 'missing_fields') {
                        const fields = response.missing_fields || [];
                        setMissingFields(fields);
                        setFormFillInfo(response);
                        // Pre-fill from saved values
                        const prefilledValues = {};
                        fields.forEach(f => {
                            prefilledValues[f.pdf_field_name] = f.saved_value || '';
                        });
                        setUserFieldValues(prefilledValues);
                        setShowMissingFields(true);
                        setIsExecuting(false);
                        return; // Don't proceed to issue — wait for user input
                    }

                    // If response is a blob (PDF) → open directly
                    if (response instanceof Blob) {
                        const blobUrl = window.URL.createObjectURL(response);
                        window.open(blobUrl, '_blank');
                        toast.info('Bank form filled and opened in new tab.');
                        setBankFormCompleted(true);
                    }
                } catch (formErr) {
                    // Check if the error response contains missing_fields JSON
                    toast.warning(formErr.message || 'Could not auto-fill bank form. The LG will still be issued.');
                }
            }

            // Always create the IssuedLGRecord
            const body = {
                sub_limit_id: getSubLimitId(),
                bank_id: getBankId(),
                issued_ref_number: issuedRefNumber || `LG-${request.serial_number}`,
                expiry_date: request.requested_expiry_date || null,
                issuance_method: methodCode,
            };

            // Add cost/margin if provided
            if (commissionRate || cashMarginPct || flatFee || minCommission) {
                body.manual_pricing = {
                    commission_rate: commissionRate ? parseFloat(commissionRate) : null,
                    min_commission: minCommission ? parseFloat(minCommission) : null,
                    flat_fee: flatFee ? parseFloat(flatFee) : null,
                    cash_margin_pct: cashMarginPct ? parseFloat(cashMarginPct) : null,
                };
            }

            const result = await apiRequest(`/issuance/requests/${request.id}/issue`, 'POST', body);
            toast.success(`LG issued successfully! Ref: ${result.lg_ref_number}`);

            if (typeof onIssued === 'function') onIssued(result);
            onClose();
        } catch (err) {
            toast.error(err.message || 'Failed to execute issuance.');
        } finally {
            setIsExecuting(false);
        }
    };

    const methodIcons = {
        COMPANY_LETTER: <FileText className="w-6 h-6" />,
        BANK_FORM: <FileSpreadsheet className="w-6 h-6" />,
        BANK_API: <Wifi className="w-6 h-6" />,
    };

    const stepTitles = ['Select Bank', 'Choose Method', 'Confirm & Issue'];

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white px-6 py-4 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Zap className="w-5 h-5" /> Issue to Bank
                        </h2>
                        <p className="text-emerald-200 text-sm mt-0.5">{request.serial_number} — {request.beneficiary_name}</p>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-3 shrink-0">
                    {stepTitles.map((title, i) => (
                        <React.Fragment key={i}>
                            <div className={`flex items-center gap-2 text-sm font-medium ${step > i + 1 ? 'text-emerald-600' : step === i + 1 ? 'text-slate-900' : 'text-slate-400'}`}>
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step > i + 1 ? 'bg-emerald-600 text-white' : step === i + 1 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                    {step > i + 1 ? <Check className="w-3.5 h-3.5" /> : i + 1}
                                </span>
                                <span className="hidden sm:inline">{title}</span>
                            </div>
                            {i < 2 && <ChevronRight className="w-4 h-4 text-slate-300" />}
                        </React.Fragment>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* STEP 1: Select Bank/Facility */}
                    {step === 1 && (
                        <div className="space-y-4 min-h-[300px]">
                            <p className="text-sm text-slate-600 mb-4">Select a facility from the matched list, or choose another bank:</p>

                            {/* Matched Facilities */}
                            {matchedFacilities.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase">Matched Facilities</h4>
                                    {matchedFacilities.map(f => {
                                        const pct = f.utilization_pct || 0;
                                        const isSelected = selectedFacility?.type === 'facility' && selectedFacility?.data?.id === f.id && selectedFacility?.data?.reference_number === f.reference_number;
                                        return (
                                            <button
                                                key={f.id + '-' + f.reference_number}
                                                onClick={() => setSelectedFacility({ type: 'facility', data: f })}
                                                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-bold text-slate-900">{f.bank?.name}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5">{f.facility_name}</p>
                                                    </div>
                                                    <div className="flex gap-1 flex-wrap justify-end">
                                                        {f.tags?.includes('BEST_OVERALL') && <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">★ Best</span>}
                                                        {f.tags?.includes('BEST_PRICE') && <span className="bg-green-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">Low Cost</span>}
                                                        {!f.isRecommended && <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">Insufficient</span>}
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex justify-between items-center">
                                                    <span className="text-xs text-slate-400">Used: {pct}%</span>
                                                    <span className={`text-sm font-bold ${f.isRecommended ? 'text-emerald-700' : 'text-red-600'}`}>
                                                        Available: {f.currency} {f.availableFormatted}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Other Bank Option */}
                            <div className="border-t pt-4 mt-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">
                                    {matchedFacilities.length > 0 ? 'Or Select Another Bank (Without Facility)' : 'Select Issuing Bank'}
                                </h4>
                                <div className={`p-4 rounded-xl border-2 transition-all ${selectedFacility?.type === 'other_bank' ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200' : 'border-dashed border-slate-300 bg-slate-50'}`}>
                                    {/* Searchable bank dropdown */}
                                    <div className="relative">
                                        <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                                            <Search className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 text-sm outline-none bg-transparent"
                                                placeholder={selectedFacility?.type === 'other_bank' ? selectedFacility.bank_name : 'Search banks...'}
                                                value={bankSearch}
                                                onChange={e => { setBankSearch(e.target.value); setShowBankDropdown(true); }}
                                                onFocus={() => setShowBankDropdown(true)}
                                            />
                                            {selectedFacility?.type === 'other_bank' && (
                                                <button onClick={() => { setOtherBankId(''); setBankSearch(''); setSelectedFacility(null); }}
                                                    className="px-2 text-slate-400 hover:text-red-500">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        {showBankDropdown && (() => {
                                            const filtered = allBanks.filter(b =>
                                                b.name.toLowerCase().includes(bankSearch.toLowerCase())
                                            );
                                            return filtered.length > 0 ? (
                                                <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                    {filtered.map(b => (
                                                        <button key={b.id}
                                                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 transition flex items-center gap-2 ${String(b.id) === otherBankId ? 'bg-emerald-50 font-bold text-emerald-700' : 'text-slate-700'}`}
                                                            onClick={() => {
                                                                setOtherBankId(String(b.id));
                                                                setBankSearch(b.name);
                                                                setShowBankDropdown(false);
                                                                setSelectedFacility({ type: 'other_bank', bank_id: b.id, bank_name: b.name });
                                                            }}
                                                        >
                                                            <Building className="w-4 h-4 text-slate-400" />
                                                            {b.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : bankSearch ? (
                                                <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm text-slate-400">
                                                    No banks found matching "{bankSearch}"
                                                </div>
                                            ) : null;
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Choose Method */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-600 mb-2">
                                Bank: <strong className="text-slate-900">{getBankName()}</strong> — Choose how to send the issuance request:
                            </p>
                            {loadingMethods ? (
                                <div className="text-center py-8 text-slate-400">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    Loading available methods...
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {methods.map(m => (
                                        <button
                                            key={m.id}
                                            disabled={!m.available}
                                            onClick={() => m.available && setSelectedMethod(m)}
                                            className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-4 ${!m.available ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-50' :
                                                selectedMethod?.id === m.id ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200' :
                                                    'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className={`p-2 rounded-lg ${selectedMethod?.id === m.id ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                                                {methodIcons[m.strategy_code] || <Send className="w-6 h-6" />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-slate-900">{m.display_name}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
                                                {!m.available && <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full mt-1 inline-block">Not Available</span>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Additional Instructions */}
                            <div className="border-t pt-4 mt-4">
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Additional Instructions (Optional)</label>
                                <textarea
                                    value={additionalText}
                                    onChange={e => setAdditionalText(e.target.value)}
                                    className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none h-20"
                                    placeholder="Enter any extra notes or instructions for the bank..."
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Confirm & Execute */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-600 mb-4">Review and confirm to issue the LG to the bank:</p>

                            {/* C5: FX Drift Warning */}
                            {loadingDrift && (
                                <div className="flex items-center gap-2 text-sm text-slate-400 p-3 bg-slate-50 rounded-xl">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Checking FX rates...
                                </div>
                            )}
                            {fxDrift?.exceeds_threshold && (
                                <div className={`border-2 rounded-xl p-4 space-y-2 ${fxDrift.drift_pct > 5 ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'}`}>
                                    <div className="flex items-start gap-3">
                                        <TrendingUp className={`w-5 h-5 shrink-0 mt-0.5 ${fxDrift.drift_pct > 5 ? 'text-red-600' : 'text-amber-600'}`} />
                                        <div>
                                            <h4 className={`font-bold text-sm ${fxDrift.drift_pct > 5 ? 'text-red-900' : 'text-amber-900'}`}>
                                                ⚠️ FX Rate Has Changed {fxDrift.drift_pct}% Since Reservation
                                            </h4>
                                            <p className={`text-xs mt-1 ${fxDrift.drift_pct > 5 ? 'text-red-700' : 'text-amber-700'}`}>
                                                The exchange rate between {fxDrift.request_currency} and {fxDrift.facility_currency} has
                                                shifted since you reserved this facility.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-xs mt-2">
                                        <div className="bg-white rounded-lg p-2 border border-slate-200">
                                            <span className="text-slate-500 block">Reserved Rate</span>
                                            <span className="font-bold text-slate-900">{fxDrift.reserved_rate}</span>
                                        </div>
                                        <div className="bg-white rounded-lg p-2 border border-slate-200">
                                            <span className="text-slate-500 block">Current Rate</span>
                                            <span className="font-bold text-slate-900">{fxDrift.current_rate}</span>
                                        </div>
                                        <div className="bg-white rounded-lg p-2 border border-slate-200">
                                            <span className="text-slate-500 block">Reserved Cost</span>
                                            <span className="font-bold text-slate-900">{fxDrift.facility_currency} {fxDrift.reserved_equivalent?.toLocaleString()}</span>
                                        </div>
                                        <div className="bg-white rounded-lg p-2 border border-slate-200">
                                            <span className="text-slate-500 block">Current Cost</span>
                                            <span className={`font-bold ${fxDrift.cost_impact > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                                {fxDrift.facility_currency} {fxDrift.current_equivalent?.toLocaleString()}
                                                <span className="text-[10px] ml-1">({fxDrift.cost_impact > 0 ? '+' : ''}{fxDrift.cost_impact?.toLocaleString()})</span>
                                            </span>
                                        </div>
                                    </div>
                                    <p className={`text-[10px] italic ${fxDrift.drift_pct > 5 ? 'text-red-600' : 'text-amber-600'}`}>
                                        You can still proceed — the reserved capacity remains locked. This is informational only.
                                    </p>
                                </div>
                            )}

                            <div className="bg-slate-50 rounded-xl p-5 space-y-3 border border-slate-200">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Bank</span>
                                    <span className="font-bold text-slate-900">{getBankName()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Method</span>
                                    <span className="font-bold text-slate-900">{selectedMethod?.display_name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Beneficiary</span>
                                    <span className="font-bold text-slate-900">{request.beneficiary_name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Amount</span>
                                    <span className="font-bold text-emerald-700">{request.currency?.iso_code || ''} {parseFloat(request.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Expiry</span>
                                    <span className="font-bold text-slate-900">{request.requested_expiry_date || 'N/A'}</span>
                                </div>
                                {selectedFacility?.type === 'facility' && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Facility</span>
                                        <span className="font-bold text-slate-900">{selectedFacility.data.facility_name}</span>
                                    </div>
                                )}
                                {additionalText && (
                                    <div className="border-t pt-2 mt-2">
                                        <span className="text-xs text-slate-500 uppercase font-bold">Additional Instructions</span>
                                        <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{additionalText}</p>
                                    </div>
                                )}
                            </div>

                            {/* Missing Fields Form (shown after Phase 1 detects empty fields) */}
                            {showMissingFields && missingFields.length > 0 && (
                                <div className="border-2 border-amber-300 bg-amber-50 rounded-xl p-5 space-y-4">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-bold text-sm text-amber-900">
                                                Some fields need your input
                                            </h4>
                                            <p className="text-xs text-amber-700 mt-0.5">
                                                {formFillInfo?.auto_filled_fields || 0} of {formFillInfo?.total_fields || 0} fields were auto-filled.
                                                Please provide the remaining information or skip to leave them blank.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                                        {missingFields.map(field => (
                                            <div key={field.pdf_field_name}>
                                                <label className="text-xs font-semibold text-slate-700 block mb-1">
                                                    {field.label}
                                                    <span className="text-slate-400 font-normal ml-1">({field.mapped_to})</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={userFieldValues[field.pdf_field_name] || ''}
                                                    onChange={e => setUserFieldValues(prev => ({
                                                        ...prev,
                                                        [field.pdf_field_name]: e.target.value
                                                    }))}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none transition-all"
                                                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-3 pt-2 border-t border-amber-200">
                                        <button
                                            onClick={() => handleFillAndDownload(false)}
                                            disabled={isExecuting}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-bold rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-all"
                                        >
                                            {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                                            Fill & Download
                                        </button>
                                        <button
                                            onClick={() => handleFillAndDownload(true)}
                                            disabled={isExecuting}
                                            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-all"
                                        >
                                            Skip Empty
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-amber-600 italic">
                                        Your entries will be saved and pre-filled next time you use this form.
                                    </p>
                                </div>
                            )}

                            {/* 3.2: Gap Analysis Warning */}
                            {gapAnalysis && gapAnalysis.has_gaps && (
                                <div className="border-2 border-orange-300 bg-orange-50 rounded-xl p-5 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-bold text-sm text-orange-900">
                                                Form Gap Detected
                                            </h4>
                                            <p className="text-xs text-orange-700 mt-0.5">
                                                {gapAnalysis.summary.empty} form field(s) are empty, and {gapAnalysis.summary.unmapped_critical} critical field(s) have data but no form field.
                                            </p>
                                        </div>
                                    </div>

                                    {gapAnalysis.unmapped_critical_fields?.length > 0 && (
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-orange-800 uppercase">Unmapped Critical Fields:</p>
                                            {gapAnalysis.unmapped_critical_fields.map(f => (
                                                <div key={f.field} className="flex justify-between text-xs bg-white rounded-lg px-3 py-1.5 border border-orange-200">
                                                    <span className="text-slate-700 font-medium">{f.field}</span>
                                                    <span className="text-slate-500 truncate max-w-[200px]">{f.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {gapAnalysis.supplementary_letter && (
                                        <div className="flex items-center gap-2 pt-2 border-t border-orange-200">
                                            <FileText className="w-4 h-4 text-orange-600" />
                                            <p className="text-xs text-orange-800">
                                                <strong>Suggestion:</strong> Generate a supplementary letter to include the {gapAnalysis.supplementary_letter.reason}
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => setGapAnalysis(null)}
                                        className="text-[10px] text-orange-600 hover:text-orange-800 font-medium"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            )}

                            {/* LG Reference Number */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">LG Reference Number (Optional)</label>
                                <input
                                    type="text"
                                    value={issuedRefNumber}
                                    onChange={e => setIssuedRefNumber(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                                    placeholder={`Auto: LG-${request.serial_number}`}
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Leave blank for auto-generated reference</p>
                            </div>

                            {/* Cost & Margin Recording */}
                            <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100 space-y-4">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-blue-600" />
                                    <h4 className="text-xs font-bold text-blue-800 uppercase">Transaction Cost & Margin (Optional)</h4>
                                </div>
                                <p className="text-[10px] text-blue-600">Record the bank's pricing terms for this LG. You can also update these later from the LG details.</p>
                                
                                {/* Commission Row */}
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Commission</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-[10px] font-semibold text-slate-600 block mb-1">Rate (%)</label>
                                            <input
                                                type="number" step="0.01" min="0" max="100"
                                                value={commissionRate}
                                                onChange={e => setCommissionRate(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                placeholder="e.g., 1.5"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-semibold text-slate-600 block mb-1">Minimum Amount</label>
                                            <input
                                                type="number" step="0.01" min="0"
                                                value={minCommission}
                                                onChange={e => setMinCommission(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                placeholder="e.g., 500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-semibold text-slate-600 block mb-1">Flat Fee</label>
                                            <input
                                                type="number" step="0.01" min="0"
                                                value={flatFee}
                                                onChange={e => setFlatFee(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                placeholder="e.g., 250"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Cash Margin Row */}
                                <div className="border-t border-blue-100 pt-3">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Cash Margin</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-[10px] font-semibold text-slate-600 block mb-1">Margin (%)</label>
                                            <input
                                                type="number" step="0.01" min="0" max="100"
                                                value={cashMarginPct}
                                                onChange={e => setCashMarginPct(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                placeholder="e.g., 10"
                                            />
                                        </div>
                                        <div className="col-span-2 flex items-end">
                                            <p className="text-[10px] text-blue-500 italic pb-2">The cash margin amount will be auto-calculated from the LG amount.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                    <button
                        onClick={() => step === 1 ? onClose() : setStep(step - 1)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        {step === 1 ? 'Cancel' : <><ChevronLeft className="w-4 h-4" /> Back</>}
                    </button>

                    {step < 3 ? (
                        <div className="flex gap-2">
                            {/* Reserve Only — Step 1, facility selected */}
                            {step === 1 && selectedFacility?.type === 'facility' && request.status === 'APPROVED_INTERNAL' && (
                                <button
                                    disabled={isExecuting}
                                    onClick={async () => {
                                        const subLimitId = getSubLimitId();
                                        if (!subLimitId) {
                                            toast.error('No sub-limit found for this facility.');
                                            return;
                                        }
                                        try {
                                            setIsExecuting(true);
                                            await apiRequest(`/issuance/requests/${request.id}/reserve?sub_limit_id=${subLimitId}`, 'POST');
                                            toast.success('Facility reserved successfully! You can issue to bank later.');
                                            if (typeof onIssued === 'function') onIssued({ reserved: true });
                                            onClose();
                                        } catch (err) {
                                            toast.error(err.message || 'Failed to reserve facility.');
                                        } finally {
                                            setIsExecuting(false);
                                        }
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-2 border-amber-300 text-amber-800 text-sm font-bold rounded-xl hover:bg-amber-100 disabled:opacity-50 transition-all"
                                >
                                    {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                    Reserve Only
                                </button>
                            )}
                            <button
                                disabled={(step === 1 && !selectedFacility) || (step === 2 && !selectedMethod)}
                                onClick={() => setStep(step + 1)}
                                className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                Next <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <button
                            disabled={isExecuting}
                            onClick={handleExecute}
                            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-lg transition-all"
                        >
                            {isExecuting ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                            ) : (
                                <><Zap className="w-4 h-4" /> Confirm & Issue</>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
