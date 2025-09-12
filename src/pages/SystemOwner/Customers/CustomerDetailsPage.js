import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from 'services/apiService.js';
import { Edit, PlusCircle, Trash, RotateCcw, Eye, ToggleLeft, ToggleRight, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

// Common input field styling classes
const inputClassNames = "mb-2 mt-1 block w-full text-base px-3 py-2 rounded-md border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200";
const labelClassNames = "block text-sm font-medium text-gray-700";

// A single form component for adding and editing a user.
const UserForm = ({ customerId, userToEdit, onUserSaved, onCancel, customerEntities }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'end_user',
    has_all_entity_access: true,
    entity_ids: [],
    must_change_password: true,
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        email: userToEdit.email,
        role: userToEdit.role,
        has_all_entity_access: userToEdit.has_all_entity_access,
        entity_ids: userToEdit.entities_with_access.map(e => e.id),
        must_change_password: userToEdit.must_change_password,
        password: '',
      });
      setShowPasswordFields(false);
    } else {
      setFormData({
        email: '',
        password: '',
        role: 'end_user',
        has_all_entity_access: true,
        entity_ids: [],
        must_change_password: true,
      });
      setShowPasswordFields(true);
    }
  }, [userToEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleEntityAccessChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      has_all_entity_access: value === 'all',
      entity_ids: value === 'all' ? [] : prev.entity_ids
    }));
  };

  const handleEntitySelection = (e) => {
    const entityId = parseInt(e.target.value, 10);
    setFormData(prev => {
      const newEntityIds = e.target.checked ? [...prev.entity_ids, entityId] : prev.entity_ids.filter(id => id !== entityId);
      return { ...prev, entity_ids: newEntityIds };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const isNewUser = !userToEdit;

      if (isNewUser && (!formData.email || !formData.role)) {
        setError('Email and Role are required.');
        setIsSaving(false);
        return;
      }
      
      // Password validation for both new and edited users
      if (showPasswordFields) {
        if (!formData.password) {
          setError('Password is required.');
          setIsSaving(false);
          return;
        }
        if (formData.password.length < 8) {
          setError('Password must be at least 8 characters long.');
          setIsSaving(false);
          return;
        }
        if (formData.password !== confirmPassword) {
          setError('Passwords do not match.');
          setIsSaving(false);
          return;
        }
      }

      if (!formData.has_all_entity_access && formData.entity_ids.length === 0) {
        setError('Please select at least one entity or grant access to all entities.');
        setIsSaving(false);
        return;
      }

      const payload = { ...formData };
      if (!showPasswordFields || !formData.password) {
        delete payload.password;
      }
      if (payload.has_all_entity_access) {
        delete payload.entity_ids;
      }
      
      if (isNewUser) {
        await apiRequest(`/system-owner/customers/${customerId}/users/`, 'POST', payload);
        toast.success('User created successfully!');
      } else {
        await apiRequest(`/system-owner/users/${userToEdit.id}`, 'PUT', payload);
        toast.success('User updated successfully!');
      }
      
      onUserSaved();
      onCancel();
    } catch (err) {
      console.error("Failed to save user:", err);
      setError(`Failed to save user: ${err.message || 'An unexpected error occurred.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 border border-blue-200 rounded-md bg-blue-50 mb-4">
      <h4 className="text-md font-semibold text-gray-700 mb-2">{userToEdit ? 'Edit User' : 'Add New User'}</h4>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mt-4">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label htmlFor="user-email" className={labelClassNames}>Email</label>
          <input type="email" name="email" id="user-email" value={formData.email} onChange={handleChange} required className={inputClassNames} disabled={!!userToEdit} />
        </div>
        <div>
          <label htmlFor="user-role" className={labelClassNames}>Role</label>
          <select name="role" id="user-role" value={formData.role} onChange={handleChange} required className={inputClassNames}>
            <option value="corporate_admin">Corporate Admin</option>
            <option value="end_user">End User</option>
            <option value="checker">Checker</option>
          </select>
        </div>
      </div>
      
      {/* Password fields for both new and edited users */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <div className="flex justify-between items-center mb-2">
            <h4 className="text-md font-semibold text-gray-700">Password</h4>
            {userToEdit && (
                <button type="button" onClick={() => setShowPasswordFields(!showPasswordFields)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    {showPasswordFields ? 'Hide Password Fields' : 'Change Password'}
                </button>
            )}
        </div>

        {(userToEdit && !showPasswordFields) ? (
            <p className="text-sm text-gray-500">Password is not being changed.</p>
        ) : (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="user-password" className={labelClassNames}>Password</label>
                        <input type="password" name="password" id="user-password" value={formData.password} onChange={handleChange} required={showPasswordFields} className={inputClassNames} />
                    </div>
                    <div>
                        <label htmlFor="confirm-password" className={labelClassNames}>Confirm Password</label>
                        <input type="password" name="confirm-password" id="confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required={showPasswordFields} className={inputClassNames} />
                    </div>
                </div>
                <div className="flex items-center mt-3">
                    <input id="must-change-password" name="must_change_password" type="checkbox" checked={formData.must_change_password} onChange={handleChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                    <label htmlFor="must-change-password" className="ml-2 block text-sm text-gray-900">
                        Require password change on next login
                    </label>
                </div>
            </>
        )}
      </div>

      <div className="border-t border-gray-200 pt-4 mt-4">
        <h4 className="text-md font-semibold text-gray-700 mb-2">Entity Access</h4>
        <div className="space-y-2">
            <div className="flex items-center">
              <input
                id="access_all_entities"
                name="entity_access_type"
                type="radio"
                value="all"
                checked={formData.has_all_entity_access}
                onChange={handleEntityAccessChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <label htmlFor="access_all_entities" className="ml-2 block text-sm text-gray-900">
                Access all entities
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="access_specific_entities"
                name="entity_access_type"
                type="radio"
                value="specific"
                checked={!formData.has_all_entity_access}
                onChange={handleEntityAccessChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <label htmlFor="access_specific_entities" className="ml-2 block text-sm text-gray-900">
                Access specific entities
              </label>
            </div>
          </div>
        
        {!formData.has_all_entity_access && (
          <div className="mt-2 pl-4">
            {customerEntities.map(entity => (
              <div key={entity.id} className="flex items-center mt-1">
                <input
                  id={`entity-access-${entity.id}`}
                  type="checkbox"
                  value={entity.id}
                  checked={formData.entity_ids.includes(entity.id)}
                  onChange={handleEntitySelection}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={`entity-access-${entity.id}`} className="ml-2 text-sm text-gray-900">
                  {entity.entity_name} ({entity.code})
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-2 mt-4">
        <button type="button" onClick={onCancel} className="btn-secondary px-3 py-1.5 text-sm">Cancel</button>
        <button type="submit" className="btn-primary px-3 py-1.5 text-sm flex items-center">
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {userToEdit ? 'Update User' : 'Add User'}
        </button>
      </div>
    </form>
  );
};


function CustomerDetailsPage({ onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [entities, setEntities] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // State for Customer Core Details Editing
  const [showEditCustomerForm, setShowEditCustomerForm] = useState(false);
  const [customerEditFormData, setCustomerEditFormData] = useState({
    name: '',
    address: '',
    contact_email: '',
    contact_phone: '',
    subscription_plan_id: '',
  });
  const [availableSubscriptionPlans, setAvailableSubscriptionPlans] = useState([]);
  const [isUpdatingCustomer, setIsUpdatingCustomer] = useState(false);

  // State for Customer Entity Management
  const [showAddEditEntityForm, setShowAddEditEntityForm] = useState(false);
  const [currentEntityFormData, setCurrentEntityFormData] = useState({
    entity_name: '',
    code: '',
    contact_person: '',
    contact_email: '',
    is_active: true,
    address: '',
    commercial_register_number: '',
    tax_id: '',
  });
  const [editingEntityId, setEditingEntityId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  // State for User Management
  const [showUserForm, setShowUserForm] = useState(false);

  // Fetch customer details and entities
  const fetchCustomerDetails = async () => {
    setIsLoading(true);
    setError('');
    try {
      const customerResponse = await apiRequest(`/system-owner/customers/${id}`, 'GET');
      setCustomer(customerResponse);
      setEntities(customerResponse.entities);
      setUsers(customerResponse.users);
      
      setCustomerEditFormData({
        name: customerResponse.name,
        address: customerResponse.address || '',
        contact_email: customerResponse.contact_email,
        contact_phone: customerResponse.contact_phone || '',
        subscription_plan_id: customerResponse.subscription_plan?.id || '',
      });
    } catch (err) {
      console.error('Failed to fetch customer details:', err);
      setError(`Failed to load customer details. ${err.message || ''}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch subscription plans on component mount
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const plans = await apiRequest('/system-owner/subscription-plans', 'GET');
        setAvailableSubscriptionPlans(plans);
      } catch (err) {
        console.error('Failed to fetch subscription plans:', err);
        setError('Failed to load subscription plans for customer editing.');
      }
    };
    fetchPlans();
  }, []);

  // Effect to fetch customer details when ID changes
  useEffect(() => {
    if (id) {
      fetchCustomerDetails();
    }
  }, [id]);

  // Handler to initiate edit mode for a user
  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowUserForm(true);
  };
  
  // Handler to clear the user form state
  const handleCancelUserForm = () => {
    setShowUserForm(false);
    setEditingUser(null);
  };

  // Handle change for customer core details form
  const handleCustomerEditFormChange = (e) => {
    const { name, value } = e.target;
    setCustomerEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle submission for customer core details update
  const handleUpdateCustomerSubmit = async (e) => {
    e.preventDefault();
    setIsUpdatingCustomer(true);
    setError('');

    try {
      await apiRequest(`/system-owner/customers/${id}`, 'PUT', customerEditFormData);
      toast.success('Customer details updated successfully!');
      setShowEditCustomerForm(false);
      fetchCustomerDetails();
    } catch (err) {
      console.error('Error updating customer:', err);
      setError(`Error updating customer: ${err.message || 'An unexpected error occurred.'}`);
    } finally {
      setIsUpdatingCustomer(false);
    }
  };

  // Handle form field changes for add/edit entity form
  const handleEntityFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentEntityFormData((prevData) => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Handle Add/Update Entity Submission
	const handleAddUpdateEntity = async (e) => {
		e.preventDefault();
		setError('');

		const cleanedFormData = { ...currentEntityFormData };
		for (const key of ['contact_person', 'contact_email', 'address', 'commercial_register_number', 'tax_id', 'code']) {
			if (cleanedFormData[key] === '') {
				cleanedFormData[key] = null;
			}
		}

		if (!cleanedFormData.entity_name.trim()) {
			setError('Entity name cannot be empty.');
			return;
		}

		if (cleanedFormData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedFormData.contact_email)) {
			setError('Invalid contact email format.');
			return;
		}

		try {
			if (editingEntityId) {
				await apiRequest(`/system-owner/customer-entities/${editingEntityId}`, 'PUT', cleanedFormData);
				toast.success('Entity updated successfully!');
			} else {
				if (customer && !customer.subscription_plan.can_multi_entity) {
					const activeEntitiesCount = entities.filter(e => !e.is_deleted && e.is_active).length;
					if (activeEntitiesCount >= 1) {
						setError(`Customer's plan does not support adding more entities. Max 1 active entity allowed.`);
						return;
					}
				}
				await apiRequest(`/system-owner/customers/${customer.id}/entities/`, 'POST', cleanedFormData);
				toast.success('Entity added successfully!');
			}
			setCurrentEntityFormData({
				entity_name: '',
				code: '',
				contact_person: '',
				contact_email: '',
				is_active: true,
				address: '',
				commercial_register_number: '',
				tax_id: '',
			});
			setEditingEntityId(null);
			setShowAddEditEntityForm(false);
			fetchCustomerDetails();
		} catch (err) {
			console.error('Failed to save entity:', err);
			setError(`Failed to save entity: ${err.message || 'An unexpected error occurred.'}`);
		}
	};

  // Handle Edit Entity (initiate edit mode)
  const handleEditEntityClick = (entity) => {
    setEditingEntityId(entity.id);
    setCurrentEntityFormData({
      entity_name: entity.entity_name,
      code: entity.code || '',
      contact_person: entity.contact_person || '',
      contact_email: entity.contact_email || '',
      is_active: entity.is_active,
      address: entity.address || '',
      commercial_register_number: entity.commercial_register_number || '',
      tax_id: entity.tax_id || '',
    });
    setShowAddEditEntityForm(true);
  };

  // Handle Delete (Soft Delete) Entity
  const handleDeleteEntity = async (entityId, entityName) => {
    if (window.confirm(`Are you sure you want to soft-delete the entity "${entityName}"?`)) {
      try {
        await apiRequest(`/system-owner/customer-entities/${entityId}`, 'DELETE');
        fetchCustomerDetails();
        toast.success(`Entity "${entityName}" soft-deleted successfully.`);
      } catch (err) {
        console.error('Failed to soft-delete entity:', err);
        setError(`Failed to soft-delete entity "${entityName}". ${err.message || ''}`);
      }
    }
  };

  // Handle Restore Entity
  const handleRestoreEntity = async (entityId, entityName) => {
    if (window.confirm(`Are you sure you want to restore the entity "${entityName}"?`)) {
      try {
        await apiRequest(`/system-owner/customer-entities/${entityId}/restore`, 'POST');
        fetchCustomerDetails();
        toast.success(`Entity "${entityName}" restored successfully.`);
      } catch (err) {
        console.error('Failed to restore entity:', err);
        setError(`Failed to restore entity "${entityName}". ${err.message || ''}`);
      }
    }
  };

  // Handle Toggle Active Status
  const handleToggleActive = async (entityId, entityName, currentStatus) => {
    if (!customer.subscription_plan?.can_multi_entity && currentStatus === true) {
      const activeEntitiesCount = entities.filter(e => !e.is_deleted && e.is_active && e.id !== entityId).length;
      if (activeEntitiesCount === 0) {
        setError("Cannot deactivate the last active entity for a customer on a single-entity plan.");
        return;
      }
    }

    if (window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} the entity "${entityName}"?`)) {
        try {
            await apiRequest(`/system-owner/customer-entities/${entityId}`, 'PUT', { is_active: !currentStatus });
            toast.success(`Entity "${entityName}" status updated successfully.`);
            fetchCustomerDetails();
        }
        catch (err) {
            console.error('Failed to toggle entity active status:', err);
            setError(`Failed to change status for "${entityName}". ${err.message || ''}`);
        }
    }
  };

  const handleUserAction = async (action, userId, userEmail) => {
    if (action === 'delete') {
      if (window.confirm(`Are you sure you want to soft-delete the user "${userEmail}"?`)) {
        try {
          await apiRequest(`/system-owner/users/${userId}`, 'DELETE');
          toast.success(`User "${userEmail}" soft-deleted successfully.`);
          fetchCustomerDetails();
        } catch (err) {
          console.error('Failed to delete user:', err);
          setError(`Failed to delete user: ${err.message || ''}`);
        }
      }
    } else if (action === 'restore') {
      if (window.confirm(`Are you sure you want to restore the user "${userEmail}"?`)) {
        try {
          await apiRequest(`/system-owner/users/${userId}/restore`, 'POST');
          toast.success(`User "${userEmail}" restored successfully.`);
          fetchCustomerDetails();
        } catch (err) {
          console.error('Failed to restore user:', err);
          setError(`Failed to restore user: ${err.message || ''}`);
        }
      }
    }
  };


  if (isLoading) {
    return (
      <div onLogout={onLogout}>
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 text-blue-600 mx-auto animate-spin" />
          <p className="text-gray-600 mt-2">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div onLogout={onLogout}>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div onLogout={onLogout}>
        <div className="text-center py-8 text-gray-500">Customer not found.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Customer Details: {customer.name}</h2>
        <button
          onClick={() => navigate('/system-owner/customers')}
          className="btn-secondary px-4 py-2"
        >
          Back to Customers
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Customer Information Section */}
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium text-gray-800">Basic Information</h3>
          <button
            onClick={() => setShowEditCustomerForm(!showEditCustomerForm)}
            className="btn-secondary px-3 py-1.5 text-sm flex items-center"
          >
            {showEditCustomerForm ? 'Hide Edit Form' : <><Edit className="h-4 w-4 mr-2" /> Edit Customer Details</>}
          </button>
        </div>

        {showEditCustomerForm ? (
          <form onSubmit={handleUpdateCustomerSubmit} className="space-y-4 p-4 border border-blue-200 rounded-md bg-blue-50 mb-4">
            <h4 className="text-md font-semibold text-gray-700 mb-2">Edit Customer: {customer.name}</h4>
            <div>
              <label htmlFor="edit_customer_name" className="block text-sm font-medium text-gray-700">Organization Name</label>
              <input
                type="text"
                name="name"
                id="edit_customer_name"
                value={customerEditFormData.name}
                onChange={handleCustomerEditFormChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="edit_address" className="block text-sm font-medium text-gray-700">Address</label>
              <input
                type="text"
                name="address"
                id="edit_address"
                value={customerEditFormData.address}
                onChange={handleCustomerEditFormChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="edit_contact_email" className="block text-sm font-medium text-gray-700">Contact Email</label>
              <input
                type="email"
                name="contact_email"
                id="edit_contact_email"
                value={customerEditFormData.contact_email}
                onChange={handleCustomerEditFormChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="edit_contact_phone" className="block text-sm font-medium text-gray-700">Contact Phone</label>
              <input
                type="text"
                name="contact_phone"
                id="edit_contact_phone"
                value={customerEditFormData.contact_phone}
                onChange={handleCustomerEditFormChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="edit_subscription_plan_id" className="block text-sm font-medium text-gray-700">Subscription Plan</label>
              <select
                name="subscription_plan_id"
                id="edit_subscription_plan_id"
                value={customerEditFormData.subscription_plan_id}
                onChange={handleCustomerEditFormChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              >
                {availableSubscriptionPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} (Max Users: {plan.max_users}, Max Records: {plan.max_records}, Multi-Entity: {plan.can_multi_entity ? 'Yes' : 'No'})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                type="button"
                onClick={() => setShowEditCustomerForm(false)}
                className="btn-secondary px-3 py-1.5 text-sm"
                disabled={isUpdatingCustomer}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-3 py-1.5 text-sm flex items-center justify-center"
                disabled={isUpdatingCustomer}
              >
                {isUpdatingCustomer && (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin text-white" />
                )}
                {isUpdatingCustomer ? 'Updating...' : 'Update Customer'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <p className="text-gray-700"><span className="font-semibold">ID:</span> {customer.id}</p>
            <p className="text-gray-700"><span className="font-semibold">Organization Name:</span> {customer.name}</p>
            <p className="text-gray-700"><span className="font-semibold">Address:</span> {customer.address || 'N/A'}</p>
            <p className="text-gray-700"><span className="font-semibold">Contact Email:</span> {customer.contact_email}</p>
            <p className="text-gray-700"><span className="font-semibold">Contact Phone:</span> {customer.contact_phone || 'N/A'}</p>
            <p className="text-gray-700"><span className="font-semibold">Subscription Plan:</span> {customer.subscription_plan ? customer.subscription_plan.name : 'N/A'}</p>
            <p className="text-gray-700"><span className="font-semibold">Created At:</span> {new Date(customer.created_at).toLocaleDateString()}</p>
            {customer.is_deleted && <p className="text-red-600 font-semibold">Status: Deleted</p>}
          </div>
        )}
      </div>

      {/* Customer Entities Section */}
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium text-gray-800">Customer Entities</h3>
          {customer.subscription_plan?.can_multi_entity && (
            <button
              onClick={() => {
                setShowAddEditEntityForm(!showAddEditEntityForm);
                if (!showAddEditEntityForm) {
                  setEditingEntityId(null);
                  setCurrentEntityFormData({
                    entity_name: '',
                    code: '',
                    contact_person: '',
                    contact_email: '',
                    is_active: true,
                    address: '',
                    commercial_register_number: '',
                    tax_id: ''
                  });
                  setError('');
                }
              }}
              className="btn-secondary px-3 py-1.5 text-sm flex items-center"
            >
              {showAddEditEntityForm ? 'Hide Form' : <><PlusCircle className="h-4 w-4 mr-2" /> Add New Entity</>}
            </button>
          )}
          {!customer.subscription_plan?.can_multi_entity && (
            <p className="text-sm text-gray-500">Only one active entity allowed per plan.</p>
          )}
        </div>

        {showAddEditEntityForm && (
          <form onSubmit={handleAddUpdateEntity} className="space-y-3 p-4 border border-blue-200 rounded-md bg-blue-50 mb-4">
            <h4 className="text-md font-semibold text-gray-700 mb-2">{editingEntityId ? `Edit Entity: ${currentEntityFormData.entity_name}` : 'Add New Entity'}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="entity_name" className="block text-sm font-medium text-gray-700">Entity Name</label>
                <input
                  type="text"
                  name="entity_name"
                  id="entity_name"
                  value={currentEntityFormData.entity_name}
                  onChange={handleEntityFormChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">Code (Optional)</label>
                <input
                  type="text"
                  name="code"
                  id="code"
                  value={currentEntityFormData.code}
                  onChange={handleEntityFormChange}
                  maxLength="4"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address (Optional)</label>
                <input
                  type="text"
                  name="address"
                  id="address"
                  value={currentEntityFormData.address}
                  onChange={handleEntityFormChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div>
                <label htmlFor="commercial_register_number" className="block text-sm font-medium text-gray-700">Commercial Register Number (Optional)</label>
                <input
                  type="text"
                  name="commercial_register_number"
                  id="commercial_register_number"
                  value={currentEntityFormData.commercial_register_number}
                  onChange={handleEntityFormChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div>
                <label htmlFor="tax_id" className="block text-sm font-medium text-gray-700">Tax ID (Optional)</label>
                <input
                  type="text"
                  name="tax_id"
                  id="tax_id"
                  value={currentEntityFormData.tax_id}
                  onChange={handleEntityFormChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div>
                <label htmlFor="contact_person" className="block text-sm font-medium text-gray-700">Contact Person (Optional)</label>
                <input
                  type="text"
                  name="contact_person"
                  id="contact_person"
                  value={currentEntityFormData.contact_person}
                  onChange={handleEntityFormChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div>
                <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700">Contact Email (Optional)</label>
                <input
                  type="email"
                  name="contact_email"
                  id="contact_email"
                  value={currentEntityFormData.contact_email}
                  onChange={handleEntityFormChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
            </div>
            <div className="flex items-center mt-2">
              <input
                id="is_active"
                name="is_active"
                type="checkbox"
                checked={currentEntityFormData.is_active}
                onChange={handleEntityFormChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Is Active
              </label>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowAddEditEntityForm(false);
                  setEditingEntityId(null);
                  setCurrentEntityFormData({
                    entity_name: '',
                    code: '',
                    contact_person: '',
                    contact_email: '',
                    is_active: true,
                    address: '',
                    commercial_register_number: '',
                    tax_id: ''
                  });
                  setError('');
                }}
                className="btn-secondary px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary px-3 py-1.5 text-sm">
                {editingEntityId ? 'Update Entity' : 'Create Entity'}
              </button>
            </div>
          </form>
        )}

        {entities.length === 0 && !showAddEditEntityForm ? (
          <p className="text-gray-500 italic">No entities found for this customer.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entity Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commercial Register No.
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tax ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Person
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Email
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
                {entities.map((entity) => (
                  <tr key={entity.id} className={entity.is_deleted ? 'bg-gray-50 opacity-60' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entity.entity_name} {entity.is_deleted && <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Deleted</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entity.code || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entity.address || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entity.commercial_register_number || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entity.tax_id || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entity.contact_person || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entity.contact_email || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entity.is_active ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {/* Toggle Active/Inactive */}
                      {!entity.is_deleted && (
                        <button
                          onClick={() => handleToggleActive(entity.id, entity.entity_name, entity.is_active)}
                          className={`p-1 rounded-md hover:bg-gray-100 mr-3 ${entity.is_active ? 'text-gray-500 hover:text-gray-700' : 'text-blue-600 hover:text-blue-800'}`}
                          title={entity.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {entity.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                        </button>
                      )}
                      {entity.is_deleted ? (
                        <button
                          onClick={() => handleRestoreEntity(entity.id, entity.entity_name)}
                          className="text-green-600 hover:text-green-900 p-1 rounded-md hover:bg-gray-100"
                          title="Restore Entity"
                        >
                          <RotateCcw className="h-5 w-5" />
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditEntityClick(entity)}
                            className="text-indigo-600 hover:text-indigo-900 mr-3 p-1 rounded-md hover:bg-gray-100"
                            title="Edit Entity"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntity(entity.id, entity.entity_name)}
                            className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-gray-100"
                            title="Delete Entity"
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
        )}
      </div>

      {/* Customer Users Section (with actions) */}
      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium text-gray-800">Customer Users ({users.length})</h3>
          <button
            onClick={() => {
              setShowUserForm(!showUserForm);
              setEditingUser(null);
            }}
            className="btn-secondary px-3 py-1.5 text-sm flex items-center"
          >
            {showUserForm ? 'Hide Form' : <><PlusCircle className="h-4 w-4 mr-2" /> Add New User</>}
          </button>
        </div>

        {showUserForm && (
          <UserForm 
            customerId={id} 
            userToEdit={editingUser}
            onUserSaved={fetchCustomerDetails} 
            onCancel={handleCancelUserForm} 
            customerEntities={entities} 
          />
        )}
        
        {users.length === 0 && !showUserForm ? (
          <p className="text-gray-500 italic">No users found for this customer.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entity Access
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
                {users.map((user) => (
                  <tr key={user.id} className={user.is_deleted ? 'bg-gray-50 opacity-60' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{user.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.has_all_entity_access ? 'All Entities' : user.entities_with_access.map(e => e.entity_name).join(', ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.is_deleted ? (
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
                      {user.is_deleted ? (
                        <button onClick={() => handleUserAction('restore', user.id, user.email)} className="text-green-600 hover:text-green-900 p-1 rounded-md hover:bg-gray-100" title="Restore User">
                          <RotateCcw className="h-5 w-5" />
                        </button>
                      ) : (
                        <>
                          <button onClick={() => handleEditUser(user)} className="text-indigo-600 hover:text-indigo-900 mr-3 p-1 rounded-md hover:bg-gray-100" title="Edit User">
                            <Edit className="h-5 w-5" />
                          </button>
                          <button onClick={() => handleUserAction('delete', user.id, user.email)} className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-gray-100" title="Delete User">
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
        )}
      </div>
    </div>
  );
}

export default CustomerDetailsPage;