import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from 'services/apiService.js';
import { toast } from 'react-toastify';
import { 
  PlusCircle, Edit, RotateCcw, Search, Filter, Settings, Save, Loader2,
  ChevronUp, ChevronDown, Lock, Clock, MessageSquare, FileCheck, Layers, Calendar 
} from 'lucide-react';

// --- Configuration Groupings Mapping ---
const settingGroups = {
    'Security & Authentication': { icon: Lock },
    'System Limits & Timers': { icon: Clock },
    'Communication & Alerts': { icon: MessageSquare },
    'Document Compliance & Requirements': { icon: FileCheck },
    'Issuance & Facilities': { icon: Layers },
    'General': { icon: Settings }
};

// Helper function to dynamically determine a config's group based on keywords
const getGroupKey = (configKey) => {
    const key = configKey ? configKey.toUpperCase() : '';
    
    if (key.includes('PASSWORD') || key.includes('AUTH') || key.includes('LOCKOUT') || key.includes('LOGIN') || key.includes('ENFORCE') || key.includes('ACCOUNT_LOCKOUT') || key.includes('SESSION')) {
        return 'Security & Authentication';
    }
    if (key.includes('TIMEOUT') || key.includes('IDLE') || key.includes('EXPIRY') || key.includes('DURATION') || key.includes('FREQUENCY') || key.includes('RETENTION') || key.includes('MAX') || key.includes('LIMIT') || key.includes('COUNT')) {
        return 'System Limits & Timers';
    }
    if (key.includes('EMAIL') || key.includes('COMMUNICATION') || key.includes('NOTIFICATION') || key.includes('SENDER') || key.includes('SMS')) {
        return 'Communication & Alerts';
    }
    if (key.includes('REQUIRED') || key.includes('MANDATORY') || key.includes('OPTIONAL') || key.includes('DOC') || key.includes('ATTACHMENT') || key.includes('FILE')) {
        return 'Document Compliance & Requirements';
    }
    if (key.includes('FACILITY_SCORE') || key.includes('RESERVATION_TTL') || key.includes('ISSUANCE_LG')) {
        return 'Issuance & Facilities';
    }
    return 'General';
};

// Common styling classes
const inputClassNames = "mt-1 block w-full text-base px-3 py-2 rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200";

function GlobalConfigurationList({ onLogout }) {
  const [configs, setConfigs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null); 
  const navigate = useNavigate();

  // --- Sort/Filter/Group State ---
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterText, setFilterText] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All Groups');

  // Function to fetch global configurations from the backend
  const fetchGlobalConfigurations = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiRequest('/system-owner/global-configurations', 'GET');
      
      // Assign group to each config immediately upon fetch
      const groupedResponse = response.map(config => ({
        ...config,
        group: getGroupKey(config.key)
      }));
      
      setConfigs(groupedResponse);
    } catch (err) {
      console.error('Failed to fetch global configurations:', err);
      setError('Failed to load global configurations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalConfigurations();
  }, []);

  // Handle Edit action
  const handleEdit = (configId) => {
    navigate(`/system-owner/global-configurations/edit/${configId}`);
  };

  // Helper to check if a config is boolean
  const isBooleanConfig = (config) => {
    if (config.data_type === 'BOOLEAN') return true;
    const val = String(config.value_default).toLowerCase();
    return val === 'true' || val === 'false';
  };

  // Handle Inline Toggle for Boolean values
  const handleToggleUpdate = async (config) => {
    setUpdatingId(config.id);
    try {
      const currentValString = String(config.value_default).toLowerCase();
      const isCurrentlyTrue = currentValString === 'true';
      
      const newValue = typeof config.value_default === 'boolean' 
        ? !config.value_default 
        : (isCurrentlyTrue ? 'false' : 'true');

      // Optimistic update
      const updatedConfigs = configs.map(c => 
        c.id === config.id ? { ...c, value_default: newValue } : c
      );
      setConfigs(updatedConfigs);

      await apiRequest(`/system-owner/global-configurations/${config.id}`, 'PUT', {
        ...config,
        value_default: newValue
      });
      
    } catch (err) {
      console.error('Failed to update toggle:', err);
      setError(`Failed to update ${config.key}.`);
      fetchGlobalConfigurations(); 
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle Restore action
  const handleRestore = async (configId, configKey) => {
    if (window.confirm(`Are you sure you want to restore the configuration "${configKey}"?`)) {
      try {
        setIsLoading(true);
        await apiRequest(`/system-owner/global-configurations/${configId}/restore`, 'POST');
        fetchGlobalConfigurations(); 
        alert(`Global configuration "${configKey}" restored successfully.`);
      } catch (err) {
        console.error('Failed to restore global configuration:', err);
        setError(`Failed to restore configuration "${configKey}". ${err.message || ''}`);
        setIsLoading(false);
      }
    }
  };

  // --- Sorting & Filtering Logic ---
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (key) => {
    if (sortKey !== key) return null;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />;
  };

  const groupedAndSortedConfigurations = useMemo(() => {
    let filtered = [...configs]
        .filter(config => 
            (selectedGroup === 'All Groups' || config.group === selectedGroup) && 
            (
             (config.key && config.key.toLowerCase().includes(filterText.toLowerCase())) ||
             (config.description && config.description.toLowerCase().includes(filterText.toLowerCase())) ||
             (config.value_default && String(config.value_default).toLowerCase().includes(filterText.toLowerCase()))
            )
        )
        .sort((a, b) => {
            if (!sortKey) return 0;
            const aValue = a[sortKey];
            const bValue = b[sortKey];
            
            if (aValue === null || aValue === undefined) return sortDirection === 'asc' ? 1 : -1;
            if (bValue === null || bValue === undefined) return sortDirection === 'asc' ? -1 : 1;
            
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }
            return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        });

    const grouped = {};
    const groupKeys = Object.keys(settingGroups); 
    
    groupKeys.forEach(groupKey => {
        const configsInGroup = filtered.filter(config => config.group === groupKey);
        if (configsInGroup.length > 0) {
            grouped[groupKey] = configsInGroup;
        }
    });
    
    // Catch-all
    const remainingConfigs = filtered.filter(config => !groupKeys.includes(config.group));
    if (remainingConfigs.length > 0) {
        if (grouped['General']) {
            grouped['General'] = [...grouped['General'], ...remainingConfigs];
        } else {
            grouped['General'] = remainingConfigs;
        }
    }

    return grouped;
  }, [configs, filterText, sortKey, sortDirection, selectedGroup]);


  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Global Ranges Configurations</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/system-owner/global-configurations/holidays')}
            className="inline-flex items-center px-4 py-2 border border-slate-200 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none transition-colors duration-200"
          >
            <Calendar className="h-4 w-4 mr-2 text-indigo-600" /> Banking Calendar & Holidays
          </button>
          <button
            onClick={() => navigate('/system-owner/global-configurations/new')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            <PlusCircle className="h-5 w-5 mr-2" /> Add New Configuration
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* --- Filter & Group Controls --- */}
      <div className="mb-6 flex flex-col sm:flex-row sm:space-x-4 space-y-3 sm:space-y-0 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center space-x-2 w-full sm:w-auto flex-1">
            <Search className="h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Filter by key, description, or value..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className={inputClassNames}
            />
        </div>
        
        <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className={`${inputClassNames} min-w-[200px]`}
            >
            <option value="All Groups">All Groups</option>
            {Object.keys(settingGroups).map(groupName => (
                <option key={groupName} value={groupName}>{groupName}</option>
            ))}
            </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 mt-2">Loading global configurations...</p>
        </div>
      ) : Object.keys(groupedAndSortedConfigurations).length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <p className="text-gray-500">No global configurations found matching your criteria.</p>
        </div>
      ) : (
        <div className="space-y-8">
            {Object.keys(groupedAndSortedConfigurations).map(groupName => {
                const configsInGroup = groupedAndSortedConfigurations[groupName];
                const GroupIcon = settingGroups[groupName]?.icon || Settings;

                return (
                    <div key={groupName} className="border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden">
                        {/* Group Header */}
                        <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex items-center">
                            <GroupIcon className="h-5 w-5 mr-2 text-gray-600" />
                            <h3 className="text-lg font-semibold text-gray-800">{groupName} ({configsInGroup.length})</h3>
                        </div>

                        {/* Group Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th 
                                        scope="col" 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleSort('key')}
                                    >
                                        <div className="flex items-center">
                                            Key {getSortIcon('key')}
                                        </div>
                                    </th>
                                    <th 
                                        scope="col" 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleSort('description')}
                                    >
                                        <div className="flex items-center">
                                            Description {getSortIcon('description')}
                                        </div>
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Min
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Max
                                    </th>
                                    <th 
                                        scope="col" 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleSort('value_default')}
                                    >
                                        <div className="flex items-center">
                                            Default {getSortIcon('value_default')}
                                        </div>
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Unit
                                    </th>
                                    {/* Status Column Removed */}
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                {configsInGroup.filter(c => !c.key?.startsWith('FACILITY_SCORE_WEIGHT_')).map((config) => {
                                    const isBool = isBooleanConfig(config);
                                    const valStr = String(config.value_default).toLowerCase();
                                    const isOn = valStr === 'true';

                                    let valueTextColor = "text-gray-900";
                                    if (isBool) {
                                        valueTextColor = isOn ? "text-green-600" : "text-red-600";
                                    }

                                    return (
                                    <tr key={config.id} className={`hover:bg-gray-50 ${config.is_deleted ? 'bg-gray-50 opacity-60' : ''}`}>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 break-all w-[30%]">
                                            {config.key}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 w-[25%]">{config.description || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{config.value_min || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{config.value_max || '-'}</td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${valueTextColor}`}>
                                            {config.value_default || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{config.unit || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            {config.is_deleted ? (
                                                <button
                                                    onClick={() => handleRestore(config.id, config.key)}
                                                    className="text-green-600 hover:text-green-900 p-1 rounded-md hover:bg-gray-200"
                                                    title="Restore Configuration"
                                                >
                                                    <RotateCcw className="h-5 w-5" />
                                                </button>
                                            ) : (
                                                <>
                                                    {isBool ? (
                                                        <button 
                                                            onClick={() => handleToggleUpdate(config)}
                                                            disabled={updatingId === config.id}
                                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isOn ? 'bg-blue-600' : 'bg-gray-300'} ${updatingId === config.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            title="Toggle On/Off"
                                                        >
                                                            <span className="sr-only">Toggle setting</span>
                                                            <span
                                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${isOn ? 'translate-x-6' : 'translate-x-1'}`}
                                                            />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleEdit(config.id)}
                                                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-gray-200"
                                                            title="Edit Configuration"
                                                        >
                                                            <Edit className="h-5 w-5" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                )})}
                                </tbody>
                            </table>
                        </div>

                        {/* System Owner Weight Editor — for Issuance & Facilities group */}
                        {groupName === 'Issuance & Facilities' && (() => {
                          const WEIGHT_DEFS = [
                            { label: 'Cost', color: '#3b82f6', key: 'FACILITY_SCORE_WEIGHT_COST', urgentKey: 'FACILITY_SCORE_WEIGHT_URGENT_COST' },
                            { label: 'Margin', color: '#8b5cf6', key: 'FACILITY_SCORE_WEIGHT_MARGIN', urgentKey: 'FACILITY_SCORE_WEIGHT_URGENT_MARGIN' },
                            { label: 'SLA', color: '#f59e0b', key: 'FACILITY_SCORE_WEIGHT_SLA', urgentKey: 'FACILITY_SCORE_WEIGHT_URGENT_SLA' },
                            { label: 'Capacity', color: '#10b981', key: 'FACILITY_SCORE_WEIGHT_CAPACITY', urgentKey: 'FACILITY_SCORE_WEIGHT_URGENT_CAPACITY' },
                            { label: 'Currency', color: '#ec4899', key: 'FACILITY_SCORE_WEIGHT_CURRENCY_MATCH', urgentKey: 'FACILITY_SCORE_WEIGHT_URGENT_CURRENCY_MATCH' },
                          ];

                          const getConfig = (cfgKey) => configsInGroup.find(x => x.key === cfgKey);

                          const SysWeightPanel = ({ title, keyProp }) => {
                            const [editing, setEditing] = React.useState(false);
                            const [saving, setSaving] = React.useState(false);
                            const [rows, setRows] = React.useState(() =>
                              WEIGHT_DEFS.map(w => {
                                const c = getConfig(w[keyProp]);
                                return {
                                  ...w,
                                  configId: c?.id,
                                  configKey: w[keyProp],
                                  min: parseInt(c?.value_min || 0),
                                  max: parseInt(c?.value_max || 100),
                                  def: parseInt(c?.value_default || 20),
                                };
                              })
                            );

                            React.useEffect(() => {
                              if (!editing) {
                                setRows(WEIGHT_DEFS.map(w => {
                                  const c = getConfig(w[keyProp]);
                                  return {
                                    ...w,
                                    configId: c?.id,
                                    configKey: w[keyProp],
                                    min: parseInt(c?.value_min || 0),
                                    max: parseInt(c?.value_max || 100),
                                    def: parseInt(c?.value_default || 20),
                                  };
                                }));
                              }
                            }, [configs, editing]);

                            const snap5 = (v) => Math.round(v / 5) * 5;
                            const defaultTotal = rows.reduce((s, r) => s + r.def, 0);
                            const isBalanced = defaultTotal === 100;

                            const handleFieldChange = (idx, field, val) => {
                              val = Math.max(0, Math.min(100, snap5(val || 0)));
                              setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
                            };

                            const handleBalance = () => {
                              if (defaultTotal === 0) {
                                setRows(prev => prev.map(r => ({ ...r, def: 20 })));
                                return;
                              }
                              const scale = 100 / defaultTotal;
                              const updated = rows.map(r => ({ ...r, def: snap5(r.def * scale) }));
                              const newTotal = updated.reduce((s, r) => s + r.def, 0);
                              if (newTotal !== 100) {
                                const largest = updated.reduce((best, r, i) => r.def > updated[best].def ? i : best, 0);
                                updated[largest].def += (100 - newTotal);
                              }
                              setRows(updated);
                            };

                            const handleSave = async () => {
                              if (!isBalanced) {
                                toast.warn('Default weights must sum to 100%. Use the Balance button.');
                                return;
                              }
                              // Validate min <= default <= max per weight
                              for (const r of rows) {
                                if (r.min > r.def) {
                                  toast.warn(`${r.label}: Minimum (${r.min}) cannot exceed Default (${r.def}).`);
                                  return;
                                }
                                if (r.def > r.max) {
                                  toast.warn(`${r.label}: Default (${r.def}) cannot exceed Maximum (${r.max}).`);
                                  return;
                                }
                              }
                              setSaving(true);
                              try {
                                for (const r of rows) {
                                  await apiRequest(`/system-owner/global-configurations/${r.configId}`, 'PUT', {
                                    key: r.configKey,
                                    value_min: String(r.min),
                                    value_max: String(r.max),
                                    value_default: String(r.def),
                                    unit: 'percentage',
                                    description: getConfig(r.configKey)?.description || '',
                                  });
                                }
                                toast.success(`${title} saved!`);
                                setEditing(false);
                                fetchGlobalConfigurations();
                              } catch (err) {
                                toast.error(`Save failed: ${err.message}`);
                              } finally {
                                setSaving(false);
                              }
                            };

                            const handleCancel = () => {
                              setRows(WEIGHT_DEFS.map(w => {
                                const c = getConfig(w[keyProp]);
                                return { ...w, configId: c?.id, configKey: w[keyProp], min: parseInt(c?.value_min || 0), max: parseInt(c?.value_max || 100), def: parseInt(c?.value_default || 20) };
                              }));
                              setEditing(false);
                            };

                            const totalColor = isBalanced
                              ? 'bg-green-100 text-green-700 border-green-300'
                              : defaultTotal > 90 && defaultTotal < 110
                              ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                              : 'bg-red-100 text-red-700 border-red-300';

                            return (
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-semibold text-gray-700">{title}</span>
                                  {!editing ? (
                                    <button onClick={() => setEditing(true)} className="text-xs px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">
                                      <Edit className="h-3 w-3 inline mr-1" />Edit Ranges
                                    </button>
                                  ) : (
                                    <div className="flex gap-2 items-center">
                                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${totalColor}`}>
                                        Defaults: {defaultTotal}%
                                      </span>
                                      {!isBalanced && (
                                        <button onClick={handleBalance} className="text-xs px-2 py-1 bg-amber-500 text-white rounded-md hover:bg-amber-600 font-medium">
                                          Balance to 100%
                                        </button>
                                      )}
                                      <button onClick={handleSave} disabled={saving || !isBalanced} className="text-xs px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium">
                                        {saving ? <Loader2 className="h-3 w-3 inline animate-spin mr-1" /> : <Save className="h-3 w-3 inline mr-1" />}Save
                                      </button>
                                      <button onClick={handleCancel} disabled={saving} className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium">
                                        Cancel
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Color bar */}
                                <div className="flex h-6 rounded-lg overflow-hidden bg-gray-100 shadow-inner mb-2">
                                  {rows.map((seg, i) => {
                                    const pct = defaultTotal > 0 ? (seg.def / defaultTotal) * 100 : 20;
                                    return (
                                      <div key={i} style={{ width: `${pct}%`, backgroundColor: seg.color }} className="flex items-center justify-center transition-all duration-200" title={`${seg.label}: ${seg.def}%`}>
                                        {pct > 10 && <span className="text-[10px] font-bold text-white drop-shadow">{seg.def}%</span>}
                                      </div>
                                    );
                                  })}
                                </div>

                                {editing ? (
                                  <div>
                                    {/* Header row */}
                                    <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 mb-1">
                                      <div className="w-20" />
                                      <span className="text-[10px] font-semibold text-gray-500 text-center uppercase">Min</span>
                                      <span className="text-[10px] font-semibold text-gray-500 text-center uppercase">Default</span>
                                      <span className="text-[10px] font-semibold text-gray-500 text-center uppercase">Max</span>
                                    </div>
                                    {rows.map((w, i) => (
                                      <div key={i} className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 items-center mb-1">
                                        <div className="flex items-center gap-1 w-20">
                                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: w.color }} />
                                          <span className="text-[11px] font-semibold text-gray-700">{w.label}</span>
                                        </div>
                                        <input type="number" min="0" max="100" step="5" value={w.min}
                                          onChange={e => handleFieldChange(i, 'min', parseInt(e.target.value, 10))}
                                          className="w-full text-xs text-center border border-gray-300 rounded px-1 py-1 focus:ring-1 focus:ring-blue-500" />
                                        <input type="number" min="0" max="100" step="5" value={w.def}
                                          onChange={e => handleFieldChange(i, 'def', parseInt(e.target.value, 10))}
                                          className="w-full text-xs text-center border border-blue-300 rounded px-1 py-1 font-bold bg-blue-50 focus:ring-1 focus:ring-blue-500" />
                                        <input type="number" min="0" max="100" step="5" value={w.max}
                                          onChange={e => handleFieldChange(i, 'max', parseInt(e.target.value, 10))}
                                          className="w-full text-xs text-center border border-gray-300 rounded px-1 py-1 focus:ring-1 focus:ring-blue-500" />
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex gap-3">
                                    {rows.map((seg, i) => (
                                      <div key={i} className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
                                        <span className="text-[10px] text-gray-500">{seg.label}: {seg.min}-{seg.def}-{seg.max}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          };

                          return (
                            <div className="px-4 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                              <div className="flex gap-8">
                                <SysWeightPanel title="⚖️ Normal Requests" keyProp="key" />
                                <SysWeightPanel title="🚨 Urgent Requests" keyProp="urgentKey" />
                              </div>
                            </div>
                          );
                        })()}
                    </div>
                );
            })}
        </div>
      )}
    </div>
  );
}

export default GlobalConfigurationList;