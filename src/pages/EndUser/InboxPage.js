import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, API_BASE_URL, getAuthToken } from '../../services/apiService';
import { toast } from 'react-toastify';
import {
    Inbox, Mail, Send, RefreshCw, CheckCircle2, AlertTriangle, AlertCircle,
    FileText, Calendar, Building2, ChevronDown, ChevronUp, Check, X, XCircle,
    Eye, Download, Loader2, Sparkles, Filter, Search, ArrowUpRight,
    Paperclip, ShieldCheck, ShieldAlert, Archive, HelpCircle, Layers, Settings
} from 'lucide-react';

const CLASSIFICATION_CONFIG = {
    LG_POSITION_REPORT: {
        label: 'LG Position Report',
        color: '#2563eb',
        bg: '#eff6ff',
        border: '#bfdbfe',
        icon: FileText
    },
    BANK_STATEMENT: {
        label: 'Bank Statement',
        color: '#059669',
        bg: '#ecfdf5',
        border: '#a7f3d0',
        icon: Layers
    },
    PROGRESS_REPORT: {
        label: 'Progress Report',
        color: '#d97706',
        bg: '#fffbeb',
        border: '#fde68a',
        icon: Sparkles
    },
    IRRELEVANT: {
        label: 'Irrelevant / Other',
        color: '#64748b',
        bg: '#f8fafc',
        border: '#cbd5e1',
        icon: XCircle
    },
    UNCLASSIFIED: {
        label: 'Unclassified',
        color: '#6b7280',
        bg: '#f3f4f6',
        border: '#e5e7eb',
        icon: HelpCircle
    }
};

const CONFIDENCE_BADGES = {
    HIGH: { label: 'High Confidence', color: '#16a34a', bg: '#dcfce7', icon: ShieldCheck },
    MEDIUM: { label: 'Medium Confidence', color: '#d97706', bg: '#fef3c7', icon: AlertTriangle },
    LOW: { label: 'Needs Verification', color: '#dc2626', bg: '#fee2e2', icon: ShieldAlert }
};

const SIGNAL_DEFINITIONS = {
    thread_match: {
        title: 'Thread Match to Outbound Request',
        icon: ArrowUpRight,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        formatDetail: (d) => `Matched to Outbound Request #${d.outbound_id || ''} (${d.request_type || 'LG_POSITION'}) — "${d.subject || ''}"`
    },
    subject_keyword_match: {
        title: 'Subject Keyword Match',
        icon: FileText,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        formatDetail: (d) => `Subject terms matched category keywords: ${d.category || 'Treasury Document'}`
    },
    nil_position_detected: {
        title: 'NIL / Zero Position Statement',
        icon: Sparkles,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        formatDetail: (d) => `Detected statement indicating zero exposure: "${d.statement || 'No outstanding'}"`
    },
    bank_domain_match: {
        title: 'Verified Bank Domain',
        icon: ShieldCheck,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        formatDetail: (d) => `Sender domain matches configured bank record (@${d.domain || ''})`
    },
    attachment_filename_match: {
        title: 'Attachment Name Match',
        icon: Paperclip,
        color: 'text-teal-600',
        bg: 'bg-teal-50',
        border: 'border-teal-200',
        formatDetail: (d) => `Attachment filename matches ${d.category || 'expected category'} pattern`
    },
    attachment_structure_match: {
        title: 'Document Column Structure',
        icon: Layers,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        formatDetail: (d) => `Excel/CSV columns match ${d.category || 'statement'} schema (${d.matched_columns || 0} columns)`
    },
    history_match: {
        title: 'Historical Sender Classification',
        icon: RefreshCw,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        formatDetail: (d) => `Sender pattern historically classified as ${d.previous_classification || 'Treasury'}`
    },
    generic_domain: {
        title: 'Generic Email Provider Penalty',
        icon: AlertTriangle,
        color: 'text-rose-600',
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        formatDetail: (d) => d.reason || 'Sender is using a generic email provider (e.g. Gmail/Yahoo)'
    },
    irrelevant_marketing: {
        title: 'Irrelevant / Marketing Signal',
        icon: XCircle,
        color: 'text-slate-600',
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        formatDetail: (d) => d.reason || 'Detected promotional, survey, or personal email keywords'
    }
};

export default function InboxPage() {
    const navigate = useNavigate();

    // State
    const [items, setItems] = useState([]);
    const [stats, setStats] = useState(null);
    const [banks, setBanks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [polling, setPolling] = useState(false);
    const [actioningId, setActioningId] = useState(null);

    // Filters
    const [activeTab, setActiveTab] = useState('ALL'); // ALL, LG_POSITION_REPORT, BANK_STATEMENT, PROGRESS_REPORT, UNCLASSIFIED, ACTIONED
    const [selectedBank, setSelectedBank] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Modals & Drawers
    const [selectedItem, setSelectedItem] = useState(null);
    const [confirmModalItem, setConfirmModalItem] = useState(null);
    const [confirmBankId, setConfirmBankId] = useState('');
    const [confirmPositionDate, setConfirmPositionDate] = useState('');
    const [showRawSignals, setShowRawSignals] = useState(false);
    const [expandedSignalKeys, setExpandedSignalKeys] = useState({});
    
    // Attachment Preview Modal
    const [previewData, setPreviewData] = useState(null);
    const [loadingPreviewId, setLoadingPreviewId] = useState(null);

    // Request Position Modal
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [reqBankId, setReqBankId] = useState('');
    const [reqPositionDate, setReqPositionDate] = useState(new Date().toISOString().split('T')[0]);
    const [reqCustomEmails, setReqCustomEmails] = useState('');
    const [reqNotes, setReqNotes] = useState('');
    const [sendingRequest, setSendingRequest] = useState(false);

    // Reclassify Popover State
    const [reclassifyItemId, setReclassifyItemId] = useState(null);

    // Initial Fetch
    useEffect(() => {
        fetchBanks();
        fetchStats();
        fetchItems();
    }, []);

    // Refetch items when filters change
    useEffect(() => {
        fetchItems();
    }, [activeTab, selectedBank]);

    const fetchBanks = async () => {
        try {
            const data = await apiRequest('/issuance/banks');
            setBanks(data || []);
        } catch (e) {
            console.error('Error loading banks:', e);
        }
    };

    const fetchStats = async () => {
        try {
            const data = await apiRequest('/inbox/stats');
            setStats(data);
        } catch (e) {
            console.error('Error loading stats:', e);
        }
    };

    const fetchItems = async () => {
        setLoading(true);
        try {
            let url = `/inbox/items?skip=0&limit=100`;
            if (activeTab === 'ACTIONED') {
                url += `&status=ACTIONED`;
            } else if (activeTab === 'ARCHIVED') {
                url += `&status=ARCHIVED`;
            } else if (activeTab !== 'ALL') {
                url += `&classification=${activeTab}`;
            }
            if (selectedBank) {
                url += `&bank_id=${selectedBank}`;
            }
            if (searchQuery) {
                url += `&search=${encodeURIComponent(searchQuery)}`;
            }

            const data = await apiRequest(url);
            setItems(data || []);
        } catch (e) {
            toast.error('Failed to load inbox items.');
        } finally {
            setLoading(false);
        }
    };

    const handlePollNow = async () => {
        setPolling(true);
        try {
            const res = await apiRequest('/inbox/poll-now', 'POST');
            toast.success(res.message || 'Mailbox polled successfully.');
            await fetchStats();
            await fetchItems();
        } catch (e) {
            toast.error(e.detail || 'Polling failed. Check your IMAP settings.');
        } finally {
            setPolling(false);
        }
    };

    const handleTabClick = (tabKey) => {
        if (activeTab === tabKey) {
            // Standard toggle: clicking active card returns to ALL
            setActiveTab('ALL');
        } else {
            setActiveTab(tabKey);
        }
    };

    const handleReclassify = async (itemId, newClass) => {
        try {
            await apiRequest(`/inbox/items/${itemId}/reclassify`, 'PUT', { classification: newClass });
            toast.success(`Item reclassified as ${CLASSIFICATION_CONFIG[newClass]?.label || newClass}`);
            setReclassifyItemId(null);
            await fetchStats();
            
            // Best Practice: If we are on a filtered view and this was the last item, return to ALL automatically
            if (activeTab !== 'ALL' && items.length <= 1) {
                setActiveTab('ALL');
            } else {
                await fetchItems();
            }

            if (selectedItem?.id === itemId) {
                const updated = await apiRequest(`/inbox/items/${itemId}`);
                setSelectedItem(updated);
            }
        } catch (e) {
            toast.error(e.detail || 'Failed to reclassify item');
        }
    };

    const handleArchive = async (itemId) => {
        try {
            await apiRequest(`/inbox/items/${itemId}/archive`, 'POST');
            toast.info('Item archived.');
            await fetchStats();
            
            // Best Practice: If on a filtered view and this was the last item, return to ALL automatically
            if (activeTab !== 'ALL' && items.length <= 1) {
                setActiveTab('ALL');
            } else {
                await fetchItems();
            }

            if (selectedItem?.id === itemId) {
                setSelectedItem(null);
            }
        } catch (e) {
            toast.error('Failed to archive item');
        }
    };

    const handleUnarchive = async (itemId) => {
        try {
            await apiRequest(`/inbox/items/${itemId}/unarchive`, 'POST');
            toast.success('Item restored back to active inbox.');
            await fetchStats();
            await fetchItems();
            if (selectedItem?.id === itemId) {
                const updated = await apiRequest(`/inbox/items/${itemId}`);
                setSelectedItem(updated);
            }
        } catch (e) {
            toast.error('Failed to restore item');
        }
    };

    const openConfirmModal = (item) => {
        setConfirmModalItem(item);
        setConfirmBankId(item.matched_bank_id ? String(item.matched_bank_id) : '');
        setConfirmPositionDate(item.received_at ? item.received_at.split('T')[0] : new Date().toISOString().split('T')[0]);
    };

    const executeConfirmAction = async () => {
        if (!confirmModalItem) return;
        setActioningId(confirmModalItem.id);

        try {
            const payload = {};
            if (confirmBankId) payload.override_bank_id = parseInt(confirmBankId);
            if (confirmPositionDate) payload.override_position_date = confirmPositionDate;

            const res = await apiRequest(`/inbox/items/${confirmModalItem.id}/confirm`, 'POST', payload);
            toast.success(res.message || 'Action executed successfully!');
            setConfirmModalItem(null);
            fetchStats();
            fetchItems();

            // If an LG Reconciliation Session was created, offer immediate navigation
            if (res.session_id) {
                toast.info(
                    <div>
                        <span>Reconciliation Session #{res.session_id} is ready.</span>{' '}
                        <button
                            onClick={() => navigate(`/end-user/issuance/reconciliation?sessionId=${res.session_id}`)}
                            className="font-bold underline ml-2 text-blue-800"
                        >
                            Open Reconciliation
                        </button>
                    </div>,
                    { autoClose: 8000 }
                );
            }
        } catch (e) {
            toast.error(e.detail || 'Execution failed. Check file format or bank assignment.');
        } finally {
            setActioningId(null);
        }
    };

    const handleSendPositionRequest = async (e) => {
        e.preventDefault();
        if (!reqBankId) {
            toast.warning('Please select a bank');
            return;
        }
        setSendingRequest(true);
        try {
            const payload = {
                bank_id: parseInt(reqBankId),
                request_type: 'LG_POSITION',
                position_date: reqPositionDate,
                custom_notes: reqNotes || undefined
            };
            if (reqCustomEmails && reqCustomEmails.trim()) {
                payload.custom_recipient_emails = reqCustomEmails.split(',').map(s => s.trim()).filter(Boolean);
            }

            await apiRequest('/inbox/request-position', 'POST', payload);
            toast.success('LG Position request email sent successfully!');
            setShowRequestModal(false);
            setReqNotes('');
            setReqCustomEmails('');
        } catch (e) {
            toast.error(e.detail || 'Failed sending position request email.');
        } finally {
            setSendingRequest(false);
        }
    };

    const handleDownloadAttachment = async (itemId, attachmentId = 1, fileName = 'attachment') => {
        try {
            const blob = await apiRequest(`/inbox/items/${itemId}/attachment/${attachmentId}`, 'GET', null, {}, 'blob');
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName || 'attachment';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e) {
            toast.error(e.detail || 'Failed to download attachment');
        }
    };

    const handlePreviewAttachment = async (itemId, attachmentId = 1) => {
        setLoadingPreviewId(attachmentId);
        try {
            const data = await apiRequest(`/inbox/items/${itemId}/attachment/${attachmentId}/preview`);
            setPreviewData(data);
        } catch (e) {
            toast.error(e.detail || 'Failed to load attachment preview.');
        } finally {
            setLoadingPreviewId(null);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* ─── Top Header & Primary Actions ─── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                        <Inbox className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-gray-900">Smart Inbox</h1>
                        </div>
                        <p className="text-sm text-gray-500">
                            Automated email ingestion, multi-signal classification, and direct action triggers.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                    <button
                        onClick={() => navigate('/corporate-admin/inbox/schedule')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition shadow-xs"
                        title="Configure Automated Bank Schedules"
                    >
                        <Settings className="w-4 h-4 text-gray-500" />
                        <span>Schedules</span>
                    </button>

                    <button
                        onClick={handlePollNow}
                        disabled={polling}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition shadow-xs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${polling ? 'animate-spin text-blue-600' : ''}`} />
                        <span>{polling ? 'Polling...' : 'Poll Now'}</span>
                    </button>

                    <button
                        onClick={() => setShowRequestModal(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition"
                    >
                        <Send className="w-3.5 h-3.5" />
                        <span>Request Position</span>
                    </button>
                </div>
            </div>

            {/* ─── Stats KPI Row ─── */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    <div
                        onClick={() => handleTabClick('ALL')}
                        className={`cursor-pointer p-3.5 rounded-xl border transition flex flex-col justify-between ${
                            activeTab === 'ALL'
                                ? 'border-blue-500 bg-blue-50/70 shadow-sm ring-1 ring-blue-400'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <span>All Ingested</span>
                            <Inbox className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mt-2">{stats.total_received}</div>
                    </div>

                    <div
                        onClick={() => handleTabClick('LG_POSITION_REPORT')}
                        className={`cursor-pointer p-3.5 rounded-xl border transition flex flex-col justify-between ${
                            activeTab === 'LG_POSITION_REPORT'
                                ? 'border-blue-500 bg-blue-50/70 shadow-sm ring-1 ring-blue-400'
                                : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/20'
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs font-semibold text-blue-600 uppercase tracking-wider">
                            <span>LG Position</span>
                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <div className="text-2xl font-bold text-blue-700 mt-2">{stats.lg_position_count}</div>
                    </div>

                    <div
                        onClick={() => handleTabClick('BANK_STATEMENT')}
                        className={`cursor-pointer p-3.5 rounded-xl border transition flex flex-col justify-between ${
                            activeTab === 'BANK_STATEMENT'
                                ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-400'
                                : 'border-gray-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/20'
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                            <span>Statements</span>
                            <Layers className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                        <div className="text-2xl font-bold text-emerald-700 mt-2">{stats.bank_statement_count}</div>
                    </div>

                    <div
                        onClick={() => handleTabClick('PROGRESS_REPORT')}
                        className={`cursor-pointer p-3.5 rounded-xl border transition flex flex-col justify-between ${
                            activeTab === 'PROGRESS_REPORT'
                                ? 'border-amber-500 bg-amber-50/70 shadow-sm ring-1 ring-amber-400'
                                : 'border-gray-200 bg-white hover:border-amber-200 hover:bg-amber-50/20'
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs font-semibold text-amber-600 uppercase tracking-wider">
                            <span>Progress</span>
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                        <div className="text-2xl font-bold text-amber-700 mt-2">{stats.progress_report_count}</div>
                    </div>

                    <div
                        onClick={() => handleTabClick('UNCLASSIFIED')}
                        className={`cursor-pointer p-3.5 rounded-xl border transition flex flex-col justify-between ${
                            activeTab === 'UNCLASSIFIED'
                                ? 'border-purple-500 bg-purple-50/70 shadow-sm ring-1 ring-purple-400'
                                : 'border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50/20'
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs font-semibold text-purple-600 uppercase tracking-wider">
                            <span>Unclassified</span>
                            <HelpCircle className="w-3.5 h-3.5 text-purple-500" />
                        </div>
                        <div className="text-2xl font-bold text-purple-700 mt-2">{stats.unclassified_count}</div>
                    </div>

                    <div
                        onClick={() => handleTabClick('IRRELEVANT')}
                        className={`cursor-pointer p-3.5 rounded-xl border transition flex flex-col justify-between ${
                            activeTab === 'IRRELEVANT'
                                ? 'border-slate-500 bg-slate-100/90 shadow-sm ring-1 ring-slate-400'
                                : 'border-gray-200 bg-white hover:border-slate-300 hover:bg-slate-50/30'
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <span>Irrelevant</span>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <div className="text-2xl font-bold text-slate-700 mt-2">{stats.irrelevant_count || 0}</div>
                    </div>

                    <div
                        onClick={() => handleTabClick('ACTIONED')}
                        className={`cursor-pointer p-3.5 rounded-xl border transition flex flex-col justify-between ${
                            activeTab === 'ACTIONED'
                                ? 'border-indigo-500 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-400'
                                : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/20'
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                            <span>Actioned</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                        </div>
                        <div className="text-2xl font-bold text-indigo-700 mt-2">{stats.actioned_count}</div>
                    </div>
                </div>
            )}

            {/* ─── Filter & Search Bar ─── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200">
                {/* Search */}
                <div className="relative w-full sm:w-96">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search sender, subject, filename..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchItems()}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Bank Dropdown & Filter Count */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <select
                            value={selectedBank}
                            onChange={(e) => setSelectedBank(e.target.value)}
                            className="w-full sm:w-64 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="">All Banks</option>
                            {banks.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {stats?.archived_count > 0 && (
                        <button
                            onClick={() => setActiveTab(activeTab === 'ARCHIVED' ? 'ALL' : 'ARCHIVED')}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition whitespace-nowrap ${
                                activeTab === 'ARCHIVED'
                                    ? 'bg-slate-800 text-white border-slate-900 shadow-sm'
                                    : 'bg-white text-slate-600 border-gray-300 hover:bg-slate-50'
                            }`}
                        >
                            <Archive className="w-3.5 h-3.5" />
                            Archived ({stats.archived_count})
                        </button>
                    )}

                    {(selectedBank || searchQuery || activeTab !== 'ALL') && (
                        <button
                            onClick={() => {
                                setSelectedBank('');
                                setSearchQuery('');
                                setActiveTab('ALL');
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* ─── Inbox Items Feed ─── */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-200">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        <p className="mt-3 text-sm text-gray-500">Loading inbox items...</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-gray-300 text-center">
                        <Mail className="w-12 h-12 text-gray-300 mb-3" />
                        <h3 className="text-base font-medium text-gray-900">
                            {activeTab !== 'ALL' ? `No emails found in this category` : 'No emails found in this view'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-md">
                            {activeTab !== 'ALL'
                                ? 'There are currently no items under this filter. You can return to view all ingested emails.'
                                : 'Emails received at your configured mailbox will appear here automatically for review.'}
                        </p>
                        <div className="mt-4 flex items-center gap-3">
                            {activeTab !== 'ALL' && (
                                <button
                                    onClick={() => setActiveTab('ALL')}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm"
                                >
                                    View All Ingested Items
                                </button>
                            )}
                            <button
                                onClick={handlePollNow}
                                disabled={polling}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Poll Mailbox Now
                            </button>
                        </div>
                    </div>
                ) : (
                    items.map((item) => {
                        const classMeta = CLASSIFICATION_CONFIG[item.classification] || CLASSIFICATION_CONFIG.UNCLASSIFIED;
                        const confMeta = CONFIDENCE_BADGES[item.classification_confidence] || CONFIDENCE_BADGES.LOW;
                        const ClassIcon = classMeta.icon;
                        const ConfIcon = confMeta.icon;
                        const isActioned = item.status === 'ACTIONED';
                        const isError = item.status === 'PARSE_ERROR';

                        return (
                            <div
                                key={item.id}
                                className={`bg-white rounded-xl border transition shadow-sm hover:shadow-md ${
                                    isActioned
                                        ? 'border-gray-200 bg-gray-50/40 opacity-90'
                                        : isError
                                        ? 'border-red-300 bg-red-50/10'
                                        : 'border-gray-200'
                                }`}
                            >
                                <div className="p-5">
                                    {/* Top Row: Badges & Time */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {/* Classification Badge */}
                                            <span
                                                style={{ color: classMeta.color, backgroundColor: classMeta.bg, borderColor: classMeta.border }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border"
                                            >
                                                <ClassIcon className="w-3.5 h-3.5" />
                                                {classMeta.label}
                                            </span>

                                            {/* Confidence Badge */}
                                            <span
                                                style={{ color: confMeta.color, backgroundColor: confMeta.bg }}
                                                className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-md"
                                            >
                                                <ConfIcon className="w-3 h-3" />
                                                {confMeta.label} ({item.confidence_score} pts)
                                            </span>

                                            {/* Thread match badge */}
                                            {item.outbound_request_id && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded-md">
                                                    <ArrowUpRight className="w-3 h-3" />
                                                    Reply to Request
                                                </span>
                                            )}

                                            {/* Untrusted domain warning */}
                                            {!item.is_trusted_sender && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-md">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Generic Domain
                                                </span>
                                            )}

                                            {/* NIL Position Badge */}
                                            {item.is_nil_position && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 rounded-md">
                                                    <Sparkles className="w-3 h-3 text-amber-600" />
                                                    NIL / Zero Position
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(item.received_at).toLocaleString()}
                                        </div>
                                    </div>

                                    {/* Middle Row: Content & Meta */}
                                    <div className="mt-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="space-y-1.5 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-gray-900">{item.sender_email}</span>
                                                {item.matched_bank_name && (
                                                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                                        {item.matched_bank_name}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Clickable Subject */}
                                            <h4
                                                onClick={async () => {
                                                    const detail = await apiRequest(`/inbox/items/${item.id}`);
                                                    setSelectedItem(detail);
                                                }}
                                                className="text-base font-semibold text-gray-900 hover:text-blue-600 hover:underline cursor-pointer transition flex items-center gap-1.5 group"
                                                title="Click to view details"
                                            >
                                                <span>{item.subject || '(No Subject)'}</span>
                                                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition" />
                                            </h4>

                                            {item.action_summary && (
                                                <p className="text-sm text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100 mt-2">
                                                    <strong>System Action:</strong> {item.action_summary}
                                                </p>
                                            )}

                                            {item.error_message && (
                                                <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                                                    <strong>Error:</strong> {item.error_message}
                                                </p>
                                            )}
                                        </div>

                                        {/* Primary Attachment Chip */}
                                        {item.has_attachment && item.primary_attachment_name && (
                                            <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                                                <Paperclip className="w-4 h-4 text-gray-500" />
                                                <div className="max-w-[180px] truncate">
                                                    <div className="font-medium text-gray-800 truncate">{item.primary_attachment_name}</div>
                                                    <div className="text-gray-400 uppercase">{item.primary_attachment_type || 'FILE'}</div>
                                                </div>
                                                <button
                                                    onClick={() => handleDownloadAttachment(item.id, 1, item.primary_attachment_name)}
                                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                                    title="Download Attachment"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Bottom Action Row */}
                                    <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            {/* View Details Button */}
                                            <button
                                                onClick={async () => {
                                                    const detail = await apiRequest(`/inbox/items/${item.id}`);
                                                    setSelectedItem(detail);
                                                }}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                View Details
                                            </button>

                                            {/* Reclassify Dropdown Trigger showing Current Selection */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setReclassifyItemId(reclassifyItemId === item.id ? null : item.id)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition"
                                                    title="Change category classification"
                                                >
                                                    <span className="text-gray-400 font-normal">Class:</span>
                                                    <ClassIcon className="w-3.5 h-3.5" style={{ color: classMeta.color }} />
                                                    <span className="font-semibold" style={{ color: classMeta.color }}>
                                                        {classMeta.label}
                                                    </span>
                                                    <ChevronDown className="w-3 h-3 text-gray-400 ml-0.5" />
                                                </button>

                                                {reclassifyItemId === item.id && (
                                                    <div className="absolute left-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-30 py-1.5 text-xs">
                                                        <div className="px-3 py-1.5 text-gray-400 font-bold uppercase tracking-wider text-[10px] border-b border-gray-100">
                                                            Select Classification
                                                        </div>
                                                        {Object.entries(CLASSIFICATION_CONFIG).map(([key, cfg]) => {
                                                            const ItemIcon = cfg.icon;
                                                            const isSelected = item.classification === key;
                                                            return (
                                                                <button
                                                                    key={key}
                                                                    onClick={() => handleReclassify(item.id, key)}
                                                                    className={`w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between transition ${
                                                                        isSelected ? 'font-bold bg-blue-50/50' : 'text-gray-700'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <ItemIcon className="w-4 h-4" style={{ color: cfg.color }} />
                                                                        <span style={{ color: isSelected ? cfg.color : undefined }}>{cfg.label}</span>
                                                                    </div>
                                                                    {isSelected && <Check className="w-4 h-4 text-blue-600 font-bold" />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Single Archive / Trash icon button */}
                                            {item.classification !== 'IRRELEVANT' && (
                                                <button
                                                    onClick={() => handleArchive(item.id)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                                                    title="Archive Item"
                                                >
                                                    <Archive className="w-3.5 h-3.5" />
                                                    Archive
                                                </button>
                                            )}
                                        </div>

                                        {/* Primary Action Button */}
                                        <div className="flex items-center gap-2">
                                            {item.status === 'ARCHIVED' ? (
                                                <button
                                                    onClick={() => handleUnarchive(item.id)}
                                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition shadow-sm"
                                                >
                                                    <RefreshCw className="w-3.5 h-3.5" />
                                                    Restore to Active Inbox
                                                </button>
                                            ) : isActioned ? (
                                                <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Actioned ({item.action_reference_type} #{item.action_reference_id})
                                                    {item.action_reference_type === 'ReconciliationSession' && (
                                                        <button
                                                            onClick={() => navigate(`/end-user/issuance/reconciliation?sessionId=${item.action_reference_id}`)}
                                                            className="underline font-bold text-emerald-800 ml-1"
                                                        >
                                                            View
                                                        </button>
                                                    )}
                                                </div>
                                            ) : item.classification === 'LG_POSITION_REPORT' ? (
                                                <button
                                                    onClick={() => openConfirmModal(item)}
                                                    disabled={actioningId === item.id}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition disabled:opacity-50"
                                                >
                                                    {actioningId === item.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                    )}
                                                    Confirm & Reconcile Position
                                                </button>
                                            ) : item.classification === 'BANK_STATEMENT' ? (
                                                <button
                                                    onClick={() => openConfirmModal(item)}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm transition"
                                                >
                                                    <Layers className="w-3.5 h-3.5" />
                                                    Confirm Statement Ingestion
                                                </button>
                                            ) : item.classification === 'PROGRESS_REPORT' ? (
                                                <button
                                                    onClick={() => openConfirmModal(item)}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 shadow-sm transition"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    Review & Confirm Milestone
                                                </button>
                                            ) : item.classification === 'IRRELEVANT' ? (
                                                <button
                                                    onClick={() => handleArchive(item.id)}
                                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                                                >
                                                    <Archive className="w-3.5 h-3.5" />
                                                    Dismiss / Archive
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setReclassifyItemId(item.id)}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                                                >
                                                    Set Classification to Action
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ─── MODAL: Confirm & Execute Action ─── */}
            {confirmModalItem && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-gray-200">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-blue-600" />
                                Confirm Downstream Action
                            </h3>
                            <button onClick={() => setConfirmModalItem(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-sm text-gray-600">
                            {confirmModalItem.is_nil_position ? (
                                <>
                                    The bank confirmed a <strong className="text-amber-800">NIL / Zero Position</strong> (No active guarantees as of requested date). Confirming will create a Reconciliation Session and match all active system LGs against zero bank records.
                                </>
                            ) : (
                                <>
                                    You are about to process the position report from <strong>{confirmModalItem.sender_email}</strong>.
                                    This will create a new <strong>Reconciliation Session</strong> and automatically parse & match all LG records.
                                </>
                            )}
                        </p>

                        <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                                    Issuing Bank <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={confirmBankId}
                                    onChange={(e) => setConfirmBankId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                    <option value="">Select Bank...</option>
                                    {banks.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name} {b.email_domain ? `(@${b.email_domain})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                                    Position Snapshot Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={confirmPositionDate}
                                    onChange={(e) => setConfirmPositionDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {confirmModalItem.primary_attachment_name && (
                                <div className="text-xs text-gray-600 pt-1">
                                    <strong>Attachment:</strong> {confirmModalItem.primary_attachment_name}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-3">
                            <button
                                onClick={() => setConfirmModalItem(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeConfirmAction}
                                disabled={!confirmBankId || actioningId !== null}
                                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow"
                            >
                                {actioningId !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Confirm & Run Matching
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MODAL: Request Position from Bank ─── */}
            {showRequestModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <form
                        onSubmit={handleSendPositionRequest}
                        className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-gray-200"
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Send className="w-5 h-5 text-blue-600" />
                                Request LG Position from Bank
                            </h3>
                            <button type="button" onClick={() => setShowRequestModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-sm text-gray-500">
                            Sends an official bilingual request email to the bank trade finance team. When the bank replies, Smart Inbox automatically matches the thread at High confidence.
                        </p>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                                    Target Bank <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={reqBankId}
                                    onChange={(e) => setReqBankId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                                >
                                    <option value="">Select Bank...</option>
                                    {banks.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name} {b.email_domain ? `(@${b.email_domain})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                                    Position Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={reqPositionDate}
                                    onChange={(e) => setReqPositionDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                                    Custom Recipient Emails <span className="text-gray-400">(comma-separated, optional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="trade-ops@cibeg.com, rm@cibeg.com"
                                    value={reqCustomEmails}
                                    onChange={(e) => setReqCustomEmails(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                                    Additional Instructions / Notes <span className="text-gray-400">(optional)</span>
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="e.g. Please include facility sub-limits breakdown."
                                    value={reqNotes}
                                    onChange={(e) => setReqNotes(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3">
                            <button
                                type="button"
                                onClick={() => setShowRequestModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={sendingRequest || !reqBankId}
                                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow"
                            >
                                {sendingRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Send Request Email
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ─── MODAL: Item Details & Signals Breakdown ─── */}
            {selectedItem && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-4xl w-full p-6 space-y-4 shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div className="flex items-center gap-2.5 min-w-0 pr-4">
                                <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                                <div className="min-w-0">
                                    <h3 className="text-base font-bold text-gray-900 truncate">
                                        {selectedItem.subject || 'Email Ingestion Details'}
                                    </h3>
                                </div>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 shrink-0">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-gray-50 p-3.5 rounded-lg border border-gray-200">
                            <div className="min-w-0">
                                <span className="text-gray-500 text-[10.5px] uppercase font-semibold block">Sender</span>
                                <span className="font-semibold text-gray-900 truncate block" title={selectedItem.sender_email}>
                                    {selectedItem.sender_email}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500 text-[10.5px] uppercase font-semibold block">Matched Bank</span>
                                <span className="font-semibold text-gray-900">
                                    {selectedItem.matched_bank_name || 'None'}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500 text-[10.5px] uppercase font-semibold block">Received Date</span>
                                <span className="font-semibold text-gray-900">
                                    {new Date(selectedItem.received_at).toLocaleString()}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500 text-[10.5px] uppercase font-semibold block">Classification</span>
                                <span className="font-bold text-blue-700">
                                    {CLASSIFICATION_CONFIG[selectedItem.classification]?.label || selectedItem.classification}
                                </span>
                            </div>
                        </div>

                        {/* Signals Breakdown */}
                        {selectedItem.classification_signals && typeof selectedItem.classification_signals === 'object' && (
                            <div className="space-y-2.5 bg-gray-50/70 p-3.5 rounded-xl border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-blue-600" />
                                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                            Classification Signals
                                        </h4>
                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                            {selectedItem.confidence_score || 0} pts
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            const allKeys = Object.keys(selectedItem.classification_signals);
                                            const areAllExpanded = allKeys.every(k => expandedSignalKeys[k]);
                                            const nextState = {};
                                            allKeys.forEach(k => { nextState[k] = !areAllExpanded; });
                                            setExpandedSignalKeys(nextState);
                                        }}
                                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                                    >
                                        {Object.keys(selectedItem.classification_signals).every(k => expandedSignalKeys[k])
                                            ? 'Collapse Details'
                                            : 'Expand All Details'}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {Object.entries(selectedItem.classification_signals).map(([key, data]) => {
                                        const def = SIGNAL_DEFINITIONS[key] || {
                                            title: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                                            icon: Sparkles,
                                            color: 'text-blue-600',
                                            bg: 'bg-blue-50',
                                            border: 'border-blue-200',
                                            formatDetail: (d) => typeof d === 'object' ? JSON.stringify(d) : String(d)
                                        };
                                        const SignalIcon = def.icon;
                                        const points = typeof data === 'object' && data !== null ? data.points : data;
                                        const isPositive = typeof points === 'number' && points >= 0;
                                        const detailText = typeof def.formatDetail === 'function' ? def.formatDetail(data) : '';
                                        const isExpanded = !!expandedSignalKeys[key];

                                        return (
                                            <div
                                                key={key}
                                                className="rounded-lg border border-gray-200 bg-white overflow-hidden text-xs transition shadow-2xs flex flex-col justify-between"
                                            >
                                                <div
                                                    onClick={() => setExpandedSignalKeys(prev => ({ ...prev, [key]: !prev[key] }))}
                                                    className="flex items-center justify-between px-2.5 py-1.5 cursor-pointer hover:bg-gray-50 transition select-none gap-2"
                                                >
                                                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                                                        <SignalIcon className={`w-3.5 h-3.5 shrink-0 ${def.color}`} />
                                                        <span className="font-semibold text-gray-800 text-[11px] truncate" title={def.title}>
                                                            {def.title}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {typeof points !== 'undefined' && (
                                                            <span
                                                                className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                                                    isPositive
                                                                        ? 'bg-emerald-50 text-emerald-700'
                                                                        : 'bg-rose-50 text-rose-700'
                                                                }`}
                                                            >
                                                                {isPositive ? `+${points}` : points} pts
                                                            </span>
                                                        )}
                                                        {isExpanded ? (
                                                            <ChevronUp className="w-3 h-3 text-gray-400" />
                                                        ) : (
                                                            <ChevronDown className="w-3 h-3 text-gray-400" />
                                                        )}
                                                    </div>
                                                </div>

                                                {isExpanded && detailText && (
                                                    <div className="px-2.5 py-1.5 text-[10.5px] text-gray-600 bg-gray-50/80 border-t border-gray-100 break-words leading-relaxed">
                                                        {detailText}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Collapsible Raw JSON for debugging */}
                                <div className="pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowRawSignals(!showRawSignals)}
                                        className="text-[10px] font-medium text-gray-400 hover:text-gray-600 flex items-center gap-1 transition"
                                    >
                                        {showRawSignals ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        {showRawSignals ? 'Hide Raw JSON' : 'Raw JSON'}
                                    </button>
                                    {showRawSignals && (
                                        <pre className="mt-1.5 text-[10px] bg-slate-900 text-emerald-400 p-2.5 rounded-lg overflow-x-auto border border-slate-800">
                                            {JSON.stringify(selectedItem.classification_signals, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Body Preview */}
                        {selectedItem.body_preview && (
                            <div>
                                <h4 className="text-xs font-bold text-gray-700 uppercase mb-1">Body Preview</h4>
                                <div className="text-xs text-gray-700 bg-gray-50 p-3 rounded border border-gray-200 whitespace-pre-wrap">
                                    {selectedItem.body_preview}
                                </div>
                            </div>
                        )}

                        {/* Attachments List */}
                        {selectedItem.attachments && selectedItem.attachments.length > 0 && (
                            <div>
                                <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Attachments ({selectedItem.attachments.length})</h4>
                                <div className="space-y-2">
                                    {selectedItem.attachments.map((att) => (
                                        <div key={att.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                                            <div className="flex items-center gap-2 min-w-0 pr-2">
                                                <Paperclip className="w-4 h-4 text-gray-500 shrink-0" />
                                                <span className="font-medium text-gray-800 truncate" title={att.file_name}>
                                                    {att.file_name}
                                                </span>
                                                <span className="text-gray-400 shrink-0">({att.file_type})</span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => handlePreviewAttachment(selectedItem.id, att.id)}
                                                    disabled={loadingPreviewId === att.id}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition disabled:opacity-50"
                                                >
                                                    {loadingPreviewId === att.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Eye className="w-3.5 h-3.5" />
                                                    )}
                                                    Preview
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadAttachment(selectedItem.id, att.id, att.file_name)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-md transition"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    Download
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-3">
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MODAL: Attachment Table & Document Preview ─── */}
            {previewData && (
                <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-5xl w-full p-6 space-y-4 shadow-2xl border border-gray-200 max-h-[92vh] flex flex-col">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-200 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900">{previewData.filename}</h3>
                                    <p className="text-xs text-gray-500">
                                        Type: <span className="font-semibold text-gray-700">{previewData.file_type}</span>
                                        {previewData.total_columns && ` • ${previewData.total_columns} Columns`}
                                        {previewData.row_count_preview && ` • Showing first ${previewData.row_count_preview} rows`}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPreviewData(null)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Spreadsheet Grid View */}
                        {previewData.preview_type === 'TABLE' && previewData.headers ? (
                            <div className="flex-1 overflow-auto border border-gray-200 rounded-lg shadow-inner bg-gray-50">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 border-b border-gray-300 z-10">
                                        <tr>
                                            <th className="p-2.5 border-r border-gray-300 bg-gray-200 text-center w-12 text-gray-500">#</th>
                                            {previewData.headers.map((h, i) => (
                                                <th key={i} className="p-2.5 border-r border-gray-300 whitespace-nowrap">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white font-mono">
                                        {previewData.rows && previewData.rows.map((row, rIdx) => (
                                            <tr key={rIdx} className="hover:bg-blue-50/40 transition">
                                                <td className="p-2 text-center text-gray-400 border-r border-gray-200 bg-gray-50 text-[11px]">
                                                    {rIdx + 1}
                                                </td>
                                                {row.map((cell, cIdx) => (
                                                    <td key={cIdx} className="p-2 border-r border-gray-100 whitespace-nowrap text-gray-800">
                                                        {cell || <span className="text-gray-300 italic">—</span>}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : previewData.is_pdf ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
                                <FileText className="w-16 h-16 text-rose-500 mb-3" />
                                <h4 className="text-base font-bold text-gray-800">PDF Document Ready</h4>
                                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                                    You can download or view the full document using the download button below.
                                </p>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
                                <AlertCircle className="w-12 h-12 text-amber-500 mb-2" />
                                <p className="text-sm font-semibold text-gray-700">Preview not available for this file type.</p>
                                <p className="text-xs text-gray-400 mt-1">{previewData.error || 'Please download the file to inspect.'}</p>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t border-gray-100 shrink-0">
                            <span className="text-xs text-gray-500">
                                {previewData.sheet_names && previewData.sheet_names.length > 1 && (
                                    <span>Active Sheet: <strong className="text-gray-700">{previewData.active_sheet}</strong> ({previewData.sheet_names.join(', ')})</span>
                                )}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPreviewData(null)}
                                    className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                                >
                                    Close Preview
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
