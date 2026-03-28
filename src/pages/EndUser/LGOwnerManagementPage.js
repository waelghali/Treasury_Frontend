import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, ArrowRight, Loader2, RefreshCw, ChevronDown } from 'lucide-react';
import { apiRequest } from '../../services/apiService';
import { toast } from 'react-toastify';

export default function LGOwnerManagementPage() {
    const [records, setRecords] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedLGs, setSelectedLGs] = useState([]);
    const [newOwnerId, setNewOwnerId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [singleChangeModal, setSingleChangeModal] = useState(null);
    const [singleNewOwner, setSingleNewOwner] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [lgData, userData] = await Promise.all([
                apiRequest('/issuance/issued-lgs', 'GET'),
                apiRequest('/corporate-admin/users/', 'GET'),
            ]);
            setRecords(Array.isArray(lgData) ? lgData : []);
            // Filter to end_user role only (valid ownership targets)
            const endUsers = (Array.isArray(userData) ? userData : []).filter(
                u => ['end_user', 'corporate_admin'].includes(u.role) && !u.is_deleted
            );
            setUsers(endUsers);
        } catch (err) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const liveStatuses = ['ACTIVE', 'LG_ISSUED', 'DELIVERED_TO_BANK', 'INTERNAL_PROCESSING'];

    const filtered = useMemo(() => {
        return records.filter(lg => {
            if (statusFilter !== 'ALL' && lg.status !== statusFilter) return false;
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                return (
                    (lg.lg_ref_number || '').toLowerCase().includes(term) ||
                    (lg.beneficiary_name || '').toLowerCase().includes(term) ||
                    (lg.bank_name || '').toLowerCase().includes(term) ||
                    (lg.current_owner_name || '').toLowerCase().includes(term)
                );
            }
            return true;
        });
    }, [records, searchTerm, statusFilter]);

    const getUserName = (userId) => {
        const u = users.find(u => u.id === userId);
        return u ? (u.full_name || u.email) : 'Unassigned';
    };

    // Single LG owner change
    const handleSingleOwnerChange = async () => {
        if (!singleChangeModal || !singleNewOwner) return;
        setSubmitting(true);
        try {
            await apiRequest(`/issuance/issued-lgs/${singleChangeModal.id}/maintenance`, 'POST', {
                action_type: 'CHANGE_OWNERSHIP',
                action_data: { new_owner_user_id: parseInt(singleNewOwner) },
                notes: `Ownership changed via Owner Management page`,
            });
            toast.success(`Owner changed for LG ${singleChangeModal.lg_ref_number}`);
            setSingleChangeModal(null);
            setSingleNewOwner('');
            fetchData();
        } catch (err) {
            toast.error(err?.response?.data?.detail || err?.message || 'Failed to change owner');
        } finally {
            setSubmitting(false);
        }
    };

    // Bulk owner change
    const handleBulkOwnerChange = async () => {
        if (selectedLGs.length === 0 || !newOwnerId) {
            toast.error('Select LGs and a new owner');
            return;
        }
        setSubmitting(true);
        let success = 0;
        let failed = 0;
        for (const lgId of selectedLGs) {
            try {
                await apiRequest(`/issuance/issued-lgs/${lgId}/maintenance`, 'POST', {
                    action_type: 'CHANGE_OWNERSHIP',
                    action_data: { new_owner_user_id: parseInt(newOwnerId) },
                    notes: `Bulk ownership change via Owner Management page`,
                });
                success++;
            } catch {
                failed++;
            }
        }
        toast.success(`${success} LG(s) reassigned${failed > 0 ? `, ${failed} failed` : ''}`);
        setSelectedLGs([]);
        setNewOwnerId('');
        setSubmitting(false);
        fetchData();
    };

    const toggleSelect = (id) => {
        setSelectedLGs(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedLGs.length === filtered.length) {
            setSelectedLGs([]);
        } else {
            setSelectedLGs(filtered.map(lg => lg.id));
        }
    };

    const statusColors = {
        ACTIVE: 'bg-emerald-100 text-emerald-700',
        LG_ISSUED: 'bg-emerald-100 text-emerald-700',
        EXPIRED: 'bg-slate-200 text-slate-600',
        LIQUIDATED: 'bg-red-100 text-red-700',
        CLOSED: 'bg-slate-300 text-slate-700',
        INTERNAL_PROCESSING: 'bg-amber-100 text-amber-700',
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">LG Owner Management</h1>
                    <p className="text-sm text-slate-500 mt-1">Reassign LG ownership — single or bulk</p>
                </div>
                <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Bulk Action Bar */}
            {selectedLGs.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between animate-in">
                    <p className="text-sm font-bold text-blue-800">
                        {selectedLGs.length} LG{selectedLGs.length > 1 ? 's' : ''} selected
                    </p>
                    <div className="flex items-center gap-3">
                        <select
                            value={newOwnerId}
                            onChange={e => setNewOwnerId(e.target.value)}
                            className="px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white min-w-[200px]"
                        >
                            <option value="">Select new owner...</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.role})</option>
                            ))}
                        </select>
                        <button
                            onClick={handleBulkOwnerChange}
                            disabled={!newOwnerId || submitting}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                            Reassign
                        </button>
                        <button onClick={() => setSelectedLGs([])}
                            className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700">
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by LG ref, beneficiary, bank, or owner..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white shadow-sm"
                >
                    <option value="ALL">All Statuses</option>
                    {['ACTIVE', 'LG_ISSUED', 'INTERNAL_PROCESSING', 'EXPIRED', 'LIQUIDATED', 'CLOSED'].map(s => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-4 py-3 text-left">
                                <input
                                    type="checkbox"
                                    checked={selectedLGs.length === filtered.length && filtered.length > 0}
                                    onChange={toggleSelectAll}
                                    className="rounded border-slate-300"
                                />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">LG Reference</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Beneficiary</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Bank</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Current Owner</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={8} className="text-center py-12 text-slate-400">No LGs found</td></tr>
                        ) : filtered.map(lg => (
                            <tr key={lg.id} className={`hover:bg-slate-50 transition-colors ${selectedLGs.includes(lg.id) ? 'bg-blue-50/50' : ''}`}>
                                <td className="px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedLGs.includes(lg.id)}
                                        onChange={() => toggleSelect(lg.id)}
                                        className="rounded border-slate-300"
                                    />
                                </td>
                                <td className="px-4 py-3 font-mono font-bold text-slate-800">{lg.lg_ref_number || '—'}</td>
                                <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">{lg.beneficiary_name || '—'}</td>
                                <td className="px-4 py-3 text-slate-600">{lg.bank_name || '—'}</td>
                                <td className="px-4 py-3 text-right font-mono">
                                    <span className="text-slate-400 text-xs mr-1">{lg.currency_code}</span>
                                    {lg.current_amount ? parseFloat(lg.current_amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[lg.status] || 'bg-slate-100 text-slate-600'}`}>
                                        {lg.status?.replace(/_/g, ' ')}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                                            {(lg.current_owner_name || getUserName(lg.current_owner_user_id) || '?').charAt(0).toUpperCase()}
                                        </span>
                                        <span className="text-slate-700 text-xs font-medium truncate max-w-[120px]">
                                            {lg.current_owner_name || getUserName(lg.current_owner_user_id)}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {liveStatuses.includes(lg.status) && (
                                        <button
                                            onClick={() => { setSingleChangeModal(lg); setSingleNewOwner(''); }}
                                            className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                        >
                                            Change
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Summary */}
            <div className="text-xs text-slate-400 text-right">
                Showing {filtered.length} of {records.length} LGs
            </div>

            {/* Single Owner Change Modal */}
            {singleChangeModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSingleChangeModal(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-200">
                            <h3 className="text-lg font-black text-slate-900">Change Owner</h3>
                            <p className="text-xs text-slate-500 mt-1">LG {singleChangeModal.lg_ref_number} · {singleChangeModal.beneficiary_name}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs text-slate-500">Current Owner</p>
                                <p className="text-sm font-bold text-slate-800">
                                    {singleChangeModal.current_owner_name || getUserName(singleChangeModal.current_owner_user_id)}
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">New Owner</label>
                                <select
                                    value={singleNewOwner}
                                    onChange={e => setSingleNewOwner(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                                >
                                    <option value="">Select user...</option>
                                    {users.filter(u => u.id !== singleChangeModal.current_owner_user_id).map(u => (
                                        <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.role})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                            <button onClick={() => setSingleChangeModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                            <button
                                onClick={handleSingleOwnerChange}
                                disabled={!singleNewOwner || submitting}
                                className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                                Confirm Change
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
