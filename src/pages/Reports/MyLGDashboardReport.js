// frontend/src/pages/Reports/MyLGDashboardReport.js
import React, { useState, useEffect } from 'react';
import { apiRequest } from 'services/apiService';
import { toast } from 'react-toastify';
import { LayoutDashboard, Clock, FolderKanban, ListTodo, AlertCircle } from 'lucide-react';
import LoadingSpinner from 'components/LoadingSpinner';

const MyLGDashboardReport = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        // FIX: Removed redundant '/reports' prefix from API call
        const response = await apiRequest('/reports/end-user/my-lg-dashboard');
        setReportData(response.data);
        toast.success("Report data loaded successfully!");
      } catch (err) {
        setError(err);
        toast.error(`Error fetching report: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-6 text-sm font-medium flex items-center gap-2.5">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span>Error: {error.message}</span>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-10 text-center text-sm text-slate-500 shadow-sm">
        No report data available.
      </div>
    );
  }

  const kpiCards = [
    {
      name: "My LGs",
      value: reportData.my_lgs_count,
      icon: <FolderKanban className="w-5 h-5" />,
      badgeCls: "bg-blue-50 text-blue-600",
    },
    {
      name: "LGs Near Expiry",
      value: reportData.lgs_near_expiry_count,
      icon: <Clock className="w-5 h-5" />,
      badgeCls: "bg-amber-50 text-amber-600",
    },
    {
      name: "Undelivered Instructions",
      value: reportData.undelivered_instructions_count,
      icon: <ListTodo className="w-5 h-5" />,
      badgeCls: "bg-indigo-50 text-indigo-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-widest">
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Personal Portfolio Report</span>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">My LG Dashboard</h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          A personalized overview of your assigned LGs and pending tasks.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {kpiCards.map((kpi, index) => (
          <div key={index} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{kpi.name}</p>
              <div className={`p-2.5 rounded-xl ${kpi.badgeCls}`}>
                {kpi.icon}
              </div>
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-2 tabular-nums">{kpi.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900">Recent Actions</h3>
        </div>
        <ul className="divide-y divide-slate-100">
          {reportData.recent_actions.length > 0 ? (
            reportData.recent_actions.map((action, index) => (
              <li key={index} className="px-5 py-3.5 text-xs sm:text-sm text-slate-700 hover:bg-slate-50/80 transition-colors flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span>{action}</span>
              </li>
            ))
          ) : (
            <li className="px-5 py-10 text-center text-sm text-slate-500">No recent actions found.</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default MyLGDashboardReport;