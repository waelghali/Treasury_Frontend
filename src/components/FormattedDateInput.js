import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './FormattedDateInput.css';
import { Portal } from '@headlessui/react';
import moment from 'moment';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const ACCEPTED_PARSE_FORMATS = [
  'DD-MMM-YYYY',
  'D-MMM-YYYY',
  'DD MMM YYYY',
  'D MMM YYYY',
  'YYYY-MM-DD',
  'DD/MM/YYYY',
  'D/M/YYYY',
  'DD-MM-YYYY',
  'D-M-YYYY',
];

const COMPLETE_DATE_PATTERNS = [
  /^\d{1,2}-[A-Za-z]{3}-\d{4}$/,
  /^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/,
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{1,2}\/\d{1,2}\/\d{4}$/,
  /^\d{1,2}-\d{1,2}-\d{4}$/,
];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const SEGMENT_ORDER = ['days', 'months', 'years'];
const SEGMENT_RANGES = {
  days: [0, 2],
  months: [3, 6],
  years: [7, 11],
};

const POPOVER_WIDTH = 276;
const POPOVER_MIN_SPACE = 350;
const POPOVER_GAP = 6;

const toLocalDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : moment(val).startOf('day').toDate();
  }
  const str = String(val).trim();
  if (!str) return null;
  const strict = moment(str, 'YYYY-MM-DD', true);
  if (strict.isValid()) return strict.startOf('day').toDate();
  const fallback = moment(str);
  return fallback.isValid() ? fallback.startOf('day').toDate() : null;
};

const parseFlexibleDate = (text) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  for (let i = 0; i < ACCEPTED_PARSE_FORMATS.length; i += 1) {
    const parsed = moment(trimmed, ACCEPTED_PARSE_FORMATS[i], true);
    if (parsed.isValid()) {
      return parsed.startOf('day');
    }
  }
  return null;
};

const getSegmentAtCursor = (text, pos) => {
  const str = String(text || '');
  const cursor = typeof pos === 'number' ? pos : str.length;
  if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(str)) {
    if (cursor <= 2) return 'days';
    if (cursor <= 6) return 'months';
    return 'years';
  }
  const prefix = str.slice(0, Math.max(0, cursor));
  const sepCount = (prefix.match(/[-/\s]/g) || []).length;
  if (/^\d{4}-/.test(str)) {
    if (sepCount === 0) return 'years';
    if (sepCount === 1) return 'months';
    return 'days';
  }
  if (sepCount === 0) return 'days';
  if (sepCount === 1) return 'months';
  return 'years';
};

/**
 * Reusable date input displaying DD-MMM-YYYY (e.g., 16-Nov-2026) while
 * emitting ISO YYYY-MM-DD strings via a standard synthetic onChange event
 * (and supporting Formik <Field component={FormattedDateInput} />).
 */
const FormattedDateInput = ({
  field,
  form,
  name,
  id,
  value,
  onChange,
  min,
  max,
  required = false,
  disabled = false,
  readOnly = false,
  placeholder = 'DD-MMM-YYYY',
  className = '',
  style,
  title,
  showIcon = true,
  'aria-label': ariaLabel,
}) => {
  const actualName = name ?? field?.name;
  const actualValue = value !== undefined ? value : field?.value;
  const isControlled = value !== undefined || field !== undefined;

  const selectedDate = useMemo(() => toLocalDate(actualValue), [actualValue]);
  const minDate = useMemo(() => toLocalDate(min), [min]);
  const maxDate = useMemo(() => toLocalDate(max), [max]);

  const currentIso = useMemo(
    () => (selectedDate ? moment(selectedDate).format('YYYY-MM-DD') : ''),
    [selectedDate]
  );

  const formattedSelected = useMemo(
    () => (selectedDate ? moment(selectedDate).format('DD-MMM-YYYY') : ''),
    [selectedDate]
  );

  const [inputText, setInputText] = useState(formattedSelected);
  const [syncTick, setSyncTick] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [popoverCoords, setPopoverCoords] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    placement: 'bottom',
  });

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const popoverRef = useRef(null);
  const isFocusedRef = useRef(false);
  const pendingSyncRef = useRef(false);
  const lockedPlacementRef = useRef('bottom');

  const requestControlledSync = useCallback(() => {
    if (!isControlled) return;
    pendingSyncRef.current = true;
    setSyncTick((t) => t + 1);
  }, [isControlled]);

  useEffect(() => {
    if (!isControlled) return;
    if (!isFocusedRef.current || pendingSyncRef.current) {
      pendingSyncRef.current = false;
      setInputText(formattedSelected);
    }
  }, [isControlled, formattedSelected, syncTick]);

  const clampMoment = useCallback(
    (m) => {
      if (!m || !m.isValid()) return m;
      let res = m.clone().startOf('day');
      if (minDate) {
        const minM = moment(minDate).startOf('day');
        if (res.isBefore(minM)) res = minM;
      }
      if (maxDate) {
        const maxM = moment(maxDate).startOf('day');
        if (res.isAfter(maxM)) res = maxM;
      }
      return res;
    },
    [minDate, maxDate]
  );

  const emitDateChange = useCallback(
    (date) => {
      const formattedValue =
        date && moment(date).isValid() ? moment(date).format('YYYY-MM-DD') : '';
      if (form && actualName) {
        form.setFieldValue(actualName, formattedValue);
        form.setFieldTouched(actualName, true, false);
      }
      if (onChange) {
        onChange({
          target: {
            name: actualName,
            id,
            value: formattedValue,
            type: 'date',
          },
        });
      }
    },
    [form, actualName, onChange, id]
  );

  const computePopoverCoords = useCallback((placement) => {
    if (!wrapperRef.current) return null;
    const rect = wrapperRef.current.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - POPOVER_WIDTH - 8);
    const left = Math.min(Math.max(8, rect.left), maxLeft);
    return {
      placement,
      left,
      top: rect.bottom + POPOVER_GAP,
      bottom: Math.max(8, window.innerHeight - rect.top + POPOVER_GAP),
    };
  }, []);

  const openCalendar = useCallback(() => {
    if (disabled || readOnly || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const placement =
      spaceBelow < POPOVER_MIN_SPACE && spaceAbove > POPOVER_MIN_SPACE ? 'top' : 'bottom';
    lockedPlacementRef.current = placement;
    const coords = computePopoverCoords(placement);
    if (coords) {
      setPopoverCoords(coords);
      setIsOpen(true);
    }
  }, [disabled, readOnly, computePopoverCoords]);

  const toggleCalendar = useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      openCalendar();
    }
  }, [isOpen, openCalendar]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleOutsideMouseDown = (e) => {
      const insideWrapper = wrapperRef.current && wrapperRef.current.contains(e.target);
      const insidePopover = popoverRef.current && popoverRef.current.contains(e.target);
      if (!insideWrapper && !insidePopover) {
        setIsOpen(false);
      }
    };

    const handleReposition = () => {
      const coords = computePopoverCoords(lockedPlacementRef.current);
      if (coords) {
        setPopoverCoords(coords);
      }
    };

    document.addEventListener('mousedown', handleOutsideMouseDown);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      document.removeEventListener('mousedown', handleOutsideMouseDown);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isOpen, computePopoverCoords]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    let minYear = 1990;
    let maxYear = currentYear + 25;
    if (minDate) minYear = Math.min(minYear, minDate.getFullYear());
    if (maxDate) maxYear = Math.max(maxYear, maxDate.getFullYear());
    if (selectedDate) {
      minYear = Math.min(minYear, selectedDate.getFullYear());
      maxYear = Math.max(maxYear, selectedDate.getFullYear());
    }
    const years = [];
    for (let y = minYear; y <= maxYear; y += 1) {
      years.push(y);
    }
    return years;
  }, [minDate, maxDate, selectedDate]);

  const isTodayAllowed = useMemo(() => {
    const todayM = moment().startOf('day');
    if (minDate && todayM.isBefore(moment(minDate).startOf('day'))) return false;
    if (maxDate && todayM.isAfter(moment(maxDate).startOf('day'))) return false;
    return true;
  }, [minDate, maxDate]);

  const handleInputChange = (e) => {
    if (disabled || readOnly) return;
    const raw = e.target.value;
    setInputText(raw);
    setIsOpen(false);
    const trimmed = raw.trim();
    if (!trimmed) {
      if (currentIso !== '' || Boolean(actualValue)) {
        emitDateChange(null);
      }
      return;
    }
    const isCompletePattern = COMPLETE_DATE_PATTERNS.some((re) => re.test(trimmed));
    if (isCompletePattern) {
      const parsed = parseFlexibleDate(trimmed);
      if (parsed) {
        const clamped = clampMoment(parsed);
        if (clamped.format('YYYY-MM-DD') !== currentIso) {
          emitDateChange(clamped.toDate());
        }
      }
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
      return;
    }

    if (e.key === 'Enter') {
      if (disabled || readOnly) {
        setIsOpen(false);
        return;
      }
      const trimmed = inputText.trim();
      if (!trimmed) {
        setInputText('');
        if (currentIso !== '' || Boolean(actualValue)) {
          emitDateChange(null);
        }
        requestControlledSync();
      } else {
        const parsed = parseFlexibleDate(trimmed);
        if (parsed) {
          const clamped = clampMoment(parsed);
          setInputText(clamped.format('DD-MMM-YYYY'));
          if (clamped.format('YYYY-MM-DD') !== currentIso) {
            emitDateChange(clamped.toDate());
          }
          requestControlledSync();
        } else {
          setInputText(formattedSelected);
        }
      }
      setIsOpen(false);
      return;
    }

    if (disabled || readOnly) return;

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const parsedFromInput = parseFlexibleDate(inputText);
      const base = parsedFromInput
        ? parsedFromInput
        : selectedDate
          ? moment(selectedDate).startOf('day')
          : minDate
            ? moment(minDate).startOf('day')
            : moment().startOf('day');

      const cursorPos = inputRef.current?.selectionStart ?? 11;
      const unit = parsedFromInput || /^\d{2}-[A-Za-z]{3}-\d{4}$/.test(inputText)
        ? getSegmentAtCursor(inputText, cursorPos)
        : 'days';

      const delta = e.key === 'ArrowUp' ? 1 : -1;
      const stepped = clampMoment(base.clone().add(delta, unit));
      const nextText = stepped.format('DD-MMM-YYYY');
      const nextIso = stepped.format('YYYY-MM-DD');

      setInputText(nextText);
      if (nextIso !== currentIso) {
        emitDateChange(stepped.toDate());
      }
      requestControlledSync();
      setIsOpen(false);

      const [selStart, selEnd] = SEGMENT_RANGES[unit];
      window.requestAnimationFrame(() => {
        if (inputRef.current && document.activeElement === inputRef.current) {
          inputRef.current.setSelectionRange(selStart, selEnd);
        }
      });
      return;
    }

    if (
      (e.key === 'ArrowLeft' || e.key === 'ArrowRight') &&
      /^\d{2}-[A-Za-z]{3}-\d{4}$/.test(inputText) &&
      inputRef.current
    ) {
      const s = inputRef.current.selectionStart;
      const end = inputRef.current.selectionEnd;
      const activeIdx = SEGMENT_ORDER.findIndex(
        (seg) => SEGMENT_RANGES[seg][0] === s && SEGMENT_RANGES[seg][1] === end
      );
      if (activeIdx !== -1) {
        e.preventDefault();
        const nextIdx =
          e.key === 'ArrowLeft'
            ? Math.max(0, activeIdx - 1)
            : Math.min(SEGMENT_ORDER.length - 1, activeIdx + 1);
        const [nextStart, nextEnd] = SEGMENT_RANGES[SEGMENT_ORDER[nextIdx]];
        inputRef.current.setSelectionRange(nextStart, nextEnd);
      }
    }
  };

  const handleInputClick = (e) => {
    if (disabled || readOnly) return;
    if (!actualValue && !inputText) {
      openCalendar();
      return;
    }
    if (
      e.detail === 1 &&
      /^\d{2}-[A-Za-z]{3}-\d{4}$/.test(inputText) &&
      inputRef.current
    ) {
      const pos = inputRef.current.selectionStart ?? 0;
      const end = inputRef.current.selectionEnd ?? pos;
      if (pos === end) {
        const seg = getSegmentAtCursor(inputText, pos);
        const [selStart, selEnd] = SEGMENT_RANGES[seg];
        window.requestAnimationFrame(() => {
          if (inputRef.current && document.activeElement === inputRef.current) {
            inputRef.current.setSelectionRange(selStart, selEnd);
          }
        });
      }
    }
  };

  const handleInputFocus = () => {
    isFocusedRef.current = true;
  };

  const handleInputBlur = (e) => {
    isFocusedRef.current = false;
    if (disabled || readOnly) {
      if (isControlled) {
        setInputText(formattedSelected);
      }
    } else {
      const trimmed = inputText.trim();
      if (!trimmed) {
        setInputText('');
        if (currentIso !== '' || Boolean(actualValue)) {
          emitDateChange(null);
        }
        requestControlledSync();
      } else {
        const parsed = parseFlexibleDate(trimmed);
        if (parsed) {
          const clamped = clampMoment(parsed);
          const clampedIso = clamped.format('YYYY-MM-DD');
          setInputText(clamped.format('DD-MMM-YYYY'));
          if (clampedIso !== currentIso) {
            emitDateChange(clamped.toDate());
          }
          requestControlledSync();
        } else {
          setInputText(formattedSelected);
        }
      }
    }
    if (field?.onBlur) {
      field.onBlur(e);
    }
  };

  const rawClass = className || '';
  const isCompact = /\btext-xs\b/.test(rawClass);
  const hasLeadingLabel = /\bpl-(?:7|8|9|10|11|12)\b/.test(rawClass);
  const hasExplicitWidth = /\b(?:w-\S+|flex-1)\b/.test(rawClass) || Boolean(style?.width);

  const outerTokens =
    rawClass.match(/\b(?:-?m[trblxy]?-\S+|w-\S+|min-w-\S+|max-w-\S+|flex-1|shrink-0)\b/g) || [];
  if (!hasExplicitWidth) {
    outerTokens.push(hasLeadingLabel ? 'w-40' : isCompact ? 'w-36' : 'w-40');
  } else if (style?.width === '100%' && !/\bw-full\b/.test(rawClass)) {
    outerTokens.push('w-full');
  }
  const innerInputClasses = rawClass
    .replace(/\b(?:-?m[trblxy]?-\S+|w-\S+|min-w-\S+|max-w-\S+|flex-1|shrink-0)\b/g, '')
    .trim();

  const iconPaddingClass = showIcon ? (isCompact ? 'pr-7' : 'pr-9') : '';

  return (
    <div ref={wrapperRef} className={`relative ${outerTokens.join(' ')}`.trim()}>
      <input
        ref={inputRef}
        id={id}
        name={actualName}
        type="text"
        value={inputText}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        onClick={handleInputClick}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        title={title || 'Type date or click a part + press Up/Down arrows'}
        aria-label={ariaLabel}
        autoComplete="off"
        style={style ? { ...style, ...(showIcon ? { paddingRight: '2.25rem' } : {}) } : undefined}
        className={`w-full ${innerInputClasses} ${iconPaddingClass}`.trim()}
      />

      {showIcon && (
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || readOnly}
          onClick={toggleCalendar}
          aria-label="Open calendar"
          title="Open calendar"
          className={`grow-datepicker-trigger absolute ${
            isCompact ? 'right-1.5' : 'right-2'
          } top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-blue-600 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <Calendar className={isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </button>
      )}

      {isOpen && (
        <Portal>
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              left: `${popoverCoords.left}px`,
              ...(popoverCoords.placement === 'top'
                ? { bottom: `${popoverCoords.bottom}px` }
                : { top: `${popoverCoords.top}px` }),
              width: `${POPOVER_WIDTH}px`,
              zIndex: 9999,
            }}
            className="bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 select-none"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <DatePicker
              selected={selectedDate}
              onChange={(date) => {
                if (disabled || readOnly) return;
                const nextMoment =
                  date && moment(date).isValid() ? clampMoment(moment(date)) : null;
                const nextIso = nextMoment ? nextMoment.format('YYYY-MM-DD') : '';
                if (nextIso !== currentIso) {
                  emitDateChange(nextMoment ? nextMoment.toDate() : null);
                }
                setInputText(nextMoment ? nextMoment.format('DD-MMM-YYYY') : '');
                requestControlledSync();
                setIsOpen(false);
              }}
              minDate={minDate || undefined}
              maxDate={maxDate || undefined}
              inline
              fixedHeight
              calendarClassName="grow-datepicker"
              renderCustomHeader={({
                date,
                changeYear,
                changeMonth,
                decreaseMonth,
                increaseMonth,
                prevMonthButtonDisabled,
                nextMonthButtonDisabled,
              }) => (
                <div className="flex items-center justify-between gap-1 px-1 pb-2 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={decreaseMonth}
                    disabled={prevMonthButtonDisabled}
                    className="grow-dp-nav-btn p-1 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-1">
                    <select
                      value={date.getMonth()}
                      onChange={(e) => changeMonth(Number(e.target.value))}
                      className="grow-dp-select"
                      aria-label="Select month"
                    >
                      {MONTH_NAMES.map((mName, idx) => (
                        <option key={mName} value={idx}>
                          {mName}
                        </option>
                      ))}
                    </select>
                    <select
                      value={date.getFullYear()}
                      onChange={(e) => changeYear(Number(e.target.value))}
                      className="grow-dp-select"
                      aria-label="Select year"
                    >
                      {yearOptions.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={increaseMonth}
                    disabled={nextMonthButtonDisabled}
                    className="grow-dp-nav-btn p-1 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            />
            <div className="border-t border-slate-100 pt-2 mt-1 flex items-center justify-between px-1">
              <button
                type="button"
                disabled={disabled || readOnly || !isTodayAllowed}
                onClick={() => {
                  if (disabled || readOnly || !isTodayAllowed) return;
                  const todayM = moment().startOf('day');
                  if (todayM.format('YYYY-MM-DD') !== currentIso) {
                    emitDateChange(todayM.toDate());
                  }
                  setInputText(todayM.format('DD-MMM-YYYY'));
                  requestControlledSync();
                  setIsOpen(false);
                }}
                className="grow-dp-footer-btn text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-300 disabled:cursor-not-allowed"
              >
                Today
              </button>
              {!required && (actualValue || inputText) && (
                <button
                  type="button"
                  disabled={disabled || readOnly}
                  onClick={() => {
                    if (disabled || readOnly) return;
                    if (currentIso !== '' || Boolean(actualValue)) {
                      emitDateChange(null);
                    }
                    setInputText('');
                    requestControlledSync();
                    setIsOpen(false);
                  }}
                  className="grow-dp-footer-btn text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
};

export default FormattedDateInput;
