import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest, API_BASE_URL, getAuthToken } from '../../services/apiService';
import { toast } from 'react-toastify';
import {
    Upload, Search, CheckCircle2, AlertTriangle, AlertCircle, Info,
    RefreshCw, FileText, Calendar, Building2, ChevronDown, ChevronUp,
    Check, X, Clock, Shield, Eye, Download, Loader2, BarChart3, Trash2
} from 'lucide-react';

// ─── Severity config ───
const SEVERITY_CONFIG = {
    HIGH: { color: '#ef4444', bg: '#fef2f2', icon: AlertCircle, label: '🔴 High' },
    MEDIUM: { color: '#f59e0b', bg: '#fffbeb', icon: AlertTriangle, label: '🟠 Medium' },
    LOW: { color: '#eab308', bg: '#fefce8', icon: Info, label: '🟡 Low' },
    INFO: { color: '#3b82f6', bg: '#eff6ff', icon: Info, label: '🔵 Info' },
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
    const urlSessionId = searchParams.get('sessionId');

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

    useEffect(() => {
        fetchBanks();
        fetchSessions();
        if (urlSessionId) {
            fetchSessionDetail(urlSessionId);
        }
    }, [urlSessionId]);

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

    return (
        <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                        📊 LG Position Reconciliation
                    </h1>
                    <p style={{ color: '#64748b', margin: '4px 0 0' }}>
                        Import bank position reports, match against system records, resolve variances
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {['sessions', 'upload'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                background: activeTab === tab ? '#3b82f6' : '#f1f5f9',
                                color: activeTab === tab ? '#fff' : '#475569',
                                fontWeight: 600, fontSize: 13,
                            }}>
                            {tab === 'sessions' ? '📋 Sessions' : '⬆️ Upload Report'}
                        </button>
                    ))}
                </div>
            </div>

            {/* ═══ Upload Tab ═══ */}
            {activeTab === 'upload' && (
                <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', maxWidth: 700 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, color: '#0f172a' }}>
                        ⬆️ Upload Bank Position Report
                    </h2>

                    <div style={{ display: 'grid', gap: 20 }}>
                        <div>
                            <label style={labelStyle}>Bank</label>
                            <select value={uploadBank} onChange={e => setUploadBank(e.target.value)}
                                style={inputStyle}>
                                <option value="">Select bank...</option>
                                {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label style={labelStyle}>Position Date</label>
                            <input type="date" value={uploadDate} onChange={e => setUploadDate(e.target.value)}
                                style={inputStyle} />
                        </div>

                        <div>
                            <label style={labelStyle}>Position Report File</label>
                            <div style={{
                                border: '2px dashed #cbd5e1', borderRadius: 12, padding: 32,
                                textAlign: 'center', cursor: 'pointer', background: uploadFile ? '#f0fdf4' : '#fafafa',
                                transition: 'all 0.2s',
                            }}
                                onClick={() => document.getElementById('recon-file-input').click()}
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => { e.preventDefault(); setUploadFile(e.dataTransfer.files[0]); }}>
                                {uploadFile ? (
                                    <div>
                                        <FileText size={32} color="#22c55e" />
                                        <p style={{ fontWeight: 600, color: '#16a34a', marginTop: 8 }}>{uploadFile.name}</p>
                                        <p style={{ color: '#64748b', fontSize: 12 }}>
                                            {(uploadFile.size / 1024).toFixed(1)} KB — Click to change
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <Upload size={32} color="#94a3b8" />
                                        <p style={{ fontWeight: 600, color: '#475569', marginTop: 8 }}>
                                            Drop file here or click to browse
                                        </p>
                                        <p style={{ color: '#94a3b8', fontSize: 12 }}>
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
                            <label style={labelStyle}>Notes (optional)</label>
                            <textarea value={uploadNotes} onChange={e => setUploadNotes(e.target.value)}
                                style={{ ...inputStyle, height: 60, resize: 'vertical' }}
                                placeholder="Any notes about this position report..." />
                        </div>

                        <button onClick={handleUpload} disabled={uploading}
                            style={{
                                ...btnPrimary, opacity: uploading ? 0.7 : 1,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            }}>
                            {uploading ? <><Loader2 size={16} className="spin" /> Uploading & Parsing...</>
                                : <><Upload size={16} /> Upload & Parse</>}
                        </button>
                    </div>
                </div>
            )}

            {/* ═══ Sessions List ═══ */}
            {activeTab === 'sessions' && (
                <div>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
                            <Loader2 size={32} className="spin" />
                            <p>Loading sessions...</p>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 16 }}>
                            <BarChart3 size={48} color="#cbd5e1" />
                            <p style={{ color: '#64748b', marginTop: 12, fontWeight: 600 }}>No reconciliation sessions yet</p>
                            <button onClick={() => setActiveTab('upload')} style={{ ...btnPrimary, marginTop: 16 }}>
                                ⬆️ Upload First Report
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 12 }}>
                            {sessions.map(s => (
                                <div key={s.id} onClick={() => fetchSessionDetail(s.id)}
                                    style={{
                                        background: '#fff', borderRadius: 12, padding: 20, cursor: 'pointer',
                                        border: '1px solid #e2e8f0', transition: 'all 0.15s',
                                        display: 'grid', gridTemplateColumns: '1fr auto',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <Building2 size={16} color="#64748b" />
                                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{s.bank_name}</span>
                                            <span style={{ color: '#94a3b8' }}>•</span>
                                            <Calendar size={14} color="#94a3b8" />
                                            <span style={{ color: '#64748b', fontSize: 13 }}>{s.position_date}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13 }}>
                                            <span style={{ color: '#22c55e' }}>✅ {s.matched_count} matched</span>
                                            <span style={{ color: '#ef4444' }}>⚠️ {s.mismatched_count} mismatches</span>
                                            <span style={{ color: '#f59e0b' }}>📄 {s.bank_only_count} bank-only</span>
                                            <span style={{ color: '#8b5cf6' }}>🔍 {s.system_only_count} system-only</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                    <button onClick={() => { setActiveTab('sessions'); setSelectedSession(null); }}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6',
                            fontWeight: 600, fontSize: 14, marginBottom: 16, padding: 0
                        }}>
                        ← Back to sessions
                    </button>

                    {/* Session header */}
                    <div style={{
                        background: '#fff', borderRadius: 16, padding: 24, marginBottom: 20,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                                    {selectedSession.bank_name} — {selectedSession.position_date}
                                </h2>
                                <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
                                    {selectedSession.original_file_name} • {selectedSession.total_bank_records} records •
                                    Parsed via {selectedSession.parsing_method}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <button onClick={handleDeleteSession}
                                    style={{ ...btnPrimary, background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6, opacity: 0.9 }}>
                                    <Trash2 size={14} /> Delete
                                </button>
                                {selectedSession.status === 'PARSED' && (
                                    <button onClick={handleRunMatching} disabled={matching}
                                        style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {matching ? <><Loader2 size={14} className="spin" /> Matching...</>
                                            : <><RefreshCw size={14} /> Run Matching</>}
                                    </button>
                                )}
                                {selectedSession.status === 'MATCHED' && (
                                    <button onClick={handleComplete} style={btnSuccess}>
                                        <Check size={14} /> Complete
                                    </button>
                                )}
                                <StatusBadge status={selectedSession.status} />
                            </div>
                        </div>

                        {/* Stats cards */}
                        {selectedSession.status !== 'PARSED' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginTop: 20 }}>
                                <StatCard label="Total" value={stats.total} color="#475569" />
                                <StatCard label="Matched" value={stats.matched} color="#22c55e" />
                                <StatCard label="Mismatched" value={stats.mismatched} color="#ef4444" />
                                <StatCard label="Bank Only" value={stats.bankOnly} color="#f59e0b" />
                                <StatCard label="System Only" value={stats.systemOnly} color="#8b5cf6" />
                            </div>
                        )}

                        {/* G3: Completeness warning banner */}
                        {selectedSession.completeness_status === 'COUNT_MISMATCH' && (
                            <div style={{
                                marginTop: 16, padding: '12px 20px', borderRadius: 10,
                                background: '#fffbeb', border: '1px solid #fbbf24',
                                display: 'flex', alignItems: 'center', gap: 10,
                            }}>
                                <AlertTriangle size={18} color="#d97706" />
                                <span style={{ color: '#92400e', fontWeight: 600, fontSize: 13 }}>
                                    {selectedSession.completeness_note || 'Record count mismatch detected between bank report and parsed data'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Filters */}
                    {results.length > 0 && (
                        <div style={{
                            display: 'flex', gap: 12, marginBottom: 16,
                            background: '#fff', borderRadius: 12, padding: 16,
                        }}>
                            <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
                                style={{ ...inputStyle, width: 160, height: 36, fontSize: 13, padding: '4px 12px' }}>
                                <option value="">All Severity</option>
                                <option value="HIGH">🔴 High</option>
                                <option value="MEDIUM">🟠 Medium</option>
                                <option value="LOW">🟡 Low</option>
                                <option value="INFO">🔵 Info</option>
                            </select>
                            <select value={filterType} onChange={e => setFilterType(e.target.value)}
                                style={{ ...inputStyle, width: 200, height: 36, fontSize: 13, padding: '4px 12px' }}>
                                <option value="">All Types</option>
                                <option value="AMOUNT">Amount Variance</option>
                                <option value="CURRENCY">Currency Mismatch</option>
                                <option value="BENEFICIARY">Beneficiary Mismatch</option>
                                <option value="EXPIRY">Expiry Mismatch</option>
                                <option value="INITIAL_DATA">Initial Data</option>
                                <option value="BANK_ONLY">Bank Only</option>
                                <option value="SYSTEM_ONLY">System Only</option>
                            </select>
                            <select value={filterResolved} onChange={e => setFilterResolved(e.target.value)}
                                style={{ ...inputStyle, width: 160, height: 36, fontSize: 13, padding: '4px 12px' }}>
                                <option value="">All Status</option>
                                <option value="no">Unresolved</option>
                                <option value="yes">Resolved</option>
                            </select>
                            <span style={{ color: '#94a3b8', fontSize: 13, lineHeight: '36px' }}>
                                {filteredResults.length} of {results.length} items
                            </span>
                        </div>
                    )}

                    {/* Results list */}
                    
                    {/* Resolution Banner */}
                    {selectedSession.status !== 'COMPLETED' && filteredResults.some(r => !r.user_resolution) && (
                        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '12px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <AlertTriangle size={20} color="#d97706" style={{ flexShrink: 0 }} />
                            <div style={{ fontSize: 14, color: '#b45309' }}>
                                <strong style={{ display: 'block', marginBottom: 2 }}>Action Required: Resolve Discrepancies</strong>
                                Please click on each pending row below to review the differences and select a resolution (Adjust, Dispute, or Ignore) before completing.
                            </div>
                        </div>
                    )}

                    {filteredResults.length === 0 && selectedSession.status !== 'PARSED' ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', background: '#fff', borderRadius: 12 }}>
                            {results.length === 0 ? (
                                <><CheckCircle2 size={40} color="#22c55e" style={{ margin: '0 auto' }}/><p style={{ marginTop: 8 }}>All records matched perfectly!</p></>
                            ) : (
                                <p>No items match your filters</p>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 8 }}>
                            {filteredResults.map(r => (
                                <ResultRow key={r.id} result={r} onResolve={handleResolve} />
                            ))}
                        </div>
                    )}

                    {/* Bank rows toggle */}
                    {bankRows.length > 0 && (
                        <div style={{ marginTop: 24 }}>
                            <BankRowsTable rows={bankRows} />
                        </div>
                    )}
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
}


// ═══════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════

function ResultRow({ result, onResolve }) {
    const [expanded, setExpanded] = useState(false);
    const [notes, setNotes] = useState('');
    const sev = SEVERITY_CONFIG[result.severity] || SEVERITY_CONFIG.INFO;
    const SevIcon = sev.icon;

    return (
        <div style={{
            background: '#fff', borderRadius: 12, border: `1px solid ${sev.color}22`,
            overflow: 'hidden',
        }}>
            <div onClick={() => setExpanded(!expanded)}
                style={{
                    padding: '14px 20px', cursor: 'pointer', display: 'grid',
                    gridTemplateColumns: '32px 1fr 180px 180px auto', alignItems: 'center', gap: 12,
                }}>
                <SevIcon size={18} color={sev.color} />
                <div>
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
                        {MISMATCH_LABELS[result.mismatch_type] || result.mismatch_type}
                    </span>
                    {result.field_name && (
                        <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 8 }}>({result.field_name})</span>
                    )}
                </div>
                <div style={{ fontSize: 13 }}>
                    <span style={{ color: '#94a3b8' }}>Bank: </span>
                    <span style={{ fontWeight: 600, color: sev.color }}>{result.bank_value || '—'}</span>
                </div>
                <div style={{ fontSize: 13 }}>
                    <span style={{ color: '#94a3b8' }}>System: </span>
                    <span style={{ fontWeight: 600, color: '#475569' }}>{result.system_value || '—'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {result.user_resolution ? (
                        <ResolutionBadge resolution={result.user_resolution} approval={result.approval_status} />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fefce8', color: '#d97706', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1px solid #fef08a' }}>
                            <span>⏳ Needs Resolution</span>
                            {!expanded && <span style={{ color: '#b45309', fontWeight: 500, fontStyle: 'italic', fontSize: 11 }}>(Click to expand)</span>}
                        </div>
                    )}
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
            </div>

            {expanded && (
                <div style={{ padding: '0 20px 16px', borderTop: `1px solid ${sev.color}11` }}>
                    {/* Context */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12, fontSize: 13 }}>
                        <div>
                            <p style={{ color: '#94a3b8', marginBottom: 4 }}>System LG</p>
                            <p style={{ fontWeight: 600 }}>{result.lg_ref_number || result.lg_bank_number || '—'}</p>
                            <p style={{ color: '#64748b' }}>{result.lg_beneficiary || ''}</p>
                        </div>
                        <div>
                            <p style={{ color: '#94a3b8', marginBottom: 4 }}>Bank Report</p>
                            <p style={{ fontWeight: 600 }}>{result.bank_row_lg_number || '—'}</p>
                            <p style={{ color: '#64748b' }}>{result.bank_row_beneficiary || ''}</p>
                        </div>
                    </div>

                    {/* Resolution controls */}
                    {!result.user_resolution && (() => {
                        const isFinancial = ['AMOUNT', 'CURRENCY', 'EXPIRY'].includes(result.mismatch_type);
                        const isBankOnly = result.mismatch_type === 'BANK_ONLY';
                        const sysVal = Number(result.system_value?.replace(/,/g, '') || 0);
                        const bankVal = Number(result.bank_value?.replace(/,/g, '') || 0);
                        const isAmountIncrease = result.mismatch_type === 'AMOUNT' && (bankVal > sysVal);
                        const isAmountDecrease = result.mismatch_type === 'AMOUNT' && (bankVal < sysVal);
                        
                        const disableIgnore = isFinancial || isBankOnly;
                        const blockAdjust = isBankOnly || isAmountIncrease;

                        return (
                            <div style={{ marginTop: 16 }}>
                                {/* Governance Warnings */}
                                {blockAdjust && (
                                    <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '10px 14px', marginBottom: 16, borderRadius: '0 8px 8px 0', fontSize: 13, color: '#991b1b' }}>
                                        <AlertCircle size={16} style={{ float: 'left', marginRight: 8, marginTop: 2 }} />
                                        {isBankOnly && <strong>Bank-Only Liability: </strong>}
                                        {isAmountIncrease && <strong>Financial Increase: </strong>}
                                        {isBankOnly ? (
                                            <span>This record is missing from the system. <strong>"Adjust" is blocked.</strong> Please navigate to the <a href="/issuance/migration-hub" style={{color: '#b91c1c', textDecoration: 'underline'}}>Migration Hub</a> to register this historical LG or initiate a formal Issuance Request.</span>
                                        ) : (
                                            <span>You cannot bypass approval for amount increases. <strong>"Adjust" is blocked.</strong> Please initiate a formal "Amount Increase" request from the LG Maintenance module to follow the corporate approval matrix.</span>
                                        )}
                                    </div>
                                )}
                                {isAmountDecrease && (
                                    <div style={{ background: '#eff6ff', borderLeft: '4px solid #3b82f6', padding: '10px 14px', marginBottom: 16, borderRadius: '0 8px 8px 0', fontSize: 13, color: '#1e40af' }}>
                                        <Info size={16} style={{ float: 'left', marginRight: 8, marginTop: 2 }} />
                                        <strong>Amount Decrease Detected:</strong> Adjusting this record will automatically generate a <strong>Partial Liquidation</strong> or <strong>Beneficiary Reduction</strong> maintenance request for Corporate Admin approval.
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                        <input type="text" placeholder={disableIgnore ? "Notes (required for resolving financial variances)" : "Notes (optional)"}
                                            value={notes} onChange={e => setNotes(e.target.value)}
                                            style={{ ...inputStyle, height: 36, fontSize: 13 }} />
                                    </div>
                                    <button onClick={() => {
                                        if (disableIgnore && !notes.trim()) {
                                            toast.warning("Notes are required when resolving financial variances.");
                                            return;
                                        }
                                        onResolve(result.id, 'ADJUSTED', notes);
                                    }}
                                        disabled={blockAdjust}
                                        title={blockAdjust ? "Adjustment blocked by governance policy" : ""}
                                        style={{ ...btnPrimary, fontSize: 12, padding: '8px 14px', background: blockAdjust ? '#cbd5e1' : '#3b82f6', cursor: blockAdjust ? 'not-allowed' : 'pointer', color: blockAdjust ? '#64748b' : '#fff' }}>
                                        ✓ Accept & Adjust Record
                                    </button>
                                    <button onClick={() => {
                                        if (!notes.trim()) {
                                            toast.warning("Please provide notes for the dispute.");
                                            return;
                                        }
                                        onResolve(result.id, 'DISPUTE', notes);
                                    }}
                                        style={{ ...btnPrimary, fontSize: 12, padding: '8px 14px', background: '#f59e0b' }}>
                                        🔍 Dispute
                                    </button>
                                    <button onClick={() => onResolve(result.id, 'IGNORE', notes)}
                                        disabled={disableIgnore}
                                        title={disableIgnore ? "Cannot ignore financial/liability variance" : ""}
                                        style={{ ...btnPrimary, fontSize: 12, padding: '8px 14px', background: disableIgnore ? '#cbd5e1' : '#94a3b8', cursor: disableIgnore ? 'not-allowed' : 'pointer', color: disableIgnore ? '#64748b' : '#fff' }}>
                                        ✕ Ignore
                                    </button>
                                </div>
                            </div>
                        );
                    })()}

                    {result.resolution_notes && (
                        <p style={{ marginTop: 8, fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                            📝 {result.resolution_notes}
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
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
            <button onClick={() => setShow(!show)}
                style={{
                    width: '100%', padding: '14px 20px', border: 'none', background: '#f8fafc',
                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', fontWeight: 600, fontSize: 14, color: '#475569',
                }}>
                📄 Parsed Bank Rows ({rows.length})
                {show ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {show && (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                                {['LG Number', 'Beneficiary', 'Amount', 'Currency', 'Issue Date', 'Expiry', 'Match'].map(h => (
                                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(r => (
                                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={cellStyle}>{r.bank_lg_number || '—'}</td>
                                    <td style={cellStyle}>{r.beneficiary_name || '—'}</td>
                                    <td style={cellStyle}>{r.amount ? Number(r.amount).toLocaleString() : '—'}</td>
                                    <td style={cellStyle}>{r.currency_code || '—'}</td>
                                    <td style={cellStyle}>{r.issue_date || '—'}</td>
                                    <td style={cellStyle}>{r.expiry_date || '—'}</td>
                                    <td style={cellStyle}>
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

function StatCard({ label, value, color }) {
    return (
        <div style={{
            background: `${color}08`, borderRadius: 10, padding: '14px 16px',
            border: `1px solid ${color}22`, textAlign: 'center',
        }}>
            <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginTop: 2 }}>{label}</div>
        </div>
    );
}

function StatusBadge({ status }) {
    const map = {
        CREATED: { bg: '#f1f5f9', color: '#64748b' },
        PARSING: { bg: '#dbeafe', color: '#2563eb' },
        PARSED: { bg: '#e0f2fe', color: '#0284c7' },
        MATCHING: { bg: '#fef3c7', color: '#d97706' },
        MATCHED: { bg: '#dcfce7', color: '#16a34a' },
        REVIEW: { bg: '#fef3c7', color: '#d97706' },
        COMPLETED: { bg: '#d1fae5', color: '#059669' },
        FAILED: { bg: '#fef2f2', color: '#dc2626' },
    };
    const s = map[status] || map.CREATED;
    return (
        <span style={{
            background: s.bg, color: s.color, padding: '4px 10px',
            borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        }}>{status}</span>
    );
}

function MatchBadge({ status }) {
    const map = {
        MATCHED: { bg: '#d1fae5', color: '#059669', label: '✅ Matched' },
        PARTIAL_MATCH: { bg: '#fef3c7', color: '#d97706', label: '⚠️ Partial' },
        BANK_ONLY: { bg: '#fef2f2', color: '#dc2626', label: '❌ Bank Only' },
        UNMATCHED: { bg: '#f1f5f9', color: '#64748b', label: '⏳ Pending' },
    };
    const m = map[status] || map.UNMATCHED;
    return <span style={{ background: m.bg, color: m.color, padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{m.label}</span>;
}

function ResolutionBadge({ resolution, approval }) {
    if (resolution === 'ADJUSTED') {
        if (approval === 'APPROVED') return <span style={badgeStyle('#d1fae5', '#059669')}>✅ Adjusted & Approved</span>;
        if (approval === 'REJECTED') return <span style={badgeStyle('#fef2f2', '#dc2626')}>❌ Rejected</span>;
        return <span style={badgeStyle('#dbeafe', '#2563eb')}>⏳ Pending Approval</span>;
    }
    if (resolution === 'DISPUTE') return <span style={badgeStyle('#fef3c7', '#d97706')}>🔍 Disputed</span>;
    if (resolution === 'IGNORE') return <span style={badgeStyle('#f1f5f9', '#64748b')}>⊘ Ignored</span>;
    return null;
}

// ─── Styles ───
const labelStyle = { display: 'block', fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 6 };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
const btnPrimary = { padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 };
const btnSuccess = { padding: '10px 20px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 };
const cellStyle = { padding: '10px 12px', color: '#374151' };
const badgeStyle = (bg, color) => ({ background: bg, color, padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 });
