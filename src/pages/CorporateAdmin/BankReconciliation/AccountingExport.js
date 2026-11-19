import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    Download, FileSpreadsheet, Lock, CheckCircle2, AlertCircle, Info,
    Plus, Trash2, ArrowUp, ArrowDown, Save, Eye, Settings2, Layers,
    RefreshCw, Sparkles, ArrowRight, GripVertical, RotateCcw, Landmark, Filter
} from 'lucide-react';
import { apiRequest, API_BASE_URL } from '../../../services/apiService';
import { isCachedTrialSession } from '../../../components/Trial/useTrialExperience';

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

const ERP_PRESETS = [
    {
        key: 'standard',
        label: 'Standard Bank Statement',
        badge: '14 cols · Flat CSV',
        description: '1 row per bank transaction with balances & categories',
        fileFormat: 'CSV',
        dateFormat: '%Y-%m-%d',
        expandJournalLegs: false,
        bankGlAccount: '1010010 - Cash at Bank',
        columns: DEFAULT_COLUMNS
    },
    {
        key: 'sap_fi',
        label: 'SAP S/4HANA FI Journal',
        badge: '8 cols · GL Legs · XLSX',
        description: 'Balanced Bank + Offset + Fee Variance journal rows',
        fileFormat: 'XLSX',
        dateFormat: '%Y-%m-%d',
        expandJournalLegs: true,
        bankGlAccount: '1010010 - Cash at Bank',
        columns: [
            { source_field: 'booking_date', custom_header: 'Posting Date' },
            { source_field: 'account_number', custom_header: 'Bank Account' },
            { source_field: 'internal_category', custom_header: 'G/L Account' },
            { source_field: 'debit_amount', custom_header: 'Debit' },
            { source_field: 'credit_amount', custom_header: 'Credit' },
            { source_field: 'currency', custom_header: 'Currency' },
            { source_field: 'matched_erp_reference', custom_header: 'Assignment Ref' },
            { source_field: 'raw_description', custom_header: 'Line Narration' }
        ]
    },
    {
        key: 'oracle_netsuite',
        label: 'Oracle / NetSuite Cash',
        badge: '8 cols · GL Legs · CSV',
        description: 'Signed net amount & D/C indicator with journal legs',
        fileFormat: 'CSV',
        dateFormat: '%d-%b-%Y',
        expandJournalLegs: true,
        bankGlAccount: '1010010 - Cash at Bank',
        columns: [
            { source_field: 'booking_date', custom_header: 'Transaction Date' },
            { source_field: 'counterparty_name', custom_header: 'Entity Name' },
            { source_field: 'internal_category', custom_header: 'GL Account' },
            { source_field: 'signed_amount', custom_header: 'Net Amount' },
            { source_field: 'dc_indicator', custom_header: 'D/C Indicator' },
            { source_field: 'currency', custom_header: 'Currency' },
            { source_field: 'e2e_id', custom_header: 'External Ref' },
            { source_field: 'raw_description', custom_header: 'Memo' }
        ]
    },
    {
        key: 'audit_pack',
        label: 'Audit & Variance Pack',
        badge: '12 cols · Audit · XLSX',
        description: 'Classification source, AI confidence & ERP match audit',
        fileFormat: 'XLSX',
        dateFormat: '%Y-%m-%d',
        expandJournalLegs: false,
        bankGlAccount: '1010010 - Cash at Bank',
        columns: [
            { source_field: 'booking_date', custom_header: 'Booking Date' },
            { source_field: 'account_number', custom_header: 'Account Number' },
            { source_field: 'counterparty_name', custom_header: 'Counterparty' },
            { source_field: 'debit_amount', custom_header: 'Debit' },
            { source_field: 'credit_amount', custom_header: 'Credit' },
            { source_field: 'currency', custom_header: 'Currency' },
            { source_field: 'classification_category', custom_header: 'Category' },
            { source_field: 'internal_category', custom_header: 'GL Account' },
            { source_field: 'classification_source', custom_header: 'Source' },
            { source_field: 'classification_confidence', custom_header: 'Confidence %' },
            { source_field: 'matched_erp_reference', custom_header: 'Matched ERP Ref' },
            { source_field: 'variance_amount', custom_header: 'Variance / Fee' }
        ]
    }
];

const AMOUNT_SOURCE_FIELDS = new Set([
    'debit_amount',
    'credit_amount',
    'signed_amount',
    'absolute_amount',
    'running_balance',
    'variance_amount'
]);

const formatSampleDate = (isoDate, dateFormat) => {
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    const [yyyy, mm, dd] = parts;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mmm = months[Math.max(0, Math.min(11, parseInt(mm, 10) - 1))] || mm;
    switch (dateFormat) {
        case '%d/%m/%Y':
            return `${dd}/${mm}/${yyyy}`;
        case '%m/%d/%Y':
            return `${mm}/${dd}/${yyyy}`;
        case '%d-%b-%Y':
            return `${dd}-${mmm}-${yyyy}`;
        case '%Y-%m-%d':
        default:
            return `${yyyy}-${mm}-${dd}`;
    }
};

const formatCurrencyCell = (val) => {
    const num = Number(val);
    if (Number.isNaN(num)) return String(val);
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const buildSampleRows = (columnsConfig, dateFormat, expandJournalLegs, bankGlAccount) => {
    const sampleTxns = [
        {
            booking_date: '2026-08-31',
            value_date: '2026-08-31',
            account_number: 'EG38001000010000123456789',
            raw_description: 'IPN TRANSFER FROM DELTA TRADING CO INV-2026-104',
            description_line2: 'INSTAPAY REF 994021',
            debit_amount: 0,
            credit_amount: 98950,
            currency: 'EGP',
            running_balance: 1450950,
            counterparty_name: 'Delta Trading Co.',
            classification_category: 'COLLECTION_FROM_CUSTOMER',
            sub_category: 'Invoice Settlement',
            internal_category: '1020100 - Trade Receivables',
            classification_source: 'RULE',
            classification_confidence: 98,
            applied_rule_name: 'Customer IPN Collection',
            classification_reasoning: 'Matched counterparty Delta Trading Co. & INV-2026-104',
            is_reconciled: true,
            matched_erp_reference: 'INV-2026-104',
            variance_amount: 50,
            back_office_ref: 'IPN-994021',
            e2e_id: 'E2E-8842019',
            cheque_number: '',
            counterparty_iban: 'EG84000200015555123400012'
        },
        {
            booking_date: '2026-08-30',
            value_date: '2026-08-30',
            account_number: 'EG38001000010000123456789',
            raw_description: 'ACH PAYMENT TO AL-NOOR SUPPLIES BILL-2026-089',
            description_line2: 'ACH BATCH 4421',
            debit_amount: 24500,
            credit_amount: 0,
            currency: 'EGP',
            running_balance: 1352000,
            counterparty_name: 'Al-Noor Supplies',
            classification_category: 'PAYMENT_TO_SUPPLIER',
            sub_category: 'Vendor Settlement',
            internal_category: '2010100 - Accounts Payable',
            classification_source: 'CONCEPT',
            classification_confidence: 95,
            applied_rule_name: 'Supplier ACH Settlement',
            classification_reasoning: 'Matched AP Bill BILL-2026-089',
            is_reconciled: true,
            matched_erp_reference: 'BILL-2026-089',
            variance_amount: 0,
            back_office_ref: 'ACH-442100',
            e2e_id: 'E2E-8841802',
            cheque_number: '',
            counterparty_iban: 'EG19000300027777000099114'
        }
    ];

    const extractSampleValue = (txn, fieldKey, overrides = null) => {
        const merged = overrides ? { ...txn, ...overrides } : txn;
        if (fieldKey === 'booking_date' || fieldKey === 'value_date') {
            return formatSampleDate(merged[fieldKey], dateFormat);
        }
        if (fieldKey === 'dc_indicator') {
            return (merged.credit_amount || 0) > 0 ? 'CR' : 'DR';
        }
        if (fieldKey === 'signed_amount') {
            return Number((merged.credit_amount || 0) - (merged.debit_amount || 0));
        }
        if (fieldKey === 'absolute_amount') {
            return Number(Math.max(merged.credit_amount || 0, merged.debit_amount || 0));
        }
        if (fieldKey.startsWith('custom_fields.')) {
            return 'Sample Value';
        }
        return merged[fieldKey] !== undefined && merged[fieldKey] !== null ? merged[fieldKey] : '';
    };

    const rows = [];
    sampleTxns.forEach((txn) => {
        if (!expandJournalLegs) {
            const row = {};
            columnsConfig.forEach((col) => {
                const hdr = col.custom_header || col.source_field;
                row[hdr] = extractSampleValue(txn, col.source_field);
            });
            rows.push(row);
        } else {
            const isCr = (txn.credit_amount || 0) > 0;
            const bankAmt = isCr ? txn.credit_amount : txn.debit_amount;
            const varAmt = txn.variance_amount || 0;
            const legs = [
                {
                    internal_category: bankGlAccount || '1010010 - Cash at Bank',
                    debit_amount: isCr ? bankAmt : 0,
                    credit_amount: isCr ? 0 : bankAmt,
                    raw_description: `[BANK LEG] ${txn.raw_description}`
                },
                {
                    internal_category: txn.internal_category || txn.classification_category,
                    debit_amount: isCr ? 0 : bankAmt + varAmt,
                    credit_amount: isCr ? bankAmt + varAmt : 0,
                    raw_description: `[OFFSET LEG] ${txn.raw_description}`
                }
            ];
            if (varAmt > 0) {
                legs.push({
                    internal_category: 'BANK_CHARGES',
                    debit_amount: isCr ? varAmt : 0,
                    credit_amount: isCr ? 0 : varAmt,
                    raw_description: `[VARIANCE FEE LEG] ${txn.raw_description}`
                });
            }
            legs.forEach((leg) => {
                const row = {};
                columnsConfig.forEach((col) => {
                    const hdr = col.custom_header || col.source_field;
                    row[hdr] = extractSampleValue(txn, col.source_field, leg);
                });
                rows.push(row);
            });
        }
    });
    return rows;
};

const AccountingExport = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const basePrefix = location.pathname.startsWith('/end-user') ? '/end-user' : '/corporate-admin';

    const [profiles, setProfiles] = useState([]);
    const [selectedProfileId, setSelectedProfileId] = useState('');
    const [profileName, setProfileName] = useState('');
    const [activePresetKey, setActivePresetKey] = useState('standard');
    const [availableFields, setAvailableFields] = useState([]);
    const [banks, setBanks] = useState([]);
    const [statements, setStatements] = useState([]);
    const [selectedBankId, setSelectedBankId] = useState('');
    const [selectedStatementId, setSelectedStatementId] = useState('');

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
    const [isDeletingProfile, setIsDeletingProfile] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showBuilder, setShowBuilder] = useState(true);
    const [showSampleRows, setShowSampleRows] = useState(true);
    const [dragIdx, setDragIdx] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);

    const [isTrialSandbox] = useState(() => {
        try {
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            return isCachedTrialSession(u?.customer_id);
        } catch {
            return false;
        }
    });
    const [isAutoLoadingTrial, setIsAutoLoadingTrial] = useState(false);
    const isLoadedOnceRef = useRef(false);

    const fetchProfiles = useCallback(async () => {
        try {
            const data = await apiRequest('/reconciliation/export-profiles', 'GET');
            setProfiles(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load export profiles', err);
        }
    }, []);

    const fetchAvailableFields = useCallback(async () => {
        try {
            const data = await apiRequest('/reconciliation/export/available-fields', 'GET');
            if (data && Array.isArray(data.available_fields)) {
                setAvailableFields(data.available_fields);
            }
        } catch (err) {
            console.error('Failed to load available export fields', err);
        }
    }, []);

    const fetchScopeMetadata = useCallback(async () => {
        try {
            const [banksRes, stmtsRes] = await Promise.all([
                apiRequest('/reconciliation/banks', 'GET'),
                apiRequest('/reconciliation/statements', 'GET')
            ]);
            setBanks(Array.isArray(banksRes) ? banksRes : []);
            setStatements(Array.isArray(stmtsRes) ? stmtsRes : []);
        } catch (err) {
            console.error('Failed to load banks/statements metadata', err);
        }
    }, []);

    const requestPayload = useMemo(() => ({
        profile_id: selectedProfileId ? parseInt(selectedProfileId, 10) : null,
        bank_id: selectedBankId ? parseInt(selectedBankId, 10) : null,
        statement_id: selectedStatementId ? parseInt(selectedStatementId, 10) : null,
        file_format: fileFormat,
        date_format: dateFormat,
        columns_config: columnsConfig,
        expand_journal_legs: expandJournalLegs,
        bank_gl_account: bankGlAccount,
        only_reconciled: onlyReconciled ? true : null,
        only_classified: onlyClassified ? true : null,
        exclude_already_exported: excludeExported,
        mark_as_exported: false
    }), [
        selectedProfileId,
        selectedBankId,
        selectedStatementId,
        fileFormat,
        dateFormat,
        columnsConfig,
        expandJournalLegs,
        bankGlAccount,
        onlyReconciled,
        onlyClassified,
        excludeExported
    ]);

    const loadPreview = useCallback(async () => {
        setIsLoadingPreview(true);
        try {
            const data = await apiRequest('/reconciliation/export/preview', 'POST', requestPayload);
            if (data) {
                setSummary(prev => data.summary || prev);
                setPreviewHeaders(data.headers || []);
                setPreviewRows(data.preview_rows || []);
            }
        } catch (err) {
            console.error('Failed to load export preview', err);
        } finally {
            isLoadedOnceRef.current = true;
            setIsLoadingPreview(false);
        }
    }, [requestPayload]);

    useEffect(() => {
        fetchProfiles();
        fetchAvailableFields();
        fetchScopeMetadata();
    }, [fetchProfiles, fetchAvailableFields, fetchScopeMetadata]);

    useEffect(() => {
        const delay = isLoadedOnceRef.current ? 300 : 0;
        const timer = setTimeout(() => {
            loadPreview();
        }, delay);
        return () => clearTimeout(timer);
    }, [loadPreview]);

    useEffect(() => {
        const handleSampleLoaded = (evt) => {
            if (!evt?.detail?.scope || evt.detail.scope === 'reconciliation') {
                setIsAutoLoadingTrial(false);
                fetchProfiles();
                fetchAvailableFields();
                fetchScopeMetadata();
                loadPreview();
            }
        };
        window.addEventListener('grow-trial-sample-loaded', handleSampleLoaded);
        return () => window.removeEventListener('grow-trial-sample-loaded', handleSampleLoaded);
    }, [fetchProfiles, fetchAvailableFields, fetchScopeMetadata, loadPreview]);

    const filteredStatements = useMemo(() => {
        if (!selectedBankId) return statements;
        return statements.filter(s => String(s.bank_id) === String(selectedBankId));
    }, [statements, selectedBankId]);

    const groupedFields = useMemo(() => {
        const groups = new Map();
        availableFields.forEach((f) => {
            const g = f.group || 'Other Fields';
            if (!groups.has(g)) groups.set(g, []);
            groups.get(g).push(f);
        });
        return Array.from(groups.entries());
    }, [availableFields]);

    const headerToSourceField = useMemo(() => {
        const map = {};
        columnsConfig.forEach((col) => {
            const hdr = col.custom_header || col.source_field;
            map[hdr] = col.source_field;
        });
        return map;
    }, [columnsConfig]);

    const isShowingSample = !isLoadingPreview && previewRows.length === 0 && summary.total_transactions === 0 && showSampleRows;

    const samplePreviewRows = useMemo(() => {
        if (!isShowingSample) return [];
        return buildSampleRows(columnsConfig, dateFormat, expandJournalLegs, bankGlAccount);
    }, [isShowingSample, columnsConfig, dateFormat, expandJournalLegs, bankGlAccount]);

    const displayedHeaders = useMemo(() => {
        if (previewHeaders.length > 0 && !isShowingSample) {
            return previewHeaders;
        }
        return columnsConfig.map(c => c.custom_header || c.source_field);
    }, [previewHeaders, isShowingSample, columnsConfig]);

    const displayedRows = isShowingSample ? samplePreviewRows : previewRows;

    const hasActiveFilters = Boolean(
        onlyClassified || onlyReconciled || excludeExported || selectedBankId || selectedStatementId
    );

    const readinessPct = summary.total_transactions > 0
        ? Math.round((summary.finalized_count / summary.total_transactions) * 100)
        : 0;

    const handleSelectProfile = (profId) => {
        setSelectedProfileId(profId);
        if (!profId) {
            setProfileName('');
            setActivePresetKey('');
            return;
        }
        const found = profiles.find(p => String(p.id) === String(profId));
        if (found) {
            setProfileName(found.profile_name || '');
            setColumnsConfig(found.columns_config_json || DEFAULT_COLUMNS);
            setFileFormat((found.file_format || 'CSV').toUpperCase());
            setDateFormat(found.date_format || '%Y-%m-%d');
            setExpandJournalLegs(Boolean(found.expand_journal_legs));
            setBankGlAccount(found.bank_gl_account || '1010010 - Cash at Bank');
            setActivePresetKey('');
        }
    };

    const handleApplyPreset = (preset) => {
        setSelectedProfileId('');
        setActivePresetKey(preset.key);
        setColumnsConfig(preset.columns.map(c => ({ ...c })));
        setFileFormat(preset.fileFormat);
        setDateFormat(preset.dateFormat);
        setExpandJournalLegs(preset.expandJournalLegs);
        setBankGlAccount(preset.bankGlAccount);
        toast.info(`Applied "${preset.label}" layout preset.`);
    };

    const handleAddColumn = () => {
        const firstField = availableFields[0]?.source_field || 'raw_description';
        const firstHeader = availableFields[0]?.default_header || 'Description';
        setActivePresetKey('');
        setColumnsConfig(prev => [...prev, { source_field: firstField, custom_header: firstHeader }]);
    };

    const handleRemoveColumn = (idx) => {
        setActivePresetKey('');
        setColumnsConfig(prev => prev.filter((_, i) => i !== idx));
    };

    const handleMoveColumn = (idx, dir) => {
        const target = idx + dir;
        if (target < 0 || target >= columnsConfig.length) return;
        setActivePresetKey('');
        setColumnsConfig(prev => {
            const copy = [...prev];
            const temp = copy[idx];
            copy[idx] = copy[target];
            copy[target] = temp;
            return copy;
        });
    };

    const handleDragStart = (idx) => {
        setDragIdx(idx);
    };

    const handleDragOver = (e, idx) => {
        e.preventDefault();
        if (dragOverIdx !== idx) {
            setDragOverIdx(idx);
        }
    };

    const handleDrop = (targetIdx) => {
        if (dragIdx === null || dragIdx === targetIdx) {
            setDragIdx(null);
            setDragOverIdx(null);
            return;
        }
        setActivePresetKey('');
        setColumnsConfig(prev => {
            const copy = [...prev];
            const [moved] = copy.splice(dragIdx, 1);
            copy.splice(targetIdx, 0, moved);
            return copy;
        });
        setDragIdx(null);
        setDragOverIdx(null);
    };

    const handleDragEnd = () => {
        setDragIdx(null);
        setDragOverIdx(null);
    };

    const handleColumnChange = (idx, key, val) => {
        setActivePresetKey('');
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

    const handleResetColumns = () => {
        setActivePresetKey('standard');
        setColumnsConfig(DEFAULT_COLUMNS.map(c => ({ ...c })));
    };

    const handleResetFilters = () => {
        setOnlyClassified(false);
        setOnlyReconciled(false);
        setExcludeExported(false);
        setSelectedBankId('');
        setSelectedStatementId('');
    };

    const handleSaveProfile = async () => {
        if (!profileName.trim()) {
            toast.warning('Please enter a template name to save this export layout.');
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
                toast.success(`Updated template "${profileName.trim()}".`);
            } else {
                const created = await apiRequest('/reconciliation/export-profiles', 'POST', payload);
                if (created?.id) setSelectedProfileId(String(created.id));
                toast.success(`Saved template "${profileName.trim()}".`);
            }
            await fetchProfiles();
            await loadPreview();
        } catch (err) {
            console.error('Failed to save export profile', err);
            toast.error(err?.message || 'Failed to save export template.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleDeleteProfile = async () => {
        if (!selectedProfileId) return;
        const found = profiles.find(p => String(p.id) === String(selectedProfileId));
        const label = found?.profile_name || profileName || `#${selectedProfileId}`;
        if (!window.confirm(`Delete saved export template "${label}"? This action cannot be undone.`)) {
            return;
        }
        setIsDeletingProfile(true);
        try {
            await apiRequest(`/reconciliation/export-profiles/${selectedProfileId}`, 'DELETE');
            setSelectedProfileId('');
            setProfileName('');
            toast.success(`Deleted template "${label}".`);
            await fetchProfiles();
        } catch (err) {
            console.error('Failed to delete export profile', err);
            toast.error(err?.message || 'Failed to delete export template.');
        } finally {
            setIsDeletingProfile(false);
        }
    };

    const handleDownloadExport = async () => {
        if (columnsConfig.length === 0) {
            toast.warning('Add at least one column before exporting.');
            return;
        }
        setIsDownloading(true);
        try {
            const token = localStorage.getItem('jwt_token') || localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/reconciliation/export/download`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    ...requestPayload,
                    mark_as_exported: markAsExported
                })
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
            toast.success(
                markAsExported
                    ? `Downloaded ${fileFormat} export and locked exported transactions.`
                    : `Downloaded ${fileFormat} export.`
            );
            if (markAsExported) {
                await loadPreview();
            }
        } catch (err) {
            console.error('Download error:', err);
            toast.error(err?.message || 'Failed to download export file.');
        } finally {
            setIsDownloading(false);
        }
    };

    const renderCellContent = (hdr, rawVal) => {
        const sourceField = headerToSourceField[hdr] || '';
        const valStr = rawVal !== undefined && rawVal !== null ? String(rawVal) : '';

        if (!valStr) {
            return <span className="text-slate-300">—</span>;
        }

        if (sourceField === 'is_reconciled') {
            const truthy = rawVal === true || valStr.toLowerCase() === 'true';
            return (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    truthy ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                }`}>
                    {truthy ? 'Reconciled' : 'Open'}
                </span>
            );
        }

        if (sourceField === 'dc_indicator') {
            const isCr = valStr.toUpperCase() === 'CR';
            return (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                    isCr ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}>
                    {valStr}
                </span>
            );
        }

        const legBadges = [
            { prefix: '[BANK LEG] ', label: 'BANK LEG', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            { prefix: '[OFFSET LEG] ', label: 'OFFSET LEG', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
            { prefix: '[VARIANCE FEE LEG] ', label: 'FEE VARIANCE', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
        ];
        const matchedLeg = legBadges.find(b => valStr.startsWith(b.prefix));
        if (matchedLeg) {
            const rest = valStr.slice(matchedLeg.prefix.length);
            return (
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`shrink-0 px-1.5 py-0.5 rounded border text-[10px] font-extrabold tracking-wide ${matchedLeg.cls}`}>
                        {matchedLeg.label}
                    </span>
                    <span className="truncate" title={valStr}>{rest}</span>
                </div>
            );
        }

        if (AMOUNT_SOURCE_FIELDS.has(sourceField)) {
            return (
                <span className="font-mono tabular-nums font-semibold text-slate-800 block text-right">
                    {formatCurrencyCell(rawVal)}
                </span>
            );
        }

        return (
            <div className="cell-truncate">
                <span className="truncate block max-w-[260px]" title={valStr}>{valStr}</span>
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-10">
            {/* ==================== 1. EXECUTIVE HEADER & STEPPER ==================== */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 text-white p-5 sm:p-6 shadow-lg border border-cyan-500/20">
                <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />
                <div className="relative flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold mb-2">
                            <button
                                type="button"
                                onClick={() => navigate(`${basePrefix}/reconciliation`)}
                                className="px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
                            >
                                1. Statements
                            </button>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <button
                                type="button"
                                onClick={() => navigate(`${basePrefix}/reconciliation/workspace`)}
                                className="px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
                            >
                                2. Review &amp; Match
                            </button>
                            <ArrowRight className="w-3 h-3 text-cyan-400" />
                            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 font-bold">
                                3. Export to Accounting
                            </span>
                        </div>

                        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                            Customizable Accounting &amp; ERP Export
                        </h1>
                        <p className="text-slate-300 text-xs sm:text-sm mt-1">
                            Design your ERP column order, rename headers, save reusable templates, and generate balanced double-entry GL journals.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => setShowBuilder(!showBuilder)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all"
                        >
                            <Settings2 className="w-3.5 h-3.5 text-cyan-300" />
                            <span>{showBuilder ? 'Hide Layout Builder' : 'Customize Columns & Order'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={loadPreview}
                            disabled={isLoadingPreview}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all disabled:opacity-60"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 text-cyan-300 ${isLoadingPreview ? 'animate-spin' : ''}`} />
                            <span>Refresh Preview</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleDownloadExport}
                            disabled={isDownloading}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold transition-all shadow-md disabled:opacity-60"
                        >
                            <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
                            <span>{isDownloading ? `Exporting ${fileFormat}...` : `Download ${fileFormat}`}</span>
                            {summary.matching_export_rows > 0 && (
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-900/15 text-[10px] font-extrabold">
                                    {summary.matching_export_rows}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ==================== 2. LIVE READINESS KPI CARDS ==================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 relative overflow-hidden shadow-sm">
                    <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Classified / Reconciled</h3>
                            <div className="text-2xl font-extrabold text-slate-900 mt-1.5">{summary.finalized_count}</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                            <span>Of {summary.total_transactions} total transactions</span>
                            <span className="font-bold text-slate-700">{readinessPct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${readinessPct}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div
                    onClick={() => {
                        if (summary.unclassified_count > 0) {
                            navigate(`${basePrefix}/reconciliation/workspace`);
                        }
                    }}
                    className={`bg-white rounded-2xl border border-slate-200/90 p-5 relative overflow-hidden shadow-sm transition-all ${
                        summary.unclassified_count > 0 ? 'cursor-pointer hover:shadow-md hover:border-amber-300' : ''
                    }`}
                >
                    <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" />
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Unclassified</h3>
                            <div className="text-2xl font-extrabold text-amber-600 mt-1.5">{summary.unclassified_count}</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-3 flex items-center justify-between">
                        <span>Pending GL assignment</span>
                        {summary.unclassified_count > 0 && (
                            <span className="text-amber-700 font-bold inline-flex items-center gap-0.5">
                                Review <ArrowRight className="w-3 h-3" />
                            </span>
                        )}
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 relative overflow-hidden shadow-sm">
                    <div className="absolute inset-x-0 top-0 h-1 bg-blue-600" />
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Export Rows Ready</h3>
                            <div className="text-2xl font-extrabold text-blue-600 mt-1.5">{summary.matching_export_rows}</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                            <Layers className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                        {expandJournalLegs ? 'Expanded Double-Entry GL Legs' : 'Direct Statement Rows'}
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 relative overflow-hidden shadow-sm">
                    <div className="absolute inset-x-0 top-0 h-1 bg-slate-400" />
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Locked / Exported</h3>
                            <div className="text-2xl font-extrabold text-slate-900 mt-1.5">{summary.exported_count}</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600">
                            <Lock className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                        {markAsExported ? 'Next download will lock rows' : 'Previously exported'}
                    </p>
                </div>
            </div>

            {/* Zero-Transaction Onboarding Banner */}
            {!isLoadingPreview && summary.total_transactions === 0 && (
                <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                            <Info className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-amber-950">
                                No bank statement transactions uploaded yet
                            </h3>
                            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                                You can still design and save your ERP export templates below — the live preview table displays an illustrative sample so you can see exactly how columns, date formats, and Double-Entry GL legs behave before uploading statements.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => navigate(`${basePrefix}/reconciliation`)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100 transition-colors"
                        >
                            <Landmark className="w-3.5 h-3.5" />
                            <span>Go to Statements</span>
                        </button>
                        {isTrialSandbox && (
                            <button
                                type="button"
                                disabled={isAutoLoadingTrial}
                                onClick={() => {
                                    setIsAutoLoadingTrial(true);
                                    window.dispatchEvent(
                                        new CustomEvent('grow-trial-trigger-autoload', { detail: { actionId: 'reconciliation_full' } })
                                    );
                                    setTimeout(() => setIsAutoLoadingTrial(false), 12000);
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-60"
                            >
                                <Sparkles className={`w-3.5 h-3.5 ${isAutoLoadingTrial ? 'animate-spin' : ''}`} />
                                <span>{isAutoLoadingTrial ? 'Loading Sample...' : 'Do It For Me (Load Sample)'}</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ==================== 3. CUSTOM EXPORT BUILDER PANEL ==================== */}
            {showBuilder && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-6">
                    {/* Quick-Start ERP Presets Strip (Buttons only — no <select> before Saved Export Template) */}
                    <div>
                        <div className="flex items-center justify-between mb-2.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-600" />
                                Quick-Start ERP Layout Presets
                            </span>
                            <span className="text-[11px] text-slate-400">
                                Click a preset to pre-fill columns &amp; journal format
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
                            {ERP_PRESETS.map((preset) => {
                                const isActive = activePresetKey === preset.key && !selectedProfileId;
                                return (
                                    <button
                                        key={preset.key}
                                        type="button"
                                        onClick={() => handleApplyPreset(preset)}
                                        className={`text-left p-3 rounded-xl border transition-all ${
                                            isActive
                                                ? 'bg-cyan-50/70 border-cyan-400 ring-1 ring-cyan-400/40'
                                                : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`text-xs font-bold truncate ${isActive ? 'text-cyan-950' : 'text-slate-800'}`}>
                                                {preset.label}
                                            </span>
                                            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                isActive ? 'bg-cyan-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
                                            }`}>
                                                {preset.badge}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                                            {preset.description}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Section 1: Template & File Settings */}
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-t border-b border-slate-100 py-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Saved Export Template
                                </label>
                                <select
                                    value={selectedProfileId}
                                    onChange={(e) => handleSelectProfile(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                                >
                                    <option value="">-- Custom / Unsaved Layout --</option>
                                    {profiles.map(p => (
                                        <option key={p.id} value={p.id}>{p.profile_name} ({p.file_format})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Template Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. SAP GL Journal Import"
                                    value={profileName}
                                    onChange={(e) => setProfileName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    File Format
                                </label>
                                <select
                                    value={fileFormat}
                                    onChange={(e) => setFileFormat(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                                >
                                    <option value="CSV">CSV (UTF-8 with BOM)</option>
                                    <option value="XLSX">Excel Workbook (.xlsx)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Date Format
                                </label>
                                <select
                                    value={dateFormat}
                                    onChange={(e) => setDateFormat(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                                >
                                    <option value="%Y-%m-%d">YYYY-MM-DD (2026-08-31)</option>
                                    <option value="%d/%m/%Y">DD/MM/YYYY (31/08/2026)</option>
                                    <option value="%m/%d/%Y">MM/DD/YYYY (08/31/2026)</option>
                                    <option value="%d-%b-%Y">DD-MMM-YYYY (31-Aug-2026)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={handleSaveProfile}
                                disabled={isSavingProfile}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-60 shadow-sm"
                            >
                                <Save className="w-4 h-4" />
                                <span>{selectedProfileId ? 'Update Template' : 'Save Template'}</span>
                            </button>
                            {selectedProfileId && (
                                <button
                                    type="button"
                                    onClick={handleDeleteProfile}
                                    disabled={isDeletingProfile}
                                    title="Delete Selected Template"
                                    className="inline-flex items-center gap-1 px-3 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors disabled:opacity-60"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Delete</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Section 2: Journal Mode & Row Filters */}
                    <div className="space-y-3">
                        {/* Double-Entry Mode Card */}
                        <div className={`p-4 rounded-xl border transition-all ${
                            expandJournalLegs
                                ? 'bg-indigo-50/70 border-indigo-200'
                                : 'bg-slate-50/80 border-slate-200/80'
                        }`}>
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                <div className="space-y-1.5">
                                    <label className="flex items-start sm:items-center gap-2.5 cursor-pointer text-sm">
                                        <input
                                            type="checkbox"
                                            checked={expandJournalLegs}
                                            onChange={(e) => setExpandJournalLegs(e.target.checked)}
                                            className="mt-0.5 sm:mt-0 rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="font-bold text-slate-900">
                                            Expand Double-Entry GL Journal Legs (Bank + Offset + Fee Variance)
                                        </span>
                                    </label>
                                    <div className="pl-6 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                                        {expandJournalLegs ? (
                                            <>
                                                <span className="font-semibold text-slate-700">1 Bank Line →</span>
                                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">BANK LEG</span>
                                                <span>+</span>
                                                <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">OFFSET LEG</span>
                                                <span>+</span>
                                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">VARIANCE FEE LEG</span>
                                                <span className="text-slate-500">(if fee &gt; 0)</span>
                                            </>
                                        ) : (
                                            <span>1 Bank Transaction → 1 Flat Statement Row (check to generate balanced DR/CR GL entries)</span>
                                        )}
                                    </div>
                                </div>

                                {expandJournalLegs && (
                                    <div className="flex items-center gap-2 pl-6 lg:pl-0 shrink-0">
                                        <span className="text-xs font-bold text-indigo-900 whitespace-nowrap">Bank GL Account:</span>
                                        <input
                                            type="text"
                                            value={bankGlAccount}
                                            onChange={(e) => setBankGlAccount(e.target.value)}
                                            placeholder="e.g. 1010010 - Cash at Bank"
                                            className="w-56 px-3 py-1.5 border border-indigo-200 rounded-lg text-xs bg-white font-medium text-slate-800 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Scope & Governance Filter Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 inline-flex items-center gap-1 mr-1">
                                    <Filter className="w-3.5 h-3.5" />
                                    Row Filters:
                                </span>

                                <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                                    onlyClassified ? 'bg-blue-50 border-blue-200 text-blue-800 font-semibold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                                }`}>
                                    <input
                                        type="checkbox"
                                        checked={onlyClassified}
                                        onChange={(e) => setOnlyClassified(e.target.checked)}
                                        className="rounded text-blue-600"
                                    />
                                    <span>Only Classified</span>
                                </label>

                                <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                                    onlyReconciled ? 'bg-blue-50 border-blue-200 text-blue-800 font-semibold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                                }`}>
                                    <input
                                        type="checkbox"
                                        checked={onlyReconciled}
                                        onChange={(e) => setOnlyReconciled(e.target.checked)}
                                        className="rounded text-blue-600"
                                    />
                                    <span>Only Reconciled with ERP</span>
                                </label>

                                <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                                    excludeExported ? 'bg-blue-50 border-blue-200 text-blue-800 font-semibold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                                }`}>
                                    <input
                                        type="checkbox"
                                        checked={excludeExported}
                                        onChange={(e) => setExcludeExported(e.target.checked)}
                                        className="rounded text-blue-600"
                                    />
                                    <span>Exclude Already Exported</span>
                                </label>

                                <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                                    markAsExported ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                                }`}>
                                    <input
                                        type="checkbox"
                                        checked={markAsExported}
                                        onChange={(e) => setMarkAsExported(e.target.checked)}
                                        className="rounded text-amber-600"
                                    />
                                    <Lock className="w-3 h-3 text-slate-500" />
                                    <span>Lock &amp; Mark as Exported on Download</span>
                                </label>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <select
                                    value={selectedBankId}
                                    onChange={(e) => {
                                        const nextBank = e.target.value;
                                        setSelectedBankId(nextBank);
                                        if (nextBank && selectedStatementId) {
                                            const stmtObj = statements.find(s => String(s.id) === String(selectedStatementId));
                                            if (stmtObj && String(stmtObj.bank_id) !== String(nextBank)) {
                                                setSelectedStatementId('');
                                            }
                                        }
                                    }}
                                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 max-w-[180px]"
                                    aria-label="Filter by Bank"
                                >
                                    <option value="">All Banks</option>
                                    {banks.map(b => (
                                        <option key={b.id} value={b.id}>{b.short_name || b.name}</option>
                                    ))}
                                </select>

                                <select
                                    value={selectedStatementId}
                                    onChange={(e) => setSelectedStatementId(e.target.value)}
                                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 max-w-[220px]"
                                    aria-label="Filter by Statement"
                                >
                                    <option value="">All Statements</option>
                                    {filteredStatements.map(s => (
                                        <option key={s.id} value={s.id}>{s.file_name}</option>
                                    ))}
                                </select>

                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={handleResetFilters}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Clear</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Column Selection & Ordering (Overflow-safe) */}
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Export Columns &amp; Order ({columnsConfig.length} columns)
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Pick a system field on the left, customize its header title on the right, and drag or use arrows to reorder.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleResetColumns}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Reset Default</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddColumn}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add Column</span>
                                </button>
                            </div>
                        </div>

                        {columnsConfig.length === 0 ? (
                            <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500">
                                No export columns configured. Click <strong>Add Column</strong> or <strong>Reset Default</strong> to add fields.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto overflow-x-hidden pr-1">
                                {columnsConfig.map((col, idx) => {
                                    const isDragTarget = dragOverIdx === idx && dragIdx !== idx;
                                    return (
                                        <div
                                            key={`${col.source_field}-${idx}`}
                                            draggable
                                            onDragStart={() => handleDragStart(idx)}
                                            onDragOver={(e) => handleDragOver(e, idx)}
                                            onDrop={() => handleDrop(idx)}
                                            onDragEnd={handleDragEnd}
                                            className={`min-w-0 flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                                                isDragTarget
                                                    ? 'bg-cyan-50 border-cyan-400 shadow-sm'
                                                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                                            }`}
                                        >
                                            <span
                                                className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0"
                                                title="Drag to reorder"
                                            >
                                                <GripVertical className="w-4 h-4" />
                                            </span>
                                            <span className="text-[11px] font-bold text-slate-400 w-6 text-center shrink-0">
                                                #{idx + 1}
                                            </span>
                                            <select
                                                value={col.source_field}
                                                onChange={(e) => handleColumnChange(idx, 'source_field', e.target.value)}
                                                className="min-w-0 flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 truncate focus:border-cyan-500 outline-none"
                                            >
                                                {groupedFields.length > 0 ? (
                                                    groupedFields.map(([groupName, fields]) => (
                                                        <optgroup key={groupName} label={groupName}>
                                                            {fields.map(f => (
                                                                <option key={f.source_field} value={f.source_field}>
                                                                    {f.default_header} ({f.source_field})
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    ))
                                                ) : (
                                                    <option value={col.source_field}>{col.source_field}</option>
                                                )}
                                            </select>
                                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
                                            <input
                                                type="text"
                                                value={col.custom_header}
                                                onChange={(e) => handleColumnChange(idx, 'custom_header', e.target.value)}
                                                placeholder="Custom Header"
                                                className="w-28 sm:w-36 shrink-0 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-semibold text-slate-900 focus:border-cyan-500 outline-none"
                                            />
                                            <div className="flex items-center gap-0.5 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handleMoveColumn(idx, -1)}
                                                    disabled={idx === 0}
                                                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                                    title="Move Earlier"
                                                >
                                                    <ArrowUp className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleMoveColumn(idx, 1)}
                                                    disabled={idx === columnsConfig.length - 1}
                                                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                                    title="Move Later"
                                                >
                                                    <ArrowDown className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveColumn(idx)}
                                                    className="p-1 text-rose-400 hover:text-rose-600"
                                                    title="Remove Column"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ==================== 4. LIVE EXPORT LAYOUT PREVIEW ==================== */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            <Eye className="w-4 h-4 text-cyan-600" />
                            <span>Live Export Layout Preview (First 50 Rows)</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Verify column order, custom headers, and formatting before downloading. Preview updates automatically.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                            {columnsConfig.length} Columns
                        </span>
                        <span className={`px-2.5 py-1 rounded-full ${
                            expandJournalLegs ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-50 text-blue-700'
                        }`}>
                            {expandJournalLegs ? 'Double-Entry GL Legs' : '1:1 Flat Rows'}
                        </span>
                        {summary.total_transactions === 0 && (
                            <button
                                type="button"
                                onClick={() => setShowSampleRows(prev => !prev)}
                                className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                            >
                                {showSampleRows ? 'Hide Sample Illustration' : 'Show Sample Illustration'}
                            </button>
                        )}
                    </div>
                </div>

                {isShowingSample && (
                    <div className="px-5 sm:px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
                        <span className="font-medium">
                            <strong>Sample Illustration</strong> — Displaying 2 fictional bank lines ({displayedRows.length} output rows) to demonstrate your active column order, date format, and {expandJournalLegs ? 'Double-Entry GL Leg expansion' : 'flat row layout'}.
                        </span>
                        <span className="text-[11px] font-semibold text-amber-700">
                            Not included in downloaded files
                        </span>
                    </div>
                )}

                <div className="overflow-x-auto">
                    {isLoadingPreview ? (
                        <div className="p-10 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-cyan-600" />
                            <span>Refreshing export preview...</span>
                        </div>
                    ) : displayedRows.length === 0 ? (
                        <div className="p-10 text-center space-y-2">
                            <p className="text-sm font-medium text-slate-500">
                                {summary.total_transactions === 0
                                    ? 'No bank statement transactions found yet.'
                                    : 'No transactions match the current export filter criteria.'}
                            </p>
                            {hasActiveFilters && summary.total_transactions > 0 && (
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Reset Filters</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                            <thead className="bg-slate-50">
                                <tr>
                                    {displayedHeaders.map((h, i) => {
                                        const isAmt = AMOUNT_SOURCE_FIELDS.has(headerToSourceField[h] || '');
                                        return (
                                            <th
                                                key={`${h}-${i}`}
                                                className={`px-4 py-3 font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap ${
                                                    isAmt ? 'text-right' : 'text-left'
                                                }`}
                                            >
                                                {h}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody className={`bg-white divide-y divide-slate-100 ${isShowingSample ? 'opacity-90' : ''}`}>
                                {displayedRows.map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                                        {displayedHeaders.map((h, cIdx) => (
                                            <td key={`${rIdx}-${cIdx}`} className="px-4 py-2.5 text-slate-700 min-w-[110px]">
                                                {renderCellContent(h, row[h])}
                                            </td>
                                        ))}
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
