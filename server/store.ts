import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  BRAND_INFO,
  INITIAL_ADMIN_LOGS,
  INITIAL_APPLICATIONS,
  INITIAL_BILLBOARD_ADS,
  INITIAL_DEPARTMENTS,
  INITIAL_JOBS,
  INITIAL_MATERIALS,
  INITIAL_PAYMENTS,
  INITIAL_PORTFOLIO,
  INITIAL_PROVIDERS,
  INITIAL_QUOTES,
  INITIAL_REPORTS,
  INITIAL_REVIEWS,
  INITIAL_SUBSCRIPTION_CONFIG,
  INITIAL_USERS,
} from '../src/data/kinshasaData.ts';
import { DEFAULT_EXCHANGE_RATES, convertFromCdf } from '../src/lib/currencyMath.ts';
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
} from '../src/types.ts';

export interface StoredUser extends UserAccount {
  passwordHash: string;
}

export interface DatabaseState {
  adminCredentialHash: string | null;
  users: StoredUser[];
  departments: DepartmentItem[];
  providers: ExpertProfile[];
  materials: MaterialItem[];
  materialOrders: MaterialOrder[];
  quotes: QuoteRequest[];
  reviews: Review[];
  reports: ReportItem[];
  payments: SubscriptionPayment[];
  jobs: JobOffer[];
  applications: JobApplication[];
  portfolio: PortfolioEntry[];
  adminLogs: AdminLogEntry[];
  billboardAds: BillboardAd[];
  subscriptionConfig: SubscriptionConfig;
  exchangeRates: ExchangeRates;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'nayopro-db.json');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = crypto.scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

export function timingSafeEqualSecret(input: string, secret: string): boolean {
  const digestA = crypto.createHash('sha256').update(input).digest();
  const digestB = crypto.createHash('sha256').update(secret).digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

const DEMO_TEST_PASSWORDS: Record<string, string> = {
  'client@test.com': '123456',
  'expert@test.com': '123456',
  'entreprise@test.com': '123456',
};

export const ADMIN_EMAILS = ['dimbelejeremie50@gmail.com', 'nayopro2@gmail.com'] as const;

const DEFAULT_ADMIN_PASS = process.env.ADMIN_PASSCODE?.trim() || 'NAYOpro2026';

function buildAdminUsers(adminHash: string): StoredUser[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'usr-admin-owner',
      role: 'ADMIN',
      name: BRAND_INFO.founder,
      email: 'dimbelejeremie50@gmail.com',
      phone: BRAND_INFO.phoneDisplay,
      commune: 'Gombe',
      suspended: false,
      createdAt: now,
      passwordHash: adminHash,
    },
    {
      id: 'usr-admin-founder',
      role: 'ADMIN',
      name: BRAND_INFO.founder,
      email: 'nayopro2@gmail.com',
      phone: BRAND_INFO.phoneDisplay,
      commune: 'Gombe',
      suspended: false,
      createdAt: now,
      passwordHash: adminHash,
    },
  ];
}

function buildInitialUsers(adminHash: string): StoredUser[] {
  const baseUsers: StoredUser[] = [
    ...buildAdminUsers(adminHash),
    ...INITIAL_USERS.map((u) => {
      const demoPass = DEMO_TEST_PASSWORDS[u.email.toLowerCase()];
      return {
        ...u,
        passwordHash: hashPassword(demoPass || crypto.randomBytes(24).toString('hex')),
      };
    }),
  ];

  for (const p of INITIAL_PROVIDERS) {
    if (!baseUsers.some((u) => u.id === p.userId)) {
      const demoPass = DEMO_TEST_PASSWORDS[p.email.toLowerCase()];
      baseUsers.push({
        id: p.userId,
        role: p.accountType,
        name: p.name,
        email: p.email,
        phone: p.phone,
        commune: p.commune,
        suspended: false,
        createdAt: p.createdAt,
        providerId: p.id,
        companyId: p.accountType === 'ENTREPRISE' ? p.id : undefined,
        passwordHash: hashPassword(demoPass || crypto.randomBytes(24).toString('hex')),
      });
    }
  }
  return baseUsers;
}

function createInitialState(): DatabaseState {
  const adminHash = hashPassword(DEFAULT_ADMIN_PASS);
  return {
    adminCredentialHash: adminHash,
    users: buildInitialUsers(adminHash),
    departments: structuredClone(INITIAL_DEPARTMENTS),
    providers: structuredClone(INITIAL_PROVIDERS),
    materials: structuredClone(INITIAL_MATERIALS),
    materialOrders: [],
    quotes: structuredClone(INITIAL_QUOTES),
    reviews: structuredClone(INITIAL_REVIEWS),
    reports: structuredClone(INITIAL_REPORTS),
    payments: structuredClone(INITIAL_PAYMENTS),
    jobs: structuredClone(INITIAL_JOBS),
    applications: structuredClone(INITIAL_APPLICATIONS),
    portfolio: structuredClone(INITIAL_PORTFOLIO),
    adminLogs: structuredClone(INITIAL_ADMIN_LOGS),
    billboardAds: structuredClone(INITIAL_BILLBOARD_ADS),
    subscriptionConfig: structuredClone(INITIAL_SUBSCRIPTION_CONFIG),
    exchangeRates: structuredClone(DEFAULT_EXCHANGE_RATES),
  };
}

let db: DatabaseState = loadDatabase();

function loadDatabase(): DatabaseState {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      const parsed = JSON.parse(raw) as Partial<DatabaseState>;
      const initial = createInitialState();
      const hasUpgradedSchema =
        Array.isArray(parsed.departments) &&
        parsed.departments.length >= 20 &&
        Array.isArray(parsed.providers) &&
        parsed.providers.some((p) => p.accountCategory === 'VENDEUR') &&
        Array.isArray(parsed.users) &&
        parsed.users.some((u) => u.email === 'client@test.com') &&
        parsed.providers.some((p) => p.email === 'expert@test.com') &&
        parsed.providers.some((p) => p.email === 'entreprise@test.com') &&
        Array.isArray(parsed.billboardAds) &&
        Boolean(parsed.exchangeRates) &&
        Boolean(parsed.adminCredentialHash);

      if (!hasUpgradedSchema) {
        saveDatabase(initial);
        return initial;
      }

      const needsAdminSync =
        !parsed.adminCredentialHash || !verifyPassword(DEFAULT_ADMIN_PASS, parsed.adminCredentialHash);
      const syncedAdminHash = needsAdminSync ? hashPassword(DEFAULT_ADMIN_PASS) : parsed.adminCredentialHash!;
      const loadedUsers = Array.isArray(parsed.users) && parsed.users.length > 0 ? [...parsed.users] : [...initial.users];

      let missingAdmin = false;
      for (const template of buildAdminUsers(syncedAdminHash)) {
        const idx = loadedUsers.findIndex(
          (u) => u.email.toLowerCase() === template.email.toLowerCase() || u.id === template.id
        );
        if (idx === -1) {
          loadedUsers.unshift(template);
          missingAdmin = true;
        } else if (needsAdminSync || loadedUsers[idx].role !== 'ADMIN' || loadedUsers[idx].suspended) {
          loadedUsers[idx] = {
            ...loadedUsers[idx],
            role: 'ADMIN',
            email: template.email,
            suspended: false,
            passwordHash: syncedAdminHash,
          };
          missingAdmin = true;
        }
      }

      const nextState: DatabaseState = {
        ...initial,
        ...parsed,
        adminCredentialHash: syncedAdminHash,
        users: loadedUsers,
        departments: parsed.departments!,
        providers: parsed.providers!,
        materials: Array.isArray(parsed.materials) && parsed.materials.length > 0 ? parsed.materials : initial.materials,
        jobs: Array.isArray(parsed.jobs) && parsed.jobs.length > 0 ? parsed.jobs : initial.jobs,
        billboardAds: Array.isArray(parsed.billboardAds) ? parsed.billboardAds : initial.billboardAds,
      };
      if (needsAdminSync || missingAdmin) {
        saveDatabase(nextState);
      }
      return nextState;
    }
  } catch (err) {
    console.error('Erreur lecture base locale, réinitialisation sécurisée:', err);
  }
  const initial = createInitialState();
  saveDatabase(initial);
  return initial;
}

export function saveDatabase(state: DatabaseState = db): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tmpPath, DB_PATH);
  } catch (err) {
    console.error('Erreur sauvegarde base locale:', err);
  }
}

export function getDb(): DatabaseState {
  expireOutdatedSubscriptions();
  return db;
}

export function sanitizeUser(user: StoredUser): UserAccount {
  const { passwordHash: _removed, ...safe } = user;
  return safe;
}

export function expireOutdatedSubscriptions(): void {
  const now = Date.now();
  let changed = false;
  for (const p of db.providers) {
    if (p.subscriptionStatus === 'ACTIF' && p.subscriptionEndAt) {
      const endMs = Date.parse(p.subscriptionEndAt);
      if (Number.isFinite(endMs) && endMs <= now) {
        p.subscriptionStatus = 'EXPIRÉ';
        changed = true;
      }
    }
  }
  for (const ad of db.billboardAds) {
    if (ad.status === 'ACTIVE' && ad.endAt) {
      const endMs = Date.parse(ad.endAt);
      if (Number.isFinite(endMs) && endMs <= now) {
        ad.status = 'EXPIRÉE';
        changed = true;
      }
    }
  }
  if (changed) {
    saveDatabase();
  }
}

export function addAdminLog(action: string, targetLabel: string, adminName = `${BRAND_INFO.founder} (Admin)`): void {
  db.adminLogs.unshift({
    id: `log-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    adminName,
    action,
    targetLabel,
    createdAt: new Date().toISOString(),
  });
  if (db.adminLogs.length > 200) {
    db.adminLogs = db.adminLogs.slice(0, 200);
  }
}

export function computePlatformStats(): PlatformStats {
  expireOutdatedSubscriptions();
  const rates = db.exchangeRates || DEFAULT_EXCHANGE_RATES;
  const totalClients = db.users.filter((u) => u.role === 'CLIENT').length;
  const activeExperts = db.providers.filter(
    (p) => p.accountCategory === 'EXPERT' && p.subscriptionStatus === 'ACTIF'
  ).length;
  const activeSellers = db.providers.filter(
    (p) => (p.accountCategory === 'VENDEUR' || p.accountCategory === 'ENTREPRISE') && p.subscriptionStatus === 'ACTIF'
  ).length;
  const activeCompanies = db.providers.filter(
    (p) => p.accountCategory === 'ENTREPRISE' && p.subscriptionStatus === 'ACTIF'
  ).length;
  const pendingAccounts = db.providers.filter((p) => p.subscriptionStatus === 'EN ATTENTE').length;
  const totalRequests = db.quotes.length + db.materialOrders.length;
  const activeSubscriptions = db.providers.filter((p) => p.subscriptionStatus === 'ACTIF').length;

  const validatedPayments = db.payments.filter((pay) => pay.status === 'Validé');
  const paidAds = db.billboardAds.filter((ad) => ad.status === 'ACTIVE' || ad.status === 'EXPIRÉE');

  const toCdfByRates = (item: { currency?: string; paidAmount?: number; amountCdf: number }) => {
    const cur = item.currency || 'CDF';
    if (cur === 'USD') {
      const amt = item.paidAmount ?? convertFromCdf(item.amountCdf, 'USD', rates);
      return Math.round(amt * rates.usdToCdf);
    }
    if (cur === 'EUR') {
      const amt = item.paidAmount ?? convertFromCdf(item.amountCdf, 'EUR', rates);
      return Math.round(amt * rates.eurToCdf);
    }
    return Math.round(item.paidAmount ?? item.amountCdf);
  };

  const totalSubscriptionRevenueCdf = validatedPayments.reduce((sum, pay) => sum + toCdfByRates(pay), 0);

  const activeProviderIds = new Set(
    db.providers.filter((p) => p.subscriptionStatus === 'ACTIF').map((p) => p.id)
  );
  const activeAdsCount = db.billboardAds.filter(
    (ad) => ad.status === 'ACTIVE' && activeProviderIds.has(ad.providerId)
  ).length;
  const totalAdRevenueCdf = paidAds.reduce((sum, ad) => sum + toCdfByRates(ad), 0);

  let totalRevenueCdfOnly = 0;
  let totalRevenueUsd = 0;
  let totalRevenueEur = 0;

  for (const item of [...validatedPayments, ...paidAds]) {
    const cur = item.currency || 'CDF';
    if (cur === 'USD') {
      totalRevenueUsd += item.paidAmount ?? convertFromCdf(item.amountCdf, 'USD', rates);
    } else if (cur === 'EUR') {
      totalRevenueEur += item.paidAmount ?? convertFromCdf(item.amountCdf, 'EUR', rates);
    } else {
      totalRevenueCdfOnly += item.paidAmount ?? item.amountCdf;
    }
  }

  const grandTotalConvertedCdf =
    totalRevenueCdfOnly +
    Math.round(totalRevenueUsd * rates.usdToCdf) +
    Math.round(totalRevenueEur * rates.eurToCdf);
  const totalRevenueCdf = grandTotalConvertedCdf;

  const validatedJobs = db.jobs.filter((j) => j.status === 'VALIDÉE').length;
  const pendingJobs = db.jobs.filter((j) => j.status === 'EN ATTENTE').length;
  const totalApplications = db.applications.length;
  const openReports = db.reports.filter((r) => r.status === 'Ouvert').length;

  return {
    totalClients,
    activeExperts,
    activeSellers,
    activeCompanies,
    pendingAccounts,
    totalRequests,
    activeSubscriptions,
    totalSubscriptionRevenueCdf,
    activeAdsCount,
    totalAdRevenueCdf,
    totalRevenueCdf,
    totalRevenueCdfOnly,
    totalRevenueUsd,
    totalRevenueEur,
    grandTotalConvertedCdf,
    validatedJobs,
    pendingJobs,
    totalApplications,
    openReports,
  };
}

export function ensureAdminAccount(preferredEmail?: string): StoredUser {
  const normalized = preferredEmail?.trim().toLowerCase();
  const targetEmail =
    normalized && (ADMIN_EMAILS as readonly string[]).includes(normalized)
      ? normalized
      : 'dimbelejeremie50@gmail.com';
  let admin = db.users.find((u) => u.role === 'ADMIN' && u.email.toLowerCase() === targetEmail);
  if (!admin) {
    admin = {
      id: targetEmail === 'dimbelejeremie50@gmail.com' ? 'usr-admin-owner' : 'usr-admin-founder',
      role: 'ADMIN',
      name: BRAND_INFO.founder,
      email: targetEmail,
      phone: BRAND_INFO.phoneDisplay,
      commune: 'Gombe',
      suspended: false,
      createdAt: new Date().toISOString(),
      passwordHash: db.adminCredentialHash || hashPassword(DEFAULT_ADMIN_PASS),
    };
    db.users.unshift(admin);
    saveDatabase();
  } else if (admin.suspended) {
    admin.suspended = false;
    saveDatabase();
  }
  return admin;
}
