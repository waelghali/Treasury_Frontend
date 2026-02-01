import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from 'services/apiService';
import { toast } from 'react-toastify';
import LoadingSpinner from 'components/LoadingSpinner';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';

// Helper: Get default dates (Last 30 Days)
const getDefaultDates = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
};

// Reusable Risk Table Component
const RiskTable = ({ title, items, emptyMessage, colorClass = "text-red-600" }) => (
  <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
    <h3 className={`text-lg font-bold ${colorClass} mb-4`}>{title}</h3>
    {items.length === 0 ? (
      <p className="text-gray-400 italic">{emptyMessage}</p>
    ) : (
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-red-50">
            <tr>
              <th className="px-3 py-2">Reference</th>
              <th className="px-3 py-2">Trigger Date</th>
              <th className="px-3 py-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-900">{item.reference_number}</td>
                <td className="px-3 py-2 text-gray-500">{item.date_trigger}</td>
                <td className="px-3 py-2 text-red-600 font-medium">
                  {item.days_remaining} days ({item.details})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const CustomerLGPerformanceReport = () => {
  // --- 1. ALL HOOKS ---
  const [showAll, setShowAll] = useState(false);
  const defaults = getDefaultDates();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ start_date: defaults.start, end_date: defaults.end });
  
  const isFetching = useRef(false);

  const fetchReport = useCallback(async () => {
    if (isFetching.current) return;
    
    try {
      isFetching.current = true;
      setLoading(true);
      const queryString = `?start_date=${filters.start_date}&end_date=${filters.end_date}`;
      const response = await apiRequest(`/reports/ops-health${queryString}`);
      setReportData(response);
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error(`Error loading health report: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [filters.start_date, filters.end_date]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // --- 2. SURGICAL SAFETY CHECK ---
  // If reportData is null, we provide empty objects so the code doesn't crash while loading
  const { flow, pipeline, risks, efficiency } = reportData || { 
    flow: {}, 
    pipeline: {}, 
    risks: { expiry_critical_list: [], stalled_internal_list: [], bank_ghosting_list: [] }, 
    efficiency: { 
      avg_internal_days: 0, 
      avg_bank_days: 0, 
      avg_approval_days: 0, // Add this
      lifetime_internal_days: 0, 
      lifetime_bank_days: 0,
      lifetime_approval_days: 0, // Add this
      internal_change_pct: 0 
    } 
  };
  const renderTrend = (current, lifetime) => {
	if (!lifetime || lifetime === 0) return null;
	const isFaster = current < lifetime; // In "days", lower is better
	return (
	  <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${isFaster ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
		{isFaster ? '↓ Faster' : '↑ Slower'}
	  </span>
	);
  };
  return (
    <div className="space-y-8 pb-10">
      
      {/* --- HEADER & FILTERS (Always visible to prevent unmounting loop) --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Treasury Ops Health</h2>
          <p className="text-gray-500 text-sm mt-1">Operational telemetry: Volume, Friction, and Risk.</p>
        </div>
        <div className="flex items-center space-x-3 bg-white p-3 rounded-lg shadow-sm border">
          <input 
            type="date" 
            name="start_date" 
            value={filters.start_date} 
            onChange={handleFilterChange}
            className="border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-gray-400">to</span>
          <input 
            type="date" 
            name="end_date" 
            value={filters.end_date} 
            onChange={handleFilterChange}
            className="border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <button 
            onClick={fetchReport}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* --- CONDITIONAL CONTENT AREA --- */}
      {loading && !reportData ? (
        <LoadingSpinner />
      ) : !reportData ? (
        <div className="text-center py-10 text-gray-500">No data available.</div>
      ) : (
        <>
          {/* --- SECTION 1: PERIOD FLOW --- */}
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Period Activity Flow</h3>
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Net Operational Volume</h3>
              <p className="text-2xl font-bold text-gray-800 mt-1">{flow.net_activity_score}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500">New LG's</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{flow.new_issuances_count}</p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500">Extensions</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{flow.extensions_delivered_count}</p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500">Reductions</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{flow.reductions_count || 0}</p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500">Amendments</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{flow.amendments_count || 0}</p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500">Activations</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{flow.activations_count || 0}</p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500">Releases</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{flow.releases_count || 0}</p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500">Liquidations</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{flow.liquidations_count || 0}</p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500">Reminders</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{flow.reminders_count || 0}</p>
              </div>
            </div>
          </div>

          {/* --- VISUAL ANALYTICS --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6">Activity Trend (Last 4 Months)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                    <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.2)', padding: '0px 8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} formatter={(value) => <span className="text-sm text-gray-600 ml-2 mr-2">{value}</span>} />
                    <Bar dataKey="new_issuances_count" name="New" stackId="a" fill="#9CA3AF" stroke="#FFFFFF" strokeWidth={3} barSize={60} />
                    <Bar dataKey="extensions_delivered_count" name="EXTN" stackId="a" fill="#2563EB" stroke="#FFFFFF" strokeWidth={3} barSize={60} />
                    <Bar dataKey="reductions_count" name="REDU" stackId="a" fill="#EA580C" stroke="#FFFFFF" strokeWidth={3} barSize={60} />
                    <Bar dataKey="amendments_count" name="AMND" stackId="a" fill="#D97706" stroke="#FFFFFF" strokeWidth={3} barSize={60} />
                    <Bar dataKey="activations_count" name="ACTV" stackId="a" fill="#0D9488" stroke="#FFFFFF" strokeWidth={3} barSize={60} />
                    <Bar dataKey="releases_count" name="RELS" stackId="a" fill="#16A34A" stroke="#FFFFFF" strokeWidth={3} barSize={60} />
                    <Bar dataKey="liquidations_count" name="LIQD" stackId="a" fill="#DC2626" stroke="#FFFFFF" strokeWidth={3} barSize={60} />
                    <Bar dataKey="reminders_count" name="RMND" stackId="a" fill="#6366F1" stroke="#FFFFFF" strokeWidth={3} barSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6">Portfolio Status Composition</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(reportData.status_distribution || {}).map(([name, value]) => ({ name, value }))}
                      cx="50%" cy="45%" innerRadius={70} outerRadius={90} paddingAngle={2} dataKey="value"
                    >
                      {Object.entries(reportData.status_distribution || {}).map(([name, value], index) => {
                        const colors = { 'Valid': '#2563EB', 'Expired': '#DC2626', 'Released': '#16A34A', 'Liquidated': '#A855F7' };
                        return <Cell key={`cell-${index}`} fill={colors[name] || '#9CA3AF'} />;
                      })}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.2)', padding: '4px 8px', fontSize: '12px' }} />
                    <Legend iconType="circle" verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '10px' }} formatter={(value) => <span className="text-sm text-gray-600 ml-2 mr-0">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* --- EFFICIENCY SPEEDOMETER --- */}
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Efficiency Speedometer</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6"> {/* Changed to cols-3 */}
              
              {/* Approval Efficiency Card (Checker/Maker) */}
              <div className="bg-white p-6 rounded-xl shadow-sm  flex items-center justify-between border-l-4 border-yellow-700">
                <div>
                  <div className="flex items-center">
                    <p className="text-sm text-gray-500 font-medium">Approval Time</p>
                    {renderTrend(efficiency.avg_approval_days, efficiency.lifetime_approval_days)}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    History: <span className="font-semibold">{efficiency.lifetime_approval_days || "0.0"} days</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-orange-600">{efficiency.avg_approval_days || "0.0"}</span>
                  <span className="text-sm text-gray-500 ml-1">days</span>
                </div>
              </div>

              {/* Internal Efficiency Card */}
              <div className="bg-white p-6 rounded-xl shadow-sm  flex items-center justify-between border-l-4 border-blue-700">
                <div>
                  <div className="flex items-center">
                    <p className="text-sm text-gray-500 font-medium">Internal Turnaround</p>
                    {renderTrend(efficiency.avg_internal_days, efficiency.lifetime_internal_days)}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    History: <span className="font-semibold">{efficiency.lifetime_internal_days || "0.0"} days</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-blue-600">{efficiency.avg_internal_days || "0.0"}</span>
                  <span className="text-sm text-gray-500 ml-1">days</span>
                </div>
              </div>

              {/* Bank Efficiency Card */}
              <div className="bg-white p-6 rounded-xl shadow-sm  flex items-center justify-between border-l-4 border-green-700">
                <div>
                  <div className="flex items-center">
                    <p className="text-sm text-gray-500 font-medium">Bank Response Time</p>
                    {renderTrend(efficiency.avg_bank_days, efficiency.lifetime_bank_days)}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    History: <span className="font-semibold">{efficiency.lifetime_bank_days || "0.0"} days</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-purple-600">{efficiency.avg_bank_days || "0.0"}</span>
                  <span className="text-sm text-gray-500 ml-1">days</span>
                </div>
              </div>

            </div>

          {/* --- PIPELINE SECTION --- */}
          <div>
            <div className="flex justify-between items-center mt-3 mb-3">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Instruction Pipeline (Snapshot)</h3>
              <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                <button 
                  onClick={() => setShowAll(false)}
                  className={`px-3 py-1 text-xs rounded-md transition ${!showAll ? 'bg-white shadow-sm font-bold' : 'text-gray-500'}`}
                >
                  Actionable
                </button>
                <button 
                  onClick={() => setShowAll(true)}
                  className={`px-3 py-1 text-xs rounded-md transition ${showAll ? 'bg-white shadow-sm font-bold' : 'text-gray-500'}`}
                >
                  All Backlog
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-400">
                <p className="text-sm font-medium text-gray-500">Internal Backlog</p>
                <h4 className="text-3xl font-bold text-gray-800 mt-2">
                  {showAll ? pipeline.internal_backlog_total : pipeline.internal_backlog_count}
                </h4>
                <p className="text-xs text-gray-400 mt-4">
                  {showAll ? "Total pending instructions." : "Instructions needing immediate attention."}
                </p>
              </div>

              <div className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${showAll ? 'border-gray-400' : 'border-blue-400'}`}>
                <p className="text-sm font-medium text-gray-500">Bank Backlog</p>
                <h4 className="text-3xl font-bold text-gray-800 mt-2">
                  {showAll ? pipeline.bank_backlog_total : pipeline.bank_backlog_count}
                </h4>
                <p className="text-xs text-gray-400 mt-4">
                  {showAll ? "Total waiting for bank reply." : "Banks that are officially ghosting."}
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-400">
                <p className="text-sm font-medium text-gray-500">Completed Recently</p>
                <h4 className="text-3xl font-bold text-gray-800 mt-2">{pipeline.completed_recently_count}</h4>
                <p className="text-xs text-gray-400 mt-4">Replies recorded in this period.</p>
              </div>
            </div>
          </div>

          {/* --- RISK ALERTS --- */}
          <div>
            <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mt-3 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              Risk & Attention Panel
            </h3>
            
            {risks.expiry_critical_list.length === 0 && risks.stalled_internal_list.length === 0 && risks.bank_ghosting_list.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                <p className="text-green-800 font-semibold text-lg">All Systems Nominal</p>
                <p className="text-green-600">No critical expiries or stalled instructions detected.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RiskTable title={`Critical Expiry (<7 Days) • ${risks.expiry_critical_list.length} Items`} items={risks.expiry_critical_list} emptyMessage="No immediate expiry risks." />
                <RiskTable title={`Unresponsive Banks (>10 Days) • ${risks.bank_ghosting_list.length} Items`} items={risks.bank_ghosting_list} emptyMessage="All banks are responding within SLA." colorClass="text-orange-600" />
                <div className="lg:col-span-2">
                   <RiskTable title={`Stalled Internal Instructions (>3 Days) • ${risks.stalled_internal_list.length} Items`} items={risks.stalled_internal_list} emptyMessage="Internal drafting is moving fast." colorClass="text-yellow-700" />
                </div>
              </div>
            )}
          </div>

          </div>
        </>
      )}
    </div>
  );
};

export default CustomerLGPerformanceReport;