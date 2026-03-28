import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/apiService';
import { toast } from 'react-toastify';
import { Loader2, Save, ShieldAlert, LayoutTemplate, Settings2, Plus, X, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Hardcoded system constraints: These fields cannot be hidden.
const UNHIDEABLE_FIELDS = [
    'amount', 'currency_id', 'requested_expiry_date',
    'beneficiary_name', 'beneficiary_address', 'lg_type_id', 'issuing_entity_id'
];

// Groupings for UI organization
const FIELD_GROUPS = {
    "Requestor Information": ['department', 'job_title', 'phone_number', 'employee_id', 'manager_email', 'second_line_manager_email'],
    "Underlying Reference": ['reference_type', 'reference_number', 'reference_amount', 'reference_currency_id', 'reference_start_date', 'reference_end_date'],
    "Beneficiary Information": ['beneficiary_id_number', 'beneficiary_contact_person', 'beneficiary_phone', 'beneficiary_email'],
    "LG Terms & Conditions": ['other_conditions', 'comments', 'requires_special_wording'],
    "Conditional & Options": ['is_third_party', 'is_cross_border', 'is_urgent']
};

export default function IssuanceFormConfigPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deptLockedByPolicy, setDeptLockedByPolicy] = useState(false);

    // State matching the Pydantic Schema exactly
    const [config, setConfig] = useState({
        field_configurations: {},
        custom_field_1_config: null,
        custom_field_2_config: null,
        mandatory_document_types: ["FORMAL_REQUEST"],
        reference_types: null
    });

    const DEFAULT_REFERENCE_TYPES = [
        { id: 'CONTRACT', name: 'Contract' },
        { id: 'PROJECT', name: 'Project' },
        { id: 'PURCHASE_ORDER', name: 'Purchase Order' },
        { id: 'TENDER', name: 'Tender' },
        { id: 'OTHER', name: 'Other' }
    ];
    const [newRefType, setNewRefType] = useState('');

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const [data, policies] = await Promise.all([
                apiRequest('/issuance/form-config', 'GET'),
                apiRequest('/issuance/workflow-policies', 'GET').catch(() => [])
            ]);

            // Detect if any DEPT_MATCH workflow policy exists
            const hasDeptPolicy = (policies || []).some(p => p.condition_type === 'DEPT_MATCH' && p.is_active);
            setDeptLockedByPolicy(hasDeptPolicy);

            // Ensure all configurable fields exist in state even if backend returned empty dict
            const initializedFields = { ...data.field_configurations };
            Object.values(FIELD_GROUPS).flat().forEach(field => {
                if (!initializedFields[field]) {
                    initializedFields[field] = { is_visible: true, is_mandatory: false };
                }
            });

            // If DEPT_MATCH exists, force department to visible+mandatory in UI state
            if (hasDeptPolicy) {
                initializedFields['department'] = { is_visible: true, is_mandatory: true };
            }

            setConfig({
                ...data,
                field_configurations: initializedFields
            });
        } catch (error) {
            toast.error("Failed to load form configuration.");
        } finally {
            setLoading(false);
        }
    };

    const handleFieldToggle = (fieldKey, settingType) => {
        if (UNHIDEABLE_FIELDS.includes(fieldKey) && settingType === 'is_visible') return; // Enforce lock
        // Enforce department lock when DEPT_MATCH policy exists
        if (fieldKey === 'department' && deptLockedByPolicy) {
            toast.warning('Department cannot be changed while an approval workflow is assigned to a specific department.');
            return;
        }

        setConfig(prev => {
            const current = prev.field_configurations[fieldKey];
            const updated = { ...current, [settingType]: !current[settingType] };

            // UX Guard: mandatory requires visible
            if (settingType === 'is_mandatory' && updated.is_mandatory) {
                updated.is_visible = true; // turning on mandatory → force visible
            }
            if (settingType === 'is_visible' && !updated.is_visible) {
                updated.is_mandatory = false; // turning off visible → clear mandatory
            }

            const newState = {
                ...prev,
                field_configurations: {
                    ...prev.field_configurations,
                    [fieldKey]: updated
                }
            };

            // Sync backward logic: if turning off is_third_party visibility or mandatory, match THIRD_PARTY documents
            if (fieldKey === 'is_third_party') {
                const currentDocConfig = prev.document_config || {};
                const tpDocConfig = currentDocConfig['THIRD_PARTY'] || { is_visible: true, is_mandatory: false };
                
                if (settingType === 'is_visible' && !updated.is_visible) {
                    newState.document_config = {
                        ...currentDocConfig,
                        ['THIRD_PARTY']: { ...tpDocConfig, is_visible: false, is_mandatory: false }
                    };
                }
                if (settingType === 'is_mandatory' && !updated.is_mandatory) {
                    newState.document_config = {
                        ...currentDocConfig,
                        ['THIRD_PARTY']: { ...tpDocConfig, is_mandatory: false }
                    };
                }
            }

            return newState;
        });
    };

    const handleCustomFieldChange = (fieldNum, key, value) => {
        const target = `custom_field_${fieldNum}_config`;
        setConfig(prev => {
            if (!value && key === 'enabled') {
                return { ...prev, [target]: null };
            }
            const current = prev[target] || { label: '', type: 'TEXT', is_visible: true, is_mandatory: false };
            if (key === 'enabled') return { ...prev, [target]: current }; // Just init it

            return {
                ...prev,
                [target]: { ...current, [key]: value }
            };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Cleanup empty custom fields before sending
            const payload = { ...config };
            if (payload.custom_field_1_config && !payload.custom_field_1_config.label) payload.custom_field_1_config = null;
            if (payload.custom_field_2_config && !payload.custom_field_2_config.label) payload.custom_field_2_config = null;

            const result = await apiRequest('/issuance/form-config', 'PUT', payload);
            if (result?.status === 'PENDING') {
                toast.info('Configuration change submitted for approval by a second administrator.');
            } else {
                toast.success("Form configuration saved successfully! Treasury and Public forms are now updated.");
            }
        } catch (error) {
            const detail = error?.response?.data?.detail || error?.message || 'Failed to save configuration.';
            toast.error(detail);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600 w-8 h-8" /></div>;

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <LayoutTemplate className="text-blue-600" />
                        {t('pages.issuanceFormConfig.title')}
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {t('pages.issuanceFormConfig.subtitle')}
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-semibold shadow-sm"
                >
                    {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {t('pages.issuanceFormConfig.saveLayout')}
                </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <ShieldAlert className="text-blue-600 w-6 h-6 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                    <strong>{t('pages.issuanceFormConfig.strictGovernanceRule')}</strong> {t('pages.issuanceFormConfig.ruleDescription')}
                </div>
            </div>

            {/* Standard Fields Configuration */}
            <div className="space-y-6">
                {Object.entries(FIELD_GROUPS).map(([groupName, fields]) => (
                    <div key={groupName} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 font-semibold text-gray-700">
                            {groupName}
                        </div>
                        <div className="divide-y divide-gray-100">
                            {fields.map(field => {
                                const isLocked = UNHIDEABLE_FIELDS.includes(field) || (field === 'department' && deptLockedByPolicy);
                                const conf = config.field_configurations[field];

                                return (
                                    <div key={field} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900 flex items-center gap-1.5">
                                                {field.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                                {field === 'department' && deptLockedByPolicy && (
                                                    <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                                                        <Lock className="w-3 h-3" /> Locked by Approval Policy
                                                    </span>
                                                )}
                                            </span>
                                            <span className="text-xs text-gray-400 font-mono">{field}</span>
                                        </div>

                                        <div className="flex gap-8">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                    checked={conf?.is_visible || false}
                                                    disabled={isLocked}
                                                    onChange={() => handleFieldToggle(field, 'is_visible')}
                                                    title={field === 'department' && deptLockedByPolicy ? 'Locked: an approval workflow uses department matching' : ''}
                                                />
                                                <span className={`text-sm ${isLocked ? 'text-gray-400' : 'text-gray-700'}`}>{t('pages.issuanceFormConfig.visible')}</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer w-24">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                    checked={conf?.is_mandatory || false}
                                                    disabled={field === 'department' && deptLockedByPolicy}
                                                    onChange={() => handleFieldToggle(field, 'is_mandatory')}
                                                    title={field === 'department' && deptLockedByPolicy ? 'Locked: an approval workflow uses department matching' : ''}
                                                />
                                                <span className="text-sm text-gray-700">{t('pages.issuanceFormConfig.mandatory')}</span>
                                            </label>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Reference Types Configuration */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 font-semibold text-gray-700 flex items-center gap-2">
                    <Settings2 className="w-4 h-4" /> Reference Types
                </div>
                <div className="p-6">
                    <p className="text-sm text-gray-500 mb-4">Configure the list of reference types available in the issuance form. Leave empty to use system defaults.</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {(config.reference_types || DEFAULT_REFERENCE_TYPES).map((rt, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 px-3 py-1.5 rounded-full text-sm font-medium border border-blue-200">
                                {rt.name}
                                <button type="button" onClick={() => {
                                    const current = config.reference_types || [...DEFAULT_REFERENCE_TYPES];
                                    setConfig(prev => ({ ...prev, reference_types: current.filter((_, i) => i !== idx) }));
                                }} className="text-blue-400 hover:text-red-500 transition">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text" value={newRefType} onChange={(e) => setNewRefType(e.target.value)}
                            placeholder="Add new reference type..."
                            className="flex-1 border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm px-3 py-2"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && newRefType.trim()) {
                                    e.preventDefault();
                                    const id = newRefType.trim().toUpperCase().replace(/\s+/g, '_');
                                    const current = config.reference_types || [...DEFAULT_REFERENCE_TYPES];
                                    if (current.some(rt => rt.id === id)) { toast.warning('This reference type already exists'); return; }
                                    setConfig(prev => ({ ...prev, reference_types: [...current, { id, name: newRefType.trim() }] }));
                                    setNewRefType('');
                                }
                            }}
                        />
                        <button type="button" onClick={() => {
                            if (!newRefType.trim()) return;
                            const id = newRefType.trim().toUpperCase().replace(/\s+/g, '_');
                            const current = config.reference_types || [...DEFAULT_REFERENCE_TYPES];
                            if (current.some(rt => rt.id === id)) { toast.warning('This reference type already exists'); return; }
                            setConfig(prev => ({ ...prev, reference_types: [...current, { id, name: newRefType.trim() }] }));
                            setNewRefType('');
                        }} className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                            <Plus className="w-4 h-4" /> Add
                        </button>
                    </div>
                </div>
            </div>

            {/* Document Requirements Configuration */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 font-semibold text-gray-700 flex items-center gap-2">
                    <Settings2 className="w-4 h-4" /> Document Requirements
                </div>
                <div className="p-6">
                    <p className="text-sm text-gray-500 mb-2">Control which document upload sections are shown in the issuance form and whether they are mandatory.</p>
                    <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded mb-4">💡 <strong>Special Wording Template</strong> is automatically required when the requestor checks "Requires Special Wording" — no configuration needed.</p>
                    <div className="divide-y divide-gray-100">
                        {[
                            { key: 'CONTRACT', label: 'Reference Document (Contract / PO)' },
                            { key: 'THIRD_PARTY', label: 'Third Party Documents' },
                            { key: 'OTHER', label: 'Other Supporting Documents' }
                        ].map(dt => {
                            const dc = config.document_config?.[dt.key] || { is_visible: true, is_mandatory: false };
                            return (
                                <div key={dt.key} className="py-4 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-900">{dt.label}</span>
                                        <span className="text-xs text-gray-400 font-mono">{dt.key}</span>
                                    </div>
                                    <div className="flex gap-8">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                checked={dc.is_visible}
                                                onChange={() => {
                                                    const current = { ...config.document_config } || {};
                                                    const cur = current[dt.key] || { is_visible: true, is_mandatory: false };
                                                    const newVisible = !cur.is_visible;
                                                    current[dt.key] = { ...cur, is_visible: newVisible, is_mandatory: !newVisible ? false : cur.is_mandatory };
                                                    
                                                    setConfig(prev => {
                                                        const newState = { ...prev, document_config: current };
                                                        // Auto-sync Is Third Party toggle based on Third Party Docs setting
                                                        if (dt.key === 'THIRD_PARTY' && newVisible) {
                                                            newState.field_configurations = { ...newState.field_configurations };
                                                            const tpConfig = newState.field_configurations['is_third_party'] || { is_visible: false, is_mandatory: false };
                                                            newState.field_configurations['is_third_party'] = { ...tpConfig, is_visible: true };
                                                        }
                                                        return newState;
                                                    });
                                                }}
                                            />
                                            <span className="text-sm text-gray-700">Visible</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer w-24">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                checked={dc.is_mandatory}
                                                onChange={() => {
                                                    const current = { ...config.document_config } || {};
                                                    const cur = current[dt.key] || { is_visible: true, is_mandatory: false };
                                                    const newMandatory = !cur.is_mandatory;
                                                    current[dt.key] = { ...cur, is_mandatory: newMandatory, is_visible: newMandatory ? true : cur.is_visible };
                                                    
                                                    setConfig(prev => {
                                                        const newState = { ...prev, document_config: current };
                                                        // Auto-sync Is Third Party toggle based on Third Party Docs setting
                                                        if (dt.key === 'THIRD_PARTY' && newMandatory) {
                                                            newState.field_configurations = { ...newState.field_configurations };
                                                            const tpConfig = newState.field_configurations['is_third_party'] || { is_visible: false, is_mandatory: false };
                                                            newState.field_configurations['is_third_party'] = { ...tpConfig, is_visible: true, is_mandatory: true };
                                                        }
                                                        return newState;
                                                    });
                                                }}
                                            />
                                            <span className="text-sm text-gray-700">Mandatory</span>
                                        </label>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 font-semibold text-gray-700 flex items-center gap-2">
                    <Settings2 className="w-4 h-4" /> {t('pages.issuanceFormConfig.customFieldsTitle')}
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2].map(num => {
                        const target = `custom_field_${num}_config`;
                        const cnf = config[target];
                        const isEnabled = !!cnf;

                        return (
                            <div key={num} className={`border rounded-lg p-4 transition ${isEnabled ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold text-gray-800">Custom Field {num}</h3>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={isEnabled}
                                            onChange={(e) => handleCustomFieldChange(num, 'enabled', e.target.checked)}
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        /> {t('pages.issuanceFormConfig.enable')}
                                    </label>
                                </div>

                                {isEnabled && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('pages.issuanceFormConfig.fieldLabel')}</label>
                                            <input
                                                type="text"
                                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                value={cnf.label}
                                                onChange={(e) => handleCustomFieldChange(num, 'label', e.target.value)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('pages.issuanceFormConfig.dataType')}</label>
                                                <select
                                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                    value={cnf.type}
                                                    onChange={(e) => {
                                                        handleCustomFieldChange(num, 'type', e.target.value);
                                                        // Clear options when switching away from LIST
                                                        if (e.target.value !== 'LIST') {
                                                            handleCustomFieldChange(num, 'options', null);
                                                        } else if (!cnf.options) {
                                                            handleCustomFieldChange(num, 'options', []);
                                                        }
                                                    }}
                                                >
                                                    <option value="TEXT">{t('pages.issuanceFormConfig.text')}</option>
                                                    <option value="NUMBER">{t('pages.issuanceFormConfig.number')}</option>
                                                    <option value="DATE">{t('pages.issuanceFormConfig.date')}</option>
                                                    <option value="LIST">Dropdown List</option>
                                                </select>
                                            </div>
                                            <div className="flex items-center pt-5">
                                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded text-blue-600 focus:ring-blue-500"
                                                        checked={cnf.is_mandatory}
                                                        onChange={(e) => handleCustomFieldChange(num, 'is_mandatory', e.target.checked)}
                                                    /> {t('pages.issuanceFormConfig.mandatory')}
                                                </label>
                                            </div>
                                        </div>

                                        {/* LIST options editor */}
                                        {cnf.type === 'LIST' && (
                                            <div className="mt-3 border border-gray-200 rounded-lg p-3 bg-white">
                                                <label className="block text-xs font-medium text-gray-600 mb-2">Dropdown Options</label>
                                                <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                                                    {(cnf.options || []).map((opt, idx) => (
                                                        <span key={idx} className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 px-2.5 py-1 rounded-full text-xs font-medium border border-blue-200">
                                                            {opt}
                                                            <button type="button" onClick={() => {
                                                                const updated = (cnf.options || []).filter((_, i) => i !== idx);
                                                                handleCustomFieldChange(num, 'options', updated);
                                                            }} className="text-blue-400 hover:text-red-500 transition">
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="flex gap-1.5">
                                                    <input
                                                        type="text"
                                                        placeholder="Type option and press Enter..."
                                                        className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs px-2.5 py-1.5"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && e.target.value.trim()) {
                                                                e.preventDefault();
                                                                const val = e.target.value.trim();
                                                                const current = cnf.options || [];
                                                                if (current.includes(val)) { toast.warning('Option already exists'); return; }
                                                                handleCustomFieldChange(num, 'options', [...current, val]);
                                                                e.target.value = '';
                                                            }
                                                        }}
                                                    />
                                                    <button type="button" onClick={(e) => {
                                                        const input = e.target.closest('div').querySelector('input');
                                                        if (!input.value.trim()) return;
                                                        const val = input.value.trim();
                                                        const current = cnf.options || [];
                                                        if (current.includes(val)) { toast.warning('Option already exists'); return; }
                                                        handleCustomFieldChange(num, 'options', [...current, val]);
                                                        input.value = '';
                                                    }} className="bg-blue-600 text-white px-2.5 py-1 rounded-md text-xs font-medium hover:bg-blue-700 transition">
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}