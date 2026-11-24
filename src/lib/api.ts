import { BRAND_INFO } from '../data/kinshasaData.ts';
import type {
  AdminLogEntry,
  BillboardAd,
  DepartmentItem,
  ExchangeRates,
  ExpertProfile,
  JobApplication,
  JobOffer,
  MaterialItem,
  MaterialOrder,
  PlatformStats,
  PortfolioEntry,
  QuoteRequest,
  ReportItem,
  Review,
  SubscriptionConfig,
  SubscriptionPayment,
  UserAccount,
} from '../types.ts';

// Jeton conservé uniquement en mémoire React/JS (jamais dans localStorage ou sessionStorage)
let memoryAuthToken: string | null = null;

export function setAuthToken(token: string | null): void {
  memoryAuthToken = token;
}

export function getAuthToken(): string | null {
  return memoryAuthToken;
}

export function formatCdf(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} CDF`;
}

export function buildWhatsAppLink(message: string, phoneRaw: string = BRAND_INFO.phoneRaw): string {
  const digits = phoneRaw.replace(/[^\d]/g, '') || BRAND_INFO.phoneRaw;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (memoryAuthToken) {
    headers.set('Authorization', `Bearer ${memoryAuthToken}`);
  }

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Erreur serveur (${res.status})`);
  }
  return data as T;
}

export interface PublicBootstrapResponse {
  departments: DepartmentItem[];
  providers: ExpertProfile[];
  materials: MaterialItem[];
  jobs: JobOffer[];
  reviews: Review[];
  billboardAds: BillboardAd[];
  subscriptionConfig: SubscriptionConfig;
  exchangeRates: ExchangeRates;
}

export interface AuthResponse {
  token: string;
  user: UserAccount;
  provider: ExpertProfile | null;
}

export interface AdminOverviewResponse {
  stats: PlatformStats;
  providers: ExpertProfile[];
  materials: MaterialItem[];
  payments: SubscriptionPayment[];
  jobs: JobOffer[];
  applications: JobApplication[];
  departments: DepartmentItem[];
  reports: ReportItem[];
  reviews: Review[];
  users: UserAccount[];
  logs: AdminLogEntry[];
  billboardAds: BillboardAd[];
  subscriptionConfig: SubscriptionConfig;
  exchangeRates: ExchangeRates;
}

export const api = {
  getBootstrap: () => request<PublicBootstrapResponse>('/api/public/bootstrap'),
  trackProviderView: (id: string) => request<{ viewsCount: number }>(`/api/providers/${id}/view`, { method: 'POST' }),

  getAdminStatus: () => request<{ configured: boolean; envOverride: boolean }>('/api/auth/admin-status'),
  getMe: () => request<{ user: UserAccount; provider: ExpertProfile | null }>('/api/auth/me'),
  register: (payload: Record<string, unknown>) =>
    request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  demoSession: (
    persona: 'CLIENT' | 'EXPERT_PENDING' | 'ENTREPRISE_PENDING' | 'PRESTATAIRE' | 'VENDEUR' | 'ENTREPRISE'
  ) => request<AuthResponse>('/api/auth/demo-session', { method: 'POST', body: JSON.stringify({ persona }) }),
  adminClaim: (password: string) =>
    request<AuthResponse>('/api/auth/admin-claim', { method: 'POST', body: JSON.stringify({ password }) }),
  adminLogin: (password: string, email?: string) =>
    request<AuthResponse>('/api/auth/admin-login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  getMyOrders: () =>
    request<{ quotes: QuoteRequest[]; materialOrders: MaterialOrder[]; applications: JobApplication[] }>('/api/my/orders'),
  createQuote: (payload: Record<string, unknown>) =>
    request<{ quote: QuoteRequest }>('/api/quotes', { method: 'POST', body: JSON.stringify(payload) }),
  createMaterialOrder: (payload: Record<string, unknown>) =>
    request<{ order: MaterialOrder }>('/api/material-orders', { method: 'POST', body: JSON.stringify(payload) }),
  createReview: (payload: { providerId: string; rating: number; comment: string }) =>
    request<{ review: Review; provider: ExpertProfile }>('/api/reviews', { method: 'POST', body: JSON.stringify(payload) }),
  createReport: (payload: { targetType: 'review' | 'provider'; targetId: string; providerId: string; reason: string }) =>
    request<{ report: ReportItem }>('/api/reports', { method: 'POST', body: JSON.stringify(payload) }),

  getProviderDashboard: () =>
    request<{
      provider: ExpertProfile;
      quotes: QuoteRequest[];
      reviews: Review[];
      payments: SubscriptionPayment[];
      jobs: JobOffer[];
      applications: JobApplication[];
      products: MaterialItem[];
      ads: BillboardAd[];
      subscriptionConfig: SubscriptionConfig;
      exchangeRates: ExchangeRates;
    }>('/api/provider/dashboard'),
  createSellerProduct: (payload: Record<string, unknown>) =>
    request<{ material: MaterialItem }>('/api/seller/products', { method: 'POST', body: JSON.stringify(payload) }),
  submitAdRequest: (payload: Record<string, unknown>) =>
    request<{ ad: BillboardAd; message: string }>('/api/provider/ads', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateAvailability: (availability: 'Disponible' | 'Occupé') =>
    request<{ provider: ExpertProfile }>('/api/provider/availability', {
      method: 'PATCH',
      body: JSON.stringify({ availability }),
    }),
  updateProviderProfile: (payload: Record<string, unknown>) =>
    request<{ provider: ExpertProfile }>('/api/provider/profile', { method: 'PATCH', body: JSON.stringify(payload) }),
  updateQuoteStatus: (id: string, status: 'Acceptée' | 'Terminée' | 'Refusée', revenueCdf?: number) =>
    request<{ quote: QuoteRequest; provider: ExpertProfile }>(`/api/provider/quotes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, revenueCdf }),
    }),
  submitSubscriptionProof: (payload: Record<string, unknown>) =>
    request<{ payment: SubscriptionPayment; provider: ExpertProfile; message: string }>('/api/provider/subscription-proof', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createJob: (payload: Record<string, unknown>) =>
    request<{ job: JobOffer; message: string }>('/api/jobs', { method: 'POST', body: JSON.stringify(payload) }),
  applyToJob: (jobId: string, payload: Record<string, unknown>) =>
    request<{ application: JobApplication; message: string }>(`/api/jobs/${jobId}/apply`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateApplicationStatus: (id: string, status: 'Acceptée' | 'Refusée') =>
    request<{ application: JobApplication }>(`/api/company/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getPortfolio: () => request<{ entries: PortfolioEntry[] }>('/api/portfolio'),
  addPortfolioEntry: (payload: { kind: PortfolioEntry['kind']; title: string; detail: string; yearOrDuration: string }) =>
    request<{ entry: PortfolioEntry }>('/api/portfolio', { method: 'POST', body: JSON.stringify(payload) }),
  deletePortfolioEntry: (id: string) => request<{ ok: boolean }>(`/api/portfolio/${id}`, { method: 'DELETE' }),

  getAdminOverview: () => request<AdminOverviewResponse>('/api/admin/overview'),
  adminProviderAction: (id: string, action: 'ACTIVER' | 'PROLONGER' | 'SUSPENDRE' | 'DESACTIVER') =>
    request<{ provider: ExpertProfile; stats: PlatformStats; logs: AdminLogEntry[]; payments: SubscriptionPayment[] }>(
      `/api/admin/providers/${id}/action`,
      { method: 'POST', body: JSON.stringify({ action }) }
    ),
  adminJobAction: (id: string, action: 'VALIDER' | 'REFUSER' | 'SUSPENDRE') =>
    request<{ job: JobOffer; stats: PlatformStats; logs: AdminLogEntry[] }>(`/api/admin/jobs/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),
  adminAdAction: (id: string, action: 'ACTIVER' | 'REFUSER' | 'SUSPENDRE' | 'PROLONGER') =>
    request<{ ad: BillboardAd; stats: PlatformStats; logs: AdminLogEntry[] }>(`/api/admin/ads/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),
  adminUpdateSubConfig: (monthlyPriceCdf: number, durationDays: number) =>
    request<{ subscriptionConfig: SubscriptionConfig; logs: AdminLogEntry[] }>('/api/admin/subscription-config', {
      method: 'PATCH',
      body: JSON.stringify({ monthlyPriceCdf, durationDays }),
    }),
  adminUpdateExchangeRates: (usdToCdf: number, eurToCdf: number) =>
    request<{ exchangeRates: ExchangeRates; stats: PlatformStats; logs: AdminLogEntry[] }>('/api/admin/exchange-rates', {
      method: 'PATCH',
      body: JSON.stringify({ usdToCdf, eurToCdf }),
    }),
  adminAddDepartment: (payload: { name: string; description: string; services: string; priority: boolean }) =>
    request<{ department: DepartmentItem; departments: DepartmentItem[]; logs: AdminLogEntry[] }>('/api/admin/departments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  adminToggleDepartment: (id: string) =>
    request<{ department: DepartmentItem; departments: DepartmentItem[]; logs: AdminLogEntry[] }>(`/api/admin/departments/${id}`, {
      method: 'PATCH',
    }),
  adminResolveReport: (id: string, hideReview: boolean) =>
    request<{ report: ReportItem; reports: ReportItem[]; reviews: Review[]; logs: AdminLogEntry[] }>(
      `/api/admin/reports/${id}/resolve`,
      { method: 'POST', body: JSON.stringify({ hideReview }) }
    ),
  adminToggleReview: (id: string) =>
    request<{ review: Review; reviews: Review[]; logs: AdminLogEntry[] }>(`/api/admin/reviews/${id}/toggle`, {
      method: 'PATCH',
    }),
  adminToggleUserSuspend: (id: string) =>
    request<{ user: UserAccount; logs: AdminLogEntry[] }>(`/api/admin/users/${id}/suspend`, { method: 'PATCH' }),
};
