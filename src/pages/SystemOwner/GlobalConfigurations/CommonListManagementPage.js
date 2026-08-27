import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { apiRequest } from 'services/apiService.js';
import { 
  PlusCircle, 
  Edit2, 
  Trash2, 
  RotateCcw, 
  Loader2, 
  Search, 
  Building2, 
  Globe, 
  Mail, 
  CheckCircle2, 
  XCircle,
  X,
  Sparkles
} from 'lucide-react';
import { toast } from 'react-toastify';

// Common input field styling classes
const inputClassNames = "block w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900";
const labelClassNames = "block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5";

// Custom Toggle Switch Component
const ToggleSwitch = ({ id, name, checked, onChange, label }) => (
  <label htmlFor={id} className="relative inline-flex items-center cursor-pointer my-1">
    <input
      type="checkbox"
      name={name}
      id={id}
      checked={checked}
      onChange={onChange}
      className="sr-only peer"
    />
    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
    <span className="ml-2.5 text-xs font-semibold text-slate-800">{label}</span>
  </label>
);

// System / internal fields to ignore in automatic dynamic column discovery
const SYSTEM_IGNORED_FIELDS = [
  'id', 'created_at', 'updated_at', 'deleted_at', 'is_deleted',
  'password', 'hashed_password', 'customer_id'
];

// Helper to format field name to human-readable label
const formatFieldLabel = (field) => {
  const customLabels = {
    name: 'Name',
    short_name: 'Short Name',
    swift_code: 'SWIFT / BIC Code',
    email_domain: 'Bank Email Domain',
    phone_number: 'Phone Number',
    fax: 'Fax Number',
    address: 'Address / Headquarters',
    former_names: 'Former Names (Aliases)',
    iso_code: 'ISO Code',
    symbol: 'Currency Symbol',
    description: 'Description',
    is_mandatory: 'Mandatory',
    is_active: 'Active',
    is_global: 'Universal Global',
    is_default: 'Default Option'
  };
  if (customLabels[field]) return customLabels[field];
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
};

// Helper to get helpful placeholder text per field
const getFieldPlaceholder = (field) => {
  switch (field) {
    case 'email_domain':
      return 'e.g. cibeg.com or nbe.com.eg (auto-identifies bank emails)';
    case 'swift_code':
      return 'e.g. CIBEEGCX';
    case 'short_name':
      return 'e.g. CIB, NBE, QNB';
    case 'phone_number':
      return 'e.g. +20 2 2738 5000';
    case 'fax':
      return 'e.g. +20 2 2738 5001';
    case 'former_names':
    case 'communication_list':
      return 'Comma-separated values (e.g. Chase National Bank, CIB Egypt)';
    case 'address':
      return 'Head office or central branch location...';
    case 'iso_code':
      return 'e.g. USD, EGP, EUR, SAR';
    case 'symbol':
      return 'e.g. $, E£, €, SR';
    case 'description':
      return 'Detailed operational description...';
    default:
      return `Enter ${formatFieldLabel(field).toLowerCase()}...`;
  }
};

/**
 * Universal Common List Management Page for System Owner
 * Dynamically discovers and renders all DB fields (including newly added columns like email_domain)
 */
function CommonListManagementPage({ onLogout }) {
  const { listType } = useParams();

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [formMode, setFormMode] = useState(null); // 'add' | 'edit' | null
  const [formData, setFormData] = useState({});
  const [editingItemId, setEditingItemId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  // Predefined configuration fallback per listType
  const getListConfig = (type) => {
    switch (type) {
      case 'currencies': return {
        endpoint: '/system-owner/currencies',
        title: 'Currencies',
        fields: ['name', 'iso_code', 'symbol'],
        uniqueField: 'iso_code',
        icon: Globe
      };
      case 'lg-types': return {
        endpoint: '/system-owner/lg-types',
        title: 'LG Types',
        fields: ['name', 'description'],
        uniqueField: 'name',
        icon: Building2
      };
      case 'rules': return {
        endpoint: '/system-owner/rules',
        title: 'Rules',
        fields: ['name', 'description'],
        uniqueField: 'name',
        icon: Sparkles
      };
      case 'issuing-methods': return {
        endpoint: '/system-owner/issuing-methods',
        title: 'Issuing Methods',
        fields: ['name', 'description'],
        uniqueField: 'name',
        icon: Building2
      };
      case 'lg-statuses': return {
        endpoint: '/system-owner/lg-statuses',
        title: 'LG Statuses',
        fields: ['name', 'description'],
        uniqueField: 'name',
        icon: CheckCircle2
      };
      case 'lg-operational-statuses': return {
        endpoint: '/system-owner/lg-operational-statuses',
        title: 'LG Operational Statuses',
        fields: ['name', 'description'],
        uniqueField: 'name',
        icon: CheckCircle2
      };
      case 'banks': return {
        endpoint: '/system-owner/banks',
        title: 'Banks',
        fields: ['name', 'short_name', 'swift_code', 'email_domain', 'phone_number', 'fax', 'address', 'former_names'],
        uniqueField: 'name',
        icon: Building2
      };
      case 'templates':
        return {
          endpoint: '/system-owner/templates',
          title: 'Templates',
          fields: [],
          uniqueField: 'name',
          icon: Globe
        };
      default: return { endpoint: '', title: 'Unknown List', fields: [], icon: Building2 };
    }
  };

  const currentListConfig = getListConfig(listType);

  // Helper for singular name in action buttons
  const getSingularName = (pluralName) => {
    if (pluralName.endsWith('ies')) return pluralName.slice(0, -3) + 'y';
    if (pluralName.endsWith('es')) return pluralName.slice(0, -2);
    if (pluralName.endsWith('s') && pluralName.length > 1) return pluralName.slice(0, -1);
    return pluralName;
  };

  const singularListName = getSingularName(currentListConfig.title);

  // Fetch list items from the backend API
  const fetchItems = async () => {
    if (!currentListConfig.endpoint) {
      setError(`Invalid list type "${listType}". Please check the URL.`);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await apiRequest(currentListConfig.endpoint, 'GET');
      setItems(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error(`Failed to fetch ${listType}:`, err);
      setError(`Failed to load ${currentListConfig.title}. ${err.message || 'An unexpected error occurred.'}`);
      toast.error(`Failed to load ${currentListConfig.title}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (listType === 'templates') {
      setIsLoading(false);
      return;
    }
    setFormMode(null);
    setFormData({});
    setEditingItemId(null);
    setSearchTerm('');
    fetchItems();
  }, [listType]);

  // Dynamic field list: merges configured fields with any new columns returned by the API
  const effectiveFields = useMemo(() => {
    const baseFields = currentListConfig.fields || [];
    const fieldSet = new Set(baseFields);

    if (Array.isArray(items)) {
      items.forEach(item => {
        if (item && typeof item === 'object') {
          Object.keys(item).forEach(key => {
            if (!SYSTEM_IGNORED_FIELDS.includes(key) && !key.startsWith('_')) {
              fieldSet.add(key);
            }
          });
        }
      });
    }

    if (formData && typeof formData === 'object') {
      Object.keys(formData).forEach(key => {
        if (!SYSTEM_IGNORED_FIELDS.includes(key) && !key.startsWith('_')) {
          fieldSet.add(key);
        }
      });
    }

    return Array.from(fieldSet);
  }, [currentListConfig.fields, items, formData]);

  // Dynamic search and filter
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Deleted filter
      if (!showDeleted && item.is_deleted) return false;
      if (showDeleted && !item.is_deleted) return false;

      // Text search across all fields
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();

      return effectiveFields.some(field => {
        const val = item[field];
        if (val === null || val === undefined) return false;
        if (Array.isArray(val)) {
          return val.some(v => String(v).toLowerCase().includes(term));
        }
        return String(val).toLowerCase().includes(term);
      });
    });
  }, [items, showDeleted, searchTerm, effectiveFields]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prevData) => {
      if (type === 'checkbox') {
        return { ...prevData, [name]: checked };
      }
      
      if (name === 'communication_list' || name === 'former_names') {
        return { 
          ...prevData, 
          [name]: value.split(',').map(item => item.trim()).filter(item => item !== '') 
        };
      }

      // Auto-clean email domain if pasted with @ or http
      if (name === 'email_domain') {
        const cleaned = value.trim().replace(/^@+/, '').replace(/^https?:\/\//, '');
        return { ...prevData, [name]: cleaned };
      }
      
      return { ...prevData, [name]: value };
    });
  };

  // Handle form submission (Add / Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    const payload = { ...formData };
    
    effectiveFields.forEach(field => {
      if (['is_mandatory', 'is_active', 'is_global'].includes(field) || field.startsWith('is_')) {
        if (payload[field] === undefined) {
          payload[field] = false;
        }
      }
    });

    if (payload.communication_list && payload.communication_list.length === 0) {
      payload.communication_list = null;
    }
    if (payload.former_names && payload.former_names.length === 0) {
      payload.former_names = null;
    }
    if (payload.email_domain) {
      payload.email_domain = payload.email_domain.trim().replace(/^@+/, '').replace(/^https?:\/\//, '');
    }

    try {
      if (formMode === 'add') {
        await apiRequest(currentListConfig.endpoint, 'POST', payload);
        toast.success(`${singularListName} created successfully!`);
      } else if (formMode === 'edit') {
        await apiRequest(`${currentListConfig.endpoint}/${editingItemId}`, 'PUT', payload);
        toast.success(`${singularListName} updated successfully!`);
      }
      setFormMode(null);
      setFormData({});
      setEditingItemId(null);
      fetchItems();
    } catch (err) {
      console.error(`Error saving ${listType}:`, err);
      const msg = err.message || 'An unexpected error occurred.';
      setError(`Error saving ${currentListConfig.title}: ${msg}`);
      toast.error(`Save failed: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Soft Delete
  const handleDelete = async (itemId, itemName) => {
    if (window.confirm(`Are you sure you want to soft-delete "${itemName}"?`)) {
      try {
        setIsLoading(true);
        await apiRequest(`${currentListConfig.endpoint}/${itemId}`, 'DELETE');
        toast.success(`"${itemName}" soft-deleted successfully.`);
        fetchItems();
      } catch (err) {
        console.error(`Failed to soft-delete ${listType}:`, err);
        toast.error(`Failed to soft-delete: ${err.message || 'Error'}`);
        setIsLoading(false);
      }
    }
  };

  // Handle Restore
  const handleRestore = async (itemId, itemName) => {
    if (window.confirm(`Are you sure you want to restore "${itemName}"?`)) {
      try {
        setIsLoading(true);
        await apiRequest(`${currentListConfig.endpoint}/${itemId}/restore`, 'POST');
        toast.success(`"${itemName}" restored successfully.`);
        fetchItems();
      } catch (err) {
        console.error(`Failed to restore ${listType}:`, err);
        toast.error(`Failed to restore: ${err.message || 'Error'}`);
        setIsLoading(false);
      }
    }
  };

  // Enter edit mode
  const handleEditClick = (item) => {
    setFormMode('edit');
    setEditingItemId(item.id);
    const transformedData = { ...item };
    if (item.communication_list && Array.isArray(item.communication_list)) {
      transformedData.communication_list = item.communication_list.join(', ');
    }
    if (item.former_names && Array.isArray(item.former_names)) {
      transformedData.former_names = item.former_names.join(', ');
    }
    setFormData(transformedData);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Templates exception view
  if (listType === 'templates') {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Templates Management</h2>
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 p-4 rounded-xl text-sm">
          <p className="font-bold">Dedicated Template Editor</p>
          <p className="mt-1">Template management is handled via the dedicated Template Management interface.</p>
        </div>
      </div>
    );
  }

  // Unknown list type view
  if (!currentListConfig.endpoint) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-red-200 shadow-sm">
        <h2 className="text-xl font-bold text-red-600 mb-2">Unknown List Type</h2>
        <p className="text-slate-600 text-sm">The requested list type "{listType}" is not recognized.</p>
      </div>
    );
  }

  const activeCount = items.filter(i => !i.is_deleted).length;
  const deletedCount = items.filter(i => i.is_deleted).length;

  return (
    <div className="space-y-4 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {currentListConfig.title} Records
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {activeCount} Active
              </span>
              {deletedCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  {deletedCount} Deleted
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              System-wide master configuration table with dynamic column discovery and counterparty registry.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              if (formMode === 'add') {
                setFormMode(null);
                setFormData({});
              } else {
                setFormMode('add');
                setFormData({});
                setEditingItemId(null);
                setError('');
              }
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            {formMode === 'add' ? (
              <>
                <X className="w-4 h-4" /> Close Form
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" /> Add New {singularListName}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add / Edit Form Card */}
      {(formMode === 'add' || formMode === 'edit') && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 shadow-md animate-fadeIn">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {formMode === 'add' ? `Register New ${singularListName}` : `Update ${singularListName} (#${editingItemId})`}
              </h3>
            </div>
            <button
              onClick={() => { setFormMode(null); setFormData({}); setError(''); }}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {effectiveFields.map((field) => {
                const isDescriptionOrAddress = ['description', 'address', 'notes', 'content'].includes(field);
                const isArrayField = ['communication_list', 'former_names', 'tags'].includes(field);
                const isBooleanField = ['is_mandatory', 'is_active', 'is_global', 'is_default'].includes(field) || field.startsWith('is_');
                const isEmailDomain = field === 'email_domain';
                const isSwift = field === 'swift_code' || field === 'swift';

                if (isBooleanField) {
                  return (
                    <div key={field} className="md:col-span-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <ToggleSwitch
                        id={field}
                        name={field}
                        checked={formData[field] || false}
                        onChange={handleChange}
                        label={formatFieldLabel(field)}
                      />
                    </div>
                  );
                }

                if (isDescriptionOrAddress || isArrayField) {
                  return (
                    <div key={field} className="md:col-span-2">
                      <label htmlFor={field} className={labelClassNames}>
                        {formatFieldLabel(field)}
                        {field === currentListConfig.uniqueField && <span className="text-rose-500 ml-1">*</span>}
                      </label>
                      <textarea
                        name={field}
                        id={field}
                        rows={isDescriptionOrAddress ? 2 : 2}
                        value={Array.isArray(formData[field]) ? formData[field].join(', ') : (formData[field] || '')}
                        onChange={handleChange}
                        placeholder={getFieldPlaceholder(field)}
                        className={inputClassNames}
                      />
                      {isArrayField && (
                        <p className="text-[11px] text-slate-400 mt-1">Separate multiple entries with commas.</p>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={field} className={isEmailDomain ? 'md:col-span-1' : 'md:col-span-1'}>
                    <label htmlFor={field} className={labelClassNames}>
                      {formatFieldLabel(field)}
                      {(field === currentListConfig.uniqueField || field === 'name') && (
                        <span className="text-rose-500 ml-1">*</span>
                      )}
                    </label>
                    <div className="relative">
                      {isEmailDomain && (
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-500 font-mono font-bold text-sm">
                          @
                        </span>
                      )}
                      <input
                        type="text"
                        name={field}
                        id={field}
                        value={formData[field] || ''}
                        onChange={handleChange}
                        required={field === currentListConfig.uniqueField || field === 'name'}
                        readOnly={formMode === 'edit' && field === currentListConfig.uniqueField && field !== 'name'}
                        placeholder={getFieldPlaceholder(field)}
                        className={`${inputClassNames} ${isEmailDomain ? 'pl-8 font-mono' : ''} ${isSwift ? 'uppercase font-mono font-bold' : ''}`}
                      />
                    </div>
                    {isEmailDomain && (
                      <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                        Domain suffix used to match inbound bank emails (e.g., <code className="bg-indigo-50 px-1 py-0.5 rounded">cibeg.com</code>)
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => { setFormMode(null); setFormData({}); setError(''); }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {formMode === 'add' ? `Save New ${singularListName}` : `Update ${singularListName}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${currentListConfig.title.toLowerCase()} (name, domain, SWIFT)...`}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
          <button
            onClick={() => setShowDeleted(false)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              !showDeleted 
                ? 'bg-indigo-600 text-white shadow-2xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setShowDeleted(true)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              showDeleted 
                ? 'bg-rose-600 text-white shadow-2xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Deleted ({deletedCount})
          </button>
        </div>
      </div>

      {/* Table Section */}
      {isLoading ? (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs text-center space-y-3">
          <Loader2 className="w-7 h-7 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Loading {currentListConfig.title} database records...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs text-center space-y-2">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {searchTerm ? `No records matching "${searchTerm}"` : `No ${showDeleted ? 'deleted' : 'active'} ${currentListConfig.title.toLowerCase()} found`}
          </p>
          <p className="text-xs text-slate-400">
            {searchTerm ? 'Try clearing your search query' : 'Click "Add New" above to create your first entry.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {effectiveFields.map((field) => (
                    <th key={field} className="py-3 px-4 whitespace-nowrap">
                      {formatFieldLabel(field)}
                    </th>
                  ))}
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium text-slate-700 dark:text-slate-300">
                {filteredItems.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors ${
                      item.is_deleted ? 'bg-rose-50/30 dark:bg-rose-950/20 opacity-75' : ''
                    }`}
                  >
                    {effectiveFields.map((field) => {
                      const val = item[field];

                      // Special field renderers
                      if (field === 'email_domain') {
                        return (
                          <td key={field} className="py-3 px-4 whitespace-nowrap">
                            {val ? (
                              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md">
                                <span className="text-indigo-400 font-normal">@</span>{val}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>
                        );
                      }

                      if (field === 'swift_code' || field === 'swift') {
                        return (
                          <td key={field} className="py-3 px-4 whitespace-nowrap">
                            {val ? (
                              <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-[11px]">
                                {val}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>
                        );
                      }

                      if (field === 'name') {
                        return (
                          <td key={field} className="py-3 px-4 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                            {val}
                          </td>
                        );
                      }

                      if (['is_mandatory', 'is_active', 'is_global', 'is_default'].includes(field) || field.startsWith('is_')) {
                        return (
                          <td key={field} className="py-3 px-4 whitespace-nowrap">
                            {val ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                Yes
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                No
                              </span>
                            )}
                          </td>
                        );
                      }

                      if (Array.isArray(val)) {
                        return (
                          <td key={field} className="py-3 px-4 text-xs max-w-xs truncate" title={val.join(', ')}>
                            {val.length > 0 ? val.join(', ') : <span className="text-slate-300">—</span>}
                          </td>
                        );
                      }

                      return (
                        <td key={field} className="py-3 px-4 text-xs max-w-xs truncate" title={String(val || '')}>
                          {val !== null && val !== undefined && val !== '' ? (
                            String(val)
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Status Column */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.is_deleted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          <XCircle className="w-3 h-3" /> Deleted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      {item.is_deleted ? (
                        <button
                          onClick={() => handleRestore(item.id, item.name || item[currentListConfig.uniqueField])}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all cursor-pointer"
                          title="Restore Record"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Restore
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleEditClick(item)}
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.name || item[currentListConfig.uniqueField])}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="Soft Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommonListManagementPage;
