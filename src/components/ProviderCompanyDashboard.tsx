import React, { useEffect, useState } from 'react';
import {
  BadgeCheck,
  Briefcase,
  Check,
  Clock,
  CreditCard,
  Eye,
  FileText,
  LogOut,
  Megaphone,
  MessageCircle,
  Plus,
  ShoppingBag,
  Star,
  Upload,
  X,
} from 'lucide-react';
import { AD_PRICING, BRAND_INFO, KINSHASA_COMMUNES } from '../data/kinshasaData.ts';
import { api, buildWhatsAppLink } from '../lib/api.ts';
import {
  MultiPrice,
  formatPriceInCurrency,
  formatSingleCurrency,
  getOperatorsForCurrency,
  useCurrency,
} from '../lib/currency.tsx';
import type {
  AdPlanDays,
  BillboardAd,
  CurrencyCode,
  ExpertProfile,
  JobApplication,
  JobOffer,
  MaterialItem,
  MaterialVisualKey,
  PaymentOperator,
  QuoteRequest,
  Review,
  SubscriptionPayment,
  UserAccount,
} from '../types.ts';

interface ProviderCompanyDashboardProps {
  currentUser: UserAccount;
  onOpenSubscription: () => void;
  onViewPublicProfile: (provider: ExpertProfile) => void;
  onOpenJobsPublish: () => void;
  onDataChanged: () => void;
  onLogout: () => void;
}

export const ProviderCompanyDashboard: React.FC<ProviderCompanyDashboardProps> = ({
  currentUser,
  onOpenSubscription,
  onViewPublicProfile,
  onOpenJobsPublish,
  onDataChanged,
  onLogout,
}) => {
  const [provider, setProvider] = useState<ExpertProfile | null>(null);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [products, setProducts] = useState<MaterialItem[]>([]);
  const [ads, setAds] = useState<BillboardAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewCvApp, setPreviewCvApp] = useState<JobApplication | null>(null);

  const [newOfferText, setNewOfferText] = useState('');

  // Formulaire "Publier ma Pub" (Miroir Publicitaire / Panneau Premium séparé)
  const { currency: globalCurrency, formatTriple, rates } = useCurrency();
  const [showAdForm, setShowAdForm] = useState(false);
  const [adTitle, setAdTitle] = useState('');
  const [adDesc, setAdDesc] = useState('');
  const [adDuration, setAdDuration] = useState<AdPlanDays>(7);
  const [adCurrency, setAdCurrency] = useState<CurrencyCode>(globalCurrency);
  const [adOperator, setAdOperator] = useState<PaymentOperator>(getOperatorsForCurrency(globalCurrency)[0]);
  const [adTxRef, setAdTxRef] = useState('');
  const [adPhotoDataUrl, setAdPhotoDataUrl] = useState<string | undefined>(undefined);
  const [adPhotoName, setAdPhotoName] = useState('');
  const [adProofName, setAdProofName] = useState('');
  const [adProofDataUrl, setAdProofDataUrl] = useState<string | undefined>(undefined);
  const [adSubmitting, setAdSubmitting] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);
  const [adSuccess, setAdSuccess] = useState<string | null>(null);

  const handleSelectAdCurrency = (next: CurrencyCode) => {
    setAdCurrency(next);
    const ops = getOperatorsForCurrency(next);
    if (!ops.includes(adOperator)) {
      setAdOperator(ops[0]);
    }
  };

  // Publication produit Marché (Vendeur ou Entreprise ACTIF)
  const [prodName, setProdName] = useState('');
  const [prodUnit, setProdUnit] = useState('Sac 50 kg');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCommune, setProdCommune] = useState(currentUser.commune || 'Gombe');
  const [prodVisual, setProdVisual] = useState<MaterialVisualKey>('ciment');
  const [prodDesc, setProdDesc] = useState('');
  const [prodError, setProdError] = useState<string | null>(null);

  const loadDashboard = () => {
    setLoading(true);
    api
      .getProviderDashboard()
      .then((res) => {
        setProvider(res.provider);
        setQuotes(res.quotes);
        setReviews(res.reviews);
        setPayments(res.payments);
        setJobs(res.jobs);
        setApplications(res.applications);
        setProducts(res.products);
        setAds(res.ads || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, [currentUser.id]);

  const handleToggleAvailability = async () => {
    if (!provider) return;
    const next = provider.availability === 'Disponible' ? 'Occupé' : 'Disponible';
    const res = await api.updateAvailability(next);
    setProvider(res.provider);
  };

  const handleQuoteStatus = async (q: QuoteRequest, status: 'Acceptée' | 'Terminée' | 'Refusée') => {
    const revenue = status === 'Terminée' ? provider?.priceCdf || 50000 : undefined;
    const res = await api.updateQuoteStatus(q.id, status, revenue);
    setQuotes((prev) => prev.map((item) => (item.id === q.id ? res.quote : item)));
    setProvider(res.provider);
  };

  const handleApplicationDecision = async (appId: string, status: 'Acceptée' | 'Refusée') => {
    const res = await api.updateApplicationStatus(appId, status);
    setApplications((prev) => prev.map((a) => (a.id === appId ? res.application : a)));
  };

  const handleAddCommercialOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !newOfferText.trim()) return;
    const updatedOffers = [...(provider.commercialOffers || []), newOfferText.trim()];
    const res = await api.updateProviderProfile({ commercialOffers: updatedOffers });
    setProvider(res.provider);
    setNewOfferText('');
  };

  const handlePublishProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdError(null);
    try {
      const res = await api.createSellerProduct({
        name: prodName,
        unit: prodUnit,
        priceCdf: Number(prodPrice),
        commune: prodCommune,
        visualKey: prodVisual,
        description: prodDesc,
      });
      setProducts((prev) => [res.material, ...prev]);
      setProdName('');
      setProdPrice('');
      setProdDesc('');
      onDataChanged();
    } catch (err) {
      setProdError(err instanceof Error ? err.message : 'Erreur publication produit.');
    }
  };

  const handleReadFile = (file: File, cb: (dataUrl: string, name: string) => void) => {
    if (file.size > 1_800_000) {
      setAdError('Image trop volumineuse (maximum 1,8 Mo).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') cb(reader.result, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdError(null);
    setAdSuccess(null);
    setAdSubmitting(true);
    try {
      const res = await api.submitAdRequest({
        title: adTitle,
        description: adDesc,
        durationDays: adDuration,
        currency: adCurrency,
        operator: adOperator,
        transactionRef: adTxRef,
        photoDataUrl: adPhotoDataUrl,
        proofImageName: adProofName,
        proofDataUrl: adProofDataUrl,
      });
      setAds((prev) => [res.ad, ...prev]);
      setAdSuccess(res.message);
      setAdTitle('');
      setAdDesc('');
      setAdTxRef('');
      setAdPhotoDataUrl(undefined);
      setAdPhotoName('');
      setAdProofDataUrl(undefined);
      setAdProofName('');
      onDataChanged();
    } catch (err) {
      setAdError(err instanceof Error ? err.message : 'Erreur envoi publicité.');
    } finally {
      setAdSubmitting(false);
    }
  };

  if (loading || !provider) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 text-sm text-slate-500">
        Chargement de votre tableau de bord...
      </div>
    );
  }

  const isActive = provider.subscriptionStatus === 'ACTIF';
  const canSellInMarket = provider.accountCategory === 'VENDEUR' || provider.accountCategory === 'ENTREPRISE';
  const daysRemaining =
    isActive && provider.subscriptionEndAt
      ? Math.max(0, Math.ceil((Date.parse(provider.subscriptionEndAt) - Date.now()) / 86400000))
      : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#00C2A8]">
            Tableau de Bord {provider.accountCategory} · {provider.commune}
          </p>
          <h1 className="font-display font-extrabold text-2xl text-[#0A2A5E] mt-0.5">{provider.name}</h1>
          <p className="text-sm text-slate-600">{provider.profession}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleToggleAvailability}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold min-h-[42px] ${
              provider.availability === 'Disponible'
                ? 'bg-[#00C2A8]/15 text-[#0A2A5E]'
                : 'bg-amber-100 text-amber-900'
            }`}
          >
            Disponibilité : {provider.availability}
          </button>

          {isActive && (
            <button
              type="button"
              onClick={() => onViewPublicProfile(provider)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0A2A5E] text-white text-xs font-bold min-h-[42px]"
            >
              <Eye className="w-4 h-4 text-[#00C2A8]" />
              Voir mon profil public
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 min-h-[42px]"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </div>

      {/* Statut Abonnement */}
      <div
        className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isActive
            ? 'bg-[#00C2A8]/10 border-[#00C2A8]/40 text-[#0A2A5E]'
            : 'bg-amber-50 border-amber-200 text-amber-950'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-display font-bold text-base">
            {isActive ? <BadgeCheck className="w-5 h-5 text-[#00C2A8]" /> : <Clock className="w-5 h-5 text-amber-700" />}
            <span>Statut Abonnement : {provider.subscriptionStatus}</span>
          </div>
          {isActive ? (
            <p className="text-xs">
              Votre profil est <strong>VISIBLE</strong> aux clients de Kinshasa ·{' '}
              <strong className="font-mono-num">{daysRemaining} jour(s) restant(s)</strong> (jusqu’au{' '}
              {provider.subscriptionEndAt ? new Date(provider.subscriptionEndAt).toLocaleDateString('fr-FR') : '-'}).
            </p>
          ) : (
            <p className="text-xs leading-relaxed">
              Votre compte et vos produits sont actuellement <strong>INVISIBLES</strong> tant que l’Administrateur NAYOpro n’a pas validé votre abonnement 1 mois.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenSubscription}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#0A2A5E] text-white text-xs font-bold whitespace-nowrap"
          >
            <CreditCard className="w-4 h-4 text-[#FFC107]" />
            {isActive ? 'Abonnement Visibilité (Actif)' : 'Payer Visibilité 1 Mois'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAdForm(true);
              setAdSuccess(null);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#FFC107] text-[#0A2A5E] text-xs font-extrabold whitespace-nowrap hover:bg-[#ffca2c]"
          >
            <Megaphone className="w-4 h-4" />
            Mettre ma Pub sur le Panneau
          </button>
        </div>
      </div>

      {/* MODULE SÉPARÉ : PUBLICITÉ / PANNEAU PREMIUM */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-base sm:text-lg text-[#0A2A5E] flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[#FFC107]" />
              Publicité Panneau Premium NAYOpro (Revenu séparé)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Pub Panneau 7 Jours : <strong>{formatTriple(AD_PRICING[7])}</strong> · Pub Panneau 30 Jours :{' '}
              <strong>{formatTriple(AD_PRICING[30])}</strong>. Nécessite aussi la Visibilité active pour apparaître sur l’Accueil.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdForm((v) => !v)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00C2A8] text-[#0A2A5E] text-xs font-extrabold whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            {showAdForm ? 'Fermer le formulaire Pub' : 'Publier ma Pub'}
          </button>
        </div>

        {!isActive && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
            Rappel : pour apparaître sur le Panneau de l’Accueil, votre <strong>Visibilité 1 mois</strong> doit aussi être <strong>ACTIF</strong> (en plus de la Pub validée par l’Admin).
          </div>
        )}

        {adSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900">
            {adSuccess}
          </div>
        )}

        {showAdForm && (
          <form onSubmit={handleSubmitAd} className="p-4 sm:p-5 rounded-2xl bg-[#F5F7FB] border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-[#0A2A5E]">
                Page « Publier ma Pub » — Panneau Publicitaire Gombe / Accueil
              </h3>
              <button type="button" onClick={() => setShowAdForm(false)} className="text-slate-500 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            {adError && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-bold">{adError}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Titre de la pub *</label>
                <input
                  type="text"
                  required
                  value={adTitle}
                  onChange={(e) => setAdTitle(e.target.value)}
                  placeholder="Ex. Promo Dépannage Plomberie Express Bandal -20%"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Photo de votre offre / produit</label>
                <label className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 bg-white text-xs cursor-pointer hover:border-[#00C2A8]">
                  <span className="truncate text-slate-600">{adPhotoName || 'Choisir une photo (PNG/JPG)'}</span>
                  <Upload className="w-4 h-4 text-[#00C2A8] shrink-0" />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleReadFile(file, (url, n) => {
                          setAdPhotoDataUrl(url);
                          setAdPhotoName(n);
                        });
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description courte *</label>
              <textarea
                rows={2}
                required
                value={adDesc}
                onChange={(e) => setAdDesc(e.target.value)}
                placeholder="Décrivez votre promotion ou service vedette en 1 à 2 phrases..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Choix de durée Panneau Premium</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {([7, 30] as const).map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setAdDuration(days)}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        adDuration === days
                          ? 'border-[#0A2A5E] bg-[#0A2A5E] text-white'
                          : 'border-slate-300 bg-white text-slate-800'
                      }`}
                    >
                      <p className="text-xs font-bold">Pub {days} Jours</p>
                      <MultiPrice
                        amountCdf={AD_PRICING[days]}
                        size="sm"
                        inverted={adDuration === days}
                        className="mt-1"
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Devise de paiement</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { code: 'CDF' as const, label: 'Je paie en CDF' },
                      { code: 'USD' as const, label: 'Je paie en $' },
                      { code: 'EUR' as const, label: 'Je paie en €' },
                    ]
                  ).map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => handleSelectAdCurrency(item.code)}
                      className={`py-2.5 px-2 rounded-xl border text-xs font-extrabold ${
                        adCurrency === item.code
                          ? 'border-[#FFC107] bg-[#FFC107] text-[#0A2A5E]'
                          : 'border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {adCurrency === 'EUR'
                    ? `Moyen de paiement en € (${BRAND_INFO.email})`
                    : `Paiement Mobile Money (${BRAND_INFO.phoneDisplay})`}
                </label>
                <div className={`grid gap-2 ${getOperatorsForCurrency(adCurrency).length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                  {getOperatorsForCurrency(adCurrency).map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setAdOperator(op)}
                      className={`py-2.5 px-2 rounded-xl border text-xs font-bold ${
                        adOperator === op
                          ? 'border-[#00C2A8] bg-[#00C2A8]/20 text-[#0A2A5E]'
                          : 'border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Numéro / Référence transaction *</label>
                <input
                  type="text"
                  required
                  value={adTxRef}
                  onChange={(e) => setAdTxRef(e.target.value)}
                  placeholder="Ex. MP261124.1210.A901"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono-num bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Capture de paiement (facultatif)</label>
                <label className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 bg-white text-xs cursor-pointer hover:border-[#00C2A8]">
                  <span className="truncate text-slate-600">{adProofName || 'Joindre capture reçu'}</span>
                  <Upload className="w-4 h-4 text-[#00C2A8] shrink-0" />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleReadFile(file, (url, n) => {
                          setAdProofDataUrl(url);
                          setAdProofName(n);
                        });
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={adSubmitting}
              className="w-full min-h-[46px] rounded-xl bg-[#0A2A5E] text-white text-sm font-extrabold hover:bg-[#0D3678]"
            >
              {adSubmitting
                ? 'Envoi en cours...'
                : `J'ai payé ${formatPriceInCurrency(AD_PRICING[adDuration], adCurrency, rates)} (${adOperator}) - Envoyer ma preuve`}
            </button>
          </form>
        )}

        {ads.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {ads.map((ad) => (
              <div key={ad.id} className="rounded-xl border border-slate-200 p-3.5 text-xs flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 truncate">{ad.title}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                        ad.status === 'ACTIVE'
                          ? 'bg-[#00C2A8]/20 text-[#0A2A5E]'
                          : ad.status === 'EN ATTENTE'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {ad.status}
                    </span>
                  </div>
                  <p className="text-slate-500">
                    Pub {ad.durationDays} jours · A payé{' '}
                    <strong>{formatSingleCurrency(ad.paidAmount ?? ad.amountCdf, ad.currency ?? 'CDF')}</strong> par{' '}
                    {ad.operator} #{ad.transactionRef}
                  </p>
                  <p className="text-[11px] font-mono-num text-slate-500">{formatTriple(ad.amountCdf)}</p>
                  {ad.endAt && (
                    <p className="text-[11px] font-mono-num text-[#0A2A5E]">
                      Fin : {new Date(ad.endAt).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Nombre de vues</p>
          <p className="font-mono-num font-extrabold text-2xl text-[#0A2A5E] mt-1">{provider.viewsCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Nombre de demandes</p>
          <p className="font-mono-num font-extrabold text-2xl text-[#0A2A5E] mt-1">{provider.requestsCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Mes revenus (0% comm.)</p>
          <MultiPrice amountCdf={provider.declaredRevenueCdf} size="md" className="mt-1" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Mes avis</p>
          <p className="font-mono-num font-extrabold text-2xl text-[#0A2A5E] mt-1 flex items-center gap-1.5">
            <span>{provider.rating > 0 ? provider.rating.toFixed(1) : '—'}</span>
            <Star className="w-5 h-5 fill-[#FFC107] text-[#FFC107]" />
            <span className="text-xs font-normal text-slate-500">({reviews.length})</span>
          </p>
        </div>
      </div>

      {/* BLOC VENDEUR / ENTREPRISE : PUBLIER DES PRODUITS DANS LE MARCHÉ */}
      {canSellInMarket && (
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display font-bold text-lg text-[#0A2A5E] flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#00C2A8]" />
                Mes Produits dans le Marché NAYOpro ({products.length})
              </h2>
              <p className="text-xs text-slate-500">
                Seuls les vendeurs/entreprises avec abonnement ACTIF peuvent publier et apparaître dans le Marché.
              </p>
            </div>
          </div>

          {products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {products.map((m) => (
                <div key={m.id} className="rounded-xl border border-slate-200 p-3 text-xs">
                  <p className="font-bold text-slate-900">{m.name}</p>
                  <p className="text-slate-500">
                    {m.commune} · {m.unit}
                  </p>
                  <MultiPrice amountCdf={m.priceCdf} size="xs" className="mt-1" />
                </div>
              ))}
            </div>
          )}

          {isActive ? (
            <form onSubmit={handlePublishProduct} className="pt-3 border-t border-slate-100 space-y-3">
              <h3 className="font-display font-bold text-sm text-[#0A2A5E]">Publier un nouveau produit dans le Marché</h3>
              {prodError && <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-bold">{prodError}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Nom (ex. Ciment 42.5, Fer Ø12)"
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  required
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  placeholder="Prix en CDF (ex. 32500)"
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono-num"
                />
                <input
                  type="text"
                  value={prodUnit}
                  onChange={(e) => setProdUnit(e.target.value)}
                  placeholder="Unité (ex. Sac 50kg, Camion 10T)"
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <select
                  value={prodVisual}
                  onChange={(e) => setProdVisual(e.target.value as MaterialVisualKey)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="sable">Sable</option>
                  <option value="ciment">Ciment</option>
                  <option value="caillasse">Caillasse</option>
                  <option value="bois">Bois</option>
                  <option value="toles">Tôles</option>
                  <option value="fer">Fer</option>
                  <option value="gravier">Gravier</option>
                  <option value="briques">Briques</option>
                  <option value="peinture">Peinture</option>
                  <option value="carrelage">Carrelage</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={prodCommune}
                  onChange={(e) => setProdCommune(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  {KINSHASA_COMMUNES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Description courte du produit..."
                  className="sm:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00C2A8] text-[#0A2A5E] text-xs font-extrabold"
              >
                <Plus className="w-4 h-4" />
                Publier dans le Marché
              </button>
            </form>
          ) : (
            <p className="text-xs text-amber-800">
              Activez votre abonnement 1 mois pour publier de nouveaux produits dans le Marché.
            </p>
          )}
        </section>
      )}

      {/* Demandes Clients Reçues */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-display font-bold text-lg text-[#0A2A5E]">Demandes Clients Reçues ({quotes.length})</h2>
        {!isActive ? (
          <p className="text-xs text-slate-500">
            Les demandes clients seront débloquées dès l’activation de votre abonnement par l’Admin NAYOpro.
          </p>
        ) : quotes.length === 0 ? (
          <p className="text-xs text-slate-500">Aucune demande de devis reçue pour l’instant.</p>
        ) : (
          <div className="space-y-3">
            {quotes.map((q) => (
              <div key={q.id} className="rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-display font-bold text-sm text-slate-900">
                    {q.service} · <span className="text-[#0A2A5E]">{q.clientName}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {q.commune} ({q.address}) · Date souhaitée : {q.desiredDate} · Budget : {q.budgetCdf}
                  </p>
                  <p className="text-xs text-slate-700">{q.details}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-[#0A2A5E]">{q.status}</span>
                  {q.status === 'En attente' && (
                    <button
                      type="button"
                      onClick={() => void handleQuoteStatus(q, 'Acceptée')}
                      className="px-3 py-1.5 rounded-lg bg-[#00C2A8] text-[#0A2A5E] text-xs font-bold"
                    >
                      Accepter
                    </button>
                  )}
                  {q.status === 'Acceptée' && (
                    <button
                      type="button"
                      onClick={() => void handleQuoteStatus(q, 'Terminée')}
                      className="px-3 py-1.5 rounded-lg bg-[#0A2A5E] text-white text-xs font-bold"
                    >
                      Marquer Terminée
                    </button>
                  )}
                  <a
                    href={buildWhatsAppLink(`Bonjour ${q.clientName}, suite à votre demande sur NAYOpro (${q.service})...`, q.clientPhone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-[#0A2A5E]"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#00C2A8]" />
                    WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION SPÉCIFIQUE ENTREPRISE : Offres commerciales + Emploi & Suivi Candidatures */}
      {provider.accountType === 'ENTREPRISE' && (
        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h2 className="font-display font-bold text-lg text-[#0A2A5E]">Offres Commerciales de l’Entreprise</h2>
            <ul className="space-y-2">
              {(provider.commercialOffers || []).map((o, idx) => (
                <li key={idx} className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  {o}
                </li>
              ))}
            </ul>
            <form onSubmit={handleAddCommercialOffer} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newOfferText}
                onChange={(e) => setNewOfferText(e.target.value)}
                placeholder="Ex. Promo fin de mois : -10% sur livraison ciment Gombe/Limete"
                className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#0A2A5E] text-white text-xs font-bold whitespace-nowrap">
                Publier l’offre commerciale
              </button>
            </form>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display font-bold text-lg text-[#0A2A5E]">
                  Offres d’Emploi &amp; Suivi des Candidats ({applications.length})
                </h2>
                <p className="text-xs text-slate-500">Offres publiées : {jobs.length}</p>
              </div>
              <button
                type="button"
                onClick={onOpenJobsPublish}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00C2A8] text-[#0A2A5E] text-xs font-extrabold"
              >
                <Briefcase className="w-4 h-4" />
                Publier une Offre d’Emploi / Stage
              </button>
            </div>

            {applications.length === 0 ? (
              <p className="text-xs text-slate-500">Aucune candidature reçue pour le moment.</p>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="rounded-xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <p className="font-display font-bold text-sm text-slate-900">
                        {app.fullName} · <span className="text-[#0A2A5E]">{app.jobTitle}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {app.commune} · {new Date(app.createdAt).toLocaleDateString('fr-FR')} · Statut :{' '}
                        <strong>{app.status}</strong>
                      </p>
                      <p className="text-xs text-slate-700">Compétences : {app.skills}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewCvApp(app)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-[#0A2A5E]"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Voir CV
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleApplicationDecision(app.id, 'Acceptée')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00C2A8] text-[#0A2A5E] text-xs font-bold"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Accepter
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleApplicationDecision(app.id, 'Refusée')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-bold"
                      >
                        <X className="w-3.5 h-3.5" />
                        Refuser
                      </button>
                      <a
                        href={buildWhatsAppLink(
                          `Bonjour ${app.fullName}, suite à votre candidature pour "${app.jobTitle}" sur NAYOpro...`,
                          app.whatsapp
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0A2A5E] text-white text-xs font-bold"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-[#00C2A8]" />
                        Contacter sur WhatsApp
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Mes Paiements & Avis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h2 className="font-display font-bold text-base text-[#0A2A5E]">Historique Paiements Abonnement ({payments.length})</h2>
          {payments.length === 0 ? (
            <p className="text-xs text-slate-500">Aucun paiement soumis pour l’instant.</p>
          ) : (
            payments.map((pay) => (
              <div key={pay.id} className="rounded-xl border border-slate-200 p-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900">
                    {pay.operator} · {pay.transactionRef}
                  </p>
                  <p className="text-slate-500 font-mono-num">
                    Reçu {pay.receiptCode} · {new Date(pay.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono-num font-bold text-[#0A2A5E]">
                    A payé {formatSingleCurrency(pay.paidAmount ?? pay.amountCdf, pay.currency ?? 'CDF')}
                  </p>
                  <p className="text-[11px] font-mono-num text-slate-500">{formatTriple(pay.amountCdf)}</p>
                  <p className="font-semibold text-[#00C2A8]">{pay.status}</p>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h2 className="font-display font-bold text-base text-[#0A2A5E]">Mes Avis Clients ({reviews.length})</h2>
          {reviews.length === 0 ? (
            <p className="text-xs text-slate-500">Aucun avis client pour le moment.</p>
          ) : (
            reviews.map((rev) => (
              <div key={rev.id} className="rounded-xl border border-slate-200 p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{rev.clientName}</span>
                  <span className="font-mono-num font-bold text-[#0A2A5E]">{rev.rating}/5 ★</span>
                </div>
                <p className="text-slate-600">{rev.comment}</p>
              </div>
            ))
          )}
        </section>
      </div>

      {/* Modal Aperçu CV Candidat */}
      {previewCvApp && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-[#0A2A5E]">Dossier Candidat — {previewCvApp.fullName}</h3>
              <button type="button" onClick={() => setPreviewCvApp(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs space-y-2 text-slate-700">
              <p><strong>Poste :</strong> {previewCvApp.jobTitle}</p>
              <p><strong>Commune :</strong> {previewCvApp.commune}</p>
              <p><strong>Email :</strong> {previewCvApp.email}</p>
              <p><strong>WhatsApp :</strong> {previewCvApp.whatsapp}</p>
              <p><strong>Compétences :</strong> {previewCvApp.skills}</p>
              <p><strong>Présentation :</strong> {previewCvApp.presentation}</p>
              <p><strong>Fichier CV :</strong> {previewCvApp.cvFileName || 'Aucun fichier joint'}</p>
            </div>
            {previewCvApp.cvDataUrl && previewCvApp.cvDataUrl.startsWith('data:image/') && (
              <img src={previewCvApp.cvDataUrl} alt="CV Candidat" className="max-h-60 rounded-xl border border-slate-200 object-contain" />
            )}
            {previewCvApp.cvDataUrl && previewCvApp.cvDataUrl.startsWith('data:application/pdf') && (
              <a
                href={previewCvApp.cvDataUrl}
                download={previewCvApp.cvFileName || 'cv-candidat.pdf'}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A2A5E] text-white text-xs font-bold"
              >
                Télécharger le CV PDF
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
