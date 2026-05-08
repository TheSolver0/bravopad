import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Link2,
  MessageSquare,
  Star,
  Target,
  Text,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// ── Types ─────────────────────────────────────────────────────────────────────

type Chi2 = { chi_square: number; df: number; p_value: number; significant: boolean } | null;

type RadioReport = {
  id: string; label: string; type: 'radio'; section: string | null;
  options: string[]; counts: Record<string, number>; answered: number;
  chi2?: Chi2;
};
type CheckboxReport = {
  id: string; label: string; type: 'checkbox'; section: string | null;
  options: string[]; counts: Record<string, number>; answered: number;
  chi2?: Chi2;
};
type TextReport = {
  id: string; label: string; type: 'text'; section: string | null;
  responses: string[];
};
type RatingReport = {
  id: string; label: string; type: 'rating'; section: string | null;
  average: number | null; median: number | null; std_dev: number | null;
  mode: number | null; ci95: { lower: number; upper: number } | null;
  distribution: Record<string, number>; answered: number;
};
type QuestionReport = RadioReport | CheckboxReport | TextReport | RatingReport;

type NpsData = {
  score: number; promoters: number; passives: number;
  detractors: number; total: number; label: string;
} | null;

interface SurveyInfo {
  id: number; title: string; description?: string | null;
  token?: string | null; is_active: boolean;
  created_at: string; ends_at?: string | null;
}

interface AdminSurveyReportProps {
  survey: SurveyInfo;
  total_responses: number;
  total_users: number;
  questions_report: QuestionReport[];
  responses_over_time: { date: string; count: number }[];
  nps: NpsData;
}

// ── Colours ───────────────────────────────────────────────────────────────────

const PALETTE = [
  '#4f46e5', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#f97316', '#84cc16',
];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminSurveyReport({
  survey,
  total_responses,
  total_users,
  questions_report,
  responses_over_time,
  nps,
}: AdminSurveyReportProps) {
  const shareUrl = survey.token
    ? (typeof window !== 'undefined' ? `${window.location.origin}/surveys/${survey.token}` : `/surveys/${survey.token}`)
    : null;

  const engagementRate = total_users > 0
    ? Math.round((total_responses / total_users) * 100)
    : 0;

  const answeredQuestions = questions_report.filter((q): q is RadioReport | CheckboxReport | RatingReport =>
    q.type === 'radio' || q.type === 'checkbox' || q.type === 'rating',
  );
  const avgCompletion = total_responses > 0 && answeredQuestions.length > 0
    ? Math.round(
        answeredQuestions.reduce((sum, q) => sum + (q.answered / total_responses) * 100, 0) /
        answeredQuestions.length,
      )
    : null;

  const ratingQuestions = questions_report.filter((q): q is RatingReport => q.type === 'rating');
  const avgRating = ratingQuestions.length > 0
    ? (ratingQuestions.reduce((s, q) => s + (q.average ?? 0), 0) / ratingQuestions.filter((q) => q.average !== null).length)
    : null;

  const formattedTimeline = responses_over_time.map((r) => ({
    date: new Date(r.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    Réponses: r.count,
  }));

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">

      {/* Back + actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <a href="/admin/surveys"
          className="flex items-center gap-1 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors">
          <ArrowLeft size={16} /> Sondages
        </a>
        <div className="flex-1" />
        {shareUrl && (
          <button
            onClick={() => navigator.clipboard.writeText(shareUrl)}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/70 transition-colors">
            <Link2 size={15} /> Copier le lien
          </button>
        )}
        <a href={`/admin/surveys/${survey.id}/export`}>
          <Button variant="outline" size="sm">
            <Download size={14} /> Exporter CSV
          </Button>
        </a>
      </div>

      {/* Hero header */}
      <div className="bg-primary rounded-2xl px-6 py-6 text-white shadow-lg shadow-primary/20 space-y-4">
        <div className="flex items-center gap-2 text-white/70 text-xs font-bold uppercase tracking-wider">
          <BarChart3 size={14} /> Rapport de sondage
        </div>
        <div>
          <h1 className="text-2xl font-extrabold leading-snug">{survey.title}</h1>
          {survey.description && (
            <p className="text-white/80 text-sm mt-1">{survey.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-3 pt-1">
          <StatPill icon={<CheckCircle2 size={14} />}
            value={survey.is_active ? 'Actif' : 'Clôturé'}
            highlight={survey.is_active} />
          {survey.ends_at && (
            <StatPill icon={<Calendar size={14} />}
              value={`Clôture ${new Date(survey.ends_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`} />
          )}
          <StatPill icon={<MessageSquare size={14} />}
            value={`${questions_report.length} question${questions_report.length !== 1 ? 's' : ''}`} />
          <StatPill icon={<Calendar size={14} />}
            value={`Créé le ${new Date(survey.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`} />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<Users size={20} />} value={total_responses} label="Participants" color="blue" />
        <KpiCard
          icon={<TrendingUp size={20} />}
          value={`${engagementRate}%`}
          label="Taux d'engagement"
          sub={`${total_responses} / ${total_users} collaborateurs`}
          color="emerald"
          highlight
        />
        <KpiCard
          icon={<Target size={20} />}
          value={avgCompletion !== null ? `${avgCompletion}%` : '—'}
          label="Complétion moyenne"
          sub="des questions répondues"
          color="violet"
        />
        {avgRating !== null ? (
          <KpiCard
            icon={<Star size={20} />}
            value={`${avgRating.toFixed(1)} / 5`}
            label="Note moyenne"
            sub={`sur ${ratingQuestions.length} question${ratingQuestions.length !== 1 ? 's' : ''} notées`}
            color="amber"
          />
        ) : (
          <KpiCard
            icon={<MessageSquare size={20} />}
            value={questions_report.length}
            label="Questions"
            sub={`${answeredQuestions.length} avec résultats`}
            color="amber"
          />
        )}
      </div>

      {/* NPS widget */}
      {nps && total_responses >= 3 && (
        <NpsWidget nps={nps} />
      )}

      {/* Timeline */}
      {formattedTimeline.length > 0 && (
        <Card className="bg-white border-none shadow-md p-6 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant">
              Évolution des réponses
            </h2>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedTimeline} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="repGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#4f46e5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,.10)' }}
                  formatter={(v) => { const n = Number(v ?? 0); return [`${n} réponse${n !== 1 ? 's' : ''}`, '']; }}
                />
                <Area type="monotone" dataKey="Réponses" stroke="#4f46e5" strokeWidth={2.5}
                  fill="url(#repGradient)" dot={{ r: 3, fill: '#4f46e5', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Completion rates summary */}
      {total_responses > 0 && answeredQuestions.length > 0 && (
        <SummarySection questions={answeredQuestions} total={total_responses} />
      )}

      {/* Per-question cards */}
      {questions_report.map((q, idx) => (
        <QuestionReportCard key={q.id} question={q} index={idx + 1} totalRespondents={total_responses} />
      ))}

      {total_responses === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <ClipboardCheck size={36} className="text-on-surface-variant/25" />
          <p className="font-semibold text-on-surface-variant">Aucune réponse reçue pour le moment.</p>
          {shareUrl && (
            <p className="text-sm text-on-surface-variant/70">
              Partagez le lien pour commencer à collecter des réponses.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── NPS widget ────────────────────────────────────────────────────────────────

function NpsWidget({ nps }: { nps: NonNullable<NpsData> }) {
  const scoreColor = nps.score >= 50 ? 'text-emerald-600' : nps.score >= 20 ? 'text-blue-600' : nps.score >= 0 ? 'text-amber-600' : 'text-red-600';
  const scoreBg    = nps.score >= 50 ? 'bg-emerald-50 border-emerald-200' : nps.score >= 20 ? 'bg-blue-50 border-blue-200' : nps.score >= 0 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  const pPct = nps.total > 0 ? Math.round((nps.promoters  / nps.total) * 100) : 0;
  const dPct = nps.total > 0 ? Math.round((nps.detractors / nps.total) * 100) : 0;
  const aPct = 100 - pPct - dPct;

  return (
    <Card className="bg-white border-none shadow-md p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Star size={16} className="text-primary" />
        <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant">
          eNPS — Score d'ambassadeur employé
        </h2>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-center">
        <div className={`flex flex-col items-center justify-center w-32 h-32 rounded-2xl border-2 shrink-0 ${scoreBg}`}>
          <p className={`text-4xl font-extrabold ${scoreColor}`}>{nps.score > 0 ? '+' : ''}{nps.score}</p>
          <p className={`text-xs font-bold ${scoreColor} mt-1`}>{nps.label}</p>
        </div>

        <div className="flex-1 space-y-3 w-full">
          <div className="flex rounded-full overflow-hidden h-4 w-full">
            <div className="bg-emerald-400 transition-all" style={{ width: `${pPct}%` }} title={`Promoteurs: ${pPct}%`} />
            <div className="bg-slate-300 transition-all" style={{ width: `${aPct}%` }} title={`Passifs: ${aPct}%`} />
            <div className="bg-red-400 transition-all" style={{ width: `${dPct}%` }} title={`Détracteurs: ${dPct}%`} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <NpsGroup label="Promoteurs (5★)" count={nps.promoters} pct={pPct} color="emerald" />
            <NpsGroup label="Passifs (4★)"    count={nps.passives}  pct={aPct} color="slate" />
            <NpsGroup label="Détracteurs (1-3★)" count={nps.detractors} pct={dPct} color="red" />
          </div>
          <p className="text-[11px] text-on-surface-variant/60">
            eNPS = % Promoteurs − % Détracteurs · Basé sur {nps.total} réponses à la question de notation
          </p>
        </div>
      </div>
    </Card>
  );
}

function NpsGroup({ label, count, pct, color }: { label: string; count: number; pct: number; color: string }) {
  const cls: Record<string, string> = {
    emerald: 'text-emerald-700 bg-emerald-50',
    slate:   'text-slate-600 bg-slate-50',
    red:     'text-red-700 bg-red-50',
  };
  return (
    <div className={`rounded-xl px-3 py-2 text-center ${cls[color] ?? cls.slate}`}>
      <p className="text-lg font-extrabold">{count}</p>
      <p className="text-[10px] font-bold">{pct}%</p>
      <p className="text-[9px] font-medium opacity-70 leading-tight mt-0.5">{label}</p>
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({ icon, value, highlight }: { icon: React.ReactNode; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${highlight ? 'bg-emerald-400/20 text-emerald-100' : 'bg-white/15 text-white/85'}`}>
      {icon} {value}
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

const kpiColors: Record<string, string> = {
  blue:    'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet:  'bg-violet-50 text-violet-600',
  amber:   'bg-amber-50 text-amber-600',
};

function KpiCard({
  icon, value, label, sub, color = 'blue', highlight,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  sub?: string;
  color?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={`bg-white border-none shadow-md p-5 space-y-2 ${highlight ? 'ring-2 ring-emerald-200' : ''}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpiColors[color] ?? kpiColors.blue}`}>
        {icon}
      </div>
      <p className="text-2xl font-extrabold tracking-tight text-on-surface">{value}</p>
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-on-surface-variant">{label}</p>
        {sub && <p className="text-[11px] text-on-surface-variant/60 mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

// ── Summary section ───────────────────────────────────────────────────────────

function SummarySection({
  questions,
  total,
}: {
  questions: (RadioReport | CheckboxReport | RatingReport)[];
  total: number;
}) {
  const items = questions.map((q) => ({
    label:   q.label.length > 55 ? q.label.slice(0, 55) + '…' : q.label,
    rate:    total > 0 ? Math.round((q.answered / total) * 100) : 0,
    answered: q.answered,
  }));

  return (
    <Card className="bg-white border-none shadow-md p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Target size={16} className="text-primary" />
        <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant">
          Taux de réponse par question
        </h2>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between items-center text-xs text-on-surface-variant font-medium">
              <span className="line-clamp-1 flex-1 pr-4">{item.label}</span>
              <span className="shrink-0 font-black text-on-surface">
                {item.answered} <span className="font-normal text-on-surface-variant/60">({item.rate}%)</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${item.rate}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Per-question card ─────────────────────────────────────────────────────────

function QuestionReportCard({
  question, index, totalRespondents,
}: {
  question: QuestionReport;
  index: number;
  totalRespondents: number;
}) {
  return (
    <Card className="bg-white border-none shadow-md p-0 overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-container-high flex items-start gap-3">
        <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black mt-0.5">
          {index}
        </span>
        <div className="flex-1">
          <p className="font-bold text-on-surface leading-snug">{question.label}</p>
          {question.section && (
            <p className="text-[11px] font-semibold text-primary/60 uppercase tracking-wider mt-0.5">
              {question.section}
            </p>
          )}
        </div>
        <TypeBadge type={question.type} />
      </div>
      <div className="px-6 py-5">
        {(question.type === 'radio' || question.type === 'checkbox') && (
          <RadioCheckboxReport question={question} totalRespondents={totalRespondents} />
        )}
        {question.type === 'text' && <TextResponseReport question={question} />}
        {question.type === 'rating' && <RatingResponseReport question={question} totalRespondents={totalRespondents} />}
      </div>
    </Card>
  );
}

// ── Radio / Checkbox report ───────────────────────────────────────────────────

function RadioCheckboxReport({
  question, totalRespondents,
}: {
  question: RadioReport | CheckboxReport;
  totalRespondents: number;
}) {
  const data = question.options.map((opt, i) => ({
    name:  opt,
    value: question.counts[opt] ?? 0,
    color: PALETTE[i % PALETTE.length],
  }));

  const answered = question.answered;
  const hasData  = data.some((d) => d.value > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-xs text-on-surface-variant font-medium">
          {answered} réponse{answered !== 1 ? 's' : ''}
          {totalRespondents > 0 && ` · ${Math.round((answered / totalRespondents) * 100)}% de participation`}
        </p>
        {question.chi2 && (
          <Chi2Badge chi2={question.chi2} />
        )}
      </div>

      {hasData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value">
                  {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,.10)' }}
                  formatter={(value, name) => {
                    const n = Number(value ?? 0);
                    return [`${n} (${answered > 0 ? Math.round((n / answered) * 100) : 0}%)`, String(name)];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {data.map((item, i) => {
              const pct = answered > 0 ? Math.round((item.value / answered) * 100) : 0;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: item.color }} />
                    <span className="flex-1 font-medium text-on-surface line-clamp-1">{item.name}</span>
                    <span className="font-bold text-on-surface-variant shrink-0">{item.value}</span>
                    <span className="text-on-surface-variant/60 text-xs shrink-0 w-9 text-right">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-container-high ml-5 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: item.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant/60 italic">Aucune réponse pour le moment.</p>
      )}
    </div>
  );
}

// ── Text responses ────────────────────────────────────────────────────────────

function TextResponseReport({ question }: { question: TextReport }) {
  const responses = question.responses.filter(Boolean);
  return (
    <div className="space-y-3">
      <p className="text-xs text-on-surface-variant font-medium">
        {responses.length} réponse{responses.length !== 1 ? 's' : ''} texte
      </p>
      {responses.length > 0 ? (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {responses.map((r, i) => (
            <div key={i} className="flex items-start gap-3 bg-surface-container-low/50 rounded-xl px-4 py-3">
              <Text size={14} className="text-on-surface-variant/50 shrink-0 mt-0.5" />
              <p className="text-sm text-on-surface leading-relaxed">{r}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant/60 italic">Aucune réponse texte pour le moment.</p>
      )}
    </div>
  );
}

// ── Rating report ─────────────────────────────────────────────────────────────

function RatingResponseReport({
  question, totalRespondents,
}: {
  question: RatingReport;
  totalRespondents: number;
}) {
  const data = [1, 2, 3, 4, 5].map((n) => ({
    name:  `${n} ★`,
    value: question.distribution[n] ?? 0,
  }));

  return (
    <div className="space-y-4">
      {/* Primary metrics row */}
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-xs text-on-surface-variant font-medium">
          {question.answered} réponse{question.answered !== 1 ? 's' : ''}
          {totalRespondents > 0 && ` · ${Math.round((question.answered / totalRespondents) * 100)}% de participation`}
        </p>
        {question.average !== null && (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
            <Star size={14} className="text-amber-400 fill-amber-400" />
            <span className="text-sm font-black text-amber-700">{question.average} / 5</span>
          </div>
        )}
      </div>

      {/* Advanced stats row */}
      {question.answered > 0 && (
        <div className="flex flex-wrap gap-3">
          {question.median !== null && (
            <StatChip label="Médiane" value={`${question.median} / 5`} />
          )}
          {question.std_dev !== null && (
            <StatChip label="Écart-type" value={`σ = ${question.std_dev}`} />
          )}
          {question.mode !== null && (
            <StatChip label="Mode" value={`${question.mode} ★`} />
          )}
          {question.ci95 && (
            <StatChip label="IC 95%" value={`[${question.ci95.lower} – ${question.ci95.upper}]`} highlight />
          )}
        </div>
      )}

      {question.answered > 0 ? (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Bar>
              <Tooltip
                contentStyle={{ borderRadius: 12, fontSize: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,.10)' }}
                formatter={(v) => { const n = Number(v ?? 0); return [`${n} réponse${n !== 1 ? 's' : ''}`, '']; }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant/60 italic">Aucune note pour le moment.</p>
      )}
    </div>
  );
}

// ── Chi² significance badge ───────────────────────────────────────────────────

function Chi2Badge({ chi2 }: { chi2: NonNullable<Chi2> }) {
  if (chi2.significant) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 size={10} /> Différence significative (p={chi2.p_value})
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
      <AlertCircle size={10} /> Distribution uniforme (p={chi2.p_value})
    </span>
  );
}

// ── Stat chip ─────────────────────────────────────────────────────────────────

function StatChip({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
      highlight ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-surface-container-low border-surface-container-high text-on-surface-variant'
    }`}>
      <span className="font-black text-on-surface-variant/60">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

// ── Type badge ─────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const meta: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    radio:    { label: 'Choix unique',   icon: <CheckCircle2 size={11} />, cls: 'bg-blue-50 text-blue-600' },
    checkbox: { label: 'Choix multiple', icon: <ClipboardCheck size={11} />, cls: 'bg-violet-50 text-violet-600' },
    text:     { label: 'Texte libre',    icon: <Text size={11} />,          cls: 'bg-slate-50 text-slate-500' },
    rating:   { label: 'Note 1–5',       icon: <Star size={11} />,          cls: 'bg-amber-50 text-amber-600' },
  };
  const m = meta[type] ?? meta.text;
  return (
    <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full shrink-0 ${m.cls}`}>
      {m.icon} {m.label}
    </span>
  );
}
