// src/pages/CorporateAdmin/IssuanceMigrationPage.js
// Issuance Migration Hub — Upload, validate, edit, and import legacy LG records.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload, FileSpreadsheet, ScanLine, AlertCircle, CheckCircle2, Clock, Copy,
  AlertTriangle, Trash2, Edit3, RefreshCw, ChevronDown, ChevronRight, X,
  Download, Filter, Search, History, ZapOff, Zap, FileText, Check
} from 'lucide-react';
import { apiRequest } from 'services/apiService';

const API_BASE = '/issuance/migration';

// Status badge config
const STATUS_CONFIG = {
  READY_FOR_IMPORT: { label: 'Ready', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: CheckCircle2 },
  ERROR: { label: 'Error', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: AlertCircle },
  NEEDS_REVIEW: { label: 'Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: AlertTriangle },
  DUPLICATE: { label: 'Duplicate', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: Copy },
  EXPIRED: { label: 'Expired', color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: Clock },
  CONFLICT: { label: 'Conflict', color: '#f97316', bg: 'rgba(249,115,22,0.12)', icon: ZapOff },
  IMPORTED: { label: 'Imported', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: Check },
  PENDING: { label: 'Pending', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: Clock },
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
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: cfg.color, backgroundColor: cfg.bg }}>
      <Icon size={13} /> {cfg.label}
    </span>
  );
}

function StatusTile({ label, count, color, bg, icon: Icon, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '12px 16px', borderRadius: 10, minWidth: 90, cursor: 'pointer', border: active ? `2px solid ${color}` : '2px solid transparent',
      backgroundColor: active ? bg : 'rgba(255,255,255,0.04)', transition: 'all 0.2s',
    }}>
      <Icon size={20} style={{ color, marginBottom: 4 }} />
      <span style={{ fontSize: 22, fontWeight: 700, color }}>{count}</span>
      <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{label}</span>
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
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Issuance Migration Hub</h1>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: '4px 0 0' }}>Upload, validate, and import legacy LG records</p>
        </div>
        <button onClick={handleImport} disabled={importing || !importableCount} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8,
          backgroundColor: importableCount ? '#10b981' : '#374151', color: '#fff', fontWeight: 600,
          fontSize: 14, border: 'none', cursor: importableCount ? 'pointer' : 'not-allowed', opacity: importing ? 0.6 : 1,
        }}>
          <Zap size={16} /> {importing ? 'Importing...' : `Finalize Migration (${importableCount})`}
        </button>
      </div>

      {/* Status Tiles */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatusTile label="All" count={Object.values(report).reduce((a, b) => a + b, 0) || 0} color="#60a5fa" bg="rgba(96,165,250,0.1)" icon={FileText} active={!statusFilter} onClick={() => setStatusFilter(null)} />
        {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'PENDING' && k !== 'IMPORTED').map(([key, cfg]) => (
          <StatusTile key={key} label={cfg.label} count={report[key] || 0} color={cfg.color} bg={cfg.bg} icon={cfg.icon}
            active={statusFilter === key} onClick={() => setStatusFilter(statusFilter === key ? null : key)} />
        ))}
        <StatusTile label="Imported" count={report.IMPORTED || 0} color="#3b82f6" bg="rgba(59,130,246,0.1)" icon={Check}
          active={statusFilter === 'IMPORTED'} onClick={() => setStatusFilter(statusFilter === 'IMPORTED' ? null : 'IMPORTED')} />
      </div>

      {/* Upload Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Excel Upload */}
        <div style={{
          border: '2px dashed rgba(96,165,250,0.3)', borderRadius: 12, padding: 24, textAlign: 'center',
          backgroundColor: 'rgba(96,165,250,0.04)', cursor: 'pointer', transition: 'all 0.2s',
        }} onClick={() => fileInputRef.current?.click()}>
          <FileSpreadsheet size={36} style={{ color: '#60a5fa', marginBottom: 8 }} />
          <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 15, margin: '0 0 4px' }}>
            {uploading ? 'Processing...' : 'Upload Excel / CSV'}
          </p>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Drag & drop or click to select (.xlsx, .xls, .csv)</p>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} style={{ display: 'none' }} />
        </div>

        {/* Scan Upload */}
        <div style={{
          border: '2px dashed rgba(245,158,11,0.3)', borderRadius: 12, padding: 24, textAlign: 'center',
          backgroundColor: 'rgba(245,158,11,0.04)', cursor: 'pointer', transition: 'all 0.2s',
        }} onClick={() => scanInputRef.current?.click()}>
          <ScanLine size={36} style={{ color: '#f59e0b', marginBottom: 8 }} />
          <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 15, margin: '0 0 4px' }}>
            {scanUploading ? 'AI Extracting...' : 'Mass Scan Upload (AI)'}
          </p>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Upload scanned LG documents (PDF, images) — AI extracts data</p>
          <input ref={scanInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif" multiple onChange={handleScanUpload} style={{ display: 'none' }} />
        </div>
      </div>

      {/* Upload Result Banner */}
      {uploadResult && (
        <div style={{
          padding: 14, borderRadius: 10, marginBottom: 16,
          backgroundColor: uploadResult.error ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
          border: `1px solid ${uploadResult.error ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ color: uploadResult.error ? '#ef4444' : '#10b981', fontSize: 14 }}>
            {uploadResult.error || uploadResult.message}
            {uploadResult.summary && ` — Ready: ${uploadResult.summary.ready || 0}, Errors: ${uploadResult.summary.errors || 0}, Duplicates: ${uploadResult.summary.duplicates || 0}`}
          </span>
          <button onClick={() => setUploadResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={16} /></button>
        </div>
      )}

      {/* Import Result Banner */}
      {importResult && (
        <div style={{
          padding: 14, borderRadius: 10, marginBottom: 16,
          backgroundColor: importResult.error ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
          border: `1px solid ${importResult.error ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.3)'}`,
        }}>
          <span style={{ color: importResult.error ? '#ef4444' : '#3b82f6', fontSize: 14 }}>
            {importResult.error || `${importResult.message} — Imported: ${importResult.imported}, Failed: ${importResult.failed}`}
          </span>
          <button onClick={() => setImportResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', float: 'right' }}><X size={16} /></button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by LG Number..."
            style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: 13, outline: 'none' }} />
        </div>
        {selectedIds.size > 0 && (
          <>
            <span style={{ color: '#94a3b8', fontSize: 13 }}>{selectedIds.size} selected</span>
            <button onClick={() => setBulkEditOpen(true)} style={{ ...toolbarBtn, backgroundColor: 'rgba(96,165,250,0.15)', color: '#60a5fa' }}>
              <Edit3 size={14} /> Bulk Edit
            </button>
            <button onClick={handleBulkRevalidate} style={{ ...toolbarBtn, backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
              <RefreshCw size={14} /> Re-validate
            </button>
            <button onClick={handleBulkDelete} style={{ ...toolbarBtn, backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
              <Trash2 size={14} /> Delete
            </button>
          </>
        )}
      </div>

      {/* Staged Records Table */}
      <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'auto', backgroundColor: 'rgba(255,255,255,0.02)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th style={thStyle}><input type="checkbox" checked={selectedIds.size === records.length && records.length > 0} onChange={toggleSelectAll} /></th>
              <th style={thStyle}>Actions</th>
              <th style={thStyle}>Source</th>
              <th style={thStyle}>Status</th>
              {DISPLAY_FIELDS.map(f => <th key={f} style={thStyle}>{FIELD_LABELS[f]}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={DISPLAY_FIELDS.length + 4} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={DISPLAY_FIELDS.length + 4} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No staged records. Upload an Excel file or scan to get started.</td></tr>
            ) : records.map(record => {
              const data = record.source_data_json || {};
              const isEditing = editingId === record.id;
              const hasHistory = lgNumberCounts[data.bank_lg_number] > 1;

              return (
                <React.Fragment key={record.id}>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={tdStyle}><input type="checkbox" checked={selectedIds.has(record.id)} onChange={() => toggleSelect(record.id)} /></td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {isEditing ? (
                          <>
                            <button onClick={saveEdit} title="Save" style={iconBtn}><CheckCircle2 size={15} color="#10b981" /></button>
                            <button onClick={() => setEditingId(null)} title="Cancel" style={iconBtn}><X size={15} color="#ef4444" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(record)} title="Edit" style={iconBtn}><Edit3 size={14} color="#60a5fa" /></button>
                            <button onClick={() => handleDelete(record.id)} title="Delete" style={iconBtn}><Trash2 size={14} color="#ef4444" /></button>
                            {hasHistory && <button onClick={() => handlePreviewHistory(data.bank_lg_number)} title="History" style={iconBtn}><History size={14} color="#f59e0b" /></button>}
                          </>
                        )}
                        <button onClick={() => setExpandedValidation(expandedValidation === record.id ? null : record.id)} title="Validation" style={iconBtn}>
                          {expandedValidation === record.id ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
                        </button>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 16 }}>{data._source_type === 'SCAN' ? '📄' : '📊'}</span>
                    </td>
                    <td style={tdStyle}><StatusBadge status={record.record_status} /></td>
                    {DISPLAY_FIELDS.map(field => (
                      <td key={field} style={tdStyle}>
                        {isEditing ? (
                          <input value={editData[field] || ''} onChange={e => setEditData({ ...editData, [field]: e.target.value })}
                            style={{ width: '100%', padding: '4px 6px', borderRadius: 4, border: '1px solid rgba(96,165,250,0.3)', backgroundColor: 'rgba(0,0,0,0.2)', color: '#f1f5f9', fontSize: 12, outline: 'none' }} />
                        ) : (
                          <span style={{ color: '#e2e8f0', fontSize: 13 }}>
                            {field === 'current_amount' && data[field] != null ? Number(data[field]).toLocaleString() : (data[field] ?? '—')}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                  {/* Validation Details Row */}
                  {expandedValidation === record.id && record.validation_log && (
                    <tr>
                      <td colSpan={DISPLAY_FIELDS.length + 4} style={{ padding: '12px 20px', backgroundColor: 'rgba(0,0,0,0.15)' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {Object.entries(record.validation_log).filter(([_, v]) => v && typeof v === 'object').map(([field, val]) => {
                            if (field.startsWith('_')) return null;
                            const isError = val.status === 'ERROR';
                            const isWarning = val.status === 'WARNING';
                            if (!isError && !isWarning) return null;
                            return (
                              <div key={field} style={{
                                padding: '6px 12px', borderRadius: 6, fontSize: 12,
                                backgroundColor: isError ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                                border: `1px solid ${isError ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                                color: isError ? '#fca5a5' : '#fcd34d',
                              }}>
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

      <div style={{ padding: '12px 0', color: '#64748b', fontSize: 13, textAlign: 'right' }}>
        Showing {records.length} of {total} records
      </div>

      {/* Bulk Edit Modal */}
      {bulkEditOpen && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: '#f1f5f9', margin: 0, fontSize: 18, fontWeight: 700 }}>Bulk Edit — {selectedIds.size} records</h3>
              <button onClick={() => setBulkEditOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#94a3b8', fontSize: 13, marginBottom: 6, display: 'block' }}>Field</label>
              <select value={bulkField} onChange={e => setBulkField(e.target.value)} style={selectStyle}>
                <option value="">Select field...</option>
                {EDITABLE_FIELDS.map(f => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ color: '#94a3b8', fontSize: 13, marginBottom: 6, display: 'block' }}>Value</label>
              <input value={bulkValue} onChange={e => setBulkValue(e.target.value)} placeholder="Enter value to apply..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#f1f5f9', fontSize: 14, outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setBulkEditOpen(false)} style={{ ...toolbarBtn, backgroundColor: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}>Cancel</button>
              <button onClick={handleBulkEdit} disabled={!bulkField} style={{ ...toolbarBtn, backgroundColor: '#2563eb', color: '#fff', opacity: bulkField ? 1 : 0.5 }}>
                Apply to {selectedIds.size} records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Preview Modal */}
      {historyModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalContent, maxWidth: 700 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: '#f1f5f9', margin: 0 }}>
                <History size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Timeline: {historyModal.bank_lg_number}
              </h3>
              <button onClick={() => setHistoryModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {historyModal.timeline?.map((entry, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 16, padding: '14px 0',
                  borderBottom: i < historyModal.timeline.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: i === 0 ? 'rgba(16,185,129,0.15)' : 'rgba(96,165,250,0.15)', flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: i === 0 ? '#10b981' : '#60a5fa' }}>{entry.sequence}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>{(entry.inferred_action || '').replace(/_/g, ' ')}</span>
                      <span style={{ color: '#64748b', fontSize: 12 }}>{entry.timestamp}</span>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
                      Amount: {entry.current_amount?.toLocaleString()} | Status: {entry.status} | Expiry: {entry.expiry_date || '—'}
                    </div>
                    {entry.diff && Object.keys(entry.diff).length > 0 && (
                      <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {Object.entries(entry.diff).map(([field, d]) => (
                          <span key={field} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, backgroundColor: 'rgba(96,165,250,0.1)', color: '#93c5fd' }}>
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

// Styles
const thStyle = { padding: '10px 12px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', position: 'sticky', top: 0, backgroundColor: '#0f172a' };
const tdStyle = { padding: '10px 12px', whiteSpace: 'nowrap' };
const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4 };
const toolbarBtn = { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' };
const modalOverlay = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalContent = { backgroundColor: '#1e293b', borderRadius: 16, padding: 28, width: '90%', maxWidth: 500, border: '1px solid rgba(255,255,255,0.1)' };
const selectStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#f1f5f9', fontSize: 14, outline: 'none' };
