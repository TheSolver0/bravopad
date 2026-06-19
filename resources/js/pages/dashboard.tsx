import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { router } from '@inertiajs/react';
import {
  Trophy, Heart, MessageSquare, Share2, Send, Plus,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, Anchor, Medal,
  Film, BarChart2, Calendar, Filter,
  Cake, Briefcase, PartyPopper, Clock, Zap,
  UserPlus, Search as SearchIcon, Ship, Award, Bot,
  Megaphone, Pin, MoreHorizontal, Star,
} from 'lucide-react';
import { User, Bravo, BravoComment, Challenge, BravoValue, Celebration, Story } from './types';
import { BADGES } from './constants';
import CreateBravo from './CreateBravo';
import { UserLink } from '@/components/user-link';
import { MentionInput, renderWithMentions } from '@/components/MentionTextarea';

/* ─────────────────────── Post minimal type ── */
interface FeedPost {
  id: number;
  type: 'post' | 'announcement' | string;
  content?: string;
  user?: { id: number; name: string; avatar?: string; role?: string; department?: string };
  is_pinned?: boolean;
  likes_count?: number;
  user_has_liked?: boolean;
  comments?: { id: number; content: string; created_at: string; user: { id: number; name: string; avatar?: string } }[];
  created_at: string;
}

/* ─────────────────────────────── FeedItem ── */
type FeedItem =
  | { kind: 'bravo'; data: Bravo; createdAt: string }
  | { kind: 'post'; data: FeedPost; createdAt: string };

/* ─────────────────────────────────── Props ── */
interface DashboardProps {
  bravos:               Bravo[];
  posts?:               FeedPost[];
  stories?:             Story[];
  users:                User[];
  activeChallenge:      Challenge | null;
  currentUser:          User;
  bravoValues:          BravoValue[];
  celebrations?:        Celebration[];
  weeklyBravosReceived?: number;
  monthlyBravosCount?:  number;
  unreadCount?:         number;
}

/* ──────────────────────────────── Helpers ── */
const AVATAR_PALETTE = [
  '#0B3D7A', '#1E5BAB', '#5E7320', '#B5810A',
  '#C98A4B', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
];
function avatarBg(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}
function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}
function getCsrf() {
  return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Il y a ${d}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/* ── Avatar inline ── */
function Avatar({ name, src, size = 8, className = '' }: { name: string; src?: string | null; size?: number; className?: string }) {
  return (
    <div
      className={`rounded-full flex items-center justify-center overflow-hidden text-white font-bold shrink-0 ${className}`}
      style={{ width: `${size * 4}px`, height: `${size * 4}px`, fontSize: `${Math.max(10, size * 1.6)}px`, backgroundColor: src ? undefined : avatarBg(name) }}
    >
      {src
        ? <img src={src} alt={name} className="w-full h-full object-cover" />
        : getInitials(name)
      }
    </div>
  );
}

/* ══════════════════════════════════
   CARTES DU FIL
══════════════════════════════════ */

/* ── BravoCard ── */
interface BravoCardProps {
  bravo: Bravo;
  currentUser: User;
  users: User[];
  comments: BravoComment[];
  showComments: boolean;
  commentText: string;
  submitting: boolean;
  onToggleComments: () => void;
  onCommentChange: (v: string) => void;
  onSubmitComment: () => void;
  onDeleteComment: (cId: number) => void;
  onOpenCreate: () => void;
}
function BravoCard({
  bravo, currentUser, users, comments, showComments, commentText, submitting,
  onToggleComments, onCommentChange, onSubmitComment, onDeleteComment, onOpenCreate,
}: BravoCardProps) {
  const receivers = bravo.receivers?.length ? bravo.receivers : bravo.receiver ? [bravo.receiver] : [];
  const badgeInfo = BADGES.find(x => x.key === bravo.badge);

  return (
    <div className="bg-white rounded-2xl border border-[#E9EEF5] shadow-[0_1px_2px_rgba(16,42,67,.04)] overflow-hidden">
      {/* Liseré lime → or */}
      <div className="h-[3px]" style={{ background: 'linear-gradient(to right, #C6E25A, #F2B205)' }} />

      {/* Badge BRAVO + temps */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[8px] text-[11px] font-bold uppercase tracking-widest border"
              style={{ background: '#F7FAEE', borderColor: '#E3EFBE', color: '#5E7320' }}>
          <Trophy size={10} style={{ color: '#9DBA2E' }} strokeWidth={2.5} /> BRAVO
        </span>
        {badgeInfo && <span className="text-[10px] text-[#8A99AD]">{badgeInfo.label}</span>}
        <span className="ml-auto text-[10px] text-[#8A99AD]">{timeAgo(bravo.created_at)}</span>
      </div>

      {/* Sender → Medal → Receiver */}
      <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
        {bravo.sender && (
          <div className="flex items-center gap-1.5">
            <Avatar name={bravo.sender.name} src={bravo.sender.avatar} size={7} />
            <UserLink userId={bravo.sender.id} className="font-bold text-[#0A2A4F] text-sm hover:text-[#0B3D7A]">
              {bravo.sender.name.split(' ')[0]}
            </UserLink>
          </div>
        )}
        <span className="text-[#64748B] text-sm">a envoyé un Bravo à</span>
        <Medal size={15} className="text-[#F2B205]" strokeWidth={2} />
        {receivers.slice(0, 2).map((r, i) => (
          <span key={r.id} className="flex items-center gap-1">
            {i > 0 && <span className="text-[#64748B]">&amp;</span>}
            <div className="flex items-center gap-1.5">
              <Avatar name={r.name} src={(r as any).avatar} size={7} />
              <UserLink userId={r.id} className="font-bold text-[#0A2A4F] text-sm hover:text-[#0B3D7A]">
                {r.name.split(' ')[0]}
              </UserLink>
            </div>
          </span>
        ))}
        {receivers.length > 2 && <span className="text-[#8A99AD] text-xs">& {receivers.length - 2} autres</span>}
      </div>

      {/* Citation */}
      {bravo.message && (
        <div className="mx-4 mb-3 px-4 py-3 rounded-xl border-l-[3px] border-[#C6E25A]" style={{ background: '#F7FAEE' }}>
          <p className="text-sm text-[#46586E] italic leading-relaxed">"{renderWithMentions(bravo.message)}"</p>
        </div>
      )}

      {/* Tags valeur + points */}
      {(bravo.values?.length || bravo.points > 0) && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5 items-center">
          {bravo.values?.map(v => (
            <span key={v.id} className="px-2.5 py-0.5 rounded-[8px] text-[11px] font-medium border"
                  style={{ background: '#F7FAEE', borderColor: '#E3EFBE', color: '#5E7320' }}>{v.name}</span>
          ))}
          {bravo.points > 0 && (
            <span className="ml-auto px-2.5 py-0.5 rounded-[8px] text-[11px] font-black border"
                  style={{ background: '#FFF6E0', borderColor: '#F6E2A8', color: '#B5810A' }}>
              +{bravo.points} pts
            </span>
          )}
        </div>
      )}

      {/* Réactions */}
      <div className="flex items-center px-4 py-2.5 border-t border-[#E9EEF5] gap-1">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#64748B] hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer">
          <Heart size={13} /> {bravo.likes_count || 0}
        </button>
        <button onClick={onToggleComments}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#64748B] hover:text-[#0B3D7A] hover:bg-[#F1F5FA] transition-colors cursor-pointer">
          <MessageSquare size={13} /> {comments.length > 0 ? comments.length : 'Commenter'}
        </button>
        <button onClick={onOpenCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-medium border transition-colors cursor-pointer ml-auto"
          style={{ background: '#F7FAEE', borderColor: '#E3EFBE', color: '#5E7320' }}>
          <Trophy size={11} style={{ color: '#9DBA2E' }} /> Féliciter aussi
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#64748B] hover:text-[#0B3D7A] hover:bg-[#F1F5FA] transition-colors cursor-pointer">
          <Share2 size={13} />
        </button>
      </div>

      {/* Commentaires */}
      <AnimatePresence initial={false}>
        {showComments && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            {comments.length > 0 && (
              <div className="px-4 pb-2 pt-1 space-y-2 bg-[#F9FAFC]">
                {comments.map(c => (
                  <div key={c.id} className="flex items-start gap-2 group">
                    <Avatar name={c.user?.name ?? '?'} src={(c.user as any)?.avatar} size={6} />
                    <div className="flex-1 bg-white rounded-xl px-3 py-2 text-xs shadow-[0_1px_2px_rgba(16,42,67,.04)] border border-[#E9EEF5]">
                      <span className="font-semibold text-[#0A2A4F]">{c.user?.name}</span>
                      <span className="text-[#64748B] ml-2">{c.content}</span>
                      <span className="block text-[10px] text-[#8A99AD] mt-0.5">{c.created_at}</span>
                    </div>
                    {c.user?.id === currentUser.id && (
                      <button onClick={() => onDeleteComment(c.id)} className="opacity-0 group-hover:opacity-100 text-[#8A99AD] hover:text-red-400 cursor-pointer mt-1">
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

      {/* Champ commentaire */}
      <div className="px-4 pb-3 pt-2 flex items-center gap-2 bg-[#F9FAFC] border-t border-[#E9EEF5]">
        <Avatar name={currentUser.name} src={currentUser.avatar} size={7} />
        <div className="flex-1 flex items-center bg-white rounded-full px-3 py-1.5 border border-[#E9EEF5] gap-2 focus-within:border-[#0B3D7A]/40 transition-colors">
          <MentionInput
            users={users}
            value={commentText}
            onChange={onCommentChange}
            onSubmit={onSubmitComment}
            placeholder="Commenter… (@ pour identifier)"
            className="flex-1 bg-transparent text-xs outline-none text-[#46586E] placeholder-[#8A99AD]"
          />
          <button onClick={onSubmitComment} disabled={!commentText.trim() || submitting}
            className="text-[#0B3D7A] disabled:text-[#8A99AD] cursor-pointer disabled:cursor-default">
            {submitting
              ? <span className="w-3 h-3 border-2 border-[#0B3D7A] border-t-transparent rounded-full animate-spin block" />
              : <Send size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── AnnouncementCard ── */
function AnnouncementCard({ post }: { post: FeedPost }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E9EEF5] shadow-[0_1px_2px_rgba(16,42,67,.04)] overflow-hidden">
      {/* Bandeau ANNONCE OFFICIELLE */}
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: '#0B3D7A' }}>
        <Megaphone size={13} className="text-white" />
        <span className="text-[11px] font-black uppercase tracking-widest text-white">Annonce officielle</span>
        <span className="ml-auto text-[10px] text-white/60">{timeAgo(post.created_at)}</span>
      </div>

      {/* En-tête organisation */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#0B3D7A' }}>
          <Anchor size={18} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[#0A2A4F] text-sm">Port Autonome de Douala</span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: '#F1F5FA', color: '#0B3D7A', border: '1px solid #E9EEF5' }}>
              OFFICIEL
            </span>
          </div>
          <p className="text-[11px] text-[#8A99AD] mt-0.5">{timeAgo(post.created_at)}</p>
        </div>
      </div>

      {/* Contenu */}
      {post.content && (
        <div className="px-4 pb-4">
          <p className="text-sm text-[#46586E] leading-relaxed whitespace-pre-line">{post.content}</p>
        </div>
      )}

      {/* Réactions */}
      <div className="flex items-center px-4 py-2.5 border-t border-[#E9EEF5] gap-1">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#64748B] hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer">
          <Heart size={13} /> {post.likes_count ?? 0}
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#64748B] hover:text-[#0B3D7A] hover:bg-[#F1F5FA] transition-colors cursor-pointer">
          <MessageSquare size={13} /> {post.comments?.length ?? 0}
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#64748B] hover:text-[#0B3D7A] hover:bg-[#F1F5FA] transition-colors cursor-pointer ml-auto">
          <Share2 size={13} />
        </button>
      </div>
    </div>
  );
}

/* ── PostCard ── */
function PostCard({ post }: { post: FeedPost; currentUser?: User }) {
  const [showComments, setShowComments] = useState(false);
  if (!post.user) return null;

  return (
    <div className="bg-white rounded-2xl border border-[#E9EEF5] shadow-[0_1px_2px_rgba(16,42,67,.04)] overflow-hidden">
      {post.is_pinned && (
        <div className="flex items-center gap-1.5 px-4 py-2 bg-[#FFF6E0] border-b border-[#F6E2A8]">
          <Pin size={11} className="text-[#B5810A]" />
          <span className="text-[10px] font-bold text-[#B5810A] uppercase tracking-widest">Épinglé</span>
        </div>
      )}

      {/* En-tête */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <Avatar name={post.user.name} src={post.user.avatar} size={9} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[#0A2A4F] text-sm">{post.user.name}</span>
            {post.user.role && (
              <span className="text-[11px] text-[#8A99AD]">{post.user.role}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-[#8A99AD]">{timeAgo(post.created_at)}</span>
            {post.user.department && (
              <span className="text-[10px] text-[#8A99AD]">· {post.user.department}</span>
            )}
          </div>
        </div>
        <button className="text-[#8A99AD] hover:text-[#46586E] cursor-pointer">
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Contenu */}
      {post.content && (
        <div className="px-4 pb-4">
          <p className="text-sm text-[#46586E] leading-relaxed whitespace-pre-line">{post.content}</p>
        </div>
      )}

      {/* Réactions */}
      <div className="flex items-center px-4 py-2.5 border-t border-[#E9EEF5] gap-1">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#64748B] hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer">
          <Heart size={13} className={post.user_has_liked ? 'fill-rose-500 text-rose-500' : ''} />
          {post.likes_count ?? 0}
        </button>
        <button onClick={() => setShowComments(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#64748B] hover:text-[#0B3D7A] hover:bg-[#F1F5FA] transition-colors cursor-pointer">
          <MessageSquare size={13} /> {post.comments?.length ?? 0}
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#64748B] hover:text-[#0B3D7A] hover:bg-[#F1F5FA] transition-colors cursor-pointer">
          <Share2 size={13} />
          <span className="hidden sm:inline">Partager</span>
        </button>
        {/* Bravo à la personne */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-medium border transition-colors cursor-pointer ml-auto"
                style={{ background: '#F7FAEE', borderColor: '#E3EFBE', color: '#5E7320' }}>
          <Trophy size={11} style={{ color: '#9DBA2E' }} /> Bravo
        </button>
      </div>

      {/* Commentaires inline */}
      <AnimatePresence initial={false}>
        {showComments && post.comments && post.comments.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-3 pt-1 space-y-2 bg-[#F9FAFC] border-t border-[#E9EEF5]">
              {post.comments.map(c => (
                <div key={c.id} className="flex items-start gap-2">
                  <Avatar name={c.user.name} src={c.user.avatar} size={6} />
                  <div className="flex-1 bg-white rounded-xl px-3 py-2 text-xs border border-[#E9EEF5]">
                    <span className="font-semibold text-[#0A2A4F]">{c.user.name}</span>
                    <span className="text-[#64748B] ml-2">{c.content}</span>
                    <span className="block text-[10px] text-[#8A99AD] mt-0.5">{c.created_at}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════
   WIDGETS COLONNE DROITE
══════════════════════════════════ */

function TopRecognizedWidget({ bravos }: { bravos: Bravo[] }) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekBravos = bravos.filter(b => new Date(b.created_at) >= oneWeekAgo);

  const countMap: Record<number, { name: string; avatar?: string | null; role?: string; department?: string; count: number }> = {};
  weekBravos.forEach(b => {
    const receivers = b.receivers?.length ? b.receivers : b.receiver ? [b.receiver] : [];
    receivers.forEach(r => {
      if (!countMap[r.id]) countMap[r.id] = {
        name: r.name,
        avatar: (r as any).avatar,
        role: (r as any).role,
        department: (r as any).department,
        count: 0,
      };
      countMap[r.id].count++;
    });
  });

  const top3 = Object.values(countMap).sort((a, b) => b.count - a.count).slice(0, 3);
  if (!top3.length) return null;

  const RANK_STYLES = [
    { bg: '#FFF6E0', border: '#F6E2A8', color: '#F2B205' },
    { bg: '#F1F5FA', border: '#DDE4EE', color: '#AEB9C6' },
    { bg: '#FDF2E6', border: '#F2D8B5', color: '#C98A4B' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#E9EEF5] shadow-[0_1px_2px_rgba(16,42,67,.04)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E9EEF5] flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: '#F7FAEE' }}>
          <Trophy size={13} style={{ color: '#F2B205' }} />
        </span>
        <div>
          <p className="text-sm font-bold text-[#0A2A4F] leading-none">Top reconnus</p>
          <p className="text-[10px] text-[#8A99AD] mt-0.5">Cette semaine</p>
        </div>
      </div>

      <div className="divide-y divide-[#E9EEF5]">
        {top3.map((entry, i) => {
          const rs = RANK_STYLES[i];
          return (
            <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-[#F9FAFC] transition-colors">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black border-2 shrink-0"
                   style={{ background: rs.bg, borderColor: rs.border, color: rs.color }}>
                {i + 1}
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold overflow-hidden shrink-0"
                   style={{ backgroundColor: entry.avatar ? undefined : avatarBg(entry.name) }}>
                {entry.avatar
                  ? <img src={entry.avatar} alt={entry.name} className="w-full h-full object-cover" />
                  : getInitials(entry.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#0A2A4F] truncate">{entry.name}</p>
                <p className="text-[10px] text-[#8A99AD] truncate">{entry.role ?? entry.department ?? ''}</p>
              </div>
              <span className="text-xs font-black shrink-0" style={{ color: '#7E9A2A' }}>
                {entry.count} bravo{entry.count > 1 ? 's' : ''}
              </span>
            </div>
          );
        })}
      </div>

      <div className="px-4 pb-3 pt-2">
        <button onClick={() => router.visit('/stats')}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-xs font-bold border transition-colors cursor-pointer hover:bg-[#EEF4E3]"
          style={{ background: '#F7FAEE', borderColor: '#E3EFBE', color: '#5E7320' }}>
          <Trophy size={12} style={{ color: '#7E9A2A' }} /> Voir le classement complet
        </button>
      </div>
    </div>
  );
}

function LeaderboardWidget({ users }: { users: User[] }) {
  if (users.length < 3) return null;
  const [first, second, third] = [users[0], users[1], users[2]];
  return (
    <div className="bg-white rounded-2xl border border-[#E9EEF5] shadow-[0_1px_2px_rgba(16,42,67,.04)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E9EEF5]">
        <h3 className="text-sm font-bold text-[#0A2A4F] flex items-center gap-2">
          <Trophy size={14} className="text-[#F2B205]" /> Top reconnus
        </h3>
        <button onClick={() => router.visit('/stats')} className="text-xs font-semibold text-[#0B3D7A] hover:underline cursor-pointer">Voir tout</button>
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-3 px-4 pt-5 pb-3"
           style={{ background: 'linear-gradient(to bottom, #0B3D7A, #1A5BA8)' }}>
        {[{ u: second, rank: 2 }, { u: first, rank: 1 }, { u: third, rank: 3 }].map(({ u, rank }) => (
          <div key={u.id} className={`flex flex-col items-center gap-1 ${rank === 1 ? '-translate-y-3' : ''}`}>
            {rank === 1 && <span className="text-base">👑</span>}
            <div className="relative">
              <div className={`rounded-full flex items-center justify-center text-white font-bold overflow-hidden border-2 ${rank === 1 ? 'w-14 h-14 border-[#F2B205] text-sm' : 'w-11 h-11 border-white/40 text-[12px]'}`}
                   style={{ backgroundColor: avatarBg(u.name) }}>
                {getInitials(u.name)}
              </div>
              <div className={`absolute -top-1 -right-1 rounded-full flex items-center justify-center text-[8px] font-black border-2 border-white ${rank === 1 ? 'w-5 h-5' : 'w-4 h-4'}`}
                   style={{ background: rank === 1 ? '#F2B205' : rank === 2 ? '#C0C0C0' : '#CD7F32', color: rank === 1 ? '#173A1E' : '#fff' }}>
                {rank}
              </div>
            </div>
            <span className={`text-[9px] font-bold truncate text-center ${rank === 1 ? 'text-white w-14' : 'text-white/80 w-12'}`}>
              {u.name.split(' ')[0]}
            </span>
            <span className="text-[9px] text-white/50">{u.points_total.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="divide-y divide-[#E9EEF5]">
        {users.slice(0, 5).map((u, i) => (
          <div key={u.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-[#F1F5FA] transition-colors group cursor-pointer">
            <div className="flex items-center gap-2.5">
              <span className={`text-[10px] font-black w-3 ${i < 3 ? 'text-[#0B3D7A]' : 'text-[#8A99AD]'}`}>{i + 1}</span>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                   style={{ backgroundColor: avatarBg(u.name) }}>{getInitials(u.name)}</div>
              <div>
                <p className="text-xs font-bold text-[#0A2A4F] group-hover:text-[#0B3D7A]">{u.name.split(' ')[0]}</p>
                <p className="text-[9px] text-[#8A99AD] uppercase tracking-wide">{u.department}</p>
              </div>
            </div>
            <span className="text-xs font-black text-[#46586E]">{u.points_total.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FollowWidget({ users, currentUserId }: { users: User[]; currentUserId: number }) {
  const candidates = users.filter(u => u.id !== currentUserId).slice(0, 4);
  if (!candidates.length) return null;
  return (
    <div className="bg-white rounded-2xl border border-[#E9EEF5] shadow-[0_1px_2px_rgba(16,42,67,.04)] p-4">
      <h3 className="text-sm font-bold text-[#0A2A4F] mb-3">Collègues à suivre</h3>
      <div className="space-y-3">
        {candidates.map(u => (
          <div key={u.id} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                 style={{ backgroundColor: avatarBg(u.name) }}>{getInitials(u.name)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#0A2A4F] truncate">{u.name}</p>
              <p className="text-[10px] text-[#8A99AD] truncate">{u.department ?? u.role}</p>
            </div>
            <button onClick={() => router.visit(`/profile/${u.id}`)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold border border-[#0B3D7A]/30 text-[#0B3D7A] hover:bg-[#0B3D7A] hover:text-white transition-colors cursor-pointer shrink-0">
              <UserPlus size={11} /> Suivre
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FindColleagueWidget() {
  const [q, setQ] = useState('');
  return (
    <div className="bg-white rounded-2xl border border-[#E9EEF5] shadow-[0_1px_2px_rgba(16,42,67,.04)] p-4">
      <h3 className="text-sm font-bold text-[#0A2A4F] mb-1 flex items-center gap-2">
        <Bot size={14} className="text-[#0B3D7A]" /> Retrouver un collègue
      </h3>
      <p className="text-[11px] text-[#8A99AD] mb-3">Décrivez un collègue, l'IA le trouve.</p>
      <div className="flex gap-2">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Ex : responsable RH…"
          className="flex-1 px-3 py-2 bg-[#F1F5FA] rounded-xl text-xs text-[#46586E] placeholder:text-[#8A99AD] border border-transparent focus:border-[#0B3D7A]/20 outline-none" />
        <button onClick={() => router.visit('/team')}
          className="px-3 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
          style={{ background: '#0B3D7A' }}>
          <SearchIcon size={13} />
        </button>
      </div>
      <div className="mt-2 px-3 py-2 rounded-xl text-[10px] text-[#64748B] flex items-start gap-1.5" style={{ background: '#F1F5FA' }}>
        <Bot size={11} className="text-[#0B3D7A] shrink-0 mt-0.5" /> Propulsé par IA — langage naturel
      </div>
    </div>
  );
}

function ChallengeWidget({ challenge }: { challenge: Challenge }) {
  const start = new Date(challenge.start_date).getTime();
  const end   = new Date(challenge.end_date).getTime();
  const progress = Math.round(Math.max(0, Math.min(100, ((Date.now() - start) / (end - start)) * 100)));
  return (
    <div className="rounded-2xl p-4 text-white overflow-hidden relative"
         style={{ background: 'linear-gradient(135deg, #0A2E5C 0%, #0B3D7A 60%, #1A5BA8 100%)' }}>
      <Anchor className="absolute -right-3 -bottom-3 text-white/6" style={{ width: 68, height: 68 }} strokeWidth={0.8} />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black"
                style={{ background: '#C6E25A', color: '#173A1E' }}>
            <Zap size={9} /> Défi actif
          </span>
          <span className="flex items-center gap-1 text-white/60 text-[10px]">
            <Clock size={10} /> {challenge.days_left}j
          </span>
        </div>
        <h4 className="font-bold text-sm mb-1">{challenge.name}</h4>
        <p className="text-white/60 text-[11px] mb-3 line-clamp-2">{challenge.description}</p>
        <div className="mb-1.5">
          <div className="flex justify-between text-[10px] text-white/60 mb-1">
            <span>Progression</span><span className="font-bold text-white">{progress}%</span>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full" style={{ background: 'linear-gradient(to right, #C6E25A, #9DBA2E)' }} />
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
               style={{ background: '#FFF6E0', color: '#B5810A' }}>
            <Trophy size={10} className="text-[#F2B205]" /> +{challenge.points_bonus} pts
          </div>
          {!challenge.is_participating && (
            <button onClick={() => router.visit('/challenges')}
              className="px-3 py-1.5 rounded-[8px] text-[11px] font-bold cursor-pointer"
              style={{ background: '#C6E25A', color: '#173A1E' }}>
              Participer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   HERO CAROUSEL (compact, h-90px)
══════════════════════════════════ */
interface HeroSlide {
  id: string;
  bg: string;
  tag?: ReactNode;
  title: string;
  subtitle: string;
  cta?: { label: string; action: () => void };
  badge?: ReactNode;
}

function HeroCarousel({ firstName, bravoCount, users, activeChallenge, onOpenCreate }: {
  firstName: string;
  bravoCount: number;
  users: User[];
  activeChallenge: Challenge | null;
  onOpenCreate: () => void;
}) {
  const topUser = users[0];

  const slides: HeroSlide[] = [
    {
      id: 'pad',
      bg: 'from-[#0A2E5C] via-[#0B3D7A] to-[#1A5BA8]',
      tag: (
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/70">
          <Anchor size={9} strokeWidth={2.5} /> PAD
        </span>
      ),
      title: 'Bienvenue sur OnePAD',
      subtitle: `Bonjour ${firstName} — votre espace de reconnaissance et de collaboration`,
      cta: { label: 'Envoyer un Bravo', action: onOpenCreate },
      badge: (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
          <Ship size={14} className="text-white/80" />
          <span className="font-bold text-sm text-white">{bravoCount} Bravos</span>
        </div>
      ),
    },
    ...(topUser ? [{
      id: 'spotlight',
      bg: 'from-[#1a1a2e] via-[#16213e] to-[#0f3460]',
      tag: (
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F2B205]/90">
          <Star size={9} className="fill-current" /> Employé du mois
        </span>
      ),
      title: topUser.name,
      subtitle: `${topUser.department ?? topUser.role ?? ''} · ${topUser.points_total.toLocaleString()} pts`,
      cta: { label: 'Voir le classement', action: () => router.visit('/stats') },
      badge: (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F2B205]/20 backdrop-blur-md rounded-xl border border-[#F2B205]/30">
          <Trophy size={14} className="text-[#F2B205]" />
          <span className="font-bold text-sm text-white">#1</span>
        </div>
      ),
    } as HeroSlide] : []),
    ...(activeChallenge ? [{
      id: 'challenge',
      bg: 'from-[#0B3D7A] via-[#0B3D7A]/90 to-[#1A5BA8]/80',
      tag: (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#C6E25A] text-[#173A1E]">
            <Zap size={9} /> Défi actif
          </span>
          <span className="flex items-center gap-1 text-white/70 text-[10px] font-bold">
            <Clock size={10} /> {activeChallenge.days_left}j restants
          </span>
        </div>
      ),
      title: activeChallenge.name,
      subtitle: activeChallenge.description ?? '',
      cta: { label: 'Rejoindre', action: () => router.visit('/challenges') },
      badge: (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
          <Award size={14} className="text-[#F2B205]" />
          <span className="font-extrabold text-base text-white">+{activeChallenge.points_bonus} pts</span>
        </div>
      ),
    } as HeroSlide] : []),
  ];

  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => setCurrent(c => (c + 1) % slides.length), 5500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const slide = slides[current] ?? slides[0];

  return (
    <div className="relative overflow-hidden h-[90px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className={`bg-gradient-to-r ${slide.bg} px-5 text-white flex items-center gap-4 relative h-full`}
        >
          <Anchor className="absolute -right-3 -bottom-3 text-white/5" style={{ width: 72, height: 72 }} strokeWidth={0.8} />

          <div className="relative z-10 flex-1 min-w-0 space-y-0.5">
            {slide.tag}
            <h1 className="text-sm md:text-base font-extrabold tracking-tight leading-tight truncate">{slide.title}</h1>
            <p className="text-white/70 text-[11px] font-medium leading-snug hidden md:block line-clamp-1">{slide.subtitle}</p>
          </div>

          {slide.badge && <div className="relative z-10 shrink-0 hidden sm:block">{slide.badge}</div>}

          {slide.cta && (
            <button
              className="relative z-10 hidden lg:flex items-center px-3 py-1.5 text-xs font-bold rounded-[8px] shrink-0 cursor-pointer"
              style={{ background: '#C6E25A', color: '#0A2A4F' }}
              onClick={slide.cta.action}
            >
              {slide.cta.label}
            </button>
          )}

          {slides.length > 1 && (
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
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════
   COMPOSER + STORIES + TABS
══════════════════════════════════ */
function StoryRail({ users, currentUser, stories = [], onAddStory }: {
  users: User[];
  currentUser: User;
  stories?: Story[];
  onAddStory?: () => void;
}) {
  /* grouper les stories par utilisateur */
  const storyUserIds = new Set(stories.map(s => s.user_id));
  const unreadUserIds = new Set(stories.filter(s => !s.seen).map(s => s.user_id));

  /* utilisateurs qui ont une story active (autres que currentUser) */
  const storyUsers = users.filter(u => u.id !== currentUser.id && storyUserIds.has(u.id));
  /* autres utilisateurs (pas de story), jusqu'à 6 pour compléter */
  const otherUsers = users.filter(u => u.id !== currentUser.id && !storyUserIds.has(u.id)).slice(0, Math.max(0, 6 - storyUsers.length));
  const displayUsers = [...storyUsers, ...otherUsers];

  const myHasStory = storyUserIds.has(currentUser.id);

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide px-4 py-3">
      {/* Ma story */}
      <button
        onClick={onAddStory}
        className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
      >
        <div className="relative">
          <div
            className="w-14 h-14 rounded-full p-[2px]"
            style={{ background: myHasStory ? 'linear-gradient(135deg,#C6E25A,#0B3D7A)' : '#E9EEF5' }}
          >
            <div className="w-full h-full rounded-full bg-white p-[2px]">
              <div className="w-full h-full rounded-full flex items-center justify-center text-white text-sm font-bold"
                   style={{ backgroundColor: avatarBg(currentUser.name) }}>
                {currentUser.avatar
                  ? <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full rounded-full object-cover" />
                  : getInitials(currentUser.name)}
              </div>
            </div>
          </div>
          {!myHasStory && (
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center"
                 style={{ background: '#0B3D7A' }}>
              <Plus size={11} className="text-white" strokeWidth={3} />
            </div>
          )}
        </div>
        <span className="text-[11px] text-[#46586E] font-medium whitespace-nowrap">Ma story</span>
      </button>

      {/* Autres utilisateurs */}
      {displayUsers.map(u => {
        const hasStory  = storyUserIds.has(u.id);
        const hasUnread = unreadUserIds.has(u.id);
        return (
          <div key={u.id} className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer">
            <div
              className="w-14 h-14 rounded-full p-[2px]"
              style={{
                background: hasStory
                  ? hasUnread
                    ? 'linear-gradient(135deg,#C6E25A,#0B3D7A)'
                    : '#AEB9C6'
                  : '#E9EEF5',
              }}
            >
              <div className="w-full h-full rounded-full bg-white p-[2px]">
                <div className="w-full h-full rounded-full flex items-center justify-center text-white text-[13px] font-bold overflow-hidden"
                     style={{ backgroundColor: u.avatar ? undefined : avatarBg(u.name) }}>
                  {u.avatar
                    ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                    : getInitials(u.name)}
                </div>
              </div>
            </div>
            <span className="text-[11px] text-[#46586E] font-medium truncate w-14 text-center">
              {u.name.split(' ')[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Composer({ currentUser, onOpenBravo }: { currentUser: User; onOpenBravo: () => void }) {
  const [expanded,      setExpanded]      = useState(false);
  const [mode,          setMode]          = useState<'text' | 'poll' | 'event'>('text');
  const [text,          setText]          = useState('');
  const [mediaFiles,    setMediaFiles]    = useState<{ file: File; preview: string; isVideo: boolean }[]>([]);
  const [pollOptions,   setPollOptions]   = useState(['', '']);
  const [eventTitle,    setEventTitle]    = useState('');
  const [eventDate,     setEventDate]     = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);

  const firstName = currentUser.name.split(' ')[0];
  const hasMedia  = mediaFiles.length > 0;

  function handleMediaSelect(files: FileList | null) {
    if (!files) return;
    const added = Array.from(files).map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      isVideo: f.type.startsWith('video/'),
    }));
    setMediaFiles(prev => [...prev, ...added]);
    setExpanded(true);
  }

  function removeMedia(i: number) {
    URL.revokeObjectURL(mediaFiles[i].preview);
    setMediaFiles(prev => prev.filter((_, j) => j !== i));
  }

  async function handlePublish() {
    if (!text.trim() && !hasMedia && mode === 'text') return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', text);
      formData.append('type', hasMedia ? 'media' : mode === 'text' ? 'post' : mode);
      mediaFiles.forEach((m, i) => formData.append(`media[${i}]`, m.file));
      if (mode === 'poll') pollOptions.filter(o => o.trim()).forEach((o, i) => formData.append(`options[${i}]`, o));
      if (mode === 'event') {
        formData.append('event_title', eventTitle);
        formData.append('event_date', eventDate);
        formData.append('event_location', eventLocation);
      }
      const res = await fetch('/posts', {
        method: 'POST',
        headers: { 'X-CSRF-TOKEN': getCsrf(), 'Accept': 'application/json' },
        body: formData,
      });
      if (res.ok) {
        mediaFiles.forEach(m => URL.revokeObjectURL(m.preview));
        setText(''); setMediaFiles([]); setPollOptions(['', '']);
        setEventTitle(''); setEventDate(''); setEventLocation('');
        setMode('text'); setExpanded(false);
        router.reload();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E9EEF5] shadow-[0_1px_2px_rgba(16,42,67,.04)] p-4">
      {/* Avatar + champ */}
      <div className="flex items-start gap-3">
        <Avatar name={currentUser.name} src={currentUser.avatar} size={10} className="shrink-0 mt-0.5" />
        <div
          className={`flex-1 px-4 py-2.5 rounded-[13px] bg-[#F1F5FA] border transition-colors ${
            expanded ? 'border-[#C6E25A]' : 'border-[#E4EAF2] hover:border-[#C6E25A] cursor-pointer'
          }`}
          onClick={() => { if (!expanded) { setExpanded(true); setTimeout(() => textareaRef.current?.focus(), 30); } }}
        >
          {expanded ? (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={`Quoi de neuf, ${firstName} ?`}
              rows={3}
              className="w-full bg-transparent text-sm text-[#46586E] placeholder:text-[#8A99AD] outline-none resize-none"
            />
          ) : (
            <span className="text-sm text-[#8A99AD]">Quoi de neuf, {firstName} ?</span>
          )}
        </div>
      </div>

      {/* Aperçu médias */}
      {hasMedia && (
        <div className="mt-3 flex gap-2 flex-wrap pl-[52px]">
          {mediaFiles.map((m, i) => (
            <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden bg-[#F1F5FA]">
              {m.isVideo
                ? <video src={m.preview} className="w-full h-full object-cover" muted />
                : <img src={m.preview} alt="" className="w-full h-full object-cover" />}
              {m.isVideo && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[10px] border-l-white border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1" />
                  </div>
                </div>
              )}
              <button onClick={() => removeMedia(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center cursor-pointer">
                <X size={10} />
              </button>
            </div>
          ))}
          <label className="w-24 h-24 rounded-xl border-2 border-dashed border-[#E4EAF2] flex flex-col items-center justify-center text-[#8A99AD] cursor-pointer hover:border-[#2FB573] hover:text-[#2FB573] transition-colors">
            <Film size={18} />
            <span className="text-[10px] mt-1 font-medium">Ajouter</span>
            <input type="file" accept="image/*,video/*" multiple className="hidden"
              onChange={e => handleMediaSelect(e.target.files)} />
          </label>
        </div>
      )}

      {/* Formulaire sondage */}
      {expanded && mode === 'poll' && (
        <div className="mt-3 space-y-2 pl-[52px]">
          {pollOptions.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] font-black text-[#8A99AD] w-4 shrink-0">{i + 1}</span>
              <input
                value={opt}
                onChange={e => setPollOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                placeholder={`Option ${i + 1}`}
                className="flex-1 px-3 py-2 bg-[#F1F5FA] rounded-xl text-sm text-[#46586E] placeholder:text-[#8A99AD] border border-transparent focus:border-[#5A6BD6]/40 outline-none"
              />
              {pollOptions.length > 2 && (
                <button onClick={() => setPollOptions(prev => prev.filter((_, j) => j !== i))}
                  className="text-[#8A99AD] hover:text-red-400 cursor-pointer shrink-0">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          {pollOptions.length < 5 && (
            <button onClick={() => setPollOptions(prev => [...prev, ''])}
              className="ml-6 text-[11px] font-semibold cursor-pointer flex items-center gap-1"
              style={{ color: '#5A6BD6' }}>
              <Plus size={12} /> Ajouter une option
            </button>
          )}
        </div>
      )}

      {/* Formulaire événement */}
      {expanded && mode === 'event' && (
        <div className="mt-3 space-y-2 pl-[52px]">
          <input value={eventTitle} onChange={e => setEventTitle(e.target.value)}
            placeholder="Titre de l'événement"
            className="w-full px-3 py-2.5 bg-[#F1F5FA] rounded-xl text-sm text-[#46586E] placeholder:text-[#8A99AD] border border-transparent focus:border-[#D98A2B]/40 outline-none" />
          <div className="flex gap-2">
            <input type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)}
              className="flex-1 px-3 py-2.5 bg-[#F1F5FA] rounded-xl text-sm text-[#46586E] border border-transparent focus:border-[#D98A2B]/40 outline-none" />
            <input value={eventLocation} onChange={e => setEventLocation(e.target.value)}
              placeholder="Lieu"
              className="flex-1 px-3 py-2.5 bg-[#F1F5FA] rounded-xl text-sm text-[#46586E] placeholder:text-[#8A99AD] border border-transparent focus:border-[#D98A2B]/40 outline-none" />
          </div>
        </div>
      )}

      {/* Chips d'action + Publier */}
      <div className={`flex items-center gap-1.5 flex-wrap ${expanded ? 'mt-3 pt-3 border-t border-[#E9EEF5]' : 'mt-3'}`}>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden"
          onChange={e => handleMediaSelect(e.target.files)} />

        {/* Média */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-xs font-medium border transition-colors cursor-pointer ${
            hasMedia
              ? 'bg-[#E8F7F0] border-[#2FB573]/30 text-[#2FB573]'
              : 'bg-[#F1F5FA] border-[#E9EEF5] text-[#46586E] hover:bg-[#E9EFF7]'
          }`}
        >
          <Film size={13} style={{ color: '#2FB573' }} />
          Média
        </button>

        {/* Donner un Bravo */}
        <button
          onClick={onOpenBravo}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-xs font-medium border transition-colors cursor-pointer hover:opacity-90"
          style={{ background: '#F7FAEE', borderColor: '#E3EFBE', color: '#5E7320' }}
        >
          <Medal size={13} style={{ color: '#7E9A2A' }} />
          Donner un Bravo
        </button>

        {/* Sondage */}
        <button
          onClick={() => { setMode(m => m === 'poll' ? 'text' : 'poll'); setExpanded(true); }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-xs font-medium border transition-colors cursor-pointer ${
            mode === 'poll'
              ? 'bg-[#EEEEF9] border-[#5A6BD6]/30 text-[#5A6BD6]'
              : 'bg-[#F1F5FA] border-[#E9EEF5] text-[#46586E] hover:bg-[#E9EFF7]'
          }`}
        >
          <BarChart2 size={13} style={{ color: '#5A6BD6' }} />
          Sondage
        </button>

        {/* Événement */}
        <button
          onClick={() => { setMode(m => m === 'event' ? 'text' : 'event'); setExpanded(true); }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-xs font-medium border transition-colors cursor-pointer ${
            mode === 'event'
              ? 'bg-[#FDF0E0] border-[#D98A2B]/30 text-[#D98A2B]'
              : 'bg-[#F1F5FA] border-[#E9EEF5] text-[#46586E] hover:bg-[#E9EFF7]'
          }`}
        >
          <Calendar size={13} style={{ color: '#D98A2B' }} />
          Événement
        </button>

        {/* Publier */}
        <button
          onClick={handlePublish}
          disabled={submitting || (!text.trim() && !hasMedia && mode === 'text')}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-bold text-white cursor-pointer disabled:opacity-50 disabled:cursor-default transition-colors"
          style={{ background: '#0B3D7A' }}
          onMouseEnter={e => { if (!submitting) (e.currentTarget.style.background = '#0E4A93'); }}
          onMouseLeave={e => { (e.currentTarget.style.background = '#0B3D7A'); }}
        >
          {submitting
            ? <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            : <Send size={13} />
          }
          Publier
        </button>
      </div>
    </div>
  );
}

type FeedTab  = 'all' | 'bravos' | 'officiel' | 'equipe';
type FeedSort = 'recent' | 'popular';

function FeedTabs({ active, onChange, sort, onSortChange, count }: {
  active: FeedTab; onChange: (t: FeedTab) => void;
  sort: FeedSort; onSortChange: (s: FeedSort) => void;
  count: number;
}) {
  const [showSort, setShowSort] = useState(false);

  const tabs: { key: FeedTab; label: string; bravos?: true }[] = [
    { key: 'all',      label: 'Tout' },
    { key: 'officiel', label: 'Officiel' },
    { key: 'bravos',   label: 'Bravos', bravos: true },
    { key: 'equipe',   label: 'Mon équipe' },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {tabs.map(tab => {
        const isActive  = active === tab.key;
        const isBravos  = !!tab.bravos;
        return (
          <button key={tab.key} onClick={() => onChange(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              isActive
                ? isBravos
                  ? 'text-[#5E7320]'
                  : 'text-white shadow-sm'
                : 'bg-white text-[#46586E] border border-[#E4EAF2] hover:bg-[#F1F5FA] hover:text-[#0B3D7A]'
            }`}
            style={isActive
              ? isBravos
                ? { background: '#F7FAEE', border: '1px solid #C6E25A' }
                : { background: '#0B3D7A' }
              : {}
            }>
            {isBravos && <Medal size={12} style={{ color: isActive ? '#7E9A2A' : '#AEB9C6' }} />}
            {tab.label}
          </button>
        );
      })}

      {/* Tri + compteur */}
      <div className="ml-auto flex items-center gap-2 shrink-0 relative">
        <div className="hidden sm:flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#E9EEF5]">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-bold text-[#8A99AD] uppercase tracking-widest">{count} éléments</span>
        </div>
        <button
          onClick={() => setShowSort(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[#E4EAF2] bg-white text-[#46586E] hover:bg-[#F1F5FA] cursor-pointer transition-colors"
        >
          <Filter size={12} />
          <span className="hidden sm:inline">{sort === 'recent' ? 'Plus récents' : 'Plus populaires'}</span>
          <ChevronDown size={11} className={`transition-transform duration-150 ${showSort ? 'rotate-180' : ''}`} />
        </button>
        {showSort && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-[#E9EEF5] rounded-xl shadow-[0_8px_24px_rgba(11,45,92,0.12)] overflow-hidden z-20 min-w-[160px]">
            {([
              { value: 'recent'  as FeedSort, label: 'Plus récents' },
              { value: 'popular' as FeedSort, label: 'Plus populaires' },
            ] as const).map(opt => (
              <button key={opt.value}
                onClick={() => { onSortChange(opt.value); setShowSort(false); }}
                className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                  sort === opt.value ? 'text-[#0B3D7A] bg-[#F1F5FA]' : 'text-[#46586E] hover:bg-[#F9FAFC]'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   DASHBOARD PAGE
══════════════════════════════════ */
export default function Dashboard({
  bravos, posts = [], stories = [], users, activeChallenge, currentUser, bravoValues, celebrations = [],
}: DashboardProps) {
  const safeUsers   = Array.isArray(users) ? users : [];
  const sortedUsers = [...safeUsers].sort((a, b) => b.points_total - a.points_total);
  const firstName   = currentUser.name.split(' ')[0];

  const [sortOrder, setSortOrder] = useState<FeedSort>('recent');

  /* ── Fusionner bravos + posts → fil trié ── */
  const feedItems = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [
      ...bravos.map(b => ({ kind: 'bravo' as const, data: b, createdAt: b.created_at })),
      ...posts.map(p => ({ kind: 'post'  as const, data: p, createdAt: p.created_at })),
    ];
    if (sortOrder === 'popular') {
      return items.sort((a, b) => (b.data.likes_count ?? 0) - (a.data.likes_count ?? 0));
    }
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [bravos, posts, sortOrder]);

  /* ── État commentaires bravos ── */
  const [commentTexts, setCommentTexts] = useState<Record<number, string>>({});
  const [commentLists, setCommentLists] = useState<Record<number, BravoComment[]>>(() => {
    const init: Record<number, BravoComment[]> = {};
    bravos.forEach(b => { init[b.id] = b.comments ?? []; });
    return init;
  });
  const [showCommentsBravo, setShowCommentsBravo] = useState<Record<number, boolean>>({});
  const [submitting,        setSubmitting]         = useState<Record<number, boolean>>({});

  /* ── Autres états ── */
  const [celebrationsDismissed, setCelebrationsDismissed] = useState(false);
  const [showScrollTop,         setShowScrollTop]         = useState(false);
  const [activeTab,             setActiveTab]             = useState<FeedTab>('all');
  const [showCreateModal,       setShowCreateModal]       = useState(false);

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    const onScroll = () => setShowScrollTop(main.scrollTop > 300);
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => main.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Chargement progressif ── */
  const PAGE_SIZE = 12;
  const [page, setPage] = useState(1);
  const displayedItems = useMemo(() => feedItems.slice(0, page * PAGE_SIZE), [feedItems, page]);
  const hasMore = displayedItems.length < feedItems.length;
  const lastRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (lastRef.current) lastRef.current.disconnect();
    if (!node) return;
    lastRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) setPage(p => p + 1);
    });
    lastRef.current.observe(node);
  }, [hasMore]);
  useEffect(() => () => { lastRef.current?.disconnect(); }, []);

  /* ── Filtre par onglet ── */
  const filtered = useMemo(() => {
    if (activeTab === 'all')     return displayedItems;
    if (activeTab === 'bravos')  return displayedItems.filter(i => i.kind === 'bravo');
    if (activeTab === 'officiel') return displayedItems.filter(i => i.kind === 'post' && i.data.type === 'announcement');
    return displayedItems; // 'equipe' — filtre futur
  }, [displayedItems, activeTab]);

  /* ── Soumettre commentaire bravo ── */
  async function submitComment(bravoId: number) {
    const text = (commentTexts[bravoId] ?? '').trim();
    if (!text || submitting[bravoId]) return;
    setSubmitting(p => ({ ...p, [bravoId]: true }));
    try {
      const res = await fetch(`/bravos/${bravoId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': getCsrf() },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const comment: BravoComment = await res.json();
        setCommentLists(p => ({ ...p, [bravoId]: [comment, ...(p[bravoId] ?? [])] }));
        setCommentTexts(p => ({ ...p, [bravoId]: '' }));
        setShowCommentsBravo(p => ({ ...p, [bravoId]: true }));
      }
    } finally {
      setSubmitting(p => ({ ...p, [bravoId]: false }));
    }
  }
  async function deleteComment(bravoId: number, commentId: number) {
    await fetch(`/bravos/${bravoId}/comments/${commentId}`, { method: 'DELETE', headers: { 'X-CSRF-TOKEN': getCsrf() } });
    setCommentLists(p => ({ ...p, [bravoId]: (p[bravoId] ?? []).filter(c => c.id !== commentId) }));
  }

  /* ══════════════ RENDER ══ */
  return (
    <div className="animate-in fade-in duration-500 pb-24">

      {/* Célébrations */}
      <AnimatePresence>
        {celebrations.length > 0 && !celebrationsDismissed && (
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="mx-4 md:mx-6 mt-4 rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 px-5 py-3 text-white flex items-center gap-3">
              <PartyPopper size={18} className="shrink-0" />
              <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1">
                {celebrations.map((c, i) => (
                  <span key={i} className="text-sm font-semibold flex items-center gap-1.5">
                    {c.type === 'birthday' ? <><Cake size={14} /> {c.name} 🎂</> : <><Briefcase size={14} /> {c.name} — {c.years} an{(c.years ?? 1) > 1 ? 's' : ''} 🎉</>}
                  </span>
                ))}
              </div>
              <button onClick={() => setCelebrationsDismissed(true)} className="shrink-0 text-white/70 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero carousel compact */}
      <HeroCarousel
        firstName={firstName}
        bravoCount={bravos.length}
        users={sortedUsers}
        activeChallenge={activeChallenge}
        onOpenCreate={() => setShowCreateModal(true)}
      />

      {/* Grille 2 colonnes */}
      <div className="px-4 md:px-6 pt-6">
        {/* items-start retiré : la colonne droite s'étire pour que sticky bottom fonctionne */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_332px] gap-6">

          {/* ═══ FIL PRINCIPAL ═══ */}
          <div className="min-w-0 space-y-4 lg:self-start">
            {/* Stories */}
            <div className="bg-white rounded-2xl border border-[#E9EEF5] shadow-[0_1px_2px_rgba(16,42,67,.04)] overflow-hidden">
              <StoryRail users={safeUsers} currentUser={currentUser} stories={stories} onAddStory={() => router.visit('/stories')} />
            </div>

            {/* Composer */}
            <Composer currentUser={currentUser} onOpenBravo={() => setShowCreateModal(true)} />

            {/* Onglets */}
            <FeedTabs active={activeTab} onChange={setActiveTab} sort={sortOrder} onSortChange={setSortOrder} count={filtered.length} />

            {/* Fil unifié */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E9EEF5] p-12 text-center">
                <Trophy className="mx-auto mb-3 text-[#0B3D7A]/20" size={40} />
                <p className="font-bold text-[#46586E]">Rien à afficher</p>
                <p className="text-sm text-[#8A99AD] mt-1">Soyez le premier à publier ou féliciter !</p>
                <button onClick={() => setShowCreateModal(true)}
                  className="mt-4 px-5 py-2 rounded-[10px] text-sm font-bold text-white cursor-pointer"
                  style={{ background: '#0B3D7A' }}>
                  Envoyer un Bravo
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((item, index) => {
                  const isLast = index === filtered.length - 1;
                  if (item.kind === 'bravo') {
                    const bravo = item.data;
                    return (
                      <motion.div key={`bravo-${bravo.id}`}
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.03, 0.3) }}
                        ref={isLast ? loadMoreRef : undefined}>
                        <BravoCard
                          bravo={bravo} currentUser={currentUser} users={safeUsers}
                          comments={commentLists[bravo.id] ?? []}
                          showComments={showCommentsBravo[bravo.id] ?? false}
                          commentText={commentTexts[bravo.id] ?? ''}
                          submitting={submitting[bravo.id] ?? false}
                          onToggleComments={() => setShowCommentsBravo(p => ({ ...p, [bravo.id]: !p[bravo.id] }))}
                          onCommentChange={v => setCommentTexts(p => ({ ...p, [bravo.id]: v }))}
                          onSubmitComment={() => submitComment(bravo.id)}
                          onDeleteComment={cId => deleteComment(bravo.id, cId)}
                          onOpenCreate={() => setShowCreateModal(true)}
                        />
                      </motion.div>
                    );
                  }
                  // Post
                  const post = item.data;
                  return (
                    <motion.div key={`post-${post.id}`}
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.03, 0.3) }}
                      ref={isLast ? loadMoreRef : undefined}>
                      {post.type === 'announcement'
                        ? <AnnouncementCard post={post} />
                        : <PostCard post={post} currentUser={currentUser} />
                      }
                    </motion.div>
                  );
                })}

                {hasMore && (
                  <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-[#0B3D7A] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ═══ COLONNE DROITE ═══
               Wrapper sans self-start : il s'étire à la hauteur du fil.
               Le stack intérieur est sticky bottom-6 : il suit le scroll
               puis se bloque quand son bas touche 24px du bord viewport. */}
          <div className="hidden lg:block">
            <div className="space-y-4 sticky bottom-6">
              <LeaderboardWidget users={sortedUsers} />
              <TopRecognizedWidget bravos={bravos} />
              <FollowWidget users={safeUsers} currentUserId={currentUser.id} />
              <FindColleagueWidget />
              {activeChallenge && <ChallengeWidget challenge={activeChallenge} />}
              {celebrations.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#E9EEF5] shadow-[0_1px_2px_rgba(16,42,67,.04)] p-4">
                  <h3 className="text-sm font-bold text-[#0A2A4F] mb-3 flex items-center gap-2">
                    <Star size={14} className="text-rose-500" /> Anniversaires
                  </h3>
                  <div className="space-y-2.5">
                    {celebrations.slice(0, 3).map((c, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${c.type === 'birthday' ? 'bg-rose-50' : 'bg-amber-50'}`}>
                          {c.type === 'birthday' ? <Cake size={14} className="text-rose-500" /> : <Briefcase size={14} className="text-amber-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#0A2A4F] truncate">{c.name}</p>
                          <p className="text-xs text-[#8A99AD]">{c.type === 'birthday' ? 'Anniversaire' : `${c.years} an${(c.years ?? 0) > 1 ? 's' : ''} d'ancienneté`}</p>
                        </div>
                        <span className="text-xs text-rose-500 font-semibold shrink-0">Aujourd'hui</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Bravo */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowCreateModal(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto bg-[#F1F5FA] rounded-2xl shadow-2xl modal-scroll"
              onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-[#64748B] hover:text-[#0A2A4F] shadow-sm border border-[#E9EEF5] cursor-pointer z-10">
                <X size={16} />
              </button>
              <div className="px-4 py-6">
                <CreateBravo users={users} bravoValues={bravoValues} isModal
                  onSuccess={() => { setShowCreateModal(false); router.reload(); }} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back to top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="fixed bottom-6 right-20 z-40">
            <button onClick={() => document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })}
              className="w-10 h-10 rounded-full text-white shadow-lg flex items-center justify-center cursor-pointer"
              style={{ background: '#1A5BA8' }}>
              <ChevronUp size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
