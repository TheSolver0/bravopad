import { useState } from 'react';
import { router } from '@inertiajs/react';
import {
  BarChart3,
  Calendar,
  Check,
  ClipboardCheck,
  Copy,
  Download,
  Eye,
  Link2,
  MessageSquare,
  Pencil,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
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
  responses_count: number;
  created_at: string;
};

interface AdminSurveysProps {
  surveys: Survey[];
}

const questionTypeLabels: Record<string, string> = {
  radio:    'Choix unique',
  checkbox: 'Choix multiple',
  text:     'Texte libre',
  rating:   'Note (1–5)',
};

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
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
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

      {/* Active surveys */}
      {activeSurveys.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            Actifs ({activeSurveys.length})
          </h2>
          <div className="space-y-3">
            {activeSurveys.map((s) => (
              <SurveyRow
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

      {/* Inactive surveys */}
      {inactiveSurveys.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
            Inactifs / clôturés ({inactiveSurveys.length})
          </h2>
          <div className="space-y-3">
            {inactiveSurveys.map((s) => (
              <SurveyRow
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

      {surveys.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <ClipboardCheck size={36} className="text-on-surface-variant/25" />
          <p className="font-semibold text-on-surface-variant">Aucun sondage créé pour le moment.</p>
          <a href="/admin/surveys/create">
            <Button variant="primary">
              <Plus size={16} /> Créer le premier sondage
            </Button>
          </a>
        </div>
      )}
    </div>
  );
}

// ── Survey row ─────────────────────────────────────────────────────────────────

function SurveyRow({
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
  const [expanded, setExpanded] = useState(false);

  const isMulti = !!survey.questions?.length;
  const daysLeft = survey.ends_at
    ? Math.max(0, Math.ceil((new Date(survey.ends_at).getTime() - Date.now()) / 86_400_000))
    : null;

  const createdAt = new Date(survey.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <Card className={`bg-white border-none space-y-0 p-0 overflow-hidden transition-shadow ${survey.is_active ? 'shadow-md' : 'shadow-sm opacity-80'}`}>
      <div className="flex items-center gap-3 px-5 py-4">
        <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${survey.is_active ? 'bg-emerald-400' : 'bg-slate-300'}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-black text-sm truncate">{survey.title}</p>
            {isMulti && (
              <span className="shrink-0 text-[10px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                Multi-questions
              </span>
            )}
          </div>
          {survey.description && (
            <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">{survey.description}</p>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-4 text-[11px] text-on-surface-variant font-medium shrink-0">
          <span className="flex items-center gap-1">
            <Users size={11} /> {survey.responses_count} réponse{survey.responses_count !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare size={11} />
            {isMulti ? `${survey.questions!.length} questions` : `${survey.options?.length ?? 0} options`}
          </span>
          {survey.ends_at && (
            <span className={`flex items-center gap-1 ${survey.is_active && daysLeft !== null && daysLeft <= 3 ? 'text-orange-500 font-bold' : ''}`}>
              <Calendar size={11} />
              {survey.is_active && daysLeft !== null
                ? daysLeft === 0 ? 'Clôture auj.' : `J-${daysLeft}`
                : new Date(survey.ends_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </span>
          )}
          <span className="text-on-surface-variant/60">Créé le {createdAt}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button type="button" onClick={() => setExpanded((v) => !v)}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors text-xs font-bold">
            {expanded ? 'Masquer' : 'Détails'}
          </button>

          {isMulti && (
            <>
              <a href={`/admin/surveys/${survey.id}/preview`}
                className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
                title="Aperçu">
                <Eye size={15} />
              </a>
              <a href={`/admin/surveys/${survey.id}/edit`}
                className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
                title="Modifier">
                <Pencil size={15} />
              </a>
              <a href={`/admin/surveys/${survey.id}/report`}
                className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
                title="Voir le rapport">
                <BarChart3 size={15} />
              </a>
              <button type="button" onClick={onCopyLink}
                className={`p-2 rounded-lg transition-colors ${copied ? 'text-emerald-600 bg-emerald-50' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
                title="Copier le lien">
                {copied ? <Check size={15} /> : <Link2 size={15} />}
              </button>
            </>
          )}

          <a href={`/admin/surveys/${survey.id}/export`}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
            title="Exporter CSV">
            <Download size={15} />
          </a>
          <button type="button" onClick={onToggle}
            className={`p-2 rounded-lg transition-colors ${survey.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-surface-container-low'}`}
            title={survey.is_active ? 'Désactiver' : 'Activer'}>
            {survey.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          </button>

          {confirmDeleteId === survey.id ? (
            <div className="flex items-center gap-1">
              <button type="button" onClick={onConfirmDelete}
                className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">
                <Check size={14} />
              </button>
              <button type="button" onClick={onCancelDelete}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={onDelete}
              className="p-2 rounded-lg text-on-surface-variant hover:bg-red-50 hover:text-red-500 transition-colors">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Cover image thumbnail */}
      {expanded && survey.cover_image && (
        <div className="px-5 pb-0 pt-3 border-t border-surface-container-high animate-in fade-in duration-200">
          <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Photo de couverture</p>
          <img
            src={survey.cover_image}
            alt="Couverture"
            className="w-full h-32 object-cover rounded-xl border border-surface-container-high"
          />
        </div>
      )}

      {/* Share link banner */}
      {expanded && isMulti && survey.token && (
        <div className="px-5 pb-3 pt-0 border-t border-surface-container-high animate-in fade-in duration-200">
          <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2 mt-3">
            <Link2 size={14} className="text-primary shrink-0" />
            <span className="text-xs font-mono text-primary/80 flex-1 truncate">
              {getSurveyUrl(survey.token)}
            </span>
            <button type="button" onClick={onCopyLink}
              className="shrink-0 flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/70">
              {copied ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
            </button>
          </div>
        </div>
      )}

      {/* Questions list */}
      {expanded && isMulti && (
        <div className="px-5 pb-4 border-t border-surface-container-high pt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Questions</p>
          <div className="space-y-1.5">
            {survey.questions!.map((q, i) => (
              <div key={q.id} className="flex items-start gap-2 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full bg-surface-container-low text-on-surface-variant flex items-center justify-center text-[10px] font-black mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1">
                  {(i === 0 || survey.questions![i - 1].section !== q.section) && q.section && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-0.5">{q.section}</p>
                  )}
                  <p className="font-medium text-on-surface leading-snug">{q.label}</p>
                  <p className="text-[10px] text-on-surface-variant/60 font-semibold">
                    {questionTypeLabels[q.type] ?? q.type}
                    {q.required ? ' · Obligatoire' : ' · Optionnel'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legacy options list */}
      {expanded && !isMulti && survey.options && (
        <div className="px-5 pb-4 border-t border-surface-container-high pt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Options</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {survey.options.map((opt, i) => (
              <div key={opt.key} className="flex items-center gap-2 rounded-lg border border-surface-container-high px-3 py-2 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full bg-surface-container-low text-on-surface-variant flex items-center justify-center text-[10px] font-black">
                  {i + 1}
                </span>
                <span className="font-medium text-on-surface leading-snug">{opt.label}</span>
                <span className="ml-auto text-[10px] font-black text-on-surface-variant/60 shrink-0">{opt.key}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
