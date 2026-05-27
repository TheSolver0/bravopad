import React, { useState, useCallback, useEffect, useRef,  DragEvent, ChangeEvent} from 'react';
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
  Repeat,
  TrendingUp,
  Zap,
  Globe,
  Volume2,
  VolumeX,
  Search, Building2, Users, BadgeCheck,
  MapPin, Briefcase, Filter, Upload,
  Mic, Type, Eye, Palette, Music, AlignCenter, AlignLeft, AlignRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Post, PostComment, PostMedia, Challenge, BravoValue, User as AppUser, User, Story } from './types';
import CreateBravo from './CreateBravo';
import { ClickableAvatar } from '@/components/clickable-avatar';
import { UserLink } from '@/components/user-link';

interface FeedProps {
  posts: Post[];
  currentUser: AppUser;
  users: AppUser[];
  activeChallenge: Challenge | null;
  bravoCount: number;
  bravoValues: BravoValue[];
  announcements?: Post[];
  stories?: Story[];
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
interface Colleague {
  id: number;
  name: string;
  role: string;
  department: string;
  location: string;
  initials: string;
}

// ── Story Creator ─────────────────────────────────────────────────────────────
const BG_COLORS = ['#003d7a','#e74c3c','#8e44ad','#16a085','#d35400','#1a1a2e','#27ae60','#2c3e50'];

function StoryCreator({ currentUser, onClose, onCreated }: {
  currentUser: LocalUser;
  onClose: () => void;
  onCreated: (story: Story) => void;
}) {
  const { t } = useTranslation();
  const [step, setStep]           = useState<'pick' | 'edit'>('pick');
  const [type, setType]           = useState<Story['type']>('text');
  const [text, setText]           = useState('');
  const [caption, setCaption]     = useState('');
  const [bgColor, setBgColor]     = useState('#003d7a');
  const [fontStyle, setFontStyle] = useState<'normal'|'bold'|'italic'>('normal');
  const [textAlign, setTextAlign] = useState<'left'|'center'|'right'>('center');
  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Voice recording
  const [recording, setRecording]   = useState(false);
  const [audioBlob, setAudioBlob]   = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl]     = useState<string | null>(null);
  const [recSeconds, setRecSeconds] = useState(0);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<BlobPart[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef     = useRef<HTMLInputElement>(null);

  const ACCEPT: Record<string, string> = {
    image: 'image/jpeg,image/png,image/gif,image/webp',
    video: 'video/mp4,video/mov,video/avi,video/webm',
  };

  const pickType = (t: Story['type']) => { setType(t); setStep('edit'); };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecRef.current = mr;
      setRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch {
      alert(t('story.micError', 'Impossible d\'accéder au microphone.'));
    }
  };

  const stopRecording = () => {
    mediaRecRef.current?.stop();
    setRecording(false);
    if (recTimerRef.current) clearInterval(recTimerRef.current);
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecSeconds(0);
  };

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  const canSubmit = () => {
    if (type === 'text')  return text.trim().length > 0;
    if (type === 'audio') return audioBlob !== null;
    return file !== null;
  };

  const submit = () => {
    if (submitting || !canSubmit()) return;
    setSubmitting(true);

    const fd = new FormData();
    fd.append('type', type);
    if (type === 'text') {
      fd.append('content', text);
      fd.append('background_color', bgColor);
      fd.append('font_style', fontStyle);
      fd.append('text_align', textAlign);
    } else if (type === 'audio') {
      fd.append('media', audioBlob as Blob, 'voice.webm');
      if (caption.trim()) fd.append('content', caption);
    } else {
      fd.append('media', file as File);
      if (caption.trim()) fd.append('content', caption);
    }
    fd.append('_token', getCsrf());

    fetch('/stories', { method: 'POST', body: fd })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((story: Story) => { onCreated(story); onClose(); })
      .catch(() => setSubmitting(false));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {step === 'edit' && (
              <button onClick={() => setStep('pick')} className="text-gray-400 hover:text-gray-600 mr-1">
                <ChevronLeft size={20} />
              </button>
            )}
            <img src={getAvatar(currentUser)} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
            <span className="font-semibold text-gray-800 text-sm">{t('story.create', 'Créer une story')}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {step === 'pick' ? (
          /* ── Step 1: choose type ── */
          <div className="p-5 grid grid-cols-2 gap-3">
            {[
              { key: 'text',  icon: <Type size={28} />,  label: t('story.typeText',  'Texte'),  color: 'bg-indigo-50 text-indigo-600' },
              { key: 'image', icon: <ImageIcon size={28}/>, label: t('story.typeImage','Image'),  color: 'bg-emerald-50 text-emerald-600' },
              { key: 'video', icon: <Play size={28} />,  label: t('story.typeVideo', 'Vidéo'),  color: 'bg-rose-50 text-rose-600' },
              { key: 'audio', icon: <Mic size={28} />,   label: t('story.typeAudio', 'Voix'),   color: 'bg-amber-50 text-amber-600' },
            ].map(({ key, icon, label, color }) => (
              <button
                key={key}
                onClick={() => pickType(key as Story['type'])}
                className={`flex flex-col items-center gap-3 rounded-2xl p-5 ${color} hover:scale-[1.03] transition-transform border border-transparent hover:border-current/20`}
              >
                {icon}
                <span className="font-semibold text-sm">{label}</span>
              </button>
            ))}
          </div>
        ) : (
          /* ── Step 2: edit content ── */
          <div className="p-5 space-y-4">
            {type === 'text' ? (
              <>
                {/* Preview */}
                <div
                  className="w-full h-48 rounded-2xl flex items-center justify-center p-4 transition-colors"
                  style={{ background: bgColor }}
                >
                  <p
                    className="text-white text-lg leading-snug break-words max-w-full"
                    style={{
                      fontWeight: fontStyle === 'bold' ? 700 : 400,
                      fontStyle: fontStyle === 'italic' ? 'italic' : 'normal',
                      textAlign,
                    }}
                  >
                    {text || <span className="opacity-40">{t('story.textPlaceholder', 'Votre texte ici…')}</span>}
                  </p>
                </div>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  rows={3}
                  maxLength={500}
                  placeholder={t('story.textPlaceholder', 'Votre texte ici…')}
                  value={text}
                  onChange={e => setText(e.target.value)}
                />
                {/* Style controls */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFontStyle(f => f === 'bold' ? 'normal' : 'bold')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${fontStyle === 'bold' ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600'}`}
                  >B</button>
                  <button
                    onClick={() => setFontStyle(f => f === 'italic' ? 'normal' : 'italic')}
                    className={`px-3 py-1.5 rounded-lg text-sm italic border transition-colors ${fontStyle === 'italic' ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600'}`}
                  >I</button>
                  <button onClick={() => setTextAlign('left')}  className={`p-1.5 rounded-lg border ${textAlign==='left'   ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600'}`}><AlignLeft  size={14}/></button>
                  <button onClick={() => setTextAlign('center')}className={`p-1.5 rounded-lg border ${textAlign==='center' ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600'}`}><AlignCenter size={14}/></button>
                  <button onClick={() => setTextAlign('right')} className={`p-1.5 rounded-lg border ${textAlign==='right'  ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600'}`}><AlignRight size={14}/></button>
                </div>
                {/* Background colors */}
                <div className="flex gap-2 flex-wrap">
                  {BG_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setBgColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${bgColor === c ? 'border-primary scale-110' : 'border-transparent'}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </>
            ) : type === 'audio' ? (
              /* ── Voice recorder ── */
              <>
                <div className="w-full h-48 rounded-2xl bg-amber-50 flex flex-col items-center justify-center gap-4 relative overflow-hidden">
                  {/* Animated rings while recording */}
                  {recording && (
                    <>
                      <div className="absolute w-24 h-24 rounded-full bg-red-400/20 animate-ping" />
                      <div className="absolute w-16 h-16 rounded-full bg-red-400/30 animate-ping [animation-delay:150ms]" />
                    </>
                  )}
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center z-10 ${recording ? 'bg-red-500' : audioBlob ? 'bg-green-500' : 'bg-amber-400'}`}>
                    <Mic size={26} className="text-white" />
                  </div>
                  {recording ? (
                    <p className="text-red-500 font-bold text-lg z-10">{fmtTime(recSeconds)}</p>
                  ) : audioBlob ? (
                    <audio src={audioUrl ?? undefined} controls className="z-10 w-56" />
                  ) : (
                    <p className="text-amber-600 text-sm font-medium z-10">{t('story.tapToRecord', 'Appuyer pour enregistrer')}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  {!recording && !audioBlob && (
                    <button onClick={startRecording} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-600 transition-colors">
                      <Mic size={16} /> {t('story.record', 'Enregistrer')}
                    </button>
                  )}
                  {recording && (
                    <button onClick={stopRecording} className="flex-1 py-2.5 rounded-xl bg-gray-800 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors">
                      <span className="w-3 h-3 rounded-sm bg-white inline-block" /> {t('story.stop', 'Arrêter')}
                    </button>
                  )}
                  {audioBlob && !recording && (
                    <button onClick={resetRecording} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-colors">
                      {t('story.retry', 'Recommencer')}
                    </button>
                  )}
                </div>

                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder={t('story.captionPlaceholder', 'Légende (optionnel)')}
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  maxLength={200}
                />
              </>
            ) : (
              /* ── Image / Video picker ── */
              <>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-48 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors overflow-hidden relative"
                >
                  {preview ? (
                    type === 'video'
                      ? <video src={preview} className="w-full h-full object-cover" muted />
                      : <img src={preview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      {type === 'image' && <ImageIcon size={32} className="text-gray-300" />}
                      {type === 'video' && <Play size={32} className="text-gray-300" />}
                      <span className="text-sm text-gray-400">{t('story.clickToAdd', 'Cliquer pour ajouter')}</span>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept={ACCEPT[type]} className="hidden" onChange={handleFile} />
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder={t('story.captionPlaceholder', 'Légende (optionnel)')}
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  maxLength={200}
                />
              </>
            )}

            <button
              onClick={submit}
              disabled={submitting || !canSubmit()}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              {submitting ? t('story.publishing', 'Publication…') : t('story.publish', 'Publier la story')}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Story Viewer ──────────────────────────────────────────────────────────────
// Groups stories by user, navigates between groups and slides
function StoryViewer({ groups, startGroupIndex, currentUserId, onClose, onViewed, onDelete }: {
  groups: Story[][];
  startGroupIndex: number;
  currentUserId: number;
  onClose: () => void;
  onViewed: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const { t } = useTranslation();
  const DURATION = 5000; // ms per story slide

  const [groupIdx, setGroupIdx] = useState(startGroupIndex);
  const [slideIdx, setSlideIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused]     = useState(false);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<number>(Date.now());
  const elapsed   = useRef<number>(0);

  const group   = groups[groupIdx] ?? [];
  const story   = group[slideIdx];

  const goNextSlide = useCallback(() => {
    if (slideIdx < group.length - 1) {
      setSlideIdx(s => s + 1);
      setProgress(0);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx(g => g + 1);
      setSlideIdx(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [slideIdx, groupIdx, group.length, groups.length, onClose]);

  const goPrevSlide = useCallback(() => {
    if (slideIdx > 0) {
      setSlideIdx(s => s - 1);
      setProgress(0);
    } else if (groupIdx > 0) {
      setGroupIdx(g => g - 1);
      setSlideIdx(0);
      setProgress(0);
    }
  }, [slideIdx, groupIdx]);

  // Mark story as viewed + auto-advance
  useEffect(() => {
    if (!story) return;
    onViewed(story.id);
    elapsed.current = 0;
    startedAt.current = Date.now();
    setProgress(0);

    const tick = () => {
      if (paused) return;
      const pct = Math.min(((Date.now() - startedAt.current + elapsed.current) / DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) goNextSlide();
    };

    timerRef.current = setInterval(tick, 50);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [story?.id, groupIdx, slideIdx]);

  // Pause on hold
  const handlePointerDown = () => {
    setPaused(true);
    elapsed.current += Date.now() - startedAt.current;
    if (timerRef.current) clearInterval(timerRef.current);
  };
  const handlePointerUp = () => {
    setPaused(false);
    startedAt.current = Date.now();
    timerRef.current = setInterval(() => {
      const pct = Math.min(((Date.now() - startedAt.current + elapsed.current) / DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) goNextSlide();
    }, 50);
  };

  if (!story) return null;

  const isOwn = story.user_id === currentUserId;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Prev group */}
      {groupIdx > 0 && (
        <button
          onClick={e => { e.stopPropagation(); setGroupIdx(g => g - 1); setSlideIdx(0); setProgress(0); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white z-20 hidden md:block"
        >
          <ChevronLeft size={40} />
        </button>
      )}
      {/* Next group */}
      {groupIdx < groups.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); setGroupIdx(g => g + 1); setSlideIdx(0); setProgress(0); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white z-20 hidden md:block"
        >
          <ChevronRight size={40} />
        </button>
      )}

      <motion.div
        key={`${groupIdx}-${slideIdx}`}
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-[340px] h-[600px] rounded-3xl overflow-hidden shadow-2xl select-none"
        onClick={e => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={story.type === 'text' ? { background: story.background_color } : { background: '#1a1a2e' }}
      >
        {/* ── Progress bars ── */}
        <div className="absolute top-3 left-3 right-3 z-20 flex gap-1">
          {group.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/25 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{ width: i < slideIdx ? '100%' : i === slideIdx ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* ── Header ── */}
        <div className="absolute top-7 left-3 right-3 z-20 flex items-center gap-2">
          <img src={getAvatar(story.user)} alt="" className="w-9 h-9 rounded-full border-2 border-white/50 shrink-0" referrerPolicy="no-referrer" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-none">{story.user.name}</p>
            <p className="text-white/50 text-[11px] mt-0.5">{story.created_at}</p>
          </div>
          {isOwn && (
            <div className="flex items-center gap-1 text-white/60 text-[11px]">
              <Eye size={13} /><span>{story.views_count}</span>
            </div>
          )}
          {isOwn && (
            <button
              onClick={() => { onDelete(story.id); if (group.length === 1) onClose(); else goNextSlide(); }}
              className="text-white/60 hover:text-red-400 transition-colors ml-1"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors ml-1">
            <X size={18} />
          </button>
        </div>

        {/* ── Content ── */}
        <div className="absolute inset-0 flex items-center justify-center">
          {story.type === 'text' && (
            <p
              className="text-white px-8 text-xl leading-snug break-words w-full"
              style={{
                fontWeight: story.font_style === 'bold' ? 700 : 400,
                fontStyle: story.font_style === 'italic' ? 'italic' : 'normal',
                textAlign: story.text_align as 'left' | 'center' | 'right',
              }}
            >
              {story.content}
            </p>
          )}
          {story.type === 'image' && story.media_url && (
            <img
              src={story.media_url}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          )}
          {story.type === 'video' && story.media_url && (
            <video
              src={story.media_url}
              className="w-full h-full object-cover"
              autoPlay
              muted={false}
              playsInline
              loop={false}
              onEnded={goNextSlide}
            />
          )}
          {story.type === 'audio' && story.media_url && (
            <div className="flex flex-col items-center gap-5 px-8">
              <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center">
                <Music size={40} className="text-white/70" />
              </div>
              {story.content && (
                <p className="text-white/80 text-sm text-center">{story.content}</p>
              )}
              <audio
                src={story.media_url}
                autoPlay
                controls
                className="w-full"
                onEnded={goNextSlide}
              />
            </div>
          )}
        </div>

        {/* ── Caption overlay (image/video) ── */}
        {(story.type === 'image' || story.type === 'video') && story.content && (
          <div className="absolute bottom-16 left-0 right-0 px-5">
            <p className="text-white text-sm text-center bg-black/40 rounded-xl px-3 py-2 backdrop-blur-sm">
              {story.content}
            </p>
          </div>
        )}

        {/* ── Tap zones (prev / next slide) ── */}
        <button
          className="absolute left-0 top-0 w-1/3 h-full z-10 opacity-0"
          onClick={e => { e.stopPropagation(); goPrevSlide(); }}
          aria-label="Précédent"
        />
        <button
          className="absolute right-0 top-0 w-1/3 h-full z-10 opacity-0"
          onClick={e => { e.stopPropagation(); goNextSlide(); }}
          aria-label="Suivant"
        />
      </motion.div>
    </motion.div>
  );
}

// ── Stories Bar ───────────────────────────────────────────────────────────────
function StoriesBar({ currentUser, stories: initialStories }: {
  currentUser: LocalUser;
  stories: Story[];
}) {
  const { t } = useTranslation();
  const [stories, setStories]         = useState<Story[]>(initialStories);
  const [showCreator, setShowCreator] = useState(false);
  const [viewerInfo, setViewerInfo]   = useState<{ groupIdx: number } | null>(null);

  // Group stories by user (own first, then others)
  const ownStories   = stories.filter(s => s.user_id === currentUser.id);
  const otherStories = stories.filter(s => s.user_id !== currentUser.id);

  // Build groups: each user's stories as one group
  const userIds = [...new Set(otherStories.map(s => s.user_id))];
  const otherGroups: Story[][] = userIds.map(uid => otherStories.filter(s => s.user_id === uid));

  // All groups: own stories first (if any), then others sorted by unseen
  const allGroups: Story[][] = [
    ...(ownStories.length > 0 ? [ownStories] : []),
    ...otherGroups.sort((a, b) => {
      const aUnseen = a.some(s => !s.seen) ? 0 : 1;
      const bUnseen = b.some(s => !s.seen) ? 0 : 1;
      return aUnseen - bUnseen;
    }),
  ];

  const openViewer = (groupIdx: number) => setViewerInfo({ groupIdx });

  const handleCreated = (story: Story) => {
    setStories(prev => [story, ...prev]);
  };

  const handleViewed = (storyId: number) => {
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, seen: true } : s));
    fetch(`/stories/${storyId}/view`, {
      method: 'POST',
      headers: { 'X-CSRF-TOKEN': getCsrf() },
    }).catch(() => {});
  };

  const handleDelete = (storyId: number) => {
    fetch(`/stories/${storyId}`, {
      method: 'DELETE',
      headers: { 'X-CSRF-TOKEN': getCsrf() },
    })
      .then(r => { if (r.ok) setStories(prev => prev.filter(s => s.id !== storyId)); })
      .catch(() => {});
  };

  // Build the "bubbles" list for the bar
  const bubbles = [
    // Current user bubble
    {
      key: 'own',
      user: currentUser,
      hasStories: ownStories.length > 0,
      allSeen: ownStories.every(s => s.seen),
      isOwn: true,
      groupIdx: ownStories.length > 0 ? 0 : -1,
    },
    // Other users
    ...allGroups
      .filter(g => g[0].user_id !== currentUser.id)
      .map((group, i) => ({
        key: `group-${group[0].user_id}`,
        user: group[0].user,
        hasStories: true,
        allSeen: group.every(s => s.seen),
        isOwn: false,
        groupIdx: ownStories.length > 0 ? i + 1 : i,
      })),
  ];

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-1">
          {bubbles.map(({ key, user, hasStories, allSeen, isOwn: bubbleIsOwn, groupIdx: gi }) => (
            <div
              key={key}
              className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 group"
              onClick={() => {
                if (bubbleIsOwn && !hasStories) {
                  setShowCreator(true);
                } else if (gi >= 0) {
                  openViewer(gi);
                }
              }}
            >
              <div className="relative">
                <div
                  className={`w-14 h-14 rounded-full p-[2px] ${
                    bubbleIsOwn && !hasStories
                      ? 'border-2 border-dashed border-primary/40 group-hover:border-primary transition-colors'
                      : allSeen
                        ? 'bg-gray-200'
                        : 'bg-gradient-to-tr from-primary via-blue-400 to-amber-400'
                  }`}
                >
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-white">
                    <img src={getAvatar(user)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                </div>
                {bubbleIsOwn && (
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary border-2 border-white flex items-center justify-center cursor-pointer"
                    onClick={e => { e.stopPropagation(); setShowCreator(true); }}
                  >
                    <Plus size={10} className="text-white" />
                  </div>
                )}
              </div>
              <span className={`text-[10px] font-medium w-14 text-center truncate ${allSeen && hasStories ? 'text-gray-400' : 'text-gray-700'}`}>
                {bubbleIsOwn ? t('feed.myStory', 'Ma story') : user.name.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showCreator && (
          <StoryCreator
            currentUser={currentUser}
            onClose={() => setShowCreator(false)}
            onCreated={handleCreated}
          />
        )}
        {viewerInfo && allGroups.length > 0 && (
          <StoryViewer
            groups={allGroups}
            startGroupIndex={viewerInfo.groupIdx}
            currentUserId={currentUser.id}
            onClose={() => setViewerInfo(null)}
            onViewed={handleViewed}
            onDelete={handleDelete}
          />
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

// ── Compose Box ───────────────────────────────────────────────────────────────


// ─── Types ────────────────────────────────────────────────────────────────────

interface LocalUser {
  id: number;
  name: string;
  avatar?: string;
  permission: string;
}

interface MediaPreview {
  id: string;          // uuid local (pas encore en base)
  file: File;
  objectUrl: string;
  type: 'image' | 'video';
  name: string;
  size: number;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
const MAX_FILES      = 10;
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 Mo

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10); }

// function getAvatar(user: User) {
//   return user.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
// }

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 ** 2).toFixed(1)} Mo`;
}

function buildMediaPreview(file: File): MediaPreview | null {
  if (!ACCEPTED_MIME.includes(file.type)) return null;
  if (file.size > MAX_SIZE_BYTES) return null;
  return {
    id: uid(),
    file,
    objectUrl: URL.createObjectURL(file),
    type: file.type.startsWith('video/') ? 'video' : 'image',
    name: file.name,
    size: file.size,
  };
}

// ─── Sous-composant : grille de preview ───────────────────────────────────────

function MediaGrid({ items, onRemove }: { items: MediaPreview[]; onRemove: (id: string) => void }) {
  if (items.length === 0) return null;

  // Mise en page style Facebook : 1 / 2 / 3+ items
  const gridClass =
    items.length === 1 ? 'grid-cols-1' :
    items.length === 2 ? 'grid-cols-2' :
    items.length === 3 ? 'grid-cols-3' :
    items.length === 4 ? 'grid-cols-2' :
    'grid-cols-3';

  const maxVisible = 5;
  const visible  = items.slice(0, maxVisible);
  const overflow = items.length - maxVisible;

  return (
    <div className={`grid gap-1 rounded-xl overflow-hidden ${gridClass}`}>
      {visible.map((m, i) => {
        const isLast = i === maxVisible - 1 && overflow > 0;
        return (
          <div
            key={m.id}
            className={`relative group overflow-hidden bg-gray-900 ${
              items.length === 3 && i === 0 ? 'col-span-3 h-56' :
              items.length === 4 && i < 2   ? 'h-48' :
              items.length === 4 && i >= 2  ? 'h-40' :
              items.length >= 5 && i === 0  ? 'col-span-2 row-span-2 h-64' :
              'h-40'
            }`}
          >
            {/* Média */}
            {m.type === 'image' ? (
              <img
                src={m.objectUrl}
                alt={m.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="relative w-full h-full">
                <video src={m.objectUrl} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                    <Play size={16} className="text-white ml-0.5" fill="white" />
                  </div>
                </div>
              </div>
            )}

            {/* Overlay compteur (+N) */}
            {isLast && (
              <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                <span className="text-white text-2xl font-bold tracking-tight">+{overflow}</span>
              </div>
            )}

            {/* Bouton supprimer */}
            <button
              type="button"
              onClick={() => onRemove(m.id)}
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-black/80 z-10"
            >
              <X size={13} className="text-white" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────

export function ComposeBox({ currentUser, canAnnounce }: { currentUser: LocalUser; canAnnounce: boolean }) {
  const { t } = useTranslation();

  const [content,    setContent]    = useState('');
  const [type,       setType]       = useState<'post' | 'announcement'>('post');
  const [medias,     setMedias]     = useState<MediaPreview[]>([]);
  const [dragging,   setDragging]   = useState(false);
  const [errors,     setErrors]     = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress,   setProgress]   = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Auto-resize textarea ──
  const autoResize = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
  };

  // ── Ajouter des fichiers (validation) ──
  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files);
    const newErrors: string[] = [];
    const previews: MediaPreview[] = [];

    const remaining = MAX_FILES - medias.length;
    if (list.length > remaining) {
      newErrors.push(`Maximum ${MAX_FILES} fichiers par post.`);
    }

    list.slice(0, remaining).forEach(f => {
      if (!ACCEPTED_MIME.includes(f.type)) {
        newErrors.push(`${f.name} : format non supporté.`);
        return;
      }
      if (f.size > MAX_SIZE_BYTES) {
        newErrors.push(`${f.name} : fichier trop lourd (max 50 Mo).`);
        return;
      }
      const p = buildMediaPreview(f);
      if (p) previews.push(p);
    });

    setErrors(newErrors);
    if (previews.length) setMedias(prev => [...prev, ...previews]);
  }, [medias.length]);

  // ── Retirer un fichier ──
  const removeMedia = (id: string) => {
    setMedias(prev => {
      const m = prev.find(x => x.id === id);
      if (m) URL.revokeObjectURL(m.objectUrl);
      return prev.filter(x => x.id !== id);
    });
  };

  // ── Drag & Drop ──
  const onDragOver = (e: DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  // ── Submit ──
  const submit = () => {
    if ((!content.trim() && medias.length === 0) || submitting) return;
    setSubmitting(true);
    setProgress(0);

    // Construire FormData (Inertia router.post supporte FormData)
    const formData = new FormData();
    formData.append('content', content.trim());
    formData.append('type', type);
    medias.forEach(m => formData.append('media[]', m.file));

    router.post('/posts', formData, {
      forceFormData: true,
      onProgress: (p) => { if (p?.percentage) setProgress(p.percentage); },
      onSuccess: () => {
        setContent('');
        setType('post');
        medias.forEach(m => URL.revokeObjectURL(m.objectUrl));
        setMedias([]);
        setErrors([]);
        setSubmitting(false);
        setProgress(0);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
      },
      onError: (errs) => {
        const msgs = Object.values(errs) as string[];
        setErrors(msgs);
        setSubmitting(false);
        setProgress(0);
      },
    });
  };

  const canSubmit = (content.trim().length > 0 || medias.length > 0) && !submitting;

  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm transition-all duration-200 ${
        dragging ? 'border-blue-400 ring-2 ring-blue-200 bg-blue-50/30' : 'border-gray-100'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Barre de progression upload */}
      {submitting && (
        <div className="h-0.5 bg-gray-100 rounded-t-2xl overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="p-4 space-y-3">

        {/* Header : avatar + textarea */}
        <div className="flex items-start gap-3">
          <ClickableAvatar
            src={getAvatar(currentUser)}
            userName={currentUser.name}
            className="w-9 h-9 rounded-full shrink-0 ring-2 ring-blue-100"
            referrerPolicy="no-referrer"
          />
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => { setContent(e.target.value); autoResize(); }}
              placeholder={
                dragging
                  ? '📎 Déposez vos fichiers ici…'
                  : (t('feed.compose') || 'Quoi de neuf ?')
              }
              rows={2}
              className="w-full resize-none bg-gray-50 rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-200 border border-gray-100 transition-all"
            />
          </div>
        </div>

        {/* Drag overlay hint */}
        {dragging && (
          <div className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-blue-300 text-blue-500 text-sm font-medium bg-blue-50/50">
            <Upload size={16} />
            Déposez vos photos / vidéos ici
          </div>
        )}

        {/* Grille de preview */}
        <MediaGrid items={medias} onRemove={removeMedia} />

        {/* Compteur fichiers */}
        {medias.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="font-medium text-gray-600">{medias.length}/{MAX_FILES} fichier{medias.length > 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{formatSize(medias.reduce((acc, m) => acc + m.size, 0))} total</span>
            {medias.length < MAX_FILES && (
              <>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-blue-500 hover:text-blue-600 font-medium"
                >
                  <Plus size={11} /> Ajouter
                </button>
              </>
            )}
          </div>
        )}

        {/* Erreurs */}
        {errors.length > 0 && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 space-y-0.5">
            {errors.map((e, i) => (
              <p key={i} className="text-xs text-red-600">{e}</p>
            ))}
          </div>
        )}

        {/* Barre d'actions */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
          <div className="flex items-center gap-1.5">
            {/* Bouton média */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={medias.length >= MAX_FILES || submitting}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 hover:border-blue-300 hover:text-blue-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ImageIcon size={12} />
              {t('feed.media') || 'Photo / Vidéo'}
            </button>

            {/* Toggle annonce */}
            {canAnnounce && (
              <button
                type="button"
                onClick={() => setType(t => t === 'post' ? 'announcement' : 'post')}
                disabled={submitting}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  type === 'announcement'
                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-amber-200 hover:text-amber-500'
                }`}
              >
                <Megaphone size={12} />
                {t('feed.announcement') || 'Annonce'}
              </button>
            )}

            {/* Visibilité */}
            <button
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 hover:border-blue-300 hover:text-blue-500 transition-all cursor-pointer"
            >
              <Globe size={12} />
              {'Definir Audience'}
            </button>
          </div>

          {/* Bouton publier */}
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white transition-all shadow-sm ${
              canSubmit
                ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-200'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {submitting
              ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin block" />
              : <><Send size={12} /> {t('feed.publish') || 'Publier'}</>
            }
          </button>
        </div>
      </div>

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_MIME.join(',')}
        className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          if (e.target.files) {
            addFiles(e.target.files);
            e.target.value = ''; // reset pour permettre re-sélection du même fichier
          }
        }}
      />
    </div>
  );
}
function MediaGallery({ items }: { items: PostMedia[] }) {
  const [lightbox, setLightbox] = useState<PostMedia | null>(null);
 
  if (!items || items.length === 0) return null;
 
  const count = items.length;
 
  // Mise en page identique au ComposeBox preview
  const gridClass =
    count === 1 ? 'grid-cols-1' :
    count === 2 ? 'grid-cols-2' :
    count === 3 ? 'grid-cols-3' :
    count === 4 ? 'grid-cols-2' :
    'grid-cols-3';
 
  const maxVisible = 5;
  const visible  = items.slice(0, maxVisible);
  const overflow = count - maxVisible;
 
  return (
    <>
      <div className={`grid gap-0.5 overflow-hidden ${gridClass}`}>
        {visible.map((m, i) => {
          const isLast = i === maxVisible - 1 && overflow > 0;
          const heightClass =
            count === 1        ? 'h-80' :
            count === 2        ? 'h-56' :
            count === 3 && i === 0 ? 'col-span-3 h-56' :
            count >= 5 && i === 0  ? 'col-span-2 row-span-2 h-72' :
            'h-40';
 
          return (
            <div
              key={m.id}
              onClick={() => !isLast && setLightbox(m)}
              className={`relative group overflow-hidden bg-gray-900 cursor-pointer ${heightClass}`}
            >
              {m.type === 'image' ? (
                <img
                  src={m.url}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="relative w-full h-full">
                  <video
                    src={m.url}
                    className="w-full h-full object-cover"
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                      <Play size={18} className="text-white ml-1" fill="white" />
                    </div>
                  </div>
                </div>
              )}
 
              {/* Overlay +N */}
              {isLast && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">+{overflow}</span>
                </div>
              )}
 
              {/* Hover dim */}
              {!isLast && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-200" />
              )}
            </div>
          );
        })}
      </div>
 
      {/* Lightbox simple */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X size={28} />
          </button>
          {lightbox.type === 'image' ? (
            <img
              src={lightbox.url}
              alt=""
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <video
              src={lightbox.url}
              controls
              autoPlay
              className="max-w-full max-h-full rounded-lg"
              onClick={e => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </>
  );
}
// ── Post Card ─────────────────────────────────────────────────────────────────
function PostCard({ post, currentUser, onSendBravoClick }: { post: Post; currentUser: AppUser; onSendBravoClick: (recipients: AppUser[]) => void }) {
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
  const [republishing, setRepublishing] = useState(false);
  const [expandedContent, setExpandedContent] = useState(false);
  const [expandedOriginal, setExpandedOriginal] = useState(false);

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

  const contentLimit = 280;
  const isContentLong = post.content.length > contentLimit;
  const contentPreview = isContentLong && !expandedContent
    ? `${post.content.slice(0, contentLimit).trimEnd()}...`
    : post.content;

  const originalContent = post.original_post?.content ?? '';
  const isOriginalLong = originalContent.length > contentLimit;
  const originalContentPreview = isOriginalLong && !expandedOriginal
    ? `${originalContent.slice(0, contentLimit).trimEnd()}...`
    : originalContent;

  const republishPost = async () => {
    if (republishing) return;
    setRepublishing(true);

    try {
      const res = await fetch(`/posts/${post.id}/republish`, {
        method: 'POST',
        headers: { 'X-CSRF-TOKEN': getCsrf(), 'Accept': 'application/json' },
      });

      if (res.ok) {
        router.reload();
      } else {
        const error = await res.text();
        alert(error || t('feed.republishError', 'Impossible de republier ce post.'));
      }
    } finally {
      setRepublishing(false);
    }
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

        {/* Republier badge */}
        {post.original_post && (
          <div className="flex items-center gap-2 px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <Repeat size={14} className="text-gray-400" />
            <span>
              {t('feed.republishedBy', {
                name: post.user.name,
                original: post.original_post.user.name,
              })}
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="relative">
              <ClickableAvatar src={getAvatar(post.user)} userName={post.user.name} className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
              {/* Online indicator — real data needed */}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
            </div>
            <div>
              <UserLink userId={post.user.id} className="text-sm font-bold text-gray-800">{post.user.name}</UserLink>
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
            <>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{contentPreview}</p>
              {isContentLong && !editing && (
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-primary hover:underline"
                  onClick={() => setExpandedContent(prev => !prev)}
                >
                  {expandedContent ? t('feed.showLess', 'Voir moins') : t('feed.showMore', 'Voir plus')}
                </button>
              )}
            </>
          )}

          {!editing && post.original_post ? (
            <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50">
              <div className="px-4 py-4">
                {post.original_post.type === 'announcement' && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wide mb-3">
                    <Megaphone size={12} /> {t('feed.announcementLabel')}
                  </div>
                )}
                <div className="flex items-start gap-3 pb-3 border-b border-gray-200">
                  <ClickableAvatar
                    src={getAvatar(post.original_post.user)}
                    userName={post.original_post.user.name}
                    className="w-10 h-10 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <UserLink userId={post.original_post.user.id} className="text-sm font-bold text-gray-800">{post.original_post.user.name}</UserLink>
                    <p className="text-[11px] text-gray-400">
                      {post.original_post.user.role}
                      {post.original_post.user.department ? ` · ${post.original_post.user.department}` : ''}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {originalContentPreview}
                </p>
                {isOriginalLong && (
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold text-primary hover:underline"
                    onClick={() => setExpandedOriginal(prev => !prev)}
                  >
                    {expandedOriginal ? t('feed.showLess', 'Voir moins') : t('feed.showMore', 'Voir plus')}
                  </button>
                )}
              </div>
              {post.original_post.media && post.original_post.media.length > 0 && (
                <div className="px-4 pb-4">
                  <MediaGallery items={post.original_post.media} />
                </div>
              )}
              {(!post.original_post.media || post.original_post.media.length === 0) && post.original_post.media_url && (
                <div className="px-4 pb-4">
                  <img src={post.original_post.media_url} alt="" className="w-full rounded-2xl object-cover" />
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Médias uploadés (nouvelle logique) */}
              {post.media && post.media.length > 0 && (
                <div className="mt-3 rounded-xl overflow-hidden border border-gray-100">
                  <MediaGallery items={post.media} />
                </div>
              )}

              {/* Fallback : ancien champ media_url (URL externe) */}
              {(!post.media || post.media.length === 0) && post.media_url && (
                <div className="mt-3 rounded-xl overflow-hidden border border-gray-100">
                  <img src={post.media_url} alt="" className="w-full max-h-80 object-cover" />
                </div>
              )}
            </>
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
          <button
            onClick={republishPost}
            disabled={republishing}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-primary transition-colors cursor-pointer ml-auto"
            title={t('feed.republish', 'Republier')}
          >
            {republishing ? (
              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin block" />
            ) : (
              <Repeat size={14} />
            )}
          </button>
          {post.user && (
            <button
              onClick={() => onSendBravoClick([post.user as unknown as AppUser])}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-primary transition-colors cursor-pointer"
            >
              <Award size={15} /> {t('dashboard.sendBravo')}
            </button>
          )}
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
                      <ClickableAvatar
                        src={c.user ? getAvatar(c.user) : `https://ui-avatars.com/api/?name=?&background=e5e7eb&color=6b7280&size=32`}
                        userName={c.user?.name}
                        className="w-7 h-7 rounded-full shrink-0 mt-0.5"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 bg-white rounded-xl px-3 py-2 text-xs shadow-sm border border-gray-100">
                        {c.user
                          ? <UserLink userId={c.user.id} className="font-semibold text-gray-700">{c.user.name}</UserLink>
                          : <span className="font-semibold text-gray-700">Unknown</span>
                        }
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
                <ClickableAvatar src={getAvatar(currentUser)} userName={currentUser.name} className="w-7 h-7 rounded-full shrink-0" referrerPolicy="no-referrer" />
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
function Leaderboard({ users }: { users: AppUser[] }) {
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
            <ClickableAvatar src={getAvatar(u)} userName={u.name} className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
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

function SuggestedPeople({ users, currentUser }: { users: AppUser[]; currentUser: AppUser }) {
  const { t } = useTranslation();
  const suggestions = users.filter(u => u.id !== currentUser.id).slice(0, 4);
  const [followed, setFollowed] = useState<number[]>(() =>
    suggestions.filter(u => u.is_following).map(u => u.id)
  );

  function toggleFollow(userId: number) {
    setFollowed(f => f.includes(userId) ? f.filter(id => id !== userId) : [...f, userId]);
    router.post(`/users/${userId}/follow`, {}, { preserveScroll: true });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <h3 className="text-sm font-bold text-gray-800 mb-3">{t('feed.suggested', 'Collègues à suivre')}</h3>
      <div className="space-y-3">
        {suggestions.map(u => (
          <div key={u.id} className="flex items-center gap-2.5">
            <ClickableAvatar src={getAvatar(u)} userName={u.name} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-700 truncate">{u.name}</p>
              <p className="text-[10px] text-gray-400 truncate">{u.role}</p>
            </div>
            <button
              onClick={() => toggleFollow(u.id)}
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

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_COLLEAGUES = [
  { id: 1, name: "Mbarga Jean-Pierre", role: "Directeur Technique", department: "Direction Technique", location: "Bâtiment A", avatar: null, initials: "MJ" },
  { id: 2, name: "Ngo Biyong Chantal", role: "Responsable RH", department: "Ressources Humaines", location: "Bâtiment B", avatar: null, initials: "NC" },
  { id: 3, name: "Essama Paul", role: "Ingénieur Infrastructure", department: "Direction Technique", location: "Hangar 3", avatar: null, initials: "EP" },
  { id: 4, name: "Bella Marie-Claire", role: "Comptable Senior", department: "Direction Financière", location: "Bâtiment A", avatar: null, initials: "BM" },
  { id: 5, name: "Kouam David", role: "Agent de Sécurité", department: "Sécurité Portuaire", location: "Quai 7", avatar: null, initials: "KD" },
  { id: 6, name: "Tchouakam Sophie", role: "Juriste", department: "Direction Juridique", location: "Bâtiment C", avatar: null, initials: "TS" },
];

const DEPARTMENTS = [
  "Tous les départements",
  "Direction Technique",
  "Ressources Humaines",
  "Direction Financière",
  "Sécurité Portuaire",
  "Direction Juridique",
  "RPI – Régie du Patrimoine",
  "Direction Générale",
];

// ─── RPI Official Announcement Card ──────────────────────────────────────────
function RPIAnnouncementCard() {
  const [expanded, setExpanded] = useState(false);

  const tarifs = [
    { label: "Enfant (< 18 ans)", tarif: "23 075", ttc: "25 000" },
    { label: "Enfant (> 18 ans)", tarif: "28 075", ttc: "30 000" },
    { label: "Conjoint(e)", tarif: "28 075", ttc: "30 000" },
    { label: "Portuaire", tarif: "48 150", ttc: "50 000", highlight: true },
  ];

  return (
    <div className="rounded-2xl overflow-hidden border border-[#003d7a]/10 shadow-md shadow-[#003d7a]/5 bg-white">
      {/* Header band */}
      <div className="bg-gradient-to-r from-[#003d7a] to-[#0066c2] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
            <Building2 size={13} className="text-white" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-white/80">
            Annonce officielle
          </span>
        </div>
        <span className="text-[10px] text-white/50 font-medium">17 Mai 2026</span>
      </div>

      <div className="p-4">
        {/* Publisher row */}
        <div className="flex items-start gap-3 mb-4">
          {/* RPI Avatar */}
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#003d7a] to-[#0066c2] flex items-center justify-center shadow-md">
              <Anchor size={20} className="text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-[#0066c2] rounded-full p-0.5 border-2 border-white">
              <BadgeCheck size={11} className="text-white fill-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-black text-sm text-gray-900">RPI – Régie du Patrimoine</span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#003d7a]/8 text-[9px] font-black uppercase tracking-wider text-[#003d7a]">
                <BadgeCheck size={8} className="fill-[#003d7a] text-white" />
                Officiel
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Port Autonome de Douala · Patrimoine Immobilier</p>
          </div>
        </div>

        {/* Title */}
        <div className="mb-3">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 mb-2">
            <Star size={10} className="text-amber-500 fill-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Abonnements 2026</span>
          </div>
          <h3 className="text-sm font-black text-gray-900 leading-snug">
            Tarifs TTC – Abonnement Annuel aux Espaces Sportifs du Club PAD
          </h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Les tarifs TTC applicables pour l'acquisition de titres d'accès aux espaces sportifs
            (Tennis, Volley, Gym & Piscine) sont fixés comme suit, en Francs CFA :
          </p>
        </div>

        {/* Tariff table */}
        <div className="rounded-xl overflow-hidden border border-gray-100 mb-3">
          <div className="grid grid-cols-3 bg-[#003d7a]/5 px-3 py-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Bénéficiaire</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 text-right">Tarif HT</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#003d7a] text-right">Montant TTC</span>
          </div>
          {tarifs.map((t, i) => (
            <div
              key={i}
              className={`grid grid-cols-3 px-3 py-2.5 border-t border-gray-100 ${t.highlight ? "bg-[#003d7a]/3" : "bg-white"}`}
            >
              <span className={`text-xs font-semibold ${t.highlight ? "text-[#003d7a] font-black" : "text-gray-700"}`}>
                {t.label}
              </span>
              <span className="text-xs text-gray-500 text-right font-mono">{t.tarif} F</span>
              <span className={`text-xs text-right font-black font-mono ${t.highlight ? "text-[#003d7a]" : "text-gray-800"}`}>
                {t.ttc} F
              </span>
            </div>
          ))}
          <div className="grid grid-cols-3 px-3 py-2 bg-gray-50 border-t border-gray-200">
            <span className="text-[10px] text-gray-400 font-semibold col-span-2">TVA 19,25% incluse</span>
            <span className="text-[10px] text-gray-400 text-right font-mono">Filiales & Succursales</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400 font-medium">
            Valable pour les filiales, succursales et collaborateurs PAD
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] font-bold text-[#003d7a] hover:text-[#0066c2] transition-colors"
          >
            {expanded ? "Réduire" : "Plus d'infos"}
            <ChevronRight size={11} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
          </button>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 leading-relaxed space-y-1">
            <p>• Les abonnements sont valables pour l'année civile 2026.</p>
            <p>• L'accès couvre : Tennis, Volley-ball, Gymnase & Piscine.</p>
            <p>• Pour toute inscription, se rapprocher du service RPI au Bâtiment Principal.</p>
            <p>• Pièces requises : badge PAD + formulaire d'adhésion signé.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Find a Colleague Section ─────────────────────────────────────────────────
function FindColleague() {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("Tous les départements");
  const [showFilters, setShowFilters] = useState(false);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Colleague[]>([]);
  const [aiSummary, setAiSummary] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ current_page: number; last_page: number; per_page: number; total: number } | null>(null);
  const [departments, setDepartments] = useState<string[]>(DEPARTMENTS);

  // Helper : construire les initiales depuis le nom
  const getInitials = (name: string) =>
    name.split(" ")
      .slice(0, 2)
      .map(n => n[0]?.toUpperCase() ?? "")
      .join("");

  const handleSearch = useCallback(async (pageNumber = 1) => {
    if (!query.trim() && department === "Tous les départements") return;
    setLoading(true);
    setSearched(true);
    setAiSummary("");

    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("search", query.trim());
      if (department !== "Tous les départements") params.set("department", department);
      params.set("page", String(pageNumber));

      const res = await fetch(`/messenger/users?${params.toString()}`);
      if (!res.ok) throw new Error("Erreur réseau");

      const data = await res.json();
      const users = Array.isArray(data.users) ? data.users : [];

      const mapped: Colleague[] = users.map((u: any) => ({
        id: u.id,
        name: u.name,
        role: u.role || '',
        department: u.department ?? '',
        location: u.location ?? '',
        initials: u.avatar ?? getInitials(u.name),
      }));

      setResults(mapped);
      setPagination(data.pagination ?? null);
      setPage(pageNumber);
      setAiSummary(
        mapped.length > 0
          ? `${mapped.length} collègue${mapped.length > 1 ? "s" : ""} trouvé${mapped.length > 1 ? "s" : ""}.`
          : "Aucun collègue trouvé. Essayez d'autres mots-clés."
      );
    } catch {
      setAiSummary("Erreur lors de la recherche. Veuillez réessayer.");
      setResults([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [query, department]);

  useEffect(() => {
    if (!query.trim() && department === 'Tous les départements') {
      setResults([]);
      setPagination(null);
      setSearched(false);
      setAiSummary('');
      return;
    }

    const timeout = window.setTimeout(() => {
      handleSearch(1);
    }, 250);
    
    return () => window.clearTimeout(timeout);
  }, [query, department, handleSearch]);

  const colorMap = ["bg-[#003d7a]", "bg-[#0066c2]", "bg-emerald-600", "bg-purple-600", "bg-amber-600", "bg-rose-600"];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#003d7a]/8 flex items-center justify-center">
            <Users size={14} className="text-[#003d7a]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900">Retrouver un Collègue</h3>
            <p className="text-[10px] text-gray-400 font-medium">Recherche par description, poste ou département</p>
          </div>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${showFilters ? "bg-[#003d7a] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          <Filter size={10} />
          Filtres
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Ex: responsable informatique, quai 5, casquette bleue…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#003d7a]/20 focus:border-[#003d7a]/40 transition-all"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            )}
          </div>
          <button
            onClick={() => handleSearch()}
            className="px-4 py-2.5 rounded-xl bg-[#003d7a] hover:bg-[#0066c2] text-white text-xs font-black transition-all shadow-sm shadow-[#003d7a]/20"
          >
            Chercher
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
            <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1">
              <Briefcase size={9} /> Département
            </label>
            <select
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="w-full text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003d7a]/20"
            >
              {departments.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-6 gap-2 text-gray-400">
            <span className="w-4 h-4 border-2 border-[#003d7a] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold">Recherche en cours…</span>
          </div>
        )}

        {/* Results */}
        {!loading && searched && (
          <>
            <p className="text-[11px] font-semibold text-gray-500 px-0.5">{aiSummary}</p>
            <div className="space-y-2">
              {results.map((c, i) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-[#003d7a]/20 hover:bg-[#003d7a]/3 transition-all cursor-pointer group"
                >
                  <div className={`w-9 h-9 rounded-xl ${colorMap[i % colorMap.length]} flex items-center justify-center shrink-0 shadow-sm`}>
                    <span className="text-white text-[10px] font-black">{c.initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-gray-900 truncate">{c.name}</p>
                    <p className="text-[10px] text-gray-500 font-medium truncate">{c.role}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-0.5 text-[9px] text-gray-400 font-semibold">
                        <Briefcase size={8} /> {c.department}
                      </span>
                      <span className="flex items-center gap-0.5 text-[9px] text-gray-400 font-semibold">
                        <MapPin size={8} /> {c.location}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={13} className="text-gray-300 group-hover:text-[#003d7a] transition-colors shrink-0" />
                </div>
              ))}
            </div>

            {pagination && pagination.last_page > 1 && (
              <div className="flex items-center justify-between gap-3 mt-3 px-1">
                <span className="text-[10px] text-gray-500">
                  Page {pagination.current_page} sur {pagination.last_page}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pagination.current_page <= 1 || loading}
                    onClick={() => handleSearch(Math.max(1, pagination.current_page - 1))}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors border border-gray-200 bg-white text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-100"
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    disabled={pagination.current_page >= pagination.last_page || loading}
                    onClick={() => handleSearch(Math.min(pagination.last_page, pagination.current_page + 1))}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors border border-gray-200 bg-white text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-100"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Idle state */}
        {!searched && (
          <div className="flex items-center gap-3 py-3 px-3 rounded-xl bg-[#003d7a]/4 border border-[#003d7a]/8">
            <div className="w-8 h-8 rounded-lg bg-[#003d7a]/10 flex items-center justify-center shrink-0">
              <Search size={14} className="text-[#003d7a]/60" />
            </div>
            <p className="text-[11px] text-gray-500 leading-snug font-medium">
              Décrivez votre collègue : son rôle, son emplacement, son département ou tout autre détail que vous connaissez.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Feed Page ────────────────────────────────────────────────────────────
export default function Feed({ posts, currentUser, users, activeChallenge, bravoCount, bravoValues, announcements = [], stories = [] }: FeedProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';
  const canAnnounce = ['admin', 'manager'].includes(currentUser.permission);
  const sortedUsers = [...users].sort((a, b) => b.points_total - a.points_total);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [prefillBravoRecipients, setPrefillBravoRecipients] = useState<AppUser[]>([]);


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
            <ClickableAvatar src={getAvatar(sortedUsers[0])} userName={sortedUsers[0].name} className="w-20 h-20 rounded-2xl border-2 border-secondary/40 opacity-70" referrerPolicy="no-referrer" />
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

  const handleSendBravoFromPost = (recipients: AppUser[]) => {
    setPrefillBravoRecipients(recipients);
    setShowCreateModal(true);
  };

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

       
 
        
            {/* Announcements */}
            {ann.length > 0 && <AnnouncementBanner announcements={ann} />}

            {/* Stories */}
            <StoriesBar currentUser={currentUser} stories={stories} />

            {/* Compose */}
            <ComposeBox currentUser={currentUser} canAnnounce={canAnnounce} />
              {/* 1. RPI Announcement */}
        <RPIAnnouncementCard />

            {/* Feed label */}
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest">
                {t('feed.recentActivity', '')}
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
                  <PostCard post={post} currentUser={currentUser} onSendBravoClick={handleSendBravoFromPost} />
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

            {/* 2. Find a Colleague */}
        <FindColleague />

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
                  prefillRecipients={prefillBravoRecipients}
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