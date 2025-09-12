// src/pages/SystemOwner/Customers/CustomerUserManagement.js
import React, { useState, useEffect } from 'react';
import { apiRequest, deleteUserBySystemOwner, restoreUserBySystemOwner } from 'services/apiService.js';
import { PlusCircle, Edit, Trash, RotateCcw, XCircle } from 'lucide-react';

const inputClassNames = "mb-2 mt-1 block w-full text-base px-3 py-2 rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200";
const labelClassNames = "block text-sm font-medium text-gray-700";

function CustomerUserManagement({ customerId }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'end_user',
    has_all_entity_access: true,
    entity_ids: [],
    must_change_password: true,
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiRequest(`/system-owner/users/?customer_id=${customerId}`, 'GET');
      setUsers(response);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(`Failed to load users. ${err.message || ''}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [customerId]);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      role: user.role,
      has_all_entity_access: user.has_all_entity_access,
      entity_ids: user.entities_with_access.map(e => e.id),
      must_change_password: user.must_change_password,
    });
    setShowForm(true);
  };

  const handleDelete = async (userId, userEmail) => {
    if (window.confirm(`Are you sure you want to soft-delete the user "${userEmail}"?`)) {
      try {
        await deleteUserBySystemOwner(userId);
        alert(`User "${userEmail}" soft-deleted successfully.`);
        fetchUsers();
      } catch (err) {
        console.error('Failed to delete user:', err);
        setError(`Failed to delete user "${userEmail}". ${err.message || ''}`);
      }
    }
  };

  const handleRestore = async (userId, userEmail) => {
    if (window.confirm(`Are you sure you want to restore the user "${userEmail}"?`)) {
      try {
        await restoreUserBySystemOwner(userId);
        alert(`User "${userEmail}" restored successfully.`);
        fetchUsers();
      } catch (err) {
        console.error('Failed to restore user:', err);
        setError(`Failed to restore user "${userEmail}". ${err.message || ''}`);
      }
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    // Simplified, needs full implementation with password validation, etc.
    // For now, it's a basic demonstration.
    if (editingUser) {
      // Update logic
      // ...
    } else {
      // Create logic
      // ...
    }
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium text-gray-800">Customer Users ({users.length})</h3>
        <button
          onClick={() => { setShowForm(!showForm); setEditingUser(null); }}
          className="btn-secondary px-3 py-1.5 text-sm flex items-center"
        >
          {showForm ? 'Cancel' : <><PlusCircle className="h-4 w-4 mr-2" /> Add New User</>}
        </button>
      </div>
      
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4">{error}</div>}

      {showForm && (
        <form onSubmit={handleFormSubmit} className="space-y-4 p-4 border border-blue-200 rounded-md bg-blue-50 mb-4">
          <h4 className="text-md font-semibold text-gray-700 mb-2">{editingUser ? 'Edit User' : 'Add New User'}</h4>
          <div>
            <label htmlFor="email" className={labelClassNames}>Email</label>
            <input type="email" name="email" id="email" value={formData.email} onChange={handleFormChange} required className={inputClassNames} disabled={!!editingUser} />
          </div>
          <div>
            <label htmlFor="role" className={labelClassNames}>Role</label>
            <select name="role" id="role" value={formData.role} onChange={handleFormChange} required className={inputClassNames}>
              <option value="corporate_admin">Corporate Admin</option>
              <option value="end_user">End User</option>
            </select>
          </div>
          {!editingUser && (
            <div>
              <label htmlFor="password" className={labelClassNames}>Password</label>
              <input type="password" name="password" id="password" value={formData.password} onChange={handleFormChange} required className={inputClassNames} />
            </div>
          )}
          <div className="flex justify-end space-x-2 mt-4">
            <button type="submit" className="btn-primary px-3 py-1.5 text-sm">
              {editingUser ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      )}

      {users.length === 0 && !showForm ? (
        <p className="text-gray-500 italic">No users found for this customer.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className={user.is_deleted ? 'bg-gray-50 opacity-60' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{user.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.is_deleted ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Deleted</span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {user.is_deleted ? (
                      <button onClick={() => handleRestore(user.id, user.email)} className="text-green-600 hover:text-green-900 mr-3 p-1 rounded-md hover:bg-gray-100" title="Restore User"><RotateCcw className="h-5 w-5" /></button>
                    ) : (
                      <>
                        <button onClick={() => handleEditClick(user)} className="text-indigo-600 hover:text-indigo-900 mr-3 p-1 rounded-md hover:bg-gray-100" title="Edit User"><Edit className="h-5 w-5" /></button>
                        <button onClick={() => handleDelete(user.id, user.email)} className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-gray-100" title="Delete User"><Trash className="h-5 w-5" /></button>
                      </>
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

export default CustomerUserManagement;