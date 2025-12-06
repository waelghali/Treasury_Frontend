import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from 'services/apiService.js';
import { 
  PlusCircle, Edit, Trash, RotateCcw, Search, Filter, Settings, 
  ChevronUp, ChevronDown, Lock, Clock, MessageSquare, FileCheck 
} from 'lucide-react';

// --- Configuration Groupings Mapping ---
const settingGroups = {
    'Security & Authentication': { icon: Lock },
    'System Limits & Timers': { icon: Clock },
    'Communication & Alerts': { icon: MessageSquare },
    'Document Compliance & Requirements': { icon: FileCheck },
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
    return 'General';
};

// Common styling classes
const inputClassNames = "mt-1 block w-full text-base px-3 py-2 rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200";

function GlobalConfigurationList({ onLogout }) {
  const [configs, setConfigs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
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

  // Handle Delete (Soft Delete) action
  const handleDelete = async (configId, configKey) => {
    if (window.confirm(`Are you sure you want to soft-delete the configuration "${configKey}"?`)) {
      try {
        setIsLoading(true);
        await apiRequest(`/system-owner/global-configurations/${configId}`, 'DELETE');
        fetchGlobalConfigurations(); 
        alert(`Global configuration "${configKey}" soft-deleted successfully.`);
      } catch (err) {
        console.error('Failed to soft-delete global configuration:', err);
        setError(`Failed to soft-delete configuration "${configKey}". ${err.message || ''}`);
        setIsLoading(false);
      }
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
    
    // Catch-all for anything that didn't match specific keys but is in "General" or others not explicitly ordered
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
        <button
          onClick={() => navigate('/system-owner/global-configurations/new')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
        >
          <PlusCircle className="h-5 w-5 mr-2" /> Add New Configuration
        </button>
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
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                {configsInGroup.map((config) => (
                                    <tr key={config.id} className={`hover:bg-gray-50 ${config.is_deleted ? 'bg-gray-50 opacity-60' : ''}`}>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 break-all w-[30%]">
                                            {config.key}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 w-[25%]">{config.description || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{config.value_min || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{config.value_max || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{config.value_default || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{config.unit || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {config.is_deleted ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                Deleted
                                            </span>
                                            ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                Active
                                            </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {config.is_deleted ? (
                                            <button
                                                onClick={() => handleRestore(config.id, config.key)}
                                                className="text-green-600 hover:text-green-900 mr-3 p-1 rounded-md hover:bg-gray-200"
                                                title="Restore Configuration"
                                            >
                                                <RotateCcw className="h-5 w-5" />
                                            </button>
                                            ) : (
                                            <>
                                                <button
                                                onClick={() => handleEdit(config.id)}
                                                className="text-indigo-600 hover:text-indigo-900 mr-3 p-1 rounded-md hover:bg-gray-200"
                                                title="Edit Configuration"
                                                >
                                                <Edit className="h-5 w-5" />
                                                </button>
                                                <button
                                                onClick={() => handleDelete(config.id, config.key)}
                                                className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-gray-200"
                                                title="Delete Configuration"
                                                >
                                                <Trash className="h-5 w-5" />
                                                </button>
                                            </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
      )}
    </div>
  );
}

export default GlobalConfigurationList;