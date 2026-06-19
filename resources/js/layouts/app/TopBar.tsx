import { useRef, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bell, Menu, Search, Trophy, Home, MessageCircle,
  Users, Hash, ShoppingBag, ClipboardList, Bot, X,
  History, LayoutDashboard,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UserMenuContent } from '@/components/user-menu-content';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import LanguageToggle from '@/components/LanguageToggle';
import { RAIL_W_COLLAPSED } from './NavRail';

/* ─────────────────────────────────── Types ── */
interface RecentNotification {
  id: string;
  read_at: string | null;
  created_at: string;
  data: Record<string, unknown>;
}

interface RecentMessage {
  id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface PageUser {
  id: number;
  name: string;
  avatar?: string;
  department?: string | null;
}

/* ─────────────────────────── Avatar initiales ── */
function avatarBg(name: string): string {
  const palette = [
    '#0B3D7A', '#1E5BAB', '#5E7320', '#B5810A',
    '#C98A4B', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6',
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}

/* ──────────────────── Quick nav pour la recherche ── */
const NAV_LINKS = [
  { href: '/dashboard',      label: 'Accueil',         icon: Home },
  { href: '/messages',       label: 'Messages',        icon: MessageCircle },
  { href: '/groups',         label: 'Canaux',          icon: Hash },
  { href: '/team',           label: 'Collègues',       icon: Users },
  { href: '/history',        label: 'Mes Bravos',      icon: History },
  { href: '/challenges',     label: 'Défis',           icon: Trophy },
  { href: '/engagement',     label: 'Sondages',        icon: ClipboardList },
  { href: '/shop',           label: 'Boutique',        icon: ShoppingBag },
  { href: '/chatbot',        label: 'Assistant IA',    icon: Bot },
  { href: '/notifications',  label: 'Notifications',   icon: Bell },
  { href: '/hr/dashboard',   label: 'Tableau de bord', icon: LayoutDashboard },
];

/* ────────────────── Titre notification ── */
function NotifTitle({ data }: { data: Record<string, unknown> }) {
  const { t } = useTranslation();
  if (typeof data.title === 'string') return <>{data.title}</>;
  if (data.type === 'bravo_received')             return <>{t('notifications.bravoReceived', 'Bravo reçu')}</>;
  if (data.type === 'reward_redemption_submitted') return <>{t('notifications.pointsExchange', 'Échange de points')}</>;
  if (data.type === 'reward_redemption_outcome')  return <>{t('notifications.exchangeUpdated', 'Échange mis à jour')}</>;
  if (data.type === 'bravo_anomaly_spike')        return <>{t('notifications.bravoAlert', 'Alerte Bravo')}</>;
  return <>{t('notifications.notification', 'Notification')}</>;
}

/* ──────────────────────────── SearchBar ── */
function SearchBar({ users }: { users: PageUser[] }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [open,  setOpen]  = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const q = query.trim().toLowerCase();
  const filteredLinks = q
    ? NAV_LINKS.filter(l => l.label.toLowerCase().includes(q))
    : NAV_LINKS.slice(0, 6);
  const filteredUsers = q
    ? users.filter(u => u.name.toLowerCase().includes(q)).slice(0, 5)
    : [];
  const hasResults = filteredLinks.length > 0 || filteredUsers.length > 0;

  const handleSelect = (href: string) => { setOpen(false); setQuery(''); router.visit(href); };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A99AD] pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { clearTimeout(closeTimer.current); setOpen(true); }}
          onBlur={() => { closeTimer.current = setTimeout(() => setOpen(false), 150); }}
          onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); } }}
          placeholder={t('search.placeholder', 'Rechercher personnes, bravos, pages...')}
          className="w-full h-9 pl-9 pr-8 bg-[#F1F5FA] hover:bg-[#E9EEF5] rounded-xl text-sm text-[#0A2A4F] placeholder:text-[#8A99AD] border border-transparent focus:border-[#0B3D7A]/20 focus:bg-white focus:outline-none transition-all"
        />
        {query && (
          <button
            onMouseDown={e => { e.preventDefault(); setQuery(''); inputRef.current?.focus(); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A99AD] hover:text-[#46586E] transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[#E9EEF5] rounded-2xl shadow-[0_8px_24px_rgba(11,45,92,0.12)] z-50 overflow-hidden max-h-[60vh] overflow-y-auto"
          >
            {filteredUsers.length > 0 && (
              <div className="p-2">
                <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-widest text-[#8A99AD]">Personnes</p>
                {filteredUsers.map(u => (
                  <button
                    key={u.id}
                    onMouseDown={() => handleSelect(`/profile/${u.id}`)}
                    className="flex items-center gap-2.5 w-full px-2 py-2 rounded-xl hover:bg-[#F1F5FA] transition-colors text-left"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 overflow-hidden"
                      style={u.avatar ? {} : { backgroundColor: avatarBg(u.name) }}
                    >
                      {u.avatar
                        ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                        : getInitials(u.name)
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-[#0A2A4F] truncate">{u.name}</p>
                      {u.department && <p className="text-[10.5px] text-[#64748B] truncate">{u.department}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {filteredLinks.length > 0 && (
              <div className={`p-2 ${filteredUsers.length > 0 ? 'border-t border-[#E9EEF5]' : ''}`}>
                <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-widest text-[#8A99AD]">
                  {q ? 'Pages' : 'Navigation rapide'}
                </p>
                {filteredLinks.map(link => (
                  <button
                    key={link.href}
                    onMouseDown={() => handleSelect(link.href)}
                    className="flex items-center gap-2.5 w-full px-2 py-2 rounded-xl hover:bg-[#F1F5FA] transition-colors text-left group"
                  >
                    <span className="w-8 h-8 rounded-xl bg-[#F1F5FA] group-hover:bg-[#E9EEF5] flex items-center justify-center shrink-0 transition-colors">
                      <link.icon size={14} className="text-[#46586E]" />
                    </span>
                    <span className="text-[12.5px] font-semibold text-[#0A2A4F]">{link.label}</span>
                  </button>
                ))}
              </div>
            )}

            {q && !hasResults && (
              <div className="flex flex-col items-center py-8 text-[#8A99AD]">
                <Search size={24} className="mb-2 opacity-40" />
                <p className="text-sm">Aucun résultat pour «&nbsp;{query}&nbsp;»</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ──────────────────────────────── TopBar ── */
interface TopBarProps {
  navRailWidth?: number;
  onMenuOpen?: () => void;
  onCreateBravo?: () => void;
}

export default function TopBar({
  navRailWidth = RAIL_W_COLLAPSED,
  onMenuOpen,
  onCreateBravo,
}: TopBarProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';

  const page = usePage<{
    auth: {
      user?: { id: number; name: string; email: string; avatar?: string; points_total?: number };
      unread_notifications_count?: number;
      recent_notifications?: RecentNotification[];
      unread_messages_count?: number;
      recent_messages?: RecentMessage[];
    };
    users?: PageUser[];
    team?: { data?: PageUser[] };
  }>();

  const { auth } = page.props;
  const user           = auth?.user;
  const unread         = auth?.unread_notifications_count ?? 0;
  const recent         = auth?.recent_notifications ?? [];
  const unreadMessages = auth?.unread_messages_count ?? 0;
  const recentMessages = auth?.recent_messages ?? [];
  const allUsers: PageUser[] = page.props.users ?? page.props.team?.data ?? [];

  const userInitials = user ? getInitials(user.name) : 'U';
  const userBg       = user ? avatarBg(user.name) : '#0B3D7A';

  const isExpanded = navRailWidth > RAIL_W_COLLAPSED;

  return (
    <header className="sticky top-0 z-40 h-16 flex items-center bg-white border-b border-[#E4EAF2] shrink-0">

      {/* ── Zone logo (desktop) — suit la largeur du NavRail ── */}
      <div
        className={`hidden md:flex items-center h-full border-r border-[#E4EAF2] shrink-0 overflow-hidden transition-[width] duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isExpanded ? 'w-[246px]' : 'w-[72px]'
        }`}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5 px-3 min-w-0 w-full group">
          <img
            src="/assets/images/onepad-logo.png"
            alt="OnePAD"
            className="w-9 h-9 rounded-xl shrink-0 object-contain"
          />

          <div
            className={`min-w-0 transition-[opacity,transform] duration-200 ${
              isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'
            }`}
          >
            <p className="text-[14px] font-extrabold text-[#0A2A4F] leading-none whitespace-nowrap tracking-tight">
              OnePAD
            </p>
            <p className="text-[9px] text-[#64748B] whitespace-nowrap uppercase tracking-wider font-semibold mt-0.5">
              Port Autonome de Douala
            </p>
          </div>
        </Link>
      </div>

      {/* ── Mobile : hamburger + nom ── */}
      <div className="flex md:hidden items-center gap-1 pl-2 shrink-0">
        {onMenuOpen && (
          <Button variant="ghost" size="icon" onClick={onMenuOpen} className="text-[#46586E]">
            <Menu size={20} />
          </Button>
        )}
        <Link href="/dashboard" className="font-extrabold text-[15px] tracking-tight text-[#0A2A4F]">
          OnePAD
        </Link>
      </div>

      {/* ── Barre de recherche centrale ── */}
      <div className="flex-1 flex items-center px-4 md:px-6 min-w-0">
        <SearchBar users={allUsers} />
      </div>

      {/* ── Actions à droite ── */}
      <div className="flex items-center gap-1.5 pr-4 shrink-0">

        {/* Bouton Envoyer un Bravo (lime, desktop) */}
        {onCreateBravo && (
          <button
            onClick={onCreateBravo}
            className="hidden md:flex items-center gap-1.5 h-9 px-4 rounded-[10px] text-[13px] font-bold transition-all active:scale-95 cursor-pointer"
            style={{ background: '#C6E25A', color: '#0A2A4F' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#B8D44C')}
            onMouseLeave={e => (e.currentTarget.style.background = '#C6E25A')}
          >
            <Trophy size={14} strokeWidth={2.2} />
            {t('nav.sendBravo', 'Envoyer un Bravo')}
          </button>
        )}

        {/* Sélecteur langue */}
        <LanguageToggle />

        {/* Icône Messages */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl text-[#46586E] hover:bg-[#F1F5FA] transition-colors cursor-pointer">
              <MessageCircle size={18} strokeWidth={1.8} />
              {unreadMessages > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-black bg-red-500 text-white rounded-full border-2 border-white">
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto border-[#E9EEF5] shadow-[0_8px_24px_rgba(11,45,92,0.12)]">
            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-[#8A99AD]">
              Messages récents
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {recentMessages.length === 0 ? (
              <div className="px-2 py-6 text-sm text-[#64748B] text-center">
                Aucun nouveau message
              </div>
            ) : (
              recentMessages.map(msg => (
                <DropdownMenuItem
                  key={msg.id}
                  className={`flex flex-col items-start gap-0.5 cursor-pointer ${!msg.read_at ? 'bg-[#0B3D7A]/4' : ''}`}
                  onSelect={() => router.visit('/messages')}
                >
                  <div className="flex items-start gap-2 w-full">
                    {!msg.read_at && <span className="w-1.5 h-1.5 rounded-full bg-[#0B3D7A] shrink-0 mt-1.5" />}
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-[#0A2A4F] block">{msg.sender_name}</span>
                      <span className="text-[11px] text-[#64748B] line-clamp-2 block">{msg.content}</span>
                      <span className="text-[10px] text-[#8A99AD]">
                        {new Date(msg.created_at).toLocaleString(locale)}
                      </span>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/messages" className="w-full cursor-pointer text-[#0B3D7A] font-bold text-xs">
                Voir tous les messages
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Cloche notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl text-[#46586E] hover:bg-[#F1F5FA] transition-colors cursor-pointer">
              <Bell size={18} strokeWidth={1.8} />
              {unread > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-black bg-red-500 text-white rounded-full border-2 border-white">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto border-[#E9EEF5] shadow-[0_8px_24px_rgba(11,45,92,0.12)]">
            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-[#8A99AD]">
              {t('notifications.recent', 'Récentes')}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {recent.length === 0 ? (
              <div className="px-2 py-6 text-sm text-[#64748B] text-center">
                {t('notifications.none', 'Aucune notification')}
              </div>
            ) : (
              recent.map(n => (
                <DropdownMenuItem
                  key={n.id}
                  className={`flex flex-col items-start gap-0.5 cursor-pointer ${!n.read_at ? 'bg-[#0B3D7A]/4' : ''}`}
                  onSelect={() => {
                    if (!n.read_at) router.post(`/notifications/${n.id}/read`, {}, { preserveScroll: true });
                  }}
                >
                  <div className="flex items-start gap-2 w-full">
                    {!n.read_at && <span className="w-1.5 h-1.5 rounded-full bg-[#0B3D7A] shrink-0 mt-1.5" />}
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-[#0A2A4F] block">
                        <NotifTitle data={n.data} />
                      </span>
                      {typeof n.data.body === 'string' && (
                        <span className="text-[11px] text-[#64748B] line-clamp-2 block">{n.data.body}</span>
                      )}
                      <span className="text-[10px] text-[#8A99AD]">
                        {new Date(n.created_at).toLocaleString(locale)}
                      </span>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/notifications" className="w-full cursor-pointer text-[#0B3D7A] font-bold text-xs">
                {t('notifications.viewAll', 'Voir toutes')}
              </Link>
            </DropdownMenuItem>
            {unread > 0 && (
              <DropdownMenuItem asChild>
                <Link href="/notifications/read-all" method="post" className="w-full cursor-pointer text-xs font-semibold text-[#64748B]">
                  {t('notifications.markAllRead', 'Tout marquer comme lu')}
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Pill points (or) — desktop */}
        {user && (
          <div
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] border text-[12px] font-black cursor-default"
            style={{ background: '#FFF6E0', borderColor: '#F6E2A8', color: '#B5810A' }}
          >
            <Trophy size={12} className="text-[#F2B205]" strokeWidth={2.5} />
            {(user.points_total ?? 0).toLocaleString()} pts
          </div>
        )}

        {/* Avatar utilisateur + menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative w-9 h-9 rounded-full p-0 cursor-pointer flex items-center justify-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden text-white ring-2 ring-[#E4EAF2] text-[12px] font-bold"
                style={user?.avatar ? {} : { backgroundColor: userBg }}
              >
                {user?.avatar
                  ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  : userInitials
                }
              </div>
              {/* Pastille présence */}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 border-[#E9EEF5] shadow-[0_8px_24px_rgba(11,45,92,0.12)]">
            <UserMenuContent user={user as any} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
