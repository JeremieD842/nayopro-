import React, { useMemo, useState } from 'react';
import { MapPin, MessageCircle, Search, ShoppingBag, Store } from 'lucide-react';
import { KINSHASA_COMMUNES } from '../data/kinshasaData.ts';
import { buildWhatsAppLink } from '../lib/api.ts';
import { MultiPrice, useCurrency } from '../lib/currency.tsx';
import type { MaterialItem } from '../types.ts';
import { MaterialVisual } from './BrandVisuals.tsx';

interface MarketViewProps {
  materials: MaterialItem[];
  initialQuery?: string;
  onOrderMaterial: (material: MaterialItem) => void;
  onBecomeSeller: () => void;
}

const MARKET_TAGS = ['Tout', 'Sable', 'Ciment', 'Caillasse', 'Bois', 'Tôles', 'Fer', 'Gravier', 'Briques', 'Peinture', 'Carrelage'];

export const MarketView: React.FC<MarketViewProps> = ({
  materials,
  initialQuery = '',
  onOrderMaterial,
  onBecomeSeller,
}) => {
  const [keyword, setKeyword] = useState(initialQuery);
  const [commune, setCommune] = useState('all');
  const { formatTriple } = useCurrency();

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return materials.filter((m) => {
      if (commune !== 'all' && m.commune !== commune) return false;
      if (q) {
        const hay = `${m.name} ${m.category} ${m.supplier} ${m.commune} ${m.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [materials, keyword, commune]);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* En-tête Bloc 1 : Marché */}
      <div className="bg-[#0A2A5E] text-white rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <p className="text-xs font-semibold text-[#00C2A8]">Bloc 1 · Services Commerciaux &amp; Matériaux</p>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl mt-1">Marché NAYOpro — Matériaux &amp; Produits</h1>
          <p className="text-sm text-slate-200 mt-1.5 max-w-2xl">
            Achetez directement en CDF, $ ou € auprès de vendeurs et fournisseurs actifs à Kinshasa. Gratuit pour le client, 0% de commission.
          </p>
        </div>

        <button
          type="button"
          onClick={onBecomeSeller}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FFC107] text-[#0A2A5E] text-xs font-extrabold whitespace-nowrap shrink-0 hover:bg-[#ffca2c]"
        >
          <Store className="w-4 h-4" />
          Vendre sur le Marché (Abonnement 1 mois)
        </button>
      </div>

      {/* Recherche & Filtres Produits */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Rechercher : Sable, Ciment, Caillasse, Bois, Tôles, Fer, Gravier, Briques, Peinture, Carrelage..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 text-sm focus:border-[#00C2A8] focus:outline-none"
            />
          </div>

          <select
            value={commune}
            onChange={(e) => setCommune(e.target.value)}
            aria-label="Filtrer par commune vendeur"
            className="h-11 rounded-xl border border-slate-300 px-3 text-sm bg-white focus:border-[#00C2A8] focus:outline-none"
          >
            <option value="all">Toutes les communes</option>
            {KINSHASA_COMMUNES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {MARKET_TAGS.map((tag) => {
            const active = (tag === 'Tout' && keyword === '') || keyword.toLowerCase() === tag.toLowerCase();
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setKeyword(tag === 'Tout' ? '' : tag)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                  active ? 'bg-[#0A2A5E] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grille des Produits */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <ShoppingBag className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="font-display font-bold text-slate-900">Aucun produit trouvé dans cette recherche</p>
          <p className="text-xs text-slate-500 mt-1">Seuls les vendeurs avec un abonnement actif apparaissent sur le Marché.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((mat) => (
            <div
              key={mat.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between gap-3.5 hover:border-[#00C2A8] transition-colors"
            >
              <div>
                <MaterialVisual visualKey={mat.visualKey} name={mat.name} />
                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-[#00C2A8] shrink-0" />
                    {mat.commune}
                  </span>
                  <span className="shrink-0">{mat.unit}</span>
                </div>
                <h2 className="font-display font-bold text-base text-slate-900 mt-1 leading-snug">{mat.name}</h2>
                <p className="text-xs font-semibold text-[#0A2A5E] mt-1 truncate">Vendeur : {mat.supplier}</p>
                <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">{mat.description}</p>
                <MultiPrice amountCdf={mat.priceCdf} size="md" className="mt-2.5" />
              </div>

              <a
                href={buildWhatsAppLink(
                  `Bonjour NAYOpro, je commande dans le Marché : ${mat.name} (${formatTriple(mat.priceCdf)} / ${mat.unit}) — Vendeur : ${mat.supplier} (${mat.commune}).`,
                  mat.sellerPhone
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onOrderMaterial(mat)}
                className="w-full min-h-[44px] rounded-xl bg-[#00C2A8] text-[#0A2A5E] text-xs font-extrabold flex items-center justify-center gap-2 hover:bg-[#00d4b7] transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Commander sur WhatsApp
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
