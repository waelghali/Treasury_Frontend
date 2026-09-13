import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../../services/apiClient';
import {
    BarChart2, Landmark, Building2, Plus, RefreshCw,
    CheckCircle2, XCircle, Trash2, Edit2, AlertCircle, Search,
    Layers, Users, Info, X
} from 'lucide-react';

export default function QuotationLiveRankingManagement() {
    const [configs, setConfigs] = useState([]);
    const [banks, setBanks] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [customerEntities, setCustomerEntities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Filters
    const [selectedBankFilter, setSelectedBankFilter] = useState('');
    const [tradeTypeFilter, setTradeTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState(null);
    const [formData, setFormData] = useState({
        bank_id: '',
        trade_type: 'BOTH',
        scope_type: 'ALL_CUSTOMERS',
        customer_id: '',
        entity_scope_type: 'ALL_ENTITIES',
        entity_id: '',
        is_enabled: true
    });
    const [modalError, setModalError] = useState('');

    // Fetch initial data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [configsRes, banksRes, customersRes] = await Promise.all([
                apiClient.get('/system-owner/live-ranking-configs'),
                apiClient.get('/system-owner/banks').catch(() => apiClient.get('/system-owner/banks/')),
                apiClient.get('/system-owner/customers/').catch(() => apiClient.get('/system-owner/customers'))
            ]);

            setConfigs(configsRes.data || []);
            setBanks(banksRes.data || []);
            setCustomers(customersRes.data || []);
        } catch (err) {
            console.error('Failed to load live ranking configs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // When customer changes in modal form, fetch their entities
    useEffect(() => {
        if (formData.scope_type === 'SPECIFIC_CUSTOMER' && formData.customer_id) {
            apiClient.get(`/system-owner/customers/${formData.customer_id}/entities`)
                .then(res => setCustomerEntities(res.data || []))
                .catch(err => {
                    console.error('Failed to load entities:', err);
                    setCustomerEntities([]);
                });
        } else {
            setCustomerEntities([]);
        }
    }, [formData.scope_type, formData.customer_id]);

    // Open Modal for Create
    const handleOpenCreate = () => {
        setEditingConfig(null);
        setFormData({
            bank_id: banks.length > 0 ? banks[0].id : '',
            trade_type: 'BOTH',
            scope_type: 'ALL_CUSTOMERS',
            customer_id: '',
            entity_scope_type: 'ALL_ENTITIES',
            entity_id: '',
            is_enabled: true
        });
        setModalError('');
        setIsModalOpen(true);
    };

    // Open Modal for Edit
    const handleOpenEdit = async (cfg) => {
        setEditingConfig(cfg);
        setFormData({
            bank_id: cfg.bank_id,
            trade_type: cfg.trade_type,
            scope_type: cfg.scope_type,
            customer_id: cfg.customer_id || '',
            entity_scope_type: cfg.entity_scope_type || 'ALL_ENTITIES',
            entity_id: cfg.entity_id || '',
            is_enabled: cfg.is_enabled
        });
        setModalError('');

        if (cfg.customer_id) {
            try {
                const res = await apiClient.get(`/system-owner/customers/${cfg.customer_id}/entities`);
                setCustomerEntities(res.data || []);
            } catch {
                setCustomerEntities([]);
            }
        }
        setIsModalOpen(true);
    };

    // Toggle Enable / Disable quickly
    const handleToggleStatus = async (cfg) => {
        try {
            const updatedStatus = !cfg.is_enabled;
            const res = await apiClient.put(`/system-owner/live-ranking-configs/${cfg.id}`, {
                is_enabled: updatedStatus
            });
            setConfigs(configs.map(c => c.id === cfg.id ? res.data : c));
        } catch (err) {
            console.error('Failed to toggle status:', err);
            alert(err.response?.data?.detail || 'Failed to update rule status.');
        }
    };

    // Delete rule
    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this live ranking configuration rule?')) return;
        try {
            await apiClient.delete(`/system-owner/live-ranking-configs/${id}`);
            setConfigs(configs.filter(c => c.id !== id));
        } catch (err) {
            console.error('Failed to delete rule:', err);
            alert(err.response?.data?.detail || 'Failed to delete configuration rule.');
        }
    };

    // Submit Form (Create or Update)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setModalError('');

        if (!formData.bank_id) {
            setModalError('Please select a Bank.');
            return;
        }

        if (formData.scope_type === 'SPECIFIC_CUSTOMER' && !formData.customer_id) {
            setModalError('Please select a Customer for the specific customer scope.');
            return;
        }

        if (formData.scope_type === 'SPECIFIC_CUSTOMER' && formData.entity_scope_type === 'SPECIFIC_ENTITY' && !formData.entity_id) {
            setModalError('Please select an Entity for the specific entity scope.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                bank_id: parseInt(formData.bank_id),
                trade_type: formData.trade_type,
                scope_type: formData.scope_type,
                customer_id: formData.scope_type === 'SPECIFIC_CUSTOMER' ? parseInt(formData.customer_id) : null,
                entity_scope_type: formData.scope_type === 'SPECIFIC_CUSTOMER' ? formData.entity_scope_type : 'ALL_ENTITIES',
                entity_id: (formData.scope_type === 'SPECIFIC_CUSTOMER' && formData.entity_scope_type === 'SPECIFIC_ENTITY' && formData.entity_id) ? parseInt(formData.entity_id) : null,
                is_enabled: formData.is_enabled
            };

            if (editingConfig) {
                const res = await apiClient.put(`/system-owner/live-ranking-configs/${editingConfig.id}`, payload);
                setConfigs(configs.map(c => c.id === editingConfig.id ? res.data : c));
            } else {
                const res = await apiClient.post('/system-owner/live-ranking-configs', payload);
                // If existing was updated on conflict or created
                const existingIdx = configs.findIndex(c => c.id === res.data.id);
                if (existingIdx >= 0) {
                    const next = [...configs];
                    next[existingIdx] = res.data;
                    setConfigs(next);
                } else {
                    setConfigs([res.data, ...configs]);
                }
            }

            setIsModalOpen(false);
        } catch (err) {
            console.error('Error saving config:', err);
            setModalError(err.response?.data?.detail || 'Failed to save configuration.');
        } finally {
            setSaving(false);
        }
    };

    // Filtered configs list
    const filteredConfigs = useMemo(() => {
        return configs.filter(cfg => {
            if (selectedBankFilter && String(cfg.bank_id) !== String(selectedBankFilter)) return false;
            if (tradeTypeFilter && cfg.trade_type !== tradeTypeFilter && cfg.trade_type !== 'BOTH') return false;
            if (statusFilter !== '') {
                const isEnabled = statusFilter === 'true';
                if (cfg.is_enabled !== isEnabled) return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const bankName = (cfg.bank_name || '').toLowerCase();
                const custName = (cfg.customer_name || '').toLowerCase();
                const entName = (cfg.entity_name || '').toLowerCase();
                if (!bankName.includes(q) && !custName.includes(q) && !entName.includes(q)) return false;
            }
            return true;
        });
    }, [configs, selectedBankFilter, tradeTypeFilter, statusFilter, searchQuery]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 text-sm font-medium">Loading Bank Live Ranking Configurations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-8 space-y-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                            Bank Live Ranking Matrix
                        </h1>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                            <BarChart2 className="w-3.5 h-3.5 text-amber-600" />
                            Competitive HUD
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                        Control which partner banks see real-time competitive rank feedback during quotation windows.
                    </p>
                </div>
                <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
                    <button
                        onClick={fetchData}
                        className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition shadow-sm"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Ranking Rule
                    </button>
                </div>
            </header>

            {/* Info Alert Box */}
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-4 border border-blue-100 flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                <div className="text-xs sm:text-sm text-slate-700 space-y-1">
                    <p className="font-semibold text-slate-900">How Hierarchy & Granularity Work:</p>
                    <p>
                        When a bank submits or queries a quote, the engine checks for the most specific rule first:
                        <span className="font-medium text-indigo-900"> Specific Customer Entity &rarr; Specific Customer &rarr; All Customers (Global Bank Rule)</span>.
                        If no rule exists, live ranking is disabled by default.
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                            type="text"
                            placeholder="Search bank or customer..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition"
                        />
                    </div>

                    {/* Bank Filter */}
                    <div>
                        <select
                            value={selectedBankFilter}
                            onChange={(e) => setSelectedBankFilter(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition font-medium"
                        >
                            <option value="">All Banks</option>
                            {banks.map(b => (
                                <option key={b.id} value={b.id}>{b.name || b.bank_name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Trade Type Filter */}
                    <div>
                        <select
                            value={tradeTypeFilter}
                            onChange={(e) => setTradeTypeFilter(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition font-medium"
                        >
                            <option value="">All Services (FX & T-Bills)</option>
                            <option value="FX_SPOT">FX Spot Only</option>
                            <option value="TBILL">Treasury Bills Only</option>
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition font-medium"
                        >
                            <option value="">All Statuses</option>
                            <option value="true">Active Only</option>
                            <option value="false">Disabled Only</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table / List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {filteredConfigs.length === 0 ? (
                    <div className="text-center py-16 px-4">
                        <BarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-slate-800">No Ranking Rules Found</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                            {configs.length === 0
                                ? 'No live ranking configuration rules have been created yet. Click "Add Ranking Rule" above to create one.'
                                : 'No rules match your selected filters.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    <th className="py-3.5 px-4 sm:px-6">Target Bank</th>
                                    <th className="py-3.5 px-4">Service</th>
                                    <th className="py-3.5 px-4">Customer Scope</th>
                                    <th className="py-3.5 px-4">Entity Scope</th>
                                    <th className="py-3.5 px-4 text-center">Status</th>
                                    <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                                {filteredConfigs.map((cfg) => {
                                    return (
                                        <tr key={cfg.id} className="hover:bg-slate-50/60 transition">
                                            {/* Bank */}
                                            <td className="py-4 px-4 sm:px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 font-bold text-xs">
                                                        <Landmark className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900">{cfg.bank_name || `Bank #${cfg.bank_id}`}</div>
                                                        <div className="text-[10px] text-slate-400">{cfg.bank_code || 'Counterparty'}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Service / Trade Type */}
                                            <td className="py-4 px-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    cfg.trade_type === 'FX_SPOT'
                                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                        : cfg.trade_type === 'TBILL'
                                                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                }`}>
                                                    {cfg.trade_type === 'BOTH' ? 'FX Spot & T-Bills' : cfg.trade_type === 'FX_SPOT' ? 'FX Spot Only' : 'T-Bills Only'}
                                                </span>
                                            </td>

                                            {/* Customer Scope */}
                                            <td className="py-4 px-4">
                                                {cfg.scope_type === 'ALL_CUSTOMERS' ? (
                                                    <span className="inline-flex items-center gap-1.5 text-slate-600 font-semibold text-[11px]">
                                                        <Users className="w-3.5 h-3.5 text-slate-400" />
                                                        All Platform Corporates
                                                    </span>
                                                ) : (
                                                    <div>
                                                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                                            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                                                            {cfg.customer_name || `Customer #${cfg.customer_id}`}
                                                        </div>
                                                        <span className="text-[10px] text-indigo-600 font-medium">Specific Customer Rule</span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Entity Scope */}
                                            <td className="py-4 px-4">
                                                {cfg.scope_type === 'ALL_CUSTOMERS' ? (
                                                    <span className="text-slate-400 text-[11px]">—</span>
                                                ) : cfg.entity_scope_type === 'SPECIFIC_ENTITY' ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                        <Layers className="w-3 h-3 text-amber-600" />
                                                        {cfg.entity_name || `Entity #${cfg.entity_id}`}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500 text-[11px]">All Subsidiaries / Entities</span>
                                                )}
                                            </td>

                                            {/* Status Toggle */}
                                            <td className="py-4 px-4 text-center">
                                                <button
                                                    onClick={() => handleToggleStatus(cfg)}
                                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition shadow-xs ${
                                                        cfg.is_enabled
                                                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {cfg.is_enabled ? (
                                                        <>
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                            Active
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle className="w-3 h-3 text-slate-400" />
                                                            Disabled
                                                        </>
                                                    )}
                                                </button>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-4 px-4 sm:px-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenEdit(cfg)}
                                                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                        title="Edit Rule"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(cfg.id)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                        title="Delete Rule"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 relative animate-fade-in-up">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                <BarChart2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    {editingConfig ? 'Edit Ranking Rule' : 'New Live Ranking Rule'}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Configure live competitive feedback visibility for this counterparty.
                                </p>
                            </div>
                        </div>

                        {modalError && (
                            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {modalError}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Bank Selection */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Partner Bank *
                                </label>
                                <select
                                    required
                                    value={formData.bank_id}
                                    onChange={(e) => setFormData({ ...formData, bank_id: e.target.value })}
                                    className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-white focus:border-indigo-600 outline-none font-medium"
                                >
                                    <option value="">Select a Bank...</option>
                                    {banks.map(b => (
                                        <option key={b.id} value={b.id}>
                                            {b.name || b.bank_name} {b.swift_code ? `(${b.swift_code})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Trade Type Selection */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Quotation Service
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { key: 'BOTH', label: 'All Services' },
                                        { key: 'FX_SPOT', label: 'FX Spot' },
                                        { key: 'TBILL', label: 'T-Bills' }
                                    ].map(t => (
                                        <button
                                            key={t.key}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, trade_type: t.key })}
                                            className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                                                formData.trade_type === t.key
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Scope Type */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Customer Scope
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, scope_type: 'ALL_CUSTOMERS', customer_id: '', entity_id: '' })}
                                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                                            formData.scope_type === 'ALL_CUSTOMERS'
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        All Corporates (Global)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, scope_type: 'SPECIFIC_CUSTOMER' })}
                                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                                            formData.scope_type === 'SPECIFIC_CUSTOMER'
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        Specific Customer
                                    </button>
                                </div>
                            </div>

                            {/* Specific Customer fields */}
                            {formData.scope_type === 'SPECIFIC_CUSTOMER' && (
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                            Select Corporate Customer *
                                        </label>
                                        <select
                                            required
                                            value={formData.customer_id}
                                            onChange={(e) => setFormData({ ...formData, customer_id: e.target.value, entity_id: '' })}
                                            className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-white focus:border-indigo-600 outline-none font-medium"
                                        >
                                            <option value="">Select a Customer...</option>
                                            {customers.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.company_name || c.name || `Customer #${c.id}`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Entity Scope */}
                                    {formData.customer_id && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                                Entity / Subsidiary Scope
                                            </label>
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, entity_scope_type: 'ALL_ENTITIES', entity_id: '' })}
                                                    className={`py-1.5 px-2.5 text-[11px] font-bold rounded-lg border transition ${
                                                        formData.entity_scope_type === 'ALL_ENTITIES'
                                                            ? 'bg-slate-900 text-white border-slate-900'
                                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    All Entities
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, entity_scope_type: 'SPECIFIC_ENTITY' })}
                                                    className={`py-1.5 px-2.5 text-[11px] font-bold rounded-lg border transition ${
                                                        formData.entity_scope_type === 'SPECIFIC_ENTITY'
                                                            ? 'bg-slate-900 text-white border-slate-900'
                                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    Specific Entity
                                                </button>
                                            </div>

                                            {formData.entity_scope_type === 'SPECIFIC_ENTITY' && (
                                                <select
                                                    required
                                                    value={formData.entity_id}
                                                    onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
                                                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:border-indigo-600 outline-none font-medium mt-1"
                                                >
                                                    <option value="">Select Entity / Subsidiary...</option>
                                                    {customerEntities.map(e => (
                                                        <option key={e.id} value={e.id}>
                                                            {e.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Enable / Disable Switch */}
                            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                                <div>
                                    <div className="text-xs font-bold text-slate-900">Enable Live Ranking</div>
                                    <div className="text-[11px] text-slate-500">
                                        When active, banks matching this rule will see their real-time rank badge.
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={formData.is_enabled}
                                    onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                            </div>

                            {/* Form Actions */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2.5 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
                                >
                                    {saving ? 'Saving...' : editingConfig ? 'Update Rule' : 'Create Rule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
