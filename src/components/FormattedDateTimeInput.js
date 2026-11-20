import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import moment from 'moment';
import { Clock } from 'lucide-react';
import FormattedDateInput from './FormattedDateInput';

const parseDateTimeParts = (val) => {
  const str = String(val || '').trim();
  if (!str) {
    return { datePart: '', hour24: 10, minute: 0 };
  }
  const [rawDate, rawTime] = str.split('T');
  const datePart = /^\d{4}-\d{2}-\d{2}$/.test(rawDate || '') ? rawDate : '';
  const timeMatch = String(rawTime || '').match(/^(\d{1,2}):(\d{1,2})/);
  const hour24 = timeMatch ? Math.min(23, Math.max(0, parseInt(timeMatch[1], 10))) : 10;
  const minute = timeMatch ? Math.min(59, Math.max(0, parseInt(timeMatch[2], 10))) : 0;
  return { datePart, hour24, minute };
};

const parseDateTimeBound = (bound, isMax = false) => {
  const str = String(bound || '').trim();
  if (!str) return null;
  const match = str.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{1,2}):(\d{1,2}))?/);
  if (!match) return null;
  const datePart = match[1];
  const hasTime = match[2] !== undefined && match[3] !== undefined;
  const hh = hasTime
    ? String(Math.min(23, Math.max(0, parseInt(match[2], 10)))).padStart(2, '0')
    : isMax
      ? '23'
      : '00';
  const mm = hasTime
    ? String(Math.min(59, Math.max(0, parseInt(match[3], 10)))).padStart(2, '0')
    : isMax
      ? '59'
      : '00';
  const momentObj = moment(`${datePart}T${hh}:${mm}`, 'YYYY-MM-DDTHH:mm', true);
  if (!momentObj.isValid()) return null;
  return { datePart, momentObj };
};

const toHour24 = (h12, period) => {
  if (period === 'AM') return h12 === 12 ? 0 : h12;
  return h12 === 12 ? 12 : h12 + 12;
};

const FormattedDateTimeInput = ({
  value,
  onChange,
  min,
  max,
  required = false,
  disabled = false,
  readOnly = false,
  id,
  name,
  className = '',
}) => {
  const isControlled = value !== undefined;
  const { datePart, hour24, minute } = useMemo(() => parseDateTimeParts(value), [value]);
  const minBound = useMemo(() => parseDateTimeBound(min, false), [min]);
  const maxBound = useMemo(() => parseDateTimeBound(max, true), [max]);
  const minDatePart = minBound?.datePart;
  const maxDatePart = maxBound?.datePart;

  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const hour12Str = String(hour12).padStart(2, '0');
  const minStr = String(minute).padStart(2, '0');
  const currentNormalizedIso = useMemo(
    () =>
      datePart
        ? `${datePart}T${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        : '',
    [datePart, hour24, minute]
  );

  const [hText, setHText] = useState(hour12Str);
  const [mText, setMText] = useState(minStr);
  const [syncTick, setSyncTick] = useState(0);

  const hourInputRef = useRef(null);
  const minInputRef = useRef(null);
  const isHourFocusedRef = useRef(false);
  const isMinFocusedRef = useRef(false);
  const isHourDirtyRef = useRef(false);
  const isMinDirtyRef = useRef(false);
  const pendingSyncRef = useRef(false);

  const requestControlledSync = useCallback(() => {
    if (!isControlled) return;
    pendingSyncRef.current = true;
    setSyncTick((t) => t + 1);
  }, [isControlled]);

  useEffect(() => {
    if (!isControlled) return;
    if (!isHourFocusedRef.current || pendingSyncRef.current) {
      setHText(hour12Str);
    }
    if (!isMinFocusedRef.current || pendingSyncRef.current) {
      setMText(minStr);
    }
    pendingSyncRef.current = false;
  }, [isControlled, hour12Str, minStr, syncTick]);

  const clampDateTimeMoment = useCallback(
    (m) => {
      if (!m || !m.isValid()) return m;
      let res = m.clone().seconds(0).milliseconds(0);
      if (minBound && res.isBefore(minBound.momentObj)) {
        res = minBound.momentObj.clone();
      }
      if (maxBound && res.isAfter(maxBound.momentObj)) {
        res = maxBound.momentObj.clone();
      }
      return res;
    },
    [minBound, maxBound]
  );

  const emitValue = useCallback(
    (isoDateTime) => {
      if (onChange) {
        onChange({
          target: {
            name,
            id,
            value: isoDateTime,
            type: 'datetime-local',
          },
        });
      }
    },
    [onChange, name, id]
  );

  const emit12h = useCallback(
    (nextDate, nextH12, nextMin, nextPeriod) => {
      const d =
        nextDate ||
        datePart ||
        minDatePart ||
        moment().format('YYYY-MM-DD');
      const h24 = toHour24(nextH12, nextPeriod);
      const hh = String(h24).padStart(2, '0');
      const mm = String(Math.min(59, Math.max(0, Number(nextMin) || 0))).padStart(2, '0');
      const rawCandidate = moment(`${d}T${hh}:${mm}`, 'YYYY-MM-DDTHH:mm', true);
      const clamped = clampDateTimeMoment(rawCandidate);
      if (!clamped || !clamped.isValid()) return;
      const clampedIso = clamped.format('YYYY-MM-DDTHH:mm');
      const clampedH24 = clamped.hour();
      const clampedH12 = clampedH24 % 12 === 0 ? 12 : clampedH24 % 12;
      setHText(String(clampedH12).padStart(2, '0'));
      setMText(String(clamped.minute()).padStart(2, '0'));
      if (clampedIso !== currentNormalizedIso) {
        emitValue(clampedIso);
      }
      requestControlledSync();
    },
    [datePart, minDatePart, clampDateTimeMoment, currentNormalizedIso, emitValue, requestControlledSync]
  );

  const handleHourKeyDown = (e) => {
    if (disabled || readOnly) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      isHourDirtyRef.current = false;
      const delta = e.key === 'ArrowUp' ? 1 : -1;
      const nextH = ((hour12 - 1 + delta + 12) % 12) + 1;
      setHText(String(nextH).padStart(2, '0'));
      emit12h(null, nextH, minute, period);
      window.requestAnimationFrame(() => hourInputRef.current?.select());
    } else if (e.key === 'Enter') {
      if (isHourDirtyRef.current) {
        isHourDirtyRef.current = false;
        let val = parseInt(hText, 10);
        if (isNaN(val)) {
          setHText(hour12Str);
          return;
        }
        if (val === 0) val = 12;
        if (val > 12) val = 12;
        emit12h(null, val, minute, period);
      }
    } else if (e.key === 'a' || e.key === 'A' || e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      let effectiveH = hour12;
      if (isHourDirtyRef.current) {
        const parsedH = parseInt(hText, 10);
        if (!isNaN(parsedH)) {
          effectiveH = parsedH === 0 ? 12 : Math.min(12, parsedH);
        }
        isHourDirtyRef.current = false;
      }
      emit12h(null, effectiveH, minute, e.key === 'p' || e.key === 'P' ? 'PM' : 'AM');
    } else if (
      e.key === 'ArrowRight' &&
      hourInputRef.current &&
      hourInputRef.current.selectionEnd === hText.length
    ) {
      e.preventDefault();
      minInputRef.current?.focus();
      minInputRef.current?.select();
    }
  };

  const handleMinKeyDown = (e) => {
    if (disabled || readOnly) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      isMinDirtyRef.current = false;
      const step = e.shiftKey ? 5 : 1;
      const delta = e.key === 'ArrowUp' ? step : -step;
      const nextM = (minute + delta + 60) % 60;
      setMText(String(nextM).padStart(2, '0'));
      emit12h(null, hour12, nextM, period);
      window.requestAnimationFrame(() => minInputRef.current?.select());
    } else if (e.key === 'Enter') {
      if (isMinDirtyRef.current) {
        isMinDirtyRef.current = false;
        const val = parseInt(mText, 10);
        if (isNaN(val)) {
          setMText(minStr);
          return;
        }
        const clamped = Math.min(59, Math.max(0, val));
        emit12h(null, hour12, clamped, period);
      }
    } else if (e.key === 'a' || e.key === 'A' || e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      let effectiveM = minute;
      if (isMinDirtyRef.current) {
        const parsedM = parseInt(mText, 10);
        if (!isNaN(parsedM)) {
          effectiveM = Math.min(59, Math.max(0, parsedM));
        }
        isMinDirtyRef.current = false;
      }
      emit12h(null, hour12, effectiveM, e.key === 'p' || e.key === 'P' ? 'PM' : 'AM');
    } else if (
      e.key === 'ArrowLeft' &&
      minInputRef.current &&
      minInputRef.current.selectionStart === 0
    ) {
      e.preventDefault();
      hourInputRef.current?.focus();
      hourInputRef.current?.select();
    }
  };

  const handleHourChange = (e) => {
    if (disabled || readOnly) return;
    const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
    if (!digits) {
      isHourDirtyRef.current = true;
      setHText('');
      return;
    }
    if (digits.length === 1) {
      const dNum = parseInt(digits, 10);
      if (dNum >= 2 && dNum <= 9) {
        isHourDirtyRef.current = false;
        emit12h(null, dNum, minute, period);
        window.requestAnimationFrame(() => {
          minInputRef.current?.focus();
          minInputRef.current?.select();
        });
      } else {
        isHourDirtyRef.current = true;
        setHText(digits);
      }
      return;
    }
    let val = parseInt(digits, 10);
    if (val === 0) val = 12;
    if (val > 12) val = 12;
    isHourDirtyRef.current = false;
    emit12h(null, val, minute, period);
    window.requestAnimationFrame(() => {
      minInputRef.current?.focus();
      minInputRef.current?.select();
    });
  };

  const handleMinChange = (e) => {
    if (disabled || readOnly) return;
    const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
    if (!digits) {
      isMinDirtyRef.current = true;
      setMText('');
      return;
    }
    if (digits.length === 1) {
      const dNum = parseInt(digits, 10);
      if (dNum >= 6 && dNum <= 9) {
        isMinDirtyRef.current = false;
        emit12h(null, hour12, dNum, period);
      } else {
        isMinDirtyRef.current = true;
        setMText(digits);
      }
      return;
    }
    const val = Math.min(59, Math.max(0, parseInt(digits, 10)));
    isMinDirtyRef.current = false;
    emit12h(null, hour12, val, period);
  };

  const handleHourBlur = () => {
    isHourFocusedRef.current = false;
    const wasDirty = isHourDirtyRef.current;
    isHourDirtyRef.current = false;
    if (disabled || readOnly || !wasDirty) {
      setHText(hour12Str);
      return;
    }
    let val = parseInt(hText, 10);
    if (isNaN(val)) {
      setHText(hour12Str);
      return;
    }
    if (val === 0) val = 12;
    if (val > 12) val = 12;
    emit12h(null, val, minute, period);
  };

  const handleMinBlur = () => {
    isMinFocusedRef.current = false;
    const wasDirty = isMinDirtyRef.current;
    isMinDirtyRef.current = false;
    if (disabled || readOnly || !wasDirty) {
      setMText(minStr);
      return;
    }
    const val = parseInt(mText, 10);
    if (isNaN(val)) {
      setMText(minStr);
      return;
    }
    const clamped = Math.min(59, Math.max(0, val));
    emit12h(null, hour12, clamped, period);
  };

  return (
    <div className={`w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 ${className}`.trim()}>
      <div className="flex-1 min-w-0">
        <FormattedDateInput
          id={id ? `${id}-date` : undefined}
          name={name ? `${name}-date` : undefined}
          value={datePart}
          min={minDatePart}
          max={maxDatePart}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(e) => {
            if (disabled || readOnly) return;
            if (!e.target.value) {
              if (currentNormalizedIso !== '' || Boolean(value)) {
                emitValue('');
              }
              return;
            }
            emit12h(e.target.value, hour12, minute, period);
          }}
          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
        />
      </div>

      <div
        className={`h-[42px] inline-flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-1.5 gap-2.5 shrink-0 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 ${
          disabled ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''
        }`}
      >
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-blue-600 mr-0.5 shrink-0" />

          <input
            ref={hourInputRef}
            type="text"
            inputMode="numeric"
            maxLength={2}
            disabled={disabled}
            readOnly={readOnly}
            value={hText}
            onFocus={(e) => {
              isHourFocusedRef.current = true;
              isHourDirtyRef.current = false;
              e.target.select();
            }}
            onClick={(e) => e.target.select()}
            onChange={handleHourChange}
            onKeyDown={handleHourKeyDown}
            onBlur={handleHourBlur}
            aria-label="Hour"
            title="Hour (01-12) — type or use Up/Down arrows"
            className="w-7 text-center text-sm font-bold text-slate-800 tabular-nums bg-slate-100/70 hover:bg-slate-200/60 focus:bg-blue-50 focus:text-blue-700 rounded-md py-0.5 border-0 focus:outline-none"
          />
          <span className="text-slate-400 font-bold select-none">:</span>
          <input
            ref={minInputRef}
            type="text"
            inputMode="numeric"
            maxLength={2}
            disabled={disabled}
            readOnly={readOnly}
            value={mText}
            onFocus={(e) => {
              isMinFocusedRef.current = true;
              isMinDirtyRef.current = false;
              e.target.select();
            }}
            onClick={(e) => e.target.select()}
            onChange={handleMinChange}
            onKeyDown={handleMinKeyDown}
            onBlur={handleMinBlur}
            aria-label="Minute"
            title="Minute (00-59) — type or use Up/Down arrows (Shift for 5m)"
            className="w-7 text-center text-sm font-bold text-slate-800 tabular-nums bg-slate-100/70 hover:bg-slate-200/60 focus:bg-blue-50 focus:text-blue-700 rounded-md py-0.5 border-0 focus:outline-none"
          />
        </div>

        <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/70">
          {['AM', 'PM'].map((p) => {
            const isActive = period === p;
            return (
              <button
                key={p}
                type="button"
                disabled={disabled || readOnly}
                onClick={() => {
                  if (disabled || readOnly) return;
                  emit12h(null, hour12, minute, p);
                }}
                className={`px-2 py-0.5 text-[11px] font-bold rounded-md shadow-none border-0 transition-all ${
                  isActive
                    ? 'bg-white text-blue-700'
                    : 'bg-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FormattedDateTimeInput;
