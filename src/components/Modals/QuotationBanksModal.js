import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, CheckCircle2, X, Building } from 'lucide-react';
import apiClient from '../../services/apiClient';

export default function QuotationBanksModal({ onClose }) {
    const [banks, setBanks] = useState([]);
    const [systemBanks, setSystemBanks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    const [formData, setFormData] = useState({
        bank_id: '',
        trade_type: 'BOTH',
        emails: ''
    });

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await apiClient.post('/end-user/quotations/banks', {
                bank_id: parseInt(formData.bank_id),
                trade_type: formData.trade_type,
                emails: formData.emails
            });
            setIsAdding(false);
            setFormData({ bank_id: '', trade_type: 'BOTH', emails: '' });
            fetchBanks();
        } catch (error) {
            alert('Failed to configure bank. It may already exist for this trade type.');
        }
    };

    const handleDelete = async (bankId) => {
        if (!window.confirm('Are you sure you want to remove this bank from the roster?')) return;
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
            case 'FX_SPOT': return 'bg-blue-100 text-blue-800';
            case 'TBILL': return 'bg-purple-100 text-purple-800';
            case 'BOTH': return 'bg-emerald-100 text-emerald-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full flex items-center justify-center z-50">
            <div className="relative bg-gray-50 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col mx-4">

                {/* Header Ribbon */}
                <div className="bg-gray-900 text-white px-6 py-4 rounded-t-xl flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold flex items-center font-serif">
                            <Building className="w-5 h-5 mr-3" />
                            Quotation Banks Manager
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">Configure counterparty banks and their dedicated routing emails for Quotations.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">

                    <div className="flex justify-end">
                        {!isAdding && (
                            <button
                                onClick={() => setIsAdding(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
                            >
                                <Plus size={18} />
                                Add Quotation Bank
                            </button>
                        )}
                    </div>

                    {isAdding && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-fade-in shrink-0">
                            <div className="flex justify-between items-center mb-6 border-b pb-3">
                                <h2 className="text-lg font-semibold text-gray-800">Configure New Bank Routing</h2>
                                <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Bank</label>
                                        <select
                                            required
                                            className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                            value={formData.bank_id}
                                            onChange={(e) => setFormData({ ...formData, bank_id: e.target.value })}
                                        >
                                            <option value="">-- Choose System Bank --</option>
                                            {systemBanks.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Trade Type Routing</label>
                                        <select
                                            className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                            value={formData.trade_type}
                                            onChange={(e) => setFormData({ ...formData, trade_type: e.target.value })}
                                        >
                                            <option value="BOTH">FX Spot & T-Bills</option>
                                            <option value="FX_SPOT">FX Spot Only</option>
                                            <option value="TBILL">T-Bills Only</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Email List</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="fx-desk@bank.com, tbill-desk@bank.com (comma separated)"
                                            className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                            value={formData.emails}
                                            onChange={(e) => setFormData({ ...formData, emails: e.target.value })}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">These addresses will receive the secure Quotation links.</p>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg shadow-sm hover:bg-emerald-700 transition-colors"
                                    >
                                        Save Configuration
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Bank Name</th>
                                        <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Assigned Trade Types</th>
                                        <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Routing Emails</th>
                                        <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {isLoading ? (
                                        <tr><td colSpan="4" className="p-8 text-center text-gray-500">Loading configurations...</td></tr>
                                    ) : banks.length === 0 ? (
                                        <tr><td colSpan="4" className="p-8 text-center text-gray-500">No quotation banks configured yet.</td></tr>
                                    ) : (
                                        banks.map(bank => (
                                            <tr key={bank.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4 font-medium text-gray-900">{bank.bank?.name || `Bank #${bank.bank_id}`}</td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTradeTypeBadgeColor(bank.trade_type)}`}>
                                                        {getTradeTypeLabel(bank.trade_type)}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm text-gray-600 font-mono break-all">{bank.emails}</td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => handleDelete(bank.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 transition-colors bg-white rounded-full hover:bg-red-50"
                                                        title="Remove Configuration"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                {/* Footer Window */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 rounded-lg font-medium text-sm transition-colors shadow-sm"
                    >
                        Close Manager
                    </button>
                </div>

            </div>
        </div>
    );
}
