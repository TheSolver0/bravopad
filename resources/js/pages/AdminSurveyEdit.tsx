import { useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  GripVertical,
  ImagePlus,
  Plus,
  Star,
  Text,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// ── Types ─────────────────────────────────────────────────────────────────────

type QuestionType = 'radio' | 'checkbox' | 'text' | 'rating';

type SurveyQuestion = {
  id: string;
  section: string;
  label: string;
  type: QuestionType;
  options: string[];
  required: boolean;
};

type ExistingSurvey = {
  id: number;
  title: string;
  description?: string | null;
  cover_image?: string | null;
  questions: SurveyQuestion[];
  ends_at?: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const questionTypesMeta: { type: QuestionType; label: string }[] = [
  { type: 'radio',    label: 'Choix unique' },
  { type: 'checkbox', label: 'Choix multiple' },
  { type: 'text',     label: 'Texte libre' },
  { type: 'rating',   label: 'Note (1–5)' },
];

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

function makeQuestion(): SurveyQuestion {
  return { id: `q_${uid()}`, section: '', label: '', type: 'radio', options: ['', ''], required: true };
}

function inputCls(hasError: boolean) {
  return `w-full border ${hasError ? 'border-red-400' : 'border-surface-container-high'} rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white`;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminSurveyEdit({ survey }: { survey: ExistingSurvey }) {
  const [title, setTitle]             = useState(survey.title);
  const [description, setDescription] = useState(survey.description ?? '');
  const [endsAt, setEndsAt]           = useState(survey.ends_at ?? '');
  const [coverFile, setCoverFile]     = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(survey.cover_image ?? null);
  const [removeCover, setRemoveCover] = useState(false);
  const coverInputRef                 = useRef<HTMLInputElement>(null);
  const [questions, setQuestions]     = useState<SurveyQuestion[]>(
    survey.questions.length > 0 ? survey.questions : [makeQuestion()],
  );
  const [submitting, setSubmitting]   = useState(false);
  const [errors, setErrors]           = useState<Record<string, string>>({});

  // ── Question mutations ──────────────────────────────────────────────────────

  const addQuestion = () => setQuestions((q) => [...q, makeQuestion()]);

  const removeQuestion = (idx: number) =>
    setQuestions((q) => q.filter((_, i) => i !== idx));

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const next = [...questions];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setQuestions(next);
  };

  const updateQuestion = (idx: number, patch: Partial<SurveyQuestion>) =>
    setQuestions((q) => q.map((item, i) => (i === idx ? { ...item, ...patch } : item)));

  const addOption = (idx: number) =>
    setQuestions((q) =>
      q.map((item, i) => (i === idx ? { ...item, options: [...item.options, ''] } : item)),
    );

  const updateOption = (qIdx: number, oIdx: number, val: string) =>
    setQuestions((q) =>
      q.map((item, i) =>
        i === qIdx
          ? { ...item, options: item.options.map((o, j) => (j === oIdx ? val : o)) }
          : item,
      ),
    );

  const removeOption = (qIdx: number, oIdx: number) =>
    setQuestions((q) =>
      q.map((item, i) =>
        i === qIdx ? { ...item, options: item.options.filter((_, j) => j !== oIdx) } : item,
      ),
    );

  // ── Cover image ─────────────────────────────────────────────────────────────

  const onCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setCoverFile(file);
    setRemoveCover(false);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setCoverPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setCoverPreview(null);
    }
  };

  const removeCoverImage = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setRemoveCover(true);
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  // ── Validation & submit ─────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Titre requis';
    questions.forEach((q, i) => {
      if (!q.label.trim()) errs[`q${i}_label`] = 'Question requise';
      if ((q.type === 'radio' || q.type === 'checkbox') && q.options.filter(Boolean).length < 2)
        errs[`q${i}_options`] = 'Au moins 2 options requises';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    setSubmitting(true);

    router.post(
      `/admin/surveys/${survey.id}`,
      {
        _method:      'PUT',
        title:        title.trim(),
        description:  description.trim() || null,
        ends_at:      endsAt || null,
        remove_cover: removeCover,
        cover_image:  coverFile ?? undefined,
        questions:    questions.map((q) => ({
          ...q,
          options: (q.type === 'radio' || q.type === 'checkbox') ? q.options.filter(Boolean) : [],
        })),
      },
      {
        forceFormData: true,
        onError:  (e) => { setErrors(e as Record<string, string>); setSubmitting(false); },
        onFinish: () => setSubmitting(false),
      },
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

      {/* Back */}
      <a
        href="/admin/surveys"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <ArrowLeft size={16} /> Retour aux sondages
      </a>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
          <ClipboardCheck size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Modifier le sondage</h1>
          <p className="text-sm text-on-surface-variant font-medium">
            Modifiez les informations et les questions, puis enregistrez.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Left column : metadata + actions ── */}
        <div className="space-y-4 lg:sticky lg:top-6">
          <Card className="bg-white border-none shadow-md p-5 space-y-4">
            <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
              Informations générales
            </p>

            <Field label="Titre du sondage" error={errors.title} required>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Fête du travail 2026 — Perception du personnel"
                className={inputCls(!!errors.title)}
              />
            </Field>

            <Field label="Description" hint="(optionnel)">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Contexte ou instructions pour les participants…"
                className={`${inputCls(false)} resize-none`}
              />
            </Field>

            <Field label="Date de clôture" hint="(optionnel)">
              <input
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className={inputCls(false)}
              />
            </Field>

            <Field label="Image de couverture" hint="(optionnel — max 4 Mo)" error={errors.cover_image}>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onCoverChange}
              />
              {coverPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-surface-container-high">
                  <img src={coverPreview} alt="Aperçu" className="w-full h-36 object-cover" />
                  <button
                    type="button"
                    onClick={removeCoverImage}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                    <X size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="absolute bottom-2 right-2 text-[10px] font-bold bg-black/50 text-white px-2 py-1 rounded-full hover:bg-black/70 transition-colors"
                  >
                    Changer
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="w-full h-24 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-surface-container-high text-on-surface-variant hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
                >
                  <ImagePlus size={20} />
                  <span className="text-xs font-semibold">Choisir une image</span>
                </button>
              )}
            </Field>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.visit('/admin/surveys')}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              disabled={submitting}
              onClick={submit}
            >
              {submitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </div>

        {/* ── Right column : questions ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
              Questions ({questions.length})
            </p>
          </div>

          {questions.map((q, idx) => (
            <QuestionEditor
              key={q.id}
              question={q}
              index={idx}
              total={questions.length}
              errors={errors}
              onChange={(patch) => updateQuestion(idx, patch)}
              onMoveUp={() => moveQuestion(idx, -1)}
              onMoveDown={() => moveQuestion(idx, 1)}
              onRemove={() => removeQuestion(idx)}
              onAddOption={() => addOption(idx)}
              onUpdateOption={(oIdx, val) => updateOption(idx, oIdx, val)}
              onRemoveOption={(oIdx) => removeOption(idx, oIdx)}
            />
          ))}

          <button
            type="button"
            onClick={addQuestion}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary/20 rounded-xl py-4 text-sm font-semibold text-primary/70 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <Plus size={16} /> Ajouter une question
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Question editor ───────────────────────────────────────────────────────────

function QuestionEditor({
  question, index, total, errors, onChange, onMoveUp, onMoveDown,
  onRemove, onAddOption, onUpdateOption, onRemoveOption,
}: {
  question: SurveyQuestion;
  index: number;
  total: number;
  errors: Record<string, string>;
  onChange: (patch: Partial<SurveyQuestion>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onAddOption: () => void;
  onUpdateOption: (oIdx: number, val: string) => void;
  onRemoveOption: (oIdx: number) => void;
}) {
  const needsOptions = question.type === 'radio' || question.type === 'checkbox';

  return (
    <Card className="bg-white border-none shadow-md p-5 space-y-4">
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Reorder controls */}
        <div className="flex flex-col gap-0.5 pt-1 shrink-0">
          <button
            type="button" onClick={onMoveUp} disabled={index === 0}
            className="p-1 rounded text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-surface-container-low disabled:opacity-20 transition-colors"
          >
            <ChevronUp size={13} />
          </button>
          <GripVertical size={13} className="text-on-surface-variant/30 mx-auto" />
          <button
            type="button" onClick={onMoveDown} disabled={index === total - 1}
            className="p-1 rounded text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-surface-container-low disabled:opacity-20 transition-colors"
          >
            <ChevronDown size={13} />
          </button>
        </div>

        {/* Question number */}
        <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black mt-0.5">
          {index + 1}
        </span>

        <div className="flex-1 space-y-3 min-w-0">
          {/* Section + type row */}
          <div className="flex gap-2 flex-wrap">
            <input
              value={question.section}
              onChange={(e) => onChange({ section: e.target.value })}
              placeholder="Section (ex: Organisation, Ambiance…)"
              className="flex-1 min-w-40 border border-surface-container-high rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface-container-low/50"
            />
            <select
              value={question.type}
              onChange={(e) => onChange({ type: e.target.value as QuestionType })}
              className="border border-surface-container-high rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            >
              {questionTypesMeta.map((m) => (
                <option key={m.type} value={m.type}>{m.label}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={question.required}
                onChange={(e) => onChange({ required: e.target.checked })}
                className="accent-primary"
              />
              Obligatoire
            </label>
          </div>

          {/* Question label */}
          <div>
            <textarea
              value={question.label}
              onChange={(e) => onChange({ label: e.target.value })}
              placeholder={`Libellé de la question ${index + 1}…`}
              rows={2}
              className={`w-full border ${errors[`q${index}_label`] ? 'border-red-400' : 'border-surface-container-high'} rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none bg-white`}
            />
            {errors[`q${index}_label`] && (
              <p className="text-xs text-red-500 mt-1">{errors[`q${index}_label`]}</p>
            )}
          </div>

          {/* Options (radio / checkbox) */}
          {needsOptions && (
            <div className="space-y-2 pl-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Options</p>
              {question.options.map((opt, oIdx) => (
                <div key={oIdx} className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-on-surface-variant/30 shrink-0" />
                  <input
                    value={opt}
                    onChange={(e) => onUpdateOption(oIdx, e.target.value)}
                    placeholder={`Option ${oIdx + 1}`}
                    className="flex-1 border-b border-surface-container-high bg-transparent px-1 py-1 text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                  {question.options.length > 2 && (
                    <button type="button" onClick={() => onRemoveOption(oIdx)}
                      className="p-1 text-on-surface-variant/40 hover:text-red-500 transition-colors">
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
              {errors[`q${index}_options`] && (
                <p className="text-xs text-red-500">{errors[`q${index}_options`]}</p>
              )}
              <button type="button" onClick={onAddOption}
                className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary font-semibold mt-1 transition-colors">
                <Plus size={12} /> Ajouter une option
              </button>
            </div>
          )}

          {/* Rating preview */}
          {question.type === 'rating' && (
            <div className="flex items-center gap-1 pl-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={20} className="text-amber-300" />
              ))}
              <span className="text-xs text-on-surface-variant ml-2">Note de 1 à 5</span>
            </div>
          )}

          {/* Text preview */}
          {question.type === 'text' && (
            <div className="pl-1">
              <div className="border border-dashed border-surface-container-high rounded-lg px-3 py-2 text-xs text-on-surface-variant/50 italic">
                <Text size={12} className="inline mr-1.5 align-middle" />
                Champ de réponse texte libre
              </div>
            </div>
          )}
        </div>

        {/* Delete */}
        {total > 1 && (
          <button
            type="button" onClick={onRemove}
            className="p-2 text-on-surface-variant/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </Card>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label, hint, required, error, children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5 block">
      <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
        {label}{' '}
        {hint && <span className="normal-case font-normal text-on-surface-variant/60">{hint}</span>}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </label>
  );
}
