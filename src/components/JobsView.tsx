import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Briefcase,
  Calendar,
  CheckCircle2,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { BRAND_INFO, KINSHASA_COMMUNES } from '../data/kinshasaData.ts';
import { api, buildWhatsAppLink } from '../lib/api.ts';
import { MultiPrice, extractCdfFromLabel } from '../lib/currency.tsx';
import type { ExpertProfile, JobOffer, JobOfferType, PortfolioEntry, UserAccount } from '../types.ts';

interface JobsViewProps {
  jobs: JobOffer[];
  initialSelectedJob: JobOffer | null;
  currentUser: UserAccount | null;
  currentProvider: ExpertProfile | null;
  onGoToSubscription: () => void;
  onGoToProfile: () => void;
  onJobSubmitted: () => void;
}

export const JobsView: React.FC<JobsViewProps> = ({
  jobs,
  initialSelectedJob,
  currentUser,
  currentProvider,
  onGoToSubscription,
  onGoToProfile,
  onJobSubmitted,
}) => {
  const [subTab, setSubTab] = useState<'offers' | 'portfolio' | 'publish'>('offers');
  const [selectedJob, setSelectedJob] = useState<JobOffer | null>(initialSelectedJob);

  // Filtres offres
  const [searchQ, setSearchQ] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | 'emploi' | 'stage'>('all');
  const [communeFilter, setCommuneFilter] = useState('all');
  const [domainFilter, setDomainFilter] = useState('all');

  // Formulaire candidature
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [fullName, setFullName] = useState(currentUser?.name || '');
  const [whatsapp, setWhatsapp] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [commune, setCommune] = useState(currentUser?.commune || 'Gombe');
  const [skills, setSkills] = useState('');
  const [presentation, setPresentation] = useState('');
  const [cvFileName, setCvFileName] = useState('');
  const [cvDataUrl, setCvDataUrl] = useState<string | undefined>(undefined);
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applySuccessMsg, setApplySuccessMsg] = useState<string | null>(null);
  const [applyErrorMsg, setApplyErrorMsg] = useState<string | null>(null);

  // Portfolio Skills to Jobs
  const [portfolioEntries, setPortfolioEntries] = useState<PortfolioEntry[]>([]);
  const [portKind, setPortKind] = useState<PortfolioEntry['kind']>('Compétence');
  const [portTitle, setPortTitle] = useState('');
  const [portDetail, setPortDetail] = useState('');
  const [portYear, setPortYear] = useState('2026');
  const [portLoading, setPortLoading] = useState(false);

  // Publication offre Entreprise
  const [jobTitle, setJobTitle] = useState('');
  const [jobType, setJobType] = useState<JobOfferType>('Stage');
  const [jobCommune, setJobCommune] = useState('Gombe');
  const [jobDomain, setJobDomain] = useState('Commerce & Vente');
  const [jobSalary, setJobSalary] = useState('250 000 CDF / mois');
  const [jobSalaryCdf, setJobSalaryCdf] = useState('250000');
  const [jobDescription, setJobDescription] = useState('');
  const [jobSkills, setJobSkills] = useState('');
  const [jobDeadline, setJobDeadline] = useState('2026-12-30');
  const [jobPositions, setJobPositions] = useState(1);
  const [jobStatusMsg, setJobStatusMsg] = useState<string | null>(null);
  const [jobErrorMsg, setJobErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setSelectedJob(initialSelectedJob);
    setShowApplyForm(false);
    setApplySuccessMsg(null);
  }, [initialSelectedJob]);

  useEffect(() => {
    api
      .getPortfolio()
      .then((res) => setPortfolioEntries(res.entries))
      .catch(() => {});
  }, [currentUser]);

  const domains = useMemo(() => Array.from(new Set(jobs.map((j) => j.domain))), [jobs]);

  const filteredJobs = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return jobs.filter((j) => {
      if (kindFilter === 'stage' && j.type !== 'Stage') return false;
      if (kindFilter === 'emploi' && j.type === 'Stage') return false;
      if (communeFilter !== 'all' && j.commune !== communeFilter) return false;
      if (domainFilter !== 'all' && j.domain !== domainFilter) return false;
      if (q) {
        const hay = `${j.title} ${j.companyName} ${j.commune} ${j.domain} ${j.skills.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, searchQ, kindFilter, communeFilter, domainFilter]);

  const handleCvUpload = (file: File | null) => {
    if (!file) return;
    if (file.size > 1_800_000) {
      setApplyErrorMsg('Le fichier CV doit faire moins de 1,8 Mo (PDF ou Image).');
      return;
    }
    setCvFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCvDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    setApplyErrorMsg(null);
    setApplySubmitting(true);
    try {
      const res = await api.applyToJob(selectedJob.id, {
        fullName,
        whatsapp,
        email,
        commune,
        skills,
        presentation,
        cvFileName,
        cvDataUrl,
      });
      setApplySuccessMsg(res.message);
      setShowApplyForm(false);
      setSkills('');
      setPresentation('');
      setCvFileName('');
      setCvDataUrl(undefined);
    } catch (err) {
      setApplyErrorMsg(err instanceof Error ? err.message : 'Erreur lors de l’envoi de votre candidature.');
    } finally {
      setApplySubmitting(false);
    }
  };

  const handleAddPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    setPortLoading(true);
    try {
      const res = await api.addPortfolioEntry({
        kind: portKind,
        title: portTitle,
        detail: portDetail,
        yearOrDuration: portYear,
      });
      setPortfolioEntries((prev) => [res.entry, ...prev]);
      setPortTitle('');
      setPortDetail('');
    } finally {
      setPortLoading(false);
    }
  };

  const handleDeletePortfolio = async (id: string) => {
    await api.deletePortfolioEntry(id);
    setPortfolioEntries((prev) => prev.filter((item) => item.id !== id));
  };

  const handlePublishJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setJobErrorMsg(null);
    setJobStatusMsg(null);
    try {
      const res = await api.createJob({
        title: jobTitle,
        type: jobType,
        commune: jobCommune,
        domain: jobDomain,
        salaryCdf: Number(jobSalaryCdf) || undefined,
        salaryLabel: jobSalary,
        description: jobDescription,
        skills: jobSkills,
        deadline: jobDeadline,
        positions: jobPositions,
      });
      setJobStatusMsg(res.message);
      setJobTitle('');
      setJobDescription('');
      setJobSkills('');
      onJobSubmitted();
    } catch (err) {
      setJobErrorMsg(err instanceof Error ? err.message : 'Impossible de publier l’offre.');
    }
  };

  const isActiveCompany =
    currentUser?.role === 'ENTREPRISE' && currentProvider?.subscriptionStatus === 'ACTIF';

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* En-tête Skills to Jobs */}
      <div className="bg-[#0A2A5E] text-white rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <p className="text-xs font-semibold text-[#00C2A8]">NAYOpro Emploi &amp; Stages · Skills to Jobs</p>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl mt-1">
            Trouvez un emploi ou un stage à Kinshasa
          </h1>
          <p className="text-sm text-slate-200 mt-1.5 max-w-2xl">
            100% gratuit pour les jeunes et candidats. Montrez vos compétences réelles même sans diplôme grâce à votre Portfolio.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubTab('offers')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[42px] ${
              subTab === 'offers' ? 'bg-[#00C2A8] text-[#0A2A5E]' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Offres ({jobs.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('portfolio')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[42px] ${
              subTab === 'portfolio' ? 'bg-[#FFC107] text-[#0A2A5E]' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Mon Portfolio
          </button>
          <button
            type="button"
            onClick={() => setSubTab('publish')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[42px] ${
              subTab === 'publish' ? 'bg-white text-[#0A2A5E]' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Publier une Offre (Entreprise)
          </button>
        </div>
      </div>

      {/* SOUS-VUE 1 : LISTE DES OFFRES */}
      {subTab === 'offers' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Poste, entreprise, compétence..."
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-300 text-sm focus:border-[#00C2A8] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl h-11">
              {(['all', 'emploi', 'stage'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKindFilter(k)}
                  className={`flex-1 h-9 rounded-lg text-xs font-bold transition-colors ${
                    kindFilter === k ? 'bg-white text-[#0A2A5E] shadow-sm' : 'text-slate-600'
                  }`}
                >
                  {k === 'all' ? 'Tout' : k === 'emploi' ? 'Emploi' : 'Stage'}
                </button>
              ))}
            </div>

            <select
              value={communeFilter}
              onChange={(e) => setCommuneFilter(e.target.value)}
              className="h-11 rounded-xl border border-slate-300 px-3 text-sm bg-white"
            >
              <option value="all">Toutes communes</option>
              {KINSHASA_COMMUNES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="h-11 rounded-xl border border-slate-300 px-3 text-sm bg-white"
            >
              <option value="all">Tous domaines</option>
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => {
                  setSelectedJob(job);
                  setShowApplyForm(false);
                  setApplySuccessMsg(null);
                  setApplyErrorMsg(null);
                }}
                className="text-left bg-white rounded-2xl border border-slate-200 hover:border-[#00C2A8] p-5 flex flex-col justify-between gap-4 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#0A2A5E] text-[#FFC107] font-display font-extrabold text-base flex items-center justify-center shrink-0">
                      {job.companyLogoKey || 'NP'}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-display font-bold text-base text-slate-900 leading-snug">{job.title}</h2>
                      <p className="text-xs font-medium text-slate-600 truncate mt-0.5">{job.companyName}</p>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1.5">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#00C2A8]" />
                      <span>
                        {job.commune} · {job.type}
                      </span>
                    </p>
                    {(() => {
                      const salCdf = job.salaryCdf ?? extractCdfFromLabel(job.salaryLabel);
                      return salCdf ? (
                        <MultiPrice amountCdf={salCdf} size="sm" />
                      ) : (
                        <p className="font-mono-num font-bold text-[#0A2A5E]">{job.salaryLabel}</p>
                      );
                    })()}
                    <p className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Date limite : {job.deadline}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0A2A5E]">
                  <span>{job.positions} place(s)</span>
                  <span className="text-[#00C2A8]">Voir l’offre &amp; Postuler →</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SOUS-VUE 2 : MON PORTFOLIO SKILLS TO JOBS */}
      {subTab === 'portfolio' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <form onSubmit={handleAddPortfolio} className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 h-fit">
            <h2 className="font-display font-bold text-lg text-[#0A2A5E]">Enrichir Mon Portfolio</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Même sans diplôme, valorisez vos compétences pratiques, réalisations, formations et missions déjà effectuées à Kinshasa.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Catégorie</label>
              <select
                value={portKind}
                onChange={(e) => setPortKind(e.target.value as PortfolioEntry['kind'])}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white"
              >
                <option value="Compétence">Compétence</option>
                <option value="Réalisation">Réalisation</option>
                <option value="Formation">Formation suivie</option>
                <option value="Mission">Mission déjà faite</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Titre</label>
              <input
                type="text"
                required
                value={portTitle}
                onChange={(e) => setPortTitle(e.target.value)}
                placeholder="Ex. Gestion de caisse Mobile Money"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Preuve concrète</label>
              <textarea
                rows={3}
                required
                value={portDetail}
                onChange={(e) => setPortDetail(e.target.value)}
                placeholder="Décrivez ce que vous savez faire ou ce que vous avez réalisé..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Année ou Durée</label>
              <input
                type="text"
                value={portYear}
                onChange={(e) => setPortYear(e.target.value)}
                placeholder="Ex. 2026 ou 6 mois"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={portLoading}
              className="w-full min-h-[44px] rounded-xl bg-[#0A2A5E] text-white text-sm font-bold inline-flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 text-[#00C2A8]" />
              Ajouter à mon Portfolio
            </button>
          </form>

          <div className="lg:col-span-3 space-y-3">
            <h2 className="font-display font-bold text-lg text-[#0A2A5E]">
              Mon Portfolio — Skills to Jobs ({portfolioEntries.length})
            </h2>
            {portfolioEntries.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
                Ajoutez votre première compétence ou mission réalisée à gauche.
              </div>
            ) : (
              portfolioEntries.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#00C2A8]">
                      {item.kind} · {item.yearOrDuration}
                    </p>
                    <h3 className="font-display font-bold text-base text-slate-900">{item.title}</h3>
                    <p className="text-sm text-slate-600">{item.detail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeletePortfolio(item.id)}
                    aria-label="Supprimer cet élément"
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SOUS-VUE 3 : PUBLIER UNE OFFRE (ENTREPRISE ABONNÉE ACTIVE) */}
      {subTab === 'publish' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-3xl">
          <h2 className="font-display font-bold text-xl text-[#0A2A5E]">Publier une Offre d’Emploi / Stage</h2>
          <p className="text-xs text-slate-500 mt-1">
            Réservé aux entreprises ayant un abonnement actif (1 mois). Toute offre est vérifiée par l’Admin NAYOpro avant publication.
          </p>

          {!isActiveCompany && currentUser?.role !== 'ADMIN' ? (
            <div className="mt-5 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <p className="text-sm font-semibold text-[#0A2A5E]">
                {currentUser?.role === 'ENTREPRISE'
                  ? `Votre entreprise est actuellement en statut : ${currentProvider?.subscriptionStatus || 'EN ATTENTE'}. Un abonnement actif est obligatoire pour publier.`
                  : 'Connectez-vous ou créez un compte Entreprise avec abonnement actif pour publier des offres.'}
              </p>
              <div className="flex flex-wrap gap-3">
                {currentUser?.role === 'ENTREPRISE' ? (
                  <button
                    type="button"
                    onClick={onGoToSubscription}
                    className="px-4 py-2.5 rounded-xl bg-[#00C2A8] text-[#0A2A5E] text-xs font-extrabold"
                  >
                    Activer mon abonnement 1 Mois
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onGoToProfile}
                    className="px-4 py-2.5 rounded-xl bg-[#0A2A5E] text-white text-xs font-bold"
                  >
                    Créer / Connecter un compte Entreprise
                  </button>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handlePublishJob} className="mt-5 space-y-4">
              {jobStatusMsg && (
                <div className="p-3.5 rounded-xl bg-[#00C2A8]/15 text-[#0A2A5E] text-xs font-bold">{jobStatusMsg}</div>
              )}
              {jobErrorMsg && (
                <div className="p-3.5 rounded-xl bg-red-50 text-red-700 text-xs font-bold">{jobErrorMsg}</div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Titre du poste</label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Ex. Caissière, Stagiaire Comptable, Chauffeur"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type de contrat</label>
                  <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value as JobOfferType)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white"
                  >
                    <option value="Emploi CDI">Emploi CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="Stage">Stage</option>
                    <option value="Mission">Mission</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Commune</label>
                  <select
                    value={jobCommune}
                    onChange={(e) => setJobCommune(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white"
                  >
                    {KINSHASA_COMMUNES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Domaine</label>
                  <input
                    type="text"
                    value={jobDomain}
                    onChange={(e) => setJobDomain(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Salaire / Indemnité (CDF)</label>
                  <input
                    type="number"
                    min={0}
                    value={jobSalaryCdf}
                    onChange={(e) => {
                      setJobSalaryCdf(e.target.value);
                      const num = Number(e.target.value);
                      if (num > 0) setJobSalary(`${num.toLocaleString('fr-FR')} CDF / mois`);
                    }}
                    placeholder="Ex. 250000"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-mono-num"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description du poste</label>
                <textarea
                  rows={3}
                  required
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Compétences (virgules)</label>
                  <input
                    type="text"
                    value={jobSkills}
                    onChange={(e) => setJobSkills(e.target.value)}
                    placeholder="Excel, Accueil, Permis B"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date limite</label>
                  <input
                    type="date"
                    required
                    value={jobDeadline}
                    onChange={(e) => setJobDeadline(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre de places</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={jobPositions}
                    onChange={(e) => setJobPositions(Number(e.target.value) || 1)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="min-h-[46px] px-6 rounded-xl bg-[#0A2A5E] text-white text-sm font-bold hover:bg-[#0D3678]"
              >
                Publier une Offre d’Emploi / Stage
              </button>
            </form>
          )}
        </div>
      )}

      {/* BANDEAU CONTACT EMPLOI OBLIGATOIRE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-600">
          <strong className="text-[#0A2A5E]">Assistance NAYOpro Emploi &amp; Stages :</strong> Besoin d’aide pour votre candidature ou votre recrutement à Kinshasa ?
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
          <a href={`mailto:${BRAND_INFO.email}`} className="inline-flex items-center gap-1.5 text-[#0A2A5E] hover:underline">
            <Mail className="w-4 h-4 text-[#00C2A8]" />
            {BRAND_INFO.email}
          </a>
          <a
            href={buildWhatsAppLink("Bonjour NAYOpro, j'ai une question concernant Emploi & Stages.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[#0A2A5E] hover:underline"
          >
            <MessageCircle className="w-4 h-4 text-[#00C2A8]" />
            {BRAND_INFO.phoneDisplay}
          </a>
        </div>
      </div>

      {/* MODAL DÉTAIL OFFRE & CANDIDATURE */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full sm:max-w-2xl max-h-[92vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            <div className="px-5 py-4 bg-[#0A2A5E] text-white flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-[#00C2A8] font-semibold">
                  {selectedJob.companyName} · {selectedJob.commune}
                </p>
                <h2 className="font-display font-bold text-lg truncate">{selectedJob.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0"
                aria-label="Fermer l'offre"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-slate-500">Type</p>
                  <p className="font-bold text-[#0A2A5E] mt-0.5">{selectedJob.type}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-slate-500">Commune</p>
                  <p className="font-bold text-[#0A2A5E] mt-0.5">{selectedJob.commune}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-slate-500">Rémunération</p>
                  {(() => {
                    const salCdf = selectedJob.salaryCdf ?? extractCdfFromLabel(selectedJob.salaryLabel);
                    return salCdf ? (
                      <MultiPrice amountCdf={salCdf} size="xs" className="mt-0.5" />
                    ) : (
                      <p className="font-bold text-[#0A2A5E] font-mono-num mt-0.5">{selectedJob.salaryLabel}</p>
                    );
                  })()}
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-slate-500">Places / Limite</p>
                  <p className="font-bold text-[#0A2A5E] mt-0.5">
                    {selectedJob.positions} · {selectedJob.deadline}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-display font-bold text-sm text-[#0A2A5E] mb-1.5">Description du poste</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{selectedJob.description}</p>
              </div>

              <div>
                <h3 className="font-display font-bold text-sm text-[#0A2A5E] mb-1.5">Compétences demandées</h3>
                <p className="text-sm text-slate-700">{selectedJob.skills.join(' · ')}</p>
              </div>

              {applySuccessMsg && (
                <div className="p-4 rounded-2xl bg-[#00C2A8]/15 border border-[#00C2A8]/30 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#0A2A5E] shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-[#0A2A5E]">{applySuccessMsg}</p>
                </div>
              )}

              {showApplyForm && !applySuccessMsg && (
                <form onSubmit={handleApplySubmit} className="space-y-3.5 pt-3 border-t border-slate-200">
                  <h3 className="font-display font-bold text-base text-[#0A2A5E]">Formulaire de Candidature</h3>
                  {applyErrorMsg && (
                    <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">{applyErrorMsg}</div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nom complet</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ex. Sarah Mbemba"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone WhatsApp</label>
                      <input
                        type="tel"
                        required
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="+243 ..."
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nom@exemple.cd"
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Vos compétences</label>
                    <input
                      type="text"
                      required
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      placeholder="Ex. Excel, Caisse, Permis B, Développement Web..."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Présentation rapide</label>
                    <textarea
                      rows={3}
                      required
                      value={presentation}
                      onChange={(e) => setPresentation(e.target.value)}
                      placeholder="Expliquez votre motivation et votre expérience..."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-[#0A2A5E] bg-slate-50 hover:bg-slate-100 cursor-pointer">
                      <Upload className="w-4 h-4 text-[#00C2A8]" />
                      <span>{cvFileName ? `CV joint : ${cvFileName}` : 'Joindre mon CV PDF / Photo'}</span>
                      <input
                        type="file"
                        accept=".pdf,image/png,image/jpeg,image/webp"
                        onChange={(e) => handleCvUpload(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={applySubmitting}
                    className="w-full min-h-[46px] rounded-xl bg-[#00C2A8] text-[#0A2A5E] text-sm font-extrabold hover:bg-[#00d4b7]"
                  >
                    {applySubmitting ? 'Envoi en cours...' : 'Envoyer ma candidature'}
                  </button>
                </form>
              )}
            </div>

            {!showApplyForm && !applySuccessMsg && (
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setShowApplyForm(true)}
                  className="w-full min-h-[46px] rounded-xl bg-[#0A2A5E] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#0D3678]"
                >
                  <FileText className="w-4 h-4 text-[#00C2A8]" />
                  Postuler Maintenant
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
