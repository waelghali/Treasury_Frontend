import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from 'services/apiService.js';
import { PlusCircle, Edit, Trash, RotateCcw, Loader2 } from 'lucide-react';
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
const buttonBaseClassNames = "inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200";


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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">{pageTitle}</h2>
        <GracePeriodTooltip isGracePeriod={isGracePeriod}>
            <button
              onClick={() => {
                const newUrl = userRole === 'system-owner' ? '/system-owner/lg-categories/universal/new' : '/corporate-admin/lg-categories/new';
                navigate(newUrl);
              }}
              className={`${buttonBaseClassNames} bg-blue-600 text-white hover:bg-blue-700 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isGracePeriod}
            >
              <PlusCircle className="h-5 w-5 mr-2" /> Add New {singularListName}
            </button>
        </GracePeriodTooltip>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="flex justify-end mb-4">
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 text-blue-600 rounded"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
          />
          <span className="ml-2 text-sm text-gray-700">Show Deleted Categories</span>
        </label>
      </div>

      {categories.length === 0 && !isLoading ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <p className="text-gray-500">No {pageTitle.toLowerCase()} found. Click "Add New {singularListName}" to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                {!isSystemOwner && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                )}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Extra Field Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mandatory?
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Communication List
                </th>
                {!isSystemOwner && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Applies To Entities
                    </th>
                )}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category.id} className={category.is_deleted ? 'bg-gray-50 opacity-60' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {category.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {category.code || 'N/A'}
                  </td>
                  {!isSystemOwner && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {category.customer_id === null ? 'Universal' : 'Customer-specific'}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {category.extra_field_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {category.is_mandatory ? 'Yes' : 'No'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {Array.isArray(category.communication_list) && category.communication_list.length > 0
                      ? category.communication_list.join(', ')
                      : 'N/A'}
                  </td>
                  {!isSystemOwner && (
                    <td className="px-6 py-4 text-sm text-gray-500">
                        {category.has_all_entity_access ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                All Entities
                            </span>
                        ) : (
                            Array.isArray(category.entities_with_access) && category.entities_with_access.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                    {category.entities_with_access.map(entity => (
                                        <span key={entity.id} className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {category.is_deleted ? (
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
                    {category.customer_id === null && !isSystemOwner ? (
                        <span className="text-gray-400">System Default</span>
                    ) : (
                        category.is_deleted ? (
                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                <button
                                    onClick={() => handleRestore(category)}
                                    className={`text-green-600 hover:text-green-900 p-1 rounded-md hover:bg-gray-100 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title="Restore"
                                    disabled={isGracePeriod}
                                >
                                    <RotateCcw className="h-5 w-5" />
                                </button>
                            </GracePeriodTooltip>
                        ) : (
                        <>
                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                <button
                                    onClick={() => handleEdit(category)}
                                    className={`text-indigo-600 hover:text-indigo-900 mr-3 p-1 rounded-md hover:bg-gray-100 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title="Edit"
                                    disabled={isGracePeriod}
                                >
                                    <Edit className="h-5 w-5" />
                                </button>
                            </GracePeriodTooltip>
                            <GracePeriodTooltip isGracePeriod={isGracePeriod}>
                                <button
                                    onClick={() => handleDelete(category)}
                                    className={`text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-gray-100 ${isGracePeriod ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title="Delete"
                                    disabled={isGracePeriod}
                                >
                                    <Trash className="h-5 w-5" />
                                </button>
                            </GracePeriodTooltip>
                        </>
                        )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default LGCategoryList;