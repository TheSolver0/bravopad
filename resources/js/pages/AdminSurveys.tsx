import { FormEvent, useState } from 'react';
import { router } from '@inertiajs/react';
import {
  Calendar,
  Check,
  ClipboardCheck,
  Download,
  MessageSquare,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ── Types ────────────────────────────────────────────────────────────────────

type SurveyOption = { key: string; label: string };
type Survey = {
  id: number;
  title: string;
  question: string;
  options: SurveyOption[];
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  responses_count: number;
  created_at: string;
};

interface AdminSurveysProps {
  surveys: Survey[];
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminSurveys({ surveys }: AdminSurveysProps) {
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [optionsRaw, setOptionsRaw] = useState(
    'option1:Option 1\noption2:Option 2\noption3:Option 3',
  );
  const [endsAt, setEndsAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitCreate = (e: FormEvent) => {
    e.preventDefault();

    const options = optionsRaw
      .split('\n')
      .map((row) => row.trim())
      .filter(Boolean)
      .map((row) => {
        const [key, ...rest] = row.split(':');
        return { key: key.trim(), label: rest.join(':').trim() || key.trim() };
      })
      .filter((o) => o.key && o.label);

    if (options.length < 2) return;

    setSubmitting(true);
    router.post(
      '/admin/surveys',
      { title, question, options, ends_at: endsAt || null },
      {
        preserveScroll: true,
        onFinish: () => {
          setSubmitting(false);
          setShowForm(false);
          setTitle('');
          setQuestion('');
          setOptionsRaw('option1:Option 1\noption2:Option 2\noption3:Option 3');
          setEndsAt('');
        },
      },
    );
  };

  const toggle = (id: number) => {
    router.patch(`/admin/surveys/${id}/toggle`, {}, { preserveScroll: true });
  };

  const destroy = (id: number) => {
    router.delete(`/admin/surveys/${id}`, {
      preserveScroll: true,
      onFinish: () => setConfirmDeleteId(null),
    });
  };

  const activeSurveys = surveys.filter((s) => s.is_active);
  const inactiveSurveys = surveys.filter((s) => !s.is_active);

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <ClipboardCheck size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Gestion des sondages RH</h1>
            <p className="text-sm text-on-surface-variant font-medium">
              Créez, activez et exportez les sondages du personnel PAD.
            </p>
          </div>
        </div>
        <Button variant="primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <><X size={16} /> Annuler</> : <><Plus size={16} /> Nouveau sondage</>}
        </Button>
      </div>

      {/* ── Formulaire de création ── */}
      {showForm && (
        <Card className="bg-white border-none shadow-lg space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
          <h2 className="font-black text-base">Nouveau sondage</h2>
          <form className="space-y-4" onSubmit={submitCreate}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1 block md:col-span-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">Titre</span>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex : Journée de l'Excellence PAD 2025"
                  className="w-full border border-surface-container-high rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="space-y-1 block md:col-span-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">Question</span>
                <textarea
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={2}
                  placeholder="Ex : Quelle activité préférez-vous pour le prochain team building ?"
                  className="w-full border border-surface-container-high rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </label>
              <label className="space-y-1 block md:col-span-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                  Options{' '}
                  <span className="normal-case font-normal text-on-surface-variant/70">
                    (format clé:libellé — une ligne par option, 2 à 6 options)
                  </span>
                </span>
                <textarea
                  required
                  value={optionsRaw}
                  onChange={(e) => setOptionsRaw(e.target.value)}
                  rows={5}
                  className="w-full border border-surface-container-high rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                  Date de clôture{' '}
                  <span className="normal-case font-normal text-on-surface-variant/70">(optionnel)</span>
                </span>
                <input
                  type="date"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="w-full border border-surface-container-high rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <div className="flex items-end">
                <p className="text-xs text-on-surface-variant bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
                  <strong>Note :</strong> la création d'un nouveau sondage désactive automatiquement tous les sondages actifs existants.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Publication…' : 'Publier le sondage'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ── Sondages actifs ── */}
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
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Sondages inactifs / clôturés ── */}
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
              />
            ))}
          </div>
        </section>
      )}

      {surveys.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <ClipboardCheck size={36} className="text-on-surface-variant/25" />
          <p className="font-semibold text-on-surface-variant">Aucun sondage créé pour le moment.</p>
          <Button variant="primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Créer le premier sondage
          </Button>
        </div>
      )}
    </div>
  );
}

// ── SurveyRow ────────────────────────────────────────────────────────────────

function SurveyRow({
  survey,
  onToggle,
  onDelete,
  confirmDeleteId,
  onConfirmDelete,
  onCancelDelete,
}: {
  survey: Survey;
  onToggle: () => void;
  onDelete: () => void;
  confirmDeleteId: number | null;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const daysLeft = survey.ends_at
    ? Math.max(0, Math.ceil((new Date(survey.ends_at).getTime() - Date.now()) / 86_400_000))
    : null;

  const createdAt = new Date(survey.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Card className={`bg-white border-none space-y-0 p-0 overflow-hidden transition-shadow ${survey.is_active ? 'shadow-md' : 'shadow-sm opacity-80'}`}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-5 py-4">
        {/* Status dot */}
        <span
          className={`shrink-0 w-2.5 h-2.5 rounded-full ${survey.is_active ? 'bg-emerald-400' : 'bg-slate-300'}`}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm truncate">{survey.title}</p>
          <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">{survey.question}</p>
        </div>

        {/* Meta */}
        <div className="hidden sm:flex items-center gap-4 text-[11px] text-on-surface-variant font-medium shrink-0">
          <span className="flex items-center gap-1">
            <Users size={11} /> {survey.responses_count} réponse{survey.responses_count > 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare size={11} /> {survey.options.length} options
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

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors text-xs font-bold"
            title="Voir les options"
          >
            {expanded ? 'Masquer' : 'Détails'}
          </button>
          <a
            href={`/admin/surveys/${survey.id}/export`}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
            title="Exporter CSV"
          >
            <Download size={15} />
          </a>
          <button
            type="button"
            onClick={onToggle}
            className={`p-2 rounded-lg transition-colors ${
              survey.is_active
                ? 'text-emerald-600 hover:bg-emerald-50'
                : 'text-slate-400 hover:bg-surface-container-low'
            }`}
            title={survey.is_active ? 'Désactiver' : 'Activer'}
          >
            {survey.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          </button>
          {confirmDeleteId === survey.id ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onConfirmDelete}
                className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                title="Confirmer la suppression"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                onClick={onCancelDelete}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
                title="Annuler"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onDelete}
              className="p-2 rounded-lg text-on-surface-variant hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Supprimer"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Options list (expandable) */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-surface-container-high pt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Options</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {survey.options.map((opt, i) => (
              <div
                key={opt.key}
                className="flex items-center gap-2 rounded-lg border border-surface-container-high px-3 py-2 text-sm"
              >
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
