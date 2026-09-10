import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Search, Filter, CheckCircle2,
    RefreshCw, Link as LinkIcon, Unlink, Info,
    ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Plus, ArrowRight,
    Settings2, Columns, FileText,
    Zap, Sparkles, Copy, Check, Eye, X, AlertTriangle,
    Upload, Download, Layers, Edit3, RotateCcw, ArrowRightLeft
} from 'lucide-react';
import { apiRequest } from '../../../services/apiService';

// Standard number formatter with thousand-separator commas
const formatMoney = (val, decimals = 2) => {
    if (val === null || val === undefined || val === '') return '-';
    const num = Number(val);
    if (isNaN(num)) return val.toString();
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
};

const ReconciliationWorkspace = () => {
    const { statementId } = useParams();
    const navigate = useNavigate();

    // Data State
    const [bankTransactions, setBankTransactions] = useState([]);
    const [erpRecords, setErpRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [banks, setBanks] = useState([]);

    // View & Layout State (Auto-saved to localStorage)
    const [viewMode, setViewModeState] = useState(() => localStorage.getItem('recon_viewMode') || 'statement');
    const [density, setDensityState] = useState(() => localStorage.getItem('recon_density') || 'compact');
    const [wrapText, setWrapTextState] = useState(() => localStorage.getItem('recon_wrapText') === 'true');
    const [showFilters, setShowFilters] = useState(true);
    const [showViewSettings, setShowViewSettings] = useState(false);
    const [expandedRowId, setExpandedRowId] = useState(null); // inline expanded row
    const [quickFilter, setQuickFilter] = useState('all');   // 'all' | 'sweeps' | 'unmatched' | 'reconciled'

    const setViewMode = (val) => {
        localStorage.setItem('recon_viewMode', val);
        setViewModeState(val);
    };

    const setDensity = (val) => {
        localStorage.setItem('recon_density', val);
        setDensityState(val);
    };

    const setWrapText = (valOrFn) => {
        setWrapTextState(prev => {
            const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
            localStorage.setItem('recon_wrapText', String(next));
            return next;
        });
    };

    // Pagination State
    const [pageSize, setPageSize] = useState(100);
    const [currentPage, setCurrentPage] = useState(1);

    // Filter State
    const [filters, setFilters] = useState({
        bank_id: '',
        start_date: '',
        end_date: '',
        search: '',
        is_reconciled: '',
        is_classified: ''
    });

    // Selection State
    const [selectedBankTxns, setSelectedBankTxns] = useState([]);
    const [selectedErpRecords, setSelectedErpRecords] = useState([]);

    // Action / Progress / Modal State
    const [isAutoMatching, setIsAutoMatching] = useState(false);
    const [isClassifying, setIsClassifying] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);
    const [matchSummary, setMatchSummary] = useState(null);
    const [viewingTxn, setViewingTxn] = useState(null);
    const [verifyingPair, setVerifyingPair] = useState(null); // { txnA, txnB } for side-by-side sweep comparison
    const [copiedField, setCopiedField] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'booking_date', direction: 'asc' });

    // Cleared Matches & Workbench Pane Filter State
    const [reconciliationMatches, setReconciliationMatches] = useState([]);
    const [bankPaneSearch, setBankPaneSearch] = useState('');
    const [bankPaneDirection, setBankPaneDirection] = useState('ALL'); // 'ALL' | 'DEBIT' | 'CREDIT'
    const [erpPaneSearch, setErpPaneSearch] = useState('');
    const [erpPaneType, setErpPaneType] = useState('ALL'); // 'ALL' | 'AR' | 'AP' | 'LG'
    const [clearedSearch, setClearedSearch] = useState('');

    // Taxonomy & Inline Classify State
    const [taxonomy, setTaxonomy] = useState([]);
    const [showClassifyModal, setShowClassifyModal] = useState(false);
    const [selectedTxnForClassify, setSelectedTxnForClassify] = useState(null);
    const [classifyForm, setClassifyForm] = useState({
        category: '',
        sub_category: '',
        gl_account: '',
        remember_for_counterparty: true,
        counterparty_name: '',
        isCreatingNewSubclass: false,
        newSubclassName: '',
        newSubclassCode: ''
    });

    // Bulk Operations State
    const [showBulkClassifyModal, setShowBulkClassifyModal] = useState(false);
    const [isBulkOperating, setIsBulkOperating] = useState(false);
    const [bulkClassifyForm, setBulkClassifyForm] = useState({
        category: '',
        sub_category: '',
        gl_account: '',
        remember_for_counterparty: false,
        counterparty_name: '',
        isCreatingNewSubclass: false,
        newSubclassName: '',
        newSubclassCode: ''
    });

    // Inward ERP Ledger Import State
    const [showERPImportModal, setShowERPImportModal] = useState(false);
    const [erpImportTab, setErpImportTab] = useState('upload'); // 'upload' or 'manual'
    const [erpFile, setErpFile] = useState(null);
    const [isUploadingERP, setIsUploadingERP] = useState(false);
    const [erpImportStatus, setErpImportStatus] = useState(null);
    const [manualERPRecord, setManualERPRecord] = useState({
        record_type: 'AR_INVOICE',
        reference_number: '',
        entity_name: '',
        amount: '',
        record_date: new Date().toISOString().split('T')[0],
        gl_account: ''
    });

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                await fetchBanks();
                await fetchTaxonomy();
                if (statementId && statementId !== 'all') {
                    await fetchStatementDetails(statementId);
                } else {
                    fetchData();
                }
            } catch (err) {
                console.error("Init failed", err);
                setIsLoading(false);
            }
        };
        init();
    }, [statementId]);

    // Re-fetch when filters change
    useEffect(() => {
        fetchData();
        setCurrentPage(1);
    }, [filters.bank_id, filters.start_date, filters.end_date, filters.is_reconciled, filters.is_classified, filters.search]);

    const fetchBanks = async () => {
        try {
            const data = await apiRequest('/corporate-admin/banks', 'GET');
            setBanks(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch banks", err);
        }
    };

    const fetchStatementDetails = async (id) => {
        try {
            const stmt = await apiRequest(`/reconciliation/statements`, 'GET');
            if (Array.isArray(stmt)) {
                const target = stmt.find(s => s.id === parseInt(id));
                if (target) {
                    setFilters(prev => ({
                        ...prev,
                        bank_id: target.bank_id,
                        start_date: (target.statement_start_date || '').split('T')[0],
                        end_date: (target.statement_end_date || '').split('T')[0]
                    }));
                } else {
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        } catch (err) {
            console.error("Failed to set statement context", err);
            setIsLoading(false);
        }
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.bank_id) params.append('bank_id', filters.bank_id);
            if (filters.start_date) params.append('start_date', filters.start_date);
            if (filters.end_date) params.append('end_date', filters.end_date);
            if (filters.is_reconciled !== '') params.append('is_reconciled', filters.is_reconciled);
            if (filters.is_classified !== '') params.append('is_classified', filters.is_classified);
            if (filters.search) params.append('search', filters.search);
            params.append('limit', '2000');

            const [bankData, erpData, matchesData] = await Promise.all([
                apiRequest(`/reconciliation/transactions?${params.toString()}`, 'GET'),
                apiRequest('/reconciliation/erp-records?limit=500', 'GET').catch(() => []),
                apiRequest('/reconciliation/matches?limit=500', 'GET').catch(() => [])
            ]);
            setBankTransactions(Array.isArray(bankData) ? bankData : []);
            setErpRecords(Array.isArray(erpData) ? erpData : []);
            setReconciliationMatches(Array.isArray(matchesData) ? matchesData : []);
        } catch (err) {
            console.error("Failed to fetch reconciliation data", err);
            setBankTransactions([]);
            setReconciliationMatches([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchERPRecords = async () => {
        try {
            const data = await apiRequest('/reconciliation/erp-records?limit=500', 'GET');
            setErpRecords(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch ERP records", err);
        }
    };

    const fetchTaxonomy = async () => {
        try {
            const data = await apiRequest('/reconciliation/taxonomy', 'GET');
            setTaxonomy(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch taxonomy", err);
        }
    };

    const openClassifyModal = (txn) => {
        setSelectedTxnForClassify(txn);
        const guessedParty = txn.beneficiary_name || txn.company_name || '';
        const defaultClass = taxonomy[0]?.name || 'Operating Expenses (OPEX)';
        const defaultSub = taxonomy[0]?.subclasses?.[0]?.name || '';
        const defaultGL = taxonomy[0]?.subclasses?.[0]?.default_gl_account || '';
        setClassifyForm({
            category: txn.classification_category || defaultClass,
            sub_category: txn.sub_category || defaultSub,
            gl_account: txn.internal_category || defaultGL,
            remember_for_counterparty: true,
            counterparty_name: guessedParty,
            isCreatingNewSubclass: false,
            newSubclassName: '',
            newSubclassCode: ''
        });
        setShowClassifyModal(true);
    };

    const handleApplyInlineClassify = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!selectedTxnForClassify) return;

        let finalCategory = classifyForm.category;
        let finalSubCategory = classifyForm.sub_category;
        let finalGL = classifyForm.gl_account;

        if (classifyForm.isCreatingNewSubclass && classifyForm.newSubclassName.trim()) {
            try {
                const parentCls = taxonomy.find(c => c.name === classifyForm.category);
                const newCode = classifyForm.newSubclassCode.trim() || classifyForm.newSubclassName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
                await apiRequest('/reconciliation/taxonomy', 'POST', {
                    parent_id: parentCls ? parentCls.id : null,
                    name: classifyForm.newSubclassName.trim(),
                    code: newCode,
                    direction: selectedTxnForClassify.is_positive ? 'CREDIT' : 'DEBIT',
                    default_gl_account: classifyForm.gl_account,
                    is_active: true
                });
                finalSubCategory = classifyForm.newSubclassName.trim();
                fetchTaxonomy();
            } catch (err) {
                console.error("Failed to create on-the-fly subclass", err);
            }
        }

        try {
            await apiRequest(`/reconciliation/transactions/${selectedTxnForClassify.id}/classify`, 'POST', {
                category: finalCategory,
                sub_category: finalSubCategory,
                gl_account: finalGL,
                remember_for_counterparty: classifyForm.remember_for_counterparty,
                counterparty_name: classifyForm.counterparty_name || null
            });

            setShowClassifyModal(false);
            setSelectedTxnForClassify(null);
            fetchData();
        } catch (err) {
            console.error("Classification failed", err);
            alert("Failed to classify transaction.");
        }
    };

    // ── Bulk Operations Handlers ──────────────────────────────────────────────
    const handleSelectAllFiltered = () => {
        setSelectedBankTxns(sortedTransactions.map(t => t.id));
    };

    const handleClearSelection = () => {
        setSelectedBankTxns([]);
    };

    const openBulkClassifyModal = () => {
        if (selectedBankTxns.length === 0) return;
        const defaultCategory = taxonomy[0]?.name || 'Operating Expenses (OPEX)';
        const defaultSub = taxonomy[0]?.subclasses?.[0]?.name || '';
        const defaultGL = taxonomy[0]?.subclasses?.[0]?.default_gl_account || '';
        
        // If all selected transactions share the same counterparty, pre-fill it!
        const selectedTxnObjects = bankTransactions.filter(t => selectedBankTxns.includes(t.id));
        const counterparties = Array.from(new Set(selectedTxnObjects.map(t => t.counterparty_name).filter(Boolean)));
        const commonCounterparty = counterparties.length === 1 ? counterparties[0] : '';

        setBulkClassifyForm({
            category: defaultCategory,
            sub_category: defaultSub,
            gl_account: defaultGL,
            remember_for_counterparty: Boolean(commonCounterparty),
            counterparty_name: commonCounterparty,
            isCreatingNewSubclass: false,
            newSubclassName: '',
            newSubclassCode: ''
        });
        setShowBulkClassifyModal(true);
    };

    const handleApplyBulkClassify = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (selectedBankTxns.length === 0) return;

        let finalCategory = bulkClassifyForm.category;
        let finalSubCategory = bulkClassifyForm.sub_category;
        let finalGL = bulkClassifyForm.gl_account;

        setIsBulkOperating(true);
        try {
            // Check if user is creating a new subclass inline
            if (bulkClassifyForm.isCreatingNewSubclass && bulkClassifyForm.newSubclassName.trim()) {
                const parentNode = taxonomy.find(c => c.name === bulkClassifyForm.category);
                if (parentNode) {
                    try {
                        await apiRequest('/reconciliation/taxonomy', 'POST', {
                            name: bulkClassifyForm.newSubclassName.trim(),
                            code: bulkClassifyForm.newSubclassCode.trim() || `SUB_${Date.now()}`,
                            parent_id: parentNode.id,
                            direction: parentNode.direction || 'EITHER',
                            default_gl_account: finalGL || null
                        });
                        finalSubCategory = bulkClassifyForm.newSubclassName.trim();
                        fetchTaxonomy();
                    } catch (err) {
                        console.error("Failed to create subclass", err);
                    }
                }
            }

            const res = await apiRequest('/reconciliation/transactions/bulk-classify', 'POST', {
                transaction_ids: selectedBankTxns,
                category: finalCategory,
                sub_category: finalSubCategory || null,
                gl_account: finalGL || null,
                remember_for_counterparty: bulkClassifyForm.remember_for_counterparty,
                counterparty_name: bulkClassifyForm.counterparty_name || null
            });

            setShowBulkClassifyModal(false);
            setSelectedBankTxns([]);
            setMatchSummary(res.message || `Successfully classified ${res.affected_count} transactions.`);
            fetchData();
        } catch (err) {
            console.error("Bulk classify failed", err);
            alert("Failed to apply bulk classification.");
        } finally {
            setIsBulkOperating(false);
        }
    };

    const handleBulkClearClassification = async () => {
        if (selectedBankTxns.length === 0) return;
        if (!window.confirm(`Are you sure you want to reset the classification for all ${selectedBankTxns.length} selected transactions?`)) {
            return;
        }

        setIsBulkOperating(true);
        try {
            const res = await apiRequest('/reconciliation/transactions/bulk-clear-classification', 'POST', {
                transaction_ids: selectedBankTxns
            });
            setSelectedBankTxns([]);
            setMatchSummary(res.message || `Reset classification for ${res.affected_count} transactions.`);
            fetchData();
        } catch (err) {
            console.error("Bulk clear failed", err);
            alert("Failed to reset classification.");
        } finally {
            setIsBulkOperating(false);
        }
    };

    const handleBulkConfirmSuggestions = async () => {
        if (selectedBankTxns.length === 0) return;
        
        // Find selected transactions that have suggested_category or counterparty_name
        const candidates = bankTransactions.filter(t => 
            selectedBankTxns.includes(t.id) && (t.suggested_category || t.counterparty_name)
        );

        if (candidates.length === 0) {
            alert("None of the selected transactions have a pending concept suggestion to confirm. Use 'Bulk Classify' to assign a category.");
            return;
        }

        setIsBulkOperating(true);
        let successCount = 0;
        try {
            // Group by suggested category for fast bulk updates
            const categoryGroups = {};
            for (const c of candidates) {
                const cat = c.suggested_category || c.classification_category || 'General';
                if (!categoryGroups[cat]) categoryGroups[cat] = [];
                categoryGroups[cat].push(c.id);
            }

            for (const [cat, ids] of Object.entries(categoryGroups)) {
                await apiRequest('/reconciliation/transactions/bulk-classify', 'POST', {
                    transaction_ids: ids,
                    category: cat,
                    remember_for_counterparty: true
                });
                successCount += ids.length;
            }

            setSelectedBankTxns([]);
            setMatchSummary(`Confirmed and reinforced ${successCount} transaction suggestions!`);
            fetchData();
        } catch (err) {
            console.error("Bulk confirm failed", err);
            alert("Failed to confirm suggestions.");
        } finally {
            setIsBulkOperating(false);
        }
    };


    const handleUploadERPFile = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!erpFile) {
            alert("Please select an Excel (.xlsx, .xls) or CSV file");
            return;
        }

        setIsUploadingERP(true);
        setErpImportStatus(null);
        try {
            const formData = new FormData();
            formData.append('file', erpFile);
            const res = await apiRequest('/reconciliation/erp-records/upload', 'POST', formData);
            setErpImportStatus({
                success: true,
                message: res.status || `Successfully imported ${res.imported_count} ERP records!`
            });
            setErpFile(null);
            fetchERPRecords();
        } catch (err) {
            console.error("ERP upload failed", err);
            setErpImportStatus({
                success: false,
                message: err.message || "Failed to parse and ingest ERP file."
            });
        } finally {
            setIsUploadingERP(false);
        }
    };

    const handleAddManualERPRecord = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!manualERPRecord.reference_number.trim() || !manualERPRecord.amount) {
            alert("Reference number and amount are required");
            return;
        }

        try {
            const amt = Math.abs(parseFloat(manualERPRecord.amount));
            const signedAmt = manualERPRecord.record_type === 'AP_BILL' ? -amt : amt;
            await apiRequest('/reconciliation/erp-records/ingest', 'POST', [{
                record_type: manualERPRecord.record_type,
                reference_number: manualERPRecord.reference_number.trim(),
                entity_name: manualERPRecord.entity_name.trim() || 'General Entity',
                amount: signedAmt,
                currency: 'EGP',
                record_date: manualERPRecord.record_date,
                gl_account: manualERPRecord.gl_account || null
            }]);

            setManualERPRecord({
                record_type: 'AR_INVOICE',
                reference_number: '',
                entity_name: '',
                amount: '',
                record_date: new Date().toISOString().split('T')[0],
                gl_account: ''
            });
            setErpImportStatus({
                success: true,
                message: "ERP record added successfully!"
            });
            fetchERPRecords();
        } catch (err) {
            console.error("Failed to add manual ERP record", err);
            alert("Failed to add record.");
        }
    };

    const downloadERPTemplate = () => {
        const csvContent = "Date,Reference,Entity,Amount,Type,GL Account\n2026-02-01,INV-2026-001,ORANGE DATA TELECOM,92400.00,AR_INVOICE,1020100 - Trade Receivables\n2026-02-02,INV-2026-002,VODAFONE EGYPT,48600.00,AR_INVOICE,1020100 - Trade Receivables\n2026-02-03,BILL-2026-010,SCHNEIDER ELECTRIC,-145000.00,AP_BILL,2010100 - Trade Payables\n2026-02-04,BILL-2026-020,BAKER HUGHES EG,-82500.00,AP_BILL,2010100 - Trade Payables\n2026-02-05,LG-COM-2026-01,COMMERCIAL INTL BANK,-4500.00,LG_COMMISSION,6020300 - LG Commissions\n";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "erp_ledger_import_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleAutoMatch = async () => {
        setIsAutoMatching(true);
        setMatchSummary(null);
        try {
            const endpoint = statementId
                ? `/reconciliation/statements/${statementId}/auto-match`
                : `/reconciliation/auto-match`;
            const result = await apiRequest(endpoint, 'POST');
            setMatchSummary(result.status);
            fetchData();
        } catch (err) {
            console.error("Auto-match failed", err);
        } finally {
            setIsAutoMatching(false);
        }
    };

    const handleRunSmartIntelligence = async () => {
        setIsClassifying(true);
        setMatchSummary(null);
        try {
            const endpoint = statementId
                ? `/reconciliation/statements/${statementId}/classify`
                : `/reconciliation/classify`;
            const result = await apiRequest(endpoint, 'POST');
            setMatchSummary(result.status || "Smart Intelligence completed.");
            fetchData();
        } catch (err) {
            console.error("Classification failed", err);
        } finally {
            setIsClassifying(false);
        }
    };

    const handleDetectRelationships = async () => {
        setIsDetecting(true);
        setMatchSummary(null);
        try {
            const result = await apiRequest('/reconciliation/detect-relationships', 'POST');
            setMatchSummary(result.status || "Sweep and relationship detection completed.");
            fetchData();
        } catch (err) {
            console.error("Link detection failed", err);
        } finally {
            setIsDetecting(false);
        }
    };

    const handleUnlink = async (transactionId) => {
        try {
            await apiRequest(`/reconciliation/transactions/${transactionId}/unlink`, 'POST');
            setVerifyingPair(null);
            setViewingTxn(null);
            setMatchSummary("Transaction pair successfully unlinked.");
            fetchData();
        } catch (err) {
            console.error("Unlink failed", err);
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Filter transactions by quick filter chips
    const filteredTransactions = useMemo(() => {
        if (quickFilter === 'sweeps') {
            return bankTransactions.filter(t => t.internal_category === 'INTER_BANK_SWEEP' || t.linked_txn_id != null);
        }
        if (quickFilter === 'unmatched') {
            return bankTransactions.filter(t => !t.is_reconciled);
        }
        if (quickFilter === 'reconciled') {
            return bankTransactions.filter(t => t.is_reconciled);
        }
        return bankTransactions;
    }, [bankTransactions, quickFilter]);

    const sortedTransactions = useMemo(() => {
        return [...filteredTransactions].sort((a, b) => {
            const key = sortConfig.key;
            const dir = sortConfig.direction === 'asc' ? 1 : -1;

            if (key === 'amount' || key === 'debit_amount' || key === 'credit_amount' || key === 'net_amount') {
                const aCr = parseFloat(a.credit_amount) || 0;
                const aDr = parseFloat(a.debit_amount) || 0;
                const aNet = aCr > 0 ? aCr : -aDr;

                const bCr = parseFloat(b.credit_amount) || 0;
                const bDr = parseFloat(b.debit_amount) || 0;
                const bNet = bCr > 0 ? bCr : -bDr;

                return (aNet - bNet) * dir;
            }

            if (key === 'booking_date') {
                const aDate = new Date(a.booking_date).getTime() || 0;
                const bDate = new Date(b.booking_date).getTime() || 0;
                return (aDate - bDate) * dir;
            }

            if (key === 'running_balance') {
                const aBal = parseFloat(a.running_balance) || 0;
                const bBal = parseFloat(b.running_balance) || 0;
                return (aBal - bBal) * dir;
            }

            let aValue = (a[key] || '').toString().toLowerCase();
            let bValue = (b[key] || '').toString().toLowerCase();

            if (aValue < bValue) return -1 * dir;
            if (aValue > bValue) return 1 * dir;
            return 0;
        });
    }, [filteredTransactions, sortConfig]);

    const paginatedTransactions = useMemo(() => {
        if (pageSize === 0) return sortedTransactions;
        const start = (currentPage - 1) * pageSize;
        return sortedTransactions.slice(start, start + pageSize);
    }, [sortedTransactions, currentPage, pageSize]);

    const totalPages = pageSize === 0 ? 1 : Math.ceil(sortedTransactions.length / pageSize);

    const handleMatch = async () => {
        if (selectedBankTxns.length === 0 || selectedErpRecords.length === 0) return;
        try {
            await apiRequest('/reconciliation/match', 'POST', {
                bank_transaction_ids: selectedBankTxns,
                erp_record_ids: selectedErpRecords,
                type: 'MANUAL'
            });
            setSelectedBankTxns([]);
            setSelectedErpRecords([]);
            fetchData();
        } catch (err) {
            console.error("Match failed", err);
        }
    };

    const handleUnmatchRecord = async (matchId) => {
        if (!window.confirm("Unmatch this reconciled pair? Both transactions will return to open status.")) return;
        try {
            await apiRequest('/reconciliation/unmatch', 'POST', {
                match_id: matchId
            });
            setMatchSummary("Record successfully unmatched.");
            fetchData();
        } catch (err) {
            console.error("Unmatch failed", err);
            alert("Failed to unmatch record.");
        }
    };

    const handleConfirmClassification = async (txn) => {
        try {
            const formData = new FormData();
            if (txn.counterparty_name) formData.append('counterparty_name', txn.counterparty_name);
            if (txn.suggested_category || txn.classification_category) {
                formData.append('category', txn.suggested_category || txn.classification_category);
            }
            if (txn.internal_category) formData.append('gl_account', txn.internal_category);

            await apiRequest(`/reconciliation/transactions/${txn.id}/confirm`, 'POST', formData, true);
            fetchData();
        } catch (err) {
            console.error("Confirm failed", err);
        }
    };

    const openPairVerification = (txn) => {
        if (!txn.linked_txn_id) {
            setViewingTxn(txn);
            return;
        }
        const counterpart = bankTransactions.find(t => t.id === txn.linked_txn_id);
        if (counterpart) {
            // Put Debit (outflow) on left and Credit (inflow) on right
            const isDebitA = (parseFloat(txn.debit_amount) || 0) > 0;
            const txnA = isDebitA ? txn : counterpart;
            const txnB = isDebitA ? counterpart : txn;
            setVerifyingPair({ txnA, txnB });
        } else {
            setViewingTxn(txn);
        }
    };

    const copyToClipboard = (text, fieldName) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 1500);
    };

    const unmatchedCount = bankTransactions.filter(t => !t.is_reconciled).length;
    const pairedSweepsCount = bankTransactions.filter(t => t.internal_category === 'INTER_BANK_SWEEP' || t.linked_txn_id != null).length;
    const isCompact = density === 'compact';
    const hasActiveFilters = Boolean(
        filters.bank_id || filters.start_date || filters.end_date ||
        filters.search || filters.is_reconciled || filters.is_classified ||
        quickFilter !== 'all'
    );

    return (
        <div className="h-[calc(100vh-85px)] flex flex-col space-y-2 overflow-hidden bg-gray-50/40 p-2">
            {/* ── Top Slim Header & Command Bar ── */}
            <div className="bg-white px-3.5 py-2 rounded-xl border border-gray-200/80 shadow-xs flex items-center justify-between gap-3 shrink-0">
                {/* Left: Navigation & Ledger Context */}
                <div className="flex items-center space-x-2.5 shrink-0">
                    <Link
                        to="/corporate-admin/reconciliation"
                        className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Back to Statement Dashboard"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div className="flex items-center space-x-2">
                        <h2 className="text-sm font-bold text-gray-900 flex items-center leading-none">
                            {statementId && statementId !== 'all' ? `Statement #${statementId}` : 'Master Ledger'}
                        </h2>
                        {unmatchedCount > 0 ? (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/70 rounded-full text-[11px] font-bold">
                                {unmatchedCount} Unmatched
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/70 rounded-full text-[11px] font-bold">
                                All Reconciled
                            </span>
                        )}
                        <span className="text-[11px] text-gray-400 font-medium hidden md:inline">
                            • {bankTransactions.length} lines
                        </span>
                    </div>
                </div>

                {/* Center: Segmented View Mode Toggle (Statement vs Split) */}
                <div className="hidden sm:flex items-center bg-gray-100/90 p-0.5 rounded-lg border border-gray-200/60 shadow-inner text-xs font-semibold">
                    <button
                        onClick={() => setViewMode('statement')}
                        className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all ${
                            viewMode === 'statement'
                                ? 'bg-white text-gray-900 shadow-xs font-bold'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                        title="Full Statement View (100% table width)"
                    >
                        <FileText className="w-3.5 h-3.5 text-gray-600" />
                        <span>Full Statement</span>
                    </button>
                    <button
                        onClick={() => setViewMode('split')}
                        className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all ${
                            viewMode === 'split'
                                ? 'bg-white text-blue-700 shadow-xs font-bold'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                        title="Side-by-side Dual Pane with ERP Ledger"
                    >
                        <Columns className="w-3.5 h-3.5 text-blue-600" />
                        <span>Split Match</span>
                        {erpRecords.length > 0 && (
                            <span className="ml-0.5 px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold">
                                {erpRecords.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Right: Consolidated View Settings & Actions */}
                <div className="flex items-center space-x-2 shrink-0">
                    {/* View Options Popover (Saves settings to localStorage & removes clutter) */}
                    <div className="relative">
                        <button
                            onClick={() => setShowViewSettings(v => !v)}
                            className={`px-2.5 py-1.5 border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                showViewSettings
                                    ? 'bg-gray-100 text-gray-900 border-gray-300'
                                    : 'bg-white border-gray-200/80 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                            title="Display Preferences (Row Density & Narrative Wrapping)"
                        >
                            <Settings2 className="w-3.5 h-3.5 text-gray-500" />
                            <span className="hidden xl:inline text-[11px]">View</span>
                        </button>

                        {showViewSettings && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowViewSettings(false)}
                                />
                                <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-gray-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                                    <div className="flex items-center justify-between pb-2 border-b border-gray-100 text-xs font-bold text-gray-800">
                                        <span>View Preferences</span>
                                        <button
                                            onClick={() => setShowViewSettings(false)}
                                            className="text-gray-400 hover:text-gray-600 p-0.5 rounded"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Density */}
                                    <div className="py-2.5 border-b border-gray-100">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                                            Row Spacing
                                        </span>
                                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                                            <button
                                                onClick={() => setDensity('compact')}
                                                className={`px-2 py-1.5 rounded-lg border text-center font-medium transition-all ${
                                                    isCompact
                                                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                                }`}
                                            >
                                                Compact (32px)
                                            </button>
                                            <button
                                                onClick={() => setDensity('normal')}
                                                className={`px-2 py-1.5 rounded-lg border text-center font-medium transition-all ${
                                                    !isCompact
                                                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                                }`}
                                            >
                                                Normal (44px)
                                            </button>
                                        </div>
                                    </div>

                                    {/* Text Wrap */}
                                    <div className="pt-2.5">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                                            Narrative Text
                                        </span>
                                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                                            <button
                                                onClick={() => setWrapText(false)}
                                                className={`px-2 py-1.5 rounded-lg border text-center font-medium transition-all ${
                                                    !wrapText
                                                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                                }`}
                                            >
                                                Single Line
                                            </button>
                                            <button
                                                onClick={() => setWrapText(true)}
                                                className={`px-2 py-1.5 rounded-lg border text-center font-medium transition-all ${
                                                    wrapText
                                                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                                }`}
                                            >
                                                Wrap Text
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(f => !f)}
                        className={`p-1.5 border rounded-lg transition-colors ${
                            showFilters
                                ? 'bg-gray-100 text-blue-700 border-gray-300'
                                : 'bg-white border-gray-200/80 text-gray-600 hover:bg-gray-50'
                        }`}
                        title="Toggle Filter Toolbar"
                    >
                        <Filter className="w-3.5 h-3.5" />
                    </button>

                    <div className="h-4 w-px bg-gray-200 hidden sm:block" />

                    {/* Sweeps Detection */}
                    <button
                        onClick={handleDetectRelationships}
                        disabled={isDetecting || isLoading}
                        className="px-2.5 py-1.5 bg-white border border-indigo-200/80 text-indigo-700 hover:bg-indigo-50 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-2xs"
                        title="Auto-detect sweeps and opposite cross-account transfers"
                    >
                        <LinkIcon className={`w-3.5 h-3.5 ${isDetecting ? 'animate-spin' : ''}`} />
                        <span className="hidden lg:inline">{isDetecting ? 'Detecting...' : 'Sweeps'}</span>
                        {pairedSweepsCount > 0 && (
                            <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-extrabold">
                                {pairedSweepsCount}
                            </span>
                        )}
                    </button>

                    {/* Hero Primary Action: Run Rules & AI */}
                    <button
                        onClick={handleRunSmartIntelligence}
                        disabled={isClassifying || isLoading}
                        className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
                        title="Run Universal Classifiers, Custom Rules, Counterparty Concepts, and Collaborative Learning"
                    >
                        <Zap className={`w-3.5 h-3.5 ${isClassifying ? 'animate-spin text-amber-300' : 'text-amber-300'}`} />
                        <span>{isClassifying ? 'Classifying...' : 'Run Rules & AI'}</span>
                    </button>

                    {/* Dual Match Confirm (Split mode only) */}
                    {viewMode === 'split' && (
                        <button
                            onClick={handleMatch}
                            disabled={selectedBankTxns.length === 0 || selectedErpRecords.length === 0}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:bg-gray-300 shadow-xs flex items-center gap-1.5"
                            title="Confirm reconciliation match between selected bank lines and ERP records"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirm Match</span>
                            {(selectedBankTxns.length > 0 || selectedErpRecords.length > 0) && (
                                <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                                    {selectedBankTxns.length}:{selectedErpRecords.length}
                                </span>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* ── Single-Row Slim Filter & Search Bar (Zero Wrapping) ── */}
            {showFilters && (
                <div className="bg-white px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-2xs flex items-center justify-between gap-2.5 text-xs shrink-0 animate-in fade-in duration-150">
                    {/* Left: Quick Filter Pills */}
                    <div className="flex items-center space-x-1 shrink-0">
                        <button
                            onClick={() => { setQuickFilter('all'); setCurrentPage(1); }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                quickFilter === 'all'
                                    ? 'bg-gray-900 text-white shadow-xs'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            All ({bankTransactions.length})
                        </button>
                        <button
                            onClick={() => { setQuickFilter('unmatched'); setCurrentPage(1); }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                                quickFilter === 'unmatched'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
                            }`}
                        >
                            <span>Unmatched</span>
                            <span className={`px-1 rounded text-[10px] ${quickFilter === 'unmatched' ? 'bg-amber-700 text-white' : 'bg-amber-200/70 text-amber-900'}`}>
                                {unmatchedCount}
                            </span>
                        </button>
                        <button
                            onClick={() => { setQuickFilter('sweeps'); setCurrentPage(1); }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                                quickFilter === 'sweeps'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
                            }`}
                            title="Filter to paired cross-account sweeps"
                        >
                            <LinkIcon className="w-2.5 h-2.5" />
                            <span>Sweeps</span>
                            <span className={`px-1 rounded text-[10px] ${quickFilter === 'sweeps' ? 'bg-indigo-700 text-white' : 'bg-indigo-200/70 text-indigo-900'}`}>
                                {pairedSweepsCount}
                            </span>
                        </button>
                    </div>

                    <div className="h-4 w-px bg-gray-200 shrink-0 hidden md:block" />

                    {/* Middle: Inline Dropdowns & Date Range */}
                    <div className="flex items-center space-x-2 shrink-0">
                        {/* Bank Filter */}
                        <select
                            className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 font-medium focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors max-w-[140px] truncate"
                            value={filters.bank_id}
                            onChange={(e) => setFilters({ ...filters, bank_id: e.target.value })}
                        >
                            <option value="">All Banks</option>
                            {banks.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>

                        {/* Status Filter */}
                        <select
                            className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 font-medium focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
                            value={filters.is_reconciled}
                            onChange={(e) => setFilters({ ...filters, is_reconciled: e.target.value })}
                        >
                            <option value="">All Statuses</option>
                            <option value="false">Unmatched Only</option>
                            <option value="true">Reconciled</option>
                        </select>

                        {/* Date Inputs */}
                        <div className="hidden lg:flex items-center space-x-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-0.5 text-xs text-gray-600">
                            <input
                                type="date"
                                aria-label="Start date"
                                className="bg-transparent text-xs text-gray-700 focus:outline-hidden py-0.5"
                                value={filters.start_date}
                                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                            />
                            <span className="text-gray-300">→</span>
                            <input
                                type="date"
                                aria-label="End date"
                                className="bg-transparent text-xs text-gray-700 focus:outline-hidden py-0.5"
                                value={filters.end_date}
                                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Right: Search Input & Reset */}
                    <div className="flex items-center space-x-1.5 flex-1 max-w-sm ml-auto">
                        <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search narrative, ref, amount..."
                                className="pl-8 pr-7 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs w-full focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                            />
                            {filters.search && (
                                <button
                                    onClick={() => setFilters({ ...filters, search: '' })}
                                    className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {hasActiveFilters && (
                            <button
                                onClick={() => {
                                    setQuickFilter('all');
                                    setFilters({ bank_id: '', start_date: '', end_date: '', search: '', is_reconciled: '', is_classified: '' });
                                    if (statementId && statementId !== 'all') {
                                        navigate('/corporate-admin/reconciliation/workspace');
                                    } else {
                                        fetchData();
                                    }
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                title="Reset all filters"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── Main Data Workspace Pane (Ultra-Dense & Full Height) ── */}
            <div className="flex-1 flex gap-2 overflow-hidden min-h-0">
                {/* Left Pane: Bank Transactions */}
                <div className={`bg-white rounded-lg border border-gray-200 flex flex-col shadow-xs overflow-hidden transition-all ${
                    viewMode === 'statement' ? 'w-full' : 'flex-1'
                }`}>
                    {/* Table Control Header */}
                    <div className="px-3 py-1.5 border-b border-gray-100 flex justify-between items-center bg-gray-50/60 shrink-0 text-xs">
                        <div className="flex items-center space-x-2">
                            <span className="font-bold text-gray-800">Bank Statement Lines</span>
                            <span className="text-[11px] text-gray-500">
                                ({paginatedTransactions.length} of {sortedTransactions.length} visible)
                            </span>
                            {quickFilter === 'sweeps' && (
                                <span className="px-2 py-0.2 bg-indigo-100 text-indigo-800 rounded text-[10px] font-bold">
                                    Filtered: Paired Sweeps
                                </span>
                            )}
                        </div>

                        {/* Pagination & Page Size */}
                        <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1 text-[11px] text-gray-500">
                                <span>Rows:</span>
                                <select
                                    className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[11px] font-medium"
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={250}>250</option>
                                    <option value={0}>All ({sortedTransactions.length})</option>
                                </select>
                            </div>

                            {pageSize > 0 && totalPages > 1 && (
                                <div className="flex items-center space-x-1">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 text-gray-600"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-[11px] font-mono text-gray-600">
                                        {currentPage}/{totalPages}
                                    </span>
                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 text-gray-600"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Scrollable Virtual Table Body */}
                    <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
                        {/* Multi-Page Select All Banner */}
                        {paginatedTransactions.length > 0 && paginatedTransactions.every(t => selectedBankTxns.includes(t.id)) && sortedTransactions.length > paginatedTransactions.length && (
                            <div className="bg-amber-50/90 border-b border-amber-200 px-3 py-1.5 text-xs text-amber-900 flex items-center justify-between shrink-0 shadow-inner">
                                <div className="flex items-center space-x-2">
                                    <span>
                                        All <strong>{paginatedTransactions.length}</strong> transactions on this page are selected.
                                    </span>
                                    {selectedBankTxns.length < sortedTransactions.length ? (
                                        <button
                                            onClick={handleSelectAllFiltered}
                                            className="font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                                        >
                                            Select all {sortedTransactions.length} records matching current filter
                                        </button>
                                    ) : (
                                        <span className="font-bold text-emerald-800 flex items-center gap-1">
                                            <Check className="w-3.5 h-3.5" />
                                            All {sortedTransactions.length} records matching current filter are selected!
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={handleClearSelection}
                                    className="text-[11px] font-semibold text-gray-500 hover:text-gray-800 underline cursor-pointer"
                                >
                                    Clear selection
                                </button>
                            </div>
                        )}
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead className="sticky top-0 bg-gray-100 shadow-xs z-10 text-[10px] uppercase font-bold tracking-wider text-gray-500 select-none">
                                <tr className="border-b border-gray-200">
                                    <th className="px-2.5 py-1.5 w-8 text-center">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                                            checked={paginatedTransactions.length > 0 && paginatedTransactions.every(t => selectedBankTxns.includes(t.id))}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedBankTxns(Array.from(new Set([...selectedBankTxns, ...paginatedTransactions.map(t => t.id)])));
                                                } else {
                                                    const pageIds = paginatedTransactions.map(t => t.id);
                                                    setSelectedBankTxns(selectedBankTxns.filter(id => !pageIds.includes(id)));
                                                }
                                            }}
                                        />
                                    </th>
                                    <th
                                        className="px-2.5 py-1.5 cursor-pointer hover:bg-gray-200/70 transition-colors w-24"
                                        onClick={() => handleSort('booking_date')}
                                    >
                                        Date {sortConfig.key === 'booking_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-2.5 py-1.5 w-24">Entity</th>
                                    <th
                                        className="px-2.5 py-1.5 cursor-pointer hover:bg-gray-200/70 transition-colors min-w-[320px]"
                                        onClick={() => handleSort('raw_description')}
                                    >
                                        Description & Narrative {sortConfig.key === 'raw_description' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th
                                        className="px-2.5 py-1.5 text-right cursor-pointer hover:bg-gray-200/70 transition-colors w-32"
                                        onClick={() => handleSort('amount')}
                                    >
                                        Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th
                                        className="px-2.5 py-1.5 text-right cursor-pointer hover:bg-gray-200/70 transition-colors w-32"
                                        onClick={() => handleSort('running_balance')}
                                    >
                                        Balance {sortConfig.key === 'running_balance' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-2.5 py-1.5 w-32">Reference / Code</th>
                                    <th className="px-2.5 py-1.5 text-right w-16">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-sans">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-2">
                                                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                                                <p className="text-gray-500 text-xs font-medium">Streaming statement lines...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginatedTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-16 text-center text-gray-400">
                                            <Search className="w-8 h-8 mx-auto mb-1.5 text-gray-300" />
                                            <p className="text-xs font-bold text-gray-700">No transactions match current filters</p>
                                            <p className="text-[11px] text-gray-400">Adjust date range, filters, or quick filter chip</p>
                                        </td>
                                    </tr>
                                ) : paginatedTransactions.map(txn => {
                                    const isSelected = selectedBankTxns.includes(txn.id);
                                    const isExpanded = expandedRowId === txn.id;
                                    const isCredit = (parseFloat(txn.credit_amount) || 0) > 0;

                                    return (
                                        <React.Fragment key={txn.id}>
                                            <tr
                                                className={`transition-colors cursor-pointer select-none text-xs ${
                                                    isCompact ? 'h-9 py-1' : 'h-12 py-2'
                                                } ${isSelected ? 'bg-blue-50/90 font-medium' : 'hover:bg-blue-50/40'} ${
                                                    txn.is_reconciled ? 'bg-emerald-50/30' : ''
                                                }`}
                                                onClick={() => {
                                                    setSelectedBankTxns(prev =>
                                                        prev.includes(txn.id) ? prev.filter(id => id !== txn.id) : [...prev, txn.id]
                                                    );
                                                }}
                                            >
                                                {/* Checkbox */}
                                                <td className="px-2.5 py-1 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                                                        checked={isSelected}
                                                        onChange={() => {
                                                            setSelectedBankTxns(prev =>
                                                                prev.includes(txn.id) ? prev.filter(id => id !== txn.id) : [...prev, txn.id]
                                                            );
                                                        }}
                                                    />
                                                </td>

                                                {/* Booking Date */}
                                                <td className="px-2.5 py-1 whitespace-nowrap text-gray-600 font-mono text-[11px]">
                                                    {new Date(txn.booking_date).toLocaleDateString(undefined, { year: '2-digit', month: '2-digit', day: '2-digit' })}
                                                </td>

                                                {/* Company / Account */}
                                                <td className="px-2.5 py-1 whitespace-nowrap">
                                                    <span className="text-[11px] font-semibold text-gray-700 truncate max-w-[90px] block" title={txn.company_name || 'N/A'}>
                                                        {txn.company_name || 'OEG'}
                                                    </span>
                                                </td>

                                                {/* Full Description & Intelligence Badges */}
                                                <td className="px-2.5 py-1">
                                                    <div className="flex flex-col justify-center">
                                                        {/* Narrative text: Wrap or single line */}
                                                        <div className="flex items-center gap-1.5">
                                                            <p
                                                                className={`text-gray-900 font-medium ${
                                                                    wrapText ? 'break-words whitespace-normal text-xs' : 'truncate max-w-xl text-xs'
                                                                }`}
                                                                title={txn.raw_description}
                                                            >
                                                                {txn.raw_description}
                                                            </p>
                                                        </div>

                                                        {/* Classification Origin Badges & Actions */}
                                                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                                            {/* Reconciled Badge */}
                                                            {txn.is_reconciled && (
                                                                <span className="px-1 py-0.1 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded uppercase">
                                                                    Matched
                                                                </span>
                                                            )}

                                                            {/* Sweep / Inter-Bank Link Badge (Click to open Pair Verification Modal) */}
                                                            {txn.linked_txn_id && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openPairVerification(txn);
                                                                    }}
                                                                    className="px-1.5 py-0.2 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold rounded uppercase flex items-center shadow-xs cursor-pointer transition-colors"
                                                                    title={`Linked Counterpart Txn #${txn.linked_txn_id}. Click to inspect & verify both sides of this sweep.`}
                                                                >
                                                                    <LinkIcon className="w-2.5 h-2.5 mr-0.5" />
                                                                    {txn.internal_category === 'INTER_BANK_SWEEP' ? `Sweep ↔ #${txn.linked_txn_id}` : `Linked #${txn.linked_txn_id}`}
                                                                </button>
                                                            )}

                                                            {/* Bank Fee / Sweep Variance Badge */}
                                                            {txn.variance_amount && Number(txn.variance_amount) > 0 && (
                                                                <span
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openPairVerification(txn);
                                                                    }}
                                                                    className="px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-bold rounded flex items-center shadow-xs cursor-pointer hover:bg-amber-200"
                                                                    title={`Recognized sweep variance / fee: ${formatMoney(txn.variance_amount)} ${txn.currency || 'EGP'}. Click to inspect pair.`}
                                                                >
                                                                    ⚡ Fee: {formatMoney(txn.variance_amount)} {txn.currency || 'EGP'}
                                                                </span>
                                                            )}

                                                            {/* Reversal Badge */}
                                                            {txn.is_reversal && (
                                                                <span className="px-1 py-0.1 bg-orange-100 text-orange-700 text-[9px] font-bold rounded uppercase border border-orange-200">
                                                                    Reversal
                                                                </span>
                                                            )}

                                                            {/* Counterparty Pill */}
                                                            {txn.counterparty_name && (
                                                                <span className="px-1.5 py-0.1 bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-semibold rounded-full flex items-center" title="Recognized Counterparty Entity">
                                                                    👤 {txn.counterparty_name}
                                                                </span>
                                                            )}

                                                            {/* Multi-Tier Intelligence Source Badges */}
                                                            {txn.classification_source === 'BUILTIN' ? (
                                                                <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded text-[9px] font-bold flex items-center shadow-xs" title={`Built-in Universal Banking Engine (${txn.classification_confidence}% confidence)`}>
                                                                    ⚡ {txn.internal_category || txn.classification_category}
                                                                </span>
                                                            ) : txn.classification_source === 'COLLABORATIVE' ? (
                                                                <span className="px-1.5 py-0.2 bg-violet-50 text-violet-700 border border-violet-300 rounded text-[9px] font-bold flex items-center shadow-xs" title={`Collaborative Platform Intelligence (${txn.classification_confidence}% confidence)`}>
                                                                    🌐 {txn.internal_category || txn.classification_category}
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleConfirmClassification(txn); }}
                                                                        className="ml-1 px-1 py-0.1 bg-violet-600 hover:bg-violet-700 text-white rounded text-[8px] font-bold transition-colors"
                                                                        title="Confirm & reinforce collaborative model"
                                                                    >
                                                                        Confirm
                                                                    </button>
                                                                </span>
                                                            ) : txn.classification_source === 'CONCEPT' ? (
                                                                <span className="px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-300 rounded text-[9px] font-bold flex items-center shadow-xs" title={`Concept Logic Match (${txn.classification_confidence}% confidence)`}>
                                                                    💡 {txn.suggested_category || txn.classification_category}
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleConfirmClassification(txn); }}
                                                                        className="ml-1 px-1 py-0.1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[8px] font-bold transition-colors"
                                                                        title="Confirm & teach local registry"
                                                                    >
                                                                        Confirm
                                                                    </button>
                                                                </span>
                                                            ) : txn.applied_rule_id ? (
                                                                <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded text-[9px] font-bold flex items-center shadow-xs" title={`User Rule: ${txn.applied_rule_name}`}>
                                                                    <Settings2 className="w-2.5 h-2.5 mr-1" />
                                                                    {txn.applied_rule_name || txn.internal_category}
                                                                </span>
                                                            ) : txn.is_classified ? (
                                                                <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[9px] font-bold flex items-center">
                                                                    {txn.internal_category || txn.classification_category || 'Classified'}
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); openClassifyModal(txn); }}
                                                                        className="ml-1 text-blue-400 hover:text-blue-800"
                                                                        title="Edit classification"
                                                                    >
                                                                        <Edit3 className="w-2.5 h-2.5" />
                                                                    </button>
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); openClassifyModal(txn); }}
                                                                    className="px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded text-[9px] font-bold flex items-center shadow-2xs transition-colors"
                                                                    title="Classify this transaction into Classes & Subclasses"
                                                                >
                                                                    <Plus className="w-2.5 h-2.5 mr-0.5" />
                                                                    Classify
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Description Line 2 if present */}
                                                        {txn.description_line2 && (
                                                            <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-xl" title={txn.description_line2}>
                                                                {txn.description_line2}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Amount Formatted with Thousand-Separator Commas */}
                                                <td className="px-2.5 py-1 whitespace-nowrap text-right">
                                                    <span className={`font-mono text-xs font-bold ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {isCredit ? `+${formatMoney(txn.credit_amount)}` : `-${formatMoney(txn.debit_amount)}`}
                                                    </span>
                                                    <span className="ml-1 text-[9px] text-gray-400">{txn.currency || 'EGP'}</span>
                                                </td>

                                                {/* Running Balance Formatted with Thousand-Separator Commas */}
                                                <td className="px-2.5 py-1 whitespace-nowrap text-right font-mono text-xs font-semibold text-gray-800">
                                                    {formatMoney(txn.running_balance)}
                                                </td>

                                                {/* Bank Reference */}
                                                <td className="px-2.5 py-1 whitespace-nowrap text-[11px] font-mono text-gray-500">
                                                    <span className="truncate max-w-[120px] block" title={txn.back_office_ref || txn.e2e_id || ''}>
                                                        {txn.back_office_ref || txn.e2e_id || '-'}
                                                    </span>
                                                </td>

                                                {/* Details Action */}
                                                <td className="px-2.5 py-1 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end space-x-1">
                                                        <button
                                                            onClick={() => setExpandedRowId(isExpanded ? null : txn.id)}
                                                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            title={isExpanded ? "Collapse inline details" : "Expand inline details"}
                                                        >
                                                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (txn.linked_txn_id) {
                                                                    openPairVerification(txn);
                                                                } else {
                                                                    setViewingTxn(txn);
                                                                }
                                                            }}
                                                            className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                            title={txn.linked_txn_id ? "Verify Sweep Pair Side-by-Side" : "View full audit drawer"}
                                                        >
                                                            <Info className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* ── Inline Expanded Row Details ── */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50/80 border-y border-slate-200 text-xs">
                                                    <td colSpan={8} className="p-3">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                                                            {/* Column 1: Full Narrative */}
                                                            <div className="md:col-span-2 space-y-1">
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Full Narrative String</span>
                                                                <p className="text-xs font-mono font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-200 select-all leading-relaxed">
                                                                    {txn.raw_description}
                                                                    {txn.description_line2 && (
                                                                        <span className="block text-gray-500 mt-1 pt-1 border-t border-gray-200">{txn.description_line2}</span>
                                                                    )}
                                                                </p>
                                                            </div>

                                                            {/* Column 2: Account & References */}
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Technical References</span>
                                                                <div className="text-xs space-y-0.5">
                                                                    <p className="text-gray-600">Account: <span className="font-mono font-semibold text-gray-900">{txn.account_number || 'N/A'}</span></p>
                                                                    <p className="text-gray-600">Back Office Ref: <span className="font-mono font-semibold text-gray-900">{txn.back_office_ref || 'N/A'}</span></p>
                                                                    <p className="text-gray-600">E2E ID: <span className="font-mono font-semibold text-gray-900">{txn.e2e_id || 'N/A'}</span></p>
                                                                    <p className="text-gray-600">Value Date: <span className="font-mono font-semibold text-gray-900">{txn.value_date ? new Date(txn.value_date).toLocaleDateString() : '-'}</span></p>
                                                                </div>
                                                            </div>

                                                            {/* Column 3: Intelligence & Actions */}
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Intelligence Classification</span>
                                                                <div className="text-xs space-y-0.5">
                                                                    <p className="text-gray-600">Category: <span className="font-bold text-blue-700">{txn.classification_category || 'Unclassified'}</span></p>
                                                                    <p className="text-gray-600">GL Account: <span className="font-mono font-semibold text-gray-900">{txn.internal_category || '-'}</span></p>
                                                                    <p className="text-gray-600">Source: <span className="font-semibold text-gray-900">{txn.classification_source || 'MANUAL'} ({txn.classification_confidence || 0}%)</span></p>
                                                                    {txn.linked_txn_id && (
                                                                        <button
                                                                            onClick={() => openPairVerification(txn)}
                                                                            className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 mt-1 underline"
                                                                        >
                                                                            <LinkIcon className="w-3 h-3" /> Verify Pair (Txn #{txn.linked_txn_id})
                                                                        </button>
                                                                    )}
                                                                    {txn.variance_amount && Number(txn.variance_amount) > 0 && (
                                                                        <p className="text-amber-800 font-bold flex items-center gap-1 mt-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                                                            ⚡ Bank Fee / Variance: {formatMoney(txn.variance_amount)} {txn.currency || 'EGP'}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
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
                </div>

                {/* ── Right Pane: ERP Records (Visible only in Split Mode) ── */}
                {viewMode === 'split' && (
                    <div className="flex-1 bg-white rounded-lg border border-gray-200 flex flex-col shadow-xs overflow-hidden animate-in slide-in-from-right duration-200">
                        <div className="px-3 py-2 border-b border-gray-100 flex justify-between items-center bg-gray-50/60 shrink-0 text-xs">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-gray-800 flex items-center gap-1.5">
                                    <span>Internal Records (ERP)</span>
                                    <span className="text-[10px] text-gray-400">AP / AR / Treasury</span>
                                </h3>
                                <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded text-[10px] font-bold">
                                    {erpRecords.length}
                                </span>
                            </div>
                            <button
                                onClick={() => { setErpImportStatus(null); setShowERPImportModal(true); }}
                                className="flex items-center px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold transition-all shadow-xs"
                                title="Upload or quick-add ERP ledger records"
                            >
                                <Upload className="w-3 h-3 mr-1" />
                                Import ERP Ledger
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead className="sticky top-0 bg-gray-100 shadow-xs z-10 text-[10px] uppercase font-bold text-gray-500">
                                    <tr className="border-b border-gray-200">
                                        <th className="px-2.5 py-1.5 w-8"></th>
                                        <th className="px-2.5 py-1.5">Type</th>
                                        <th className="px-2.5 py-1.5">Reference</th>
                                        <th className="px-2.5 py-1.5 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 font-sans">
                                    {erpRecords.map(rec => {
                                        const isSelected = selectedErpRecords.includes(rec.id);
                                        return (
                                            <tr
                                                key={rec.id}
                                                className={`h-9 hover:bg-blue-50/50 cursor-pointer transition-colors ${
                                                    isSelected ? 'bg-blue-50 font-medium' : ''
                                                }`}
                                                onClick={() => {
                                                    setSelectedErpRecords(prev =>
                                                        prev.includes(rec.id) ? prev.filter(id => id !== rec.id) : [...prev, rec.id]
                                                    );
                                                }}
                                            >
                                                <td className="px-2.5 py-1 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                                                        checked={isSelected}
                                                        onChange={() => {
                                                            setSelectedErpRecords(prev =>
                                                                prev.includes(rec.id) ? prev.filter(id => id !== rec.id) : [...prev, rec.id]
                                                            );
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-2.5 py-1">
                                                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                                        (rec.record_type || rec.type || '').includes('AR')
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : (rec.record_type || rec.type || '').includes('AP')
                                                            ? 'bg-amber-100 text-amber-800'
                                                            : 'bg-indigo-100 text-indigo-800'
                                                    }`}>
                                                        {rec.record_type ? rec.record_type.replace('_', ' ') : (rec.type || 'ERP')}
                                                    </span>
                                                    {(rec.status === 'RECONCILED' || rec.matched_bank_txn_id) && (
                                                        <span className="ml-1 px-1 py-0.1 bg-emerald-600 text-white rounded text-[8px] font-bold uppercase">
                                                            ✓ Matched
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-2.5 py-1">
                                                    <p className="font-semibold text-gray-900 font-mono text-[11px]">{rec.reference_number || rec.ref || '-'}</p>
                                                    <span className="text-[10px] text-gray-500 font-sans">
                                                        {rec.entity_name || rec.entity || '-'} • {rec.record_date ? new Date(rec.record_date).toLocaleDateString() : (rec.date || '-')}
                                                    </span>
                                                </td>
                                                <td className={`px-2.5 py-1 text-right font-mono font-bold ${
                                                    Number(rec.amount) > 0 ? 'text-emerald-600' : 'text-rose-600'
                                                }`}>
                                                    {Number(rec.amount) > 0 ? `+${formatMoney(rec.amount)}` : formatMoney(rec.amount)} {rec.currency || 'EGP'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                 SWEEP PAIR VERIFICATION & AUDIT MODAL (Side-by-Side Comparison)
               ═══════════════════════════════════════════════════════════════════ */}
            {verifyingPair && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-4xl w-full flex flex-col overflow-hidden max-h-[90vh]">
                        {/* Header Banner */}
                        <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white flex justify-between items-center shrink-0">
                            <div>
                                <div className="flex items-center space-x-2">
                                    <span className="px-2 py-0.5 bg-emerald-400 text-emerald-950 font-black text-xs rounded uppercase tracking-wider">
                                        ✓ Verified Sweep Pair
                                    </span>
                                    <h3 className="text-base font-bold">
                                        Txn #{verifyingPair.txnA.id} ↔ Txn #{verifyingPair.txnB.id}
                                    </h3>
                                </div>
                                <p className="text-xs text-indigo-200 mt-0.5">
                                    Cross-Account Inter-Bank Liquidity Movement Clearing
                                </p>
                            </div>
                            <button
                                onClick={() => setVerifyingPair(null)}
                                className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-200 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body: Side-by-Side Comparison */}
                        <div className="p-6 overflow-y-auto space-y-5 flex-1">
                            {/* Dual Comparison Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Left: Outflow (Debit Leg) */}
                                <div className="p-4 bg-rose-50/50 border-2 border-rose-200 rounded-xl space-y-3">
                                    <div className="flex justify-between items-center border-b border-rose-200 pb-2">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 block">
                                                Outflow Leg (Debit)
                                            </span>
                                            <h4 className="text-sm font-bold text-gray-900">
                                                Account: {verifyingPair.txnA.account_number || 'Source Account'}
                                            </h4>
                                        </div>
                                        <span className="text-xs text-gray-500 font-mono">
                                            #{verifyingPair.txnA.id}
                                        </span>
                                    </div>

                                    {/* Amount Display */}
                                    <div className="p-3 bg-white rounded-lg border border-rose-100 shadow-xs">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Debited Amount</span>
                                        <p className="text-2xl font-black font-mono text-rose-600">
                                            -{formatMoney(verifyingPair.txnA.debit_amount || verifyingPair.txnA.amount_in_currency || verifyingPair.txnA.credit_amount)}
                                            <span className="text-xs font-normal text-gray-500 ml-1.5">{verifyingPair.txnA.currency || 'EGP'}</span>
                                        </p>
                                        <p className="text-[11px] text-gray-500 mt-1">
                                            Balance After: <strong className="font-mono text-gray-700">{formatMoney(verifyingPair.txnA.running_balance)}</strong>
                                        </p>
                                    </div>

                                    {/* Narrative String */}
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Bank Narrative Description</span>
                                        <p className="p-2.5 bg-white rounded border border-rose-100 text-xs font-mono text-gray-800 leading-relaxed select-all">
                                            {verifyingPair.txnA.raw_description}
                                        </p>
                                    </div>

                                    {/* Meta */}
                                    <div className="text-[11px] space-y-1 text-gray-600 pt-1">
                                        <p>Booking Date: <strong className="text-gray-900">{new Date(verifyingPair.txnA.booking_date).toLocaleDateString()}</strong></p>
                                        <p>Back Office Ref: <strong className="font-mono text-gray-900">{verifyingPair.txnA.back_office_ref || '-'}</strong></p>
                                    </div>
                                </div>

                                {/* Right: Inflow (Credit Leg) */}
                                <div className="p-4 bg-emerald-50/50 border-2 border-emerald-200 rounded-xl space-y-3">
                                    <div className="flex justify-between items-center border-b border-emerald-200 pb-2">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                                                Inflow Leg (Credit)
                                            </span>
                                            <h4 className="text-sm font-bold text-gray-900">
                                                Account: {verifyingPair.txnB.account_number || 'Target Account'}
                                            </h4>
                                        </div>
                                        <span className="text-xs text-gray-500 font-mono">
                                            #{verifyingPair.txnB.id}
                                        </span>
                                    </div>

                                    {/* Amount Display */}
                                    <div className="p-3 bg-white rounded-lg border border-emerald-100 shadow-xs">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Credited Amount</span>
                                        <p className="text-2xl font-black font-mono text-emerald-600">
                                            +{formatMoney(verifyingPair.txnB.credit_amount || verifyingPair.txnB.amount_in_currency || verifyingPair.txnB.debit_amount)}
                                            <span className="text-xs font-normal text-gray-500 ml-1.5">{verifyingPair.txnB.currency || 'EGP'}</span>
                                        </p>
                                        <p className="text-[11px] text-gray-500 mt-1">
                                            Balance After: <strong className="font-mono text-gray-700">{formatMoney(verifyingPair.txnB.running_balance)}</strong>
                                        </p>
                                    </div>

                                    {/* Narrative String */}
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Bank Narrative Description</span>
                                        <p className="p-2.5 bg-white rounded border border-emerald-100 text-xs font-mono text-gray-800 leading-relaxed select-all">
                                            {verifyingPair.txnB.raw_description}
                                        </p>
                                    </div>

                                    {/* Meta */}
                                    <div className="text-[11px] space-y-1 text-gray-600 pt-1">
                                        <p>Booking Date: <strong className="text-gray-900">{new Date(verifyingPair.txnB.booking_date).toLocaleDateString()}</strong></p>
                                        <p>Back Office Ref: <strong className="font-mono text-gray-900">{verifyingPair.txnB.back_office_ref || '-'}</strong></p>
                                    </div>
                                </div>
                            </div>

                            {/* Clearing & Variance Analysis Banner */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4 text-indigo-600" />
                                        <span>Sweep Clearing & Variance Verification</span>
                                    </span>
                                    {verifyingPair.txnA.variance_amount && Number(verifyingPair.txnA.variance_amount) > 0 ? (
                                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-mono text-xs font-bold rounded">
                                            Fee / Variance: {formatMoney(verifyingPair.txnA.variance_amount)} {verifyingPair.txnA.currency || 'EGP'}
                                        </span>
                                    ) : (
                                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-mono text-xs font-bold rounded">
                                            ✓ 100% Exact Matching Amount (Zero Variance)
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Both sides were paired by the engine based on reciprocal directional movement
                                    (Outflow from <code>{verifyingPair.txnA.account_number}</code> into <code>{verifyingPair.txnB.account_number}</code>)
                                    and shared reference tracking codes.
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center shrink-0">
                            <button
                                onClick={() => handleUnlink(verifyingPair.txnA.id)}
                                className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                title="Unlink this pair if you believe it is not a match"
                            >
                                <Unlink className="w-3.5 h-3.5" />
                                <span>Unlink Pair</span>
                            </button>

                            <button
                                onClick={() => setVerifyingPair(null)}
                                className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                            >
                                Close Verification
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Transaction Audit & Full Detail Side Drawer ── */}
            {viewingTxn && (
                <div className="fixed inset-0 z-[100] flex items-center justify-end bg-black/30 backdrop-blur-xs">
                    <div className="w-[520px] max-w-full h-full bg-white shadow-2xl border-l border-gray-200 animate-in slide-in-from-right duration-200 flex flex-col">
                        {/* Drawer Header */}
                        <div className="px-5 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50/80">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">Transaction Deep-Dive Audit</h3>
                                <p className="text-[11px] text-gray-500">Transaction ID #{viewingTxn.id} • Statement #{viewingTxn.statement_id}</p>
                            </div>
                            <button
                                onClick={() => setViewingTxn(null)}
                                className="p-1 hover:bg-gray-200 rounded-md transition-colors text-gray-500"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                            {/* Full Narrative Box */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Raw Statement Narrative</span>
                                    <button
                                        onClick={() => copyToClipboard(viewingTxn.raw_description, 'raw_desc')}
                                        className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                        {copiedField === 'raw_desc' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                        {copiedField === 'raw_desc' ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-800 leading-relaxed select-all">
                                    {viewingTxn.raw_description}
                                    {viewingTxn.description_line2 && (
                                        <div className="mt-2 pt-2 border-t border-slate-200 text-slate-500 font-normal">
                                            {viewingTxn.description_line2}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Financial Summary */}
                            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Amount</span>
                                    <p className={`text-base font-black font-mono ${viewingTxn.credit_amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {viewingTxn.credit_amount > 0 ? `+${formatMoney(viewingTxn.credit_amount)}` : `-${formatMoney(viewingTxn.debit_amount)}`}
                                        <span className="ml-1 text-[10px] text-gray-500 font-normal">{viewingTxn.currency}</span>
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Running Balance</span>
                                    <p className="text-base font-black font-mono text-gray-900">
                                        {formatMoney(viewingTxn.running_balance)}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Booking Date</span>
                                    <p className="font-semibold text-gray-900">{new Date(viewingTxn.booking_date).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Value Date</span>
                                    <p className="font-semibold text-gray-900">{viewingTxn.value_date ? new Date(viewingTxn.value_date).toLocaleDateString() : '-'}</p>
                                </div>
                            </div>

                            {/* Intelligence Classification */}
                            <div className="space-y-1.5 p-3 rounded-lg border border-indigo-100 bg-indigo-50/40">
                                <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">Classification & Origin</span>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-500 text-[10px]">Category:</span>
                                        <p className="font-bold text-blue-700">{viewingTxn.classification_category || 'Unclassified'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 text-[10px]">GL Mapping:</span>
                                        <p className="font-mono font-semibold text-gray-900">{viewingTxn.internal_category || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 text-[10px]">Origin:</span>
                                        <p className="font-semibold text-gray-800">{viewingTxn.classification_source || 'MANUAL'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 text-[10px]">Confidence:</span>
                                        <p className="font-bold text-emerald-600">{viewingTxn.classification_confidence || 0}%</p>
                                    </div>
                                </div>
                                {viewingTxn.counterparty_name && (
                                    <div className="pt-2 border-t border-indigo-100/80 flex items-center justify-between">
                                        <span className="text-gray-600 text-xs">Counterparty: <strong>{viewingTxn.counterparty_name}</strong></span>
                                        <button
                                            onClick={() => handleConfirmClassification(viewingTxn)}
                                            className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-bold shadow-xs hover:bg-indigo-700 transition-colors"
                                        >
                                            Confirm Entity
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Sweep Fee / Bank Charge Variance Card */}
                            {viewingTxn.variance_amount && Number(viewingTxn.variance_amount) > 0 && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1">
                                    <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">Sweep Bank Fee / Variance Detected</span>
                                    <p className="text-amber-900 font-medium leading-relaxed">
                                        A clearing variance of <strong className="font-mono text-sm text-amber-950 font-black">{formatMoney(viewingTxn.variance_amount)} {viewingTxn.currency || 'EGP'}</strong> was recognized on this paired sweep leg (e.g. transfer fee, processing commission, or conversion margin).
                                    </p>
                                    {viewingTxn.linked_txn_id && (
                                        <div className="pt-2 border-t border-amber-200/60 flex justify-between items-center">
                                            <span className="text-xs text-amber-900 font-mono">Linked with Txn #{viewingTxn.linked_txn_id}</span>
                                            <button
                                                onClick={() => openPairVerification(viewingTxn)}
                                                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded shadow-xs"
                                            >
                                                Compare Pair Side-by-Side
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Identifiers & Account Meta */}
                            <div className="space-y-2 border-t border-gray-100 pt-3">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Account & Audit References</span>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-400 text-[10px]">Account Number:</span>
                                        <p className="font-mono text-gray-800">{viewingTxn.account_number || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 text-[10px]">Back Office Ref:</span>
                                        <p className="font-mono text-gray-800">{viewingTxn.back_office_ref || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 text-[10px]">E2E Reference:</span>
                                        <p className="font-mono text-gray-800">{viewingTxn.e2e_id || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 text-[10px]">Beneficiary:</span>
                                        <p className="text-gray-800">{viewingTxn.beneficiary_name || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                            {viewingTxn.linked_txn_id ? (
                                <button
                                    onClick={() => handleUnlink(viewingTxn.id)}
                                    className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-md text-xs font-bold transition-colors flex items-center gap-1"
                                >
                                    <Unlink className="w-3.5 h-3.5" />
                                    <span>Unlink Sweep</span>
                                </button>
                            ) : <div></div>}

                            <button
                                onClick={() => setViewingTxn(null)}
                                className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-xs font-bold hover:bg-gray-100 transition-all shadow-xs"
                            >
                                Close Audit View
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Interactive Inline Classify Modal ── */}
            {showClassifyModal && selectedTxnForClassify && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-amber-50/60">
                            <div>
                                <h3 className="text-base font-bold text-amber-950 flex items-center">
                                    <Layers className="w-4 h-4 mr-2 text-amber-700" />
                                    Classify Bank Transaction
                                </h3>
                                <p className="text-xs text-amber-800">
                                    Assign to a Class & Subclass category and map to a General Ledger account.
                                </p>
                            </div>
                            <button onClick={() => setShowClassifyModal(false)} className="p-1.5 hover:bg-white rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Transaction Snapshot */}
                        <div className="px-6 py-3 bg-gray-50/80 border-b border-gray-100 text-xs flex justify-between items-center">
                            <div className="max-w-[70%] truncate">
                                <span className="text-[10px] text-gray-400 block">Description:</span>
                                <span className="font-semibold text-gray-800 truncate block" title={selectedTxnForClassify.clean_narrative || selectedTxnForClassify.raw_narrative}>
                                    {selectedTxnForClassify.clean_narrative || selectedTxnForClassify.raw_narrative}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-gray-400 block">Amount:</span>
                                <span className={`font-mono font-bold ${selectedTxnForClassify.is_positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {selectedTxnForClassify.is_positive ? '+' : ''}{formatMoney(selectedTxnForClassify.amount)} {selectedTxnForClassify.currency || 'EGP'}
                                </span>
                            </div>
                        </div>

                        <form onSubmit={handleApplyInlineClassify} className="p-6 space-y-4">
                            {/* Class (Parent) */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                    Parent Class *
                                </label>
                                <select
                                    value={classifyForm.category}
                                    onChange={(e) => {
                                        const newCat = e.target.value;
                                        const foundCls = taxonomy.find(c => c.name === newCat);
                                        const firstSub = foundCls?.subclasses?.[0];
                                        setClassifyForm({
                                            ...classifyForm,
                                            category: newCat,
                                            sub_category: firstSub?.name || '',
                                            gl_account: firstSub?.default_gl_account || classifyForm.gl_account
                                        });
                                    }}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                                    required
                                >
                                    {taxonomy.map(cls => (
                                        <option key={cls.id} value={cls.name}>{cls.name} ({cls.code})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Subclass */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Subclass Item *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setClassifyForm({
                                            ...classifyForm,
                                            isCreatingNewSubclass: !classifyForm.isCreatingNewSubclass
                                        })}
                                        className="text-[11px] text-teal-700 font-bold hover:underline"
                                    >
                                        {classifyForm.isCreatingNewSubclass ? "← Choose existing" : "+ Create New Subclass"}
                                    </button>
                                </div>

                                {classifyForm.isCreatingNewSubclass ? (
                                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg space-y-2">
                                        <input
                                            type="text"
                                            value={classifyForm.newSubclassName}
                                            onChange={(e) => setClassifyForm({ ...classifyForm, newSubclassName: e.target.value })}
                                            placeholder="e.g. Customs Clearance Expenses"
                                            className="w-full px-3 py-1.5 bg-white border border-teal-300 rounded text-xs font-semibold focus:ring-2 focus:ring-teal-500 outline-none"
                                            required
                                        />
                                        <input
                                            type="text"
                                            value={classifyForm.newSubclassCode}
                                            onChange={(e) => setClassifyForm({ ...classifyForm, newSubclassCode: e.target.value.toUpperCase() })}
                                            placeholder="Code (optional, e.g. OPEX_CUSTOMS)"
                                            className="w-full px-3 py-1.5 bg-white border border-teal-300 rounded text-xs font-mono uppercase focus:ring-2 focus:ring-teal-500 outline-none"
                                        />
                                    </div>
                                ) : (
                                    <select
                                        value={classifyForm.sub_category}
                                        onChange={(e) => {
                                            const subName = e.target.value;
                                            const foundCls = taxonomy.find(c => c.name === classifyForm.category);
                                            const foundSub = foundCls?.subclasses?.find(s => s.name === subName);
                                            setClassifyForm({
                                                ...classifyForm,
                                                sub_category: subName,
                                                gl_account: foundSub?.default_gl_account || classifyForm.gl_account
                                            });
                                        }}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                                    >
                                        <option value="">Select Subclass (Optional)...</option>
                                        {(taxonomy.find(c => c.name === classifyForm.category)?.subclasses || []).map(sub => (
                                            <option key={sub.id} value={sub.name}>
                                                {sub.name} {sub.default_gl_account ? `(${sub.default_gl_account})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* G/L Account Code */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                    Target G/L Account Code & Name
                                </label>
                                <input
                                    type="text"
                                    value={classifyForm.gl_account}
                                    onChange={(e) => setClassifyForm({ ...classifyForm, gl_account: e.target.value })}
                                    placeholder="e.g. 5020100 - Software & Technology Licenses"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                                />
                            </div>

                            {/* Remember for Counterparty Checkbox */}
                            <div className="pt-2 border-t border-gray-100">
                                <label className="flex items-start space-x-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={classifyForm.remember_for_counterparty}
                                        onChange={(e) => setClassifyForm({ ...classifyForm, remember_for_counterparty: e.target.checked })}
                                        className="mt-0.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-gray-800 block">
                                            Remember this classification for Counterparty
                                        </span>
                                        <span className="text-[11px] text-gray-500 block">
                                            Automatically classifies future statements when this vendor/customer appears.
                                        </span>
                                    </div>
                                </label>

                                {classifyForm.remember_for_counterparty && (
                                    <div className="mt-2 pl-6">
                                        <input
                                            type="text"
                                            value={classifyForm.counterparty_name}
                                            onChange={(e) => setClassifyForm({ ...classifyForm, counterparty_name: e.target.value })}
                                            placeholder="Counterparty Name (e.g. AMAZON WEB SERVICES)"
                                            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Modal Actions */}
                            <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setShowClassifyModal(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-md shadow-amber-600/20 transition-all"
                                >
                                    Apply Classification
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Inward ERP Ledger Import Modal ── */}
            {showERPImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-50/60">
                            <div>
                                <h3 className="text-base font-bold text-blue-950 flex items-center">
                                    <Upload className="w-4 h-4 mr-2 text-blue-600" />
                                    Import ERP / GL Ledger Records
                                </h3>
                                <p className="text-xs text-blue-700">
                                    Inward invoices, bills, or treasury lines from SAP, Oracle, NetSuite, Odoo, or Excel.
                                </p>
                            </div>
                            <button onClick={() => setShowERPImportModal(false)} className="p-1.5 hover:bg-white rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Modal Navigation Tabs */}
                        <div className="flex border-b border-gray-100 bg-gray-50/50 px-6 pt-2">
                            <button
                                type="button"
                                onClick={() => setErpImportTab('upload')}
                                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all ${
                                    erpImportTab === 'upload' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                Upload Excel / CSV
                            </button>
                            <button
                                type="button"
                                onClick={() => setErpImportTab('manual')}
                                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all ${
                                    erpImportTab === 'manual' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                Quick Manual Add
                            </button>
                        </div>

                        {/* Status Message */}
                        {erpImportStatus && (
                            <div className={`mx-6 mt-4 p-3 rounded-lg text-xs flex items-center space-x-2 ${
                                erpImportStatus.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}>
                                {erpImportStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />}
                                <span>{erpImportStatus.message}</span>
                            </div>
                        )}

                        {/* TAB 1: File Upload */}
                        {erpImportTab === 'upload' && (
                            <form onSubmit={handleUploadERPFile} className="p-6 space-y-4">
                                <div className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-6 text-center transition-all bg-gray-50/50">
                                    <Upload className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                                    <p className="text-xs font-bold text-gray-800">
                                        Select Excel (.xlsx, .xls) or CSV file
                                    </p>
                                    <p className="text-[11px] text-gray-400 mt-1 mb-3">
                                        Columns auto-detected: Date, Reference / Invoice #, Entity / Counterparty, Amount, GL Account.
                                    </p>
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={(e) => setErpFile(e.target.files[0])}
                                        className="text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                    />
                                </div>

                                <div className="flex justify-between items-center pt-2">
                                    <button
                                        type="button"
                                        onClick={downloadERPTemplate}
                                        className="text-[11px] text-blue-700 hover:underline flex items-center font-semibold"
                                    >
                                        <Download className="w-3 h-3 mr-1" />
                                        Download CSV Sample Template
                                    </button>

                                    <div className="flex items-center space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowERPImportModal(false)}
                                            className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!erpFile || isUploadingERP}
                                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-600/20 disabled:opacity-50 transition-all flex items-center"
                                        >
                                            {isUploadingERP ? (
                                                <>
                                                    <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
                                                    Ingesting...
                                                </>
                                            ) : (
                                                "Ingest Records"
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}

                        {/* TAB 2: Quick Manual Entry */}
                        {erpImportTab === 'manual' && (
                            <form onSubmit={handleAddManualERPRecord} className="p-6 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Record Type *</label>
                                        <select
                                            value={manualERPRecord.record_type}
                                            onChange={(e) => setManualERPRecord({ ...manualERPRecord, record_type: e.target.value })}
                                            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="AR_INVOICE">AR Customer Invoice (Receivable)</option>
                                            <option value="AP_BILL">AP Vendor Bill (Payable)</option>
                                            <option value="LG_COMMISSION">LG / LC Bank Commission</option>
                                            <option value="PAYROLL">Payroll Batch</option>
                                            <option value="TREASURY">Treasury Inter-Company</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Reference Number *</label>
                                        <input
                                            type="text"
                                            value={manualERPRecord.reference_number}
                                            onChange={(e) => setManualERPRecord({ ...manualERPRecord, reference_number: e.target.value })}
                                            placeholder="e.g. INV-2026-904"
                                            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Entity / Counterparty</label>
                                        <input
                                            type="text"
                                            value={manualERPRecord.entity_name}
                                            onChange={(e) => setManualERPRecord({ ...manualERPRecord, entity_name: e.target.value })}
                                            placeholder="e.g. ORANGE TELECOM EG"
                                            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Amount (EGP) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={manualERPRecord.amount}
                                            onChange={(e) => setManualERPRecord({ ...manualERPRecord, amount: e.target.value })}
                                            placeholder="e.g. 92400.00"
                                            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Posting Date *</label>
                                        <input
                                            type="date"
                                            value={manualERPRecord.record_date}
                                            onChange={(e) => setManualERPRecord({ ...manualERPRecord, record_date: e.target.value })}
                                            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">GL Account (Optional)</label>
                                        <input
                                            type="text"
                                            value={manualERPRecord.gl_account}
                                            onChange={(e) => setManualERPRecord({ ...manualERPRecord, gl_account: e.target.value })}
                                            placeholder="e.g. 1020100 - Trade Receivables"
                                            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowERPImportModal(false)}
                                        className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
                                    >
                                        + Add Record
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* ── Sleek Floating Bulk Action Dock ── */}
            {selectedBankTxns.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-gray-700/60 flex items-center space-x-4 animate-in slide-in-from-bottom-5 duration-200">
                    <div className="flex items-center space-x-2 pr-3 border-r border-gray-700">
                        <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-mono font-bold text-xs flex items-center justify-center border border-blue-500/40">
                            {selectedBankTxns.length}
                        </span>
                        <span className="text-xs font-semibold text-gray-200">
                            Selected
                        </span>
                        <button
                            onClick={handleClearSelection}
                            className="text-[11px] text-gray-400 hover:text-white underline cursor-pointer ml-1"
                            title="Deselect all"
                        >
                            Clear
                        </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={openBulkClassifyModal}
                            disabled={isBulkOperating}
                            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs rounded-lg shadow-md transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Bulk Classify & GL</span>
                        </button>

                        <button
                            onClick={handleBulkConfirmSuggestions}
                            disabled={isBulkOperating}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-md transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                            title="Confirm suggestions on all selected rows"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Bulk Confirm</span>
                        </button>

                        <button
                            onClick={handleBulkClearClassification}
                            disabled={isBulkOperating}
                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs rounded-lg border border-gray-700 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                            title="Reset classification for selected rows"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset Class</span>
                        </button>
                    </div>

                    <button
                        onClick={handleClearSelection}
                        className="p-1 text-gray-400 hover:text-white rounded-full transition-colors ml-1"
                        title="Close selection"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ── Bulk Classify Modal ── */}
            {showBulkClassifyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-amber-50/60">
                            <div>
                                <h3 className="text-base font-bold text-amber-950 flex items-center">
                                    <Layers className="w-4 h-4 mr-2 text-amber-700" />
                                    Bulk Classify ({selectedBankTxns.length} Records)
                                </h3>
                                <p className="text-xs text-amber-800">
                                    Apply class, subclass, and target G/L account simultaneously across all selected records.
                                </p>
                            </div>
                            <button onClick={() => setShowBulkClassifyModal(false)} className="p-1.5 hover:bg-white rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleApplyBulkClassify} className="p-6 space-y-4">
                            {/* Selected Count Indicator */}
                            <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
                                <span className="font-semibold text-amber-900">
                                    Target Transactions:
                                </span>
                                <span className="font-mono font-bold text-amber-950 bg-amber-200/70 px-2 py-0.5 rounded">
                                    {selectedBankTxns.length} lines selected
                                </span>
                            </div>

                            {/* Class (Parent Category) */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                    Taxonomy Class (Level 1) *
                                </label>
                                <select
                                    value={bulkClassifyForm.category}
                                    onChange={(e) => {
                                        const newCat = e.target.value;
                                        const foundClass = taxonomy.find(c => c.name === newCat);
                                        const firstSub = foundClass?.subclasses?.[0]?.name || '';
                                        const firstGL = foundClass?.subclasses?.[0]?.default_gl_account || '';
                                        setBulkClassifyForm({
                                            ...bulkClassifyForm,
                                            category: newCat,
                                            sub_category: firstSub,
                                            gl_account: firstGL
                                        });
                                    }}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                                    required
                                >
                                    {taxonomy.map(cls => (
                                        <option key={cls.id} value={cls.name}>
                                            {cls.name} ({cls.direction})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Subclass (Child Category) */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Taxonomy Subclass (Level 2)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setBulkClassifyForm(prev => ({ ...prev, isCreatingNewSubclass: !prev.isCreatingNewSubclass }))}
                                        className="text-[11px] text-amber-700 hover:text-amber-900 font-bold"
                                    >
                                        {bulkClassifyForm.isCreatingNewSubclass ? '← Pick Existing Subclass' : '+ Create New Subclass'}
                                    </button>
                                </div>

                                {bulkClassifyForm.isCreatingNewSubclass ? (
                                    <div className="space-y-2 p-3 bg-amber-50/50 rounded-lg border border-amber-200">
                                        <input
                                            type="text"
                                            value={bulkClassifyForm.newSubclassName}
                                            onChange={(e) => setBulkClassifyForm({ ...bulkClassifyForm, newSubclassName: e.target.value })}
                                            placeholder="New Subclass Name (e.g. Google Cloud Services)"
                                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                                            required
                                        />
                                        <input
                                            type="text"
                                            value={bulkClassifyForm.newSubclassCode}
                                            onChange={(e) => setBulkClassifyForm({ ...bulkClassifyForm, newSubclassCode: e.target.value })}
                                            placeholder="Code (optional, e.g. SUB_GCP)"
                                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                                        />
                                    </div>
                                ) : (
                                    <select
                                        value={bulkClassifyForm.sub_category}
                                        onChange={(e) => {
                                            const subName = e.target.value;
                                            const foundCls = taxonomy.find(c => c.name === bulkClassifyForm.category);
                                            const foundSub = foundCls?.subclasses?.find(s => s.name === subName);
                                            setBulkClassifyForm({
                                                ...bulkClassifyForm,
                                                sub_category: subName,
                                                gl_account: foundSub?.default_gl_account || bulkClassifyForm.gl_account
                                            });
                                        }}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                                    >
                                        <option value="">Select Subclass (Optional)...</option>
                                        {(taxonomy.find(c => c.name === bulkClassifyForm.category)?.subclasses || []).map(sub => (
                                            <option key={sub.id} value={sub.name}>
                                                {sub.name} {sub.default_gl_account ? `(${sub.default_gl_account})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* G/L Account Code */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                    Target G/L Account Code & Name
                                </label>
                                <input
                                    type="text"
                                    value={bulkClassifyForm.gl_account}
                                    onChange={(e) => setBulkClassifyForm({ ...bulkClassifyForm, gl_account: e.target.value })}
                                    placeholder="e.g. 5020100 - Software & Technology Licenses"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                                />
                            </div>

                            {/* Remember for Counterparty Checkbox */}
                            <div className="pt-2 border-t border-gray-100">
                                <label className="flex items-start space-x-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={bulkClassifyForm.remember_for_counterparty}
                                        onChange={(e) => setBulkClassifyForm({ ...bulkClassifyForm, remember_for_counterparty: e.target.checked })}
                                        className="mt-0.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-gray-800 block">
                                            Remember this classification for Counterparty
                                        </span>
                                        <span className="text-[11px] text-gray-500 block">
                                            Also trains local counterparty registry and federated learning brain.
                                        </span>
                                    </div>
                                </label>

                                {bulkClassifyForm.remember_for_counterparty && (
                                    <div className="mt-2 pl-6">
                                        <input
                                            type="text"
                                            value={bulkClassifyForm.counterparty_name}
                                            onChange={(e) => setBulkClassifyForm({ ...bulkClassifyForm, counterparty_name: e.target.value })}
                                            placeholder="Counterparty Name (e.g. AMAZON WEB SERVICES)"
                                            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Modal Actions */}
                            <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setShowBulkClassifyModal(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isBulkOperating}
                                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center space-x-1.5 disabled:opacity-50"
                                >
                                    {isBulkOperating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                    <span>Apply to {selectedBankTxns.length} Records</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReconciliationWorkspace;
