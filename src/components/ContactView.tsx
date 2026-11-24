import React, { useState } from 'react';
import { Mail, MapPin, MessageCircle, Phone, ShieldCheck, UserCheck } from 'lucide-react';
import { BRAND_INFO, KINSHASA_COMMUNES } from '../data/kinshasaData.ts';
import { buildWhatsAppLink } from '../lib/api.ts';

export const ContactView: React.FC = () => {
  const [name, setName] = useState('');
  const [commune, setCommune] = useState('Gombe');
  const [subject, setSubject] = useState('Demande de renseignements');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    const fullText = `Bonjour NAYOpro (${subject})\nNom : ${name || 'Visiteur'}\nCommune : ${commune}\nMessage : ${message}`;
    window.open(buildWhatsAppLink(fullText), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      <div className="bg-[#0A2A5E] text-white rounded-2xl p-6 sm:p-8">
        <p className="text-xs font-semibold text-[#FFC107] uppercase tracking-wider">Support &amp; Accompagnement</p>
        <h1 className="font-display font-bold text-2xl sm:text-3xl mt-1">Contacter NAYOpro Kinshasa</h1>
        <p className="text-sm text-slate-200 mt-2 max-w-2xl">
          Une question sur un devis, une commande de matériaux, un abonnement expert/entreprise ou une offre d’emploi ?
          Notre équipe vous répond rapidement par WhatsApp, téléphone ou email.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h2 className="font-display font-bold text-lg text-[#0A2A5E]">Coordonnées Officielles</h2>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0A2A5E]/10 text-[#0A2A5E] flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Fondateur</p>
                <p className="font-semibold text-slate-900">{BRAND_INFO.founder}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00C2A8]/15 text-[#0A2A5E] flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Téléphone / WhatsApp</p>
                <a href={`tel:${BRAND_INFO.phoneRaw}`} className="font-semibold text-[#0A2A5E] hover:underline">
                  {BRAND_INFO.phoneDisplay}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFC107]/20 text-[#0A2A5E] flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Email officiel</p>
                <a href={`mailto:${BRAND_INFO.email}`} className="font-semibold text-[#0A2A5E] hover:underline">
                  {BRAND_INFO.email}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Siège &amp; Couverture</p>
                <p className="font-semibold text-slate-900">{BRAND_INFO.city} (Toutes les communes)</p>
              </div>
            </div>

            <a
              href={buildWhatsAppLink("Bonjour NAYOpro, j'aimerais discuter avec le support.")}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#00C2A8] text-[#0A2A5E] font-bold text-sm hover:bg-[#00d4b7] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Ouvrir WhatsApp ({BRAND_INFO.phoneDisplay})
            </a>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#00C2A8] shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>Zéro commission sur prestations :</strong> NAYOpro met en relation directe clients et experts à Kinshasa. Seul l’abonnement mensuel des prestataires et entreprises finance la plateforme.
            </p>
          </div>
        </div>

        <form onSubmit={handleSendWhatsApp} className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-display font-bold text-lg text-[#0A2A5E]">Envoyer un message direct</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Votre nom</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Patrick Kabeya"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#00C2A8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Commune</label>
              <select
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:border-[#00C2A8] focus:outline-none"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Sujet</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:border-[#00C2A8] focus:outline-none"
            >
              <option value="Demande de renseignements">Demande de renseignements</option>
              <option value="Validation abonnement 1 mois">Validation abonnement 1 mois</option>
              <option value="Commande matériaux NAYOpro">Commande matériaux NAYOpro</option>
              <option value="Recrutement / Offre d'emploi">Recrutement / Offre d’emploi</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Votre message</label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Décrivez votre besoin..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#00C2A8] focus:outline-none"
            />
          </div>

          {sent && (
            <div className="p-3 rounded-xl bg-[#00C2A8]/15 text-[#0A2A5E] text-xs font-medium">
              Message prêt pour WhatsApp ({BRAND_INFO.phoneDisplay}) · Vous pouvez aussi écrire à {BRAND_INFO.email}.
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0A2A5E] text-white font-semibold text-sm hover:bg-[#0E387E] transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-[#00C2A8]" />
              Envoyer sur WhatsApp
            </button>
            <a
              href={`mailto:${BRAND_INFO.email}?subject=${encodeURIComponent(`NAYOpro - ${subject}`)}&body=${encodeURIComponent(message)}`}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-300 text-slate-800 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Envoyer par Email
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};
