import React, { useEffect, useState } from 'react';
import { ClipboardList, MessageCircle, Package, Star, Briefcase } from 'lucide-react';
import { BRAND_INFO } from '../data/kinshasaData.ts';
import { api, buildWhatsAppLink } from '../lib/api.ts';
import { MultiPrice } from '../lib/currency.tsx';
import type { JobApplication, MaterialOrder, QuoteRequest, UserAccount } from '../types.ts';

interface OrdersViewProps {
  currentUser: UserAccount | null;
  onRequireAuth: () => void;
  onOpenSearch: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ currentUser, onRequireAuth, onOpenSearch }) => {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [materialOrders, setMaterialOrders] = useState<MaterialOrder[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(false);

  const [reviewingQuote, setReviewingQuote] = useState<QuoteRequest | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSentId, setReviewSentId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    api
      .getMyOrders()
      .then((res) => {
        setQuotes(res.quotes);
        setMaterialOrders(res.materialOrders);
        setApplications(res.applications);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentUser]);

  const handleLeaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingQuote) return;
    await api.createReview({
      providerId: reviewingQuote.providerId,
      rating,
      comment,
    });
    setReviewSentId(reviewingQuote.id);
    setReviewingQuote(null);
    setComment('');
  };

  if (!currentUser) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0A2A5E]/10 text-[#0A2A5E] flex items-center justify-center mx-auto">
            <ClipboardList className="w-7 h-7" />
          </div>
          <h1 className="font-display font-bold text-xl text-[#0A2A5E]">Suivez vos devis, commandes &amp; candidatures</h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Connectez-vous ou inscrivez-vous gratuitement en tant que Client pour suivre vos demandes de devis, commandes matériaux et avis.
          </p>
          <button
            type="button"
            onClick={onRequireAuth}
            className="px-6 py-3 rounded-xl bg-[#0A2A5E] text-white text-sm font-bold"
          >
            Me connecter / M’inscrire gratuitement
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#0A2A5E]">Mes Commandes &amp; Suivi</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Historique de vos devis experts, commandes Marché NAYOpro et candidatures
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenSearch}
          className="px-4 py-2.5 rounded-xl bg-[#00C2A8] text-[#0A2A5E] text-xs font-extrabold whitespace-nowrap self-start"
        >
          + Nouvelle demande
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">Chargement de votre historique...</p>}

      {/* Demandes de Devis */}
      <section className="space-y-3">
        <h2 className="font-display font-bold text-base text-[#0A2A5E]">Demandes de Devis ({quotes.length})</h2>
        {quotes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
            Aucune demande de devis envoyée pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {quotes.map((q) => (
              <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display font-bold text-base text-slate-900">{q.service}</h3>
                    <p className="text-xs text-slate-500">
                      Expert : {q.providerName} · {q.commune} ({q.address})
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#0A2A5E] bg-slate-100 px-3 py-1 rounded-lg">
                    {q.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{q.details}</p>
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono-num text-slate-500">
                    Date souhaitée : {q.desiredDate} · Budget : {q.budgetCdf}
                  </span>
                  <div className="flex items-center gap-2">
                    {reviewSentId === q.id ? (
                      <span className="text-emerald-700 font-semibold">Avis publié !</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setReviewingQuote(q)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FFC107]/20 text-[#0A2A5E] font-bold"
                      >
                        <Star className="w-3.5 h-3.5 fill-[#FFC107] text-[#FFC107]" />
                        Noter 1-5 ★
                      </button>
                    )}
                    <a
                      href={buildWhatsAppLink(
                        `Bonjour NAYOpro, suivi de ma demande de devis #${q.id} avec ${q.providerName}.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0A2A5E] text-white font-semibold"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#00C2A8]" />
                      WhatsApp {BRAND_INFO.phoneDisplay}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Commandes Matériaux */}
      <section className="space-y-3">
        <h2 className="font-display font-bold text-base text-[#0A2A5E] flex items-center gap-2">
          <Package className="w-4 h-4 text-[#00C2A8]" />
          Commandes Matériaux ({materialOrders.length})
        </h2>
        {materialOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
            Aucune commande matériaux enregistrée dans cette session.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {materialOrders.map((ord) => (
              <div key={ord.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-900">{ord.materialName}</h3>
                  <p className="text-xs text-slate-500">
                    Qté : {ord.quantity} · {ord.commune} · {ord.status}
                  </p>
                </div>
                <MultiPrice amountCdf={ord.totalCdf} size="sm" className="text-right" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Candidatures Emploi & Stages */}
      <section className="space-y-3">
        <h2 className="font-display font-bold text-base text-[#0A2A5E] flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-[#00C2A8]" />
          Mes Candidatures Emploi &amp; Stages ({applications.length})
        </h2>
        {applications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
            Vous n’avez pas encore postulé avec ce compte.
          </div>
        ) : (
          <div className="space-y-2.5">
            {applications.map((app) => (
              <div key={app.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-900">{app.jobTitle}</h3>
                  <p className="text-xs text-slate-500">
                    {app.companyName} · {app.commune}
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-lg bg-[#00C2A8]/15 text-[#0A2A5E]">
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal avis rapide */}
      {reviewingQuote && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleLeaveReview} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 className="font-display font-bold text-lg text-[#0A2A5E]">Noter {reviewingQuote.providerName}</h3>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} className="p-1.5">
                  <Star className={`w-6 h-6 ${n <= rating ? 'fill-[#FFC107] text-[#FFC107]' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Votre avis après la prestation..."
              className="w-full rounded-xl border border-slate-300 p-3 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReviewingQuote(null)} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold">
                Annuler
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#0A2A5E] text-white text-xs font-bold">
                Envoyer l’avis
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
