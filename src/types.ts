export type CurrencyCode = 'CDF' | 'USD' | 'EUR';

export interface ExchangeRates {
  usdToCdf: number;
  eurToCdf: number;
  updatedAt?: string;
}

export type UserRole = 'CLIENT' | 'PRESTATAIRE' | 'ENTREPRISE' | 'ADMIN';

export type AccountCategory = 'EXPERT' | 'VENDEUR' | 'ENTREPRISE';

export type SubscriptionStatus = 'EN ATTENTE' | 'ACTIF' | 'EXPIRÉ' | 'SUSPENDU' | 'INACTIF';

export type AvailabilityStatus = 'Disponible' | 'Occupé';

export type PaymentOperator =
  | 'Orange Money'
  | 'Airtel Money'
  | 'M-Pesa'
  | 'Transfert Bancaire'
  | 'Carte'
  | 'Western Union'
  | 'MoneyGram';

export type JobOfferType = 'Emploi CDI' | 'CDD' | 'Stage' | 'Mission';

export type JobModerationStatus = 'EN ATTENTE' | 'VALIDÉE' | 'REFUSÉE' | 'SUSPENDUE';

export type ApplicationStatus = 'Envoyée' | 'Acceptée' | 'Refusée';

export type QuoteStatus = 'En attente' | 'Acceptée' | 'Terminée' | 'Refusée';

export type AdStatus = 'EN ATTENTE' | 'ACTIVE' | 'EXPIRÉE' | 'REFUSÉE' | 'SUSPENDUE';

export type AdPlanDays = 7 | 30;

export type MaterialVisualKey =
  | 'sable'
  | 'ciment'
  | 'caillasse'
  | 'bois'
  | 'toles'
  | 'fer'
  | 'gravier'
  | 'briques'
  | 'peinture'
  | 'carrelage';

export interface UserAccount {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  commune: string;
  suspended: boolean;
  createdAt: string;
  providerId?: string;
  companyId?: string;
}

export interface DepartmentItem {
  id: string;
  name: string;
  priority: boolean;
  order: number;
  iconKey: string;
  description: string;
  services: string[];
  active: boolean;
}

export interface ExpertRealization {
  id: string;
  title: string;
  commune: string;
  visualKey: string;
  year: string;
}

export interface ExpertProfile {
  id: string;
  userId: string;
  accountType: 'PRESTATAIRE' | 'ENTREPRISE';
  accountCategory: AccountCategory;
  name: string;
  profession: string;
  departmentId: string;
  commune: string;
  zones: string[];
  phone: string;
  email: string;
  priceCdf: number | null;
  priceLabel: string;
  description: string;
  verified: boolean;
  availability: AvailabilityStatus;
  rating: number;
  reviewCount: number;
  viewsCount: number;
  requestsCount: number;
  declaredRevenueCdf: number;
  avatarKey: string;
  realizations: ExpertRealization[];
  commercialOffers?: string[];
  activities?: string[];
  servicesList?: string[];
  productsSummary?: string[];
  subscriptionStatus: SubscriptionStatus;
  subscriptionStartAt: string | null;
  subscriptionEndAt: string | null;
  createdAt: string;
}

export interface MaterialItem {
  id: string;
  sellerId: string;
  name: string;
  category: string;
  unit: string;
  priceCdf: number;
  supplier: string;
  sellerPhone: string;
  commune: string;
  visualKey: MaterialVisualKey;
  description: string;
  inStock: boolean;
}

export interface QuoteRequest {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  providerId: string;
  providerName: string;
  service: string;
  commune: string;
  address: string;
  details: string;
  photoName?: string;
  desiredDate: string;
  budgetCdf: string;
  status: QuoteStatus;
  createdAt: string;
}

export interface MaterialOrder {
  id: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  materialId: string;
  materialName: string;
  quantity: number;
  unitPriceCdf: number;
  totalCdf: number;
  commune: string;
  status: 'Envoyée via WhatsApp' | 'Confirmée';
  createdAt: string;
}

export interface Review {
  id: string;
  providerId: string;
  providerName: string;
  clientId: string;
  clientName: string;
  rating: number;
  comment: string;
  hidden: boolean;
  reported: boolean;
  createdAt: string;
}

export interface ReportItem {
  id: string;
  targetType: 'review' | 'provider';
  targetId: string;
  providerId: string;
  providerName: string;
  reporterName: string;
  reason: string;
  status: 'Ouvert' | 'Résolu';
  createdAt: string;
}

export interface SubscriptionPayment {
  id: string;
  providerId: string;
  providerName: string;
  accountType: 'PRESTATAIRE' | 'ENTREPRISE';
  accountCategory: AccountCategory;
  operator: PaymentOperator;
  amountCdf: number;
  currency?: CurrencyCode;
  paidAmount?: number;
  transactionRef: string;
  proofImageName?: string;
  proofDataUrl?: string;
  status: 'En attente' | 'Validé' | 'Rejeté';
  receiptCode: string;
  createdAt: string;
  validatedAt?: string;
}

export interface JobOffer {
  id: string;
  companyId: string;
  companyName: string;
  companyLogoKey: string;
  title: string;
  type: JobOfferType;
  domain: string;
  commune: string;
  salaryCdf?: number | null;
  salaryLabel: string;
  description: string;
  skills: string[];
  deadline: string;
  positions: number;
  status: JobModerationStatus;
  createdAt: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  companyId: string;
  companyName: string;
  candidateUserId?: string;
  fullName: string;
  whatsapp: string;
  email: string;
  commune: string;
  skills: string;
  presentation: string;
  cvFileName?: string;
  cvDataUrl?: string;
  status: ApplicationStatus;
  createdAt: string;
}

export interface PortfolioEntry {
  id: string;
  userId: string;
  kind: 'Compétence' | 'Réalisation' | 'Formation' | 'Mission';
  title: string;
  detail: string;
  yearOrDuration: string;
  createdAt: string;
}

export interface AdminLogEntry {
  id: string;
  adminName: string;
  action: string;
  targetLabel: string;
  createdAt: string;
}

export interface SubscriptionConfig {
  monthlyPriceCdf: number;
  durationDays: number;
}

export interface BillboardAd {
  id: string;
  providerId: string;
  providerName: string;
  accountCategory: AccountCategory;
  providerCommune: string;
  providerRating: number;
  title: string;
  description: string;
  photoDataUrl?: string;
  visualKey: string;
  durationDays: AdPlanDays;
  amountCdf: number;
  currency?: CurrencyCode;
  paidAmount?: number;
  operator: PaymentOperator;
  transactionRef: string;
  proofImageName?: string;
  proofDataUrl?: string;
  status: AdStatus;
  startAt: string | null;
  endAt: string | null;
  targetBlock: 'market' | 'experts' | 'companies' | 'jobs';
  createdAt: string;
}

export interface PlatformStats {
  totalClients: number;
  activeExperts: number;
  activeSellers: number;
  activeCompanies: number;
  pendingAccounts: number;
  totalRequests: number;
  activeSubscriptions: number;
  totalSubscriptionRevenueCdf: number;
  activeAdsCount: number;
  totalAdRevenueCdf: number;
  totalRevenueCdf: number;
  totalRevenueCdfOnly: number;
  totalRevenueUsd: number;
  totalRevenueEur: number;
  grandTotalConvertedCdf: number;
  validatedJobs: number;
  pendingJobs: number;
  totalApplications: number;
  openReports: number;
}
