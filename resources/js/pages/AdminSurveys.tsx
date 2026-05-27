import { useState } from 'react';
import { router } from '@inertiajs/react';
import {
  BarChart3,
  Check,
  ClipboardCheck,
  Download,
  Eye,
  ImageIcon,
  Link2,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Types ─────────────────────────────────────────────────────────────────────

type SurveyQuestion = {
  id: string;
  section: string;
  label: string;
  type: string;
  options: string[];
  required: boolean;
};

type Survey = {
  id: number;
  title: string;
  description?: string | null;
  cover_image?: string | null;
  question?: string | null;
  options?: { key: string; label: string }[] | null;
  questions?: SurveyQuestion[] | null;
  token?: string | null;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  auto_bravo_points: number;
  responses_count: number;
  created_at: string;
};

interface AdminSurveysProps {
  surveys: Survey[];
}

function getSurveyUrl(token: string) {
  return `${window.location.origin}/surveys/${token}`;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminSurveys({ surveys }: AdminSurveysProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [copied, setCopied]                   = useState<number | null>(null);

  const activeSurveys   = surveys.filter((s) => s.is_active);
  const inactiveSurveys = surveys.filter((s) => !s.is_active);

  const toggle = (id: number) =>
    router.patch(`/admin/surveys/${id}/toggle`, {}, { preserveScroll: true });

  const destroy = (id: number) =>
    router.delete(`/admin/surveys/${id}`, {
      preserveScroll: true,
      onFinish: () => setConfirmDeleteId(null),
    });

  const copyLink = (survey: Survey) => {
    if (!survey.token) return;
    navigator.clipboard.writeText(getSurveyUrl(survey.token));
    setCopied(survey.id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <ClipboardCheck size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Gestion des sondages RH</h1>
            <p className="text-sm text-on-surface-variant font-medium">
              Créez, activez et partagez les sondages du personnel PAD.
            </p>
          </div>
        </div>
        <a href="/admin/surveys/create">
          <Button variant="primary">
            <Plus size={16} /> Nouveau sondage
          </Button>
        </a>
      </div>

      {/* ── Active ── */}
      {activeSurveys.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            Actifs ({activeSurveys.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {activeSurveys.map((s) => (
              <SurveyCard
                key={s.id}
                survey={s}
                onToggle={() => toggle(s.id)}
                onDelete={() => setConfirmDeleteId(s.id)}
                confirmDeleteId={confirmDeleteId}
                onConfirmDelete={() => destroy(s.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onCopyLink={() => copyLink(s)}
                copied={copied === s.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Inactive ── */}
      {inactiveSurveys.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
            Inactifs / clôturés ({inactiveSurveys.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {inactiveSurveys.map((s) => (
              <SurveyCard
                key={s.id}
                survey={s}
                onToggle={() => toggle(s.id)}
                onDelete={() => setConfirmDeleteId(s.id)}
                confirmDeleteId={confirmDeleteId}
                onConfirmDelete={() => destroy(s.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onCopyLink={() => copyLink(s)}
                copied={copied === s.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Empty ── */}
      {surveys.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <ClipboardCheck size={36} className="text-on-surface-variant/25" />
          <p className="font-semibold text-on-surface-variant">Aucun sondage créé pour le moment.</p>
          <a href="/admin/surveys/create">
            <Button variant="primary"><Plus size={16} /> Créer le premier sondage</Button>
          </a>
        </div>
      )}
    </div>
  );
}

// ── Survey card ───────────────────────────────────────────────────────────────

function SurveyCard({
  survey,
  onToggle,
  onDelete,
  confirmDeleteId,
  onConfirmDelete,
  onCancelDelete,
  onCopyLink,
  copied,
}: {
  survey: Survey;
  onToggle: () => void;
  onDelete: () => void;
  confirmDeleteId: number | null;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onCopyLink: () => void;
  copied: boolean;
}) {
  const isMulti    = !!survey.questions?.length;
  const isDeleting = confirmDeleteId === survey.id;

  return (
    <a
      href={`/admin/surveys/${survey.id}/edit`}
      className="group relative block rounded-2xl overflow-hidden bg-surface-container border border-surface-container-high transition-all duration-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      style={{ textDecoration: 'none' }}
    >
      {/* ── Cover ── */}
      <div className="relative w-full aspect-video bg-surface-container-high overflow-hidden">
        {survey.cover_image ? (
          <img
            src={survey.cover_image}
            alt={survey.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <img src='/assets/images/onepad-logo.png' alt='Logo' className="text-on-surface-variant/20" />
          </div>
        )}

        {/* Status dot */}
        <span
          className={`absolute top-2.5 left-2.5 w-2 h-2 rounded-full ring-2 ring-white ${
            survey.is_active ? 'bg-emerald-400' : 'bg-slate-300'
          }`}
        />

        {/* ── Hover overlay ── */}
        <div
          className="absolute inset-0 flex flex-col justify-between p-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: 'rgba(0,0,0,0.52)' }}
          onClick={(e) => e.preventDefault()}
        >
          {/* Top: toggle + delete */}
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onToggle(); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-white bg-white/15 hover:bg-white/25 transition-colors"
            >
              {survey.is_active
                ? <><ToggleRight size={13} /> Actif</>
                : <><ToggleLeft  size={13} /> Inactif</>}
            </button>

            {isDeleting ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); onConfirmDelete(); }}
                  className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  <Check size={11} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); onCancelDelete(); }}
                  className="p-1.5 rounded-lg bg-white/15 text-white hover:bg-white/25 transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); onDelete(); }}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-red-500/60 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>

          {/* Bottom: secondary actions */}
          <div className="flex items-center gap-1 flex-wrap">
            {isMulti && (
              <>
                <a
                  href={`/admin/surveys/${survey.id}/preview`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-white bg-white/15 hover:bg-white/25 transition-colors"
                >
                  <Eye size={11} /> Aperçu
                </a>
                <a
                  href={`/admin/surveys/${survey.id}/report`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-white bg-white/15 hover:bg-white/25 transition-colors"
                >
                  <BarChart3 size={11} /> Rapport
                </a>
              </>
            )}
            <a
              href={`/admin/surveys/${survey.id}/export`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-white bg-white/15 hover:bg-white/25 transition-colors"
            >
              <Download size={11} /> CSV
            </a>
            {isMulti && survey.token && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); onCopyLink(); }}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  copied ? 'bg-emerald-500/80 text-white' : 'text-white bg-white/15 hover:bg-white/25'
                }`}
              >
                {copied ? <><Check size={11} /> Copié</> : <><Link2 size={11} /> Lien</>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-3 py-2.5">
        <p className="text-sm font-bold text-on-surface leading-snug line-clamp-2">
          {survey.title}
        </p>
        <div className="flex items-center gap-2 mt-1 text-xs text-on-surface-variant font-medium">
          <span className="flex items-center gap-1">
            <Users size={10} />
            {survey.responses_count} rép.
          </span>
          <span className="opacity-30">·</span>
          <span>
            {isMulti
              ? `${survey.questions!.length} questions`
              : `${survey.options?.length ?? 0} options`}
          </span>
          {survey.auto_bravo_points > 0 && (
            <>
              <span className="opacity-30">·</span>
              <span className="flex items-center gap-1 text-primary">
                <Zap size={10} />
                {survey.auto_bravo_points} pts
              </span>
            </>
          )}
        </div>
      </div>
    </a>
  );
}
