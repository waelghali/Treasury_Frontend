import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiRequest } from 'services/apiService';
import { toast } from 'react-toastify';
import {
    CheckCircle, Clock, AlertTriangle, XCircle, Send, Upload,
    FileText, Truck, MessageSquare, ShieldCheck, Loader2,
    ChevronDown, ChevronUp, Calendar, DollarSign, ArrowRight,
    Sparkles, X, Eye, Package, UserCheck, Ban, Download,
    Check, HelpCircle
} from 'lucide-react';

const STEP_ICONS = {
    ISSUED: Send,
    DELIVERY: Truck,
    BANK_REPLY: MessageSquare,
    CANCELLATION_NOTICE: Ban,
    VERIFICATION: ShieldCheck,
    HANDOVER: Package,
};

const STATUS_STYLES = {
    completed: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-500', line: 'bg-slate-200' },
    pending: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-500', line: 'bg-slate-200' },
    pending_delivery: { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-500', line: 'bg-orange-200' },
    pending_reply: { color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-500', line: 'bg-indigo-200' },
    not_generated: { color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-300', line: 'bg-slate-200' },
    future: { color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-300', line: 'bg-slate-200' },
    sla_breach: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-500', line: 'bg-red-200' },
    discrepancy: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-500', line: 'bg-amber-200' },
    rejected: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-500', line: 'bg-red-200' },
};

const DELIVERY_METHODS = [
    { value: 'HAND_DELIVERY', label: 'Hand Delivery' },
    { value: 'COURIER', label: 'Courier' },
    { value: 'EMAIL', label: 'Email / Digital' },
    { value: 'OTHER', label: 'Other' },
];

const REPLY_TYPES = [
    {
        value: 'LG_ISSUED',
        label: 'LG Issued',
        desc: 'Upload scanned LG & auto-verify',
        icon: Check,
        iconType: 'badge-green',
        hoverBorder: 'hover:border-green-500 hover:bg-green-50/30',
        activeBorder: 'border-green-500 bg-green-50/40 ring-2 ring-green-200'
    },
    {
        value: 'INQUIRY',
        label: 'Inquiry',
        desc: 'Bank needs more info/documents',
        icon: HelpCircle,
        iconType: 'orange',
        hoverBorder: 'hover:border-amber-500 hover:bg-amber-50/30',
        activeBorder: 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-200'
    },
    {
        value: 'REJECTED',
        label: 'Rejected',
        desc: 'Bank declined the request',
        icon: XCircle,
        iconType: 'red',
        hoverBorder: 'hover:border-red-500 hover:bg-red-50/30',
        activeBorder: 'border-red-500 bg-red-50/40 ring-2 ring-red-200'
    },
    {
        value: 'NO_RESPONSE',
        label: 'No Response',
        desc: 'Bank exceeded SLA',
        icon: Clock,
        iconType: 'slate',
        hoverBorder: 'hover:border-slate-400 hover:bg-slate-50/50',
        activeBorder: 'border-slate-500 bg-slate-50 ring-2 ring-slate-200'
    },
];

const today = () => new Date().toISOString().split('T')[0];

export default function PostIssuanceTracker({ lgId, onStatusChange, readOnly = false }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedStep, setExpandedStep] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [showCorrectionModal, setShowCorrectionModal] = useState(false);
    
    // Resubmit state
    const [isResubmitting, setIsResubmitting] = useState(false);
    const [resubmitNotes, setResubmitNotes] = useState('');

    // Detect user role from JWT
    const userRole = useMemo(() => {
        try {
            const token = localStorage.getItem('jwt_token');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.role;
            }
        } catch (e) { /* ignore */ }
        return null;
    }, []);
    const isApprover = userRole === 'corporate_admin' || userRole === 'checker';

    // Form states — dates default to today
    const [deliveryForm, setDeliveryForm] = useState({ delivery_method: 'HAND_DELIVERY', delivery_date: today(), delivery_notes: '' });
    const [replyForm, setReplyForm] = useState({
        bank_reply_type: '', bank_reply_date: today(), bank_reply_notes: '',
        bank_lg_number: '', bank_lg_amount: '', bank_lg_issue_date: '', bank_lg_expiry_date: '',
        bank_beneficiary_name: '', verification_notes: '', force_accept: false, force_no_number: false,
        issue_cancellation_letter: true, // Default ON for NO_RESPONSE
    });
    const [cnDeliveryForm, setCnDeliveryForm] = useState({ delivery_date: today(), delivery_method: 'HAND_DELIVERY', delivery_notes: '' });
    const [cnReplyForm, setCnReplyForm] = useState({ bank_reply_date: today(), bank_reply_notes: '' });

    // Delivery form file state
    const [deliveryProofFile, setDeliveryProofFile] = useState(null);
    const [deliveryDragActive, setDeliveryDragActive] = useState(false);
    const deliveryFileRef = useRef(null);

    // Bank Reply file state (for Rejections)
    const [bankReplyFile, setBankReplyFile] = useState(null);
    const [bankReplyDragActive, setBankReplyDragActive] = useState(false);
    const bankReplyFileRef = useRef(null);

    // Handover form state
    const [handoverForm, setHandoverForm] = useState({
        handover_date: today(), handover_notes: '',
        recipient_name: '', recipient_email: '', recipient_department: '',
        recipient_job_title: '', recipient_phone: '', recipient_employee_id: '',
        recipient_manager_email: '', recipient_second_line_manager_email: '',
    });
    const [deliverToOther, setDeliverToOther] = useState(false);
    const [handoverPreFilled, setHandoverPreFilled] = useState(false);
    const [handoverFile, setHandoverFile] = useState(null);
    const [handoverDragActive, setHandoverDragActive] = useState(false);
    const handoverFileRef = useRef(null);

    // AI extraction states
    const [aiExtracting, setAiExtracting] = useState(false);
    const [aiResult, setAiResult] = useState(null); // { extracted, comparison }
    const [isManualEntry, setIsManualEntry] = useState(false); // Track manual vs AI
    const [uploadFile, setUploadFile] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    const fetchStatus = useCallback(async () => {
        try {
            const result = await apiRequest(`/issuance/lg-records/${lgId}/post-issuance-status`, 'GET');
            setData(result);

            // Pre-fill handover form from requestor defaults
            const handoverStep = result.steps?.find(s => s.step === 'HANDOVER');
            if (handoverStep?.details?.requestor_defaults && !handoverPreFilled && handoverStep.status !== 'completed') {
                const d = handoverStep.details.requestor_defaults;
                setHandoverForm(prev => ({
                    ...prev,
                    recipient_name: d.name || '', recipient_email: d.email || '',
                    recipient_department: d.department || '', recipient_job_title: d.job_title || '',
                    recipient_phone: d.phone || '', recipient_employee_id: d.employee_id || '',
                    recipient_manager_email: d.manager_email || '',
                    recipient_second_line_manager_email: d.second_line_manager_email || '',
                }));
                setHandoverPreFilled(true);
            }

            // Auto-expand first actionable step
            const pending = result.steps?.find(s => s.status === 'pending' || s.status === 'sla_breach' || s.status === 'discrepancy');
            if (pending) setExpandedStep(pending.step);
        } catch (err) {
            toast.error('Failed to load post-issuance status');
        } finally {
            setLoading(false);
        }
    }, [lgId]);

    useEffect(() => { fetchStatus(); }, [fetchStatus]);

    // Compute date constraints from timeline data
    const dateConstraints = useMemo(() => {
        if (!data?.steps) return {};
        const issuedStep = data.steps.find(s => s.step === 'ISSUED');
        const deliveryStep = data.steps.find(s => s.step === 'DELIVERY');

        const issuanceDate = issuedStep?.date ? issuedStep.date.split('T')[0] : null;
        const deliveryDate = deliveryStep?.date || null;
        const deliverySkipped = deliveryStep?.details?.method === 'SKIPPED';

        return {
            deliveryMin: issuanceDate,
            deliveryMax: today(),
            replyMin: deliverySkipped ? issuanceDate : (deliveryDate || issuanceDate),
            replyMax: today(),
        };
    }, [data]);

    const handleAction = async (endpoint, payload) => {
        setActionLoading(true);
        try {
            let result;
            // If handover with file, use FormData
            if (endpoint === 'record-handover' && handoverFile) {
                const formData = new FormData();
                formData.append('signed_copy', handoverFile);
                formData.append('data', JSON.stringify(payload));
                result = await apiRequest(`/issuance/lg-records/${lgId}/${endpoint}`, 'POST', formData);
            } else if (endpoint === 'record-delivery') {
                const formData = new FormData();
                if (deliveryProofFile) formData.append('delivery_proof', deliveryProofFile);
                formData.append('data', JSON.stringify(payload));
                result = await apiRequest(`/issuance/lg-records/${lgId}/${endpoint}`, 'POST', formData);
            } else {
                result = await apiRequest(`/issuance/lg-records/${lgId}/${endpoint}`, 'PATCH', payload);
            }
            toast.success(result.message || 'Action completed');
            fetchStatus();
            if (onStatusChange) onStatusChange(result);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    // Handle file upload for AI extraction
    const handleFileSelect = async (file) => {
        if (!file) return;
        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff', 'image/webp'];
        if (!allowed.includes(file.type)) {
            toast.error('Please upload a PDF or image file (JPEG, PNG, TIFF, WebP)');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File too large (max 10 MB)');
            return;
        }

        setUploadFile(file);
        setAiExtracting(true);
        setAiResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const result = await apiRequest(`/issuance/lg-records/${lgId}/extract-lg-copy`, 'POST', formData);

            setAiResult(result);

            // Auto-populate form from extracted data
            setReplyForm(prev => ({
                ...prev,
                bank_lg_number: result.extracted.bank_lg_number || prev.bank_lg_number,
                bank_lg_amount: result.extracted.bank_lg_amount || prev.bank_lg_amount,
                bank_lg_issue_date: (result.extracted.bank_lg_issue_date && !result.extracted.bank_lg_issue_date.startsWith('0000')) ? result.extracted.bank_lg_issue_date.split('T')[0] : prev.bank_lg_issue_date,
                bank_lg_expiry_date: (result.extracted.bank_lg_expiry_date && !result.extracted.bank_lg_expiry_date.startsWith('0000')) ? result.extracted.bank_lg_expiry_date.split('T')[0] : prev.bank_lg_expiry_date,
                bank_beneficiary_name: result.extracted.bank_beneficiary_name || prev.bank_beneficiary_name,
            }));

            toast.success('✨ AI extracted LG details successfully!');
        } catch (err) {
            toast.error(err.message);
            setUploadFile(null);
        } finally {
            setAiExtracting(false);
        }
    };

    // Build comparison from manually entered values vs expected request values
    const buildManualComparison = (formValues) => {
        const expected = data?.expected_values;
        if (!expected) return null;

        // Normalize datetime strings to YYYY-MM-DD for comparison
        const toDateStr = (v) => v ? String(v).slice(0, 10) : null;

        // Name match: substring containment (bank may use expanded legal name)
        const nameMatch = (a, b) => {
            if (!a || !b) return true; // blank = no mismatch
            const al = a.trim().toLowerCase();
            const bl = b.trim().toLowerCase();
            return al.includes(bl) || bl.includes(al);
        };

        const fields = [];
        // Amount
        if (expected.amount) {
            const enteredAmt = formValues.bank_lg_amount ? parseFloat(formValues.bank_lg_amount) : null;
            const expectedAmt = parseFloat(expected.amount);
            const match = enteredAmt !== null ? Math.abs(enteredAmt - expectedAmt) < 0.01 : true; // blank = no mismatch
            fields.push({ field: 'Amount', requested: expected.amount, extracted: formValues.bank_lg_amount || '—', match, severity: match ? 'OK' : 'HIGH' });
        }
        // Expiry Date — normalize to YYYY-MM-DD to avoid datetime format mismatches
        if (expected.expiry_date) {
            const expNorm = toDateStr(expected.expiry_date);
            const enteredNorm = toDateStr(formValues.bank_lg_expiry_date);
            const match = !enteredNorm || enteredNorm === expNorm;
            fields.push({ field: 'Expiry Date', requested: expNorm, extracted: enteredNorm || '—', match, severity: match ? 'OK' : 'HIGH' });
        }
        // Beneficiary Name — substring containment allowed (legal name may be expanded)
        if (expected.beneficiary_name) {
            const match = !formValues.bank_beneficiary_name || nameMatch(formValues.bank_beneficiary_name, expected.beneficiary_name);
            fields.push({ field: 'Beneficiary Name', requested: expected.beneficiary_name, extracted: formValues.bank_beneficiary_name || '—', match, severity: match ? 'OK' : 'HIGH' });
        }

        return { fields, has_discrepancy: fields.some(f => !f.match) };
    };


    // Live-update comparison table when user types in manual entry mode
    useEffect(() => {
        if (isManualEntry && aiResult) {
            const comparison = buildManualComparison(replyForm);
            if (comparison) {
                setAiResult(prev => ({ ...prev, comparison }));
            }
        }
    }, [isManualEntry, replyForm.bank_lg_amount, replyForm.bank_lg_expiry_date, replyForm.bank_beneficiary_name]);

    const handleResubmitDiscrepancy = async () => {
        if (!resubmitNotes.trim()) {
            toast.error('Please provide a reason for re-submission.');
            return;
        }
        setActionLoading(true);
        try {
            await apiRequest(`/issuance/lg-records/${lgId}/resubmit-discrepancy`, 'PATCH', { notes: resubmitNotes });
            toast.success('Discrepancy re-submitted to Corporate Admin.');
            setIsResubmitting(false);
            setResubmitNotes('');
            await fetchStatus();
        } catch (err) {
            toast.error(err.message || 'Failed to re-submit discrepancy.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
    };

    // Combined handler: record bank reply as LG_ISSUED + verify in one go
    const handleLgIssuedAndVerify = async (isForceAccept = false) => {
        setActionLoading(true);
        try {
            // Step 1: Record bank reply
            const formData = new FormData();
            formData.append('bank_reply_type', 'LG_ISSUED');
            if (replyForm.bank_reply_date) formData.append('bank_reply_date', replyForm.bank_reply_date);
            if (replyForm.bank_reply_notes) formData.append('bank_reply_notes', replyForm.bank_reply_notes);
            if (replyForm.bank_lg_number) formData.append('bank_lg_number', replyForm.bank_lg_number);
            if (replyForm.bank_lg_amount) formData.append('bank_lg_amount', replyForm.bank_lg_amount);
            if (replyForm.bank_lg_issue_date) formData.append('bank_lg_issue_date', replyForm.bank_lg_issue_date);
            if (replyForm.bank_lg_expiry_date) formData.append('bank_lg_expiry_date', replyForm.bank_lg_expiry_date);
            
            await apiRequest(`/issuance/lg-records/${lgId}/record-bank-reply`, 'PATCH', formData);

            // Step 2: Verify
            const verifyPayload = {
                bank_lg_number: replyForm.bank_lg_number,
                bank_lg_amount: replyForm.bank_lg_amount,
                bank_lg_issue_date: replyForm.bank_lg_issue_date,
                bank_lg_expiry_date: replyForm.bank_lg_expiry_date,
                bank_beneficiary_name: replyForm.bank_beneficiary_name,
                verification_notes: replyForm.verification_notes,
                force_accept: isForceAccept,
                force_no_number: replyForm.force_no_number,
            };
            const result = await apiRequest(`/issuance/lg-records/${lgId}/verify`, 'PATCH', verifyPayload);

            if (result.verification_status === 'DISCREPANCY') {
                toast.warning('Discrepancies found — please review and accept or correct.');
            } else {
                toast.success('LG issued, verified & confirmed! ✅');
            }
            fetchStatus();
            if (onStatusChange) onStatusChange(result);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    // Auto-expand BANK_REPLY when there's a discrepancy requiring action
    // (Must be before early returns to comply with rules of hooks)
    const verificationStepData = data?.steps?.find(s => s.step === 'VERIFICATION');
    useEffect(() => {
        if ((verificationStepData?.status === 'discrepancy' || verificationStepData?.status === 'rejected') && !expandedStep) {
            setExpandedStep('BANK_REPLY');
        }
    }, [verificationStepData?.status]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-500 text-sm">Loading tracking status...</span>
            </div>
        );
    }

    if (!data) return null;

    const visibleSteps = data.steps.filter(s => s.step !== 'VERIFICATION');
    const verificationStep = verificationStepData;

    const TERMINAL_STATUSES = ['CANCELLED', 'EXPIRED', 'RELEASED', 'CANCELLED_BY_BANK'];
    const isTerminal = TERMINAL_STATUSES.includes(data.overall_status);

    return (
        <div className="space-y-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Post-Issuance Tracker</h3>
                    <p className="text-xs text-slate-500 mt-0.5">LG Ref: {data.lg_ref} • Status: <span className="font-semibold text-slate-700">{data.overall_status}</span></p>
                </div>
            </div>

            {isTerminal && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-xs text-red-700 font-medium">This LG is <strong>{data.overall_status}</strong> — no further actions can be performed.</span>
                </div>
            )}

            {/* Timeline */}
            <div className="relative">
                {visibleSteps.map((step, idx) => {
                    const Icon = STEP_ICONS[step.step] || FileText;
                    const style = STATUS_STYLES[step.status] || STATUS_STYLES.future;
                    const isExpanded = expandedStep === step.step;
                    const isLast = idx === visibleSteps.length - 1;
                    const isActionable = !readOnly && !isTerminal && (step.status === 'pending' || step.status === 'sla_breach' || step.status === 'discrepancy'
                        || (step.step === 'BANK_REPLY' && (verificationStep?.status === 'rejected')));

                    return (
                        <div key={step.step} className="relative flex gap-4">
                            {/* Vertical line */}
                            {!isLast && (
                                <div className={`absolute left-[19px] top-[40px] w-0.5 h-[calc(100%-24px)] ${style.line}`} />
                            )}

                            {/* Node */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${style.border} ${style.bg} z-10 ${step.status === 'pending' ? 'animate-pulse' : ''}`}>
                                {step.status === 'completed' ? (
                                    <Check className={`w-5 h-5 ${style.color}`} />
                                ) : step.status === 'sla_breach' ? (
                                    <AlertTriangle className={`w-5 h-5 ${style.color}`} />
                                ) : step.status === 'discrepancy' ? (
                                    <AlertTriangle className={`w-5 h-5 ${style.color}`} />
                                ) : (
                                    <Icon className={`w-5 h-5 ${style.color}`} />
                                )}
                            </div>

                            {/* Content */}
                            <div className={`flex-1 pb-8 ${isLast ? 'pb-0' : ''}`}>
                                <div
                                    className={`rounded-xl border p-4 transition-all shadow-sm ${
                                        isActionable
                                            ? 'border-blue-200 bg-blue-50/20'
                                            : 'border-slate-200 bg-white'
                                    } ${step.status === 'sla_breach' ? 'border-red-200 bg-white' : ''}`}
                                >
                                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedStep(isExpanded ? null : step.step)}>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-[15px] text-slate-900">{step.label}</span>
                                            {step.status === 'sla_breach' && (
                                                <span className="px-2 py-0.5 text-[10px] font-bold bg-[#fee2e2] text-[#991b1b] rounded-full uppercase tracking-wider">SLA BREACH</span>
                                            )}
                                            {step.status === 'discrepancy' && (
                                                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full uppercase tracking-wider">DISCREPANCY</span>
                                            )}
                                            {step.details?.reply_type === 'INQUIRY' && (
                                                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full uppercase tracking-wider">INQUIRY</span>
                                            )}
                                            {step.details?.reply_type === 'REJECTED' && (
                                                <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full uppercase tracking-wider">REJECTED</span>
                                            )}
                                            {step.status === 'future' && (
                                                <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 rounded-full uppercase tracking-wider">UPCOMING</span>
                                            )}
                                            {step.step === 'BANK_REPLY' && verificationStep?.status === 'completed' && (
                                                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full uppercase tracking-wider">
                                                    VERIFIED {verificationStep.details?.verification_status === 'MATCHED' ? '✓' : '(accepted)'}
                                                </span>
                                            )}
                                            {step.step === 'BANK_REPLY' && verificationStep?.status === 'discrepancy' && (
                                                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full uppercase tracking-wider animate-pulse">
                                                    {isApprover ? '⚠ APPROVAL NEEDED' : '⚠ DISCREPANCY'}
                                                </span>
                                            )}
                                            {step.step === 'BANK_REPLY' && verificationStep?.status === 'rejected' && (
                                                <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full uppercase tracking-wider animate-pulse">
                                                    ✕ REJECTED — RE-UPLOAD REQUIRED
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {step.date && (
                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> {new Date(step.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                            )}
                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 hover:text-slate-700" /> : <ChevronDown className="w-4 h-4 text-slate-400 hover:text-slate-700" />}
                                        </div>
                                    </div>

                                    {/* Expanded Content */}
                                    {isExpanded && (
                                        <div className="mt-4 border-t border-slate-100 pt-4" onClick={e => e.stopPropagation()}>
                                            {/* ===== DELIVERY ACTION ===== */}
                                            {step.step === 'DELIVERY' && step.status !== 'completed' && !readOnly && (
                                                <div className="space-y-3">
                                                    <p className="text-xs text-slate-500 mb-2">Record when the bank form was delivered to the bank.</p>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-xs font-medium text-slate-600">Delivery Date</label>
                                                            <input type="date" value={deliveryForm.delivery_date}
                                                                min={dateConstraints.deliveryMin || ''}
                                                                max={dateConstraints.deliveryMax || ''}
                                                                onChange={e => setDeliveryForm({ ...deliveryForm, delivery_date: e.target.value })}
                                                                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-medium text-slate-600">Method</label>
                                                            <select value={deliveryForm.delivery_method}
                                                                onChange={e => setDeliveryForm({ ...deliveryForm, delivery_method: e.target.value })}
                                                                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                                                                {DELIVERY_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-slate-600">Notes</label>
                                                        <textarea value={deliveryForm.delivery_notes}
                                                            onChange={e => setDeliveryForm({ ...deliveryForm, delivery_notes: e.target.value })}
                                                            placeholder="Any delivery notes..."
                                                            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" rows={2} />
                                                    </div>

                                                    {/* Delivery proof upload */}
                                                    <div>
                                                        <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                                                            Evidence of Delivery {step.details?.proof_required ? <span className="text-red-500">*</span> : '(optional)'}
                                                        </label>
                                                        {!deliveryProofFile ? (
                                                            <div
                                                                className={`mt-1 border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer
                                                                    ${deliveryDragActive ? 'border-blue-500 bg-blue-100/50 scale-[1.01]' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/30'}`}
                                                                onDragOver={e => { e.preventDefault(); setDeliveryDragActive(true); }}
                                                                onDragLeave={() => setDeliveryDragActive(false)}
                                                                onDrop={e => { e.preventDefault(); setDeliveryDragActive(false); if (e.dataTransfer.files?.[0]) setDeliveryProofFile(e.dataTransfer.files[0]); }}
                                                                onClick={() => deliveryFileRef.current?.click()}
                                                            >
                                                                <input type="file" ref={deliveryFileRef} className="hidden"
                                                                    accept=".pdf,.jpg,.jpeg,.png,.tiff,.webp"
                                                                    onChange={e => { if (e.target.files?.[0]) setDeliveryProofFile(e.target.files[0]); }} />
                                                                <Upload className="w-7 h-7 text-blue-400 mx-auto mb-2" />
                                                                <p className="text-sm font-medium text-slate-700">
                                                                    {deliveryDragActive ? 'Drop the file here...' : 'Upload proof of delivery'}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400 mt-1">PDF, JPEG, PNG, TIFF or WebP • Max 10 MB</p>
                                                            </div>
                                                        ) : (
                                                            <div className="mt-1 flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                                                                <FileText className="w-4 h-4 text-emerald-500" />
                                                                <span className="text-xs font-medium text-slate-700 flex-1 truncate">{deliveryProofFile.name}</span>
                                                                <span className="text-[10px] text-slate-400">{(deliveryProofFile.size / 1024).toFixed(0)} KB</span>
                                                                <button onClick={() => setDeliveryProofFile(null)}
                                                                    className="p-1 hover:bg-emerald-100 rounded-full">
                                                                    <X className="w-3 h-3 text-slate-400" />
                                                                </button>
                                                            </div>
                                                        )}
                                                        {step.details?.proof_required && !deliveryProofFile && (
                                                            <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                                                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                                                <span className="text-xs text-amber-700">Delivery proof document is <strong>required</strong> before recording delivery.</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <button onClick={() => handleAction('record-delivery', deliveryForm)} disabled={actionLoading || (step.details?.proof_required && !deliveryProofFile)}
                                                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                                                            Record Delivery
                                                        </button>
                                                        <button onClick={() => handleAction('record-delivery', { delivery_method: 'SKIPPED', delivery_notes: 'Delivery step skipped' })} disabled={actionLoading}
                                                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors">
                                                            Skip
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* DELIVERY completed info */}
                                            {step.step === 'DELIVERY' && step.status === 'completed' && (
                                                <div className="grid grid-cols-3 gap-3 text-sm">
                                                    <div><span className="text-slate-500">Method:</span> <span className="font-medium">{step.details?.method === 'SKIPPED' ? 'Skipped' : (step.details?.method || '—')}</span></div>
                                                    <div><span className="text-slate-500">Date:</span> <span className="font-medium">{step.date || '—'}</span></div>
                                                    {step.details?.notes && <div className="col-span-3"><span className="text-slate-500">Notes:</span> {step.details.notes}</div>}
                                                </div>
                                            )}

                                            {/* ===== BANK REPLY ACTION (with AI-powered LG Issued + Verify) ===== */}
                                            {step.step === 'BANK_REPLY' && (!step.details?.reply_type || verificationStep?.status === 'rejected') && step.status !== 'future' && !readOnly && (
                                                <div className="space-y-4">
                                                    <p className="text-xs text-slate-500">Record the bank's response to the issuance request.</p>

                                                    {/* Inquiry History — show past inquiries/corrections */}
                                                    {step.details?.inquiry_log?.length > 0 && (
                                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                                                            <span className="text-xs font-bold text-blue-700 uppercase tracking-wide flex items-center gap-1">
                                                                <MessageSquare className="w-3 h-3" /> Previous Interactions ({step.details.inquiry_log.length})
                                                            </span>
                                                            <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                                                {step.details.inquiry_log.map((entry, i) => (
                                                                    <div key={i} className="flex items-start gap-2 text-xs bg-white/60 rounded px-2.5 py-1.5">
                                                                        <span className="text-blue-500 font-semibold whitespace-nowrap">{entry.date}</span>
                                                                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[9px] font-bold">{entry.type}</span>
                                                                        <span className="text-slate-600 flex-1">{entry.notes || '—'}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Reply type selector */}
                                                    <div>
                                                        <div className="mb-2 text-xs font-semibold text-slate-600">Reply Type</div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {REPLY_TYPES.map(rt => {
                                                                const IconComp = rt.icon;
                                                                const isSelected = replyForm.bank_reply_type === rt.value;
                                                                return (
                                                                    <button
                                                                        key={rt.value}
                                                                        type="button"
                                                                        onClick={() => { setReplyForm({ ...replyForm, bank_reply_type: rt.value }); setAiResult(null); setUploadFile(null); }}
                                                                        className={`text-left p-4 rounded-xl border transition-all ${
                                                                            isSelected
                                                                                ? rt.activeBorder
                                                                                : `border-slate-200 bg-white ${rt.hoverBorder}`
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            {rt.iconType === 'badge-green' ? (
                                                                                <div className="w-5 h-5 rounded bg-green-500 text-white flex items-center justify-center shrink-0">
                                                                                    <IconComp className="w-3.5 h-3.5" />
                                                                                </div>
                                                                            ) : rt.iconType === 'orange' ? (
                                                                                <IconComp className="w-5 h-5 text-orange-500 shrink-0" />
                                                                            ) : rt.iconType === 'red' ? (
                                                                                <IconComp className="w-5 h-5 text-red-500 shrink-0" />
                                                                            ) : (
                                                                                <IconComp className="w-5 h-5 text-slate-400 shrink-0" />
                                                                            )}
                                                                            <span className="font-semibold text-sm text-slate-900">{rt.label}</span>
                                                                        </div>
                                                                        <p className="text-xs text-slate-500 pl-7">{rt.desc}</p>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Common: Reply date */}
                                                    {replyForm.bank_reply_type && (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="text-xs font-medium text-gray-600">Reply Date</label>
                                                                <input type="date" value={replyForm.bank_reply_date}
                                                                    min={dateConstraints.replyMin || ''}
                                                                    max={dateConstraints.replyMax || ''}
                                                                    onChange={e => setReplyForm({ ...replyForm, bank_reply_date: e.target.value })}
                                                                    className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500" />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* === LG ISSUED: AI-powered scan + verification === */}
                                                    {replyForm.bank_reply_type === 'LG_ISSUED' && (
                                                        <div className="space-y-4 p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                                                            <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
                                                                <Sparkles className="w-4 h-4" /> Upload LG Copy for AI Verification
                                                            </h4>

                                                            {/* File Upload Area */}
                                                            {!aiResult && !aiExtracting && (
                                                                <div
                                                                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
                                                                        ${dragActive ? 'border-emerald-500 bg-emerald-100/50 scale-[1.01]' : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/30'}`}
                                                                    onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                                                                    onDragLeave={() => setDragActive(false)}
                                                                    onDrop={e => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]); }}
                                                                    onClick={() => fileInputRef.current?.click()}
                                                                >
                                                                    <input type="file" ref={fileInputRef} className="hidden"
                                                                        accept=".pdf,.jpg,.jpeg,.png,.tiff,.webp"
                                                                        onChange={e => handleFileSelect(e.target.files?.[0])} />
                                                                    <Upload className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                                                                    <p className="text-sm font-medium text-gray-700">
                                                                        {dragActive ? 'Drop the file here...' : 'Drag & drop LG scan, or click to browse'}
                                                                    </p>
                                                                    <p className="text-[10px] text-gray-400 mt-1">PDF, JPEG, PNG, TIFF or WebP • Max 10 MB</p>
                                                                </div>
                                                            )}

                                                            {/* AI Processing Spinner */}
                                                            {aiExtracting && (
                                                                <div className="flex flex-col items-center justify-center py-8 gap-3">
                                                                    <div className="relative">
                                                                        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                                                                        <Sparkles className="w-4 h-4 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <p className="text-sm font-semibold text-gray-700">AI is analyzing your LG scan...</p>
                                                                        <p className="text-xs text-gray-400 mt-0.5">Extracting LG number, amount, dates, beneficiary</p>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* AI Extraction Results */}
                                                            {aiResult && (
                                                                <div className="space-y-4">
                                                                    {/* Badge: AI file or Manual entry */}
                                                                    {isManualEntry ? (
                                                                        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                                                            <FileText className="w-4 h-4 text-blue-500" />
                                                                            <span className="text-xs font-medium text-blue-700 flex-1">Manual Data Entry</span>
                                                                            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-600 rounded-full">
                                                                                ✏️ Manual
                                                                            </span>
                                                                            <button onClick={() => { setAiResult(null); setIsManualEntry(false); }}
                                                                                className="p-1 hover:bg-blue-100 rounded-full">
                                                                                <X className="w-3 h-3 text-blue-400" />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg">
                                                                            <FileText className="w-4 h-4 text-emerald-500" />
                                                                            <span className="text-xs font-medium text-gray-700 flex-1 truncate">{uploadFile?.name}</span>
                                                                            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-600 rounded-full flex items-center gap-1">
                                                                                <Sparkles className="w-3 h-3" /> AI Extracted
                                                                            </span>
                                                                            <button onClick={() => { setAiResult(null); setUploadFile(null); setIsManualEntry(false); }}
                                                                                className="p-1 hover:bg-gray-100 rounded-full">
                                                                                <X className="w-3 h-3 text-gray-400" />
                                                                            </button>
                                                                        </div>
                                                                    )}

                                                                    {/* Comparison Table */}
                                                                    {aiResult.comparison && (
                                                                        <div className="border rounded-lg overflow-hidden bg-white">
                                                                            <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                                                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Compliance Check</span>
                                                                                {aiResult.comparison.has_discrepancy ? (
                                                                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
                                                                                        <AlertTriangle className="w-3 h-3" /> Discrepancies Found
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-600 rounded-full flex items-center gap-1">
                                                                                        <CheckCircle className="w-3 h-3" /> All Matched
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <table className="w-full text-xs">
                                                                                <thead className="bg-gray-50/50">
                                                                                    <tr>
                                                                                        <th className="px-3 py-2 text-left text-gray-500 font-medium w-28">Field</th>
                                                                                        <th className="px-3 py-2 text-left text-gray-500 font-medium">Requested</th>
                                                                                        <th className="px-3 py-2 text-left text-gray-500 font-medium">{isManualEntry ? 'Entered' : 'AI Extracted'}</th>
                                                                                        <th className="px-3 py-2 text-center text-gray-500 font-medium w-16">Match</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-gray-100">
                                                                                    {aiResult.comparison.fields.map((f, i) => (
                                                                                        <tr key={i} className={!f.match ? 'bg-amber-50/50' : ''}>
                                                                                            <td className="px-3 py-2 font-medium text-gray-700">{f.field}</td>
                                                                                            <td className="px-3 py-2 text-gray-600">{f.requested || '—'}</td>
                                                                                            <td className={`px-3 py-2 font-medium ${!f.match ? 'text-amber-700' : 'text-gray-800'}`}>{f.extracted || '—'}</td>
                                                                                            <td className="px-3 py-2 text-center">
                                                                                                {f.match
                                                                                                    ? <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                                                                                                    : <div className="flex flex-col items-center">
                                                                                                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                                                                                                        {f.match_pct != null && <span className="text-[9px] text-amber-500 mt-0.5">{f.match_pct}%</span>}
                                                                                                    </div>
                                                                                                }
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    )}

                                                                    {/* Extracted fields (editable) */}
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        <div>
                                                                            <label className="text-xs font-medium text-gray-600">Bank LG Number *</label>
                                                                            <input type="text" value={replyForm.bank_lg_number}
                                                                                onChange={e => setReplyForm({ ...replyForm, bank_lg_number: e.target.value, force_no_number: false })}
                                                                                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30" />
                                                                            {/* D4: Force No Number override */}
                                                                            {!replyForm.bank_lg_number && (
                                                                                <label className="flex items-center gap-2 mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer">
                                                                                    <input type="checkbox" checked={replyForm.force_no_number}
                                                                                        onChange={e => setReplyForm({ ...replyForm, force_no_number: e.target.checked })}
                                                                                        className="rounded border-amber-300 text-amber-600 focus:ring-amber-500" />
                                                                                    <span className="text-[11px] text-amber-700">
                                                                                        <strong>Proceed without LG number</strong> — Number will be assigned later when physical copy is received
                                                                                    </span>
                                                                                </label>
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-xs font-medium text-gray-600">Amount</label>
                                                                            <input type="number" step="0.01" value={replyForm.bank_lg_amount}
                                                                                onChange={e => setReplyForm({ ...replyForm, bank_lg_amount: e.target.value })}
                                                                                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30" />
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-xs font-medium text-gray-600">Issue Date</label>
                                                                            <input type="date" value={replyForm.bank_lg_issue_date}
                                                                                max={today()}
                                                                                onChange={e => setReplyForm({ ...replyForm, bank_lg_issue_date: e.target.value })}
                                                                                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30" />
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-xs font-medium text-gray-600">Expiry Date</label>
                                                                            <input type="date" value={replyForm.bank_lg_expiry_date}
                                                                                onChange={e => setReplyForm({ ...replyForm, bank_lg_expiry_date: e.target.value })}
                                                                                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30" />
                                                                        </div>
                                                                        <div className="col-span-2">
                                                                            <label className="text-xs font-medium text-gray-600">Beneficiary</label>
                                                                            <input type="text" value={replyForm.bank_beneficiary_name}
                                                                                onChange={e => setReplyForm({ ...replyForm, bank_beneficiary_name: e.target.value })}
                                                                                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30" />
                                                                        </div>
                                                                    </div>

                                                                    {/* Discrepancy acceptance */}
                                                                    {aiResult.comparison?.has_discrepancy && (
                                                                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                                                                            <p className="text-xs text-amber-700 font-semibold flex items-center gap-1">
                                                                                <AlertTriangle className="w-4 h-4" /> Discrepancies detected — you can correct above or accept them
                                                                            </p>
                                                                            <textarea value={replyForm.verification_notes}
                                                                                onChange={e => setReplyForm({ ...replyForm, verification_notes: e.target.value })}
                                                                                placeholder="Explain why discrepancies are acceptable..."
                                                                                className="w-full px-3 py-2 text-sm border rounded-lg" rows={2} />
                                                                        </div>
                                                                    )}

                                                                    <div>
                                                                        <label className="text-xs font-medium text-gray-600">Notes</label>
                                                                        <textarea value={replyForm.bank_reply_notes}
                                                                            onChange={e => setReplyForm({ ...replyForm, bank_reply_notes: e.target.value })}
                                                                            placeholder="Any additional notes..."
                                                                            className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500" rows={2} />
                                                                    </div>

                                                                    <div className="flex gap-2">
                                                                        {/* No discrepancies: simple confirm */}
                                                                        {!aiResult.comparison?.has_discrepancy && (
                                                                            <button onClick={() => handleLgIssuedAndVerify(false)}
                                                                                disabled={actionLoading || (!replyForm.bank_lg_number && !replyForm.force_no_number)}
                                                                                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm">
                                                                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                                                                Confirm LG & Verify
                                                                            </button>
                                                                        )}
                                                                        {/* Discrepancies: accept, request correction letter, or re-upload */}
                                                                        {aiResult.comparison?.has_discrepancy && (
                                                                            <>
                                                                                <button onClick={() => handleLgIssuedAndVerify(isApprover)}
                                                                                    disabled={actionLoading || !replyForm.verification_notes?.trim()}
                                                                                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 disabled:opacity-50 transition-colors">
                                                                                    <AlertTriangle className="w-4 h-4" />
                                                                                    {isApprover ? "Accept with Discrepancies" : "Submit Exception for Review"}
                                                                                </button>
                                                                                <button onClick={async () => {
                                                                                    try {
                                                                                        const mismatched = aiResult.comparison.fields.filter(f => !f.match);
                                                                                        const blob = await apiRequest(`/issuance/lg-records/${lgId}/generate-correction-letter`, 'POST', { discrepancies: mismatched }, 'application/json', 'blob');
                                                                                        const url = URL.createObjectURL(blob);
                                                                                        window.open(url, '_blank');
                                                                                        toast.success('Correction letter generated!');
                                                                                    } catch (err) { toast.error(err.message); }
                                                                                }}
                                                                                    disabled={actionLoading}
                                                                                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 disabled:opacity-50 transition-colors">
                                                                                    <FileText className="w-4 h-4" />
                                                                                    Request Correction Letter
                                                                                </button>
                                                                                <button onClick={() => { setAiResult(null); setUploadFile(null); setIsManualEntry(false); }}
                                                                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                                                                                    <Upload className="w-4 h-4" />
                                                                                    Re-upload Corrected LG
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Manual fallback */}
                                                            {!aiResult && !aiExtracting && (
                                                                <p className="text-[10px] text-gray-400 text-center">
                                                                    Or <button onClick={() => {
                                                                        setIsManualEntry(true);
                                                                        const comparison = buildManualComparison(replyForm);
                                                                        setAiResult({ extracted: {}, comparison });
                                                                    }} className="text-emerald-600 underline hover:text-emerald-700">enter details manually</button>
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* INQUIRY / REJECTED / NO_RESPONSE */}
                                                    {replyForm.bank_reply_type && replyForm.bank_reply_type !== 'LG_ISSUED' && (
                                                        <div className="space-y-3">
                                                            <div>
                                                                <label className="text-xs font-medium text-gray-600">Notes</label>
                                                                <textarea value={replyForm.bank_reply_notes}
                                                                    onChange={e => setReplyForm({ ...replyForm, bank_reply_notes: e.target.value })}
                                                                    placeholder={replyForm.bank_reply_type === 'INQUIRY' ? 'What information is the bank requesting?' : 'Details...'}
                                                                    className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500" rows={2} />
                                                            </div>

                                                            {/* INQUIRY: note-only, stays open */}
                                                            {replyForm.bank_reply_type === 'INQUIRY' && (
                                                                <>
                                                                    <p className="text-[10px] text-blue-500 bg-blue-50 px-2 py-1 rounded">
                                                                        ℹ️ This will record the inquiry as a note. The step stays open for you to record the final bank reply when ready.
                                                                    </p>
                                                                    <button onClick={async () => {
                                                                        setActionLoading(true);
                                                                        try {
                                                                            const formData = new FormData();
                                                                            formData.append('bank_reply_type', 'INQUIRY');
                                                                            if (replyForm.bank_reply_date) formData.append('bank_reply_date', replyForm.bank_reply_date);
                                                                            if (replyForm.bank_reply_notes) formData.append('bank_reply_notes', replyForm.bank_reply_notes);
                                                                            const result = await apiRequest(`/issuance/lg-records/${lgId}/record-bank-reply`, 'PATCH', formData);
                                                                            toast.success(`Inquiry noted (${result.inquiry_count} total). Step stays open.`);
                                                                            setReplyForm(prev => ({ ...prev, bank_reply_type: '', bank_reply_notes: '' }));
                                                                            fetchStatus();
                                                                        } catch (err) { toast.error(err.message); }
                                                                        finally { setActionLoading(false); }
                                                                    }}
                                                                        disabled={actionLoading || !replyForm.bank_reply_notes?.trim()}
                                                                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                                                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                                                                        Note Inquiry
                                                                    </button>
                                                                </>
                                                            )}

                                                            {/* REJECTED / NO_RESPONSE: finalizes + reopens request */}
                                                            {(replyForm.bank_reply_type === 'REJECTED' || replyForm.bank_reply_type === 'NO_RESPONSE') && (
                                                                <>
                                                                    <p className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                                                        ⚠️ This will close this LG attempt and reopen the original request for reprocessing with a different bank.
                                                                    </p>

                                                                    {/* Rejection Attachment (Optional) */}
                                                                    {replyForm.bank_reply_type === 'REJECTED' && (
                                                                        <div className="mt-2 space-y-1">
                                                                            <label className="text-xs font-semibold text-gray-700">Bank Rejection Notice <span className="text-gray-400 font-normal">(opt.)</span></label>
                                                                            {!bankReplyFile ? (
                                                                                <div 
                                                                                    className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${bankReplyDragActive ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'} cursor-pointer`}
                                                                                    onDragOver={e => { e.preventDefault(); setBankReplyDragActive(true); }}
                                                                                    onDragLeave={() => setBankReplyDragActive(false)}
                                                                                    onDrop={e => { e.preventDefault(); setBankReplyDragActive(false); if (e.dataTransfer.files?.[0]) setBankReplyFile(e.dataTransfer.files[0]); }}
                                                                                    onClick={() => bankReplyFileRef.current?.click()}
                                                                                >
                                                                                    <input type="file" ref={bankReplyFileRef} className="hidden" accept=".pdf,image/*" onChange={e => { if (e.target.files?.[0]) setBankReplyFile(e.target.files[0]); }} />
                                                                                    <Upload className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                                                                                    <p className="text-xs font-medium text-gray-600">
                                                                                        {bankReplyDragActive ? 'Drop rejection letter...' : 'Upload rejection letter...'}
                                                                                    </p>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded-lg">
                                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                                        <FileText className="w-4 h-4 text-red-500 shrink-0" />
                                                                                        <span className="text-xs font-medium text-gray-700 truncate">{bankReplyFile.name}</span>
                                                                                        <span className="text-[10px] text-gray-400 shrink-0">{(bankReplyFile.size / 1024).toFixed(0)} KB</span>
                                                                                    </div>
                                                                                    <button onClick={() => setBankReplyFile(null)} className="p-1 hover:bg-red-100 rounded-full shrink-0">
                                                                                        <X className="w-3 h-3 text-red-500" />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* Cancellation Letter Suggestion — NO_RESPONSE only */}
                                                                    {replyForm.bank_reply_type === 'NO_RESPONSE' && (
                                                                        <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-2">
                                                                            <div className="flex items-start gap-2">
                                                                                <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                                                                <div>
                                                                                    <p className="text-xs font-semibold text-orange-700">Recommended: Issue Formal Cancellation Notice</p>
                                                                                    <p className="text-[10px] text-orange-600 mt-0.5">
                                                                                        To mitigate late issuance risk, we recommend sending a formal cancellation letter to the bank
                                                                                        requesting them to cancel and avoid issuing the LG.
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={replyForm.issue_cancellation_letter}
                                                                                    onChange={e => setReplyForm(p => ({ ...p, issue_cancellation_letter: e.target.checked }))}
                                                                                    className="w-4 h-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                                                                                />
                                                                                <span className="text-xs font-medium text-orange-700">Generate cancellation notice to bank</span>
                                                                            </label>
                                                                        </div>
                                                                    )}

                                                                    <button onClick={async () => {
                                                                        setActionLoading(true);
                                                                        try {
                                                                            const formData = new FormData();
                                                                            formData.append('bank_reply_type', replyForm.bank_reply_type);
                                                                            if (replyForm.bank_reply_date) formData.append('bank_reply_date', replyForm.bank_reply_date);
                                                                            if (replyForm.bank_reply_notes) formData.append('bank_reply_notes', replyForm.bank_reply_notes);
                                                                            if (replyForm.bank_lg_number) formData.append('bank_lg_number', replyForm.bank_lg_number);
                                                                            if (replyForm.bank_lg_amount) formData.append('bank_lg_amount', replyForm.bank_lg_amount);
                                                                            if (replyForm.bank_lg_issue_date) formData.append('bank_lg_issue_date', replyForm.bank_lg_issue_date);
                                                                            if (replyForm.bank_lg_expiry_date) formData.append('bank_lg_expiry_date', replyForm.bank_lg_expiry_date);
                                                                            if (replyForm.issue_cancellation_letter !== undefined) formData.append('issue_cancellation_letter', replyForm.issue_cancellation_letter);
                                                                            
                                                                            if (bankReplyFile && replyForm.bank_reply_type === 'REJECTED') {
                                                                                formData.append('bank_reply_file', bankReplyFile);
                                                                            }
                                                                            
                                                                            const result = await apiRequest(`/issuance/lg-records/${lgId}/record-bank-reply`, 'PATCH', formData);
                                                                            let msg = result.request_reopened
                                                                                ? `Bank reply recorded. The original request has been reopened for reprocessing.`
                                                                                : `Bank reply recorded: ${result.bank_reply_type}`;
                                                                            if (result.cancellation_letter_generated) msg += ' Cancellation notice has been generated.';
                                                                            // Auto-open the cancellation notice PDF in a new tab
                                                                            if (result.cancellation_notice_download_url) {
                                                                                try {
                                                                                    // Strip /api/v1 prefix since apiRequest adds it automatically
                                                                                    const path = result.cancellation_notice_download_url.replace('/api/v1', '');
                                                                                    const docRes = await apiRequest(path, 'GET');
                                                                                    if (docRes && docRes.download_url) {
                                                                                        window.open(docRes.download_url, '_blank');
                                                                                    }
                                                                                } catch (e) {
                                                                                    console.error('Failed to auto-open cancellation notice:', e);
                                                                                }
                                                                            }
                                                                            fetchStatus();
                                                                            if (onStatusChange) onStatusChange(result);
                                                                        } catch (err) { toast.error(err.message); }
                                                                        finally { setActionLoading(false); }
                                                                    }}
                                                                        disabled={actionLoading}
                                                                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-colors ${replyForm.bank_reply_type === 'REJECTED' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
                                                                            }`}>
                                                                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                                                                        {replyForm.bank_reply_type === 'REJECTED' ? 'Record Rejection & Reopen Request' : 'Record No Response & Reopen Request'}
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* BANK REPLY completed info */}
                                            {step.step === 'BANK_REPLY' && step.details?.reply_type && step.status === 'completed' && verificationStep?.status !== 'rejected' && (
                                                <div className="space-y-2 text-sm">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div><span className="text-gray-500">Reply Type:</span> <span className="font-semibold">{step.details.reply_type}</span></div>
                                                        <div><span className="text-gray-500">Date:</span> <span className="font-medium">{step.date || '—'}</span></div>
                                                        {step.details.bank_lg_number && <div><span className="text-gray-500">LG Number:</span> <span className="font-semibold text-emerald-600">{step.details.bank_lg_number}</span></div>}
                                                        {step.details.bank_lg_amount && (
                                                            <div className="flex items-center gap-1">
                                                                <DollarSign className="w-3 h-3 text-gray-400" />
                                                                <span className="text-gray-500">Amount:</span> <span className="font-medium">{step.details.bank_lg_amount}</span>
                                                            </div>
                                                        )}
                                                        {step.details.bank_lg_expiry_date && (
                                                            <div><span className="text-gray-500">Expiry:</span> <span className="font-medium">{step.details.bank_lg_expiry_date}</span></div>
                                                        )}
                                                    </div>
                                                    {step.details.notes && <div><span className="text-gray-500">Notes:</span> {step.details.notes}</div>}

                                                    {/* Verification result inline */}
                                                    {verificationStep && verificationStep.status === 'completed' && (
                                                        <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                                            <div className="flex items-center gap-2">
                                                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                                                <span className="text-xs font-bold text-emerald-700">
                                                                    Verification: {verificationStep.details?.verification_status}
                                                                </span>
                                                                <span className="text-xs text-gray-400">
                                                                    {verificationStep.date ? `on ${new Date(verificationStep.date).toLocaleDateString('en-GB')}` : ''}
                                                                </span>
                                                            </div>
                                                            {verificationStep.details?.notes && (
                                                                <p className="text-xs text-gray-500 mt-1">{verificationStep.details.notes}</p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Discrepancy — role-gated actions */}
                                                    {verificationStep && verificationStep.status === 'discrepancy' && (
                                                        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                                                <span className="text-xs font-bold text-amber-700">Discrepancies Found</span>
                                                            </div>
                                                            {/* Parsed discrepancy comparison table */}
                                                            {(() => {
                                                                let fields = null;
                                                                try {
                                                                    let raw = verificationStep.details?.notes || '';
                                                                    const arrMatch = raw.match(/^\s*\[[\s\S]*?\]\s*/);
                                                                    if (arrMatch) raw = arrMatch[0];
                                                                    const cleaned = raw.replace(/'/g, '"').replace(/\bNone\b/g, 'null').replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false');
                                                                    const parsed = JSON.parse(cleaned);
                                                                    if (Array.isArray(parsed) && parsed.length > 0) fields = parsed;
                                                                } catch {}
                                                                if (fields) {
                                                                    return (
                                                                        <table className="w-full text-xs border-collapse">
                                                                            <thead><tr className="text-left text-[10px] uppercase text-gray-500 border-b">
                                                                                <th className="py-1 pr-2">Field</th>
                                                                                <th className="py-1 pr-2">Requested</th>
                                                                                <th className="py-1 pr-2">Bank Value</th>
                                                                                <th className="py-1 text-center">Status</th>
                                                                            </tr></thead>
                                                                            <tbody>
                                                                                {fields.map((f, i) => {
                                                                                    const isMatch = f.match === true || f.severity === 'OK';
                                                                                    return (
                                                                                        <tr key={i} className={`border-b border-gray-100 ${isMatch ? '' : 'bg-amber-50'}`}>
                                                                                            <td className="py-1.5 pr-2 font-medium text-gray-700">{f.field}</td>
                                                                                            <td className="py-1.5 pr-2 text-gray-600">{f.requested || '—'}</td>
                                                                                            <td className={`py-1.5 pr-2 font-medium ${isMatch ? 'text-gray-600' : 'text-red-600'}`}>{f.bank_confirmed || f.extracted || '—'}</td>
                                                                                            <td className="py-1.5 text-center">
                                                                                                {isMatch ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 inline" /> :
                                                                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${f.severity === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{f.severity}</span>}
                                                                                            </td>
                                                                                        </tr>
                                                                                    );
                                                                                })}
                                                                            </tbody>
                                                                        </table>
                                                                    );
                                                                }
                                                                // Fallback: raw text
                                                                return verificationStep.details?.notes ? <p className="text-xs text-amber-600 whitespace-pre-wrap">{verificationStep.details.notes}</p> : null;
                                                            })()}

                                                            {/* Corporate Admin / Checker: can accept discrepancies (overrides readOnly) */}
                                                            {isApprover && (
                                                                <>
                                                                    <p className="text-xs text-gray-500">As an approver, you can accept the discrepancies with a reason, or request a correction from the bank.</p>
                                                                    <textarea
                                                                        value={replyForm.verification_notes}
                                                                        onChange={e => setReplyForm({ ...replyForm, verification_notes: e.target.value })}
                                                                        placeholder="Explain why discrepancies are acceptable..."
                                                                        className="w-full px-3 py-2 text-sm border rounded-lg" rows={2} />
                                                                    <div className="flex flex-wrap gap-2">
                                                                        <button onClick={() => handleAction('verify', { force_accept: true, verification_notes: replyForm.verification_notes })}
                                                                            disabled={actionLoading || !replyForm.verification_notes?.trim()}
                                                                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-100 rounded-lg hover:bg-emerald-200 disabled:opacity-50 transition-colors">
                                                                            <CheckCircle className="w-4 h-4" />
                                                                            Approve with Discrepancies
                                                                        </button>
                                                                        <button onClick={() => setIsResubmitting(true)}
                                                                            disabled={actionLoading}
                                                                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-100 rounded-lg hover:bg-emerald-200 disabled:opacity-50 transition-colors">
                                                                            <ShieldCheck className="w-4 h-4" />
                                                                            Re-submit to Admin
                                                                        </button>
                                                                        <button onClick={async () => {
                                                                            try {
                                                                                let discList = [];
                                                                                try {
                                                                                    let raw = verificationStep.details?.notes || '';
                                                                                    const arrMatch = raw.match(/^\s*\[[\s\S]*?\]\s*/);
                                                                                    if (arrMatch) raw = arrMatch[0];
                                                                                    const cleaned = raw.replace(/'/g, '"').replace(/\bNone\b/g, 'null').replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false');
                                                                                    const parsed = JSON.parse(cleaned);
                                                                                    if (Array.isArray(parsed) && parsed.length > 0) discList = parsed.filter(f => !f.match);
                                                                                } catch { discList = []; }
                                                                                const blob = await apiRequest(`/issuance/lg-records/${lgId}/generate-correction-letter`, 'POST', { discrepancies: discList }, 'application/json', 'blob');
                                                                                window.open(URL.createObjectURL(blob), '_blank');
                                                                                toast.success('Correction letter generated!');
                                                                            } catch (err) { toast.error(err.message); }
                                                                        }}
                                                                            disabled={actionLoading}
                                                                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 disabled:opacity-50 transition-colors">
                                                                            <FileText className="w-4 h-4" />
                                                                            Request Correction Letter
                                                                        </button>
                                                                    </div>
                                                                    
                                                                    {isResubmitting && (
                                                                        <div className="mt-4 p-4 bg-white border border-emerald-200 rounded-xl space-y-3 shadow-sm">
                                                                            <label className="block text-sm font-semibold text-gray-700">Reason for Re-submission</label>
                                                                            <textarea 
                                                                                value={resubmitNotes}
                                                                                onChange={(e) => setResubmitNotes(e.target.value)}
                                                                                placeholder="Explain why you are re-submitting this discrepancy without uploading a new document..."
                                                                                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 min-h-[80px]" 
                                                                            />
                                                                            <div className="flex gap-2 pt-1">
                                                                                <button
                                                                                    onClick={handleResubmitDiscrepancy}
                                                                                    disabled={actionLoading || !resubmitNotes.trim()}
                                                                                    className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                                                                >
                                                                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Re-submission'}
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => { setIsResubmitting(false); setResubmitNotes(''); }}
                                                                                    disabled={actionLoading}
                                                                                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                                                                >
                                                                                    Cancel
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}

                                                            {/* End User: locked out — waiting for admin decision */}
                                                            {!isApprover && (
                                                                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                                                                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                                                                    <span className="text-xs font-medium text-blue-700">Pending admin review — a Corporate Admin must approve or reject the discrepancies before you can proceed.</span>
                                                                </div>
                                                            )}

                                                            {/* Read-only (non-approver) view */}
                                                            {readOnly && !isApprover && (
                                                                <p className="text-xs text-gray-500">Discrepancies are pending review by a Corporate Admin.</p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Verification REJECTED — admin rejected discrepancy, end user must re-upload */}
                                                    {verificationStep && verificationStep.status === 'rejected' && (
                                                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg space-y-3">
                                                            <div className="flex items-center gap-2">
                                                                <XCircle className="w-4 h-4 text-red-600" />
                                                                <span className="text-xs font-bold text-red-700">Discrepancy Rejected by Admin — Re-upload Required</span>
                                                            </div>
                                                            {verificationStep.details?.notes && (
                                                                <div className="p-3 bg-white border border-red-200 rounded-lg shadow-sm">
                                                                    <div className="text-xs font-bold text-red-800 mb-2 flex items-center gap-1.5 border-b border-red-100 pb-2">
                                                                        <MessageSquare className="w-3.5 h-3.5" />
                                                                        Admin Feedback
                                                                    </div>
                                                                    {(() => {
                                                                        let fields = null;
                                                                        let textNote = verificationStep.details.notes;
                                                                        try {
                                                                            const arrMatch = textNote.match(/^\s*\[[\s\S]*?\]\s*/);
                                                                            if (arrMatch) {
                                                                                textNote = textNote.substring(arrMatch[0].length).replace(/^---\s*/, '').replace(/---\s*REJECTED by Admin.*/, '').trim();
                                                                                const cleaned = arrMatch[0].replace(/'/g, '"').replace(/\bNone\b/g, 'null').replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false');
                                                                                const parsed = JSON.parse(cleaned);
                                                                                if (Array.isArray(parsed) && parsed.length > 0) fields = parsed;
                                                                            }
                                                                        } catch {}
                                                                        return (
                                                                            <div className="space-y-3">
                                                                                {textNote && textNote !== '[]' && (
                                                                                    <p className="text-xs text-red-700 font-medium whitespace-pre-wrap">{textNote}</p>
                                                                                )}
                                                                                {fields && (
                                                                                    <div className="border border-red-100 rounded-lg overflow-hidden">
                                                                                        <table className="w-full text-xs border-collapse">
                                                                                            <thead className="bg-red-50"><tr className="text-left text-[10px] uppercase text-red-800 border-b border-red-100">
                                                                                                <th className="py-1.5 px-3">Field</th>
                                                                                                <th className="py-1.5 px-3">Requested</th>
                                                                                                <th className="py-1.5 px-3">Bank Value</th>
                                                                                            </tr></thead>
                                                                                            <tbody className="bg-white">
                                                                                                {fields.filter(f => !f.match).map((f, i) => (
                                                                                                    <tr key={i} className="border-b border-red-50 last:border-0 hover:bg-gray-50 transition-colors">
                                                                                                        <td className="py-2 px-3 font-semibold text-gray-800">{f.field}</td>
                                                                                                        <td className="py-2 px-3 text-gray-600 truncate max-w-[120px]">{f.requested || '—'}</td>
                                                                                                        <td className="py-2 px-3 font-semibold text-red-600 truncate max-w-[120px]">{f.bank_confirmed || f.extracted || '—'}</td>
                                                                                                    </tr>
                                                                                                ))}
                                                                                            </tbody>
                                                                                        </table>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            )}
                                                            {!readOnly && (
                                                                <div className="space-y-2">
                                                                    <p className="text-xs text-gray-600">Upload a corrected LG copy for re-verification, or request a correction letter from the bank.</p>
                                                                    {!aiResult && !aiExtracting && (
                                                                        <div
                                                                            className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer
                                                                                ${dragActive ? 'border-red-500 bg-red-100/50 scale-[1.01]' : 'border-gray-300 hover:border-red-400 hover:bg-red-50/30'}`}
                                                                            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                                                                            onDragLeave={() => setDragActive(false)}
                                                                            onDrop={handleDrop}
                                                                            onClick={() => fileInputRef.current?.click()}
                                                                        >
                                                                            <input type="file" ref={fileInputRef} className="hidden"
                                                                                accept=".pdf,.jpg,.jpeg,.png,.tiff,.webp"
                                                                                onChange={e => handleFileSelect(e.target.files?.[0])} />
                                                                            <Upload className="w-6 h-6 text-red-400 mx-auto mb-1" />
                                                                            <p className="text-sm font-medium text-gray-700">
                                                                                {dragActive ? 'Drop the file here...' : 'Re-upload corrected LG copy'}
                                                                            </p>
                                                                            <p className="text-[10px] text-gray-400 mt-0.5">PDF, JPEG, PNG, TIFF or WebP • Max 10 MB</p>
                                                                        </div>
                                                                    )}
                                                                    {aiExtracting && (
                                                                        <div className="flex items-center gap-3 py-4 justify-center">
                                                                            <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                                                                            <p className="text-sm text-gray-600">AI analyzing corrected LG copy...</p>
                                                                        </div>
                                                                    )}
                                                                    {aiResult && (
                                                                        <div className="space-y-2">
                                                                            <div className="flex items-center gap-2 p-2 bg-white border border-emerald-200 rounded-lg">
                                                                                <Sparkles className="w-4 h-4 text-emerald-500" />
                                                                                <span className="text-xs font-medium text-gray-700 flex-1 truncate">{uploadFile?.name}</span>
                                                                                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-600 rounded-full">AI Extracted</span>
                                                                            </div>
                                                                            {aiResult.comparison?.fields && (
                                                                                <table className="w-full text-xs border-collapse">
                                                                                    <thead><tr className="text-left text-[10px] uppercase text-gray-500 border-b">
                                                                                        <th className="py-1 pr-2">Field</th>
                                                                                        <th className="py-1 pr-2">Requested</th>
                                                                                        <th className="py-1 pr-2">Extracted</th>
                                                                                        <th className="py-1 text-center">Match</th>
                                                                                    </tr></thead>
                                                                                    <tbody>
                                                                                        {aiResult.comparison.fields.map((f, i) => (
                                                                                            <tr key={i} className={`border-b border-gray-100 ${f.match ? '' : 'bg-amber-50'}`}>
                                                                                                <td className="py-1 pr-2 font-medium text-gray-700">{f.field}</td>
                                                                                                <td className="py-1 pr-2 text-gray-600">{f.requested || '—'}</td>
                                                                                                <td className={`py-1 pr-2 font-medium ${f.match ? 'text-gray-600' : 'text-red-600'}`}>{f.extracted || '—'}</td>
                                                                                                <td className="py-1 text-center">{f.match ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 inline" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500 inline" />}</td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            )}
                                                                            <div className="flex gap-2">
                                                                                <button onClick={() => handleAction('verify', {
                                                                                    ...replyForm,
                                                                                    bank_beneficiary_name: replyForm.bank_beneficiary_name || aiResult.extracted?.bank_beneficiary_name,
                                                                                })}
                                                                                    disabled={actionLoading}
                                                                                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                                                                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                                                                    Re-verify with Corrected Copy
                                                                                </button>
                                                                                <button onClick={() => { setAiResult(null); setUploadFile(null); }}
                                                                                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                                                                                    Upload Different File
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {readOnly && (
                                                                <p className="text-xs text-gray-500">Waiting for end user to re-upload a corrected LG copy.</p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Verification PENDING — waiting for bank reply / initial state */}
                                                    {verificationStep && verificationStep.status === 'pending' && (
                                                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                                                            <div className="flex items-center gap-2">
                                                                <AlertTriangle className="w-4 h-4 text-blue-600" />
                                                                <span className="text-xs font-bold text-blue-700">Re-verification Required</span>
                                                            </div>
                                                            {/* Show rejection note if available */}
                                                            {verificationStep.details?.notes && verificationStep.details.notes.includes('REJECTED') && (
                                                                <div className="p-3 bg-white border border-blue-200 rounded-lg shadow-sm">
                                                                    <div className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1.5 border-b border-blue-100 pb-2">
                                                                        <MessageSquare className="w-3.5 h-3.5" />
                                                                        Previous Admin Rejection
                                                                    </div>
                                                                    {(() => {
                                                                        let fields = null;
                                                                        let textNote = verificationStep.details.notes;
                                                                        try {
                                                                            const arrMatch = textNote.match(/^\s*\[[\s\S]*?\]\s*/);
                                                                            if (arrMatch) {
                                                                                textNote = textNote.substring(arrMatch[0].length).replace(/^---\s*/, '').replace(/---\s*REJECTED by Admin.*/, '').trim();
                                                                                const cleaned = arrMatch[0].replace(/'/g, '"').replace(/\bNone\b/g, 'null').replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false');
                                                                                const parsed = JSON.parse(cleaned);
                                                                                if (Array.isArray(parsed) && parsed.length > 0) fields = parsed;
                                                                            }
                                                                        } catch {}
                                                                        return (
                                                                            <div className="space-y-3">
                                                                                {textNote && textNote !== '[]' && (
                                                                                    <p className="text-xs text-blue-800 font-medium whitespace-pre-wrap">{textNote}</p>
                                                                                )}
                                                                                {fields && (
                                                                                    <div className="border border-blue-100 rounded-lg overflow-hidden">
                                                                                        <table className="w-full text-xs border-collapse">
                                                                                            <thead className="bg-blue-50"><tr className="text-left text-[10px] uppercase text-blue-800 border-b border-blue-100">
                                                                                                <th className="py-1.5 px-3">Field</th>
                                                                                                <th className="py-1.5 px-3">Requested</th>
                                                                                                <th className="py-1.5 px-3">Bank Value</th>
                                                                                            </tr></thead>
                                                                                            <tbody className="bg-white">
                                                                                                {fields.filter(f => !f.match).map((f, i) => (
                                                                                                    <tr key={i} className="border-b border-blue-50 last:border-0 hover:bg-gray-50 transition-colors">
                                                                                                        <td className="py-2 px-3 font-semibold text-gray-800">{f.field}</td>
                                                                                                        <td className="py-2 px-3 text-gray-600 truncate max-w-[120px]">{f.requested || '—'}</td>
                                                                                                        <td className="py-2 px-3 font-semibold text-red-600 truncate max-w-[120px]">{f.bank_confirmed || f.extracted || '—'}</td>
                                                                                                    </tr>
                                                                                                ))}
                                                                                            </tbody>
                                                                                        </table>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            )}

                                                            {!readOnly && (
                                                                <div className="space-y-2">
                                                                    <p className="text-xs text-gray-600">Upload a corrected LG copy for re-verification, or request a correction letter from the bank.</p>
                                                                    {/* Re-upload zone */}
                                                                    {!aiResult && !aiExtracting && (
                                                                        <div
                                                                            className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer
                                                                                ${dragActive ? 'border-blue-500 bg-blue-100/50 scale-[1.01]' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'}`}
                                                                            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                                                                            onDragLeave={() => setDragActive(false)}
                                                                            onDrop={handleDrop}
                                                                            onClick={() => fileInputRef.current?.click()}
                                                                        >
                                                                            <input type="file" ref={fileInputRef} className="hidden"
                                                                                accept=".pdf,.jpg,.jpeg,.png,.tiff,.webp"
                                                                                onChange={e => handleFileSelect(e.target.files?.[0])} />
                                                                            <Upload className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                                                                            <p className="text-sm font-medium text-gray-700">
                                                                                {dragActive ? 'Drop the file here...' : 'Re-upload corrected LG copy'}
                                                                            </p>
                                                                            <p className="text-[10px] text-gray-400 mt-0.5">PDF, JPEG, PNG, TIFF or WebP • Max 10 MB</p>
                                                                        </div>
                                                                    )}
                                                                    {/* AI spinner */}
                                                                    {aiExtracting && (
                                                                        <div className="flex items-center gap-3 py-4 justify-center">
                                                                            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                                                            <p className="text-sm text-gray-600">AI analyzing corrected LG copy...</p>
                                                                        </div>
                                                                    )}
                                                                    {/* AI Results + Re-verify */}
                                                                    {aiResult && (
                                                                        <div className="space-y-2">
                                                                            <div className="flex items-center gap-2 p-2 bg-white border border-emerald-200 rounded-lg">
                                                                                <Sparkles className="w-4 h-4 text-emerald-500" />
                                                                                <span className="text-xs font-medium text-gray-700 flex-1 truncate">{uploadFile?.name}</span>
                                                                                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-600 rounded-full">AI Extracted</span>
                                                                            </div>
                                                                            {/* Show comparison */}
                                                                            {aiResult.comparison?.fields && (
                                                                                <table className="w-full text-xs border-collapse">
                                                                                    <thead><tr className="text-left text-[10px] uppercase text-gray-500 border-b">
                                                                                        <th className="py-1 pr-2">Field</th>
                                                                                        <th className="py-1 pr-2">Requested</th>
                                                                                        <th className="py-1 pr-2">Extracted</th>
                                                                                        <th className="py-1 text-center">Match</th>
                                                                                    </tr></thead>
                                                                                    <tbody>
                                                                                        {aiResult.comparison.fields.map((f, i) => (
                                                                                            <tr key={i} className={`border-b border-gray-100 ${f.match ? '' : 'bg-amber-50'}`}>
                                                                                                <td className="py-1 pr-2 font-medium text-gray-700">{f.field}</td>
                                                                                                <td className="py-1 pr-2 text-gray-600">{f.requested || '—'}</td>
                                                                                                <td className={`py-1 pr-2 font-medium ${f.match ? 'text-gray-600' : 'text-red-600'}`}>{f.extracted || '—'}</td>
                                                                                                <td className="py-1 text-center">{f.match ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 inline" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500 inline" />}</td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            )}
                                                                            <div className="flex gap-2">
                                                                                <button onClick={() => handleAction('verify', {
                                                                                    ...replyForm,
                                                                                    bank_beneficiary_name: replyForm.bank_beneficiary_name || aiResult.extracted?.bank_beneficiary_name,
                                                                                    bank_currency: aiResult.extracted?.currency,
                                                                                    bank_lg_type: aiResult.extracted?.lg_type,
                                                                                    bank_lg_purpose: aiResult.extracted?.purpose,
                                                                                })}
                                                                                    disabled={actionLoading}
                                                                                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                                                                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                                                                    Re-verify with Corrected Values
                                                                                </button>
                                                                                <button onClick={() => { setAiResult(null); setUploadFile(null); }}
                                                                                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                                                                                    Upload Different File
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {/* Correction letter button */}
                                                                    {!aiResult && !aiExtracting && (
                                                                        <button onClick={async () => {
                                                                            try {
                                                                                let discList = [];
                                                                                try {
                                                                                    let raw = verificationStep.details?.notes || '';
                                                                                    const arrMatch = raw.match(/^\s*\[[\s\S]*?\]\s*/);
                                                                                    if (arrMatch) raw = arrMatch[0];
                                                                                    const cleaned = raw.replace(/'/g, '"').replace(/\bNone\b/g, 'null').replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false');
                                                                                    const parsed = JSON.parse(cleaned);
                                                                                    if (Array.isArray(parsed) && parsed.length > 0) discList = parsed.filter(f => !f.match);
                                                                                } catch { discList = []; }
                                                                                const blob = await apiRequest(`/issuance/lg-records/${lgId}/generate-correction-letter`, 'POST', { discrepancies: discList }, 'application/json', 'blob');
                                                                                window.open(URL.createObjectURL(blob), '_blank');
                                                                                toast.success('Correction letter generated!');
                                                                            } catch (err) { toast.error(err.message); }
                                                                        }}
                                                                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors">
                                                                            <FileText className="w-3.5 h-3.5" />
                                                                            Generate Correction Letter
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* (Redundant CANCELLATION_NOTICE block removed) */}                                            {/* ISSUED step info */}
                                            {step.step === 'ISSUED' && (
                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                    <div><span className="text-gray-500">LG Ref:</span> <span className="font-medium">{step.details?.lg_ref}</span></div>
                                                    <div><span className="text-gray-500">Method:</span> <span className="font-medium">{step.details?.method || '—'}</span></div>
                                                </div>
                                            )}

                                            {/* FUTURE step info */}
                                            {step.status === 'future' && step.step === 'BANK_REPLY' && (
                                                <div className="flex items-center gap-3 py-2 text-sm text-gray-400">
                                                    <Clock className="w-5 h-5" />
                                                    <div>
                                                        <p className="font-medium">Waiting for delivery to be recorded</p>
                                                        <p className="text-xs mt-0.5">Record delivery first (or skip it), then you can log the bank's reply.</p>
                                                    </div>
                                                </div>
                                            )}
                                            {step.status === 'future' && step.step === 'HANDOVER' && (
                                                <div className="flex items-center gap-3 py-2 text-sm text-gray-400">
                                                    <Clock className="w-5 h-5" />
                                                    <div>
                                                        <p className="font-medium">Waiting for LG verification</p>
                                                        <p className="text-xs mt-0.5">Complete the bank reply & verification step first, then you can record the LG handover.</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ===== HANDOVER ACTION ===== */}
                                            {step.step === 'HANDOVER' && step.status === 'pending' && !readOnly && (
                                                <div className="space-y-4">
                                                    <p className="text-xs text-gray-500 mb-2">Hand over the physical LG to the recipient. Defaults to the original requestor.</p>

                                                    {/* Toggle: deliver to someone else */}
                                                    <div className="flex items-center gap-3">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="checkbox" checked={deliverToOther}
                                                                onChange={e => {
                                                                    setDeliverToOther(e.target.checked);
                                                                    if (!e.target.checked && step.details?.requestor_defaults) {
                                                                        const d = step.details.requestor_defaults;
                                                                        setHandoverForm(prev => ({
                                                                            ...prev,
                                                                            recipient_name: d.name || '', recipient_email: d.email || '',
                                                                            recipient_department: d.department || '', recipient_job_title: d.job_title || '',
                                                                            recipient_phone: d.phone || '', recipient_employee_id: d.employee_id || '',
                                                                            recipient_manager_email: d.manager_email || '',
                                                                            recipient_second_line_manager_email: d.second_line_manager_email || '',
                                                                        }));
                                                                    } else {
                                                                        setHandoverForm(prev => ({
                                                                            ...prev,
                                                                            recipient_name: '', recipient_email: '', recipient_department: '',
                                                                            recipient_job_title: '', recipient_phone: '', recipient_employee_id: '',
                                                                            recipient_manager_email: '', recipient_second_line_manager_email: '',
                                                                        }));
                                                                    }
                                                                }}
                                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                                            <span className="text-xs font-medium text-gray-600">Deliver to someone else</span>
                                                        </label>
                                                        {!deliverToOther && handoverForm.recipient_name && (
                                                            <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-600 rounded-full flex items-center gap-1">
                                                                <UserCheck className="w-3 h-3" /> Requestor pre-filled
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Recipient fields */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-xs font-medium text-gray-600">Recipient Name *</label>
                                                            <input type="text" value={handoverForm.recipient_name}
                                                                onChange={e => setHandoverForm({ ...handoverForm, recipient_name: e.target.value })}
                                                                readOnly={!deliverToOther}
                                                                className={`w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 ${!deliverToOther ? 'bg-gray-50' : ''}`} />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-medium text-gray-600">Recipient Email *</label>
                                                            <input type="email" value={handoverForm.recipient_email}
                                                                onChange={e => setHandoverForm({ ...handoverForm, recipient_email: e.target.value })}
                                                                readOnly={!deliverToOther}
                                                                className={`w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 ${!deliverToOther ? 'bg-gray-50' : ''}`} />
                                                        </div>
                                                        {(() => {
                                                            const rcfg = data.recipient_field_config || {};
                                                            const fields = [
                                                                { key: 'recipient_department', label: 'Department', type: 'text', cfg: rcfg.department },
                                                                { key: 'recipient_job_title', label: 'Job Title', type: 'text', cfg: rcfg.job_title },
                                                                { key: 'recipient_phone', label: 'Phone', type: 'tel', cfg: rcfg.phone_number },
                                                                { key: 'recipient_employee_id', label: 'Employee ID', type: 'text', cfg: rcfg.employee_id },
                                                                { key: 'recipient_manager_email', label: "Manager's Email", type: 'email', cfg: rcfg.manager_email },
                                                                { key: 'recipient_second_line_manager_email', label: '2nd Line Manager', type: 'email', cfg: rcfg.second_line_manager_email },
                                                            ];
                                                            return fields
                                                                .filter(f => !f.cfg || f.cfg.is_visible !== false)
                                                                .map(f => (
                                                                    <div key={f.key}>
                                                                        <label className="text-xs font-medium text-gray-600">
                                                                            {f.label}{f.cfg?.is_mandatory ? ' *' : ''}
                                                                        </label>
                                                                        <input type={f.type} value={handoverForm[f.key] || ''}
                                                                            onChange={e => setHandoverForm({ ...handoverForm, [f.key]: e.target.value })}
                                                                            className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500" />
                                                                    </div>
                                                                ));
                                                        })()}
                                                    </div>

                                                    {/* Handover date */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-xs font-medium text-gray-600">Handover Date</label>
                                                            <input type="date" value={handoverForm.handover_date}
                                                                max={today()}
                                                                onChange={e => setHandoverForm({ ...handoverForm, handover_date: e.target.value })}
                                                                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500" />
                                                        </div>
                                                    </div>

                                                    {/* Notes */}
                                                    <div>
                                                        <label className="text-xs font-medium text-gray-600">Notes</label>
                                                        <textarea value={handoverForm.handover_notes}
                                                            onChange={e => setHandoverForm({ ...handoverForm, handover_notes: e.target.value })}
                                                            placeholder="Any handover notes..."
                                                            className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500" rows={2} />
                                                    </div>

                                                    {/* Signed receiving copy upload */}
                                                    <div>
                                                        <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                                                            Signed Receiving Copy {data.handover_signed_copy_required ? <span className="text-red-500">*</span> : '(optional)'}
                                                        </label>
                                                        {!handoverFile ? (
                                                            <div
                                                                className={`mt-1 border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer
                                                                    ${handoverDragActive ? 'border-blue-500 bg-blue-100/50 scale-[1.01]' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'}`}
                                                                onDragOver={e => { e.preventDefault(); setHandoverDragActive(true); }}
                                                                onDragLeave={() => setHandoverDragActive(false)}
                                                                onDrop={e => { e.preventDefault(); setHandoverDragActive(false); if (e.dataTransfer.files?.[0]) setHandoverFile(e.dataTransfer.files[0]); }}
                                                                onClick={() => handoverFileRef.current?.click()}
                                                            >
                                                                <input type="file" ref={handoverFileRef} className="hidden"
                                                                    accept=".pdf,.jpg,.jpeg,.png,.tiff,.webp"
                                                                    onChange={e => { if (e.target.files?.[0]) setHandoverFile(e.target.files[0]); }} />
                                                                <Upload className="w-7 h-7 text-blue-400 mx-auto mb-2" />
                                                                <p className="text-sm font-medium text-gray-700">
                                                                    {handoverDragActive ? 'Drop the file here...' : 'Upload signed receiving copy'}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400 mt-1">PDF, JPEG, PNG, TIFF or WebP • Max 10 MB</p>
                                                            </div>
                                                        ) : (
                                                            <div className="mt-1 flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                                                                <FileText className="w-4 h-4 text-emerald-500" />
                                                                <span className="text-xs font-medium text-gray-700 flex-1 truncate">{handoverFile.name}</span>
                                                                <span className="text-[10px] text-gray-400">{(handoverFile.size / 1024).toFixed(0)} KB</span>
                                                                <button onClick={() => setHandoverFile(null)}
                                                                    className="p-1 hover:bg-emerald-100 rounded-full">
                                                                    <X className="w-3 h-3 text-gray-400" />
                                                                </button>
                                                            </div>
                                                        )}
                                                        {data.handover_signed_copy_required && !handoverFile && (
                                                            <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                                                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                                                <span className="text-xs text-amber-700">A signed receiving copy is <strong>required</strong> before recording handover.</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button onClick={() => handleAction('record-handover', handoverForm)}
                                                        disabled={actionLoading || !handoverForm.recipient_name || !handoverForm.recipient_email || (data.handover_signed_copy_required && !handoverFile)}
                                                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
                                                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                                                        Record Handover
                                                    </button>
                                                </div>
                                            )}

                                            {/* ===== HANDOVER READONLY STATE ===== */}
                                            {step.step === 'HANDOVER' && step.status === 'pending' && readOnly && (
                                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <Package className="w-4 h-4 text-blue-600" />
                                                        <span className="text-xs font-bold text-slate-800">Physical Handover Pending</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500">
                                                        The Letter of Guarantee is ready. The operations / end-user team can record the physical handover to the recipient (<strong>{step.details?.requestor_defaults?.name || 'Requestor'}</strong>).
                                                    </p>
                                                </div>
                                            )}

                                            {/* CANCELLATION_NOTICE step */}
                                            {step.step === 'CANCELLATION_NOTICE' && (
                                                <div className="space-y-3">
                                                    {/* Generated — show PDF download */}
                                                    {step.details?.has_pdf && (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        const res = await apiRequest(`/issuance/lg-records/${lgId}/cancellation-notice-pdf`, 'GET');
                                                                        if (res?.download_url) {
                                                                            window.open(res.download_url, '_blank');
                                                                        }
                                                                    } catch (err) {
                                                                        toast.error('Failed to load cancellation notice.');
                                                                    }
                                                                }}
                                                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                                Download Cancellation Notice PDF
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Delivery info or form */}
                                                    {step.details?.delivery_date ? (
                                                        <div className="text-sm space-y-1">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div><span className="text-gray-500">Delivered:</span> <span className="font-medium">{step.details.delivery_date}</span></div>
                                                                <div><span className="text-gray-500">Method:</span> <span className="font-medium">{step.details.delivery_method}</span></div>
                                                            </div>
                                                            {step.details.delivery_notes && <div><span className="text-gray-500">Notes:</span> {step.details.delivery_notes}</div>}
                                                        </div>
                                                    ) : step.status === 'pending_delivery' && !readOnly && (
                                                        <div className="space-y-2 p-3 bg-gray-50 rounded-lg border">
                                                            <p className="text-xs font-semibold text-gray-700">Record Delivery to Bank</p>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <input type="date" value={cnDeliveryForm.delivery_date}
                                                                    onChange={e => setCnDeliveryForm(p => ({ ...p, delivery_date: e.target.value }))}
                                                                    className="px-2 py-1.5 text-sm border rounded-lg" />
                                                                <select value={cnDeliveryForm.delivery_method}
                                                                    onChange={e => setCnDeliveryForm(p => ({ ...p, delivery_method: e.target.value }))}
                                                                    className="px-2 py-1.5 text-sm border rounded-lg">
                                                                    {DELIVERY_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                                                </select>
                                                            </div>
                                                            <textarea value={cnDeliveryForm.delivery_notes}
                                                                onChange={e => setCnDeliveryForm(p => ({ ...p, delivery_notes: e.target.value }))}
                                                                placeholder="Delivery notes (optional)"
                                                                className="w-full px-2 py-1.5 text-sm border rounded-lg" rows={2} />
                                                            <button onClick={async () => {
                                                                setActionLoading(true);
                                                                try {
                                                                    await apiRequest(`/issuance/lg-records/${lgId}/cancellation-notice-delivery`, 'PATCH', cnDeliveryForm);
                                                                    toast.success('Cancellation notice delivery recorded.');
                                                                    fetchStatus();
                                                                } catch (err) { toast.error(err.message); }
                                                                finally { setActionLoading(false); }
                                                            }} disabled={actionLoading}
                                                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg disabled:opacity-50">
                                                                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                                                                Record Delivery
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Bank reply info or form */}
                                                    {step.details?.bank_reply_date ? (
                                                        <div className="text-sm space-y-1">
                                                            <div><span className="text-gray-500">Bank Reply:</span> <span className="font-medium">{step.details.bank_reply_date}</span></div>
                                                            {step.details.bank_reply_notes && <div><span className="text-gray-500">Notes:</span> {step.details.bank_reply_notes}</div>}
                                                            <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                                                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                                                                <span className="text-xs font-bold text-emerald-700">Cancellation notice process complete.</span>
                                                            </div>
                                                        </div>
                                                    ) : step.status === 'pending_reply' && !readOnly && (
                                                        <div className="space-y-2 p-3 bg-gray-50 rounded-lg border">
                                                            <p className="text-xs font-semibold text-gray-700">Record Bank Reply to Cancellation Notice</p>
                                                            <input type="date" value={cnReplyForm.bank_reply_date}
                                                                onChange={e => setCnReplyForm(p => ({ ...p, bank_reply_date: e.target.value }))}
                                                                className="px-2 py-1.5 text-sm border rounded-lg w-full" />
                                                            <textarea value={cnReplyForm.bank_reply_notes}
                                                                onChange={e => setCnReplyForm(p => ({ ...p, bank_reply_notes: e.target.value }))}
                                                                placeholder="Bank reply notes"
                                                                className="w-full px-2 py-1.5 text-sm border rounded-lg" rows={2} />
                                                            <button onClick={async () => {
                                                                setActionLoading(true);
                                                                try {
                                                                    await apiRequest(`/issuance/lg-records/${lgId}/cancellation-notice-reply`, 'PATCH', cnReplyForm);
                                                                    toast.success('Bank reply to cancellation notice recorded.');
                                                                    fetchStatus();
                                                                } catch (err) { toast.error(err.message); }
                                                                finally { setActionLoading(false); }
                                                            }} disabled={actionLoading}
                                                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">
                                                                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                                                                Record Bank Reply
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* HANDOVER completed info */}
                                            {step.step === 'HANDOVER' && step.status === 'completed' && (
                                                <div className="space-y-2 text-sm">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div><span className="text-gray-500">Recipient:</span> <span className="font-semibold">{step.details?.recipient_name}</span></div>
                                                        <div><span className="text-gray-500">Email:</span> <span className="font-medium">{step.details?.recipient_email}</span></div>
                                                        {step.details?.recipient_department && <div><span className="text-gray-500">Department:</span> {step.details.recipient_department}</div>}
                                                        {step.details?.recipient_job_title && <div><span className="text-gray-500">Title:</span> {step.details.recipient_job_title}</div>}
                                                        <div><span className="text-gray-500">Date:</span> <span className="font-medium">{step.date || '—'}</span></div>
                                                    </div>
                                                    {step.details?.notes && <div><span className="text-gray-500">Notes:</span> {step.details.notes}</div>}
                                                    <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                                                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                                                        <span className="text-xs font-bold text-emerald-700">LG successfully handed over — post-issuance process complete.</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Documents */}
            {data.documents?.length > 0 && (
                <div className="mt-6 border-t border-gray-200 pt-4">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Related Documents</h4>
                    <div className="space-y-1">
                        {data.documents.map(doc => (
                            <div key={doc.id} className="flex items-center gap-2 text-sm text-gray-600 py-1">
                                <FileText className="w-3.5 h-3.5 text-gray-400" />
                                <span>{doc.file_name}</span>
                                <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 rounded text-gray-500">{doc.type}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
