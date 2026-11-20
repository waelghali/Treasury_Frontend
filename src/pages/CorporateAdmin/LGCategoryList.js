import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from 'services/apiService.js';
import { PlusCircle, Edit, Trash, RotateCcw, Loader2, Star, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

// NEW: A reusable component to provide a tooltip for disabled elements during the grace period.
const GracePeriodTooltip = ({ children, isGracePeriod }) => {
    if (isGracePeriod) {
        return (
            <div className="relative group inline-block">
                {children}
                <div className="opacity-0 w-max bg-gray-800 text-white text-xs rounded-lg py-2 px-3 absolute z-10 bottom-full left-1/2 -translate-x-1/2 pointer-events-none group-hover:opacity-100 transition-opacity duration-200">
                    This action is disabled during your subscription's grace period.
                    <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                        <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
                    </svg>
                </div>
            </div>
        );
    }
    return children;
};

// Common input field styling classes
const inputClassNames = "mb-2 mt-1 block w-full text-base px-3 py-2 rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-200 transition-all duration-200";
const labelClassNames = "block text-sm font-medium text-gray-700";
const buttonBaseClassNames = "inline-flex items-center px-3.5 py-2 text-sm font-medium rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200";


function LGCategoryList({ onLogout, isGracePeriod, userRole }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleted, setShowDeleted] = useState(false); // NEW state variable
  
  // NEW: Determine base API URL and title dynamically based on userRole
  const isSystemOwner = userRole === 'system-owner';
  const baseApiUrl = isSystemOwner ? '/system-owner/lg-categories/universal' : '/corporate-admin/lg-categories';
  const pageTitle = isSystemOwner ? 'Universal Categories' : 'LG Categories';
  const singularListName = isSystemOwner ? 'Universal Category' : 'LG Category';

  const fetchLGCategories = async () => {
    setIsLoading(true);
    setError('');
    try {
      // MODIFIED: Add include_deleted query parameter
      const params = new URLSearchParams();
      if (showDeleted) {
        params.append('include_deleted', true);
      }
      const queryString = params.toString();
      const url = `${baseApiUrl}${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiRequest(url, 'GET');
      setCategories(response);
    } catch (err) {
      console.error('Failed to fetch LG categories:', err);
      setError(`Failed to load ${pageTitle}. ${err.message || 'An unexpected error occurred.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLGCategories();
  }, [baseApiUrl, showDeleted]); // MODIFIED: Add showDeleted to dependencies

  const handleEdit = (category) => {
    if (isGracePeriod) {
        toast.warn("This action is disabled during your subscription's grace period.");
        return;
    }
    if (userRole === 'corporate-admin' && category.customer_id === null) {
      setError("System default categories cannot be edited by Corporate Admins.");
      return;
    }
    const editUrl = userRole === 'system-owner' 
        ? `/system-owner/lg-categories/universal/edit/${category.id}` 
        : `/corporate-admin/lg-categories/edit/${category.id}`;
    navigate(editUrl);
  };

  const handleDelete = async (category) => {
    if (isGracePeriod) {
        toast.warn("This action is disabled during your subscription's grace period.");
        return;
    }
    if (userRole === 'corporate-admin' && category.customer_id === null) {
      setError("System default categories (Universal Categories) cannot be deleted by Corporate Admins.");
      return;
    }
    if (window.confirm(`Are you sure you want to soft-delete "${category.name}"?`)) {
      try {
        setIsLoading(true);
        const deleteUrl = userRole === 'system-owner'
          ? `/system-owner/lg-categories/universal/${category.id}`
          : `/corporate-admin/lg-categories/${category.id}`;
        await apiRequest(deleteUrl, 'DELETE');
        toast.success(`"${category.name}" soft-deleted successfully.`);
        fetchLGCategories();
      } catch (err) {
        console.error('Failed to soft-delete LG category:', err);
        setError(`Failed to soft-delete "${category.name}". ${err.message || 'An unexpected error occurred.'}`);
        setIsLoading(false);
      }
    }
  };

  const handleRestore = async (category) => {
    if (isGracePeriod) {
        toast.warn("This action is disabled during your subscription's grace period.");
        return;
    }
    if (userRole === 'corporate-admin' && category.customer_id === null) {
        setError("System default categories (Universal Categories) cannot be restored by Corporate Admins.");
        return;
    }
    if (window.confirm(`Are you sure you want to restore "${category.name}"?`)) {
      try {
        setIsLoading(true);
        const restoreUrl = userRole === 'system-owner'
          ? `/system-owner/lg-categories/universal/${category.id}/restore`
          : `/corporate-admin/lg-categories/${category.id}/restore`;
        await apiRequest(restoreUrl, 'POST');
        toast.success(`"${category.name}" restored successfully.`);
        fetchLGCategories();
      } catch (err) {
        console.error('Failed to restore LG category:', err);
        setError(`Failed to restore "${category.name}". ${err.message || 'An unexpected error occurred.'}`);
        setIsLoading(false);
      }
    }
  };

  const handleSetDefault = async (category) => {
    if (isGracePeriod) {
      toast.warn("This action is disabled during your subscription's grace period.");
      return;
    }
    if (!category.has_all_entity_access) {
      toast.error("Only categories that apply to all entities can be set as the default category.");
      return;
    }
    try {
      setIsLoading(true);
      if (isSystemOwner) {
        await apiRequest(`/system-owner/lg-categories/universal/${category.id}`, 'PUT', { is_default: true });
      } else {
        await apiRequest(`/corporate-admin/lg-categories/${category.id}/set-default`, 'POST');
      }
      toast.success(`"${category.name}" is now the default LG category.`);
      await fetchLGCategories();
    } catch (err) {
      console.error('Failed to set default LG category:', err);
      toast.error(err.message || 'Failed to set default LG category.');
      setIsLoading(false);
    }
  };

  const handleClearDefault = async () => {
    if (isGracePeriod) {
      toast.warn("This action is disabled during your subscription's grace period.");
      return;
    }
    try {
      setIsLoading(true);
      await apiRequest('/corporate-admin/lg-categories/clear-default', 'POST');
      toast.info('Default LG category cleared.');
      await fetchLGCategories();
    } catch (err) {
      console.error('Failed to clear default LG category:', err);
      toast.error(err.message || 'Failed to clear default LG category.');
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{pageTitle}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl cursor-pointer select-none text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            <input
              type="checkbox"
              className="form-checkbox h-4 w-4 text-blue-600 rounded border-slate-300"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
            />
            <span>Show Deleted</span>
          </label>
          <GracePeriodTooltip isGracePeriod={isGracePeriod}>
              <button
                onClick={() => {
                  const newUrl = userRole === 'system-owner' ? '/system-owner/lg-categories/universal/new' : '/corporate-admin/lg-categories/new';
                  navigate(newUrl);
                }}
                className={`${buttonBaseClassNames} bg-blue-600 text-white hover:bg-blue-700 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isGracePeriod}
              >
                <PlusCircle className="h-4 w-4 mr-1.5" /> Add New {singularListName}
              </button>
          </GracePeriodTooltip>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl relative mb-4 flex items-center gap-2 text-sm" role="alert">
          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {categories.length === 0 && !isLoading ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm text-center">
          <p className="text-sm text-slate-500">No {pageTitle.toLowerCase()} found. Click "Add New {singularListName}" to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/80">
              <tr>
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-2.5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Code
                </th>
                {!isSystemOwner && (
                  <th scope="col" className="px-2.5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Type
                  </th>
                )}
                <th scope="col" className="px-2.5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Extra Field
                </th>
                <th scope="col" className="px-2.5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Req.
                </th>
                <th scope="col" className="px-2.5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Comm. List
                </th>
                {!isSystemOwner && (
                    <th scope="col" className="px-2.5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Entities
                    </th>
                )}
                <th scope="col" className="px-2.5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-2.5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  LGs
                </th>
                <th scope="col" className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {categories.map((category) => {
                const isEditable = (category.customer_id !== null || isSystemOwner) && !category.is_deleted && !isGracePeriod;
                return (
                  <tr
                    key={category.id}
                    onClick={() => {
                      if (isEditable) handleEdit(category);
                    }}
                    className={`transition-colors ${
                      isEditable ? 'hover:bg-blue-50/40 cursor-pointer' : ''
                    } ${category.is_deleted ? 'bg-slate-50 opacity-60' : ''}`}
                  >
                    <td className="px-3 py-2.5 text-sm font-medium text-slate-900 max-w-[160px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate" title={category.name}>{category.name}</span>
                        {category.is_default && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                            <Star className="h-3 w-3 fill-amber-500 text-amber-600" />
                            Default
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5 whitespace-nowrap text-xs font-mono text-slate-600">
                      {category.code || 'N/A'}
                    </td>
                    {!isSystemOwner && (
                      <td className="px-2.5 py-2.5 whitespace-nowrap text-xs text-slate-600 capitalize">
                        {category.customer_id === null ? 'Universal' : 'Custom'}
                      </td>
                    )}
                    <td className="px-2.5 py-2.5 text-xs text-slate-600 max-w-[120px] truncate" title={category.extra_field_name || 'N/A'}>
                      {category.extra_field_name || 'N/A'}
                    </td>
                    <td className="px-2.5 py-2.5 whitespace-nowrap text-xs text-slate-600">
                      {category.is_mandatory ? 'Yes' : 'No'}
                    </td>
                    <td className="px-2.5 py-2.5 text-xs text-slate-600 max-w-[140px] truncate" title={Array.isArray(category.communication_list) && category.communication_list.length > 0 ? category.communication_list.join(', ') : 'N/A'}>
                      {Array.isArray(category.communication_list) && category.communication_list.length > 0
                        ? category.communication_list.join(', ')
                        : 'N/A'}
                    </td>
                    {!isSystemOwner && (
                      <td className="px-2.5 py-2.5 text-xs text-slate-600 max-w-[150px]">
                          {category.has_all_entity_access ? (
                              <span className="px-2 py-0.5 inline-flex text-[11px] leading-4 font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                  All Entities
                              </span>
                          ) : (
                              Array.isArray(category.entities_with_access) && category.entities_with_access.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                      {category.entities_with_access.map(entity => (
                                          <span key={entity.id} className="px-2 py-0.5 inline-flex text-[11px] leading-4 font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[130px]" title={entity.entity_name}>
                                              {entity.entity_name}
                                          </span>
                                      ))}
                                  </div>
                              ) : (
                                  'N/A'
                              )
                          )}
                      </td>
                    )}
                    <td className="px-2.5 py-2.5 whitespace-nowrap text-xs">
                      {category.is_deleted ? (
                        <span className="px-2 py-0.5 inline-flex text-[11px] leading-4 font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          Deleted
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 inline-flex text-[11px] leading-4 font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-2.5 py-2.5 whitespace-nowrap text-xs text-slate-700 font-semibold tabular-nums">
                      {category.lg_count ?? 0}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right text-xs font-medium" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {!category.is_deleted && (
                          category.is_default ? (
                            !isSystemOwner && (
                              <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                <button
                                  onClick={handleClearDefault}
                                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  title="Unset Default Category"
                                  disabled={isGracePeriod}
                                >
                                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-600" />
                                  Default
                                </button>
                              </GracePeriodTooltip>
                            )
                          ) : (
                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                              <button
                                onClick={() => handleSetDefault(category)}
                                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border ${
                                  category.has_all_entity_access && !isGracePeriod
                                    ? 'bg-white text-slate-700 border-slate-300 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300'
                                    : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                }`}
                                title={
                                  category.has_all_entity_access
                                    ? 'Set as Default Category'
                                    : 'Only categories applying to all entities can be set as default'
                                }
                                disabled={isGracePeriod || !category.has_all_entity_access}
                              >
                                <Star className="h-3.5 w-3.5" />
                                Set Default
                              </button>
                            </GracePeriodTooltip>
                          )
                        )}
                        {category.customer_id === null && !isSystemOwner ? (
                          <span className="text-xs text-slate-400">Universal</span>
                        ) : (
                          category.is_deleted ? (
                              <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                  <button
                                      onClick={() => handleRestore(category)}
                                      className={`text-emerald-600 hover:text-emerald-800 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      title="Restore"
                                      disabled={isGracePeriod}
                                  >
                                      <RotateCcw className="h-4 w-4" />
                                  </button>
                              </GracePeriodTooltip>
                          ) : (
                          <>
                              <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                  <button
                                      onClick={() => handleEdit(category)}
                                      className={`text-indigo-600 hover:text-indigo-800 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      title="Edit"
                                      disabled={isGracePeriod}
                                  >
                                      <Edit className="h-4 w-4" />
                                  </button>
                              </GracePeriodTooltip>
                              <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                  <button
                                      onClick={() => handleDelete(category)}
                                      className={`text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition-colors ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      title="Delete"
                                      disabled={isGracePeriod}
                                  >
                                      <Trash className="h-4 w-4" />
                                  </button>
                              </GracePeriodTooltip>
                          </>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default LGCategoryList;