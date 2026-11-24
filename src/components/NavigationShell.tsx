import React, { useState } from 'react';
import {
  Briefcase,
  Download,
  Home,
  Mail,
  MessageCircle,
  Phone,
  ShoppingBag,
  User,
  Wrench,
} from 'lucide-react';
import { BRAND_INFO } from '../data/kinshasaData.ts';
import { buildWhatsAppLink } from '../lib/api.ts';
import { CurrencySelector } from '../lib/currency.tsx';
import { usePWAInstall } from '../lib/usePWAInstall.ts';
import type { UserAccount } from '../types.ts';
import { NayoLogo } from './BrandVisuals.tsx';

export type MainTab =
  | 'home'
  | 'market'
  | 'experts'
  | 'companies'
  | 'jobs'
  | 'orders'
  | 'profile'
  | 'contact'
  | 'subscription';

interface TopBarProps {
  activeTab: MainTab;
  onNavigate: (tab: MainTab) => void;
  currentUser: UserAccount | null;
}

export const TopBar: React.FC<TopBarProps> = ({ activeTab, onNavigate, currentUser }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-13 lg:h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C2A8] rounded-lg"
            aria-label="Accueil NAYOpro"
          >
            <NayoLogo compact />
          </button>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600" aria-label="Navigation principale">
            {[
              { id: 'home' as const, label: 'Accueil' },
              { id: 'market' as const, label: 'Marché' },
              { id: 'experts' as const, label: 'Experts' },
              { id: 'companies' as const, label: 'Entreprises' },
              { id: 'jobs' as const, label: 'Emploi & Stages' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  activeTab === item.id
                    ? 'border-[#00C2A8] text-[#0A2A5E] font-semibold'
                    : 'border-transparent hover:text-[#0A2A5E]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <CurrencySelector compact />
            {!isInstalled && (isInstallable || isIOS) && (
              <button
                type="button"
                onClick={() => (isInstallable ? void install() : setShowIOSModal(true))}
                className="lg:hidden inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#0A2A5E] bg-slate-50 hover:bg-slate-100 whitespace-nowrap shrink-0 min-h-[38px]"
              >
                <Download className="w-3.5 h-3.5 text-[#00C2A8]" />
                <span className="hidden sm:inline">Installer</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-[#0A2A5E] text-white text-xs sm:text-sm font-semibold hover:bg-[#0D3678] transition-colors whitespace-nowrap shrink-0 min-h-[38px]"
            >
              <User className="w-4 h-4 text-[#00C2A8]" />
              <span className="max-w-[90px] sm:max-w-[130px] truncate">{currentUser ? currentUser.name.split(' ')[0] : 'Mon Profil'}</span>
            </button>
          </div>
        </div>
      </header>

      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-200 shadow-xl">
            <h3 className="font-display font-bold text-lg text-[#0A2A5E]">Installer NAYOpro sur iPhone</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              1. Touchez le bouton <strong>Partager</strong> en bas de Safari.
              <br />
              2. Sélectionnez <strong>Sur l’écran d’accueil</strong> pour utiliser NAYOpro comme une application mobile.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-[#0A2A5E] text-white text-sm font-semibold"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// Barre de navigation en bas : [Accueil] [Marché] [Experts] [Emploi & Stages] [Mon Profil]
export const BottomNav: React.FC<{ activeTab: MainTab; onNavigate: (tab: MainTab) => void }> = ({
  activeTab,
  onNavigate,
}) => {
  const items: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Accueil', icon: <Home className="w-5 h-5" /> },
    { id: 'market', label: 'Marché', icon: <ShoppingBag className="w-5 h-5" /> },
    { id: 'experts', label: 'Experts', icon: <Wrench className="w-5 h-5" /> },
    { id: 'jobs', label: 'Emploi & Stages', icon: <Briefcase className="w-5 h-5" /> },
    { id: 'profile', label: 'Mon Profil', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe"
      aria-label="Barre de navigation mobile"
    >
      <div className="grid grid-cols-5 h-16 items-center">
        {items.map((item) => {
          const isActive =
            activeTab === item.id ||
            (item.id === 'profile' &&
              (activeTab === 'subscription' || activeTab === 'contact' || activeTab === 'orders')) ||
            (item.id === 'home' && activeTab === 'companies');
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center min-h-[44px] px-0.5 transition-colors ${
                isActive ? 'text-[#0A2A5E]' : 'text-slate-500 hover:text-[#0A2A5E]'
              }`}
            >
              <span
                className={`p-1 rounded-lg transition-colors ${
                  isActive ? 'bg-[#00C2A8]/15 text-[#0A2A5E]' : ''
                }`}
              >
                {item.icon}
              </span>
              <span className={`text-[9.5px] mt-0.5 whitespace-nowrap truncate max-w-full ${isActive ? 'font-bold text-[#0A2A5E]' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export const Footer: React.FC<{ onNavigate: (tab: MainTab) => void }> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#0A2A5E] text-white mt-12 pb-24 lg:pb-10">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <p className="font-display font-extrabold text-xl tracking-tight">
            NAYO<span className="text-[#00C2A8]">pro</span>
          </p>
          <p className="text-sm text-[#FFC107] font-medium mt-1">{BRAND_INFO.slogan}</p>
          <p className="text-sm text-slate-300 mt-3 leading-relaxed">
            Plateforme de référence à {BRAND_INFO.city} : Marché matériaux, Experts dans 20 départements, Entreprises et Emploi &amp; Stages.
          </p>
          <p className="text-xs text-slate-300 mt-3">
            Fondateur : <strong className="text-white">{BRAND_INFO.founder}</strong>
          </p>
        </div>

        <div>
          <h3 className="font-display font-bold text-sm text-[#FFC107] mb-3">Les 4 Blocs &amp; Services</h3>
          <ul className="space-y-2 text-sm text-slate-200">
            <li>
              <button type="button" onClick={() => onNavigate('market')} className="hover:text-[#00C2A8] transition-colors">
                Marché NAYOpro (Produits &amp; Matériaux)
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('experts')} className="hover:text-[#00C2A8] transition-colors">
                Experts &amp; Prestataires (20 départements)
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('companies')} className="hover:text-[#00C2A8] transition-colors">
                Entreprises &amp; Sociétés
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('jobs')} className="hover:text-[#00C2A8] transition-colors">
                Emploi &amp; Stages — Skills to Jobs
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('orders')} className="hover:text-[#00C2A8] transition-colors">
                Mes Commandes &amp; Devis
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('subscription')} className="hover:text-[#00C2A8] transition-colors">
                Abonnement 1 Mois (Vendeur / Expert / Entreprise)
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('contact')} className="hover:text-[#00C2A8] transition-colors">
                Contact &amp; Support Kinshasa
              </button>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-display font-bold text-sm text-[#FFC107] mb-3">Contacts Officiels</h3>
          <div className="space-y-2.5 text-sm text-slate-200">
            <a href={`mailto:${BRAND_INFO.email}`} className="flex items-center gap-2 hover:text-[#00C2A8]">
              <Mail className="w-4 h-4 text-[#00C2A8] shrink-0" />
              <span>Email : {BRAND_INFO.email}</span>
            </a>
            <a href={`tel:${BRAND_INFO.phoneRaw}`} className="flex items-center gap-2 hover:text-[#00C2A8]">
              <Phone className="w-4 h-4 text-[#00C2A8] shrink-0" />
              <span>Tél : {BRAND_INFO.phoneDisplay}</span>
            </a>
            <a
              href={buildWhatsAppLink("Bonjour NAYOpro, j'ai besoin d'informations sur vos services à Kinshasa.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-2 px-4 py-2.5 rounded-xl bg-[#00C2A8] text-[#0A2A5E] font-bold text-xs hover:bg-[#00d6ba] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp {BRAND_INFO.phoneDisplay}
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 text-xs text-slate-300 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            {BRAND_INFO.name} - {BRAND_INFO.slogan}, {BRAND_INFO.city}, Email : {BRAND_INFO.email}, Tél : {BRAND_INFO.phoneDisplay}
          </span>
          <span>0% commission sur les prestations · 100% Kinshasa</span>
        </div>
      </div>
    </footer>
  );
};
