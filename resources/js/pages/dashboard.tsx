import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  PlusCircle,
  Trophy,
  TrendingUp,
  Star,
  X,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  Send,
  PartyPopper,
  Cake,
  Briefcase,
  Calendar,
  BarChart2,
  Filter,
  Award,
  Users2,
  Gift,
  Settings,
  Anchor,
  Ship,
  Clock,
  Share2,
  Zap,
  Image as ImageIcon,
  FileText as FileTextIcon,
  AtSign,
} from 'lucide-react';
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
  weeklyBravosReceived?: number;
  monthlyBravosCount?: number;
  unreadCount?: number;
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

export default function Dashboard({
  bravos,
  users,
  activeChallenge,
  currentUser,
  bravoValues,
  celebrations = [],
  weeklyBravosReceived = 0,
  monthlyBravosCount = 0,
  unreadCount = 0,
}: DashboardProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';
  const safeUsers = Array.isArray(users) ? users : [];
  const sortedUsers = [...safeUsers].sort((a, b) => b.points_total - a.points_total);

  const firstName = currentUser.name.split(' ')[0];
  const currentUserRank = sortedUsers.findIndex(u => u.id === currentUser.id) + 1;

  // Participation rate: users who sent or received a bravo / total users
  const usersWithActivity = new Set<number>();
  bravos.forEach(b => {
    if (b.sender?.id) usersWithActivity.add(b.sender.id);
    const receivers = b.receivers && b.receivers.length > 0 ? b.receivers : (b.receiver ? [b.receiver] : []);
    receivers.forEach(r => usersWithActivity.add(r.id));
  });
  const participationRate = safeUsers.length > 0
    ? Math.round((usersWithActivity.size / safeUsers.length) * 100)
    : 0;

  // Top receiver today
  const todayStr = new Date().toDateString();
  const todayCounts = new Map<number, { user: User; count: number }>();
  bravos.forEach(b => {
    if (new Date(b.created_at).toDateString() === todayStr) {
      const receivers = b.receivers && b.receivers.length > 0 ? b.receivers : (b.receiver ? [b.receiver] : []);
      receivers.forEach(r => {
        const existing = todayCounts.get(r.id);
        todayCounts.set(r.id, { user: r as User, count: (existing?.count ?? 0) + 1 });
      });
    }
  });
  const topTodayEntry = [...todayCounts.values()].sort((a, b) => b.count - a.count)[0];
  const topTodayUser = topTodayEntry?.user ?? sortedUsers[0];
  const topTodayCount = topTodayEntry?.count ?? 0;

  // Challenge progress (time elapsed %)
  const challengeProgress = activeChallenge ? (() => {
    const start = new Date(activeChallenge.start_date).getTime();
    const end = new Date(activeChallenge.end_date).getTime();
    return Math.round(Math.max(0, Math.min(100, ((Date.now() - start) / (end - start)) * 100)));
  })() : 0;

  const myReceivedBravos = bravos.filter(b =>
    b.receiver_id === currentUser.id ||
    (b.receivers ?? []).some(r => r.id === currentUser.id)
  );
  const recognitionCounts = {
    good_job: myReceivedBravos.filter(b => b.badge === 'good_job').length,
    excellent: myReceivedBravos.filter(b => b.badge === 'excellent').length,
    impressive: myReceivedBravos.filter(b => b.badge === 'impressive').length,
  };

  // Per-bravo comment state
  const [commentTexts, setCommentTexts] = useState<Record<number, string>>({});
  const [commentLists, setCommentLists] = useState<Record<number, BravoComment[]>>(() => {
    const init: Record<number, BravoComment[]> = {};
    bravos.forEach(b => { init[b.id] = b.comments ?? []; });
    return init;
  });
  const [showComments, setShowComments] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({});

  const [celebrationsDismissed, setCelebrationsDismissed] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'bravos'>('all');

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    const onScroll = () => setShowScrollTop(main.scrollTop > 300);
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => main.removeEventListener('scroll', onScroll);
  }, []);

  // Progressive loading
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
      if (entries[0].isIntersecting && hasMore) loadMore();
    });
    if (node) observer.current.observe(node);
  }, [hasMore, loadMore]);

  useEffect(() => {
    return () => { if (observer.current) observer.current.disconnect(); };
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
        setCommentLists(prev => ({ ...prev, [bravoId]: [comment, ...(prev[bravoId] ?? [])] }));
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

  const isAdmin = ['admin', 'super_admin', 'manager', 'hr'].includes(currentUser.role);

  // ── Hero Carousel ────────────────────────────────────────────────────────
  interface HeroSlide {
    id: string; bg: string;
    tag?: React.ReactNode; title: string; subtitle: string;
    cta?: { label: string; action: () => void };
    badge?: React.ReactNode; visual: React.ReactNode;
  }

  const heroSlides: HeroSlide[] = [
    {
      id: 'welcome',
      bg: 'from-[#003d7a] via-[#00529e] to-[#0066c2]',
      tag: (
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/70">
          <Anchor size={10} /> PAD
        </span>
      ),
      title: `Bonjour ${firstName} 👋`,
      subtitle: t('dashboard.welcomeSub', 'Bienvenue sur votre espace OnePAD'),
      cta: { label: t('dashboard.sendBravo', 'Envoyer un Bravo'), action: () => setShowCreateModal(true) },
      badge: (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
          <Ship size={15} className="text-white/80" />
          <span className="font-bold text-sm text-white">
            {weeklyBravosReceived} Bravo{weeklyBravosReceived !== 1 ? 's' : ''} cette semaine
          </span>
        </div>
      ),
      visual: (
        <div className="absolute right-0 inset-y-0 w-1/2 hidden lg:flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#003d7a]" />
          <Anchor size={56} className="absolute right-12 top-1/2 -translate-y-1/2 text-white/6" strokeWidth={1} />
        </div>
      ),
    },
    ...(sortedUsers.length > 0 ? [{
      id: 'spotlight',
      bg: 'from-[#1a1a2e] via-[#16213e] to-[#0f3460]',
      tag: (
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#c6d00a]/90">
          <Star size={10} className="fill-current" /> {t('dashboard.employeeOfMonth', 'Employé du mois')}
        </span>
      ),
      title: sortedUsers[0].name,
      subtitle: `${sortedUsers[0].role} · ${sortedUsers[0].points_total.toLocaleString(locale)} pts`,
      cta: { label: t('dashboard.viewLeaderboardBtn', 'Voir le classement'), action: () => router.visit('/stats') },
      badge: (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#c6d00a]/20 backdrop-blur-md rounded-xl border border-[#c6d00a]/30">
          <Trophy size={15} className="text-[#c6d00a]" />
          <span className="font-bold text-sm text-white">#1</span>
        </div>
      ),
      visual: (
        <div className="absolute right-0 inset-y-0 w-1/3 hidden lg:flex items-center justify-end pr-8 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#1a1a2e]" />
          <div className="relative z-10">
            <ClickableAvatar src={getAvatar(sortedUsers[0])} userName={sortedUsers[0].name} className="w-20 h-20 rounded-2xl border-2 border-[#c6d00a]/40 opacity-70" referrerPolicy="no-referrer" />
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#c6d00a] rounded-full flex items-center justify-center">
              <Trophy size={14} className="text-white" />
            </div>
          </div>
        </div>
      ),
    } as HeroSlide] : []),
    ...(activeChallenge ? [{
      id: 'challenge',
      bg: 'from-primary via-primary/90 to-primary/70',
      tag: (
        <div className="flex items-center gap-2">
          <span className="bg-[#c6d00a] text-gray-900 px-2 py-0.5 text-[10px] font-black rounded-full uppercase">
            {t('dashboard.newChallenge', 'Nouveau défi')}
          </span>
          <span className="flex items-center gap-1 text-white/70 text-xs font-bold">
            <Clock size={11} /> {activeChallenge.days_left}j restants
          </span>
        </div>
      ),
      title: activeChallenge.name,
      subtitle: activeChallenge.description,
      cta: { label: t('dashboard.joinNow', 'Participer'), action: () => router.visit('/challenges') },
      badge: (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
          <Award size={15} className="text-[#c6d00a]" />
          <span className="font-extrabold text-base text-white">+{activeChallenge.points_bonus} pts</span>
        </div>
      ),
      visual: (
        <div className="absolute right-0 inset-y-0 w-1/2 hidden lg:block pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-primary" />
        </div>
      ),
    } as HeroSlide] : []),
  ];

  const [heroCurrent, setHeroCurrent] = useState(0);
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = setInterval(() => setHeroCurrent(c => (c + 1) % heroSlides.length), 5500);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const heroSlide = heroSlides[heroCurrent];

  return (
    <div className="animate-in fade-in duration-500">

      {/* ── Celebrations banner ─────────────────────────────────────────── */}
      <AnimatePresence>
        {celebrations.length > 0 && !celebrationsDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-4 md:mx-6 mt-4 rounded-2xl overflow-hidden"
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
              <button onClick={() => setCelebrationsDismissed(true)} className="shrink-0 text-white/70 hover:text-white cursor-pointer transition-colors">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero Carousel ────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden h-[90px] bg-gradient-to-r from-[#003d7a] to-[#0066c2]">
        <AnimatePresence mode="wait">
          <motion.div
            key={heroSlide.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className={`bg-gradient-to-r ${heroSlide.bg} px-5 text-white flex items-center gap-4 relative h-full`}
          >
            {heroSlide.visual}
            <div className="relative z-10 flex-1 min-w-0 space-y-0.5">
              {heroSlide.tag}
              <h1 className="text-sm md:text-base font-extrabold tracking-tight leading-tight truncate">
                {heroSlide.title}
              </h1>
              <p className="text-white/70 text-[11px] font-medium leading-snug hidden md:block line-clamp-1">
                {heroSlide.subtitle}
              </p>
            </div>
            {heroSlide.badge && (
              <div className="relative z-10 shrink-0 hidden sm:block">{heroSlide.badge}</div>
            )}
            {heroSlide.cta && (
              <Button
                variant="secondary"
                className="relative z-10 px-3 py-1.5 text-xs shadow-md shadow-secondary/40 shrink-0 hidden lg:flex"
                onClick={heroSlide.cta.action}
              >
                {heroSlide.cta.label}
              </Button>
            )}
            {/* Carousel controls */}
            <div className="relative z-20 flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setHeroCurrent(c => (c - 1 + heroSlides.length) % heroSlides.length)}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
              >
                <ChevronLeft size={11} className="text-white" />
              </button>
              <div className="flex items-center gap-1">
                {heroSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setHeroCurrent(i)}
                    className={`rounded-full transition-all cursor-pointer ${
                      i === heroCurrent ? 'w-4 h-1 bg-white' : 'w-1 h-1 bg-white/40 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => setHeroCurrent(c => (c + 1) % heroSlides.length)}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
              >
                <ChevronRight size={11} className="text-white" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-4 md:px-6 pt-5 pb-40 md:pb-24">

        {/* ── Quick Actions ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { icon: <Trophy size={18} className="text-primary" />, label: 'Envoyer un Bravo', onClick: () => setShowCreateModal(true) },
            { icon: <MessageSquare size={18} className="text-blue-500" />, label: 'Écrire un message', onClick: () => router.visit('/messages') },
            { icon: <Calendar size={18} className="text-green-500" />, label: 'Créer un événement', onClick: () => router.visit('/evenements') },
            { icon: <BarChart2 size={18} className="text-purple-500" />, label: 'Lancer un sondage', onClick: () => router.visit(isAdmin ? '/admin/surveys' : '/engagement') },
          ].map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-gray-50 group-hover:bg-primary/5 flex items-center justify-center transition-colors shrink-0">
                {action.icon}
              </div>
              <span className="text-sm font-semibold text-gray-700 leading-tight">{action.label}</span>
            </button>
          ))}
        </div>

        {/* ── Main grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── Centre (8 cols) ──────────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-4">

            {/* Post Composer */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <ClickableAvatar
                  src={getAvatar(currentUser)}
                  userName={currentUser.name}
                  className="w-10 h-10 rounded-full shrink-0"
                />
                <button
                  className="flex-1 text-left px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-full text-sm text-gray-400 transition-colors cursor-pointer"
                  onClick={() => setShowCreateModal(true)}
                >
                  Quoi de neuf, {firstName} ?
                </button>
              </div>
              <div className="flex items-center gap-0.5 mt-3 pt-3 border-t border-gray-50 flex-wrap">
                {[
                  { icon: <ImageIcon size={14} className="text-green-500" />, label: 'Photo / Vidéo' },
                  { icon: <FileTextIcon size={14} className="text-orange-500" />, label: 'Fichier' },
                  { icon: <BarChart2 size={14} className="text-blue-500" />, label: 'Sondage' },
                  { icon: <AtSign size={14} className="text-violet-500" />, label: 'Mention' },
                  { icon: <Calendar size={14} className="text-red-500" />, label: 'Événement' },
                  { icon: <Trophy size={14} className="text-amber-500" />, label: 'Défi' },
                ].map((item, i) => (
                  <button
                    key={i}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => setShowCreateModal(true)}
                  >
                    {item.icon}
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                ))}
                <button
                  className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Send size={14} />
                  Publier
                </button>
              </div>
            </div>

            {/* Feed Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {[
                { key: 'all', label: 'Tout' },
                { key: 'bravos', label: 'Bravos' },
                { key: 'events', label: 'Événements' },
                { key: 'challenges', label: 'Défis' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => {
                    if (tab.key === 'events') { router.visit('/evenements'); return; }
                    if (tab.key === 'challenges') { router.visit('/challenges'); return; }
                    setActiveTab(tab.key as 'all' | 'bravos');
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === tab.key
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white text-gray-500 border border-gray-200 hover:border-primary/30 hover:text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              <div className="flex items-center gap-2 ml-auto">
                <div className="hidden sm:flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{displayedBravos.length} récents</span>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-500 border border-gray-200 bg-white hover:border-gray-300 transition-colors whitespace-nowrap cursor-pointer">
                  <Filter size={14} />
                  <span className="hidden sm:inline">Filtres</span>
                </button>
              </div>
            </div>

            {/* ── Bravo Feed ───────────────────────────────────────────── */}
            {displayedBravos.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                <MessageSquare className="mx-auto mb-3 text-primary/30" size={40} />
                <p className="font-bold text-gray-500">{t('dashboard.noBravos')}</p>
                <p className="text-sm text-gray-400 mt-1">{t('dashboard.beFirst')}</p>
                <Button variant="primary" className="mt-4" onClick={() => setShowCreateModal(true)}>{t('dashboard.sendFirst')}</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedBravos.map((bravo, index) => {
                  const badgeInfo = BADGES.find(x => x.key === bravo.badge);
                  const badgeColor = badgeInfo?.color ?? '#6366f1';
                  const bravoComments = commentLists[bravo.id] ?? [];
                  const commentCount = bravoComments.length;
                  const commentsVisible = showComments[bravo.id] ?? false;
                  const receivers = bravo.receivers && bravo.receivers.length > 0
                    ? bravo.receivers
                    : bravo.receiver ? [bravo.receiver] : [];

                  return (
                    <motion.div
                      key={bravo.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      ref={index === displayedBravos.length - 1 ? lastBravoRef : undefined}
                    >
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                        {/* Social post header */}
                        <div className="px-4 pt-4 pb-3 flex items-start gap-3">
                          <ClickableAvatar
                            src={bravo.sender ? getAvatar(bravo.sender) : `https://ui-avatars.com/api/?name=?&background=e5e7eb&color=6b7280&size=64`}
                            userName={bravo.sender?.name}
                            className="w-10 h-10 rounded-full shrink-0 mt-0.5"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap text-sm">
                              {bravo.sender
                                ? <UserLink userId={bravo.sender.id} className="font-bold text-gray-800">{bravo.sender.name}</UserLink>
                                : <span className="font-bold text-gray-800">—</span>
                              }
                              <span className="text-gray-400">a envoyé un Bravo à</span>
                              {receivers.length === 1
                                ? <UserLink userId={receivers[0].id} className="font-bold text-gray-800">{receivers[0].name}</UserLink>
                                : receivers.slice(0, 2).map((r, i) => (
                                    <span key={r.id} className="flex items-center gap-1">
                                      {i > 0 && <span className="text-gray-400">&</span>}
                                      <UserLink userId={r.id} className="font-bold text-gray-800">{r.name}</UserLink>
                                    </span>
                                  ))
                              }
                              {receivers.length > 2 && (
                                <span className="text-gray-400 text-xs">& {receivers.length - 2} autres</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-400">{new Date(bravo.created_at).toLocaleDateString(locale)}</span>
                              {badgeInfo && (
                                <span
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                  style={{ backgroundColor: `${badgeColor}18`, color: badgeColor }}
                                >
                                  <Star size={9} style={{ fill: badgeColor, color: badgeColor }} />
                                  {badgeInfo.label}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-semibold text-gray-400">+{bravo.points} pts</span>
                            <button className="text-gray-300 hover:text-gray-500 transition-colors cursor-pointer">
                              <MoreHorizontal size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Multiple receivers avatars */}
                        {receivers.length > 1 && (
                          <div className="px-4 pb-3 flex items-center gap-2">
                            <div className="flex -space-x-2">
                              {receivers.slice(0, 5).map((r, i) => (
                                <ClickableAvatar
                                  key={r.id}
                                  src={getAvatar(r)}
                                  userName={r.name}
                                  className="w-8 h-8 rounded-full ring-2 ring-white"
                                  style={{ zIndex: 10 + i }}
                                  referrerPolicy="no-referrer"
                                />
                              ))}
                              {receivers.length > 5 && (
                                <div className="w-8 h-8 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500" style={{ zIndex: 20 }}>
                                  +{receivers.length - 5}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Message */}
                        {bravo.message && (
                          <div className="px-4 pb-3">
                            <p className="text-sm text-gray-700 leading-relaxed">{bravo.message}</p>
                          </div>
                        )}

                        {/* Values */}
                        {bravo.values && bravo.values.length > 0 && (
                          <div className="px-4 pb-3 flex flex-wrap gap-1.5">
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

                        {/* Actions bar */}
                        <div className="flex items-center px-4 py-2.5 border-t border-gray-50 gap-1">
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer">
                            <Heart size={14} />
                            <span>{bravo.likes_count}</span>
                          </button>
                          <button
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                            onClick={() => setShowComments(prev => ({ ...prev, [bravo.id]: !commentsVisible }))}
                          >
                            <MessageSquare size={14} />
                            <span>{commentCount > 0 ? `${commentCount}` : 'Commenter'}</span>
                          </button>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer">
                            <Share2 size={14} />
                            <span className="hidden sm:inline">Partager</span>
                          </button>
                          {commentCount > 0 && (
                            <button
                              className="ml-auto text-xs font-semibold text-primary hover:underline cursor-pointer"
                              onClick={() => setShowComments(prev => ({ ...prev, [bravo.id]: !commentsVisible }))}
                            >
                              Voir les {commentCount} commentaires
                            </button>
                          )}
                        </div>

                        {/* Comments */}
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
                                <div className="px-4 pb-2 pt-1 space-y-2 bg-gray-50/40">
                                  {bravoComments.map(c => (
                                    <div key={c.id} className="flex items-start gap-2 group">
                                      <ClickableAvatar
                                        src={c.user ? getAvatar(c.user) : `https://ui-avatars.com/api/?name=?&background=e5e7eb&color=6b7280&size=32`}
                                        userName={c.user?.name}
                                        className="w-6 h-6 rounded-full shrink-0 mt-0.5"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="flex-1 bg-white rounded-xl px-3 py-2 text-xs shadow-sm border border-gray-50">
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

                        {/* Comment input */}
                        <div className="px-4 pb-3 pt-2 flex items-center gap-2 bg-gray-50/40 border-t border-gray-50">
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
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Right Sidebar (4 cols) ──────────────────────────────────── */}
          <div className="lg:col-span-4 space-y-4">

            {/* Bravos du jour */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Trophy size={16} className="text-amber-500" /> Bravos du jour
                </h3>
                <button onClick={() => router.visit('/stats')} className="text-xs font-semibold text-primary hover:underline cursor-pointer">
                  Voir tout
                </button>
              </div>
              {topTodayUser ? (
                <div className="flex items-center gap-3">
                  <ClickableAvatar
                    src={getAvatar(topTodayUser)}
                    userName={topTodayUser.name}
                    className="w-12 h-12 rounded-full ring-2 ring-amber-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-800 truncate">{topTodayUser.name}</p>
                    <p className="text-xs text-gray-400">
                      {topTodayCount > 0
                        ? `${topTodayCount} Bravo${topTodayCount > 1 ? 's' : ''} reçus aujourd'hui`
                        : `${topTodayUser.points_total.toLocaleString()} pts au total`
                      }
                    </p>
                  </div>
                  <button
                    className="px-3 py-1.5 border border-primary/30 bg-primary/5 text-primary text-xs font-semibold rounded-lg hover:bg-primary/10 transition-colors cursor-pointer shrink-0"
                    onClick={() => setShowCreateModal(true)}
                  >
                    Féliciter
                  </button>
                </div>
              ) : null}
              {/* Decorative dots */}
              <div className="absolute top-3 right-12 flex gap-1">
                {['#ef4444', '#f97316', '#22c55e', '#3b82f6'].map((c, i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <MessageSquare size={16} className="text-primary" /> Messages
                </h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => router.visit('/messages')} className="text-xs font-semibold text-primary hover:underline cursor-pointer">Voir tout</button>
                  <button onClick={() => router.visit('/messages')} className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-primary/10 text-gray-500 hover:text-primary transition-colors cursor-pointer">
                    <PlusCircle size={12} />
                  </button>
                </div>
              </div>
              <button
                onClick={() => router.visit('/messages')}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-primary/5 rounded-xl transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare size={15} className="text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-700">Messagerie</p>
                    <p className="text-xs text-gray-400">Voir tous vos messages</p>
                  </div>
                </div>
                {unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Collaborateurs actifs */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Users2 size={16} className="text-green-500" /> Collaborateurs actifs
                </h3>
                <span className="flex items-center gap-1.5 text-xs text-green-600 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  {safeUsers.length} membres
                </span>
              </div>
              <div className="flex items-center">
                <div className="flex -space-x-2">
                  {safeUsers.slice(0, 7).map((u, i) => (
                    <ClickableAvatar
                      key={u.id}
                      src={getAvatar(u)}
                      userName={u.name}
                      className="w-8 h-8 rounded-full ring-2 ring-white"
                      style={{ zIndex: 10 + i }}
                      referrerPolicy="no-referrer"
                    />
                  ))}
                </div>
                {safeUsers.length > 7 && (
                  <span className="ml-2 text-xs text-gray-400 font-semibold">+{safeUsers.length - 7}</span>
                )}
              </div>
            </div>

            {/* Anniversaires */}
            {celebrations.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Gift size={16} className="text-rose-500" /> Anniversaires
                  </h3>
                </div>
                <div className="space-y-2.5">
                  {celebrations.slice(0, 4).map((c, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${c.type === 'birthday' ? 'bg-rose-50' : 'bg-amber-50'}`}>
                        {c.type === 'birthday'
                          ? <Cake size={14} className="text-rose-500" />
                          : <Briefcase size={14} className="text-amber-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-700 truncate">{c.name}</p>
                        <p className="text-xs text-gray-400">
                          {c.type === 'birthday' ? 'Anniversaire' : `${c.years} an${(c.years ?? 0) > 1 ? 's' : ''} dans l'entreprise`}
                        </p>
                      </div>
                      <span className="text-xs text-rose-500 font-semibold shrink-0">Aujourd'hui</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Défis en cours */}
            {activeChallenge && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Zap size={16} className="text-amber-500" /> Défis en cours
                  </h3>
                  <button onClick={() => router.visit('/challenges')} className="text-xs font-semibold text-primary hover:underline cursor-pointer">
                    Voir tout
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                          <Zap size={12} className="text-green-600" />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 truncate">{activeChallenge.name}</span>
                      </div>
                      <span className="text-xs font-bold text-green-600 ml-2 shrink-0">{challengeProgress}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${challengeProgress}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {activeChallenge.days_left} jour{activeChallenge.days_left !== 1 ? 's' : ''} restant{activeChallenge.days_left !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {!activeChallenge.is_participating && (
                  <button
                    onClick={() => router.visit('/challenges')}
                    className="mt-3 w-full py-2 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Participer
                  </button>
                )}
              </div>
            )}

            {/* Administration rapide */}
            {isAdmin && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Settings size={16} className="text-gray-500" /> Administration rapide
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { icon: <Users2 size={18} />, label: 'Utilisateurs', href: '/admin/users', cls: 'text-blue-600 bg-blue-50' },
                    { icon: <Star size={18} />, label: 'Bravos', href: '/history', cls: 'text-amber-600 bg-amber-50' },
                    { icon: <Settings size={18} />, label: 'Paramètres', href: '/admin/config', cls: 'text-gray-600 bg-gray-50' },
                    { icon: <BarChart2 size={18} />, label: 'Rapports', href: '/stats', cls: 'text-purple-600 bg-purple-50' },
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => router.visit(item.href)}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.cls}`}>
                        {item.icon}
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium text-center leading-tight">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* My Recognition */}
            <RecognitionCard counts={recognitionCounts} />

            {/* Leaderboard (condensed) */}
            {sortedUsers.length >= 3 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                  <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <TrendingUp size={16} className="text-secondary" /> Classement
                  </h3>
                  <button onClick={() => router.visit('/stats')} className="text-xs font-semibold text-primary hover:underline cursor-pointer">
                    {t('common.viewAll')}
                  </button>
                </div>
                <div className="p-4 bg-gradient-to-br from-primary to-primary/80">
                  <div className="flex items-end justify-around pb-1">
                    {[sortedUsers[1], sortedUsers[0], sortedUsers[2]].map((user, pos) => {
                      const rank = pos === 1 ? 1 : pos === 0 ? 2 : 3;
                      const isFirst = rank === 1;
                      return (
                        <div key={user.id} className="flex flex-col items-center gap-1.5">
                          <div className={`relative ${isFirst ? 'scale-110' : ''}`}>
                            <ClickableAvatar
                              src={getAvatar(user)}
                              userName={user.name}
                              className={`rounded-full border-2 ${isFirst ? 'w-14 h-14 border-[#c6d00a]' : 'w-11 h-11 border-white/30'}`}
                              referrerPolicy="no-referrer"
                            />
                            <div className={`absolute -top-1 -right-1 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white ${isFirst ? 'w-5 h-5 bg-[#c6d00a] text-gray-800' : 'w-4 h-4 bg-white/80 text-gray-600'}`}>
                              {rank}
                            </div>
                          </div>
                          <span className="text-[9px] font-bold text-white/80 truncate w-14 text-center">{user.name.split(' ')[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {sortedUsers.slice(0, 5).map((user, index) => (
                    <div key={user.id} className="flex items-center justify-between px-4 py-3 hover:bg-primary/5 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black w-3 ${index < 3 ? 'text-primary' : 'text-gray-400'}`}>{index + 1}</span>
                        <ClickableAvatar src={getAvatar(user)} userName={user.name} className="w-8 h-8 rounded-lg" referrerPolicy="no-referrer" />
                        <div>
                          <p className="text-xs font-bold group-hover:text-primary transition-colors">{user.name}</p>
                          <p className="text-[9px] text-gray-400 uppercase tracking-wide">{user.department}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-gray-700">{user.points_total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-gray-50/50">
                  <Button variant="ghost" className="w-full text-xs font-bold py-2" onClick={() => router.visit('/stats')}>
                    {t('dashboard.viewLeaderboard')}
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Modal Créer un Bravo ────────────────────────────────────────── */}
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

      {/* Back to top */}
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

// ── My Recognition Card ───────────────────────────────────────────────────────
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
