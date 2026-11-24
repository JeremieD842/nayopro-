import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Mail,
  MessageCircle,
  Phone,
  ShieldAlert,
  Smartphone,
  Upload,
} from 'lucide-react';
import { BRAND_INFO } from '../data/kinshasaData.ts';
import { api, buildWhatsAppLink } from '../lib/api.ts';
import {
  MultiPrice,
  formatPriceInCurrency,
  getOperatorsForCurrency,
  useCurrency,
} from '../lib/currency.tsx';
import type { CurrencyCode, ExpertProfile, PaymentOperator, SubscriptionConfig, UserAccount } from '../types.ts';

interface SubscriptionPageProps {
  currentUser: UserAccount | null;
  currentProvider: ExpertProfile | null;
  subscriptionConfig: SubscriptionConfig;
  onProofSubmitted: (updatedProvider: ExpertProfile) => void;
  onGoToProfile: () => void;
}

export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({
  currentUser,
  currentProvider,
  subscriptionConfig,
  onProofSubmitted,
  onGoToProfile,
}) => {
  const { currency: globalCurrency, rates } = useCurrency();
  const [payCurrency, setPayCurrency] = useState<CurrencyCode>(globalCurrency);
  const [operator, setOperator] = useState<PaymentOperator>(getOperatorsForCurrency(globalCurrency)[0]);
  const [transactionRef, setTransactionRef] = useState('');
  const [proofImageName, setProofImageName] = useState('');
  const [proofDataUrl, setProofDataUrl] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationMsg, setConfirmationMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSelectPayCurrency = (next: CurrencyCode) => {
    setPayCurrency(next);
    const ops = getOperatorsForCurrency(next);
    if (!ops.includes(operator)) {
      setOperator(ops[0]);
    }
  };

  const availableOperators = getOperatorsForCurrency(payCurrency);
  const formattedDue = formatPriceInCurrency(subscriptionConfig.monthlyPriceCdf, payCurrency, rates);

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    if (file.size > 1_800_000) {
      setErrorMsg('L’image de preuve doit faire moins de 1,8 Mo.');
      return;
    }
    setProofImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProofDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await api.submitSubscriptionProof({
        currency: payCurrency,
        operator,
        transactionRef,
        proofImageName,
        proofDataUrl,
      });
      setConfirmationMsg(res.message);
      setTransactionRef('');
      setProofImageName('');
      setProofDataUrl(undefined);
      onProofSubmitted(res.provider);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors de l’envoi de la preuve.');
    } finally {
      setSubmitting(false);
    }
  };

  const canPay = currentUser && (currentUser.role === 'PRESTATAIRE' || currentUser.role === 'ENTREPRISE');

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      <div className="bg-[#0A2A5E] text-white rounded-3xl p-6 sm:p-8 space-y-2">
        <p className="text-xs font-semibold text-[#FFC107]">Abonnement 1 Mois (30 jours) · 0% Commission sur vos gains</p>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl">
          Activez votre visibilité sur NAYOpro
        </h1>
        <p className="text-sm sm:text-base text-slate-200 max-w-2xl">
          Pour être visible et recevoir des clients pendant 30 jours, payez votre abonnement.
        </p>
      </div>

      {!canPay ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 text-center space-y-4">
          <ShieldAlert className="w-10 h-10 text-[#FFC107] mx-auto" />
          <h2 className="font-display font-bold text-lg text-[#0A2A5E]">
            Créez d’abord votre profil Expert ou Entreprise
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Les clients utilisent NAYOpro 100% gratuitement. L’abonnement mensuel concerne uniquement les Prestataires et les Entreprises.
          </p>
          <button
            type="button"
            onClick={onGoToProfile}
            className="px-6 py-3 rounded-xl bg-[#0A2A5E] text-white text-sm font-bold"
          >
            Créer mon profil Expert / Entreprise
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <p className="text-xs font-semibold text-slate-500">Tarif mensuel unique (3 devises)</p>
              <MultiPrice amountCdf={subscriptionConfig.monthlyPriceCdf} size="lg" />
              <p className="text-xs text-slate-600">
                Durée : <strong>{subscriptionConfig.durationDays} jours</strong> · Toutes demandes de devis illimitées · Aucune commission sur vos prestations.
              </p>

              {currentProvider && (
                <div className="pt-3 border-t border-slate-100 text-xs space-y-1">
                  <p>
                    Profil : <strong>{currentProvider.name}</strong>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#00C2A8]" />
                    Statut actuel :{' '}
                    <strong className="text-[#0A2A5E]">{currentProvider.subscriptionStatus}</strong>
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2.5 text-xs text-slate-600">
              <p className="font-display font-bold text-sm text-[#0A2A5E]">Instructions de Paiement</p>
              <p>1. Choisissez votre devise : <strong>CDF</strong>, <strong>$</strong> ou <strong>€</strong>.</p>
              <p>
                2. En <strong>CDF / $</strong> : payez par Orange Money, Airtel Money ou M-Pesa sur{' '}
                <strong className="text-[#0A2A5E] font-mono-num">{BRAND_INFO.phoneDisplay}</strong>.
              </p>
              <p>
                3. En <strong>€</strong> : utilisez Transfert Bancaire, Carte, Western Union ou MoneyGram (contact : {BRAND_INFO.email}).
              </p>
              <p>4. Indiquez la référence et cliquez sur « J’ai payé - Envoyer ma preuve ».</p>
            </div>
          </div>

          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            {confirmationMsg ? (
              <div className="p-5 rounded-2xl bg-[#00C2A8]/15 border border-[#00C2A8]/30 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#0A2A5E] shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-[#0A2A5E] leading-relaxed">{confirmationMsg}</p>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <a
                    href={buildWhatsAppLink(
                      `Bonjour NAYOpro, je viens d'envoyer ma preuve de paiement Mobile Money pour activer mon profil : ${currentProvider?.name}.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A2A5E] text-white text-xs font-bold"
                  >
                    <MessageCircle className="w-4 h-4 text-[#00C2A8]" />
                    Notifier sur WhatsApp ({BRAND_INFO.phoneDisplay})
                  </a>
                  <button
                    type="button"
                    onClick={onGoToProfile}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
                  >
                    Retour à mon Tableau de Bord
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitProof} className="space-y-4">
                <h2 className="font-display font-bold text-lg text-[#0A2A5E]">Envoyer ma preuve de paiement</h2>
                {errorMsg && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">{errorMsg}</div>}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Devise de paiement choisie
                  </label>
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
                        onClick={() => handleSelectPayCurrency(item.code)}
                        className={`min-h-[44px] px-2.5 py-2 rounded-xl border text-xs font-extrabold transition-colors ${
                          payCurrency === item.code
                            ? 'bg-[#FFC107] text-[#0A2A5E] border-[#FFC107]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-[#00C2A8]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    {payCurrency === 'EUR' ? 'Moyen de paiement (€)' : `Opérateur Mobile Money (${payCurrency === 'USD' ? '$' : 'CDF'})`}
                  </label>
                  <div className={`grid gap-2.5 ${availableOperators.length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {availableOperators.map((op) => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => setOperator(op)}
                        className={`min-h-[46px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                          operator === op
                            ? 'bg-[#0A2A5E] text-white border-[#0A2A5E]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-[#00C2A8]'
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5 text-[#00C2A8] shrink-0" />
                        <span className="truncate">{op}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Numéro / Référence de transaction ({operator} · {formattedDue})
                  </label>
                  <input
                    type="text"
                    required
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="Ex. MP261124.1015.X92814"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono-num"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Capture d’écran du SMS / reçu (facultatif)
                  </label>
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-[#0A2A5E] bg-slate-50 hover:bg-slate-100 cursor-pointer">
                    <Upload className="w-4 h-4 text-[#00C2A8]" />
                    <span>{proofImageName ? `Capture jointe : ${proofImageName}` : 'Joindre une capture (PNG/JPG)'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[48px] rounded-xl bg-[#00C2A8] text-[#0A2A5E] text-sm font-extrabold hover:bg-[#00d4b7] transition-colors"
                >
                  {submitting ? 'Envoi en cours...' : `J'ai payé ${formattedDue} (${operator}) - Envoyer ma preuve`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Contacts obligatoires sur la page Abonnement */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-slate-600">
          Validation &amp; support abonnement NAYOpro ({BRAND_INFO.founder}) :
        </span>
        <div className="flex flex-wrap items-center gap-4 font-semibold text-[#0A2A5E]">
          <a href={`mailto:${BRAND_INFO.email}`} className="inline-flex items-center gap-1.5 hover:underline">
            <Mail className="w-4 h-4 text-[#00C2A8]" />
            {BRAND_INFO.email}
          </a>
          <a href={`tel:${BRAND_INFO.phoneRaw}`} className="inline-flex items-center gap-1.5 hover:underline">
            <Phone className="w-4 h-4 text-[#00C2A8]" />
            {BRAND_INFO.phoneDisplay}
          </a>
        </div>
      </div>
    </div>
  );
};
