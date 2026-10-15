import React, { useState, useEffect, useMemo } from 'react';
import {
    X, Download, ArrowUp, ArrowDown, Trash2, Check,
    SlidersHorizontal, Sparkles, Layers, CheckSquare,
    Square, FileSpreadsheet, RotateCcw, Search, MoveVertical
} from 'lucide-react';
import { apiRequest } from '../../services/apiService';
import { toast } from 'react-toastify';

const FALLBACK_FIELDS = [
    { id: 'internal_serial', label: 'Internal Serial', category: 'Identification', default: true },
    { id: 'lg_ref_number', label: 'Customer LG Ref', category: 'Identification', default: true },
    { id: 'bank_lg_number', label: 'Bank LG Number', category: 'Identification', default: true },
    { id: 'status', label: 'Current Status', category: 'Identification', default: true },
    { id: 'days_remaining', label: 'Days Remaining', category: 'Identification', default: true },

    { id: 'current_amount', label: 'Current Amount', category: 'Financials', default: true },
    { id: 'currency', label: 'Currency', category: 'Financials', default: true },
    { id: 'initial_amount', label: 'Initial Requested Amount', category: 'Financials', default: false },
    { id: 'net_amount_change', label: 'Net Amount Change', category: 'Financials', default: false },

    { id: 'issue_date', label: 'Bank Issue Date', category: 'Key Dates', default: true },
    { id: 'expiry_date', label: 'Current Expiry Date', category: 'Key Dates', default: true },
    { id: 'original_expiry_date', label: 'Original Expiry Date', category: 'Key Dates', default: false },
    { id: 'request_date', label: 'Request Date', category: 'Key Dates', default: false },

    { id: 'bank_name', label: 'Issuing Bank', category: 'Parties & Facilities', default: true },
    { id: 'facility_name', label: 'Credit Facility & Sub-Limit', category: 'Parties & Facilities', default: true },
    { id: 'beneficiary_name', label: 'Beneficiary Name', category: 'Parties & Facilities', default: true },
    { id: 'beneficiary_country', label: 'Beneficiary Country', category: 'Parties & Facilities', default: false },
    { id: 'beneficiary_address', label: 'Beneficiary Address', category: 'Parties & Facilities', default: false },
    { id: 'issuing_entity', label: 'Issuing Entity', category: 'Parties & Facilities', default: false },

    { id: 'origination_source', label: 'Origination Source', category: 'Origination & Request', default: false },
    { id: 'request_serial', label: 'Request Serial #', category: 'Origination & Request', default: false },
    { id: 'requestor_name', label: 'Requestor Name', category: 'Origination & Request', default: true },
    { id: 'requestor_email', label: 'Requestor Email', category: 'Origination & Request', default: false },
    { id: 'department', label: 'Department', category: 'Origination & Request', default: true },
    { id: 'job_title', label: 'Job Title', category: 'Origination & Request', default: false },
    { id: 'lg_type', label: 'LG Type', category: 'Origination & Request', default: true },
    { id: 'lg_purpose', label: 'LG Purpose / Description', category: 'Origination & Request', default: false },
    { id: 'reference_type', label: 'Underlying Contract Type', category: 'Origination & Request', default: false },
    { id: 'reference_number', label: 'Underlying Contract / PO #', category: 'Origination & Request', default: false },
    { id: 'reference_amount', label: 'Contract Ref Amount', category: 'Origination & Request', default: false },
    { id: 'reference_validity', label: 'Reference Validity Status', category: 'Origination & Request', default: false },

    { id: 'approval_status', label: 'Approval Status', category: 'Governance', default: true },
    { id: 'approved_by', label: 'Approved By', category: 'Governance', default: true },
    { id: 'approval_date', label: 'Approval Date', category: 'Governance', default: false },

    { id: 'issuance_method', label: 'Issuance Method', category: 'Issuance & Logistics', default: false },
    { id: 'issued_by', label: 'Issued By (Treasury Officer)', category: 'Issuance & Logistics', default: false },
    { id: 'execution_date', label: 'Execution Date', category: 'Issuance & Logistics', default: false },
    { id: 'delivery_date', label: 'Delivery to Bank Date', category: 'Issuance & Logistics', default: false },
    { id: 'delivery_method', label: 'Delivery Method', category: 'Issuance & Logistics', default: false },
    { id: 'delivery_notes', label: 'Delivery Notes', category: 'Issuance & Logistics', default: false },

    { id: 'bank_reply_date', label: 'Bank Reply Date', category: 'Verification & Custody', default: false },
    { id: 'bank_confirmed_amount', label: 'Bank Confirmed Amount', category: 'Verification & Custody', default: false },
    { id: 'verification_status', label: 'Verification Status', category: 'Verification & Custody', default: false },
    { id: 'verified_by', label: 'Verified By', category: 'Verification & Custody', default: false },
    { id: 'handover_date', label: 'Handover to Beneficiary Date', category: 'Verification & Custody', default: false },
    { id: 'recipient_name', label: 'Recipient Name', category: 'Verification & Custody', default: false },
    { id: 'custody_holder', label: 'Custody Holder', category: 'Verification & Custody', default: false },

    { id: 'maint_count', label: 'Maintenance Actions Count', category: 'Maintenance', default: true },
    { id: 'ext_count', label: 'Extensions Count', category: 'Maintenance', default: false },
    { id: 'latest_maint_type', label: 'Latest Action Type', category: 'Maintenance', default: true },
    { id: 'latest_maint_date', label: 'Latest Action Date', category: 'Maintenance', default: false },
    { id: 'latest_maint_status', label: 'Latest Action Status', category: 'Maintenance', default: true },
];

const PRESETS = {
    summary: [
        'internal_serial', 'lg_ref_number', 'status', 'current_amount', 'currency',
        'expiry_date', 'days_remaining', 'bank_name', 'beneficiary_name', 'lg_type', 'department'
    ],
    financial: [
        'internal_serial', 'lg_ref_number', 'bank_lg_number', 'status', 'current_amount', 'currency',
        'initial_amount', 'net_amount_change', 'bank_name', 'facility_name', 'issue_date', 'expiry_date', 'days_remaining'
    ],
    operations: [
        'internal_serial', 'lg_ref_number', 'bank_lg_number', 'status', 'bank_name', 'beneficiary_name',
        'issuance_method', 'issued_by', 'delivery_date', 'delivery_method', 'handover_date', 'recipient_name', 'custody_holder'
    ],
    detailed: [
        'internal_serial', 'lg_ref_number', 'bank_lg_number', 'status', 'days_remaining',
        'current_amount', 'currency', 'initial_amount', 'net_amount_change',
        'origination_source', 'request_serial', 'request_date', 'requestor_name', 'department',
        'issuing_entity', 'lg_type', 'lg_purpose',
        'reference_number', 'reference_amount', 'reference_validity',
        'approval_status', 'approved_by', 'approval_date',
        'beneficiary_name', 'beneficiary_country', 'bank_name', 'facility_name',
        'issuance_method', 'issued_by', 'execution_date', 'delivery_date', 'delivery_method',
        'bank_reply_date', 'issue_date', 'expiry_date', 'bank_confirmed_amount',
        'verification_status', 'verified_by', 'handover_date', 'recipient_name', 'custody_holder',
        'maint_count', 'ext_count', 'latest_maint_type', 'latest_maint_date', 'latest_maint_status'
    ],
};

export default function CustomExportModal({ isOpen, onClose, statusFilter, searchFilter }) {
    const [fields, setFields] = useState(FALLBACK_FIELDS);
    const [presets, setPresets] = useState(PRESETS);
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [includeEventLog, setIncludeEventLog] = useState(false);
    const [includeApprovals, setIncludeApprovals] = useState(false);
    const [saveDefault, setSaveDefault] = useState(false);
    const [filterQuery, setFilterQuery] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [activePreset, setActivePreset] = useState('summary');

    // Load available fields & saved preference on open
    useEffect(() => {
        if (!isOpen) return;

        // Load fields from backend if available
        apiRequest('/issuance/issued-lgs/export-fields')
            .then(res => {
                if (res && res.fields) {
                    setFields(res.fields);
                    if (res.presets) setPresets(res.presets);
                }
            })
            .catch(() => {
                // Use fallback fields
            });

        // Check localStorage for saved custom columns
        try {
            const saved = localStorage.getItem('custom_export_columns');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setSelectedColumns(parsed);
                    setActivePreset('custom');
                    return;
                }
            }
        } catch (e) {
            // ignore
        }

        // Default to summary preset
        setSelectedColumns(PRESETS.summary);
        setActivePreset('summary');
    }, [isOpen]);

    // Field lookup map
    const fieldMap = useMemo(() => {
        const map = {};
        fields.forEach(f => { map[f.id] = f; });
        return map;
    }, [fields]);

    // Categories
    const categories = useMemo(() => {
        const cats = {};
        fields.forEach(f => {
            if (!cats[f.category]) cats[f.category] = [];
            cats[f.category].push(f);
        });
        return cats;
    }, [fields]);

    // Filtered fields for left column
    const filteredCategories = useMemo(() => {
        if (!filterQuery) return categories;
        const q = filterQuery.toLowerCase();
        const filtered = {};
        Object.entries(categories).forEach(([cat, list]) => {
            const matched = list.filter(f => f.label.toLowerCase().includes(q) || f.category.toLowerCase().includes(q));
            if (matched.length > 0) filtered[cat] = matched;
        });
        return filtered;
    }, [categories, filterQuery]);

    if (!isOpen) return null;

    // Toggle column selection
    const toggleColumn = (colId) => {
        setActivePreset('custom');
        setSelectedColumns(prev => {
            if (prev.includes(colId)) {
                return prev.filter(c => c !== colId);
            } else {
                return [...prev, colId];
            }
        });
    };

    // Toggle entire category
    const toggleCategory = (catFields) => {
        setActivePreset('custom');
        const catIds = catFields.map(f => f.id);
        const allSelected = catIds.every(id => selectedColumns.includes(id));
        if (allSelected) {
            setSelectedColumns(prev => prev.filter(id => !catIds.includes(id)));
        } else {
            setSelectedColumns(prev => {
                const additions = catIds.filter(id => !prev.includes(id));
                return [...prev, ...additions];
            });
        }
    };

    // Move column up or down
    const moveColumn = (index, delta) => {
        setActivePreset('custom');
        setSelectedColumns(prev => {
            const newCols = [...prev];
            const targetIndex = index + delta;
            if (targetIndex < 0 || targetIndex >= newCols.length) return prev;
            const temp = newCols[index];
            newCols[index] = newCols[targetIndex];
            newCols[targetIndex] = temp;
            return newCols;
        });
    };

    // Apply preset
    const applyPreset = (key) => {
        const list = presets[key] || PRESETS[key];
        if (list) {
            setSelectedColumns(list);
            setActivePreset(key);
            if (key === 'full_audit' || key === 'detailed') {
                setIncludeEventLog(true);
                setIncludeApprovals(true);
            } else {
                setIncludeEventLog(false);
                setIncludeApprovals(false);
            }
        }
    };

    // Trigger Export
    const handleExport = async () => {
        if (selectedColumns.length === 0) {
            toast.error('Please select at least one column to export.');
            return;
        }

        setIsExporting(true);
        try {
            // Save to localStorage if requested
            if (saveDefault) {
                localStorage.setItem('custom_export_columns', JSON.stringify(selectedColumns));
            }

            const params = new URLSearchParams({
                export_type: 'custom',
                columns: selectedColumns.join(','),
                include_event_log: includeEventLog,
                include_approvals: includeApprovals,
            });

            if (statusFilter && statusFilter !== 'ALL') params.append('status_filter', statusFilter);
            if (searchFilter) params.append('search', searchFilter);

            const blob = await apiRequest(`/issuance/issued-lgs/export?${params}`, 'GET', null, 'application/json', 'blob');
            const fileBlob = blob instanceof Blob ? blob : new Blob([blob], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            const url = window.URL.createObjectURL(fileBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `issued_lgs_custom_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast.success(`Exported ${selectedColumns.length} customized columns successfully!`);
            onClose();
        } catch (err) {
            console.error('Custom export failed:', err);
            toast.error('Failed to generate customized export.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-100/80 text-blue-700 rounded-xl shadow-xs">
                            <SlidersHorizontal className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Custom Report Builder</h2>
                            <p className="text-xs text-slate-500">Select and arrange the exact columns and tabs for your Excel export</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Preset Bar */}
                <div className="px-6 py-2.5 bg-white border-b border-slate-100 flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mr-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Presets:
                    </span>
                    {[
                        { key: 'summary', label: '📊 Summary (11 cols)' },
                        { key: 'financial', label: '💰 Financial & Exposure (13 cols)' },
                        { key: 'operations', label: '🚚 Logistics & Custody (13 cols)' },
                        { key: 'detailed', label: '📜 Full Master (44 cols)' },
                    ].map(p => (
                        <button
                            key={p.key}
                            onClick={() => applyPreset(p.key)}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                                activePreset === p.key
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                    {selectedColumns.length > 0 && (
                        <button
                            onClick={() => { setSelectedColumns([]); setActivePreset('custom'); }}
                            className="text-xs text-rose-500 hover:text-rose-700 ml-auto flex items-center gap-1 font-medium px-2 py-1 rounded hover:bg-rose-50"
                        >
                            <RotateCcw className="w-3 h-3" /> Clear All
                        </button>
                    )}
                </div>

                {/* Body — 2 Columns */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-100">
                    {/* Left: Available Fields by Category */}
                    <div className="flex flex-col h-full overflow-hidden bg-slate-50/30">
                        <div className="p-3 border-b border-slate-100 bg-white">
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    placeholder="Search available columns..."
                                    value={filterQuery}
                                    onChange={(e) => setFilterQuery(e.target.value)}
                                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {Object.entries(filteredCategories).map(([cat, catFields]) => {
                                const catIds = catFields.map(f => f.id);
                                const selectedCount = catIds.filter(id => selectedColumns.includes(id)).length;
                                const isAll = selectedCount === catIds.length;

                                return (
                                    <div key={cat} className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs">
                                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                                <Layers className="w-3.5 h-3.5 text-blue-500" /> {cat}
                                                <span className="text-[10px] text-slate-400 font-normal">({selectedCount}/{catFields.length})</span>
                                            </span>
                                            <button
                                                onClick={() => toggleCategory(catFields)}
                                                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                {isAll ? 'Deselect All' : 'Select All'}
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 gap-1.5">
                                            {catFields.map(f => {
                                                const isSelected = selectedColumns.includes(f.id);
                                                return (
                                                    <label
                                                        key={f.id}
                                                        onClick={() => toggleColumn(f.id)}
                                                        className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                                                            isSelected ? 'bg-blue-50/60 text-blue-900 font-medium' : 'hover:bg-slate-50 text-slate-600'
                                                        }`}
                                                    >
                                                        {isSelected ? (
                                                            <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                                                        ) : (
                                                            <Square className="w-4 h-4 text-slate-300 shrink-0" />
                                                        )}
                                                        <span className="truncate">{f.label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Selected Columns & Reordering */}
                    <div className="flex flex-col h-full overflow-hidden bg-white">
                        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <span className="text-xs font-bold text-slate-800">Export Columns & Order</span>
                                <p className="text-[10px] text-slate-400">Use ⬆️ ⬇️ to reorder columns in Excel</p>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                {selectedColumns.length} columns
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
                            {selectedColumns.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                                    <FileSpreadsheet className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
                                    <p className="text-xs font-medium">No columns selected</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Click fields on the left or select a preset</p>
                                </div>
                            ) : (
                                selectedColumns.map((colId, idx) => {
                                    const field = fieldMap[colId] || { label: colId, category: 'General' };
                                    return (
                                        <div
                                            key={colId}
                                            className="flex items-center justify-between p-2 bg-slate-50/80 hover:bg-slate-100/80 rounded-lg border border-slate-200/60 text-xs transition-colors group"
                                        >
                                            <div className="flex items-center gap-2 truncate pr-2">
                                                <span className="w-5 text-center text-[10px] font-mono text-slate-400">{idx + 1}</span>
                                                <div className="truncate">
                                                    <span className="font-medium text-slate-800">{field.label}</span>
                                                    <span className="text-[10px] text-slate-400 ml-1.5">({field.category})</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    disabled={idx === 0}
                                                    onClick={() => moveColumn(idx, -1)}
                                                    className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-20 rounded"
                                                    title="Move Up"
                                                >
                                                    <ArrowUp className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    disabled={idx === selectedColumns.length - 1}
                                                    onClick={() => moveColumn(idx, 1)}
                                                    className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-20 rounded"
                                                    title="Move Down"
                                                >
                                                    <ArrowDown className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => toggleColumn(colId)}
                                                    className="p-1 text-slate-400 hover:text-rose-600 rounded ml-1"
                                                    title="Remove Column"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Additional Tabs Options */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
                    <div className="flex items-center gap-4 flex-wrap">
                        <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                            <input
                                type="checkbox"
                                checked={includeEventLog}
                                onChange={(e) => setIncludeEventLog(e.target.checked)}
                                className="rounded text-blue-600 focus:ring-0"
                            />
                            <span>Include <strong>Lifecycle Event Log</strong> tab</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                            <input
                                type="checkbox"
                                checked={includeApprovals}
                                onChange={(e) => setIncludeApprovals(e.target.checked)}
                                className="rounded text-blue-600 focus:ring-0"
                            />
                            <span>Include <strong>Approvals Audit</strong> tab</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-slate-500 select-none">
                            <input
                                type="checkbox"
                                checked={saveDefault}
                                onChange={(e) => setSaveDefault(e.target.checked)}
                                className="rounded text-blue-600 focus:ring-0"
                            />
                            <span>Save layout as my default</span>
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 bg-white border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                        Ready to export <strong>{selectedColumns.length}</strong> columns
                        {includeEventLog && ' + Lifecycle Log'}
                        {includeApprovals && ' + Approvals Tab'}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={selectedColumns.length === 0 || isExporting}
                            onClick={handleExport}
                            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-all"
                        >
                            {isExporting ? (
                                <>Generating Excel...</>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" /> Export Excel (.xlsx)
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
