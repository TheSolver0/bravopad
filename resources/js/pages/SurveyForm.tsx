import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Star,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import LanguageToggle from '@/components/LanguageToggle';

type QuestionType = 'radio' | 'checkbox' | 'text' | 'rating';
type SupportedLang = 'fr' | 'en';
type I18nValue = Partial<Record<SupportedLang, string>>;
type I18nArrayValue = Partial<Record<SupportedLang, string[]>>;

type SurveyQuestion = {
  id: string;
  section?: string;
  section_i18n?: I18nValue;
  label: string;
  label_i18n?: I18nValue;
  type: QuestionType;
  options?: string[];
  options_i18n?: I18nArrayValue;
  required: boolean;
  multiline?: boolean;
};

type SurveyData = {
  id: number;
  title: string;
  description?: string | null;
  cover_image?: string | null;
  questions: SurveyQuestion[];
  options?: Record<string, unknown> | null;
  token: string;
  ends_at?: string | null;
};

interface SurveyFormProps {
  survey: SurveyData;
  has_answered: boolean;
  is_preview?: boolean;
}

type Answers = Record<string, string | string[]>;

function groupBySection(questions: SurveyQuestion[]): { section: string | null; section_i18n?: I18nValue; questions: SurveyQuestion[] }[] {
  const groups: { section: string | null; section_i18n?: I18nValue; questions: SurveyQuestion[] }[] = [];
  let current: { section: string | null; section_i18n?: I18nValue; questions: SurveyQuestion[] } | null = null;

  for (const q of questions) {
    const section = q.section || null;
    if (!current || current.section !== section) {
      current = { section, section_i18n: q.section_i18n, questions: [q] };
      groups.push(current);
    } else {
      current.questions.push(q);
    }
  }

  return groups;
}

function localeFromI18n(language?: string): SupportedLang {
  return language?.startsWith('en') ? 'en' : 'fr';
}

function pickI18n(value: string | null | undefined, i18nValue: I18nValue | undefined, lang: SupportedLang): string {
  if (i18nValue) {
    return i18nValue[lang] ?? i18nValue.fr ?? i18nValue.en ?? value ?? '';
  }
  return value ?? '';
}

function pickI18nArray(value: string[] | undefined, i18nValue: I18nArrayValue | undefined, lang: SupportedLang): string[] {
  if (i18nValue) {
    return i18nValue[lang] ?? i18nValue.fr ?? i18nValue.en ?? value ?? [];
  }
  return value ?? [];
}

const RATING_COLORS: Record<number, string> = {
  1: '#EF4444',
  2: '#F97316',
  3: '#EAB308',
  4: '#84CC16',
  5: '#10B981',
};

function ratingLabel(score: number, lang: SupportedLang): string {
  const labels =
    lang === 'en'
      ? { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very good', 5: 'Excellent' }
      : { 1: 'Mauvais', 2: 'Passable', 3: 'Bien', 4: 'Tres bien', 5: 'Excellent' };
  return labels[score as keyof typeof labels] ?? '';
}

function StarRating({
  value,
  onChange,
  lang,
}: {
  value: string | undefined;
  onChange: (val: string) => void;
  lang: SupportedLang;
}) {
  const [hovered, setHovered] = useState(0);
  const current = Number(value) || 0;
  const display = hovered || current;
  const color = display > 0 ? RATING_COLORS[display] : '#E5E7EB';

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
                  color: filled ? '#F59E0B' : '#D1D5DB',
                  fill: filled ? '#FBBF24' : 'transparent',
                  filter: filled ? 'drop-shadow(0 0 5px rgba(251,191,36,0.55))' : 'none',
                  transition: 'color 0.12s, fill 0.12s, filter 0.12s',
                }}
              />
            </button>
          );
        })}
      </div>

      <div className="h-6 flex items-center">
        {display > 0 ? (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="h-1.5 w-5 rounded-full transition-colors duration-150"
                  style={{ backgroundColor: n <= display ? color : '#E5E7EB' }}
                />
              ))}
            </div>
            <span className="text-sm font-bold" style={{ color }}>
              {display}/5 — {ratingLabel(display, lang)}
            </span>
          </div>
        ) : (
          <span className="text-xs text-on-surface-variant/50 italic">
            {lang === 'en' ? 'Click a star to rate' : 'Cliquez sur une etoile pour noter'}
          </span>
        )}
      </div>
    </div>
  );
}

export default function SurveyForm({ survey, has_answered, is_preview = false }: SurveyFormProps) {
  const { t, i18n } = useTranslation();
  const { props } = usePage<{ flash?: { success?: string; error?: string } }>();
  const flash = props.flash ?? {};
  const lang = localeFromI18n(i18n.resolvedLanguage);

  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(has_answered);
  const [currentPage, setCurrentPage] = useState(0);

  const sections = groupBySection(survey.questions);
  const totalPages = sections.length;
  const isLastPage = currentPage === totalPages - 1;
  const i18nMeta = (survey.options?.i18n as Record<string, I18nValue> | undefined) ?? {};

  const surveyTitle = pickI18n(survey.title, i18nMeta.title, lang);
  const surveyDescription = pickI18n(survey.description ?? '', i18nMeta.description, lang);
  const initiativeBy = pickI18n((survey.options?.initiative_by as string | undefined) ?? '', i18nMeta.initiative_by, lang);

  const setAnswer = (id: string, value: string | string[]) => {
    setAnswers((a) => ({ ...a, [id]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[id];
      return next;
    });
  };

  const toggleCheckbox = (id: string, option: string) => {
    const current = (answers[id] as string[]) || [];
    const next = current.includes(option) ? current.filter((v) => v !== option) : [...current, option];
    setAnswer(id, next);
  };

  const validatePage = (pageIndex: number): boolean => {
    const errs: Record<string, string> = {};
    for (const q of sections[pageIndex].questions) {
      if (!q.required) continue;
      const val = answers[q.id];
      const empty = val === undefined || val === '' || (Array.isArray(val) && val.length === 0);
      if (empty) {
        errs[q.id] = lang === 'en' ? 'This question is required.' : 'Cette question est obligatoire.';
      }
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
        onError: () => setSubmitting(false),
        onFinish: () => setSubmitting(false),
      },
    );
  };

  if (submitted && !is_preview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-primary/3 flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-on-surface">
              {lang === 'en' ? 'Thanks for your participation!' : 'Merci pour votre participation !'}
            </h1>
            <p className="text-on-surface-variant mt-2">
              {lang === 'en'
                ? 'Your answers were recorded successfully. PAD Group thanks you for your feedback.'
                : 'Vos reponses ont bien ete enregistrees. Le Groupe PAD vous remercie de votre retour.'}
            </p>
          </div>
          <img src="/assets/images/surveys/fin_survey.jpeg" alt="Survey complete" className="w-full rounded-2xl object-cover shadow-md" />
          <div className="bg-white rounded-2xl border border-surface-container-high p-5 text-left space-y-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
              {lang === 'en' ? 'Survey completed' : 'Sondage complete'}
            </p>
            <p className="font-bold text-on-surface">{surveyTitle}</p>
          </div>
          <button
            type="button"
            onClick={() => window.close()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-surface-container-high text-on-surface rounded-xl font-semibold text-sm hover:bg-surface-container-highest transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    );
  }

  const currentSection = sections[currentPage];
  const currentSectionLabel = pickI18n(currentSection.section, currentSection.section_i18n, lang);

  return (
    <>
      <Head>
        <title>{surveyTitle}</title>
        <meta name="description" content={surveyDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={surveyTitle} />
        <meta property="og:description" content={surveyDescription} />
        {survey.cover_image && <meta property="og:image" content={survey.cover_image} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={surveyTitle} />
        <meta name="twitter:description" content={surveyDescription} />
        {survey.cover_image && <meta name="twitter:image" content={survey.cover_image} />}
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-primary/3 px-4 py-10">
        <div className="mx-auto max-w-2xl mb-4 flex justify-end">
          <LanguageToggle />
        </div>
        <div className="max-w-2xl mx-auto space-y-6">
          {is_preview && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-semibold text-amber-800 animate-in fade-in duration-300">
              <span className="shrink-0 bg-amber-200 text-amber-800 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                {lang === 'en' ? 'Preview' : 'Apercu'}
              </span>
              {lang === 'en'
                ? 'You are viewing this survey in preview mode — responses will not be saved.'
                : 'Vous visualisez ce sondage en mode previsualisation — les reponses ne seront pas enregistrees.'}
            </div>
          )}

          {flash.error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium animate-in fade-in duration-300">
              {flash.error}
            </div>
          )}

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
                <span className="text-sm font-bold opacity-80 uppercase tracking-wider">{lang === 'en' ? 'HR Survey' : 'Sondage RH'}</span>
              </div>
              <h1 className="text-2xl font-extrabold leading-snug">{surveyTitle}</h1>
              {surveyDescription && <p className="mt-2 text-white/80 text-sm leading-relaxed">{surveyDescription}</p>}
              {survey.ends_at && (
                <div className="flex items-center gap-1.5 mt-3 text-white/70 text-xs font-semibold">
                  <Calendar size={13} />
                  {lang === 'en' ? 'Closes on' : 'Cloture le'}{' '}
                  {new Date(survey.ends_at).toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              )}
              {initiativeBy && (
                <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-white/20 text-white/90 text-xs font-semibold">
                  <Building2 size={13} className="shrink-0 opacity-80" />
                  <span>
                    {lang === 'en' ? 'An initiative by' : 'Une initiative de la'} <span className="font-black">{initiativeBy}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 animate-in fade-in duration-500">
            <div className="flex items-center justify-between text-xs font-semibold text-on-surface-variant">
              <span className="truncate max-w-[70%]">
                {currentSectionLabel || (lang === 'en' ? `Step ${currentPage + 1}` : `Etape ${currentPage + 1}`)}
              </span>
              <span className="shrink-0 tabular-nums">
                {currentPage + 1} / {totalPages}
              </span>
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
                    width: i === currentPage ? 24 : 8,
                    height: 8,
                    backgroundColor:
                      i < currentPage ? 'var(--color-primary)' : i === currentPage ? 'var(--color-primary)' : 'var(--color-surface-container-high)',
                    opacity: i < currentPage ? 0.45 : 1,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4 animate-in fade-in duration-300" key={currentPage}>
            {currentSectionLabel && (
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-surface-container-high" />
                <h2 className="text-xs font-black uppercase tracking-widest text-primary/70 px-2 whitespace-nowrap">{currentSectionLabel}</h2>
                <div className="h-px flex-1 bg-surface-container-high" />
              </div>
            )}

            {currentSection.questions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                answer={answers[q.id]}
                error={errors[q.id]}
                lang={lang}
                onChangeRadio={(val) => setAnswer(q.id, val)}
                onToggleCheckbox={(val) => toggleCheckbox(q.id, val)}
                onChangeText={(val) => setAnswer(q.id, val)}
                onChangeRating={(val) => setAnswer(q.id, val)}
              />
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-surface-container-high p-5 flex items-center justify-between gap-4">
            <div className="min-w-[100px]">
              {currentPage > 0 && (
                <Button variant="ghost" size="md" onClick={goPrev} className="gap-1.5">
                  <ChevronLeft size={16} />
                  {t('common.previous')}
                </Button>
              )}
            </div>

            {isLastPage && (
              <p className="text-xs text-on-surface-variant hidden sm:block text-center">
                {lang === 'en' ? 'Fields marked with' : 'Les champs'} <span className="text-red-500 font-bold">*</span>{' '}
                {lang === 'en' ? 'are required.' : 'sont obligatoires.'}
              </p>
            )}

            <div className="min-w-[100px] flex justify-end">
              {isLastPage ? (
                <Button
                  variant="primary"
                  size="lg"
                  disabled={submitting || is_preview}
                  onClick={submit}
                  title={is_preview ? (lang === 'en' ? 'Disabled in preview mode' : 'Desactive en mode apercu') : undefined}
                >
                  {submitting ? t('common.sending') : lang === 'en' ? 'Submit' : 'Soumettre'}
                </Button>
              ) : (
                <Button variant="primary" size="md" onClick={goNext} className="gap-1.5">
                  {t('common.next')}
                  <ChevronRight size={16} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function QuestionCard({
  question,
  answer,
  error,
  lang,
  onChangeRadio,
  onToggleCheckbox,
  onChangeText,
  onChangeRating,
}: {
  question: SurveyQuestion;
  answer: string | string[] | undefined;
  error?: string;
  lang: SupportedLang;
  onChangeRadio: (val: string) => void;
  onToggleCheckbox: (val: string) => void;
  onChangeText: (val: string) => void;
  onChangeRating: (val: string) => void;
}) {
  const label = pickI18n(question.label, question.label_i18n, lang);
  const options = pickI18nArray(question.options, question.options_i18n, lang);

  return (
    <div
      data-error={!!error}
      className={`bg-white rounded-2xl border transition-colors p-5 space-y-4 shadow-sm ${
        error ? 'border-red-300 shadow-red-100' : 'border-surface-container-high'
      }`}
    >
      <div className="space-y-1">
        <p className="font-semibold text-on-surface leading-snug">
          {label}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </p>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      </div>

      {question.type === 'radio' && (
        <div className="space-y-2">
          {options.map((opt) => (
            <label
              key={opt}
              className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-all ${
                answer === opt ? 'border-primary bg-primary/5' : 'border-surface-container-high hover:border-primary/30 hover:bg-surface-container-low/50'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  answer === opt ? 'border-primary' : 'border-on-surface-variant/30'
                }`}
              >
                {answer === opt && <span className="w-2 h-2 rounded-full bg-primary" />}
              </span>
              <span className={`text-sm font-medium ${answer === opt ? 'text-primary font-semibold' : 'text-on-surface'}`}>{opt}</span>
              <input type="radio" className="sr-only" checked={answer === opt} onChange={() => onChangeRadio(opt)} />
            </label>
          ))}
        </div>
      )}

      {question.type === 'checkbox' && (
        <div className="space-y-2">
          {options.map((opt) => {
            const checked = Array.isArray(answer) && answer.includes(opt);
            return (
              <label
                key={opt}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-all ${
                  checked ? 'border-primary bg-primary/5' : 'border-surface-container-high hover:border-primary/30 hover:bg-surface-container-low/50'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                    checked ? 'border-primary bg-primary' : 'border-on-surface-variant/30'
                  }`}
                >
                  {checked && <span className="text-white text-[10px] font-black">✓</span>}
                </span>
                <span className={`text-sm font-medium ${checked ? 'text-primary font-semibold' : 'text-on-surface'}`}>{opt}</span>
                <input type="checkbox" className="sr-only" checked={checked} onChange={() => onToggleCheckbox(opt)} />
              </label>
            );
          })}
        </div>
      )}

      {question.type === 'text' &&
        (question.multiline === false ? (
          <input
            type="text"
            value={(answer as string) ?? ''}
            onChange={(e) => onChangeText(e.target.value)}
            placeholder={lang === 'en' ? 'Your answer…' : 'Votre reponse…'}
            className="w-full border border-surface-container-high rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        ) : (
          <textarea
            value={(answer as string) ?? ''}
            onChange={(e) => onChangeText(e.target.value)}
            rows={3}
            placeholder={lang === 'en' ? 'Your answer…' : 'Votre reponse…'}
            className="w-full border border-surface-container-high rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        ))}

      {question.type === 'rating' && <StarRating value={answer as string | undefined} onChange={onChangeRating} lang={lang} />}
    </div>
  );
}
