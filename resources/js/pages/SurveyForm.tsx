import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Types ─────────────────────────────────────────────────────────────────────

type QuestionType = 'radio' | 'checkbox' | 'text' | 'rating';

type SurveyQuestion = {
  id: string;
  section?: string;
  label: string;
  type: QuestionType;
  options?: string[];
  required: boolean;
  multiline?: boolean;
};

type SurveyData = {
  id: number;
  title: string;
  description?: string | null;
  cover_image?: string | null;
  questions: SurveyQuestion[];
  token: string;
  ends_at?: string | null;
};

interface SurveyFormProps {
  survey: SurveyData;
  has_answered: boolean;
  is_preview?: boolean;
}

type Answers = Record<string, string | string[]>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupBySection(questions: SurveyQuestion[]): { section: string | null; questions: SurveyQuestion[] }[] {
  const groups: { section: string | null; questions: SurveyQuestion[] }[] = [];
  let current: { section: string | null; questions: SurveyQuestion[] } | null = null;

  for (const q of questions) {
    const section = q.section || null;
    if (!current || current.section !== section) {
      current = { section, questions: [q] };
      groups.push(current);
    } else {
      current.questions.push(q);
    }
  }
  return groups;
}

// ── Star Rating ───────────────────────────────────────────────────────────────

const RATING_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Mauvais',   color: '#EF4444' },
  2: { label: 'Passable',  color: '#F97316' },
  3: { label: 'Bien',      color: '#EAB308' },
  4: { label: 'Très bien', color: '#84CC16' },
  5: { label: 'Excellent', color: '#10B981' },
};

function StarRating({ value, onChange }: { value: string | undefined; onChange: (val: string) => void }) {
  const [hovered, setHovered] = useState(0);
  const current = Number(value) || 0;
  const display = hovered || current;
  const meta = display > 0 ? RATING_LABELS[display] : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= display;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(String(n))}
              onMouseEnter={() => setHovered(n)}
              className="focus:outline-none transition-transform duration-100"
              style={{ transform: filled ? 'scale(1.18)' : 'scale(1)' }}
            >
              <Star
                size={36}
                strokeWidth={1.5}
                style={{
                  color:  filled ? '#F59E0B' : '#D1D5DB',
                  fill:   filled ? '#FBBF24' : 'transparent',
                  filter: filled ? 'drop-shadow(0 0 5px rgba(251,191,36,0.55))' : 'none',
                  transition: 'color 0.12s, fill 0.12s, filter 0.12s',
                }}
              />
            </button>
          );
        })}
      </div>

      <div className="h-6 flex items-center">
        {meta ? (
          <div
            className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200"
          >
            {/* mini bar */}
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="h-1.5 w-5 rounded-full transition-colors duration-150"
                  style={{ backgroundColor: n <= display ? meta.color : '#E5E7EB' }}
                />
              ))}
            </div>
            <span className="text-sm font-bold" style={{ color: meta.color }}>
              {display}/5 — {meta.label}
            </span>
          </div>
        ) : (
          <span className="text-xs text-on-surface-variant/50 italic">Cliquez sur une étoile pour noter</span>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SurveyForm({ survey, has_answered, is_preview = false }: SurveyFormProps) {
  const { props } = usePage<{ flash?: { success?: string; error?: string } }>();
  const flash = props.flash ?? {};

  const [answers, setAnswers]     = useState<Answers>({});
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(has_answered);
  const [currentPage, setCurrentPage] = useState(0);

  const sections   = groupBySection(survey.questions);
  const totalPages = sections.length;
  const isLastPage = currentPage === totalPages - 1;

  const setAnswer = (id: string, value: string | string[]) => {
    setAnswers((a) => ({ ...a, [id]: value }));
    setErrors((e) => { const next = { ...e }; delete next[id]; return next; });
  };

  const toggleCheckbox = (id: string, option: string) => {
    const current = (answers[id] as string[]) || [];
    const next = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option];
    setAnswer(id, next);
  };

  const validatePage = (pageIndex: number): boolean => {
    const errs: Record<string, string> = {};
    for (const q of sections[pageIndex].questions) {
      if (!q.required) continue;
      const val = answers[q.id];
      const empty = val === undefined || val === '' || (Array.isArray(val) && val.length === 0);
      if (empty) errs[q.id] = 'Cette question est obligatoire.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (!validatePage(currentPage)) {
      document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setCurrentPage((p) => Math.min(p + 1, totalPages - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goPrev = () => {
    setCurrentPage((p) => Math.max(p - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = () => {
    if (!validatePage(currentPage)) {
      document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSubmitting(true);
    router.post(
      `/surveys/${survey.token}/respond`,
      { answers },
      {
        preserveScroll: true,
        onSuccess: () => setSubmitted(true),
        onError:   () => setSubmitting(false),
        onFinish:  () => setSubmitting(false),
      },
    );
  };

  // ── Thank-you screen ────────────────────────────────────────────────────────
  if (submitted && !is_preview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-primary/3 flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-on-surface">
              Merci pour votre participation !
            </h1>
            <p className="text-on-surface-variant mt-2">
              Vos réponses ont bien été enregistrées. Le Groupe PAD vous remercie de votre retour.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-surface-container-high p-5 text-left space-y-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">Sondage complété</p>
            <p className="font-bold text-on-surface">{survey.title}</p>
          </div>
          <button
            type="button"
            onClick={() => window.close()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-surface-container-high text-on-surface rounded-xl font-semibold text-sm hover:bg-surface-container-highest transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  const currentSection = sections[currentPage];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-primary/3 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Preview banner */}
        {is_preview && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-semibold text-amber-800 animate-in fade-in duration-300">
            <span className="shrink-0 bg-amber-200 text-amber-800 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
              Aperçu
            </span>
            Vous visualisez ce sondage en mode prévisualisation — les réponses ne seront pas enregistrées.
          </div>
        )}

        {/* Flash error */}
        {flash.error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium animate-in fade-in duration-300">
            {flash.error}
          </div>
        )}

        {/* Survey header card */}
        <div className="bg-primary rounded-2xl overflow-hidden text-white shadow-lg shadow-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {survey.cover_image && (
            <div className="relative h-48 w-full">
              <img src={survey.cover_image} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent" />
            </div>
          )}
          <div className="px-6 py-6">
            <div className="flex items-center gap-3 mb-3">
              <ClipboardList size={22} className="opacity-80" />
              <span className="text-sm font-bold opacity-80 uppercase tracking-wider">Sondage RH</span>
            </div>
            <h1 className="text-2xl font-extrabold leading-snug">{survey.title}</h1>
            {survey.description && (
              <p className="mt-2 text-white/80 text-sm leading-relaxed">{survey.description}</p>
            )}
            {survey.ends_at && (
              <div className="flex items-center gap-1.5 mt-3 text-white/70 text-xs font-semibold">
                <Calendar size={13} />
                Clôture le {new Date(survey.ends_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </div>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="space-y-2 animate-in fade-in duration-500">
          <div className="flex items-center justify-between text-xs font-semibold text-on-surface-variant">
            <span className="truncate max-w-[70%]">{currentSection.section ?? `Étape ${currentPage + 1}`}</span>
            <span className="shrink-0 tabular-nums">{currentPage + 1} / {totalPages}</span>
          </div>
          <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }}
            />
          </div>
          <div className="flex justify-center items-center gap-1.5 pt-0.5">
            {sections.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width:           i === currentPage ? 24 : 8,
                  height:          8,
                  backgroundColor: i < currentPage  ? 'var(--color-primary)' :
                                   i === currentPage ? 'var(--color-primary)' :
                                   'var(--color-surface-container-high)',
                  opacity: i < currentPage ? 0.45 : 1,
                }}
              />
            ))}
          </div>
        </div>

        {/* Current section questions */}
        <div className="space-y-4 animate-in fade-in duration-300" key={currentPage}>
          {currentSection.section && (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-surface-container-high" />
              <h2 className="text-xs font-black uppercase tracking-widest text-primary/70 px-2 whitespace-nowrap">
                {currentSection.section}
              </h2>
              <div className="h-px flex-1 bg-surface-container-high" />
            </div>
          )}

          {currentSection.questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              answer={answers[q.id]}
              error={errors[q.id]}
              onChangeRadio={(val) => setAnswer(q.id, val)}
              onToggleCheckbox={(val) => toggleCheckbox(q.id, val)}
              onChangeText={(val) => setAnswer(q.id, val)}
              onChangeRating={(val) => setAnswer(q.id, val)}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-2xl border border-surface-container-high p-5 flex items-center justify-between gap-4">
          <div className="min-w-[100px]">
            {currentPage > 0 && (
              <Button variant="ghost" size="md" onClick={goPrev} className="gap-1.5">
                <ChevronLeft size={16} />
                Précédent
              </Button>
            )}
          </div>

          {isLastPage && (
            <p className="text-xs text-on-surface-variant hidden sm:block text-center">
              Les champs <span className="text-red-500 font-bold">*</span> sont obligatoires.
            </p>
          )}

          <div className="min-w-[100px] flex justify-end">
            {isLastPage ? (
              <Button
                variant="primary"
                size="lg"
                disabled={submitting || is_preview}
                onClick={submit}
                title={is_preview ? 'Désactivé en mode aperçu' : undefined}
              >
                {submitting ? 'Envoi…' : 'Soumettre'}
              </Button>
            ) : (
              <Button variant="primary" size="md" onClick={goNext} className="gap-1.5">
                Suivant
                <ChevronRight size={16} />
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Question card ─────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  answer,
  error,
  onChangeRadio,
  onToggleCheckbox,
  onChangeText,
  onChangeRating,
}: {
  question: SurveyQuestion;
  answer: string | string[] | undefined;
  error?: string;
  onChangeRadio: (val: string) => void;
  onToggleCheckbox: (val: string) => void;
  onChangeText: (val: string) => void;
  onChangeRating: (val: string) => void;
}) {
  return (
    <div
      data-error={!!error}
      className={`bg-white rounded-2xl border transition-colors p-5 space-y-4 shadow-sm ${
        error ? 'border-red-300 shadow-red-100' : 'border-surface-container-high'
      }`}
    >
      <div className="space-y-1">
        <p className="font-semibold text-on-surface leading-snug">
          {question.label}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </p>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      </div>

      {question.type === 'radio' && (
        <div className="space-y-2">
          {(question.options ?? []).map((opt) => (
            <label key={opt}
              className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-all ${
                answer === opt
                  ? 'border-primary bg-primary/5'
                  : 'border-surface-container-high hover:border-primary/30 hover:bg-surface-container-low/50'
              }`}>
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                answer === opt ? 'border-primary' : 'border-on-surface-variant/30'
              }`}>
                {answer === opt && <span className="w-2 h-2 rounded-full bg-primary" />}
              </span>
              <span className={`text-sm font-medium ${answer === opt ? 'text-primary font-semibold' : 'text-on-surface'}`}>
                {opt}
              </span>
              <input type="radio" className="sr-only" checked={answer === opt} onChange={() => onChangeRadio(opt)} />
            </label>
          ))}
        </div>
      )}

      {question.type === 'checkbox' && (
        <div className="space-y-2">
          {(question.options ?? []).map((opt) => {
            const checked = Array.isArray(answer) && answer.includes(opt);
            return (
              <label key={opt}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-all ${
                  checked
                    ? 'border-primary bg-primary/5'
                    : 'border-surface-container-high hover:border-primary/30 hover:bg-surface-container-low/50'
                }`}>
                <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                  checked ? 'border-primary bg-primary' : 'border-on-surface-variant/30'
                }`}>
                  {checked && <span className="text-white text-[10px] font-black">✓</span>}
                </span>
                <span className={`text-sm font-medium ${checked ? 'text-primary font-semibold' : 'text-on-surface'}`}>
                  {opt}
                </span>
                <input type="checkbox" className="sr-only" checked={checked} onChange={() => onToggleCheckbox(opt)} />
              </label>
            );
          })}
        </div>
      )}

      {question.type === 'text' && (
        question.multiline === false ? (
          <input
            type="text"
            value={(answer as string) ?? ''}
            onChange={(e) => onChangeText(e.target.value)}
            placeholder="Votre réponse…"
            className="w-full border border-surface-container-high rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        ) : (
          <textarea
            value={(answer as string) ?? ''}
            onChange={(e) => onChangeText(e.target.value)}
            rows={3}
            placeholder="Votre réponse…"
            className="w-full border border-surface-container-high rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        )
      )}

      {question.type === 'rating' && (
        <StarRating value={answer as string | undefined} onChange={onChangeRating} />
      )}
    </div>
  );
}
