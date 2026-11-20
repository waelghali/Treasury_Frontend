import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { apiRequest, API_BASE_URL, getAuthToken } from '../../services/apiService';
import { isCachedTrialSession } from '../../components/Trial/useTrialExperience';
import { toast } from 'react-toastify';
import FormattedDateInput from 'components/FormattedDateInput';
import { formatDate } from '../../utils/dateFormat';
import {
    Upload, Search, CheckCircle2, AlertTriangle, AlertCircle, Info,
    RefreshCw, FileText, Calendar, Building2, ChevronDown, ChevronUp,
    Check, X, Clock, Shield, Eye, Download, Loader2, BarChart3, Trash2, Sparkles,
    ArrowLeft, List, XCircle, Ban
} from 'lucide-react';

// ─── Severity config ───
const SEVERITY_CONFIG = {
    HIGH: {
        color: '#ef4444',
        icon: AlertCircle,
        label: 'High',
        iconCls: 'text-rose-500',
        valCls: 'text-rose-600',
        borderCls: 'border-rose-200',
    },
    MEDIUM: {
        color: '#f59e0b',
        icon: AlertTriangle,
        label: 'Medium',
        iconCls: 'text-amber-500',
        valCls: 'text-amber-600',
        borderCls: 'border-amber-200',
    },
    LOW: {
        color: '#eab308',
        icon: Info,
        label: 'Low',
        iconCls: 'text-yellow-500',
        valCls: 'text-yellow-700',
        borderCls: 'border-yellow-200',
    },
    INFO: {
        color: '#3b82f6',
        icon: Info,
        label: 'Info',
        iconCls: 'text-blue-500',
        valCls: 'text-blue-600',
        borderCls: 'border-blue-200',
    },
};

const MISMATCH_LABELS = {
    AMOUNT: 'Amount Variance',
    CURRENCY: 'Currency Mismatch',
    BENEFICIARY: 'Beneficiary Mismatch',
    EXPIRY: 'Expiry Mismatch',
    INITIAL_DATA: 'Initial Data Difference',
    BANK_ONLY: 'Bank Only (not in system)',
    SYSTEM_ONLY: 'System Only (not in bank)',
};

// ═══════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════
export default function LGReconciliationPage() {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const urlSessionId = searchParams.get('sessionId');
    const basePrefix = location.pathname.startsWith('/end-user') ? '/end-user' : '/corporate-admin';

    const [userRole] = useState(() => {
        try {
            const token = localStorage.getItem('jwt_token');
            if (token) return JSON.parse(atob(token.split('.')[1])).role;
        } catch (e) {}
        return localStorage.getItem('user_role') || null;
    });
    const isEndUser = userRole === 'end_user';
    const isCorporateAdmin = userRole === 'corporate_admin' || userRole === 'checker';

    const [banks, setBanks] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [results, setResults] = useState([]);
    const [bankRows, setBankRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [matching, setMatching] = useState(false);

    // Upload form
    const [uploadBank, setUploadBank] = useState('');
    const [uploadDate, setUploadDate] = useState('');
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadNotes, setUploadNotes] = useState('');

    // Filters
    const [filterSeverity, setFilterSeverity] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterResolved, setFilterResolved] = useState('');

    // Tab
    const [activeTab, setActiveTab] = useState('sessions'); // sessions | upload | detail
    const [isTrialSandbox] = useState(() => {
        try {
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            return isCachedTrialSession(u?.customer_id);
        } catch {
            return false;
        }
    });
    const [isAutoLoadingTrial, setIsAutoLoadingTrial] = useState(false);

    useEffect(() => {
        fetchBanks();
        fetchSessions();
        if (urlSessionId) {
            fetchSessionDetail(urlSessionId);
        }
    }, [urlSessionId]);

    useEffect(() => {
        const handleSampleLoaded = (evt) => {
            if (evt?.detail?.scope === 'issuance_recon') {
                setIsAutoLoadingTrial(false);
                fetchSessions();
                if (evt.detail.sessionId) {
                    fetchSessionDetail(evt.detail.sessionId);
                }
            }
        };
        window.addEventListener('grow-trial-sample-loaded', handleSampleLoaded);
        return () => window.removeEventListener('grow-trial-sample-loaded', handleSampleLoaded);
    }, []);

    const fetchBanks = async () => {
        try {
            const data = await apiRequest('/issuance/banks');
            setBanks(data);
        } catch (e) { console.error(e); }
    };

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const data = await apiRequest('/issuance/reconciliation/sessions');
            setSessions(data);
        } catch (e) { toast.error('Failed to load sessions'); }
        setLoading(false);
    };

    const fetchSessionDetail = async (id) => {
        try {
            const [session, resultsData, rows] = await Promise.all([
                apiRequest(`/issuance/reconciliation/sessions/${id}`),
                apiRequest(`/issuance/reconciliation/sessions/${id}/results`),
                apiRequest(`/issuance/reconciliation/sessions/${id}/bank-rows`),
            ]);
            setSelectedSession(session);
            setResults(resultsData);
            setBankRows(rows);
            setActiveTab('detail');
        } catch (e) { toast.error('Failed to load session details'); }
    };

    // ── Upload ──
    const handleUpload = async () => {
        if (!uploadBank || !uploadDate || !uploadFile) {
            toast.warning('Please select bank, date, and file');
            return;
        }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('bank_id', uploadBank);
            formData.append('position_date', uploadDate);
            formData.append('notes', uploadNotes);
            formData.append('file', uploadFile);

            const resp = await fetch(`${API_BASE_URL}/issuance/reconciliation/sessions`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` },
                body: formData,
            });
            if (!resp.ok) {
                const err = await resp.json();
                throw new Error(err.detail || 'Upload failed');
            }
            const session = await resp.json();
            toast.success(`Parsed ${session.total_bank_records} records from ${session.original_file_name}`);
            setUploadFile(null);
            setUploadNotes('');
            await fetchSessions();
            await fetchSessionDetail(session.id);
        } catch (e) {
            toast.error(e.message || 'Upload failed');
        }
        setUploading(false);
    };

    // ── Match ──
    const handleRunMatching = async () => {
        if (!selectedSession) return;
        setMatching(true);
        try {
            const updated = await apiRequest(
                `/issuance/reconciliation/sessions/${selectedSession.id}/match`,
                'POST'
            );
            setSelectedSession(updated);
            const resultsData = await apiRequest(
                `/issuance/reconciliation/sessions/${selectedSession.id}/results`
            );
            setResults(resultsData);
            toast.success('Matching complete!');
        } catch (e) { toast.error('Matching failed'); }
        setMatching(false);
    };

    // ── Resolve ──
    const handleResolve = async (resultId, resolution, notes = '') => {
        try {
            const updated = await apiRequest(
                `/issuance/reconciliation/results/${resultId}/resolve`,
                'POST',
                { resolution, notes }
            );
            setResults(prev => prev.map(r => r.id === resultId ? updated : r));
            toast.success(resolution === 'ADJUSTED'
                ? 'Submitted for corporate admin approval'
                : `Marked as ${resolution}`);
        } catch (e) { toast.error('Resolution failed'); }
    };

    // ── Corporate Admin Checker Approval / Rejection ──
    const handleApproveAdjustment = async (resultId) => {
        try {
            const updated = await apiRequest(
                `/issuance/reconciliation/results/${resultId}/approve`,
                'POST'
            );
            setResults(prev => prev.map(r => r.id === resultId ? updated : r));
            toast.success('Reconciliation adjustment approved and applied to LG record');
        } catch (e) {
            toast.error(e.message || 'Approval failed');
        }
    };

    const handleRejectAdjustment = async (resultId) => {
        const reason = window.prompt('Reason for rejecting this adjustment (optional):');
        if (reason === null) return;
        try {
            const updated = await apiRequest(
                `/issuance/reconciliation/results/${resultId}/reject-approval`,
                'POST',
                { reason: reason || '' }
            );
            setResults(prev => prev.map(r => r.id === resultId ? updated : r));
            toast.info('Adjustment rejected — returned for maker review');
        } catch (e) {
            toast.error(e.message || 'Rejection failed');
        }
    };

    // ── Delete ──
    const handleDeleteSession = async () => {
        if (!selectedSession || !window.confirm('Are you sure you want to delete this session entirely?')) return;
        try {
            await apiRequest(
                `/issuance/reconciliation/sessions/${selectedSession.id}`,
                'DELETE'
            );
            toast.success('Session deleted successfully');
            fetchSessions();
            setActiveTab('sessions');
            setSelectedSession(null);
        } catch (e) { toast.error(e.message || 'Cannot delete session right now'); }
    };

    // ── Complete ──
    const handleComplete = async () => {
        if (!selectedSession) return;
        try {
            await apiRequest(
                `/issuance/reconciliation/sessions/${selectedSession.id}/complete`,
                'POST'
            );
            toast.success('Reconciliation completed!');
            fetchSessions();
            setActiveTab('sessions');
            setSelectedSession(null);
        } catch (e) { toast.error(e.message || 'Cannot complete — resolve all items first'); }
    };

    // ── Filtered results ──
    const filteredResults = results.filter(r => {
        if (filterSeverity && r.severity !== filterSeverity) return false;
        if (filterType && r.mismatch_type !== filterType) return false;
        if (filterResolved === 'yes' && !r.user_resolution) return false;
        if (filterResolved === 'no' && r.user_resolution) return false;
        return true;
    });

    // ── Stats ──
    const stats = selectedSession ? {
        matched: selectedSession.matched_count || 0,
        mismatched: selectedSession.mismatched_count || 0,
        bankOnly: selectedSession.bank_only_count || 0,
        systemOnly: selectedSession.system_only_count || 0,
        total: selectedSession.total_bank_records || 0,
    } : {};

    const selectCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none';
    const labelCls = 'block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5';

    return (
        <div className="w-full min-w-0 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                            <BarChart3 className="w-5 h-5" />
                        </span>
                        <span>LG Position Reconciliation</span>
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {isCorporateAdmin
                            ? 'Oversight & checker view — monitor bank position sessions and approve or reject maker adjustments'
                            : 'Import bank position reports, match against system records, resolve variances'}
                    </p>
                </div>
                <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200/80 w-fit">
                    {(isEndUser ? ['sessions', 'upload'] : ['sessions']).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-none focus:ring-0 ${
                                activeTab === tab
                                    ? 'bg-white text-blue-700 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            {tab === 'sessions' ? (
                                <><List className="w-3.5 h-3.5" /> Sessions</>
                            ) : (
                                <><Upload className="w-3.5 h-3.5" /> Upload Report</>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ═══ Upload Tab ═══ */}
            {isEndUser && activeTab === 'upload' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                            <Upload className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">
                            Upload Bank Position Report
                        </h2>
                    </div>

                    <div className="grid gap-5">
                        <div>
                            <label className={labelCls}>Bank</label>
                            <select value={uploadBank} onChange={e => setUploadBank(e.target.value)} className={selectCls}>
                                <option value="">Select bank...</option>
                                {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className={labelCls}>Position Date</label>
                            <FormattedDateInput
                                value={uploadDate}
                                onChange={e => setUploadDate(e.target.value)}
                                className={selectCls}
                            />
                        </div>

                        <div>
                            <label className={labelCls}>Position Report File</label>
                            <div
                                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                                    uploadFile
                                        ? 'border-emerald-300 bg-emerald-50/40'
                                        : 'border-slate-200 bg-slate-50/50 hover:bg-blue-50/30 hover:border-blue-300'
                                }`}
                                onClick={() => document.getElementById('recon-file-input').click()}
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => { e.preventDefault(); setUploadFile(e.dataTransfer.files[0]); }}
                            >
                                {uploadFile ? (
                                    <div>
                                        <FileText size={32} className="text-emerald-600 mx-auto" />
                                        <p className="font-semibold text-emerald-700 mt-2 text-sm">{uploadFile.name}</p>
                                        <p className="text-slate-500 text-xs mt-0.5">
                                            {(uploadFile.size / 1024).toFixed(1)} KB — Click to change
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <Upload size={32} className="text-slate-400 mx-auto" />
                                        <p className="font-semibold text-slate-700 mt-2 text-sm">
                                            Drop file here or click to browse
                                        </p>
                                        <p className="text-slate-400 text-xs mt-0.5">
                                            Excel (.xlsx), CSV, PDF, or Text
                                        </p>
                                    </div>
                                )}
                                <input id="recon-file-input" type="file" hidden
                                    accept=".xlsx,.xls,.csv,.pdf,.txt"
                                    onChange={e => setUploadFile(e.target.files[0])} />
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>Notes (optional)</label>
                            <textarea
                                value={uploadNotes}
                                onChange={e => setUploadNotes(e.target.value)}
                                rows={2}
                                className={`${selectCls} resize-y`}
                                placeholder="Any notes about this position report..."
                            />
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                className={`flex-1 min-w-[220px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading &amp; Parsing...</>
                                    : <><Upload size={16} /> Upload &amp; Parse</>}
                            </button>
                            {isTrialSandbox && (
                                <button
                                    type="button"
                                    disabled={isAutoLoadingTrial || uploading}
                                    onClick={() => {
                                        setIsAutoLoadingTrial(true);
                                        window.dispatchEvent(
                                            new CustomEvent('grow-trial-trigger-autoload', { detail: { actionId: 'issuance_recon' } })
                                        );
                                        setTimeout(() => setIsAutoLoadingTrial(false), 12000);
                                    }}
                                    className={`flex-1 min-w-[220px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors ${(isAutoLoadingTrial || uploading) ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    title="Automatically upload & match the sample Bank LG Position Statement"
                                >
                                    {isAutoLoadingTrial ? <><Loader2 size={16} className="animate-spin" /> Comparing Bank List...</>
                                        : <><Sparkles size={16} /> Do It For Me (Load Sample Bank List)</>}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Sessions List ═══ */}
            {activeTab === 'sessions' && (
                <div>
                    {loading ? (
                        <div className="py-16 text-center text-slate-500">
                            <Loader2 size={32} className="animate-spin text-blue-600 mx-auto mb-2.5" />
                            <p className="text-sm font-medium">Loading sessions...</p>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                            <BarChart3 size={44} className="text-slate-300 mx-auto" />
                            <p className="text-slate-600 mt-3 font-semibold text-sm">No reconciliation sessions yet</p>
                            {isEndUser ? (
                                <button
                                    onClick={() => setActiveTab('upload')}
                                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
                                >
                                    <Upload className="w-4 h-4" /> Upload First Report
                                </button>
                            ) : (
                                <p className="text-slate-400 text-xs mt-1.5">
                                    Sessions uploaded by Treasury Makers (End Users) will appear here for review.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {sessions.map(s => (
                                <div
                                    key={s.id}
                                    onClick={() => fetchSessionDetail(s.id)}
                                    className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md p-5 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                >
                                    <div>
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <Building2 size={16} className="text-slate-500" />
                                            <span className="font-bold text-slate-900">{s.bank_name}</span>
                                            <span className="text-slate-300">•</span>
                                            <Calendar size={14} className="text-slate-400" />
                                            <span className="text-slate-500 text-xs font-medium">{formatDate(s.position_date)}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs font-semibold">
                                            <span className="inline-flex items-center gap-1 text-emerald-600">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> {s.matched_count} matched
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-rose-600">
                                                <AlertTriangle className="w-3.5 h-3.5" /> {s.mismatched_count} mismatches
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-amber-600">
                                                <FileText className="w-3.5 h-3.5" /> {s.bank_only_count} bank-only
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-violet-600">
                                                <Search className="w-3.5 h-3.5" /> {s.system_only_count} system-only
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <StatusBadge status={s.status} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ Session Detail ═══ */}
            {activeTab === 'detail' && selectedSession && (
                <div>
                    {/* Back button */}
                    <button
                        onClick={() => { setActiveTab('sessions'); setSelectedSession(null); }}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 mb-4 shadow-none focus:ring-0"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to sessions</span>
                    </button>

                    {/* Session header */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                                    {selectedSession.bank_name} — {formatDate(selectedSession.position_date)}
                                </h2>
                                <p className="text-slate-500 text-xs mt-1">
                                    {selectedSession.original_file_name} • {selectedSession.total_bank_records} records •
                                    Parsed via {selectedSession.parsing_method}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2 items-center">
                                {isEndUser && (
                                    <button
                                        onClick={handleDeleteSession}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 shadow-none transition-colors"
                                    >
                                        <Trash2 size={14} /> Delete
                                    </button>
                                )}
                                {isEndUser && selectedSession.status === 'PARSED' && (
                                    <button
                                        onClick={handleRunMatching}
                                        disabled={matching}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors disabled:opacity-60"
                                    >
                                        {matching ? <><Loader2 size={14} className="animate-spin" /> Matching...</>
                                            : <><RefreshCw size={14} /> Run Matching</>}
                                    </button>
                                )}
                                {isEndUser && selectedSession.status === 'MATCHED' && (
                                    <button
                                        onClick={handleComplete}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                                    >
                                        <Check size={14} /> Complete
                                    </button>
                                )}
                                <StatusBadge status={selectedSession.status} />
                            </div>
                        </div>

                        {/* Stats cards */}
                        {selectedSession.status !== 'PARSED' && (
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5">
                                <StatCard label="Total" value={stats.total} tone="slate" />
                                <StatCard label="Matched" value={stats.matched} tone="emerald" />
                                <StatCard label="Mismatched" value={stats.mismatched} tone="rose" />
                                <StatCard label="Bank Only" value={stats.bankOnly} tone="amber" />
                                <StatCard label="System Only" value={stats.systemOnly} tone="violet" />
                            </div>
                        )}

                        {/* G3: Completeness warning banner */}
                        {selectedSession.completeness_status === 'COUNT_MISMATCH' && (
                            <div className="mt-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2.5">
                                <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                                <span className="text-amber-900 font-semibold text-xs sm:text-sm">
                                    {selectedSession.completeness_note || 'Record count mismatch detected between bank report and parsed data'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Filters */}
                    {results.length > 0 && (
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs mb-4 flex flex-wrap items-center gap-3">
                            <select
                                value={filterSeverity}
                                onChange={e => setFilterSeverity(e.target.value)}
                                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            >
                                <option value="">All Severity</option>
                                <option value="HIGH">High</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="LOW">Low</option>
                                <option value="INFO">Info</option>
                            </select>
                            <select
                                value={filterType}
                                onChange={e => setFilterType(e.target.value)}
                                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            >
                                <option value="">All Types</option>
                                <option value="AMOUNT">Amount Variance</option>
                                <option value="CURRENCY">Currency Mismatch</option>
                                <option value="BENEFICIARY">Beneficiary Mismatch</option>
                                <option value="EXPIRY">Expiry Mismatch</option>
                                <option value="INITIAL_DATA">Initial Data</option>
                                <option value="BANK_ONLY">Bank Only</option>
                                <option value="SYSTEM_ONLY">System Only</option>
                            </select>
                            <select
                                value={filterResolved}
                                onChange={e => setFilterResolved(e.target.value)}
                                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            >
                                <option value="">All Status</option>
                                <option value="no">Unresolved</option>
                                <option value="yes">Resolved</option>
                            </select>
                            <span className="text-slate-400 text-xs font-medium ml-auto">
                                {filteredResults.length} of {results.length} items
                            </span>
                        </div>
                    )}

                    {/* Results list */}
                    
                    {/* Resolution Banner */}
                    {selectedSession.status !== 'COMPLETED' && isEndUser && filteredResults.some(r => !r.user_resolution) && (
                        <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl flex items-start gap-3 mb-4">
                            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-xs sm:text-sm text-amber-800">
                                <strong className="block font-bold mb-0.5">Action Required: Resolve Discrepancies</strong>
                                Please click on each pending row below to review the differences and select a resolution (Adjust, Dispute, or Ignore) before completing.
                            </div>
                        </div>
                    )}
                    {isCorporateAdmin && filteredResults.some(r => r.user_resolution === 'ADJUSTED' && r.approval_status === 'PENDING_APPROVAL') && (
                        <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded-xl flex items-start gap-3 mb-4">
                            <Shield size={18} className="text-blue-600 shrink-0 mt-0.5" />
                            <div className="text-xs sm:text-sm text-blue-800">
                                <strong className="block font-bold mb-0.5">Checker Review Required: Pending Adjustments</strong>
                                Expand rows marked <em>Pending Approval</em> below to approve or reject maker-submitted LG record adjustments.
                            </div>
                        </div>
                    )}

                    {filteredResults.length === 0 && selectedSession.status !== 'PARSED' ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 shadow-sm">
                            {results.length === 0 ? (
                                <>
                                    <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
                                    <p className="mt-2.5 text-sm font-semibold text-slate-700">All records matched perfectly!</p>
                                </>
                            ) : (
                                <p className="text-sm">No items match your filters</p>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-2.5">
                            {filteredResults.map(r => (
                                <ResultRow
                                    key={r.id}
                                    result={r}
                                    onResolve={handleResolve}
                                    onApproveAdjustment={handleApproveAdjustment}
                                    onRejectAdjustment={handleRejectAdjustment}
                                    isEndUser={isEndUser}
                                    isCorporateAdmin={isCorporateAdmin}
                                    basePrefix={basePrefix}
                                />
                            ))}
                        </div>
                    )}

                    {/* Bank rows toggle */}
                    {bankRows.length > 0 && (
                        <div className="mt-6">
                            <BankRowsTable rows={bankRows} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}


// ═══════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════

function ResultRow({ result, onResolve, onApproveAdjustment, onRejectAdjustment, isEndUser, isCorporateAdmin, basePrefix }) {
    const [expanded, setExpanded] = useState(false);
    const [notes, setNotes] = useState('');
    const sev = SEVERITY_CONFIG[result.severity] || SEVERITY_CONFIG.INFO;
    const SevIcon = sev.icon;

    return (
        <div className={`bg-white rounded-2xl border ${sev.borderCls || 'border-slate-200'} shadow-xs overflow-hidden`}>
            <div
                onClick={() => setExpanded(!expanded)}
                className="px-5 py-3.5 cursor-pointer grid grid-cols-1 md:grid-cols-[24px_1fr_170px_170px_auto] items-center gap-3 hover:bg-slate-50/70 transition-colors"
            >
                <SevIcon size={18} className={sev.iconCls} />
                <div>
                    <span className="font-semibold text-sm text-slate-900">
                        {MISMATCH_LABELS[result.mismatch_type] || result.mismatch_type}
                    </span>
                    {result.field_name && (
                        <span className="text-slate-400 text-xs ml-2">({result.field_name})</span>
                    )}
                </div>
                <div className="text-xs sm:text-sm">
                    <span className="text-slate-400">Bank: </span>
                    <span className={`font-semibold ${sev.valCls}`}>{result.bank_value || '—'}</span>
                </div>
                <div className="text-xs sm:text-sm">
                    <span className="text-slate-400">System: </span>
                    <span className="font-semibold text-slate-700">{result.system_value || '—'}</span>
                </div>
                <div className="flex items-center justify-end gap-2">
                    {result.user_resolution ? (
                        <ResolutionBadge resolution={result.user_resolution} approval={result.approval_status} />
                    ) : (
                        <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>Needs Resolution</span>
                            {!expanded && <span className="text-amber-700/80 font-medium italic text-[11px]">(Click to expand)</span>}
                        </div>
                    )}
                    {expanded ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                </div>
            </div>

            {expanded && (
                <div className="px-5 pb-4 pt-3 border-t border-slate-100 bg-slate-50/40">
                    {/* Context */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                        <div className="bg-white rounded-xl border border-slate-200/80 p-3">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">System LG</p>
                            <p className="font-semibold text-slate-900 font-mono">{result.lg_ref_number || result.lg_bank_number || '—'}</p>
                            <p className="text-slate-500 text-xs mt-0.5">{result.lg_beneficiary || ''}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200/80 p-3">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Bank Report</p>
                            <p className="font-semibold text-slate-900 font-mono">{result.bank_row_lg_number || '—'}</p>
                            <p className="text-slate-500 text-xs mt-0.5">{result.bank_row_beneficiary || ''}</p>
                        </div>
                    </div>

                    {/* Maker Resolution controls (End User only) */}
                    {isEndUser && !result.user_resolution && (() => {
                        const isFinancial = ['AMOUNT', 'CURRENCY', 'EXPIRY'].includes(result.mismatch_type);
                        const isBankOnly = result.mismatch_type === 'BANK_ONLY';
                        const sysVal = Number(result.system_value?.replace(/,/g, '') || 0);
                        const bankVal = Number(result.bank_value?.replace(/,/g, '') || 0);
                        const isAmountIncrease = result.mismatch_type === 'AMOUNT' && (bankVal > sysVal);
                        const isAmountDecrease = result.mismatch_type === 'AMOUNT' && (bankVal < sysVal);
                        
                        const disableIgnore = isFinancial || isBankOnly;
                        const blockAdjust = isBankOnly || isAmountIncrease;

                        return (
                            <div className="mt-4 space-y-3">
                                {/* Governance Warnings */}
                                {blockAdjust && (
                                    <div className="bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm text-rose-800 flex items-start gap-2">
                                        <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                                        <div>
                                            {isBankOnly && <strong>Bank-Only Liability: </strong>}
                                            {isAmountIncrease && <strong>Financial Increase: </strong>}
                                            {isBankOnly ? (
                                                <span>This record is missing from the system. <strong>&quot;Adjust&quot; is blocked.</strong> Please ask your Corporate Admin to register this historical LG in the Migration Hub or initiate a formal Issuance Request.</span>
                                            ) : (
                                                <span>You cannot bypass approval for amount increases. <strong>&quot;Adjust&quot; is blocked.</strong> Please initiate a formal &quot;Amount Increase&quot; request from the LG Maintenance module to follow the corporate approval matrix.</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {isAmountDecrease && (
                                    <div className="bg-blue-50 border border-blue-200 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm text-blue-800 flex items-start gap-2">
                                        <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                                        <div>
                                            <strong>Amount Decrease Detected:</strong> Adjusting this record will automatically generate a <strong>Partial Liquidation</strong> or <strong>Beneficiary Reduction</strong> maintenance request for Corporate Admin approval.
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2 items-center">
                                    <div className="flex-1 min-w-[200px]">
                                        <input
                                            type="text"
                                            placeholder={disableIgnore ? "Notes (required for resolving financial variances)" : "Notes (optional)"}
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (disableIgnore && !notes.trim()) {
                                                toast.warning("Notes are required when resolving financial variances.");
                                                return;
                                            }
                                            onResolve(result.id, 'ADJUSTED', notes);
                                        }}
                                        disabled={blockAdjust}
                                        title={blockAdjust ? "Adjustment blocked by governance policy" : ""}
                                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                                            blockAdjust
                                                ? 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none'
                                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                                        }`}
                                    >
                                        <Check className="w-3.5 h-3.5" /> Accept &amp; Adjust Record
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!notes.trim()) {
                                                toast.warning("Please provide notes for the dispute.");
                                                return;
                                            }
                                            onResolve(result.id, 'DISPUTE', notes);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-colors"
                                    >
                                        <Search className="w-3.5 h-3.5" /> Dispute
                                    </button>
                                    <button
                                        onClick={() => onResolve(result.id, 'IGNORE', notes)}
                                        disabled={disableIgnore}
                                        title={disableIgnore ? "Cannot ignore financial/liability variance" : ""}
                                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                                            disableIgnore
                                                ? 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none'
                                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-none'
                                        }`}
                                    >
                                        <X className="w-3.5 h-3.5" /> Ignore
                                    </button>
                                </div>
                            </div>
                        );
                    })()}

                    {isCorporateAdmin && !result.user_resolution && result.mismatch_type === 'BANK_ONLY' && (
                        <div className="mt-3 bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm text-rose-800">
                            <strong>Bank-Only Liability:</strong> Missing from system records. You can register historical LGs via the{' '}
                            <Link to={`${basePrefix}/issuance/migration-hub`} className="text-rose-700 underline font-bold hover:text-rose-900">
                                Migration Hub
                            </Link>.
                        </div>
                    )}

                    {/* Corporate Admin Checker Approval Controls for Pending Adjustments */}
                    {isCorporateAdmin && result.user_resolution === 'ADJUSTED' && result.approval_status === 'PENDING_APPROVAL' && (
                        <div className="mt-3.5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl flex flex-wrap justify-between items-center gap-3">
                            <div className="text-xs sm:text-sm text-blue-900">
                                <strong>Pending Corporate Admin Sign-Off:</strong> Maker requested updating system value from{' '}
                                <code className="px-1.5 py-0.5 rounded bg-white border border-blue-200 font-mono text-xs">{result.system_value || '—'}</code> to <strong>{result.bank_value || '—'}</strong>.
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onApproveAdjustment(result.id)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                                >
                                    <Check size={14} /> Approve Adjustment
                                </button>
                                <button
                                    onClick={() => onRejectAdjustment(result.id)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors"
                                >
                                    <X size={14} /> Reject
                                </button>
                            </div>
                        </div>
                    )}

                    {result.resolution_notes && (
                        <p className="mt-2.5 text-xs text-slate-500 italic flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{result.resolution_notes}</span>
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

function BankRowsTable({ rows }) {
    const [show, setShow] = useState(false);
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <button
                onClick={() => setShow(!show)}
                className="w-full px-5 py-3.5 bg-slate-50 hover:bg-slate-100/70 border-b border-slate-100 flex justify-between items-center font-semibold text-sm text-slate-700 rounded-none shadow-none focus:ring-0 transition-colors"
            >
                <span className="inline-flex items-center gap-2">
                    <FileText size={16} className="text-slate-500" />
                    <span>Parsed Bank Rows ({rows.length})</span>
                </span>
                {show ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {show && (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs sm:text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                {['LG Number', 'Beneficiary', 'Amount', 'Currency', 'Issue Date', 'Expiry', 'Match'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="px-4 py-2.5 text-slate-800 font-mono text-xs">{r.bank_lg_number || '—'}</td>
                                    <td className="px-4 py-2.5 text-slate-700">{r.beneficiary_name || '—'}</td>
                                    <td className="px-4 py-2.5 text-slate-900 font-semibold tabular-nums">{r.amount ? Number(r.amount).toLocaleString() : '—'}</td>
                                    <td className="px-4 py-2.5 text-slate-600">{r.currency_code || '—'}</td>
                                    <td className="px-4 py-2.5 text-slate-600">{formatDate(r.issue_date)}</td>
                                    <td className="px-4 py-2.5 text-slate-600">{formatDate(r.expiry_date)}</td>
                                    <td className="px-4 py-2.5">
                                        <MatchBadge status={r.match_status} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const STAT_TONES = {
    slate: 'bg-slate-50/80 border-slate-200 text-slate-700',
    emerald: 'bg-emerald-50/70 border-emerald-200 text-emerald-700',
    rose: 'bg-rose-50/70 border-rose-200 text-rose-700',
    amber: 'bg-amber-50/70 border-amber-200 text-amber-700',
    violet: 'bg-violet-50/70 border-violet-200 text-violet-700',
};

function StatCard({ label, value, tone = 'slate' }) {
    const cls = STAT_TONES[tone] || STAT_TONES.slate;
    return (
        <div className={`rounded-xl p-3.5 border text-center ${cls}`}>
            <div className="text-2xl font-extrabold tabular-nums">{value}</div>
            <div className="text-xs text-slate-500 font-semibold mt-0.5">{label}</div>
        </div>
    );
}

function StatusBadge({ status }) {
    const map = {
        CREATED: 'bg-slate-100 text-slate-600 border-slate-200',
        PARSING: 'bg-blue-50 text-blue-700 border-blue-200',
        PARSED: 'bg-sky-50 text-sky-700 border-sky-200',
        MATCHING: 'bg-amber-50 text-amber-700 border-amber-200',
        MATCHED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
        COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    const cls = map[status] || map.CREATED;
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${cls}`}>
            {status}
        </span>
    );
}

function MatchBadge({ status }) {
    const map = {
        MATCHED: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2, label: 'Matched' },
        PARTIAL_MATCH: { cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: AlertTriangle, label: 'Partial' },
        BANK_ONLY: { cls: 'bg-rose-50 text-rose-700 border-rose-200', Icon: XCircle, label: 'Bank Only' },
        UNMATCHED: { cls: 'bg-slate-100 text-slate-600 border-slate-200', Icon: Clock, label: 'Pending' },
    };
    const m = map[status] || map.UNMATCHED;
    const BadgeIcon = m.Icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${m.cls}`}>
            <BadgeIcon className="w-3 h-3" /> {m.label}
        </span>
    );
}

function ResolutionBadge({ resolution, approval }) {
    const pillBase = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border';
    if (resolution === 'ADJUSTED') {
        if (approval === 'APPROVED') {
            return <span className={`${pillBase} bg-emerald-50 text-emerald-700 border-emerald-200`}><CheckCircle2 className="w-3 h-3" /> Adjusted &amp; Approved</span>;
        }
        if (approval === 'REJECTED') {
            return <span className={`${pillBase} bg-rose-50 text-rose-700 border-rose-200`}><XCircle className="w-3 h-3" /> Rejected</span>;
        }
        return <span className={`${pillBase} bg-blue-50 text-blue-700 border-blue-200`}><Clock className="w-3 h-3" /> Pending Approval</span>;
    }
    if (resolution === 'DISPUTE') {
        return <span className={`${pillBase} bg-amber-50 text-amber-700 border-amber-200`}><Search className="w-3 h-3" /> Disputed</span>;
    }
    if (resolution === 'IGNORE') {
        return <span className={`${pillBase} bg-slate-100 text-slate-600 border-slate-200`}><Ban className="w-3 h-3" /> Ignored</span>;
    }
    return null;
}
