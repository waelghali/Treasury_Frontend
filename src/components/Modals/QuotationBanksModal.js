import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Trash2, Edit2, CheckCircle2, X, Building, UserCheck, Eye, Shield, Mail, User, ChevronDown, ArrowLeft, RefreshCw, Clock } from 'lucide-react';
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
        contacts: [],
        authorized_contact_email: '',
        authorized_contact_name: ''
    });

    const [newContact, setNewContact] = useState({
        email: '',
        name: '',
        role: 'EXECUTION'
    });
    const [roleNotice, setRoleNotice] = useState(null);
    const [isSendingReport, setIsSendingReport] = useState(false);
    const [reportSentSuccess, setReportSentSuccess] = useState(null);
    const [pendingInvitations, setPendingInvitations] = useState([]);
    const [isInvitingContact, setIsInvitingContact] = useState(false);
    const [rosterSearch, setRosterSearch] = useState('');
    const [rosterEntityFilter, setRosterEntityFilter] = useState('ALL');
    const [rosterTradeTypeFilter, setRosterTradeTypeFilter] = useState('ALL');
    const [rosterRoleFilter, setRosterRoleFilter] = useState('ALL');

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

    const fetchPendingInvitations = async (bankId) => {
        if (!bankId) {
            setPendingInvitations([]);
            return;
        }
        try {
            const res = await apiClient.get(`/end-user/quotations/banks/${bankId}/invitations`);
            setPendingInvitations(res.data || []);
        } catch (err) {
            console.error('Failed to fetch pending invitations:', err);
        }
    };

    const handleResendInvitation = async (invitationId, email) => {
        try {
            await apiClient.post(`/end-user/quotations/banks/invitations/${invitationId}/resend`);
            alert(`Invitation link successfully resent to ${email}!`);
        } catch (err) {
            alert('Failed to resend invitation: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleRevokeInvitation = async (invitationId) => {
        if (!window.confirm('Are you sure you want to cancel this pending dealer invitation?')) return;
        try {
            await apiClient.delete(`/end-user/quotations/banks/invitations/${invitationId}`);
            setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        } catch (err) {
            alert('Failed to cancel invitation: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleAddContactToForm = async () => {
        const email = newContact.email.trim();
        if (!email || !email.includes('@')) {
            alert('Please enter a valid contact email address.');
            return;
        }

        // --- Negative List & Anti-Collusion Validation ---
        const DISALLOWED_PUBLIC_DOMAINS = [
            'gmail.com', 'googlemail.com',
            'yahoo.com', 'ymail.com', 'rocketmail.com', 'yahoo.co.uk', 'yahoo.fr',
            'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
            'icloud.com', 'me.com', 'mac.com',
            'proton.me', 'protonmail.com',
            'mail.com', 'email.com',
            'zoho.com', 'zohomail.com',
            'yandex.com', 'yandex.ru',
            'gmx.com', 'gmx.net',
            'aol.com', 'aim.com',
            'mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com'
        ];

        // Explicit whitelist for authorized testing counterparty accounts
        const isWhitelistedTest = /^waelghali79(\+.*)?@gmail\.com$/i.test(email);

        if (!isWhitelistedTest) {
            const domain = email.split('@')[1]?.toLowerCase().trim();

            // 1. If bank has official registered email_domain, enforce domain match
            const selectedBank = systemBanks.find(b => String(b.id) === String(formData.bank_id));
            if (selectedBank?.email_domain) {
                const expectedDomain = selectedBank.email_domain.toLowerCase().trim().replace(/^@/, '');
                const isDomainMatch = domain === expectedDomain || (domain && domain.endsWith(`.${expectedDomain}`));
                if (!isDomainMatch) {
                    alert(`Contact email domain (@${domain}) does not match the official registered domain (@${expectedDomain}) for ${selectedBank.name}.`);
                    return;
                }
            }

            // 2. Block public / disposable email domains
            if (domain && DISALLOWED_PUBLIC_DOMAINS.includes(domain)) {
                alert(`Registration with personal or public email providers (@${domain}) is prohibited for bank counterparties. Please use the representative's official corporate banking email address.`);
                return;
            }
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

        // If editing an existing bank configuration, stage and dispatch dealer invitation immediately!
        if (editingBankId && formData.bank_id) {
            try {
                setIsInvitingContact(true);
                const res = await apiClient.post(`/end-user/quotations/banks/${formData.bank_id}/invite-contact`, {
                    email,
                    title: newContact.name ? newContact.name.trim() : null,
                    role: newContact.role || 'EXECUTION'
                });
                setPendingInvitations(prev => [res.data, ...prev]);
                setNewContact({ email: '', name: '', role: 'EXECUTION' });
                setRoleNotice(`Invitation successfully emailed to ${email}! They will be activated once they accept their invitation link.`);
            } catch (err) {
                alert('Failed to send invitation: ' + (err.response?.data?.detail || err.message));
            } finally {
                setIsInvitingContact(false);
            }
            return;
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
        setReportSentSuccess(null);
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
            contacts: parsedContacts,
            authorized_contact_email: bank.authorized_contact_email || '',
            authorized_contact_name: bank.authorized_contact_name || ''
        });
        setBankSearchTerm('');
        setIsBankDropdownOpen(false);
        setEditingBankId(bank.id);
        setIsAdding(true);
        fetchPendingInvitations(bank.bank_id);
    };

    const handleSendRosterReport = async () => {
        if (!editingBankId) return;
        const email = (formData.authorized_contact_email || '').trim();
        if (!email || !email.includes('@')) {
            alert('Please enter a valid Authorized Officer Email first and click Save Changes.');
            return;
        }
        setIsSendingReport(true);
        setReportSentSuccess(null);
        try {
            const res = await apiClient.post(`/end-user/quotations/banks/${editingBankId}/send-roster-report`);
            setReportSentSuccess(res.data?.message || `Roster report successfully emailed to ${email}!`);
        } catch (err) {
            alert('Failed to send roster report: ' + (err.response?.data?.detail || err.message));
        } finally {
            setIsSendingReport(false);
        }
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
                id: editingBankId || undefined,
                bank_id: parseInt(formData.bank_id),
                trade_type: formData.trade_type,
                entity_scope: formData.entity_scope,
                entity_ids: formData.entity_scope === 'SPECIFIC_ENTITIES' ? formData.entity_ids : [],
                contacts: validContacts,
                authorized_contact_email: formData.authorized_contact_email ? formData.authorized_contact_email.trim() : null,
                authorized_contact_name: formData.authorized_contact_name ? formData.authorized_contact_name.trim() : null
            });
            setIsAdding(false);
            setEditingBankId(null);
            setRoleNotice(null);
            setReportSentSuccess(null);
            setBankSearchTerm('');
            setIsBankDropdownOpen(false);
            setFormData({
                bank_id: '',
                trade_type: 'BOTH',
                entity_scope: 'ALL_ENTITIES',
                entity_ids: [],
                contacts: [],
                authorized_contact_email: '',
                authorized_contact_name: ''
            });
            setPendingInvitations([]);
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

    const filteredBanks = banks.filter(bank => {
        // Search term (bank name, bank ID, authorized contact email, contact emails, contact names)
        if (rosterSearch.trim()) {
            const term = rosterSearch.trim().toLowerCase();
            const bankName = (bank.bank?.name || '').toLowerCase();
            const bankId = String(bank.bank_id);
            const authEmail = (bank.authorized_contact_email || '').toLowerCase();
            const authName = (bank.authorized_contact_name || '').toLowerCase();
            const contactEmails = (bank.contacts || []).map(c => (c.email || '').toLowerCase()).join(' ');
            const contactNames = (bank.contacts || []).map(c => (c.name || '').toLowerCase()).join(' ');
            const rawEmails = (bank.emails || '').toLowerCase();
            const matchesSearch = bankName.includes(term) || bankId.includes(term) || authEmail.includes(term) || authName.includes(term) || contactEmails.includes(term) || contactNames.includes(term) || rawEmails.includes(term);
            if (!matchesSearch) return false;
        }

        // Legal Entity filter
        if (rosterEntityFilter !== 'ALL') {
            const targetEid = parseInt(rosterEntityFilter);
            const isAllScope = bank.entity_scope === 'ALL_ENTITIES';
            const hasSpecific = (bank.entity_ids || []).includes(targetEid);
            if (!isAllScope && !hasSpecific) return false;
        }

        // Trade Type filter
        if (rosterTradeTypeFilter !== 'ALL') {
            if (bank.trade_type !== rosterTradeTypeFilter && bank.trade_type !== 'BOTH') return false;
        }

        // Contact Role filter
        if (rosterRoleFilter !== 'ALL') {
            const contactsList = (bank.contacts && bank.contacts.length > 0)
                ? bank.contacts
                : (bank.emails ? bank.emails.split(',').map(e => ({ email: e.trim(), name: '', role: 'EXECUTION' })) : []);
            if (rosterRoleFilter === 'PENDING') {
                const hasPending = contactsList.some(c => c.is_pending || c.invitation_status === 'PENDING');
                if (!hasPending) return false;
            } else {
                const hasRole = contactsList.some(c => c.role === rosterRoleFilter);
                if (!hasRole) return false;
            }
        }

        return true;
    });

    const hasActiveFilters = Boolean(
        rosterSearch.trim() || rosterEntityFilter !== 'ALL' || rosterTradeTypeFilter !== 'ALL' || rosterRoleFilter !== 'ALL'
    );

    const resetFilters = () => {
        setRosterSearch('');
        setRosterEntityFilter('ALL');
        setRosterTradeTypeFilter('ALL');
        setRosterRoleFilter('ALL');
    };

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm overflow-y-auto h-full w-full flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-[94vw] 2xl:max-w-7xl w-full max-h-[92vh] flex flex-col border border-gray-100 overflow-hidden">

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
                            <div className="flex flex-col gap-3 shrink-0">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <div>
                                        <div className="text-sm font-bold text-gray-900">
                                            Counterparty Directory
                                        </div>
                                        <div className="text-xs text-gray-500 font-medium">
                                            {banks.length} Counterparty {banks.length === 1 ? 'Bank' : 'Banks'} Configured
                                            {hasActiveFilters && (
                                                <span className="text-blue-600 font-semibold ml-1.5">
                                                    • {filteredBanks.length} matching filters
                                                </span>
                                            )}
                                        </div>
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
                                                contacts: [],
                                                authorized_contact_email: '',
                                                authorized_contact_name: ''
                                            });
                                            setIsAdding(true);
                                        }}
                                        className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-xs hover:bg-blue-700 transition-all cursor-pointer whitespace-nowrap"
                                    >
                                        <Plus size={15} />
                                        Add Counterparty Bank
                                    </button>
                                </div>

                                {/* Search & Filtering Controls Toolbar */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs items-center">
                                    {/* Search Input */}
                                    <div className="relative flex items-center">
                                        <Search size={14} className="absolute text-slate-400 pointer-events-none" style={{ left: '12px' }} />
                                        <input
                                            type="text"
                                            value={rosterSearch}
                                            onChange={(e) => setRosterSearch(e.target.value)}
                                            placeholder="Search bank or contact email..."
                                            style={{ paddingLeft: '34px', paddingRight: rosterSearch ? '28px' : '12px', height: '36px', boxSizing: 'border-box' }}
                                            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-slate-800 placeholder-slate-400 outline-none"
                                        />
                                        {rosterSearch && (
                                            <button
                                                onClick={() => setRosterSearch('')}
                                                className="absolute right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Legal Entity Filter */}
                                    <div className="flex items-center">
                                        <select
                                            value={rosterEntityFilter}
                                            onChange={(e) => setRosterEntityFilter(e.target.value)}
                                            style={{ height: '36px', boxSizing: 'border-box' }}
                                            className="w-full px-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-slate-700 cursor-pointer outline-none"
                                        >
                                            <option value="ALL">🏢 All Legal Entities</option>
                                            {entities.map(ent => (
                                                <option key={ent.id} value={ent.id}>{ent.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Trade Type Filter */}
                                    <div className="flex items-center">
                                        <select
                                            value={rosterTradeTypeFilter}
                                            onChange={(e) => setRosterTradeTypeFilter(e.target.value)}
                                            style={{ height: '36px', boxSizing: 'border-box' }}
                                            className="w-full px-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-slate-700 cursor-pointer outline-none"
                                        >
                                            <option value="ALL">📊 All Trade Types</option>
                                            <option value="BOTH">FX & T-Bills (Both)</option>
                                            <option value="FX_SPOT">FX Spot Only</option>
                                            <option value="TBILL">T-Bills Only</option>
                                        </select>
                                    </div>

                                    {/* Role Filter & Reset */}
                                    <div className="flex items-center gap-1.5">
                                        <select
                                            value={rosterRoleFilter}
                                            onChange={(e) => setRosterRoleFilter(e.target.value)}
                                            style={{ height: '36px', boxSizing: 'border-box' }}
                                            className="flex-1 min-w-0 px-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-slate-700 cursor-pointer outline-none"
                                        >
                                            <option value="ALL">👥 All Desk Roles</option>
                                            <option value="EXECUTION">⚡ Execution Dealers</option>
                                            <option value="APPROVER">🛡️ Approvers</option>
                                            <option value="VIEW_ONLY">👁️ View-Only</option>
                                            <option value="PENDING">⏳ Pending Handshake</option>
                                        </select>
                                        {hasActiveFilters && (
                                            <button
                                                onClick={resetFilters}
                                                style={{ height: '36px', boxSizing: 'border-box' }}
                                                className="px-3 flex items-center justify-center text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer shrink-0"
                                                title="Reset all filters"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Main Table */}
                            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 flex flex-col min-h-0 overflow-hidden">
                                <div className="overflow-auto max-h-[58vh] min-h-0">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 z-10 bg-slate-50 shadow-2xs">
                                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider bg-slate-50">Bank Partner</th>
                                                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider bg-slate-50">Trade Types</th>
                                                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider bg-slate-50">Entity Scope</th>
                                                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider bg-slate-50">Desk Contacts & Permissions</th>
                                                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-right bg-slate-50">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {isLoading ? (
                                                <tr><td colSpan="5" className="p-12 text-center text-slate-400 text-sm font-medium">Loading bank counterparties...</td></tr>
                                            ) : banks.length === 0 ? (
                                                <tr><td colSpan="5" className="p-12 text-center text-slate-400 text-sm font-medium">No quotation counterparties configured yet. Click "Add Counterparty Bank" to begin.</td></tr>
                                            ) : filteredBanks.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="p-10 text-center">
                                                        <div className="flex flex-col items-center justify-center gap-2">
                                                            <Search className="w-8 h-8 text-slate-300" />
                                                            <div className="text-sm font-semibold text-slate-700">No counterparties match your filters</div>
                                                            <div className="text-xs text-slate-400">Try changing your search terms, legal entity, or trade type filter.</div>
                                                            <button
                                                                onClick={resetFilters}
                                                                className="mt-1 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                                                            >
                                                                Clear All Filters
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredBanks.map(bank => {
                                                    const contactsList = (bank.contacts && bank.contacts.length > 0)
                                                        ? bank.contacts
                                                        : (bank.emails ? bank.emails.split(',').map(e => ({ email: e.trim(), name: '', role: 'EXECUTION' })) : []);

                                                    const execCount = contactsList.filter(c => c.role === 'EXECUTION').length;
                                                    const viewCount = contactsList.filter(c => c.role === 'VIEW_ONLY').length;
                                                    const approverCount = contactsList.filter(c => c.role === 'APPROVER').length;

                                                    return (
                                                        <tr key={bank.id} className="hover:bg-slate-50/70 transition-colors">
                                                            {/* Column 1: Bank Partner */}
                                                            <td className="py-3.5 px-4 align-top">
                                                                <div className="font-bold text-gray-900 text-sm">{bank.bank?.name || `Bank #${bank.bank_id}`}</div>
                                                                <div className="text-[11px] text-gray-400 font-mono">ID: {bank.bank_id}</div>
                                                                {bank.authorized_contact_email && (
                                                                    <div className="text-[10px] text-indigo-700 font-mono flex items-center gap-1 mt-1.5 font-semibold" title={`Authorized Governance Officer: ${bank.authorized_contact_name || bank.authorized_contact_email}`}>
                                                                        <Shield size={11} className="text-indigo-600 shrink-0" />
                                                                        <span className="truncate max-w-[170px]">{bank.authorized_contact_email}</span>
                                                                    </div>
                                                                )}
                                                            </td>

                                                            {/* Column 2: Trade Types */}
                                                            <td className="py-3.5 px-4 align-top whitespace-nowrap">
                                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getTradeTypeBadgeColor(bank.trade_type)}`}>
                                                                    {getTradeTypeLabel(bank.trade_type)}
                                                                </span>
                                                            </td>

                                                            {/* Column 3: Entity Scope */}
                                                            <td className="py-3.5 px-4 align-top">
                                                                {(() => {
                                                                    if (bank.entity_scope === 'ALL_ENTITIES') {
                                                                        return (
                                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                                                                                🌐 All Entities
                                                                            </span>
                                                                        );
                                                                    }
                                                                    const assignedNames = (bank.entity_ids || [])
                                                                        .map(id => entities.find(e => e.id === id)?.name)
                                                                        .filter(Boolean);
                                                                    const label = assignedNames.length === 1
                                                                        ? assignedNames[0]
                                                                        : (assignedNames.length > 1 ? `${assignedNames.length} Entities: ${assignedNames.join(', ')}` : 'Specific Entity');

                                                                    return (
                                                                        <span
                                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 max-w-[180px]"
                                                                            title={assignedNames.join(', ') || 'Specific Legal Entity'}
                                                                        >
                                                                            🏢 <span className="truncate">{label}</span>
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </td>

                                                            {/* Column 4: Desk Contacts & Permissions */}
                                                            <td className="py-3.5 px-4 align-top">
                                                                <div className="flex flex-wrap gap-1.5 max-w-xl">
                                                                    {contactsList.map((c, i) => {
                                                                        const isPending = Boolean(c.is_pending || c.invitation_status === 'PENDING');
                                                                        return (
                                                                            <span
                                                                                key={i}
                                                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-all ${
                                                                                    isPending
                                                                                        ? 'bg-amber-50/90 text-amber-900 border-amber-300 ring-1 ring-amber-400/20'
                                                                                        : c.role === 'EXECUTION'
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
                                                                                {isPending ? (
                                                                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-sans font-extrabold bg-amber-200 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded-full uppercase tracking-wider" title="Dealer invitation emailed; awaiting handshake confirmation">
                                                                                        <Clock size={10} className="text-amber-700 animate-pulse" />
                                                                                        Pending
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-sans font-bold bg-emerald-100 text-emerald-800 px-1 rounded" title="Active trading contact">
                                                                                        Active
                                                                                    </span>
                                                                                )}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                                <div className="text-[11px] text-slate-400 mt-1.5 font-medium flex flex-wrap items-center gap-2">
                                                                    <span>{execCount} Execution &bull; {viewCount} View-Only{approverCount > 0 ? ` \u2022 ${approverCount} Approver` : ''}</span>
                                                                    {bank.all_contacts_pending && (
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                                                            <Clock size={11} className="text-amber-600" />
                                                                            All contacts pending handshake (Bank inactive in Quotation Builder)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            {/* Column 5: Actions */}
                                                            <td className="py-3.5 px-4 text-right align-top">
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
                                                            {selectedSystemBank.email_domain && (
                                                                <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                                                                    @{selectedSystemBank.email_domain}
                                                                </span>
                                                            )}
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
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                Define who can execute quotes (⚡), observe (👁️), or approve bank participation (🛡️).
                                                {selectedSystemBank?.email_domain && (
                                                    <span className="ml-1 text-blue-700 font-semibold">
                                                        • Must use official @{selectedSystemBank.email_domain} email.
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Add Contact Input Bar */}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs items-center">
                                        <div className="md:col-span-5">
                                            <input
                                                type="email"
                                                placeholder={selectedSystemBank?.email_domain ? `trader@${selectedSystemBank.email_domain}` : "trader@bank.com (Email)"}
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

                                    {/* Active Contacts Section */}
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1 flex items-center justify-between">
                                            <span>Active Representatives ({formData.contacts.length})</span>
                                            <span className="text-[10px] text-gray-400 font-normal">Can receive live RFQs and place quotes</span>
                                        </div>
                                        {formData.contacts.length === 0 ? (
                                            <div className="py-2.5 px-3 rounded-xl border border-dashed border-slate-300 bg-white/70 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                                                <span className="font-semibold text-slate-700">No active desk contacts yet.</span>
                                                <span className="text-[11px] text-slate-500">Invite a representative with <strong>Execution (⚡)</strong> or <strong>Approver (🛡️)</strong> role above.</span>
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
                                                            {(c.name || c.title) && <span className="text-[11px] text-gray-500 font-medium">({c.name || c.title})</span>}
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                Active
                                                            </span>
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
                                                            title="Remove active contact (Direct delete)"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Pending Dealer Invitations (Staged) */}
                                    {pendingInvitations && pendingInvitations.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5">
                                            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center justify-between">
                                                <span className="flex items-center gap-1.5">
                                                    <Clock size={13} className="text-amber-600" />
                                                    Pending Dealer Invitations ({pendingInvitations.length})
                                                </span>
                                                <span className="text-[10px] text-amber-700 font-normal">Waiting for dealer handshake acceptance</span>
                                            </div>
                                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                                {pendingInvitations.map((inv) => (
                                                    <div key={inv.id} className="flex items-center justify-between bg-amber-50/70 px-3 py-1.5 rounded-xl border border-amber-200 shadow-2xs">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-mono font-bold text-gray-900">{inv.email}</span>
                                                            {inv.title && <span className="text-[11px] text-gray-500 font-medium">({inv.title})</span>}
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                                                ⏳ Awaiting Dealer Handshake
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[11px] font-bold text-gray-600">
                                                                {inv.role === 'EXECUTION' ? '⚡ Execution' : inv.role === 'APPROVER' ? '🛡️ Approver' : '👁️ View Only'}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleResendInvitation(inv.id, inv.email)}
                                                                className="px-2 py-0.5 text-[11px] bg-white border border-amber-300 hover:bg-amber-100 text-amber-800 rounded font-semibold transition-colors cursor-pointer"
                                                                title="Resend invitation email"
                                                            >
                                                                Resend
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRevokeInvitation(inv.id)}
                                                                className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                                                                title="Cancel pending invitation"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Authorized Bank Contact (Optional - For Roster Reports) */}
                                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/70 space-y-2.5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                                                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                                                Authorized Bank Contact <span className="text-[10px] text-slate-500 font-normal normal-case">(Optional - For Roster Reports)</span>
                                            </label>
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                Designated bank contact who can receive on-demand roster audit reports of currently active trading personnel.
                                            </p>
                                        </div>
                                        {editingBankId && formData.authorized_contact_email && (
                                            <button
                                                type="button"
                                                onClick={handleSendRosterReport}
                                                disabled={isSendingReport}
                                                className="px-3 py-1.5 bg-white border border-indigo-200 hover:border-indigo-400 text-indigo-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                                                title="Send current users and roles audit report to this authorized contact"
                                            >
                                                {isSendingReport ? (
                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                                                ) : (
                                                    <Mail className="w-3.5 h-3.5 text-indigo-600" />
                                                )}
                                                {isSendingReport ? 'Sending...' : '📋 Send Roster Report'}
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                                                Authorized Officer Email
                                            </label>
                                            <input
                                                type="email"
                                                placeholder={selectedSystemBank?.email_domain ? `governance@${selectedSystemBank.email_domain}` : "officer@bank.com (Official Email)"}
                                                className="w-full text-xs rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                                style={{ height: '38px', padding: '0 12px', boxSizing: 'border-box' }}
                                                value={formData.authorized_contact_email || ''}
                                                onChange={(e) => setFormData({ ...formData, authorized_contact_email: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                                                Officer Name / Title (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g., Head of FX Operations / Desk Lead"
                                                className="w-full text-xs rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                                style={{ height: '38px', padding: '0 12px', boxSizing: 'border-box' }}
                                                value={formData.authorized_contact_name || ''}
                                                onChange={(e) => setFormData({ ...formData, authorized_contact_name: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {reportSentSuccess && (
                                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 font-medium">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                                {reportSentSuccess}
                                            </div>
                                            <button type="button" onClick={() => setReportSentSuccess(null)} className="text-emerald-600 hover:text-emerald-800 p-0.5 cursor-pointer">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}
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
