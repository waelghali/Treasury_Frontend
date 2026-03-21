import React, { useState, useEffect } from 'react';
import { Plus, Search, Settings2, Trash2, Edit3, ShieldCheck, X, ChevronDown, Save, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../../services/apiService';

const TRANSACTION_FIELDS = [
    { value: 'raw_description', label: 'Description' },
    { value: 'description_line2', label: 'Description 2' },
    { value: 'debit_amount', label: 'Debit Amount' },
    { value: 'credit_amount', label: 'Credit Amount' },
    { value: 'net_amount', label: 'Net Amount' },
    { value: 'currency', label: 'Currency' },
    { value: 'company_name', label: 'Company' },
    { value: 'account_number', label: 'Account No' },
    { value: 'back_office_ref', label: 'Bank Reference' },
    { value: 'category', label: 'Category' },
    { value: 'sub_category', label: 'Sub-Category' },
    { value: 'source_system', label: 'Source System' },
    { value: 'beneficiary_name', label: 'Beneficiary' },
    { value: 'purpose_of_payment', label: 'Purpose' },
    { value: 'transfer_type', label: 'Transfer Type' },
    { value: 'counterparty_name', label: 'Counterparty' },
    { value: 'cheque_number', label: 'Cheque No' }
];

const RuleManagement = () => {
    const [rules, setRules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRule, setEditingRule] = useState(null);

    // New/Editing Rule State
    const [ruleName, setRuleName] = useState('');
    const [priority, setPriority] = useState(100);
    const [glAccount, setGlAccount] = useState('');
    const [conditions, setConditions] = useState([
        { field: 'raw_description', operator: 'contains', value: '', joiner: 'AND' }
    ]);

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            const data = await apiRequest('/reconciliation/rules', 'GET');
            setRules(data);
        } catch (err) {
            console.error("Failed to fetch rules", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditRule = (rule) => {
        setEditingRule(rule);
        setRuleName(rule.rule_name || '');
        setPriority(rule.priority);
        setGlAccount(rule.assigned_gl_account);
        setConditions(rule.conditions_json.conditions || []);
        setShowModal(true);
    };

    const handleDeleteRule = async (ruleId) => {
        if (!window.confirm("Are you sure you want to delete this rule?")) return;
        try {
            await apiRequest(`/reconciliation/rules/${ruleId}`, 'DELETE');
            fetchRules();
        } catch (err) {
            console.error("Failed to delete rule", err);
            alert("Failed to delete rule.");
        }
    };

    const handleAddCondition = () => {
        setConditions(prev => [
            ...prev,
            { field: 'raw_description', operator: 'contains', value: '', joiner: 'AND' }
        ]);
    };

    const handleRemoveCondition = (index) => {
        setConditions(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveRule = async () => {
        if (!glAccount || conditions.some(c => !c.value)) {
            alert("Please fill in GL Account and all condition values.");
            return;
        }

        const payload = {
            rule_name: ruleName,
            priority: parseInt(priority) || 0,
            conditions_json: { conditions },
            assigned_gl_account: glAccount,
            is_active: true
        };

        try {
            if (editingRule) {
                await apiRequest(`/reconciliation/rules/${editingRule.id}`, 'PUT', payload);
            } else {
                await apiRequest('/reconciliation/rules', 'POST', payload);
            }
            setShowModal(false);
            resetForm();
            fetchRules();
        } catch (err) {
            console.error("Failed to save rule", err);
            alert("Failed to save rule.");
        }
    };

    const resetForm = () => {
        setEditingRule(null);
        setRuleName('');
        setPriority(100);
        setGlAccount('');
        setConditions([{ field: 'raw_description', operator: 'contains', value: '', joiner: 'AND' }]);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Classification Rules</h1>
                    <p className="text-gray-500 mt-1">Define sequential logic (AND/OR) to auto-classify transactions to GL accounts.</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Rule
                </button>
            </div>

            {/* Rules Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 uppercase text-[10px] text-gray-400 font-bold tracking-widest">
                                <th className="px-6 py-4">Rule Name</th>
                                <th className="px-6 py-4">Priority</th>
                                <th className="px-6 py-4">GL Account</th>
                                <th className="px-6 py-4">Logic Flow</th>
                                <th className="px-6 py-4">Usage</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {rules.map(rule => (
                                <tr key={rule.id} className="hover:bg-gray-50 transition-colors group text-sm">
                                    <td className="px-6 py-4 font-medium text-gray-900">{rule.rule_name || '-'}</td>
                                    <td className="px-6 py-4 text-xs font-mono text-gray-400">P{rule.priority}</td>
                                    <td className="px-6 py-4 font-semibold text-gray-900">{rule.assigned_gl_account}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap items-center gap-1">
                                            {rule.conditions_json.conditions?.map((c, i) => (
                                                <React.Fragment key={i}>
                                                    {i > 0 && <span className={`text-[9px] font-black px-1 ${c.joiner === 'OR' ? 'text-orange-500' : 'text-blue-500'}`}>{c.joiner}</span>}
                                                    <span className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[10px] text-gray-600 shadow-sm">
                                                        <span className="text-gray-400 mr-1">{c.field}</span>
                                                        <span className="font-bold">{c.operator}</span> "{c.value}"
                                                    </span>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-xs">{rule.usage_count || 0} hits</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={() => handleEditRule(rule)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteRule(rule.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {rules.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-400 bg-gray-50/30">
                                        <ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                        <p>No rules defined yet.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Rule Builder Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{editingRule ? 'Edit Rule' : 'New Classification Rule'}</h3>
                                <p className="text-xs text-gray-500">Classification flows evaluate conditions sequentially</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-1 gap-4 pb-4 border-b border-gray-50">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Rule Name (Optional)</label>
                                    <input
                                        type="text"
                                        value={ruleName}
                                        onChange={(e) => setRuleName(e.target.value)}
                                        placeholder="e.g. ATM Transaction Matcher"
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm font-semibold"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-50">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Assign to GL Account</label>
                                    <input
                                        type="text"
                                        value={glAccount}
                                        onChange={(e) => setGlAccount(e.target.value)}
                                        placeholder="e.g. Bank Charges"
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Priority (Smallest runs first)</label>
                                    <input
                                        type="number"
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Condition Sequence</label>
                                {conditions.map((cond, idx) => (
                                    <div key={idx} className="relative group">
                                        {idx > 0 && (
                                            <div className="flex items-center space-x-2 mb-2">
                                                <div className="h-px flex-1 bg-gray-100"></div>
                                                <select
                                                    value={cond.joiner}
                                                    onChange={(e) => {
                                                        const newConds = [...conditions];
                                                        newConds[idx].joiner = e.target.value;
                                                        setConditions(newConds);
                                                    }}
                                                    className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-bold text-gray-600 focus:border-blue-500 outline-none"
                                                >
                                                    <option value="AND">AND</option>
                                                    <option value="OR">OR</option>
                                                </select>
                                                <div className="h-px flex-1 bg-gray-100"></div>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-100 rounded-xl relative">
                                            <select
                                                value={cond.field}
                                                onChange={(e) => {
                                                    const newConds = [...conditions];
                                                    newConds[idx].field = e.target.value;
                                                    setConditions(newConds);
                                                }}
                                                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                            >
                                                {TRANSACTION_FIELDS.map(f => (
                                                    <option key={f.value} value={f.value}>{f.label}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={cond.operator}
                                                onChange={(e) => {
                                                    const newConds = [...conditions];
                                                    newConds[idx].operator = e.target.value;
                                                    setConditions(newConds);
                                                }}
                                                className="w-32 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                            >
                                                <option value="contains">Contains</option>
                                                <option value="equals">Equals</option>
                                                <option value="gt">Greater Than</option>
                                                <option value="lt">Less Than</option>
                                                <option value="starts_with">Starts With</option>
                                            </select>
                                            <input
                                                type="text"
                                                value={cond.value}
                                                onChange={(e) => {
                                                    const newConds = [...conditions];
                                                    newConds[idx].value = e.target.value;
                                                    setConditions(newConds);
                                                }}
                                                placeholder="Value..."
                                                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                            {conditions.length > 1 && (
                                                <button onClick={() => handleRemoveCondition(idx)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={handleAddCondition}
                                    className="w-full py-2 border-2 border-dashed border-gray-100 rounded-xl text-xs font-bold text-gray-400 hover:border-blue-100 hover:text-blue-500 hover:bg-blue-50/30 transition-all flex items-center justify-center"
                                >
                                    <Plus className="w-4 h-4 mr-1" /> Add Condition Line
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveRule}
                                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Save Rule
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RuleManagement;
