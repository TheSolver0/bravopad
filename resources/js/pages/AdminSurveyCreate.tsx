import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  GripVertical,
  Heart,
  ImagePlus,
  LayoutTemplate,
  LogOut,
  Plus,
  RefreshCw,
  Smile,
  Sparkles,
  Star,
  Sun,
  Text,
  Trash2,
  UserPlus,
  Users,
  X,
  Zap,
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

type SurveyTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  questions: SurveyQuestion[];
};

type SampleResult = {
  population: number;
  sample_size: number;
  margin_of_error: number;
  confidence_level: number;
  coverage_rate: number;
  sample: { id: number; name: string; avatar: string | null; strata: string }[];
  stratify_by: string;
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

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  heart:       Heart,
  'user-plus': UserPlus,
  'log-out':   LogOut,
  'refresh-cw': RefreshCw,
  smile:       Smile,
  'book-open': BookOpen,
  sun:         Sun,
  activity:    Activity,
};

const TEMPLATE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  rose:   { bg: 'bg-rose-50',   text: 'text-rose-600',   border: 'border-rose-200' },
  emerald:{ bg: 'bg-emerald-50',text: 'text-emerald-600',border: 'border-emerald-200' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-600',   border: 'border-teal-200' },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-200' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-amber-200' },
  pink:   { bg: 'bg-pink-50',   text: 'text-pink-600',   border: 'border-pink-200' },
};

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'templates' | 'ai' | 'builder';

export default function AdminSurveyCreate() {
  const [activeTab, setActiveTab]         = useState<Tab>('templates');
  const [templates, setTemplates]         = useState<SurveyTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  // AI generation
  const [aiPurpose, setAiPurpose]         = useState('');
  const [aiLoading, setAiLoading]         = useState(false);
  const [aiError, setAiError]             = useState('');

  // Builder fields
  const [title, setTitle]                 = useState('');
  const [description, setDescription]     = useState('');
  const [endsAt, setEndsAt]               = useState('');
  const [coverFile, setCoverFile]         = useState<File | null>(null);
  const [coverPreview, setCoverPreview]   = useState<string | null>(null);
  const coverInputRef                     = useRef<HTMLInputElement>(null);
  const [questions, setQuestions]         = useState<SurveyQuestion[]>([makeQuestion()]);
  const [submitting, setSubmitting]       = useState(false);
  const [errors, setErrors]               = useState<Record<string, string>>({});

  // Sampling wizard
  const [showSampling, setShowSampling]   = useState(false);
  const [confLevel, setConfLevel]         = useState<90 | 95 | 99>(95);
  const [marginErr, setMarginErr]         = useState<1 | 2 | 3 | 5>(5);
  const [stratifyBy, setStratifyBy]       = useState<'none' | 'department' | 'seniority'>('department');
  const [sampleResult, setSampleResult]   = useState<SampleResult | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);

  // Load templates on mount
  useEffect(() => {
    fetch('/admin/surveys/templates', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
      .then((r) => r.json())
      .then((data: SurveyTemplate[]) => { setTemplates(data); setTemplatesLoading(false); })
      .catch(() => setTemplatesLoading(false));
  }, []);

  // ── Template selection ──────────────────────────────────────────────────────

  const applyTemplate = (tpl: SurveyTemplate) => {
    setTitle(tpl.name);
    setDescription(tpl.description);
    setQuestions(tpl.questions.map((q) => ({ ...q })));
    setActiveTab('builder');
  };

  // ── AI generation ───────────────────────────────────────────────────────────

  const generateWithAi = async () => {
    if (!aiPurpose.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
      const resp = await fetch('/admin/surveys/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ purpose: aiPurpose }),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        setAiError(data.error ?? 'Erreur inconnue.');
        return;
      }
      setTitle(data.title ?? '');
      setDescription(data.description ?? '');
      setQuestions(
        (data.questions as SurveyQuestion[]).map((q) => ({
          ...q,
          options: q.options ?? [],
        })),
      );
      setActiveTab('builder');
    } catch {
      setAiError('Impossible de contacter l\'API. Vérifiez votre connexion.');
    } finally {
      setAiLoading(false);
    }
  };

  // ── Sampling wizard ─────────────────────────────────────────────────────────

  const calculateSample = async () => {
    setSampleLoading(true);
    setSampleResult(null);
    try {
      const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
      const resp = await fetch('/admin/surveys/sample', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          confidence_level: confLevel,
          margin_of_error: marginErr,
          stratify_by: stratifyBy,
        }),
      });
      const data: SampleResult = await resp.json();
      setSampleResult(data);
    } catch {
      // silently fail
    } finally {
      setSampleLoading(false);
    }
  };

  // ── Question mutations ──────────────────────────────────────────────────────

  const addQuestion   = () => setQuestions((q) => [...q, makeQuestion()]);
  const removeQuestion = (idx: number) => setQuestions((q) => q.filter((_, i) => i !== idx));
  const moveQuestion  = (idx: number, dir: -1 | 1) => {
    const next = [...questions];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setQuestions(next);
  };
  const updateQuestion = (idx: number, patch: Partial<SurveyQuestion>) =>
    setQuestions((q) => q.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  const addOption     = (idx: number) =>
    setQuestions((q) => q.map((item, i) => (i === idx ? { ...item, options: [...item.options, ''] } : item)));
  const updateOption  = (qIdx: number, oIdx: number, val: string) =>
    setQuestions((q) => q.map((item, i) =>
      i === qIdx ? { ...item, options: item.options.map((o, j) => (j === oIdx ? val : o)) } : item));
  const removeOption  = (qIdx: number, oIdx: number) =>
    setQuestions((q) => q.map((item, i) =>
      i === qIdx ? { ...item, options: item.options.filter((_, j) => j !== oIdx) } : item));

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

  const onCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setCoverFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setCoverPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setCoverPreview(null);
    }
  };

  const removeCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  const submit = () => {
    if (!validate()) return;
    setSubmitting(true);
    router.post(
      '/admin/surveys',
      {
        title:       title.trim(),
        description: description.trim() || null,
        ends_at:     endsAt || null,
        cover_image: coverFile ?? undefined,
        questions:   questions.map((q) => ({
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
      <a href="/admin/surveys" className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors">
        <ArrowLeft size={16} /> Retour aux sondages
      </a>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
          <ClipboardCheck size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Nouveau sondage</h1>
          <p className="text-sm text-on-surface-variant font-medium">
            Choisissez un template, générez avec l'IA ou construisez manuellement.
          </p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 bg-surface-container-low rounded-2xl w-fit">
        {([
          { id: 'templates', label: 'Templates', icon: <LayoutTemplate size={14} /> },
          { id: 'ai',        label: 'Générer avec l\'IA', icon: <Sparkles size={14} /> },
          { id: 'builder',   label: 'Manuel', icon: <ClipboardCheck size={14} /> },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === t.id
                ? 'bg-white shadow text-on-surface'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── TEMPLATES tab ── */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant font-medium">
            Sélectionnez un modèle RH — les questions se chargeront dans le builder pour que vous puissiez les modifier.
          </p>
          {templatesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-40 rounded-2xl bg-surface-container-low animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {templates.map((tpl) => {
                const IconComponent = TEMPLATE_ICONS[tpl.icon] ?? ClipboardCheck;
                const colors = TEMPLATE_COLORS[tpl.color] ?? TEMPLATE_COLORS.blue;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl)}
                    className={`group text-left p-5 rounded-2xl border-2 ${colors.border} bg-white hover:shadow-md hover:scale-[1.02] transition-all duration-200 space-y-3`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg} ${colors.text}`}>
                      <IconComponent size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-on-surface text-sm leading-tight">{tpl.name}</p>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed line-clamp-2">{tpl.description}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/50">
                        {tpl.questions.length} questions
                      </span>
                      <span className={`text-[10px] font-bold flex items-center gap-0.5 ${colors.text} opacity-0 group-hover:opacity-100 transition-opacity`}>
                        Utiliser <ArrowRight size={10} />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setActiveTab('builder')}>
              <Plus size={14} /> Créer sans template
            </Button>
          </div>
        </div>
      )}

      {/* ── AI tab ── */}
      {activeTab === 'ai' && (
        <Card className="bg-white border-none shadow-md p-6 space-y-5 max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="font-bold text-on-surface">Génération intelligente</p>
              <p className="text-xs text-on-surface-variant">Décrivez le but de votre sondage — l'IA génère les questions.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant block">
              Objectif du sondage <span className="text-red-500">*</span>
            </label>
            <textarea
              value={aiPurpose}
              onChange={(e) => setAiPurpose(e.target.value)}
              rows={4}
              placeholder="Ex : Mesurer la satisfaction des collaborateurs après notre dernier séminaire d'équipe. Je veux comprendre ce qui a bien fonctionné et les points à améliorer pour le prochain…"
              className={`${inputCls(false)} resize-none`}
            />
            <p className="text-xs text-on-surface-variant/60">
              Soyez précis : type de sondage, audience, thèmes à couvrir.
            </p>
          </div>

          {aiError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {aiError}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="primary"
              disabled={aiLoading || !aiPurpose.trim()}
              onClick={generateWithAi}
              className="flex-1"
            >
              {aiLoading ? (
                <>
                  <Zap size={14} className="animate-pulse" /> Génération en cours…
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Générer le sondage
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setActiveTab('templates')}>
              Voir les templates
            </Button>
          </div>

          <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 text-xs text-violet-700 leading-relaxed">
            <strong>Astuce :</strong> après génération, vous pourrez modifier chaque question, ajouter des sections
            et ajuster les options directement dans le builder.
          </div>
        </Card>
      )}

      {/* ── BUILDER tab ── */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* Left column */}
          <div className="space-y-4 lg:sticky lg:top-6">
            <Card className="bg-white border-none shadow-md p-5 space-y-4">
              <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                Informations générales
              </p>

              <Field label="Titre du sondage" error={errors.title} required>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex : Enquête bien-être 2026"
                  className={inputCls(!!errors.title)}
                />
              </Field>

              <Field label="Description" hint="(optionnel)">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
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
                    <img src={coverPreview} alt="Aperçu" className="w-full h-32 object-cover" />
                    <button type="button" onClick={removeCover}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => coverInputRef.current?.click()}
                    className="w-full h-20 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-surface-container-high text-on-surface-variant hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors">
                    <ImagePlus size={18} />
                    <span className="text-xs font-semibold">Choisir une image</span>
                  </button>
                )}
              </Field>
            </Card>

            {/* Sampling wizard */}
            <Card className="bg-white border-none shadow-md overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSampling((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-primary" />
                  <span className="text-sm font-bold text-on-surface">Assistant d'échantillonnage</span>
                </div>
                <ChevronDown size={14} className={`text-on-surface-variant transition-transform ${showSampling ? 'rotate-180' : ''}`} />
              </button>

              {showSampling && (
                <div className="px-5 pb-5 space-y-4 border-t border-surface-container-high">
                  <p className="text-xs text-on-surface-variant mt-3 leading-relaxed">
                    Calculez la taille d'échantillon optimale (formule de Cochran) et obtenez la liste des collaborateurs à inviter.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Niveau de confiance</p>
                      <div className="flex gap-2">
                        {([90, 95, 99] as const).map((c) => (
                          <button key={c} type="button"
                            onClick={() => setConfLevel(c)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${confLevel === c ? 'bg-primary text-white border-primary' : 'border-surface-container-high text-on-surface-variant hover:border-primary/40'}`}>
                            {c}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Marge d'erreur acceptée</p>
                      <div className="flex gap-2">
                        {([1, 2, 3, 5] as const).map((m) => (
                          <button key={m} type="button"
                            onClick={() => setMarginErr(m)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${marginErr === m ? 'bg-primary text-white border-primary' : 'border-surface-container-high text-on-surface-variant hover:border-primary/40'}`}>
                            ±{m}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Stratification</p>
                      <select
                        value={stratifyBy}
                        onChange={(e) => setStratifyBy(e.target.value as typeof stratifyBy)}
                        className="w-full border border-surface-container-high rounded-lg px-3 py-1.5 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                        <option value="none">Aléatoire simple</option>
                        <option value="department">Par département</option>
                        <option value="seniority">Par ancienneté</option>
                      </select>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={sampleLoading}
                      onClick={calculateSample}
                    >
                      {sampleLoading ? 'Calcul…' : 'Calculer l\'échantillon'}
                    </Button>
                  </div>

                  {sampleResult && (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <SampleKpi label="Population" value={sampleResult.population} />
                        <SampleKpi label="Échantillon" value={sampleResult.sample_size} highlight />
                        <SampleKpi label="Couverture" value={`${sampleResult.coverage_rate}%`} />
                        <SampleKpi label="Confiance" value={`${sampleResult.confidence_level}%`} />
                      </div>

                      {sampleResult.sample.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                            Collaborateurs sélectionnés ({sampleResult.sample.length})
                          </p>
                          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                            {Object.entries(
                              sampleResult.sample.reduce<Record<string, typeof sampleResult.sample>>((acc, u) => {
                                (acc[u.strata] ??= []).push(u);
                                return acc;
                              }, {}),
                            ).map(([strata, members]) => (
                              <div key={strata}>
                                <p className="text-[9px] font-black uppercase tracking-wider text-primary/60 mt-1.5 mb-0.5">{strata}</p>
                                {members.map((u) => (
                                  <div key={u.id} className="flex items-center gap-2 py-0.5">
                                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center shrink-0">
                                      {u.name.charAt(0)}
                                    </div>
                                    <span className="text-xs text-on-surface truncate">{u.name}</span>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 leading-relaxed">
              La création d'un nouveau sondage <strong>désactive automatiquement</strong> tous les sondages actifs existants.
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => router.visit('/admin/surveys')}>
                Annuler
              </Button>
              <Button variant="primary" className="flex-1" disabled={submitting} onClick={submit}>
                {submitting ? 'Publication…' : 'Publier le sondage'}
              </Button>
            </div>
          </div>

          {/* Right column : questions */}
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
      )}
    </div>
  );
}

// ── Sample KPI mini card ───────────────────────────────────────────────────────

function SampleKpi({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-2 text-center ${highlight ? 'bg-primary/10' : 'bg-surface-container-low'}`}>
      <p className={`text-base font-extrabold ${highlight ? 'text-primary' : 'text-on-surface'}`}>{value}</p>
      <p className="text-[10px] font-semibold text-on-surface-variant">{label}</p>
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
      <div className="flex items-start gap-3">
        <div className="flex flex-col gap-0.5 pt-1 shrink-0">
          <button type="button" onClick={onMoveUp} disabled={index === 0}
            className="p-1 rounded text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-surface-container-low disabled:opacity-20 transition-colors">
            <ChevronUp size={13} />
          </button>
          <GripVertical size={13} className="text-on-surface-variant/30 mx-auto" />
          <button type="button" onClick={onMoveDown} disabled={index === total - 1}
            className="p-1 rounded text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-surface-container-low disabled:opacity-20 transition-colors">
            <ChevronDown size={13} />
          </button>
        </div>

        <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black mt-0.5">
          {index + 1}
        </span>

        <div className="flex-1 space-y-3 min-w-0">
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

          {question.type === 'rating' && (
            <div className="flex items-center gap-1 pl-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={20} className="text-amber-300" />
              ))}
              <span className="text-xs text-on-surface-variant ml-2">Note de 1 à 5</span>
            </div>
          )}

          {question.type === 'text' && (
            <div className="pl-1">
              <div className="border border-dashed border-surface-container-high rounded-lg px-3 py-2 text-xs text-on-surface-variant/50 italic">
                <Text size={12} className="inline mr-1.5 align-middle" />
                Champ de réponse texte libre
              </div>
            </div>
          )}
        </div>

        {total > 1 && (
          <button type="button" onClick={onRemove}
            className="p-2 text-on-surface-variant/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
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
