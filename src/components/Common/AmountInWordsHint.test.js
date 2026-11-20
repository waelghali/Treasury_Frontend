import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AmountInWordsHint, { numberToBankingWords } from './AmountInWordsHint';

describe('AmountInWordsHint', () => {
  test('returns null and renders nothing for empty, zero, or negative inputs', () => {
    expect(numberToBankingWords('')).toBeNull();
    expect(numberToBankingWords(null)).toBeNull();
    expect(numberToBankingWords(0)).toBeNull();
    expect(numberToBankingWords('-150')).toBeNull();
    expect(renderToStaticMarkup(<AmountInWordsHint amount="" currencyCode="EGP" />)).toBe('');
    expect(renderToStaticMarkup(<AmountInWordsHint amount={0} currencyCode="EGP" />)).toBe('');
  });

  test('formats 25000000 with EGP cleanly', () => {
    const res = numberToBankingWords(25000000);
    expect(res).toEqual({
      formattedFigures: '25,000,000.00',
      words: 'Twenty-Five Million Only',
    });

    const view = renderToStaticMarkup(<AmountInWordsHint amount={25000000} currencyCode="EGP" />);
    expect(view).toContain('EGP 25,000,000.00');
    expect(view).toContain('Twenty-Five Million Only');
  });

  test('formats 125000.5 with USD cleanly', () => {
    const res = numberToBankingWords('125000.5');
    expect(res).toEqual({
      formattedFigures: '125,000.50',
      words: 'One Hundred Twenty-Five Thousand and 50/100 Only',
    });

    const view = renderToStaticMarkup(<AmountInWordsHint amount="125000.5" currencyCode="USD" />);
    expect(view).toContain('USD 125,000.50');
    expect(view).toContain('One Hundred Twenty-Five Thousand and 50/100 Only');
  });

  test('formats fractional cents under 1 cleanly', () => {
    const res = numberToBankingWords(0.75);
    expect(res).toEqual({
      formattedFigures: '0.75',
      words: '75/100 Only',
    });

    const view = renderToStaticMarkup(<AmountInWordsHint amount={0.75} />);
    expect(view).toContain('0.75');
    expect(view).toContain('75/100 Only');
  });

  test('handles trillions+ without crashing by returning comma figures only', () => {
    const res = numberToBankingWords(1500000000000);
    expect(res).toEqual({
      formattedFigures: '1,500,000,000,000.00',
      words: null,
    });

    const roundedTrillion = numberToBankingWords(999999999999.999);
    expect(roundedTrillion).toEqual({
      formattedFigures: '1,000,000,000,000.00',
      words: null,
    });
  });

  test('returns null cleanly for extreme floating-point values beyond MAX_SAFE_INTEGER', () => {
    expect(numberToBankingWords(1e307)).toBeNull();
    expect(numberToBankingWords(Number.MAX_VALUE)).toBeNull();
    expect(renderToStaticMarkup(<AmountInWordsHint amount="1e307" currencyCode="EGP" />)).toBe('');
    expect(renderToStaticMarkup(<AmountInWordsHint amount={Number.MAX_VALUE} currencyCode="USD" />)).toBe('');
  });
});
