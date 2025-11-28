import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/apiService';
import { Loader2, Plus, Building, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import FacilityFormModal from '../../components/Modals/FacilityFormModal';

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      // CORRECTED: URL First, Method Second
      const data = await apiRequest('/issuance/facilities/', 'GET');
      setFacilities(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getUsageColor = (pct) => {
    if (pct > 90) return 'bg-red-500';
    if (pct > 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-lg font-medium text-gray-900">Bank Facilities</h2>
           <p className="text-sm text-gray-500">Manage limits and track utilization across banks.</p>
        </div>
        <button 
            //onClick={() => setShowModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Add Facility
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500"/></div>
      ) : facilities.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-lg border border-dashed border-gray-300">
            <Building className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No facilities defined</h3>
            <p className="mt-1 text-sm text-gray-500"><strong>This feature is coming soon</strong></p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {facilities.map(fac => {
                const total = fac.total_limit_amount || 0;
                const utilized = fac.current_utilization || 0; 
                const pct = total > 0 ? (utilized / total) * 100 : 0;
                
                return (
                    <div key={fac.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-5">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center">
                                        <Building className="h-5 w-5 text-gray-400 mr-2"/>
                                        <h3 className="text-lg font-medium text-gray-900">{fac.bank?.name || 'Unknown Bank'}</h3>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">{fac.reference_number}</p>
                                </div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Active
                                </span>
                            </div>
                            
                            <div className="mt-6">
                                <div className="flex justify-between text-sm font-medium mb-1">
                                    <span className="text-gray-500">Utilization</span>
                                    <span className="text-gray-900">{pct.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div className={`h-2.5 rounded-full ${getUsageColor(pct)}`} style={{ width: `${pct}%` }}></div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 mt-2">
                                    <span>Used: {fac.currency?.code} {utilized.toLocaleString()}</span>
                                    <span>Limit: {fac.currency?.code} {total.toLocaleString()}</span>
                                </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Sub-Limits</h4>
                                <ul className="space-y-2">
                                    {fac.sub_limits && fac.sub_limits.slice(0, 3).map(sl => (
                                        <li key={sl.id} className="flex justify-between text-sm">
                                            <span className="text-gray-600 truncate max-w-[60%]">{sl.limit_name}</span>
                                            <span className="font-medium">{sl.limit_amount.toLocaleString()}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      )}

      {showModal && (
        <FacilityFormModal 
            onClose={() => setShowModal(false)}
            onSuccess={fetchFacilities}
        />
      )}
    </div>
  );
}