import React, { createContext, useContext, useEffect, useState } from 'react';
import type { CurrencyCode, ExchangeRates } from '../types.ts';
import {
  DEFAULT_EXCHANGE_RATES,
  convertFromCdf,
  formatAllThreeCurrencies,
  formatPriceInCurrency,
  formatSingleCurrency,
} from './currencyMath.ts';

export * from './currencyMath.ts';

const STORAGE_KEY = 'nayopro_selected_currency';

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (next: CurrencyCode) => void;
  rates: ExchangeRates;
  formatPrimary: (amountCdf: number) => string;
  formatTriple: (amountCdf: number) => string;
  convert: (amountCdf: number) => number;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'CDF',
  setCurrency: () => {},
  rates: DEFAULT_EXCHANGE_RATES,
  formatPrimary: (amountCdf) => formatPriceInCurrency(amountCdf, 'CDF', DEFAULT_EXCHANGE_RATES),
  formatTriple: (amountCdf) => formatAllThreeCurrencies(amountCdf, DEFAULT_EXCHANGE_RATES),
  convert: (amountCdf) => convertFromCdf(amountCdf, 'CDF', DEFAULT_EXCHANGE_RATES),
});

export const CurrencyProvider: React.FC<{
  rates: ExchangeRates;
  children: React.ReactNode;
}> = ({ rates, children }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'CDF' || saved === 'USD' || saved === 'EUR') return saved;
    } catch {
      // Ignore storage access restriction
    }
    return 'CDF';
  });

  const setCurrency = (next: CurrencyCode) => {
    setCurrencyState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage access restriction
    }
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, currency);
    } catch {
      // Ignore storage access restriction
    }
  }, [currency]);

  const value: CurrencyContextValue = {
    currency,
    setCurrency,
    rates,
    formatPrimary: (amountCdf: number) => formatPriceInCurrency(amountCdf, currency, rates),
    formatTriple: (amountCdf: number) => formatAllThreeCurrencies(amountCdf, rates),
    convert: (amountCdf: number) => convertFromCdf(amountCdf, currency, rates),
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext);
}

export const CurrencySelector: React.FC<{
  compact?: boolean;
  dark?: boolean;
}> = ({ compact = false, dark = false }) => {
  const { currency, setCurrency } = useCurrency();
  const options: { code: CurrencyCode; label: string }[] = [
    { code: 'CDF', label: 'CDF' },
    { code: 'USD', label: '$' },
    { code: 'EUR', label: '€' },
  ];

  return (
    <div
      role="group"
      aria-label="Sélecteur de devise CDF, Dollar, Euro"
      className={`inline-flex items-center rounded-xl p-0.5 border shrink-0 ${
        dark
          ? 'bg-white/10 border-white/20'
          : 'bg-slate-100 border-slate-200'
      }`}
    >
      {options.map((opt) => {
        const active = currency === opt.code;
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => setCurrency(opt.code)}
            aria-pressed={active}
            className={`font-mono-num font-extrabold rounded-lg transition-colors whitespace-nowrap ${
              compact ? 'px-2 py-1 text-[11px] min-h-[30px]' : 'px-3 py-1.5 text-xs min-h-[36px]'
            } ${
              active
                ? dark
                  ? 'bg-[#FFC107] text-[#0A2A5E]'
                  : 'bg-[#0A2A5E] text-[#FFC107]'
                : dark
                  ? 'text-white hover:bg-white/10'
                  : 'text-slate-700 hover:bg-white'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export const MultiPrice: React.FC<{
  amountCdf: number;
  suffix?: string;
  inline?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  inverted?: boolean;
}> = ({ amountCdf, suffix = '', inline = false, size = 'md', className = '', inverted = false }) => {
  const { currency, rates } = useCurrency();
  const cdfVal = formatSingleCurrency(convertFromCdf(amountCdf, 'CDF', rates), 'CDF');
  const usdVal = formatSingleCurrency(convertFromCdf(amountCdf, 'USD', rates), 'USD');
  const eurVal = formatSingleCurrency(convertFromCdf(amountCdf, 'EUR', rates), 'EUR');
  const primary = formatPriceInCurrency(amountCdf, currency, rates);

  const primarySizeClass =
    size === 'lg'
      ? 'text-2xl sm:text-3xl'
      : size === 'md'
        ? 'text-base sm:text-lg'
        : size === 'sm'
          ? 'text-sm'
          : 'text-xs';

  const parts: { code: CurrencyCode; text: string }[] = [
    { code: 'CDF', text: cdfVal },
    { code: 'USD', text: usdVal },
    { code: 'EUR', text: eurVal },
  ];

  if (inline) {
    return (
      <span className={`font-mono-num inline-flex flex-wrap items-center gap-1 ${className}`}>
        <span className={`font-extrabold ${primarySizeClass} ${inverted ? 'text-[#FFC107]' : 'text-[#0A2A5E]'}`}>
          {primary}
          {suffix ? ` ${suffix}` : ''}
        </span>
        <span className={`text-[11px] ${inverted ? 'text-slate-200' : 'text-slate-500'}`}>
          ({parts.map((p, idx) => (
            <React.Fragment key={p.code}>
              {idx > 0 && ' / '}
              <span className={p.code === currency ? (inverted ? 'font-bold text-white' : 'font-bold text-[#00C2A8]') : ''}>
                {p.text}
              </span>
            </React.Fragment>
          ))})
        </span>
      </span>
    );
  }

  return (
    <div className={`font-mono-num ${className}`}>
      <p className={`font-extrabold leading-tight ${primarySizeClass} ${inverted ? 'text-[#FFC107]' : 'text-[#0A2A5E]'}`}>
        {primary}
        {suffix ? <span className="text-xs font-semibold ml-1">{suffix}</span> : null}
      </p>
      <p className={`text-[11px] mt-0.5 leading-snug ${inverted ? 'text-slate-200' : 'text-slate-600'}`}>
        {parts.map((p, idx) => (
          <React.Fragment key={p.code}>
            {idx > 0 && <span className="mx-1 text-slate-400">/</span>}
            <span
              className={
                p.code === currency
                  ? inverted
                    ? 'font-extrabold text-[#00C2A8]'
                    : 'font-extrabold text-[#0A2A5E] underline decoration-[#00C2A8] decoration-2'
                  : 'font-semibold'
              }
            >
              {p.text}
            </span>
          </React.Fragment>
        ))}
      </p>
    </div>
  );
};
