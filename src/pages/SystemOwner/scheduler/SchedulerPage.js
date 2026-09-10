import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiRequest } from 'services/apiService.js';
import {
  Play,
  Pause,
  FastForward,
  Clock,
  Calendar,
  X,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Mail,
  Bell,
  Shield,
  Database,
  TrendingUp,
  Cpu,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Activity,
  ArrowUpDown
} from 'lucide-react';
import { toast } from 'react-toastify';
import moment from 'moment-timezone';

// Helper to determine category, icon, and badge colors for a job
const getJobCategoryMeta = (job) => {
  const id = (job.id || '').toLowerCase();
  const name = (job.name || '').toLowerCase();

  if (id.includes('inbox') || name.includes('inbox') || id.includes('email') || name.includes('email')) {
    return {
      category: 'Smart Inbox',
      icon: <Mail className="h-4 w-4 text-indigo-500" />,
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    };
  }
  if (
    id.includes('reminder') ||
    name.includes('reminder') ||
    id.includes('expiry') ||
    id.includes('renewal') ||
    id.includes('sla') ||
    id.includes('timeout')
  ) {
    return {
      category: 'LG & Reminders',
      icon: <Bell className="h-4 w-4 text-amber-500" />,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }
  if (id.includes('maintenance') || id.includes('memory') || name.includes('maintenance') || id.includes('status')) {
    return {
      category: 'System Maintenance',
      icon: <Cpu className="h-4 w-4 text-emerald-500" />,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }
  if (id.includes('news') || id.includes('exchange') || id.includes('cbe') || id.includes('quotation')) {
    return {
      category: 'Market & External Sync',
      icon: <TrendingUp className="h-4 w-4 text-blue-500" />,
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }
  return {
    category: 'General Automation',
    icon: <Clock className="h-4 w-4 text-slate-500" />,
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
  };
};

function SchedulerPage({ onLogout }) {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState('');
  
  // Search & filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [triggerFilter, setTriggerFilter] = useState('ALL');
  
  // Modal state
  const [rescheduleJob, setRescheduleJob] = useState(null);
  const modalRef = useRef(null);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('/system-owner/scheduler/jobs', 'GET');
      setJobs(response.jobs || []);
      setError('');
    } catch (err) {
      setError('Failed to fetch scheduled jobs. Please check API status.');
      toast.error('Failed to fetch jobs.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setRescheduleJob(null);
      }
    };
    if (rescheduleJob) {
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [rescheduleJob]);

  const handleAction = async (jobId, endpoint, payload = {}) => {
    setActionLoadingId(`${jobId}-${endpoint}`);
    try {
      const response = await apiRequest(`/system-owner/scheduler/${endpoint}/${jobId}`, 'POST', payload);
      toast.success(response.message || `Action executed successfully on '${jobId}'.`);
      fetchJobs();
    } catch (err) {
      toast.error(`Action failed: ${err.message}`);
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRescheduleSubmit = async (e, jobId) => {
    e.preventDefault();
    const form = e.target;
    const triggerType = form.elements['trigger_type'].value;
    const payload = { trigger_type: triggerType };

    if (triggerType === 'cron') {
      const hour = parseInt(form.elements['hour'].value, 10);
      const minute = parseInt(form.elements['minute'].value, 10);
      payload.hour = hour;
      payload.minute = minute;
      payload.timezone = 'Africa/Cairo';
    } else if (triggerType === 'date') {
      const runDateVal = form.elements['run_date'].value;
      if (!runDateVal) {
        toast.warn('Please select a valid date and time.');
        return;
      }
      payload.run_date = moment(runDateVal).tz('Africa/Cairo').toISOString();
    }

    try {
      const response = await apiRequest(`/system-owner/scheduler/reschedule_job/${jobId}`, 'POST', payload);
      toast.success(response.message || 'Job rescheduled successfully.');
      setRescheduleJob(null);
      fetchJobs();
    } catch (err) {
      toast.error(`Rescheduling failed: ${err.message}`);
      console.error(err);
    }
  };

  // Filter & Search computation
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const meta = getJobCategoryMeta(job);

      // Search match
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesName = (job.name || '').toLowerCase().includes(term);
        const matchesId = (job.id || '').toLowerCase().includes(term);
        const matchesFunc = (job.func || '').toLowerCase().includes(term);
        const matchesTrigger = (job.trigger || '').toLowerCase().includes(term);
        const matchesCat = meta.category.toLowerCase().includes(term);
        if (!matchesName && !matchesId && !matchesFunc && !matchesTrigger && !matchesCat) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== 'ALL' && meta.category !== categoryFilter) {
        return false;
      }

      // Trigger type filter
      if (triggerFilter !== 'ALL') {
        const trigStr = (job.trigger || '').toLowerCase();
        if (triggerFilter === 'cron' && !trigStr.includes('cron')) return false;
        if (triggerFilter === 'date' && !trigStr.includes('date')) return false;
        if (triggerFilter === 'interval' && !trigStr.includes('interval')) return false;
      }

      return true;
    });
  }, [jobs, searchTerm, categoryFilter, triggerFilter]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = jobs.length;
    const active = jobs.filter((j) => j.next_run_time).length;
    const inboxJobs = jobs.filter((j) => getJobCategoryMeta(j).category === 'Smart Inbox').length;
    const maintenanceJobs = jobs.filter((j) =>
      ['System Maintenance', 'LG & Reminders'].includes(getJobCategoryMeta(j).category)
    ).length;

    // Find closest upcoming run time
    const sortedUpcoming = [...jobs]
      .filter((j) => j.next_run_time)
      .sort((a, b) => new Date(a.next_run_time) - new Date(b.next_run_time));
    const nextJob = sortedUpcoming[0];

    return {
      total,
      active,
      inboxJobs,
      maintenanceJobs,
      nextRunFormatted: nextJob?.next_run_time
        ? moment(nextJob.next_run_time).tz('Africa/Cairo').fromNow()
        : 'None scheduled',
      nextJobName: nextJob?.name || 'N/A',
    };
  }, [jobs]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (categoryFilter !== 'ALL') count++;
    if (triggerFilter !== 'ALL') count++;
    return count;
  }, [categoryFilter, triggerFilter]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setCategoryFilter('ALL');
    setTriggerFilter('ALL');
  };

  return (
    <div className="space-y-6 text-left">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Scheduler Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor and control background automation timers, email polling jobs, and daily scheduled jobs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchJobs}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Timers
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center shadow-sm">
          <AlertCircle className="h-5 w-5 mr-2 shrink-0 text-red-500" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Timers</p>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
          <span className="text-[11px] text-slate-400 font-medium">Configured in APScheduler</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Active & Scheduled</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-1">{stats.active}</p>
          <span className="text-[11px] text-emerald-600/80 font-medium">Ready for next trigger</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Inbox Email Polls</p>
            <Mail className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-700 mt-1">{stats.inboxJobs}</p>
          <span className="text-[11px] text-indigo-600/80 font-medium">Workday, off-hours & weekend</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Next Trigger</p>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-lg font-black text-blue-700 mt-1 truncate" title={stats.nextJobName}>
            {stats.nextRunFormatted}
          </p>
          <span className="text-[11px] text-slate-400 font-medium truncate block" title={stats.nextJobName}>
            {stats.nextJobName}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex gap-3 flex-wrap items-center">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search job name, ID, trigger, function..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">📦 All Categories</option>
            <option value="Smart Inbox">📬 Smart Inbox</option>
            <option value="LG & Reminders">🔔 LG & Reminders</option>
            <option value="System Maintenance">⚡ System Maintenance</option>
            <option value="Market & External Sync">📈 Market & External Sync</option>
            <option value="General Automation">🕒 General Automation</option>
          </select>

          {/* Trigger Type Dropdown */}
          <select
            value={triggerFilter}
            onChange={(e) => setTriggerFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">⏱️ All Trigger Types</option>
            <option value="cron">Recurring Cron</option>
            <option value="date">One-time Date</option>
            <option value="interval">Interval</option>
          </select>

          {/* Clear Filters */}
          {(activeFilterCount > 0 || searchTerm) && (
            <button
              onClick={handleClearAllFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
            >
              <X className="w-3.5 h-3.5" /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Jobs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Task & Category
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Job ID / Function
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Schedule / Trigger
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Next Scheduled Run
                </th>
                <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading background scheduler jobs...
                  </td>
                </tr>
              ) : filteredJobs.length > 0 ? (
                filteredJobs.map((job) => {
                  const meta = getJobCategoryMeta(job);
                  const isRunningNow = actionLoadingId === `${job.id}-run_job`;

                  return (
                    <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Category */}
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 shrink-0 mt-0.5">
                            {meta.icon}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-sm block leading-snug">
                              {job.name}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-md text-[11px] font-semibold border ${meta.badgeClass}`}
                            >
                              {meta.category}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Job ID / Target Func */}
                      <td className="px-5 py-4 align-top">
                        <code className="text-xs font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200 block truncate max-w-[200px]">
                          {job.id}
                        </code>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          func: <span className="font-mono text-slate-600">{job.func || 'N/A'}</span>
                        </span>
                      </td>

                      {/* Trigger / Schedule */}
                      <td className="px-5 py-4 align-top">
                        <span className="text-xs text-slate-700 font-medium block leading-relaxed max-w-[280px]">
                          {job.trigger}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mt-1">
                          Timezone: Cairo (EEST)
                        </span>
                      </td>

                      {/* Next Run Time */}
                      <td className="px-5 py-4 align-top">
                        {job.next_run_time ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              {moment(job.next_run_time).tz('Africa/Cairo').fromNow()}
                            </span>
                            <span className="text-[11px] text-slate-500 block mt-1">
                              {moment(job.next_run_time).tz('Africa/Cairo').format('YYYY-MM-DD HH:mm:ss')}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
                            Paused / None
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="px-5 py-4 align-top text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Run Now Button */}
                          <button
                            onClick={() => handleAction(job.id, 'run_job')}
                            disabled={isRunningNow}
                            className={`p-2 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-sm ${
                              isRunningNow ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            title="Execute Job Immediately"
                          >
                            <FastForward className={`h-4 w-4 ${isRunningNow ? 'animate-pulse' : ''}`} />
                          </button>

                          {/* Pause Button */}
                          <button
                            onClick={() => handleAction(job.id, 'pause_job')}
                            className="p-2 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors shadow-sm"
                            title="Pause Scheduled Execution"
                          >
                            <Pause className="h-4 w-4" />
                          </button>

                          {/* Resume Button */}
                          <button
                            onClick={() => handleAction(job.id, 'resume_job')}
                            className="p-2 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors shadow-sm"
                            title="Resume Scheduled Execution"
                          >
                            <Play className="h-4 w-4" />
                          </button>

                          {/* Reschedule Button */}
                          <button
                            onClick={() => setRescheduleJob(job)}
                            className="p-2 rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors shadow-sm"
                            title="Change Schedule / Time"
                          >
                            <Calendar className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No scheduled jobs found matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reschedule Modal */}
      {rescheduleJob && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4"
          onClick={() => setRescheduleJob(null)}
        >
          <div
            className="relative p-6 border border-slate-200 w-full max-w-lg shadow-xl rounded-2xl bg-white text-left"
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Reschedule Automated Task</h3>
                <p className="text-xs text-slate-500 mt-0.5">{rescheduleJob.name}</p>
              </div>
              <button
                onClick={() => setRescheduleJob(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Current Schedule Summary */}
            <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Current Active Trigger
              </span>
              <span className="text-xs font-mono text-slate-700 block mt-0.5">{rescheduleJob.trigger}</span>
            </div>

            {/* Reschedule Form */}
            <form onSubmit={(e) => handleRescheduleSubmit(e, rescheduleJob.id)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Trigger Type
                </label>
                <select
                  name="trigger_type"
                  id="trigger_type"
                  defaultValue="cron"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cron">Cron (Recurring Daily at Specified Time)</option>
                  <option value="date">Date (One-time Execution at Exact Timestamp)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Hour (0 - 23)
                  </label>
                  <input
                    type="number"
                    name="hour"
                    id="hour"
                    defaultValue={2}
                    min="0"
                    max="23"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Cairo Time (EEST)</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Minute (0 - 59)
                  </label>
                  <input
                    type="number"
                    name="minute"
                    id="minute"
                    defaultValue={0}
                    min="0"
                    max="59"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">0 - 59 mins</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Exact Date & Time (Only for 'Date' Trigger)
                </label>
                <input
                  type="datetime-local"
                  name="run_date"
                  id="run_date"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end items-center gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRescheduleJob(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SchedulerPage;