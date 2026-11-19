import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './FormattedDateInput.css';
import { Portal } from '@headlessui/react';
import moment from 'moment';
import { Calendar } from 'lucide-react';

const ACCEPTED_DATE_FORMATS = [
  'dd-MMM-yyyy',
  'd-MMM-yyyy',
  'dd MMM yyyy',
  'd MMM yyyy',
  'yyyy-MM-dd',
  'dd/MM/yyyy',
  'd/M/yyyy',
];

const PopperPortalContainer = ({ children }) => <Portal>{children}</Portal>;

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

  const selectedDate = toLocalDate(actualValue);
  const minDate = toLocalDate(min);
  const maxDate = toLocalDate(max);

  const rawClass = className || '';
  const isCompact = /\btext-xs\b/.test(rawClass);
  const hasLeadingLabel = /\bpl-(?:7|8|9|10|11|12)\b/.test(rawClass);
  const hasExplicitWidth = /\b(?:w-\S+|flex-1)\b/.test(rawClass) || Boolean(style?.width);

  // Move outer margin & width/flex sizing classes onto the wrapper so layout & icon centering match <input>
  const outerTokens = rawClass.match(/\b(?:-?m[trblxy]?-\S+|w-\S+|min-w-\S+|max-w-\S+|flex-1|shrink-0)\b/g) || [];
  if (!hasExplicitWidth) {
    outerTokens.push(hasLeadingLabel ? 'w-40' : isCompact ? 'w-36' : 'w-40');
  } else if (style?.width === '100%' && !/\bw-full\b/.test(rawClass)) {
    outerTokens.push('w-full');
  }
  const innerInputClasses = rawClass
    .replace(/\b(?:-?m[trblxy]?-\S+|w-\S+|min-w-\S+|max-w-\S+|flex-1|shrink-0)\b/g, '')
    .trim();

  const iconPaddingClass = showIcon ? (isCompact ? 'pr-7' : 'pr-9') : '';

  const handleDateChange = (date) => {
    const formattedValue = date && moment(date).isValid() ? moment(date).format('YYYY-MM-DD') : '';
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
  };

  const handleBlur = (e) => {
    if (field?.onBlur) {
      field.onBlur(e);
    }
  };

  return (
    <div className={`relative ${outerTokens.join(' ')}`.trim()}>
      <DatePicker
        id={id}
        name={actualName}
        selected={selectedDate}
        onChange={handleDateChange}
        onBlur={handleBlur}
        dateFormat={ACCEPTED_DATE_FORMATS}
        minDate={minDate || undefined}
        maxDate={maxDate || undefined}
        placeholderText={placeholder}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        title={title}
        customInput={
          <input
            type="text"
            aria-label={ariaLabel}
            style={style ? { ...style, ...(showIcon ? { paddingRight: '2.25rem' } : {}) } : undefined}
          />
        }
        autoComplete="off"
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        popperContainer={PopperPortalContainer}
        popperClassName="grow-datepicker-popper"
        calendarClassName="grow-datepicker"
        wrapperClassName="w-full block"
        className={`w-full ${innerInputClasses} ${iconPaddingClass}`.trim()}
      />
      {showIcon && (
        <Calendar
          className={`absolute ${isCompact ? 'right-2 h-3.5 w-3.5' : 'right-3 h-4 w-4'} top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none`}
        />
      )}
    </div>
  );
};

export default FormattedDateInput;
