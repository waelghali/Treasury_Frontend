// frontend/src/pages/SystemOwner/UserFeedbackDashboard.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  RefreshCw,
  Lightbulb,
  Bug,
  Zap,
  Download,
  Eye,
  Copy,
  Check
} from 'lucide-react';
import apiClient from '../../services/apiClient';

const UserFeedbackDashboard = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sentimentFilter, setSentimentFilter] = useState('ALL');

  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  const handleCopyFeedback = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2500);
  };

  const fetchFeedbacks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/feedback/');
      setFeedbacks(response.data || []);
    } catch (err) {
      console.error('Failed to fetch user feedbacks:', err);
      setError('Could not load user feedback records.');
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

  const stats = useMemo(() => {
    const total = feedbacks.length;
    const newCount = feedbacks.filter((f) => f.status === 'NEW').length;
    const features = feedbacks.filter((f) => f.feedback_type === 'FEATURE_REQUEST').length;
    const bugs = feedbacks.filter((f) => f.feedback_type === 'BUG_REPORT').length;
    const usability = feedbacks.filter((f) => f.feedback_type === 'USABILITY_PAIN_POINT').length;
    const resolved = feedbacks.filter((f) => f.status === 'RESOLVED').length;
    return { total, newCount, features, bugs, usability, resolved };
  }, [feedbacks]);

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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200">
            <Lightbulb className="w-2.5 h-2.5 text-amber-600" />
            Feature
          </span>
        );
      case 'BUG_REPORT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200">
            <Bug className="w-2.5 h-2.5 text-rose-600" />
            Bug
          </span>
        );
      case 'USABILITY_PAIN_POINT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200">
            <Zap className="w-2.5 h-2.5 text-purple-600" />
            Usability
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <MessageSquare className="w-2.5 h-2.5 text-blue-600" />
            General
          </span>
        );
    }
  };

  const getSentimentBadge = (sentiment) => {
    switch (sentiment) {
      case 'POSITIVE':
        return <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">🟢 Positive</span>;
      case 'NEGATIVE':
        return <span className="text-[11px] font-medium text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">🔴 Critical</span>;
      default:
        return <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">⚪ Neutral</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'NEW':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse border border-amber-300">NEW</span>;
      case 'IN_REVIEW':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-300">IN REVIEW</span>;
      case 'RESOLVED':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">RESOLVED</span>;
      case 'REJECTED':
        return <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-300">DISMISSED</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3 overflow-y-auto">
      {/* Compact Header */}
      <div className="flex-shrink-0 flex items-center justify-between bg-white dark:bg-slate-800 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              User Feedback & Feature Requests
            </h1>
            <p className="text-[11px] text-slate-400">
              Live suggestions, bug reports, and UX friction points captured by AI Assistant.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchFeedbacks}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportToCSV}
            disabled={filteredFeedbacks.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-all"
          >
            <Download className="w-3 h-3" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Compact KPI Tiles */}
      <div className="flex-shrink-0 grid grid-cols-3 sm:grid-cols-6 gap-2">
        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total</span>
          <span className="text-lg font-black text-slate-900 dark:text-white block">{stats.total}</span>
        </div>
        <div className="bg-amber-50/50 dark:bg-slate-800 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50 text-center">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">New</span>
          <span className="text-lg font-black text-amber-700 block">{stats.newCount}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Features</span>
          <span className="text-lg font-black text-amber-600 block">{stats.features}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Bugs</span>
          <span className="text-lg font-black text-rose-600 block">{stats.bugs}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
          <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider block">Usability</span>
          <span className="text-lg font-black text-purple-600 block">{stats.usability}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Resolved</span>
          <span className="text-lg font-black text-emerald-600 block">{stats.resolved}</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search feedback notes, user email, or Ref ID..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
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
            className="px-2 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
          >
            <option value="ALL">All Categories</option>
            <option value="FEATURE_REQUEST">Feature Requests</option>
            <option value="BUG_REPORT">Bug Reports</option>
            <option value="USABILITY_PAIN_POINT">Usability Pain Points</option>
            <option value="GENERAL_FEEDBACK">General Feedback</option>
          </select>
        </div>
      </div>

      {/* Main Table (Viewport-Fit Container with Sticky Header) */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden flex flex-col min-h-0">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-1" />
            <p className="text-xs font-medium">Loading feedback inbox...</p>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-1">
            <p className="text-xs font-bold text-slate-600">No feedback items match your criteria.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 shadow-2xs">
                <tr className="border-b border-slate-100 dark:border-slate-700 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-3">Ref</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">User & Tenant</th>
                  <th className="py-2.5 px-3">Message / Request</th>
                  <th className="py-2.5 px-3">Sentiment</th>
                  <th className="py-2.5 px-3">Submitted</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredFeedbacks.map((fb) => (
                  <tr
                    key={fb.id}
                    onClick={() => {
                      setSelectedFeedback(fb);
                      setAdminNote(fb.admin_notes || '');
                    }}
                    className="hover:bg-indigo-50/40 dark:hover:bg-slate-700/40 cursor-pointer transition-colors"
                  >
                    <td className="py-2 px-3 font-mono font-bold text-indigo-600">
                      #FB-{fb.id}
                    </td>
                    <td className="py-2 px-3">
                      {getTypeBadge(fb.feedback_type)}
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                        {fb.user_email || 'Anonymous'}
                      </div>
                      <div className="text-[9px] text-slate-400">Tenant #{fb.customer_id}</div>
                    </td>
                    <td className="py-2 px-3 max-w-xs truncate font-medium text-slate-700 dark:text-slate-300" title={fb.message}>
                      {fb.message}
                    </td>
                    <td className="py-2 px-3">
                      {getSentimentBadge(fb.sentiment)}
                    </td>
                    <td className="py-2 px-3 text-slate-500 text-[10px]">
                      {fb.created_at ? new Date(fb.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </td>
                    <td className="py-2 px-3">
                      {getStatusBadge(fb.status)}
                    </td>
                    <td className="py-2 px-3 text-right space-x-1 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setSelectedFeedback(fb);
                          setAdminNote(fb.admin_notes || '');
                        }}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold"
                      >
                        <Eye className="w-3 h-3 inline mr-0.5" />
                        View
                      </button>

                      {fb.status === 'NEW' && (
                        <button
                          onClick={() => handleUpdateStatus(fb.id, 'IN_REVIEW')}
                          className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px] font-semibold"
                        >
                          Review
                        </button>
                      )}

                      {fb.status !== 'RESOLVED' && (
                        <button
                          onClick={() => handleUpdateStatus(fb.id, 'RESOLVED')}
                          className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[11px] font-semibold"
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-indigo-600 text-base">#FB-{selectedFeedback.id}</span>
                {getTypeBadge(selectedFeedback.feedback_type)}
              </div>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl">
              <div>
                <span className="text-slate-400 font-semibold block text-[10px]">User Email:</span>
                <span className="font-bold text-slate-800">{selectedFeedback.user_email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px]">Customer Tenant:</span>
                <span className="font-bold text-slate-800">Tenant #{selectedFeedback.customer_id}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Feedback Content & AI Evaluation Details:
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyFeedback(selectedFeedback.message)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 dark:bg-slate-700/80 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition-colors"
                  title="Copy full feedback content to clipboard"
                >
                  {copiedFeedback ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 animate-scale-in" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Details</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed font-sans select-all">
                {selectedFeedback.message}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Admin Resolution Notes:</span>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Add internal resolution notes, tracking tickets, or action items..."
                rows={2}
                className="w-full text-xs p-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleUpdateStatus(selectedFeedback.id, 'IN_REVIEW', adminNote)}
                  className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold"
                >
                  Mark In Review
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedFeedback.id, 'RESOLVED', adminNote)}
                  className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold"
                >
                  Resolve
                </button>
              </div>

              <button
                onClick={() => {
                  handleUpdateStatus(selectedFeedback.id, selectedFeedback.status, adminNote);
                  setSelectedFeedback(null);
                }}
                className="px-3.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold"
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
