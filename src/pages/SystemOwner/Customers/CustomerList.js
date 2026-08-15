import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest } from 'services/apiService.js'; // Use absolute path
import { PlusCircle, Edit, Trash, RotateCcw, Eye } from 'lucide-react'; // Added Eye icon

// NOTE: This component no longer includes its own Layout wrapper.
// The Layout (SidebarLayout) is applied at a higher level in App.js via ProtectedLayout.
function CustomerList({ onLogout }) { // onLogout is passed from the parent Layout
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [error, setError] = useState('');

  const fetchCustomers = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Fetch customers, including their relations (entities, users, subscription_plan)
      const response = await apiRequest('/system-owner/customers', 'GET');
      setCustomers(response);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      setError(`Failed to load customers. ${err.message || ''}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleDelete = async (customerId, customerName) => {
    if (window.confirm(`Are you sure you want to soft-delete the customer "${customerName}"? This will also soft-delete all associated entities and users.`)) {
      try {
        setIsLoading(true);
        await apiRequest(`/system-owner/customers/${customerId}`, 'DELETE');
        alert(`Customer "${customerName}" soft-deleted successfully.`);
        fetchCustomers(); // Refresh the list
      } catch (err) {
        console.error('Failed to soft-delete customer:', err);
        setError(`Failed to soft-delete customer "${customerName}". ${err.message || ''}`);
        setIsLoading(false);
      }
    }
  };

  const handleRestore = async (customerId, customerName) => {
    if (window.confirm(`Are you sure you want to restore the customer "${customerName}"? This will also reactivate associated entities and users.`)) {
      try {
        setIsLoading(true);
        await apiRequest(`/system-owner/customers/${customerId}/restore`, 'POST');
        alert(`Customer "${customerName}" restored successfully.`);
        fetchCustomers(); // Refresh the list
      } catch (err) {
        console.error('Failed to restore customer:', err);
        setError(`Failed to restore customer "${customerName}". ${err.message || ''}`);
        setIsLoading(false);
      }
    }
  };

  const handleViewDetails = (customerId) => {
    navigate(`/system-owner/customers/${customerId}/details`);
  };

  const filteredCustomers = useMemo(() => {
    if (showDeleted) return customers;
    return customers.filter(c => !c.is_deleted);
  }, [customers, showDeleted]);

  const deletedCount = useMemo(() => customers.filter(c => c.is_deleted).length, [customers]);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-gray-600 mt-2">Loading customers...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Customer Management</h2>
        <div className="flex flex-wrap items-center gap-3">
          {deletedCount > 0 && (
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs sm:text-sm text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={showDeleted} onChange={() => setShowDeleted(!showDeleted)} />
                <div className={`w-8 h-4 rounded-full transition-colors ${showDeleted ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${showDeleted ? 'translate-x-4' : ''}`}></div>
              </div>
              Deleted ({deletedCount})
            </label>
          )}
          <button
            onClick={() => navigate('/system-owner/customers/onboard')}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-xs sm:text-sm font-semibold rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 w-full sm:w-auto"
          >
            <PlusCircle className="h-4 w-4 mr-1.5" /> Onboard New Customer
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4 text-xs sm:text-sm" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {filteredCustomers.length === 0 && !isLoading ? (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
          <p className="text-gray-500 text-sm">No customers found. Click "Onboard New Customer" to get started.</p>
        </div>
      ) : (
        <>
          {/* MOBILE CARDS (screen < md) */}
          <div className="md:hidden space-y-3">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => !customer.is_deleted && handleViewDetails(customer.id)}
                className={`bg-white rounded-xl p-4 shadow-sm border border-gray-200 space-y-3 transition-all ${
                  customer.is_deleted ? 'opacity-60 bg-gray-50' : 'hover:border-blue-300 hover:shadow-md cursor-pointer'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm truncate">{customer.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{customer.contact_email}</p>
                  </div>
                  {customer.is_deleted ? (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-800 shrink-0">Deleted</span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800 shrink-0">
                      {customer.subscription_plan?.name || 'Active'}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Entities</span>
                    <span className="font-bold text-gray-800">{customer.entities?.length || 0}</span>
                  </div>
                  <div className="border-l border-gray-200 pl-3">
                    <span className="text-gray-400 block text-[10px] uppercase">Users</span>
                    <span className="font-bold text-gray-800">{customer.users?.length || 0}</span>
                  </div>
                  <div className="border-l border-gray-200 pl-3">
                    <span className="text-gray-400 block text-[10px] uppercase">Plan</span>
                    <span className="font-bold text-gray-800 truncate max-w-[100px]">{customer.subscription_plan?.name || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleViewDetails(customer.id); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
                  >
                    <Eye className="h-3.5 w-3.5" /> View
                  </button>
                  {customer.is_deleted ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRestore(customer.id, customer.name); }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 rounded-lg hover:bg-green-100"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Restore
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(customer.id, customer.name); }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded-lg hover:bg-red-100"
                    >
                      <Trash className="h-3.5 w-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP TABLE (screen >= md) */}
          <div className="hidden md:block overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Customer Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contact Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Plan</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Entities</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Users</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr 
                    key={customer.id} 
                    className={`cursor-pointer hover:bg-blue-50/60 transition-colors ${customer.is_deleted ? 'bg-gray-50 opacity-60' : ''}`}
                    onClick={() => !customer.is_deleted && handleViewDetails(customer.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {customer.name} {customer.is_deleted && <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Deleted</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.contact_email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.subscription_plan ? customer.subscription_plan.name : 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{customer.entities?.length || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{customer.users?.length || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleViewDetails(customer.id); }}
                        className="text-blue-600 hover:text-blue-900 mr-3 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {customer.is_deleted ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRestore(customer.id, customer.name); }}
                          className="text-green-600 hover:text-green-900 p-1.5 rounded-lg hover:bg-green-50 transition-colors"
                          title="Restore Customer"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(customer.id, customer.name); }}
                          className="text-red-600 hover:text-red-900 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete Customer"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default CustomerList;
