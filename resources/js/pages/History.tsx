import { useState, useMemo, useRef } from 'react';
import { Link, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Filter, MessageSquare, Award, Star,
  Gift, TrendingUp, TrendingDown, Pencil, Trophy, Zap, Heart, Users,
  ArrowRight, MoreHorizontal, Smile, Camera,
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Bravo, User, BadgeStat } from './types';
import { MOCK_REWARDS, BADGES } from './constants';

interface HistoryProps {
  bravos: Bravo[];
  currentUserId: number;
  currentUser: User;
  pointsGiven: number;
  badgesSent: BadgeStat[];
}

// ── Avatar helper ─────────────────────────────────────────────────────────────
function getAvatar(user: { name: string; avatar?: string | null }): string {
  if (user.avatar && user.avatar.trim() !== '') return user.avatar;
  const initials = user.name.split(' ').slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=6366f1&color=ffffff&size=128&bold=true&format=svg`;
}

// ── Définition des awards ─────────────────────────────────────────────────────
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
    label: "Esprit d'équipe",
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

export default function History({ bravos, currentUserId, currentUser, pointsGiven, badgesSent }: HistoryProps) {
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');
  const [search, setSearch] = useState('');
  const [comments, setComments] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const received = useMemo(() => bravos.filter(b => b.receiver_id === currentUserId), [bravos, currentUserId]);
  const sent      = useMemo(() => bravos.filter(b => b.sender_id   === currentUserId), [bravos, currentUserId]);

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

  const uniqueSenders = useMemo(() => new Set(received.map(b => b.sender_id)).size, [received]);

  const awards = useMemo(() =>
    AWARD_DEFS.map(a => ({
      ...a,
      isUnlocked: a.unlocked({ received, sent, pts: currentUser.points_total, uniqueSenders }),
    })), [received, sent, currentUser.points_total, uniqueSenders]);

  const rewardSuggestion = useMemo(() => {
    const pts = currentUser.points_total;
    const affordable = MOCK_REWARDS.filter(r => r.cost <= pts).sort((a, b) => b.cost - a.cost);
    if (affordable.length > 0) return { reward: affordable[0], canAfford: true, missing: 0 };
    const next = [...MOCK_REWARDS].sort((a, b) => a.cost - b.cost)[0];
    return { reward: next, canAfford: false, missing: next.cost - pts };
  }, [currentUser.points_total]);

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

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    const formData = new FormData();
    formData.append('avatar', file);
    setAvatarUploading(true);
    router.post('/settings/avatar', formData, {
      forceFormData: true,
      preserveScroll: true,
      onFinish: () => setAvatarUploading(false),
    });
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">

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
            <div className="space-y-4">
              {filtered.map((bravo, index) => {
                const badgeInfo = BADGES.find(x => x.key === bravo.badge);
                const badgeColor = badgeInfo?.color ?? '#6366f1';
                return (
                  <motion.div
                    key={bravo.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                  >
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                      {/* Header : badge pill + points */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
                        {badgeInfo ? (
                          <span
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ backgroundColor: `${badgeColor}18`, color: badgeColor }}
                          >
                            <Star size={11} style={{ fill: badgeColor, color: badgeColor }} />
                            {badgeInfo.label}
                          </span>
                        ) : (
                          <span />
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-400">+{bravo.points} pts</span>
                          <button className="text-gray-300 hover:text-gray-500 transition-colors cursor-pointer">
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Corps */}
                      <div className="px-4 pt-4 pb-3 space-y-3">
                        <div className="flex items-start gap-4">
                          {/* Avatars superposés */}
                          <div className="flex items-center shrink-0">
                            <div className="relative">
                              <img
                                src={bravo.sender ? getAvatar(bravo.sender) : `https://ui-avatars.com/api/?name=?&background=e5e7eb&color=6b7280&size=64`}
                                alt=""
                                className="w-10 h-10 rounded-xl ring-2 ring-white shadow-sm z-0"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute -right-1 -bottom-1 bg-primary/80 text-white p-0.5 rounded-md shadow z-10">
                                <ArrowRight size={9} />
                              </div>
                            </div>
                            <img
                              src={bravo.receiver ? getAvatar(bravo.receiver) : `https://ui-avatars.com/api/?name=?&background=e5e7eb&color=6b7280&size=64`}
                              alt=""
                              className="w-14 h-14 rounded-2xl ring-4 ring-white shadow-md -ml-2 z-10 relative"
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-500">
                              To <span className="font-bold text-gray-800">{bravo.receiver?.name ?? '—'}</span>
                            </p>
                            {bravo.message && (
                              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{bravo.message}</p>
                            )}
                            {bravo.values && bravo.values.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {bravo.values.map(v => (
                                  <span
                                    key={v.id}
                                    className="px-2.5 py-0.5 rounded-full border text-[11px] font-medium bg-white"
                                    style={v.color ? { borderColor: `${v.color}80`, color: v.color } : { borderColor: '#e5e7eb', color: '#6b7280' }}
                                  >
                                    {v.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Footer : date + sender */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                          <span className="text-xs text-gray-400">{bravo.created_at}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              From <span className="font-medium text-gray-700">{bravo.sender?.name ?? '—'}</span>
                            </span>
                            <img
                              src={bravo.sender ? getAvatar(bravo.sender) : `https://ui-avatars.com/api/?name=?&background=e5e7eb&color=6b7280&size=64`}
                              alt=""
                              className="w-7 h-7 rounded-full border-2 border-gray-100 shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Zone commentaire */}
                      <div className="border-t border-gray-100 px-4 py-3 space-y-2 bg-gray-50/40">
                        <div className="flex items-center justify-between">
                          <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                            <Heart size={14} />
                            <span>{bravo.likes_count}</span>
                          </button>
                          <button className="text-gray-300 hover:text-gray-500 transition-colors cursor-pointer">
                            <Smile size={16} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <img
                            src={getAvatar(currentUser)}
                            alt=""
                            className="w-7 h-7 rounded-full shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 flex items-center bg-white rounded-full px-3 py-1.5 border border-gray-200 gap-2 focus-within:border-gray-300 transition-colors">
                            <input
                              placeholder="Écrire un commentaire..."
                              value={comments[bravo.id] ?? ''}
                              onChange={e => setComments(prev => ({ ...prev, [bravo.id]: e.target.value }))}
                              className="flex-1 bg-transparent text-xs outline-none text-gray-600 placeholder-gray-400"
                            />
                            <button className="text-gray-300 hover:text-gray-500 transition-colors shrink-0 cursor-pointer">
                              <Smile size={13} />
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* ══ SIDEBAR DROITE ══════════════════════════════════════════════ */}
        <aside className="w-full lg:w-72 xl:w-80 lg:shrink-0 space-y-4">

          {/* ── 1. Profil ── */}
          <Card className="border-none bg-white/90 backdrop-blur-sm p-0 overflow-hidden">
            <div className="h-16 bg-gradient-to-r from-primary/80 to-secondary/60" />
            <div className="px-4 pb-4 -mt-8 space-y-3">
              <div className="flex items-end justify-between">
                <div className="relative">
                  <img
                    src={avatarPreview ?? getAvatar(currentUser)}
                    alt={currentUser.name}
                    className="w-16 h-16 rounded-2xl border-4 border-white shadow-lg object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 rounded-full flex items-center justify-center text-white shadow-md transition-colors cursor-pointer"
                  >
                    {avatarUploading ? (
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera size={12} />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
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
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-primary/8 rounded-xl p-2.5 space-y-0.5">
                <div className="flex items-center gap-1 text-primary">
                  <TrendingUp size={12} />
                  <span className="text-[9px] font-bold uppercase tracking-wide">Reçus</span>
                </div>
                <p className="text-xl font-extrabold text-primary leading-tight">
                  {currentUser.points_total.toLocaleString()}
                </p>
                <p className="text-[9px] text-on-surface-variant">{received.length} reçu{received.length > 1 ? 's' : ''}</p>
              </div>
              <div className="bg-secondary/8 rounded-xl p-2.5 space-y-0.5">
                <div className="flex items-center gap-1 text-secondary">
                  <TrendingDown size={12} />
                  <span className="text-[9px] font-bold uppercase tracking-wide">Donnés</span>
                </div>
                <p className="text-xl font-extrabold text-secondary leading-tight">
                  {pointsGiven.toLocaleString()}
                </p>
                <p className="text-[9px] text-on-surface-variant">{sent.length} envoyé{sent.length > 1 ? 's' : ''}</p>
              </div>
              <div className="rounded-xl p-2.5 space-y-0.5" style={{ backgroundColor: (currentUser.monthly_points_remaining ?? 0) === 0 ? '#fef2f2' : '#fff7ed' }}>
                <div className="flex items-center gap-1" style={{ color: (currentUser.monthly_points_remaining ?? 0) === 0 ? '#ef4444' : '#f97316' }}>
                  <Gift size={12} />
                  <span className="text-[9px] font-bold uppercase tracking-wide">À donner</span>
                </div>
                <p className="text-xl font-extrabold leading-tight" style={{ color: (currentUser.monthly_points_remaining ?? 0) === 0 ? '#ef4444' : '#f97316' }}>
                  {(currentUser.monthly_points_remaining ?? 0).toLocaleString()}
                </p>
                <p className="text-[9px] text-on-surface-variant">ce mois</p>
              </div>
            </div>
            {/* Barre de progression du quota mensuel */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-semibold text-on-surface-variant uppercase tracking-wide">Quota mensuel utilisé</span>
                <span className="text-[9px] font-black text-on-surface-variant">
                  {((currentUser.monthly_points_allowance ?? 100) - (currentUser.monthly_points_remaining ?? 0))} / {currentUser.monthly_points_allowance ?? 100} pts
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.round(((currentUser.monthly_points_allowance ?? 100) - (currentUser.monthly_points_remaining ?? 0)) / (currentUser.monthly_points_allowance ?? 100) * 100)}%`,
                    backgroundColor: (currentUser.monthly_points_remaining ?? 0) === 0 ? '#ef4444' : '#f97316',
                  }}
                />
              </div>
            </div>
          </Card>

          {/* ── 3. Badges les plus envoyés ── */}
          {badgesSent.length > 0 && (
            <Card className="border-none bg-white/90 backdrop-blur-sm space-y-3">
              <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Badges les plus envoyés</p>
              <div className="space-y-2">
                {badgesSent.map(b => (
                  <div key={b.key} className="flex items-center gap-2">
                    <span className="text-base leading-none">{b.emoji}</span>
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm font-semibold">{b.label}</span>
                      <span className="text-[10px] font-black" style={{ color: b.color }}>×{b.count}</span>
                    </div>
                    <div className="w-12 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(b.count / badgesSent[0].count) * 100}%`, backgroundColor: b.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── 4. Valeurs les plus reconnues ── */}
          {topValues.length > 0 && (
            <Card className="border-none bg-white/90 backdrop-blur-sm space-y-3">
              <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Valeurs mises en avant</p>
              <div className="space-y-2">
                {topValues.map((v) => (
                  <div key={v.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: v.color ?? '#6366f1' }} />
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm font-semibold">{v.name}</span>
                      <span className="text-[10px] text-on-surface-variant font-medium">×{v.count}</span>
                    </div>
                    <div className="w-12 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(v.count / topValues[0].count) * 100}%`, backgroundColor: v.color ?? '#6366f1' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── 5. Awards ── */}
          <Card className="border-none bg-white/90 backdrop-blur-sm space-y-3">
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Awards</p>
            <div className="grid grid-cols-3 gap-2">
              {awards.map(a => (
                <div
                  key={a.id}
                  title={a.description}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                    a.isUnlocked ? 'bg-surface-container-low/60' : 'opacity-35 grayscale'
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

          {/* ── 6. Prochaine récompense ── */}
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
