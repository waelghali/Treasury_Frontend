import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/apiService';
import { toast } from 'react-toastify';
import { Users, Search, Edit3, Save, RefreshCw, X, Loader2, AlertCircle } from 'lucide-react';

export default function RequestorDirectoryTab() {
    const [requestors, setRequestors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [editingEmail, setEditingEmail] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);

    const fetchRequestors = async () => {
        setLoading(true);
        try {
            const data = await apiRequest('/end-user/issuance/requestors/directory', 'GET');
            setRequestors(data || []);
        } catch (err) {
            toast.error('Failed to load requestor directory');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequestors();
    }, []);

    const filtered = requestors.filter(r => {
        if (!searchTerm) return true;
        const s = searchTerm.toLowerCase();
        return (
            (r.email && r.email.toLowerCase().includes(s)) ||
            (r.name && r.name.toLowerCase().includes(s)) ||
            (r.department && r.department.toLowerCase().includes(s)) ||
            (r.employee_id && r.employee_id.toLowerCase().includes(s))
        );
    });

    const startEdit = (req) => {
        setEditingEmail(req.email);
        setEditForm({ ...req, update_all_lgs: true });
    };

    const cancelEdit = () => {
        setEditingEmail(null);
        setEditForm({});
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                old_email: editingEmail,
                updated_profile: {
                    name: editForm.name,
                    email: editForm.email,
                    department: editForm.department,
                    job_title: editForm.job_title,
                    phone_number: editForm.phone_number,
                    employee_id: editForm.employee_id,
                    manager_email: editForm.manager_email,
                    second_line_manager_email: editForm.second_line_manager_email
                },
                update_all_lgs: editForm.update_all_lgs !== false // default true
            };
            
            await apiRequest('/end-user/issuance/requestors/profile', 'PUT', payload);
            toast.success('Requestor profile updated successfully');
            setEditingEmail(null);
            fetchRequestors();
        } catch (err) {
            toast.error(err?.response?.data?.detail || err.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Requestor Directory</h3>
                        <p className="text-xs text-slate-500">Manage all internal requestors and their assignments</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search directory..."
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white"
                        />
                    </div>
                    <button onClick={fetchRequestors} className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                    <p>Loading directory...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-xl border border-slate-200">
                    <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No requestors found</p>
                    <p className="text-sm text-slate-400 mt-1">Try adjusting your search</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Requestor Details</th>
                                    <th className="px-6 py-4">Department & Role</th>
                                    <th className="px-6 py-4">Managers</th>
                                    <th className="px-6 py-4">Active LGs</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map((req, idx) => {
                                    const isEditing = editingEmail === req.email;
                                    
                                    if (isEditing) {
                                        return (
                                            <tr key={`edit-${idx}`} className="bg-blue-50/50">
                                                <td colSpan={5} className="px-6 py-4">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                                                            <span className="font-bold text-blue-800 text-sm">Edit Requestor: {req.email}</span>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email <span className="text-red-500">*</span></label>
                                                                <input type="email" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Full Name</label>
                                                                <input type="text" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                                                                <input type="text" value={editForm.phone_number || ''} onChange={e => setEditForm({...editForm, phone_number: e.target.value})} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Department</label>
                                                                <input type="text" value={editForm.department || ''} onChange={e => setEditForm({...editForm, department: e.target.value})} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Job Title</label>
                                                                <input type="text" value={editForm.job_title || ''} onChange={e => setEditForm({...editForm, job_title: e.target.value})} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Employee ID</label>
                                                                <input type="text" value={editForm.employee_id || ''} onChange={e => setEditForm({...editForm, employee_id: e.target.value})} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Manager Email</label>
                                                                <input type="email" value={editForm.manager_email || ''} onChange={e => setEditForm({...editForm, manager_email: e.target.value})} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">2nd Manager Email</label>
                                                                <input type="email" value={editForm.second_line_manager_email || ''} onChange={e => setEditForm({...editForm, second_line_manager_email: e.target.value})} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between pt-2 border-t border-blue-100">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input type="checkbox" checked={editForm.update_all_lgs} onChange={e => setEditForm({...editForm, update_all_lgs: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                                <span className="text-xs font-medium text-slate-700">Apply updates to all {req.lg_count} active LGs linked to this requestor</span>
                                                            </label>
                                                            <div className="flex space-x-2">
                                                                <button onClick={cancelEdit} disabled={saving} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">Cancel</button>
                                                                <button onClick={handleSave} disabled={saving || !editForm.email} className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Profile
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }

                                    return (
                                        <tr key={`req-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{req.name || 'Unnamed Requestor'}</span>
                                                    <span className="text-xs text-slate-500">{req.email}</span>
                                                    {req.phone_number && <span className="text-[10px] text-slate-400 mt-0.5">{req.phone_number}</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-800">{req.department || '—'}</span>
                                                    <span className="text-xs text-slate-500">{req.job_title || '—'}</span>
                                                    {req.employee_id && <span className="text-[10px] text-slate-400 mt-0.5 border border-slate-200 bg-slate-100 px-1 rounded inline-block w-max">ID: {req.employee_id}</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col space-y-1">
                                                    <span className="text-xs text-slate-700 flex items-center gap-1">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase w-6">L1:</span> 
                                                        {req.manager_email || '—'}
                                                    </span>
                                                    <span className="text-xs text-slate-700 flex items-center gap-1">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase w-6">L2:</span> 
                                                        {req.second_line_manager_email || '—'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs ring-1 ring-inset ring-blue-600/20">
                                                    {req.lg_count} LG(s)
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => startEdit(req)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-block" title="Edit Profile">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
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
    );
}
