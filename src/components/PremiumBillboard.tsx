import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Megaphone,
  MessageCircle,
  ShoppingBag,
  Sparkles,
  Star,
} from 'lucide-react';
import { buildWhatsAppLink } from '../lib/api.ts';
import { MultiPrice, useCurrency } from '../lib/currency.tsx';
import type { BillboardAd, ExpertProfile, JobOffer, MaterialItem } from '../types.ts';
import { ExpertAvatar, MaterialVisual } from './BrandVisuals.tsx';

interface PremiumBillboardProps {
  materials: MaterialItem[];
  experts: ExpertProfile[];
  companies: ExpertProfile[];
  jobs: JobOffer[];
  billboardAds: BillboardAd[];
  onNavigateBlock: (block: 'market' | 'experts' | 'companies' | 'jobs') => void;
  onSelectExpert: (expert: ExpertProfile) => void;
  onOrderMaterial: (material: MaterialItem) => void;
}

type SlideItem =
  | { kind: 'market-top' }
  | { kind: 'experts-top3' }
  | { kind: 'companies-jobs' }
  | { kind: 'daily-free-expert'; expert: ExpertProfile }
  | { kind: 'paid-ad'; ad: BillboardAd; isSpecialOffer: boolean };

export const PremiumBillboard: React.FC<PremiumBillboardProps> = ({
  materials,
  experts,
  companies,
  jobs,
  billboardAds,
  onNavigateBlock,
  onSelectExpert,
  onOrderMaterial,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const { formatTriple } = useCurrency();

  // 1. Produits Marché les plus vendus : Sable, Ciment, Bois
  const topMaterials = useMemo(() => {
    const pick = (key: string) => materials.find((m) => m.visualKey === key);
    const chosen = [pick('sable'), pick('ciment'), pick('bois')].filter(Boolean) as MaterialItem[];
    return chosen.length > 0 ? chosen : materials.slice(0, 3);
  }, [materials]);

  // 2. Top 3 Experts avec meilleures notes
  const top3Experts = useMemo(() => {
    return [...experts]
      .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
      .slice(0, 3);
  }, [experts]);

  // 3. Choix NAYOpro du Jour (1 panneau gratuit automatique : 5 étoiles + plus d'avis)
  const bestDailyExpert = useMemo(() => {
    if (experts.length === 0) return null;
    const fiveStar = experts.filter((e) => e.rating >= 4.9);
    const pool = fiveStar.length > 0 ? fiveStar : experts;
    return [...pool].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)[0] || null;
  }, [experts]);

  // 4. Entreprises avec le plus d'offres
  const topCompaniesByJobs = useMemo(() => {
    return [...companies]
      .map((company) => ({
        company,
        offerCount: jobs.filter((j) => j.companyId === company.id).length,
      }))
      .sort((a, b) => b.offerCount - a.offerCount)
      .slice(0, 2);
  }, [companies, jobs]);

  const slides: SlideItem[] = useMemo(() => {
    const list: SlideItem[] = [];

    // Offres Spéciales / Pubs Premium validées par l'Admin en priorité
    billboardAds.forEach((ad, idx) => {
      list.push({
        kind: 'paid-ad',
        ad,
        isSpecialOffer: idx === 0 || /off?re sp[ée]ciale/i.test(ad.title),
      });
    });

    if (topMaterials.length > 0) list.push({ kind: 'market-top' });
    if (top3Experts.length > 0) list.push({ kind: 'experts-top3' });
    if (topCompaniesByJobs.length > 0) list.push({ kind: 'companies-jobs' });
    if (bestDailyExpert) list.push({ kind: 'daily-free-expert', expert: bestDailyExpert });

    return list;
  }, [billboardAds, topMaterials.length, top3Experts.length, topCompaniesByJobs.length, bestDailyExpert]);

  useEffect(() => {
    if (activeIndex >= slides.length) {
      setActiveIndex(0);
    }
  }, [slides.length, activeIndex]);

  // Défilement automatique toutes les 5 secondes
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [slides.length, isPaused]);

  if (slides.length === 0) return null;

  const currentSlide = slides[activeIndex] || slides[0];

  const goPrev = () => setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  const goNext = () => setActiveIndex((prev) => (prev + 1) % slides.length);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current !== null) {
      const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
      const diff = touchStartX.current - endX;
      if (Math.abs(diff) >= 40) {
        if (diff > 0) goNext();
        else goPrev();
      }
    }
    touchStartX.current = null;
    setIsPaused(false);
  };

  const findProviderForAd = (ad: BillboardAd) =>
    experts.find((e) => e.id === ad.providerId) || companies.find((c) => c.id === ad.providerId);

  return (
    <section
      aria-label="Miroir Publicitaire Panneau Premium NAYOpro"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="rounded-3xl bg-white border-2 border-[#00C2A8]/40 shadow-md overflow-hidden"
    >
      {/* En-tête Panneau Gombe */}
      <div className="bg-[#0A2A5E] text-white px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FFC107] text-[#0A2A5E] text-[10px] font-extrabold uppercase tracking-wide shrink-0">
            <Megaphone className="w-3 h-3" />
            Panneau Gombe
          </span>
          <span className="text-xs font-semibold text-slate-100 truncate">
            Miroir Publicitaire NAYOpro · Rotation 5s
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Panneau précédent"
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Panneau suivant"
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contenu du Slide actif */}
      <div className="p-4 sm:p-6 bg-gradient-to-br from-white via-[#F5F7FB] to-[#00C2A8]/5">
        {currentSlide.kind === 'market-top' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#00C2A8] uppercase tracking-wide">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Produits du Marché les plus vendus
                </span>
                <h2 className="font-display font-extrabold text-lg sm:text-xl text-[#0A2A5E]">
                  Sable, Ciment &amp; Bois — Livraison directe Kinshasa
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateBlock('market')}
                className="px-3.5 py-2 rounded-xl bg-[#0A2A5E] text-white text-xs font-bold hover:bg-[#0D3678]"
              >
                Voir tout
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {topMaterials.map((mat) => (
                <div
                  key={mat.id}
                  className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-16 shrink-0">
                      <MaterialVisual visualKey={mat.visualKey} name={mat.name} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-xs sm:text-sm text-slate-900 truncate">{mat.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{mat.commune}</p>
                      <MultiPrice amountCdf={mat.priceCdf} size="sm" className="mt-1" />
                    </div>
                  </div>
                  <a
                    href={buildWhatsAppLink(
                      `Bonjour NAYOpro (Panneau Premium), je commande : ${mat.name} (${formatTriple(mat.priceCdf)}).`,
                      mat.sellerPhone
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onOrderMaterial(mat)}
                    className="px-3 py-2 rounded-xl bg-[#00C2A8] text-[#0A2A5E] text-[11px] font-extrabold shrink-0 hover:bg-[#00d4b7]"
                  >
                    Commander
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentSlide.kind === 'experts-top3' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#FFC107] bg-[#0A2A5E] px-2.5 py-0.5 rounded-lg">
                  <Star className="w-3 h-3 fill-[#FFC107] text-[#FFC107]" />
                  Top 3 Experts les mieux notés
                </span>
                <h2 className="font-display font-extrabold text-lg sm:text-xl text-[#0A2A5E] mt-1">
                  Excellence &amp; Confiance 5 Étoiles à Kinshasa
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateBlock('experts')}
                className="px-3.5 py-2 rounded-xl bg-[#0A2A5E] text-white text-xs font-bold hover:bg-[#0D3678]"
              >
                Voir tout
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {top3Experts.map((exp) => (
                <button
                  key={exp.id}
                  type="button"
                  onClick={() => onSelectExpert(exp)}
                  className="text-left bg-white rounded-2xl border border-slate-200 hover:border-[#00C2A8] p-3.5 flex items-center gap-3 transition-colors"
                >
                  <ExpertAvatar name={exp.name} avatarKey={exp.avatarKey} size="md" />
                  <div className="min-w-0 flex-1">
                    <span className="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#FFC107]/25 text-[#0A2A5E]">
                      Top Expert
                    </span>
                    <p className="font-display font-bold text-sm text-slate-900 truncate mt-1">{exp.name}</p>
                    <p className="text-xs font-semibold text-[#00C2A8] truncate">{exp.profession}</p>
                    <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-[#00C2A8]" />
                        {exp.commune}
                      </span>
                      <span className="inline-flex items-center gap-0.5 font-mono-num font-bold text-[#0A2A5E] shrink-0">
                        <Star className="w-3 h-3 fill-[#FFC107] text-[#FFC107]" />
                        {exp.rating.toFixed(1)}
                      </span>
                    </div>
                    {exp.priceCdf && <MultiPrice amountCdf={exp.priceCdf} inline size="xs" className="mt-1" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentSlide.kind === 'companies-jobs' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#00C2A8] uppercase">
                  <Building2 className="w-3.5 h-3.5" />
                  Entreprises qui recrutent le plus
                </span>
                <h2 className="font-display font-extrabold text-lg sm:text-xl text-[#0A2A5E]">
                  Opportunités &amp; Offres Emploi / Stages à Kinshasa
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateBlock('companies')}
                className="px-3.5 py-2 rounded-xl bg-[#0A2A5E] text-white text-xs font-bold hover:bg-[#0D3678]"
              >
                Voir tout
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {topCompaniesByJobs.map(({ company, offerCount }) => (
                <div
                  key={company.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-[#0A2A5E] text-[#FFC107] font-display font-extrabold text-base flex items-center justify-center shrink-0">
                      {company.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-sm text-slate-900 truncate">{company.name}</p>
                      <p className="text-xs text-slate-500 truncate">{company.commune} · {company.profession}</p>
                      <p className="text-xs font-extrabold text-[#00C2A8] mt-0.5 font-mono-num">
                        {offerCount} offre(s) d’emploi &amp; stage active(s)
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateBlock('jobs')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#FFC107] text-[#0A2A5E] text-xs font-extrabold shrink-0 hover:bg-[#ffca2c]"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    Voir les offres
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentSlide.kind === 'daily-free-expert' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-[#FFC107] p-4 sm:p-5">
            <div className="flex items-center gap-4 min-w-0">
              <ExpertAvatar name={currentSlide.expert.name} avatarKey={currentSlide.expert.avatarKey} size="lg" />
              <div className="min-w-0 space-y-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#FFC107] text-[#0A2A5E] text-[11px] font-extrabold">
                  <Award className="w-3.5 h-3.5" />
                  Choix NAYOpro du Jour (Gratuit — 5★)
                </span>
                <h2 className="font-display font-extrabold text-lg sm:text-xl text-[#0A2A5E] truncate">
                  {currentSlide.expert.name}
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-[#00C2A8]">
                  {currentSlide.expert.profession} · {currentSlide.expert.commune}
                </p>
                <p className="text-xs text-slate-600 line-clamp-2">{currentSlide.expert.description}</p>
                <p className="text-xs font-mono-num font-bold text-[#0A2A5E] flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-[#FFC107] text-[#FFC107]" />
                  {currentSlide.expert.rating.toFixed(1)} / 5 ({currentSlide.expert.reviewCount} avis clients)
                </p>
                {currentSlide.expert.priceCdf && (
                  <MultiPrice amountCdf={currentSlide.expert.priceCdf} inline size="xs" />
                )}
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onSelectExpert(currentSlide.expert)}
                className="px-4 py-2.5 rounded-xl bg-[#00C2A8] text-[#0A2A5E] text-xs font-extrabold hover:bg-[#00d4b7]"
              >
                Voir le profil &amp; Devis
              </button>
              <button
                type="button"
                onClick={() => onNavigateBlock('experts')}
                className="px-4 py-2 rounded-xl bg-[#0A2A5E] text-white text-xs font-bold"
              >
                Voir tout
              </button>
            </div>
          </div>
        )}

        {currentSlide.kind === 'paid-ad' && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl border border-[#00C2A8]/50 p-4 sm:p-5">
            <div className="flex items-start gap-4 min-w-0 flex-1">
              {currentSlide.ad.photoDataUrl ? (
                <img
                  src={currentSlide.ad.photoDataUrl}
                  alt={currentSlide.ad.title}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border border-slate-200 shrink-0"
                />
              ) : currentSlide.ad.visualKey === 'ciment' ||
                currentSlide.ad.visualKey === 'sable' ||
                currentSlide.ad.visualKey === 'bois' ? (
                <div className="w-24 sm:w-28 shrink-0">
                  <MaterialVisual visualKey={currentSlide.ad.visualKey} name={currentSlide.ad.title} />
                </div>
              ) : (
                <ExpertAvatar
                  name={currentSlide.ad.providerName}
                  avatarKey={currentSlide.ad.visualKey || 'entreprise'}
                  size="lg"
                />
              )}

              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#0A2A5E] text-[#FFC107] text-[10px] font-extrabold uppercase">
                    <Sparkles className="w-3 h-3" />
                    {currentSlide.isSpecialOffer ? 'Offre Spéciale du Jour' : 'Panneau Premium NAYOpro'}
                  </span>
                  <span className="text-[11px] font-bold text-[#00C2A8]">
                    {currentSlide.ad.providerName} · {currentSlide.ad.providerCommune}
                  </span>
                </div>
                <h2 className="font-display font-extrabold text-base sm:text-xl text-[#0A2A5E] leading-snug">
                  {currentSlide.ad.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 line-clamp-2">{currentSlide.ad.description}</p>
                {(() => {
                  const targetProvider = findProviderForAd(currentSlide.ad);
                  if (targetProvider?.priceCdf) {
                    return <MultiPrice amountCdf={targetProvider.priceCdf} inline size="xs" />;
                  }
                  return null;
                })()}
              </div>
            </div>

            <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const target = findProviderForAd(currentSlide.ad);
                  if (target) onSelectExpert(target);
                  else onNavigateBlock(currentSlide.ad.targetBlock);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00C2A8] text-[#0A2A5E] text-xs font-extrabold hover:bg-[#00d4b7]"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Profiter de l’offre
              </button>
              <button
                type="button"
                onClick={() => onNavigateBlock(currentSlide.ad.targetBlock)}
                className="px-4 py-2 rounded-xl bg-[#0A2A5E] text-white text-xs font-bold"
              >
                Voir tout
              </button>
            </div>
          </div>
        )}

        {/* Petits points en bas pour montrer la position */}
        <div className="mt-4 flex items-center justify-center gap-2" role="tablist" aria-label="Navigation panneau">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={`Afficher panneau ${idx + 1}`}
              aria-selected={idx === activeIndex}
              className={`h-2.5 rounded-full transition-all ${
                idx === activeIndex ? 'w-7 bg-[#0A2A5E]' : 'w-2.5 bg-slate-300 hover:bg-[#00C2A8]'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
