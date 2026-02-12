import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from 'services/apiService.js';
import { PlusCircle, Edit, Trash, RotateCcw, Search, Filter, Globe, ChevronUp, ChevronDown, FileText } from 'lucide-react';

function TemplateList({ onLogout }) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtering & Sorting State
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [globalFilter, setGlobalFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiRequest('/system-owner/templates', 'GET');
      setTemplates(response);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      setError(`Failed to load templates. ${err.message || 'An unexpected error occurred.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Request sort helper
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Helper for sort icons
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />;
  };

  const uniqueActionTypes = useMemo(() => {
    const types = templates.map(t => t.action_type).filter(Boolean);
    return [...new Set(types)].sort();
  }, [templates]);

  // Combined Filter and Sort Logic
  const filteredTemplates = useMemo(() => {
    let results = templates.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAction = actionFilter === 'all' || t.action_type === actionFilter;
      const matchesGlobal = 
        globalFilter === 'all' || 
        (globalFilter === 'global' ? t.is_global === true : t.is_global === false);
      
      return matchesSearch && matchesAction && matchesGlobal;
    });

    results.sort((a, b) => {
      let aValue = a[sortConfig.key] || '';
      let bValue = b[sortConfig.key] || '';

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return results;
  }, [searchTerm, actionFilter, globalFilter, templates, sortConfig]);

  const handleEdit = (templateId) => {
    navigate(`/system-owner/global-configurations/templates/edit/${templateId}`);
  };

  const handleDelete = async (templateId, templateName) => {
    if (window.confirm(`Are you sure you want to soft-delete the template "${templateName}"?`)) {
      try {
        setIsLoading(true);
        await apiRequest(`/system-owner/templates/${templateId}`, 'DELETE');
        fetchTemplates();
      } catch (err) {
        setError(`Failed to delete: ${err.message}`);
        setIsLoading(false);
      }
    }
  };

  const handleRestore = async (templateId, templateName) => {
    if (window.confirm(`Restore template "${templateName}"?`)) {
      try {
        setIsLoading(true);
        await apiRequest(`/system-owner/templates/${templateId}/restore`, 'POST');
        fetchTemplates();
      } catch (err) {
        setError(`Failed to restore: ${err.message}`);
        setIsLoading(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 text-blue-600 mx-auto border-4 border-t-transparent rounded-full"></div>
        <p className="text-gray-600 mt-2">Loading templates...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Templates Management</h2>
        <button
          onClick={() => navigate('/system-owner/global-configurations/templates/new')}
          className="inline-flex items-center px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-sm"
        >
          <PlusCircle className="h-5 w-5 mr-2" /> Add New Template
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select 
            className="border border-gray-300 rounded-md py-2 px-3 w-full outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="all">All Action Types</option>
            {uniqueActionTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-gray-400" />
          <select 
            className="border border-gray-300 rounded-md py-2 px-3 w-full outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          >
            <option value="all">Global & Customer</option>
            <option value="global">Global Only</option>
            <option value="customer">Customer Only</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th onClick={() => requestSort('id')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                <div className="flex items-center">Template ID {getSortIcon('id')}</div>
              </th>
              <th onClick={() => requestSort('name')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                <div className="flex items-center">Name {getSortIcon('name')}</div>
              </th>
              {/* --- NEW TEMPLATE TYPE COLUMN --- */}
              <th onClick={() => requestSort('template_type')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                <div className="flex items-center">Type {getSortIcon('template_type')}</div>
              </th>
              <th onClick={() => requestSort('action_type')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                <div className="flex items-center">Action Type {getSortIcon('action_type')}</div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Global</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTemplates.map((template) => (
              <tr key={template.id} className={template.is_deleted ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-400">{template.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{template.name}</td>
                {/* --- TEMPLATE TYPE CELL --- */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                  {template.template_type || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                   <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium border border-blue-100">
                     {template.action_type || 'N/A'}
                   </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {template.is_global ? (
                    <span className="text-blue-600 font-semibold">Yes</span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-400">
                  {template.customer_id || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {template.is_deleted ? (
                    <span className="text-red-500 text-xs italic font-medium">Deleted</span>
                  ) : (
                    <span className="text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded border border-green-100">Active</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {template.is_deleted ? (
                    <button onClick={() => handleRestore(template.id, template.name)} className="text-green-600 hover:text-green-900 p-1" title="Restore">
                      <RotateCcw className="h-5 w-5" />
                    </button>
                  ) : (
                    <div className="flex justify-end gap-3">
                      <button onClick={() => handleEdit(template.id)} className="text-indigo-600 hover:text-indigo-900 p-1" title="Edit">
                        <Edit className="h-5 w-5" />
                      </button>
                      <button onClick={() => handleDelete(template.id, template.name)} className="text-red-600 hover:text-red-900 p-1" title="Delete">
                        <Trash className="h-5 w-5" />
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
  );
}

export default TemplateList;