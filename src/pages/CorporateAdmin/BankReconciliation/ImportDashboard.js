import React, { useState, useEffect } from 'react';
import {
    Upload, FileText, CheckCircle2,
    AlertCircle, Landmark, ArrowRight,
    Calendar, Coins, Database, Trash2,
    RefreshCw, AlertTriangle, Sparkles, Lock, Wallet
} from 'lucide-react';
import { apiRequest } from '../../../services/apiService';
import { isCachedTrialSession } from '../../../components/Trial/useTrialExperience';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import FormattedDateInput from 'components/FormattedDateInput';
import { formatDate } from '../../../utils/dateFormat';

const ImportDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const basePrefix = location.pathname.startsWith('/end-user') ? '/end-user' : '/corporate-admin';
    const [statements, setStatements] = useState([]);
    const [banks, setBanks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [headerDrift, setHeaderDrift] = useState(null); // 3.3: Header drift detection
    const [isReAnalyzing, setIsReAnalyzing] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        bank_id: '',
        opening_balance: '',
        closing_balance: '',
        start_date: '',
        end_date: '',
        pdf_password: '',
    });
    const [file, setFile] = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [cashPositions, setCashPositions] = useState(null);
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
        const handleSampleLoaded = (evt) => {
            if (!evt?.detail?.scope || evt.detail.scope === 'reconciliation') {
                setIsAutoLoadingTrial(false);
                fetchStatements();
            }
        };
        window.addEventListener('grow-trial-sample-loaded', handleSampleLoaded);
        return () => window.removeEventListener('grow-trial-sample-loaded', handleSampleLoaded);
    }, []);

    useEffect(() => {
        const initialize = async () => {
            setIsLoading(true);
            await Promise.all([
                fetchStatements(),
                fetchBanks(),
                fetchCashPositions()
            ]);
            setIsLoading(false);
        };
        initialize();
    }, []);

    const fetchCashPositions = async () => {
        try {
            const data = await apiRequest('/reconciliation/cash-positions', 'GET');
            setCashPositions(data);
        } catch (err) {
            console.warn("Failed to fetch live cash positions", err);
        }
    };

    const fetchBanks = async () => {
        try {
            const data = await apiRequest('/reconciliation/banks', 'GET');
            setBanks(data);
            if (data.length > 0) {
                setFormData(prev => ({ ...prev, bank_id: data[0].id }));
            }
        } catch (err) {
            console.error("Failed to fetch banks", err);
        }
    };

    const fetchStatements = async () => {
        try {
            const data = await apiRequest('/reconciliation/statements', 'GET');
            const sorted = data.sort((a, b) => new Date(b.created_at || b.statement_start_date) - new Date(a.created_at || a.statement_start_date));
            setStatements(sorted.slice(0, 5));
        } catch (err) {
            console.error("Failed to fetch statements", err);
        }
    };

    const handleDeleteStatement = async (statementId) => {
        if (!window.confirm("Are you sure you want to delete this statement and all its transactions? This action cannot be undone.")) return;

        try {
            await apiRequest(`/reconciliation/statements/${statementId}`, 'DELETE');
            // Refresh list
            fetchStatements();
        } catch (error) {
            console.error("Failed to delete statement:", error);
            alert("Failed to delete statement. " + (error.message || ""));
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            setUploadError("Please select a file to upload.");
            return;
        }

        setIsUploading(true);
        setUploadError(null);

        const data = new FormData();
        data.append('file', file);
        data.append('bank_id', formData.bank_id);

        // Only append metadata if provided (Smart Ingestion)
        if (formData.opening_balance) data.append('opening_balance', formData.opening_balance);
        if (formData.closing_balance) data.append('closing_balance', formData.closing_balance);
        if (formData.start_date) data.append('start_date', formData.start_date);
        if (formData.end_date) data.append('end_date', formData.end_date);
        if (formData.pdf_password) data.append('pdf_password', formData.pdf_password);

        try {
            const result = await apiRequest('/reconciliation/statements/upload', 'POST', data);

            // 3.3: Check for header drift after successful upload
            try {
                if (result?.headers && formData.bank_id) {
                    const driftResult = await apiRequest('/issuance/reconciliation/check-headers', 'POST', {
                        bank_id: parseInt(formData.bank_id),
                        headers: result.headers
                    });
                    if (driftResult?.has_drift) {
                        setHeaderDrift({ ...driftResult, bank_id: parseInt(formData.bank_id) });
                    }
                }
            } catch (driftErr) {
                console.warn('Header drift check skipped:', driftErr);
            }

            setFormData({ bank_id: formData.bank_id || 1, opening_balance: '', closing_balance: '', start_date: '', end_date: '', pdf_password: '' });
            setFile(null);
            setShowAdvanced(false);
            fetchStatements();
            fetchCashPositions();
        } catch (err) {
            setUploadError(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Bank Statement Ingestion</h1>
                    <p className="text-gray-500 mt-1">Upload statements. The system will auto-detect balances and dates.</p>
                </div>
                <button
                    onClick={() => navigate(`${basePrefix}/reconciliation/workspace`)}
                    className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                    <Landmark className="w-5 h-5 mr-2" />
                    View Unified Master Ledger
                </button>
            </div>

            {cashPositions && cashPositions.total_accounts_count > 0 && (
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-5 shadow-md border border-teal-500/20">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-teal-500/20 text-teal-300 rounded-xl">
                                <Wallet className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-[11px] uppercase tracking-wider text-teal-300 font-bold">
                                    Live Multi-Bank Cash Position
                                </div>
                                <div className="text-xs text-slate-300">
                                    {cashPositions.banks_covered_count} bank(s) · {cashPositions.total_accounts_count} account(s) synced via Inbox, Folder Sync &amp; Uploads
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            {Object.values(cashPositions.totals_by_currency || {}).map((tot) => (
                                <div key={tot.currency} className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/15">
                                    <span className="text-[10px] uppercase tracking-wider text-teal-200 font-bold block">
                                        {tot.currency} ({tot.account_count})
                                    </span>
                                    <span className="text-base font-extrabold text-white font-mono">
                                        {Number(tot.available_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upload Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
                        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                            <Upload className="w-5 h-5 mr-2 text-blue-600" />
                            Smart Import
                        </h3>

                        <form onSubmit={handleUpload} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Bank</label>
                                <select
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    value={formData.bank_id}
                                    onChange={(e) => setFormData({ ...formData, bank_id: e.target.value })}
                                    disabled={banks.length === 0}
                                >
                                    {banks.length === 0 ? (
                                        <option value="">No banks found</option>
                                    ) : (
                                        banks.map(bank => (
                                            <option key={bank.id} value={bank.id}>{bank.name}</option>
                                        ))
                                    )}
                                </select>
                            </div>

                            <div className="pt-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Statement File (Excel / CSV / PDF / MT940)</label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors cursor-pointer group">
                                    <div className="space-y-1 text-center">
                                        <FileText className="mx-auto h-12 w-12 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                        <div className="flex text-sm text-gray-600">
                                            <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                                <span>{file ? file.name : "Drop file or click to browse"}</span>
                                                <input
                                                    type="file"
                                                    accept=".pdf,.mt940,.sta,.940,.xml,.csv,.xlsx,.xls,.xlsb"
                                                    className="sr-only"
                                                    onChange={(e) => setFile(e.target.files[0])}
                                                />
                                            </label>
                                        </div>
                                        <p className="text-xs text-gray-500">Excel, CSV, SWIFT MT940/CAMT.053, or PDF (plain/encrypted)</p>
                                    </div>
                                </div>
                            </div>

                            {file && file.name && file.name.toLowerCase().endsWith('.pdf') && (
                                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1.5">
                                    <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                                        Statement PDF Password (if encrypted)
                                    </label>
                                    <input
                                        type="password"
                                        className="w-full px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-sm font-mono"
                                        placeholder="Leave blank if unlocked or saved on Bank Account"
                                        value={formData.pdf_password}
                                        onChange={(e) => setFormData({ ...formData, pdf_password: e.target.value })}
                                    />
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center mt-2"
                            >
                                {showAdvanced ? "Hide manual overrides" : "Manual overrides (Optional)"}
                            </button>

                            {showAdvanced && (
                                <div className="space-y-4 pt-4 border-t border-gray-100 animate-in slide-in-from-top-2 duration-300">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                            <FormattedDateInput
                                                className="w-full px-3 py-2 border rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                                value={formData.start_date}
                                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                            <FormattedDateInput
                                                className="w-full px-3 py-2 border rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                                value={formData.end_date}
                                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Opening Bal</label>
                                            <input
                                                type="number" step="0.01"
                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                                placeholder="Auto-detect"
                                                value={formData.opening_balance}
                                                onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Closing Bal</label>
                                            <input
                                                type="number" step="0.01"
                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                                placeholder="Auto-detect"
                                                value={formData.closing_balance}
                                                onChange={(e) => setFormData({ ...formData, closing_balance: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {uploadError && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start">
                                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                                    <p className="text-xs text-red-600">{uploadError}</p>
                                </div>
                            )}

                            <div className={isTrialSandbox ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5' : ''}>
                                <button
                                    type="submit"
                                    disabled={isUploading}
                                    className="w-full bg-blue-600 text-white py-2.5 px-3 rounded-lg font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all flex items-center justify-center disabled:opacity-50"
                                >
                                    {isUploading ? "Analyzing File..." : "Import Statement"}
                                </button>
                                {isTrialSandbox && (
                                    <button
                                        type="button"
                                        disabled={isAutoLoadingTrial || isUploading}
                                        onClick={() => {
                                            setIsAutoLoadingTrial(true);
                                            window.dispatchEvent(
                                                new CustomEvent('grow-trial-trigger-autoload', { detail: { actionId: 'reconciliation_full' } })
                                            );
                                            setTimeout(() => setIsAutoLoadingTrial(false), 12000);
                                        }}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                        title="Auto-load sample Bank A & B statements + SAP invoices and match them"
                                    >
                                        <Sparkles className={`w-4 h-4 ${isAutoLoadingTrial ? 'animate-spin' : ''}`} />
                                        <span>{isAutoLoadingTrial ? 'Loading Sample...' : 'Do It For Me'}</span>
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* 3.3: Header Drift Warning */}
                    {headerDrift && (
                        <div className="bg-white rounded-xl shadow-sm border-2 border-amber-300 p-5 space-y-3 mt-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-sm text-amber-900">Column Headers Changed</h4>
                                    <p className="text-xs text-amber-700 mt-0.5">
                                        The bank appears to have changed their statement format since last upload.
                                    </p>
                                </div>
                            </div>

                            {headerDrift.new_columns?.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold text-green-700 uppercase mb-1">New Columns:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {headerDrift.new_columns.map(col => (
                                            <span key={col} className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full font-medium">+ {col}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {headerDrift.missing_columns?.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold text-red-700 uppercase mb-1">Missing Columns:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {headerDrift.missing_columns.map(col => (
                                            <span key={col} className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] rounded-full font-medium">{'\u2212'} {col}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-2 pt-2 border-t border-amber-200">
                                <button
                                    disabled={isReAnalyzing}
                                    onClick={async () => {
                                        setIsReAnalyzing(true);
                                        try {
                                            await apiRequest('/issuance/reconciliation/re-analyze-mapping', 'POST', {
                                                bank_id: headerDrift.bank_id,
                                                headers: headerDrift.new_headers || []
                                            });
                                            setHeaderDrift(null);
                                            alert('Column mapping re-analyzed successfully. Future uploads will use the updated mapping.');
                                        } catch (err) {
                                            console.error('Re-analyze failed:', err);
                                            alert('Failed to re-analyze mapping: ' + (err.message || ''));
                                        } finally {
                                            setIsReAnalyzing(false);
                                        }
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-all"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isReAnalyzing ? 'animate-spin' : ''}`} />
                                    {isReAnalyzing ? 'Re-analyzing...' : 'Re-Analyze Mapping'}
                                </button>
                                <button
                                    onClick={() => setHeaderDrift(null)}
                                    className="px-3 py-1.5 text-xs text-amber-600 hover:text-amber-800 font-medium"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Recent Statements List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-800">Recent Statement Imports</h3>
                            <span className="text-xs text-gray-500">Showing last 5</span>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {isLoading ? (
                                <div className="p-12 text-center text-gray-500">Loading statements...</div>
                            ) : statements.length === 0 ? (
                                <div className="p-12 text-center text-gray-500">No statements imported yet.</div>
                            ) : (
                                statements.map((stmt) => (
                                    <div key={stmt.id} className="p-6 hover:bg-gray-50 transition-colors group">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start space-x-4">
                                                <div className="mt-1 bg-blue-50 p-2 rounded-lg text-blue-600">
                                                    <Landmark className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-gray-900">{stmt.file_name}</h4>
                                                    <div className="flex items-center space-x-3 mt-1">
                                                        <span className="flex items-center text-xs text-gray-500">
                                                            <Calendar className="w-3 h-3 mr-1" />
                                                            {formatDate(stmt.statement_start_date)} - {formatDate(stmt.statement_end_date)}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stmt.status === 'VALIDATED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                            }`}>
                                                            {stmt.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="text-sm font-bold text-gray-900 flex items-center justify-end">
                                                    <Coins className="w-4 h-4 mr-1 text-gray-400" />
                                                    {Number(stmt.closing_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {stmt.currency?.iso_code || stmt.currency || 'EGP'}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {Number(stmt.opening_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Open)
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-6 flex items-center justify-between">
                                            <div className="flex items-center space-x-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">Integrity</span>
                                                    {stmt.status === 'VALIDATED' ? (
                                                        <span className="flex items-center text-xs font-medium text-green-600">
                                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                                            Balanced
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center text-xs font-medium text-amber-600">
                                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                                            Balance Warning
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleDeleteStatement(stmt.id)}
                                                    className="flex items-center text-sm font-semibold text-red-500 hover:text-red-700 transition-all opacity-0 group-hover:opacity-100"
                                                    title="Delete Statement"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                                                </button>
                                                <button
                                                    onClick={() => navigate(`${basePrefix}/reconciliation/workspace/${stmt.id}`)}
                                                    className="flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    Go to Workspace
                                                    <ArrowRight className="w-4 h-4 ml-1" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportDashboard;
