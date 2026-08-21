// frontend/src/pages/SystemOwner/UserFeedbackDashboard.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lightbulb,
  Bug,
  Zap,
  TrendingUp,
  ChevronDown,
  User,
  Building2,
  Calendar,
  Download,
  Check,
  XCircle,
  Eye
} from 'lucide-react';
import apiClient from '../../services/apiClient';

const UserFeedbackDashboard = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sentimentFilter, setSentimentFilter] = useState('ALL');

  // Active item detail modal
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [adminNote, setAdminNote] = useState('');

  const fetchFeedbacks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/feedback/');
      setFeedbacks(response.data || []);
    } catch (err) {
      console.error('Failed to fetch user feedbacks:', err);
      setError('Could not load user feedback records. Please ensure your session is active.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleUpdateStatus = async (id, newStatus, note = null) => {
    setUpdatingId(id);
    try {
      const payload = { status: newStatus };
      if (note !== null) payload.admin_notes = note;

      const response = await apiClient.patch(`/feedback/${id}`, payload);
      setFeedbacks((prev) =>
        prev.map((fb) => (fb.id === id ? { ...fb, ...response.data } : fb))
      );
      if (selectedFeedback && selectedFeedback.id === id) {
        setSelectedFeedback((prev) => ({ ...prev, ...response.data }));
      }
    } catch (err) {
      console.error('Failed to update feedback status:', err);
      alert('Error updating feedback status.');
    } finally {
      setUpdatingId(null);
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = feedbacks.length;
    const newCount = feedbacks.filter((f) => f.status === 'NEW').length;
    const features = feedbacks.filter((f) => f.feedback_type === 'FEATURE_REQUEST').length;
    const bugs = feedbacks.filter((f) => f.feedback_type === 'BUG_REPORT').length;
    const usability = feedbacks.filter((f) => f.feedback_type === 'USABILITY_PAIN_POINT').length;
    const resolved = feedbacks.filter((f) => f.status === 'RESOLVED').length;
    return { total, newCount, features, bugs, usability, resolved };
  }, [feedbacks]);

  // Filtered List
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((fb) => {
      const matchesSearch =
        !searchTerm ||
        fb.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fb.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(fb.id).includes(searchTerm);

      const matchesStatus = statusFilter === 'ALL' || fb.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || fb.feedback_type === typeFilter;
      const matchesSentiment = sentimentFilter === 'ALL' || fb.sentiment === sentimentFilter;

      return matchesSearch && matchesStatus && matchesType && matchesSentiment;
    });
  }, [feedbacks, searchTerm, statusFilter, typeFilter, sentimentFilter]);

  const exportToCSV = () => {
    if (filteredFeedbacks.length === 0) return;
    const headers = ['Ref ID', 'Timestamp', 'User Email', 'Customer ID', 'Category', 'Sentiment', 'Status', 'Message', 'Admin Notes'];
    const rows = filteredFeedbacks.map((f) => [
      `FB-${f.id}`,
      f.created_at || '',
      f.user_email || '',
      f.customer_id || '',
      f.feedback_type || '',
      f.sentiment || '',
      f.status || '',
      `"${(f.message || '').replace(/"/g, '""')}"`,
      `"${(f.admin_notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Grow_User_Feedbacks_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'FEATURE_REQUEST':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Lightbulb className="w-3 h-3 text-amber-600" />
            Feature Request
          </span>
        );
      case 'BUG_REPORT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <Bug className="w-3 h-3 text-rose-600" />
            Bug Report
          </span>
        );
      case 'USABILITY_PAIN_POINT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Zap className="w-3 h-3 text-purple-600" />
            Usability
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <MessageSquare className="w-3 h-3 text-blue-600" />
            General Feedback
          </span>
        );
    }
  };

  const getSentimentBadge = (sentiment) => {
    switch (sentiment) {
      case 'POSITIVE':
        return <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200">🟢 Positive</span>;
      case 'NEGATIVE':
        return <span className="text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200">🔴 Critical / Negative</span>;
      default:
        return <span className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200">⚪ Neutral</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'NEW':
        return <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-xs font-bold px-2.5 py-1 rounded-full animate-pulse border border-amber-300">NEW</span>;
      case 'IN_REVIEW':
        return <span className="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-300">IN REVIEW</span>;
      case 'RESOLVED':
        return <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-300">RESOLVED</span>;
      case 'REJECTED':
        return <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-xs font-bold px-2.5 py-1 rounded-full border border-slate-300">DISMISSED</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-md shadow-indigo-200 dark:shadow-indigo-950">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                User Feedback & Feature Requests
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transparent user suggestions, bug reports, and feedback captured via the AI Assistant & platform.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchFeedbacks}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportToCSV}
            disabled={filteredFeedbacks.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Feedbacks</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{stats.total}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-sm bg-amber-50/30">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Unreviewed (New)</span>
          <span className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1 block">{stats.newCount}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block">Feature Requests</span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-300 mt-1 block">{stats.features}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider block">Bug Reports</span>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">{stats.bugs}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-bold text-purple-500 uppercase tracking-wider block">Usability Points</span>
          <span className="text-2xl font-black text-purple-600 dark:text-purple-300 mt-1 block">{stats.usability}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block">Resolved</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">{stats.resolved}</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search feedback notes, user email, or Ref ID..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New (Unreviewed)</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Dismissed</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
          >
            <option value="ALL">All Categories</option>
            <option value="FEATURE_REQUEST">Feature Requests</option>
            <option value="BUG_REPORT">Bug Reports</option>
            <option value="USABILITY_PAIN_POINT">Usability Pain Points</option>
            <option value="GENERAL_FEEDBACK">General Feedback</option>
          </select>

          <select
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
          >
            <option value="ALL">All Sentiments</option>
            <option value="POSITIVE">Positive</option>
            <option value="NEUTRAL">Neutral</option>
            <option value="NEGATIVE">Critical / Negative</option>
          </select>
        </div>
      </div>

      {/* Main List Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
            <p className="text-sm font-medium">Loading feedback inbox...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-sm">{error}</div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <MessageSquare className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-base font-bold text-slate-600 dark:text-slate-300">No feedback items match your criteria.</p>
            <p className="text-xs text-slate-400">Try clearing filters or search keywords.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Ref</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">User & Tenant</th>
                  <th className="py-3.5 px-4">Message / Request</th>
                  <th className="py-3.5 px-4">Sentiment</th>
                  <th className="py-3.5 px-4">Submitted</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredFeedbacks.map((fb) => (
                  <tr key={fb.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      #FB-{fb.id}
                    </td>
                    <td className="py-3 px-4">
                      {getTypeBadge(fb.feedback_type)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {fb.user_email || 'Anonymous'}
                      </div>
                      <div className="text-[10px] text-slate-400">Customer #{fb.customer_id}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate font-medium text-slate-700 dark:text-slate-300" title={fb.message}>
                      {fb.message}
                    </td>
                    <td className="py-3 px-4">
                      {getSentimentBadge(fb.sentiment)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {fb.created_at ? new Date(fb.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(fb.status)}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedFeedback(fb);
                          setAdminNote(fb.admin_notes || '');
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                        title="View Full Details"
                      >
                        <Eye className="w-3.5 h-3.5 inline mr-1" />
                        View
                      </button>

                      {fb.status === 'NEW' && (
                        <button
                          onClick={() => handleUpdateStatus(fb.id, 'IN_REVIEW')}
                          disabled={updatingId === fb.id}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                        >
                          Review
                        </button>
                      )}

                      {fb.status !== 'RESOLVED' && (
                        <button
                          onClick={() => handleUpdateStatus(fb.id, 'RESOLVED')}
                          disabled={updatingId === fb.id}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                        >
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Feedback Detail Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-indigo-600 text-lg">#FB-{selectedFeedback.id}</span>
                {getTypeBadge(selectedFeedback.feedback_type)}
              </div>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
              <div>
                <span className="text-slate-400 font-semibold block">User Email:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedFeedback.user_email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Customer Tenant ID:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Customer #{selectedFeedback.customer_id}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Sentiment:</span>
                <div>{getSentimentBadge(selectedFeedback.sentiment)}</div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Status:</span>
                <div>{getStatusBadge(selectedFeedback.status)}</div>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">User Message:</span>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 whitespace-pre-wrap">
                {selectedFeedback.message}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Admin / Engineering Notes:</span>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Add internal resolution notes, tracking tickets, or action items..."
                rows={3}
                className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleUpdateStatus(selectedFeedback.id, 'IN_REVIEW', adminNote)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Mark In Review
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedFeedback.id, 'RESOLVED', adminNote)}
                  className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Resolve
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedFeedback.id, 'REJECTED', adminNote)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Dismiss
                </button>
              </div>

              <button
                onClick={() => {
                  handleUpdateStatus(selectedFeedback.id, selectedFeedback.status, adminNote);
                  setSelectedFeedback(null);
                }}
                className="px-4 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserFeedbackDashboard;
