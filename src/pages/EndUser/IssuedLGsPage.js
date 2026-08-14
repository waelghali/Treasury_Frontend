import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../services/apiService';
import { toast } from 'react-toastify';
import {
    FileText, RefreshCw, Shield, Calendar, DollarSign,
    Building, ExternalLink, Printer, Loader2, Search,
    X, Hash, User, Clock, MapPin, Briefcase, ChevronRight,
    AlertCircle, Copy, CheckCircle, Plus, ArrowUpRight,
    ArrowDownRight, RotateCcw, Trash2, Edit3, Zap,
    Send, Check, Ban, Download, Users, AlertTriangle,
    ArrowUp, ArrowDown, SlidersHorizontal, Filter, XCircle
} from 'lucide-react';
import PostIssuanceTracker from '../../components/PostIssuanceTracker';
import RecordDeliveryModal from '../../components/Modals/RecordDeliveryModal';
import RecordBankReplyModal from '../../components/Modals/RecordBankReplyModal';
import MaintenanceActionModal from '../../components/Modals/MaintenanceActionModal';
import ChangeRequestorModal from '../../components/Modals/ChangeRequestorModal';
import IssuanceRequestDetailsModal from '../../components/Modals/IssuanceRequestDetailsModal';
import RequestorDirectoryTab from '../../components/Issuance/RequestorDirectoryTab';
import CopyBadge from '../../components/CopyBadge';

// Status display labels (module-level so both modal and page can use)
const statusLabels = {
    INTERNAL_PROCESSING: 'Processing',
    DELIVERED_TO_BANK: 'At Bank',
    BANK_INQUIRY: 'Bank Inquiry',
    BANK_REJECTED: 'Rejected by Bank',
    LG_ISSUED: 'LG Issued',
    ACTIVE: 'Active',
    EXPIRED: 'Expired',
    CANCELLED: 'Cancelled',
    PENDING_CLOSE: 'Closing',
    CLOSED: 'Closed',
    LIQUIDATED: 'Liquidated',
    SLA_EXCEEDED: 'SLA Breach',
    CANCEL_REQUESTED: 'Cancel Pending',
    RETURNED: 'Returned',
};

// Expiry countdown helper
const expiryCountdown = (expiryDate) => {
    if (!expiryDate) return { text: '—', color: 'text-slate-400' };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate); exp.setHours(0, 0, 0, 0);
    const days = Math.ceil((exp - today) / 86400000);
    if (days < 0) return { text: 'Expired', color: 'text-red-600 font-bold' };
    if (days === 0) return { text: 'Today', color: 'text-red-600 font-bold' };
    if (days <= 7) return { text: `${days}d left`, color: 'text-red-500 font-semibold' };
    if (days <= 30) return { text: `${days}d left`, color: 'text-amber-600 font-medium' };
    return { text: `${days}d left`, color: 'text-emerald-600' };
};

// ---------------------------------------------------------------------------
// Detail Row helper
// ---------------------------------------------------------------------------
const DetailRow = ({ label, value, mono, highlight }) => (
    <div className="flex justify-between items-start py-2 border-b border-slate-100 last:border-b-0">
        <span className="text-xs font-bold text-slate-500 uppercase w-2/5 shrink-0">{label}</span>
        <span className={`text-sm text-right ${highlight ? 'font-bold text-emerald-700' : mono ? 'font-mono text-slate-800' : 'text-slate-800'}`}>
            {value || '—'}
        </span>
    </div>
);

// ---------------------------------------------------------------------------
// Documents Tab (separate component for clean state management)
// ---------------------------------------------------------------------------
function DocumentsTab({ lgId }) {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const data = await apiRequest(`/issuance/issued-lgs/${lgId}/documents`, 'GET');
                setDocs(data || []);
            } catch { /* silent */ }
            finally { setLoading(false); }
        })();
    }, [lgId]);

    const handleDownload = async (doc) => {
        setDownloading(doc.id);
        try {
            if (doc.download_type === 'request_doc' && doc.request_id && doc.document_id) {
                // Use the existing signed-URL download endpoint
                const result = await apiRequest(
                    `/issuance/requests/${doc.request_id}/documents/${doc.document_id}/download`, 'GET'
                );
                if (result?.download_url) {
                    window.open(result.download_url, '_blank');
                } else {
                    toast.error('Could not generate download link');
                }
            } else if (doc.download_type === 'lg_reprint' && doc.lg_id) {
                // Same approach as the Reprint Letter button (handleReprint)
                const blob = await apiRequest(`/issuance/issued-lgs/${doc.lg_id}/reprint`, 'POST', null, 'application/json', 'blob');
                if (blob && blob.size > 0) {
                    const url = window.URL.createObjectURL(blob);
                    window.open(url, '_blank');
                } else {
                    toast.error('Could not download document');
                }
            } else if (doc.download_type === 'maintenance_letter' && doc.action_id) {
                // Open maintenance instruction letter as PDF blob
                const blob = await apiRequest(`/issuance/maintenance/${doc.action_id}/document/letter`, 'GET', null, 'application/json', 'blob');
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
            } else if (doc.download_type === 'maintenance_doc' && doc.action_id) {
                // Download delivery proof or bank reply doc — may be local (blob) or GCS (signed URL)
                try {
                    const blob = await apiRequest(`/issuance/maintenance/${doc.action_id}/document/${doc.doc_type}`, 'GET', null, 'application/json', 'blob');
                    if (blob && blob.size > 0 && blob.type !== 'application/json') {
                        const url = window.URL.createObjectURL(blob);
                        window.open(url, '_blank');
                    } else {
                        // It was JSON — parse the signed URL
                        const text = await blob.text();
                        const res = JSON.parse(text);
                        if (res?.download_url) {
                            window.open(res.download_url, '_blank');
                        } else {
                            toast.error('Could not generate download link');
                        }
                    }
                } catch (dlErr) {
                    toast.error('Download failed');
                }
            } else {
                toast.info('Download not available for this document type');
            }
        } catch (err) {
            toast.error('Failed to download document');
        } finally {
            setDownloading(null);
        }
    };

    if (loading) return <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div>;
    if (docs.length === 0) return (
        <div className="text-center py-8 text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="font-medium">No documents attached</p>
            <p className="text-xs mt-1">Documents from bank instructions and LG issuance will appear here</p>
        </div>
    );

    return (
        <div className="space-y-2">
            {docs.map((doc, i) => (
                <div key={doc.id || i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{doc.file_name || doc.name || 'Document'}</p>
                            <p className="text-[10px] text-slate-400">
                                {doc.document_type?.replace(/_/g, ' ') || 'File'}
                                {doc.source && <span className="ml-1.5 px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded-md text-[9px] font-medium">{doc.source}</span>}
                                {doc.created_at ? ` · ${new Date(doc.created_at).toLocaleDateString()}` : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleDownload(doc)}
                        disabled={downloading === doc.id}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 shrink-0 disabled:opacity-50"
                    >
                        {downloading === doc.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Download className="w-3.5 h-3.5" />
                        )}
                        {downloading === doc.id ? 'Loading...' : 'Download'}
                    </button>
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Smart Suggestions Engine (pure frontend — zero backend)
// ---------------------------------------------------------------------------
function SmartSuggestions({ lg }) {
    const suggestions = [];

    // Rule 1: Expiring soon
    if (lg.expiry_date && ['ACTIVE', 'LG_ISSUED'].includes(lg.status)) {
        const today = new Date(); today.setHours(0,0,0,0);
        const exp = new Date(lg.expiry_date); exp.setHours(0,0,0,0);
        const daysLeft = Math.ceil((exp - today) / 86400000);
        if (daysLeft < 0) {
            suggestions.push({ icon: '🔴', text: `This LG expired ${Math.abs(daysLeft)} days ago — consider closing or returning it.`, severity: 'critical' });
        } else if (daysLeft <= 7) {
            suggestions.push({ icon: '🔴', text: `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — urgent action needed. Extend or close?`, severity: 'critical' });
        } else if (daysLeft <= 30) {
            suggestions.push({ icon: '🟡', text: `Expires in ${daysLeft} days — consider extending or preparing for return.`, severity: 'warning' });
        } else if (daysLeft <= 60) {
            suggestions.push({ icon: '💡', text: `${daysLeft} days until expiry — good time to review renewal needs.`, severity: 'info' });
        }
    }

    // Rule 2: Bank amount mismatch
    if (lg.bank_lg_amount && lg.current_amount) {
        const diff = Math.abs(parseFloat(lg.current_amount) - parseFloat(lg.bank_lg_amount));
        if (diff > 0.01) {
            suggestions.push({ icon: '⚠️', text: `Bank amount differs by ${lg.currency_code || ''} ${diff.toLocaleString(undefined, {minimumFractionDigits: 2})} — review reconciliation.`, severity: 'warning' });
        }
    }

    // Rule 3: Reference validity exceeded
    if (lg.reference_validity_flag === 'EXCEEDED') {
        suggestions.push({ icon: '🔴', text: 'Underlying contract/reference has expired — this LG may need to be returned to the bank.', severity: 'critical' });
    }

    // Rule 4: Stale LG (created > 6 months ago, no recent updates)
    if (lg.created_at && !lg.updated_at && ['ACTIVE', 'LG_ISSUED'].includes(lg.status)) {
        const created = new Date(lg.created_at);
        const monthsOld = (new Date() - created) / (1000 * 60 * 60 * 24 * 30);
        if (monthsOld > 6) {
            suggestions.push({ icon: '📋', text: `No activity in ${Math.floor(monthsOld)} months — verify this LG is still needed.`, severity: 'info' });
        }
    }

    // Rule 5: Pending confirmation too long
    if (lg.status === 'INTERNAL_PROCESSING' && lg.created_at) {
        const created = new Date(lg.created_at);
        const daysWaiting = Math.ceil((new Date() - created) / 86400000);
        if (daysWaiting > 7) {
            suggestions.push({ icon: '⏰', text: `Pending bank confirmation for ${daysWaiting} days — follow up with the bank.`, severity: 'warning' });
        }
    }

    if (suggestions.length === 0) return null;

    const severityColors = {
        critical: 'bg-red-50 border-red-200 text-red-800',
        warning: 'bg-amber-50 border-amber-200 text-amber-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800',
    };

    return (
        <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">🧠 Smart Insights</span>
            </div>
            {suggestions.map((s, i) => (
                <div key={i} className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium ${severityColors[s.severity]}`}>
                    <span className="text-sm shrink-0 mt-0.5">{s.icon}</span>
                    <span>{s.text}</span>
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// D3: Manual Pricing Panel (inline edit for non-facility LGs)
// ---------------------------------------------------------------------------
function ManualPricingPanel({ lgId, initialPricing, readOnly }) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedPricing, setSavedPricing] = useState(initialPricing);
    const [pricing, setPricing] = useState({
        commission_rate: initialPricing?.commission_rate ?? '',
        min_commission: initialPricing?.min_commission ?? '',
        flat_fee: initialPricing?.flat_fee ?? '',
        margin_pct: initialPricing?.margin_pct ?? '',
        notes: initialPricing?.notes ?? '',
    });
    const hasPricing = savedPricing && Object.keys(savedPricing).length > 0;

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {};
            if (pricing.commission_rate !== '') payload.commission_rate = parseFloat(pricing.commission_rate);
            if (pricing.min_commission !== '') payload.min_commission = parseFloat(pricing.min_commission);
            if (pricing.flat_fee !== '') payload.flat_fee = parseFloat(pricing.flat_fee);
            if (pricing.margin_pct !== '') payload.margin_pct = parseFloat(pricing.margin_pct);
            if (pricing.notes) payload.notes = pricing.notes;

            await apiRequest(`/issuance/lg-records/${lgId}/manual-pricing`, 'PATCH', payload);
            setSavedPricing(payload);
            toast.success('Pricing updated successfully');
            setEditing(false);
        } catch (err) {
            toast.error(err.message || 'Failed to update pricing');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-5 mb-2 flex items-center justify-between">
                <span>💰 Pricing Details</span>
                {!readOnly && !editing && (
                    <button onClick={() => setEditing(true)}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wide flex items-center gap-1">
                        <Edit3 className="w-3 h-3" /> {hasPricing ? 'Edit' : 'Add Pricing'}
                    </button>
                )}
            </h4>
            {!editing ? (
                hasPricing ? (
                    <div className="space-y-1">
                        {savedPricing.commission_rate != null && <DetailRow label="Commission %" value={`${savedPricing.commission_rate}%`} />}
                        {savedPricing.min_commission != null && <DetailRow label="Min Commission" value={savedPricing.min_commission} />}
                        {savedPricing.flat_fee != null && <DetailRow label="Flat Fee" value={savedPricing.flat_fee} />}
                        {savedPricing.margin_pct != null && <DetailRow label="Cash Margin %" value={`${savedPricing.margin_pct}%`} />}
                        {savedPricing.notes && <DetailRow label="Notes" value={savedPricing.notes} />}
                    </div>
                ) : (
                    <p className="text-xs text-slate-400 italic">No pricing details recorded yet.</p>
                )
            ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Commission %</label>
                            <input type="number" step="0.01" min="0" placeholder="e.g. 1.5"
                                value={pricing.commission_rate}
                                onChange={e => setPricing(p => ({ ...p, commission_rate: e.target.value }))}
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Min Commission</label>
                            <input type="number" step="0.01" min="0" placeholder="e.g. 250"
                                value={pricing.min_commission}
                                onChange={e => setPricing(p => ({ ...p, min_commission: e.target.value }))}
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Flat Fee</label>
                            <input type="number" step="0.01" min="0" placeholder="e.g. 500"
                                value={pricing.flat_fee}
                                onChange={e => setPricing(p => ({ ...p, flat_fee: e.target.value }))}
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cash Margin %</label>
                            <input type="number" step="0.01" min="0" placeholder="e.g. 10"
                                value={pricing.margin_pct}
                                onChange={e => setPricing(p => ({ ...p, margin_pct: e.target.value }))}
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pricing Notes</label>
                        <input type="text" placeholder="e.g. Verbal agreement with bank"
                            value={pricing.notes}
                            onChange={e => setPricing(p => ({ ...p, notes: e.target.value }))}
                            className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleSave} disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Save Pricing
                        </button>
                        <button onClick={() => setEditing(false)}
                            className="px-4 py-2 text-xs font-medium text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

// ---------------------------------------------------------------------------
// Detailed LG Modal
// ---------------------------------------------------------------------------
function IssuedLGDetailModal({ lg, onClose, onReprint, readOnly = false }) {
    const navigate = useNavigate();
    const [reprinting, setReprinting] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [maintenanceActions, setMaintenanceActions] = useState([]);
    const [loadingActions, setLoadingActions] = useState(false);
    const [actionModal, setActionModal] = useState(null); // {type: 'EXTEND'|'INCREASE_AMOUNT'|...}
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({});
    const [availableActions, setAvailableActions] = useState([]);
    const [supportFile, setSupportFile] = useState(null);
    const [showChangeOwnerModal, setShowChangeOwnerModal] = useState(false);

    // Bank form issue report state
    const [showFormIssue, setShowFormIssue] = useState(false);
    const [formIssueData, setFormIssueData] = useState({
        issue_type: 'INCORRECT_FORMAT',
        description: '',
        field_name: '',
        severity: 'MEDIUM',
        form_config_id: '',
    });
    const [formIssueFile, setFormIssueFile] = useState(null);
    const [formIssueTemplates, setFormIssueTemplates] = useState([]);
    const [submittingIssue, setSubmittingIssue] = useState(false);

    // Fetch bank form templates when issue modal opens
    useEffect(() => {
        if (showFormIssue && lg.bank_id) {
            apiRequest(`/issuance/bank-forms?bank_id=${lg.bank_id}`, 'GET')
                .then(data => setFormIssueTemplates(data || []))
                .catch(() => setFormIssueTemplates([]));
        }
    }, [showFormIssue, lg.bank_id]);

    // Maintenance bank reply / delivery modal state (unified modals)
    const [bankReplyModal, setBankReplyModal] = useState(null); // action object
    const [deliveryModal, setDeliveryModal] = useState(null); // action object

    // Bank-initiated change state
    const [bankInitiatedModal, setBankInitiatedModal] = useState(false);
    const [bankInitiatedFile, setBankInitiatedFile] = useState(null);
    const [bankInitiatedUploading, setBankInitiatedUploading] = useState(false);
    const [bankInitiatedResult, setBankInitiatedResult] = useState(null); // AI analysis result
    const [cancellingLG, setCancellingLG] = useState(false);
    const [cancelModal, setCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelWithLetter, setCancelWithLetter] = useState(true);

    const req = lg.request;

    const handleReprint = async () => {
        setReprinting(true);
        try {
            toast.info(lg.issuance_method === 'COMPANY_LETTER' ? 'Generating letter...' : 'Retrieving document...');
            const blob = await apiRequest(`/issuance/issued-lgs/${lg.id}/reprint`, 'POST', null, 'application/json', 'blob');
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            toast.success('Document opened.');
        } catch (err) {
            const msg = err.message || '';
            if (msg.includes('No uploaded LG document') || msg.includes('404')) {
                toast.error('No LG document has been uploaded yet. Please upload the LG copy first.');
            } else {
                toast.error(msg || 'Failed to retrieve document.');
            }
        } finally {
            setReprinting(false);
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    const handleCancelLG = async () => {
        if (!cancelReason.trim()) { toast.error('Please enter a cancellation reason.'); return; }
        setCancellingLG(true);
        try {
            await apiRequest(`/issuance/lg-records/${lg.id}/request-cancellation`, 'POST', {
                cancel_reason: cancelReason,
                issue_cancellation_letter: cancelWithLetter,
            });
            toast.success('Cancellation request submitted for admin approval.');
            setCancelModal(false);
            if (onClose) onClose();
        } catch (err) {
            toast.error(err.message || 'Failed to submit cancellation request.');
        } finally {
            setCancellingLG(false);
        }
    };

    const handleFormIssueSubmit = async () => {
        if (!formIssueData.description.trim() || formIssueData.description.trim().length < 3) { toast.error('Description must be at least 3 characters.'); return; }
        setSubmittingIssue(true);
        try {
            const fd = new FormData();
            fd.append('bank_id', lg.bank_id);
            fd.append('issue_type', formIssueData.issue_type);
            fd.append('description', formIssueData.description);
            if (formIssueData.field_name) fd.append('field_name', formIssueData.field_name);
            fd.append('severity', formIssueData.severity);
            if (formIssueData.form_config_id) fd.append('form_config_id', formIssueData.form_config_id);
            if (formIssueFile) fd.append('attachment', formIssueFile);
            await apiRequest('/issuance/bank-form-issues', 'POST', fd);
            toast.success('Form issue reported successfully. The system owner will review it.');
            setShowFormIssue(false);
            setFormIssueFile(null);
            setFormIssueData({ issue_type: 'INCORRECT_FORMAT', description: '', field_name: '', severity: 'MEDIUM', form_config_id: '' });
        } catch (err) {
            toast.error(err.message || 'Failed to submit form issue report.');
        } finally {
            setSubmittingIssue(false);
        }
    };

    const statusColors = {
        INTERNAL_PROCESSING: 'bg-amber-100 text-amber-800 border-amber-200',
        ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        LG_ISSUED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        EXPIRED: 'bg-slate-200 text-slate-600 border-slate-300',
        CANCELLED: 'bg-red-100 text-red-700 border-red-200',
        ISSUED: 'bg-blue-100 text-blue-800 border-blue-200',
        PENDING_CLOSE: 'bg-orange-100 text-orange-800 border-orange-200',
        CLOSED: 'bg-slate-300 text-slate-700 border-slate-400',
        LIQUIDATED: 'bg-red-200 text-red-800 border-red-300',
        DELIVERED_TO_BANK: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        BANK_INQUIRY: 'bg-amber-100 text-amber-800 border-amber-200',
        BANK_REJECTED: 'bg-red-100 text-red-700 border-red-200',
        SLA_EXCEEDED: 'bg-red-200 text-red-800 border-red-300',
        CANCEL_REQUESTED: 'bg-orange-100 text-orange-700 border-orange-200',
        RETURNED: 'bg-teal-100 text-teal-800 border-teal-200',
    };

    const methodLabels = {
        COMPANY_LETTER: 'Company Letter',
        BANK_FORM: 'Bank Form',
        BANK_API: 'Bank API',
        MANUAL: 'Manual',
        MANUAL_PDF: 'Manual PDF',
    };

    const allTabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'timeline', label: '📍 Timeline' },
        { id: 'maintenance', label: '⚙️ Maintenance' },
        { id: 'documents', label: '📄 Documents' },
    ];
    // Show all tabs for all roles — Maintenance history is valuable for corporate admin / checker
    const tabs = allTabs;

    // Build full lifecycle timeline from all available data
    const buildLifecycleTimeline = () => {
        const events = [];

        // 1. Request Created
        if (lg.request?.created_at) {
            events.push({
                icon: '📝', color: 'bg-blue-100 text-blue-600',
                label: 'Request Created',
                actor: lg.request.requestor_name || lg.request.requestor_email || null,
                detail: lg.request.serial_number ? `Request ${lg.request.serial_number}` : null,
                timestamp: lg.request.created_at,
            });
        }

        // 2. Request Submitted
        if (lg.request?.submitted_at) {
            events.push({
                icon: '📤', color: 'bg-indigo-100 text-indigo-600',
                label: 'Request Submitted for Approval',
                actor: lg.request.requestor_name || null,
                timestamp: lg.request.submitted_at,
            });
        }

        // 3. Approval Steps
        if (lg.request?.approval_chain_audit?.length > 0) {
            lg.request.approval_chain_audit.forEach(step => {
                const decision = step.decision || step.action || 'REVIEWED';
                const decisionLabel = decision === 'APPROVED' ? 'Approved' :
                    decision === 'REJECTED' ? 'Rejected' :
                    decision === 'REVISION_REQUIRED' ? 'Revision Required' : decision;
                const decisionColor = decision === 'APPROVED' ? 'bg-green-100 text-green-600' :
                    decision === 'REJECTED' ? 'bg-red-100 text-red-600' :
                    'bg-amber-100 text-amber-600';
                events.push({
                    icon: decision === 'APPROVED' ? '✅' : decision === 'REJECTED' ? '❌' : '🔄',
                    color: decisionColor,
                    label: `Step ${step.step || '?'}: ${decisionLabel}`,
                    actor: step.user_email || step.user_name || (step.user_id ? `User #${step.user_id}` : null),
                    detail: step.notes || null,
                    timestamp: step.timestamp || step.decided_at,
                });
            });
        }

        // 4. LG Issued
        if (lg.created_at) {
            events.push({
                icon: '🏛️', color: 'bg-emerald-100 text-emerald-600',
                label: 'LG Issued',
                actor: lg.issued_by_name || null,
                detail: `Ref: ${lg.lg_ref_number}${lg.issuance_method ? ` · Method: ${lg.issuance_method.replace(/_/g, ' ')}` : ''}`,
                timestamp: lg.created_at,
            });
        }

        // 5. Delivered to Bank
        if (lg.delivery_date) {
            events.push({
                icon: '📦', color: 'bg-cyan-100 text-cyan-600',
                label: 'Delivered to Bank',
                detail: lg.delivery_method ? `Method: ${lg.delivery_method.replace(/_/g, ' ')}` : null,
                notes: lg.delivery_notes || null,
                timestamp: lg.delivery_date,
            });
        }

        // 6. Bank Reply
        if (lg.bank_reply_date) {
            const replyLabel = lg.bank_reply_type === 'LG_ISSUED' ? 'Bank Confirmed LG Issued' :
                lg.bank_reply_type === 'REJECTED' ? 'Bank Rejected' :
                lg.bank_reply_type === 'INQUIRY' ? 'Bank Sent Inquiry' : 'Bank Replied';
            events.push({
                icon: '🏦', color: lg.bank_reply_type === 'LG_ISSUED' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600',
                label: replyLabel,
                detail: lg.bank_lg_number ? `Bank LG #: ${lg.bank_lg_number}` : null,
                notes: lg.bank_reply_notes || null,
                timestamp: lg.bank_reply_date,
            });
        }

        // 7. Bank Confirmation (legacy field)
        if (lg.bank_confirmation_date && !lg.bank_reply_date) {
            events.push({
                icon: '✓', color: 'bg-green-100 text-green-600',
                label: 'Bank Confirmed',
                detail: lg.bank_confirmation_ref ? `Ref: ${lg.bank_confirmation_ref}` : null,
                timestamp: lg.bank_confirmation_date,
            });
        }

        // 8. Verified
        if (lg.verified_at) {
            events.push({
                icon: '🔍', color: lg.verification_status === 'MATCHED' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600',
                label: `LG Copy Verified — ${(lg.verification_status || 'CHECKED').replace(/_/g, ' ')}`,
                actor: lg.verified_by_user_id ? `User #${lg.verified_by_user_id}` : null,
                timestamp: lg.verified_at,
            });
        }

        // 9. Handed Over
        if (lg.handover_date) {
            events.push({
                icon: '🤝', color: 'bg-purple-100 text-purple-600',
                label: 'LG Handed Over',
                actor: lg.handover_by_user_id ? `User #${lg.handover_by_user_id}` : null,
                detail: lg.recipient_name ? `To: ${lg.recipient_name}` : null,
                notes: lg.handover_notes || null,
                timestamp: lg.handover_date,
            });
        }

        // 10. Maintenance actions (from action_history JSONB)
        (lg.action_history || []).forEach(e => {
            events.push({
                icon: '⚙️', color: 'bg-orange-100 text-orange-600',
                label: (e.action_type || e.action || 'Change').replace(/_/g, ' '),
                actor: e.user_id ? `User #${e.user_id}` : null,
                notes: e.notes || null,
                timestamp: e.timestamp,
            });
        });

        // 11. Custody Transfers
        (lg.custody_transfer_log || []).forEach(e => {
            if (e.action === 'REPRINT') {
                events.push({
                    icon: '🖨️', color: 'bg-blue-100 text-blue-600',
                    label: 'Reprint',
                    actor: e.user_id ? `User #${e.user_id}` : null,
                    detail: e.method ? `Method: ${e.method}` : null,
                    notes: e.notes || null,
                    timestamp: e.date || e.timestamp,
                });
            } else {
                events.push({
                    icon: '🔄', color: 'bg-slate-200 text-slate-600',
                    label: 'Custody Transfer',
                    detail: e.from && e.to ? `${e.from} → ${e.to}` : null,
                    notes: e.notes || null,
                    timestamp: e.date || e.timestamp,
                });
            }
        });

        // Sort chronologically (oldest first — timeline top-to-bottom)
        return events.sort((a, b) => {
            if (!a.timestamp) return 1;
            if (!b.timestamp) return -1;
            return new Date(a.timestamp) - new Date(b.timestamp);
        });
    };

    const lifecycleTimeline = buildLifecycleTimeline();

    // Fetch maintenance actions
    const fetchMaintenanceActions = async () => {
        setLoadingActions(true);
        try {
            const data = await apiRequest(`/issuance/issued-lgs/${lg.id}/maintenance`, 'GET');
            setMaintenanceActions(data || []);
        } catch { /* silent */ }
        finally { setLoadingActions(false); }
    };

    useEffect(() => {
        if (activeTab === 'maintenance') fetchMaintenanceActions();
    }, [activeTab]);

    // Fetch available actions from backend (single source of truth)
    const fetchAvailableActions = async () => {
        try {
            const data = await apiRequest(`/issuance/issued-lgs/${lg.id}/available-actions`, 'GET');
            setAvailableActions(data?.available_actions || []);
        } catch { /* silent */ }
    };

    useEffect(() => { fetchAvailableActions(); }, [lg.id]);

    const handleCreateAction = async () => {
        if (!actionModal) return;
        setSubmitting(true);
        try {
            let actionData = { ...formData };

            // Upload supporting document if attached
            if (supportFile) {
                const uploadFd = new FormData();
                uploadFd.append('file', supportFile);
                const uploadRes = await apiRequest('/issuance/maintenance/upload-document', 'POST', uploadFd);
                actionData.supporting_documents = [{ uri: uploadRes.uri, file_name: uploadRes.file_name }];
            }

            await apiRequest(`/issuance/issued-lgs/${lg.id}/maintenance`, 'POST', {
                action_type: actionModal,
                action_data: actionData,
                notes: formData.notes || null,
            });
            toast.success(`${actionModal.replace(/_/g, ' ')} action created successfully`);
            setActionModal(null);
            setFormData({});
            setSupportFile(null);
            fetchMaintenanceActions();
            fetchAvailableActions();
        } catch (err) {
            toast.error(err?.response?.data?.detail || err.message || 'Failed to create action');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Record Delivery for maintenance action (FormData for file upload)
    // Delivery / Bank Reply: handled by unified RecordDeliveryModal / RecordBankReplyModal
    const handleDeliverySuccess = () => { setDeliveryModal(null); fetchMaintenanceActions(); };
    const handleBankReplySuccess = () => { setBankReplyModal(null); fetchMaintenanceActions(); };

    // Handle Confirm Bank Reply (Phase 2 — user proceeds despite AI mismatches)
    const handleConfirmBankReply = async (actionId) => {
        try {
            await apiRequest(`/issuance/maintenance/${actionId}/confirm-bank-reply`, 'POST');
            toast.success('Bank reply confirmed — changes applied to LG');
            fetchMaintenanceActions();
        } catch (err) {
            toast.error(err?.message || 'Failed to confirm bank reply');
        }
    };

    // Handle Cancel Bank Reply (user chooses not to proceed)
    const handleCancelBankReply = async (actionId) => {
        try {
            await apiRequest(`/issuance/maintenance/${actionId}/cancel-bank-reply`, 'POST');
            toast.success('Bank reply cancelled — you can re-upload a corrected document');
            fetchMaintenanceActions();
        } catch (err) {
            toast.error(err?.message || 'Failed to cancel bank reply');
        }
    };

    // Handle Cancel Action (within cancellation window)
    const handleCancelAction = async (actionId) => {
        const reason = window.prompt('Reason for cancellation:');
        if (reason === null) return; // User pressed Cancel on prompt
        try {
            await apiRequest(`/issuance/maintenance/${actionId}/cancel`, 'POST', { reason });
            toast.success('Action cancelled successfully');
            fetchMaintenanceActions();
        } catch (err) {
            toast.error(err?.response?.data?.detail || err?.message || 'Failed to cancel action');
        }
    };

    // Handle Bank-Initiated Change Upload
    const handleBankInitiatedUpload = async () => {
        if (!bankInitiatedFile) { toast.error('Please select a bank letter file'); return; }
        setBankInitiatedUploading(true);
        try {
            const fd = new FormData();
            fd.append('bank_letter', bankInitiatedFile);
            const res = await apiRequest(`/issuance/issued-lgs/${lg.id}/bank-initiated-change`, 'POST', fd, true);
            setBankInitiatedResult(res);
            setBankInitiatedModal(false);
            toast.success('AI analysis complete — review detected changes');
        } catch (err) {
            toast.error(err?.response?.data?.detail || err?.message || 'Failed to process bank letter');
        } finally {
            setBankInitiatedUploading(false);
        }
    };

    // Handle confirm bank-initiated change
    const handleConfirmBankChange = async (actionId) => {
        try {
            await apiRequest(`/issuance/maintenance/${actionId}/confirm-bank-change`, 'POST');
            toast.success('Bank-initiated changes applied successfully');
            setBankInitiatedResult(null);
            fetchMaintenanceActions();
        } catch (err) {
            toast.error(err?.response?.data?.detail || err?.message || 'Failed to confirm changes');
        }
    };

    // Static button styling — filtered by availableActions from backend
    const actionButtonConfig = {
        EXTEND: { label: 'Extend Expiry', icon: Calendar, color: 'bg-blue-600 hover:bg-blue-700' },
        INCREASE_AMOUNT: { label: 'Increase Amount', icon: ArrowUpRight, color: 'bg-emerald-600 hover:bg-emerald-700' },
        AMENDMENT: { label: 'Amend LG', icon: Edit3, color: 'bg-purple-600 hover:bg-purple-700' },
        CLOSE: { label: 'Close / Return', icon: RotateCcw, color: 'bg-amber-600 hover:bg-amber-700' },
        LIQUIDATION: { label: 'Record Liquidation', icon: AlertCircle, color: 'bg-red-600 hover:bg-red-700' },
        ACTIVATE: { label: 'Activate Non-Op', icon: Zap, color: 'bg-indigo-600 hover:bg-indigo-700' },
    };

    const actionStatusColors = {
        PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
        APPROVED: 'bg-blue-100 text-blue-800',
        EXECUTED: 'bg-emerald-100 text-emerald-800',
        REJECTED: 'bg-red-100 text-red-700',
        CANCELLED: 'bg-slate-200 text-slate-600',
        PENDING_BANK_CHANGE_REVIEW: 'bg-violet-100 text-violet-800',
        COMPLETED: 'bg-emerald-100 text-emerald-800',
    };

    const instructionStatusColors = {
        'Instruction Issued': 'bg-blue-100 text-blue-700',
        'Instruction Delivered': 'bg-indigo-100 text-indigo-700',
        'Confirmed by Bank': 'bg-emerald-100 text-emerald-700',
        'Awaiting Confirmation': 'bg-amber-100 text-amber-800 animate-pulse',
    };

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[96vh] flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-6 py-4 flex justify-between items-start shrink-0">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-lg font-black tracking-tight">{lg.lg_ref_number}</h2>
                                <CopyBadge text={lg.lg_ref_number} variant="icon" className="text-white/60 hover:text-white hover:bg-slate-700/60" />
                                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${statusColors[lg.status] || 'bg-slate-100 text-slate-600'}`}>
                                    {lg.status?.replace(/_/g, ' ')}
                                </span>
                            </div>
                            {lg.internal_serial && <p className="text-slate-400 text-xs font-mono">{lg.internal_serial}</p>}
                            <p className="text-slate-300 text-sm">{lg.beneficiary_name} · {lg.currency_code} {parseFloat(lg.current_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                        <button onClick={onClose} className="text-white/50 hover:text-white mt-1"><X className="w-5 h-5" /></button>
                    </div>

                    {/* Key Stats Bar */}
                    <div className="flex items-center gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 shrink-0 text-xs">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div><span className="text-slate-400">Bank</span><p className="font-bold text-slate-800">{lg.bank_name}</p></div>
                            <div className="border-l border-slate-200 pl-4"><span className="text-slate-400">Method</span><p className="font-bold text-slate-800">{methodLabels[lg.issuance_method] || lg.issuance_method || '—'}</p></div>
                            <div className="border-l border-slate-200 pl-4"><span className="text-slate-400">Issue Date</span><p className="font-bold text-slate-800">{lg.issue_date || '—'}</p></div>
                            <div className="border-l border-slate-200 pl-4"><span className="text-slate-400">Expiry</span><p className="font-bold text-slate-800">{lg.expiry_date || '—'}</p></div>
                            <div className="border-l border-slate-200 pl-4"><span className="text-slate-400">Request</span><p className="font-bold text-blue-600">{req?.id ? <button onClick={() => navigate('/end-user/issuance/requests', { state: { openRequestId: req.id } })} className="hover:underline cursor-pointer">{req.serial_number} ↗</button> : (req?.serial_number || '—')}</p></div>
                        </div>
                        {!readOnly && availableActions.some(a => a.type === 'CHANGE_OWNERSHIP') && (
                            <button
                                onClick={() => setShowChangeOwnerModal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-all shadow-sm shrink-0"
                            >
                                <Users className="w-3.5 h-3.5" />
                                Change Owner
                            </button>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-200 shrink-0">
                        {tabs.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === t.id ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 min-h-[400px]">
                        {/* TAB: Overview (Details + Bank & Facility + Original Request) */}
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left Column: LG Details */}
                                <div>
                                    <SmartSuggestions lg={lg} />
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">LG Details</h4>
                                    <div className="space-y-1">
                                        <DetailRow label="LG Reference" value={lg.lg_ref_number} mono />
                                        {lg.internal_serial && <DetailRow label="Internal Serial" value={lg.internal_serial} mono highlight />}
                                        <DetailRow label="Status" value={statusLabels[lg.status] || lg.status?.replace(/_/g, ' ')} />
                                        {lg.reference_validity_flag === 'EXCEEDED' && (
                                            <div className="flex items-center gap-2 py-2 px-3 bg-red-50 border border-red-200 rounded-xl">
                                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                                <span className="text-xs font-bold text-red-700">LG extends beyond contract/reference validity</span>
                                            </div>
                                        )}
                                        <DetailRow label="Beneficiary" value={lg.beneficiary_name} />
                                        <DetailRow label="Amount" value={`${lg.currency_code} ${parseFloat(lg.current_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} highlight />
                                        <DetailRow label="Issue Date" value={lg.issue_date} />
                                        <DetailRow label="Expiry Date" value={lg.expiry_date} />
                                        {lg.expiry_date && (() => { const cd = expiryCountdown(lg.expiry_date); return <DetailRow label="Time Remaining" value={<span className={cd.color}>{cd.text}</span>} />; })()}
                                        <DetailRow label="Method" value={methodLabels[lg.issuance_method] || lg.issuance_method} />
                                        <DetailRow label="Issued By" value={lg.issued_by_name} />
                                        <DetailRow label="Current Owner" value={lg.current_owner_name || 'N/A'} />
                                    </div>

                                    {/* Bank & Facility */}
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-5 mb-2">Bank & Facility</h4>
                                    <div className="space-y-1">
                                        <DetailRow label="Bank" value={lg.bank_name} />
                                        <DetailRow label="Facility" value={lg.facility_name} />
                                        <DetailRow label="Facility Ref" value={lg.facility_ref} mono />
                                        <DetailRow label="Sub-Limit" value={lg.sub_limit_name} />
                                        <DetailRow label="Bank Confirmation Ref" value={lg.bank_confirmation_ref} mono />
                                        <DetailRow label="Confirmation Date" value={lg.bank_confirmation_date} />
                                    </div>
                                    {/* Report Form Issue button — only when BANK_FORM was used, hidden for readOnly (corporate admin/checker) */}
                                    {!readOnly && lg.issuance_method === 'BANK_FORM' && (
                                        <button
                                            onClick={() => setShowFormIssue(true)}
                                            className="mt-3 flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                                        >
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            Report Form Issue
                                        </button>
                                    )}

                                    {/* Custody */}
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-5 mb-2">Custody & Original Copy</h4>
                                    <div className="space-y-1">
                                        <DetailRow label="Custody Holder" value={lg.custody_holder} />
                                        <DetailRow label="Collected By" value={lg.original_copy_collected_by} />
                                        <DetailRow label="Collected Date" value={lg.original_copy_collected_date} />
                                    </div>

                                    {/* Handover */}
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-5 mb-2">🤝 LG Handover</h4>
                                    {lg.handover_date ? (
                                        <div className="space-y-1">
                                            <DetailRow label="Handover Date" value={lg.handover_date} />
                                            <DetailRow label="Recipient" value={lg.recipient_name} />
                                            {lg.recipient_email && <DetailRow label="Recipient Email" value={lg.recipient_email} />}
                                            {lg.recipient_department && <DetailRow label="Department" value={lg.recipient_department} />}
                                            {lg.recipient_job_title && <DetailRow label="Job Title" value={lg.recipient_job_title} />}
                                            {lg.recipient_phone && <DetailRow label="Phone" value={lg.recipient_phone} />}
                                            {lg.recipient_employee_id && <DetailRow label="Employee ID" value={lg.recipient_employee_id} />}
                                            {lg.handover_notes && <DetailRow label="Notes" value={lg.handover_notes} />}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">Not yet handed over.</p>
                                    )}

                                    {/* Pricing Details */}
                                    {lg.sub_limit_id && lg.facility_pricing ? (
                                        <>
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-5 mb-2">
                                                💰 Facility Pricing <span className="text-emerald-500 font-normal">(from sub-limit)</span>
                                            </h4>
                                            <div className="space-y-1">
                                                {lg.facility_pricing.commission_rate != null && <DetailRow label="Commission %" value={`${lg.facility_pricing.commission_rate}%`} />}
                                                {lg.facility_pricing.min_commission != null && <DetailRow label="Min Commission" value={lg.facility_pricing.min_commission} />}
                                                {lg.facility_pricing.flat_fee != null && <DetailRow label="Flat Fee" value={lg.facility_pricing.flat_fee} />}
                                                {lg.facility_pricing.margin_pct != null && <DetailRow label="Cash Margin %" value={`${lg.facility_pricing.margin_pct}%`} />}
                                            </div>
                                        </>
                                    ) : (
                                        <ManualPricingPanel lgId={lg.id} initialPricing={lg.manual_pricing} readOnly={readOnly} />
                                    )}
                                </div>

                                {/* Right Column: Original Request */}
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Original Request</h4>
                                    {req ? (
                                        <div className="space-y-1">
                                            <DetailRow label="Request Serial" value={req.serial_number} mono />
                                            <DetailRow label="Request Status" value={req.status?.replace(/_/g, ' ')} />
                                            <DetailRow label="LG Type" value={req.lg_type} />
                                            <DetailRow label="Beneficiary" value={req.beneficiary_name} />
                                            <DetailRow label="Beneficiary Address" value={req.beneficiary_address} />
                                            <DetailRow label="Amount" value={`${lg.currency_code} ${parseFloat(req.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} highlight />
                                            <DetailRow label="Requested Expiry" value={req.requested_expiry_date} />
                                            <DetailRow label="Purpose / Wording" value={req.lg_purpose} />
                                            <DetailRow label="Reference Type" value={req.reference_type} />
                                            <DetailRow label="Reference #" value={req.reference_number} mono />
                                            <DetailRow label="Reference End Date" value={req.reference_end_date || '—'} />
                                            <DetailRow label="Project" value={req.project_name} />
                                            <DetailRow label="Department" value={req.department} />
                                            <DetailRow label="Cross-Border" value={req.is_cross_border ? 'Yes' : 'No'} />
                                            {req.applicable_rules && <DetailRow label="Applicable Rules" value={{
                                                'URDG_758': 'URDG 758 (ICC)', 'ISP_98': 'ISP98 (ICC)', 'LOCAL_LAW': 'Local Law'
                                            }[req.applicable_rules] || req.applicable_rules} highlight />}
                                            {req.cross_border_details?.advising_bank_name && <DetailRow label="Advising Bank" value={req.cross_border_details.advising_bank_name} />}
                                            {req.cross_border_details?.delivery_channel && <DetailRow label="Delivery Channel" value={req.cross_border_details.delivery_channel.replace(/_/g, ' ')} />}
                                            <DetailRow label="Third-Party" value={req.is_third_party ? 'Yes' : 'No'} />
                                            <DetailRow label="Special Wording" value={req.requires_special_wording ? 'Yes' : 'No'} />
                                            {req.other_conditions && <DetailRow label="Other Conditions" value={req.other_conditions} />}
                                            <DetailRow label="Submitted At" value={req.submitted_at ? new Date(req.submitted_at).toLocaleString() : null} />
                                            {req.treasury_enrichment && Object.keys(req.treasury_enrichment).length > 0 && (
                                                <>
                                                    <div className="col-span-full border-t border-emerald-200 mt-2 pt-2">
                                                        <span className="text-[10px] font-bold text-emerald-700 uppercase">Treasury Enrichment</span>
                                                    </div>
                                                    {req.treasury_enrichment.margin_instructions && <DetailRow label="Margin" value={req.treasury_enrichment.margin_instructions} />}
                                                    {req.treasury_enrichment.internal_notes && <DetailRow label="Notes" value={req.treasury_enrichment.internal_notes} />}
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-slate-400">
                                            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                            <p className="font-medium">No linked request found</p>
                                            <p className="text-xs mt-1">This LG may have been created manually</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB: Timeline (Tracking + Activity Log) */}
                        {activeTab === 'timeline' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left: Post-Issuance Tracker */}
                                <div>
                                    <PostIssuanceTracker
                                        lgId={lg.id}
                                        readOnly={readOnly}
                                        onStatusChange={() => { /* could refresh parent */ }}
                                    />
                                </div>
                                {/* Right: Activity Log */}
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Activity Log</h4>
                                    {lifecycleTimeline.length > 0 ? (
                                        <div className="relative pl-6">
                                            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200" />
                                            <div className="space-y-4">
                                                {lifecycleTimeline.map((evt, i) => (
                                                    <div key={i} className="relative flex items-start gap-3">
                                                        <div className={`absolute -left-6 mt-1 w-[22px] h-[22px] rounded-full flex items-center justify-center text-xs z-10 border-2 border-white shadow-sm ${evt.color}`}>
                                                            <span style={{ fontSize: '11px' }}>{evt.icon}</span>
                                                        </div>
                                                        <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-200">
                                                            <div className="flex items-center justify-between flex-wrap gap-1">
                                                                <p className="text-sm font-bold text-slate-800">{evt.label}</p>
                                                                <p className="text-[10px] text-slate-400">
                                                                    {evt.timestamp ? new Date(evt.timestamp).toLocaleString() : '—'}
                                                                </p>
                                                            </div>
                                                            {evt.actor && (
                                                                <p className="text-xs text-slate-500 mt-0.5">By: {evt.actor}</p>
                                                            )}
                                                            {evt.detail && (
                                                                <p className="text-xs text-slate-500 mt-0.5">{evt.detail}</p>
                                                            )}
                                                            {evt.notes && (
                                                                <p className="text-xs text-slate-400 mt-1 italic">"{evt.notes}"</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-slate-400">
                                            <Clock className="w-8 h-8 mx-auto mb-2" />
                                            <p className="font-medium">No activity recorded yet</p>
                                            <p className="text-xs mt-1">The lifecycle timeline will populate as actions occur</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'maintenance' && (
                            <div className="space-y-4">
                                {/* Action Buttons — hidden for readOnly (corporate admin / checker) */}
                                {!readOnly && (
                                <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 rounded-xl border border-slate-200">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {availableActions.map(action => {
                                            const cfg = actionButtonConfig[action.type];
                                            if (!cfg) return null;
                                            const BtnIcon = cfg.icon;
                                            return (
                                                <button key={action.type} onClick={() => { 
                                                        if (action.type === 'CHANGE_OWNERSHIP') {
                                                            setShowChangeOwnerModal(true);
                                                        } else {
                                                            setActionModal(action.type); setFormData({}); 
                                                        }
                                                    }}
                                                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-white text-xs font-bold shadow-sm transition-all ${cfg.color}`}
                                                >
                                                    <BtnIcon className="w-4 h-4" />
                                                    {action.label || cfg.label}
                                                </button>
                                            );
                                        })}
                                        <button onClick={() => { setBankInitiatedModal(true); setBankInitiatedFile(null); }}
                                            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-white text-xs font-bold shadow-sm transition-all bg-violet-600 hover:bg-violet-700">
                                            🏦 Record Bank Action
                                        </button>
                                    </div>
                                </div>
                                )}

                                {/* AI Bank-Initiated Diff Result */}
                                {bankInitiatedResult && (
                                    <div className="bg-violet-50 border-2 border-violet-300 rounded-xl p-4 animate-pulse-once">
                                        <h4 className="text-sm font-black text-violet-800 mb-2">🧠 AI Detected Changes from Bank Letter</h4>
                                        <p className="text-xs text-violet-600 mb-3">{bankInitiatedResult.message}</p>
                                        <div className="bg-white rounded-lg border border-violet-200 p-3 mb-3">
                                            <p className="text-xs font-bold text-slate-500 mb-2">Detected Type: <span className="text-violet-700">{bankInitiatedResult.detected_type?.replace(/_/g, ' ')}</span></p>
                                            {bankInitiatedResult.changes?.length > 0 ? (
                                                <table className="w-full text-xs">
                                                    <thead><tr className="text-left text-slate-400"><th className="pb-1">Field</th><th className="pb-1">Before</th><th className="pb-1">After</th></tr></thead>
                                                    <tbody>
                                                        {bankInitiatedResult.changes.map((c, i) => (
                                                            <tr key={i} className="border-t border-slate-100">
                                                                <td className="py-1 font-mono text-slate-600">{c.field}</td>
                                                                <td className="py-1 text-red-500 line-through">{c.old}</td>
                                                                <td className="py-1 text-emerald-600 font-bold">{c.new}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <p className="text-xs text-slate-400">No specific field changes detected</p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleConfirmBankChange(bankInitiatedResult.action_id)}
                                                className="px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-colors">
                                                ✅ Apply Changes
                                            </button>
                                            <button onClick={() => setBankInitiatedResult(null)}
                                                className="px-4 py-2 bg-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-300 transition-colors">
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Action History */}
                                <div>
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Action History</h4>
                                    {loadingActions ? (
                                        <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div>
                                    ) : maintenanceActions.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400">
                                            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                            <p className="text-sm font-medium">No maintenance actions yet</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {maintenanceActions.map(a => (
                                                <div key={a.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-sm font-bold text-slate-800">{a.action_type.replace(/_/g, ' ')}</span>
                                                            {a.letter_serial_number && <span className="text-[10px] font-mono text-slate-400">{a.letter_serial_number}</span>}
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${actionStatusColors[a.status] || 'bg-slate-100 text-slate-600'}`}>
                                                                {a.status.replace(/_/g, ' ')}
                                                            </span>
                                                            {a.initiation_source && a.initiation_source !== 'INTERNAL_USER' && (
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-violet-100 text-violet-700">
                                                                    {a.initiation_source === 'REQUESTOR_PORTAL' ? '👤 Requestor' : a.initiation_source === 'BANK_INITIATED' ? '🏦 Bank' : a.initiation_source.replace(/_/g, ' ')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {a.instruction_status && (
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    try {
                                                                        const blob = await apiRequest(`/issuance/maintenance/${a.id}/document/letter`, 'GET', null, 'application/json', 'blob');
                                                                        const url = window.URL.createObjectURL(blob);
                                                                        window.open(url, '_blank');
                                                                    } catch (err) {
                                                                        toast.error(err.message || 'Failed to load instruction letter.');
                                                                    }
                                                                }}
                                                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold cursor-pointer hover:opacity-80 transition-opacity ${instructionStatusColors[a.instruction_status] || 'bg-slate-100'}`}
                                                                title="Click to view instruction letter"
                                                            >
                                                                📄 {a.instruction_status}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="mt-1.5 text-xs text-slate-500 space-y-0.5">
                                                        {a.action_data?.new_expiry_date && <p>New Expiry: <strong>{a.action_data.new_expiry_date}</strong></p>}
                                                        {a.action_data?.new_amount && <p>New Amount: <strong>{parseFloat(a.action_data.new_amount).toLocaleString()}</strong></p>}
                                                        {a.action_data?.new_beneficiary_name && <p>New Beneficiary: <strong>{a.action_data.new_beneficiary_name}</strong></p>}
                                                        {a.action_data?.new_beneficiary_address && <p>New Address: <strong>{a.action_data.new_beneficiary_address}</strong></p>}
                                                        {a.action_data?.new_lg_purpose && <p>New Purpose: <strong>{a.action_data.new_lg_purpose}</strong></p>}
                                                        {a.action_data?.amendment_text && <p>Amendment: <strong>{a.action_data.amendment_text}</strong></p>}
                                                        {a.action_data?.liquidation_type && <p>Liquidation: <strong>{a.action_data.liquidation_type}</strong>{a.action_data.liquidation_amount ? ` \u2014 ${parseFloat(a.action_data.liquidation_amount).toLocaleString()}` : ''}</p>}
                                                        {a.action_data?.payment_method && <p>Payment: <strong>{a.action_data.payment_method}</strong> &mdash; {a.action_data.payment_amount ? parseFloat(a.action_data.payment_amount).toLocaleString() : ''} (Ref: {a.action_data.payment_reference || 'N/A'})</p>}
                                                        {a.notes && <p className="italic text-slate-400">Notes: {a.notes}</p>}
                                                        {a.bank_reply_notes && <p className="italic text-emerald-600">Bank Reply: {a.bank_reply_notes}</p>}
                                                        {/* Delivery & Bank Reply Date Badges (clickable when document exists) */}
                                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                                            {a.delivery_date ? (
                                                                a.delivery_document_path ? (
                                                                    <button onClick={async (e) => { e.stopPropagation(); try { const blob = await apiRequest(`/issuance/maintenance/${a.id}/document/delivery`, 'GET', null, 'application/json', 'blob'); if (blob && blob.size > 0 && blob.type !== 'application/json') { window.open(window.URL.createObjectURL(blob), '_blank'); } else { const res = JSON.parse(await blob.text()); if (res?.download_url) window.open(res.download_url, '_blank'); } } catch { toast.error('Failed to load delivery document'); } }} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer transition-colors" title="Click to download delivery proof">
                                                                        📦 Delivered {new Date(a.delivery_date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})} ⬇
                                                                    </button>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                                        📦 Delivered {new Date(a.delivery_date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}
                                                                    </span>
                                                                )
                                                            ) : null}
                                                            {a.bank_reply_date ? (
                                                                a.bank_reply_document_path ? (
                                                                    <button onClick={async (e) => { e.stopPropagation(); try { const blob = await apiRequest(`/issuance/maintenance/${a.id}/document/bank_reply`, 'GET', null, 'application/json', 'blob'); if (blob && blob.size > 0 && blob.type !== 'application/json') { window.open(window.URL.createObjectURL(blob), '_blank'); } else { const res = JSON.parse(await blob.text()); if (res?.download_url) window.open(res.download_url, '_blank'); } } catch { toast.error('Failed to load bank reply document'); } }} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 cursor-pointer transition-colors" title="Click to download bank reply document">
                                                                        🏦 Replied {new Date(a.bank_reply_date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})} ⬇
                                                                    </button>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                                                        🏦 Replied {new Date(a.bank_reply_date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}
                                                                    </span>
                                                                )
                                                            ) : null}
                                                        </div>
                                                        {/* F3: AI Verification Result */}
                                                        {a.action_data?.ai_verification && (
                                                            <div className={`mt-1.5 p-2 rounded-lg border ${
                                                                a.action_data.ai_verification.status === 'verified' ? 'bg-emerald-50 border-emerald-200' :
                                                                a.action_data.ai_verification.status === 'mismatch' ? 'bg-amber-50 border-amber-200' :
                                                                'bg-slate-50 border-slate-200'
                                                            }`}>
                                                                <p className={`text-[10px] font-bold uppercase ${
                                                                    a.action_data.ai_verification.status === 'verified' ? 'text-emerald-700' :
                                                                    a.action_data.ai_verification.status === 'mismatch' ? 'text-amber-700' :
                                                                    'text-slate-600'
                                                                }`}>
                                                                    🤖 AI Verification: {a.action_data.ai_verification.status}
                                                                </p>
                                                                {(a.action_data.ai_verification.matches || []).map((m, i) => (
                                                                    <p key={`m-${i}`} className="text-[10px] text-emerald-600">✓ {m}</p>
                                                                ))}
                                                                {(a.action_data.ai_verification.mismatches || []).map((m, i) => (
                                                                    <p key={`mm-${i}`} className="text-[10px] text-amber-700">⚠ {m}</p>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <p className="text-[10px] text-slate-400 mt-1">{a.created_at ? new Date(a.created_at).toLocaleString() : ''}</p>
                                                        {/* Bank-initiated document download (if no badge handles it) */}
                                                        {a.action_data?.bank_document_gcs && (
                                                            <div className="mt-1 flex flex-wrap gap-1.5">
                                                                <button onClick={async (e) => { e.stopPropagation(); try { const blob = await apiRequest(`/issuance/maintenance/${a.id}/document/bank_initiated`, 'GET', null, 'application/json', 'blob'); if (blob && blob.size > 0 && blob.type !== 'application/json') { window.open(window.URL.createObjectURL(blob), '_blank'); } else { const res = JSON.parse(await blob.text()); if (res?.download_url) window.open(res.download_url, '_blank'); } } catch { toast.error('Failed to load document'); } }} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 cursor-pointer transition-colors" title="Click to download bank letter">
                                                                    📄 Bank Letter ⬇
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Action Buttons based on instruction_status — hidden for corporate admin / checker (readOnly) */}
                                                    {!readOnly && a.status === 'EXECUTED' && a.instruction_status && a.instruction_status !== 'Confirmed by Bank' && (
                                                        <div className="mt-2 flex gap-2">
                                                            {(a.instruction_status === 'Instruction Issued' || a.instruction_status === 'Printed') && !a.delivery_date && (
                                                                <button
                                                                    onClick={() => setDeliveryModal({ ...a, lg_number: lg.lg_ref_number || lg.lg_number })}
                                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                                                                >
                                                                    📦 Record Delivery
                                                                </button>
                                                            )}
                                                            {(a.instruction_status === 'Instruction Issued' || a.instruction_status === 'Printed') && !a.delivery_date && (
                                                                <button
                                                                    onClick={() => handleCancelAction(a.id)}
                                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                                                                >
                                                                    ❌ Cancel
                                                                </button>
                                                            )}
                                                            {(a.instruction_status === 'Instruction Issued' || a.instruction_status === 'Printed' || a.instruction_status === 'Instruction Delivered') && (
                                                                <button
                                                                    onClick={() => setBankReplyModal({ ...a, lg_number: lg.lg_ref_number || lg.lg_number })}
                                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                                                                >
                                                                    🏦 Record Bank Reply
                                                                </button>
                                                            )}
                                                            {a.instruction_status === 'Awaiting Confirmation' && (
                                                                <div className="w-full mt-1 p-3 bg-amber-50 border border-amber-300 rounded-xl">
                                                                    <p className="text-xs font-bold text-amber-800 mb-2">⚠️ AI Verification Needs Your Review</p>
                                                                    <p className="text-[10px] text-amber-700 mb-3">The AI detected discrepancies between the bank reply and expected changes. Please review and decide.</p>
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => handleConfirmBankReply(a.id)}
                                                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                                                                        >
                                                                            ✅ Proceed Anyway
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleCancelBankReply(a.id)}
                                                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                                                                        >
                                                                            ❌ Cancel & Re-upload
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB: Documents */}
                        {activeTab === 'documents' && (
                            <DocumentsTab lgId={lg.id} />
                        )}

                        {/* TAB: Activity Log — Full Lifecycle Timeline */}
                        {activeTab === 'audit' && (
                            lifecycleTimeline.length > 0 ? (
                                <div className="relative pl-6">
                                    {/* Vertical timeline line */}
                                    <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200" />
                                    <div className="space-y-4">
                                        {lifecycleTimeline.map((evt, i) => (
                                            <div key={i} className="relative flex items-start gap-3">
                                                {/* Timeline dot */}
                                                <div className={`absolute -left-6 mt-1 w-[22px] h-[22px] rounded-full flex items-center justify-center text-xs z-10 border-2 border-white shadow-sm ${evt.color}`}>
                                                    <span style={{ fontSize: '11px' }}>{evt.icon}</span>
                                                </div>
                                                {/* Content */}
                                                <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-200">
                                                    <div className="flex items-center justify-between flex-wrap gap-1">
                                                        <p className="text-sm font-bold text-slate-800">{evt.label}</p>
                                                        <p className="text-[10px] text-slate-400">
                                                            {evt.timestamp ? new Date(evt.timestamp).toLocaleString() : '—'}
                                                        </p>
                                                    </div>
                                                    {evt.actor && (
                                                        <p className="text-xs text-slate-500 mt-0.5">By: {evt.actor}</p>
                                                    )}
                                                    {evt.detail && (
                                                        <p className="text-xs text-slate-500 mt-0.5">{evt.detail}</p>
                                                    )}
                                                    {evt.notes && (
                                                        <p className="text-xs text-slate-400 mt-1 italic">"{evt.notes}"</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    <Clock className="w-8 h-8 mx-auto mb-2" />
                                    <p className="font-medium">No activity recorded yet</p>
                                    <p className="text-xs mt-1">The lifecycle timeline will populate as actions occur</p>
                                </div>
                            )
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                            Close
                        </button>
                        {['INTERNAL_PROCESSING', 'DELIVERED_TO_BANK'].includes(lg.status) && (
                            <button
                                onClick={() => setCancelModal(true)}
                                disabled={cancellingLG}
                                className="flex items-center gap-1.5 px-3 py-2 text-slate-400 hover:text-red-600 rounded-md text-xs transition-colors disabled:opacity-50"
                            >
                                <XCircle className="w-3.5 h-3.5" /> Cancel & Reopen
                            </button>
                        )}
                        {lg.status === 'CANCEL_REQUESTED' && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-md text-xs font-medium">
                                <Clock className="w-3.5 h-3.5" /> Cancellation Pending Approval
                            </span>
                        )}
                    </div>
                        {!['CANCELLED', 'SLA_EXCEEDED', 'BANK_REJECTED', 'CANCEL_REQUESTED'].includes(lg.status) && (
                        lg.status === 'ACTIVE' ? (
                            <button
                                onClick={handleReprint}
                                disabled={reprinting}
                                className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 disabled:opacity-50 shadow-lg transition-all"
                            >
                                {reprinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                                View LG
                            </button>
                        ) : lg.issuance_method === 'COMPANY_LETTER' ? (
                            <button
                                onClick={handleReprint}
                                disabled={reprinting}
                                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-lg transition-all"
                            >
                                {reprinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                                Reprint Letter
                            </button>
                        ) : lg.issuance_method === 'BANK_FORM' ? (
                            <button
                                onClick={handleReprint}
                                disabled={reprinting}
                                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-lg transition-all"
                            >
                                {reprinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                                Reprint Bank Form
                            </button>
                        ) : lg.issuance_method && lg.issuance_method !== 'MANUAL' ? (
                            <button
                                onClick={handleReprint}
                                disabled={reprinting}
                                className="flex items-center gap-2 px-5 py-2 bg-slate-600 text-white text-sm font-bold rounded-xl hover:bg-slate-700 disabled:opacity-50 shadow-lg transition-all"
                            >
                                {reprinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                View LG Document
                            </button>
                        ) : null
                        )}
                    </div>
                </div>
            </div>

            {/* CANCEL & REOPEN MODAL */}
            {cancelModal && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setCancelModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-200">
                            <h3 className="text-base font-bold text-slate-900">Cancel Bank Request</h3>
                            <p className="text-xs text-slate-500 mt-1">This will close this LG attempt and reopen the original request for reprocessing.</p>
                        </div>
                        <div className="px-6 py-4 space-y-4">
                            <div>
                                <label className="text-xs font-medium text-slate-600">Cancellation Reason *</label>
                                <textarea
                                    value={cancelReason}
                                    onChange={e => setCancelReason(e.target.value)}
                                    placeholder="Why is this bank request being cancelled?"
                                    className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-300"
                                    rows={3}
                                />
                            </div>
                            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-2">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-semibold text-orange-700">Issue Cancellation Notice to Bank</p>
                                        <p className="text-[10px] text-orange-600 mt-0.5">
                                            Recommended: send a formal letter to the bank to avoid late issuance risk.
                                        </p>
                                    </div>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cancelWithLetter}
                                        onChange={e => setCancelWithLetter(e.target.checked)}
                                        className="w-4 h-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                                    />
                                    <span className="text-xs font-medium text-orange-700">Generate cancellation notice</span>
                                </label>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                            <button onClick={() => setCancelModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                Back
                            </button>
                            <button
                                onClick={handleCancelLG}
                                disabled={cancellingLG || !cancelReason.trim()}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                                {cancellingLG ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                Cancel & Reopen Request
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ACTION MODAL */}
            <MaintenanceActionModal
                isOpen={!!actionModal}
                actionType={actionModal}
                lg={lg}
                onClose={() => setActionModal(null)}
                onSubmit={(type, formData, file) => {
                    // Update the local state so the existing handleCreateAction function picks it up
                    setFormData(formData);
                    setSupportFile(file);
                    // A slight delay ensures state is updated before handleCreateAction reads it
                    setTimeout(() => handleCreateAction(type, formData, file), 0);
                }}
                submitting={submitting}
            />

            {/* CHANGE OWNERSHIP MODAL */}
            {showChangeOwnerModal && (
                <ChangeRequestorModal
                    lgRecords={[lg]}
                    onClose={() => setShowChangeOwnerModal(false)}
                    onSuccess={() => {
                        setShowChangeOwnerModal(false);
                        fetchMaintenanceActions();
                        fetchAvailableActions();
                    }}
                />
            )}

            {/* RECORD DELIVERY MODAL (Unified) */}
            {deliveryModal && (
                <RecordDeliveryModal
                    instruction={deliveryModal}
                    onClose={() => setDeliveryModal(null)}
                    onSuccess={handleDeliverySuccess}
                    apiUrl={`/issuance/lg-records/${deliveryModal.issued_lg_id}/record-delivery`}
                />
            )}

            {/* RECORD BANK REPLY MODAL (Unified) */}
            {bankReplyModal && (
                <RecordBankReplyModal
                    instruction={bankReplyModal}
                    onClose={() => setBankReplyModal(null)}
                    onSuccess={handleBankReplySuccess}
                    apiUrl={`/issuance/maintenance/${bankReplyModal.id}/bank-reply`}
                />
            )}

            {/* BANK FORM ISSUE REPORT MODAL */}
            {showFormIssue && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowFormIssue(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-3 border-b border-slate-200">
                            <h3 className="text-lg font-black text-slate-900">Report Form Issue</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Bank: {lg.bank_name} &middot; Method: Bank Form</p>
                        </div>
                        <div className="p-5">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Issue Type</label>
                                    <select value={formIssueData.issue_type}
                                        onChange={e => setFormIssueData({ ...formIssueData, issue_type: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm">
                                        <option value="MISSING_BANK_FORM">Missing Bank Form</option>
                                        <option value="MISSING_FIELD">Missing Field</option>
                                        <option value="INCORRECT_FORMAT">Incorrect Format / Wrong Field</option>
                                        <option value="OUTDATED_TEMPLATE">Outdated Template</option>
                                        <option value="LAYOUT_ERROR">Layout Error</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                {formIssueTemplates.length > 0 ? (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Specific Form</label>
                                        <select value={formIssueData.form_config_id}
                                            onChange={e => setFormIssueData({ ...formIssueData, form_config_id: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm">
                                            <option value="">All forms / General</option>
                                            {formIssueTemplates.map(t => (
                                                <option key={t.id} value={t.id}>{t.name} (v{t.version})</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : <div />}
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Field Name <span className="font-normal text-slate-400">(opt.)</span></label>
                                    <input type="text" value={formIssueData.field_name}
                                        onChange={e => setFormIssueData({ ...formIssueData, field_name: e.target.value })}
                                        placeholder="e.g. Beneficiary Address"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Severity</label>
                                    <div className="flex gap-1.5">
                                        {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => (
                                            <button key={s} onClick={() => setFormIssueData({ ...formIssueData, severity: s })}
                                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                                                    formIssueData.severity === s
                                                        ? s === 'CRITICAL' ? 'bg-red-600 text-white' : s === 'HIGH' ? 'bg-orange-500 text-white' : s === 'MEDIUM' ? 'bg-amber-500 text-white' : 'bg-slate-500 text-white'
                                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                }`}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Description *</label>
                                    <textarea rows={2} value={formIssueData.description}
                                        onChange={e => setFormIssueData({ ...formIssueData, description: e.target.value })}
                                        placeholder="Describe the issue in detail..."
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Attachment <span className="font-normal text-slate-400">(optional)</span></label>
                                    <input type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.bmp,.doc,.docx,.xls,.xlsx"
                                        onChange={e => setFormIssueFile(e.target.files[0] || null)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-700" />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                            <button onClick={() => setShowFormIssue(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                            <button onClick={handleFormIssueSubmit} disabled={submittingIssue || !formIssueData.description.trim()}
                                className="px-5 py-2 bg-amber-600 text-white text-sm font-bold rounded-xl hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
                                {submittingIssue ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
                                Submit Report
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BANK-INITIATED CHANGE UPLOAD MODAL */}
            {bankInitiatedModal && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setBankInitiatedModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-violet-200 bg-gradient-to-r from-violet-50 to-violet-100 rounded-t-2xl">
                            <h3 className="text-lg font-black text-violet-900">🏦 Record Bank Action</h3>
                            <p className="text-xs text-violet-600 mt-1">Upload a bank letter — AI will extract and detect what changed</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Bank Letter (PDF or Image)</label>
                                <input type="file" accept=".pdf,image/*"
                                    onChange={e => setBankInitiatedFile(e.target.files[0])}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-violet-50 file:text-violet-700" />
                                <p className="text-[10px] text-slate-400 mt-1">The AI will OCR the document and compare against current LG data</p>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                            <button onClick={() => setBankInitiatedModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                            <button onClick={handleBankInitiatedUpload} disabled={bankInitiatedUploading || !bankInitiatedFile}
                                className="px-5 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2">
                                {bankInitiatedUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : '🧠'}
                                {bankInitiatedUploading ? 'Analyzing...' : 'Upload & Analyze'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function IssuedLGsPage() {
    const navigate = useNavigate();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [bankFilter, setBankFilter] = useState('ALL');
    const [currencyFilter, setCurrencyFilter] = useState('ALL');
    const [expiryFrom, setExpiryFrom] = useState('');
    const [expiryTo, setExpiryTo] = useState('');
    const [sortField, setSortField] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedLG, setSelectedLG] = useState(null);
    const [pageTab, setPageTab] = useState('LGS'); // 'LGS' | 'REQUESTORS'

    // Detect user role from JWT to gate maintenance actions
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
    const isCorporateAdmin = userRole === 'corporate_admin' || userRole === 'checker';

    // Bank form issue reporting (page-level)
    const [showPageFormIssue, setShowPageFormIssue] = useState(false);
    const [pageFormIssueData, setPageFormIssueData] = useState({
        bank_id: '', issue_type: 'INCORRECT_FORMAT', description: '', field_name: '', severity: 'MEDIUM', form_config_id: '',
    });
    const [pageFormIssueFile, setPageFormIssueFile] = useState(null);
    const [submittingPageIssue, setSubmittingPageIssue] = useState(false);
    const [allBanks, setAllBanks] = useState([]);
    const [pageFormTemplates, setPageFormTemplates] = useState([]);

    // Fetch all banks for the report modal
    useEffect(() => {
        apiRequest('/issuance/banks', 'GET').then(data => setAllBanks(data || [])).catch(() => {});
    }, []);

    // Fetch form templates when bank changes
    useEffect(() => {
        if (pageFormIssueData.bank_id) {
            apiRequest(`/issuance/bank-forms?bank_id=${pageFormIssueData.bank_id}`, 'GET')
                .then(data => setPageFormTemplates(data || []))
                .catch(() => setPageFormTemplates([]));
        } else {
            setPageFormTemplates([]);
        }
    }, [pageFormIssueData.bank_id]);

    const handlePageFormIssueSubmit = async () => {
        if (!pageFormIssueData.bank_id) { toast.error('Please select a bank.'); return; }
        if (!pageFormIssueData.description.trim() || pageFormIssueData.description.trim().length < 3) { toast.error('Description must be at least 3 characters.'); return; }
        setSubmittingPageIssue(true);
        try {
            const fd = new FormData();
            fd.append('bank_id', parseInt(pageFormIssueData.bank_id));
            fd.append('issue_type', pageFormIssueData.issue_type);
            fd.append('description', pageFormIssueData.description);
            if (pageFormIssueData.field_name) fd.append('field_name', pageFormIssueData.field_name);
            fd.append('severity', pageFormIssueData.severity);
            if (pageFormIssueData.form_config_id) fd.append('form_config_id', pageFormIssueData.form_config_id);
            if (pageFormIssueFile) fd.append('attachment', pageFormIssueFile);
            await apiRequest('/issuance/bank-form-issues', 'POST', fd);
            toast.success('Form issue reported. The system owner will review it.');
            setShowPageFormIssue(false);
            setPageFormIssueFile(null);
            setPageFormIssueData({ bank_id: '', issue_type: 'INCORRECT_FORMAT', description: '', field_name: '', severity: 'MEDIUM', form_config_id: '' });
        } catch (err) {
            toast.error(err.message || 'Failed to submit report.');
        } finally {
            setSubmittingPageIssue(false);
        }
    };

    // Derive unique banks with IDs for the report form
    const uniqueBanksWithId = useMemo(() => {
        const seen = new Map();
        records.forEach(r => { if (r.bank_id && r.bank_name && !seen.has(r.bank_id)) seen.set(r.bank_id, r.bank_name); });
        return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }, [records]);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const data = await apiRequest('/issuance/issued-lgs', 'GET');
            setRecords(data || []);
        } catch (err) {
            toast.error('Failed to load issued LGs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRecords(); }, []);

    // Auto-open modal when navigated from Action Center with location state
    const location = useLocation();
    useEffect(() => {
        const openId = location.state?.openLgId;
        if (!openId || records.length === 0) return;
        const target = records.find(r => String(r.id) === String(openId));
        if (target) {
            setSelectedLG(target);
            // Clear state so closing the modal and re-renders don't re-open it
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [records, location.state]);

    const statusColors = {
        INTERNAL_PROCESSING: 'bg-amber-100 text-amber-800',
        ACTIVE: 'bg-emerald-100 text-emerald-800',
        LG_ISSUED: 'bg-emerald-100 text-emerald-800',
        EXPIRED: 'bg-slate-200 text-slate-600',
        CANCELLED: 'bg-red-100 text-red-700',
        PENDING_CLOSE: 'bg-orange-100 text-orange-800',
        CLOSED: 'bg-slate-300 text-slate-700',
        LIQUIDATED: 'bg-red-200 text-red-800',
        ISSUED: 'bg-blue-100 text-blue-800',
        DELIVERED_TO_BANK: 'bg-indigo-100 text-indigo-800',
        BANK_INQUIRY: 'bg-amber-100 text-amber-800',
        BANK_REJECTED: 'bg-red-100 text-red-700',
        SLA_EXCEEDED: 'bg-red-200 text-red-800',
        CANCEL_REQUESTED: 'bg-orange-100 text-orange-700',
        RETURNED: 'bg-teal-100 text-teal-800',
    };

    const methodLabels = {
        COMPANY_LETTER: 'Company Letter',
        BANK_FORM: 'Bank Form',
        BANK_API: 'Bank API',
        MANUAL: 'Manual',
        MANUAL_PDF: 'Manual PDF',
    };

    // Compute unique banks/currencies for filter dropdowns
    const uniqueBanks = useMemo(() => [...new Set(records.map(r => r.bank_name).filter(Boolean))].sort(), [records]);
    const uniqueCurrencies = useMemo(() => [...new Set(records.map(r => r.currency_code).filter(Boolean))].sort(), [records]);

    const activeFilterCount = [
        statusFilter !== 'ALL',
        bankFilter !== 'ALL',
        currencyFilter !== 'ALL',
        expiryFrom,
        expiryTo,
    ].filter(Boolean).length;

    const clearAllFilters = () => {
        setSearchTerm('');
        setStatusFilter('ALL');
        setBankFilter('ALL');
        setCurrencyFilter('ALL');
        setExpiryFrom('');
        setExpiryTo('');
    };

    const toggleSort = (field) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return <ArrowUp className="w-3 h-3 text-slate-300 opacity-0 group-hover/th:opacity-100 transition-opacity" />;
        return sortDir === 'asc'
            ? <ArrowUp className="w-3 h-3 text-blue-600" />
            : <ArrowDown className="w-3 h-3 text-blue-600" />;
    };

    const filtered = useMemo(() => {
        let result = records.filter(r => {
            const s = searchTerm.toLowerCase();
            const matchSearch = !searchTerm ||
                r.lg_ref_number?.toLowerCase().includes(s) ||
                r.internal_serial?.toLowerCase().includes(s) ||
                r.beneficiary_name?.toLowerCase().includes(s) ||
                r.bank_name?.toLowerCase().includes(s) ||
                r.request?.serial_number?.toLowerCase().includes(s);
            const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
            const matchBank = bankFilter === 'ALL' || r.bank_name === bankFilter;
            const matchCurrency = currencyFilter === 'ALL' || r.currency_code === currencyFilter;
            const matchExpiryFrom = !expiryFrom || (r.expiry_date && r.expiry_date >= expiryFrom);
            const matchExpiryTo = !expiryTo || (r.expiry_date && r.expiry_date <= expiryTo);
            return matchSearch && matchStatus && matchBank && matchCurrency && matchExpiryFrom && matchExpiryTo;
        });

        // Sort
        result.sort((a, b) => {
            let valA, valB;
            switch (sortField) {
                case 'internal_serial': valA = a.internal_serial || ''; valB = b.internal_serial || ''; break;
                case 'current_amount': valA = a.current_amount || 0; valB = b.current_amount || 0; break;
                case 'expiry_date': valA = a.expiry_date || ''; valB = b.expiry_date || ''; break;
                case 'issue_date': valA = a.issue_date || ''; valB = b.issue_date || ''; break;
                case 'bank_name': valA = a.bank_name || ''; valB = b.bank_name || ''; break;
                case 'beneficiary_name': valA = a.beneficiary_name || ''; valB = b.beneficiary_name || ''; break;
                default: valA = a.created_at || ''; valB = b.created_at || ''; break;
            }
            if (typeof valA === 'number') return sortDir === 'asc' ? valA - valB : valB - valA;
            return sortDir === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
        });

        return result;
    }, [records, searchTerm, statusFilter, bankFilter, currencyFilter, expiryFrom, expiryTo, sortField, sortDir]);

    const now30 = new Date(); now30.setDate(now30.getDate() + 30);
    const stats = {
        total: records.length,
        active: records.filter(r => ['ACTIVE', 'LG_ISSUED', 'DELIVERED_TO_BANK'].includes(r.status)).length,
        expiring: records.filter(r => {
            if (!r.expiry_date || r.status === 'EXPIRED') return false;
            const exp = new Date(r.expiry_date);
            return exp <= now30 && exp >= new Date();
        }).length,
        expired: records.filter(r => r.status === 'EXPIRED').length,
        pending: records.filter(r => r.status === 'INTERNAL_PROCESSING').length,
        totalAmount: records.filter(r => ['ACTIVE', 'LG_ISSUED', 'DELIVERED_TO_BANK'].includes(r.status)).reduce((sum, r) => sum + (r.current_amount || 0), 0),
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Issued LGs</h1>
                    <p className="text-sm text-slate-500 mt-1">Letters of Guarantee issued to banks — your external position</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Export Dropdown */}
                    <div className="relative group">
                        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-colors border border-emerald-200">
                            <Download className="w-4 h-4" /> Export
                        </button>
                        <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 hidden group-hover:block">
                            {[
                                { type: 'summary', label: '📊 Summary', desc: 'Key columns only' },
                                { type: 'detailed', label: '📋 Detailed', desc: 'All fields' },
                                { type: 'full_audit', label: '📜 Full Audit', desc: 'With action history' },
                            ].map(opt => (
                                <button
                                    key={opt.type}
                                    onClick={async () => {
                                        try {
                                            const params = new URLSearchParams({ export_type: opt.type });
                                            if (statusFilter !== 'ALL') params.append('status_filter', statusFilter);
                                            if (searchTerm) params.append('search', searchTerm);
                                            const response = await apiRequest(`/issuance/issued-lgs/export?${params}`, 'GET', null, { responseType: 'blob' });
                                            const blob = response instanceof Blob ? response : new Blob([response]);
                                            const url = window.URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `issued_lgs_${opt.type}.xlsx`;
                                            a.click();
                                            window.URL.revokeObjectURL(url);
                                            toast.success(`Exported ${opt.label.replace(/[^\w\s]/g, '').trim()}`);
                                        } catch (e) {
                                            toast.error('Export failed');
                                        }
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-slate-50 transition-colors"
                                >
                                    <p className="text-sm font-medium text-slate-800">{opt.label}</p>
                                    <p className="text-[10px] text-slate-400">{opt.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                    {!isCorporateAdmin && (
                    <button onClick={() => setShowPageFormIssue(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors border border-amber-200">
                        <AlertCircle className="w-4 h-4" /> Report Form Issue
                    </button>
                    )}
                    <button onClick={fetchRecords} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setPageTab('LGS')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${pageTab === 'LGS' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Issued LGs
                </button>
                <button
                    onClick={() => setPageTab('REQUESTORS')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${pageTab === 'REQUESTORS' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Requestor Directory
                </button>
            </div>

            {pageTab === 'REQUESTORS' ? (
                <RequestorDirectoryTab />
            ) : (
                <>
                    {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs text-slate-500 font-bold uppercase">Total</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm">
                    <p className="text-xs text-emerald-600 font-bold uppercase">Active</p>
                    <p className="text-2xl font-black text-emerald-700 mt-1">{stats.active}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
                    <p className="text-xs text-amber-600 font-bold uppercase">Expiring ≤30d</p>
                    <p className="text-2xl font-black text-amber-700 mt-1">{stats.expiring}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-red-200 shadow-sm">
                    <p className="text-xs text-red-600 font-bold uppercase">Expired</p>
                    <p className="text-2xl font-black text-red-700 mt-1">{stats.expired}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm">
                    <p className="text-xs text-purple-600 font-bold uppercase">Pending</p>
                    <p className="text-2xl font-black text-purple-700 mt-1">{stats.pending}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm">
                    <p className="text-xs text-blue-600 font-bold uppercase">Exposure</p>
                    <p className="text-lg font-black text-blue-700 mt-1">{stats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="space-y-3">
                <div className="flex gap-3 flex-wrap items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search by serial, ref, beneficiary, bank, or request..."
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium"
                    >
                        <option value="ALL">All Statuses</option>
                        {[...new Set(records.map(r => r.status))].sort().map(st => (
                            <option key={st} value={st}>{statusLabels[st] || st}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-sm font-medium transition-colors ${showFilters || activeFilterCount > 0 ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{activeFilterCount}</span>
                        )}
                    </button>
                    {(activeFilterCount > 0 || searchTerm) && (
                        <button onClick={clearAllFilters} className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium">
                            <X className="w-3.5 h-3.5" /> Clear All
                        </button>
                    )}
                </div>

                {/* Expanded filter panel */}
                {showFilters && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-4 items-end">
                        <div className="min-w-[160px]">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bank</label>
                            <select value={bankFilter} onChange={e => setBankFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                                <option value="ALL">All Banks</option>
                                {uniqueBanks.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                        <div className="min-w-[120px]">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Currency</label>
                            <select value={currencyFilter} onChange={e => setCurrencyFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                                <option value="ALL">All</option>
                                {uniqueCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="min-w-[140px]">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Expiry From</label>
                            <input type="date" value={expiryFrom} onChange={e => setExpiryFrom(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                        </div>
                        <div className="min-w-[140px]">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Expiry To</label>
                            <input type="date" value={expiryTo} onChange={e => setExpiryTo(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                        </div>
                    </div>
                )}
            </div>

            {/* Result Count */}
            {!loading && (
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Showing <strong className="text-slate-700">{filtered.length}</strong> of <strong className="text-slate-700">{records.length}</strong> issued LGs</span>
                    {sortField !== 'created_at' && (
                        <button onClick={() => { setSortField('created_at'); setSortDir('desc'); }} className="text-blue-600 hover:text-blue-700 font-medium">
                            Reset sort
                        </button>
                    )}
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="text-center py-12 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    Loading issued LGs...
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                    <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No issued LGs found</p>
                    <p className="text-xs text-slate-400 mt-1">
                        {activeFilterCount > 0 || searchTerm
                            ? 'Try adjusting your filters or search term'
                            : 'Issued LGs will appear here after you complete the issuance process'}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase cursor-pointer select-none group/th hover:text-slate-700 transition-colors" onClick={() => toggleSort('internal_serial')}>
                                        <div className="flex items-center gap-1">Serial # <SortIcon field="internal_serial" /></div>
                                    </th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">LG Type</th>
                                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase cursor-pointer select-none group/th hover:text-slate-700 transition-colors" onClick={() => toggleSort('current_amount')}>
                                        <div className="flex items-center justify-end gap-1">Amount <SortIcon field="current_amount" /></div>
                                    </th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase cursor-pointer select-none group/th hover:text-slate-700 transition-colors" onClick={() => toggleSort('expiry_date')}>
                                        <div className="flex items-center gap-1">Expiry <SortIcon field="expiry_date" /></div>
                                    </th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase cursor-pointer select-none group/th hover:text-slate-700 transition-colors" onClick={() => toggleSort('bank_name')}>
                                        <div className="flex items-center gap-1">Bank <SortIcon field="bank_name" /></div>
                                    </th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase cursor-pointer select-none group/th hover:text-slate-700 transition-colors" onClick={() => toggleSort('beneficiary_name')}>
                                        <div className="flex items-center gap-1">Beneficiary <SortIcon field="beneficiary_name" /></div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(r => {
                                    const cd = expiryCountdown(r.expiry_date);
                                    return (
                                        <tr
                                            key={r.id}
                                            className="hover:bg-slate-50 transition-colors cursor-pointer"
                                            onClick={() => setSelectedLG(r)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-slate-900">{r.internal_serial || '—'}</div>
                                                <div className="text-[11px] text-blue-600 font-medium">{r.lg_ref_number}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${statusColors[r.status] || 'bg-slate-100 text-slate-600'}`}>
                                                    {statusLabels[r.status] || r.status?.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-slate-700 truncate max-w-[150px]" title={r.request?.lg_type || 'Unknown'}>
                                                    {r.request?.lg_type || '—'}
                                                </div>
                                                <div className="text-[10px] text-slate-500 truncate max-w-[150px]" title={r.request?.lg_purpose || ''}>
                                                    {r.request?.lg_purpose || ''}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                                                {r.currency_code} {r.current_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-slate-600 text-xs">{r.expiry_date || '—'}</div>
                                                <div className={`text-[11px] ${cd.color}`}>{cd.text}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <Building className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-slate-700">{r.bank_name}</span>
                                                </div>
                                                {r.sub_limit_id && (
                                                    <div className="mt-1 flex">
                                                        <span className="text-[10px] font-bold bg-blue-50 border border-blue-200 text-blue-700 px-1.5 py-0.5 rounded uppercase tracking-wider">From Facility</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">{r.beneficiary_name}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
                </>
            )}

            {/* Detail Modal */}
            {selectedLG && (
                <IssuedLGDetailModal
                    lg={selectedLG}
                    onClose={() => { setSelectedLG(null); fetchRecords(); }}
                    readOnly={isCorporateAdmin}
                />
            )}

            {/* PAGE-LEVEL FORM ISSUE REPORT MODAL */}
            {showPageFormIssue && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowPageFormIssue(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-3 border-b border-slate-200">
                            <h3 className="text-lg font-black text-slate-900">Report Bank Form Issue</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Report a problem with a bank form template to the system administrator.</p>
                        </div>
                        <div className="p-5">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Bank *</label>
                                    <select value={pageFormIssueData.bank_id}
                                        onChange={e => setPageFormIssueData({ ...pageFormIssueData, bank_id: e.target.value, form_config_id: '' })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm">
                                        <option value="">Select bank...</option>
                                        {allBanks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                {pageFormTemplates.length > 0 ? (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Specific Form</label>
                                        <select value={pageFormIssueData.form_config_id}
                                            onChange={e => setPageFormIssueData({ ...pageFormIssueData, form_config_id: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm">
                                            <option value="">All forms / General</option>
                                            {pageFormTemplates.map(t => (
                                                <option key={t.id} value={t.id}>{t.name} (v{t.version})</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : <div />}
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Issue Type</label>
                                    <select value={pageFormIssueData.issue_type}
                                        onChange={e => setPageFormIssueData({ ...pageFormIssueData, issue_type: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm">
                                        <option value="MISSING_BANK_FORM">Missing Bank Form</option>
                                        <option value="MISSING_FIELD">Missing Field</option>
                                        <option value="INCORRECT_FORMAT">Incorrect Format / Wrong Field</option>
                                        <option value="OUTDATED_TEMPLATE">Outdated Template</option>
                                        <option value="LAYOUT_ERROR">Layout Error</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Field Name <span className="font-normal text-slate-400">(opt.)</span></label>
                                    <input type="text" value={pageFormIssueData.field_name}
                                        onChange={e => setPageFormIssueData({ ...pageFormIssueData, field_name: e.target.value })}
                                        placeholder="e.g. Beneficiary Address"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Description *</label>
                                    <textarea rows={2} value={pageFormIssueData.description}
                                        onChange={e => setPageFormIssueData({ ...pageFormIssueData, description: e.target.value })}
                                        placeholder="Describe the issue in detail..."
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Attachment <span className="font-normal text-slate-400">(optional)</span></label>
                                    <input type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.bmp,.doc,.docx,.xls,.xlsx"
                                        onChange={e => setPageFormIssueFile(e.target.files[0] || null)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-700" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Severity</label>
                                    <div className="flex gap-1.5">
                                        {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => (
                                            <button key={s} onClick={() => setPageFormIssueData({ ...pageFormIssueData, severity: s })}
                                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                                                    pageFormIssueData.severity === s
                                                        ? s === 'CRITICAL' ? 'bg-red-600 text-white' : s === 'HIGH' ? 'bg-orange-500 text-white' : s === 'MEDIUM' ? 'bg-amber-500 text-white' : 'bg-slate-500 text-white'
                                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                }`}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                            <button onClick={() => setShowPageFormIssue(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                            <button onClick={handlePageFormIssueSubmit} disabled={submittingPageIssue || !pageFormIssueData.description.trim() || !pageFormIssueData.bank_id}
                                className="px-5 py-2 bg-amber-600 text-white text-sm font-bold rounded-xl hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
                                {submittingPageIssue ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
                                Submit Report
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
