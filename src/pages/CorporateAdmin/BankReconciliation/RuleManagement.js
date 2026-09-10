import React, { useState, useEffect } from 'react';
import { 
    Plus, Search, Settings2, Trash2, Edit3, ShieldCheck, X, ChevronDown, 
    Save, AlertCircle, Users, Zap, Sparkles, CheckCircle2, Building, 
    ArrowUpRight, ArrowDownLeft, RefreshCw, Layers, Folder, FolderPlus, Tag
} from 'lucide-react';
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
    { value: 'concept', label: 'Concept (COLLECTION, PAYMENT, SWEEP)' },
    { value: 'cheque_number', label: 'Cheque No' }
];

const BUILTIN_CLASSIFIERS_DATA = [
    {
        name: 'Bank Interest Earned',
        category: 'BANK_INTEREST',
        direction: 'CREDIT',
        confidence: 90,
        keywords: ['interest credit', 'interest earned', 'int credit', 'deposit interest', 'فائدة دائنة', 'عائد', 'فوائد الودائع'],
        defaultGL: 'Interest Income',
        description: 'Auto-detects interest credits from savings, time deposits, and yield accounts.'
    },
    {
        name: 'Bank Interest Charged',
        category: 'BANK_INTEREST',
        direction: 'DEBIT',
        confidence: 90,
        keywords: ['interest debit', 'overdraft interest', 'loan interest', 'فائدة مدينة', 'فائدة على المكشوف', 'فائدة القرض'],
        defaultGL: 'Interest Expense',
        description: 'Auto-detects interest debits on credit facilities, loans, and overdrafts.'
    },
    {
        name: 'Bank Charges & Commission',
        category: 'BANK_CHARGES',
        direction: 'DEBIT',
        confidence: 85,
        keywords: ['bank charge', 'service charge', 'maintenance fee', 'commission', 'swift charge', 'عمولة', 'رسوم', 'مصاريف بنكية'],
        defaultGL: 'Bank Charges & Fees',
        description: 'Auto-detects account maintenance fees, transfer commissions, and SWIFT charges.'
    },
    {
        name: 'Withholding Tax / VAT',
        category: 'TAX_DEDUCTION',
        direction: 'DEBIT',
        confidence: 85,
        keywords: ['withholding tax', 'wht', 'tax deduction', 'vat', 'stamp duty', 'ضريبة', 'ضريبة استقطاع', 'دمغة'],
        defaultGL: 'Tax Expense / Withholding Tax',
        description: 'Auto-detects statutory tax deductions, stamp duties, and withholding tax lines.'
    },
    {
        name: 'Salary & Payroll',
        category: 'SALARY_PAYROLL',
        direction: 'DEBIT',
        confidence: 85,
        keywords: ['salary', 'payroll', 'wages', 'staff pay', 'رواتب', 'أجور', 'مرتبات'],
        defaultGL: 'Payroll & Salaries Expense',
        description: 'Auto-detects payroll batches and staff salary disbursements.'
    },
    {
        name: 'Loan Installment / Repayment',
        category: 'LOAN_REPAYMENT',
        direction: 'DEBIT',
        confidence: 80,
        keywords: ['loan repayment', 'installment', 'emi', 'principal repayment', 'قسط', 'سداد قرض', 'أقساط'],
        defaultGL: 'Loans Payable (Principal)',
        description: 'Auto-detects scheduled loan amortizations and financing installments.'
    },
    {
        name: 'Cross-Bank Sweep / Internal Transfer',
        category: 'INTER_BANK_SWEEP',
        direction: 'EITHER',
        confidence: 85,
        keywords: ['sweep', 'transfer', 'own account', 'internal transfer', 'تحويل بين الحسابات', 'تحويل ذاتي'],
        defaultGL: 'Inter-Company / Bank Clearing',
        description: 'Auto-matches opposite sign transfers between company accounts within 2 days across all bank statements.'
    }
];

const RuleManagement = () => {
    const [activeTab, setActiveTab] = useState('rules'); // 'rules', 'counterparties', 'builtins'
    
    // Custom Rules State
    const [rules, setRules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRule, setEditingRule] = useState(null);

    const [ruleName, setRuleName] = useState('');
    const [priority, setPriority] = useState(100);
    const [glAccount, setGlAccount] = useState('');
    const [conditions, setConditions] = useState([
        { field: 'raw_description', operator: 'contains', value: '', joiner: 'AND' }
    ]);

    // Counterparties State
    const [counterparties, setCounterparties] = useState([]);
    const [cpSearch, setCpSearch] = useState('');
    const [cpTypeFilter, setCpTypeFilter] = useState('');
    const [showCpModal, setShowCpModal] = useState(false);
    const [cpForm, setCpForm] = useState({
        name: '',
        aliases: '',
        entity_type: 'CUSTOMER',
        default_category: 'COLLECTION_FROM_CUSTOMER',
        default_gl_account: 'ACCOUNTS_RECEIVABLE'
    });

    // Discovery State
    const [showDiscoverModal, setShowDiscoverModal] = useState(false);
    const [discoveredCandidates, setDiscoveredCandidates] = useState([]);
    const [isDiscovering, setIsDiscovering] = useState(false);

    // Collaborative Consensus State
    const [collabStats, setCollabStats] = useState(null);

    // Classification Taxonomy State
    const [taxonomy, setTaxonomy] = useState([]);
    const [taxonomySearch, setTaxonomySearch] = useState('');
    const [showTaxonomyModal, setShowTaxonomyModal] = useState(false);
    const [taxonomyModalType, setTaxonomyModalType] = useState('subclass'); // 'class' or 'subclass'
    const [editingNode, setEditingNode] = useState(null);
    const [taxonomyForm, setTaxonomyForm] = useState({
        parent_id: '',
        name: '',
        name_ar: '',
        code: '',
        direction: 'DEBIT',
        default_gl_account: '',
        description: ''
    });

    useEffect(() => {
        fetchRules();
        fetchCounterparties();
        fetchCollabStats();
        fetchTaxonomy();
    }, []);

    const fetchTaxonomy = async () => {
        try {
            const data = await apiRequest('/reconciliation/taxonomy', 'GET');
            setTaxonomy(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch taxonomy", err);
        }
    };

    const fetchCollabStats = async () => {
        try {
            const data = await apiRequest('/reconciliation/collaborative-stats', 'GET');
            setCollabStats(data);
        } catch (err) {
            console.error("Failed to fetch collaborative stats", err);
        }
    };

    const fetchRules = async () => {
        try {
            const data = await apiRequest('/reconciliation/rules', 'GET');
            setRules(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch rules", err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCounterparties = async () => {
        try {
            const data = await apiRequest('/reconciliation/counterparties', 'GET');
            setCounterparties(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch counterparties", err);
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

    // Counterparty Handlers
    const handleSaveCounterparty = async () => {
        if (!cpForm.name.trim()) {
            alert("Counterparty Name is required.");
            return;
        }
        const aliasesArray = cpForm.aliases
            ? cpForm.aliases.split(',').map(s => s.trim()).filter(Boolean)
            : [cpForm.name.trim()];

        const payload = {
            name: cpForm.name.trim(),
            aliases: aliasesArray,
            entity_type: cpForm.entity_type,
            default_category: cpForm.default_category,
            default_gl_account: cpForm.default_gl_account,
            is_active: true
        };

        try {
            await apiRequest('/reconciliation/counterparties', 'POST', payload);
            setShowCpModal(false);
            setCpForm({
                name: '',
                aliases: '',
                entity_type: 'CUSTOMER',
                default_category: 'COLLECTION_FROM_CUSTOMER',
                default_gl_account: 'ACCOUNTS_RECEIVABLE'
            });
            fetchCounterparties();
        } catch (err) {
            console.error("Failed to create counterparty", err);
            alert("Failed to save counterparty.");
        }
    };

    const handleDeleteCounterparty = async (cpId) => {
        if (!window.confirm("Are you sure you want to remove this counterparty?")) return;
        try {
            await apiRequest(`/reconciliation/counterparties/${cpId}`, 'DELETE');
            fetchCounterparties();
        } catch (err) {
            console.error("Failed to delete counterparty", err);
            alert("Failed to delete counterparty or cannot delete global entries.");
        }
    };

    const handleDiscoverCounterparties = async () => {
        setIsDiscovering(true);
        try {
            const data = await apiRequest('/reconciliation/counterparties/discover', 'GET');
            setDiscoveredCandidates(Array.isArray(data) ? data : []);
            setShowDiscoverModal(true);
        } catch (err) {
            console.error("Discovery failed", err);
            alert("Failed to discover counterparties from history.");
        } finally {
            setIsDiscovering(false);
        }
    };

    const handleAddDiscovered = async (candidate) => {
        try {
            await apiRequest('/reconciliation/counterparties', 'POST', {
                name: candidate.suggested_name,
                aliases: [candidate.suggested_name],
                entity_type: candidate.entity_type,
                default_category: candidate.default_category,
                default_gl_account: candidate.default_gl_account,
                is_active: true
            });
            setDiscoveredCandidates(prev => prev.filter(c => c.suggested_name !== candidate.suggested_name));
            fetchCounterparties();
        } catch (err) {
            console.error("Failed to add discovered counterparty", err);
        }
    };

    const filteredCounterparties = counterparties.filter(cp => {
        const matchesSearch = !cpSearch || cp.name.toLowerCase().includes(cpSearch.toLowerCase());
        const matchesType = !cpTypeFilter || cp.entity_type === cpTypeFilter;
        return matchesSearch && matchesType;
    });

    const openCreateClassModal = () => {
        setEditingNode(null);
        setTaxonomyModalType('class');
        setTaxonomyForm({
            parent_id: '',
            name: '',
            name_ar: '',
            code: '',
            direction: 'EITHER',
            default_gl_account: '',
            description: ''
        });
        setShowTaxonomyModal(true);
    };

    const openCreateSubclassModal = (parentClassId = '') => {
        setEditingNode(null);
        setTaxonomyModalType('subclass');
        setTaxonomyForm({
            parent_id: parentClassId ? String(parentClassId) : (taxonomy[0]?.id ? String(taxonomy[0].id) : ''),
            name: '',
            name_ar: '',
            code: '',
            direction: 'DEBIT',
            default_gl_account: '',
            description: ''
        });
        setShowTaxonomyModal(true);
    };

    const openEditTaxonomyModal = (node, isSubclass = false) => {
        setEditingNode(node);
        setTaxonomyModalType(isSubclass ? 'subclass' : 'class');
        setTaxonomyForm({
            parent_id: node.parent_id ? String(node.parent_id) : '',
            name: node.name || '',
            name_ar: node.name_ar || '',
            code: node.code || '',
            direction: node.direction || 'EITHER',
            default_gl_account: node.default_gl_account || '',
            description: node.description || ''
        });
        setShowTaxonomyModal(true);
    };

    const handleSaveTaxonomyNode = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!taxonomyForm.name.trim()) {
            alert("Name is required");
            return;
        }
        const code = taxonomyForm.code.trim() || taxonomyForm.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
        const isSub = taxonomyModalType === 'subclass';
        const payload = {
            name: taxonomyForm.name.trim(),
            name_ar: taxonomyForm.name_ar ? taxonomyForm.name_ar.trim() : null,
            code: code,
            parent_id: isSub && taxonomyForm.parent_id ? Number(taxonomyForm.parent_id) : null,
            direction: taxonomyForm.direction,
            default_gl_account: taxonomyForm.default_gl_account ? taxonomyForm.default_gl_account.trim() : null,
            description: taxonomyForm.description ? taxonomyForm.description.trim() : null,
            is_active: true
        };

        try {
            if (editingNode) {
                await apiRequest(`/reconciliation/taxonomy/${editingNode.id}`, 'PUT', payload);
            } else {
                await apiRequest('/reconciliation/taxonomy', 'POST', payload);
            }
            setShowTaxonomyModal(false);
            setEditingNode(null);
            fetchTaxonomy();
        } catch (err) {
            console.error("Failed to save taxonomy node", err);
            alert("Failed to save taxonomy entry.");
        }
    };

    const handleDeleteTaxonomyNode = async (nodeId) => {
        if (!window.confirm("Are you sure you want to remove this taxonomy entry?")) return;
        try {
            await apiRequest(`/reconciliation/taxonomy/${nodeId}`, 'DELETE');
            fetchTaxonomy();
        } catch (err) {
            console.error("Failed to delete taxonomy node", err);
            alert("Failed to delete taxonomy node.");
        }
    };

    const filteredTaxonomy = taxonomy.map(cls => {
        if (!taxonomySearch) return cls;
        const q = taxonomySearch.toLowerCase();
        const classMatches = cls.name.toLowerCase().includes(q) || (cls.code && cls.code.toLowerCase().includes(q));
        const matchedSubs = (cls.subclasses || []).filter(sub => 
            sub.name.toLowerCase().includes(q) || 
            (sub.code && sub.code.toLowerCase().includes(q)) || 
            (sub.default_gl_account && sub.default_gl_account.toLowerCase().includes(q))
        );
        if (classMatches || matchedSubs.length > 0) {
            return { ...cls, subclasses: classMatches ? cls.subclasses : matchedSubs };
        }
        return null;
    }).filter(Boolean);

    const totalSubclassesCount = taxonomy.reduce((acc, c) => acc + (c.subclasses?.length || 0), 0);


    return (
        <div className="space-y-6">
            {/* Top Navigation / Tabs */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 pb-2 border-b border-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Intelligence & Classification Center</h1>
                    <p className="text-gray-500 mt-1">Multi-layered smart classification: Built-in banking detectors, concept learning, and custom rules.</p>
                </div>
                <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('rules')}
                        className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            activeTab === 'rules' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                        Custom Rules ({rules.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('counterparties')}
                        className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            activeTab === 'counterparties' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <Users className="w-3.5 h-3.5 mr-1.5" />
                        Counterparty Registry ({counterparties.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('collaborative')}
                        className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            activeTab === 'collaborative' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                        Collaborative Brain ({collabStats?.promoted_patterns || 0})
                    </button>
                    <button
                        onClick={() => setActiveTab('taxonomy')}
                        className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            activeTab === 'taxonomy' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <Layers className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
                        Taxonomy ({taxonomy.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('builtins')}
                        className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            activeTab === 'builtins' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <Zap className="w-3.5 h-3.5 mr-1.5" />
                        Built-in Classifiers ({BUILTIN_CLASSIFIERS_DATA.length})
                    </button>
                </div>
            </div>

            {/* TAB 1: CUSTOM RULES */}
            {activeTab === 'rules' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-500">Rules are evaluated sequentially by priority. First matching rule classifies the transaction.</p>
                        <button
                            onClick={() => { resetForm(); setShowModal(true); }}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create New Rule
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 uppercase text-[10px] text-gray-400 font-bold tracking-widest bg-gray-50/50">
                                        <th className="px-6 py-4">Rule Name</th>
                                        <th className="px-6 py-4">Priority</th>
                                        <th className="px-6 py-4">Assigned GL Account</th>
                                        <th className="px-6 py-4">Logic Flow</th>
                                        <th className="px-6 py-4">Usage Hits</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {rules.map(rule => (
                                        <tr key={rule.id} className="hover:bg-gray-50 transition-colors group text-sm">
                                            <td className="px-6 py-4 font-semibold text-gray-900">{rule.rule_name || '-'}</td>
                                            <td className="px-6 py-4 text-xs font-mono text-gray-400">P{rule.priority}</td>
                                            <td className="px-6 py-4 font-semibold text-blue-600">{rule.assigned_gl_account}</td>
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
                                            <td colSpan="6" className="px-6 py-12 text-center text-gray-400 bg-gray-50/30">
                                                <ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                                <p>No custom rules defined yet.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: COUNTERPARTY REGISTRY & LEARNING */}
            {activeTab === 'counterparties' && (
                <div className="space-y-4">
                    {/* Controls Bar */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center space-x-3 flex-1">
                            <div className="relative flex-1 max-w-md">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search counterparties or aliases..."
                                    className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs w-full focus:ring-2 focus:ring-purple-500 outline-none"
                                    value={cpSearch}
                                    onChange={(e) => setCpSearch(e.target.value)}
                                />
                            </div>
                            <select
                                className="bg-gray-50 border border-gray-200 rounded-lg text-xs py-2 px-3 focus:ring-2 focus:ring-purple-500 outline-none"
                                value={cpTypeFilter}
                                onChange={(e) => setCpTypeFilter(e.target.value)}
                            >
                                <option value="">All Entity Types</option>
                                <option value="CUSTOMER">Customers (Collections)</option>
                                <option value="SUPPLIER">Suppliers (Payments)</option>
                                <option value="BANK">Banks (Treasury/Sweeps)</option>
                                <option value="GOVERNMENT">Government / Tax</option>
                            </select>
                        </div>

                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handleDiscoverCounterparties}
                                disabled={isDiscovering}
                                className="flex items-center px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold hover:bg-purple-100 transition-all shadow-xs"
                            >
                                <Sparkles className={`w-3.5 h-3.5 mr-1.5 ${isDiscovering ? 'animate-spin' : ''}`} />
                                {isDiscovering ? 'Scanning Statements...' : 'Auto-Discover from History'}
                            </button>
                            <button
                                onClick={() => setShowCpModal(true)}
                                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-all shadow-md shadow-purple-500/20"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                Add Counterparty
                            </button>
                        </div>
                    </div>

                    {/* Counterparty Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 uppercase text-[10px] text-gray-400 font-bold tracking-widest bg-gray-50/50">
                                        <th className="px-6 py-4">Entity Name & Aliases</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Concept Mapping</th>
                                        <th className="px-6 py-4">Default GL</th>
                                        <th className="px-6 py-4">Learning Frequency</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredCounterparties.map(cp => (
                                        <tr key={cp.id} className="hover:bg-purple-50/30 transition-colors text-sm">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="font-bold text-gray-900">{cp.name}</span>
                                                        {cp.is_verified ? (
                                                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-bold">Verified</span>
                                                        ) : (
                                                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-bold">Learned</span>
                                                        )}
                                                        {!cp.company_id && (
                                                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">Global</span>
                                                        )}
                                                    </div>
                                                    {cp.aliases && cp.aliases.length > 0 && (
                                                        <p className="text-[10px] text-gray-400 mt-0.5">Aliases: {cp.aliases.join(', ')}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    cp.entity_type === 'CUSTOMER' ? 'bg-green-100 text-green-700' :
                                                    cp.entity_type === 'SUPPLIER' ? 'bg-orange-100 text-orange-700' :
                                                    cp.entity_type === 'BANK' ? 'bg-indigo-100 text-indigo-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {cp.entity_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-gray-600">
                                                {cp.default_category || (cp.entity_type === 'CUSTOMER' ? 'COLLECTION_FROM_CUSTOMER' : 'PAYMENT_TO_SUPPLIER')}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-gray-900 text-xs">
                                                {cp.default_gl_account || (cp.entity_type === 'CUSTOMER' ? 'ACCOUNTS_RECEIVABLE' : 'ACCOUNTS_PAYABLE')}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-purple-600">
                                                {cp.learned_count} occurrences
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {cp.company_id ? (
                                                    <button
                                                        onClick={() => handleDeleteCounterparty(cp.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] text-gray-400 italic">System Global</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredCounterparties.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-gray-400 bg-gray-50/30">
                                                <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                                <p>No counterparties registered yet.</p>
                                                <p className="text-xs text-gray-400 mt-1">Click "Auto-Discover from History" to extract entities from past bank statements.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: COLLABORATIVE CONSENSUS BRAIN */}
            {activeTab === 'collaborative' && (
                <div className="space-y-6">
                    {/* Privacy Shield Banner */}
                    <div className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white p-6 rounded-2xl shadow-xl flex items-start space-x-4 border border-indigo-700/50">
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                            <ShieldCheck className="w-8 h-8 text-indigo-300" />
                        </div>
                        <div className="space-y-1.5 flex-1">
                            <div className="flex items-center space-x-2">
                                <h3 className="text-lg font-bold">Privacy-Preserving Federated Intelligence</h3>
                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[10px] font-bold">
                                    Zero-PII Anonymization Shield Active
                                </span>
                            </div>
                            <p className="text-xs text-indigo-200 leading-relaxed max-w-4xl">
                                The engine strips all customer names, IBANs, account numbers, invoice references, and financial amounts before analyzing statement narratives.
                                When <span className="font-bold text-white">≥ 2 companies with the same bank</span> or <span className="font-bold text-white">≥ 3 companies platform-wide</span> independently confirm an abstract syntactic signature, the pattern is autonomously promoted to classify transactions for all customers with high confidence.
                            </p>
                        </div>
                    </div>

                    {/* Collaborative Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Active Promoted Signatures</p>
                            <p className="text-2xl font-black text-indigo-600">{collabStats?.promoted_patterns || 0}</p>
                            <p className="text-[11px] text-gray-400">Validated across independent tenants</p>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Bank-Specific Syntactic Rules</p>
                            <p className="text-2xl font-black text-purple-600">{collabStats?.bank_specific_count || 0}</p>
                            <p className="text-[11px] text-gray-400">Tailored to specific bank narrative formats</p>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Universal Cross-Bank Patterns</p>
                            <p className="text-2xl font-black text-blue-600">{collabStats?.universal_count || 0}</p>
                            <p className="text-[11px] text-gray-400">Fintechs, utilities, tax, and SaaS vendors</p>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Consensus Confidence</p>
                            <p className="text-2xl font-black text-emerald-600">{collabStats?.average_confidence || 92}%</p>
                            <p className="text-[11px] text-gray-400">Platform-wide average agreement score</p>
                        </div>
                    </div>

                    {/* Promoted Consensus Signatures Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="font-bold text-gray-800 text-sm">Autonomously Promoted Consensus Signatures</h3>
                                <p className="text-xs text-gray-500">Live abstract patterns currently powering platform-wide automatic classification</p>
                            </div>
                            <button
                                onClick={fetchCollabStats}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Refresh Platform Metrics"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 uppercase text-[10px] text-gray-400 font-bold tracking-widest bg-gray-50/30">
                                        <th className="px-6 py-3">Abstract Signature Token</th>
                                        <th className="px-6 py-3">Inferred Category</th>
                                        <th className="px-6 py-3">Scope</th>
                                        <th className="px-6 py-3">Tenant Consensus</th>
                                        <th className="px-6 py-3 text-right">Confidence Level</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {collabStats?.recent_promoted && collabStats.recent_promoted.length > 0 ? (
                                        collabStats.recent_promoted.map((p, idx) => (
                                            <tr key={idx} className="hover:bg-indigo-50/20 transition-colors text-sm">
                                                <td className="px-6 py-4">
                                                    <span className="font-mono font-bold text-indigo-900 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 text-xs">
                                                        {p.signature}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                                                        {p.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        p.scope === 'Bank Specific' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                                                    }`}>
                                                        {p.scope}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-gray-700">
                                                    {p.distinct_tenants} Distinct Companies
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-bold text-emerald-600 text-xs">
                                                        {p.confidence}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-gray-400 bg-gray-50/30">
                                                <Sparkles className="w-10 h-10 mx-auto mb-2 text-indigo-400 opacity-60" />
                                                <p className="font-semibold text-gray-700">Autonomous Consensus Engine is Active</p>
                                                <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                                                    As companies import bank statements and confirm transactions, the Privacy Sanitizer tallies distinct-tenant votes and automatically promotes validated signatures here.
                                                </p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: BUILT-IN CLASSIFIERS */}
            {activeTab === 'builtins' && (
                <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start space-x-3">
                        <Zap className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="font-bold text-emerald-900 text-sm">Universal Banking Intelligence</h4>
                            <p className="text-xs text-emerald-700 mt-0.5">
                                These classifiers are hardcoded into the reconciliation kernel and run on EVERY uploaded statement across all customers with zero setup. They support bilingual keywords (Arabic + English) and auto-detect opposite sign inter-bank sweeps.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {BUILTIN_CLASSIFIERS_DATA.map((item, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className={`p-1.5 rounded-lg ${item.direction === 'CREDIT' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {item.direction === 'CREDIT' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                        </div>
                                        <h3 className="font-bold text-gray-900 text-sm">{item.name}</h3>
                                    </div>
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">
                                        {item.confidence}% Confidence
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600">{item.description}</p>
                                <div className="pt-2 border-t border-gray-100 flex flex-col space-y-1">
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-gray-400 font-medium">Direction:</span>
                                        <span className="font-bold text-gray-800">{item.direction}</span>
                                    </div>
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-gray-400 font-medium">Default GL:</span>
                                        <span className="font-bold text-blue-600">{item.defaultGL}</span>
                                    </div>
                                    <div className="mt-2">
                                        <span className="text-[10px] text-gray-400 font-medium block mb-1">Keywords sample:</span>
                                        <div className="flex flex-wrap gap-1">
                                            {item.keywords.slice(0, 5).map((kw, i) => (
                                                <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-[9px] font-mono">
                                                    {kw}
                                                </span>
                                            ))}
                                            {item.keywords.length > 5 && (
                                                <span className="px-1.5 py-0.5 text-gray-400 text-[9px]">+{item.keywords.length - 5} more</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 5: CLASSIFICATION TAXONOMY (CLASSES & SUBCLASSES) */}
            {activeTab === 'taxonomy' && (
                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                        <div className="flex items-center space-x-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-80">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={taxonomySearch}
                                    onChange={(e) => setTaxonomySearch(e.target.value)}
                                    placeholder="Search classes, subclasses, or GL accounts..."
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                />
                            </div>
                            <span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-bold whitespace-nowrap border border-teal-200">
                                {filteredTaxonomy.length} Classes • {totalSubclassesCount} Subclasses
                            </span>
                        </div>
                        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                            <button
                                onClick={openCreateClassModal}
                                className="flex items-center px-3.5 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-bold transition-all shadow-xs"
                            >
                                <FolderPlus className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
                                + Add Class
                            </button>
                            <button
                                onClick={() => openCreateSubclassModal()}
                                className="flex items-center px-4 py-2 bg-teal-700 text-white hover:bg-teal-800 rounded-lg text-xs font-bold transition-all shadow-md shadow-teal-700/20"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                + Add Subclass
                            </button>
                        </div>
                    </div>

                    {/* Classes & Subclasses Accordion Cards */}
                    <div className="space-y-4">
                        {filteredTaxonomy.length === 0 ? (
                            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
                                <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p className="font-semibold text-gray-600">No matching classification categories found.</p>
                                <p className="text-xs text-gray-400 mt-1">Create a new class or clear your search.</p>
                            </div>
                        ) : (
                            filteredTaxonomy.map((cls) => {
                                const subCount = cls.subclasses?.length || 0;
                                return (
                                    <div key={cls.id} className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                                        {/* Class Header */}
                                        <div className="p-4 bg-slate-50/80 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                            <div className="flex items-center space-x-3">
                                                <div className="p-2 bg-teal-100/80 text-teal-800 rounded-lg">
                                                    <Folder className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <h3 className="font-bold text-gray-900 text-sm">{cls.name}</h3>
                                                        {cls.name_ar && (
                                                            <span className="text-xs text-gray-400 font-sans">({cls.name_ar})</span>
                                                        )}
                                                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-[10px] font-mono font-bold">
                                                            {cls.code}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            cls.direction === 'CREDIT' 
                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                : cls.direction === 'DEBIT'
                                                                ? 'bg-rose-100 text-rose-800'
                                                                : 'bg-indigo-100 text-indigo-800'
                                                        }`}>
                                                            {cls.direction === 'CREDIT' ? 'Inflow (Credit)' : cls.direction === 'DEBIT' ? 'Outflow (Debit)' : 'Either Direction'}
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] text-gray-500">{subCount} Subclasses defined</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => openCreateSubclassModal(cls.id)}
                                                    className="px-2.5 py-1 bg-white hover:bg-teal-50 border border-teal-200 text-teal-700 rounded-lg text-[11px] font-bold transition-colors flex items-center shadow-2xs"
                                                >
                                                    <Plus className="w-3 h-3 mr-1" />
                                                    Add Subclass
                                                </button>
                                                <button
                                                    onClick={() => openEditTaxonomyModal(cls, false)}
                                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors"
                                                    title="Edit Class"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                                {cls.company_id && (
                                                    <button
                                                        onClick={() => handleDeleteTaxonomyNode(cls.id)}
                                                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        title="Delete Custom Class"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Subclasses Table */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead>
                                                    <tr className="bg-gray-50/50 text-[10px] text-gray-400 uppercase font-bold tracking-wider border-b border-gray-100">
                                                        <th className="px-4 py-2.5">Subclass Name</th>
                                                        <th className="px-4 py-2.5">Code</th>
                                                        <th className="px-4 py-2.5">Default G/L Account</th>
                                                        <th className="px-4 py-2.5">Direction</th>
                                                        <th className="px-4 py-2.5">Description</th>
                                                        <th className="px-4 py-2.5 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {(!cls.subclasses || cls.subclasses.length === 0) ? (
                                                        <tr>
                                                            <td colSpan={6} className="px-4 py-3 text-center text-gray-400 italic">
                                                                No subclasses under this class yet. Click "+ Add Subclass" to create one.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        cls.subclasses.map((sub) => (
                                                            <tr key={sub.id} className="hover:bg-teal-50/20 transition-colors">
                                                                <td className="px-4 py-2.5">
                                                                    <div className="font-semibold text-gray-900">{sub.name}</div>
                                                                    {sub.name_ar && (
                                                                        <span className="text-[10px] text-gray-400">{sub.name_ar}</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-2.5 font-mono text-gray-600 text-[11px]">
                                                                    {sub.code}
                                                                </td>
                                                                <td className="px-4 py-2.5">
                                                                    {sub.default_gl_account ? (
                                                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 font-mono font-bold text-[10px]">
                                                                            {sub.default_gl_account}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-gray-400 italic">Not set</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-2.5">
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                        sub.direction === 'CREDIT' 
                                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                                            : sub.direction === 'DEBIT'
                                                                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                                    }`}>
                                                                        {sub.direction}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate" title={sub.description || ''}>
                                                                    {sub.description || '-'}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-right">
                                                                    <div className="flex items-center justify-end space-x-1">
                                                                        <button
                                                                            onClick={() => openEditTaxonomyModal(sub, true)}
                                                                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors"
                                                                            title="Edit Subclass"
                                                                        >
                                                                            <Edit3 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteTaxonomyNode(sub.id)}
                                                                            className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                                                            title="Deactivate Subclass"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Taxonomy Node Creator / Editor Modal */}
            {showTaxonomyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-teal-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-teal-900 flex items-center">
                                    <Layers className="w-4 h-4 mr-2 text-teal-600" />
                                    {editingNode ? `Edit ${taxonomyModalType === 'class' ? 'Class' : 'Subclass'}` : (taxonomyModalType === 'class' ? 'Add New Class (Parent)' : 'Add New Subclass (Child)')}
                                </h3>
                                <p className="text-xs text-teal-700">
                                    {taxonomyModalType === 'class' 
                                        ? 'Define a high-level category grouping (e.g. Operating Expenses, Revenue)'
                                        : 'Define a specific classification item mapped to a default G/L account'}
                                </p>
                            </div>
                            <button onClick={() => setShowTaxonomyModal(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveTaxonomyNode} className="p-6 space-y-4">
                            {taxonomyModalType === 'subclass' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Parent Class *</label>
                                    <select
                                        value={taxonomyForm.parent_id}
                                        onChange={(e) => setTaxonomyForm({ ...taxonomyForm, parent_id: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-teal-500 outline-none"
                                        required
                                    >
                                        <option value="">Select a Parent Class...</option>
                                        {taxonomy.map(cls => (
                                            <option key={cls.id} value={cls.id}>{cls.name} ({cls.code})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Name (English) *</label>
                                    <input
                                        type="text"
                                        value={taxonomyForm.name}
                                        onChange={(e) => setTaxonomyForm({ ...taxonomyForm, name: e.target.value })}
                                        placeholder={taxonomyModalType === 'class' ? "e.g. Logistics & Freight" : "e.g. Ocean Demurrage Fees"}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-teal-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Name (Arabic)</label>
                                    <input
                                        type="text"
                                        value={taxonomyForm.name_ar}
                                        onChange={(e) => setTaxonomyForm({ ...taxonomyForm, name_ar: e.target.value })}
                                        placeholder="e.g. غرامات أرضيات الميناء"
                                        dir="rtl"
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">System Code (Auto if empty)</label>
                                    <input
                                        type="text"
                                        value={taxonomyForm.code}
                                        onChange={(e) => setTaxonomyForm({ ...taxonomyForm, code: e.target.value.toUpperCase() })}
                                        placeholder="e.g. LOGISTICS_DEMURRAGE"
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-teal-500 outline-none uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Cash Flow Direction</label>
                                    <select
                                        value={taxonomyForm.direction}
                                        onChange={(e) => setTaxonomyForm({ ...taxonomyForm, direction: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-teal-500 outline-none"
                                    >
                                        <option value="DEBIT">DEBIT (Outflow / Expense)</option>
                                        <option value="CREDIT">CREDIT (Inflow / Revenue)</option>
                                        <option value="EITHER">EITHER (Transfer / Clearing)</option>
                                    </select>
                                </div>
                            </div>

                            {taxonomyModalType === 'subclass' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Default G/L Account Code & Title</label>
                                    <input
                                        type="text"
                                        value={taxonomyForm.default_gl_account}
                                        onChange={(e) => setTaxonomyForm({ ...taxonomyForm, default_gl_account: e.target.value })}
                                        placeholder="e.g. 5060200 - Port & Demurrage Charges"
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description / Notes</label>
                                <textarea
                                    value={taxonomyForm.description}
                                    onChange={(e) => setTaxonomyForm({ ...taxonomyForm, description: e.target.value })}
                                    rows={2}
                                    placeholder="Optional description of what transactions fall under this class..."
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                            </div>

                            <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setShowTaxonomyModal(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-md shadow-teal-700/20 transition-all"
                                >
                                    {editingNode ? "Save Changes" : "Create Entry"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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

            {/* Counterparty Creator Modal */}
            {showCpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Add Known Counterparty</h3>
                                <p className="text-xs text-gray-500">Registers an entity for concept-based auto-classification</p>
                            </div>
                            <button onClick={() => setShowCpModal(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Entity Name</label>
                                <input
                                    type="text"
                                    value={cpForm.name}
                                    onChange={(e) => setCpForm({ ...cpForm, name: e.target.value })}
                                    placeholder="e.g. ACME Industrial Corp"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none font-semibold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Aliases (Comma-separated)</label>
                                <input
                                    type="text"
                                    value={cpForm.aliases}
                                    onChange={(e) => setCpForm({ ...cpForm, aliases: e.target.value })}
                                    placeholder="ACME, ACME CORP, ACME HOLDINGS"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Entity Type</label>
                                    <select
                                        value={cpForm.entity_type}
                                        onChange={(e) => {
                                            const type = e.target.value;
                                            setCpForm({
                                                ...cpForm,
                                                entity_type: type,
                                                default_category: type === 'CUSTOMER' ? 'COLLECTION_FROM_CUSTOMER' : 'PAYMENT_TO_SUPPLIER',
                                                default_gl_account: type === 'CUSTOMER' ? 'ACCOUNTS_RECEIVABLE' : 'ACCOUNTS_PAYABLE'
                                            });
                                        }}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                                    >
                                        <option value="CUSTOMER">Customer (Receivable)</option>
                                        <option value="SUPPLIER">Supplier (Payable)</option>
                                        <option value="BANK">Bank / Institution</option>
                                        <option value="GOVERNMENT">Government / Tax</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Default GL Account</label>
                                    <input
                                        type="text"
                                        value={cpForm.default_gl_account}
                                        onChange={(e) => setCpForm({ ...cpForm, default_gl_account: e.target.value })}
                                        placeholder="e.g. ACCOUNTS_RECEIVABLE"
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
                            <button onClick={() => setShowCpModal(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveCounterparty}
                                className="px-5 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 shadow-md shadow-purple-500/20"
                            >
                                Save Counterparty
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Auto-Discovery Modal */}
            {showDiscoverModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-purple-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-purple-900 flex items-center">
                                    <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                                    Discovered Recurring Counterparties
                                </h3>
                                <p className="text-xs text-purple-700">
                                    The engine scanned historical statements and identified these recurring counterparties. Click "Add" to teach the system.
                                </p>
                            </div>
                            <button onClick={() => setShowDiscoverModal(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-3 flex-1">
                            {discoveredCandidates.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500 opacity-60" />
                                    <p className="font-semibold text-gray-700">All recurring entities are already registered!</p>
                                </div>
                            ) : (
                                discoveredCandidates.map((c, i) => (
                                    <div key={i} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between hover:bg-purple-50/40 transition-colors">
                                        <div className="space-y-1">
                                            <div className="flex items-center space-x-2">
                                                <span className="font-bold text-gray-900 text-sm">{c.suggested_name}</span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.entity_type === 'CUSTOMER' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {c.entity_type} ({c.credit_count} credits, {c.debit_count} debits)
                                                </span>
                                                <span className="text-[10px] text-gray-400">Found {c.frequency} times</span>
                                            </div>
                                            {c.sample_descriptions && c.sample_descriptions[0] && (
                                                <p className="text-[10px] text-gray-500 italic line-clamp-1 font-mono">
                                                    Sample: "{c.sample_descriptions[0]}"
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleAddDiscovered(c)}
                                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                                        >
                                            + Add
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button onClick={() => setShowDiscoverModal(false)} className="px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RuleManagement;
