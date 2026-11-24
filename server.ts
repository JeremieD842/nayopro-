import crypto from 'node:crypto';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import {
  ADMIN_EMAILS,
  addAdminLog,
  computePlatformStats,
  ensureAdminAccount,
  expireOutdatedSubscriptions,
  getDb,
  hashPassword,
  sanitizeUser,
  saveDatabase,
  timingSafeEqualSecret,
  verifyPassword,
} from './server/store.ts';
import type {
  AccountCategory,
  AdPlanDays,
  BillboardAd,
  CurrencyCode,
  ExpertProfile,
  JobOffer,
  JobOfferType,
  MaterialVisualKey,
  PaymentOperator,
  QuoteRequest,
  UserRole,
} from './src/types.ts';
import { AD_PRICING } from './src/data/kinshasaData.ts';
import { convertFromCdf, extractCdfFromLabel, getOperatorsForCurrency } from './src/lib/currencyMath.ts';

dotenv.config();

const PORT = 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12; // 12 heures

interface TokenPayload {
  sub: string;
  role: UserRole;
  exp: number;
}

interface AuthenticatedRequest extends Request {
  authUser?: {
    id: string;
    role: UserRole;
  };
}

function signSessionToken(userId: string, role: UserRole): string {
  const payload: TokenPayload = {
    sub: userId,
    role,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function verifySessionToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TokenPayload;
    if (!parsed.sub || !parsed.role || typeof parsed.exp !== 'number') return null;
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

// Limitation des tentatives de connexion (Rate Limiting anti brute-force)
interface RateBucket {
  count: number;
  resetAt: number;
}
const authFailureBuckets = new Map<string, RateBucket>();
const apiRequestBuckets = new Map<string, RateBucket>();
const AUTH_MAX_FAILURES = 5;
const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const API_MAX_REQUESTS = 180;
const API_WINDOW_MS = 60 * 1000; // 1 minute

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function checkAuthRateLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = authFailureBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    return { allowed: true, retryAfterSec: 0 };
  }
  if (bucket.count >= AUTH_MAX_FAILURES) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

function recordAuthFailure(key: string): void {
  const now = Date.now();
  const bucket = authFailureBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    authFailureBuckets.set(key, { count: 1, resetAt: now + AUTH_WINDOW_MS });
  } else {
    bucket.count += 1;
  }
}

function clearAuthFailures(key: string): void {
  authFailureBuckets.delete(key);
}

function apiRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const now = Date.now();
  const bucket = apiRequestBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    apiRequestBuckets.set(ip, { count: 1, resetAt: now + API_WINDOW_MS });
    next();
    return;
  }
  if (bucket.count >= API_MAX_REQUESTS) {
    res.status(429).json({ error: 'Trop de requêtes. Veuillez patienter un instant.' });
    return;
  }
  bucket.count += 1;
  next();
}

function sanitizeText(val: unknown, maxLen = 400): string {
  if (typeof val !== 'string') return '';
  return val.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maxLen);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 160;
}

function isSafeAttachmentDataUrl(val: unknown): string | undefined {
  if (typeof val !== 'string' || !val) return undefined;
  const trimmed = val.trim();
  if (trimmed.length > 2_800_000) return undefined; // ~2 Mo base64
  if (
    /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i.test(trimmed) ||
    /^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/i.test(trimmed)
  ) {
    return trimmed;
  }
  return undefined;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }
  const token = authHeader.slice(7).trim();
  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expirée ou invalide. Veuillez vous reconnecter.' });
    return;
  }
  const db = getDb();
  const user = db.users.find((u) => u.id === payload.sub);
  if (!user || user.suspended) {
    res.status(403).json({ error: 'Compte introuvable ou suspendu.' });
    return;
  }
  req.authUser = { id: user.id, role: user.role };
  next();
}

function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.authUser || !roles.includes(req.authUser.role)) {
      res.status(403).json({ error: 'Accès refusé pour votre rôle.' });
      return;
    }
    next();
  };
}

function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const payload = verifySessionToken(authHeader.slice(7).trim());
    if (payload) {
      const db = getDb();
      const user = db.users.find((u) => u.id === payload.sub && !u.suspended);
      if (user) {
        req.authUser = { id: user.id, role: user.role };
      }
    }
  }
  next();
}

async function startServer(): Promise<void> {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Redirection HTTPS en production & en-têtes de sécurité stricts
  app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] === 'http') {
      const host = req.headers.host;
      if (host) {
        res.redirect(301, `https://${host}${req.originalUrl}`);
        return;
      }
    }
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.use(express.json({ limit: '3mb' }));
  app.use('/api', apiRateLimiter);

  // ========================
  // PUBLIC CATALOG & DATA
  // ========================
  app.get('/api/public/bootstrap', (_req, res) => {
    const db = getDb();
    expireOutdatedSubscriptions();
    // RÈGLE D'OR : Seuls les profils ACTIFS sont visibles aux clients
    const activeProviders = db.providers.filter((p) => p.subscriptionStatus === 'ACTIF');
    const activeSellerIds = new Set(activeProviders.map((p) => p.id));
    // Produits visibles uniquement si le vendeur / l'entreprise a un abonnement ACTIF
    const visibleMaterials = db.materials.filter((m) => activeSellerIds.has(m.sellerId));
    const validatedJobs = db.jobs.filter((j) => j.status === 'VALIDÉE');
    const publicReviews = db.reviews.filter((r) => !r.hidden);
    const activeDepartments = db.departments.filter((d) => d.active).sort((a, b) => a.order - b.order);
    // RÈGLE D'OR PUB : La pub doit être ACTIVE ET le vendeur/expert/entreprise doit avoir sa Visibilité ACTIF
    const visibleAds = db.billboardAds.filter(
      (ad) => ad.status === 'ACTIVE' && activeSellerIds.has(ad.providerId)
    );

    res.json({
      departments: activeDepartments,
      providers: activeProviders,
      materials: visibleMaterials,
      jobs: validatedJobs,
      reviews: publicReviews,
      billboardAds: visibleAds,
      subscriptionConfig: db.subscriptionConfig,
      exchangeRates: db.exchangeRates,
    });
  });

  app.post('/api/providers/:id/view', (req, res) => {
    const db = getDb();
    const provider = db.providers.find((p) => p.id === req.params.id && p.subscriptionStatus === 'ACTIF');
    if (!provider) {
      res.status(404).json({ error: 'Profil non disponible.' });
      return;
    }
    provider.viewsCount += 1;
    saveDatabase();
    res.json({ viewsCount: provider.viewsCount });
  });

  // ========================
  // AUTHENTICATION & SECURITY
  // ========================
  app.get('/api/auth/admin-status', (_req, res) => {
    const db = getDb();
    const envConfigured = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0);
    res.json({
      configured: envConfigured || Boolean(db.adminCredentialHash),
      envOverride: envConfigured,
    });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.authUser?.id);
    if (!user) {
      res.status(404).json({ error: 'Utilisateur introuvable.' });
      return;
    }
    const provider = user.providerId ? db.providers.find((p) => p.id === user.providerId) || null : null;
    res.json({ user: sanitizeUser(user), provider });
  });

  app.post('/api/auth/register', (req, res) => {
    const ip = getClientIp(req);
    const rateKey = `reg:${ip}`;
    const limit = checkAuthRateLimit(rateKey);
    if (!limit.allowed) {
      res.setHeader('Retry-After', String(limit.retryAfterSec));
      res.status(429).json({ error: 'Trop de tentatives. Réessayez dans quelques minutes.' });
      return;
    }

    const db = getDb();
    const requestedRole = sanitizeText(req.body?.role, 20) as UserRole;
    if (requestedRole !== 'CLIENT' && requestedRole !== 'PRESTATAIRE' && requestedRole !== 'ENTREPRISE') {
      res.status(400).json({ error: 'Rôle invalide pour inscription publique.' });
      return;
    }

    const name = sanitizeText(req.body?.name, 100);
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    const phone = sanitizeText(req.body?.phone, 40);
    const commune = sanitizeText(req.body?.commune, 60);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (name.length < 2 || !isValidEmail(email) || phone.length < 6 || !commune || password.length < 6) {
      recordAuthFailure(rateKey);
      res.status(400).json({
        error: 'Veuillez remplir tous les champs requis (email valide, téléphone, commune, mot de passe min. 6 caractères).',
      });
      return;
    }

    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      res.status(409).json({ error: 'Un compte existe déjà avec cet email.' });
      return;
    }

    const now = new Date().toISOString();
    const userId = `usr-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
    let provider: ExpertProfile | null = null;

    if (requestedRole === 'PRESTATAIRE' || requestedRole === 'ENTREPRISE') {
      const categoryRaw = sanitizeText(req.body?.accountCategory, 20);
      const accountCategory: AccountCategory =
        requestedRole === 'ENTREPRISE'
          ? 'ENTREPRISE'
          : categoryRaw === 'VENDEUR'
            ? 'VENDEUR'
            : 'EXPERT';
      const profession =
        sanitizeText(req.body?.profession, 100) ||
        (accountCategory === 'ENTREPRISE'
          ? 'Entreprise de Services'
          : accountCategory === 'VENDEUR'
            ? 'Vendeur Matériaux'
            : 'Expert Indépendant');
      const departmentId = sanitizeText(req.body?.departmentId, 60) || 'batiment';
      const description = sanitizeText(req.body?.description, 800) || 'Compte inscrit sur NAYOpro Kinshasa.';
      const priceInput = sanitizeText(req.body?.priceLabel, 60);
      const numericPrice = Number(req.body?.priceCdf);
      const zonesRaw = Array.isArray(req.body?.zones) ? req.body.zones : [commune];
      const zones = zonesRaw.map((z: unknown) => sanitizeText(z, 40)).filter(Boolean);

      const providerId = `${
        accountCategory === 'ENTREPRISE' ? 'comp' : accountCategory === 'VENDEUR' ? 'ven' : 'exp'
      }-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
      provider = {
        id: providerId,
        userId,
        accountType: requestedRole,
        accountCategory,
        name,
        profession,
        departmentId,
        commune,
        zones: zones.length > 0 ? zones : [commune],
        phone,
        email,
        priceCdf: Number.isFinite(numericPrice) && numericPrice > 0 ? numericPrice : null,
        priceLabel:
          priceInput ||
          (Number.isFinite(numericPrice) && numericPrice > 0
            ? `${numericPrice.toLocaleString('fr-FR')} CDF`
            : 'Prix sur devis'),
        description,
        verified: false,
        availability: 'Disponible',
        rating: 0,
        reviewCount: 0,
        viewsCount: 0,
        requestsCount: 0,
        declaredRevenueCdf: 0,
        avatarKey: accountCategory === 'EXPERT' ? 'plombier' : 'entreprise',
        activities:
          accountCategory === 'ENTREPRISE' && sanitizeText(req.body?.activities, 200)
            ? sanitizeText(req.body?.activities, 200)
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
        servicesList:
          accountCategory === 'ENTREPRISE' && sanitizeText(req.body?.servicesList, 200)
            ? sanitizeText(req.body?.servicesList, 200)
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
        productsSummary:
          accountCategory === 'ENTREPRISE' && sanitizeText(req.body?.productsSummary, 200)
            ? sanitizeText(req.body?.productsSummary, 200)
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
        commercialOffers:
          accountCategory === 'ENTREPRISE' && sanitizeText(req.body?.commercialOffer, 200)
            ? [sanitizeText(req.body?.commercialOffer, 200)]
            : [],
        realizations: [],
        // RÈGLE D'OR : EN ATTENTE et invisible jusqu'à activation manuelle par l'ADMIN
        subscriptionStatus: 'EN ATTENTE',
        subscriptionStartAt: null,
        subscriptionEndAt: null,
        createdAt: now,
      };
      db.providers.unshift(provider);
    }

    const newUser = {
      id: userId,
      role: requestedRole,
      name,
      email,
      phone,
      commune,
      suspended: false,
      createdAt: now,
      providerId: provider?.id,
      companyId: requestedRole === 'ENTREPRISE' ? provider?.id : undefined,
      passwordHash: hashPassword(password),
    };

    db.users.unshift(newUser);
    saveDatabase();
    clearAuthFailures(rateKey);

    const token = signSessionToken(newUser.id, newUser.role);
    res.status(201).json({
      token,
      user: sanitizeUser(newUser),
      provider,
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const ip = getClientIp(req);
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const rateKey = `login:${ip}:${email}`;
    const limit = checkAuthRateLimit(rateKey);
    if (!limit.allowed) {
      res.setHeader('Retry-After', String(limit.retryAfterSec));
      res.status(429).json({
        error: `Trop de tentatives de connexion. Réessayez dans ${Math.ceil(limit.retryAfterSec / 60)} minute(s).`,
      });
      return;
    }

    const db = getDb();
    const isAllowedAdminEmail = (ADMIN_EMAILS as readonly string[]).includes(email);
    const user = db.users.find((u) => u.email.toLowerCase() === email);

    if (isAllowedAdminEmail || user?.role === 'ADMIN') {
      const envPass = process.env.ADMIN_PASSCODE?.trim();
      const validAdmin = envPass
        ? timingSafeEqualSecret(password, envPass)
        : Boolean(db.adminCredentialHash && verifyPassword(password, db.adminCredentialHash));
      if (!validAdmin || !isAllowedAdminEmail) {
        recordAuthFailure(rateKey);
        res.status(401).json({
          error: 'Email ou mot de passe Admin incorrect. Email Admin : dimbelejeremie50@gmail.com',
        });
        return;
      }
      clearAuthFailures(rateKey);
      const admin = ensureAdminAccount(email);
      const token = signSessionToken(admin.id, 'ADMIN');
      res.json({ token, user: sanitizeUser(admin), provider: null });
      return;
    }

    if (!user) {
      recordAuthFailure(rateKey);
      res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
      return;
    }

    if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      recordAuthFailure(rateKey);
      res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
      return;
    }
    if (user.suspended) {
      res.status(403).json({ error: 'Ce compte est suspendu. Contactez nayopro2@gmail.com.' });
      return;
    }

    clearAuthFailures(rateKey);
    const provider = user.providerId ? db.providers.find((p) => p.id === user.providerId) || null : null;
    const token = signSessionToken(user.id, user.role);
    res.json({ token, user: sanitizeUser(user), provider });
  });

  // Accès démonstration rapide uniquement pour rôles non-administrateur (Client / Expert / Entreprise)
  app.post('/api/auth/demo-session', (req, res) => {
    const persona = sanitizeText(req.body?.persona, 30);
    const db = getDb();
    let targetUserId = '';
    if (persona === 'CLIENT') targetUserId = 'usr-client-demo';
    else if (persona === 'EXPERT_PENDING') targetUserId = 'usr-exp-p1';
    else if (persona === 'ENTREPRISE_PENDING') targetUserId = 'usr-comp-p1';
    else if (persona === 'PRESTATAIRE') targetUserId = 'usr-exp-1';
    else if (persona === 'VENDEUR') targetUserId = 'usr-ven-1';
    else if (persona === 'ENTREPRISE') targetUserId = 'usr-comp-1';
    else {
      res.status(400).json({ error: 'Profil démo non autorisé.' });
      return;
    }

    const user = db.users.find((u) => u.id === targetUserId && u.role !== 'ADMIN');
    if (!user || user.suspended) {
      res.status(404).json({ error: 'Profil démo indisponible.' });
      return;
    }
    const provider = user.providerId ? db.providers.find((p) => p.id === user.providerId) || null : null;
    const token = signSessionToken(user.id, user.role);
    res.json({ token, user: sanitizeUser(user), provider });
  });

  // Configuration initiale sécurisée du mot de passe Admin (verrouillée dès que définie ou si ADMIN_PASSCODE est configuré)
  app.post('/api/auth/admin-claim', (req, res) => {
    const ip = getClientIp(req);
    const rateKey = `admin-claim:${ip}`;
    const limit = checkAuthRateLimit(rateKey);
    if (!limit.allowed) {
      res.setHeader('Retry-After', String(limit.retryAfterSec));
      res.status(429).json({ error: 'Trop de tentatives. Réessayez plus tard.' });
      return;
    }

    const db = getDb();
    const envPass = process.env.ADMIN_PASSCODE?.trim();
    if (envPass || db.adminCredentialHash) {
      res.status(403).json({ error: 'Le compte Administrateur est déjà configuré. Utilisez la connexion Admin.' });
      return;
    }

    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (password.length < 8) {
      recordAuthFailure(rateKey);
      res.status(400).json({ error: 'Le mot de passe Admin doit contenir au moins 8 caractères.' });
      return;
    }

    const hashed = hashPassword(password);
    db.adminCredentialHash = hashed;
    const admin = ensureAdminAccount();
    admin.passwordHash = hashed;
    addAdminLog('Configuration initiale sécurité Admin', admin.email);
    saveDatabase();
    clearAuthFailures(rateKey);

    const token = signSessionToken(admin.id, 'ADMIN');
    res.status(201).json({ token, user: sanitizeUser(admin), provider: null });
  });

  app.post('/api/auth/admin-login', (req, res) => {
    const ip = getClientIp(req);
    const rateKey = `admin-login:${ip}`;
    const limit = checkAuthRateLimit(rateKey);
    if (!limit.allowed) {
      res.setHeader('Retry-After', String(limit.retryAfterSec));
      res.status(429).json({
        error: `Trop de tentatives Admin. Compte temporairement bloqué (${Math.ceil(limit.retryAfterSec / 60)} min).`,
      });
      return;
    }

    const db = getDb();
    const emailRaw = sanitizeText(req.body?.email, 160).toLowerCase();
    const emailValid = !emailRaw || (ADMIN_EMAILS as readonly string[]).includes(emailRaw);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const envPass = process.env.ADMIN_PASSCODE?.trim();

    let validPass = false;
    if (envPass && envPass.length > 0) {
      validPass = timingSafeEqualSecret(password, envPass);
    } else if (db.adminCredentialHash) {
      validPass = verifyPassword(password, db.adminCredentialHash);
    } else {
      res.status(400).json({ error: 'Aucun mot de passe Admin configuré. Veuillez d’abord initialiser l’accès.' });
      return;
    }

    if (!emailValid || !validPass) {
      recordAuthFailure(rateKey);
      res.status(401).json({
        error: 'Email ou mot de passe Admin incorrect. Email Admin : dimbelejeremie50@gmail.com',
      });
      return;
    }

    clearAuthFailures(rateKey);
    const admin = ensureAdminAccount(emailRaw || 'dimbelejeremie50@gmail.com');
    const token = signSessionToken(admin.id, 'ADMIN');
    res.json({ token, user: sanitizeUser(admin), provider: null });
  });

  // ========================
  // CLIENT: DEVIS, COMMANDES, AVIS, SIGNALEMENTS
  // ========================
  app.get('/api/my/orders', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const userId = req.authUser!.id;
    const quotes = db.quotes.filter((q) => q.clientId === userId || (userId === 'usr-client-demo' && q.clientId === 'usr-client-demo'));
    const materialOrders = db.materialOrders.filter((m) => m.clientId === userId);
    const applications = db.applications.filter((a) => a.candidateUserId === userId);
    res.json({ quotes, materialOrders, applications });
  });

  app.post('/api/quotes', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    expireOutdatedSubscriptions();
    const providerId = sanitizeText(req.body?.providerId, 60);
    // RÈGLE D'OR : Un prestataire inactif/en attente/expiré/suspendu ne peut PAS recevoir de demandes
    const provider = db.providers.find((p) => p.id === providerId && p.subscriptionStatus === 'ACTIF');
    if (!provider) {
      res.status(403).json({ error: 'Ce prestataire n’est pas actif actuellement et ne peut pas recevoir de demande.' });
      return;
    }

    const user = db.users.find((u) => u.id === req.authUser!.id);
    if (!user) {
      res.status(404).json({ error: 'Utilisateur introuvable.' });
      return;
    }

    const service = sanitizeText(req.body?.service, 140);
    const commune = sanitizeText(req.body?.commune, 60) || user.commune;
    const address = sanitizeText(req.body?.address, 200);
    const details = sanitizeText(req.body?.details, 800);
    const desiredDate = sanitizeText(req.body?.desiredDate, 40);
    const budgetCdf = sanitizeText(req.body?.budgetCdf, 80) || 'À discuter';
    const photoName = sanitizeText(req.body?.photoName, 120) || undefined;

    if (!service || !address || !details) {
      res.status(400).json({ error: 'Veuillez préciser le service, l’adresse/commune et les détails.' });
      return;
    }

    const quote: QuoteRequest = {
      id: `qt-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      clientId: user.id,
      clientName: user.name,
      clientPhone: user.phone,
      providerId: provider.id,
      providerName: provider.name,
      service,
      commune,
      address,
      details,
      photoName,
      desiredDate: desiredDate || new Date().toISOString().slice(0, 10),
      budgetCdf,
      status: 'En attente',
      createdAt: new Date().toISOString(),
    };

    db.quotes.unshift(quote);
    provider.requestsCount += 1;
    saveDatabase();
    res.status(201).json({ quote });
  });

  app.post('/api/material-orders', optionalAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const materialId = sanitizeText(req.body?.materialId, 60);
    const material = db.materials.find((m) => m.id === materialId);
    if (!material) {
      res.status(404).json({ error: 'Matériau introuvable.' });
      return;
    }
    const quantity = Math.max(1, Math.min(500, Number(req.body?.quantity) || 1));
    const commune = sanitizeText(req.body?.commune, 60) || 'Gombe';
    const user = req.authUser ? db.users.find((u) => u.id === req.authUser!.id) : undefined;
    const clientName = sanitizeText(req.body?.clientName, 100) || user?.name || 'Client NAYOpro';
    const clientPhone = sanitizeText(req.body?.clientPhone, 40) || user?.phone || '+243';

    const order = {
      id: `ord-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      clientId: user?.id,
      clientName,
      clientPhone,
      materialId: material.id,
      materialName: material.name,
      quantity,
      unitPriceCdf: material.priceCdf,
      totalCdf: quantity * material.priceCdf,
      commune,
      status: 'Envoyée via WhatsApp' as const,
      createdAt: new Date().toISOString(),
    };
    db.materialOrders.unshift(order);
    saveDatabase();
    res.status(201).json({ order });
  });

  app.post('/api/reviews', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const providerId = sanitizeText(req.body?.providerId, 60);
    const provider = db.providers.find((p) => p.id === providerId && p.subscriptionStatus === 'ACTIF');
    if (!provider) {
      res.status(404).json({ error: 'Prestataire actif introuvable.' });
      return;
    }
    const rating = Math.round(Number(req.body?.rating));
    const comment = sanitizeText(req.body?.comment, 500);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5 || comment.length < 3) {
      res.status(400).json({ error: 'Note entre 1 et 5 étoiles et commentaire requis.' });
      return;
    }
    const user = db.users.find((u) => u.id === req.authUser!.id)!;
    const review = {
      id: `rev-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      providerId: provider.id,
      providerName: provider.name,
      clientId: user.id,
      clientName: user.name,
      rating,
      comment,
      hidden: false,
      reported: false,
      createdAt: new Date().toISOString(),
    };
    db.reviews.unshift(review);

    const visibleReviews = db.reviews.filter((r) => r.providerId === provider.id && !r.hidden);
    provider.reviewCount = visibleReviews.length;
    provider.rating =
      visibleReviews.length > 0
        ? Math.round((visibleReviews.reduce((s, r) => s + r.rating, 0) / visibleReviews.length) * 10) / 10
        : 0;
    saveDatabase();
    res.status(201).json({ review, provider });
  });

  app.post('/api/reports', optionalAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const targetType: 'review' | 'provider' = req.body?.targetType === 'review' ? 'review' : 'provider';
    const targetId = sanitizeText(req.body?.targetId, 60);
    const providerId = sanitizeText(req.body?.providerId, 60);
    const reason = sanitizeText(req.body?.reason, 400);
    const provider = db.providers.find((p) => p.id === providerId);
    if (!provider || reason.length < 4) {
      res.status(400).json({ error: 'Motif de signalement requis (min. 4 caractères).' });
      return;
    }

    const user = req.authUser ? db.users.find((u) => u.id === req.authUser!.id) : undefined;
    if (targetType === 'review') {
      const rev = db.reviews.find((r) => r.id === targetId);
      if (rev) rev.reported = true;
    }

    const report = {
      id: `rep-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      targetType,
      targetId: targetId || provider.id,
      providerId: provider.id,
      providerName: provider.name,
      reporterName: user?.name || 'Visiteur Kinshasa',
      reason,
      status: 'Ouvert' as const,
      createdAt: new Date().toISOString(),
    };
    db.reports.unshift(report);
    saveDatabase();
    res.status(201).json({ report });
  });

  // ========================
  // PRESTATAIRE & ENTREPRISE DASHBOARD + ABONNEMENT
  // ========================
  app.get('/api/provider/dashboard', requireAuth, requireRole('PRESTATAIRE', 'ENTREPRISE'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.authUser!.id);
    const provider = db.providers.find((p) => p.id === user?.providerId);
    if (!provider) {
      res.status(404).json({ error: 'Profil prestataire introuvable.' });
      return;
    }
    const quotes = provider.subscriptionStatus === 'ACTIF' ? db.quotes.filter((q) => q.providerId === provider.id) : [];
    const reviews = db.reviews.filter((r) => r.providerId === provider.id && !r.hidden);
    const payments = db.payments.filter((p) => p.providerId === provider.id);
    const jobs = provider.accountType === 'ENTREPRISE' ? db.jobs.filter((j) => j.companyId === provider.id) : [];
    const applications =
      provider.accountType === 'ENTREPRISE' ? db.applications.filter((a) => a.companyId === provider.id) : [];
    const products = db.materials.filter((m) => m.sellerId === provider.id);
    const ads = db.billboardAds.filter((a) => a.providerId === provider.id);

    res.json({
      provider,
      quotes,
      reviews,
      payments,
      jobs,
      applications,
      products,
      ads,
      subscriptionConfig: db.subscriptionConfig,
      exchangeRates: db.exchangeRates,
    });
  });

  app.post('/api/seller/products', requireAuth, requireRole('PRESTATAIRE', 'ENTREPRISE'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.authUser!.id);
    const provider = db.providers.find((p) => p.id === user?.providerId);
    if (!provider || (provider.accountCategory !== 'VENDEUR' && provider.accountCategory !== 'ENTREPRISE')) {
      res.status(403).json({ error: 'Réservé aux Vendeurs Marché et Entreprises.' });
      return;
    }
    if (provider.subscriptionStatus !== 'ACTIF') {
      res.status(403).json({ error: 'Abonnement 1 mois ACTIF obligatoire pour publier un produit sur le Marché.' });
      return;
    }
    const name = sanitizeText(req.body?.name, 120);
    const category = sanitizeText(req.body?.category, 60) || 'Matériaux';
    const unit = sanitizeText(req.body?.unit, 40) || 'Unité';
    const priceCdf = Number(req.body?.priceCdf);
    const commune = sanitizeText(req.body?.commune, 60) || provider.commune;
    const description = sanitizeText(req.body?.description, 300) || 'Produit disponible à Kinshasa.';
    const visualRaw = sanitizeText(req.body?.visualKey, 20) as MaterialVisualKey;
    const allowedVisuals: MaterialVisualKey[] = [
      'sable',
      'ciment',
      'caillasse',
      'bois',
      'toles',
      'fer',
      'gravier',
      'briques',
      'peinture',
      'carrelage',
    ];
    const visualKey = allowedVisuals.includes(visualRaw) ? visualRaw : 'ciment';

    if (!name || !Number.isFinite(priceCdf) || priceCdf <= 0) {
      res.status(400).json({ error: 'Nom du produit et prix en CDF valides requis.' });
      return;
    }

    const material = {
      id: `mat-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      sellerId: provider.id,
      name,
      category,
      unit,
      priceCdf: Math.round(priceCdf),
      supplier: provider.name,
      sellerPhone: provider.phone,
      commune,
      visualKey,
      description,
      inStock: true,
    };
    db.materials.unshift(material);
    saveDatabase();
    res.status(201).json({ material });
  });

  app.patch('/api/provider/availability', requireAuth, requireRole('PRESTATAIRE', 'ENTREPRISE'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.authUser!.id);
    const provider = db.providers.find((p) => p.id === user?.providerId);
    if (!provider) {
      res.status(404).json({ error: 'Profil introuvable.' });
      return;
    }
    const availability = req.body?.availability === 'Occupé' ? 'Occupé' : 'Disponible';
    provider.availability = availability;
    saveDatabase();
    res.json({ provider });
  });

  app.patch('/api/provider/profile', requireAuth, requireRole('PRESTATAIRE', 'ENTREPRISE'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.authUser!.id);
    const provider = db.providers.find((p) => p.id === user?.providerId);
    if (!provider) {
      res.status(404).json({ error: 'Profil introuvable.' });
      return;
    }
    if (typeof req.body?.description === 'string') provider.description = sanitizeText(req.body.description, 800);
    if (typeof req.body?.priceLabel === 'string') provider.priceLabel = sanitizeText(req.body.priceLabel, 60);
    if (typeof req.body?.phone === 'string') provider.phone = sanitizeText(req.body.phone, 40);
    if (typeof req.body?.commune === 'string') provider.commune = sanitizeText(req.body.commune, 60);
    if (Array.isArray(req.body?.commercialOffers)) {
      provider.commercialOffers = req.body.commercialOffers.map((o: unknown) => sanitizeText(o, 200)).filter(Boolean).slice(0, 6);
    }
    saveDatabase();
    res.json({ provider });
  });

  app.patch('/api/provider/quotes/:id', requireAuth, requireRole('PRESTATAIRE', 'ENTREPRISE'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.authUser!.id);
    const provider = db.providers.find((p) => p.id === user?.providerId);
    const quote = db.quotes.find((q) => q.id === req.params.id);
    if (!provider || !quote || quote.providerId !== provider.id) {
      res.status(404).json({ error: 'Demande introuvable.' });
      return;
    }
    const allowed = ['Acceptée', 'Terminée', 'Refusée'] as const;
    const status = req.body?.status;
    if (!allowed.includes(status)) {
      res.status(400).json({ error: 'Statut invalide.' });
      return;
    }
    quote.status = status;
    if (status === 'Terminée' && Number(req.body?.revenueCdf) > 0) {
      provider.declaredRevenueCdf += Number(req.body.revenueCdf);
    }
    saveDatabase();
    res.json({ quote, provider });
  });

  app.post('/api/provider/subscription-proof', requireAuth, requireRole('PRESTATAIRE', 'ENTREPRISE'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.authUser!.id);
    const provider = db.providers.find((p) => p.id === user?.providerId);
    if (!provider) {
      res.status(404).json({ error: 'Profil introuvable.' });
      return;
    }
    const currencyRaw = sanitizeText(req.body?.currency, 10).toUpperCase();
    const currency: CurrencyCode = currencyRaw === 'USD' ? 'USD' : currencyRaw === 'EUR' ? 'EUR' : 'CDF';
    const validOps = getOperatorsForCurrency(currency);
    const operatorRaw = sanitizeText(req.body?.operator, 40) as PaymentOperator;
    if (!validOps.includes(operatorRaw)) {
      res.status(400).json({
        error:
          currency === 'EUR'
            ? 'Pour les paiements en €, choisissez Transfert Bancaire, Carte, Western Union ou MoneyGram.'
            : 'Pour les paiements en CDF ou $, choisissez Orange Money, Airtel Money ou M-Pesa.',
      });
      return;
    }
    const transactionRef = sanitizeText(req.body?.transactionRef, 80);
    if (transactionRef.length < 4) {
      res.status(400).json({ error: 'Veuillez indiquer le numéro ou référence de transaction.' });
      return;
    }

    const proofImageName = sanitizeText(req.body?.proofImageName, 120) || undefined;
    const proofDataUrl = isSafeAttachmentDataUrl(req.body?.proofDataUrl);
    const amountCdf = db.subscriptionConfig.monthlyPriceCdf;
    const paidAmount = convertFromCdf(amountCdf, currency, db.exchangeRates);

    const payment = {
      id: `pay-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      providerId: provider.id,
      providerName: provider.name,
      accountType: provider.accountType,
      accountCategory: provider.accountCategory,
      operator: operatorRaw,
      amountCdf,
      currency,
      paidAmount,
      transactionRef,
      proofImageName,
      proofDataUrl,
      status: 'En attente' as const,
      receiptCode: `NAYO-REC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 899)}`,
      createdAt: new Date().toISOString(),
    };

    if (provider.subscriptionStatus !== 'ACTIF') {
      provider.subscriptionStatus = 'EN ATTENTE';
    }
    db.payments.unshift(payment);
    saveDatabase();
    res.status(201).json({
      payment,
      provider,
      message:
        'Votre demande est en attente de validation par NAYOpro. Vous serez activé après vérification du paiement. Contact : nayopro2@gmail.com',
    });
  });

  app.post('/api/provider/ads', requireAuth, requireRole('PRESTATAIRE', 'ENTREPRISE'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.authUser!.id);
    const provider = db.providers.find((p) => p.id === user?.providerId);
    if (!provider) {
      res.status(404).json({ error: 'Profil introuvable.' });
      return;
    }

    const title = sanitizeText(req.body?.title, 120);
    const description = sanitizeText(req.body?.description, 260);
    const durationDays: AdPlanDays = Number(req.body?.durationDays) === 30 ? 30 : 7;
    const amountCdf = AD_PRICING[durationDays];
    const currencyRaw = sanitizeText(req.body?.currency, 10).toUpperCase();
    const currency: CurrencyCode = currencyRaw === 'USD' ? 'USD' : currencyRaw === 'EUR' ? 'EUR' : 'CDF';
    const validOps = getOperatorsForCurrency(currency);
    const operatorRaw = sanitizeText(req.body?.operator, 40) as PaymentOperator;
    if (!validOps.includes(operatorRaw)) {
      res.status(400).json({
        error:
          currency === 'EUR'
            ? 'Pour les paiements en €, choisissez Transfert Bancaire, Carte, Western Union ou MoneyGram.'
            : 'Pour les paiements en CDF ou $, choisissez Orange Money, Airtel Money ou M-Pesa.',
      });
      return;
    }
    const transactionRef = sanitizeText(req.body?.transactionRef, 80);
    if (!title || !description || transactionRef.length < 4) {
      res.status(400).json({ error: 'Titre de la pub, description courte et numéro de transaction requis.' });
      return;
    }

    const paidAmount = convertFromCdf(amountCdf, currency, db.exchangeRates);
    const photoDataUrl = isSafeAttachmentDataUrl(req.body?.photoDataUrl);
    const proofDataUrl = isSafeAttachmentDataUrl(req.body?.proofDataUrl);
    const proofImageName = sanitizeText(req.body?.proofImageName, 120) || undefined;
    const visualKey = sanitizeText(req.body?.visualKey, 40) || provider.avatarKey || 'entreprise';
    const targetBlock =
      provider.accountCategory === 'VENDEUR'
        ? 'market'
        : provider.accountCategory === 'ENTREPRISE'
          ? 'companies'
          : 'experts';

    const ad: BillboardAd = {
      id: `ad-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      providerId: provider.id,
      providerName: provider.name,
      accountCategory: provider.accountCategory,
      providerCommune: provider.commune,
      providerRating: provider.rating,
      title,
      description,
      photoDataUrl,
      visualKey,
      durationDays,
      amountCdf,
      currency,
      paidAmount,
      operator: operatorRaw,
      transactionRef,
      proofImageName,
      proofDataUrl,
      status: 'EN ATTENTE',
      startAt: null,
      endAt: null,
      targetBlock,
      createdAt: new Date().toISOString(),
    };

    db.billboardAds.unshift(ad);
    saveDatabase();
    res.status(201).json({
      ad,
      message: 'Votre demande de publicité est en attente de validation. Contact : nayopro2@gmail.com',
    });
  });

  // ========================
  // MODULE EMPLOI & STAGES (SKILLS TO JOBS)
  // ========================
  app.post('/api/jobs', requireAuth, requireRole('ENTREPRISE', 'ADMIN'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.authUser!.id)!;
    let companyId = 'comp-1';
    let companyName = 'Congo Bâtiment & Négoce SARL';

    if (user.role === 'ENTREPRISE') {
      const company = db.providers.find((p) => p.id === user.providerId);
      // Abonnement ACTIF obligatoire pour publier
      if (!company || company.subscriptionStatus !== 'ACTIF') {
        res.status(403).json({
          error: 'Abonnement entreprise ACTIF obligatoire pour publier une offre d’emploi ou de stage.',
        });
        return;
      }
      companyId = company.id;
      companyName = company.name;
    }

    const title = sanitizeText(req.body?.title, 120);
    const typeRaw = sanitizeText(req.body?.type, 40) as JobOfferType;
    const validTypes: JobOfferType[] = ['Emploi CDI', 'CDD', 'Stage', 'Mission'];
    const commune = sanitizeText(req.body?.commune, 60);
    const domain = sanitizeText(req.body?.domain, 80) || 'Services & Commerce';
    const salaryLabel = sanitizeText(req.body?.salaryLabel, 80) || 'À discuter';
    const rawSalaryCdf = Number(req.body?.salaryCdf);
    const salaryCdf =
      Number.isFinite(rawSalaryCdf) && rawSalaryCdf > 0
        ? Math.round(rawSalaryCdf)
        : extractCdfFromLabel(salaryLabel);
    const description = sanitizeText(req.body?.description, 1000);
    const deadline = sanitizeText(req.body?.deadline, 30);
    const positions = Math.max(1, Math.min(50, Number(req.body?.positions) || 1));
    const skillsInput = Array.isArray(req.body?.skills)
      ? req.body.skills.map((s: unknown) => sanitizeText(s, 50)).filter(Boolean)
      : sanitizeText(req.body?.skills, 250)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

    if (!title || !validTypes.includes(typeRaw) || !commune || !description || !deadline) {
      res.status(400).json({ error: 'Veuillez compléter tous les champs de l’offre.' });
      return;
    }

    const job: JobOffer = {
      id: `job-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      companyId,
      companyName,
      companyLogoKey: companyName
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() || '')
        .join(''),
      title,
      type: typeRaw,
      domain,
      commune,
      salaryCdf,
      salaryLabel: salaryLabel === 'À discuter' && salaryCdf ? `${salaryCdf.toLocaleString('fr-FR')} CDF / mois` : salaryLabel,
      description,
      skills: skillsInput.slice(0, 8),
      deadline,
      positions,
      // L'offre part en EN ATTENTE, l'ADMIN doit la valider avant publication
      status: 'EN ATTENTE',
      createdAt: new Date().toISOString(),
    };

    db.jobs.unshift(job);
    saveDatabase();
    res.status(201).json({
      job,
      message: "Offre soumise ! Elle est en attente de validation par l'Admin NAYOpro avant publication.",
    });
  });

  app.post('/api/jobs/:id/apply', optionalAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const job = db.jobs.find((j) => j.id === req.params.id && j.status === 'VALIDÉE');
    if (!job) {
      res.status(404).json({ error: 'Offre non trouvée ou non publiée.' });
      return;
    }

    const fullName = sanitizeText(req.body?.fullName, 120);
    const whatsapp = sanitizeText(req.body?.whatsapp, 40);
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    const commune = sanitizeText(req.body?.commune, 60);
    const skills = sanitizeText(req.body?.skills, 300);
    const presentation = sanitizeText(req.body?.presentation, 1000);
    const cvFileName = sanitizeText(req.body?.cvFileName, 120) || undefined;
    const cvDataUrl = isSafeAttachmentDataUrl(req.body?.cvDataUrl);

    if (!fullName || !whatsapp || !isValidEmail(email) || !commune || !skills || !presentation) {
      res.status(400).json({ error: 'Veuillez renseigner tous les champs obligatoires de votre candidature.' });
      return;
    }

    const application = {
      id: `app-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      jobId: job.id,
      jobTitle: job.title,
      companyId: job.companyId,
      companyName: job.companyName,
      candidateUserId: req.authUser?.id,
      fullName,
      whatsapp,
      email,
      commune,
      skills,
      presentation,
      cvFileName,
      cvDataUrl,
      status: 'Envoyée' as const,
      createdAt: new Date().toISOString(),
    };
    db.applications.unshift(application);
    saveDatabase();

    res.status(201).json({
      application,
      message: "Candidature envoyée. L'entreprise vous contactera si vous êtes retenu.",
    });
  });

  app.patch('/api/company/applications/:id', requireAuth, requireRole('ENTREPRISE', 'ADMIN'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const appItem = db.applications.find((a) => a.id === req.params.id);
    if (!appItem) {
      res.status(404).json({ error: 'Candidature introuvable.' });
      return;
    }
    const user = db.users.find((u) => u.id === req.authUser!.id)!;
    if (user.role === 'ENTREPRISE' && appItem.companyId !== user.providerId) {
      res.status(403).json({ error: 'Accès interdit à cette candidature.' });
      return;
    }
    const status = req.body?.status === 'Acceptée' ? 'Acceptée' : req.body?.status === 'Refusée' ? 'Refusée' : null;
    if (!status) {
      res.status(400).json({ error: 'Statut invalide.' });
      return;
    }
    appItem.status = status;
    saveDatabase();
    res.json({ application: appItem });
  });

  // Portfolio Skills to Jobs (Jeunes & Candidats)
  app.get('/api/portfolio', optionalAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const key = req.authUser?.id || 'demo-candidate';
    const entries = db.portfolio.filter((p) => p.userId === key || p.userId === 'demo-candidate');
    res.json({ entries });
  });

  app.post('/api/portfolio', optionalAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const allowedKinds = ['Compétence', 'Réalisation', 'Formation', 'Mission'] as const;
    const kind = req.body?.kind;
    if (!allowedKinds.includes(kind)) {
      res.status(400).json({ error: 'Type de portfolio invalide.' });
      return;
    }
    const title = sanitizeText(req.body?.title, 140);
    const detail = sanitizeText(req.body?.detail, 400);
    const yearOrDuration = sanitizeText(req.body?.yearOrDuration, 50) || '2026';
    if (!title || !detail) {
      res.status(400).json({ error: 'Titre et description requis.' });
      return;
    }
    const entry = {
      id: `port-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      userId: req.authUser?.id || 'demo-candidate',
      kind,
      title,
      detail,
      yearOrDuration,
      createdAt: new Date().toISOString(),
    };
    db.portfolio.unshift(entry);
    saveDatabase();
    res.status(201).json({ entry });
  });

  app.delete('/api/portfolio/:id', optionalAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const key = req.authUser?.id || 'demo-candidate';
    const idx = db.portfolio.findIndex((p) => p.id === req.params.id && (p.userId === key || p.userId === 'demo-candidate'));
    if (idx === -1) {
      res.status(404).json({ error: 'Élément introuvable.' });
      return;
    }
    db.portfolio.splice(idx, 1);
    saveDatabase();
    res.json({ ok: true });
  });

  // ========================
  // ADMIN CONTROL CENTER (STRICT ADMIN ROLE)
  // ========================
  app.get('/api/admin/overview', requireAuth, requireRole('ADMIN'), (_req, res) => {
    const db = getDb();
    const stats = computePlatformStats();
    res.json({
      stats,
      providers: db.providers,
      materials: db.materials,
      payments: db.payments,
      jobs: db.jobs,
      applications: db.applications,
      departments: db.departments,
      reports: db.reports,
      reviews: db.reviews,
      users: db.users.map(sanitizeUser),
      logs: db.adminLogs,
      billboardAds: db.billboardAds,
      subscriptionConfig: db.subscriptionConfig,
      exchangeRates: db.exchangeRates,
    });
  });

  app.patch('/api/admin/exchange-rates', requireAuth, requireRole('ADMIN'), (req, res) => {
    const db = getDb();
    const usdToCdf = Number(req.body?.usdToCdf);
    const eurToCdf = Number(req.body?.eurToCdf);
    if (!Number.isFinite(usdToCdf) || usdToCdf < 100 || usdToCdf > 1_000_000) {
      res.status(400).json({ error: 'Taux Dollar ($) invalide.' });
      return;
    }
    if (!Number.isFinite(eurToCdf) || eurToCdf < 100 || eurToCdf > 1_000_000) {
      res.status(400).json({ error: 'Taux Euro (€) invalide.' });
      return;
    }
    db.exchangeRates = {
      usdToCdf: Math.round(usdToCdf),
      eurToCdf: Math.round(eurToCdf),
      updatedAt: new Date().toISOString(),
    };
    addAdminLog(
      'Mise à jour Taux de Change',
      `1 $ = ${db.exchangeRates.usdToCdf} CDF · 1 € = ${db.exchangeRates.eurToCdf} CDF`
    );
    saveDatabase();
    res.json({
      exchangeRates: db.exchangeRates,
      stats: computePlatformStats(),
      logs: db.adminLogs,
    });
  });

  app.post('/api/admin/ads/:id/action', requireAuth, requireRole('ADMIN'), (req, res) => {
    const db = getDb();
    const ad = db.billboardAds.find((a) => a.id === req.params.id);
    if (!ad) {
      res.status(404).json({ error: 'Publicité introuvable.' });
      return;
    }
    const action = sanitizeText(req.body?.action, 20);
    const now = new Date();
    if (action === 'ACTIVER') {
      ad.status = 'ACTIVE';
      ad.startAt = now.toISOString();
      ad.endAt = new Date(now.getTime() + ad.durationDays * 86400000).toISOString();
      addAdminLog(`Activation Pub Panneau (${ad.durationDays}j)`, `${ad.title} — ${ad.providerName}`);
    } else if (action === 'PROLONGER') {
      const baseMs = ad.endAt && Date.parse(ad.endAt) > now.getTime() ? Date.parse(ad.endAt) : now.getTime();
      if (!ad.startAt) ad.startAt = now.toISOString();
      ad.status = 'ACTIVE';
      ad.endAt = new Date(baseMs + ad.durationDays * 86400000).toISOString();
      addAdminLog(`Prolongation Pub Panneau (+${ad.durationDays}j)`, `${ad.title} — ${ad.providerName}`);
    } else if (action === 'REFUSER') {
      ad.status = 'REFUSÉE';
      addAdminLog('Refus Pub Panneau', `${ad.title} — ${ad.providerName}`);
    } else if (action === 'SUSPENDRE') {
      ad.status = 'SUSPENDUE';
      addAdminLog('Suspension Pub Panneau', `${ad.title} — ${ad.providerName}`);
    } else {
      res.status(400).json({ error: 'Action publicité invalide.' });
      return;
    }
    saveDatabase();
    res.json({ ad, stats: computePlatformStats(), logs: db.adminLogs });
  });

  app.post('/api/admin/providers/:id/action', requireAuth, requireRole('ADMIN'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const provider = db.providers.find((p) => p.id === req.params.id);
    if (!provider) {
      res.status(404).json({ error: 'Prestataire / Entreprise introuvable.' });
      return;
    }
    const action = sanitizeText(req.body?.action, 30);
    const now = new Date();
    const days = db.subscriptionConfig.durationDays || 30;

    if (action === 'ACTIVER') {
      const end = new Date(now.getTime() + days * 86400000);
      provider.subscriptionStatus = 'ACTIF';
      provider.subscriptionStartAt = now.toISOString();
      provider.subscriptionEndAt = end.toISOString();
      provider.verified = true;
      // Valide les preuves de paiement en attente associées
      for (const pay of db.payments) {
        if (pay.providerId === provider.id && pay.status === 'En attente') {
          pay.status = 'Validé';
          pay.validatedAt = now.toISOString();
        }
      }
      addAdminLog(`Activation Abonnement ${days} jours`, `${provider.name} (${provider.commune})`);
    } else if (action === 'PROLONGER') {
      const baseTime =
        provider.subscriptionEndAt && Date.parse(provider.subscriptionEndAt) > now.getTime()
          ? Date.parse(provider.subscriptionEndAt)
          : now.getTime();
      const end = new Date(baseTime + days * 86400000);
      if (!provider.subscriptionStartAt) provider.subscriptionStartAt = now.toISOString();
      provider.subscriptionStatus = 'ACTIF';
      provider.subscriptionEndAt = end.toISOString();
      provider.verified = true;
      addAdminLog(`Prolongation Abonnement +${days} jours`, `${provider.name}`);
    } else if (action === 'SUSPENDRE') {
      provider.subscriptionStatus = 'SUSPENDU';
      addAdminLog('Suspension Profil', `${provider.name}`);
    } else if (action === 'DESACTIVER') {
      provider.subscriptionStatus = 'INACTIF';
      addAdminLog('Désactivation Profil', `${provider.name}`);
    } else {
      res.status(400).json({ error: 'Action admin inconnue.' });
      return;
    }

    saveDatabase();
    res.json({ provider, stats: computePlatformStats(), logs: db.adminLogs, payments: db.payments });
  });

  app.post('/api/admin/jobs/:id/action', requireAuth, requireRole('ADMIN'), (req, res) => {
    const db = getDb();
    const job = db.jobs.find((j) => j.id === req.params.id);
    if (!job) {
      res.status(404).json({ error: "Offre d'emploi introuvable." });
      return;
    }
    const action = sanitizeText(req.body?.action, 20);
    if (action === 'VALIDER') job.status = 'VALIDÉE';
    else if (action === 'REFUSER') job.status = 'REFUSÉE';
    else if (action === 'SUSPENDRE') job.status = 'SUSPENDUE';
    else {
      res.status(400).json({ error: 'Action offre invalide.' });
      return;
    }
    addAdminLog(`Modération Offre (${job.status})`, `${job.title} — ${job.companyName}`);
    saveDatabase();
    res.json({ job, stats: computePlatformStats(), logs: db.adminLogs });
  });

  app.patch('/api/admin/subscription-config', requireAuth, requireRole('ADMIN'), (req, res) => {
    const db = getDb();
    const price = Number(req.body?.monthlyPriceCdf);
    const days = Number(req.body?.durationDays);
    if (!Number.isFinite(price) || price < 1000 || !Number.isFinite(days) || days < 1) {
      res.status(400).json({ error: 'Tarif ou durée invalide.' });
      return;
    }
    db.subscriptionConfig = { monthlyPriceCdf: Math.round(price), durationDays: Math.round(days) };
    addAdminLog('Mise à jour tarif abonnement', `${db.subscriptionConfig.monthlyPriceCdf} CDF / ${db.subscriptionConfig.durationDays} jours`);
    saveDatabase();
    res.json({ subscriptionConfig: db.subscriptionConfig, logs: db.adminLogs });
  });

  app.post('/api/admin/departments', requireAuth, requireRole('ADMIN'), (req, res) => {
    const db = getDb();
    const name = sanitizeText(req.body?.name, 80);
    const description = sanitizeText(req.body?.description, 200);
    const services = sanitizeText(req.body?.services, 200)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (name.length < 3) {
      res.status(400).json({ error: 'Nom de catégorie requis.' });
      return;
    }
    const dept = {
      id: `dept-${Date.now()}`,
      name,
      priority: Boolean(req.body?.priority),
      order: db.departments.length + 1,
      iconKey: 'briefcase',
      description: description || 'Nouveau département NAYOpro Kinshasa.',
      services: services.length > 0 ? services : [name],
      active: true,
    };
    db.departments.push(dept);
    addAdminLog('Ajout Département / Catégorie', name);
    saveDatabase();
    res.status(201).json({ department: dept, departments: db.departments, logs: db.adminLogs });
  });

  app.patch('/api/admin/departments/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
    const db = getDb();
    const dept = db.departments.find((d) => d.id === req.params.id);
    if (!dept) {
      res.status(404).json({ error: 'Département introuvable.' });
      return;
    }
    dept.active = !dept.active;
    addAdminLog(dept.active ? 'Activation Département' : 'Désactivation Département', dept.name);
    saveDatabase();
    res.json({ department: dept, departments: db.departments, logs: db.adminLogs });
  });

  app.post('/api/admin/reports/:id/resolve', requireAuth, requireRole('ADMIN'), (req, res) => {
    const db = getDb();
    const report = db.reports.find((r) => r.id === req.params.id);
    if (!report) {
      res.status(404).json({ error: 'Signalement introuvable.' });
      return;
    }
    report.status = 'Résolu';
    if (req.body?.hideReview && report.targetType === 'review') {
      const rev = db.reviews.find((r) => r.id === report.targetId);
      if (rev) rev.hidden = true;
    }
    addAdminLog('Traitement Signalement', `${report.providerName} (${report.reason.slice(0, 40)})`);
    saveDatabase();
    res.json({ report, reports: db.reports, reviews: db.reviews, logs: db.adminLogs });
  });

  app.patch('/api/admin/reviews/:id/toggle', requireAuth, requireRole('ADMIN'), (req, res) => {
    const db = getDb();
    const rev = db.reviews.find((r) => r.id === req.params.id);
    if (!rev) {
      res.status(404).json({ error: 'Avis introuvable.' });
      return;
    }
    rev.hidden = !rev.hidden;
    addAdminLog(rev.hidden ? 'Masquage Avis' : 'Restauration Avis', `${rev.providerName} — ${rev.clientName}`);
    saveDatabase();
    res.json({ review: rev, reviews: db.reviews, logs: db.adminLogs });
  });

  app.patch('/api/admin/users/:id/suspend', requireAuth, requireRole('ADMIN'), (req, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.params.id);
    if (!user || user.role === 'ADMIN') {
      res.status(400).json({ error: 'Action impossible sur cet utilisateur.' });
      return;
    }
    user.suspended = !user.suspended;
    addAdminLog(user.suspended ? 'Suspension Compte Utilisateur' : 'Réactivation Compte Utilisateur', `${user.name} (${user.role})`);
    saveDatabase();
    res.json({ user: sanitizeUser(user), logs: db.adminLogs });
  });

  // Vite Dev Middleware ou Serveur Statique Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NAYOpro serveur actif sur http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Échec démarrage serveur NAYOpro:', err);
  process.exit(1);
});
