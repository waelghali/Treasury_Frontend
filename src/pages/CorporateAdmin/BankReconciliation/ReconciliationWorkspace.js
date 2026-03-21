import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Search, Filter, CheckCircle2,
    RefreshCw, Link as LinkIcon, Unlink, Info,
    ChevronRight, ChevronLeft, Plus, Trash2, ArrowRight,
    Settings2
} from 'lucide-react';
import { apiRequest } from '../../../services/apiService';

const ReconciliationWorkspace = () => {
    const { statementId } = useParams();
    const navigate = useNavigate();
    const [bankTransactions, setBankTransactions] = useState([]);
    const [erpRecords, setErpRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [banks, setBanks] = useState([]);

    // Filter State
    const [filters, setFilters] = useState({
        bank_id: '',
        start_date: '',
        end_date: '',
        search: '',
        is_reconciled: '', // '' for all, 'true', 'false'
        is_classified: ''
    });

    // Selection State
    const [selectedBankTxns, setSelectedBankTxns] = useState([]);
    const [selectedErpRecords, setSelectedErpRecords] = useState([]);

    const [isAutoMatching, setIsAutoMatching] = useState(false);
    const [isClassifying, setIsClassifying] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);
    const [matchSummary, setMatchSummary] = useState(null);
    const [viewingTxn, setViewingTxn] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'booking_date', direction: 'asc' }); // Default to ASC for sequential flow

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                await fetchBanks();
                if (statementId && statementId !== 'all') {
                    await fetchStatementDetails(statementId);
                } else {
                    await fetchData();
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
                    console.warn(`Statement ${id} not found in list`);
                    setIsLoading(false); // Manually terminate if no statement found
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
        console.log("Fetching data with filters:", filters);
        setIsLoading(true);
        try {
            // Construct query params
            const params = new URLSearchParams();
            if (filters.bank_id) params.append('bank_id', filters.bank_id);
            if (filters.start_date) params.append('start_date', filters.start_date);
            if (filters.end_date) params.append('end_date', filters.end_date);
            if (filters.is_reconciled !== '') params.append('is_reconciled', filters.is_reconciled);
            if (filters.is_classified !== '') params.append('is_classified', filters.is_classified);
            if (filters.search) params.append('search', filters.search);

            console.log("API URL:", `/reconciliation/transactions?${params.toString()}`);
            const [bankData, erpData] = await Promise.all([
                apiRequest(`/reconciliation/transactions?${params.toString()}`, 'GET'),
                Promise.resolve([
                    { id: 101, date: '2026-03-01', ref: 'INV-2024-001', amount: 1500.00, entity: 'Entity A', type: 'AR' },
                    { id: 102, date: '2026-03-02', ref: 'PAY-882193', amount: -240.50, entity: 'Entity B', type: 'AP' },
                ])
            ]);
            console.log("Received bankData:", bankData);
            setBankTransactions(Array.isArray(bankData) ? bankData : []);
            setErpRecords(erpData);
        } catch (err) {
            console.error("Failed to fetch reconciliation data", err);
            setBankTransactions([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAutoMatch = async () => {
        setIsAutoMatching(true);
        setMatchSummary(null);
        try {
            // If statementId is present, we can still run on that specific one, or just run globally
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

    const handleAutoClassify = async () => {
        setIsClassifying(true);
        setMatchSummary(null);
        try {
            const endpoint = statementId
                ? `/reconciliation/statements/${statementId}/classify`
                : `/reconciliation/classify`;
            const result = await apiRequest(endpoint, 'POST');
            setMatchSummary(result.status);
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
            setMatchSummary(result.status);
            fetchData();
        } catch (err) {
            console.error("Link detection failed", err);
        } finally {
            setIsDetecting(false);
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedTransactions = [...bankTransactions].sort((a, b) => {
        const key = sortConfig.key;
        const dir = sortConfig.direction === 'asc' ? 1 : -1;

        let aValue = a[key];
        let bValue = b[key];

        // Handle numeric fields
        const numericFields = ['debit_amount', 'credit_amount', 'running_balance', 'net_amount'];
        if (numericFields.includes(key)) {
            aValue = parseFloat(aValue) || 0;
            bValue = parseFloat(bValue) || 0;
        }

        if (aValue < bValue) return -1 * dir;
        if (aValue > bValue) return 1 * dir;

        // Secondary sort for stability (Bank Statement Order)
        return (a.id - b.id) * dir;
    });

    const handleMatch = async () => {
        // Implement manual match logic
        console.log("Matching", selectedBankTxns, selectedErpRecords);
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col space-y-4">
            {/* Top Header */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-4">
                    <Link to="/corporate-admin/reconciliation/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </Link>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center">
                            {statementId ? 'Statement Workspace' : 'Master Ledger'}
                            {statementId && (
                                <span className="ml-3 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full uppercase tracking-wider underline">#{statementId}</span>
                            )}
                            {!statementId && (
                                <span className="ml-3 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] rounded-full uppercase tracking-wider">All Statements</span>
                            )}
                        </h2>
                        <p className="text-xs text-gray-500">
                            {statementId ? "Processing a specific uploaded file." : "Unified view of all connected bank accounts."}
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    {matchSummary && (
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-100 animate-in fade-in zoom-in duration-300">
                            {matchSummary}
                        </span>
                    )}
                    <button
                        onClick={handleAutoMatch}
                        disabled={isAutoMatching || isClassifying || isLoading}
                        className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isAutoMatching ? 'animate-spin' : ''}`} />
                        {isAutoMatching ? 'Matching...' : 'Auto-Match'}
                    </button>
                    <button
                        onClick={handleAutoClassify}
                        disabled={isAutoMatching || isClassifying || isDetecting || isLoading}
                        className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-all disabled:opacity-50"
                    >
                        <Settings2 className={`w-4 h-4 mr-2 ${isClassifying ? 'animate-spin' : ''}`} />
                        {isClassifying ? 'Running Rules...' : 'Run Rules'}
                    </button>
                    <button
                        onClick={handleDetectRelationships}
                        disabled={isAutoMatching || isClassifying || isDetecting || isLoading}
                        className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-100 border border-indigo-200 transition-all disabled:opacity-50 shadow-sm"
                    >
                        <LinkIcon className={`w-4 h-4 mr-2 ${isDetecting ? 'animate-spin' : ''}`} />
                        {isDetecting ? 'Detecting...' : 'Detect Logic'}
                    </button>
                    <button
                        onClick={handleMatch}
                        disabled={selectedBankTxns.length === 0 || selectedErpRecords.length === 0}
                        className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
                    >
                        <LinkIcon className="w-4 h-4 mr-2" />
                        Confirm Match
                    </button>
                </div>
            </div>

            {/* Global Filter Bar */}
            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-gray-700">Filters:</span>
                </div>

                <div className="flex-1 flex items-center space-x-4">
                    <div className="flex flex-col">
                        <label className="text-[10px] text-gray-400 uppercase font-bold mb-1">Bank Account</label>
                        <select
                            className="bg-gray-50 border-gray-200 rounded-lg text-xs py-1.5 focus:ring-blue-500"
                            value={filters.bank_id}
                            onChange={(e) => setFilters({ ...filters, bank_id: e.target.value })}
                        >
                            <option value="">All Banks</option>
                            {banks.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-[10px] text-gray-400 uppercase font-bold mb-1">From</label>
                        <input
                            type="date"
                            className="bg-gray-50 border-gray-200 rounded-lg text-xs py-1 focus:ring-blue-500"
                            value={filters.start_date}
                            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                        />
                    </div>

                    <div className="flex flex-col">
                        <label className="text-[10px] text-gray-400 uppercase font-bold mb-1">To</label>
                        <input
                            type="date"
                            className="bg-gray-50 border-gray-200 rounded-lg text-xs py-1 focus:ring-blue-500"
                            value={filters.end_date}
                            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                        />
                    </div>

                    <div className="flex flex-col">
                        <label className="text-[10px] text-gray-400 uppercase font-bold mb-1">Status</label>
                        <select
                            className="bg-gray-50 border-gray-200 rounded-lg text-xs py-1.5 focus:ring-blue-500"
                            value={filters.is_reconciled}
                            onChange={(e) => setFilters({ ...filters, is_reconciled: e.target.value })}
                        >
                            <option value="">Status: All</option>
                            <option value="false">Unmatched</option>
                            <option value="true">Reconciled</option>
                        </select>
                    </div>

                    <div className="flex flex-col flex-1">
                        <label className="text-[10px] text-gray-400 uppercase font-bold mb-1">Search Narrative / E2E</label>
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="pl-8 pr-4 py-1.5 bg-gray-50 border-gray-200 rounded-lg text-xs w-full focus:ring-blue-500"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                            />
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            setFilters({ bank_id: '', start_date: '', end_date: '', search: '', is_reconciled: '', is_classified: '' });
                            if (statementId && statementId !== 'all') {
                                navigate('/corporate-admin/reconciliation/workspace');
                            } else {
                                fetchData();
                            }
                        }}
                        className="px-3 py-1.5 text-xs text-gray-500 hover:text-red-600 font-semibold transition-colors"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Main Dual Pane */}
            <div className="flex-1 flex space-x-4 overflow-hidden">
                {/* Left Pane: Bank Transactions */}
                <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col shadow-sm">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                        <h3 className="font-bold text-gray-800 flex items-center">
                            Bank Transactions
                            <span className="ml-2 text-xs font-normal text-gray-500">
                                {isLoading ? '...' : `(${bankTransactions.filter(t => !t.is_reconciled).length} unmatched)`}
                            </span>
                        </h3>
                        <div className="flex items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            {isLoading ? 'Loading Feed...' : `${bankTransactions.length} Transactions`}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white shadow-sm z-10">
                                <tr className="border-b border-gray-100 uppercase text-[10px] text-gray-400 font-bold tracking-widest">
                                    <th className="px-4 py-3 w-10"></th>
                                    <th
                                        className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                                        onClick={() => handleSort('booking_date')}
                                    >
                                        Date {sortConfig.key === 'booking_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3">Company</th>
                                    <th
                                        className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                                        onClick={() => handleSort('raw_description')}
                                    >
                                        Description {sortConfig.key === 'raw_description' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th
                                        className="px-4 py-3 text-right cursor-pointer hover:bg-gray-50 transition-colors"
                                        onClick={() => handleSort('debit_amount')}
                                    >
                                        Amount {sortConfig.key === 'debit_amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th
                                        className="px-4 py-3 text-right cursor-pointer hover:bg-gray-50 transition-colors"
                                        onClick={() => handleSort('running_balance')}
                                    >
                                        Balance {sortConfig.key === 'running_balance' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3">Bank Ref</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-4">
                                                <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
                                                <p className="text-gray-500 font-medium italic">Fetching transactions...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : sortedTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-2 opacity-60">
                                                <Search className="w-12 h-12 text-gray-300" />
                                                <p className="text-gray-900 font-bold">No Transactions Found</p>
                                                <p className="text-sm text-gray-500">Try adjusting your filters or bank selection.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : sortedTransactions.map(txn => (
                                    <tr
                                        key={txn.id}
                                        className={`hover:bg-blue-50 transition-colors cursor-pointer text-sm ${txn.is_reconciled ? 'bg-green-50/20 grayscale-[0.3]' : ''} ${txn.is_reversal ? 'opacity-70 italic' : ''} ${selectedBankTxns.includes(txn.id) ? 'bg-blue-50/80 border-l-4 border-blue-500' : ''}`}
                                        onClick={() => {
                                            if (txn.is_reconciled) return;
                                            setSelectedBankTxns(prev => prev.includes(txn.id) ? prev.filter(id => id !== txn.id) : [...prev, txn.id])
                                        }}
                                    >
                                        <td className="px-4 py-4">
                                            {txn.is_reconciled ? (
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <div className={`w-4 h-4 rounded border ${selectedBankTxns.includes(txn.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'} flex items-center justify-center`}>
                                                    {selectedBankTxns.includes(txn.id) && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-gray-600 font-mono text-xs">
                                            {new Date(txn.booking_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span className="text-xs text-gray-600 font-medium">{txn.company_name || 'N/A'}</span>
                                        </td>
                                        <td className="px-4 py-4 min-w-[200px]">
                                            <div className="flex flex-col">
                                                <div className="flex items-center group/desc">
                                                    <p className="font-medium text-gray-800 line-clamp-1 flex-1" title={txn.raw_description}>{txn.raw_description}</p>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setViewingTxn(txn); }}
                                                        className="ml-2 p-1 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded transition-all opacity-0 group-hover/desc:opacity-100"
                                                        title="View Full Details"
                                                    >
                                                        <Info className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center mt-1 space-x-2">
                                                    {txn.is_reconciled && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[8px] font-bold rounded uppercase">Matched</span>}
                                                    {txn.linked_txn_id && (
                                                        <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[8px] font-bold rounded uppercase flex items-center shadow-sm" title={`Automatically linked to Txn #${txn.linked_txn_id}`}>
                                                            <LinkIcon className="w-2.5 h-2.5 mr-1" />
                                                            Linked
                                                        </span>
                                                    )}
                                                    {txn.is_reversal && (
                                                        <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[8px] font-bold rounded uppercase border border-orange-200">
                                                            Reversal
                                                        </span>
                                                    )}
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center shadow-md border ${txn.applied_rule_id ? 'bg-blue-600 text-white border-blue-700' :
                                                        txn.is_classified ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                            'bg-gray-100 text-gray-400 border-gray-200'
                                                        }`} title={txn.applied_rule_name ? `Rule: ${txn.applied_rule_name}` : 'No rule applied'}>
                                                        {txn.applied_rule_id && <Settings2 className="w-3 h-3 mr-1.5" />}
                                                        {txn.applied_rule_name || txn.internal_category || 'Unclassified'}
                                                    </span>
                                                </div>
                                                {txn.description_line2 && <p className="text-[10px] text-gray-400 mt-1 line-clamp-1" title={txn.description_line2}>{txn.description_line2}</p>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right">
                                            <div className="flex flex-col items-end">
                                                <span className={`text-sm font-black ${txn.credit_amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {txn.credit_amount > 0 ? `+${txn.credit_amount.toLocaleString()}` : `-${txn.debit_amount.toLocaleString()}`}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-normal">{txn.currency}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-gray-900 font-bold text-sm">
                                            {txn.running_balance?.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-500 font-mono">{txn.back_office_ref || 'No BO Ref'}</span>
                                                <span className="text-[9px] text-gray-400">E2E: {txn.e2e_id || 'N/A'}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Center Divider/Action Area (Optional) */}
                <div className="flex flex-col justify-center">
                    <div className="bg-white p-2 rounded-full shadow-md border border-gray-200 text-blue-600">
                        <ArrowRight className="w-6 h-6" />
                    </div>
                </div>

                {/* Right Pane: ERP Records */}
                <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col shadow-sm">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                        <h3 className="font-bold text-gray-800 flex items-center">
                            System Records (ERP)
                            <span className="ml-2 text-xs font-normal text-gray-500">AP/AR/Treasury</span>
                        </h3>
                        <div className="flex space-x-2">
                            <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Filter className="w-4 h-4" /></button>
                            <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Plus className="w-4 h-4" /></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white shadow-sm z-10">
                                <tr className="border-b border-gray-100 uppercase text-[10px] text-gray-400 font-bold tracking-widest">
                                    <th className="px-4 py-3 w-10"></th>
                                    <th className="px-4 py-3">Source</th>
                                    <th className="px-4 py-3">Internal Ref</th>
                                    <th className="px-4 py-3 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {erpRecords.map(rec => (
                                    <tr
                                        key={rec.id}
                                        className={`hover:bg-blue-50 transition-colors cursor-pointer text-sm ${selectedErpRecords.includes(rec.id) ? 'bg-blue-50/80 border-l-4 border-blue-500' : ''}`}
                                        onClick={() => {
                                            setSelectedErpRecords(prev => prev.includes(rec.id) ? prev.filter(id => id !== rec.id) : [...prev, rec.id])
                                        }}
                                    >
                                        <td className="px-4 py-4">
                                            <div className={`w-4 h-4 rounded border ${selectedErpRecords.includes(rec.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'} flex items-center justify-center`}>
                                                {selectedErpRecords.includes(rec.id) && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${rec.type === 'AR' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {rec.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="font-medium text-gray-800">{rec.ref}</p>
                                            <span className="text-[10px] text-gray-400">{rec.entity} • {rec.date}</span>
                                        </td>
                                        <td className={`px-4 py-4 text-right font-bold ${rec.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {rec.amount.toLocaleString()} EGP
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {/* Transaction Detail Modal */}
            {viewingTxn && (
                <div className="fixed inset-0 z-[100] flex items-center justify-end bg-black/20 backdrop-blur-sm">
                    <div className="w-[450px] h-full bg-white shadow-2xl border-l border-gray-200 animate-in slide-in-from-right duration-300 flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Transaction Details</h3>
                                <p className="text-xs text-gray-500">Full audit trail and narrative</p>
                            </div>
                            <button
                                onClick={() => setViewingTxn(null)}
                                className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            {/* Narrative Section */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Narrative Description</label>
                                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-sm leading-relaxed text-gray-800 font-medium">
                                    {viewingTxn.raw_description}
                                    {viewingTxn.description_line2 && (
                                        <div className="mt-2 pt-2 border-t border-blue-100/50 text-gray-500 text-xs font-normal">
                                            {viewingTxn.description_line2}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Financial Details */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Amount</label>
                                    <p className={`text-xl font-black ${viewingTxn.credit_amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {viewingTxn.credit_amount > 0 ? `+${viewingTxn.credit_amount.toLocaleString()}` : `-${viewingTxn.debit_amount.toLocaleString()}`}
                                        <span className="ml-1 text-xs text-gray-400 font-normal">{viewingTxn.currency}</span>
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Booking Date</label>
                                    <p className="text-gray-900 font-semibold">{new Date(viewingTxn.booking_date).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                                </div>
                            </div>

                            {/* Classification Traceability */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rule Traceability</label>
                                <div className={`p-4 rounded-xl border ${viewingTxn.applied_rule_id ? 'bg-blue-600 border-blue-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold uppercase tracking-wider flex items-center">
                                            {viewingTxn.applied_rule_id ? <Settings2 className="w-4 h-4 mr-2" /> : <Info className="w-4 h-4 mr-2" />}
                                            {viewingTxn.applied_rule_id ? 'Classification Match' : 'Manual / No Match'}
                                        </span>
                                        {viewingTxn.applied_rule_id && <span className="text-[10px] opacity-70">ID: {viewingTxn.applied_rule_id}</span>}
                                    </div>
                                    <p className="font-black text-lg">{viewingTxn.applied_rule_name || viewingTxn.internal_category || 'Unclassified'}</p>
                                    {viewingTxn.applied_rule_name && (
                                        <p className="mt-1 text-xs opacity-80">This transaction was automatically mapped using the rule engine based on the description logic.</p>
                                    )}
                                </div>
                            </div>

                            {/* Technical Meta */}
                            <div className="pt-6 border-t border-gray-100 grid grid-cols-2 gap-y-6">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Bank Reference</label>
                                    <code className="text-[11px] bg-gray-100 px-2 py-1 rounded text-gray-600">{viewingTxn.back_office_ref || 'N/A'}</code>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">E2E ID</label>
                                    <code className="text-[11px] bg-gray-100 px-2 py-1 rounded text-gray-600">{viewingTxn.e2e_id || 'N/A'}</code>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Internal Status</label>
                                    <p className="text-xs">
                                        {viewingTxn.is_reconciled ? (
                                            <span className="text-green-600 font-bold flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> Reconciled</span>
                                        ) : (
                                            <span className="text-orange-500 font-bold flex items-center"><RefreshCw className="w-3 h-3 mr-1" /> Pending Match</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                            <button
                                onClick={() => setViewingTxn(null)}
                                className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-sm"
                            >
                                Close Detail View
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReconciliationWorkspace;
