import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from 'services/apiService.js';
import { PlusCircle, Edit, Trash, RotateCcw, Search, Filter, Globe, ChevronUp, ChevronDown, FileText, Upload, Loader2 } from 'lucide-react';

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
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        <p className="text-sm text-slate-500 mt-3">Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Templates Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage global and customer-specific instruction letters and email notifications.</p>
        </div>
        <button
          onClick={() => navigate('/system-owner/global-configurations/templates/new')}
          className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Upload className="h-4 w-4 mr-2" /> Upload / Add Template
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-200/80">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name..."
            className="!pl-9 pr-3 py-2 w-full border border-slate-300 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            className="border border-slate-300 rounded-xl py-2 px-3 w-full bg-white text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
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
          <Globe className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            className="border border-slate-300 rounded-xl py-2 px-3 w-full bg-white text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          >
            <option value="all">Global &amp; Customer</option>
            <option value="global">Global Only</option>
            <option value="customer">Customer Only</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-medium">
          {error}
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-200/80">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50/80">
            <tr>
              <th onClick={() => requestSort('id')} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 whitespace-nowrap">
                <div className="flex items-center">ID {getSortIcon('id')}</div>
              </th>
              <th onClick={() => requestSort('name')} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100">
                <div className="flex items-center">Name {getSortIcon('name')}</div>
              </th>
              {/* --- NEW TEMPLATE TYPE COLUMN --- */}
              <th onClick={() => requestSort('template_type')} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100">
                <div className="flex items-center">Type {getSortIcon('template_type')}</div>
              </th>
              <th onClick={() => requestSort('action_type')} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100">
                <div className="flex items-center">Action Type {getSortIcon('action_type')}</div>
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Global</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Customer ID</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {filteredTemplates.map((template) => (
              <tr key={template.id} className={template.is_deleted ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50/70 transition-colors'}>
                <td className="px-3 py-2.5 whitespace-nowrap text-xs font-mono text-slate-400">{template.id}</td>
                <td className="px-3 py-2.5 text-sm font-medium text-slate-900">
                  <div className="max-w-[220px] truncate" title={template.name}>{template.name}</div>
                </td>
                {/* --- TEMPLATE TYPE CELL --- */}
                <td className="px-3 py-2.5 whitespace-nowrap text-sm text-slate-600 capitalize">
                  {template.is_notification_template ? (
                    <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full text-xs font-semibold border border-purple-200">
                      Notification ({template.template_type || 'EMAIL'})
                    </span>
                  ) : (
                    <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full text-xs font-semibold border border-amber-200">
                      Instruction Letter
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-sm text-slate-600">
                   <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-xs font-semibold border border-indigo-200/80">
                     {template.action_type || 'N/A'}
                   </span>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                  {template.is_global ? (
                    <span className="text-indigo-600 font-semibold">Yes</span>
                  ) : (
                    <span className="text-slate-400">No</span>
                  )}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-xs font-mono text-slate-500">
                  {template.customer_id || '-'}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                  {template.is_deleted ? (
                    <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-semibold border border-rose-200">Deleted</span>
                  ) : (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">Active</span>
                  )}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-right text-sm font-medium">
                  {template.is_deleted ? (
                    <button onClick={() => handleRestore(template.id, template.name)} className="text-emerald-600 hover:text-emerald-900 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors" title="Restore">
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  ) : (
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleEdit(template.id)} className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors" title="Edit">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(template.id, template.name)} className="text-rose-600 hover:text-rose-900 p-1.5 rounded-lg hover:bg-rose-50 transition-colors" title="Delete">
                        <Trash className="h-4 w-4" />
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