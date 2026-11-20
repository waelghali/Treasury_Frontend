import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../services/apiService';
import {
  Calendar, Plus, Trash2, Globe, Clock, ShieldCheck,
  AlertCircle, CheckCircle2, RefreshCw, Sparkles,
  CalendarDays, Loader2, X
} from 'lucide-react';
import moment from 'moment';
import FormattedDateInput from 'components/FormattedDateInput';

export default function SystemHolidaysManagementPage() {
  const [holidays, setHolidays] = useState([]);
  const [settings, setSettings] = useState({
    weekend_scheme: 'MIDDLE_EAST',
    weekend_days_names: ['Friday', 'Saturday'],
    default_country: 'EG',
    custom_holidays_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHoliday, setNewHoliday] = useState({
    holiday_date: '',
    name: '',
    is_recurring: false,
    notes: ''
  });
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const [holsRes, settingsRes] = await Promise.all([
        apiRequest('/system-owner/holidays', 'GET'),
        apiRequest('/system-owner/holidays/calendar-settings', 'GET')
      ]);
      setHolidays(holsRes || []);
      if (settingsRes) setSettings(settingsRes);
    } catch (err) {
      console.error('Failed to load holidays calendar', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (newScheme, newCountry) => {
    try {
      setSavingSettings(true);
      const res = await apiRequest('/system-owner/holidays/calendar-settings', 'PUT', {
        weekend_scheme: newScheme || settings.weekend_scheme,
        default_country: newCountry || settings.default_country
      });
      setSettings(res);
      setStatusMsg({ type: 'success', text: 'Calendar settings updated successfully!' });
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update calendar settings' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!newHoliday.holiday_date || !newHoliday.name.trim()) return;

    try {
      await apiRequest('/system-owner/holidays', 'POST', newHoliday);
      setShowAddModal(false);
      setNewHoliday({ holiday_date: '', name: '', is_recurring: false, notes: '' });
      setStatusMsg({ type: 'success', text: 'Holiday added to system calendar!' });
      setTimeout(() => setStatusMsg(null), 3500);
      fetchCalendarData();
    } catch (err) {
      alert(err.message || 'Failed to add holiday');
    }
  };

  const handleDeleteHoliday = async (id, name) => {
    if (!window.confirm(`Delete holiday "${name}"?`)) return;
    try {
      await apiRequest(`/system-owner/holidays/${id}`, 'DELETE');
      setStatusMsg({ type: 'success', text: 'Holiday removed.' });
      setTimeout(() => setStatusMsg(null), 3000);
      fetchCalendarData();
    } catch (err) {
      alert(err.message || 'Failed to delete holiday');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <CalendarDays size={22} />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Banking Calendar &amp; SLA Holidays
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Centralized banking working days, regional weekend conventions, and system holiday overrides for precision turnaround calculation.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus size={16} /> Add Custom Holiday
        </button>
      </div>

      {/* Status Message */}
      {statusMsg && (
        <div className={`p-3.5 rounded-xl flex items-center gap-2.5 border ${
          statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-xs font-semibold">{statusMsg.text}</span>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Weekend Convention */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock size={14} className="text-indigo-500" /> Weekend Convention
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Active: {settings.weekend_scheme}
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Defines non-working days skipped in SLA turnaround calculation.
          </p>

          <select
            value={settings.weekend_scheme}
            onChange={(e) => handleSaveSettings(e.target.value, null)}
            disabled={savingSettings}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="MIDDLE_EAST">Middle East / GCC (Friday &amp; Saturday off)</option>
            <option value="WESTERN">Western / International (Saturday &amp; Sunday off)</option>
            <option value="FRIDAY_ONLY">Friday Off Only</option>
          </select>

          <div className="text-[11px] font-semibold text-slate-400">
            Non-working: <strong>{settings.weekend_days_names?.join(', ') || 'Friday, Saturday'}</strong>
          </div>
        </div>

        {/* Default Country for Public Holidays */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Globe size={14} className="text-emerald-500" /> National Public Holidays
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Auto-Synchronized
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Automatically calculates official public and religious bank holidays for the selected jurisdiction.
          </p>

          <select
            value={settings.default_country}
            onChange={(e) => handleSaveSettings(null, e.target.value)}
            disabled={savingSettings}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="EG">Egypt (EG) - Egyptian Central Bank Calendar</option>
            <option value="SA">Saudi Arabia (SA) - SAMA Calendar</option>
            <option value="AE">United Arab Emirates (AE) - CBUAE Calendar</option>
            <option value="US">United States (US) - Federal Reserve Calendar</option>
            <option value="GB">United Kingdom (GB) - Bank of England Calendar</option>
          </select>

          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <ShieldCheck size={12} className="text-emerald-600" /> National calendar active
          </div>
        </div>

        {/* SLA Engine Impact Info */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-5 rounded-2xl text-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-2">
              <Sparkles size={14} /> Turnaround Intelligence
            </div>
            <h3 className="font-bold text-white text-base leading-snug">
              Net Working Days Precision
            </h3>
            <p className="text-xs text-indigo-200/80 mt-1 leading-relaxed">
              When an LG is delivered Thursday and answered Sunday, calendar time is 3 days, but banking time is accurately logged as <strong>1 business day</strong>.
            </p>
          </div>

          <div className="pt-3 border-t border-indigo-800/60 flex items-center justify-between text-xs text-indigo-300">
            <span>Custom Overrides:</span>
            <span className="font-bold text-white">{holidays.length} active</span>
          </div>
        </div>
      </div>

      {/* Custom Holidays Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-base font-bold text-slate-900">Custom System Holidays &amp; Shutdowns</h2>
            <p className="text-xs text-slate-500 mt-0.5">Corporate-wide non-working days that take precedence over standard calendars.</p>
          </div>
          <button
            onClick={fetchCalendarData}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
            title="Refresh list"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="h-7 w-7 text-indigo-600 animate-spin mb-2" />
            <p className="text-sm font-medium">Loading holiday calendar...</p>
          </div>
        ) : holidays.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Calendar className="mx-auto text-slate-300" size={40} />
            <p className="font-semibold text-sm text-slate-600">No custom holiday overrides recorded.</p>
            <p className="text-xs text-slate-400">The system is currently using automated national public holidays and weekend rules.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5">Holiday Date</th>
                  <th className="px-4 py-2.5">Name / Occasion</th>
                  <th className="px-4 py-2.5">Recurrence</th>
                  <th className="px-4 py-2.5">Notes</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {holidays.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-slate-900 whitespace-nowrap">
                      {h.holiday_date ? moment(h.holiday_date).format('ddd, DD-MMM-YYYY') : '—'}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{h.name}</td>
                    <td className="px-4 py-2.5">
                      {h.is_recurring ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Annual Recurrence
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          One-time
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{h.notes || '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleDeleteHoliday(h.id, h.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Delete holiday"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Holiday Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <h3 className="font-bold text-slate-900 text-lg">Add Custom Holiday</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddHoliday} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Holiday Date *
                </label>
                <FormattedDateInput
                  required
                  value={newHoliday.holiday_date}
                  onChange={(e) => setNewHoliday({ ...newHoliday, holiday_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Holiday Name / Reason *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Bank Holiday, Annual System Freeze"
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={newHoliday.is_recurring}
                  onChange={(e) => setNewHoliday({ ...newHoliday, is_recurring: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label htmlFor="recurring" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Recurs every year on the same date
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context or circular reference"
                  value={newHoliday.notes}
                  onChange={(e) => setNewHoliday({ ...newHoliday, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 shadow-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm transition-all"
                >
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
