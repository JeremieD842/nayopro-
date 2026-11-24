import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRightLeft,
  Briefcase,
  Check,
  CreditCard,
  Eye,
  FileCheck2,
  Flag,
  FolderKanban,
  LogOut,
  Megaphone,
  PauseCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Store,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { api, type AdminOverviewResponse } from '../lib/api.ts';
import { MultiPrice, formatSingleCurrency, useCurrency } from '../lib/currency.tsx';
import type { ExpertProfile, SubscriptionPayment } from '../types.ts';

interface AdminDashboardProps {
  onDataChanged: () => void;
  onLogout: () => void;
}

type AdminSection =
  | 'experts'
  | 'sellers'
  | 'jobs'
  | 'ads'
  | 'subscriptions'
  | 'departments'
  | 'reports'
  | 'users'
  | 'logs';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onDataChanged, onLogout }) => {
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [section, setSection] = useState<AdminSection>('experts');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [proofModalProvider, setProofModalProvider] = useState<{
    provider: ExpertProfile;
    payments: SubscriptionPayment[];
  } | null>(null);

  const { formatTriple } = useCurrency();
  const [priceInput, setPriceInput] = useState('20000');
  const [daysInput, setDaysInput] = useState('30');
  const [usdRateInput, setUsdRateInput] = useState('2800');
  const [eurRateInput, setEurRateInput] = useState('3050');
  const [savingRates, setSavingRates] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [newDeptServices, setNewDeptServices] = useState('');
  const [newDeptPriority, setNewDeptPriority] = useState(false);

  const loadOverview = () => {
    setLoading(true);
    api
      .getAdminOverview()
      .then((res) => {
        setData(res);
        setPriceInput(String(res.subscriptionConfig.monthlyPriceCdf));
        setDaysInput(String(res.subscriptionConfig.durationDays));
        setUsdRateInput(String(res.exchangeRates.usdToCdf));
        setEurRateInput(String(res.exchangeRates.eurToCdf));
      })
      .catch((err) => setErrorMsg(err instanceof Error ? err.message : 'Erreur chargement Admin.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const handleProviderAction = async (id: string, action: 'ACTIVER' | 'PROLONGER' | 'SUSPENDRE' | 'DESACTIVER') => {
    setActionNotice(null);
    const res = await api.adminProviderAction(id, action);
    const label =
      action === 'ACTIVER'
        ? `${res.provider.name} activé pour 30 jours — VISIBLE immédiatement pour les clients.`
        : action === 'PROLONGER'
          ? `${res.provider.name} prolongé de +30 jours.`
          : action === 'SUSPENDRE'
            ? `${res.provider.name} suspendu et masqué aux clients.`
            : `${res.provider.name} désactivé et masqué aux clients.`;
    setActionNotice(label);
    loadOverview();
    onDataChanged();
  };

  const handleJobAction = async (id: string, action: 'VALIDER' | 'REFUSER' | 'SUSPENDRE') => {
    await api.adminJobAction(id, action);
    loadOverview();
    onDataChanged();
  };

  const handleAdAction = async (id: string, action: 'ACTIVER' | 'REFUSER' | 'SUSPENDRE' | 'PROLONGER') => {
    setActionNotice(null);
    const res = await api.adminAdAction(id, action);
    setActionNotice(
      action === 'ACTIVER'
        ? `Publicité « ${res.ad.title} » activée (${res.ad.durationDays} jours) — VISIBLE sur le Panneau Accueil.`
        : action === 'PROLONGER'
          ? `Publicité « ${res.ad.title} » prolongée de +${res.ad.durationDays} jours.`
          : action === 'REFUSER'
            ? `Publicité « ${res.ad.title} » refusée.`
            : `Publicité « ${res.ad.title} » suspendue.`
    );
    loadOverview();
    onDataChanged();
  };

  const handleUpdateSubConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.adminUpdateSubConfig(Number(priceInput), Number(daysInput));
    setActionNotice('Tarif et durée d’abonnement mis à jour.');
    loadOverview();
    onDataChanged();
  };

  const handleUpdateExchangeRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRates(true);
    setActionNotice(null);
    try {
      const usd = Number(usdRateInput);
      const eur = Number(eurRateInput);
      await api.adminUpdateExchangeRates(usd, eur);
      setActionNotice(
        `Taux de change enregistrés : 1 $ = ${formatSingleCurrency(usd, 'CDF')} · 1 € = ${formatSingleCurrency(eur, 'CDF')}. Tous les prix du site ont été recalculés.`
      );
      loadOverview();
      onDataChanged();
    } catch (err) {
      setActionNotice(err instanceof Error ? err.message : 'Erreur mise à jour des taux.');
    } finally {
      setSavingRates(false);
    }
  };

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.adminAddDepartment({
      name: newDeptName,
      description: newDeptDesc,
      services: newDeptServices,
      priority: newDeptPriority,
    });
    setNewDeptName('');
    setNewDeptDesc('');
    setNewDeptServices('');
    loadOverview();
    onDataChanged();
  };

  if (loading && !data) {
    return <div className="max-w-7xl mx-auto px-4 py-10 text-sm text-slate-500">Chargement du Centre de Contrôle Admin...</div>;
  }

  if (errorMsg || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="p-5 rounded-2xl bg-red-50 text-red-700 text-sm font-semibold">{errorMsg || 'Accès refusé.'}</div>
      </div>
    );
  }

  const { stats } = data;
  const expertAccounts = data.providers.filter((p) => p.accountCategory === 'EXPERT');
  const marketAccounts = data.providers.filter((p) => p.accountCategory === 'VENDEUR' || p.accountCategory === 'ENTREPRISE');

  const renderProviderTable = (rows: ExpertProfile[], columnLabel: string) => (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
              <th className="py-3 px-4">Nom / Type</th>
              <th className="py-3 px-4">{columnLabel}</th>
              <th className="py-3 px-4">Commune</th>
              <th className="py-3 px-4">Téléphone</th>
              <th className="py-3 px-4">Statut &amp; Fin (30j)</th>
              <th className="py-3 px-4 text-right">Actions Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {rows.map((p) => {
              const providerPayments = data.payments.filter((pay) => pay.providerId === p.id);
              const sellerProducts = data.materials.filter((m) => m.sellerId === p.id);
              return (
                <tr key={p.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{p.name}</p>
                    <p className="text-[11px] text-slate-500">{p.accountCategory}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-medium text-slate-800">{p.profession}</p>
                    {sellerProducts.length > 0 && (
                      <p className="text-[11px] text-[#00C2A8] font-semibold">
                        {sellerProducts.length} produit(s) Marché
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">{p.commune}</td>
                  <td className="py-3.5 px-4 font-mono-num text-slate-700 whitespace-nowrap">{p.phone}</td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {(() => {
                      const daysLeft =
                        p.subscriptionStatus === 'ACTIF' && p.subscriptionEndAt
                          ? Math.max(0, Math.ceil((Date.parse(p.subscriptionEndAt) - Date.now()) / 86400000))
                          : 0;
                      return (
                        <>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-block font-bold px-2 py-0.5 rounded text-[11px] ${
                                p.subscriptionStatus === 'ACTIF'
                                  ? 'bg-[#00C2A8]/20 text-[#0A2A5E]'
                                  : p.subscriptionStatus === 'EN ATTENTE'
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {p.subscriptionStatus}
                            </span>
                            {p.subscriptionStatus === 'ACTIF' && (
                              <span className="font-mono-num text-[11px] font-bold text-[#00C2A8]">
                                {daysLeft}j restants
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono-num mt-1">
                            {p.subscriptionEndAt ? `Fin : ${new Date(p.subscriptionEndAt).toLocaleDateString('fr-FR')}` : 'Invisible pour clients'}
                          </p>
                        </>
                      );
                    })()}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleProviderAction(p.id, 'ACTIVER')}
                        className="px-2.5 py-1.5 rounded-lg bg-[#00C2A8] text-[#0A2A5E] font-extrabold text-[11px] whitespace-nowrap"
                      >
                        ACTIVER 1 MOIS
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleProviderAction(p.id, 'PROLONGER')}
                        className="px-2.5 py-1.5 rounded-lg bg-[#0A2A5E] text-white font-bold text-[11px] whitespace-nowrap"
                      >
                        PROLONGER 1 MOIS
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleProviderAction(p.id, 'SUSPENDRE')}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-900 font-bold text-[11px] whitespace-nowrap"
                      >
                        SUSPENDRE
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleProviderAction(p.id, 'DESACTIVER')}
                        className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 font-bold text-[11px] whitespace-nowrap"
                      >
                        DÉSACTIVER
                      </button>
                      <button
                        type="button"
                        onClick={() => setProofModalProvider({ provider: p, payments: providerPayments })}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-bold text-[11px] whitespace-nowrap"
                      >
                        <Eye className="w-3 h-3" />
                        VOIR PREUVE DE PAIEMENT
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* Header Admin */}
      <div className="bg-[#0A2A5E] text-white rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#FFC107] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#00C2A8]" />
            Contrôle Admin — Le Patron Contrôle Tout
          </p>
          <h1 className="font-display font-extrabold text-2xl mt-1">Tableau de Bord Admin NAYOpro</h1>
          <p className="text-xs text-slate-200 mt-1">
            0% commission sur prestations · Revenu = 100% abonnements · Activation manuelle obligatoire (30 jours)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadOverview}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFC107] text-[#0A2A5E] text-xs font-extrabold"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </div>

      {/* Statistiques multi-devises séparées + Revenus Visibilité & Publicité */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-[11px] font-semibold text-slate-500">Total en CDF</p>
            <p className="font-mono-num font-extrabold text-xl text-[#0A2A5E] mt-1">
              {formatSingleCurrency(stats.totalRevenueCdfOnly, 'CDF')}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Paiements reçus en CDF</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-[11px] font-semibold text-slate-500">Total en $</p>
            <p className="font-mono-num font-extrabold text-xl text-[#0A2A5E] mt-1">
              {formatSingleCurrency(stats.totalRevenueUsd, 'USD')}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Paiements reçus en Dollars</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-[11px] font-semibold text-slate-500">Total en €</p>
            <p className="font-mono-num font-extrabold text-xl text-[#0A2A5E] mt-1">
              {formatSingleCurrency(stats.totalRevenueEur, 'EUR')}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Paiements reçus en Euros</p>
          </div>
          <div className="bg-[#00C2A8]/15 rounded-2xl border border-[#00C2A8] p-4">
            <p className="text-[11px] font-extrabold text-[#0A2A5E]">Total Général converti en CDF</p>
            <p className="font-mono-num font-extrabold text-xl text-[#0A2A5E] mt-1">
              {formatSingleCurrency(stats.grandTotalConvertedCdf, 'CDF')}
            </p>
            <MultiPrice amountCdf={stats.grandTotalConvertedCdf} size="xs" className="mt-0.5" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#0A2A5E] text-white rounded-2xl p-4">
            <p className="text-[11px] text-slate-200">Nombre de Pubs Actives</p>
            <p className="font-mono-num font-extrabold text-xl text-[#FFC107] mt-1">{stats.activeAdsCount}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-[11px] text-slate-500">Revenus Visibilité (1 mois)</p>
            <MultiPrice amountCdf={stats.totalSubscriptionRevenueCdf} size="sm" className="mt-1" />
          </div>
          <div className="bg-white rounded-2xl border border-[#FFC107]/60 p-4">
            <p className="text-[11px] text-slate-500">Revenus Publicité (Panneau)</p>
            <MultiPrice amountCdf={stats.totalAdRevenueCdf} size="sm" className="mt-1" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-[11px] font-bold text-[#0A2A5E]">Revenus Catalogue (CDF équiv.)</p>
            <MultiPrice amountCdf={stats.totalRevenueCdf} size="sm" className="mt-1" />
          </div>
        </div>

        {/* Section [Taux de Change] modifiable par l'Admin */}
        <form
          onSubmit={handleUpdateExchangeRates}
          className="bg-white rounded-2xl border-2 border-[#0A2A5E]/15 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4"
        >
          <div className="space-y-1">
            <p className="text-xs font-extrabold text-[#0A2A5E] flex items-center gap-1.5">
              <ArrowRightLeft className="w-4 h-4 text-[#00C2A8]" />
              [Taux de Change] Multi-Devises (Recalcul automatique sur tout le site)
            </p>
            <p className="text-[11px] text-slate-500">
              Visibilité 1 mois : <strong>{formatTriple(data.subscriptionConfig.monthlyPriceCdf)}</strong> · Pub 7j :{' '}
              <strong>{formatTriple(15000)}</strong> · Pub 30j : <strong>{formatTriple(30000)}</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">1 $ = (en CDF)</label>
              <input
                type="number"
                min={100}
                step={50}
                required
                value={usdRateInput}
                onChange={(e) => setUsdRateInput(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono-num font-bold text-[#0A2A5E]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">1 € = (en CDF)</label>
              <input
                type="number"
                min={100}
                step={50}
                required
                value={eurRateInput}
                onChange={(e) => setEurRateInput(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono-num font-bold text-[#0A2A5E]"
              />
            </div>
            <button
              type="submit"
              disabled={savingRates}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0A2A5E] text-[#FFC107] text-xs font-extrabold hover:bg-[#103878] whitespace-nowrap"
            >
              {savingRates ? 'Mise à jour...' : 'Appliquer les Taux'}
            </button>
          </div>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Clients', val: stats.totalClients },
            { label: 'Experts actifs', val: stats.activeExperts },
            { label: 'Vendeurs actifs', val: stats.activeSellers },
            { label: 'Demandes', val: stats.totalRequests },
            { label: 'Abonnements', val: stats.activeSubscriptions },
            { label: 'Offres', val: stats.validatedJobs },
            { label: 'Candidatures', val: stats.totalApplications },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 p-3.5">
              <p className="text-[11px] text-slate-500 truncate">{kpi.label}</p>
              <p className="font-mono-num font-extrabold text-base sm:text-lg text-[#0A2A5E] mt-1 truncate">{kpi.val}</p>
            </div>
          ))}
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-2xl bg-[#00C2A8]/15 border border-[#00C2A8] text-xs font-bold text-[#0A2A5E] flex items-center justify-between gap-3">
          <span>{actionNotice}</span>
          <button type="button" onClick={() => setActionNotice(null)} className="text-slate-600 hover:text-slate-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* LES 4 ONGLETS PRINCIPAUX SÉPARÉS + OUTILS */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => setSection('experts')}
            className={`min-h-[46px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors ${
              section === 'experts' ? 'bg-[#0A2A5E] text-white' : 'bg-white border border-slate-200 text-[#0A2A5E] hover:border-[#00C2A8]'
            }`}
          >
            <Wrench className="w-4 h-4 text-[#00C2A8]" />
            Gérer Experts ({expertAccounts.length})
          </button>
          <button
            type="button"
            onClick={() => setSection('sellers')}
            className={`min-h-[46px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors ${
              section === 'sellers' ? 'bg-[#0A2A5E] text-white' : 'bg-white border border-slate-200 text-[#0A2A5E] hover:border-[#00C2A8]'
            }`}
          >
            <Store className="w-4 h-4 text-[#00C2A8]" />
            Gérer Marché ({marketAccounts.length})
          </button>
          <button
            type="button"
            onClick={() => setSection('jobs')}
            className={`min-h-[46px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors ${
              section === 'jobs' ? 'bg-[#0A2A5E] text-white' : 'bg-white border border-slate-200 text-[#0A2A5E] hover:border-[#00C2A8]'
            }`}
          >
            <Briefcase className="w-4 h-4 text-[#00C2A8]" />
            Gérer Emploi ({data.jobs.length})
          </button>
          <button
            type="button"
            onClick={() => setSection('ads')}
            className={`min-h-[46px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors ${
              section === 'ads' ? 'bg-[#0A2A5E] text-white' : 'bg-white border border-slate-200 text-[#0A2A5E] hover:border-[#FFC107]'
            }`}
          >
            <Megaphone className="w-4 h-4 text-[#FFC107]" />
            Gérer Publicités ({data.billboardAds.length})
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'subscriptions' as const, label: `Abonnements & Reçus (${data.payments.length})`, icon: <CreditCard className="w-3.5 h-3.5" /> },
            { id: 'departments' as const, label: `20 Départements (${data.departments.length})`, icon: <FolderKanban className="w-3.5 h-3.5" /> },
            { id: 'reports' as const, label: `Signalements & Avis (${data.reports.length})`, icon: <Flag className="w-3.5 h-3.5" /> },
            { id: 'users' as const, label: `Utilisateurs (${data.users.length})`, icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'logs' as const, label: `Journal Actions (${data.logs.length})`, icon: <Activity className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                section === tab.id ? 'bg-[#00C2A8] text-[#0A2A5E]' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ONGLET 1 : GÉRER EXPERTS */}
      {section === 'experts' && renderProviderTable(expertAccounts, 'Métier')}

      {/* ONGLET 2 : GÉRER MARCHÉ / VENDEURS & ENTREPRISES */}
      {section === 'sellers' && (
        <div className="space-y-4">
          {renderProviderTable(marketAccounts, 'Produits / Activité')}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h2 className="font-display font-bold text-base text-[#0A2A5E]">
              Produits publiés sur le Marché ({data.materials.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {data.materials.map((m) => {
                const seller = data.providers.find((p) => p.id === m.sellerId);
                const visible = seller?.subscriptionStatus === 'ACTIF';
                return (
                  <div key={m.id} className="rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{m.name}</p>
                      <p className="text-slate-500 truncate">
                        {m.supplier} · {m.commune}
                      </p>
                      <MultiPrice amountCdf={m.priceCdf} size="xs" className="mt-1" />
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                        visible ? 'bg-[#00C2A8]/20 text-[#0A2A5E]' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {visible ? 'VISIBLE' : 'INVISIBLE'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ONGLET 3 : GÉRER EMPLOI & OFFRES */}
      {section === 'jobs' && (
        <div className="space-y-3">
          {data.jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-base text-slate-900">{job.title}</h3>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                      job.status === 'VALIDÉE'
                        ? 'bg-[#00C2A8]/20 text-[#0A2A5E]'
                        : job.status === 'EN ATTENTE'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {job.companyName} · {job.type} · {job.commune} ·{' '}
                  {job.salaryCdf ? <MultiPrice amountCdf={job.salaryCdf} inline size="xs" /> : job.salaryLabel}
                </p>
                <p className="text-xs text-slate-500">{job.description}</p>
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void handleJobAction(job.id, 'VALIDER')}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#00C2A8] text-[#0A2A5E] text-xs font-extrabold"
                >
                  <Check className="w-3.5 h-3.5" />
                  VALIDER
                </button>
                <button
                  type="button"
                  onClick={() => void handleJobAction(job.id, 'REFUSER')}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold"
                >
                  <X className="w-3.5 h-3.5" />
                  REFUSER
                </button>
                <button
                  type="button"
                  onClick={() => void handleJobAction(job.id, 'SUSPENDRE')}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  SUSPENDRE
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ONGLET 4 : GÉRER PUBLICITÉS (PANNEAU PREMIUM) */}
      {section === 'ads' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
            <strong>Règle d’or Panneau Premium :</strong> Une publicité reste <strong>INVISIBLE</strong> sur le Panneau de l’Accueil tant que vous n’avez pas cliqué sur <strong>ACTIVER PUB</strong>. Même si un prestataire a une note plus basse, s’il a payé, le Patron décide et peut l’activer.
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                    <th className="py-3 px-4">Nom / Type</th>
                    <th className="py-3 px-4">Titre de la Pub &amp; Preuve</th>
                    <th className="py-3 px-4">Durée &amp; Tarif</th>
                    <th className="py-3 px-4">Statut &amp; Date de fin</th>
                    <th className="py-3 px-4 text-right">Contrôle Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {data.billboardAds.map((ad) => {
                    const provider = data.providers.find((p) => p.id === ad.providerId);
                    return (
                      <tr key={ad.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{ad.providerName}</p>
                          <p className="text-[11px] text-slate-500">
                            {ad.accountCategory} · {ad.providerCommune}
                            {provider ? ` · Visibilité : ${provider.subscriptionStatus}` : ''}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="font-bold text-[#0A2A5E]">{ad.title}</p>
                          <p className="text-[11px] text-slate-600 line-clamp-1">{ad.description}</p>
                          <p className="text-[11px] font-bold text-[#0A2A5E] mt-0.5">
                            A payé {formatSingleCurrency(ad.paidAmount ?? ad.amountCdf, ad.currency ?? 'CDF')} par {ad.operator} · Réf : {ad.transactionRef}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-bold text-slate-900">{ad.durationDays} jours</p>
                          <MultiPrice amountCdf={ad.amountCdf} size="xs" className="mt-0.5" />
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block font-bold px-2 py-0.5 rounded text-[11px] ${
                              ad.status === 'ACTIVE'
                                ? 'bg-[#00C2A8]/20 text-[#0A2A5E]'
                                : ad.status === 'EN ATTENTE'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {ad.status}
                          </span>
                          <p className="text-[11px] text-slate-500 font-mono-num mt-1">
                            {ad.endAt ? `Fin : ${new Date(ad.endAt).toLocaleDateString('fr-FR')}` : 'Non activée'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleAdAction(ad.id, 'ACTIVER')}
                              className="px-2.5 py-1.5 rounded-lg bg-[#00C2A8] text-[#0A2A5E] font-extrabold text-[11px] whitespace-nowrap"
                            >
                              ACTIVER PUB
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleAdAction(ad.id, 'PROLONGER')}
                              className="px-2.5 py-1.5 rounded-lg bg-[#0A2A5E] text-white font-bold text-[11px] whitespace-nowrap"
                            >
                              PROLONGER
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleAdAction(ad.id, 'SUSPENDRE')}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-900 font-bold text-[11px] whitespace-nowrap"
                            >
                              SUSPENDRE
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleAdAction(ad.id, 'REFUSER')}
                              className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 font-bold text-[11px] whitespace-nowrap"
                            >
                              REFUSER
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABONNEMENTS & REÇUS */}
      {section === 'subscriptions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleUpdateSubConfig} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 h-fit">
            <h2 className="font-display font-bold text-base text-[#0A2A5E]">Tarif &amp; Durée Abonnement</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Prix mensuel (CDF)</label>
              <input
                type="number"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Durée (jours)</label>
              <input
                type="number"
                value={daysInput}
                onChange={(e) => setDaysInput(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-xl bg-[#0A2A5E] text-white text-xs font-bold">
              Enregistrer
            </button>
          </form>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h2 className="font-display font-bold text-base text-[#0A2A5E]">Historique &amp; Reçus Multi-Devises</h2>
            {data.payments.map((pay) => (
              <div key={pay.id} className="rounded-xl border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <p className="font-bold text-slate-900">
                    {pay.providerName} ({pay.accountCategory || pay.accountType})
                  </p>
                  <p className="font-bold text-[#0A2A5E] mt-0.5">
                    A payé {formatSingleCurrency(pay.paidAmount ?? pay.amountCdf, pay.currency ?? 'CDF')} par {pay.operator}
                  </p>
                  <p className="text-slate-500 font-mono-num">
                    Réf : {pay.transactionRef} · Reçu : {pay.receiptCode}
                  </p>
                </div>
                <div className="text-right">
                  <MultiPrice amountCdf={pay.amountCdf} size="xs" />
                  <p className={`${pay.status === 'Validé' ? 'text-emerald-700' : 'text-amber-700'} font-bold mt-1`}>
                    {pay.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DÉPARTEMENTS */}
      {section === 'departments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleAddDept} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 h-fit">
            <h2 className="font-display font-bold text-base text-[#0A2A5E]">Ajouter un Département</h2>
            <input
              type="text"
              required
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              placeholder="Nom du département"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={newDeptDesc}
              onChange={(e) => setNewDeptDesc(e.target.value)}
              placeholder="Description courte"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={newDeptServices}
              onChange={(e) => setNewDeptServices(e.target.value)}
              placeholder="Métiers (séparés par virgule)"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={newDeptPriority}
                onChange={(e) => setNewDeptPriority(e.target.checked)}
                className="accent-[#00C2A8]"
              />
              Prioritaire
            </label>
            <button type="submit" className="w-full py-2.5 rounded-xl bg-[#0A2A5E] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4 text-[#00C2A8]" />
              Ajouter
            </button>
          </form>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.departments.map((d) => (
              <div key={d.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-[#00C2A8]">{d.active ? 'Actif' : 'Inactif'}</p>
                  <h3 className="font-display font-bold text-sm text-slate-900">{d.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{d.services.join(', ')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void api.adminToggleDepartment(d.id).then(loadOverview)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-[11px] font-bold shrink-0"
                >
                  {d.active ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SIGNALEMENTS & AVIS */}
      {section === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h2 className="font-display font-bold text-base text-[#0A2A5E]">Signalements ({data.reports.length})</h2>
            {data.reports.map((rep) => (
              <div key={rep.id} className="rounded-xl border border-slate-200 p-3.5 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{rep.providerName}</span>
                  <span className={rep.status === 'Ouvert' ? 'text-red-700 font-bold' : 'text-emerald-700 font-bold'}>
                    {rep.status}
                  </span>
                </div>
                <p className="text-slate-600">Motif : {rep.reason}</p>
                {rep.status === 'Ouvert' && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void api.adminResolveReport(rep.id, false).then(loadOverview)}
                      className="px-3 py-1.5 rounded-lg bg-[#00C2A8] text-[#0A2A5E] font-bold"
                    >
                      Résoudre
                    </button>
                    {rep.targetType === 'review' && (
                      <button
                        type="button"
                        onClick={() => void api.adminResolveReport(rep.id, true).then(loadOverview)}
                        className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold"
                      >
                        Masquer l’avis
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h2 className="font-display font-bold text-base text-[#0A2A5E]">Modération des Avis ({data.reviews.length})</h2>
            {data.reviews.map((rev) => (
              <div key={rev.id} className="rounded-xl border border-slate-200 p-3.5 text-xs flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">
                    {rev.providerName} · {rev.rating}/5 ★
                  </p>
                  <p className="text-slate-500">Par {rev.clientName}</p>
                  <p className="text-slate-700 mt-1">{rev.comment}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void api.adminToggleReview(rev.id).then(loadOverview)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold shrink-0"
                >
                  {rev.hidden ? 'Restaurer' : 'Masquer'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UTILISATEURS */}
      {section === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-4">Nom</th>
                <th className="py-3 px-4">Rôle</th>
                <th className="py-3 px-4">Email &amp; Tél</th>
                <th className="py-3 px-4">Commune</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.users.map((u) => (
                <tr key={u.id}>
                  <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                  <td className="py-3 px-4 font-semibold text-[#0A2A5E]">{u.role}</td>
                  <td className="py-3 px-4 text-slate-600">
                    {u.email} · {u.phone}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{u.commune}</td>
                  <td className="py-3 px-4 text-right">
                    {u.role !== 'ADMIN' && (
                      <button
                        type="button"
                        onClick={() => void api.adminToggleUserSuspend(u.id).then(loadOverview)}
                        className={`px-3 py-1 rounded-lg font-bold ${
                          u.suspended ? 'bg-[#00C2A8] text-[#0A2A5E]' : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {u.suspended ? 'Réactiver' : 'Suspendre'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* JOURNAL ADMIN */}
      {section === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2.5">
          <h2 className="font-display font-bold text-base text-[#0A2A5E]">Journal des Actions Admin</h2>
          {data.logs.map((log) => (
            <div key={log.id} className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <p className="font-bold text-[#0A2A5E]">{log.action}</p>
                <p className="text-slate-600">
                  {log.targetLabel} · Par {log.adminName}
                </p>
              </div>
              <span className="font-mono-num text-slate-500">
                {new Date(log.createdAt).toLocaleString('fr-FR')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* MODAL PREUVE DE PAIEMENT */}
      {proofModalProvider && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-[#0A2A5E] flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-[#00C2A8]" />
                Preuves de Paiement — {proofModalProvider.provider.name}
              </h3>
              <button type="button" onClick={() => setProofModalProvider(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {proofModalProvider.payments.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune preuve de paiement Mobile Money enregistrée pour ce profil.</p>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {proofModalProvider.payments.map((pay) => (
                  <div key={pay.id} className="rounded-xl border border-slate-200 p-4 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-[#0A2A5E]">
                        A payé {formatSingleCurrency(pay.paidAmount ?? pay.amountCdf, pay.currency ?? 'CDF')} par {pay.operator}
                      </span>
                      <MultiPrice amountCdf={pay.amountCdf} size="xs" />
                    </div>
                    <p className="font-mono-num text-slate-700">Réf. Transaction : {pay.transactionRef}</p>
                    <p className="text-slate-500">
                      Reçu : {pay.receiptCode} · Statut : <strong>{pay.status}</strong>
                    </p>
                    {pay.proofImageName && <p className="text-slate-600">Capture : {pay.proofImageName}</p>}
                    {pay.proofDataUrl && (
                      <img src={pay.proofDataUrl} alt="Capture paiement" className="max-h-48 rounded-xl border border-slate-200 object-contain" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  void handleProviderAction(proofModalProvider.provider.id, 'ACTIVER');
                  setProofModalProvider(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#00C2A8] text-[#0A2A5E] text-xs font-extrabold"
              >
                ACTIVER 1 MOIS MAINTENANT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
