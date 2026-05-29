import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  MessageSquare,
  PlusCircle,
  Trophy,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Star,
  X,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  Heart,
  Send,
  PartyPopper,
  Cake,
  Briefcase,
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { User, Bravo, BravoComment, Challenge, BravoValue, Celebration } from './types';
import { BADGES } from './constants';
import CreateBravo from './CreateBravo';
import { ClickableAvatar } from '@/components/clickable-avatar';
import { UserLink } from '@/components/user-link';

interface DashboardProps {
  bravos: Bravo[];
  users: User[];
  activeChallenge: Challenge | null;
  currentUser: User;
  bravoValues: BravoValue[];
  celebrations?: Celebration[];
}

function getAvatar(user: { name: string; avatar?: string | null }): string {
  if (user.avatar && user.avatar.trim() !== '') return user.avatar;
  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=6366f1&color=ffffff&size=128&bold=true&format=svg`;
}

function getCsrf(): string {
  return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}

export default function Dashboard({ bravos, users, activeChallenge, currentUser, bravoValues, celebrations = [] }: DashboardProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';
  const safeUsers = Array.isArray(users) ? users : [];
  const sortedUsers = [...safeUsers].sort((a, b) => b.points_total - a.points_total);
  const topUsers = [...safeUsers].sort((a, b) => b.points_total - a.points_total);

  const nextMilestone = Math.ceil((currentUser.points_total + 1) / 500) * 500;
  const progress = nextMilestone > 0 ? Math.min(100, (currentUser.points_total / nextMilestone) * 100) : 0;

  const myReceivedBravos = bravos.filter(b =>
    b.receiver_id === currentUser.id ||
    (b.receivers ?? []).some(r => r.id === currentUser.id)
  );
  const recognitionCounts = {
    good_job: myReceivedBravos.filter(b => b.badge === 'good_job').length,
    excellent: myReceivedBravos.filter(b => b.badge === 'excellent').length,
    impressive: myReceivedBravos.filter(b => b.badge === 'impressive').length,
  };

  // Per-bravo comment state (local text input + loaded comments)
  const [commentTexts, setCommentTexts] = useState<Record<number, string>>({});
  const [commentLists, setCommentLists] = useState<Record<number, BravoComment[]>>(() => {
    const init: Record<number, BravoComment[]> = {};
    bravos.forEach(b => { init[b.id] = b.comments ?? []; });
    return init;
  });
  const [showComments, setShowComments] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({});

  // Celebrations dismissal
  const [celebrationsDismissed, setCelebrationsDismissed] = useState(false);

  // Back-to-top button
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    const onScroll = () => setShowScrollTop(main.scrollTop > 300);
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => main.removeEventListener('scroll', onScroll);
  }, []);

  // Leaderboard pagination
  const [leaderboardPage, setLeaderboardPage] = useState(0);
  const ITEMS_PER_PAGE = 5;
  const totalLeaderboardPages = Math.ceil(topUsers.length / ITEMS_PER_PAGE);
  const paginatedTopUsers = topUsers.slice(leaderboardPage * ITEMS_PER_PAGE, (leaderboardPage + 1) * ITEMS_PER_PAGE);

  // Progressive loading for bravos
  const [displayedBravos, setDisplayedBravos] = useState(bravos.slice(0, 10));
  const [hasMore, setHasMore] = useState(bravos.length > 10);
  const observer = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(() => {
    setDisplayedBravos(prev => {
      const next = bravos.slice(prev.length, prev.length + 10);
      if (next.length === 0) setHasMore(false);
      return [...prev, ...next];
    });
  }, [bravos]);

  const lastBravoRef = useCallback((node: HTMLDivElement) => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    if (node) observer.current.observe(node);
  }, [hasMore, loadMore]);

  useEffect(() => {
    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, []);

  async function submitComment(bravoId: number) {
    const text = (commentTexts[bravoId] ?? '').trim();
    if (!text || submitting[bravoId]) return;

    setSubmitting(prev => ({ ...prev, [bravoId]: true }));
    try {
      const res = await fetch(`/bravos/${bravoId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrf(),
        },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const comment: BravoComment = await res.json();
        setCommentLists(prev => ({
          ...prev,
          [bravoId]: [comment, ...(prev[bravoId] ?? [])],
        }));
        setCommentTexts(prev => ({ ...prev, [bravoId]: '' }));
        setShowComments(prev => ({ ...prev, [bravoId]: true }));
      }
    } finally {
      setSubmitting(prev => ({ ...prev, [bravoId]: false }));
    }
  }

  async function deleteComment(bravoId: number, commentId: number) {
    await fetch(`/bravos/${bravoId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'X-CSRF-TOKEN': getCsrf() },
    });
    setCommentLists(prev => ({
      ...prev,
      [bravoId]: (prev[bravoId] ?? []).filter(c => c.id !== commentId),
    }));
  }

  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="animate-in fade-in duration-500">

      {/* ── Bannière Célébrations du jour ─────────────────────────────────── */}
      <AnimatePresence>
        {celebrations.length > 0 && !celebrationsDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-6 mt-4 mb-0 rounded-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 px-5 py-3 text-white flex items-center gap-3">
              <PartyPopper size={18} className="shrink-0" />
              <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1">
                {celebrations.map((c, i) => (
                  <span key={i} className="text-sm font-semibold flex items-center gap-1.5">
                    {c.type === 'birthday'
                      ? <><Cake size={14} /> {t('dashboard.happyBirthday', { name: c.name })} 🎂</>
                      : <><Briefcase size={14} /> {t('dashboard.workAnniversary', { name: c.name, count: c.years ?? 1 })} 🎉</>
                    }
                  </span>
                ))}
              </div>
              <button
                onClick={() => setCelebrationsDismissed(true)}
                className="shrink-0 text-white/70 hover:text-white cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6 md:p-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ── Flux des Bravos ────────────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                <MessageSquare className="text-primary" size={20} />
                {t('dashboard.title')}
              </h2>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-surface-container-high">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">{displayedBravos.length} {t('dashboard.recent')}</span>
                </div>
                <Button variant="primary" className="shadow-md shadow-primary/20 px-4 py-2 text-xs" style={{ cursor: 'pointer' }} onClick={() => setShowCreateModal(true)}>
                  <PlusCircle size={20} /> <span className="hidden sm:inline">{t('dashboard.sendBravo')}</span>
                </Button>
              </div>
            </div>

            {displayedBravos.length === 0 ? (
              <Card className="p-10 text-center border-none bg-white/80">
                <MessageSquare className="mx-auto mb-3 text-primary/30" size={40} />
                <p className="font-bold text-on-surface-variant">{t('dashboard.noBravos')}</p>
                <p className="text-sm text-on-surface-variant mt-1">{t('dashboard.beFirst')}</p>
                <Button variant="primary" className="mt-4" onClick={() => setShowCreateModal(true)}>{t('dashboard.sendFirst')}</Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {displayedBravos.map((bravo, index) => {
                  const badgeInfo = BADGES.find(x => x.key === bravo.badge);
                  const badgeColor = badgeInfo?.color ?? '#6366f1';
                  const bravoComments = commentLists[bravo.id] ?? [];
                  const commentCount = bravoComments.length;
                  const commentsVisible = showComments[bravo.id] ?? false;

                  return (
                    <motion.div
                      key={bravo.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                      ref={index === displayedBravos.length - 1 ? lastBravoRef : undefined}
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
                            {(() => {
                              const receivers = bravo.receivers && bravo.receivers.length > 0
                                ? bravo.receivers
                                : bravo.receiver ? [bravo.receiver] : [];
                              const MAX_SHOWN = 3;
                              const shown = receivers.slice(0, MAX_SHOWN);
                              const extra = receivers.length - MAX_SHOWN;
                              return (
                                <div className="flex items-center shrink-0">
                                  <div className="relative">
                                    <ClickableAvatar
                                      src={bravo.sender ? getAvatar(bravo.sender) : `https://ui-avatars.com/api/?name=?&background=e5e7eb&color=6b7280&size=64`}
                                      userName={bravo.sender?.name}
                                      className="w-10 h-10 rounded-xl ring-2 ring-white shadow-sm z-0"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute -right-1 -bottom-1 bg-primary/80 text-white p-0.5 rounded-md shadow z-10">
                                      <ArrowRight size={9} />
                                    </div>
                                  </div>
                                  <div className="flex -ml-2">
                                    {shown.map((r, i) => (
                                      <ClickableAvatar
                                        key={r.id}
                                        src={getAvatar(r)}
                                        userName={r.name}
                                        className="w-14 h-14 rounded-2xl ring-4 ring-white shadow-md relative"
                                        style={{ marginLeft: i > 0 ? '-20px' : undefined, zIndex: 10 + i }}
                                        referrerPolicy="no-referrer"
                                      />
                                    ))}
                                    {extra > 0 && (
                                      <div
                                        className="w-14 h-14 rounded-2xl ring-4 ring-white shadow-md -ml-5 z-20 relative bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500"
                                      >
                                        +{extra}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-500">
                                To{' '}
                                {(() => {
                                  const receivers = bravo.receivers && bravo.receivers.length > 0
                                    ? bravo.receivers
                                    : bravo.receiver ? [bravo.receiver] : [];
                                  if (receivers.length === 0) return <span className="font-bold text-gray-800">—</span>;
                                  if (receivers.length === 1) return <UserLink userId={receivers[0].id} className="font-bold text-gray-800">{receivers[0].name}</UserLink>;
                                  return <>
                                    {receivers.slice(0, -1).map((r, i) => (
                                      <span key={r.id}>{i > 0 ? ', ' : ''}<UserLink userId={r.id} className="font-bold text-gray-800">{r.name}</UserLink></span>
                                    ))}
                                    {' '}<span className="text-gray-400">&</span>{' '}
                                    <UserLink userId={receivers[receivers.length - 1].id} className="font-bold text-gray-800">{receivers[receivers.length - 1].name}</UserLink>
                                  </>;
                                })()}
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

                          {/* Footer: date + sender */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                            <span className="text-xs text-gray-400">{new Date(bravo.created_at).toLocaleDateString(locale)}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                From{' '}
                                {bravo.sender
                                  ? <UserLink userId={bravo.sender.id} className="font-medium text-gray-700">{bravo.sender.name}</UserLink>
                                  : <span className="font-medium text-gray-700">—</span>
                                }
                              </span>
                              <ClickableAvatar
                                src={bravo.sender ? getAvatar(bravo.sender) : `https://ui-avatars.com/api/?name=?&background=e5e7eb&color=6b7280&size=64`}
                                userName={bravo.sender?.name}
                                className="w-7 h-7 rounded-full border-2 border-gray-100 shadow-sm"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Zone commentaires */}
                        <div className="border-t border-gray-100 bg-gray-50/40">
                          {/* Actions bar */}
                          <div className="flex items-center justify-between px-4 py-2">
                            <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-rose-500 transition-colors cursor-pointer">
                              <Heart size={14} />
                              <span>{bravo.likes_count}</span>
                            </button>
                            <button
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors cursor-pointer"
                              onClick={() => setShowComments(prev => ({ ...prev, [bravo.id]: !commentsVisible }))}
                            >
                              <MessageSquare size={13} />
                              <span>{commentCount > 0 ? t('dashboard.comment', { count: commentCount }) : t('dashboard.commentAction')}</span>
                            </button>
                          </div>

                          {/* Liste des commentaires */}
                          <AnimatePresence initial={false}>
                            {commentsVisible && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                {bravoComments.length > 0 && (
                                  <div className="px-4 pb-2 space-y-2">
                                    {bravoComments.map(c => (
                                      <div key={c.id} className="flex items-start gap-2 group">
                                        <ClickableAvatar
                                          src={c.user ? getAvatar(c.user) : `https://ui-avatars.com/api/?name=?&background=e5e7eb&color=6b7280&size=32`}
                                          userName={c.user?.name}
                                          className="w-6 h-6 rounded-full shrink-0 mt-0.5"
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="flex-1 bg-white rounded-xl px-3 py-2 text-xs shadow-sm">
                                          <span className="font-semibold text-gray-700">{c.user?.name ?? 'Unknown'}</span>
                                          <span className="text-gray-500 ml-2">{c.content}</span>
                                          <span className="block text-[10px] text-gray-400 mt-0.5">{c.created_at}</span>
                                        </div>
                                        {c.user?.id === currentUser.id && (
                                          <button
                                            onClick={() => deleteComment(bravo.id, c.id)}
                                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all cursor-pointer mt-1"
                                          >
                                            <X size={12} />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Input commentaire */}
                          <div className="px-4 pb-3 flex items-center gap-2">
                            <ClickableAvatar
                              src={getAvatar(currentUser)}
                              userName={currentUser.name}
                              className="w-7 h-7 rounded-full shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex-1 flex items-center bg-white rounded-full px-3 py-1.5 border border-gray-200 gap-2 focus-within:border-primary/40 transition-colors">
                              <input
                                placeholder={t('dashboard.commentPlaceholder')}
                                value={commentTexts[bravo.id] ?? ''}
                                onChange={e => setCommentTexts(prev => ({ ...prev, [bravo.id]: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(bravo.id); } }}
                                className="flex-1 bg-transparent text-xs outline-none text-gray-600 placeholder-gray-400"
                              />
                              <button
                                onClick={() => submitComment(bravo.id)}
                                disabled={!(commentTexts[bravo.id] ?? '').trim() || submitting[bravo.id]}
                                className="text-primary disabled:text-gray-300 transition-colors shrink-0 cursor-pointer disabled:cursor-default"
                              >
                                {submitting[bravo.id]
                                  ? <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin block" />
                                  : <Send size={13} />
                                }
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

          {/* ── Sidebar droite ─────────────────────────────────────────────── */}
          <div className="lg:col-span-4 space-y-5">

            {/* My Recognition */}
            <RecognitionCard counts={recognitionCounts} />

            {/* My Points */}
            <Card className="p-5 flex flex-col justify-between border-none bg-white shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3B82F6' }}>
                    <Star size={12} className="text-white fill-white" />
                  </span>
                  {t('dashboard.myPoints')}
                </h3>
                <ChevronUp size={16} className="text-gray-400" />
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className={`text-xl font-black ${(currentUser.monthly_points_remaining ?? 0) === 0 ? 'text-red-400' : 'text-primary'}`}>
                    {(currentUser.monthly_points_remaining ?? 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">{t('dashboard.toGive')}</p>
                </div>
                <div>
                  <p className="text-xl font-black text-primary">{currentUser.points_total.toLocaleString(locale)}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">{t('dashboard.redeemable')}</p>
                </div>
                <div>
                  <p className="text-xl font-black text-primary">{(currentUser.monthly_points_allowance ?? 100).toLocaleString(locale)}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">{t('dashboard.monthlyQuota')}</p>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase">{t('dashboard.monthlyUsed')}</span>
                  <span className="text-[10px] font-black text-primary">
                    {((currentUser.monthly_points_allowance ?? 100) - (currentUser.monthly_points_remaining ?? 0)).toLocaleString()} / {(currentUser.monthly_points_allowance ?? 100).toLocaleString()} pts
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(((currentUser.monthly_points_allowance ?? 100) - (currentUser.monthly_points_remaining ?? 0)) / (currentUser.monthly_points_allowance ?? 100) * 100)}%` }}
                    className={`h-full rounded-full ${(currentUser.monthly_points_remaining ?? 0) === 0 ? 'bg-red-400' : 'bg-orange-400'}`}
                  />
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase">{t('dashboard.nextMilestone')}</span>
                  <span className="text-[10px] font-black text-primary">{nextMilestone.toLocaleString()} pts</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </div>
            </Card>

            {/* Classement */}
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                <Trophy className="text-secondary" size={20} />
                {t('dashboard.leaderboard')}
              </h2>
              <button onClick={() => router.visit('/stats')} className="text-primary text-xs font-black hover:underline uppercase tracking-widest cursor-pointer">{t('common.viewAll')}</button>
            </div>

            {topUsers.length >= 3 && (
              <Card className="p-0 overflow-hidden border-none shadow-md bg-white">
                <div className="p-5 bg-gradient-to-br from-primary to-primary-container text-white">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wide opacity-70">{t('dashboard.topPerformers')}</span>
                    <TrendingUp size={16} className="text-secondary" />
                  </div>
                  <div className="flex items-end justify-around pb-2">
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative">
                        <ClickableAvatar src={getAvatar(topUsers[1])} userName={topUsers[1].name} className="w-12 h-12 rounded-full border-2 border-white/30" referrerPolicy="no-referrer" />
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-surface-container-high rounded-full flex items-center justify-center text-[10px] font-bold text-on-surface border-2 border-white">2</div>
                      </div>
                      <span className="text-[10px] font-bold opacity-80 truncate w-16 text-center">{topUsers[1].name.split(' ')[0]}</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 scale-110">
                      <div className="relative">
                        <ClickableAvatar src={getAvatar(topUsers[0])} userName={topUsers[0].name} className="w-16 h-16 rounded-full border-4 border-secondary shadow-lg" referrerPolicy="no-referrer" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-secondary rounded-full flex items-center justify-center text-[10px] font-extrabold text-white border-2 border-white">1</div>
                      </div>
                      <span className="text-[10px] font-bold truncate w-16 text-center">{topUsers[0].name.split(' ')[0]}</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative">
                        <ClickableAvatar src={getAvatar(topUsers[2])} userName={topUsers[2].name} className="w-12 h-12 rounded-full border-2 border-white/30" referrerPolicy="no-referrer" />
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-secondary/50 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white">3</div>
                      </div>
                      <span className="text-[10px] font-bold opacity-80 truncate w-16 text-center">{topUsers[2].name.split(' ')[0]}</span>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {paginatedTopUsers.map((user, index) => {
                    const globalIndex = leaderboardPage * ITEMS_PER_PAGE + index;
                    return (
                      <div key={user.id} className="flex items-center justify-between p-4 hover:bg-primary/5 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                          <span className={`text-[10px] font-black w-3 ${globalIndex < 3 ? 'text-primary' : 'text-on-surface-variant'}`}>{globalIndex + 1}</span>
                          <ClickableAvatar src={getAvatar(user)} userName={user.name} className="w-10 h-10 rounded-xl bg-surface-container-low" referrerPolicy="no-referrer" />
                          <div>
                            <p className="text-sm font-bold group-hover:text-primary transition-colors">{user.name}</p>
                            <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide">{user.department}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-on-surface">{user.points_total.toLocaleString()}</p>
                          <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest">pts</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Pagination Controls */}
                {totalLeaderboardPages > 1 && (
                  <div className="px-4 py-3 bg-gray-50/50 flex items-center justify-between">
                    <button
                      onClick={() => setLeaderboardPage(p => Math.max(0, p - 1))}
                      disabled={leaderboardPage === 0}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 disabled:text-gray-300 disabled:cursor-default hover:bg-white transition-colors cursor-pointer disabled:hover:bg-transparent"
                    >
                      <ChevronLeft size={14} />
                      <span className="hidden sm:inline">{t('common.previous')}</span>
                    </button>
                    <span className="text-xs font-semibold text-gray-500">
                      {t('common.page', { current: leaderboardPage + 1, total: totalLeaderboardPages })}
                    </span>
                    <button
                      onClick={() => setLeaderboardPage(p => Math.min(totalLeaderboardPages - 1, p + 1))}
                      disabled={leaderboardPage === totalLeaderboardPages - 1}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 disabled:text-gray-300 disabled:cursor-default hover:bg-white transition-colors cursor-pointer disabled:hover:bg-transparent"
                    >
                      <span className="hidden sm:inline">{t('common.next')}</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
                
                <div className="p-4 bg-gray-50/50">
                  <Button variant="ghost" className="w-full text-xs font-extrabold tracking-wide py-3" onClick={() => router.visit('/stats')}>
                    {t('dashboard.viewLeaderboard')}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal Créer un Bravo ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => setShowCreateModal(false)}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto bg-gray-50 rounded-2xl shadow-2xl modal-scroll"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-gray-400 hover:text-gray-700 shadow-sm border border-gray-100 transition-all cursor-pointer z-10"
              >
                <X size={16} />
              </button>
              <div className="px-4 py-6">
                <CreateBravo
                  users={users}
                  bravoValues={bravoValues}
                  isModal
                  onSuccess={() => { setShowCreateModal(false); router.reload(); }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back to top button */}
      {showScrollTop && (
        <div className="fixed bottom-4 right-4 z-50 md:right-6">
          <Button
            onClick={() => document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="rounded-full p-3 shadow-lg bg-primary hover:bg-primary/90"
          >
            <ChevronUp size={20} className="text-white" />
          </Button>
        </div>
      )}

    </div>
  );
}

// ── Composant My Recognition ──────────────────────────────────────────────────
interface RecognitionCardProps {
  counts: { good_job: number; excellent: number; impressive: number };
}

function RecognitionCard({ counts }: RecognitionCardProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  const items = [
    { key: 'good_job',   label: 'Good job',    color: '#F97316', count: counts.good_job },
    { key: 'excellent',  label: 'Impressive',  color: '#3B82F6', count: counts.excellent },
    { key: 'impressive', label: 'Exceptional', color: '#9333EA', count: counts.impressive },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Star size={14} className="text-white fill-white" />
          </div>
          <span className="font-bold text-sm text-gray-700">{t('dashboard.myRecognitions')}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 grid grid-cols-3 gap-4">
              {items.map(item => (
                <div key={item.key} className="flex flex-col items-center gap-1.5">
                  <div className="relative">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center shadow-md"
                      style={{ backgroundColor: item.color }}
                    >
                      <Star size={22} className="text-white fill-white" />
                    </div>
                    <div
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 min-w-[22px] h-[18px] px-1 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow border-2 border-white"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.count}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium text-center mt-1">{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
