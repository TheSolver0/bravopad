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
  Plus,
  Play,
  Bookmark,
  Share2,
  TrendingUp,
  Zap,
  Globe,
  Volume2,
  VolumeX,
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
  announcements?: Post[];
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

// ── Stories Bar ──────────────────────────────────────────────────────────────
interface Story {
  id: number;
  user: { name: string; avatar?: string | null };
  seen: boolean;
  isOwn?: boolean;
  previewColor?: string;
}

// Mock stories - replace with real data from props
function StoriesBar({ currentUser, users }: { currentUser: User; users: User[] }) {
  const { t } = useTranslation();
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build mock stories from real users
  const stories: Story[] = [
    { id: 0, user: currentUser, seen: false, isOwn: true, previewColor: '#003d7a' },
    ...users.slice(0, 8).map((u, i) => ({
      id: i + 1,
      user: u,
      seen: i > 2,
      previewColor: ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'][i],
    })),
  ];

  const openStory = (story: Story) => {
    if (story.isOwn) return; // handle add story
    setActiveStory(story);
    setStoryProgress(0);
    progressRef.current = setInterval(() => {
      setStoryProgress(p => {
        if (p >= 100) {
          closeStory();
          return 100;
        }
        return p + 2;
      });
    }, 60);
  };

  const closeStory = () => {
    setActiveStory(null);
    setStoryProgress(0);
    if (progressRef.current) clearInterval(progressRef.current);
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-1">
          {/* Add story (own) */}
          <div
            className="flex flex-col items-center gap-1.5 cursor-pointer group shrink-0"
            onClick={() => {/* open story creator */}}
          >
            <div className="relative">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-dashed border-primary/30 group-hover:border-primary transition-colors">
                <img src={getAvatar(currentUser)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary border-2 border-white flex items-center justify-center">
                <Plus size={10} className="text-white" />
              </div>
            </div>
            <span className="text-[10px] text-gray-500 font-medium w-14 text-center truncate">
              {t('feed.myStory', 'Ma story')}
            </span>
          </div>

          {/* Other stories */}
          {stories.filter(s => !s.isOwn).map((story) => (
            <div
              key={story.id}
              className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0"
              onClick={() => openStory(story)}
            >
              <div
                className={`w-14 h-14 rounded-full p-[2px] ${
                  story.seen
                    ? 'bg-gray-200'
                    : 'bg-gradient-to-tr from-primary via-secondary to-amber-400'
                }`}
              >
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-white">
                  <img src={getAvatar(story.user)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              </div>
              <span className={`text-[10px] font-medium w-14 text-center truncate ${story.seen ? 'text-gray-400' : 'text-gray-700'}`}>
                {story.user.name.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Story viewer modal */}
      <AnimatePresence>
        {activeStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={closeStory}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-80 h-[560px] rounded-3xl overflow-hidden"
              onClick={e => e.stopPropagation()}
              style={{ background: activeStory.previewColor ?? '#1a1a2e' }}
            >
              {/* Progress bar */}
              <div className="absolute top-3 left-3 right-3 h-0.5 bg-white/20 rounded-full z-10">
                <div
                  className="h-full bg-white rounded-full transition-none"
                  style={{ width: `${storyProgress}%` }}
                />
              </div>
              {/* Header */}
              <div className="absolute top-6 left-3 right-3 flex items-center gap-2 z-10">
                <img src={getAvatar(activeStory.user)} alt="" className="w-8 h-8 rounded-full border border-white/30" />
                <span className="text-sm font-bold text-white">{activeStory.user.name}</span>
                <span className="text-[11px] text-white/60 ml-auto">il y a 2h</span>
                <button onClick={closeStory} className="text-white/70 hover:text-white ml-2">
                  <X size={18} />
                </button>
              </div>
              {/* Content placeholder */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                    <Play size={36} className="text-white/50 ml-1" />
                  </div>
                  <p className="text-white/50 text-sm">{t('feed.storyContent', 'Contenu de la story')}</p>
                </div>
              </div>
              {/* Bottom reply */}
              <div className="absolute bottom-4 left-3 right-3">
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 border border-white/20">
                  <input
                    className="flex-1 bg-transparent text-white text-sm placeholder-white/40 outline-none"
                    placeholder={t('feed.replyStory', 'Répondre...')}
                  />
                  <Send size={16} className="text-white/60 shrink-0" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Announcement Banner ───────────────────────────────────────────────────────
function AnnouncementBanner({ announcements }: { announcements: Post[] }) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [dismissed, setDismissed] = useState<number[]>([]);

  const visible = announcements.filter(a => !dismissed.includes(a.id));
  if (visible.length === 0) return null;
  const ann = visible[current % visible.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3"
    >
      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
        <Megaphone size={16} className="text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
            {t('feed.announcementLabel')}
          </span>
          {ann.is_pinned && <Pin size={10} className="text-amber-500" />}
          {visible.length > 1 && (
            <span className="text-[10px] text-amber-400 ml-auto">
              {(current % visible.length) + 1}/{visible.length}
            </span>
          )}
        </div>
        <p className="text-sm text-amber-900 font-medium line-clamp-2">{ann.content}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[10px] text-amber-500">{ann.user.name} · {new Date(ann.created_at).toLocaleDateString()}</span>
          {visible.length > 1 && (
            <button
              onClick={() => setCurrent(c => (c + 1) % visible.length)}
              className="text-[11px] text-amber-600 font-semibold hover:underline ml-auto"
            >
              {t('feed.nextAnnouncement', 'Suivant →')}
            </button>
          )}
        </div>
      </div>
      <button
        onClick={() => setDismissed(d => [...d, ann.id])}
        className="text-amber-400 hover:text-amber-600 shrink-0 mt-0.5"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

// ── Quick Stats Bar ───────────────────────────────────────────────────────────
function QuickStats({ bravoCount, users }: { bravoCount: number; users: User[] }) {
  const { t } = useTranslation();
  const topUser = [...users].sort((a, b) => b.points_total - a.points_total)[0];

  const stats = [
    { icon: Zap, label: t('feed.statBravos', 'Bravos ce mois'), value: bravoCount, color: 'text-primary bg-primary/10' },
    // { icon: Users, label: t('feed.statActive', 'Membres actifs'), value: users.length, color: 'text-emerald-600 bg-emerald-50' },
    { icon: TrendingUp, label: t('feed.statEngagement', 'Taux d\'engagement'), value: '87%', color: 'text-violet-600 bg-violet-50' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex flex-col items-center text-center">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${stat.color}`}>
            <stat.icon size={15} />
          </div>
          <span className="text-xl font-extrabold text-gray-800 leading-none">{stat.value}</span>
          <span className="text-[10px] text-gray-400 mt-1 leading-tight">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Compose Box ───────────────────────────────────────────────────────────────
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
      onSuccess: () => {
        setContent('');
        setSubmitting(false);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
      },
      onError: () => setSubmitting(false),
    });
  };

  return (
    <Card className="p-4 border border-gray-100 shadow-sm bg-white rounded-2xl">
      <div className="flex items-start gap-3">
        <img src={getAvatar(currentUser)} alt="" className="w-9 h-9 rounded-full shrink-0 ring-2 ring-primary/10" referrerPolicy="no-referrer" />
        <div className="flex-1 space-y-2">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => { setContent(e.target.value); autoResize(); }}
            placeholder={t('feed.compose')}
            rows={2}
            className="w-full resize-none bg-gray-50 rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary/20 border border-gray-100 transition-all"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {canAnnounce && (
                <button
                  onClick={() => setType(t => t === 'post' ? 'announcement' : 'post')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                    type === 'announcement'
                      ? 'bg-amber-50 text-amber-600 border-amber-200'
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-amber-200 hover:text-amber-500'
                  }`}
                >
                  <Megaphone size={12} />
                  {t('feed.announcement')}
                </button>
              )}
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 hover:border-primary/30 hover:text-primary transition-all cursor-pointer">
                <ImageIcon size={12} />
                {t('feed.media')}
              </button>
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 hover:border-primary/30 hover:text-primary transition-all cursor-pointer">
                <Globe size={12} />
                {t('feed.public', 'Public')}
              </button>
            </div>
            <Button
              variant="primary"
              className="px-4 py-1.5 text-xs shadow-md shadow-primary/20 rounded-xl"
              onClick={submit}
              disabled={!content.trim() || submitting}
            >
              {submitting
                ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin block" />
                : <><Send size={12} /> {t('feed.publish')}</>
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
  const [saved, setSaved] = useState(false);

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
    if (confirm(t('feed.confirmDelete'))) router.delete(`/posts/${post.id}`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card className="border border-gray-100 shadow-sm bg-white overflow-hidden rounded-2xl">

        {/* Announcement banner */}
        {post.type === 'announcement' && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-100">
            <Megaphone size={12} className="text-amber-500 shrink-0" />
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">{t('feed.announcementLabel')}</span>
            {post.is_pinned && <Pin size={10} className="text-amber-400 ml-auto" />}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={getAvatar(post.user)} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
              {/* Online indicator — real data needed */}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
            </div>
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
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSaved(s => !s)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${saved ? 'text-primary bg-primary/10' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'}`}
            >
              <Bookmark size={14} className={saved ? 'fill-primary' : ''} />
            </button>
            {(isOwner || canModerate) && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <MoreHorizontal size={15} />
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
                          <Pencil size={12} /> {t('feed.edit')}
                        </button>
                      )}
                      <button
                        onClick={() => { deletePost(); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 size={12} /> {t('feed.delete')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-3">
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={3}
                className="w-full resize-none bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-primary/20 border border-gray-200"
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

        {/* Actions */}
        <div className="border-t border-gray-50 px-4 py-2.5 flex items-center gap-4">
          <button
            onClick={toggleLike}
            disabled={liking}
            className={`flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer group ${
              liked ? 'text-rose-500' : 'text-gray-400 hover:text-rose-400'
            }`}
          >
            <Heart size={15} className={`transition-transform group-active:scale-125 ${liked ? 'fill-rose-500' : ''}`} />
            <span>{likesCount}</span>
          </button>
          <button
            onClick={() => setShowComments(o => !o)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-primary transition-colors cursor-pointer"
          >
            <MessageSquare size={15} />
            <span>{comments.length}</span>
            {showComments ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-primary transition-colors cursor-pointer ml-auto">
            <Share2 size={14} />
          </button>
        </div>

        {/* Comments */}
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
                <div className="px-4 pt-3 pb-1 space-y-2">
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
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
                      : <Send size={12} />
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

// ── Right Sidebar Widgets ─────────────────────────────────────────────────────
function Leaderboard({ users }: { users: User[] }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';
  const top5 = [...users].sort((a, b) => b.points_total - a.points_total).slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
            <Trophy size={13} className="text-amber-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-800">{t('feed.leaderboard', 'Top contributeurs')}</h3>
        </div>
        <button
          onClick={() => router.visit('/stats')}
          className="text-[11px] text-primary font-semibold hover:underline cursor-pointer"
        >
          {t('feed.seeAll', 'Voir tout')}
        </button>
      </div>
      <div className="space-y-2">
        {top5.map((u, i) => (
          <div key={u.id} className="flex items-center gap-2.5">
            <span className={`w-5 text-center text-xs font-black ${
              i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-gray-300'
            }`}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
            </span>
            <img src={getAvatar(u)} alt="" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-700 truncate">{u.name}</p>
              <p className="text-[10px] text-gray-400 truncate">{u.department}</p>
            </div>
            <span className="text-xs font-bold text-primary">{u.points_total.toLocaleString(locale)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuggestedPeople({ users, currentUser }: { users: User[]; currentUser: User }) {
  const { t } = useTranslation();
  const suggestions = users.filter(u => u.id !== currentUser.id).slice(0, 4);
  const [followed, setFollowed] = useState<number[]>([]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <h3 className="text-sm font-bold text-gray-800 mb-3">{t('feed.suggested', 'Collègues à suivre')}</h3>
      <div className="space-y-3">
        {suggestions.map(u => (
          <div key={u.id} className="flex items-center gap-2.5">
            <img src={getAvatar(u)} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-700 truncate">{u.name}</p>
              <p className="text-[10px] text-gray-400 truncate">{u.role}</p>
            </div>
            <button
              onClick={() => setFollowed(f => f.includes(u.id) ? f.filter(id => id !== u.id) : [...f, u.id])}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                followed.includes(u.id)
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
              }`}
            >
              {followed.includes(u.id) ? t('feed.following', 'Suivi') : t('feed.follow', 'Suivre')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Feed Page ────────────────────────────────────────────────────────────
export default function Feed({ posts, currentUser, users, activeChallenge, bravoCount, bravoValues, announcements = [] }: FeedProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';
  const canAnnounce = ['admin', 'manager'].includes(currentUser.permission);
  const sortedUsers = [...users].sort((a, b) => b.points_total - a.points_total);

  const [showCreateModal, setShowCreateModal] = useState(false);

  // ── Hero Carousel ──────────────────────────────────────────────────────────
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
          <Anchor size={10} /> PAD
        </span>
      ),
      title: t('dashboard.welcome'),
      subtitle: t('dashboard.welcomeSub'),
      cta: { label: t('dashboard.sendBravo'), action: () => setShowCreateModal(true) },
      badge: (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
          <Ship size={15} className="text-white/80" />
          <span className="font-bold text-sm text-white">{t('dashboard.bravosShared', { count: bravoCount })}</span>
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
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-secondary/90">
          <Star size={10} className="fill-current" /> {t('dashboard.employeeOfMonth')}
        </span>
      ),
      title: sortedUsers[0].name,
      subtitle: `${sortedUsers[0].role} · ${sortedUsers[0].points_total.toLocaleString(locale)} pts`,
      cta: { label: t('dashboard.viewLeaderboardBtn'), action: () => router.visit('/stats') },
      badge: (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/20 backdrop-blur-md rounded-xl border border-secondary/30">
          <Trophy size={15} className="text-secondary" />
          <span className="font-bold text-sm text-white">#1</span>
        </div>
      ),
      visual: (
        <div className="absolute right-0 inset-y-0 w-1/3 hidden lg:flex items-center justify-end pr-8 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#1a1a2e]" />
          <div className="relative z-10">
            <img src={getAvatar(sortedUsers[0])} alt="" className="w-20 h-20 rounded-2xl border-2 border-secondary/40 opacity-70" referrerPolicy="no-referrer" />
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
              <Trophy size={14} className="text-white" />
            </div>
          </div>
        </div>
      ),
    } as Slide] : []),
    ...(activeChallenge ? [{
      id: 'challenge',
      bg: 'from-primary via-primary/90 to-primary/70',
      tag: (
        <div className="flex items-center gap-2">
          <Badge variant="warning" className="bg-secondary text-white border-none px-2 py-0.5 text-[10px]">
            {t('dashboard.newChallenge')}
          </Badge>
          <span className="flex items-center gap-1 text-white/70 text-xs font-bold">
            <Clock size={11} /> {t('dashboard.daysLeft', { count: activeChallenge.days_left })}
          </span>
        </div>
      ),
      title: activeChallenge.name,
      subtitle: activeChallenge.description,
      cta: { label: t('dashboard.joinNow'), action: () => router.visit('/challenges') },
      badge: (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
          <Award size={15} className="text-secondary" />
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
    const timer = setInterval(() => setCurrent(c => (c + 1) % slides.length), 5500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const slide = slides[current];

  // Infinite scroll
  const [displayed, setDisplayed] = useState(posts.filter(p => p.type !== 'announcement').slice(0, 10));
  const [hasMore, setHasMore] = useState(posts.filter(p => p.type !== 'announcement').length > 10);
  const regularPosts = posts.filter(p => p.type !== 'announcement');
  const observer = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(() => {
    setDisplayed(prev => {
      const more = regularPosts.slice(prev.length, prev.length + 10);
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

  const ann = announcements.length > 0 ? announcements : posts.filter(p => p.type === 'announcement');

  return (
    <div className="animate-in fade-in duration-300 min-h-screen bg-gray-50/50">

      {/* ── Hero Carousel ────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden h-[90px] bg-gradient-to-r from-[#003d7a] to-[#0066c2]">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
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
              <Button
                variant="secondary"
                className="relative z-10 px-3 py-1.5 text-xs shadow-md shadow-secondary/40 shrink-0 hidden lg:flex"
                onClick={slide.cta.action}
              >
                {slide.cta.label}
              </Button>
            )}
            {/* Carousel controls */}
            <div className="relative z-20 flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setCurrent(c => (c - 1 + slides.length) % slides.length)}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
              >
                <ChevronLeft size={11} className="text-white" />
              </button>
              <div className="flex items-center gap-1">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`rounded-full transition-all cursor-pointer ${
                      i === current ? 'w-4 h-1 bg-white' : 'w-1 h-1 bg-white/40 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => setCurrent(c => (c + 1) % slides.length)}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
              >
                <ChevronRight size={11} className="text-white" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Main layout: feed + right sidebar ────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-5">
        <div className="flex gap-6">

          {/* ── Left / Main column ──────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Quick stats */}
            {/* <QuickStats bravoCount={bravoCount} users={users} /> */}

            {/* Announcements */}
            {ann.length > 0 && <AnnouncementBanner announcements={ann} />}

            {/* Stories */}
            <StoriesBar currentUser={currentUser} users={users} />

            {/* Compose */}
            <ComposeBox currentUser={currentUser} canAnnounce={canAnnounce} />

            {/* Feed label */}
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest">
                {t('feed.recentActivity', 'Activité récente')}
              </h2>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Posts */}
            {displayed.length === 0 ? (
              <Card className="p-10 text-center border-none bg-white/80 rounded-2xl">
                <MessageSquare className="mx-auto mb-3 text-primary/30" size={36} />
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

          {/* ── Right column: widgets (hidden on small screens) ─────────── */}
          <div className="w-72 shrink-0 hidden xl:flex flex-col gap-4">
            {/* <Leaderboard users={users} /> */}
            <SuggestedPeople users={users} currentUser={currentUser} />

            {/* Active Challenge card */}
            {activeChallenge && (
              <div
                className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-4 cursor-pointer hover:shadow-lg hover:shadow-primary/20 transition-all"
                onClick={() => router.visit('/challenges')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Award size={16} className="text-secondary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                    {t('dashboard.newChallenge')}
                  </span>
                </div>
                <h3 className="font-extrabold text-white text-sm mb-1">{activeChallenge.name}</h3>
                <p className="text-white/60 text-[11px] line-clamp-2 mb-3">{activeChallenge.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-[11px] flex items-center gap-1">
                    <Clock size={11} /> {t('dashboard.daysLeft', { count: activeChallenge.days_left })}
                  </span>
                  <span className="font-extrabold text-secondary text-sm">+{activeChallenge.points_bonus} pts</span>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-[10px] text-gray-300 leading-relaxed">
              <p className="font-semibold text-gray-400 mb-1">OnePAD · Port Autonome de Douala</p>
              <p>Plateforme interne de reconnaissance et d'engagement collaboratif.</p>
            </div>
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
              className="relative z-10 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto bg-gray-50 rounded-2xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-gray-400 hover:text-gray-700 shadow-sm border border-gray-100 transition-all cursor-pointer z-10"
              >
                <X size={15} />
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