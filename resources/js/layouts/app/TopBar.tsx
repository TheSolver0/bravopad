import { useRef, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bell, Menu, Search, Trophy, Award, Home, MessageCircle,
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
import { RAIL_W_COLLAPSED, RAIL_W_EXPANDED } from './NavRail';

/* ── Types ── */
interface RecentNotification {
  id: string;
  read_at: string | null;
  created_at: string;
  data: Record<string, unknown>;
}

interface PageUser {
  id: number;
  name: string;
  avatar?: string;
  department?: string | null;
  role?: string;
}

/* ── Quick nav links pour la recherche ── */
const NAV_LINKS = [
  { href: '/feed',          label: "Fil d'actualité",  icon: Home },
  { href: '/dashboard',     label: 'Dashboard',         icon: LayoutDashboard },
  { href: '/messages',      label: 'Messages',          icon: MessageCircle },
  { href: '/groups',        label: 'Espaces',           icon: Hash },
  { href: '/team',          label: 'Équipe',            icon: Users },
  { href: '/history',       label: 'Mes Bravos',        icon: History },
  { href: '/challenges',    label: 'Challenges',        icon: Trophy },
  { href: '/engagement',    label: 'Sondages',          icon: ClipboardList },
  { href: '/shop',          label: 'Boutique',          icon: ShoppingBag },
  { href: '/chatbot',       label: 'Assistant IA',      icon: Bot },
  { href: '/notifications', label: 'Notifications',     icon: Bell },
  { href: '/settings/profile', label: 'Paramètres',    icon: Trophy },
];

/* ── Titre de notification ── */
function NotifTitle({ data }: { data: Record<string, unknown> }) {
  const { t } = useTranslation();
  if (typeof data.title === 'string') return <>{data.title}</>;
  if (data.type === 'bravo_received') return <>{t('notifications.bravoReceived')}</>;
  if (data.type === 'reward_redemption_submitted') return <>{t('notifications.pointsExchange')}</>;
  if (data.type === 'reward_redemption_outcome') return <>{t('notifications.exchangeUpdated')}</>;
  if (data.type === 'bravo_anomaly_spike') return <>{t('notifications.bravoAlert')}</>;
  return <>{t('notifications.notification')}</>;
}

/* ── SearchBar avec dropdown fonctionnel ── */
function SearchBar({ users }: { users: PageUser[] }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const q = query.trim().toLowerCase();

  const filteredLinks = q
    ? NAV_LINKS.filter(l => l.label.toLowerCase().includes(q))
    : NAV_LINKS.slice(0, 6);

  const filteredUsers = q
    ? users.filter(u => u.name.toLowerCase().includes(q)).slice(0, 5)
    : [];

  const hasResults = filteredLinks.length > 0 || filteredUsers.length > 0;

  function handleFocus() {
    clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function handleBlur() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  function handleSelect(href: string) {
    setOpen(false);
    setQuery('');
    router.visit(href);
  }

  function handleClear() {
    setQuery('');
    inputRef.current?.focus();
  }

  return (
    <div className="relative w-full max-w-lg">
      {/* Input */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={e => {
            if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
          }}
          placeholder={t('search.placeholder', 'Rechercher personnes, bravos, pages...')}
          className="w-full h-9 pl-9 pr-8 bg-surface-container-low hover:bg-surface-container rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50 border border-transparent focus:border-primary/20 focus:bg-surface-container focus:outline-none transition-all"
        />
        {query && (
          <button
            onMouseDown={e => { e.preventDefault(); handleClear(); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Dropdown résultats */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-zinc-900 border border-border rounded-2xl shadow-xl z-50 overflow-hidden max-h-[60vh] overflow-y-auto"
          >
            {/* Personnes (si query) */}
            {filteredUsers.length > 0 && (
              <div className="p-2">
                <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">
                  Personnes
                </p>
                {filteredUsers.map(u => (
                  <button
                    key={u.id}
                    onMouseDown={() => handleSelect(`/profile/${u.id}`)}
                    className="flex items-center gap-2.5 w-full px-2 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden shrink-0">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[11px] font-bold text-primary">{u.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-on-surface truncate">{u.name}</p>
                      {u.department && (
                        <p className="text-[10.5px] text-on-surface-variant truncate">{u.department}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Navigation */}
            {filteredLinks.length > 0 && (
              <div className={`p-2 ${filteredUsers.length > 0 ? 'border-t border-border' : ''}`}>
                <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">
                  {q ? 'Pages' : 'Navigation rapide'}
                </p>
                {filteredLinks.map(link => (
                  <button
                    key={link.href}
                    onMouseDown={() => handleSelect(link.href)}
                    className="flex items-center gap-2.5 w-full px-2 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left group"
                  >
                    <span className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-zinc-800 group-hover:bg-gray-200 dark:group-hover:bg-zinc-700 flex items-center justify-center shrink-0 transition-colors">
                      <link.icon size={15} className="text-on-surface-variant" />
                    </span>
                    <span className="text-[12.5px] font-semibold text-on-surface">{link.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Aucun résultat */}
            {q && !hasResults && (
              <div className="flex flex-col items-center py-8 text-on-surface-variant/50">
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

/* ── TopBar ── */
interface TopBarProps {
  navRailWidth?: number;
  onMenuOpen?: () => void;
  onCreateBravo?: () => void;
}

export default function TopBar({ navRailWidth = RAIL_W_COLLAPSED, onMenuOpen, onCreateBravo }: TopBarProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';

  const page = usePage<{
    auth: {
      user?: { id: number; name: string; email: string; avatar?: string; points_total?: number };
      unread_notifications_count?: number;
      recent_notifications?: RecentNotification[];
    };
    users?: PageUser[];
    team?: { data?: PageUser[] };
  }>();

  const { auth } = page.props;
  const user = auth?.user;
  const unread = auth?.unread_notifications_count ?? 0;
  const recent = auth?.recent_notifications ?? [];
  const allUsers: PageUser[] = page.props.users ?? page.props.team?.data ?? [];

  return (
    <header className="sticky top-0 z-40 h-14 flex items-center bg-background border-b border-border shrink-0">

      {/* Zone logo desktop — suit la largeur du NavRail via transition CSS */}
      <div
        className={`hidden md:flex items-center h-full border-r border-border shrink-0 overflow-hidden transition-[width] duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
          navRailWidth > RAIL_W_COLLAPSED ? 'w-[240px]' : 'w-[72px]'
        }`}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5 px-3 min-w-0 w-full">
          <img
            src="/assets/images/onepad-logo.png"
            alt="OnePAD"
            className="w-7 h-7 object-contain shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div
            className={`min-w-0 transition-[opacity,transform] duration-200 ${
              navRailWidth > RAIL_W_COLLAPSED
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-2 pointer-events-none'
            }`}
          >
            <p className="text-[14px] font-extrabold text-on-surface leading-none whitespace-nowrap">OnePAD</p>
            <p className="text-[9px] text-on-surface-variant whitespace-nowrap">Port Autonome de Douala</p>
          </div>
        </Link>
      </div>

      {/* Mobile: hamburger + nom */}
      <div className="flex md:hidden items-center gap-1 pl-2 shrink-0">
        {onMenuOpen && (
          <Button variant="ghost" size="icon" onClick={onMenuOpen} className="text-on-surface-variant">
            <Menu size={20} />
          </Button>
        )}
        <Link href="/dashboard" className="font-extrabold text-[15px] tracking-tight text-on-surface">
          OnePAD
        </Link>
      </div>

      {/* Barre de recherche centrale */}
      <div className="flex-1 flex items-center px-3 md:px-5 min-w-0">
        <SearchBar users={allUsers} />
      </div>

      {/* Actions à droite */}
      <div className="flex items-center gap-1 pr-3 md:pr-4 shrink-0">

        {/* + Bravo (desktop) */}
        {onCreateBravo && (
          <Button
            onClick={onCreateBravo}
            size="sm"
            className="hidden md:flex items-center gap-1.5 h-8 px-3 rounded-xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all"
          >
            <Award size={14} />
            {t('nav.sendBravo', 'Bravo')}
          </Button>
        )}

        <LanguageToggle />

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-on-surface-variant">
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-black bg-red-500 text-white rounded-full border-2 border-background">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto">
            <DropdownMenuLabel className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
              {t('notifications.recent')}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {recent.length === 0 ? (
              <div className="px-2 py-6 text-sm text-on-surface-variant text-center">{t('notifications.none')}</div>
            ) : (
              recent.map(n => (
                <DropdownMenuItem
                  key={n.id}
                  className={`flex flex-col items-start gap-0.5 cursor-pointer ${!n.read_at ? 'bg-primary/5' : ''}`}
                  onSelect={() => {
                    if (!n.read_at) {
                      router.post(`/notifications/${n.id}/read`, {}, { preserveScroll: true });
                    }
                  }}
                >
                  <div className="flex items-start gap-2 w-full">
                    {!n.read_at && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />}
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-on-surface block"><NotifTitle data={n.data} /></span>
                      {typeof n.data.body === 'string' && (
                        <span className="text-[11px] text-on-surface-variant line-clamp-2 block">{n.data.body}</span>
                      )}
                      <span className="text-[10px] text-on-surface-variant/70">
                        {new Date(n.created_at).toLocaleString(locale)}
                      </span>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/notifications" className="w-full cursor-pointer text-primary font-bold text-xs">
                {t('notifications.viewAll')}
              </Link>
            </DropdownMenuItem>
            {unread > 0 && (
              <DropdownMenuItem asChild>
                <Link href="/notifications/read-all" method="post" className="w-full cursor-pointer text-xs font-semibold">
                  {t('notifications.markAllRead')}
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Points (desktop large) */}
        {user && (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/5 rounded-xl border border-primary/10">
            <Trophy size={13} className="text-secondary" />
            <span className="text-xs font-black text-primary">{(user.points_total ?? 0).toLocaleString()} pts</span>
          </div>
        )}

        {/* Avatar + menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-full w-9 h-9 p-0">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden ring-2 ring-primary/20">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[12px] font-bold text-primary">{user?.name?.charAt(0)?.toUpperCase() ?? 'U'}</span>
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <UserMenuContent user={user as any} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
