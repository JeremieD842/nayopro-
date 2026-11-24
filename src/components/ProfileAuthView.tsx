import React, { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  ShieldCheck,
  Store,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { BRAND_INFO, KINSHASA_COMMUNES } from '../data/kinshasaData.ts';
import { api } from '../lib/api.ts';
import type { DepartmentItem, ExpertProfile, UserAccount } from '../types.ts';
import { AdminDashboard } from './AdminDashboard.tsx';
import { ProviderCompanyDashboard } from './ProviderCompanyDashboard.tsx';

interface ProfileAuthViewProps {
  departments: DepartmentItem[];
  currentUser: UserAccount | null;
  initialAuthMode?: 'login' | 'client' | 'expert' | 'seller' | 'company' | 'admin';
  onAuthenticated: (token: string, user: UserAccount, provider: ExpertProfile | null, goSubscription?: boolean) => void;
  onLogout: () => void;
  onOpenSubscription: () => void;
  onViewPublicProfile: (provider: ExpertProfile) => void;
  onOpenJobsPublish: () => void;
  onOpenOrders: () => void;
  onAdminDataChanged: () => void;
}

export const ProfileAuthView: React.FC<ProfileAuthViewProps> = ({
  departments,
  currentUser,
  initialAuthMode = 'client',
  onAuthenticated,
  onLogout,
  onOpenSubscription,
  onViewPublicProfile,
  onOpenJobsPublish,
  onOpenOrders,
  onAdminDataChanged,
}) => {
  const [mode, setMode] = useState<'login' | 'client' | 'expert' | 'seller' | 'company' | 'admin'>(initialAuthMode);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [commune, setCommune] = useState('Gombe');
  const [password, setPassword] = useState('');

  const [profession, setProfession] = useState('');
  const [departmentId, setDepartmentId] = useState('batiment');
  const [priceLabel, setPriceLabel] = useState('Prix sur devis');
  const [priceCdfInput, setPriceCdfInput] = useState('');
  const [description, setDescription] = useState('');
  const [activities, setActivities] = useState('');
  const [servicesList, setServicesList] = useState('');
  const [productsSummary, setProductsSummary] = useState('');
  const [commercialOffer, setCommercialOffer] = useState('');

  const [adminEmail, setAdminEmail] = useState('dimbelejeremie50@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showForgotAdmin, setShowForgotAdmin] = useState(false);
  const [showForgotLogin, setShowForgotLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialAuthMode);
  }, [initialAuthMode]);

  if (currentUser?.role === 'ADMIN') {
    return <AdminDashboard onDataChanged={onAdminDataChanged} onLogout={onLogout} />;
  }

  if (currentUser?.role === 'PRESTATAIRE' || currentUser?.role === 'ENTREPRISE') {
    return (
      <ProviderCompanyDashboard
        currentUser={currentUser}
        onOpenSubscription={onOpenSubscription}
        onViewPublicProfile={onViewPublicProfile}
        onOpenJobsPublish={onOpenJobsPublish}
        onDataChanged={onAdminDataChanged}
        onLogout={onLogout}
      />
    );
  }

  if (currentUser?.role === 'CLIENT') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#00C2A8]">Compte Client · 100% Gratuit</p>
              <h1 className="font-display font-extrabold text-2xl text-[#0A2A5E] mt-0.5">{currentUser.name}</h1>
              <p className="text-sm text-slate-600 mt-1">
                {currentUser.email} · {currentUser.phone} · Commune : {currentUser.commune}
              </p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
          <div className="p-4 rounded-2xl bg-[#00C2A8]/10 text-xs text-[#0A2A5E] flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#00C2A8] shrink-0" />
            <span>
              Votre accès Client est 100% gratuit dans les 4 blocs (Marché, Experts, Entreprises, Emploi &amp; Stages).
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenOrders}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0A2A5E] text-white text-xs font-bold"
          >
            <ClipboardList className="w-4 h-4 text-[#00C2A8]" />
            Voir Mes Commandes, Devis &amp; Candidatures
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.login(email, password);
        onAuthenticated(res.token, res.user, res.provider, false);
      } else if (mode === 'client') {
        const res = await api.register({ role: 'CLIENT', name, email, phone, commune, password });
        onAuthenticated(res.token, res.user, res.provider, false);
      } else if (mode === 'expert' || mode === 'seller') {
        const parsedCdf = Number(priceCdfInput);
        const res = await api.register({
          role: 'PRESTATAIRE',
          accountCategory: mode === 'seller' ? 'VENDEUR' : 'EXPERT',
          name,
          email,
          phone,
          commune,
          password,
          profession: profession || (mode === 'seller' ? 'Vendeur Matériaux' : 'Expert Indépendant'),
          departmentId,
          priceCdf: Number.isFinite(parsedCdf) && parsedCdf > 0 ? parsedCdf : undefined,
          priceLabel,
          description,
        });
        onAuthenticated(res.token, res.user, res.provider, true);
      } else if (mode === 'company') {
        const parsedCdf = Number(priceCdfInput);
        const res = await api.register({
          role: 'ENTREPRISE',
          accountCategory: 'ENTREPRISE',
          name,
          email,
          phone,
          commune,
          password,
          profession: profession || 'Entreprise Générale & Services',
          departmentId,
          priceCdf: Number.isFinite(parsedCdf) && parsedCdf > 0 ? parsedCdf : undefined,
          priceLabel: priceLabel || 'Sur devis entreprise',
          description,
          activities,
          servicesList,
          productsSummary,
          commercialOffer,
        });
        onAuthenticated(res.token, res.user, res.provider, true);
      } else if (mode === 'admin') {
        const res = await api.adminLogin(adminPassword, adminEmail);
        onAuthenticated(res.token, res.user, null, false);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (
    persona: 'CLIENT' | 'EXPERT_PENDING' | 'ENTREPRISE_PENDING' | 'PRESTATAIRE' | 'VENDEUR' | 'ENTREPRISE'
  ) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await api.demoSession(persona);
      onAuthenticated(res.token, res.user, res.provider, false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur accès démo.');
    } finally {
      setLoading(false);
    }
  };

  const isPaidRole = mode === 'expert' || mode === 'seller' || mode === 'company';

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display font-extrabold text-2xl text-[#0A2A5E]">
              Espace Compte &amp; Inscription NAYOpro
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Client gratuit · Expert, Vendeur Marché &amp; Entreprise sur abonnement 1 mois validé par l’Admin
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenOrders}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-[#0A2A5E]"
          >
            <ClipboardList className="w-4 h-4 text-[#00C2A8]" />
            Mes Commandes
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'client' as const, label: 'Client (Gratuit)', icon: <UserCheck className="w-4 h-4" /> },
            { id: 'expert' as const, label: 'Expert (Savoir-faire)', icon: <Wrench className="w-4 h-4" /> },
            { id: 'seller' as const, label: 'Vendeur Marché', icon: <Store className="w-4 h-4" /> },
            { id: 'company' as const, label: 'Entreprise', icon: <Building2 className="w-4 h-4" /> },
            { id: 'login' as const, label: 'Connexion', icon: <KeyRound className="w-4 h-4" /> },
            { id: 'admin' as const, label: 'Admin (Patron)', icon: <ShieldCheck className="w-4 h-4" /> },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setMode(t.id);
                setErrorMsg(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors min-h-[42px] ${
                mode === t.id ? 'bg-[#0A2A5E] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {errorMsg && <div className="p-3.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'admin' ? (
            <div className="max-w-md space-y-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <h2 className="font-display font-bold text-base text-[#0A2A5E]">
                  Connexion Administrateur NAYOpro
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Emails Admin autorisés : <strong>dimbelejeremie50@gmail.com</strong> ou <strong>{BRAND_INFO.email}</strong>. Accès direct aux 4 onglets Admin.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Administrateur</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="dimbelejeremie50@gmail.com ou nayopro2@gmail.com"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white text-slate-900 font-semibold"
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(['dimbelejeremie50@gmail.com', 'nayopro2@gmail.com'] as const).map((mail) => (
                    <button
                      key={mail}
                      type="button"
                      onClick={() => setAdminEmail(mail)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
                        adminEmail.toLowerCase() === mail
                          ? 'bg-[#0A2A5E] text-white border-[#0A2A5E]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-[#00C2A8]'
                      }`}
                    >
                      {mail}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mot de passe Administrateur</label>
                <div className="relative">
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Entrez le mot de passe Admin"
                    className="w-full rounded-xl border border-slate-300 pl-3.5 pr-11 py-2.5 text-sm bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword((v) => !v)}
                    aria-label={showAdminPassword ? 'Masquer le mot de passe' : 'Voir le mot de passe'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-[#0A2A5E]"
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full min-h-[46px] rounded-xl bg-[#0A2A5E] text-white text-sm font-bold">
                {loading ? 'Connexion...' : 'Accéder au Tableau de Bord Admin'}
              </button>
              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={() => setShowForgotAdmin((v) => !v)}
                  className="text-xs font-semibold text-[#0A2A5E] underline hover:text-[#00C2A8]"
                >
                  Mot de passe oublié ?
                </button>
                {showForgotAdmin && (
                  <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-950">
                    Contactez le Patron : nayopro2@gmail.com / +243 821 338 794 pour réinitialiser
                  </p>
                )}
              </div>
            </div>
          ) : mode === 'login' ? (
            <div className="max-w-md space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-3.5 pr-11 py-2.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((v) => !v)}
                    aria-label={showLoginPassword ? 'Masquer le mot de passe' : 'Voir le mot de passe'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-[#0A2A5E]"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full min-h-[46px] rounded-xl bg-[#0A2A5E] text-white text-sm font-bold">
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={() => setShowForgotLogin((v) => !v)}
                  className="text-xs font-semibold text-[#0A2A5E] underline hover:text-[#00C2A8]"
                >
                  Mot de passe oublié ?
                </button>
                {showForgotLogin && (
                  <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-950">
                    Contactez le Patron : nayopro2@gmail.com / +243 821 338 794 pour réinitialiser
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {mode === 'company' ? 'Nom de la société' : mode === 'seller' ? 'Nom du dépôt / vendeur' : 'Nom complet'}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={mode === 'company' ? 'Ex. Kinshasa BTP SARL' : mode === 'seller' ? 'Ex. Dépôt Sable Limete' : 'Ex. Fabrice Nsimba'}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone WhatsApp</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+243 8XX XXX XXX"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@exemple.cd"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Commune</label>
                  <select
                    value={commune}
                    onChange={(e) => setCommune(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white"
                  >
                    {KINSHASA_COMMUNES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mot de passe (min. 6 car.)</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>

              {isPaidRole && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {mode === 'seller' ? 'Produits vendus' : mode === 'company' ? 'Activités principales' : 'Métier / Savoir-faire'}
                      </label>
                      <input
                        type="text"
                        required
                        value={profession}
                        onChange={(e) => setProfession(e.target.value)}
                        placeholder={
                          mode === 'seller'
                            ? 'Ex. Ciment, Fer, Tôles, Sable'
                            : mode === 'company'
                              ? 'Ex. BTP & Négoce'
                              : 'Ex. Plombier, Mécanicien'
                        }
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Département</label>
                      <select
                        value={departmentId}
                        onChange={(e) => setDepartmentId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white"
                      >
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Tarif indicatif (CDF — converti auto en $ et €)</label>
                      <input
                        type="number"
                        min={0}
                        value={priceCdfInput}
                        onChange={(e) => {
                          setPriceCdfInput(e.target.value);
                          setPriceLabel(e.target.value ? `${e.target.value} CDF` : 'Prix sur devis');
                        }}
                        placeholder="Ex. 40000"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono-num"
                      />
                    </div>
                  </div>

                  {mode === 'company' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <input
                        type="text"
                        value={activities}
                        onChange={(e) => setActivities(e.target.value)}
                        placeholder="Activités (virgules)"
                        className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                      />
                      <input
                        type="text"
                        value={servicesList}
                        onChange={(e) => setServicesList(e.target.value)}
                        placeholder="Services (virgules)"
                        className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                      />
                      <input
                        type="text"
                        value={productsSummary}
                        onChange={(e) => setProductsSummary(e.target.value)}
                        placeholder="Produits (virgules)"
                        className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={3}
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Présentez votre offre, vos produits ou votre expertise..."
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>

                  {mode === 'company' && (
                    <input
                      type="text"
                      value={commercialOffer}
                      onChange={(e) => setCommercialOffer(e.target.value)}
                      placeholder="Première offre commerciale (facultatif)"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  )}

                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
                    Règle d’or : votre compte démarre en <strong>EN ATTENTE / INVISIBLE</strong>. Il devient visible dès que vous payez l’abonnement 1 mois et que l’Admin clique <strong>ACTIVER 1 MOIS</strong>.
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="min-h-[48px] px-6 rounded-xl bg-[#00C2A8] text-[#0A2A5E] text-sm font-extrabold hover:bg-[#00d4b7] transition-colors"
              >
                {loading
                  ? 'Enregistrement...'
                  : mode === 'client'
                    ? 'Créer mon compte Client (100% Gratuit)'
                    : mode === 'expert'
                      ? "Créer mon profil Expert - M'abonner"
                      : mode === 'seller'
                        ? "Créer mon compte Vendeur Marché - M'abonner"
                        : "Créer mon profil Entreprise - M'abonner"}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Comptes démo prêts à tester sans inscription */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div>
          <h2 className="font-display font-bold text-base text-[#0A2A5E]">
            Comptes Démo Prêts à Tester (cliquez pour ouvrir)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cliquez sur une carte ci-dessous ou utilisez ces identifiants dans l’onglet Connexion.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleQuickDemo('CLIENT')}
            className="text-left p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:border-[#00C2A8] transition-colors space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-[#0A2A5E]">1. Client Démo</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#00C2A8]/20 text-[#0A2A5E]">100% GRATUIT</span>
            </div>
            <p className="text-xs text-slate-600 font-mono-num">Email : client@test.com</p>
            <p className="text-xs text-slate-600 font-mono-num">Mot de passe : 123456</p>
            <p className="text-[11px] font-bold text-[#00C2A8] pt-1">Cliquer pour tester →</p>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => void handleQuickDemo('EXPERT_PENDING')}
            className="text-left p-4 rounded-2xl border border-amber-200 bg-amber-50/60 hover:border-[#0A2A5E] transition-colors space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-[#0A2A5E]">2. Expert Démo (Plombier Bandal)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">EN ATTENTE</span>
            </div>
            <p className="text-xs text-slate-600 font-mono-num">Email : expert@test.com</p>
            <p className="text-xs text-slate-600 font-mono-num">Mot de passe : 123456</p>
            <p className="text-[11px] text-amber-900">Invisible aux clients avant activation Admin →</p>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => void handleQuickDemo('ENTREPRISE_PENDING')}
            className="text-left p-4 rounded-2xl border border-amber-200 bg-amber-50/60 hover:border-[#0A2A5E] transition-colors space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-[#0A2A5E]">3. Entreprise Démo (Gombe)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">EN ATTENTE</span>
            </div>
            <p className="text-xs text-slate-600 font-mono-num">Email : entreprise@test.com</p>
            <p className="text-xs text-slate-600 font-mono-num">Mot de passe : 123456</p>
            <p className="text-[11px] text-amber-900">Construction Gombe · En attente d’activation →</p>
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500">Voir aussi comptes déjà actifs :</span>
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleQuickDemo('PRESTATAIRE')}
            className="px-3 py-1.5 rounded-xl bg-[#00C2A8]/15 hover:bg-[#00C2A8]/25 text-[11px] font-bold text-[#0A2A5E]"
          >
            Expert Actif (Patrick Mukendi)
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleQuickDemo('VENDEUR')}
            className="px-3 py-1.5 rounded-xl bg-[#0A2A5E]/10 hover:bg-[#0A2A5E]/20 text-[11px] font-bold text-[#0A2A5E]"
          >
            Vendeur Marché Actif (Dépôt Limete)
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleQuickDemo('ENTREPRISE')}
            className="px-3 py-1.5 rounded-xl bg-[#FFC107]/25 hover:bg-[#FFC107]/40 text-[11px] font-bold text-[#0A2A5E]"
          >
            Entreprise Active (Congo Bâtiment)
          </button>
        </div>
      </div>
    </div>
  );
};
