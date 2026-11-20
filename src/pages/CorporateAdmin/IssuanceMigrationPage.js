// src/pages/CorporateAdmin/IssuanceMigrationPage.js
// Issuance Migration Hub — Upload, validate, edit, and import legacy LG records.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload, FileSpreadsheet, ScanLine, AlertCircle, CheckCircle2, Clock, Copy,
  AlertTriangle, Trash2, Edit3, RefreshCw, ChevronDown, ChevronRight, X,
  Download, Filter, Search, History, ZapOff, Zap, FileText, Check, Loader2
} from 'lucide-react';
import { apiRequest } from 'services/apiService';
import { formatDate } from '../../utils/dateFormat';

const API_BASE = '/issuance/migration';

// Status badge config
const STATUS_CONFIG = {
  READY_FOR_IMPORT: {
    label: 'Ready',
    color: '#059669',
    bg: '#ecfdf5',
    badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    activeRingCls: 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20',
    iconCls: 'text-emerald-600',
    countCls: 'text-emerald-700',
    icon: CheckCircle2,
  },
  ERROR: {
    label: 'Error',
    color: '#e11d48',
    bg: '#fff1f2',
    badgeCls: 'bg-rose-50 text-rose-700 border-rose-200',
    activeRingCls: 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-500/20',
    iconCls: 'text-rose-600',
    countCls: 'text-rose-700',
    icon: AlertCircle,
  },
  NEEDS_REVIEW: {
    label: 'Review',
    color: '#d97706',
    bg: '#fffbeb',
    badgeCls: 'bg-amber-50 text-amber-700 border-amber-200',
    activeRingCls: 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20',
    iconCls: 'text-amber-600',
    countCls: 'text-amber-700',
    icon: AlertTriangle,
  },
  DUPLICATE: {
    label: 'Duplicate',
    color: '#7c3aed',
    bg: '#f5f3ff',
    badgeCls: 'bg-violet-50 text-violet-700 border-violet-200',
    activeRingCls: 'border-violet-500 bg-violet-50/70 ring-2 ring-violet-500/20',
    iconCls: 'text-violet-600',
    countCls: 'text-violet-700',
    icon: Copy,
  },
  EXPIRED: {
    label: 'Expired',
    color: '#475569',
    bg: '#f8fafc',
    badgeCls: 'bg-slate-100 text-slate-600 border-slate-200',
    activeRingCls: 'border-slate-500 bg-slate-100/80 ring-2 ring-slate-500/20',
    iconCls: 'text-slate-500',
    countCls: 'text-slate-700',
    icon: Clock,
  },
  CONFLICT: {
    label: 'Conflict',
    color: '#ea580c',
    bg: '#fff7ed',
    badgeCls: 'bg-orange-50 text-orange-700 border-orange-200',
    activeRingCls: 'border-orange-500 bg-orange-50/70 ring-2 ring-orange-500/20',
    iconCls: 'text-orange-600',
    countCls: 'text-orange-700',
    icon: ZapOff,
  },
  IMPORTED: {
    label: 'Imported',
    color: '#2563eb',
    bg: '#eff6ff',
    badgeCls: 'bg-blue-50 text-blue-700 border-blue-200',
    activeRingCls: 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20',
    iconCls: 'text-blue-600',
    countCls: 'text-blue-700',
    icon: Check,
  },
  PENDING: {
    label: 'Pending',
    color: '#64748b',
    bg: '#f8fafc',
    badgeCls: 'bg-slate-100 text-slate-600 border-slate-200',
    activeRingCls: 'border-slate-400 bg-slate-50 ring-2 ring-slate-400/20',
    iconCls: 'text-slate-500',
    countCls: 'text-slate-700',
    icon: Clock,
  },
};

// Friendly field labels
const FIELD_LABELS = {
  bank_lg_number: 'LG Number', beneficiary_name: 'Beneficiary', current_amount: 'Amount',
  currency_code: 'Currency', bank_name: 'Bank', status: 'Status',
  issue_date: 'Issue Date', expiry_date: 'Expiry Date', lg_type_name: 'LG Type',
  entity_name: 'Entity', department: 'Department',
  internal_owner_email: 'Owner (Requestor)',
  facility_name: 'Facility', sub_limit_name: 'Sub-Limit',
  reference_type: 'Ref. Type', reference_number: 'Reference #', reference_amount: 'Ref. Amount',
  reference_currency_code: 'Ref. Currency', reference_start_date: 'Ref. Start', reference_end_date: 'Ref. End',
  project_name: 'Project',
  operational_status: 'Operational Status', applicable_rules: 'Applied Rules',
  lg_purpose: 'Purpose', lg_language: 'Language', payable_currency_code: 'Payable Ccy',
  is_cross_border: 'Cross-Border', is_third_party: 'Third Party',
  beneficiary_address: 'Benef. Address', beneficiary_country: 'Country',
  beneficiary_contact_person: 'Benef. Contact', beneficiary_phone: 'Benef. Phone', beneficiary_email: 'Benef. Email',
  is_auto_reducing: 'Auto-Reducing', reduction_trigger: 'Reduction Trigger',
  notes: 'Notes',
};

// Columns shown in the table (prioritized business-critical fields)
const DISPLAY_FIELDS = [
  'bank_lg_number', 'beneficiary_name', 'current_amount', 'currency_code', 'bank_name',
  'status', 'internal_owner_email', 'facility_name', 'sub_limit_name',
  'issue_date', 'expiry_date', 'lg_type_name', 'entity_name',
  'reference_type', 'reference_number', 'operational_status', 'applicable_rules',
];
const EDITABLE_FIELDS = Object.keys(FIELD_LABELS);

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.badgeCls}`}>
      <Icon className="w-3.5 h-3.5" /> {cfg.label}
    </span>
  );
}

function StatusTile({ label, count, color, bg, icon: Icon, active, activeRingCls, iconCls, countCls, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center px-4 py-3 rounded-2xl min-w-[96px] border transition-all shadow-xs hover:shadow-md cursor-pointer ${
        active
          ? activeRingCls || 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20'
          : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      <Icon
        size={18}
        className={`mb-1 ${iconCls || ''}`}
        style={!iconCls && color ? { color } : undefined}
      />
      <span
        className={`text-xl font-extrabold tabular-nums ${countCls || ''}`}
        style={!countCls && color ? { color } : undefined}
      >
        {count}
      </span>
      <span className="text-[11px] font-semibold text-slate-500 mt-0.5">{label}</span>
    </button>
  );
}

export default function IssuanceMigrationPage() {
  // State
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [report, setReport] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scanUploading, setScanUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkField, setBulkField] = useState('');
  const [bulkValue, setBulkValue] = useState('');
  const [historyModal, setHistoryModal] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [expandedValidation, setExpandedValidation] = useState(null);
  const fileInputRef = useRef(null);
  const scanInputRef = useRef(null);

  // ---- Data Fetching ----
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status_filter', statusFilter);
      if (search) params.append('search', search);
      params.append('limit', '200');
      const data = await apiRequest(`${API_BASE}/staged?${params}`, 'GET');
      setRecords(data?.records || []);
      setTotal(data?.total || 0);
    } catch (err) { console.error('Failed to fetch records', err); }
    setLoading(false);
  }, [statusFilter, search]);

  const fetchReport = useCallback(async () => {
    try {
      const data = await apiRequest(`${API_BASE}/report`, 'GET');
      setReport(data?.summary || {});
    } catch (err) { console.error('Failed to fetch report', err); }
  }, []);

  useEffect(() => { fetchRecords(); fetchReport(); }, [fetchRecords, fetchReport]);

  // ---- Upload Handlers ----
  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await apiRequest(`${API_BASE}/upload`, 'POST', formData);
      setUploadResult(data);
      fetchRecords(); fetchReport();
    } catch (err) {
      setUploadResult({ error: err.message || 'Upload failed' });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleScanUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setScanUploading(true); setUploadResult(null);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) formData.append('files', files[i]);
      const data = await apiRequest(`${API_BASE}/upload-scan`, 'POST', formData);
      setUploadResult(data);
      fetchRecords(); fetchReport();
    } catch (err) {
      setUploadResult({ error: err.message || 'Scan upload failed' });
    }
    setScanUploading(false);
    if (scanInputRef.current) scanInputRef.current.value = '';
  };

  // ---- CRUD Actions ----
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this staged record?')) return;
    try {
      await apiRequest(`${API_BASE}/staged/${id}`, 'DELETE');
      fetchRecords(); fetchReport();
    } catch (err) { alert(err.message || 'Delete failed'); }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size || !window.confirm(`Delete ${selectedIds.size} selected records?`)) return;
    try {
      await apiRequest(`${API_BASE}/staged/delete-multiple`, 'POST', { ids: [...selectedIds] });
      setSelectedIds(new Set());
      fetchRecords(); fetchReport();
    } catch (err) { alert('Bulk delete failed'); }
  };

  const handleBulkRevalidate = async () => {
    if (!selectedIds.size) return;
    try {
      await apiRequest(`${API_BASE}/staged/re-validate-multiple`, 'POST', { ids: [...selectedIds] });
      setSelectedIds(new Set());
      fetchRecords(); fetchReport();
    } catch (err) { alert('Re-validation failed'); }
  };

  const startEdit = (record) => {
    setEditingId(record.id);
    setEditData({ ...(record.source_data_json || {}) });
  };

  const saveEdit = async () => {
    try {
      await apiRequest(`${API_BASE}/staged/${editingId}`, 'PUT', editData);
      setEditingId(null); setEditData({});
      fetchRecords(); fetchReport();
    } catch (err) { alert('Update failed'); }
  };

  const handleBulkEdit = async () => {
    if (!selectedIds.size || !bulkField) return;
    try {
      await apiRequest(`${API_BASE}/staged/bulk-edit`, 'POST', {
        ids: [...selectedIds],
        updates: { [bulkField]: bulkValue },
      });
      setBulkEditOpen(false); setBulkField(''); setBulkValue('');
      setSelectedIds(new Set());
      fetchRecords(); fetchReport();
    } catch (err) { alert('Bulk edit failed'); }
  };

  const handleImport = async () => {
    const importable = (report.READY_FOR_IMPORT || 0) + (report.NEEDS_REVIEW || 0) + (report.EXPIRED || 0);
    if (!importable || !window.confirm(`Import ${importable} records into Issued LG Records?\n\nThis action cannot be undone.`)) return;
    setImporting(true); setImportResult(null);
    try {
      const data = await apiRequest(`${API_BASE}/import-ready`, 'POST');
      setImportResult(data);
      fetchRecords(); fetchReport();
    } catch (err) {
      setImportResult({ error: err.message || 'Import failed' });
    }
    setImporting(false);
  };

  const handlePreviewHistory = async (lgNumber) => {
    try {
      const data = await apiRequest(`${API_BASE}/preview-history`, 'POST', { bank_lg_number: lgNumber });
      setHistoryModal(data);
    } catch (err) { alert('Failed to load history'); }
  };

  // ---- Selection ----
  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === records.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(records.map(r => r.id)));
  };

  // Count how many records each LG number has (for history preview button)
  const lgNumberCounts = {};
  records.forEach(r => {
    const num = r.source_data_json?.bank_lg_number;
    if (num) lgNumberCounts[num] = (lgNumberCounts[num] || 0) + 1;
  });

  const importableCount = (report.READY_FOR_IMPORT || 0) + (report.NEEDS_REVIEW || 0) + (report.EXPIRED || 0);

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Issuance Migration Hub</h1>
          <p className="text-sm text-slate-500 mt-1">Upload, validate, and import legacy LG records</p>
        </div>
        <button
          onClick={handleImport}
          disabled={importing || !importableCount}
          className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all ${
            importableCount
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
          } ${importing ? 'opacity-60' : ''}`}
        >
          <Zap size={16} /> {importing ? 'Importing...' : `Finalize Migration (${importableCount})`}
        </button>
      </div>

      {/* Status Tiles */}
      <div className="flex flex-wrap gap-2.5">
        <StatusTile
          label="All"
          count={Object.values(report).reduce((a, b) => a + b, 0) || 0}
          icon={FileText}
          iconCls="text-blue-600"
          countCls="text-blue-700"
          activeRingCls="border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20"
          active={!statusFilter}
          onClick={() => setStatusFilter(null)}
        />
        {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'PENDING' && k !== 'IMPORTED').map(([key, cfg]) => (
          <StatusTile
            key={key}
            label={cfg.label}
            count={report[key] || 0}
            color={cfg.color}
            bg={cfg.bg}
            activeRingCls={cfg.activeRingCls}
            iconCls={cfg.iconCls}
            countCls={cfg.countCls}
            icon={cfg.icon}
            active={statusFilter === key}
            onClick={() => setStatusFilter(statusFilter === key ? null : key)}
          />
        ))}
        <StatusTile
          label="Imported"
          count={report.IMPORTED || 0}
          color={STATUS_CONFIG.IMPORTED.color}
          bg={STATUS_CONFIG.IMPORTED.bg}
          activeRingCls={STATUS_CONFIG.IMPORTED.activeRingCls}
          iconCls={STATUS_CONFIG.IMPORTED.iconCls}
          countCls={STATUS_CONFIG.IMPORTED.countCls}
          icon={Check}
          active={statusFilter === 'IMPORTED'}
          onClick={() => setStatusFilter(statusFilter === 'IMPORTED' ? null : 'IMPORTED')}
        />
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Excel Upload */}
        <div
          className="bg-white hover:bg-blue-50/40 border-2 border-dashed border-blue-200 hover:border-blue-300 rounded-2xl p-6 text-center cursor-pointer transition-all shadow-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          <FileSpreadsheet size={34} className="text-blue-600 mx-auto mb-2.5" />
          <p className="text-slate-900 font-bold text-sm mb-1">
            {uploading ? 'Processing...' : 'Upload Excel / CSV'}
          </p>
          <p className="text-slate-500 text-xs">Drag &amp; drop or click to select (.xlsx, .xls, .csv)</p>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} className="hidden" />
        </div>

        {/* Scan Upload */}
        <div
          className="bg-white hover:bg-amber-50/40 border-2 border-dashed border-amber-200 hover:border-amber-300 rounded-2xl p-6 text-center cursor-pointer transition-all shadow-xs"
          onClick={() => scanInputRef.current?.click()}
        >
          <ScanLine size={34} className="text-amber-600 mx-auto mb-2.5" />
          <p className="text-slate-900 font-bold text-sm mb-1">
            {scanUploading ? 'AI Extracting...' : 'Mass Scan Upload (AI)'}
          </p>
          <p className="text-slate-500 text-xs">Upload scanned LG documents (PDF, images) — AI extracts data</p>
          <input ref={scanInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif" multiple onChange={handleScanUpload} className="hidden" />
        </div>
      </div>

      {/* Upload Result Banner */}
      {uploadResult && (
        <div
          className={`rounded-xl px-4 py-3 border flex items-center justify-between gap-3 text-sm font-medium ${
            uploadResult.error
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span>
            {uploadResult.error || uploadResult.message}
            {uploadResult.summary && ` — Ready: ${uploadResult.summary.ready || 0}, Errors: ${uploadResult.summary.errors || 0}, Duplicates: ${uploadResult.summary.duplicates || 0}`}
          </span>
          <button
            onClick={() => setUploadResult(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-700 shadow-none"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Import Result Banner */}
      {importResult && (
        <div
          className={`rounded-xl px-4 py-3 border flex items-center justify-between gap-3 text-sm font-medium ${
            importResult.error
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <span>
            {importResult.error || `${importResult.message} — Imported: ${importResult.imported}, Failed: ${importResult.failed}`}
          </span>
          <button
            onClick={() => setImportResult(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-700 shadow-none"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by LG Number..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
          />
        </div>
        {selectedIds.size > 0 && (
          <>
            <span className="text-xs font-semibold text-slate-500 px-1">{selectedIds.size} selected</span>
            <button
              onClick={() => setBulkEditOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-none transition-colors"
            >
              <Edit3 size={14} /> Bulk Edit
            </button>
            <button
              onClick={handleBulkRevalidate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 shadow-none transition-colors"
            >
              <RefreshCw size={14} /> Re-validate
            </button>
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-none transition-colors"
            >
              <Trash2 size={14} /> Delete
            </button>
          </>
        )}
      </div>

      {/* Staged Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-3.5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap sticky top-0 bg-slate-50">
                <input
                  type="checkbox"
                  checked={selectedIds.size === records.length && records.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-3.5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap sticky top-0 bg-slate-50">Actions</th>
              <th className="px-3.5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap sticky top-0 bg-slate-50">Source</th>
              <th className="px-3.5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap sticky top-0 bg-slate-50">Status</th>
              {DISPLAY_FIELDS.map(f => (
                <th key={f} className="px-3.5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap sticky top-0 bg-slate-50">
                  {FIELD_LABELS[f]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={DISPLAY_FIELDS.length + 4} className="text-center py-12 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                  <span className="text-xs font-medium">Loading...</span>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={DISPLAY_FIELDS.length + 4} className="text-center py-12 text-sm text-slate-500">
                  No staged records. Upload an Excel file or scan to get started.
                </td>
              </tr>
            ) : records.map(record => {
              const data = record.source_data_json || {};
              const isEditing = editingId === record.id;
              const hasHistory = lgNumberCounts[data.bank_lg_number] > 1;

              return (
                <React.Fragment key={record.id}>
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(record.id)}
                        onChange={() => toggleSelect(record.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <>
                            <button onClick={saveEdit} title="Save" className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 shadow-none">
                              <CheckCircle2 size={15} />
                            </button>
                            <button onClick={() => setEditingId(null)} title="Cancel" className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 shadow-none">
                              <X size={15} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(record)} title="Edit" className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 shadow-none">
                              <Edit3 size={14} />
                            </button>
                            <button onClick={() => handleDelete(record.id)} title="Delete" className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 shadow-none">
                              <Trash2 size={14} />
                            </button>
                            {hasHistory && (
                              <button onClick={() => handlePreviewHistory(data.bank_lg_number)} title="History" className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 shadow-none">
                                <History size={14} />
                              </button>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => setExpandedValidation(expandedValidation === record.id ? null : record.id)}
                          title="Validation"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shadow-none"
                        >
                          {expandedValidation === record.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      {data._source_type === 'SCAN' ? (
                        <ScanLine className="w-4 h-4 text-amber-600" title="AI Scan" />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" title="Excel / CSV" />
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap"><StatusBadge status={record.record_status} /></td>
                    {DISPLAY_FIELDS.map(field => (
                      <td key={field} className="px-3.5 py-2.5 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            value={editData[field] || ''}
                            onChange={e => setEditData({ ...editData, [field]: e.target.value })}
                            className="w-full min-w-[110px] px-2 py-1 rounded-lg border border-blue-300 bg-white text-slate-900 text-xs focus:ring-2 focus:ring-blue-500/20 outline-none"
                          />
                        ) : (
                          <span className="text-slate-700 text-xs font-medium">
                            {field === 'current_amount' && data[field] != null ? Number(data[field]).toLocaleString() : (data[field] ?? '—')}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                  {/* Validation Details Row */}
                  {expandedValidation === record.id && record.validation_log && (
                    <tr>
                      <td colSpan={DISPLAY_FIELDS.length + 4} className="px-5 py-3 bg-slate-50/90 border-t border-slate-100">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(record.validation_log).filter(([_, v]) => v && typeof v === 'object').map(([field, val]) => {
                            if (field.startsWith('_')) return null;
                            const isError = val.status === 'ERROR';
                            const isWarning = val.status === 'WARNING';
                            if (!isError && !isWarning) return null;
                            return (
                              <div
                                key={field}
                                className={`px-3 py-1.5 rounded-lg text-xs border ${
                                  isError
                                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                                    : 'bg-amber-50 border-amber-200 text-amber-800'
                                }`}
                              >
                                <strong>{FIELD_LABELS[field] || field}:</strong> {val.message}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-xs font-medium text-slate-500 text-right">
        Showing {records.length} of {total} records
      </div>

      {/* Bulk Edit Modal */}
      {bulkEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Bulk Edit — {selectedIds.size} records</h3>
              <button onClick={() => setBulkEditOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 shadow-none">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Field</label>
                <select
                  value={bulkField}
                  onChange={e => setBulkField(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                >
                  <option value="">Select field...</option>
                  {EDITABLE_FIELDS.map(f => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Value</label>
                <input
                  value={bulkValue}
                  onChange={e => setBulkValue(e.target.value)}
                  placeholder="Enter value to apply..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setBulkEditOpen(false)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-none"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkEdit}
                disabled={!bulkField}
                className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm disabled:opacity-50"
              >
                Apply to {selectedIds.size} records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Preview Modal */}
      {historyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History size={18} className="text-blue-600" />
                <span>Timeline: {historyModal.bank_lg_number}</span>
              </h3>
              <button onClick={() => setHistoryModal(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 shadow-none">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto divide-y divide-slate-100">
              {historyModal.timeline?.map((entry, i) => (
                <div key={i} className="flex gap-4 py-3.5 first:pt-0 last:pb-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      i === 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {entry.sequence}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-900 font-semibold text-sm">{(entry.inferred_action || '').replace(/_/g, ' ')}</span>
                      <span className="text-slate-400 text-xs">{entry.timestamp}</span>
                    </div>
                    <div className="text-slate-600 text-xs mt-1">
                      Amount: {entry.current_amount?.toLocaleString()} | Status: {entry.status} | Expiry: {formatDate(entry.expiry_date)}
                    </div>
                    {entry.diff && Object.keys(entry.diff).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(entry.diff).map(([field, d]) => (
                          <span key={field} className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            {FIELD_LABELS[field] || field}: {String(d.old)} → {String(d.new)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
