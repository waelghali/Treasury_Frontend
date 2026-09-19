import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Trash2, Edit2, CheckCircle2, X, Building, UserCheck, Eye, Shield, Mail, User, ChevronDown, ArrowLeft } from 'lucide-react';
import apiClient from '../../services/apiClient';

export default function QuotationBanksModal({ onClose }) {
    const [banks, setBanks] = useState([]);
    const [systemBanks, setSystemBanks] = useState([]);
    const [entities, setEntities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingBankId, setEditingBankId] = useState(null);

    const [bankSearchTerm, setBankSearchTerm] = useState('');
    const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
    const bankDropdownRef = useRef(null);

    const [formData, setFormData] = useState({
        bank_id: '',
        trade_type: 'BOTH',
        entity_scope: 'ALL_ENTITIES',
        entity_ids: [],
        contacts: []
    });

    const [newContact, setNewContact] = useState({
        email: '',
        name: '',
        role: 'EXECUTION'
    });
    const [roleNotice, setRoleNotice] = useState(null);

    useEffect(() => {
        fetchBanks();
        fetchSystemBanks();
        fetchEntities();
    }, []);

    useEffect(() => {
        function handleClickOutside(event) {
            if (bankDropdownRef.current && !bankDropdownRef.current.contains(event.target)) {
                setIsBankDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchEntities = async () => {
        try {
            const res = await apiClient.get('/end-user/quotations/entities');
            setEntities(res.data || []);
        } catch (error) {
            console.error('Failed to fetch entities:', error);
        }
    };

    const fetchBanks = async () => {
        try {
            const res = await apiClient.get('/end-user/quotations/banks');
            setBanks(res.data);
        } catch (error) {
            console.error('Failed to fetch configured banks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSystemBanks = async () => {
        try {
            const res = await apiClient.get('/corporate-admin/banks');
            setSystemBanks(res.data || []);
        } catch (error) {
            console.error('Failed to fetch system banks:', error);
        }
    };

    const handleAddContactToForm = () => {
        const email = newContact.email.trim();
        if (!email) {
            alert('Please enter a valid contact email address.');
            return;
        }

        const existingIdx = formData.contacts.findIndex(
            c => c.email.trim().toLowerCase() === email.toLowerCase()
        );

        if (existingIdx >= 0) {
            const existing = formData.contacts[existingIdx];
            // Conflict check between APPROVER and EXECUTION
            if (existing.role === 'EXECUTION' && newContact.role === 'APPROVER') {
                setRoleNotice(`Contact ${email} is already an Execution dealer. Dealers provide embedded approval by submitting a quote directly. APPROVER role was not added.`);
                return;
            } else if (existing.role === 'APPROVER' && newContact.role === 'EXECUTION') {
                // Auto-convert APPROVER to EXECUTION and notify
                setFormData({
                    ...formData,
                    contacts: formData.contacts.map((c, idx) =>
                        idx === existingIdx ? { ...c, role: 'EXECUTION', name: newContact.name || c.name } : c
                    )
                });
                setNewContact({ email: '', name: '', role: 'EXECUTION' });
                setRoleNotice(`Contact ${email} was previously an Approver. Converted to Execution dealer (provides embedded approval). APPROVER role was replaced.`);
                return;
            } else {
                alert(`This contact (${email}) is already added with role: ${existing.role}`);
                return;
            }
        }

        setFormData({
            ...formData,
            contacts: [...formData.contacts, { ...newContact, email }]
        });
        setNewContact({ email: '', name: '', role: 'EXECUTION' });
        setRoleNotice(null);
    };

    const handleRemoveContactFromForm = (indexToRemove) => {
        setFormData({
            ...formData,
            contacts: formData.contacts.filter((_, idx) => idx !== indexToRemove)
        });
        setRoleNotice(null);
    };

    const handleSetContactRole = (index, newRole) => {
        setRoleNotice(null);
        setFormData(prev => ({
            ...prev,
            contacts: prev.contacts.map((c, idx) => (idx === index ? { ...c, role: newRole } : c))
        }));
    };

    const handleToggleContactRole = (index) => {
        setRoleNotice(null);
        setFormData({
            ...formData,
            contacts: formData.contacts.map((c, idx) => {
                if (idx !== index) return c;
                let nextRole = 'EXECUTION';
                if (c.role === 'EXECUTION') nextRole = 'VIEW_ONLY';
                else if (c.role === 'VIEW_ONLY') nextRole = 'APPROVER';
                else if (c.role === 'APPROVER') nextRole = 'EXECUTION';
                return {
                    ...c,
                    role: nextRole
                };
            })
        });
    };

    const handleStartEdit = (bank) => {
        setRoleNotice(null);
        let parsedContacts = bank.contacts || [];
        if (!parsedContacts.length && bank.emails) {
            parsedContacts = bank.emails.split(',').map(e => ({
                email: e.trim(),
                name: '',
                role: 'EXECUTION'
            })).filter(c => c.email);
        }
        setFormData({
            bank_id: bank.bank_id,
            trade_type: bank.trade_type || 'BOTH',
            entity_scope: bank.entity_scope || 'ALL_ENTITIES',
            entity_ids: bank.entity_ids || [],
            contacts: parsedContacts
        });
        setBankSearchTerm('');
        setIsBankDropdownOpen(false);
        setEditingBankId(bank.id);
        setIsAdding(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.bank_id) {
            alert('Please select a System Bank entity.');
            return;
        }

        // Sanitize: ensure no dual APPROVER + EXECUTION for same email
        const contactMap = new Map();
        for (const c of formData.contacts) {
            if (!c.email || !c.email.trim()) continue;
            const norm = c.email.trim().toLowerCase();
            if (!contactMap.has(norm)) {
                contactMap.set(norm, { ...c, email: c.email.trim() });
            } else {
                const existing = contactMap.get(norm);
                if (existing.role === 'APPROVER' && c.role === 'EXECUTION') {
                    contactMap.set(norm, { ...c, email: c.email.trim() });
                }
            }
        }
        const validContacts = Array.from(contactMap.values());
        if (validContacts.length === 0) {
            alert('Please add at least one contact email address.');
            return;
        }

        // Enforce: At least 1 Execution Dealer or Approver
        const hasExecutionOrApprover = validContacts.some(c => c.role === 'EXECUTION' || c.role === 'APPROVER');
        if (!hasExecutionOrApprover) {
            alert('Counterparty configuration requires at least one contact with an Execution Dealer (⚡) or Approver (🛡️) role. View-Only contacts alone cannot execute trades.');
            return;
        }

        if (formData.entity_scope === 'SPECIFIC_ENTITIES' && (!formData.entity_ids || formData.entity_ids.length === 0)) {
            alert('Please select at least one Legal Entity for this counterparty bank.');
            return;
        }

        try {
            await apiClient.post('/end-user/quotations/banks', {
                bank_id: parseInt(formData.bank_id),
                trade_type: formData.trade_type,
                entity_scope: formData.entity_scope,
                entity_ids: formData.entity_scope === 'SPECIFIC_ENTITIES' ? formData.entity_ids : [],
                contacts: validContacts
            });
            setIsAdding(false);
            setEditingBankId(null);
            setRoleNotice(null);
            setBankSearchTerm('');
            setIsBankDropdownOpen(false);
            setFormData({
                bank_id: '',
                trade_type: 'BOTH',
                entity_scope: 'ALL_ENTITIES',
                entity_ids: [],
                contacts: []
            });
            fetchBanks();
        } catch (error) {
            alert('Failed to configure bank. ' + (error.response?.data?.detail || 'It may already exist for this trade type.'));
        }
    };

    const handleDelete = async (bankId) => {
        if (!window.confirm('Are you sure you want to remove this bank from the counterparty roster?')) return;
        try {
            await apiClient.delete(`/end-user/quotations/banks/${bankId}`);
            fetchBanks();
        } catch (error) {
            alert('Failed to remove bank configuration.');
        }
    };

    const getTradeTypeLabel = (type) => {
        switch (type) {
            case 'FX_SPOT': return 'FX Spot Only';
            case 'TBILL': return 'T-Bills Only';
            case 'BOTH': return 'FX & T-Bills';
            default: return type;
        }
    };

    const getTradeTypeBadgeColor = (type) => {
        switch (type) {
            case 'FX_SPOT': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'TBILL': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'BOTH': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const selectedSystemBank = systemBanks.find(b => String(b.id) === String(formData.bank_id));
    const filteredSystemBanks = systemBanks.filter(b => {
        if (!bankSearchTerm.trim()) return true;
        const term = bankSearchTerm.toLowerCase();
        return (b.name && b.name.toLowerCase().includes(term)) ||
               (b.swift_code && b.swift_code.toLowerCase().includes(term)) ||
               (b.code && b.code.toLowerCase().includes(term));
    });

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm overflow-y-auto h-full w-full flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-gray-100 overflow-hidden">

                {/* Header Ribbon */}
                <div className="bg-gradient-to-r from-gray-950 via-slate-900 to-gray-900 text-white px-6 py-3.5 sm:py-4 flex justify-between items-center shrink-0 border-b border-gray-800">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2.5 tracking-tight">
                            <Building className="w-5 h-5 text-blue-400" />
                            Quotation Banks & Counterparty Roster
                        </h2>
                        <p className="text-slate-400 text-xs mt-0.5">Configure external bank counterparties, desk contacts, and role permissions (⚡ Execution vs 👁️ View-Only vs 🛡️ Approver).</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-3.5 bg-slate-50/50 min-h-0">

                    {!isAdding ? (
                        /* ==================== VIEW 1: ROSTER TABLE ==================== */
                        <>
                            <div className="flex justify-between items-center shrink-0">
                                <div className="text-xs text-gray-500 font-medium">
                                    {banks.length} Counterparty {banks.length === 1 ? 'Bank' : 'Banks'} Configured
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingBankId(null);
                                        setRoleNotice(null);
                                        setBankSearchTerm('');
                                        setIsBankDropdownOpen(false);
                                        setFormData({
                                            bank_id: '',
                                            trade_type: 'BOTH',
                                            entity_scope: 'ALL_ENTITIES',
                                            entity_ids: [],
                                            contacts: []
                                        });
                                        setIsAdding(true);
                                    }}
                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-sm hover:bg-blue-700 transition-all cursor-pointer"
                                >
                                    <Plus size={15} />
                                    Add Counterparty Bank
                                </button>
                            </div>

                            {/* Main Table */}
                            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 flex flex-col min-h-0 overflow-hidden">
                                <div className="overflow-auto max-h-[58vh] min-h-0">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 z-10 bg-slate-50 shadow-2xs">
                                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider bg-slate-50">Bank Partner</th>
                                                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider bg-slate-50">Trade Types</th>
                                                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider bg-slate-50">Desk Contacts & Permissions</th>
                                                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-right bg-slate-50">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {isLoading ? (
                                                <tr><td colSpan="4" className="p-12 text-center text-slate-400 text-sm font-medium">Loading bank counterparties...</td></tr>
                                            ) : banks.length === 0 ? (
                                                <tr><td colSpan="4" className="p-12 text-center text-slate-400 text-sm font-medium">No quotation counterparties configured yet. Click "Add Counterparty Bank" to begin.</td></tr>
                                            ) : (
                                                banks.map(bank => {
                                                    const contactsList = (bank.contacts && bank.contacts.length > 0)
                                                        ? bank.contacts
                                                        : (bank.emails ? bank.emails.split(',').map(e => ({ email: e.trim(), name: '', role: 'EXECUTION' })) : []);

                                                    const execCount = contactsList.filter(c => c.role === 'EXECUTION').length;
                                                    const viewCount = contactsList.filter(c => c.role === 'VIEW_ONLY').length;
                                                    const approverCount = contactsList.filter(c => c.role === 'APPROVER').length;

                                                    return (
                                                        <tr key={bank.id} className="hover:bg-slate-50/70 transition-colors">
                                                            <td className="py-3.5 px-4">
                                                                <div className="font-bold text-gray-900 text-sm">{bank.bank?.name || `Bank #${bank.bank_id}`}</div>
                                                                <div className="text-[11px] text-gray-400 font-mono">ID: {bank.bank_id}</div>
                                                            </td>
                                                            <td className="py-3.5 px-4">
                                                                <div className="flex flex-col gap-1 items-start">
                                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getTradeTypeBadgeColor(bank.trade_type)}`}>
                                                                        {getTradeTypeLabel(bank.trade_type)}
                                                                    </span>
                                                                    {entities.length > 1 && (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                                            {bank.entity_scope === 'SPECIFIC_ENTITIES'
                                                                                ? `🏢 ${bank.entity_ids?.length || 0} Specific ${bank.entity_ids?.length === 1 ? 'Entity' : 'Entities'}`
                                                                                : '🌐 All Entities'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-3.5 px-4">
                                                                <div className="flex flex-wrap gap-1.5 max-w-xl">
                                                                    {contactsList.map((c, i) => (
                                                                        <span
                                                                            key={i}
                                                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border ${
                                                                                c.role === 'EXECUTION'
                                                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                                    : c.role === 'APPROVER'
                                                                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                                                            }`}
                                                                        >
                                                                            {c.role === 'EXECUTION' ? (
                                                                                <span className="text-[10px] font-sans font-bold bg-emerald-200 text-emerald-900 px-1 rounded">EXEC</span>
                                                                            ) : c.role === 'APPROVER' ? (
                                                                                <span className="text-[10px] font-sans font-bold bg-amber-200 text-amber-900 px-1 rounded">APPROVER</span>
                                                                            ) : (
                                                                                <span className="text-[10px] font-sans font-bold bg-slate-200 text-slate-800 px-1 rounded">VIEW</span>
                                                                            )}
                                                                            <span>{c.email}</span>
                                                                            {c.name && <span className="text-gray-400 font-sans text-[10px]">({c.name})</span>}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                                <div className="text-[11px] text-slate-400 mt-1 font-medium">
                                                                    {execCount} Execution &bull; {viewCount} View-Only{approverCount > 0 ? ` \u2022 ${approverCount} Approver` : ''}
                                                                </div>
                                                            </td>
                                                            <td className="py-3.5 px-4 text-right">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <button
                                                                        onClick={() => handleStartEdit(bank)}
                                                                        className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors bg-white rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-100 cursor-pointer"
                                                                        title="Edit Bank & Contacts"
                                                                    >
                                                                        <Edit2 size={15} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete(bank.id)}
                                                                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors bg-white rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100 cursor-pointer"
                                                                        title="Remove Counterparty"
                                                                    >
                                                                        <Trash2 size={15} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* ==================== VIEW 2: ADD / EDIT FORM ==================== */
                        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 animate-fade-in flex flex-col">
                            <div className="flex justify-between items-center mb-3.5 pb-2.5 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setIsAdding(false); setEditingBankId(null); setRoleNotice(null); }}
                                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                    >
                                        <ArrowLeft size={14} /> Back to Roster
                                    </button>
                                    <div className="h-4 w-px bg-slate-200" />
                                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                                        <Shield className="w-4 h-4 text-blue-600" />
                                        {editingBankId ? 'Edit Bank Counterparty & Contacts' : 'Configure New Bank Counterparty'}
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setIsAdding(false); setEditingBankId(null); setRoleNotice(null); }}
                                    className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-3.5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                    {/* Searchable Bank Dropdown */}
                                    <div className="relative" ref={bankDropdownRef}>
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">Select System Bank</label>
                                        
                                        {editingBankId ? (
                                            <div
                                                className="w-full px-3.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-gray-700 flex items-center justify-between"
                                                style={{ height: '40px', boxSizing: 'border-box' }}
                                            >
                                                <span>{selectedSystemBank?.name || 'Selected Bank'}</span>
                                                <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded">Locked in edit</span>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                {selectedSystemBank && !isBankDropdownOpen ? (
                                                    <div
                                                        onClick={() => setIsBankDropdownOpen(true)}
                                                        className="w-full px-3.5 rounded-xl bg-blue-50/50 border border-blue-200 text-xs text-blue-950 font-semibold flex items-center justify-between cursor-pointer hover:bg-blue-50 transition-all"
                                                        style={{ height: '40px', boxSizing: 'border-box' }}
                                                    >
                                                        <div className="flex items-center gap-2 truncate">
                                                            <Building className="w-4 h-4 text-blue-600 shrink-0" />
                                                            <span className="truncate">{selectedSystemBank.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setFormData({ ...formData, bank_id: '' });
                                                                    setBankSearchTerm('');
                                                                    setIsBankDropdownOpen(true);
                                                                }}
                                                                className="p-1 text-slate-400 hover:text-red-500 rounded-md hover:bg-white/60 transition-colors cursor-pointer"
                                                                title="Clear selected bank"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                            <ChevronDown className="w-4 h-4 text-slate-400" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="relative">
                                                        <Search
                                                            className="w-4 h-4 text-slate-400 absolute pointer-events-none"
                                                            style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Type bank name or SWIFT to search..."
                                                            className="w-full rounded-xl bg-slate-50 border border-slate-300 text-xs focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                                            style={{ height: '40px', paddingLeft: '38px', paddingRight: bankSearchTerm ? '54px' : '36px', boxSizing: 'border-box' }}
                                                            value={bankSearchTerm}
                                                            onFocus={() => setIsBankDropdownOpen(true)}
                                                            onChange={(e) => {
                                                                setBankSearchTerm(e.target.value);
                                                                setIsBankDropdownOpen(true);
                                                            }}
                                                        />
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                                            {bankSearchTerm && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setBankSearchTerm('')}
                                                                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors cursor-pointer"
                                                                    title="Clear search"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            )}
                                                            <ChevronDown
                                                                className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${isBankDropdownOpen ? 'rotate-180' : ''}`}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Dropdown Menu */}
                                                {isBankDropdownOpen && !editingBankId && (
                                                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 max-h-56 overflow-y-auto z-50 divide-y divide-slate-100">
                                                        {filteredSystemBanks.length === 0 ? (
                                                            <div className="px-4 py-3 text-xs text-slate-400 text-center">
                                                                No banks found matching "{bankSearchTerm}"
                                                            </div>
                                                        ) : (
                                                            filteredSystemBanks.map((b) => {
                                                                const isSelected = String(b.id) === String(formData.bank_id);
                                                                return (
                                                                    <div
                                                                        key={b.id}
                                                                        onClick={() => {
                                                                            setFormData({ ...formData, bank_id: b.id });
                                                                            setBankSearchTerm('');
                                                                            setIsBankDropdownOpen(false);
                                                                        }}
                                                                        className={`px-3.5 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                                                            isSelected ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700 hover:bg-slate-50'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center gap-2 truncate">
                                                                            <Building className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                                                                            <span className="truncate">{b.name}</span>
                                                                        </div>
                                                                        {b.swift_code && (
                                                                            <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded ml-2 shrink-0">
                                                                                {b.swift_code}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">Trade Type Routing</label>
                                        <select
                                            className="w-full px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-gray-700 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                                            style={{ height: '40px', boxSizing: 'border-box' }}
                                            value={formData.trade_type}
                                            onChange={(e) => setFormData({ ...formData, trade_type: e.target.value })}
                                        >
                                            <option value="BOTH">FX Spot & T-Bills (Both)</option>
                                            <option value="FX_SPOT">FX Spot Only</option>
                                            <option value="TBILL">T-Bills Only</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Legal Entity Scope (shown when customer has multiple entities) */}
                                {entities.length > 1 && (
                                    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                                                    <Building className="w-3.5 h-3.5 text-indigo-600" />
                                                    Legal Entity Scope
                                                </label>
                                                <p className="text-[11px] text-gray-500 mt-0.5">
                                                    Define whether this counterparty can quote for all company legal entities or specific entities only.
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, entity_scope: 'ALL_ENTITIES', entity_ids: [] })}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                                        formData.entity_scope === 'ALL_ENTITIES'
                                                            ? 'bg-indigo-600 text-white shadow-2xs'
                                                            : 'bg-white text-gray-600 border border-slate-200 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    🌐 All Entities
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, entity_scope: 'SPECIFIC_ENTITIES' })}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                                        formData.entity_scope === 'SPECIFIC_ENTITIES'
                                                            ? 'bg-indigo-600 text-white shadow-2xs'
                                                            : 'bg-white text-gray-600 border border-slate-200 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    🏢 Specific Entities
                                                </button>
                                            </div>
                                        </div>

                                        {formData.entity_scope === 'SPECIFIC_ENTITIES' && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2.5 pt-2.5 border-t border-slate-200 max-h-32 overflow-y-auto">
                                                {entities.map(ent => {
                                                    const isChecked = (formData.entity_ids || []).includes(ent.id);
                                                    return (
                                                        <label
                                                            key={ent.id}
                                                            className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                                                                isChecked
                                                                    ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 font-medium shadow-2xs'
                                                                    : 'bg-white border-slate-200 text-gray-700 hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setFormData({
                                                                            ...formData,
                                                                            entity_ids: [...(formData.entity_ids || []), ent.id]
                                                                        });
                                                                    } else {
                                                                        setFormData({
                                                                            ...formData,
                                                                            entity_ids: (formData.entity_ids || []).filter(id => id !== ent.id)
                                                                        });
                                                                    }
                                                                }}
                                                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                                            />
                                                            <div className="truncate">
                                                                <span className="font-bold font-mono text-[10px] block text-indigo-900">{ent.code}</span>
                                                                <span className="truncate text-gray-600 text-[10px] block">{ent.entity_name || ent.name}</span>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Desk Contacts & Role Permissions */}
                                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                                                <Mail className="w-3.5 h-3.5 text-blue-600" />
                                                Desk Contacts & Roles
                                            </label>
                                            <p className="text-[11px] text-gray-500 mt-0.5">Define who can execute quotes (⚡), observe (👁️), or approve bank participation (🛡️).</p>
                                        </div>
                                    </div>

                                    {/* Add Contact Input Bar */}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs items-center">
                                        <div className="md:col-span-5">
                                            <input
                                                type="email"
                                                placeholder="trader@bank.com (Email)"
                                                className="w-full text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                                style={{ height: '40px', padding: '0 12px', boxSizing: 'border-box' }}
                                                value={newContact.email}
                                                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <input
                                                type="text"
                                                placeholder="Name / Title (Optional)"
                                                className="w-full text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                                style={{ height: '40px', padding: '0 12px', boxSizing: 'border-box' }}
                                                value={newContact.name}
                                                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <select
                                                className="w-full text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-semibold text-gray-700 bg-white transition-all cursor-pointer"
                                                style={{ height: '40px', padding: '0 10px', boxSizing: 'border-box' }}
                                                value={newContact.role}
                                                onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                                            >
                                                <option value="EXECUTION">⚡ Execution</option>
                                                <option value="VIEW_ONLY">👁️ View Only</option>
                                                <option value="APPROVER">🛡️ Approver</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <button
                                                type="button"
                                                onClick={handleAddContactToForm}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                                                style={{ height: '40px', padding: '0 12px', boxSizing: 'border-box' }}
                                            >
                                                <Plus size={15} /> Add
                                            </button>
                                        </div>
                                    </div>

                                    {/* Role Notice Banner */}
                                    {roleNotice && (
                                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2 animate-fade-in">
                                            <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                            <div className="flex-1">{roleNotice}</div>
                                            <button type="button" onClick={() => setRoleNotice(null)} className="text-amber-500 hover:text-amber-700 p-0.5 cursor-pointer">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Configured Contacts List */}
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                        {formData.contacts.length === 0 ? (
                                            <div className="py-2.5 px-3 rounded-xl border border-dashed border-slate-300 bg-white/70 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                                                <span className="font-semibold text-slate-700">No desk contacts added yet.</span>
                                                <span className="text-[11px] text-slate-500">Add at least one contact with <strong>Execution (⚡)</strong> or <strong>Approver (🛡️)</strong> role above.</span>
                                            </div>
                                        ) : (
                                            formData.contacts.map((c, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`p-1 rounded-lg ${
                                                            c.role === 'EXECUTION'
                                                                ? 'bg-emerald-50 text-emerald-600'
                                                                : c.role === 'APPROVER'
                                                                ? 'bg-amber-50 text-amber-600'
                                                                : 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                            {c.role === 'EXECUTION' ? <UserCheck size={14} /> : c.role === 'APPROVER' ? <Shield size={14} /> : <Eye size={14} />}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-mono font-bold text-gray-900">{c.email}</span>
                                                            {c.name && <span className="text-[11px] text-gray-500 font-medium">({c.name})</span>}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <div className="relative flex items-center">
                                                            <select
                                                                value={c.role}
                                                                onChange={(e) => handleSetContactRole(idx, e.target.value)}
                                                                className={`appearance-none text-[11px] font-bold tracking-wide rounded-lg border pl-2.5 pr-7 py-1 outline-none transition-all cursor-pointer shadow-2xs ${
                                                                    c.role === 'EXECUTION'
                                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100/80 focus:ring-1 focus:ring-emerald-400'
                                                                        : c.role === 'APPROVER'
                                                                        ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100/80 focus:ring-1 focus:ring-amber-400'
                                                                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200/80 focus:ring-1 focus:ring-slate-400'
                                                                }`}
                                                                title="Change desk contact role"
                                                            >
                                                                <option value="EXECUTION">⚡ Execution Dealer</option>
                                                                <option value="APPROVER">🛡️ Approver</option>
                                                                <option value="VIEW_ONLY">👁️ View Only</option>
                                                            </select>
                                                            <ChevronDown className="w-3.5 h-3.5 absolute right-2 pointer-events-none text-slate-500" />
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveContactFromForm(idx)}
                                                            className="p-1 text-gray-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                                                            title="Remove contact"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2.5 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => { setIsAdding(false); setEditingBankId(null); }}
                                        className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                                    >
                                        {editingBankId ? 'Save Changes' : 'Save Counterparty'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                </div>

                {/* Footer (Shown on Roster Table View only) */}
                {!isAdding && (
                    <div className="px-6 py-3 border-t border-slate-200 bg-white flex justify-end shrink-0">
                        <button
                            onClick={onClose}
                            className="px-5 py-2 bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
                        >
                            Close Manager
                        </button>
                    </div>
                )}

            </div>
        </div>
    );

}
