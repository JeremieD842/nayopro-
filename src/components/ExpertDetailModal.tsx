import React, { useState } from 'react';
import {
  BadgeCheck,
  Flag,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Star,
  X,
} from 'lucide-react';
import { BRAND_INFO, KINSHASA_COMMUNES } from '../data/kinshasaData.ts';
import { api, buildWhatsAppLink } from '../lib/api.ts';
import { MultiPrice } from '../lib/currency.tsx';
import type { ExpertProfile, Review, UserAccount } from '../types.ts';
import { ExpertAvatar, RealizationVisual } from './BrandVisuals.tsx';

interface ExpertDetailModalProps {
  expert: ExpertProfile;
  reviews: Review[];
  currentUser: UserAccount | null;
  onClose: () => void;
  onRequireAuth: () => void;
  onQuoteCreated: () => void;
  onReviewCreated: (review: Review, updatedProvider: ExpertProfile) => void;
}

export const ExpertDetailModal: React.FC<ExpertDetailModalProps> = ({
  expert,
  reviews,
  currentUser,
  onClose,
  onRequireAuth,
  onQuoteCreated,
  onReviewCreated,
}) => {
  const expertReviews = reviews.filter((r) => r.providerId === expert.id && !r.hidden);
  const [activePanel, setActivePanel] = useState<'profile' | 'quote' | 'review' | 'report'>('profile');

  // Formulaire Demande de Devis
  const [service, setService] = useState(expert.profession);
  const [commune, setCommune] = useState(currentUser?.commune || expert.commune);
  const [address, setAddress] = useState('');
  const [details, setDetails] = useState('');
  const [desiredDate, setDesiredDate] = useState('2026-11-30');
  const [budgetCdf, setBudgetCdf] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Avis 1..5 étoiles
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // Signalement
  const [reportReason, setReportReason] = useState('');
  const [reportTarget, setReportTarget] = useState<{ type: 'provider' | 'review'; id: string }>({
    type: 'provider',
    id: expert.id,
  });
  const [reportDone, setReportDone] = useState(false);

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    setQuoteLoading(true);
    try {
      await api.createQuote({
        providerId: expert.id,
        service,
        commune,
        address,
        details,
        desiredDate,
        budgetCdf,
        photoName,
      });
      setQuoteMessage(
        `Votre demande de devis a été transmise à ${expert.name}. Vous pouvez aussi poursuivre directement sur WhatsApp (${BRAND_INFO.phoneDisplay}).`
      );
      onQuoteCreated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Impossible d’envoyer la demande.');
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    setReviewLoading(true);
    try {
      const res = await api.createReview({ providerId: expert.id, rating, comment });
      onReviewCreated(res.review, res.provider);
      setComment('');
      setActivePanel('profile');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors de la publication de l’avis.');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await api.createReport({
        targetType: reportTarget.type,
        targetId: reportTarget.id,
        providerId: expert.id,
        reason: reportReason,
      });
      setReportDone(true);
      setReportReason('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors du signalement.');
    }
  };

  const waQuoteHref = buildWhatsAppLink(
    `Bonjour NAYOpro, je demande un devis gratuit pour ${expert.name} (${expert.profession} à ${expert.commune}). Service : ${service}. Commune : ${commune}.`
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl max-h-[92vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-slate-200">
        {/* Header modal */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-[#0A2A5E] text-white">
          <div className="min-w-0">
            <p className="text-xs text-[#00C2A8] font-semibold">
              {expert.accountType === 'ENTREPRISE' ? 'Entreprise NAYOpro' : 'Expert NAYOpro'} · {expert.commune}
            </p>
            <h2 className="font-display font-bold text-lg truncate">{expert.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fiche"
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu défilant */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Résumé haut de fiche */}
          <div className="flex items-start gap-4">
            <ExpertAvatar name={expert.name} avatarKey={expert.avatarKey} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-base text-[#0A2A5E]">{expert.profession}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#00C2A8]" />
                  Zones : {expert.zones.join(', ')}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-slate-900 font-mono-num">
                  <Star className="w-3.5 h-3.5 fill-[#FFC107] text-[#FFC107]" />
                  {expert.rating > 0 ? `${expert.rating.toFixed(1)} (${expert.reviewCount} avis)` : 'Nouvel expert'}
                </span>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs">
                <span
                  className={`font-semibold px-2.5 py-1 rounded-lg ${
                    expert.availability === 'Disponible'
                      ? 'bg-[#00C2A8]/15 text-[#0A2A5E]'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  Statut : {expert.availability}
                </span>
                {expert.priceCdf ? (
                  <MultiPrice amountCdf={expert.priceCdf} inline size="xs" />
                ) : (
                  <span className="font-mono-num font-bold text-[#0A2A5E]">{expert.priceLabel}</span>
                )}
                {expert.verified && (
                  <span className="inline-flex items-center gap-1 font-semibold text-[#0A2A5E]">
                    <BadgeCheck className="w-4 h-4 text-[#00C2A8]" />
                    Trust Passport Vérifié
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Onglets internes fiche */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => {
                setActivePanel('profile');
                setErrorMsg(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
                activePanel === 'profile' ? 'bg-[#0A2A5E] text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Profil &amp; Réalisations
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePanel('quote');
                setErrorMsg(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
                activePanel === 'quote' ? 'bg-[#00C2A8] text-[#0A2A5E]' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Formulaire Devis Gratuit
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePanel('review');
                setErrorMsg(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
                activePanel === 'review' ? 'bg-[#FFC107] text-[#0A2A5E]' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Laisser un Avis
            </button>
            <button
              type="button"
              onClick={() => {
                setReportTarget({ type: 'provider', id: expert.id });
                setActivePanel('report');
                setErrorMsg(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
                activePanel === 'report' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Signaler
            </button>
          </div>

          {errorMsg && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium">{errorMsg}</div>}

          {activePanel === 'profile' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-display font-bold text-sm text-[#0A2A5E] mb-1.5">Présentation</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{expert.description}</p>
              </div>

              {expert.commercialOffers && expert.commercialOffers.length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-sm text-[#0A2A5E] mb-2">Offres Commerciales</h3>
                  <ul className="space-y-2">
                    {expert.commercialOffers.map((offer, i) => (
                      <li key={i} className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3">
                        {offer}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="font-display font-bold text-sm text-[#0A2A5E] mb-2">Réalisations à Kinshasa</h3>
                {expert.realizations.length === 0 ? (
                  <p className="text-xs text-slate-500">Aucune réalisation ajoutée pour le moment.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {expert.realizations.map((real) => (
                      <RealizationVisual key={real.id} title={real.title} commune={real.commune} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-display font-bold text-sm text-[#0A2A5E] mb-2">
                  Avis Clients ({expertReviews.length})
                </h3>
                {expertReviews.length === 0 ? (
                  <p className="text-xs text-slate-500">Aucun avis pour l’instant. Soyez le premier à noter cet expert.</p>
                ) : (
                  <div className="space-y-2.5">
                    {expertReviews.map((rev) => (
                      <div key={rev.id} className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/70">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900">{rev.clientName}</span>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-0.5 text-xs font-mono-num font-bold text-[#0A2A5E]">
                              <Star className="w-3.5 h-3.5 fill-[#FFC107] text-[#FFC107]" />
                              {rev.rating}/5
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setReportTarget({ type: 'review', id: rev.id });
                                setActivePanel('report');
                              }}
                              title="Signaler cet avis"
                              className="text-slate-400 hover:text-red-600 p-1"
                            >
                              <Flag className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">{rev.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activePanel === 'quote' && (
            <form onSubmit={handleQuoteSubmit} className="space-y-3.5">
              <h3 className="font-display font-bold text-base text-[#0A2A5E]">Demande de Devis Gratuit</h3>
              {quoteMessage ? (
                <div className="p-4 rounded-2xl bg-[#00C2A8]/15 border border-[#00C2A8]/30 space-y-3">
                  <p className="text-sm font-semibold text-[#0A2A5E]">{quoteMessage}</p>
                  <a
                    href={waQuoteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A2A5E] text-white text-xs font-bold"
                  >
                    <MessageCircle className="w-4 h-4 text-[#00C2A8]" />
                    Continuer sur WhatsApp ({BRAND_INFO.phoneDisplay})
                  </a>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Service demandé</label>
                      <input
                        type="text"
                        required
                        value={service}
                        onChange={(e) => setService(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Commune</label>
                      <select
                        value={commune}
                        onChange={(e) => setCommune(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                      >
                        {KINSHASA_COMMUNES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse / Point de repère</label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Ex. Avenue Libération, réf. arrêt..."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Détails du besoin</label>
                    <textarea
                      rows={3}
                      required
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="Décrivez les travaux ou la prestation attendue..."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Date souhaitée</label>
                      <input
                        type="date"
                        value={desiredDate}
                        onChange={(e) => setDesiredDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Budget estimé (CDF)</label>
                      <input
                        type="text"
                        value={budgetCdf}
                        onChange={(e) => setBudgetCdf(e.target.value)}
                        placeholder="Ex. 100 000 CDF"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Photo (facultative)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPhotoName(e.target.files?.[0]?.name || '')}
                        className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={quoteLoading}
                    className="w-full min-h-[46px] rounded-xl bg-[#0A2A5E] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#0D3678] disabled:opacity-60"
                  >
                    <Send className="w-4 h-4 text-[#00C2A8]" />
                    {quoteLoading
                      ? 'Envoi en cours...'
                      : currentUser
                        ? 'Envoyer la Demande au Prestataire Actif'
                        : 'Se connecter gratuitement pour envoyer'}
                  </button>
                </>
              )}
            </form>
          )}

          {activePanel === 'review' && (
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <h3 className="font-display font-bold text-base text-[#0A2A5E]">Noter cet expert (1 à 5 étoiles)</h3>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className="p-2 rounded-xl border border-slate-200 hover:border-[#FFC107]"
                    aria-label={`${n} étoile(s)`}
                  >
                    <Star className={`w-6 h-6 ${n <= rating ? 'fill-[#FFC107] text-[#FFC107]' : 'text-slate-300'}`} />
                  </button>
                ))}
                <span className="text-sm font-mono-num font-bold text-[#0A2A5E] ml-2">{rating}/5</span>
              </div>
              <textarea
                rows={3}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Partagez votre expérience avec cet expert à Kinshasa..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
              />
              <button
                type="submit"
                disabled={reviewLoading}
                className="w-full min-h-[46px] rounded-xl bg-[#0A2A5E] text-white text-sm font-bold"
              >
                {reviewLoading ? 'Publication...' : currentUser ? 'Publier mon avis' : 'Connectez-vous pour noter'}
              </button>
            </form>
          )}

          {activePanel === 'report' && (
            <form onSubmit={handleReportSubmit} className="space-y-4">
              <h3 className="font-display font-bold text-base text-red-700">
                Signaler {reportTarget.type === 'review' ? 'un avis abusif' : 'un problème avec ce profil'}
              </h3>
              {reportDone ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold">
                  Signalement transmis à l’administrateur NAYOpro. Merci de votre vigilance.
                </div>
              ) : (
                <>
                  <textarea
                    rows={3}
                    required
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Expliquez la raison du signalement..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                  />
                  <button
                    type="submit"
                    className="w-full min-h-[44px] rounded-xl bg-red-600 text-white text-sm font-bold"
                  >
                    Envoyer le signalement à l’Admin
                  </button>
                </>
              )}
            </form>
          )}
        </div>

        {/* Barre d'actions directe bas de fiche */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 grid grid-cols-2 gap-3">
          <a
            href={waQuoteHref}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[46px] rounded-xl bg-[#00C2A8] text-[#0A2A5E] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-[#00d4b7] transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Demander un Devis Gratuit
          </a>
          <a
            href={`tel:${expert.phone.replace(/\s+/g, '')}`}
            className="min-h-[46px] rounded-xl bg-[#0A2A5E] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-[#0D3678] transition-colors"
          >
            <Phone className="w-4 h-4 text-[#FFC107]" />
            Appeler
          </a>
        </div>
      </div>
    </div>
  );
};
