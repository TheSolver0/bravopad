import { useEffect, useRef, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import {
  BarChart3,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
  Medal,
  MessageSquare,
  Search,
  Star,
  TrendingUp,
  Trophy,
  Users,
  Vote,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// ── Types ────────────────────────────────────────────────────────────────────

type Candidate = { id: number; name: string; department: string; avatar?: string | null };
type RankingRow = {
  user: { id: number; name: string; department: string; avatar?: string | null };
  votes_count: number;
  bravo_points: number;
  merit_score: number;
};
type SurveyOption = { key: string; label: string };
type Survey = {
  id: number;
  title: string;
  question: string;
  options: SurveyOption[];
  starts_at?: string | null;
  ends_at?: string | null;
  total_responses: number;
  stats: Record<string, number>;
  my_response: string | null;
};

interface EngagementProps {
  period: string;
  vote_candidates: Candidate[];
  my_vote: { nominee_id: number; is_anonymous: boolean; comment?: string | null } | null;
  employee_of_month_ranking: RankingRow[];
  surveys: Survey[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAvatar(user: { name: string; avatar?: string | null }) {
  return (
    user.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=1d4ed8&color=fff&size=80`
  );
}

const rankMeta = (i: number) => {
  if (i === 0) return { bg: 'bg-amber-400', text: 'text-white' };
  if (i === 1) return { bg: 'bg-slate-400', text: 'text-white' };
  if (i === 2) return { bg: 'bg-orange-400', text: 'text-white' };
  return { bg: 'bg-surface-container-high', text: 'text-on-surface-variant' };
};

function CandidateAvatar({
  name,
  src,
  size = 14,
  rank,
}: {
  name: string;
  src?: string | null;
  size?: number;
  rank?: number;
}) {
  const meta = rank !== undefined ? rankMeta(rank) : null;
  return (
    <div className="relative inline-block">
      <img
        src={getAvatar({ name, avatar: src })}
        alt=""
        referrerPolicy="no-referrer"
        className={`w-${size} h-${size} rounded-full object-cover ring-2 ring-surface-container-high`}
      />
      {meta && rank !== undefined && rank <= 2 && (
        <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm ${meta.bg} ${meta.text}`}>
          {rank + 1}
        </span>
      )}
    </div>
  );
}

function OptionLabel({ label }: { label: string }) {
  return <span className="text-sm font-semibold leading-snug line-clamp-2">{label}</span>;
}

function DeptCombobox({
  value,
  onChange,
  departments,
}: {
  value: string;
  onChange: (v: string) => void;
  departments: string[];
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!value) setQuery(''); }, [value]);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(
    () => departments.filter((d) => d.toLowerCase().includes(query.toLowerCase())),
    [departments, query],
  );

  const select = (dept: string) => { onChange(dept); setQuery(dept); setOpen(false); };

  return (
    <div ref={ref} className="relative min-w-[220px]">
      <div className="relative">
        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); onChange(''); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Filtrer par direction…"
          className="w-full pl-9 pr-8 py-2.5 border border-surface-container-high rounded-xl text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-surface-container-high rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto">
          <button type="button" onMouseDown={(e) => { e.preventDefault(); select(''); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors border-b border-surface-container-high">
            Toutes les directions
          </button>
          {filtered.map((d) => (
            <button key={d} type="button" onMouseDown={(e) => { e.preventDefault(); select(d); }} className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-surface-container-low transition-colors ${value === d ? 'bg-primary/5 text-primary font-bold' : 'text-on-surface'}`}>
              {d}
            </button>
          ))}
          {filtered.length === 0 && <p className="px-4 py-3 text-sm text-on-surface-variant">Aucune direction trouvée.</p>}
        </div>
      )}
    </div>
  );
}

// ── Ranking sidebar ───────────────────────────────────────────────────────────

const RANKING_PAGE_SIZE = 5;

function RankingSidebar({ ranking }: { ranking: RankingRow[] }) {
  const [page, setPage] = useState(0);
  if (ranking.length === 0) return null;

  const totalPages = Math.ceil(ranking.length / RANKING_PAGE_SIZE);
  const paginated = ranking.slice(page * RANKING_PAGE_SIZE, page * RANKING_PAGE_SIZE + RANKING_PAGE_SIZE);
  const top3 = ranking.slice(0, 3);

  return (
    <aside className="w-60 shrink-0 self-start sticky top-6 space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-black tracking-tight flex items-center gap-2">
          <Trophy size={15} className="text-amber-500" />
          Classement
        </h3>
        
      </div>

      <Card className="p-0 overflow-hidden border-none shadow-md bg-primary">
        {top3.length >= 3 && (
          <div className="p-5  text-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">Top Performeurs</span>
              <TrendingUp size={14} className="text-secondary" />
            </div>
            <div className="flex items-end justify-around pb-2">
              <div className="flex flex-col items-center gap-1.5">
                <div className="relative">
                  <img src={getAvatar(top3[1].user)} alt="" className="w-11 h-11 rounded-full border-2 border-white/30" referrerPolicy="no-referrer" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-surface-container-high rounded-full flex items-center justify-center text-[10px] font-bold text-on-surface border-2 border-white">2</div>
                </div>
                <span className="text-[10px] font-bold opacity-80 truncate w-14 text-center">{top3[1].user.name.split(' ')[0]}</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 scale-110 mb-1">
                <div className="relative">
                  <img src={getAvatar(top3[0].user)} alt="" className="w-14 h-14 rounded-full border-4 border-secondary shadow-lg" referrerPolicy="no-referrer" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-secondary rounded-full flex items-center justify-center text-[10px] font-extrabold text-white border-2 border-white">1</div>
                </div>
                <span className="text-[10px] font-bold truncate w-14 text-center">{top3[0].user.name.split(' ')[0]}</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="relative">
                  <img src={getAvatar(top3[2].user)} alt="" className="w-11 h-11 rounded-full border-2 border-white/30" referrerPolicy="no-referrer" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-secondary/50 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white">3</div>
                </div>
                <span className="text-[10px] font-bold opacity-80 truncate w-14 text-center">{top3[2].user.name.split(' ')[0]}</span>
              </div>
            </div>
          </div>
        )}

      

        

        
      </Card>

      <p className="text-[10px] text-on-surface-variant text-center px-1">
        Score = votes (65 %) + mérite Bravo (35 %)
      </p>
    </aside>
  );
}

// ── Survey inbox (liste latérale compacte, style email) ───────────────────────

function SurveyInbox({
  surveys,
  selectedId,
  onSelect,
}: {
  surveys: Survey[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const answeredCount = surveys.filter((s) => s.my_response).length;
  const sorted = [...surveys].reverse();

  return (
    <aside className="w-56 shrink-0 self-start sticky top-6">
      <div className="flex items-center justify-between px-1 mb-3">
        <h3 className="text-sm font-black tracking-tight flex items-center gap-2">
          <MessageSquare size={14} className="text-primary" />
          Sondages
        </h3>
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
          {answeredCount}/{surveys.length} répondus
        </span>
      </div>

      <Card className="p-0 overflow-hidden border-none shadow-md bg-white">
        {sorted.map((s, i) => {
          const isSelected = s.id === selectedId;
          const answered = !!s.my_response;
          const daysLeft = s.ends_at
            ? Math.max(0, Math.ceil((new Date(s.ends_at).getTime() - Date.now()) / 86_400_000))
            : null;

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className={[
                'w-full text-left px-3 py-3.5 flex items-start gap-2.5 transition-all relative',
                i > 0 ? 'border-t border-surface-container-high/50' : '',
                isSelected
                  ? 'bg-primary/5 border-l-[3px] border-l-primary'
                  : 'hover:bg-surface-container-low border-l-[3px] border-l-transparent',
              ].join(' ')}
            >
              {/* Dot statut */}
              <span className={`mt-[5px] w-2 h-2 rounded-full shrink-0 transition-colors ${
                answered ? 'bg-emerald-400' : isSelected ? 'bg-primary' : 'bg-on-surface-variant/25'
              }`} />

              <div className="min-w-0 flex-1">
                <p className={`text-xs font-black leading-snug line-clamp-2 mb-0.5 ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                  {s.title}
                </p>
                <p className="text-[10px] text-on-surface-variant line-clamp-1 mb-1.5 leading-relaxed">
                  {s.question}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {answered ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      <Check size={8} /> Répondu
                    </span>
                  ) : (
                    <span className="text-[9px] font-semibold text-on-surface-variant/60">
                      {s.options.length} options · {s.total_responses} rép.
                    </span>
                  )}
                  {daysLeft !== null && (
                    <span className={`text-[9px] font-bold ${daysLeft <= 3 ? 'text-orange-500' : 'text-on-surface-variant/50'}`}>
                      {daysLeft === 0 ? '⚠ Clôture auj.' : `J-${daysLeft}`}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </Card>
    </aside>
  );
}

// ── Survey vote panel ─────────────────────────────────────────────────────────

function SurveyVotePanel({
  survey,
  onAnswer,
}: {
  survey: Survey;
  onAnswer: (surveyId: number, key: string) => void;
}) {
  return (
    <Card className="bg-white border-none shadow-lg flex flex-col gap-5 animate-in fade-in slide-in-from-right-2 duration-200">
      <div className="border-b border-surface-container-high pb-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="font-black text-base leading-snug">{survey.title}</p>
          {survey.my_response && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <Check size={10} /> Répondu
            </span>
          )}
        </div>
        <p className="text-sm text-on-surface leading-relaxed">{survey.question}</p>
        <div className="flex items-center gap-4 mt-2 text-[11px] text-on-surface-variant font-medium flex-wrap">
          <span className="flex items-center gap-1">
            <Users size={11} /> {survey.total_responses} réponse{survey.total_responses > 1 ? 's' : ''}
          </span>
          {survey.ends_at && (
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              Clôture le {new Date(survey.ends_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {survey.options.map((opt) => {
          const count = survey.stats[opt.key] ?? 0;
          const pct = survey.total_responses > 0 ? Math.round((count / survey.total_responses) * 100) : 0;
          const selected = survey.my_response === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onAnswer(survey.id, opt.key)}
              className={`group text-left rounded-xl border p-4 flex flex-col gap-3 transition-all ${
                selected
                  ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                  : 'border-surface-container-high bg-white hover:border-primary/50 hover:shadow-sm hover:bg-surface-container-lowest'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0"><OptionLabel label={opt.label} /></div>
                {selected && (
                  <span className="shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check size={11} className="text-white" />
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${selected ? 'bg-primary' : 'bg-on-surface-variant/30 group-hover:bg-primary/40'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-on-surface-variant font-medium">{count} réponse{count > 1 ? 's' : ''}</span>
                  <span className={`text-[11px] font-black tabular-nums ${selected ? 'text-primary' : 'text-on-surface-variant'}`}>{pct} %</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-on-surface-variant flex items-center gap-1.5 pt-1 border-t border-surface-container-high">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
        {survey.total_responses} réponse{survey.total_responses > 1 ? 's' : ''} · Résultats 100 % anonymisés
      </p>
    </Card>
  );
}

function SurveyEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3 text-center">
      <BarChart3 size={36} className="text-on-surface-variant/20" />
      <p className="font-semibold text-on-surface-variant">Sélectionnez un sondage</p>
      <p className="text-xs text-on-surface-variant/50">Cliquez sur un sondage dans la liste pour voter ou consulter les résultats.</p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Engagement(props: EngagementProps) {
  const [activeTab, setActiveTab] = useState<'surveys' | 'vote'>('surveys');
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(props.surveys[0]?.id ?? null);
  const [nomineeId, setNomineeId] = useState<number>(props.my_vote?.nominee_id ?? 0);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(props.my_vote?.is_anonymous ?? true);
  const [comment, setComment] = useState<string>(props.my_vote?.comment ?? '');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [candidatePage, setCandidatePage] = useState(1);
  const CANDIDATES_PER_PAGE = 20;

  const selectedSurvey = props.surveys.find((s) => s.id === selectedSurveyId) ?? null;

  const periodLabel = new Date(props.period + '-01').toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  const departments = useMemo(
    () => [...new Set(props.vote_candidates.map((c) => c.department).filter(Boolean))].sort() as string[],
    [props.vote_candidates],
  );

  const filteredCandidates = useMemo(
    () =>
      props.vote_candidates.filter((c) => {
        const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
        const matchDept = !deptFilter || c.department === deptFilter;
        return matchSearch && matchDept;
      }),
    [props.vote_candidates, search, deptFilter],
  );

  const totalPages = Math.ceil(filteredCandidates.length / CANDIDATES_PER_PAGE);
  const paginatedCandidates = useMemo(() => {
    const s = (candidatePage - 1) * CANDIDATES_PER_PAGE;
    return filteredCandidates.slice(s, s + CANDIDATES_PER_PAGE);
  }, [filteredCandidates, candidatePage]);

  const rankingMap = useMemo(() => {
    const map: Record<number, { rank: number; row: RankingRow }> = {};
    props.employee_of_month_ranking.forEach((r, i) => { map[r.user.id] = { rank: i, row: r }; });
    return map;
  }, [props.employee_of_month_ranking]);

  const submitVote = (candidateId: number) => {
    router.post('/engagement/vote', { nominee_id: candidateId, is_anonymous: isAnonymous, comment }, { preserveScroll: true });
    setNomineeId(candidateId);
  };

  const answerSurvey = (surveyId: number, optionKey: string) => {
    router.post(`/engagement/surveys/${surveyId}/responses`, { option_key: optionKey }, { preserveScroll: true });
  };

  useEffect(() => { setCandidatePage(1); }, [search, deptFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
          <ClipboardList size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Sondages RH & Employé du mois</h1>
          <p className="text-sm text-on-surface-variant font-medium">
            Participez aux sondages RH et votez pour l'employé du mois.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-container-low rounded-2xl w-fit">
        {([
          { key: 'surveys', label: 'Sondages RH', icon: BarChart3 },
          { key: 'vote', label: `Employé du mois — ${periodLabel}`, icon: Vote },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === key ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ═══ TAB SONDAGES — layout 3 colonnes ═══ */}
      {activeTab === 'surveys' && (
        <div className="flex gap-5 items-start">

          {props.surveys.length === 0 ? (
            <div className="flex-1">
              <Card className="flex flex-col items-center justify-center py-14 gap-3 text-center bg-white border-none shadow-sm">
                <ClipboardList size={32} className="text-on-surface-variant/25" />
                <p className="font-semibold text-on-surface-variant">Aucun sondage actif pour le moment.</p>
                <p className="text-xs text-on-surface-variant/60">La DRH publiera prochainement un sondage.</p>
              </Card>
            </div>
          ) : (
            <>
              {/* Col 1 — Liste inbox */}
              <SurveyInbox
                surveys={props.surveys}
                selectedId={selectedSurveyId}
                onSelect={setSelectedSurveyId}
              />

              {/* Col 2 — Panel de vote */}
              <div className="flex-1 min-w-0">
                {selectedSurvey
                  ? <SurveyVotePanel survey={selectedSurvey} onAnswer={answerSurvey} />
                  : <SurveyEmptyState />
                }
              </div>
            </>
          )}

          {/* Col 3 — Classement */}
          <RankingSidebar ranking={props.employee_of_month_ranking} />
        </div>
      )}

      {/* ═══ TAB VOTE EMPLOYÉ DU MOIS ═══ */}
      {activeTab === 'vote' && (
        <div className="flex gap-5 items-start">
          <div className="flex-1 min-w-0 space-y-5">

           

            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un collègue…"
                  className="w-full pl-9 pr-4 py-2.5 border border-surface-container-high rounded-xl text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <DeptCombobox value={deptFilter} onChange={setDeptFilter} departments={departments} />
              {(search || deptFilter) && (
                <button type="button" onClick={() => { setSearch(''); setDeptFilter(''); }} className="px-3 py-2.5 text-xs font-bold text-on-surface-variant hover:text-on-surface border border-surface-container-high rounded-xl bg-white transition-colors">
                  Réinitialiser
                </button>
              )}
            </div>

            {filteredCandidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <p className="text-sm font-semibold text-on-surface-variant">Aucun collègue trouvé.</p>
                <button type="button" onClick={() => { setSearch(''); setDeptFilter(''); }} className="text-xs font-bold text-primary hover:underline">
                  Effacer les filtres
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {paginatedCandidates.map((candidate) => {
                    const entry = rankingMap[candidate.id];
                    const rank = entry?.rank ?? -1;
                    const rankRow = entry?.row;
                    const isVoted =
                      nomineeId === candidate.id ||
                      (props.my_vote?.nominee_id === candidate.id && nomineeId === 0);

                    return (
                      <Card
                        key={candidate.id}
                        className={`border-none shadow-md bg-white flex flex-col items-center gap-3 py-5 px-3 transition-all duration-200 h-full ${
                          isVoted ? 'ring-2 ring-primary shadow-lg shadow-primary/10' : 'hover:shadow-lg hover:-translate-y-0.5'
                        }`}
                      >
                        <CandidateAvatar name={candidate.name} src={candidate.avatar} size={14} rank={rank >= 0 ? rank : undefined} />

                        <div className="text-center w-full min-w-0 flex-1 flex flex-col">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="font-black text-sm leading-tight truncate">{candidate.name}</p>
                            </TooltipTrigger>
                            {candidate.name.length > 18 && (
                              <TooltipContent side="top" className="text-xs">{candidate.name}</TooltipContent>
                            )}
                          </Tooltip>
                          <p className="text-[11px] text-on-surface-variant font-medium mt-1 line-clamp-2 h-8 flex items-center justify-center">
                            {candidate.department || '—'}
                          </p>
                          {rankRow && (
                            <p className="text-[10px] font-black text-primary mt-1">
                              {rankRow.votes_count} vote{rankRow.votes_count > 1 ? 's' : ''} · {rankRow.merit_score}pts
                            </p>
                          )}
                          {rank >= 0 && rank <= 2 && (
                            <span className={`mt-1.5 self-center inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                              rank === 0 ? 'bg-amber-100 text-amber-700' :
                              rank === 1 ? 'bg-slate-100 text-slate-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              <Medal size={9} />
                              {rank === 0 ? '1er' : rank === 1 ? '2e' : '3e'}
                            </span>
                          )}
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          className={`w-full text-xs transition-all ${
                            isVoted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 shadow-none' : ''
                          }`}
                          variant={isVoted ? 'outline' : 'primary'}
                          onClick={() => submitVote(candidate.id)}
                        >
                          {isVoted ? <><Check size={12} /> Mon vote</> : <><Star size={12} /> Voter</>}
                        </Button>
                      </Card>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4">
                    <button type="button" onClick={() => setCandidatePage(Math.max(1, candidatePage - 1))} disabled={candidatePage === 1} className="p-2 rounded-lg border border-surface-container-high hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm font-semibold">{candidatePage} / {totalPages}</span>
                    <button type="button" onClick={() => setCandidatePage(Math.min(totalPages, candidatePage + 1))} disabled={candidatePage === totalPages} className="p-2 rounded-lg border border-surface-container-high hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <RankingSidebar ranking={props.employee_of_month_ranking} />
        </div>
      )}
    </div>
  );
}