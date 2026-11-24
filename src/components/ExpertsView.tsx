import React, { useMemo, useState } from 'react';
import { BadgeCheck, Filter, MapPin, MessageCircle, Phone, Search, Star, Wrench } from 'lucide-react';
import { KINSHASA_COMMUNES } from '../data/kinshasaData.ts';
import { buildWhatsAppLink } from '../lib/api.ts';
import { MultiPrice, useCurrency } from '../lib/currency.tsx';
import type { DepartmentItem, ExpertProfile } from '../types.ts';
import { DepartmentIcon, ExpertAvatar } from './BrandVisuals.tsx';

interface ExpertsViewProps {
  departments: DepartmentItem[];
  experts: ExpertProfile[];
  initialQuery?: string;
  initialDepartmentId?: string;
  onSelectExpert: (expert: ExpertProfile) => void;
  onBecomeExpert: () => void;
}

export const ExpertsView: React.FC<ExpertsViewProps> = ({
  departments,
  experts,
  initialQuery = '',
  initialDepartmentId = 'all',
  onSelectExpert,
  onBecomeExpert,
}) => {
  const [keyword, setKeyword] = useState(initialQuery);
  const [departmentId, setDepartmentId] = useState(initialDepartmentId || 'all');
  const [commune, setCommune] = useState('all');
  const [maxPrice, setMaxPrice] = useState('all');
  const [minRating, setMinRating] = useState('0');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { formatPrimary } = useCurrency();

  const filteredExperts = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return experts.filter((p) => {
      if (departmentId !== 'all' && p.departmentId !== departmentId) return false;
      if (commune !== 'all' && p.commune !== commune && !p.zones.includes(commune)) return false;
      if (verifiedOnly && !p.verified) return false;
      if (Number(minRating) > 0 && p.rating < Number(minRating)) return false;
      if (maxPrice !== 'all') {
        const cap = Number(maxPrice);
        if (p.priceCdf !== null && p.priceCdf > cap) return false;
      }
      if (q) {
        const hay = `${p.name} ${p.profession} ${p.description} ${p.commune} ${p.zones.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [experts, keyword, departmentId, commune, verifiedOnly, minRating, maxPrice]);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* En-tête Bloc 2 : Experts */}
      <div className="bg-[#0A2A5E] text-white rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <p className="text-xs font-semibold text-[#00C2A8]">Bloc 2 · Prestataires &amp; Savoir-faire</p>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl mt-1">
            Experts Vérifiés dans 20 Départements à Kinshasa
          </h1>
          <p className="text-sm text-slate-200 mt-1.5 max-w-2xl">
            Gratuit pour le client. Demandez un devis gratuit ou appelez directement un expert actif.
          </p>
        </div>

        <button
          type="button"
          onClick={onBecomeExpert}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FFC107] text-[#0A2A5E] text-xs font-extrabold whitespace-nowrap shrink-0 hover:bg-[#ffca2c]"
        >
          <Wrench className="w-4 h-4" />
          Devenir Expert (Abonnement 1 mois)
        </button>
      </div>

      {/* Les 20 Départements d'Experts (Tous affichés) */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display font-bold text-base sm:text-lg text-[#0A2A5E]">
              Les 20 Départements d’Experts
            </h2>
            <p className="text-xs text-slate-500">Touchez un département pour filtrer les prestataires</p>
          </div>
          {departmentId !== 'all' && (
            <button
              type="button"
              onClick={() => setDepartmentId('all')}
              className="text-xs font-bold text-[#00C2A8] hover:underline"
            >
              Afficher les 20 départements
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
          {departments.map((d) => {
            const active = departmentId === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setDepartmentId(active ? 'all' : d.id)}
                className={`text-left p-3 rounded-xl border transition-colors flex flex-col gap-1.5 ${
                  active
                    ? 'bg-[#0A2A5E] text-white border-[#0A2A5E]'
                    : 'bg-slate-50/70 text-slate-900 border-slate-200 hover:border-[#00C2A8]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      active ? 'bg-[#00C2A8] text-[#0A2A5E]' : 'bg-[#0A2A5E]/10 text-[#0A2A5E]'
                    }`}
                  >
                    <DepartmentIcon iconKey={d.iconKey} className="w-4 h-4" />
                  </span>
                  <span className="font-display font-bold text-xs truncate">{d.name}</span>
                </div>
                <p className={`text-[11px] line-clamp-1 ${active ? 'text-slate-200' : 'text-slate-500'}`}>
                  {d.services.join(', ')}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Barre de recherche & filtres experts */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Rechercher un métier : Maçon, Plombier, Mécanicien, Coiffeuse, Vétérinaire, Infirmier..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 text-sm focus:border-[#00C2A8] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            className="lg:hidden inline-flex items-center justify-center gap-2 px-4 h-11 rounded-xl border border-slate-300 text-xs font-bold text-[#0A2A5E]"
          >
            <Filter className="w-4 h-4 text-[#00C2A8]" />
            Filtres
          </button>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${showFilters ? '' : 'hidden lg:grid'}`}>
          <select
            value={commune}
            onChange={(e) => setCommune(e.target.value)}
            className="h-10 rounded-xl border border-slate-300 px-3 text-sm bg-white"
          >
            <option value="all">Toutes communes</option>
            {KINSHASA_COMMUNES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="h-10 rounded-xl border border-slate-300 px-3 text-sm bg-white"
          >
            <option value="all">Tout tarif</option>
            <option value="50000">Jusqu’à {formatPrimary(50000)}</option>
            <option value="150000">Jusqu’à {formatPrimary(150000)}</option>
            <option value="350000">Jusqu’à {formatPrimary(350000)}</option>
          </select>

          <select
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            className="h-10 rounded-xl border border-slate-300 px-3 text-sm bg-white"
          >
            <option value="0">Toutes notes</option>
            <option value="4.5">4.5+ étoiles</option>
            <option value="4.8">4.8+ étoiles</option>
          </select>

          <label className="h-10 rounded-xl border border-slate-300 px-3 flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="accent-[#00C2A8] w-4 h-4"
            />
            Trust Passport Vérifié uniquement
          </label>
        </div>
      </div>

      {/* Liste des Experts Actifs */}
      {filteredExperts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <p className="font-display font-bold text-slate-900">Aucun expert actif dans ce département pour le moment</p>
          <p className="text-xs text-slate-500 mt-1">
            Les nouveaux experts de ce métier sont en attente d’activation par l’Admin NAYOpro.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExperts.map((expert) => (
            <div
              key={expert.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between gap-4 hover:border-[#00C2A8] transition-colors"
            >
              <div>
                <div className="flex items-start gap-3.5">
                  <ExpertAvatar name={expert.name} avatarKey={expert.avatarKey} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display font-bold text-base text-slate-900 truncate">{expert.name}</h3>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0A2A5E] font-mono-num shrink-0">
                        <Star className="w-3.5 h-3.5 fill-[#FFC107] text-[#FFC107]" />
                        {expert.rating > 0 ? expert.rating.toFixed(1) : 'Nouveau'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#0A2A5E] truncate">{expert.profession}</p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#00C2A8] shrink-0" />
                      <span>
                        {expert.commune} · {expert.availability}
                      </span>
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">{expert.description}</p>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  {expert.priceCdf ? (
                    <MultiPrice amountCdf={expert.priceCdf} size="sm" />
                  ) : (
                    <span className="font-mono-num font-bold text-[#0A2A5E]">{expert.priceLabel}</span>
                  )}
                  {expert.verified && (
                    <span className="inline-flex items-center gap-1 text-[#0A2A5E] font-semibold shrink-0">
                      <BadgeCheck className="w-4 h-4 text-[#00C2A8]" />
                      Vérifié
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onSelectExpert(expert)}
                  className="col-span-2 min-h-[42px] rounded-xl bg-[#00C2A8] text-[#0A2A5E] text-xs font-extrabold flex items-center justify-center gap-1.5 hover:bg-[#00d4b7]"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Demander un Devis Gratuit
                </button>
                <a
                  href={`tel:${expert.phone.replace(/\s+/g, '')}`}
                  onClick={() => buildWhatsAppLink('', expert.phone)}
                  className="min-h-[42px] rounded-xl bg-[#0A2A5E] text-white text-xs font-bold flex items-center justify-center gap-1 hover:bg-[#0D3678]"
                >
                  <Phone className="w-3.5 h-3.5 text-[#FFC107]" />
                  Appeler
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
