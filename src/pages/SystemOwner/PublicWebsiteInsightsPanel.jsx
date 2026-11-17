// frontend/src/pages/SystemOwner/PublicWebsiteInsightsPanel.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Globe,
  Play,
  Sparkles,
  Users,
  MousePointerClick,
  Search,
  RefreshCw,
  Download,
  Eye,
  Copy,
  Check,
  Smartphone,
  Monitor,
  Tablet,
  ArrowUpRight,
  Filter,
  X,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { formatDateTime } from 'utils/dateFormat';

const DAY_WINDOWS = [
  { value: 1, label: 'Today (24h)' },
  { value: 7, label: '7 Days' },
  { value: 14, label: '14 Days' },
  { value: 30, label: '30 Days' },
  { value: 90, label: '90 Days' },
];

const PAGE_BADGE_LABELS = {
  landing: 'Website (/)',
  demo: 'Demo (/demo)',
  know_more: 'Overview (/know-more)',
  free_trial: 'Free Trial',
};

const CONVERSION_LABELS = {
  book_meeting_submit: 'Meeting Requested',
  book_meeting_click: 'Clicked Book Meeting',
  free_trial_submit: 'Trial Submitted',
  free_trial_click: 'Clicked Free Trial',
  brochure_download: 'Downloaded Brochure',
};

export default function PublicWebsiteInsightsPanel() {
  const [days, setDays] = useState(14);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  const [subTab, setSubTab] = useState('chat_qa'); // 'chat_qa' | 'sessions'
  const [searchTerm, setSearchTerm] = useState('');
  const [langFilter, setLangFilter] = useState('ALL');
  const [journeyFilter, setJourneyFilter] = useState('ALL'); // 'ALL' | 'DEMO' | 'CHAT' | 'INTENT'
  const [sessionFilterId, setSessionFilterId] = useState('');

  const [selectedChat, setSelectedChat] = useState(null);
  const [copiedChat, setCopiedChat] = useState(false);

  const fetchAnalytics = useCallback(async (windowDays = days) => {
    setLoading(true);
    setErrorText('');
    try {
      const response = await apiClient.get(`/public-demo/admin/analytics?days=${windowDays}`);
      setAnalytics(response.data || null);
    } catch (err) {
      console.error('Failed to load public website & demo analytics:', err);
      setErrorText('Could not load website, demo, and chatbot analytics.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchAnalytics(days);
  }, [days, fetchAnalytics]);

  const kpis = analytics?.kpis || {
    unique_visitors: 0,
    total_sessions: 0,
    total_pageviews: 0,
    landing_visitors: 0,
    demo_visitors: 0,
    demo_visit_rate_pct: 0,
    story_viewers: 0,
    story_completers: 0,
    story_completion_rate_pct: 0,
    workflow_explorers: 0,
    chatbot_openers: 0,
    chatbot_active_users: 0,
    chatbot_interaction_rate_pct: 0,
    total_chat_questions: 0,
    avg_questions_per_chatter: 0,
    high_intent_leads: 0,
    meeting_submissions: 0,
    trial_submissions: 0,
    brochure_downloads: 0,
  };

  const dailySeries = useMemo(() => analytics?.daily_series || [], [analytics]);
  const maxDailyMetric = useMemo(() => {
    let maxVal = 1;
    dailySeries.forEach((d) => {
      maxVal = Math.max(maxVal, d.visitors || 0, d.demo_visitors || 0, d.chat_questions || 0);
    });
    return maxVal;
  }, [dailySeries]);

  const moduleInterest = useMemo(() => analytics?.module_interest || [], [analytics]);
  const maxModuleInteractions = useMemo(() => {
    let maxVal = 1;
    moduleInterest.forEach((m) => {
      maxVal = Math.max(maxVal, m.total_interactions || 0);
    });
    return maxVal;
  }, [moduleInterest]);

  const filteredChats = useMemo(() => {
    const list = analytics?.chat_logs || [];
    const q = searchTerm.trim().toLowerCase();
    return list.filter((item) => {
      if (sessionFilterId && item.session_id !== sessionFilterId) return false;
      if (langFilter !== 'ALL' && (item.lang || 'en').toUpperCase() !== langFilter) return false;
      if (!q) return true;
      return (
        (item.question || '').toLowerCase().includes(q) ||
        (item.answer || '').toLowerCase().includes(q) ||
        (item.topic || '').toLowerCase().includes(q) ||
        (item.page_context || '').toLowerCase().includes(q) ||
        (item.short_id || '').toLowerCase().includes(q)
      );
    });
  }, [analytics, langFilter, searchTerm, sessionFilterId]);

  const filteredSessions = useMemo(() => {
    const list = analytics?.recent_sessions || [];
    const q = searchTerm.trim().toLowerCase();
    return list.filter((s) => {
      if (journeyFilter === 'DEMO' && !(s.pages_visited || []).includes('demo') && (s.stories_played || []).length === 0 && (s.tours_opened || []).length === 0) {
        return false;
      }
      if (journeyFilter === 'CHAT' && !(s.chat_count > 0)) return false;
      if (journeyFilter === 'INTENT' && !(s.conversions || []).length) return false;
      if (!q) return true;
      return (
        (s.short_id || '').toLowerCase().includes(q) ||
        (s.source || '').toLowerCase().includes(q) ||
        (s.country || '').toLowerCase().includes(q) ||
        (s.pages_visited || []).join(' ').toLowerCase().includes(q) ||
        (s.stories_played || []).join(' ').toLowerCase().includes(q) ||
        (s.tours_opened || []).join(' ').toLowerCase().includes(q)
      );
    });
  }, [analytics, journeyFilter, searchTerm]);

  const handleExportCsv = () => {
    if (subTab === 'chat_qa') {
      if (filteredChats.length === 0) return;
      const headers = ['Timestamp', 'Visitor', 'Page Context', 'Language', 'Topic', 'Question', 'AI Answer', 'Latency (ms)'];
      const rows = filteredChats.map((c) => [
        c.timestamp || '',
        c.short_id || c.session_id || '',
        `"${(c.page_context || '').replace(/"/g, '""')}"`,
        (c.lang || 'en').toUpperCase(),
        c.topic || '',
        `"${(c.question || '').replace(/"/g, '""')}"`,
        `"${(c.answer || '').replace(/"/g, '""')}"`,
        c.latency_ms || 0,
      ]);
      const csv = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI(csv));
      link.setAttribute('download', `Grow_Public_AI_Chat_Questions_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      if (filteredSessions.length === 0) return;
      const headers = ['Visitor', 'Source', 'Country', 'Device', 'Language', 'Pages Visited', 'Stories Played', 'Tours Opened', 'Chat Questions', 'High-Intent Actions', 'Last Seen'];
      const rows = filteredSessions.map((s) => [
        s.short_id || '',
        `"${(s.source || 'Direct').replace(/"/g, '""')}"`,
        s.country || '',
        s.device || '',
        (s.lang || 'en').toUpperCase(),
        `"${(s.pages_visited || []).join(' -> ')}"`,
        `"${(s.stories_played || []).join(', ')}"`,
        `"${(s.tours_opened || []).join(', ')}"`,
        s.chat_count || 0,
        `"${(s.conversions || []).join(', ')}"`,
        s.last_seen || '',
      ]);
      const csv = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI(csv));
      link.setAttribute('download', `Grow_Public_Visitor_Journeys_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCopyExchange = (chatItem) => {
    if (!chatItem) return;
    const text = `Visitor Question (${chatItem.page_context || 'demo'}):\n${chatItem.question}\n\nGrow AI Answer:\n${chatItem.answer}`;
    navigator.clipboard.writeText(text);
    setCopiedChat(true);
    setTimeout(() => setCopiedChat(false), 2200);
  };

  const renderDeviceIcon = (dev) => {
    if (dev === 'mobile') return <Smartphone className="w-3 h-3 text-slate-400 inline mr-1" />;
    if (dev === 'tablet') return <Tablet className="w-3 h-3 text-slate-400 inline mr-1" />;
    return <Monitor className="w-3 h-3 text-slate-400 inline mr-1" />;
  };

  return (
    <div className="space-y-3 pb-4">
      {/* Window Controls & Export Toolbar */}
      <div className="bg-white dark:bg-slate-800 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 mr-1">Time Window:</span>
          {DAY_WINDOWS.map((w) => (
            <button
              key={w.value}
              type="button"
              onClick={() => setDays(w.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                days === w.value
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchAnalytics(days)}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={subTab === 'chat_qa' ? filteredChats.length === 0 : filteredSessions.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all"
          >
            <Download className="w-3 h-3" />
            <span>{subTab === 'chat_qa' ? 'Export Chat Q&A CSV' : 'Export Journeys CSV'}</span>
          </button>
        </div>
      </div>

      {errorText && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2 rounded-xl text-xs font-semibold">
          {errorText}
        </div>
      )}

      {/* 6-Card Executive Funnel KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Website Visitors</span>
            <Globe className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{kpis.unique_visitors}</div>
          <div className="text-[10.5px] text-slate-500 font-medium">
            {kpis.total_pageviews} pageviews · {kpis.total_sessions} sessions
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-blue-200/80 dark:border-slate-700">
          <div className="flex items-center justify-between text-[10px] font-bold text-blue-600 uppercase tracking-wider">
            <span>Visited /demo</span>
            <Play className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-black text-blue-700 dark:text-blue-400 mt-0.5">{kpis.demo_visitors}</div>
          <div className="text-[10.5px] text-slate-500 font-medium">
            {kpis.demo_visit_rate_pct}% of website visitors
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-purple-200/80 dark:border-slate-700">
          <div className="flex items-center justify-between text-[10px] font-bold text-purple-600 uppercase tracking-wider">
            <span>Story Viewers</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-black text-purple-700 dark:text-purple-400 mt-0.5">{kpis.story_viewers}</div>
          <div className="text-[10.5px] text-slate-500 font-medium">
            {kpis.story_completion_rate_pct}% watched to end
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
            <span>Tour Explorers</span>
            <MousePointerClick className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-700 dark:text-indigo-400 mt-0.5">{kpis.workflow_explorers}</div>
          <div className="text-[10.5px] text-slate-500 font-medium">
            Opened hands-on workflows
          </div>
        </div>

        <div className="bg-amber-50/40 dark:bg-slate-800 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50">
          <div className="flex items-center justify-between text-[10px] font-bold text-amber-700 uppercase tracking-wider">
            <span>AI Chatbot Users</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-700 dark:text-amber-400 mt-0.5">
            {kpis.chatbot_active_users}
            <span className="text-xs font-bold text-amber-600 ml-1.5">({kpis.total_chat_questions} Qs)</span>
          </div>
          <div className="text-[10.5px] text-slate-500 font-medium">
            {kpis.chatbot_interaction_rate_pct}% chatted · {kpis.chatbot_openers} opened
          </div>
        </div>

        <div className="bg-emerald-50/40 dark:bg-slate-800 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
          <div className="flex items-center justify-between text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
            <span>High-Intent</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">{kpis.high_intent_leads}</div>
          <div className="text-[10.5px] text-slate-500 font-medium">
            {kpis.meeting_submissions} mtgs · {kpis.trial_submissions} trials · {kpis.brochure_downloads} PDFs
          </div>
        </div>
      </div>

      {/* 3-Card Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
        {/* Card 1: Daily Trend Chart */}
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-black text-slate-800 dark:text-white">Daily Traffic & AI Questions</h3>
              <p className="text-[10.5px] text-slate-400">Blue: Website Visitors · Amber: AI Questions</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="inline-flex items-center gap-1 text-blue-600">
                <span className="w-2 h-2 rounded-xs bg-blue-500" /> Visitors
              </span>
              <span className="inline-flex items-center gap-1 text-amber-600">
                <span className="w-2 h-2 rounded-xs bg-amber-500" /> Chat Qs
              </span>
            </div>
          </div>

          {dailySeries.length === 0 ? (
            <div className="h-28 flex items-center justify-center text-xs text-slate-400">No activity yet</div>
          ) : (
            <div className="h-32 flex items-end gap-1 pt-4 border-b border-slate-100 dark:border-slate-700 pb-1 overflow-x-auto">
              {dailySeries.slice(-14).map((d) => {
                const vPct = Math.max((d.visitors / maxDailyMetric) * 100, d.visitors > 0 ? 8 : 2);
                const cPct = Math.max((d.chat_questions / maxDailyMetric) * 100, d.chat_questions > 0 ? 8 : 0);
                const shortDate = d.date.slice(5);
                return (
                  <div
                    key={d.date}
                    className="flex-1 min-w-[18px] h-full flex flex-col items-center justify-end group relative"
                    title={`${d.date}: ${d.visitors} visitors (${d.demo_visitors} demo), ${d.chat_questions} AI questions`}
                  >
                    <div className="w-full flex items-end justify-center gap-0.5 flex-1">
                      <div
                        style={{ height: `${vPct}%` }}
                        className="w-2 bg-blue-500/85 group-hover:bg-blue-600 rounded-t-xs transition-all"
                      />
                      {d.chat_questions > 0 && (
                        <div
                          style={{ height: `${cPct}%` }}
                          className="w-2 bg-amber-500/90 group-hover:bg-amber-600 rounded-t-xs transition-all"
                        />
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 font-mono">{shortDate}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Page Views Mini Summary */}
          <div className="grid grid-cols-2 gap-1.5 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700">
            {(analytics?.page_breakdown || []).map((pg) => (
              <div key={pg.page} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 px-2 py-1 rounded-lg text-[10.5px]">
                <span className="text-slate-600 dark:text-slate-300 font-semibold truncate">{pg.label}</span>
                <span className="font-black text-slate-900 dark:text-white ml-1">{pg.unique_visitors}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Module Interest & Executive Story Completion */}
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-800 dark:text-white">Module Popularity & Stories</h3>
              <p className="text-[10.5px] text-slate-400">Combined story plays, tour opens & module AI questions</p>
            </div>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>

          <div className="space-y-2">
            {moduleInterest.map((m) => {
              const barPct = Math.round(((m.total_interactions || 0) / maxModuleInteractions) * 100);
              return (
                <div key={m.module_id} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{m.label}</span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      <strong className="text-slate-900 dark:text-white">{m.total_interactions}</strong> total ({m.story_plays} story · {m.workflow_opens} tours · {m.chat_questions} chat)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.max(barPct, m.total_interactions > 0 ? 5 : 0)}%` }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Executive Story Completion Rates
            </span>
            <div className="grid grid-cols-2 gap-1 text-[10.5px]">
              {(analytics?.story_breakdown || []).map((st) => (
                <div key={st.story_id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 px-2 py-1 rounded-md">
                  <span className="text-slate-600 dark:text-slate-300 truncate mr-1">{st.label.replace('75s ', '').replace('65s ', '')}</span>
                  <span className="font-bold text-purple-700 dark:text-purple-400 whitespace-nowrap">
                    {st.plays} ({st.completion_pct}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Traffic Sources, Devices, Languages & Top Chat Topics */}
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-2.5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-xs font-black text-slate-800 dark:text-white">Traffic Sources, Devices & Languages</h3>
              <Users className="w-4 h-4 text-emerald-500" />
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {(analytics?.source_breakdown || []).length === 0 ? (
                <span className="text-[11px] text-slate-400">No referrer data yet</span>
              ) : (
                (analytics?.source_breakdown || []).slice(0, 6).map((src) => (
                  <span
                    key={src.source}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-[10.5px] font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <span>{src.source}:</span>
                    <strong className="text-indigo-600 dark:text-indigo-400">{src.sessions}</strong>
                  </span>
                ))
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap text-[10.5px] pt-1 border-t border-slate-100 dark:border-slate-700">
              {(analytics?.device_breakdown || []).map((dv) => (
                <span key={dv.device} className="inline-flex items-center px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-900 text-slate-600 font-semibold capitalize">
                  {renderDeviceIcon(dv.device)}
                  {dv.device}: <strong className="ml-1 text-slate-900 dark:text-white">{dv.sessions}</strong>
                </span>
              ))}
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">
                EN: {analytics?.language_breakdown?.en || 0} · AR: {analytics?.language_breakdown?.ar || 0}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Top AI Chatbot Topics Asked
            </span>
            <div className="flex flex-wrap gap-1">
              {(analytics?.topic_breakdown || []).length === 0 ? (
                <span className="text-[11px] text-slate-400">No chatbot questions in this window yet</span>
              ) : (
                (analytics?.topic_breakdown || []).slice(0, 6).map((tp) => (
                  <button
                    key={tp.topic}
                    type="button"
                    onClick={() => {
                      setSubTab('chat_qa');
                      setSearchTerm(tp.topic);
                    }}
                    className="px-2 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[10.5px] font-semibold text-amber-800 transition-colors"
                  >
                    {tp.topic.replace(/_/g, ' ')} ({tp.count})
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs + Search + Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubTab('chat_qa')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              subTab === 'chat_qa'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Chatbot Q&A Log ({filteredChats.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('sessions')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              subTab === 'sessions'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Visitor Session Journeys ({filteredSessions.length})</span>
          </button>

          {sessionFilterId && (
            <button
              type="button"
              onClick={() => setSessionFilterId('')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold"
            >
              <Filter className="w-3 h-3" />
              <span>Filtered to 1 Visitor</span>
              <X className="w-3 h-3 ml-0.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end min-w-[240px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                subTab === 'chat_qa'
                  ? 'Search questions, answers, topics, or #visitor...'
                  : 'Search #visitor, source (LinkedIn), page, or tour...'
              }
              className="w-full !pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {subTab === 'chat_qa' ? (
            <select
              value={langFilter}
              onChange={(e) => setLangFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option value="ALL">All Languages</option>
              <option value="EN">English (EN)</option>
              <option value="AR">Arabic (AR)</option>
            </select>
          ) : (
            <select
              value={journeyFilter}
              onChange={(e) => setJourneyFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option value="ALL">All Visitors</option>
              <option value="DEMO">Visited /demo</option>
              <option value="CHAT">Interacted with AI Chatbot</option>
              <option value="INTENT">High-Intent (Meeting / Trial / PDF)</option>
            </select>
          )}
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-1.5" />
            <p className="text-xs font-medium">Loading website, demo & chatbot analytics...</p>
          </div>
        ) : subTab === 'chat_qa' ? (
          filteredChats.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <p className="text-xs font-bold text-slate-600">No AI Chatbot questions recorded for this filter yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Questions asked on `/` and `/demo` appear here automatically.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 border-b border-slate-100 dark:border-slate-700 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">Visitor</th>
                    <th className="py-2.5 px-3">Page / Module</th>
                    <th className="py-2.5 px-3">Visitor Question</th>
                    <th className="py-2.5 px-3">AI Answer Preview</th>
                    <th className="py-2.5 px-3">Topic</th>
                    <th className="py-2.5 px-3">Lang</th>
                    <th className="py-2.5 px-3">Asked At</th>
                    <th className="py-2.5 px-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredChats.map((item, idx) => (
                    <tr
                      key={`${item.timestamp}-${idx}`}
                      onClick={() => setSelectedChat(item)}
                      className="hover:bg-amber-50/40 dark:hover:bg-slate-700/40 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-3 font-mono font-bold text-indigo-600 whitespace-nowrap">
                        {item.short_id || '#anon'}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10.5px] font-semibold text-slate-700 dark:text-slate-200">
                          {item.page_context || 'demo'}
                        </span>
                      </td>
                      <td className="py-2 px-3 max-w-[260px] truncate font-semibold text-slate-900 dark:text-white" title={item.question}>
                        {item.question}
                      </td>
                      <td className="py-2 px-3 max-w-[280px] truncate text-slate-500 dark:text-slate-300" title={item.answer}>
                        {item.answer}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                          {(item.topic || 'general').slice(0, 26)}
                        </span>
                      </td>
                      <td className="py-2 px-3 uppercase font-bold text-[10.5px] text-slate-600">
                        {item.lang || 'en'}
                      </td>
                      <td className="py-2 px-3 text-[10.5px] text-slate-500 whitespace-nowrap">
                        {item.timestamp ? formatDateTime(item.timestamp, 'N/A') : 'N/A'}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedChat(item)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold"
                        >
                          <Eye className="w-3 h-3 inline mr-0.5" />
                          Read
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredSessions.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <p className="text-xs font-bold text-slate-600">No visitor journeys match your filter yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 border-b border-slate-100 dark:border-slate-700 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Visitor</th>
                  <th className="py-2.5 px-3">Source & Device</th>
                  <th className="py-2.5 px-3">Pages Visited</th>
                  <th className="py-2.5 px-3">Demo Stories & Tours</th>
                  <th className="py-2.5 px-3">AI Chatbot</th>
                  <th className="py-2.5 px-3">Conversions</th>
                  <th className="py-2.5 px-3">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredSessions.map((s) => (
                  <tr key={s.session_id} className="hover:bg-indigo-50/30 dark:hover:bg-slate-700/40 transition-colors">
                    <td className="py-2 px-3 font-mono font-bold text-indigo-600 whitespace-nowrap">
                      {s.short_id}
                      {s.country ? (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9.5px] font-sans font-bold">
                          {s.country}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 mr-1.5">{s.source || 'Direct'}</span>
                      <span className="text-[10.5px] text-slate-400 capitalize">
                        {renderDeviceIcon(s.device)}
                        {s.device} · {(s.lang || 'en').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-1">
                        {(s.pages_visited || []).map((pg) => (
                          <span
                            key={pg}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              pg === 'demo'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {PAGE_BADGE_LABELS[pg] || pg}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-1">
                        {(s.stories_played || []).map((st) => {
                          const done = (s.stories_completed || []).includes(st);
                          return (
                            <span
                              key={st}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                done
                                  ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                  : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}
                              title={done ? 'Watched full story to completion' : 'Started story'}
                            >
                              {done ? '✓ ' : '▶ '}
                              {st}
                            </span>
                          );
                        })}
                        {(s.tours_opened || []).map((tr) => (
                          <span key={tr} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                            Tour {tr}
                          </span>
                        ))}
                        {(s.stories_played || []).length === 0 && (s.tours_opened || []).length === 0 && (
                          <span className="text-[10.5px] text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {s.chat_count > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSessionFilterId(s.session_id);
                            setSubTab('chat_qa');
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[10.5px] font-bold"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>{s.chat_count} {s.chat_count === 1 ? 'Question' : 'Questions'} →</span>
                        </button>
                      ) : s.opened_chat ? (
                        <span className="text-[10.5px] font-semibold text-slate-500">Opened Panel</span>
                      ) : (
                        <span className="text-[10.5px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-1">
                        {(s.conversions || []).length === 0 ? (
                          <span className="text-[10.5px] text-slate-400">—</span>
                        ) : (
                          (s.conversions || []).map((c) => (
                            <span key={c} className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                              {CONVERSION_LABELS[c] || c}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-[10.5px] text-slate-500 whitespace-nowrap">
                      {s.last_seen ? formatDateTime(s.last_seen, 'N/A') : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full AI Chatbot Q&A Transcript Modal */}
      {selectedChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-indigo-600 text-sm">{selectedChat.short_id || '#anon'}</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                  Context: {selectedChat.page_context || 'demo'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                  {selectedChat.topic || 'general'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {selectedChat.timestamp ? formatDateTime(selectedChat.timestamp, '') : ''} · {selectedChat.latency_ms || 0}ms
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChat(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Visitor Question:
              </span>
              <div
                dir={selectedChat.lang === 'ar' ? 'rtl' : 'ltr'}
                className="p-3 bg-indigo-50/60 dark:bg-slate-900 rounded-xl text-xs font-bold text-slate-900 dark:text-white border border-indigo-100 dark:border-slate-700"
              >
                {selectedChat.question}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Grow AI Product Expert Answer:
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyExchange(selectedChat)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition-colors"
                >
                  {copiedChat ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Q&A</span>
                    </>
                  )}
                </button>
              </div>
              <div
                dir={selectedChat.lang === 'ar' ? 'rtl' : 'ltr'}
                className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed"
              >
                {selectedChat.answer}
              </div>
            </div>

            {Array.isArray(selectedChat.actions) && selectedChat.actions.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Proof Links Shown:</span>
                {selectedChat.actions.map((act, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10.5px] font-semibold">
                    {act.type}:{act.id}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
              {selectedChat.session_id ? (
                <button
                  type="button"
                  onClick={() => {
                    setSessionFilterId(selectedChat.session_id);
                    setSelectedChat(null);
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Filter all questions by {selectedChat.short_id || 'this visitor'} →
                </button>
              ) : <span />}
              <button
                type="button"
                onClick={() => setSelectedChat(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
