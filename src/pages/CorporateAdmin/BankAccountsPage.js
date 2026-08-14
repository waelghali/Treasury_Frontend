import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/apiService';
import { toast } from 'react-toastify';
import {
    Plus, Trash2, Edit, Building2, CreditCard, Check, X, Star, Loader2
} from 'lucide-react';
import CopyBadge from '../../components/CopyBadge';
import { SkeletonTable } from '../../components/SkeletonLoader';

export default function BankAccountsPage() {
    const [accounts, setAccounts] = useState([]);
    const [banks, setBanks] = useState([]);
    const [entities, setEntities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [form, setForm] = useState({
        bank_id: '', entity_id: '', account_name: '', account_number: '',
        customer_number: '', branch_name: '', iban: '', is_default: false
    });

    const loadData = async () => {
        try {
            setLoading(true);
            const [accts, b, e] = await Promise.all([
                apiRequest('/issuance/bank-accounts', 'GET'),
                apiRequest('/end-user/banks/', 'GET'),
                apiRequest('/corporate-admin/customer-entities/', 'GET'),
            ]);
            setAccounts(accts || []);
            setBanks(b || []);
            setEntities(e || []);
        } catch (err) {
            toast.error('Failed to load bank accounts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const openCreate = () => {
        setEditingAccount(null);
        setForm({ bank_id: '', entity_id: '', account_name: '', account_number: '', customer_number: '', branch_name: '', iban: '', is_default: false });
        setShowModal(true);
    };

    const openEdit = (acct) => {
        setEditingAccount(acct);
        setForm({
            bank_id: String(acct.bank_id),
            entity_id: acct.entity_id ? String(acct.entity_id) : '',
            account_name: acct.account_name || '',
            account_number: acct.account_number || '',
            customer_number: acct.customer_number || '',
            branch_name: acct.branch_name || '',
            iban: acct.iban || '',
            is_default: acct.is_default || false,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.bank_id || !form.account_name || !form.account_number) {
            toast.error('Bank, Account Name and Account Number are required');
            return;
        }
        try {
            const payload = {
                ...form,
                bank_id: parseInt(form.bank_id),
                entity_id: form.entity_id ? parseInt(form.entity_id) : null,
            };
            if (editingAccount) {
                await apiRequest(`/issuance/bank-accounts/${editingAccount.id}`, 'PUT', payload);
                toast.success('Bank account updated');
            } else {
                await apiRequest('/issuance/bank-accounts', 'POST', payload);
                toast.success('Bank account created');
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            toast.error(err.message || 'Failed to save');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this bank account?')) return;
        try {
            await apiRequest(`/issuance/bank-accounts/${id}`, 'DELETE');
            toast.success('Bank account deleted');
            loadData();
        } catch (err) {
            toast.error(err.message || 'Failed to delete');
        }
    };

    // Group accounts by bank
    const grouped = accounts.reduce((acc, a) => {
        const key = a.bank_name || 'Unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(a);
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                        <CreditCard className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bank Accounts</h1>
                        <p className="text-sm text-slate-500">Manage your company's bank account details for LG issuance</p>
                    </div>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 shadow-lg transition-all">
                    <Plus size={16} /> Add Bank Account
                </button>
            </div>

            {/* Accounts Table */}
            {loading ? (
                <SkeletonTable rows={3} cols={3} />
            ) : Object.keys(grouped).length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
                    <CreditCard className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-500 font-medium">No bank accounts yet</p>
                    <p className="text-slate-400 text-sm mt-1">Add your first bank account to get started</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(grouped).map(([bankName, accts]) => (
                        <div key={bankName} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                                <Building2 size={18} className="text-blue-600" />
                                <h3 className="font-bold text-slate-800">{bankName}</h3>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{accts.length} account{accts.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {accts.map(a => (
                                    <div key={a.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-6 flex-1">
                                            <div className="min-w-[200px]">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-800">{a.account_name}</span>
                                                    {a.is_default && (
                                                        <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                                                            <Star size={10} /> Default
                                                        </span>
                                                    )}
                                                </div>
                                                {a.entity_name && <span className="text-xs text-slate-400">Entity: {a.entity_name}</span>}
                                            </div>
                                            <div className="min-w-[150px]">
                                                <span className="text-xs text-slate-400 block mb-0.5">Account #</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="font-mono font-bold text-sm text-slate-700">{a.account_number}</span>
                                                    <CopyBadge text={a.account_number} variant="icon" size="sm" />
                                                </div>
                                            </div>
                                            {a.customer_number && (
                                                <div className="min-w-[120px]">
                                                    <span className="text-xs text-slate-400 block mb-0.5">CIF / Customer #</span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-mono text-sm text-slate-600">{a.customer_number}</span>
                                                        <CopyBadge text={a.customer_number} variant="icon" size="sm" />
                                                    </div>
                                                </div>
                                            )}
                                            {a.branch_name && (
                                                <div>
                                                    <span className="text-xs text-slate-400 block">Branch</span>
                                                    <span className="text-sm text-slate-600">{a.branch_name}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => openEdit(a)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(a.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="text-lg font-black text-slate-900">
                                {editingAccount ? 'Edit Bank Account' : 'New Bank Account'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Bank *</label>
                                <select
                                    value={form.bank_id}
                                    onChange={e => setForm({ ...form, bank_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium"
                                    disabled={!!editingAccount}
                                >
                                    <option value="">Select Bank...</option>
                                    {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Entity (Optional)</label>
                                <select
                                    value={form.entity_id}
                                    onChange={e => setForm({ ...form, entity_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium"
                                >
                                    <option value="">Company Level (All Entities)</option>
                                    {entities.map(e => <option key={e.id} value={e.id}>{e.entity_name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Account Name *</label>
                                    <input value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium" placeholder="e.g. ABC Trading LLC" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Account Number *</label>
                                    <input value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono" placeholder="e.g. 0123456789" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Customer / CIF #</label>
                                    <input value={form.customer_number} onChange={e => setForm({ ...form, customer_number: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono" placeholder="Optional" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Branch Name</label>
                                    <input value={form.branch_name} onChange={e => setForm({ ...form, branch_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium" placeholder="Optional" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">IBAN</label>
                                <input value={form.iban} onChange={e => setForm({ ...form, iban: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono" placeholder="Optional" />
                            </div>

                            <label className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors">
                                <input type="checkbox" checked={form.is_default} onChange={e => setForm({ ...form, is_default: e.target.checked })}
                                    className="w-4 h-4 accent-amber-600" />
                                <div>
                                    <span className="text-sm font-bold text-amber-800">Default Account</span>
                                    <p className="text-xs text-amber-600">Used automatically when no specific account is selected</p>
                                </div>
                            </label>
                        </div>

                        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg transition-all flex items-center gap-2">
                                <Check size={16} /> {editingAccount ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
