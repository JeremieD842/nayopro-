import type { CurrencyCode, ExchangeRates, PaymentOperator } from '../types.ts';

export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  usdToCdf: 2800,
  eurToCdf: 3050,
};

export const MOBILE_OPERATORS: PaymentOperator[] = ['Orange Money', 'Airtel Money', 'M-Pesa'];
export const EURO_OPERATORS: PaymentOperator[] = ['Transfert Bancaire', 'Carte', 'Western Union', 'MoneyGram'];

export function getOperatorsForCurrency(currency: CurrencyCode): PaymentOperator[] {
  return currency === 'EUR' ? EURO_OPERATORS : MOBILE_OPERATORS;
}

export function formatDots(n: number): string {
  const rounded = Math.round(Number.isFinite(n) ? n : 0);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function convertFromCdf(
  amountCdf: number,
  currency: CurrencyCode,
  rates: ExchangeRates = DEFAULT_EXCHANGE_RATES
): number {
  if (!Number.isFinite(amountCdf) || amountCdf <= 0) return 0;
  if (currency === 'CDF') return Math.round(amountCdf);
  if (currency === 'USD') {
    const rate = rates.usdToCdf > 0 ? rates.usdToCdf : DEFAULT_EXCHANGE_RATES.usdToCdf;
    return Math.max(1, Math.round(amountCdf / rate));
  }
  const rate = rates.eurToCdf > 0 ? rates.eurToCdf : DEFAULT_EXCHANGE_RATES.eurToCdf;
  return Math.max(1, Math.round(amountCdf / rate));
}

export function formatSingleCurrency(amount: number, currency: CurrencyCode): string {
  const formatted = formatDots(amount);
  if (currency === 'CDF') return `${formatted} CDF`;
  if (currency === 'USD') return `${formatted} $`;
  return `${formatted} €`;
}

export function formatPriceInCurrency(
  amountCdf: number,
  currency: CurrencyCode,
  rates: ExchangeRates = DEFAULT_EXCHANGE_RATES
): string {
  return formatSingleCurrency(convertFromCdf(amountCdf, currency, rates), currency);
}

export function formatAllThreeCurrencies(
  amountCdf: number,
  rates: ExchangeRates = DEFAULT_EXCHANGE_RATES
): string {
  const cdf = formatPriceInCurrency(amountCdf, 'CDF', rates);
  const usd = formatPriceInCurrency(amountCdf, 'USD', rates);
  const eur = formatPriceInCurrency(amountCdf, 'EUR', rates);
  return `${cdf} / ${usd} / ${eur}`;
}

export function extractCdfFromLabel(label?: string | null): number | null {
  if (!label) return null;
  const match = label.match(/(\d[\d\s.,]*)\s*CDF/i);
  if (!match) return null;
  const digits = match[1].replace(/[^\d]/g, '');
  const val = Number(digits);
  return Number.isFinite(val) && val > 0 ? val : null;
}
