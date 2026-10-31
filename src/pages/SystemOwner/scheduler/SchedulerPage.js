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
  ArrowUpDown,
  Sparkles,
  Check,
  Repeat
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

const DAYS_OF_WEEK = [
  { key: 'sun', label: 'Sun', full: 'Sunday' },
  { key: 'mon', label: 'Mon', full: 'Monday' },
  { key: 'tue', label: 'Tue', full: 'Tuesday' },
  { key: 'wed', label: 'Wed', full: 'Wednesday' },
  { key: 'thu', label: 'Thu', full: 'Thursday' },
  { key: 'fri', label: 'Fri', full: 'Friday' },
  { key: 'sat', label: 'Sat', full: 'Saturday' },
];

const HOURS_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const ampm = i >= 12 ? 'PM' : 'AM';
  const display12 = i % 12 === 0 ? 12 : i % 12;
  const pad = String(i).padStart(2, '0');
  return {
    value: i,
    label: `${pad}:00 (${display12} ${ampm})`,
  };
});

// Upgraded Interactive Reschedule Modal Component
function RescheduleModal({ job, onClose, onSaved }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Trigger Type: 'cron' or 'date'
  const isDateInitial = job?.trigger?.toLowerCase().startsWith('date[');
  const [triggerType, setTriggerType] = useState(isDateInitial ? 'date' : 'cron');

  // Cron Mode: 'daily' | 'interval' | 'advanced'
  const [cronMode, setCronMode] = useState('daily');

  // Daily Frequency: 'once' | 'twice' | 'thrice' | 'custom'
  const [dailyFreq, setDailyFreq] = useState('once');
  const [hour1, setHour1] = useState(9);
  const [hour2, setHour2] = useState(15);
  const [hour3, setHour3] = useState(18);
  const [customHours, setCustomHours] = useState('9, 15');
  const [minute, setMinute] = useState(0);

  // Interval Mode
  const [intervalPreset, setIntervalPreset] = useState('2h');
  const [workHoursOnly, setWorkHoursOnly] = useState(false);

  // Days of week
  const [dayPreset, setDayPreset] = useState('egypt_workdays');
  const [selectedDays, setSelectedDays] = useState(['sun', 'mon', 'tue', 'wed', 'thu']);

  // Advanced Cron
  const [advancedHour, setAdvancedHour] = useState('*');
  const [advancedMinute, setAdvancedMinute] = useState('0');
  const [advancedDays, setAdvancedDays] = useState('*');

  // Date mode
  const [runDate, setRunDate] = useState('');

  // Initial populate from existing job trigger
  useEffect(() => {
    if (!job?.trigger) return;
    const trig = job.trigger;

    if (trig.toLowerCase().startsWith('date[')) {
      setTriggerType('date');
      const match = trig.match(/run_date='([^']+)'/);
      if (match) {
        setRunDate(moment(match[1]).format('YYYY-MM-DDTHH:mm'));
      }
      return;
    }

    setTriggerType('cron');

    // Parse days
    const dayMatch = trig.match(/day_of_week='([^']+)'/);
    if (dayMatch) {
      const raw = dayMatch[1].toLowerCase().trim();
      const spl = raw.split(',').map((d) => d.trim());
      setSelectedDays(spl);
      if (raw === 'sun,mon,tue,wed,thu') setDayPreset('egypt_workdays');
      else if (raw === 'mon,tue,wed,thu,fri' || raw === 'mon-fri') setDayPreset('intl_workdays');
      else if (raw === 'fri,sat') setDayPreset('weekends');
      else if (raw === '*' || spl.length === 7) setDayPreset('all_week');
      else setDayPreset('custom');
    } else {
      setDayPreset('all_week');
      setSelectedDays(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
    }

    // Parse minute
    const minMatch = trig.match(/minute='([^']+)'/);
    if (minMatch) {
      const mVal = minMatch[1];
      if (!isNaN(parseInt(mVal, 10))) {
        setMinute(parseInt(mVal, 10));
      }
    }

    // Parse hour
    const hourMatch = trig.match(/hour='([^']+)'/);
    if (hourMatch) {
      const hVal = hourMatch[1];
      if (hVal.includes(',')) {
        const parts = hVal.split(',').map((h) => parseInt(h.trim(), 10)).filter((h) => !isNaN(h));
        setCronMode('daily');
        if (parts.length === 2) {
          setDailyFreq('twice');
          setHour1(parts[0]);
          setHour2(parts[1]);
        } else if (parts.length === 3) {
          setDailyFreq('thrice');
          setHour1(parts[0]);
          setHour2(parts[1]);
          setHour3(parts[2]);
        } else {
          setDailyFreq('custom');
          setCustomHours(hVal);
        }
      } else if (hVal.startsWith('*/')) {
        setCronMode('interval');
        const num = hVal.replace('*/', '');
        setIntervalPreset(`${num}h`);
      } else if (hVal.startsWith('8-17/')) {
        setCronMode('interval');
        setWorkHoursOnly(true);
        const num = hVal.replace('8-17/', '');
        setIntervalPreset(`${num}h`);
      } else if (!isNaN(parseInt(hVal, 10))) {
        setCronMode('daily');
        setDailyFreq('once');
        setHour1(parseInt(hVal, 10));
      } else if (hVal === '8-17' && minMatch && minMatch[1].startsWith('*/')) {
        setCronMode('interval');
        setWorkHoursOnly(true);
        const m = minMatch[1].replace('*/', '');
        setIntervalPreset(`${m}m`);
      } else {
        setCronMode('advanced');
        setAdvancedHour(hVal);
        setAdvancedMinute(minMatch ? minMatch[1] : '0');
        setAdvancedDays(dayMatch ? dayMatch[1] : '*');
      }
    }

    if (minMatch && minMatch[1].startsWith('*/')) {
      setCronMode('interval');
      setIntervalPreset(minMatch[1] === '*/5' ? '5m' : minMatch[1] === '*/15' ? '15m' : '30m');
    }
  }, [job]);

  // Handle Day preset selection
  const handleDayPresetChange = (preset) => {
    setDayPreset(preset);
    if (preset === 'egypt_workdays') {
      setSelectedDays(['sun', 'mon', 'tue', 'wed', 'thu']);
    } else if (preset === 'all_week') {
      setSelectedDays(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
    } else if (preset === 'intl_workdays') {
      setSelectedDays(['mon', 'tue', 'wed', 'thu', 'fri']);
    } else if (preset === 'weekends') {
      setSelectedDays(['fri', 'sat']);
    }
  };

  // Toggle single day
  const toggleDay = (dayKey) => {
    let updated;
    if (selectedDays.includes(dayKey)) {
      if (selectedDays.length === 1) {
        toast.warn('At least one day must be selected.');
        return;
      }
      updated = selectedDays.filter((d) => d !== dayKey);
    } else {
      updated = [...selectedDays, dayKey];
    }
    setSelectedDays(updated);
    setDayPreset('custom');
  };

  // Compute live human summary
  const summary = useMemo(() => {
    if (triggerType === 'date') {
      return {
        text: runDate
          ? `One-time execution scheduled for ${moment(runDate).format('MMM D, YYYY [at] hh:mm A')} (Cairo Time)`
          : 'Please select a date and time',
        tech: runDate ? `date[run_date='${moment(runDate).tz('Africa/Cairo').toISOString()}']` : '',
      };
    }

    // Days label
    let daysLabel = 'All Days';
    let daysTech = '*';
    if (dayPreset === 'egypt_workdays') {
      daysLabel = 'Egypt Workdays (Sun - Thu)';
      daysTech = 'sun,mon,tue,wed,thu';
    } else if (dayPreset === 'intl_workdays') {
      daysLabel = 'Mon - Fri';
      daysTech = 'mon,tue,wed,thu,fri';
    } else if (dayPreset === 'weekends') {
      daysLabel = 'Weekends (Fri - Sat)';
      daysTech = 'fri,sat';
    } else if (dayPreset === 'custom') {
      daysLabel = selectedDays.map((d) => d.toUpperCase()).join(', ');
      daysTech = selectedDays.join(',');
    }

    const minPad = String(minute).padStart(2, '0');

    if (cronMode === 'daily') {
      if (dailyFreq === 'once') {
        const h1Pad = String(hour1).padStart(2, '0');
        return {
          text: `Runs once daily at ${h1Pad}:${minPad} on ${daysLabel} (Cairo Time)`,
          tech: `cron[day_of_week='${daysTech}', hour='${hour1}', minute='${minute}']`,
        };
      }
      if (dailyFreq === 'twice') {
        const h1Pad = String(hour1).padStart(2, '0');
        const h2Pad = String(hour2).padStart(2, '0');
        return {
          text: `Runs twice daily at ${h1Pad}:${minPad} and ${h2Pad}:${minPad} on ${daysLabel} (Cairo Time)`,
          tech: `cron[day_of_week='${daysTech}', hour='${hour1},${hour2}', minute='${minute}']`,
        };
      }
      if (dailyFreq === 'thrice') {
        const h1Pad = String(hour1).padStart(2, '0');
        const h2Pad = String(hour2).padStart(2, '0');
        const h3Pad = String(hour3).padStart(2, '0');
        return {
          text: `Runs 3 times daily at ${h1Pad}:${minPad}, ${h2Pad}:${minPad}, and ${h3Pad}:${minPad} on ${daysLabel} (Cairo Time)`,
          tech: `cron[day_of_week='${daysTech}', hour='${hour1},${hour2},${hour3}', minute='${minute}']`,
        };
      }
      return {
        text: `Runs at hours [${customHours}] at minute :${minPad} on ${daysLabel} (Cairo Time)`,
        tech: `cron[day_of_week='${daysTech}', hour='${customHours.trim()}', minute='${minute}']`,
      };
    }

    if (cronMode === 'interval') {
      let intervalDesc = '';
      let hTech = '*';
      let mTech = String(minute);

      if (intervalPreset === '5m') {
        intervalDesc = 'Every 5 minutes';
        mTech = '*/5';
      } else if (intervalPreset === '15m') {
        intervalDesc = 'Every 15 minutes';
        mTech = '*/15';
      } else if (intervalPreset === '30m') {
        intervalDesc = 'Every 30 minutes';
        mTech = '0,30';
      } else {
        const hoursNum = parseInt(intervalPreset.replace('h', ''), 10) || 1;
        intervalDesc = `Every ${hoursNum} hour${hoursNum > 1 ? 's' : ''}`;
        hTech = workHoursOnly ? `8-17/${hoursNum}` : `*/${hoursNum}`;
      }

      if (workHoursOnly && intervalPreset.endsWith('h')) {
        intervalDesc += ' (during working hours 08:00 - 17:00)';
      }

      return {
        text: `Runs ${intervalDesc} on ${daysLabel} (Cairo Time)`,
        tech: `cron[day_of_week='${daysTech}', hour='${hTech}', minute='${mTech}']`,
      };
    }

    return {
      text: `Advanced Cron: hour="${advancedHour}", minute="${advancedMinute}" on ${daysLabel} (Cairo Time)`,
      tech: `cron[day_of_week='${daysTech}', hour='${advancedHour}', minute='${advancedMinute}']`,
    };
  }, [
    triggerType,
    runDate,
    dayPreset,
    selectedDays,
    cronMode,
    dailyFreq,
    hour1,
    hour2,
    hour3,
    customHours,
    minute,
    intervalPreset,
    workHoursOnly,
    advancedHour,
    advancedMinute,
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = { trigger_type: triggerType };

      if (triggerType === 'date') {
        if (!runDate) {
          toast.warn('Please select a valid date and time.');
          setIsSubmitting(false);
          return;
        }
        payload.run_date = moment(runDate).tz('Africa/Cairo').toISOString();
      } else {
        payload.timezone = 'Africa/Cairo';

        // Day of week
        if (dayPreset === 'all_week') {
          payload.day_of_week = '*';
        } else if (dayPreset === 'egypt_workdays') {
          payload.day_of_week = 'sun,mon,tue,wed,thu';
        } else if (dayPreset === 'intl_workdays') {
          payload.day_of_week = 'mon,tue,wed,thu,fri';
        } else if (dayPreset === 'weekends') {
          payload.day_of_week = 'fri,sat';
        } else {
          if (!selectedDays || selectedDays.length === 0) {
            toast.warn('Please select at least one active day.');
            setIsSubmitting(false);
            return;
          }
          payload.day_of_week = selectedDays.join(',');
        }

        // Hour and minute
        if (cronMode === 'daily') {
          if (dailyFreq === 'once') {
            payload.hour = String(hour1);
            payload.minute = String(minute);
          } else if (dailyFreq === 'twice') {
            payload.hour = `${hour1},${hour2}`;
            payload.minute = String(minute);
          } else if (dailyFreq === 'thrice') {
            payload.hour = `${hour1},${hour2},${hour3}`;
            payload.minute = String(minute);
          } else {
            if (!customHours.trim()) {
              toast.warn('Please enter at least one hour.');
              setIsSubmitting(false);
              return;
            }
            payload.hour = customHours.trim();
            payload.minute = String(minute);
          }
        } else if (cronMode === 'interval') {
          if (intervalPreset === '5m') {
            payload.hour = '*';
            payload.minute = '*/5';
          } else if (intervalPreset === '15m') {
            payload.hour = '*';
            payload.minute = '*/15';
          } else if (intervalPreset === '30m') {
            payload.hour = '*';
            payload.minute = '0,30';
          } else {
            const hNum = parseInt(intervalPreset.replace('h', ''), 10) || 1;
            payload.hour = workHoursOnly ? `8-17/${hNum}` : `*/${hNum}`;
            payload.minute = String(minute);
          }
        } else if (cronMode === 'advanced') {
          if (!advancedHour.trim()) {
            toast.warn('Please specify the hour pattern.');
            setIsSubmitting(false);
            return;
          }
          payload.hour = advancedHour.trim();
          payload.minute = advancedMinute.trim() || '0';
          if (advancedDays.trim() && advancedDays !== '*') {
            payload.day_of_week = advancedDays.trim();
          }
        }
      }

      const response = await apiRequest(`/system-owner/scheduler/reschedule_job/${job.id}`, 'POST', payload);
      toast.success(response.message || 'Job rescheduled successfully.');
      onSaved();
    } catch (err) {
      toast.error(`Rescheduling failed: ${err.message || err}`);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="relative p-6 border border-slate-200 w-full max-w-xl shadow-2xl rounded-2xl bg-white text-left max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-black text-slate-900">Reschedule Automated Task</h3>
            <p className="text-xs text-slate-500 mt-0.5">{job.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Active Trigger Summary */}
        <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Current Active Trigger
          </span>
          <span className="text-xs font-mono text-slate-700 block mt-0.5 break-all">{job.trigger}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Trigger Type Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setTriggerType('cron')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                triggerType === 'cron'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              Recurring Schedule (Cron)
            </button>
            <button
              type="button"
              onClick={() => setTriggerType('date')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                triggerType === 'date'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              One-Time Execution (Date)
            </button>
          </div>

          {triggerType === 'cron' ? (
            <>
              {/* Scheduling Mode Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Scheduling Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCronMode('daily')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                      cronMode === 'daily'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Daily at Fixed Times</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCronMode('interval')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                      cronMode === 'interval'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Repeat className="w-4 h-4" />
                    <span>Periodic Interval</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCronMode('advanced')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                      cronMode === 'advanced'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Advanced Cron</span>
                  </button>
                </div>
              </div>

              {/* Mode 1: Daily Runs */}
              {cronMode === 'daily' && (
                <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Daily Frequency
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { key: 'once', label: 'Once Daily' },
                        { key: 'twice', label: 'Twice Daily' },
                        { key: 'thrice', label: '3x Daily' },
                        { key: 'custom', label: 'Custom Hours' },
                      ].map((f) => (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => setDailyFreq(f.key)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                            dailyFreq === f.key
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {dailyFreq === 'once' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Run Hour
                        </label>
                        <select
                          value={hour1}
                          onChange={(e) => setHour1(parseInt(e.target.value, 10))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {HOURS_OPTIONS.map((h) => (
                            <option key={h.value} value={h.value}>
                              {h.label}
                            </option>
                          ))}
                        </select>
                        <span className="text-[10px] text-slate-400 mt-1 block">Cairo Time (EEST)</span>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Minute
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={minute}
                          onChange={(e) =>
                            setMinute(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">0 - 59 mins (e.g. :00)</span>
                      </div>
                    </div>
                  )}

                  {dailyFreq === 'twice' && (
                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          1st Run
                        </label>
                        <select
                          value={hour1}
                          onChange={(e) => setHour1(parseInt(e.target.value, 10))}
                          className="w-full px-2.5 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {HOURS_OPTIONS.map((h) => (
                            <option key={h.value} value={h.value}>
                              {h.label}
                            </option>
                          ))}
                        </select>
                        <span className="text-[10px] text-slate-400 mt-1 block">e.g. 09:00 AM</span>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          2nd Run
                        </label>
                        <select
                          value={hour2}
                          onChange={(e) => setHour2(parseInt(e.target.value, 10))}
                          className="w-full px-2.5 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {HOURS_OPTIONS.map((h) => (
                            <option key={h.value} value={h.value}>
                              {h.label}
                            </option>
                          ))}
                        </select>
                        <span className="text-[10px] text-slate-400 mt-1 block">e.g. 03:00 PM</span>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Minute
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={minute}
                          onChange={(e) =>
                            setMinute(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))
                          }
                          className="w-full px-2.5 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">:00 top of hour</span>
                      </div>
                    </div>
                  )}

                  {dailyFreq === 'thrice' && (
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          1st Run
                        </label>
                        <select
                          value={hour1}
                          onChange={(e) => setHour1(parseInt(e.target.value, 10))}
                          className="w-full px-2 py-2 border border-slate-200 rounded-xl text-xs bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {HOURS_OPTIONS.map((h) => (
                            <option key={h.value} value={h.value}>
                              {h.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          2nd Run
                        </label>
                        <select
                          value={hour2}
                          onChange={(e) => setHour2(parseInt(e.target.value, 10))}
                          className="w-full px-2 py-2 border border-slate-200 rounded-xl text-xs bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {HOURS_OPTIONS.map((h) => (
                            <option key={h.value} value={h.value}>
                              {h.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          3rd Run
                        </label>
                        <select
                          value={hour3}
                          onChange={(e) => setHour3(parseInt(e.target.value, 10))}
                          className="w-full px-2 py-2 border border-slate-200 rounded-xl text-xs bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {HOURS_OPTIONS.map((h) => (
                            <option key={h.value} value={h.value}>
                              {h.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Minute
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={minute}
                          onChange={(e) =>
                            setMinute(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))
                          }
                          className="w-full px-2 py-2 border border-slate-200 rounded-xl text-xs bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {dailyFreq === 'custom' && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Hours (Comma Separated, 0-23)
                        </label>
                        <input
                          type="text"
                          value={customHours}
                          onChange={(e) => setCustomHours(e.target.value)}
                          placeholder="e.g. 8, 12, 16"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          e.g. "9, 15" for 9 AM and 3 PM
                        </span>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Minute
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={minute}
                          onChange={(e) =>
                            setMinute(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mode 2: Interval Runs */}
              {cronMode === 'interval' && (
                <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Repeat Every
                      </label>
                      <select
                        value={intervalPreset}
                        onChange={(e) => setIntervalPreset(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <optgroup label="Hours">
                          <option value="1h">Every 1 Hour</option>
                          <option value="2h">Every 2 Hours</option>
                          <option value="3h">Every 3 Hours</option>
                          <option value="4h">Every 4 Hours</option>
                          <option value="6h">Every 6 Hours</option>
                          <option value="8h">Every 8 Hours</option>
                          <option value="12h">Every 12 Hours</option>
                        </optgroup>
                        <optgroup label="Minutes">
                          <option value="5m">Every 5 Minutes</option>
                          <option value="15m">Every 15 Minutes</option>
                          <option value="30m">Every 30 Minutes</option>
                        </optgroup>
                      </select>
                    </div>

                    {intervalPreset.endsWith('h') ? (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Minute of Hour
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={minute}
                          onChange={(e) =>
                            setMinute(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">e.g. :00 top of hour</span>
                      </div>
                    ) : (
                      <div className="flex flex-col justify-center">
                        <span className="text-xs text-slate-500 mt-3">Runs continuously at the selected minute interval.</span>
                      </div>
                    )}
                  </div>

                  {intervalPreset.endsWith('h') && (
                    <div className="pt-1">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={workHoursOnly}
                          onChange={(e) => setWorkHoursOnly(e.target.checked)}
                          className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        Restrict to Business Hours Only (08:00 - 17:00 Cairo Time)
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Mode 3: Advanced Cron */}
              {cronMode === 'advanced' && (
                <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Hour
                      </label>
                      <input
                        type="text"
                        value={advancedHour}
                        onChange={(e) => setAdvancedHour(e.target.value)}
                        placeholder="e.g. 8-17, 9,15, *"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Minute
                      </label>
                      <input
                        type="text"
                        value={advancedMinute}
                        onChange={(e) => setAdvancedMinute(e.target.value)}
                        placeholder="e.g. 0, */15, 0,30"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Day of Week
                      </label>
                      <input
                        type="text"
                        value={advancedDays}
                        onChange={(e) => setAdvancedDays(e.target.value)}
                        placeholder="e.g. sun,mon,tue"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    APScheduler Cron expression fields (evaluated in Africa/Cairo timezone).
                  </span>
                </div>
              )}

              {/* Active Days (Weekdays) Selector */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Active Days
                  </label>
                  <span className="text-[11px] font-semibold text-blue-600">
                    {selectedDays.length} day{selectedDays.length === 1 ? '' : 's'} active
                  </span>
                </div>

                {/* Preset Buttons */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {[
                    { key: 'egypt_workdays', label: 'Sun - Thu (Egypt Workdays)' },
                    { key: 'all_week', label: 'All 7 Days' },
                    { key: 'intl_workdays', label: 'Mon - Fri' },
                    { key: 'weekends', label: 'Fri - Sat (Weekends)' },
                  ].map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handleDayPresetChange(p.key)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium border transition-colors ${
                        dayPreset === p.key
                          ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Interactive Day Chips */}
                <div className="grid grid-cols-7 gap-1">
                  {DAYS_OF_WEEK.map((d) => {
                    const isSel = selectedDays.includes(d.key);
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => toggleDay(d.key)}
                        title={d.full}
                        className={`py-1.5 text-xs font-bold rounded-lg border text-center transition-all ${
                          isSel
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* One-Time Date Execution */
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Execution Date & Time
              </label>
              <input
                type="datetime-local"
                value={runDate}
                onChange={(e) => setRunDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 block">
                Calculated according to Cairo Time (Africa/Cairo timezone).
              </span>
            </div>
          )}

          {/* Live Dynamic Preview Banner */}
          <div className="p-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 rounded-xl border border-blue-200/60">
            <div className="flex items-start gap-2.5">
              <div className="p-1 bg-blue-600 text-white rounded-md mt-0.5 shrink-0">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                  Schedule Preview
                </span>
                <p className="text-xs font-semibold text-slate-800 mt-0.5 leading-snug">
                  {summary.text}
                </p>
                {summary.tech && (
                  <code className="text-[11px] font-mono text-blue-900/70 block mt-1 break-all bg-white/60 px-1.5 py-0.5 rounded border border-blue-200/50">
                    {summary.tech}
                  </code>
                )}
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Schedule
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search job name, ID, trigger, function..."
              className="w-full !pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <RescheduleModal
          job={rescheduleJob}
          onClose={() => setRescheduleJob(null)}
          onSaved={() => {
            setRescheduleJob(null);
            fetchJobs();
          }}
        />
      )}
    </div>
  );
}

export default SchedulerPage;