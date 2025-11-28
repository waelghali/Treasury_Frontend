import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/apiService';
import { X, Plus, Trash2, Loader2, Building } from 'lucide-react';
import { toast } from 'react-toastify';

export default function FacilityFormModal({ onClose, onSuccess, facilityToEdit = null }) {
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState([]);
  const [currencies, setCurrencies] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    bank_id: '',
    currency_id: '',
    total_limit_amount: '',
    reference_number: '',
    is_active: true,
    sub_limits: [] 
  });

  // Load Dictionaries
  useEffect(() => {
    async function loadDicts() {
      try {
        // CORRECTED: URL First, Method Second
        const [banksData, currenciesData] = await Promise.all([
          apiRequest('/issuance/banks', 'GET'), 
          apiRequest('/issuance/currencies', 'GET')
        ]);
        setBanks(banksData || []);
        setCurrencies(currenciesData || []);
      } catch (err) {
        console.error("Dictionary load error:", err);
        // Don't toast error on mount to avoid spam, just log it
      }
    }
    loadDicts();
  }, [facilityToEdit]);

  const handleAddSubLimit = () => {
    setFormData({
      ...formData,
      sub_limits: [
        ...formData.sub_limits, 
        { limit_name: 'General Limit', limit_amount: 0, lg_type_id: 1 } 
      ]
    });
  };

  const handleSubLimitChange = (index, field, value) => {
    const newSubLimits = [...formData.sub_limits];
    newSubLimits[index][field] = value;
    setFormData({ ...formData, sub_limits: newSubLimits });
  };

  const handleRemoveSubLimit = (index) => {
    const newSubLimits = formData.sub_limits.filter((_, i) => i !== index);
    setFormData({ ...formData, sub_limits: newSubLimits });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        bank_id: parseInt(formData.bank_id),
        currency_id: parseInt(formData.currency_id),
        total_limit_amount: parseFloat(formData.total_limit_amount),
        sub_limits: formData.sub_limits.map(sl => ({
            ...sl,
            limit_amount: parseFloat(sl.limit_amount),
            lg_type_id: parseInt(sl.lg_type_id)
        }))
      };

      // CORRECTED: URL First, Method Second
      await apiRequest('/issuance/facilities/', 'POST', payload);
      toast.success("Facility Saved Successfully");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error("Failed to save facility.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-5 border-b pb-2">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                <Building className="inline-block w-5 h-5 mr-2 text-blue-600"/>
                {facilityToEdit ? 'Edit Facility' : 'Add New Bank Facility'}
              </h3>
              <button onClick={onClose}><X className="h-6 w-6 text-gray-400" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Bank</label>
                    <select 
                        required 
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.bank_id}
                        onChange={e => setFormData({...formData, bank_id: e.target.value})}
                    >
                        <option value="">Select Bank...</option>
                        {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Reference No.</label>
                    <input 
                        type="text" required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.reference_number}
                        onChange={e => setFormData({...formData, reference_number: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Currency</label>
                    <select 
                        required 
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.currency_id}
                        onChange={e => setFormData({...formData, currency_id: e.target.value})}
                    >
                        <option value="">Select...</option>
                        {currencies.map(c => (
                            // FIX: Handle potential missing 'code' by checking 'name' or 'currency_code'
                            <option key={c.id} value={c.id}>
                                {c.code || c.name || c.currency_code || `Currency ${c.id}`}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Total Limit Amount</label>
                    <input 
                        type="number" required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.total_limit_amount}
                        onChange={e => setFormData({...formData, total_limit_amount: e.target.value})}
                    />
                </div>
              </div>

              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-bold text-gray-700">Sub-Limits</h4>
                    <button type="button" onClick={handleAddSubLimit} className="text-xs flex items-center text-blue-600 hover:text-blue-800">
                        <Plus className="w-3 h-3 mr-1"/> Add Limit
                    </button>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-md space-y-3 max-h-48 overflow-y-auto">
                    {formData.sub_limits.length === 0 && <p className="text-xs text-gray-400 text-center">No sub-limits defined.</p>}
                    {formData.sub_limits.map((sl, idx) => (
                        <div key={idx} className="flex gap-2 items-end">
                            <div className="flex-1">
                                <label className="text-xs text-gray-500">Name</label>
                                <input 
                                    type="text" 
                                    className="block w-full border border-gray-300 rounded-md py-1 px-2 text-sm"
                                    value={sl.limit_name}
                                    onChange={e => handleSubLimitChange(idx, 'limit_name', e.target.value)}
                                />
                            </div>
                            <div className="w-32">
                                <label className="text-xs text-gray-500">Amount</label>
                                <input 
                                    type="number" 
                                    className="block w-full border border-gray-300 rounded-md py-1 px-2 text-sm"
                                    value={sl.limit_amount}
                                    onChange={e => handleSubLimitChange(idx, 'limit_amount', e.target.value)}
                                />
                            </div>
                            <button type="button" onClick={() => handleRemoveSubLimit(idx)} className="text-red-500 pb-2">
                                <Trash2 className="w-4 h-4"/>
                            </button>
                        </div>
                    ))}
                </div>
              </div>

              <div className="mt-5 sm:mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 sm:text-sm"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Facility"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}