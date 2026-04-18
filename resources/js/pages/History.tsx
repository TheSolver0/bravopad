import { useState, useMemo } from 'react';
import { Link } from '@inertiajs/react';
import {
  Search, Filter, ArrowRight, MessageSquare, Award, Star,
  Gift, TrendingUp, TrendingDown, Pencil, Trophy, Zap, Heart, Users
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Bravo, User } from './types';
import { MOCK_REWARDS } from './constants';

interface HistoryProps {
  bravos: Bravo[];
  currentUserId: number;
  currentUser: User;
  pointsGiven: number;
}

// ── Définition des awards (badges de progression) ─────────────────────────
interface AwardDef {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  unlocked: (data: { received: Bravo[]; sent: Bravo[]; pts: number; uniqueSenders: number }) => boolean;
}

const AWARD_DEFS: AwardDef[] = [
  {
    id: 'first_bravo',
    label: 'Premier Bravo',
    description: 'Recevoir son premier Bravo',
    icon: <Star size={14} />,
    color: '#f59e0b',
    unlocked: ({ received }) => received.length >= 1,
  },
  {
    id: 'generous',
    label: 'Généreux',
    description: 'Envoyer 5 Bravos',
    icon: <Heart size={14} />,
    color: '#ec4899',
    unlocked: ({ sent }) => sent.length >= 5,
  },
  {
    id: 'team_player',
    label: 'Esprit d\'équipe',
    description: 'Recevoir des Bravos de 3 personnes différentes',
    icon: <Users size={14} />,
    color: '#3b82f6',
    unlocked: ({ uniqueSenders }) => uniqueSenders >= 3,
  },
  {
    id: 'pts_500',
    label: 'Cap 500',
    description: 'Atteindre 500 points reçus',
    icon: <Zap size={14} />,
    color: '#8b5cf6',
    unlocked: ({ pts }) => pts >= 500,
  },
  {
    id: 'recognized',
    label: 'Bien reconnu',
    description: 'Recevoir 10 Bravos',
    icon: <Trophy size={14} />,
    color: '#10b981',
    unlocked: ({ received }) => received.length >= 10,
  },
  {
    id: 'pts_2000',
    label: 'Cap 2000',
    description: 'Atteindre 2000 points reçus',
    icon: <Award size={14} />,
    color: '#f97316',
    unlocked: ({ pts }) => pts >= 2000,
  },
];

export default function History({ bravos, currentUserId, currentUser, pointsGiven }: HistoryProps) {
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');
  const [search, setSearch] = useState('');

  const received = useMemo(() => bravos.filter(b => b.receiver_id === currentUserId), [bravos, currentUserId]);
  const sent      = useMemo(() => bravos.filter(b => b.sender_id   === currentUserId), [bravos, currentUserId]);

  // Valeurs les plus mises en avant (bravos reçus)
  const topValues = useMemo(() => {
    const counts: Record<string, { name: string; color?: string; count: number }> = {};
    for (const b of received) {
      for (const v of b.values ?? []) {
        if (!counts[v.id]) counts[v.id] = { name: v.name, color: v.color, count: 0 };
        counts[v.id].count++;
      }
    }
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [received]);

  // Awards débloqués/verrouillés
  const uniqueSenders = useMemo(() =>
    new Set(received.map(b => b.sender_id)).size, [received]);

  const awards = useMemo(() =>
    AWARD_DEFS.map(a => ({
      ...a,
      isUnlocked: a.unlocked({ received, sent, pts: currentUser.points_total, uniqueSenders }),
    })), [received, sent, currentUser.points_total, uniqueSenders]);

  // Suggestion de récompense
  const rewardSuggestion = useMemo(() => {
    const pts = currentUser.points_total;
    const affordable = MOCK_REWARDS.filter(r => r.cost <= pts).sort((a, b) => b.cost - a.cost);
    if (affordable.length > 0) return { reward: affordable[0], canAfford: true, missing: 0 };
    const next = [...MOCK_REWARDS].sort((a, b) => a.cost - b.cost)[0];
    return { reward: next, canAfford: false, missing: next.cost - pts };
  }, [currentUser.points_total]);

  // Liste filtrée
  const filtered = bravos.filter(b => {
    if (filter === 'sent'     && b.sender_id   !== currentUserId) return false;
    if (filter === 'received' && b.receiver_id !== currentUserId) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!b.message?.toLowerCase().includes(q)
        && !b.sender?.name.toLowerCase().includes(q)
        && !b.receiver?.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex gap-6 items-start">

        {/* ══ COLONNE PRINCIPALE ══════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* En-tête + filtres */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold">Historique</h1>
              <p className="text-sm text-on-surface-variant">Retrouvez tous les moments partagés.</p>
            </div>
            <div className="flex items-center gap-1.5 bg-white rounded-xl p-1 shadow-sm">
              {(['all', 'sent', 'received'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filter === f
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {f === 'all' ? 'Tous' : f === 'sent' ? 'Envoyés' : 'Reçus'}
                </button>
              ))}
            </div>
          </div>

          {/* Barre de recherche */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
              <input
                type="text"
                placeholder="Rechercher un message, un collègue..."
                className="w-full pl-11 pr-4 py-2.5 bg-white rounded-xl border-none shadow-sm focus:ring-2 focus:ring-primary/20 text-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-sm font-bold text-sm text-on-surface-variant hover:text-primary transition-all cursor-pointer">
              <Filter size={16} />
              Filtres
            </button>
          </div>

          {/* Liste des bravos */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant">
              <MessageSquare className="mx-auto mb-3 opacity-30" size={40} />
              <p className="font-bold">Aucun bravo trouvé.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(bravo => (
                <Card key={bravo.id} className="hover:shadow-lg transition-all border-none bg-white/80 backdrop-blur-sm cursor-pointer">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex -space-x-3">
                        <img
                          src={bravo.sender?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${bravo.sender_id}`}
                          alt=""
                          className="w-11 h-11 rounded-xl bg-surface-container-low border-2 border-white shadow-md"
                          referrerPolicy="no-referrer"
                        />
                       
                        <img
                          src={bravo.receiver?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${bravo.receiver_id}`}
                          alt=""
                          className="w-11 h-11 rounded-xl bg-surface-container-low border-2 border-white shadow-md"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-sm">
                            {bravo.sender?.name ?? '?'}
                            <span className="text-on-surface-variant font-normal mx-1">→</span>
                            {bravo.receiver?.name ?? '?'}
                          </p>
                          <p className="text-[10px] text-on-surface-variant">{bravo.created_at}</p>
                        </div>
                        <div className="flex items-center gap-1 text-secondary font-bold shrink-0">
                          <Award size={14} />
                          +{bravo.points}
                        </div>
                      </div>
                      {bravo.message && (
                        <div className="bg-surface-container-low/40 px-3 py-2 rounded-xl">
                          <p className="text-xs text-on-surface-variant italic leading-relaxed">"{bravo.message}"</p>
                        </div>
                      )}
                      {bravo.values && bravo.values.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {bravo.values.map(v => (
                            <Badge key={v.id}   className="border-1 bg-white text-[10px]" style={v.color ? { borderColor: v.color } : undefined}>{v.name}</Badge>
                            // <Badge key={v.id} variant="secondary" className="border-none text-white text-[10px]" style={v.color ? { backgroundColor: v.color } : undefined}>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* ══ SIDEBAR DROITE ══════════════════════════════════════════════ */}
        <aside className="w-72 xl:w-80 shrink-0 space-y-4">

          {/* ── 1. Profil ── */}
          <Card className="border-none bg-white/90 backdrop-blur-sm p-0 overflow-hidden">
            {/* Bandeau couleur */}
            <div className="h-16 bg-gradient-to-r from-primary/80 to-secondary/60" />
            <div className="px-4 pb-4 -mt-8 space-y-3">
              <div className="flex items-end justify-between">
                <img
                  src={currentUser.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`}
                  alt={currentUser.name}
                  className="w-16 h-16 rounded-2xl border-4 border-white shadow-lg"
                  referrerPolicy="no-referrer"
                />
                <Link
                  href="/settings/profile"
                  className="flex items-center gap-1.5 text-[11px] font-bold text-on-surface-variant hover:text-primary transition-colors px-2.5 py-1.5 bg-surface-container-low rounded-lg"
                >
                  <Pencil size={11} />
                  Modifier
                </Link>
              </div>
              <div>
                <p className="font-extrabold text-base leading-tight">{currentUser.name}</p>
                <p className="text-xs text-on-surface-variant font-medium">{currentUser.role}</p>
                <p className="text-[11px] text-on-surface-variant/70">{currentUser.department}</p>
              </div>
            </div>
          </Card>

          {/* ── 2. Portefeuille de points ── */}
          <Card className="border-none bg-white/90 backdrop-blur-sm space-y-3">
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Points</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary/8 rounded-xl p-3 space-y-0.5">
                <div className="flex items-center gap-1.5 text-primary">
                  <TrendingUp size={13} />
                  <span className="text-[10px] font-bold uppercase tracking-wide">Reçus</span>
                </div>
                <p className="text-2xl font-extrabold text-primary leading-tight">
                  {currentUser.points_total.toLocaleString()}
                </p>
                <p className="text-[10px] text-on-surface-variant">{received.length} bravo{received.length > 1 ? 's' : ''} reçu{received.length > 1 ? 's' : ''}</p>
              </div>
              <div className="bg-secondary/8 rounded-xl p-3 space-y-0.5">
                <div className="flex items-center gap-1.5 text-secondary">
                  <TrendingDown size={13} />
                  <span className="text-[10px] font-bold uppercase tracking-wide">Donnés</span>
                </div>
                <p className="text-2xl font-extrabold text-secondary leading-tight">
                  {pointsGiven.toLocaleString()}
                </p>
                <p className="text-[10px] text-on-surface-variant">{sent.length} bravo{sent.length > 1 ? 's' : ''} envoyé{sent.length > 1 ? 's' : ''}</p>
              </div>
            </div>
          </Card>

          {/* ── 3. Valeurs les plus reconnues ── */}
          {topValues.length > 0 && (
            <Card className="border-none bg-white/90 backdrop-blur-sm space-y-3">
              <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Valeurs mises en avant</p>
              <div className="space-y-2">
                {topValues.map((v) => (
                  <div key={v.name} className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: v.color ?? '#6366f1' }}
                    />
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm font-semibold">{v.name}</span>
                      <span className="text-[10px] text-on-surface-variant font-medium">×{v.count}</span>
                    </div>
                    {/* barre de progression relative à la valeur max */}
                    <div className="w-12 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(v.count / topValues[0].count) * 100}%`,
                          backgroundColor: v.color ?? '#6366f1',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── 4. Awards ── */}
          <Card className="border-none bg-white/90 backdrop-blur-sm space-y-3">
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Awards</p>
            <div className="grid grid-cols-3 gap-2">
              {awards.map(a => (
                <div
                  key={a.id}
                  title={a.description}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                    a.isUnlocked
                      ? 'bg-surface-container-low/60'
                      : 'opacity-35 grayscale'
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: a.isUnlocked ? a.color : '#94a3b8' }}
                  >
                    {a.icon}
                  </div>
                  <span className="text-[9px] font-bold text-center text-on-surface leading-tight">{a.label}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* ── 5. Prochaine récompense ── */}
          <Card className="border-none bg-white/90 backdrop-blur-sm space-y-3">
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant flex items-center gap-1.5">
              <Gift size={10} />
              {rewardSuggestion.canAfford ? 'Disponible en boutique' : 'Prochain objectif'}
            </p>
            <div className="flex gap-3 items-center">
              <img
                src={rewardSuggestion.reward.image}
                alt={rewardSuggestion.reward.title}
                className="w-12 h-12 rounded-xl object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{rewardSuggestion.reward.title}</p>
                <p className="text-[11px] text-on-surface-variant leading-snug line-clamp-2">
                  {rewardSuggestion.reward.description}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary">{rewardSuggestion.reward.cost.toLocaleString()} pts</span>
              {rewardSuggestion.canAfford ? (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Échangeable !</span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-surface-container-high text-on-surface-variant rounded-full">
                  -{rewardSuggestion.missing.toLocaleString()} pts
                </span>
              )}
            </div>
          </Card>

        </aside>
      </div>
    </div>
  );
}
