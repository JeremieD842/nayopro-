import React from 'react';
import {
  BadgeCheck,
  Briefcase,
  Building2,
  MapPin,
  MessageCircle,
  ShoppingBag,
} from 'lucide-react';
import { MultiPrice } from '../lib/currency.tsx';
import type { ExpertProfile } from '../types.ts';
import { ExpertAvatar } from './BrandVisuals.tsx';

interface CompaniesViewProps {
  companies: ExpertProfile[];
  onSelectCompany: (company: ExpertProfile) => void;
  onOpenMarket: () => void;
  onOpenJobs: () => void;
  onBecomeCompany: () => void;
}

export const CompaniesView: React.FC<CompaniesViewProps> = ({
  companies,
  onSelectCompany,
  onOpenMarket,
  onOpenJobs,
  onBecomeCompany,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* En-tête Bloc 3 : Entreprises */}
      <div className="bg-[#0A2A5E] text-white rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <p className="text-xs font-semibold text-[#00C2A8]">Bloc 3 · Sociétés &amp; Partenaires B2B</p>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl mt-1">
            Entreprises Vérifiées à Kinshasa
          </h1>
          <p className="text-sm text-slate-200 mt-1.5 max-w-2xl">
            Découvrez les sociétés actives : activités, services, produits au Marché, offres d’emploi et devis commerciaux directs.
          </p>
        </div>

        <button
          type="button"
          onClick={onBecomeCompany}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FFC107] text-[#0A2A5E] text-xs font-extrabold whitespace-nowrap shrink-0 hover:bg-[#ffca2c]"
        >
          <Building2 className="w-4 h-4" />
          Inscrire mon Entreprise (Abonnement 1 mois)
        </button>
      </div>

      {companies.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
          Aucune entreprise active pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {companies.map((comp) => (
            <div
              key={comp.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between gap-5 hover:border-[#00C2A8] transition-colors"
            >
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <ExpertAvatar name={comp.name} avatarKey="entreprise" size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-display font-extrabold text-lg text-[#0A2A5E]">{comp.name}</h2>
                      {comp.verified && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#00C2A8]">
                          <BadgeCheck className="w-4 h-4" />
                          Société Vérifiée
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-700 mt-0.5">{comp.profession}</p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#00C2A8]" />
                      Siège : {comp.commune} · Zones : {comp.zones.join(', ')}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">{comp.description}</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="font-bold text-[#0A2A5E] mb-1">Activités</p>
                    <p className="text-slate-600">{(comp.activities && comp.activities.join(' · ')) || comp.profession}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="font-bold text-[#0A2A5E] mb-1">Services</p>
                    <p className="text-slate-600">
                      {(comp.servicesList && comp.servicesList.join(' · ')) || 'Prestations sur devis'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="font-bold text-[#0A2A5E] mb-1">Produits</p>
                    <p className="text-slate-600">
                      {(comp.productsSummary && comp.productsSummary.join(' · ')) || 'Catalogue Marché NAYOpro'}
                    </p>
                  </div>
                </div>

                {comp.commercialOffers && comp.commercialOffers.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-[#0A2A5E]">Offres Commerciales en cours</p>
                    {comp.commercialOffers.map((offer, i) => (
                      <p key={i} className="text-xs text-slate-700 bg-[#00C2A8]/10 rounded-xl px-3 py-2">
                        {offer}
                      </p>
                    ))}
                  </div>
                )}

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#0A2A5E]">Tarif indicatif projet :</span>
                  {comp.priceCdf ? (
                    <MultiPrice amountCdf={comp.priceCdf} size="sm" />
                  ) : (
                    <span className="text-xs font-bold text-[#0A2A5E]">{comp.priceLabel}</span>
                  )}
                </div>

                <div className="text-xs text-slate-600 flex flex-wrap gap-4 pt-1">
                  <span>Tél : <strong className="font-mono-num text-[#0A2A5E]">{comp.phone}</strong></span>
                  <span>Email : <strong className="text-[#0A2A5E]">{comp.email}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onSelectCompany(comp)}
                  className="col-span-2 min-h-[42px] rounded-xl bg-[#0A2A5E] text-white text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4 text-[#00C2A8]" />
                  Demande Commerciale
                </button>
                <button
                  type="button"
                  onClick={onOpenMarket}
                  className="min-h-[42px] rounded-xl bg-slate-100 text-[#0A2A5E] text-xs font-bold flex items-center justify-center gap-1 hover:bg-slate-200"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#00C2A8]" />
                  Produits
                </button>
                <button
                  type="button"
                  onClick={onOpenJobs}
                  className="min-h-[42px] rounded-xl bg-[#00C2A8]/15 text-[#0A2A5E] text-xs font-bold flex items-center justify-center gap-1 hover:bg-[#00C2A8]/25"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  Emplois
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
