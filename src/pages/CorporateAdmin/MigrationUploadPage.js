// frontend/src/pages/CorporateAdmin/MigrationUploadPage.js

import React, { useState, useEffect, useRef } from 'react';
import { Upload, Layers, Clock, CalendarX, Copy, Loader2, CheckCircle, XCircle, Eye, AlertCircle, Zap, Edit, Save, Trash2, RotateCcw, CloudUpload, Filter, TrendingUp, History, X, ShieldCheck, AlertTriangle, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// IMPORTING THE CENTRALIZED API SERVICE
import { apiRequest } from 'services/apiService';
import InternalOwnerFormModal from '../../components/Modals/InternalOwnerFormModal';

// =====================================================================
// NEW: History Preview Modal Component
// =====================================================================
	const StatusTile = ({ label, count, colorClass, icon: Icon }) => (
		<div className={`flex-1 min-w-[130px] p-4 rounded-xl border ${colorClass} shadow-sm flex flex-col items-center justify-center transition-all hover:scale-105 hover:shadow-md`}>
			<div className="flex items-center gap-2 mb-2 opacity-80">
				<Icon size={16} />
				<span className="text-xs font-bold uppercase tracking-wider">{label}</span>
			</div>
			<span className="text-2xl font-black">{count || 0}</span>
		</div>
	);

const HistoryPreviewModal = ({ lgHistory, onClose }) => {
    if (!lgHistory) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
            <div className="relative p-8 bg-white w-4/5 max-w-4xl rounded-xl shadow-lg border border-gray-200 animate-slide-in-top max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 border-b pb-3">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        <History className="w-6 h-6 mr-2 text-indigo-500" />
                        LG History Preview: <span className="ml-2 text-blue-600">{lgHistory.lg_number}</span>
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {lgHistory.conflict_flag && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4" role="alert">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertCircle className="h-5 w-5 text-yellow-400" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-yellow-800">Conflict Detected</p>
                                <p className="mt-1 text-sm text-yellow-700">
                                    Multiple snapshots for the same date/time. The last one in the series will be used. Please review carefully.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <ol className="relative border-l-2 border-gray-200 dark:border-gray-700 space-y-8">
                        {lgHistory.snapshots.map((snapshot, index) => (
                            <li key={snapshot.id} className="ml-6 flex flex-col">
                                <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -left-3 ring-8 ring-white">
                                    {index === 0 ? <Zap className="w-3 h-3 text-blue-800" /> : <RotateCcw className="w-3 h-3 text-blue-800" />}
                                </span>
                                <h3 className="flex items-center text-lg font-semibold text-gray-900">
                                    {index === 0 ? 'Initial Record' : `Amendment ${index}`}
                                </h3>
                                <time className="block mb-2 text-sm font-normal leading-none text-gray-400">
                                    {snapshot.issuance_date} to {snapshot.expiry_date}
                                </time>
                                <div className="bg-gray-50 p-4 rounded-lg shadow-sm mb-4">
                                    {index === 0 ? (
                                        <p className="text-sm text-gray-700">This is the base record that will be created.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-sm font-semibold text-gray-700">Changes from previous version:</p>
                                            {Object.entries(snapshot.diff).map(([key, diff]) => (
                                                <div key={key} className="text-sm text-gray-600 p-2 bg-gray-100 rounded-md">
                                                    <span className="font-medium text-gray-800">{key}:</span>
                                                    <span className="line-through text-red-500 ml-1">{JSON.stringify(diff.old)}</span>
                                                    <span className="text-green-600 ml-2">{JSON.stringify(diff.new)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
                
                <div className="mt-6 flex justify-end">
                    <button 
                        onClick={onClose} 
                        className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// Component to display a single validation log entry as a card.
const ValidationLogCard = ({ field, message, onDismissAi }) => {
    if (field === 'ignored_ai_issues') return null;

    const msgStr = String(message || '');
    const isAuditPassed = field === 'ai_audit_status' && msgStr.startsWith('AUDITED_PASSED');
    const isAuditSkipped = field === 'ai_audit_status' && msgStr.startsWith('SKIPPED');
    const isAiMismatch = field === 'ai_warning' || (field === 'ai_audit_status' && msgStr.startsWith('MISMATCH'));

    const borderClass = isAuditPassed
        ? 'border-green-500'
        : isAuditSkipped
            ? 'border-amber-500'
            : 'border-red-500';
    const iconBgClass = isAuditPassed
        ? 'bg-green-100 group-hover:bg-green-200'
        : isAuditSkipped
            ? 'bg-amber-100 group-hover:bg-amber-200'
            : 'bg-red-100 group-hover:bg-red-200';

    return (
        <div className={`group bg-white border-l-4 ${borderClass} rounded-r-lg p-3 flex items-start space-x-3 text-xs shadow-sm hover:shadow-md transition-all mb-2 border-y border-r border-gray-100`}>
            <div className={`${iconBgClass} p-1 rounded-full transition-colors`}>
                {isAuditPassed ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                ) : isAuditSkipped ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                )}
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-gray-700 uppercase tracking-wide text-[10px]">
                        {field === 'ai_audit_status' ? 'AI AUDIT STATUS' : field === 'ai_warning' ? 'AI DISCREPANCY NOTE' : field}
                    </p>
                    {isAiMismatch && onDismissAi && (
                        <button
                            type="button"
                            onClick={onDismissAi}
                            className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-300 rounded text-[10px] font-semibold hover:bg-green-100 transition-colors"
                            title="Skip / ignore this AI warning if you are sure your Excel data is accurate"
                        >
                            ✓ Skip / Approve
                        </button>
                    )}
                </div>
                <p className="text-gray-600 mt-0.5 font-medium">{msgStr}</p>
            </div>
        </div>
    );
};

// Define a master list of all LG fields to ensure all columns are always rendered
const ALL_LG_FIELDS = [
    'lg_number', 'attachment_url', 'lg_amount', 'lg_currency_id', 'lg_payable_currency_id',
    'issuance_date', 'expiry_date', 'auto_renewal', 'lg_type_id',
    'lg_operational_status_id', 'payment_conditions', 'description_purpose',
    'issuer_name', 'issuer_id', 'beneficiary_corporate_id', 'issuing_bank_id',
    'issuing_bank_address', 'issuing_bank_phone', 'issuing_bank_fax',
    'issuing_method_id', 'applicable_rule_id', 'applicable_rules_text',
    'other_conditions', 'internal_owner_email',
    'lg_category_id', 'additional_field_values', 'internal_contract_project_id',
    'notes',
];

// UPDATED: Component to render the dynamic table of staged records with editing functionality
const StagedRecordsTable = ({ records, getStatusColor, onRecordUpdate, onRecordDelete, selectedRecords, onToggleSelect, onToggleSelectAll, currencies, getCurrencyCodeById, lgTypes, getLgTypeNameById, issuingMethods, getIssuingMethodNameById, rules, getRuleNameById, banks, getBankNameById, entities, getEntityNameById, lgCategories, getLgCategoryNameById, lgOperationalStatuses, getLgOperationalStatusNameById, internalOwners = [], uploadedAttachments = [], onLocateFolder, onDismissAi }) => {
    const [editingId, setEditingId] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    if (records.length === 0) {
        return <p className="text-gray-500 text-center">No staged records to display.</p>;
    }
    
    // Friendly names for headers
    const friendlyHeaderNames = {
        lg_number: 'LG Number',
        attachment_url: 'Attachment (PDF)',
        lg_amount: 'Amount',
        lg_currency_id: 'Currency',
        lg_payable_currency_id: 'Payable Currency',
        issuance_date: 'Issuance Date',
        expiry_date: 'Expiry Date',
        auto_renewal: 'Auto-Renewal',
        lg_type_id: 'LG Type',
        lg_operational_status_id: 'Op. Status',
        payment_conditions: 'Payment Cond.',
        description_purpose: 'Purpose',
        issuer_name: 'Issuer Name',
        issuer_id: 'Issuer ID',
        beneficiary_corporate_id: 'Beneficiary',
        issuing_bank_id: 'Issuing Bank',
        issuing_bank_address: 'Bank Address',
        issuing_bank_phone: 'Bank Phone',
        issuing_bank_fax: 'Bank Fax',
        issuing_method_id: 'Issuing Method',
        applicable_rule_id: 'Rule',
        applicable_rules_text: 'Rule Text',
        other_conditions: 'Other Cond.',
        internal_owner_email: 'Owner Email',
        lg_category_id: 'Category',
        additional_field_values: 'Add. Fields',
        internal_contract_project_id: 'Contract ID',
        notes: 'Notes',
    };
    
	const castValue = (key, value) => {
		if (value === null || value === undefined || value === '') {
			return null;
		}
		if (['lg_amount'].includes(key)) {
			return parseFloat(value);
		}
		if (key.endsWith('_id')) {
			return parseInt(value, 10);
		}
		return value;
	};

    const handleEditClick = (record) => {
        setEditingId(record.id);
        setEditFormData({ ...record.source_data_json });
    };

    const handleSaveClick = async (recordId) => {
        const record = records.find(rec => rec.id === recordId);
        if (record && record.record_status === 'READY_FOR_IMPORT') {
            alert("This record is already ready for import and cannot be edited. It must be processed or deleted.");
            return;
        }

        await onRecordUpdate(recordId, editFormData);

        setEditingId(null);
        setEditFormData({});
    };

	const handleEditChange = (key, value) => {
		let castedValue = value;
		if (key.includes('amount') || key.endsWith('_id')) {
			castedValue = castValue(key, value);
		} else if (key === 'auto_renewal') {
            castedValue = value === 'true';
        }
		setEditFormData(prev => ({ ...prev, [key]: castedValue }));
	};

    const isEditing = (recordId) => editingId === recordId;
    
    const getRenewalStatus = (value) => {
        if (value === true) return "Yes";
        if (value === false) return "No";
        return "N/A";
    };



    return (
        <div className="overflow-auto relative shadow-xl rounded-xl border border-gray-200 bg-white max-h-[75vh]">
            <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-20 shadow-sm backdrop-blur-sm bg-opacity-95">	
                    <tr>
                         <th scope="col" className="py-3 px-3">
                            <input
                                type="checkbox"
                                className="form-checkbox h-4 w-4 text-blue-600 rounded"
                                checked={selectedRecords.length === records.length && records.length > 0}
                                onChange={onToggleSelectAll}
                            />
                        </th>
                        <th scope="col" className="py-3 px-6">Actions</th>
                        <th scope="col" className="py-3 px-6">ID</th>
                        <th scope="col" className="py-3 px-6">File Name</th>
                        <th scope="col" className="py-3 px-6">Status</th>
                        <th scope="col" className="py-3 px-6">Validation Log</th>
                        {ALL_LG_FIELDS.map(key => (
                            <th key={key} scope="col" className="py-3 px-6">{friendlyHeaderNames[key] || key}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {records.map((record) => {
                        const isImported = record.record_status === 'IMPORTED';
                        const isEditingField = isEditing(record.id);

                        return (
                            <tr key={record.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                <td className="py-4 px-3">
                                    <input
                                        type="checkbox"
                                        className={`form-checkbox h-4 w-4 rounded ${isImported ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600'}`}
                                        checked={selectedRecords.includes(record.id) && !isImported}
                                        onChange={() => onToggleSelect(record.id)}
                                        disabled={isImported}
                                    />
                                </td>
                                <td className="py-4 px-6 whitespace-nowrap">
                                    <div className="flex space-x-2">
                                        {isEditingField ? (
                                            <button onClick={() => handleSaveClick(record.id)} className="text-green-600 hover:text-green-800" title="Save" disabled={isImported}>
                                                <Save className="w-5 h-5" />
                                            </button>
                                        ) : (
                                            <button onClick={() => handleEditClick(record)} className={`hover:text-blue-800 ${isImported ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600'}`} title="Edit" disabled={isImported}>
                                                <Edit className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button onClick={() => onRecordDelete(record.id)} className={`hover:text-red-800 ${isImported ? 'text-gray-400 cursor-not-allowed' : 'text-red-600'}`} title="Delete" disabled={isImported}>
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </td>
                                <th scope="row" className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">{record.id}</th>
                                <td className="py-4 px-6">{record.file_name}</td>
                                <td className="py-4 px-6">
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(record.record_status)}`}>
                                        {record.record_status}
                                    </span>
                                </td>
                                <td className="py-4 px-6" style={{ minWidth: '400px' }}>
                                    {record.validation_log && Object.keys(record.validation_log).filter(k => k !== 'ignored_ai_issues').length > 0 ? (
                                        <div className="space-y-2">
                                            {Object.entries(record.validation_log).map(([field, message]) => (
                                                <ValidationLogCard
                                                    key={field}
                                                    field={field}
                                                    message={message}
                                                    onDismissAi={onDismissAi ? () => onDismissAi(record.id, record.source_data_json?.lg_number) : undefined}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-green-600 flex items-center space-x-1">
                                            <CheckCircle className="w-4 h-4" />
                                            <span>No Issues</span>
                                        </span>
                                    )}
                                </td>
                                {ALL_LG_FIELDS.map(key => {
                                    const isDate = key.includes('date');
                                    const isCurrency = key.includes('currency_id');
                                    const isAutoRenewal = key === 'auto_renewal';
                                    const isLgType = key === 'lg_type_id';
                                    const isIssuingMethod = key === 'issuing_method_id';
                                    const isRule = key === 'applicable_rule_id';
                                    const isBank = key === 'issuing_bank_id';
                                    const isEntity = key === 'beneficiary_corporate_id';
                                    const isCategory = key === 'lg_category_id';
                                    const isOpStatus = key === 'lg_operational_status_id';
                                    
                                    const inputType = isDate ? 'date' : 'text';
                                    
                                    const recordData = record.source_data_json || {};
                                    const currentValue = isEditingField ? (editFormData[key] || '') : (recordData[key] || '');

                                    let displayValue = currentValue;
                                    if (isCurrency) displayValue = getCurrencyCodeById(currentValue);
                                    else if (isAutoRenewal) displayValue = getRenewalStatus(currentValue);
                                    else if (isLgType) displayValue = getLgTypeNameById(currentValue);
                                    else if (isIssuingMethod) displayValue = getIssuingMethodNameById(currentValue);
                                    else if (isRule) displayValue = getRuleNameById(currentValue);
                                    else if (isBank) displayValue = getBankNameById(currentValue);
                                    else if (isEntity) displayValue = getEntityNameById(currentValue);
                                    else if (isCategory) displayValue = getLgCategoryNameById(currentValue);
                                    else if (isOpStatus) displayValue = getLgOperationalStatusNameById(currentValue);
                                    
                                    return (
                                        <td key={`${record.id}-${key}`} className="py-4 px-6 whitespace-nowrap">
                                            <div className="flex items-center space-x-1">
                                                {isEditingField && !isImported && isCurrency ? (
                                                    <select
                                                        value={currentValue || ''}
                                                        onChange={(e) => handleEditChange(key, parseInt(e.target.value, 10))}
                                                        className="w-full text-sm rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="">Select Currency</option>
                                                        {currencies.map(currency => (
                                                            <option key={currency.id} value={currency.id}>
                                                                {currency.iso_code} - {currency.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : isEditingField && !isImported && isAutoRenewal ? (
                                                    <select
                                                        value={currentValue !== undefined ? currentValue.toString() : ''}
                                                        onChange={(e) => handleEditChange(key, e.target.value)}
                                                        className="w-full text-sm rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="">Select</option>
                                                        <option value="true">Yes</option>
                                                        <option value="false">No</option>
                                                    </select>
                                                ) : isEditingField && !isImported && isLgType ? (
                                                     <select
                                                        value={currentValue || ''}
                                                        onChange={(e) => handleEditChange(key, parseInt(e.target.value, 10))}
                                                        className="w-full text-sm rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="">Select LG Type</option>
                                                        {lgTypes.map(type => (
                                                            <option key={type.id} value={type.id}>{type.name}</option>
                                                        ))}
                                                    </select>
                                                ) : isEditingField && !isImported && isIssuingMethod ? (
                                                    <select
                                                        value={currentValue || ''}
                                                        onChange={(e) => handleEditChange(key, parseInt(e.target.value, 10))}
                                                        className="w-full text-sm rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="">Select Method</option>
                                                        {issuingMethods.map(method => (
                                                            <option key={method.id} value={method.id}>{method.name}</option>
                                                        ))}
                                                    </select>
                                                ) : isEditingField && !isImported && isRule ? (
                                                    <select
                                                        value={currentValue || ''}
                                                        onChange={(e) => handleEditChange(key, parseInt(e.target.value, 10))}
                                                        className="w-full text-sm rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="">Select Rule</option>
                                                        {rules.map(rule => (
                                                            <option key={rule.id} value={rule.id}>{rule.name}</option>
                                                        ))}
                                                    </select>
                                                ) : isEditingField && !isImported && isBank ? (
                                                    <select
                                                        value={currentValue || ''}
                                                        onChange={(e) => handleEditChange(key, parseInt(e.target.value, 10))}
                                                        className="w-full text-sm rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="">Select Bank</option>
                                                        {banks.map(bank => (
                                                            <option key={bank.id} value={bank.id}>{bank.name}</option>
                                                        ))}
                                                    </select>
                                                ) : isEditingField && !isImported && isEntity ? (
                                                    <select
                                                        value={currentValue || ''}
                                                        onChange={(e) => handleEditChange(key, parseInt(e.target.value, 10))}
                                                        className="w-full text-sm rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="">Select Entity</option>
                                                        {entities.map(entity => (
                                                            <option key={entity.id} value={entity.id}>{entity.entity_name}</option>
                                                        ))}
                                                    </select>
                                                ) : isEditingField && !isImported && isCategory ? (
                                                    <select
                                                        value={currentValue || ''}
                                                        onChange={(e) => handleEditChange(key, parseInt(e.target.value, 10))}
                                                        className="w-full text-sm rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="">Select Category</option>
                                                        {lgCategories.map(category => (
                                                            <option key={category.id} value={category.id}>{category.name}</option>
                                                        ))}
                                                    </select>
                                                ) : isEditingField && !isImported && isOpStatus ? (
                                                     <select
                                                        value={currentValue || ''}
                                                        onChange={(e) => handleEditChange(key, parseInt(e.target.value, 10))}
                                                        className="w-full text-sm rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="">Select Status</option>
                                                        {lgOperationalStatuses.map(status => (
                                                            <option key={status.id} value={status.id}>{status.name}</option>
                                                        ))}
                                                    </select>
                                                ) : isEditingField && !isImported ? (
                                                    <>
                                                        <input
                                                            type={inputType}
                                                            list={key === 'internal_owner_email' ? `internal-owners-list-${record.id}` : undefined}
                                                            value={displayValue}
                                                            onChange={(e) => handleEditChange(key, e.target.value)}
                                                            className="w-full text-sm rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                        />
                                                        {key === 'internal_owner_email' && internalOwners.length > 0 && (
                                                            <datalist id={`internal-owners-list-${record.id}`}>
                                                                {internalOwners.map(owner => (
                                                                    <option key={owner.id} value={owner.email} />
                                                                ))}
                                                            </datalist>
                                                        )}
                                                    </>
                                                ) : key === 'attachment_url' ? (
                                                    (() => {
                                                        const rawAtt = recordData.attachment_url || recordData.attachement || recordData.attachment || recordData.file_path || '';
                                                        if (!rawAtt) return <span className="text-gray-400">N/A</span>;
                                                        const isRemoteUrl = /^(https?:\/\/|gs:\/\/)/i.test(String(rawAtt).trim());
                                                        const baseName = String(rawAtt).replace(/\\/g, '/').split('/').pop().trim();
                                                        const isUploaded = isRemoteUrl || uploadedAttachments.some(f => f.toLowerCase() === baseName.toLowerCase());
                                                        return (
                                                            <div className="flex flex-col space-y-1">
                                                                <span className="text-xs font-mono text-gray-800" title={rawAtt}>{baseName}</span>
                                                                {isUploaded ? (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold w-max bg-green-100 text-green-800">
                                                                        ✓ Encrypted & Ready
                                                                    </span>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => onLocateFolder && onLocateFolder()}
                                                                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold w-max bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer"
                                                                        title="Click to select the local folder containing your PDF scans"
                                                                    >
                                                                        ⚠ Local Path (Auto-Read on Audit/Import)
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })()
                                                ) : (
                                                    <span>{displayValue || 'N/A'}</span>
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

function MigrationUploadPage() {
    const navigate = useNavigate();
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadMessage, setUploadMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [stagedRecords, setStagedRecords] = useState([]);
    const [manualEntryData, setManualEntryData] = useState('');
    
    // NEW: State for migration type
    const [migrationType, setMigrationType] = useState('RECORD');
    
    // NEW: State for lookup tables
    const [currencies, setCurrencies] = useState([]);
    const [lgTypes, setLgTypes] = useState([]);
    const [issuingMethods, setIssuingMethods] = useState([]);
    const [rules, setRules] = useState([]);
    const [banks, setBanks] = useState([]);
    const [entities, setEntities] = useState([]);
    const [lgCategories, setLgCategories] = useState([]);
    const [lgOperationalStatuses, setLgOperationalStatuses] = useState([]);
    const [internalOwners, setInternalOwners] = useState([]);
    const [isAddOwnerModalOpen, setIsAddOwnerModalOpen] = useState(false);

    // NEW: State for filtering
    const [filterStatus, setFilterStatus] = useState('');
    const [filterLGNumber, setFilterLGNumber] = useState('');
    const [filterFileName, setFilterFileName] = useState('');
    const [pageSize, setPageSize] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    
    // NEW: State for selected records
    const [selectedRecords, setSelectedRecords] = useState([]);
    
    // NEW: Single consolidated loading state
    const [isLoading, setIsLoading] = useState(false);
    
    // NEW: State for reports and history
    const [reportSummary, setReportSummary] = useState(null);
    const [batches, setBatches] = useState([]);

    // NEW: State for the history preview modal
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewModalData, setPreviewModalData] = useState(null);

    // NEW: State for AI Audit
    const [isAuditing, setIsAuditing] = useState(false);
    const [auditReport, setAuditReport] = useState(null);
    const [uploadedAttachments, setUploadedAttachments] = useState([]);
    const folderInputRef = useRef(null);
    const pendingFolderResolverRef = useRef(null);
    
    // NEW: Helper function to map currency ID to ISO code for display
    const getCurrencyCodeById = (id) => {
        const currency = currencies.find(c => c.id === id);
        return currency ? currency.iso_code : id;
    };
    // NEW: Helper functions for other fields
    const getLgTypeNameById = (id) => {
        const type = lgTypes.find(t => t.id === id);
        return type ? type.name : id;
    };
    const getIssuingMethodNameById = (id) => {
        const method = issuingMethods.find(m => m.id === id);
        return method ? method.name : id;
    };
    const getRuleNameById = (id) => {
        const rule = rules.find(r => r.id === id);
        return rule ? rule.name : id;
    };
    const getBankNameById = (id) => {
        const bank = banks.find(b => b.id === id);
        return bank ? bank.name : id;
    };
    const getEntityNameById = (id) => {
        const entity = entities.find(e => e.id === id);
        return entity ? entity.entity_name : id;
    };
    const getLgCategoryNameById = (id) => {
        const category = lgCategories.find(c => c.id === id);
        return category ? category.name : id;
    };
    const getLgOperationalStatusNameById = (id) => {
        const status = lgOperationalStatuses.find(s => s.id === id);
        return status ? status.name : id;
    };


    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
        setUploadMessage('');
        setManualEntryData(''); // Clear manual entry on file selection
    };

    const handleManualEntryChange = (e) => {
        setManualEntryData(e.target.value);
        setUploadMessage('');
        setSelectedFile(null); // Clear file selection on manual entry
    };
    
    const fetchStagedRecords = async () => {
      setIsLoading(true); // Consolidated loading state
      setUploadMessage('');
      try {
        const queryParams = new URLSearchParams();
        if (filterStatus) queryParams.append('status_filter', filterStatus);
        if (filterLGNumber) queryParams.append('lg_number', filterLGNumber);
        if (filterFileName) queryParams.append('file_name', filterFileName);

        const records = await apiRequest(`/corporate-admin/migration/staged?${queryParams.toString()}`, 'GET');
        setStagedRecords(records);
        setCurrentPage(1);
        if (records.length > 0) {
          setUploadMessage(`Found ${records.length} staged records.`);
          setIsSuccess(true);
        } else {
          setUploadMessage('No staged records found.');
          setIsSuccess(true);
        }
      } catch (err) {
        setUploadMessage(`Failed to fetch staged records: ${err.message || 'An unexpected error occurred.'}`);
        setIsSuccess(false);
      } finally {
        setIsLoading(false); // Consolidated loading state
        setSelectedRecords([]); // NEW: Clear selections after fetching new data
      }
    };
    
    // NEW: Fetch report summary on load and after actions
    const fetchReportAndBatches = async () => {
        try {
            const summary = await apiRequest('/corporate-admin/migration/report', 'GET');
            setReportSummary(summary);
            const batchesList = await apiRequest('/corporate-admin/migration/batches', 'GET');
            setBatches(batchesList);
        } catch (err) {
            console.error('Failed to fetch reports:', err);
        }
    };

    const fetchCurrencies = async () => {
        try {
            const response = await apiRequest('/end-user/currencies/', 'GET');
            setCurrencies(response);
        } catch (err) {
            console.error('Failed to fetch currencies:', err);
        }
    };
    const fetchInternalOwners = async () => {
        try {
            const ownersData = await apiRequest('/end-user/internal-owner-contacts/with-lg-count', 'GET');
            if (Array.isArray(ownersData)) {
                setInternalOwners(ownersData);
            }
        } catch (err) {
            console.error('Failed to fetch internal owners:', err);
        }
    };

    // NEW: Fetching for other lookup tables
    const fetchLookups = async () => {
        try {
            const [lgTypesData, issuingMethodsData, rulesData, banksData, entitiesData, lgCategoriesData, lgOperationalStatusesData] = await Promise.all([
                apiRequest('/end-user/lg-types/', 'GET'),
                apiRequest('/end-user/issuing-methods/', 'GET'),
                apiRequest('/end-user/rules/', 'GET'),
                apiRequest('/end-user/banks/', 'GET'),
                apiRequest('/end-user/customer-entities/', 'GET'),
                apiRequest('/end-user/lg-categories/', 'GET'),
                apiRequest('/end-user/lg-operational-statuses/', 'GET'),
            ]);
            setLgTypes(lgTypesData);
            setIssuingMethods(issuingMethodsData);
            setRules(rulesData);
            setBanks(banksData);
            setEntities(entitiesData);
            setLgCategories(lgCategoriesData);
            setLgOperationalStatuses(lgOperationalStatusesData);
        } catch (err) {
            console.error('Failed to fetch lookup data:', err);
        }
    };
    
    const fetchUploadedAttachments = async () => {
        try {
            const res = await apiRequest('/corporate-admin/migration/uploaded-attachments', 'GET');
            const list = res?.files || res?.uploaded_files || [];
            if (Array.isArray(list)) {
                setUploadedAttachments(list);
                return list;
            }
        } catch (err) {
            console.error('Failed to fetch uploaded attachments:', err);
        }
        return [];
    };

    const getMissingLocalAttachmentNames = (currentUploadedList = uploadedAttachments) => {
        const uploadedSet = new Set((currentUploadedList || []).map(f => String(f).toLowerCase()));
        const missingSet = new Set();

        stagedRecords.forEach(rec => {
            if (rec.record_status === 'IMPORTED') return;
            const data = rec.source_data_json || {};
            const rawAtt = data.attachment_url || data.attachement || data.attachment || data.file_path || '';
            if (!rawAtt) return;
            const cleanStr = String(rawAtt).trim();
            if (!cleanStr || /^(https?:\/\/|gs:\/\/)/i.test(cleanStr)) return;
            const baseName = cleanStr.replace(/\\/g, '/').split('/').pop().trim();
            if (baseName && !uploadedSet.has(baseName.toLowerCase())) {
                missingSet.add(baseName);
            }
        });

        return Array.from(missingSet);
    };

    const uploadMatchedFilesToServer = async (matchedFiles) => {
        if (!matchedFiles || matchedFiles.length === 0) return false;
        const formData = new FormData();
        matchedFiles.forEach(file => formData.append('files', file));
        await apiRequest('/corporate-admin/migration/upload-attachments', 'POST', formData);
        await fetchUploadedAttachments();
        return true;
    };

    const handleFolderInputSelected = async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        const resolver = pendingFolderResolverRef.current;
        pendingFolderResolverRef.current = null;

        if (files.length === 0) {
            if (resolver) resolver(false);
            return;
        }

        try {
            const missingNames = getMissingLocalAttachmentNames();
            const missingLower = new Set(missingNames.map(n => n.toLowerCase()));
            const matched = files.filter(f => missingLower.size === 0 || missingLower.has(f.name.toLowerCase()));

            if (matched.length > 0) {
                await uploadMatchedFilesToServer(matched);
                setUploadMessage(`Automatically read & encrypted ${matched.length} matching PDF file(s) from your folder.`);
                setIsSuccess(true);
                if (resolver) resolver(true);
            } else {
                alert(`None of the required files (${missingNames.slice(0, 5).join(', ')}) were found in the selected folder.`);
                if (resolver) resolver(false);
            }
        } catch (err) {
            console.error('Failed to sync files from folder:', err);
            if (resolver) resolver(false);
        }
    };

    const openNativeFolderPicker = async (missingNames = []) => {
        const sampleList = missingNames.slice(0, 4).join(', ') + (missingNames.length > 4 ? ` (+${missingNames.length - 4} more)` : '');

        // Use standard webkitdirectory input first OR showDirectoryPicker directly inside the click gesture
        // (No window.confirm before the picker, because window.confirm expires the browser's 5-second user gesture timer!)
        if (typeof window.showDirectoryPicker === 'function') {
            try {
                const dirHandle = await window.showDirectoryPicker();
                const missingLower = new Set(missingNames.map(n => n.toLowerCase()));
                const matchedFiles = [];

                const scanDir = async (handle, depth = 0) => {
                    if (depth > 4) return;
                    for await (const entry of handle.values()) {
                        if (entry.kind === 'file') {
                            if (missingLower.size === 0 || missingLower.has(entry.name.toLowerCase())) {
                                const fileObj = await entry.getFile();
                                matchedFiles.push(fileObj);
                            }
                        } else if (entry.kind === 'directory') {
                            await scanDir(entry, depth + 1);
                        }
                    }
                };

                await scanDir(dirHandle);
                if (matchedFiles.length > 0) {
                    await uploadMatchedFilesToServer(matchedFiles);
                    setUploadMessage(`Automatically read & encrypted ${matchedFiles.length} matching PDF file(s) from your folder.`);
                    setIsSuccess(true);
                    return true;
                } else {
                    alert(`Could not find the referenced files (${sampleList || 'PDFs'}) inside the selected folder.`);
                    return false;
                }
            } catch (err) {
                if (err?.name === 'AbortError') {
                    return false;
                }
                // Note: Chrome blocks showDirectoryPicker on system folders like Desktop/Downloads (SecurityError/NotAllowedError).
                // Fall through immediately to folderInputRef.current.click() if user activation is still active!
                console.warn('showDirectoryPicker unavailable or restricted folder, falling back to folder input:', err);
            }
        }

        if (folderInputRef.current) {
            return new Promise((resolve) => {
                let settled = false;
                const finish = (val) => {
                    if (settled) return;
                    settled = true;
                    window.removeEventListener('focus', onWindowFocus);
                    pendingFolderResolverRef.current = null;
                    resolve(val);
                };
                const onWindowFocus = () => {
                    setTimeout(() => {
                        if (!settled && pendingFolderResolverRef.current) {
                            finish(false);
                        }
                    }, 1000);
                };
                pendingFolderResolverRef.current = finish;
                window.addEventListener('focus', onWindowFocus);
                try {
                    folderInputRef.current.click();
                } catch (clickErr) {
                    finish(false);
                }
            });
        }
        return false;
    };

    const ensureLocalAttachmentsSynced = async (forcePrompt = false) => {
        const missingNames = getMissingLocalAttachmentNames(uploadedAttachments);
        const alreadyHasSomeUploaded = Array.isArray(uploadedAttachments) && uploadedAttachments.length > 0;

        if (!forcePrompt && (missingNames.length === 0 || alreadyHasSomeUploaded)) {
            return true;
        }

        // Open the folder picker IMMEDIATELY on the click event without window.confirm()
        // so the browser's user-gesture token never expires!
        return await openNativeFolderPicker(missingNames);
    };

    // EFFICIENT DATA FETCHING: Separate effects for static lookups and dynamic records
    useEffect(() => {
        fetchCurrencies();
        fetchLookups();
        fetchInternalOwners();
        fetchUploadedAttachments();
    }, []); // Empty dependency array ensures this runs only once on mount.

    useEffect(() => {
        fetchStagedRecords();
        fetchReportAndBatches();
    }, [filterStatus, filterLGNumber, filterFileName]);


    // UPDATED: Consolidated intake function
    const handleIntake = async () => {
        setIsLoading(true);
        setUploadMessage('');
        setStagedRecords([]);

        try {
            let response;
            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);
                response = await apiRequest(`/corporate-admin/migration/upload-structured?migration_type=${migrationType}`, 'POST', formData, 'multipart/form-data');
                // The backend now returns staged_records directly
                setStagedRecords(response.staged_records);
                if (response.failed_count > 0 || response.duplicate_count > 0) {
                    setUploadMessage(`Upload successful, but ${response.failed_count} records failed validation and ${response.duplicate_count} records were flagged as duplicates.`);
                    setIsSuccess(false);
                } else {
                    setUploadMessage(`Successfully staged and processed ${response.imported_count} records.`);
                    setIsSuccess(true);
                }
            } else if (manualEntryData) {
                 const parsedData = JSON.parse(manualEntryData);
                 const dataToSubmit = {
                    file_name: "Manual_Entry_" + new Date().toISOString(),
                    source_data_json: parsedData,
                    migration_type: migrationType,
                 };
                response = await apiRequest('/corporate-admin/migration/manual-entry', 'POST', dataToSubmit);
                setStagedRecords(prev => [...prev, response]);
                if (response.record_status === 'ERROR' || response.record_status === 'EXPIRED' || response.record_status === 'DUPLICATE') {
                    setUploadMessage(`Manual entry failed validation or was a duplicate. Please review.`);
                    setIsSuccess(false);
                } else {
                    setUploadMessage(`Manual entry successfully staged and processed.`);
                    setIsSuccess(true);
                }

            } else {
                setUploadMessage('Please select a file or enter a record to stage.');
                setIsLoading(false);
                return;
            }
            
            setSelectedFile(null);
            setManualEntryData('');
            fetchReportAndBatches();

        } catch (err) {
            console.error('Data intake failed:', err);
            setUploadMessage(`Data intake failed: ${err.message || 'An unexpected error occurred.'}`);
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };


    const handleProcessStaged = async () => {
       // NEW: This function is no longer needed on the frontend
       // The "Process" button in the UI should be removed.
       // The logic is now handled automatically in the handleIntake function
       // For now, let's keep it here but with a message to indicate its deprecation
       alert('This process is now deprecated as records are processed automatically on upload.');
       fetchStagedRecords();
    };
		
    const handleResetMigrated = async () => {
        if (!window.confirm(
            'This will remove previously migrated LG records (and their incomplete history) from production for this customer and reset all staged records back to Ready so you can run a clean import. Proceed?'
        )) {
            return;
        }
        setIsLoading(true);
        setUploadMessage('');
        try {
            const response = await apiRequest('/corporate-admin/migration/reset-migrated', 'POST');
            setUploadMessage(
                response?.message ||
                `Purged ${response?.purged_lg_count || 0} migrated LG(s) and reset ${response?.reset_staged_count || 0} staged records.`
            );
            setIsSuccess(true);
            fetchStagedRecords();
            fetchReportAndBatches();
        } catch (err) {
            console.error('Reset migrated records failed:', err);
            setUploadMessage(`Failed to reset migrated records: ${err.message || 'An unexpected error occurred.'}`);
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinalizeMigration = async () => {
        const eligibleStatuses = ['READY_FOR_IMPORT', 'EXPIRED', 'DUPLICATE', 'IMPORTED', 'ERROR'];
        const readyRecordsCount = stagedRecords.filter(rec => rec.record_status === 'READY_FOR_IMPORT').length;
        const lgNumbersToImport = [...new Set(
            stagedRecords
                .filter(rec => eligibleStatuses.includes(rec.record_status) && rec.source_data_json?.lg_number)
                .map(rec => rec.source_data_json.lg_number)
        )];
        const isHistoricalImport = lgNumbersToImport.some(
            lgNum => stagedRecords.filter(rec => rec.source_data_json?.lg_number === lgNum).length > 1
        );

        if (readyRecordsCount === 0 && !isHistoricalImport) {
            setUploadMessage('There are no records ready for import.');
            setIsSuccess(false);
            return;
        }

        const countToConfirm = isHistoricalImport ? lgNumbersToImport.length : readyRecordsCount;
        if (!window.confirm(`Are you sure you want to finalize the migration and import ${countToConfirm} LG(s)? This action cannot be undone.`)) {
            return;
        }

        setIsLoading(true);
        setUploadMessage('');

        try {
            await ensureLocalAttachmentsSynced(false);
            let response;
            if (isHistoricalImport) {
                const importBody = {
                    lg_numbers: lgNumbersToImport,
                    batch_note: "Historical migration run via UI."
                };
                response = await apiRequest('/corporate-admin/migration/import-history', 'POST', importBody);
            } else {
                response = await apiRequest('/corporate-admin/migration/import-ready', 'POST');
            }

            const importedCount = response?.imported || 0;
            const failedCount = response?.failed || 0;
            
            setUploadMessage(
                `Final migration complete. ${importedCount} records were successfully imported. ` +
                `${failedCount} records failed. Please review the table below for details.`
            );
            setIsSuccess(true);

            fetchStagedRecords();
            fetchReportAndBatches();

        } catch (err) {
            console.error('Final migration failed:', err);
            setUploadMessage(`Final migration failed: ${err.message || 'An unexpected error occurred.'}`);
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };
    // Replace the handleRecordUpdate function in your main component
    const handleRecordUpdate = async (recordId, completeRecordData) => {
        setIsLoading(true);
        try {
            const updatedRecord = await apiRequest(`/corporate-admin/migration/staged/${recordId}`, 'PUT', completeRecordData);
            setUploadMessage(`Record ${recordId} updated and re-validated successfully.`);
            setIsSuccess(true);
            
            setStagedRecords(prevRecords => prevRecords.map(rec => rec.id === recordId ? updatedRecord : rec));
            
        } catch (err) {
            setUploadMessage(`Failed to update record ${recordId}: ${err.message || 'An unexpected error occurred.'}`);
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRevalidateSelected = async () => {
        if (selectedRecords.length === 0) {
            setUploadMessage('No records selected for re-validation.');
            setIsSuccess(false);
            return;
        }
    
        if (!window.confirm(`Are you sure you want to re-validate the ${selectedRecords.length} selected records?`)) {
            return;
        }
    
        setIsLoading(true);
        setUploadMessage('');
        try {
            const response = await apiRequest('/corporate-admin/migration/staged/re-validate-multiple', 'POST', { ids: selectedRecords });
            const successCount = response.results.filter(r => r.status === 'success').length;
            const failedCount = response.results.filter(r => r.status === 'failed').length;
            setUploadMessage(`Re-validation complete. ${successCount} records re-validated successfully, ${failedCount} failed.`);
            setIsSuccess(true);
            
            fetchStagedRecords();
            
        } catch (err) {
            setUploadMessage(`Failed to re-validate selected records: ${err.message || 'An unexpected error occurred.'}`);
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRecordDelete = async (recordId) => {
      if (!window.confirm(`Are you sure you want to delete record ${recordId}?`)) {
        return;
      }
      setIsLoading(true);
      try {
        await apiRequest(`/corporate-admin/migration/staged/${recordId}`, 'DELETE');
        setStagedRecords(prevRecords => prevRecords.filter(rec => rec.id !== recordId));
        setUploadMessage(`Record ${recordId} deleted successfully.`);
        setIsSuccess(true);
        setSelectedRecords(prev => prev.filter(id => id !== recordId));
      } catch (err) {
        setUploadMessage(`Failed to delete record ${recordId}: ${err.message || 'An unexpected error occurred.'}`);
        setIsSuccess(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    // NEW: Function to handle bulk deletion of selected records
    const handleDeleteSelected = async () => {
        if (selectedRecords.length === 0) {
            setUploadMessage('No records selected for deletion.');
            setIsSuccess(false);
            return;
        }

        if (!window.confirm(`Are you sure you want to delete the ${selectedRecords.length} selected records?`)) {
            return;
        }

        setIsLoading(true);
        setUploadMessage('');
        try {
            const response = await apiRequest('/corporate-admin/migration/staged/delete-multiple', 'POST', { ids: selectedRecords });
            setUploadMessage(`${response.deleted_count} records were deleted successfully.`);
            setIsSuccess(true);
            fetchStagedRecords();
        } catch (err) {
            setUploadMessage(`Failed to delete selected records: ${err.message || 'An unexpected error occurred.'}`);
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };
    
    // NEW: Function to handle deletion of all staged records
    const handleDeleteAll = async () => {
        if (!window.confirm(`WARNING: This will delete ALL staged records. Are you sure you want to proceed?`)) {
            return;
        }
        
        setIsLoading(true);
        setUploadMessage('');
        try {
            const response = await apiRequest('/corporate-admin/migration/staged/delete-all', 'DELETE');
            setUploadMessage(`All ${response.deleted_count} staged records were deleted successfully.`);
            setIsSuccess(true);
            fetchStagedRecords();
        } catch (err) {
            setUploadMessage(`Failed to delete all staged records: ${err.message || 'An unexpected error occurred.'}`);
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };
    
    // NEW: Function to handle a preview of historical imports
    const handlePreviewHistory = async () => {
        setIsLoading(true);
        setUploadMessage('');
        try {
            const lgNumbers = [...new Set(stagedRecords.map(rec => rec.source_data_json.lg_number))];
            if (lgNumbers.length > 1) {
                // If there are multiple LGs, the backend will return a list. Find the first one with history.
                const allPreviews = await apiRequest('/corporate-admin/migration/preview-history', 'POST');
                const lgWithHistory = allPreviews.find(p => p.snapshots.length > 1);
                if (lgWithHistory) {
                    setPreviewModalData(lgWithHistory);
                    setPreviewModalOpen(true);
                } else {
                    setUploadMessage('No LGs with multiple history snapshots found in staged records.');
                    setIsSuccess(false);
                }
            } else if (lgNumbers.length === 1) {
                 // If only one LG number exists, get its specific preview
                const specificPreview = await apiRequest(`/corporate-admin/migration/preview-history?lg_number=${lgNumbers[0]}`, 'POST');
                if (specificPreview && specificPreview.length > 0) {
                    setPreviewModalData(specificPreview[0]);
                    setPreviewModalOpen(true);
                } else {
                    setUploadMessage('No history snapshots found for this LG number.');
                    setIsSuccess(false);
                }
            } else {
                 setUploadMessage('No LG numbers found in staged records.');
                 setIsSuccess(false);
            }
        } catch (err) {
            setUploadMessage(`Failed to generate history preview: ${err.message || 'An unexpected error occurred.'}`);
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };
    
    // NEW: Function to Run AI Audit
    const handleRunAudit = async () => {
        setAuditReport(null); // Clear previous results
        try {
            await ensureLocalAttachmentsSynced(false);
        } catch (syncErr) {
            console.warn("Folder sync skipped:", syncErr);
        }

        setIsAuditing(true);
        try {
            // Using the centralized apiRequest instead of raw fetch
            const result = await apiRequest('/corporate-admin/migration/staged/audit', 'POST');
            setAuditReport(result);
            await fetchStagedRecords();
            await fetchUploadedAttachments();

            const passedCount = result.audited_passed?.length || 0;
            const discrepancyCount = result.audit_summary?.length || 0;
            const skippedCount = result.skipped_records?.length || 0;

            setUploadMessage(
                result.message ||
                `AI Audit Complete — Audited & Verified: ${passedCount}, Discrepancies: ${discrepancyCount}, Skipped: ${skippedCount}`
            );
            setIsSuccess(discrepancyCount === 0 && passedCount > 0);
        } catch (error) {
            console.error("Audit error:", error);
            alert(`Failed to run AI Audit: ${error.message || 'An unexpected error occurred.'}`);
        } finally {
            setIsAuditing(false);
        }
    };

    const handleDismissAiDiscrepancy = async (recordId, lgNumber, specificIssue = null) => {
        try {
            let targetRecordId = recordId;
            if (!targetRecordId && lgNumber) {
                const matchingRec = stagedRecords.find(
                    r => String(r.source_data_json?.lg_number || '').trim() === String(lgNumber).trim()
                );
                if (matchingRec) targetRecordId = matchingRec.id;
            }
            if (!targetRecordId) return;

            const updatedRec = await apiRequest(
                `/corporate-admin/migration/staged/${targetRecordId}/dismiss-ai-audit`,
                'POST',
                specificIssue ? { issue: specificIssue } : {}
            );

            setStagedRecords(prev => prev.map(r => (r.id === updatedRec.id ? updatedRec : r)));

            setAuditReport(prev => {
                if (!prev) return prev;
                const currentSummary = prev.audit_summary || [];
                const currentPassed = prev.audited_passed || [];
                const updatedSummary = [];
                let newlyPassedItem = null;

                for (const item of currentSummary) {
                    const isMatch = (item.record_id && item.record_id === targetRecordId) ||
                        (lgNumber && String(item.lg_number) === String(lgNumber));
                    if (!isMatch) {
                        updatedSummary.push(item);
                        continue;
                    }
                    if (!specificIssue) {
                        newlyPassedItem = {
                            record_id: targetRecordId,
                            lg_number: item.lg_number,
                            message: 'Reviewed & approved by user',
                        };
                    } else {
                        const remaining = (item.issues || []).filter(iss => iss !== specificIssue);
                        if (remaining.length > 0) {
                            updatedSummary.push({ ...item, issues: remaining });
                        } else {
                            newlyPassedItem = {
                                record_id: targetRecordId,
                                lg_number: item.lg_number,
                                message: 'Reviewed & approved by user',
                            };
                        }
                    }
                }

                return {
                    ...prev,
                    audit_summary: updatedSummary,
                    audited_passed: newlyPassedItem ? [...currentPassed, newlyPassedItem] : currentPassed,
                };
            });
        } catch (err) {
            console.error('Failed to dismiss AI discrepancy:', err);
            alert(`Failed to dismiss AI warning: ${err.message || 'Unexpected error'}`);
        }
    };

    const handleDismissAllAiDiscrepancies = async () => {
        if (!auditReport?.audit_summary?.length) return;
        for (const item of auditReport.audit_summary) {
            await handleDismissAiDiscrepancy(item.record_id, item.lg_number, null);
        }
    };

    // Close the preview modal
    const closePreviewModal = () => {
        setPreviewModalOpen(false);
        setPreviewModalData(null);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'READY_FOR_IMPORT':
                return 'bg-green-100 text-green-800 border-green-300';
            case 'IMPORTED':
                return 'bg-purple-100 text-purple-800 border-purple-300';
            case 'ERROR':
            case 'EXPIRED':
            case 'DUPLICATE':
                return 'bg-red-100 text-red-800 border-red-300';
            default:
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        }
    };
    
    // NEW: Functions to handle selection
    const handleToggleSelect = (recordId) => {
        setSelectedRecords(prev => 
            prev.includes(recordId) ? prev.filter(id => id !== recordId) : [...prev, recordId]
        );
    };

    const handleToggleSelectAll = () => {
        const nonImportedRecords = stagedRecords.filter(record => record.record_status !== 'IMPORTED');
        if (selectedRecords.length === nonImportedRecords.length) {
            setSelectedRecords([]);
        } else {
            const allNonImportedIds = nonImportedRecords.map(record => record.id);
            setSelectedRecords(allNonImportedIds);
        }
    };
    
    const hasReadyRecords = stagedRecords.some(rec => rec.record_status === 'READY_FOR_IMPORT') ||
        stagedRecords.some(rec =>
            ['READY_FOR_IMPORT', 'EXPIRED', 'DUPLICATE', 'IMPORTED', 'ERROR'].includes(rec.record_status) &&
            rec.source_data_json?.lg_number &&
            stagedRecords.filter(r => r.source_data_json?.lg_number === rec.source_data_json.lg_number).length > 1
        );
    const hasImportedOrStagedRecords = stagedRecords.length > 0 || (reportSummary?.summary_by_status?.IMPORTED > 0);
    const hasUnprocessedRecords = stagedRecords.some(rec => rec.record_status === 'PENDING' || rec.record_status === 'ERROR');

    // Pagination calculation
    const totalStagedCount = stagedRecords.length;
    const effectivePageSize = pageSize === 'ALL' ? Math.max(1, totalStagedCount) : Number(pageSize) || 100;
    const totalPages = pageSize === 'ALL' ? 1 : Math.max(1, Math.ceil(totalStagedCount / effectivePageSize));
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
    const startIndex = pageSize === 'ALL' ? 0 : (safeCurrentPage - 1) * effectivePageSize;
    const endIndex = pageSize === 'ALL' ? totalStagedCount : Math.min(totalStagedCount, startIndex + effectivePageSize);
    const paginatedStagedRecords = pageSize === 'ALL' ? stagedRecords : stagedRecords.slice(startIndex, endIndex);

    const inputClassNames = "mt-1 block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none";


    return (
        <div className="bg-white p-6 md:p-4 rounded-xl shadow-2xl max-w-full mx-auto my-6 font-sans overflow-x-auto">
            <input
                type="file"
                ref={folderInputRef}
                onChange={handleFolderInputSelected}
                webkitdirectory="true"
                directory="true"
                multiple
                className="hidden"
            />
            {previewModalOpen && <HistoryPreviewModal lgHistory={previewModalData} onClose={closePreviewModal} />}
            {isAddOwnerModalOpen && (
                <InternalOwnerFormModal
                    owner={null}
                    onClose={() => setIsAddOwnerModalOpen(false)}
                    onSuccess={() => {
                        setIsAddOwnerModalOpen(false);
                        fetchInternalOwners();
                    }}
                    isGracePeriod={false}
                />
            )}

            {uploadMessage && (
                <div className={`p-4 mb-4 text-sm rounded-lg border-l-4 ${isSuccess ? 'bg-green-100 text-green-700 border-green-500' : 'bg-red-100 text-red-700 border-red-500'}`} role="alert">
                    <div className="flex items-center space-x-3">
                        {isSuccess ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <XCircle className="h-5 w-5 flex-shrink-0" />}
                        <span className="font-medium">{uploadMessage}</span>
                    </div>
                </div>
            )}
            
            {/* NEW: Reporting Section */}
            <div className="mt-3 p-3 bg-white rounded-xl border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-1 flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-gray-600" />
                    <span>Migration Report & Batches</span>
                </h3>
                {reportSummary ? (
                <div className="flex flex-wrap gap-3 mb-6">
                    <StatusTile 
                        label="Total Staged" 
                        count={reportSummary.total_staged_records} 
                        colorClass="bg-gray-50 text-gray-700 border-gray-200" 
                        icon={Layers} 
                    />
                    <StatusTile 
                        label="Imported" 
                        count={reportSummary.summary_by_status.IMPORTED} 
                        colorClass="bg-green-50 text-green-700 border-green-200" 
                        icon={CheckCircle} 
                    />
                    <StatusTile 
                        label="Ready" 
                        count={reportSummary.summary_by_status.READY_FOR_IMPORT} 
                        colorClass="bg-emerald-50 text-emerald-700 border-emerald-200" 
                        icon={ShieldCheck} 
                    />
                    <StatusTile 
                        label="Pending" 
                        count={reportSummary.summary_by_status.PENDING} 
                        colorClass="bg-amber-50 text-amber-700 border-amber-200" 
                        icon={Loader2} 
                    />
                    <StatusTile 
                        label="Errors" 
                        count={reportSummary.summary_by_status.ERROR} 
                        colorClass="bg-red-50 text-red-700 border-red-200" 
                        icon={XCircle} 
                    />
                    <StatusTile 
                        label="Expired" 
                        count={reportSummary.summary_by_status.EXPIRED} 
                        colorClass="bg-orange-50 text-orange-700 border-orange-200" 
                        icon={CalendarX} 
                    />
                    <StatusTile 
                        label="Duplicates" 
                        count={reportSummary.summary_by_status.DUPLICATE} 
                        colorClass="bg-purple-50 text-purple-700 border-purple-200" 
                        icon={Copy} 
                    />
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl border border-dashed">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                    <p className="text-sm text-gray-500">Loading report statistics...</p>
                </div>
            )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-8 mt-4">
                {/* Combined Data Intake Section */}
                <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center space-x-2">
                        <Upload className="w-5 h-5 text-gray-600" />
                        <span>Upload or Enter a Record</span>
                    </h3>
                    <div className="space-y-4">
                         {/* NEW: Radio buttons for migration type */}
                        <div className="flex space-x-4 mb-4 items-center">
                            <label className="text-sm font-medium text-gray-700">Migration Type:</label>
                            <div className="flex space-x-4">
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        name="migrationType"
                                        value="RECORD"
                                        checked={migrationType === 'RECORD'}
                                        onChange={(e) => setMigrationType(e.target.value)}
                                        className="form-radio text-blue-600"
                                    />
                                    <span className="text-sm text-gray-800">New LG Records</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        name="migrationType"
                                        value="INSTRUCTION"
                                        checked={migrationType === 'INSTRUCTION'}
                                        onChange={(e) => setMigrationType(e.target.value)}
                                        className="form-radio text-blue-600"
                                    />
                                    <span className="text-sm text-gray-800">LG Instructions (Amendments)</span>
                                </label>
                            </div>
                        </div>
                         {/* File Upload Form */}
                        <div className="flex flex-col">
                            <label className="mb-2 text-sm font-medium text-gray-700">Select File (.json, .csv, .xlsx)</label>
                            <input
                                type="file"
                                onChange={handleFileChange}
                                className={inputClassNames}
                                accept=".json,.csv,.xlsx"
                                disabled={isLoading}
                            />
                            {selectedFile && <p className="mt-2 text-xs text-gray-500 truncate">Selected: <span className="font-medium">{selectedFile.name}</span></p>}
                        </div>
                        <div className="border-t border-gray-200 my-4 text-center text-gray-400 text-sm">OR</div>
                         {/* Manual Entry Form */}
                        <div className="flex flex-col">
                            <label className="mb-2 text-sm font-medium text-gray-700">Enter a single LG record (JSON format)</label>
                            <textarea
                                rows="4"
                                value={manualEntryData}
                                onChange={handleManualEntryChange}
                                placeholder='Example: {"lg_number": "LG123", "lg_amount": 1000, "lg_currency_id": 1, "expiry_date": "2025-12-31", ...}'
                                className="mt-1 block w-full p-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                disabled={isLoading}
                            ></textarea>
                        </div>
                    </div>
                    <button
                        onClick={handleIntake}
                        disabled={isLoading || (!selectedFile && !manualEntryData)}
                        className={`mt-4 w-full flex items-center justify-center px-6 py-3 text-sm font-medium rounded-lg shadow-md transition-all duration-200 ${
                            isLoading || (!selectedFile && !manualEntryData)
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
                        }`}
                    >
                        {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        Stage Records
                    </button>
                </div>

                {/* Processing and Import Actions */}
                <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center space-x-2">
                             <CloudUpload className="w-5 h-5 text-gray-600" />
                            <span>Finalize Migration</span>
                        </h3>
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                               Once records are ready, finalize the migration by importing them into the main system. This is an irreversible action.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col space-y-4 mt-auto">
                        <button
                            onClick={handleFinalizeMigration}
                            disabled={isLoading || !hasReadyRecords}
                            className={`w-full flex items-center justify-center px-6 py-3 text-sm font-medium rounded-lg shadow-md transition-all duration-200 ${
                                isLoading || !hasReadyRecords
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg'
                            }`}
                        >
                            {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            <CloudUpload className="mr-2 h-5 w-5 animate-pulse" />
                            Finalize Migration & Import
                        </button>
                        {hasImportedOrStagedRecords && (
                            <button
                                type="button"
                                onClick={handleResetMigrated}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center px-6 py-2.5 text-sm font-medium rounded-lg shadow-sm transition-all duration-200 bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100"
                                title="Purge previously migrated LG records from production and reset staged rows to Ready for a clean import"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Reset &amp; Clean Migrated LGs
                            </button>
                        )}
                        <button
                            onClick={handlePreviewHistory}
                            disabled={isLoading}
                            className={`w-full flex items-center justify-center px-6 py-3 text-sm font-medium rounded-lg shadow-md transition-all duration-200 ${
                                isLoading
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg'
                            }`}
                        >
                            {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            <History className="w-4 h-4 mr-2" />
                            Preview Historical Import
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsAddOwnerModalOpen(true)}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center px-6 py-3 text-sm font-medium rounded-lg shadow-md transition-all duration-200 bg-teal-600 text-white hover:bg-teal-700 hover:shadow-lg"
                        >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add New Internal Owner ({internalOwners.length} Existing)
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200">
                 <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                    <Eye className="w-5 h-5 text-gray-600" />
                    <span>View Staged Records</span>
                 </h3>
                 <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mb-8">
                     {/* NEW: Filters Section */}
                     <div className="flex space-x-4 w-full md:w-auto">
                        <select 
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full md:w-36 text-sm p-2  px-4 py-2 border border-gray-300 rounded-lg"
                        >
                            <option value="">All Statuses</option>
                            <option value="PENDING">PENDING</option>
                            <option value="ERROR">ERROR</option>
                            <option value="READY_FOR_IMPORT">READY_FOR_IMPORT</option>
                            <option value="IMPORTED">IMPORTED</option>
                            <option value="EXPIRED">EXPIRED</option>
                            <option value="DUPLICATE">DUPLICATE</option>
                        </select>
                        {/* NEW: Input for File Name filter */}
                        <input
                            type="text"
                            placeholder="Filter by File Name"
                            value={filterFileName}
                            onChange={(e) => setFilterFileName(e.target.value)}
                            className="w-full md:w-36 text-sm p-2  px-4 py-3 border border-gray-300 rounded-lg"
                        />
                        <input
                            type="text"
                            placeholder="Filter by LG Number"
                            value={filterLGNumber}
                            onChange={(e) => setFilterLGNumber(e.target.value)}
                            className="w-full md:w-36 text-sm p-2  px-4 py-3 border border-gray-300 rounded-lg"
                        />
                     </div>
                    <button
                        onClick={fetchStagedRecords}
                        disabled={isLoading}
                        className={`w-full md:w-auto flex items-center justify-center px-6 py-3 text-sm font-medium rounded-lg shadow-md transition-all duration-200 ${
                            isLoading
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-600 text-white hover:bg-gray-700 hover:shadow-lg'
                        }`}
                    >
                        {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
						View All Staged Records
                    </button>
                 {/* NEW: Bulk Action Buttons */}
                 <div className="flex space-x-4 mb-4">
                     <button
                         onClick={handleRevalidateSelected}
                         disabled={selectedRecords.length === 0 || isLoading}
                         className={`flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg shadow-md transition-all duration-200 ${
                             selectedRecords.length === 0 || isLoading
                                 ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                 : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg'
                         }`}
                     >
                         <RotateCcw className="w-6 h-4 mr-2" />
                         Re-Validate Selected ({selectedRecords.length})
                     </button>
                     <button
                         onClick={handleDeleteSelected}
                         disabled={selectedRecords.length === 0 || isLoading}
                         className={`flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg shadow-md transition-all duration-200 ${
                             selectedRecords.length === 0 || isLoading
                                 ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                 : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg'
                         }`}
                     >
                         <Trash2 className="w-6 h-4 mr-2" />
                         Delete Selected ({selectedRecords.length})
                     </button>
                     {/* --- AI AUDIT BUTTON --- */}
                     <button
                        onClick={handleRunAudit}
                        disabled={isAuditing || stagedRecords.length === 0}
                        className={`flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg shadow-md transition-all duration-200 ${
                            isAuditing || stagedRecords.length === 0
                                ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed'
                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                        }`}
                    >
                        {isAuditing ? (
                            <Loader2 className="w-6 h-4 animate-spin mr-2" />
                        ) : (
                            <ShieldCheck className="w-6 h-4 mr-2" />
                        )}
                        {isAuditing ? 'Scanning Docs...' : 'Run AI Audit'}
                    </button>
                 </div>
                 </div>
            </div>
            
            {/* --- AI AUDIT RESULTS SECTION --- */}
            {auditReport && (
                <div className="mb-6 p-5 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-indigo-600" />
                            <h3 className="font-bold text-gray-800 text-base">AI Document Audit Summary</h3>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 border border-green-200">
                                ✓ Audited & Verified: {auditReport.audited_passed?.length || 0}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 border border-red-200">
                                ✕ Discrepancies: {auditReport.audit_summary?.length || 0}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                ⚠ Skipped: {auditReport.skipped_records?.length || 0}
                            </span>
                        </div>
                    </div>

                    {/* 1. Audited & Passed */}
                    {auditReport.audited_passed && auditReport.audited_passed.length > 0 && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-1.5">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <h4 className="font-bold text-green-800 text-sm">
                                    Audited & Verified ({auditReport.audited_passed.length})
                                </h4>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {auditReport.audited_passed.map((item, idx) => (
                                    <span key={idx} className="px-2.5 py-1 bg-white border border-green-200 rounded text-xs text-green-800 font-medium shadow-sm">
                                        {item.lg_number} <span className="text-gray-400">({item.files_checked?.join(', ')})</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 2. Discrepancies Found */}
                    {auditReport.audit_summary && auditReport.audit_summary.length > 0 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-600" />
                                    <h4 className="font-bold text-red-800 text-sm">
                                        Discrepancies Found ({auditReport.audit_summary.length})
                                    </h4>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDismissAllAiDiscrepancies}
                                    className="px-3 py-1 bg-white text-green-700 border border-green-300 rounded text-xs font-semibold hover:bg-green-50 transition-colors shadow-sm"
                                    title="Skip all AI discrepancy notes and mark these records as approved"
                                >
                                    ✓ Skip All & Approve All ({auditReport.audit_summary.length})
                                </button>
                            </div>
                            <p className="text-xs text-red-700 mb-2">
                                If you have verified that your Excel data is accurate (for example, when a bank updated the LG number format), you can skip individual notes or approve the record.
                            </p>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {auditReport.audit_summary.map((item, idx) => (
                                    <div key={idx} className="bg-white p-3 rounded border border-red-100 text-xs shadow-sm">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className="font-bold text-gray-800">
                                                {item.lg_number} {item.files_checked ? `(${item.files_checked.join(', ')})` : ''}:
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleDismissAiDiscrepancy(item.record_id, item.lg_number, null)}
                                                className="px-2.5 py-0.5 bg-green-50 text-green-700 border border-green-300 rounded text-[11px] font-semibold hover:bg-green-100 transition-colors"
                                            >
                                                ✓ Ignore All & Approve LG
                                            </button>
                                        </div>
                                        <ul className="ml-1 mt-1 text-red-700 space-y-1">
                                            {item.issues.map((issue, i) => (
                                                <li key={i} className="flex items-center justify-between gap-2 py-0.5 border-b border-gray-50 last:border-0">
                                                    <span>• {issue}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDismissAiDiscrepancy(item.record_id, item.lg_number, issue)}
                                                        className="px-2 py-0.5 text-[10px] font-semibold text-gray-600 bg-gray-100 hover:bg-green-100 hover:text-green-800 rounded transition-colors shrink-0"
                                                        title="Skip this specific AI note"
                                                    >
                                                        Skip Note
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 3. Skipped Records */}
                    {auditReport.skipped_records && auditReport.skipped_records.length > 0 && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-600" />
                                    <h4 className="font-bold text-amber-800 text-sm">
                                        Skipped — Not Audited ({auditReport.skipped_records.length})
                                    </h4>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => ensureLocalAttachmentsSynced(true)}
                                    className="px-3 py-1 bg-amber-600 text-white rounded text-xs font-semibold hover:bg-amber-700 transition-colors"
                                >
                                    Locate Local Folder
                                </button>
                            </div>
                            <p className="text-xs text-amber-700 mb-2">
                                These records were not audited because their local PDF files have not been read from your computer yet or no attachment path was provided.
                            </p>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2">
                                {auditReport.skipped_records.map((item, idx) => (
                                    <div key={idx} className="bg-white px-3 py-2 rounded border border-amber-100 text-xs flex justify-between items-center">
                                        <span className="font-bold text-gray-800">{item.lg_number}</span>
                                        <span className="text-amber-700 font-medium">{item.reason}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {stagedRecords.length > 0 && (
                <div className="mt-8 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-800">Staged Records</h3>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                                Showing {totalStagedCount === 0 ? 0 : startIndex + 1}–{endIndex} of {totalStagedCount}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5 text-xs text-gray-700">
                                <span className="font-medium">Rows per page:</span>
                                {[50, 100, 250, 500, 'ALL'].map((sizeOpt) => {
                                    const isActive = String(pageSize) === String(sizeOpt);
                                    return (
                                        <button
                                            key={sizeOpt}
                                            type="button"
                                            onClick={() => {
                                                setPageSize(sizeOpt);
                                                setCurrentPage(1);
                                            }}
                                            className={`px-2.5 py-1 rounded-md font-semibold border transition-colors ${
                                                isActive
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                            }`}
                                        >
                                            {sizeOpt === 'ALL' ? `All (${totalStagedCount})` : sizeOpt}
                                        </button>
                                    );
                                })}
                            </div>
                            {pageSize !== 'ALL' && totalPages > 1 && (
                                <div className="flex items-center gap-1 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(1)}
                                        disabled={safeCurrentPage <= 1}
                                        className="px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        « First
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={safeCurrentPage <= 1}
                                        className="px-2.5 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        ‹ Prev
                                    </button>
                                    <span className="px-2.5 py-1 font-semibold text-gray-800">
                                        Page {safeCurrentPage} of {totalPages}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={safeCurrentPage >= totalPages}
                                        className="px-2.5 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Next ›
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={safeCurrentPage >= totalPages}
                                        className="px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Last »
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
					<StagedRecordsTable 
						records={paginatedStagedRecords} 
						getStatusColor={getStatusColor}
						onRecordUpdate={handleRecordUpdate}
						onRecordDelete={handleRecordDelete}
						selectedRecords={selectedRecords}
						onToggleSelect={handleToggleSelect}
						onToggleSelectAll={handleToggleSelectAll} // <-- Corrected this line
                        currencies={currencies}
                        getCurrencyCodeById={getCurrencyCodeById}
                        lgTypes={lgTypes}
                        getLgTypeNameById={getLgTypeNameById}
                        issuingMethods={issuingMethods}
                        getIssuingMethodNameById={getIssuingMethodNameById}
                        rules={rules}
                        getRuleNameById={getRuleNameById}
                        banks={banks}
                        getBankNameById={getBankNameById}
                        entities={entities}
                        getEntityNameById={getEntityNameById}
                        lgCategories={lgCategories}
                        getLgCategoryNameById={getLgCategoryNameById}
                        lgOperationalStatuses={lgOperationalStatuses}
                        getLgOperationalStatusNameById={getLgOperationalStatusNameById}
                        internalOwners={internalOwners}
                        uploadedAttachments={uploadedAttachments}
                        onLocateFolder={() => ensureLocalAttachmentsSynced(true)}
                        onDismissAi={handleDismissAiDiscrepancy}
					/>
                    {pageSize !== 'ALL' && totalPages > 1 && (
                        <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-700">
                            <span>
                                Showing {startIndex + 1}–{endIndex} of {totalStagedCount} staged records
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage(1)}
                                    disabled={safeCurrentPage <= 1}
                                    className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40"
                                >
                                    « First
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={safeCurrentPage <= 1}
                                    className="px-2.5 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40"
                                >
                                    ‹ Prev
                                </button>
                                <span className="px-2.5 py-1 font-semibold">
                                    Page {safeCurrentPage} of {totalPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={safeCurrentPage >= totalPages}
                                    className="px-2.5 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40"
                                >
                                    Next ›
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={safeCurrentPage >= totalPages}
                                    className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40"
                                >
                                    Last »
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default MigrationUploadPage;