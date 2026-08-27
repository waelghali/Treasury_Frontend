import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../services/apiService';
import { toast } from 'react-toastify';
import {
    Calendar, Clock, Building2, Check, X, Edit3, Trash2,
    Plus, Save, AlertCircle, RefreshCw, Send, CheckCircle2, Globe,
    Filter, Search, Layers, ShieldCheck, CheckSquare, Square, Sliders, ArrowLeft
} from 'lucide-react';

export default function InboxScheduleConfigPage() {
    const navigate = useNavigate();

    const [banks, setBanks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('RELATIONSHIP'); // RELATIONSHIP, ALL, SCHEDULED, UNSCHEDULED

    // Multi-Selection
    const [selectedBankIds, setSelectedBankIds] = useState([]);

    // Single Edit Modal
    const [editingBank, setEditingBank] = useState(null);
    const [frequency, setFrequency] = useState('MONTHLY');
    const [dayOfMonth, setDayOfMonth] = useState(1);
    const [dayOfWeek, setDayOfWeek] = useState(0);
    const [recipientEmails, setRecipientEmails] = useState('');
    const [customSubject, setCustomSubject] = useState('');
    const [customBody, setCustomBody] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [saving, setSaving] = useState(false);

    // Bulk Edit Modal
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkFrequency, setBulkFrequency] = useState('MONTHLY');
    const [bulkDayOfMonth, setBulkDayOfMonth] = useState(1);
    const [bulkDayOfWeek, setBulkDayOfWeek] = useState(0);
    const [bulkSubject, setBulkSubject] = useState('');
    const [bulkBody, setBulkBody] = useState('');
    const [bulkIsActive, setBulkIsActive] = useState(true);
    const [savingBulk, setSavingBulk] = useState(false);

    // Bank Domain Quick Edit
    const [editingDomainBankId, setEditingDomainBankId] = useState(null);
    const [bankDomainInput, setBankDomainInput] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await apiRequest('/inbox/banks-summary');
            setBanks(data || []);
        } catch (e) {
            toast.error('Failed to load bank directory and schedule data');
        } finally {
            setLoading(false);
        }
    };

    // Filtered banks computation
    const filteredBanks = useMemo(() => {
        return banks.filter(bank => {
            // Text Search
            const q = searchQuery.toLowerCase();
            const matchesQuery = !q ||
                bank.name.toLowerCase().includes(q) ||
                (bank.email_domain && bank.email_domain.toLowerCase().includes(q));

            if (!matchesQuery) return false;

            // Category Filter
            if (activeFilter === 'RELATIONSHIP') {
                return bank.has_relationship;
            } else if (activeFilter === 'SCHEDULED') {
                return bank.schedule && bank.schedule.is_active;
            } else if (activeFilter === 'UNSCHEDULED') {
                return !bank.schedule || !bank.schedule.is_active;
            }
            return true; // ALL
        });
    }, [banks, searchQuery, activeFilter]);

    // Summary counts
    const counts = useMemo(() => {
        const rel = banks.filter(b => b.has_relationship).length;
        const sched = banks.filter(b => b.schedule && b.schedule.is_active).length;
        const unsched = banks.length - sched;
        return { total: banks.length, relationship: rel, scheduled: sched, unscheduled: unsched };
    }, [banks]);

    // Select / Deselect Handlers
    const toggleSelectBank = (bankId) => {
        setSelectedBankIds(prev =>
            prev.includes(bankId) ? prev.filter(id => id !== bankId) : [...prev, bankId]
        );
    };

    const toggleSelectAllFiltered = () => {
        const currentFilteredIds = filteredBanks.map(b => b.id);
        const allSelected = currentFilteredIds.every(id => selectedBankIds.includes(id));
        if (allSelected) {
            setSelectedBankIds(prev => prev.filter(id => !currentFilteredIds.includes(id)));
        } else {
            setSelectedBankIds(prev => Array.from(new Set([...prev, ...currentFilteredIds])));
        }
    };

    const handleSelectAllRelationship = () => {
        const relIds = banks.filter(b => b.has_relationship).map(b => b.id);
        setSelectedBankIds(relIds);
        setActiveFilter('RELATIONSHIP');
    };

    // Single Edit
    const openEditModal = (bank) => {
        setEditingBank(bank);
        const sched = bank.schedule;
        if (sched) {
            setFrequency(sched.frequency || 'MONTHLY');
            setDayOfMonth(sched.day_of_month || 1);
            setDayOfWeek(sched.day_of_week || 0);
            setRecipientEmails(
                Array.isArray(sched.recipient_emails)
                    ? sched.recipient_emails.join(', ')
                    : sched.recipient_emails || ''
            );
            setCustomSubject(sched.custom_subject || '');
            setCustomBody(sched.custom_body || '');
            setIsActive(sched.is_active ?? true);
        } else {
            setFrequency('MONTHLY');
            setDayOfMonth(1);
            setDayOfWeek(0);
            setRecipientEmails('');
            setCustomSubject('');
            setCustomBody('');
            setIsActive(true);
        }
    };

    const handleSaveSingleConfig = async (e) => {
        e.preventDefault();
        if (!editingBank) return;
        setSaving(true);
        try {
            const emailsArray = recipientEmails.trim()
                ? recipientEmails.split(',').map(s => s.trim()).filter(Boolean)
                : null;

            const payload = {
                bank_id: editingBank.id,
                request_type: 'LG_POSITION',
                is_active: isActive,
                frequency,
                day_of_month: frequency === 'MONTHLY' ? parseInt(dayOfMonth) : null,
                day_of_week: frequency === 'WEEKLY' ? parseInt(dayOfWeek) : null,
                recipient_emails: emailsArray,
                custom_subject: customSubject || null,
                custom_body: customBody || null
            };

            await apiRequest('/inbox/schedule-configs', 'POST', payload);
            toast.success(`Schedule saved for ${editingBank.name}!`);
            setEditingBank(null);
            await loadData();
        } catch (e) {
            toast.error(e.detail || 'Failed saving schedule configuration');
        } finally {
            setSaving(false);
        }
    };

    // Bulk Save
    const handleApplyBulkSchedule = async (e) => {
        e.preventDefault();
        if (!selectedBankIds.length) {
            toast.warning('Please select at least one bank');
            return;
        }
        setSavingBulk(true);
        try {
            const payload = {
                bank_ids: selectedBankIds,
                request_type: 'LG_POSITION',
                is_active: bulkIsActive,
                frequency: bulkFrequency,
                day_of_month: bulkFrequency === 'MONTHLY' ? parseInt(bulkDayOfMonth) : null,
                day_of_week: bulkFrequency === 'WEEKLY' ? parseInt(bulkDayOfWeek) : null,
                custom_subject: bulkSubject || null,
                custom_body: bulkBody || null
            };

            const res = await apiRequest('/inbox/schedule-configs/bulk', 'POST', payload);
            toast.success(res.message || `Schedule applied to ${selectedBankIds.length} banks!`);
            setShowBulkModal(false);
            setSelectedBankIds([]);
            await loadData();
        } catch (e) {
            toast.error(e.detail || 'Failed to apply bulk schedule');
        } finally {
            setSavingBulk(false);
        }
    };

    const handleDeleteConfig = async (configId, bankName) => {
        if (!window.confirm(`Are you sure you want to remove the automated schedule for ${bankName}?`)) return;
        try {
            await apiRequest(`/inbox/schedule-configs/${configId}`, 'DELETE');
            toast.info(`Schedule removed for ${bankName}.`);
            await loadData();
        } catch (e) {
            toast.error('Failed to delete schedule');
        }
    };

    const handleSaveBankDomain = async (bankId) => {
        try {
            await apiRequest(`/inbox/banks/${bankId}/domain`, 'PUT', {
                email_domain: bankDomainInput.trim() || null
            });
            toast.success('Bank domain updated!');
            setEditingDomainBankId(null);
            await loadData();
        } catch (e) {
            toast.error('Failed to update bank domain');
        }
    };

    const areAllFilteredSelected = filteredBanks.length > 0 &&
        filteredBanks.every(b => selectedBankIds.includes(b.id));

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/corporate-admin/inbox')}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        title="Back to Smart Inbox"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Position Request Schedules</h1>
                        <p className="text-sm text-gray-500">
                            Configure automated recurring emails to banks requesting official LG position reports.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSelectAllRelationship}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition shadow-xs"
                    >
                        <ShieldCheck className="w-4 h-4" />
                        Select All Relationship Banks ({counts.relationship})
                    </button>
                    {selectedBankIds.length > 0 && (
                        <button
                            onClick={() => setShowBulkModal(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-md"
                        >
                            <Sliders className="w-4 h-4" />
                            Set Schedule for {selectedBankIds.length} Selected
                        </button>
                    )}
                </div>
            </div>

            {/* Smart Filter Chips & Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-full sm:w-auto overflow-x-auto text-xs">
                        <button
                            onClick={() => setActiveFilter('RELATIONSHIP')}
                            className={`px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 ${
                                activeFilter === 'RELATIONSHIP'
                                    ? 'bg-white text-blue-700 shadow-xs'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                            Relationship Banks
                            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10px]">
                                {counts.relationship}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveFilter('SCHEDULED')}
                            className={`px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 ${
                                activeFilter === 'SCHEDULED'
                                    ? 'bg-white text-emerald-700 shadow-xs'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Scheduled
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px]">
                                {counts.scheduled}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveFilter('UNSCHEDULED')}
                            className={`px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 ${
                                activeFilter === 'UNSCHEDULED'
                                    ? 'bg-white text-amber-700 shadow-xs'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Unscheduled
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px]">
                                {counts.unscheduled}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveFilter('ALL')}
                            className={`px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 ${
                                activeFilter === 'ALL'
                                    ? 'bg-white text-gray-900 shadow-xs'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            All Banks
                            <span className="px-1.5 py-0.2 bg-gray-200 text-gray-700 rounded-full text-[10px]">
                                {counts.total}
                            </span>
                        </button>
                    </div>

                    {/* Search Box */}
                    <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by bank name or @domain..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                    </div>
                </div>

                {/* Multi-Select Header Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={toggleSelectAllFiltered}
                            className="flex items-center gap-1.5 font-semibold text-gray-700 hover:text-blue-600"
                        >
                            {areAllFilteredSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                                <Square className="w-4 h-4 text-gray-400" />
                            )}
                            <span>Select All in this View ({filteredBanks.length})</span>
                        </button>
                        {selectedBankIds.length > 0 && (
                            <span className="text-blue-600 font-bold ml-2">
                                • {selectedBankIds.length} Selected
                            </span>
                        )}
                    </div>
                    {selectedBankIds.length > 0 && (
                        <button
                            onClick={() => setSelectedBankIds([])}
                            className="text-xs text-gray-400 hover:text-gray-600 underline"
                        >
                            Clear Selection
                        </button>
                    )}
                </div>
            </div>

            {/* Bank List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        Loading bank directory...
                    </div>
                ) : filteredBanks.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm font-semibold text-gray-700">No banks match the selected filter.</p>
                        <p className="text-xs text-gray-400 mt-1">Try switching to "All Banks" or clearing your search.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {filteredBanks.map((bank) => {
                            const isSelected = selectedBankIds.includes(bank.id);
                            const sched = bank.schedule;
                            const isEditingDomain = editingDomainBankId === bank.id;

                            return (
                                <div
                                    key={bank.id}
                                    className={`p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition ${
                                        isSelected ? 'bg-blue-50/40' : 'hover:bg-gray-50/50'
                                    }`}
                                >
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <button
                                            type="button"
                                            onClick={() => toggleSelectBank(bank.id)}
                                            className="mt-1 text-gray-400 hover:text-blue-600"
                                        >
                                            {isSelected ? (
                                                <CheckSquare className="w-4 h-4 text-blue-600" />
                                            ) : (
                                                <Square className="w-4 h-4 text-gray-300" />
                                            )}
                                        </button>

                                        <div className="space-y-1.5 flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                                                <span className="font-bold text-gray-900 text-sm">{bank.name}</span>

                                                {/* Smart Relationship Badges */}
                                                {bank.lg_issuance_count > 0 && (
                                                    <span className="text-[10.5px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
                                                        {bank.lg_issuance_count} Issued LGs
                                                    </span>
                                                )}
                                                {bank.facility_count > 0 && (
                                                    <span className="text-[10.5px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                                                        Facility Active
                                                    </span>
                                                )}
                                            </div>

                                            {/* Domain mapping inline */}
                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                <span className="text-gray-500">Domain:</span>
                                                {isEditingDomain ? (
                                                    <div className="inline-flex items-center gap-1">
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. cibeg.com"
                                                            value={bankDomainInput}
                                                            onChange={(e) => setBankDomainInput(e.target.value)}
                                                            className="px-2 py-0.5 text-xs border rounded w-36 focus:ring-1 focus:ring-blue-500"
                                                        />
                                                        <button
                                                            onClick={() => handleSaveBankDomain(bank.id)}
                                                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                                            title="Save Domain"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingDomainBankId(null)}
                                                            className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <span className={`font-mono text-xs ${bank.email_domain ? 'text-blue-700 font-semibold' : 'text-gray-400 italic'}`}>
                                                            {bank.email_domain ? `@${bank.email_domain}` : 'Not configured'}
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                setEditingDomainBankId(bank.id);
                                                                setBankDomainInput(bank.email_domain || '');
                                                            }}
                                                            className="text-gray-400 hover:text-blue-600 p-0.5"
                                                            title="Edit Recognized Domain"
                                                        >
                                                            <Edit3 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Schedule summary */}
                                            <div className="text-xs text-gray-500 flex items-center gap-2 pt-0.5">
                                                <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                {sched ? (
                                                    <span>
                                                        <strong className="text-gray-800">{sched.frequency}:</strong>{' '}
                                                        {sched.frequency === 'MONTHLY' && `Day ${sched.day_of_month} of every month at 08:00 AM`}
                                                        {sched.frequency === 'WEEKLY' && `Every ${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][sched.day_of_week || 0]} at 08:00 AM`}
                                                        {sched.frequency === 'DAILY' && 'Every Day at 08:00 AM'}
                                                        {sched.last_sent_at && (
                                                            <span className="text-gray-400 ml-2">
                                                                (Last sent: {new Date(sched.last_sent_at).toLocaleDateString()})
                                                            </span>
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 italic">No automated recurring schedule set.</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {sched ? (
                                            <>
                                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                                                    sched.is_active
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-gray-100 text-gray-500 border-gray-200'
                                                }`}>
                                                    {sched.is_active ? 'Active' : 'Paused'}
                                                </span>
                                                <button
                                                    onClick={() => openEditModal(bank)}
                                                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                                    title="Edit Schedule"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteConfig(sched.id, bank.name)}
                                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                                                    title="Remove Schedule"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => openEditModal(bank)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Set Schedule
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ─── MODAL: Single Bank Schedule Edit ─── */}
            {editingBank && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <form
                        onSubmit={handleSaveSingleConfig}
                        className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-gray-200"
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-600" />
                                Schedule: {editingBank.name}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setEditingBank(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 uppercase mb-1">Frequency</label>
                                <select
                                    value={frequency}
                                    onChange={(e) => setFrequency(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                                >
                                    <option value="MONTHLY">Monthly</option>
                                    <option value="WEEKLY">Weekly</option>
                                    <option value="DAILY">Daily</option>
                                </select>
                            </div>

                            {frequency === 'MONTHLY' && (
                                <div>
                                    <label className="block font-bold text-gray-700 uppercase mb-1">Day of Month</label>
                                    <select
                                        value={dayOfMonth}
                                        onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                                    >
                                        {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                                            <option key={d} value={d}>Day {d} of the month</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {frequency === 'WEEKLY' && (
                                <div>
                                    <label className="block font-bold text-gray-700 uppercase mb-1">Day of Week</label>
                                    <select
                                        value={dayOfWeek}
                                        onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                                    >
                                        <option value="0">Sunday</option>
                                        <option value="1">Monday</option>
                                        <option value="2">Tuesday</option>
                                        <option value="3">Wednesday</option>
                                        <option value="4">Thursday</option>
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block font-bold text-gray-700 uppercase mb-1">
                                    Recipient Emails <span className="text-gray-400 font-normal">(comma-separated)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="trade-ops@bank.com, guarantee-desk@bank.com"
                                    value={recipientEmails}
                                    onChange={(e) => setRecipientEmails(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="singleActive"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="singleActive" className="text-xs font-semibold text-gray-800">
                                    Enable automated scheduled execution
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setEditingBank(null)}
                                className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow"
                            >
                                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Schedule
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ─── MODAL: Bulk Schedule Edit ─── */}
            {showBulkModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <form
                        onSubmit={handleApplyBulkSchedule}
                        className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-gray-200"
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Sliders className="w-5 h-5 text-blue-600" />
                                    Bulk Schedule Configuration
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Applying rule across <strong className="text-blue-600">{selectedBankIds.length} selected banks</strong> simultaneously.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowBulkModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 uppercase mb-1">Frequency</label>
                                <select
                                    value={bulkFrequency}
                                    onChange={(e) => setBulkFrequency(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                                >
                                    <option value="MONTHLY">Monthly</option>
                                    <option value="WEEKLY">Weekly</option>
                                    <option value="DAILY">Daily</option>
                                </select>
                            </div>

                            {bulkFrequency === 'MONTHLY' && (
                                <div>
                                    <label className="block font-bold text-gray-700 uppercase mb-1">Day of Month</label>
                                    <select
                                        value={bulkDayOfMonth}
                                        onChange={(e) => setBulkDayOfMonth(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                                    >
                                        <option value="1">1st of the month</option>
                                        <option value="5">5th of the month</option>
                                        <option value="10">10th of the month</option>
                                        <option value="15">15th of the month</option>
                                        <option value="25">25th of the month</option>
                                        <option value="28">28th of the month (End of month)</option>
                                    </select>
                                </div>
                            )}

                            {bulkFrequency === 'WEEKLY' && (
                                <div>
                                    <label className="block font-bold text-gray-700 uppercase mb-1">Day of Week</label>
                                    <select
                                        value={bulkDayOfWeek}
                                        onChange={(e) => setBulkDayOfWeek(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                                    >
                                        <option value="0">Sunday</option>
                                        <option value="1">Monday</option>
                                        <option value="2">Tuesday</option>
                                        <option value="3">Wednesday</option>
                                        <option value="4">Thursday</option>
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="bulkActive"
                                    checked={bulkIsActive}
                                    onChange={(e) => setBulkIsActive(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="bulkActive" className="text-xs font-semibold text-gray-800">
                                    Set schedule as Active for all selected banks
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setShowBulkModal(false)}
                                className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={savingBulk}
                                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow"
                            >
                                {savingBulk ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Apply to {selectedBankIds.length} Banks
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
