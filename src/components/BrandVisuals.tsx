import React, { useState } from 'react';
import {
  Briefcase,
  Building2,
  Camera,
  Car,
  Droplets,
  GraduationCap,
  HeartHandshake,
  Home,
  Laptop,
  LayoutGrid,
  PawPrint,
  Shield,
  Sparkles,
  Sprout,
  Stethoscope,
  Sun,
  Tractor,
  Truck,
  Utensils,
  Wrench,
} from 'lucide-react';
import type { MaterialVisualKey } from '../types.ts';

export const NayoLogo: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="flex items-center gap-2 shrink-0">
      {!imgFailed ? (
        <img
          src="/assets/aistudio/IMG-20260816-WA0021_4a51f0b5.jpg"
          alt="Logo NAYOpro"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className={
            compact
              ? 'h-8 w-auto rounded-lg object-contain bg-white px-1 py-0.5 border border-slate-200'
              : 'h-10 w-auto rounded-lg object-contain bg-white px-1.5 py-0.5 border border-slate-200'
          }
        />
      ) : (
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A2A5E] text-white font-display font-extrabold text-xs">
          NP
        </span>
      )}
      <span className="font-display font-extrabold tracking-tight text-lg text-[#0A2A5E] whitespace-nowrap">
        NAYO<span className="text-[#00C2A8]">pro</span>
      </span>
    </div>
  );
};

export const DepartmentIcon: React.FC<{ iconKey: string; className?: string }> = ({ iconKey, className = 'w-5 h-5' }) => {
  switch (iconKey) {
    case 'building':
      return <Building2 className={className} />;
    case 'tractor':
      return <Tractor className={className} />;
    case 'home':
      return <Home className={className} />;
    case 'briefcase':
      return <Briefcase className={className} />;
    case 'truck':
      return <Truck className={className} />;
    case 'wrench':
      return <Wrench className={className} />;
    case 'car':
      return <Car className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'paw':
      return <PawPrint className={className} />;
    case 'droplets':
      return <Droplets className={className} />;
    case 'sun':
      return <Sun className={className} />;
    case 'laptop':
      return <Laptop className={className} />;
    case 'graduation':
      return <GraduationCap className={className} />;
    case 'utensils':
      return <Utensils className={className} />;
    case 'heart':
      return <HeartHandshake className={className} />;
    case 'camera':
      return <Camera className={className} />;
    case 'stethoscope':
      return <Stethoscope className={className} />;
    case 'sprout':
      return <Sprout className={className} />;
    case 'shield':
      return <Shield className={className} />;
    default:
      return <LayoutGrid className={className} />;
  }
};

const AVATAR_PALETTES: Record<string, { bg: string; accent: string }> = {
  plombier: { bg: '#0A2A5E', accent: '#00C2A8' },
  macon: { bg: '#133B7C', accent: '#FFC107' },
  architecte: { bg: '#0A2A5E', accent: '#00C2A8' },
  electricien: { bg: '#0E3572', accent: '#FFC107' },
  geometre: { bg: '#0A2A5E', accent: '#00C2A8' },
  engins: { bg: '#163D7A', accent: '#FFC107' },
  comptable: { bg: '#0A2A5E', accent: '#00C2A8' },
  transport: { bg: '#11346C', accent: '#00C2A8' },
  entreprise: { bg: '#0A2A5E', accent: '#FFC107' },
  traiteur: { bg: '#0A2A5E', accent: '#00C2A8' },
};

export const ExpertAvatar: React.FC<{ name: string; avatarKey: string; size?: 'sm' | 'md' | 'lg' }> = ({
  name,
  avatarKey,
  size = 'md',
}) => {
  const palette = AVATAR_PALETTES[avatarKey] || { bg: '#0A2A5E', accent: '#00C2A8' };
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || '')
    .join('');

  const sizeClass =
    size === 'lg' ? 'w-20 h-20 text-xl rounded-2xl' : size === 'sm' ? 'w-11 h-11 text-sm rounded-xl' : 'w-14 h-14 text-base rounded-2xl';

  return (
    <div
      className={`${sizeClass} relative shrink-0 overflow-hidden flex items-center justify-center font-display font-bold text-white shadow-sm select-none`}
      style={{ backgroundColor: palette.bg }}
      aria-label={`Portrait de ${name}`}
    >
      <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full opacity-25" aria-hidden="true">
        <circle cx="64" cy="18" r="24" fill={palette.accent} />
        <path d="M0 68 Q40 46 80 68 L80 80 L0 80 Z" fill={palette.accent} />
      </svg>
      <span className="relative z-10 tracking-wide">{initials}</span>
    </div>
  );
};

export const MaterialVisual: React.FC<{ visualKey: MaterialVisualKey; name: string }> = ({ visualKey, name }) => {
  const configs: Record<MaterialVisualKey, { bg: string; label: string }> = {
    sable: { bg: 'from-[#8A6D3B] to-[#C69C53]', label: 'SABLE FLEUVE' },
    ciment: { bg: 'from-[#0A2A5E] to-[#17468F]', label: 'CIMENT 50KG' },
    caillasse: { bg: 'from-[#334155] to-[#64748B]', label: 'CAILLASSE' },
    bois: { bg: 'from-[#6B3E26] to-[#9E5B37]', label: 'BOIS TRAITÉ' },
    toles: { bg: 'from-[#1E3A5F] to-[#3B6998]', label: 'TÔLES BG28' },
    fer: { bg: 'from-[#1F2937] to-[#4B5563]', label: 'FER À BÉTON' },
    gravier: { bg: 'from-[#475569] to-[#78716C]', label: 'GRAVIER LAVÉ' },
    briques: { bg: 'from-[#57534E] to-[#78716C]', label: 'BRIQUES 15CM' },
    peinture: { bg: 'from-[#0E7490] to-[#00C2A8]', label: 'PEINTURE 20L' },
    carrelage: { bg: 'from-[#0A2A5E] to-[#00C2A8]', label: 'CARRELAGE 60x60' },
  };
  const cfg = configs[visualKey] || configs.ciment;

  return (
    <div
      className={`relative h-28 w-full rounded-xl bg-gradient-to-br ${cfg.bg} overflow-hidden flex items-center justify-center`}
      role="img"
      aria-label={name}
    >
      {visualKey === 'ciment' && (
        <svg viewBox="0 0 160 100" className="w-32 h-20" aria-hidden="true">
          <rect x="28" y="18" width="46" height="64" rx="6" fill="#E2E8F0" />
          <rect x="34" y="28" width="34" height="22" rx="3" fill="#00C2A8" />
          <rect x="82" y="24" width="46" height="60" rx="6" fill="#F8FAFC" />
          <rect x="88" y="34" width="34" height="20" rx="3" fill="#FFC107" />
        </svg>
      )}
      {visualKey === 'sable' && (
        <svg viewBox="0 0 160 100" className="w-36 h-22" aria-hidden="true">
          <path d="M10 86 Q55 24 90 48 Q120 26 152 86 Z" fill="#FDE68A" />
          <path d="M26 86 Q72 40 138 86 Z" fill="#F59E0B" opacity="0.65" />
        </svg>
      )}
      {(visualKey === 'caillasse' || visualKey === 'gravier') && (
        <svg viewBox="0 0 160 100" className="w-36 h-22" aria-hidden="true">
          <polygon points="22,82 48,40 76,82" fill="#CBD5E1" />
          <polygon points="56,82 88,30 120,82" fill="#94A3B8" />
          <polygon points="94,82 122,46 146,82" fill="#E2E8F0" />
        </svg>
      )}
      {visualKey === 'bois' && (
        <svg viewBox="0 0 160 100" className="w-36 h-22" aria-hidden="true">
          <rect x="18" y="22" width="124" height="14" rx="2" fill="#D97706" />
          <rect x="24" y="42" width="118" height="14" rx="2" fill="#B45309" />
          <rect x="14" y="62" width="128" height="14" rx="2" fill="#F59E0B" />
        </svg>
      )}
      {visualKey === 'toles' && (
        <svg viewBox="0 0 160 100" className="w-36 h-22" aria-hidden="true">
          <path d="M18 32 L142 32 L134 72 L10 72 Z" fill="#E2E8F0" />
          <path d="M36 32 L28 72 M58 32 L50 72 M80 32 L72 72 M102 32 L94 72 M124 32 L116 72" stroke="#64748B" strokeWidth="3" />
        </svg>
      )}
      {visualKey === 'fer' && (
        <svg viewBox="0 0 160 100" className="w-36 h-22" aria-hidden="true">
          <line x1="16" y1="30" x2="144" y2="30" stroke="#CBD5E1" strokeWidth="7" strokeLinecap="round" />
          <line x1="16" y1="48" x2="144" y2="48" stroke="#94A3B8" strokeWidth="7" strokeLinecap="round" />
          <line x1="16" y1="66" x2="144" y2="66" stroke="#E2E8F0" strokeWidth="7" strokeLinecap="round" />
        </svg>
      )}
      {visualKey === 'briques' && (
        <svg viewBox="0 0 160 100" className="w-36 h-22" aria-hidden="true">
          <rect x="24" y="24" width="50" height="24" rx="3" fill="#CBD5E1" />
          <rect x="82" y="24" width="50" height="24" rx="3" fill="#94A3B8" />
          <rect x="52" y="54" width="54" height="24" rx="3" fill="#E2E8F0" />
        </svg>
      )}
      {visualKey === 'peinture' && (
        <svg viewBox="0 0 160 100" className="w-36 h-22" aria-hidden="true">
          <rect x="52" y="24" width="56" height="58" rx="6" fill="#F8FAFC" />
          <rect x="48" y="18" width="64" height="10" rx="3" fill="#FFC107" />
          <rect x="60" y="42" width="40" height="20" rx="3" fill="#0A2A5E" />
        </svg>
      )}
      {visualKey === 'carrelage' && (
        <svg viewBox="0 0 160 100" className="w-36 h-22" aria-hidden="true">
          <rect x="34" y="18" width="42" height="30" rx="2" fill="#F8FAFC" />
          <rect x="82" y="18" width="42" height="30" rx="2" fill="#E2E8F0" />
          <rect x="34" y="52" width="42" height="30" rx="2" fill="#E2E8F0" />
          <rect x="82" y="52" width="42" height="30" rx="2" fill="#FFC107" />
        </svg>
      )}
      <span className="absolute bottom-2 left-2.5 text-[10px] font-mono-num font-semibold tracking-wider text-white/95 bg-black/40 px-2 py-0.5 rounded">
        {cfg.label}
      </span>
    </div>
  );
};

export const RealizationVisual: React.FC<{ title: string; commune: string }> = ({ title, commune }) => (
  <div className="h-28 w-full rounded-xl bg-gradient-to-br from-[#0A2A5E] via-[#123D82] to-[#00C2A8]/80 p-3 flex flex-col justify-between text-white relative overflow-hidden">
    <svg viewBox="0 0 180 90" className="absolute right-0 bottom-0 w-32 h-20 opacity-20" aria-hidden="true">
      <rect x="20" y="20" width="40" height="70" fill="#FFFFFF" />
      <rect x="70" y="10" width="50" height="80" fill="#FFC107" />
      <rect x="130" y="34" width="36" height="56" fill="#00C2A8" />
    </svg>
    <span className="text-[11px] font-medium text-[#FFC107] relative z-10">{commune} · Réalisation</span>
    <p className="text-xs font-semibold leading-snug line-clamp-2 relative z-10">{title}</p>
  </div>
);
