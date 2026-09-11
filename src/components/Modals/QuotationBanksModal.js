import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, CheckCircle2, X, Building, UserCheck, Eye, Shield, Mail, User } from 'lucide-react';
import apiClient from '../../services/apiClient';

export default function QuotationBanksModal({ onClose }) {
    const [banks, setBanks] = useState([]);
    const [systemBanks, setSystemBanks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingBankId, setEditingBankId] = useState(null);

    const [formData, setFormData] = useState({
        bank_id: '',
        trade_type: 'BOTH',
        contacts: [
            { email: '', name: '', role: 'EXECUTION' }
        ]
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
    }, []);

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
        if (!parsedContacts.length) {
            parsedContacts = [{ email: '', name: '', role: 'EXECUTION' }];
        }
        setFormData({
            bank_id: bank.bank_id,
            trade_type: bank.trade_type || 'BOTH',
            contacts: parsedContacts
        });
        setEditingBankId(bank.id);
        setIsAdding(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
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

        try {
            await apiClient.post('/end-user/quotations/banks', {
                bank_id: parseInt(formData.bank_id),
                trade_type: formData.trade_type,
                contacts: validContacts
            });
            setIsAdding(false);
            setEditingBankId(null);
            setRoleNotice(null);
            setFormData({
                bank_id: '',
                trade_type: 'BOTH',
                contacts: [{ email: '', name: '', role: 'EXECUTION' }]
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

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm overflow-y-auto h-full w-full flex items-center justify-center z-50">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col mx-4 border border-gray-100 overflow-hidden">

                {/* Header Ribbon */}
                <div className="bg-gradient-to-r from-gray-950 via-slate-900 to-gray-900 text-white px-8 py-5 flex justify-between items-center shrink-0 border-b border-gray-800">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-3 tracking-tight">
                            <Building className="w-5 h-5 text-blue-400" />
                            Quotation Banks & Counterparty Roster
                        </h2>
                        <p className="text-slate-400 text-xs mt-1">Configure external bank counterparties, desk contacts, and role permissions (⚡ Execution vs 👁️ View-Only vs 🛡️ Approver).</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 bg-slate-50/50">

                    <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500 font-medium">
                            {banks.length} Counterparty {banks.length === 1 ? 'Bank' : 'Banks'} Configured
                        </div>
                        {!isAdding && (
                            <button
                                onClick={() => {
                                    setEditingBankId(null);
                                    setRoleNotice(null);
                                    setFormData({
                                        bank_id: '',
                                        trade_type: 'BOTH',
                                        contacts: [{ email: '', name: '', role: 'EXECUTION' }]
                                    });
                                    setIsAdding(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-500/10 hover:bg-blue-700 transition-all"
                            >
                                <Plus size={16} />
                                Add Counterparty Bank
                            </button>
                        )}
                    </div>

                    {isAdding && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in shrink-0">
                            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                                <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-blue-600" />
                                    {editingBankId ? 'Edit Bank Counterparty & Contacts' : 'Configure New Bank Counterparty'}
                                </h2>
                                <button onClick={() => { setIsAdding(false); setEditingBankId(null); setRoleNotice(null); }} className="text-gray-400 hover:text-gray-600 p-1">
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">Select System Bank</label>
                                        <select
                                            required
                                            disabled={!!editingBankId}
                                            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500"
                                            value={formData.bank_id}
                                            onChange={(e) => setFormData({ ...formData, bank_id: e.target.value })}
                                        >
                                            <option value="">-- Choose Bank Entity --</option>
                                            {systemBanks.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">Trade Type Routing</label>
                                        <select
                                            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                            value={formData.trade_type}
                                            onChange={(e) => setFormData({ ...formData, trade_type: e.target.value })}
                                        >
                                            <option value="BOTH">FX Spot & T-Bills (Both)</option>
                                            <option value="FX_SPOT">FX Spot Only</option>
                                            <option value="TBILL">T-Bills Only</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Desk Contacts & Role Permissions */}
                                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                                                <Mail className="w-3.5 h-3.5 text-blue-600" />
                                                Desk Contacts & Roles
                                            </label>
                                            <p className="text-[11px] text-gray-500 mt-0.5">Define who can execute quotes (⚡), observe (👁️), or approve bank participation (🛡️).</p>
                                        </div>
                                    </div>

                                    {/* Add Contact Input Bar */}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="md:col-span-5">
                                            <input
                                                type="email"
                                                placeholder="trader@bank.com (Email)"
                                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                                                value={newContact.email}
                                                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <input
                                                type="text"
                                                placeholder="Name / Title (Optional)"
                                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                                                value={newContact.name}
                                                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <select
                                                className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none font-semibold text-gray-700"
                                                value={newContact.role}
                                                onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                                            >
                                                <option value="EXECUTION">⚡ Execution</option>
                                                <option value="VIEW_ONLY">👁️ View Only</option>
                                                <option value="APPROVER">🛡️ Approver</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2 flex items-center justify-end">
                                            <button
                                                type="button"
                                                onClick={handleAddContactToForm}
                                                className="w-full px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                            >
                                                <Plus size={14} /> Add
                                            </button>
                                        </div>
                                    </div>

                                    {/* Role Notice Banner */}
                                    {roleNotice && (
                                        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2 animate-fade-in">
                                            <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                            <div className="flex-1">{roleNotice}</div>
                                            <button type="button" onClick={() => setRoleNotice(null)} className="text-amber-500 hover:text-amber-700 p-0.5">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Configured Contacts List */}
                                    <div className="space-y-2">
                                        {formData.contacts.map((c, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-xs">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-lg ${
                                                        c.role === 'EXECUTION'
                                                            ? 'bg-emerald-50 text-emerald-600'
                                                            : c.role === 'APPROVER'
                                                            ? 'bg-amber-50 text-amber-600'
                                                            : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {c.role === 'EXECUTION' ? <UserCheck size={16} /> : c.role === 'APPROVER' ? <Shield size={16} /> : <Eye size={16} />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-mono font-bold text-gray-900">{c.email || '(Empty Email)'}</span>
                                                            {c.name && <span className="text-[11px] text-gray-500 font-medium">({c.name})</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleContactRole(idx)}
                                                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all border ${
                                                            c.role === 'EXECUTION'
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                                : c.role === 'APPROVER'
                                                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                                                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                                        }`}
                                                        title="Click to cycle role: Execution → View-Only → Approver"
                                                    >
                                                        {c.role === 'EXECUTION' ? '⚡ EXECUTION DEALER' : c.role === 'APPROVER' ? '🛡️ APPROVER' : '👁️ VIEW ONLY'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveContactFromForm(idx)}
                                                        className="p-1 text-gray-400 hover:text-red-600 rounded-md transition-colors"
                                                        title="Remove contact"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => { setIsAdding(false); setEditingBankId(null); }}
                                        className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/10 hover:bg-emerald-700 transition-colors"
                                    >
                                        {editingBankId ? 'Save Changes' : 'Save Counterparty'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Main Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                        <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider">Bank Partner</th>
                                        <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider">Trade Types</th>
                                        <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider">Desk Contacts & Permissions</th>
                                        <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-right">Actions</th>
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
                                                    <td className="py-4 px-4">
                                                        <div className="font-bold text-gray-900 text-sm">{bank.bank?.name || `Bank #${bank.bank_id}`}</div>
                                                        <div className="text-[11px] text-gray-400 font-mono">ID: {bank.bank_id}</div>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getTradeTypeBadgeColor(bank.trade_type)}`}>
                                                            {getTradeTypeLabel(bank.trade_type)}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-4">
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
                                                    <td className="py-4 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button
                                                                onClick={() => handleStartEdit(bank)}
                                                                className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-white rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-100"
                                                                title="Edit Bank & Contacts"
                                                            >
                                                                <Edit2 size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(bank.id)}
                                                                className="p-2 text-slate-400 hover:text-red-600 transition-colors bg-white rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100"
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

                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-xs transition-colors shadow-xs"
                    >
                        Close Manager
                    </button>
                </div>

            </div>
        </div>
    );
}
