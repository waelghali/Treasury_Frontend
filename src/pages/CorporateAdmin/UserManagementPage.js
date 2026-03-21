// UserManagementPage.js

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../services/apiService';
import { PlusCircle, Edit, Trash2, RotateCcw, CheckCircle, XCircle, Users, Building2, ShieldCheck, Loader2, Shield } from 'lucide-react';
import { toast } from 'react-toastify';
import ApprovalMatrixModal from '../../components/Modals/ApprovalMatrixModal';

// A reusable component to provide a tooltip for disabled elements during the grace period.
const GracePeriodTooltip = ({ children, isGracePeriod }) => {
  if (isGracePeriod) {
    return (
      <div className="relative group inline-block">
        {children}
        <div className="opacity-0 w-max bg-gray-800 text-white text-xs rounded-lg py-2 px-3 absolute z-10 bottom-full left-1/2 -translate-x-1/2 pointer-events-none group-hover:opacity-100 transition-opacity duration-200">
          This action is disabled during your subscription's grace period.
          <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
            <polygon className="fill-current" points="0,0 127.5,127.5 255,0" />
          </svg>
        </div>
      </div>
    );
  }
  return children;
};

function UserManagementPage({ onLogout, isGracePeriod, currentUserId, hasIssuanceModule }) {
  const [activeTab, setActiveTab] = useState('users');

  // Data States
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [approvalGroups, setApprovalGroups] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Modal States for Departments & Groups
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showApprovalMatrixModal, setShowApprovalMatrixModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form States
  const [deptForm, setDeptForm] = useState({ name: '', manager_id: '' });
  const [groupForm, setGroupForm] = useState({ name: '', user_ids: [] });

  // --- Approval Matrix State ---
  const [matrixSteps, setMatrixSteps] = useState([]);
  const [availableMatrixUsers, setAvailableMatrixUsers] = useState([]);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  const [availableMatrixGroups, setAvailableMatrixGroups] = useState([]);
  const [isMatrixSaving, setIsMatrixSaving] = useState(false);
  const [editingStep, setEditingStep] = useState({
    condition_type: 'ALWAYS',
    condition_value: '',
    approver_type: 'DEPT_HEAD',
    approver_values: [],
    required_signatures: 1,
    currency_id: ''
  });
  const [editingMatrixIndex, setEditingMatrixIndex] = useState(null); // null = inserting, number = editing that index

  const selfId = currentUserId == null ? null : String(currentUserId);
  const [showDeleted, setShowDeleted] = useState(false);

  const filteredUsers = useMemo(() => {
    if (showDeleted) return users;
    return users.filter(u => !u.is_deleted);
  }, [users, showDeleted]);

  const deletedUserCount = useMemo(() => users.filter(u => u.is_deleted).length, [users]);

  const fetchAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const promises = [apiRequest('/corporate-admin/users', 'GET')];
      if (hasIssuanceModule) {
        promises.push(apiRequest('/corporate-admin/departments/', 'GET'));
        promises.push(apiRequest('/corporate-admin/approval-groups/', 'GET'));
      }

      const results = await Promise.all(promises);

      setUsers(results[0].sort((a, b) => a.is_deleted === b.is_deleted ? a.email.localeCompare(b.email) : (a.is_deleted ? 1 : -1)));
      if (hasIssuanceModule) {
        setDepartments(results[1] || []);
        setApprovalGroups(results[2] || []);
      }
    } catch (err) {
      console.error("Failed to fetch organization data:", err);
      setError(err.message || 'Failed to load organization data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // --- Fetch Approval Matrix Data when modal opens ---
  useEffect(() => {
    if (showApprovalMatrixModal && hasIssuanceModule) {
      const fetchMatrixData = async () => {
        try {
          const [matrixRes, usersRes, deptsRes, currsRes, groupsRes] = await Promise.all([
            apiRequest('/issuance/workflow-policies', 'GET').catch(() => []),
            apiRequest('/corporate-admin/users', 'GET').catch(() => []),
            apiRequest('/corporate-admin/departments', 'GET').catch(() => []),
            apiRequest('/corporate-admin/currencies', 'GET').catch(() => []),
            apiRequest('/corporate-admin/approval-groups/', 'GET').catch(() => [])
          ]);
          setMatrixSteps(Array.isArray(matrixRes) ? matrixRes : []);
          setAvailableMatrixUsers(Array.isArray(usersRes) ? usersRes.filter(u => !u.is_deleted && u.role !== 'end_user') : []);
          setAvailableDepartments(Array.isArray(deptsRes) ? deptsRes : []);
          setAvailableCurrencies(Array.isArray(currsRes) ? currsRes : []);
          setAvailableMatrixGroups(Array.isArray(groupsRes) ? groupsRes : []);
        } catch (error) {
          console.error("Failed to load matrix dependencies", error);
          toast.error("Failed to load approval matrix data.");
        }
      };
      fetchMatrixData();
    }
  }, [showApprovalMatrixModal, hasIssuanceModule]);

  const handleInsertMatrixStep = () => {
    if (editingMatrixIndex !== null) {
      // Update existing step in place
      const updated = [...matrixSteps];
      updated[editingMatrixIndex] = { ...editingStep };
      setMatrixSteps(updated);
      setEditingMatrixIndex(null);
    } else {
      // Insert new step
      setMatrixSteps([...matrixSteps, { ...editingStep }]);
    }
    setEditingStep({
      condition_type: 'ALWAYS',
      condition_value: '',
      approver_type: 'DEPT_HEAD',
      approver_values: [],
      required_signatures: 1,
      currency_id: ''
    });
  };

  const handleEditMatrixStep = (index) => {
    setEditingStep({ ...matrixSteps[index] });
    setEditingMatrixIndex(index);
  };

  const handleCancelEditMatrixStep = () => {
    setEditingMatrixIndex(null);
    setEditingStep({
      condition_type: 'ALWAYS',
      condition_value: '',
      approver_type: 'DEPT_HEAD',
      approver_values: [],
      required_signatures: 1,
      currency_id: ''
    });
  };

  const handleRemoveMatrixStep = (index) => {
    const updated = [...matrixSteps];
    updated.splice(index, 1);
    setMatrixSteps(updated);
    // If we were editing the removed step, cancel editing
    if (editingMatrixIndex === index) handleCancelEditMatrixStep();
    else if (editingMatrixIndex !== null && editingMatrixIndex > index) setEditingMatrixIndex(editingMatrixIndex - 1);
  };

  const handleSaveMatrix = async () => {
    setIsMatrixSaving(true);
    try {
      const sanitized = matrixSteps.map((step, idx) => ({
        step_sequence: idx + 1,
        condition_type: step.condition_type || 'ALWAYS',
        condition_value: step.condition_value || null,
        currency_id: step.currency_id ? parseInt(step.currency_id) : null,
        approver_type: step.approver_type || 'DEPT_HEAD',
        approver_values: step.approver_values || [],
        required_signatures: step.required_signatures || 1,
        is_active: true
      }));
      const result = await apiRequest('/issuance/workflow-policies', 'PUT', sanitized);
      if (result?.status === 'PENDING') {
        toast.info('Approval matrix change submitted for approval by a second administrator.');
      } else {
        toast.success("Approval matrix saved successfully!");
        // Display coverage gap warnings if any
        if (result?.warnings?.length > 0) {
          result.warnings.forEach(w => toast.warn(w, { autoClose: 10000 }));
        }
      }
      setShowApprovalMatrixModal(false);
    } catch (err) {
      toast.error("Failed to save matrix.");
    } finally {
      setIsMatrixSaving(false);
    }
  };

  // --- USER HANDLERS ---
  const handleEditUser = (userId) => {
    if (isGracePeriod) return toast.warn("Action disabled during grace period.");
    navigate(`/corporate-admin/users/edit/${userId}`);
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (String(userId) === selfId) return toast.error("You cannot delete your own account.");
    if (isGracePeriod) return toast.warn("Action disabled during grace period.");

    if (window.confirm(`Are you sure you want to soft-delete user: ${userEmail}?`)) {
      try {
        await apiRequest(`/corporate-admin/users/${userId}`, 'DELETE');
        toast.success(`User '${userEmail}' soft-deleted successfully.`);
        fetchAllData();
      } catch (err) { toast.error(err.message || "Failed to delete user."); }
    }
  };

  const handleRestoreUser = async (userId, userEmail) => {
    if (isGracePeriod) return toast.warn("Action disabled during grace period.");
    if (window.confirm(`Are you sure you want to restore user: ${userEmail}?`)) {
      try {
        await apiRequest(`/corporate-admin/users/${userId}/restore`, 'POST');
        toast.success(`User '${userEmail}' restored successfully.`);
        fetchAllData();
      } catch (err) { toast.error(err.message || "Failed to restore user."); }
    }
  };

  // --- DEPARTMENT HANDLERS ---
  const handleSaveDept = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: deptForm.name,
        manager_id: deptForm.manager_id ? parseInt(deptForm.manager_id) : null
      };
      if (editingItem) {
        const result = await apiRequest(`/corporate-admin/departments/${editingItem.id}`, 'PUT', payload);
        toast[result?.status === 'PENDING' ? 'info' : 'success'](result?.status === 'PENDING' ? 'Department update submitted for approval.' : 'Department updated.');
      } else {
        const result = await apiRequest('/corporate-admin/departments/', 'POST', payload);
        toast[result?.status === 'PENDING' ? 'info' : 'success'](result?.status === 'PENDING' ? 'Department creation submitted for approval.' : 'Department created.');
      }
      setShowDeptModal(false);
      fetchAllData();
    } catch (err) { toast.error(err.message || "Failed to save department."); }
  };

  const handleDeleteDept = async (id) => {
    if (!window.confirm("Delete this department?")) return;
    try {
      await apiRequest(`/corporate-admin/departments/${id}`, 'DELETE');
      toast.success("Department deleted.");
      fetchAllData();
    } catch (err) { toast.error("Failed to delete department."); }
  };

  // --- GROUP HANDLERS ---
  const handleSaveGroup = async (e) => {
    e.preventDefault();
    try {
      const payload = { name: groupForm.name, user_ids: groupForm.user_ids };
      if (editingItem) {
        const result = await apiRequest(`/corporate-admin/approval-groups/${editingItem.id}`, 'PUT', payload);
        toast[result?.status === 'PENDING' ? 'info' : 'success'](result?.status === 'PENDING' ? 'Group update submitted for approval.' : 'Group updated.');
      } else {
        const result = await apiRequest('/corporate-admin/approval-groups/', 'POST', payload);
        toast[result?.status === 'PENDING' ? 'info' : 'success'](result?.status === 'PENDING' ? 'Group creation submitted for approval.' : 'Group created.');
      }
      setShowGroupModal(false);
      fetchAllData();
    } catch (err) { toast.error(err.message || "Failed to save group."); }
  };

  const handleDeleteGroup = async (id) => {
    if (!window.confirm("Delete this group?")) return;
    try {
      await apiRequest(`/corporate-admin/approval-groups/${id}`, 'DELETE');
      toast.success("Group deleted.");
      fetchAllData();
    } catch (err) { toast.error("Failed to delete group."); }
  };

  const toggleGroupUser = (userId) => {
    setGroupForm(prev => {
      const current = prev.user_ids;
      return {
        ...prev,
        user_ids: current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId]
      };
    });
  };

  // --- RENDERERS ---
  const renderTabs = () => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button onClick={() => setActiveTab('users')} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
          <Users className="w-4 h-4 mr-2" /> Users
        </button>
        {hasIssuanceModule && (
          <>
            <button onClick={() => setActiveTab('departments')} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'departments' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
              <Building2 className="w-4 h-4 mr-2" /> Departments
            </button>
            <button onClick={() => setActiveTab('groups')} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'groups' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
              <ShieldCheck className="w-4 h-4 mr-2" /> Approval Groups
            </button>
          </>
        )}
      </div>
      {hasIssuanceModule && (
        <GracePeriodTooltip isGracePeriod={isGracePeriod}>
          <button
            onClick={() => setShowApprovalMatrixModal(true)}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 ${isGracePeriod ? 'opacity-50 pointer-events-none' : ''}`}
            disabled={isGracePeriod}
          >
            <Shield className="w-4 h-4 mr-2" /> Approval Matrix
          </button>
        </GracePeriodTooltip>
      )}
    </div>
  );

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-semibold text-gray-800">Organization & Teams</h1>

        {/* Dynamic Action Button based on Tab */}
        <GracePeriodTooltip isGracePeriod={isGracePeriod}>
          {activeTab === 'users' && (
            <div className="flex items-center gap-4">
              {deletedUserCount > 0 && (
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={showDeleted} onChange={() => setShowDeleted(!showDeleted)} />
                    <div className={`w-9 h-5 rounded-full transition-colors ${showDeleted ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showDeleted ? 'translate-x-4' : ''}`}></div>
                  </div>
                  Show Deleted ({deletedUserCount})
                </label>
              )}
              <Link to="/corporate-admin/users/new" className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 ${isGracePeriod ? 'opacity-50 pointer-events-none' : ''}`}>
                <PlusCircle className="h-4 w-4 mr-2" /> Add User
              </Link>
            </div>
          )}
          {activeTab === 'departments' && (
            <button onClick={() => { setEditingItem(null); setDeptForm({ name: '', manager_id: '' }); setShowDeptModal(true); }} className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 ${isGracePeriod ? 'opacity-50 pointer-events-none' : ''}`}>
              <PlusCircle className="h-4 w-4 mr-2" /> Add Department
            </button>
          )}
          {activeTab === 'groups' && (
            <button onClick={() => { setEditingItem(null); setGroupForm({ name: '', user_ids: [] }); setShowGroupModal(true); }} className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 ${isGracePeriod ? 'opacity-50 pointer-events-none' : ''}`}>
              <PlusCircle className="h-4 w-4 mr-2" /> Add Group
            </button>
          )}
        </GracePeriodTooltip>
      </div>

      {renderTabs()}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>
      ) : (
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map(user => (
                  <tr key={user.id} className={user.is_deleted ? 'bg-gray-50 opacity-60' : ''}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.role}</td>
                    <td className="px-6 py-4 text-sm">
                      {user.is_deleted ? <span className="text-red-600 flex items-center"><XCircle className="w-4 h-4 mr-1" /> Deleted</span> : <span className="text-green-600 flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> Active</span>}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button onClick={() => handleEditUser(user.id)} className="text-blue-600 hover:text-blue-900 mx-2"><Edit className="w-4 h-4" /></button>
                      {!user.is_deleted ? (
                        <button onClick={() => handleDeleteUser(user.id, user.email)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                      ) : (
                        <button onClick={() => handleRestoreUser(user.id, user.email)} className="text-green-600 hover:text-green-900"><RotateCcw className="w-4 h-4" /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* DEPARTMENTS TAB */}
          {activeTab === 'departments' && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manager</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {departments.length === 0 && <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-500">No departments configured.</td></tr>}
                {departments.map(dept => (
                  <tr key={dept.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{dept.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{dept.manager_email || <span className="text-gray-400 italic">No Manager Assigned</span>}</td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button onClick={() => { setEditingItem(dept); setDeptForm({ name: dept.name, manager_id: dept.manager_id || '' }); setShowDeptModal(true); }} className="text-blue-600 hover:text-blue-900 mx-2"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteDept(dept.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* GROUPS TAB */}
          {activeTab === 'groups' && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Group Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Members</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {approvalGroups.length === 0 && <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-500">No approval groups configured.</td></tr>}
                {approvalGroups.map(group => (
                  <tr key={group.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {group.name}
                      {group.users?.length === 0 && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Empty Group</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex flex-wrap gap-1">
                        {group.users?.map(u => <span key={u.id} className="bg-gray-100 px-2 py-1 rounded text-xs">{u.email}</span>)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button onClick={() => { setEditingItem(group); setGroupForm({ name: group.name, user_ids: group.users.map(u => u.id) }); setShowGroupModal(true); }} className="text-blue-600 hover:text-blue-900 mx-2"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteGroup(group.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* DEPT MODAL */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editingItem ? 'Edit Department' : 'New Department'}</h3>
            <form onSubmit={handleSaveDept} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department Name</label>
                <input required type="text" className="w-full border rounded-md p-2" value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department Manager (Optional)</label>
                <select className="w-full border rounded-md p-2" value={deptForm.manager_id} onChange={e => setDeptForm({ ...deptForm, manager_id: e.target.value })}>
                  <option value="">-- Select Manager --</option>
                  {users.filter(u => !u.is_deleted && ['corporate_admin', 'checker'].includes(u.role)).map(u => <option key={u.id} value={u.id}>{u.email} ({u.role})</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowDeptModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GROUP MODAL */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4">{editingItem ? 'Edit Approval Group' : 'New Approval Group'}</h3>
            <form onSubmit={handleSaveGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                <input required type="text" className="w-full border rounded-md p-2" value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Members</label>
                <div className="border rounded-md max-h-60 overflow-y-auto p-2 bg-gray-50">
                  {users.filter(u => !u.is_deleted && u.role !== 'end_user').map(u => (
                    <label key={u.id} className="flex items-center p-2 hover:bg-gray-200 rounded cursor-pointer">
                      <input type="checkbox" className="mr-3 h-4 w-4" checked={groupForm.user_ids.includes(u.id)} onChange={() => toggleGroupUser(u.id)} />
                      {u.email} <span className="ml-2 text-xs text-gray-400">({u.role})</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowGroupModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* APPROVAL MATRIX MODAL */}
      {showApprovalMatrixModal && (
        <ApprovalMatrixModal
          show={showApprovalMatrixModal}
          onClose={() => setShowApprovalMatrixModal(false)}
          matrixSteps={matrixSteps}
          setMatrixSteps={setMatrixSteps}
          availableUsers={availableMatrixUsers}
          availableDepartments={availableDepartments}
          availableCurrencies={availableCurrencies}
          availableGroups={availableMatrixGroups}
          editingStep={editingStep}
          setEditingStep={setEditingStep}
          editingMatrixIndex={editingMatrixIndex}
          isSaving={isMatrixSaving}
          handleInsertMatrixStep={handleInsertMatrixStep}
          handleSaveMatrix={handleSaveMatrix}
          handleRemoveMatrixStep={handleRemoveMatrixStep}
          handleEditMatrixStep={handleEditMatrixStep}
          handleCancelEditMatrixStep={handleCancelEditMatrixStep}
        />
      )}

    </div>
  );
}

export default UserManagementPage;