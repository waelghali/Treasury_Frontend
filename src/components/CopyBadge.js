import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * CopyBadge component provides a sleek, interactive copy icon or badge
 * to copy text to clipboard with micro-feedback (icon transition to green checkmark & optional toast).
 *
 * Props:
 * - text: string (required) - The text value to copy
 * - displayText: string (optional) - Custom display text (if using badge/button mode)
 * - variant: 'icon' | 'badge' | 'button' | 'inline' (default: 'icon')
 * - size: 'sm' | 'md' | 'lg' (default: 'md')
 * - className: string (optional) - Additional Tailwind CSS classes
 * - toastFn: function (optional) - Custom toast notification handler
 */
const CopyBadge = ({
  text,
  displayText,
  variant = 'icon',
  size = 'md',
  className = '',
  toastFn = null,
}) => {
  const [copied, setCopied] = useState(false);

  if (!text) return null;

  const handleCopy = (e) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      if (toastFn) {
        toastFn(`Copied: "${text}"`);
      }
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

  // Icon-only mode (Keeps original text intact, only renders interactive copy button)
  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? 'Copied to clipboard!' : `Copy "${text}"`}
        className={`p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-all duration-200 inline-flex items-center justify-center shrink-0 ${className}`}
      >
        {copied ? (
          <Check size={iconSize} className="text-emerald-500 transition-transform scale-110" />
        ) : (
          <Copy size={iconSize} className="text-slate-400 hover:text-blue-600 transition-colors" />
        )}
      </button>
    );
  }

  const valueToDisplay = displayText || text;

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? 'Copied!' : `Copy "${text}"`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 border ${
          copied
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700'
        } ${className}`}
      >
        {copied ? (
          <>
            <Check size={iconSize} className="text-emerald-500" />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <Copy size={iconSize} className="text-slate-400 group-hover:text-slate-600" />
            <span>{valueToDisplay}</span>
          </>
        )}
      </button>
    );
  }

  if (variant === 'inline') {
    return (
      <span
        onClick={handleCopy}
        title={copied ? 'Copied to clipboard!' : 'Click to copy'}
        className={`inline-flex items-center gap-1.5 cursor-pointer group hover:text-blue-600 transition-colors ${className}`}
      >
        <span>{valueToDisplay}</span>
        {copied ? (
          <Check size={iconSize} className="text-emerald-500" />
        ) : (
          <Copy size={iconSize} className="text-slate-400 group-hover:text-blue-500 opacity-60 group-hover:opacity-100 transition-opacity" />
        )}
      </span>
    );
  }

  // Default: 'badge' variant
  return (
    <span
      onClick={handleCopy}
      title={copied ? 'Copied!' : `Click to copy: ${text}`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-xs font-semibold cursor-pointer select-none transition-all duration-150 border ${
        copied
          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 ring-2 ring-emerald-400/20'
          : 'bg-slate-50 hover:bg-blue-50/80 text-slate-800 hover:text-blue-700 border-slate-200 hover:border-blue-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 dark:hover:text-blue-400 dark:border-slate-700/80'
      } ${className}`}
    >
      <span>{valueToDisplay}</span>
      {copied ? (
        <Check size={iconSize} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
      ) : (
        <Copy size={iconSize} className="text-slate-400 hover:text-blue-600 dark:text-slate-500 shrink-0 transition-colors" />
      )}
    </span>
  );
};

export default CopyBadge;
