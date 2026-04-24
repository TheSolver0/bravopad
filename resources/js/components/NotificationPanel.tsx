import React, { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Bell, Trophy, Star, Gift, X, Check, PartyPopper } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppNotification } from '../pages/types';

interface Props {
  initialUnreadCount?: number;
}

function NotifIcon({ type }: { type: string }) {
  if (type === 'bravo_received')  return <Star size={14} className="text-yellow-500" />;
  if (type === 'badge_earned')    return <Trophy size={14} className="text-purple-500" />;
  if (type === 'celebration')     return <PartyPopper size={14} className="text-pink-500" />;
  return <Bell size={14} className="text-gray-400" />;
}

function notifTitle(n: AppNotification): string {
  const d = n.data as Record<string, string | number>;
  if (n.type === 'bravo_received')
    return `${d.sender_name ?? 'Quelqu\'un'} vous a envoyé un ${d.badge_label ?? 'Bravo'} !`;
  if (n.type === 'badge_earned')
    return `Badge débloqué : ${d.badge_label}`;
  if (n.type === 'celebration')
    return String(d.message ?? 'Célébration !');
  return 'Nouvelle notification';
}

export default function NotificationPanel({ initialUnreadCount = 0 }: Props) {
  const [open, setOpen]           = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread]       = useState(initialUnreadCount);
  const [loading, setLoading]     = useState(false);

  // Re-sync from props when navigating
  useEffect(() => { setUnread(initialUnreadCount); }, [initialUnreadCount]);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await fetch('/notifications', { headers: { Accept: 'application/json' } });
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnread(data.unread_count ?? 0);
    } finally {
      setLoading(false);
    }
  }

  function toggleOpen() {
    if (!open) fetchNotifications();
    setOpen(o => !o);
  }

  async function markRead(id: string) {
    await fetch(`/notifications/${id}/read`, { method: 'POST', headers: { 'X-CSRF-TOKEN': getCsrf() } });
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
    );
    setUnread(u => Math.max(0, u - 1));
  }

  async function markAllRead() {
    await fetch('/notifications/read-all', { method: 'POST', headers: { 'X-CSRF-TOKEN': getCsrf() } });
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnread(0);
  }

  return (
    <div className="relative">
      <button
        onClick={toggleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors cursor-pointer text-gray-500"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-11 z-50 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <Bell size={14} className="text-primary" />
                  <span className="font-bold text-sm text-gray-800">Notifications</span>
                  {unread > 0 && (
                    <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-full">{unread}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      Tout lire
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {loading && (
                  <div className="py-8 text-center text-gray-400 text-sm">Chargement…</div>
                )}
                {!loading && notifications.length === 0 && (
                  <div className="py-8 text-center">
                    <Bell size={28} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-sm text-gray-400">Aucune notification</p>
                  </div>
                )}
                {!loading && notifications.map(n => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${!n.read_at ? 'bg-primary/3' : ''}`}
                    onClick={() => { if (!n.read_at) markRead(n.id); }}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      n.type === 'bravo_received' ? 'bg-yellow-50' :
                      n.type === 'badge_earned'   ? 'bg-purple-50' :
                      n.type === 'celebration'    ? 'bg-pink-50'   : 'bg-gray-50'
                    }`}>
                      <NotifIcon type={n.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-snug ${!n.read_at ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                        {notifTitle(n)}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{n.created_at}</p>
                    </div>
                    {!n.read_at && (
                      <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function getCsrf(): string {
  return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}
