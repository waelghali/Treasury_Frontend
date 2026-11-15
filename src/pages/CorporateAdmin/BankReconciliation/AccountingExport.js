import React, { useState, useEffect } from 'react';
import {
    Download, FileSpreadsheet, Lock, CheckCircle2, AlertCircle, Info,
    Plus, Trash2, ArrowUp, ArrowDown, Save, Eye, Settings2, Layers
} from 'lucide-react';
import { apiRequest, API_BASE_URL } from '../../../services/apiService';

const DEFAULT_COLUMNS = [
    { source_field: 'booking_date', custom_header: 'Booking Date' },
    { source_field: 'value_date', custom_header: 'Value Date' },
    { source_field: 'account_number', custom_header: 'Account Number' },
    { source_field: 'raw_description', custom_header: 'Description' },
    { source_field: 'counterparty_name', custom_header: 'Counterparty' },
    { source_field: 'debit_amount', custom_header: 'Debit' },
    { source_field: 'credit_amount', custom_header: 'Credit' },
    { source_field: 'currency', custom_header: 'Currency' },
    { source_field: 'running_balance', custom_header: 'Running Balance' },
    { source_field: 'classification_category', custom_header: 'Category' },
    { source_field: 'internal_category', custom_header: 'GL Account' },
    { source_field: 'is_reconciled', custom_header: 'Reconciled' },
    { source_field: 'matched_erp_reference', custom_header: 'Matched ERP Ref' },
    { source_field: 'variance_amount', custom_header: 'Variance / Fee' }
];

const AccountingExport = () => {
    const [profiles, setProfiles] = useState([]);
    const [selectedProfileId, setSelectedProfileId] = useState('');
    const [profileName, setProfileName] = useState('');
    const [availableFields, setAvailableFields] = useState([]);
    const [columnsConfig, setColumnsConfig] = useState(DEFAULT_COLUMNS);
    const [fileFormat, setFileFormat] = useState('CSV');
    const [dateFormat, setDateFormat] = useState('%Y-%m-%d');
    const [expandJournalLegs, setExpandJournalLegs] = useState(false);
    const [bankGlAccount, setBankGlAccount] = useState('1010010 - Cash at Bank');
    const [onlyReconciled, setOnlyReconciled] = useState(false);
    const [onlyClassified, setOnlyClassified] = useState(false);
    const [excludeExported, setExcludeExported] = useState(false);
    const [markAsExported, setMarkAsExported] = useState(false);

    const [summary, setSummary] = useState({
        total_transactions: 0,
        finalized_count: 0,
        unclassified_count: 0,
        exported_count: 0,
        matching_export_rows: 0
    });
    const [previewHeaders, setPreviewHeaders] = useState([]);
    const [previewRows, setPreviewRows] = useState([]);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [showBuilder, setShowBuilder] = useState(true);

    useEffect(() => {
        fetchProfiles();
        fetchAvailableFields();
        loadPreview();
    }, []);

    const fetchProfiles = async () => {
        try {
            const data = await apiRequest('/reconciliation/export-profiles', 'GET');
            setProfiles(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load export profiles', err);
        }
    };

    const fetchAvailableFields = async () => {
        try {
            const data = await apiRequest('/reconciliation/export/available-fields', 'GET');
            if (data && Array.isArray(data.available_fields)) {
                setAvailableFields(data.available_fields);
            }
        } catch (err) {
            console.error('Failed to load available export fields', err);
        }
    };

    const buildRequestPayload = () => ({
        profile_id: selectedProfileId ? parseInt(selectedProfileId, 10) : null,
        file_format: fileFormat,
        date_format: dateFormat,
        columns_config: columnsConfig,
        expand_journal_legs: expandJournalLegs,
        bank_gl_account: bankGlAccount,
        only_reconciled: onlyReconciled ? true : null,
        only_classified: onlyClassified ? true : null,
        exclude_already_exported: excludeExported,
        mark_as_exported: markAsExported
    });

    const loadPreview = async () => {
        setIsLoadingPreview(true);
        try {
            const data = await apiRequest('/reconciliation/export/preview', 'POST', buildRequestPayload());
            if (data) {
                setSummary(data.summary || summary);
                setPreviewHeaders(data.headers || []);
                setPreviewRows(data.preview_rows || []);
            }
        } catch (err) {
            console.error('Failed to load export preview', err);
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const handleSelectProfile = (profId) => {
        setSelectedProfileId(profId);
        const found = profiles.find(p => String(p.id) === String(profId));
        if (found) {
            setProfileName(found.profile_name);
            setColumnsConfig(found.columns_config_json || DEFAULT_COLUMNS);
            setFileFormat(found.file_format || 'CSV');
            setDateFormat(found.date_format || '%Y-%m-%d');
            setExpandJournalLegs(Boolean(found.expand_journal_legs));
            setBankGlAccount(found.bank_gl_account || '1010010 - Cash at Bank');
        }
    };

    const handleAddColumn = () => {
        const firstField = availableFields[0]?.source_field || 'raw_description';
        const firstHeader = availableFields[0]?.default_header || 'Description';
        setColumnsConfig(prev => [...prev, { source_field: firstField, custom_header: firstHeader }]);
    };

    const handleRemoveColumn = (idx) => {
        setColumnsConfig(prev => prev.filter((_, i) => i !== idx));
    };

    const handleMoveColumn = (idx, dir) => {
        const target = idx + dir;
        if (target < 0 || target >= columnsConfig.length) return;
        const copy = [...columnsConfig];
        const temp = copy[idx];
        copy[idx] = copy[target];
        copy[target] = temp;
        setColumnsConfig(copy);
    };

    const handleColumnChange = (idx, key, val) => {
        setColumnsConfig(prev => prev.map((col, i) => {
            if (i !== idx) return col;
            const updated = { ...col, [key]: val };
            if (key === 'source_field') {
                const matchField = availableFields.find(f => f.source_field === val);
                if (matchField) {
                    updated.custom_header = matchField.default_header;
                }
            }
            return updated;
        }));
    };

    const handleSaveProfile = async () => {
        if (!profileName.trim()) {
            alert('Please enter a template name to save this export layout.');
            return;
        }
        setIsSavingProfile(true);
        try {
            const payload = {
                profile_name: profileName.trim(),
                file_format: fileFormat,
                columns_config_json: columnsConfig,
                date_format: dateFormat,
                expand_journal_legs: expandJournalLegs,
                bank_gl_account: bankGlAccount,
                is_default: profiles.length === 0,
                is_active: true
            };
            if (selectedProfileId) {
                await apiRequest(`/reconciliation/export-profiles/${selectedProfileId}`, 'PUT', payload);
            } else {
                const created = await apiRequest('/reconciliation/export-profiles', 'POST', payload);
                if (created?.id) setSelectedProfileId(String(created.id));
            }
            await fetchProfiles();
            await loadPreview();
        } catch (err) {
            console.error('Failed to save export profile', err);
            alert('Failed to save export template.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleDownloadExport = async () => {
        try {
            const token = localStorage.getItem('jwt_token') || localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/reconciliation/export/download`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify(buildRequestPayload())
            });
            if (!res.ok) throw new Error('Export download failed');
            const blob = await res.blob();
            const ext = fileFormat.toLowerCase() === 'xlsx' ? 'xlsx' : 'csv';
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reconciliation_export_${new Date().toISOString().slice(0, 10)}.${ext}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            if (markAsExported) loadPreview();
        } catch (err) {
            console.error('Download error:', err);
            alert('Failed to download export file.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Customizable Accounting & ERP Export</h1>
                    <p className="text-gray-500 mt-1">
                        Design your exact column order, headers, custom fields, and double-entry GL journal format.
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setShowBuilder(!showBuilder)}
                        className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        <Settings2 className="w-4 h-4 mr-2 text-blue-600" />
                        {showBuilder ? 'Hide Layout Builder' : 'Customize Columns & Order'}
                    </button>
                    <button
                        onClick={loadPreview}
                        className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        <Eye className="w-4 h-4 mr-2 text-indigo-600" />
                        Refresh Preview
                    </button>
                    <button
                        onClick={handleDownloadExport}
                        className="flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download {fileFormat}
                    </button>
                </div>
            </div>

            {/* Live Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-gray-700">Classified / Reconciled</h3>
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="text-2xl font-extrabold text-gray-900">{summary.finalized_count}</div>
                    <p className="text-xs text-gray-500 mt-1">Of {summary.total_transactions} total transactions</p>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-gray-700">Unclassified</h3>
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="text-2xl font-extrabold text-amber-600">{summary.unclassified_count}</div>
                    <p className="text-xs text-gray-500 mt-1">Pending GL assignment</p>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-gray-700">Export Rows Ready</h3>
                        <Layers className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="text-2xl font-extrabold text-blue-600">{summary.matching_export_rows}</div>
                    <p className="text-xs text-gray-500 mt-1">
                        {expandJournalLegs ? 'Expanded Double-Entry GL Legs' : 'Direct Statement Rows'}
                    </p>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-gray-700">Locked / Exported</h3>
                        <Lock className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="text-2xl font-extrabold text-gray-900">{summary.exported_count}</div>
                    <p className="text-xs text-gray-500 mt-1">Previously exported</p>
                </div>
            </div>

            {/* Custom Export Builder Panel */}
            {showBuilder && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-100 pb-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Saved Export Template</label>
                                <select
                                    value={selectedProfileId}
                                    onChange={(e) => handleSelectProfile(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                >
                                    <option value="">-- Custom / Unsaved Layout --</option>
                                    {profiles.map(p => (
                                        <option key={p.id} value={p.id}>{p.profile_name} ({p.file_format})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Template Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. SAP GL Journal Import"
                                    value={profileName}
                                    onChange={(e) => setProfileName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">File Format</label>
                                <select
                                    value={fileFormat}
                                    onChange={(e) => setFileFormat(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                >
                                    <option value="CSV">CSV (UTF-8 with BOM)</option>
                                    <option value="XLSX">Excel Workbook (.xlsx)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Date Format</label>
                                <select
                                    value={dateFormat}
                                    onChange={(e) => setDateFormat(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                >
                                    <option value="%Y-%m-%d">YYYY-MM-DD (2026-08-31)</option>
                                    <option value="%d/%m/%Y">DD/MM/YYYY (31/08/2026)</option>
                                    <option value="%m/%d/%Y">MM/DD/YYYY (08/31/2026)</option>
                                    <option value="%d-%b-%Y">DD-MMM-YYYY (31-Aug-2026)</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleSaveProfile}
                            disabled={isSavingProfile}
                            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
                        >
                            <Save className="w-4 h-4 mr-1.5" />
                            {selectedProfileId ? 'Update Template' : 'Save Template'}
                        </button>
                    </div>

                    {/* Filters & Double-Entry Expansion Toggles */}
                    <div className="flex flex-wrap items-center gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={expandJournalLegs}
                                onChange={(e) => setExpandJournalLegs(e.target.checked)}
                                className="rounded text-blue-600"
                            />
                            <span className="font-semibold text-gray-800">Expand Double-Entry GL Journal Legs (Bank + Offset + Fee Variance)</span>
                        </label>

                        {expandJournalLegs && (
                            <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-gray-600">Bank GL Account:</span>
                                <input
                                    type="text"
                                    value={bankGlAccount}
                                    onChange={(e) => setBankGlAccount(e.target.value)}
                                    className="px-2.5 py-1 border border-gray-200 rounded text-xs"
                                />
                            </div>
                        )}

                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={onlyClassified}
                                onChange={(e) => setOnlyClassified(e.target.checked)}
                                className="rounded text-blue-600"
                            />
                            <span className="text-gray-700">Only Classified</span>
                        </label>

                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={onlyReconciled}
                                onChange={(e) => setOnlyReconciled(e.target.checked)}
                                className="rounded text-blue-600"
                            />
                            <span className="text-gray-700">Only Reconciled with ERP</span>
                        </label>

                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={markAsExported}
                                onChange={(e) => setMarkAsExported(e.target.checked)}
                                className="rounded text-blue-600"
                            />
                            <span className="text-gray-700">Lock & Mark as Exported on Download</span>
                        </label>
                    </div>

                    {/* Column Selection & Ordering List */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-800">
                                Export Columns & Order ({columnsConfig.length} columns)
                            </h3>
                            <button
                                onClick={handleAddColumn}
                                className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Add Column
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                            {columnsConfig.map((col, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center space-x-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200"
                                >
                                    <span className="text-xs font-bold text-gray-400 w-6 text-center">#{idx + 1}</span>
                                    <select
                                        value={col.source_field}
                                        onChange={(e) => handleColumnChange(idx, 'source_field', e.target.value)}
                                        className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded text-xs bg-white"
                                    >
                                        {availableFields.length > 0 ? (
                                            availableFields.map(f => (
                                                <option key={f.source_field} value={f.source_field}>
                                                    [{f.group}] {f.default_header} ({f.source_field})
                                                </option>
                                            ))
                                        ) : (
                                            <option value={col.source_field}>{col.source_field}</option>
                                        )}
                                    </select>
                                    <input
                                        type="text"
                                        value={col.custom_header}
                                        onChange={(e) => handleColumnChange(idx, 'custom_header', e.target.value)}
                                        placeholder="Custom Header"
                                        className="w-36 px-2.5 py-1.5 border border-gray-200 rounded text-xs bg-white font-medium"
                                    />
                                    <button
                                        onClick={() => handleMoveColumn(idx, -1)}
                                        disabled={idx === 0}
                                        className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                                        title="Move Earlier"
                                    >
                                        <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleMoveColumn(idx, 1)}
                                        disabled={idx === columnsConfig.length - 1}
                                        className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                                        title="Move Later"
                                    >
                                        <ArrowDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleRemoveColumn(idx)}
                                        className="p-1 text-red-400 hover:text-red-600"
                                        title="Remove Column"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Live Data Preview Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm">Live Export Layout Preview (First 50 Rows)</h3>
                        <p className="text-xs text-gray-500">
                            Verify column order, custom headers, and formatting before downloading.
                        </p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {isLoadingPreview ? (
                        <div className="p-8 text-center text-sm text-gray-500">Loading export preview...</div>
                    ) : previewRows.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-400">
                            No transactions match the current export filter criteria.
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-50">
                                <tr>
                                    {previewHeaders.map((h, i) => (
                                        <th key={i} className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {previewRows.map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-gray-50">
                                        {previewHeaders.map((h, cIdx) => {
                                            const cellVal = String(row[h] !== undefined && row[h] !== null ? row[h] : '');
                                            return (
                                                <td key={cIdx} className="px-4 py-2.5 text-gray-700 min-w-[110px]">
                                                    <div className="cell-truncate">
                                                        <span className="truncate" title={cellVal}>{cellVal}</span>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountingExport;
