import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../services/apiService';
import {
    Upload, FileText, Brain, CheckCircle, XCircle, Clock, Loader2,
    ChevronDown, ChevronRight, Eye, Edit3, RefreshCw, AlertTriangle,
    Save, Plus, Trash2, X, Pause, Play, Star, Archive, RotateCcw
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function BankFormManagement() {
    const [banks, setBanks] = useState([]);
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedBank, setExpandedBank] = useState(null);
    const [selectedForm, setSelectedForm] = useState(null);
    const [lgTypes, setLgTypes] = useState([]);

    // Upload state
    const [showUpload, setShowUpload] = useState(false);
    const [uploadBankId, setUploadBankId] = useState('');
    const [uploadFormName, setUploadFormName] = useState('');
    const [uploadFormType, setUploadFormType] = useState('FILLABLE_PDF');
    const [uploadLgTypeIds, setUploadLgTypeIds] = useState([]);
    const [uploadFormLanguage, setUploadFormLanguage] = useState('BILINGUAL');
    const [uploadFile, setUploadFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(null);

    // Mapping editor state
    const [editingMapping, setEditingMapping] = useState(false);
    const [editableMapping, setEditableMapping] = useState([]);
    const [savingMapping, setSavingMapping] = useState(false);
    const [showArchived, setShowArchived] = useState(false);

    // Issue reports state
    const [issueReports, setIssueReports] = useState([]);
    const [loadingIssues, setLoadingIssues] = useState(false);
    const [issueStatusFilter, setIssueStatusFilter] = useState('OPEN');
    const [showIssues, setShowIssues] = useState(false);
    const [resolvingIssue, setResolvingIssue] = useState(null);
    const [resolutionNotes, setResolutionNotes] = useState('');

    const fetchBanks = useCallback(async () => {
        try {
            const data = await apiRequest('/system-owner/banks/');
            setBanks(data || []);
        } catch (err) {
            toast.error('Failed to load banks');
        }
    }, []);

    const fetchForms = useCallback(async () => {
        try {
            const url = showArchived ? '/issuance/bank-forms?include_archived=true' : '/issuance/bank-forms';
            const data = await apiRequest(url);
            setForms(data || []);
        } catch (err) {
            toast.error('Failed to load bank forms');
        }
    }, [showArchived]);

    const fetchLgTypes = useCallback(async () => {
        try {
            const data = await apiRequest('/issuance/lg-types');
            setLgTypes(data || []);
        } catch (err) {
            // Non-critical
        }
    }, []);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.all([fetchBanks(), fetchForms(), fetchLgTypes()]);
            setLoading(false);
        };
        load();
    }, [fetchBanks, fetchForms, fetchLgTypes]);

    const fetchIssueReports = async () => {
        setLoadingIssues(true);
        try {
            const url = issueStatusFilter
                ? `/system-owner/bank-form-issues?status_filter=${issueStatusFilter}`
                : '/system-owner/bank-form-issues';
            const data = await apiRequest(url);
            setIssueReports(data || []);
        } catch (err) {
            toast.error('Failed to load issue reports');
        } finally {
            setLoadingIssues(false);
        }
    };

    useEffect(() => {
        if (showIssues) fetchIssueReports();
    }, [showIssues, issueStatusFilter]);

    const handleResolveIssue = async (issueId, newStatus) => {
        try {
            await apiRequest(`/system-owner/bank-form-issues/${issueId}`, 'PATCH', {
                status: newStatus,
                resolution_notes: resolutionNotes,
            });
            toast.success(`Issue #${issueId} updated to ${newStatus}`);
            setResolvingIssue(null);
            setResolutionNotes('');
            fetchIssueReports();
        } catch (err) {
            toast.error(err.message || 'Failed to update issue');
        }
    };

    const handleUpload = async () => {
        if (!uploadBankId || !uploadFormName || !uploadFile) {
            toast.error('Please fill all fields and select a file');
            return;
        }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', uploadFile);

            let url = `/issuance/bank-forms/upload?bank_id=${uploadBankId}&form_name=${encodeURIComponent(uploadFormName)}&form_type=${uploadFormType}&form_language=${uploadFormLanguage}`;
            if (uploadLgTypeIds.length > 0) url += `&lg_type_ids=${uploadLgTypeIds.join(',')}`;
            const result = await apiRequest(url, 'POST', formData, 'multipart/form-data');

            toast.success(result.message || 'Form uploaded successfully');
            setShowUpload(false);
            setUploadFile(null);
            setUploadFormName('');
            setUploadBankId('');
            setUploadLgTypeIds([]);
            setUploadFormLanguage('BILINGUAL');
            await fetchForms();
        } catch (err) {
            toast.error(err.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleAnalyze = async (formId) => {
        setAnalyzing(formId);
        try {
            const result = await apiRequest(`/issuance/bank-forms/${formId}/analyze`, 'POST');
            toast.success(`AI Analysis complete: ${result.mapped_fields} fields mapped`);
            await fetchForms();
            setSelectedForm(result);
        } catch (err) {
            toast.error(err.message || 'AI analysis failed');
        } finally {
            setAnalyzing(null);
        }
    };

    // --- Form Management Actions ---
    const handleDeleteForm = async (form) => {
        if (!window.confirm(`Delete form "${form.name}"? This cannot be undone.`)) return;
        try {
            await apiRequest(`/issuance/bank-forms/${form.id}`, 'DELETE');
            toast.success(`Form "${form.name}" deleted.`);
            setSelectedForm(null);
            fetchForms();
        } catch (err) {
            toast.error(err.message || 'Failed to delete form.');
        }
    };

    const handleToggleActive = async (form) => {
        try {
            const res = await apiRequest(`/issuance/bank-forms/${form.id}/toggle-active`, 'PATCH');
            toast.success(res.message);
            fetchForms();
            if (selectedForm?.id === form.id) {
                setSelectedForm(prev => ({ ...prev, is_active: res.is_active }));
            }
        } catch (err) {
            toast.error(err.message || 'Failed to toggle form status.');
        }
    };

    const handleSetPriority = async (form, priority) => {
        try {
            await apiRequest(`/issuance/bank-forms/${form.id}/priority?priority=${priority}`, 'PATCH');
            toast.success(`Priority set to ${priority}.`);
            fetchForms();
            if (selectedForm?.id === form.id) {
                setSelectedForm(prev => ({ ...prev, priority }));
            }
        } catch (err) {
            toast.error(err.message || 'Failed to set priority.');
        }
    };

    const handleRestoreForm = async (form) => {
        try {
            const res = await apiRequest(`/issuance/bank-forms/${form.id}/restore`, 'PATCH');
            toast.success(res.message);
            fetchForms();
        } catch (err) {
            toast.error(err.message || 'Failed to restore form.');
        }
    };

    const handleViewDetails = async (formId) => {
        try {
            const data = await apiRequest(`/issuance/bank-forms/${formId}`);
            setSelectedForm(data);
            setEditingMapping(false);
        } catch (err) {
            toast.error('Failed to load form details');
        }
    };

    const startEditMapping = () => {
        setEditableMapping(JSON.parse(JSON.stringify(selectedForm.field_mapping || [])));
        setEditingMapping(true);
    };

    const handleSaveMapping = async () => {
        setSavingMapping(true);
        try {
            await apiRequest(`/issuance/bank-forms/${selectedForm.id}/mapping`, 'PUT', editableMapping);
            setSelectedForm(prev => ({ ...prev, field_mapping: editableMapping }));
            setEditingMapping(false);
            toast.success('Field mapping saved successfully!');
            fetchForms(); // Refresh list
        } catch (err) {
            toast.error(err.message || 'Failed to save mapping');
        } finally {
            setSavingMapping(false);
        }
    };

    const addMappingRow = () => {
        setEditableMapping(prev => [...prev, {
            pdf_field_name: '',
            label: '',
            mapped_to: '',
            field_type: 'text',
            confidence: 1.0,
        }]);
    };

    const removeMappingRow = (idx) => {
        setEditableMapping(prev => prev.filter((_, i) => i !== idx));
    };

    const updateMappingRow = (idx, key, value) => {
        setEditableMapping(prev => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], [key]: value };
            return copy;
        });
    };

    // Group forms by bank
    const formsByBank = {};
    forms.forEach(f => {
        if (!formsByBank[f.bank_id]) formsByBank[f.bank_id] = [];
        formsByBank[f.bank_id].push(f);
    });

    const statusIcon = (status) => {
        switch (status) {
            case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
            case 'ANALYZING': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
            case 'FAILED': return <XCircle className="w-4 h-4 text-red-500" />;
            default: return <Clock className="w-4 h-4 text-amber-500" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Bank Form Templates</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Upload bank PDF forms and use AI to auto-map fields for automatic filling
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${showArchived
                            ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                            : 'text-gray-600 bg-white border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        <Archive className="w-4 h-4" /> {showArchived ? 'Hide Archived' : 'Show Archived'}
                    </button>
                    <button
                        onClick={() => setShowUpload(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Upload className="w-4 h-4" /> Upload Bank Form
                    </button>
                </div>
            </div>

            {/* Upload Modal */}
            {showUpload && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Upload Bank Form</h2>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Row 1: Bank + Form Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                                <select
                                    value={uploadBankId}
                                    onChange={e => setUploadBankId(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                >
                                    <option value="">Select a bank...</option>
                                    {banks.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Form Name</label>
                                <input
                                    type="text"
                                    value={uploadFormName}
                                    onChange={e => setUploadFormName(e.target.value)}
                                    placeholder="e.g., ENBD LG Request Form"
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                            </div>

                            {/* Row 2: Form Type + Form Language */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Form Type</label>
                                <select
                                    value={uploadFormType}
                                    onChange={e => setUploadFormType(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                >
                                    <option value="FILLABLE_PDF">Fillable PDF (Digital Form)</option>
                                    <option value="SCANNED_FILL">Scanned Form (Print Over Scan)</option>
                                    <option value="PHYSICAL_OVERLAY">Physical Form Overlay (Print on Pre-printed)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Form Language</label>
                                <select
                                    value={uploadFormLanguage}
                                    onChange={e => setUploadFormLanguage(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                >
                                    <option value="BILINGUAL">Bilingual (Arabic & English)</option>
                                    <option value="AR">Arabic Only</option>
                                    <option value="EN">English Only</option>
                                </select>
                                <p className="text-xs text-gray-400 mt-1">Select "Bilingual" for forms with both Arabic and English sides</p>
                            </div>

                            {/* Row 3: LG Types + PDF File */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Applicable LG Types</label>
                                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                                    <label className="flex items-center gap-2 text-sm text-gray-600 pb-2 border-b border-gray-100">
                                        <input
                                            type="checkbox"
                                            checked={uploadLgTypeIds.length === 0}
                                            onChange={() => setUploadLgTypeIds([])}
                                            className="rounded text-blue-600"
                                        />
                                        <span className="font-medium">Universal (All LG Types)</span>
                                    </label>
                                    {lgTypes.map(t => (
                                        <label key={t.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                            <input
                                                type="checkbox"
                                                checked={uploadLgTypeIds.includes(t.id)}
                                                onChange={e => {
                                                    if (e.target.checked) {
                                                        setUploadLgTypeIds(prev => [...prev, t.id]);
                                                    } else {
                                                        setUploadLgTypeIds(prev => prev.filter(id => id !== t.id));
                                                    }
                                                }}
                                                className="rounded text-blue-600"
                                            />
                                            {t.name}
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">
                                    {uploadLgTypeIds.length === 0
                                        ? 'This form will be used for all LG types'
                                        : `Selected ${uploadLgTypeIds.length} type(s) — form will only be used for selected types`
                                    }
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">PDF File</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors cursor-pointer"
                                    onClick={() => document.getElementById('bank-form-file').click()}
                                >
                                    {uploadFile ? (
                                        <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                                            <FileText className="w-5 h-5" />
                                            <span className="font-medium">{uploadFile.name}</span>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500">
                                            <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                                            Click to select a PDF file
                                        </div>
                                    )}
                                </div>
                                <input
                                    id="bank-form-file"
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={e => setUploadFile(e.target.files[0])}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                            <button
                                onClick={() => { setShowUpload(false); setUploadFile(null); }}
                                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {uploading ? 'Uploading...' : 'Upload'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Forms List grouped by Bank */}
            <div className="space-y-3">
                {banks.filter(b => formsByBank[b.id]?.length > 0).map(bank => (
                    <div key={bank.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <button
                            onClick={() => setExpandedBank(expandedBank === bank.id ? null : bank.id)}
                            className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                {expandedBank === bank.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                <span className="font-semibold text-gray-800">{bank.name}</span>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                    {formsByBank[bank.id].length} form{formsByBank[bank.id].length > 1 ? 's' : ''}
                                </span>
                            </div>
                        </button>

                        {expandedBank === bank.id && (
                            <div className="border-t border-gray-100">
                                <table className="w-full">
                                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-5 py-2 text-left">Form Name</th>
                                            <th className="px-5 py-2 text-left">Version</th>
                                            <th className="px-5 py-2 text-left">Type</th>
                                            <th className="px-5 py-2 text-left">AI Status</th>
                                            <th className="px-5 py-2 text-left">Fields</th>
                                            <th className="px-5 py-2 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {formsByBank[bank.id].map(form => (
                                            <tr key={form.id} className={`hover:bg-blue-50/30 transition-colors ${!form.is_active ? 'opacity-50' : ''} ${form.is_deleted ? 'bg-red-50/30 line-through' : ''}`}>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className={`w-4 h-4 ${form.is_deleted ? 'text-red-300' : 'text-gray-400'}`} />
                                                        <span className="text-sm font-medium text-gray-800 no-underline" style={{ textDecoration: 'none' }}>{form.name}</span>
                                                        {form.is_deleted && <span className="ml-1 px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded no-underline" style={{ textDecoration: 'none' }}>Deleted</span>}
                                                        {!form.is_deleted && !form.is_active && <span className="ml-1 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">Suspended</span>}
                                                        {form.priority > 0 && <span className="ml-1 px-1.5 py-0.5 text-[10px] font-medium bg-yellow-100 text-yellow-700 rounded">★ {form.priority}</span>}
                                                    </div>
                                                    <span className="text-xs text-gray-400 ml-6">{form.original_filename}</span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">
                                                        v{form.version}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${form.form_type === 'FILLABLE_PDF'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {form.form_type === 'FILLABLE_PDF' ? 'Digital' : 'Physical'}
                                                    </span>
                                                    {form.form_language && form.form_language !== 'BILINGUAL' && (
                                                        <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${form.form_language === 'AR' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                            {form.form_language === 'AR' ? 'عربي' : 'EN'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        {statusIcon(form.ai_analysis_status)}
                                                        <span className="text-xs text-gray-600">{form.ai_analysis_status}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className="text-sm text-gray-600">{form.mapped_fields_count || 0}</span>
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {form.ai_analysis_status !== 'COMPLETED' && (
                                                            <button
                                                                onClick={() => handleAnalyze(form.id)}
                                                                disabled={analyzing === form.id}
                                                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 disabled:opacity-50 transition-colors"
                                                                title="Run AI Analysis"
                                                            >
                                                                {analyzing === form.id
                                                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                    : <Brain className="w-3 h-3" />
                                                                }
                                                                {analyzing === form.id ? 'Analyzing...' : 'AI Analyze'}
                                                            </button>
                                                        )}
                                                        {form.ai_analysis_status === 'COMPLETED' && (
                                                            <button
                                                                onClick={() => handleAnalyze(form.id)}
                                                                disabled={analyzing === form.id}
                                                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 disabled:opacity-50 transition-colors"
                                                                title="Re-analyze"
                                                            >
                                                                <RefreshCw className="w-3 h-3" />
                                                                Re-analyze
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleViewDetails(form.id)}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                                                        >
                                                            <Eye className="w-3 h-3" /> Details
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleToggleActive(form); }}
                                                            className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-md border transition-colors ${form.is_active
                                                                ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                                                                : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                                                                }`}
                                                            title={form.is_active ? 'Suspend' : 'Activate'}
                                                        >
                                                            {form.is_active ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                                        </button>
                                                        <select
                                                            value={form.priority || 0}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => handleSetPriority(form, Number(e.target.value))}
                                                            className="px-1 py-1 text-[10px] border border-gray-200 rounded bg-white cursor-pointer w-12"
                                                            title="Priority (higher = preferred)"
                                                        >
                                                            {[0, 1, 2, 3, 5, 10, 20, 50].map(v => <option key={v} value={v}>{v === 0 ? '—' : `★${v}`}</option>)}
                                                        </select>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteForm(form); }}
                                                            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                                                            title="Delete form"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                        {form.is_deleted && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleRestoreForm(form); }}
                                                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors"
                                                                title="Restore form"
                                                            >
                                                                <RotateCcw className="w-3 h-3" /> Restore
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ))}

                {/* Banks with no forms */}
                {forms.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                        <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No bank forms uploaded yet</p>
                        <p className="text-sm text-gray-400 mt-1">Upload a bank's PDF form to get started with automatic filling</p>
                        <button
                            onClick={() => setShowUpload(true)}
                            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                            <Upload className="w-4 h-4" /> Upload First Form
                        </button>
                    </div>
                )}
            </div>

            {/* Customer-Reported Issues Section */}
            <div className="mt-8">
                <button
                    onClick={() => setShowIssues(!showIssues)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm w-full justify-between"
                >
                    <span className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Customer-Reported Form Issues
                    </span>
                    {showIssues ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </button>

                {showIssues && (
                    <div className="mt-3 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b bg-gray-50 flex items-center gap-3">
                            <span className="text-xs font-medium text-gray-500">Filter by status:</span>
                            {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', ''].map(st => (
                                <button
                                    key={st || 'ALL'}
                                    onClick={() => setIssueStatusFilter(st)}
                                    className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                                        issueStatusFilter === st
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {st || 'All'}
                                </button>
                            ))}
                        </div>

                        {loadingIssues ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                            </div>
                        ) : issueReports.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                No issue reports found for this filter.
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-2 text-left">#</th>
                                        <th className="px-4 py-2 text-left">Customer</th>
                                        <th className="px-4 py-2 text-left">Bank</th>
                                        <th className="px-4 py-2 text-left">Type</th>
                                        <th className="px-4 py-2 text-left">Severity</th>
                                        <th className="px-4 py-2 text-left">Description</th>
                                        <th className="px-4 py-2 text-left">Status</th>
                                        <th className="px-4 py-2 text-left">Reported</th>
                                        <th className="px-4 py-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {issueReports.map(issue => (
                                        <React.Fragment key={issue.id}>
                                            <tr className="hover:bg-blue-50/30 transition-colors">
                                                <td className="px-4 py-2.5 font-mono text-gray-500">#{issue.id}</td>
                                                <td className="px-4 py-2.5">
                                                    <span className="text-gray-800 font-medium">{issue.customer_name}</span>
                                                    <br />
                                                    <span className="text-[10px] text-gray-400">{issue.reported_by_email}</span>
                                                </td>
                                                <td className="px-4 py-2.5 text-gray-700">{issue.bank_name}</td>
                                                <td className="px-4 py-2.5">
                                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{issue.issue_type?.replace(/_/g, ' ')}</span>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                        issue.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                                        issue.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                                                        issue.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>{issue.severity}</span>
                                                </td>
                                                <td className="px-4 py-2.5 text-gray-600 max-w-xs truncate" title={issue.description}>{issue.description}</td>
                                                <td className="px-4 py-2.5">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                        issue.status === 'OPEN' ? 'bg-blue-100 text-blue-700' :
                                                        issue.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' :
                                                        issue.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>{issue.status}</span>
                                                </td>
                                                <td className="px-4 py-2.5 text-[10px] text-gray-400">{issue.created_at ? new Date(issue.created_at).toLocaleDateString() : '—'}</td>
                                                <td className="px-4 py-2.5 text-right">
                                                    <button
                                                        onClick={() => setResolvingIssue(resolvingIssue === issue.id ? null : issue.id)}
                                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                                    >
                                                        {resolvingIssue === issue.id ? 'Cancel' : 'Resolve'}
                                                    </button>
                                                </td>
                                            </tr>
                                            {resolvingIssue === issue.id && (
                                                <tr>
                                                    <td colSpan="9" className="px-4 py-3 bg-blue-50">
                                                        <div className="flex items-end gap-3">
                                                            <div className="flex-1">
                                                                <label className="text-xs font-medium text-gray-600 mb-1 block">Resolution Notes</label>
                                                                <textarea
                                                                    value={resolutionNotes}
                                                                    onChange={e => setResolutionNotes(e.target.value)}
                                                                    placeholder="Describe the fix or resolution..."
                                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none h-16"
                                                                />
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleResolveIssue(issue.id, 'IN_PROGRESS')}
                                                                    className="px-3 py-2 text-xs font-medium text-amber-700 bg-amber-100 border border-amber-200 rounded-lg hover:bg-amber-200 transition-colors"
                                                                >
                                                                    In Progress
                                                                </button>
                                                                <button
                                                                    onClick={() => handleResolveIssue(issue.id, 'RESOLVED')}
                                                                    className="px-3 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                                                                >
                                                                    <CheckCircle className="w-3 h-3 inline mr-1" /> Resolved
                                                                </button>
                                                                <button
                                                                    onClick={() => handleResolveIssue(issue.id, 'WONT_FIX')}
                                                                    className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
                                                                >
                                                                    Won't Fix
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {issue.resolution_notes && (
                                                            <p className="text-xs text-gray-500 mt-2"><strong>Previous notes:</strong> {issue.resolution_notes}</p>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* Details Side Panel */}
            {selectedForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-end z-50" onClick={() => setSelectedForm(null)}>
                    <div className="bg-white w-full max-w-5xl h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                            <h2 className="text-lg font-bold text-gray-900">Form Details</h2>
                            <button onClick={() => setSelectedForm(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-xs text-gray-500 uppercase">Form Name</span>
                                    <p className="text-sm font-medium text-gray-800">{selectedForm.name}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 uppercase">Bank</span>
                                    <p className="text-sm font-medium text-gray-800">{selectedForm.bank_name || selectedForm.bank_name_detected || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 uppercase">Version</span>
                                    <p className="text-sm font-medium text-gray-800">v{selectedForm.version}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 uppercase">AI Status</span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        {statusIcon(selectedForm.ai_analysis_status || selectedForm.status)}
                                        <span className="text-sm">{selectedForm.ai_analysis_status || selectedForm.status}</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 uppercase">Form Language</span>
                                    <p className="text-sm font-medium text-gray-800">
                                        {selectedForm.form_language === 'AR' ? 'Arabic Only' :
                                            selectedForm.form_language === 'EN' ? 'English Only' : 'Bilingual'}
                                    </p>
                                </div>
                            </div>

                            {/* AI Notes */}
                            {(selectedForm.form_notes || selectedForm.form_title) && (
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    <h3 className="text-sm font-semibold text-purple-800 mb-1 flex items-center gap-1.5">
                                        <Brain className="w-4 h-4" /> AI Analysis Notes
                                    </h3>
                                    {selectedForm.form_title && (
                                        <p className="text-sm text-purple-700">Detected title: <strong>{selectedForm.form_title}</strong></p>
                                    )}
                                    {selectedForm.form_notes && (
                                        <p className="text-sm text-purple-600 mt-1">{selectedForm.form_notes}</p>
                                    )}
                                </div>
                            )}

                            {/* Field Mapping — Editable */}
                            {selectedForm.field_mapping && selectedForm.field_mapping.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                                            <Edit3 className="w-4 h-4" /> Field Mapping ({(editingMapping ? editableMapping : selectedForm.field_mapping).length} fields)
                                        </h3>
                                        {!editingMapping ? (
                                            <button
                                                onClick={startEditMapping}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                                            >
                                                <Edit3 className="w-3 h-3" /> Edit Mappings
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={handleSaveMapping}
                                                    disabled={savingMapping}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                                >
                                                    {savingMapping ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => setEditingMapping(false)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                                                >
                                                    <X className="w-3 h-3" /> Cancel
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="border rounded-lg overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead className="bg-gray-50 text-gray-500 uppercase">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">PDF Field</th>
                                                    <th className="px-3 py-2 text-left">Label</th>
                                                    <th className="px-3 py-2 text-left">Maps To</th>
                                                    <th className="px-3 py-2 text-left">Type</th>
                                                    <th className="px-3 py-2 text-left">Format</th>
                                                    <th className="px-3 py-2 text-left">Lang</th>
                                                    {selectedForm.form_type === 'PHYSICAL_OVERLAY' && (
                                                        <>
                                                            <th className="px-2 py-2 text-center w-14">X</th>
                                                            <th className="px-2 py-2 text-center w-14">Y</th>
                                                            <th className="px-2 py-2 text-center w-14">Size</th>
                                                        </>
                                                    )}
                                                    <th className="px-3 py-2 text-center">{editingMapping ? '' : 'Conf.'}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {(editingMapping ? editableMapping : selectedForm.field_mapping).map((field, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                        <td className="px-3 py-2">
                                                            {editingMapping ? (
                                                                <input
                                                                    type="text"
                                                                    value={field.pdf_field_name || ''}
                                                                    onChange={e => updateMappingRow(idx, 'pdf_field_name', e.target.value)}
                                                                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs font-mono bg-white"
                                                                />
                                                            ) : (
                                                                <span className="font-mono text-gray-600">{field.pdf_field_name}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {editingMapping ? (
                                                                <input
                                                                    type="text"
                                                                    value={field.label || ''}
                                                                    onChange={e => updateMappingRow(idx, 'label', e.target.value)}
                                                                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-white"
                                                                />
                                                            ) : (
                                                                <span className="text-gray-700">{field.label}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {editingMapping ? (
                                                                <input
                                                                    type="text"
                                                                    value={field.mapped_to || ''}
                                                                    onChange={e => updateMappingRow(idx, 'mapped_to', e.target.value)}
                                                                    className="w-full px-2 py-1 border border-blue-200 rounded text-xs font-mono bg-blue-50 text-blue-700"
                                                                />
                                                            ) : (
                                                                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">
                                                                    {field.mapped_to}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {editingMapping ? (
                                                                <select
                                                                    value={field.field_type || 'text'}
                                                                    onChange={e => updateMappingRow(idx, 'field_type', e.target.value)}
                                                                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-white"
                                                                >
                                                                    <option value="text">text</option>
                                                                    <option value="date">date</option>
                                                                    <option value="checkbox">checkbox</option>
                                                                    <option value="radio">radio</option>
                                                                </select>
                                                            ) : (
                                                                <span className="text-gray-500">{field.field_type || 'text'}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {editingMapping ? (
                                                                <input
                                                                    type="text"
                                                                    value={field.date_format || ''}
                                                                    onChange={e => updateMappingRow(idx, 'date_format', e.target.value)}
                                                                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-white"
                                                                    placeholder={field.field_type === 'date' ? 'DD/MM/YY' : '—'}
                                                                />
                                                            ) : (
                                                                <span className="text-gray-400 text-[10px]">{field.date_format || '—'}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {editingMapping ? (
                                                                <select
                                                                    value={field.language || 'shared'}
                                                                    onChange={e => updateMappingRow(idx, 'language', e.target.value)}
                                                                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-white"
                                                                >
                                                                    <option value="shared">shared</option>
                                                                    <option value="en">en</option>
                                                                    <option value="ar">ar</option>
                                                                </select>
                                                            ) : (
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${field.language === 'en' ? 'bg-indigo-100 text-indigo-700' : field.language === 'ar' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                                                                    {field.language || 'shared'}
                                                                </span>
                                                            )}
                                                        </td>
                                                        {selectedForm.form_type === 'PHYSICAL_OVERLAY' && (
                                                            <>
                                                                <td className="px-2 py-2 text-center">
                                                                    {editingMapping ? (
                                                                        <input type="number" value={field.x ?? ''} onChange={e => updateMappingRow(idx, 'x', e.target.value ? Number(e.target.value) : null)}
                                                                            className="w-12 px-1 py-1 border border-gray-200 rounded text-xs text-center bg-white" />
                                                                    ) : (
                                                                        <span className="text-gray-500 text-[10px]">{field.x ?? '—'}</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-2 py-2 text-center">
                                                                    {editingMapping ? (
                                                                        <input type="number" value={field.y ?? ''} onChange={e => updateMappingRow(idx, 'y', e.target.value ? Number(e.target.value) : null)}
                                                                            className="w-12 px-1 py-1 border border-gray-200 rounded text-xs text-center bg-white" />
                                                                    ) : (
                                                                        <span className="text-gray-500 text-[10px]">{field.y ?? '—'}</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-2 py-2 text-center">
                                                                    {editingMapping ? (
                                                                        <input type="number" value={field.font_size ?? 10} onChange={e => updateMappingRow(idx, 'font_size', e.target.value ? Number(e.target.value) : 10)}
                                                                            className="w-12 px-1 py-1 border border-gray-200 rounded text-xs text-center bg-white" />
                                                                    ) : (
                                                                        <span className="text-gray-500 text-[10px]">{field.font_size ?? 10}</span>
                                                                    )}
                                                                </td>
                                                            </>
                                                        )}
                                                        <td className="px-3 py-2 text-center">
                                                            {editingMapping ? (
                                                                <button
                                                                    onClick={() => removeMappingRow(idx)}
                                                                    className="text-red-400 hover:text-red-600 transition-colors p-1"
                                                                    title="Remove field"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            ) : (
                                                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${field.confidence >= 0.8 ? 'bg-emerald-100 text-emerald-700' :
                                                                    field.confidence >= 0.5 ? 'bg-amber-100 text-amber-700' :
                                                                        'bg-red-100 text-red-700'
                                                                    }`}>
                                                                    {Math.round((field.confidence || 0) * 100)}%
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {editingMapping && (
                                            <div className="bg-gray-50 border-t px-3 py-2">
                                                <button
                                                    onClick={addMappingRow}
                                                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                                                >
                                                    <Plus className="w-3.5 h-3.5" /> Add Field
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Unmapped Fields */}
                            {selectedForm.unmapped_fields && selectedForm.unmapped_fields.length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                                        <AlertTriangle className="w-4 h-4" /> Unmapped Fields ({selectedForm.unmapped_fields.length})
                                    </h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedForm.unmapped_fields.map((field, idx) => (
                                            <span key={idx} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                                {typeof field === 'string' ? field : field.field_name || field.label || JSON.stringify(field)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
