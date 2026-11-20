import React from 'react';

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

const SCALES = ['', 'Thousand', 'Million', 'Billion'];

function convertBelowThousand(n) {
  const parts = [];
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;

  if (hundreds > 0) {
    parts.push(`${ONES[hundreds]} Hundred`);
  }

  if (remainder > 0 && remainder < 20) {
    parts.push(ONES[remainder]);
  } else if (remainder >= 20) {
    const tens = Math.floor(remainder / 10);
    const units = remainder % 10;
    parts.push(units > 0 ? `${TENS[tens]}-${ONES[units]}` : TENS[tens]);
  }

  return parts.join(' ');
}

function convertWholeToWords(whole) {
  if (whole === 0) return '';
  const groups = [];
  let remaining = whole;
  let scaleIndex = 0;

  while (remaining > 0) {
    const chunk = remaining % 1000;
    if (chunk > 0) {
      const chunkWords = convertBelowThousand(chunk);
      const scale = SCALES[scaleIndex];
      groups.unshift(scale ? `${chunkWords} ${scale}` : chunkWords);
    }
    remaining = Math.floor(remaining / 1000);
    scaleIndex += 1;
  }

  return groups.join(' ');
}

/**
 * Formats a positive numeric amount into comma-separated figures and bank-style words.
 * Returns null for empty, invalid, or non-positive inputs.
 */
export function numberToBankingWords(rawAmount) {
  if (rawAmount === '' || rawAmount === null || rawAmount === undefined) {
    return null;
  }

  const parsedNum =
    typeof rawAmount === 'number'
      ? rawAmount
      : parseFloat(String(rawAmount).replace(/,/g, '').trim());

  if (!Number.isFinite(parsedNum) || parsedNum <= 0) {
    return null;
  }

  const totalCents = Math.round((parsedNum + Number.EPSILON) * 100);
  if (totalCents <= 0) {
    return null;
  }

  const roundedAmount = totalCents / 100;
  const formattedFigures = roundedAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (roundedAmount >= 1_000_000_000_000) {
    return { formattedFigures, words: null };
  }

  const whole = Math.floor(totalCents / 100);
  const cents = totalCents % 100;
  const centsPart = String(cents).padStart(2, '0');

  let words;
  if (whole > 0 && cents === 0) {
    words = `${convertWholeToWords(whole)} Only`;
  } else if (whole > 0 && cents > 0) {
    words = `${convertWholeToWords(whole)} and ${centsPart}/100 Only`;
  } else {
    words = `${centsPart}/100 Only`;
  }

  return { formattedFigures, words };
}

/**
 * Live read-only banking confirmation caption shown below large monetary inputs.
 */
export default function AmountInWordsHint({ amount, currencyCode = '', className = '' }) {
  const parsed = numberToBankingWords(amount);
  if (!parsed) {
    return null;
  }

  return (
    <div
      className={`mt-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs leading-snug flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 ${className}`}
      aria-live="polite"
    >
      <span className="font-bold text-blue-700 tabular-nums">
        {currencyCode ? `${currencyCode} ` : ''}
        {parsed.formattedFigures}
      </span>
      {parsed.words && (
        <>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <span className="font-medium text-slate-600">{parsed.words}</span>
        </>
      )}
    </div>
  );
}
