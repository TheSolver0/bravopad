import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
  Heart,
  MessageSquare,
  Send,
  X,
  MoreHorizontal,
  Megaphone,
  Image as ImageIcon,
  Pin,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Anchor,
  Ship,
  Star,
  Trophy,
  Award,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Post, PostComment, User, Challenge, BravoValue } from './types';
import CreateBravo from './CreateBravo';

interface FeedProps {
  posts: Post[];
  currentUser: User;
  users: User[];
  activeChallenge: Challenge | null;
  bravoCount: number;
  bravoValues: BravoValue[];
}

function getAvatar(user: { name: string; avatar?: string | null }): string {
  if (user.avatar && user.avatar.trim() !== '') return user.avatar;
  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=6366f1&color=ffffff&size=128&bold=true&format=svg`;
}

function getCsrf(): string {
  return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}

// ── Compose Box ────────────────────────────────────────────────────────────────
function ComposeBox({ currentUser, canAnnounce }: { currentUser: User; canAnnounce: boolean }) {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [type, setType] = useState<'post' | 'announcement'>('post');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
  };

  const submit = () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    router.post('/posts', { content: content.trim(), type }, {
      onSuccess: () => { setContent(''); setSubmitting(false); if (textareaRef.current) textareaRef.current.style.height = 'auto'; },
      onError: () => setSubmitting(false),
    });
  };

  return (
    <Card className="p-4 border-none shadow-sm bg-white">
      <div className="flex items-start gap-3">
        <img src={getAvatar(currentUser)} alt="" className="w-10 h-10 rounded-full shrink-0" referrerPolicy="no-referrer" />
        <div className="flex-1 space-y-3">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => { setContent(e.target.value); autoResize(); }}
            placeholder={t('feed.compose')}
            rows={2}
            className="w-full resize-none bg-gray-50 rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary/30 border border-gray-100 transition-all"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {canAnnounce && (
                <button
                  onClick={() => setType(t => t === 'post' ? 'announcement' : 'post')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                    type === 'announcement'
                      ? 'bg-amber-50 text-amber-600 border-amber-200'
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-amber-200 hover:text-amber-500'
                  }`}
                >
                  <Megaphone size={13} />
                  {t('feed.announcement')}
                </button>
              )}
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 hover:border-primary/30 hover:text-primary transition-all cursor-pointer">
                <ImageIcon size={13} />
                {t('feed.media')}
              </button>
            </div>
            <Button
              variant="primary"
              className="px-4 py-1.5 text-xs shadow-md shadow-primary/20"
              onClick={submit}
              disabled={!content.trim() || submitting}
            >
              {submitting
                ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin block" />
                : <><Send size={13} /> {t('feed.publish')}</>
              }
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Post Card ─────────────────────────────────────────────────────────────────
function PostCard({ post, currentUser }: { post: Post; currentUser: User }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';

  const [liked, setLiked] = useState(post.user_has_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [liking, setLiking] = useState(false);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>(post.comments ?? []);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [saving, setSaving] = useState(false);

  const isOwner = currentUser.id === post.user_id;
  const canModerate = ['admin', 'manager'].includes(currentUser.permission);

  const toggleLike = async () => {
    if (liking) return;
    setLiking(true);
    try {
      const res = await fetch(`/posts/${post.id}/like`, {
        method: 'POST',
        headers: { 'X-CSRF-TOKEN': getCsrf(), 'Accept': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        setLiked(json.user_has_liked);
        setLikesCount(json.likes_count);
      }
    } finally {
      setLiking(false);
    }
  };

  const submitComment = async () => {
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': getCsrf() },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (res.ok) {
        const comment: PostComment = await res.json();
        setComments(prev => [comment, ...prev]);
        setCommentText('');
        setShowComments(true);
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const deleteComment = async (commentId: number) => {
    await fetch(`/posts/${post.id}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'X-CSRF-TOKEN': getCsrf() },
    });
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  const saveEdit = () => {
    if (!editContent.trim()) return;
    setSaving(true);
    router.put(`/posts/${post.id}`, { content: editContent.trim() }, {
      onSuccess: () => { setEditing(false); setSaving(false); },
      onError: () => setSaving(false),
    });
  };

  const deletePost = () => {
    if (confirm(t('feed.confirmDelete'))) {
      router.delete(`/posts/${post.id}`);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card className="border-none shadow-sm bg-white overflow-hidden">

        {/* Bandeau annonce */}
        {post.type === 'announcement' && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-100">
            <Megaphone size={13} className="text-amber-500 shrink-0" />
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">{t('feed.announcementLabel')}</span>
            {post.is_pinned && <Pin size={11} className="text-amber-400 ml-auto" />}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <img src={getAvatar(post.user)} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
            <div>
              <p className="text-sm font-bold text-gray-800">{post.user.name}</p>
              <p className="text-[11px] text-gray-400">
                {post.user.role}
                {post.user.department ? ` · ${post.user.department}` : ''}
                {' · '}
                {new Date(post.created_at).toLocaleDateString(locale)}
              </p>
            </div>
          </div>
          {(isOwner || canModerate) && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <MoreHorizontal size={16} />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 z-10 overflow-hidden"
                  >
                    {isOwner && (
                      <button
                        onClick={() => { setEditing(true); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <Pencil size={13} /> {t('feed.edit')}
                      </button>
                    )}
                    <button
                      onClick={() => { deletePost(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} /> {t('feed.delete')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Contenu */}
        <div className="px-4 pb-3">
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={3}
                className="w-full resize-none bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-primary/30 border border-gray-200"
              />
              <div className="flex items-center gap-2 justify-end">
                <Button variant="ghost" className="text-xs py-1.5 px-3" onClick={() => setEditing(false)}>{t('common.cancel')}</Button>
                <Button variant="primary" className="text-xs py-1.5 px-3" onClick={saveEdit} disabled={saving}>
                  {saving ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin block" /> : t('common.save')}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{post.content}</p>
          )}

          {post.media_url && !editing && (
            <div className="mt-3 rounded-xl overflow-hidden border border-gray-100">
              <img src={post.media_url} alt="" className="w-full max-h-80 object-cover" />
            </div>
          )}
        </div>

        {/* Actions bar */}
        <div className="border-t border-gray-50 px-4 py-2 flex items-center gap-4">
          <button
            onClick={toggleLike}
            disabled={liking}
            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${liked ? 'text-rose-500' : 'text-gray-400 hover:text-rose-400'}`}
          >
            <Heart size={15} className={liked ? 'fill-rose-500' : ''} />
            <span>{likesCount}</span>
          </button>
          <button
            onClick={() => setShowComments(o => !o)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-primary transition-colors cursor-pointer"
          >
            <MessageSquare size={15} />
            <span>{comments.length}</span>
            {showComments ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        {/* Commentaires */}
        <AnimatePresence initial={false}>
          {showComments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden bg-gray-50/50"
            >
              {comments.length > 0 && (
                <div className="px-4 pt-2 pb-1 space-y-2">
                  {comments.map(c => (
                    <div key={c.id} className="flex items-start gap-2 group">
                      <img
                        src={c.user ? getAvatar(c.user) : `https://ui-avatars.com/api/?name=?&background=e5e7eb&color=6b7280&size=32`}
                        alt=""
                        className="w-7 h-7 rounded-full shrink-0 mt-0.5"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 bg-white rounded-xl px-3 py-2 text-xs shadow-sm border border-gray-100">
                        <span className="font-semibold text-gray-700">{c.user?.name ?? 'Unknown'}</span>
                        <span className="text-gray-500 ml-2">{c.content}</span>
                        <span className="block text-[10px] text-gray-400 mt-0.5">{c.created_at}</span>
                      </div>
                      {(c.user?.id === currentUser.id || canModerate) && (
                        <button
                          onClick={() => deleteComment(c.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all cursor-pointer mt-1 shrink-0"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Input commentaire */}
              <div className="px-4 py-3 flex items-center gap-2">
                <img src={getAvatar(currentUser)} alt="" className="w-7 h-7 rounded-full shrink-0" referrerPolicy="no-referrer" />
                <div className="flex-1 flex items-center bg-white rounded-full px-3 py-1.5 border border-gray-200 gap-2 focus-within:border-primary/40 transition-colors">
                  <input
                    placeholder={t('dashboard.commentPlaceholder')}
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                    className="flex-1 bg-transparent text-xs outline-none text-gray-600 placeholder-gray-400"
                  />
                  <button
                    onClick={submitComment}
                    disabled={!commentText.trim() || submittingComment}
                    className="text-primary disabled:text-gray-300 transition-colors shrink-0 cursor-pointer disabled:cursor-default"
                  >
                    {submittingComment
                      ? <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin block" />
                      : <Send size={13} />
                    }
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </Card>
    </motion.div>
  );
}

// ── Page Feed ─────────────────────────────────────────────────────────────────
export default function Feed({ posts, currentUser, users, activeChallenge, bravoCount, bravoValues }: FeedProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';
  const canAnnounce = ['admin', 'manager'].includes(currentUser.permission);
  const sortedUsers = [...users].sort((a, b) => b.points_total - a.points_total);

  // ── Carousel ────────────────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);

  interface Slide {
    id: string;
    bg: string;
    tag?: React.ReactNode;
    title: string;
    subtitle: string;
    cta?: { label: string; action: () => void };
    badge?: React.ReactNode;
    visual: React.ReactNode;
  }

  const slides: Slide[] = [
    {
      id: 'pad',
      bg: 'from-[#003d7a] via-[#00529e] to-[#0066c2]',
      tag: (
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/70">
          <Anchor size={11} /> PAD
        </span>
      ),
      title: t('dashboard.welcome'),
      subtitle: t('dashboard.welcomeSub'),
      cta: { label: t('dashboard.sendBravo'), action: () => setShowCreateModal(true) },
      badge: (
        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
          <Ship size={18} className="text-white/80" />
          <span className="font-bold text-sm text-white">{t('dashboard.bravosShared', { count: bravoCount })}</span>
        </div>
      ),
      visual: (
        <div className="absolute right-0 inset-y-0 w-1/2 hidden lg:flex items-center justify-center pointer-events-none">
          <div className="relative w-full h-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#003d7a]" />
            <div className="absolute bottom-6 right-8 w-32 h-32 border-2 border-white/10 rounded-full" />
            <div className="absolute bottom-16 right-20 w-16 h-16 border border-white/10 rounded-full" />
            <Anchor size={64} className="absolute right-12 top-1/2 -translate-y-1/2 text-white/8" strokeWidth={1} />
          </div>
        </div>
      ),
    },
    ...(sortedUsers.length > 0 ? [{
      id: 'spotlight',
      bg: 'from-[#1a1a2e] via-[#16213e] to-[#0f3460]',
      tag: (
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-secondary/90">
          <Star size={11} className="fill-current" /> {t('dashboard.employeeOfMonth')}
        </span>
      ),
      title: sortedUsers[0].name,
      subtitle: `${sortedUsers[0].role} · ${sortedUsers[0].department} — ${sortedUsers[0].points_total.toLocaleString(locale)} ${t('dashboard.ptsAccumulated')}`,
      cta: { label: t('dashboard.viewLeaderboardBtn'), action: () => router.visit('/stats') },
      badge: (
        <div className="flex items-center gap-2 px-4 py-2 bg-secondary/20 backdrop-blur-md rounded-xl border border-secondary/30">
          <Trophy size={18} className="text-secondary" />
          <span className="font-bold text-sm text-white">{t('dashboard.rankOf')}</span>
        </div>
      ),
      visual: (
        <div className="absolute right-0 inset-y-0 w-1/2 hidden lg:flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#1a1a2e]" />
          <div className="relative z-10 flex flex-col items-center gap-3 mr-12">
            <div className="relative">
              <img src={getAvatar(sortedUsers[0])} alt="" className="w-28 h-28 rounded-3xl border-4 border-secondary/40 shadow-2xl opacity-80" referrerPolicy="no-referrer" />
              <div className="absolute -top-3 -right-3 w-10 h-10 bg-secondary rounded-full flex items-center justify-center shadow-lg">
                <Trophy size={18} className="text-white" />
              </div>
            </div>
          </div>
        </div>
      ),
    } as Slide] : []),
    ...(activeChallenge ? [{
      id: 'challenge',
      bg: 'from-primary via-primary/90 to-primary/70',
      tag: (
        <div className="flex items-center gap-3">
          <Badge variant="warning" className="bg-secondary text-white border-none px-3 py-1 text-[10px]">{t('dashboard.newChallenge')}</Badge>
          <span className="flex items-center gap-1.5 text-white/70 text-xs font-bold">
            <Clock size={12} /> {t('dashboard.daysLeft', { count: activeChallenge.days_left })}
          </span>
        </div>
      ),
      title: activeChallenge.name,
      subtitle: activeChallenge.description,
      cta: { label: t('dashboard.joinNow'), action: () => router.visit('/challenges') },
      badge: (
        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
          <Award size={18} className="text-secondary" />
          <span className="font-extrabold text-base text-white">+{activeChallenge.points_bonus} pts</span>
        </div>
      ),
      visual: (
        <div className="absolute right-0 inset-y-0 w-1/2 hidden lg:block pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-primary" />
        </div>
      ),
    } as Slide] : []),
  ];

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrent(c => (c + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const prevSlide = () => setCurrent(c => (c - 1 + slides.length) % slides.length);
  const nextSlide = () => setCurrent(c => (c + 1) % slides.length);
  const slide = slides[current];

  // ── Infinite scroll ──────────────────────────────────────────────────────────
  const [displayed, setDisplayed] = useState(posts.slice(0, 10));
  const [hasMore, setHasMore] = useState(posts.length > 10);
  const observer = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(() => {
    setDisplayed(prev => {
      const more = posts.slice(prev.length, prev.length + 10);
      if (more.length === 0) setHasMore(false);
      return [...prev, ...more];
    });
  }, [posts]);

  const lastRef = useCallback((node: HTMLDivElement | null) => {
    if (observer.current) observer.current.disconnect();
    if (!node || !hasMore) return;
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    });
    observer.current.observe(node);
  }, [hasMore, loadMore]);

  return (
    <div className="animate-in fade-in duration-300">

      {/* ── Carrousel ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden shadow-xl h-[100px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className={`bg-gradient-to-r ${slide.bg} px-5 text-white flex items-center gap-4 relative h-full`}
          >
            {slide.visual}
            <div className="relative z-10 flex-1 min-w-0 space-y-0.5">
              {slide.tag}
              <h1 className="text-sm md:text-base font-extrabold tracking-tight leading-tight truncate">{slide.title}</h1>
              <p className="text-white/70 text-[11px] font-medium leading-snug hidden md:block line-clamp-1">{slide.subtitle}</p>
            </div>
            {slide.badge && <div className="relative z-10 shrink-0 hidden sm:block">{slide.badge}</div>}
            {slide.cta && (
              <Button variant="secondary" className="relative z-10 px-3 py-1.5 text-xs shadow-md shadow-secondary/40 shrink-0 hidden lg:flex" onClick={slide.cta.action}>
                {slide.cta.label}
              </Button>
            )}
            <div className="relative z-20 flex items-center gap-2 shrink-0">
              <button onClick={prevSlide} className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all cursor-pointer">
                <ChevronLeft size={12} className="text-white" />
              </button>
              <div className="flex items-center gap-1">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)}
                    className={`rounded-full transition-all cursor-pointer ${i === current ? 'w-4 h-1 bg-white' : 'w-1 h-1 bg-white/40 hover:bg-white/60'}`}
                  />
                ))}
              </div>
              <button onClick={nextSlide} className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all cursor-pointer">
                <ChevronRight size={12} className="text-white" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Compose */}
        <ComposeBox currentUser={currentUser} canAnnounce={canAnnounce} />

        {/* Fil */}
        {displayed.length === 0 ? (
          <Card className="p-10 text-center border-none bg-white/80">
            <MessageSquare className="mx-auto mb-3 text-primary/30" size={40} />
            <p className="font-bold text-gray-500">{t('feed.empty')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('feed.beFirst')}</p>
          </Card>
        ) : (
          displayed.map((post, index) => (
            <div
              key={post.id}
              ref={index === displayed.length - 1 ? lastRef : undefined}
            >
              <PostCard post={post} currentUser={currentUser} />
            </div>
          ))
        )}

        {hasMore && (
          <div className="flex justify-center py-4">
            <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin block" />
          </div>
        )}

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

    </div>
  );
}
