import React, { useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  MapPin,
  MessageCircle,
  Search,
  ShoppingBag,
  Star,
  Wrench,
} from 'lucide-react';
import { BRAND_INFO } from '../data/kinshasaData.ts';
import { buildWhatsAppLink } from '../lib/api.ts';
import { CurrencySelector, MultiPrice, extractCdfFromLabel, useCurrency } from '../lib/currency.tsx';
import type { BillboardAd, DepartmentItem, ExpertProfile, JobOffer, MaterialItem } from '../types.ts';
import { DepartmentIcon, ExpertAvatar, MaterialVisual } from './BrandVisuals.tsx';
import { PremiumBillboard } from './PremiumBillboard.tsx';

interface HomeViewProps {
  departments: DepartmentItem[];
  experts: ExpertProfile[];
  companies: ExpertProfile[];
  materials: MaterialItem[];
  jobs: JobOffer[];
  billboardAds: BillboardAd[];
  onSearchSubmit: (query: string, target: 'market' | 'experts' | 'jobs', departmentId?: string) => void;
  onNavigateBlock: (block: 'market' | 'experts' | 'companies' | 'jobs') => void;
  onStartExpertMode: () => void;
  onSelectExpert: (expert: ExpertProfile) => void;
  onOrderMaterial: (material: MaterialItem) => void;
  onOpenJob: (job: JobOffer) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  departments,
  experts,
  companies,
  materials,
  jobs,
  billboardAds,
  onSearchSubmit,
  onNavigateBlock,
  onStartExpertMode,
  onSelectExpert,
  onOrderMaterial,
  onOpenJob,
}) => {
  const [query, setQuery] = useState('');
  const { formatTriple } = useCurrency();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (/sable|ciment|caillasse|bois|t[ôo]le|fer|gravier|brique|peinture|carrelage/i.test(q)) {
      onSearchSubmit(q, 'market');
      return;
    }
    if (/emploi|stage|vendeuse|caissi[eè]re|chauffeur|comptable|d[eé]veloppeur|marketing/i.test(q)) {
      onSearchSubmit(q, 'jobs');
      return;
    }
    onSearchSubmit(q, 'experts');
  };

  const featuredMaterials = materials.slice(0, 4);
  const popularExperts = experts.slice(0, 4);
  const recentJobs = jobs.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-5 lg:py-8 space-y-10">
      {/* HERO & RECHERCHE + 2 MODES */}
      <section className="rounded-3xl bg-[#0A2A5E] text-white p-5 sm:p-8 lg:p-10 shadow-sm relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-[#00C2A8]/15 pointer-events-none" aria-hidden="true" />
        <div className="absolute -left-16 -bottom-24 w-56 h-56 rounded-full bg-[#FFC107]/10 pointer-events-none" aria-hidden="true" />

        <div className="relative z-10 max-w-3xl">
          <p className="text-xs sm:text-sm font-semibold text-[#00C2A8]">
            {BRAND_INFO.name} · {BRAND_INFO.slogan} · {BRAND_INFO.city}
          </p>
          <h1 className="font-display font-extrabold text-2xl sm:text-4xl lg:text-[42px] leading-tight mt-2 text-balance">
            4 Espaces dédiés pour construire, travailler et recruter à Kinshasa
          </h1>
          <p className="text-sm sm:text-base text-slate-200 mt-3 max-w-2xl leading-relaxed">
            Client 100% gratuit. Zéro commission sur les prestations. Accédez au Marché, aux Experts, aux Entreprises ou aux offres Emploi &amp; Stages.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col sm:flex-row sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Que cherchez-vous ? Plombier, Sable, Terrain, Emploi..."
                aria-label="Que cherchez-vous ? Plombier, Sable, Terrain, Emploi"
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#00C2A8]"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <CurrencySelector dark />
              <button
                type="submit"
                className="h-12 px-6 rounded-xl bg-[#00C2A8] text-[#0A2A5E] font-bold text-sm hover:bg-[#00d6ba] transition-colors whitespace-nowrap shrink-0 flex-1 sm:flex-initial"
              >
                Rechercher
              </button>
            </div>
          </form>

          {/* 2 GROS BOUTONS CENTRAUX */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <button
              type="button"
              onClick={() => onNavigateBlock('experts')}
              className="min-h-[56px] px-5 py-3.5 rounded-2xl bg-[#00C2A8] text-[#0A2A5E] font-display font-extrabold text-sm sm:text-base flex items-center justify-between gap-3 hover:bg-[#00d4b7] active:scale-[0.99] transition-all shadow-sm"
            >
              <span className="flex items-center gap-2.5 text-left">
                <Search className="w-5 h-5 shrink-0" />
                <span>JE CHERCHE UN EXPERT</span>
              </span>
              <ArrowRight className="w-5 h-5 shrink-0" />
            </button>

            <button
              type="button"
              onClick={onStartExpertMode}
              className="min-h-[56px] px-5 py-3.5 rounded-2xl bg-[#FFC107] text-[#0A2A5E] font-display font-extrabold text-sm sm:text-base flex items-center justify-between gap-3 hover:bg-[#ffca2c] active:scale-[0.99] transition-all shadow-sm"
            >
              <span className="flex items-center gap-2.5 text-left">
                <Wrench className="w-5 h-5 shrink-0" />
                <span>JE SUIS EXPERT, JE VEUX GAGNER</span>
              </span>
              <ArrowRight className="w-5 h-5 shrink-0" />
            </button>
          </div>
        </div>
      </section>

      {/* PANNEAU MIROIR PUBLICITAIRE PREMIUM NAYOpro (JUSTE EN DESSOUS DE LA BARRE DE RECHERCHE) */}
      <PremiumBillboard
        materials={materials}
        experts={experts}
        companies={companies}
        jobs={jobs}
        billboardAds={billboardAds}
        onNavigateBlock={onNavigateBlock}
        onSelectExpert={onSelectExpert}
        onOrderMaterial={onOrderMaterial}
      />

      {/* LES 4 BLOCS SÉPARÉS */}
      <section aria-labelledby="blocks-heading">
        <h2 id="blocks-heading" className="font-display font-bold text-lg sm:text-xl text-[#0A2A5E] mb-4">
          Explorez nos 4 Espaces Séparés
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => onNavigateBlock('market')}
            className="text-left p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#00C2A8] transition-colors flex flex-col justify-between gap-3"
          >
            <span className="w-11 h-11 rounded-xl bg-[#00C2A8]/15 text-[#0A2A5E] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-display font-bold text-base text-[#0A2A5E]">1. Marché NAYOpro</h3>
              <p className="text-xs text-slate-600 mt-1">
                Sable, Ciment, Caillasse, Bois, Tôles, Fer, Gravier, Briques, Peinture, Carrelage ({materials.length} produits).
              </p>
            </div>
            <span className="text-xs font-bold text-[#00C2A8]">Ouvrir le Marché →</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateBlock('experts')}
            className="text-left p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#00C2A8] transition-colors flex flex-col justify-between gap-3"
          >
            <span className="w-11 h-11 rounded-xl bg-[#0A2A5E]/10 text-[#0A2A5E] flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-display font-bold text-base text-[#0A2A5E]">2. Experts ({departments.length} départements)</h3>
              <p className="text-xs text-slate-600 mt-1">
                Savoir-faire vérifiés à Kinshasa : Bâtiment, Engins, Immobilier, Auto, Santé, Énergie, Beauté...
              </p>
            </div>
            <span className="text-xs font-bold text-[#00C2A8]">Trouver un Expert →</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateBlock('companies')}
            className="text-left p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#00C2A8] transition-colors flex flex-col justify-between gap-3"
          >
            <span className="w-11 h-11 rounded-xl bg-[#FFC107]/25 text-[#0A2A5E] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-display font-bold text-base text-[#0A2A5E]">3. Entreprises ({companies.length})</h3>
              <p className="text-xs text-slate-600 mt-1">
                Sociétés certifiées à Kinshasa : activités, services B2B, produits et offres commerciales.
              </p>
            </div>
            <span className="text-xs font-bold text-[#00C2A8]">Voir les Entreprises →</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateBlock('jobs')}
            className="text-left p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#00C2A8] transition-colors flex flex-col justify-between gap-3"
          >
            <span className="w-11 h-11 rounded-xl bg-[#0A2A5E] text-[#FFC107] flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-display font-bold text-base text-[#0A2A5E]">4. Emploi &amp; Stages ({jobs.length})</h3>
              <p className="text-xs text-slate-600 mt-1">
                Skills to Jobs : CDI, CDD, Stages, Missions + Portfolio candidat gratuit.
              </p>
            </div>
            <span className="text-xs font-bold text-[#00C2A8]">Trouver un Emploi →</span>
          </button>
        </div>
      </section>

      {/* APERÇU BLOC 1 : MATÉRIAUX DU MARCHÉ */}
      <section aria-labelledby="mat-heading">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 id="mat-heading" className="font-display font-bold text-lg sm:text-xl text-[#0A2A5E]">
              Marché NAYOpro — Matériaux en vedette
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">Vendeurs actifs à Kinshasa · Prix en CDF / $ / €</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateBlock('market')}
            className="text-xs sm:text-sm font-semibold text-[#0A2A5E] hover:text-[#00C2A8] whitespace-nowrap shrink-0"
          >
            Voir les 10 produits →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredMaterials.map((mat) => (
            <div key={mat.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between gap-3">
              <div>
                <MaterialVisual visualKey={mat.visualKey} name={mat.name} />
                <p className="text-xs text-slate-500 mt-3">
                  {mat.commune} · {mat.supplier}
                </p>
                <h3 className="font-display font-bold text-sm text-slate-900 mt-0.5 leading-snug">{mat.name}</h3>
                <MultiPrice amountCdf={mat.priceCdf} size="md" className="mt-2" />
              </div>

              <a
                href={buildWhatsAppLink(
                  `Bonjour NAYOpro, je commande : ${mat.name} (${formatTriple(mat.priceCdf)} / ${mat.unit}) — ${mat.supplier}.`,
                  mat.sellerPhone
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onOrderMaterial(mat)}
                className="w-full min-h-[44px] rounded-xl bg-[#0A2A5E] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#0D3678] transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-[#00C2A8]" />
                Commander
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* APERÇU BLOC 2 : DÉPARTEMENTS & EXPERTS */}
      <section aria-labelledby="exp-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="exp-heading" className="font-display font-bold text-lg sm:text-xl text-[#0A2A5E]">
              Experts Populaires à Kinshasa
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">20 départements métiers · Profils actifs vérifiés</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateBlock('experts')}
            className="text-xs sm:text-sm font-semibold text-[#0A2A5E] hover:text-[#00C2A8] whitespace-nowrap shrink-0"
          >
            Les 20 départements →
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {departments.slice(0, 8).map((dept) => (
            <button
              key={dept.id}
              type="button"
              onClick={() => onSearchSubmit('', 'experts', dept.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#00C2A8] text-xs font-semibold text-[#0A2A5E] whitespace-nowrap shrink-0"
            >
              <DepartmentIcon iconKey={dept.iconKey} className="w-3.5 h-3.5 text-[#00C2A8]" />
              <span>{dept.name}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {popularExperts.map((expert) => (
            <button
              key={expert.id}
              type="button"
              onClick={() => onSelectExpert(expert)}
              className="text-left bg-white rounded-2xl border border-slate-200 hover:border-[#00C2A8] p-4 transition-colors flex items-start gap-4"
            >
              <ExpertAvatar name={expert.name} avatarKey={expert.avatarKey} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display font-bold text-base text-slate-900 truncate">{expert.name}</h3>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0A2A5E] font-mono-num shrink-0">
                    <Star className="w-3.5 h-3.5 fill-[#FFC107] text-[#FFC107]" />
                    {expert.rating.toFixed(1)}
                  </span>
                </div>
                <p className="text-sm font-medium text-[#0A2A5E] truncate">{expert.profession}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#00C2A8]" />
                    {expert.commune}
                  </span>
                  {expert.verified && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-[#0A2A5E] font-semibold">
                        <BadgeCheck className="w-3.5 h-3.5 text-[#00C2A8]" />
                        Trust Passport Vérifié
                      </span>
                    </>
                  )}
                </div>
                <div className="mt-2">
                  {expert.priceCdf ? (
                    <MultiPrice amountCdf={expert.priceCdf} inline size="xs" />
                  ) : (
                    <span className="text-xs font-semibold text-[#0A2A5E]">{expert.priceLabel}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* APERÇU BLOC 4 : OFFRES EMPLOI & STAGES */}
      <section aria-labelledby="jobs-heading">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 id="jobs-heading" className="font-display font-bold text-lg sm:text-xl text-[#0A2A5E]">
              Offres Emploi &amp; Stages — Skills to Jobs
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">100% gratuit pour les jeunes et candidats à Kinshasa</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateBlock('jobs')}
            className="text-xs sm:text-sm font-semibold text-[#0A2A5E] hover:text-[#00C2A8] whitespace-nowrap shrink-0"
          >
            Toutes les offres →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentJobs.map((job) => (
            <button
              key={job.id}
              type="button"
              onClick={() => onOpenJob(job)}
              className="text-left bg-white rounded-2xl border border-slate-200 hover:border-[#00C2A8] p-4 transition-colors flex flex-col justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#0A2A5E] text-[#FFC107] font-display font-extrabold text-sm flex items-center justify-center shrink-0">
                  {job.companyLogoKey || 'NP'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-base text-slate-900 truncate">{job.title}</h3>
                  <p className="text-xs text-slate-600 truncate">{job.companyName}</p>
                </div>
              </div>
              <div className="text-xs text-slate-500 space-y-1">
                <p>
                  {job.type} · {job.commune}
                </p>
                {(() => {
                  const salCdf = job.salaryCdf ?? extractCdfFromLabel(job.salaryLabel);
                  return salCdf ? (
                    <MultiPrice amountCdf={salCdf} size="xs" />
                  ) : (
                    <p className="font-semibold text-[#0A2A5E] font-mono-num">{job.salaryLabel}</p>
                  );
                })()}
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00C2A8]">
                <Briefcase className="w-3.5 h-3.5" />
                Voir et postuler →
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
