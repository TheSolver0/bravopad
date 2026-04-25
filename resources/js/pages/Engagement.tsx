import { FormEvent, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Award, BarChart3, Check, Sparkles, Vote } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Candidate = { id: number; name: string; department: string };
type RankingRow = {
  user: { id: number; name: string; department: string; avatar?: string | null };
  votes_count: number;
  weighted_votes: number;
  bravo_points: number;
  merit_score: number;
};
type Badge = {
  id: number;
  name: string;
  rarity: string;
  level: number;
  description?: string | null;
  progress?: number;
  awarded_at?: string | null;
};
type SurveyOption = { key: string; label: string };

interface EngagementProps {
  period: string;
  can_manage: boolean;
  vote_candidates: Candidate[];
  my_vote: { nominee_id: number; is_anonymous: boolean; comment?: string | null } | null;
  employee_of_month_ranking: RankingRow[];
  my_badges: Badge[];
  badge_leaderboard: Array<{
    id: number;
    name: string;
    department: string;
    avatar?: string | null;
    points_total: number;
    badge_count: number;
    visibility_score: number;
    status: string;
  }>;
  badges_catalog: Badge[];
  active_survey: {
    id: number;
    title: string;
    question: string;
    options: SurveyOption[];
    starts_at?: string | null;
    ends_at?: string | null;
  } | null;
  survey_stats: Record<string, number> | null;
  my_survey_response: string | null;
}

const rarityClass: Record<string, string> = {
  common: 'bg-slate-100 text-slate-700',
  rare: 'bg-blue-100 text-blue-700',
  epic: 'bg-purple-100 text-purple-700',
  legendary: 'bg-amber-100 text-amber-700',
};

export default function Engagement(props: EngagementProps) {
  const [nomineeId, setNomineeId] = useState<number>(props.my_vote?.nominee_id ?? 0);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(props.my_vote?.is_anonymous ?? true);
  const [comment, setComment] = useState<string>(props.my_vote?.comment ?? '');

  const [surveyTitle, setSurveyTitle] = useState('Pulse RH');
  const [surveyQuestion, setSurveyQuestion] = useState("Comment evaluez-vous l'ambiance d'equipe cette semaine ?");
  const [surveyOptions, setSurveyOptions] = useState('excellent:Excellent\ngood:Bonne\nok:Correcte\nlow:A ameliorer');

  const totalSurveyResponses = useMemo(
    () => Object.values(props.survey_stats ?? {}).reduce((sum, n) => sum + n, 0),
    [props.survey_stats],
  );

  const submitVote = (e: FormEvent) => {
    e.preventDefault();
    if (!nomineeId) return;

    router.post(
      '/engagement/vote',
      { nominee_id: nomineeId, is_anonymous: isAnonymous, comment },
      { preserveScroll: true },
    );
  };

  const submitSurvey = (e: FormEvent) => {
    e.preventDefault();
    const options = surveyOptions
      .split('\n')
      .map((row) => row.trim())
      .filter(Boolean)
      .map((row) => {
        const [key, ...rest] = row.split(':');
        return { key: key.trim(), label: (rest.join(':').trim() || key.trim()) };
      })
      .filter((row) => row.key && row.label);

    if (options.length < 2) return;

    router.post(
      '/engagement/surveys',
      { title: surveyTitle, question: surveyQuestion, options },
      { preserveScroll: true },
    );
  };

  const answerSurvey = (optionKey: string) => {
    if (!props.active_survey) return;
    router.post(
      `/engagement/surveys/${props.active_survey.id}/responses`,
      { option_key: optionKey },
      { preserveScroll: true },
    );
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
          <Sparkles size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Engagement & reconnaissance</h1>
          <p className="text-sm text-on-surface-variant font-medium">
            Badges avances, employe du mois (peer voting) et sondages RH mobiles.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 space-y-5 border-none shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Vote size={18} className="text-primary" />
              Employe du mois ({props.period})
            </h2>
            <span className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
              Score = votes ponderes + merite Bravo
            </span>
          </div>

          <form className="grid md:grid-cols-3 gap-3 items-end" onSubmit={submitVote}>
            <label className="space-y-1 md:col-span-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">Nominer</span>
              <select
                value={nomineeId}
                onChange={(e) => setNomineeId(Number(e.target.value))}
                className="w-full border border-surface-container-high rounded-xl px-3 py-2 text-sm font-medium"
              >
                <option value={0}>Selectionner un collegue</option>
                {props.vote_candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.department}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" variant="primary" className="w-full">
              Enregistrer mon vote
            </Button>
            <label className="md:col-span-2 space-y-1">
              <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                Commentaire (optionnel)
              </span>
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Justifier la nomination"
                className="w-full border border-surface-container-high rounded-xl px-3 py-2 text-sm font-medium"
              />
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded border-surface-container-high"
              />
              Vote semi-anonyme
            </label>
          </form>

          <div className="space-y-2">
            {props.employee_of_month_ranking.map((row, i) => (
              <div key={row.user.id} className="flex items-center gap-3 rounded-xl border border-surface-container-high px-3 py-2">
                <span className="w-6 text-center font-black text-xs text-on-surface-variant">{i + 1}</span>
                <img
                  src={row.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.user.name)}&background=1d4ed8&color=fff`}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate">{row.user.name}</p>
                  <p className="text-xs text-on-surface-variant truncate">{row.user.department}</p>
                </div>
                <p className="text-xs font-semibold text-on-surface-variant">{row.votes_count} votes</p>
                <p className="text-xs font-semibold text-on-surface-variant">{row.bravo_points} pts</p>
                <p className="text-sm font-black text-primary">Score {row.merit_score}</p>
              </div>
            ))}
            {props.employee_of_month_ranking.length === 0 && (
              <p className="text-sm text-on-surface-variant">Pas encore de donnees ce mois-ci.</p>
            )}
          </div>
        </Card>

        <Card className="space-y-4 border-none shadow-lg">
          <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
            <Award size={18} className="text-primary" />
            Mes badges
          </h2>
          <div className="space-y-2">
            {props.my_badges.map((b) => (
              <div key={b.id} className="rounded-xl border border-surface-container-high px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-sm">{b.name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${rarityClass[b.rarity] || rarityClass.common}`}>
                    {b.rarity} L{b.level}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">{b.description}</p>
                <p className="text-[11px] font-semibold text-on-surface-variant mt-1">
                  {b.awarded_at ? 'Badge obtenu' : `Progression: ${b.progress ?? 0}`}
                </p>
              </div>
            ))}
            {props.my_badges.length === 0 && <p className="text-sm text-on-surface-variant">Aucun badge pour le moment.</p>}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 border-none shadow-lg space-y-4">
          <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
            <BarChart3 size={18} className="text-primary" />
            Statut interne & visibilite badges
          </h2>
          <div className="space-y-2">
            {props.badge_leaderboard.map((u, i) => (
              <div key={u.id} className="grid grid-cols-[24px_1fr_auto_auto] gap-3 items-center rounded-xl border border-surface-container-high px-3 py-2">
                <span className="font-black text-xs text-on-surface-variant">{i + 1}</span>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{u.name}</p>
                  <p className="text-xs text-on-surface-variant truncate">{u.department} - {u.status}</p>
                </div>
                <p className="text-xs font-semibold text-on-surface-variant">{u.badge_count} badges</p>
                <p className="text-sm font-black text-primary">Visibilite {u.visibility_score}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-none shadow-lg space-y-4">
          <h2 className="text-lg font-black tracking-tight">Catalogue badges</h2>
          <div className="space-y-2 max-h-[24rem] overflow-y-auto pr-1">
            {props.badges_catalog.map((b) => (
              <div key={b.id} className="rounded-xl border border-surface-container-high px-3 py-2">
                <p className="font-bold text-sm">{b.name}</p>
                <p className="text-xs text-on-surface-variant">{b.description}</p>
                <div className="mt-1 flex items-center gap-2 text-[10px] font-black uppercase text-on-surface-variant">
                  <span>{b.type}</span>
                  <span>•</span>
                  <span>{b.rarity}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="space-y-4 border-none shadow-lg">
          <h2 className="text-lg font-black tracking-tight">Sondage RH en cours</h2>
          {!props.active_survey && (
            <p className="text-sm text-on-surface-variant">Aucun sondage actif pour le moment.</p>
          )}

          {props.active_survey && (
            <div className="space-y-3">
              <p className="font-bold text-sm">{props.active_survey.title}</p>
              <p className="text-sm text-on-surface">{props.active_survey.question}</p>
              <div className="space-y-2">
                {props.active_survey.options.map((opt) => {
                  const count = props.survey_stats?.[opt.key] ?? 0;
                  const pct = totalSurveyResponses > 0 ? Math.round((count / totalSurveyResponses) * 100) : 0;
                  const selected = props.my_survey_response === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => answerSurvey(opt.key)}
                      className={`w-full text-left rounded-xl border px-3 py-2 ${
                        selected ? 'border-primary bg-primary/5' : 'border-surface-container-high'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{opt.label}</span>
                        <span className="text-xs font-black text-on-surface-variant">
                          {count} ({pct}%)
                        </span>
                      </div>
                      {selected && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary mt-1"><Check size={12} /> Mon choix</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {props.can_manage && (
          <Card className="space-y-4 border-none shadow-lg">
            <h2 className="text-lg font-black tracking-tight">Creer un sondage RH rapide</h2>
            <form className="space-y-3" onSubmit={submitSurvey}>
              <label className="space-y-1 block">
                <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">Titre</span>
                <input
                  value={surveyTitle}
                  onChange={(e) => setSurveyTitle(e.target.value)}
                  className="w-full border border-surface-container-high rounded-xl px-3 py-2 text-sm font-medium"
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">Question</span>
                <textarea
                  value={surveyQuestion}
                  onChange={(e) => setSurveyQuestion(e.target.value)}
                  rows={3}
                  className="w-full border border-surface-container-high rounded-xl px-3 py-2 text-sm font-medium"
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                  Options (format cle:label, une ligne par option)
                </span>
                <textarea
                  value={surveyOptions}
                  onChange={(e) => setSurveyOptions(e.target.value)}
                  rows={5}
                  className="w-full border border-surface-container-high rounded-xl px-3 py-2 text-sm font-mono"
                />
              </label>
              <Button type="submit" variant="primary">
                Publier le sondage
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
