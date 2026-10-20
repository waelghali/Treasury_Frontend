// frontend/src/components/Security/HoneypotField.js
import React from 'react';

/**
 * HoneypotField
 * 
 * Reusable zero-friction perimeter anti-bot honeypot field.
 * Visually completely invisible to human users, excluded from the tab sequence,
 * and hidden from assistive screen readers, but eagerly populated by automated
 * web scrapers, credential-stuffers, and spam bots.
 * 
 * @param {string} name - Field name (defaults to 'website_url', an enticing bot target)
 * @param {string} value - Controlled input value
 * @param {function} onChange - Standard change handler
 * @param {string} label - Deceptive label for bot parsers
 */
export const HoneypotField = ({
  name = 'website_url',
  value = '',
  onChange = () => {},
  label = 'Website URL (Leave blank if human)',
  autoComplete = 'off',
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: '-9999px',
        top: '-9999px',
        opacity: 0,
        height: 0,
        width: 0,
        overflow: 'hidden',
        zIndex: -1,
        pointerEvents: 'none',
        clip: 'rect(0, 0, 0, 0)',
      }}
      aria-hidden="true"
    >
      <label htmlFor={`hp_${name}`}>
        {label}
      </label>
      <input
        type="text"
        id={`hp_${name}`}
        name={name}
        value={value}
        onChange={onChange}
        tabIndex={-1}
        autoComplete={autoComplete}
      />
    </div>
  );
};

export default HoneypotField;
