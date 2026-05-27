import { Link, router, usePage } from '@inertiajs/react';
import { Bell, Menu, Search, Trophy, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UserMenuContent } from '@/components/user-menu-content';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import LanguageToggle from '@/components/LanguageToggle';

interface RecentNotification {
  id: string;
  read_at: string | null;
  created_at: string;
  data: Record<string, unknown>;
}

function NotifTitle({ data }: { data: Record<string, unknown> }) {
  const { t } = useTranslation();
  if (typeof data.title === 'string') return <>{data.title}</>;
  if (data.type === 'bravo_received') return <>{t('notifications.bravoReceived')}</>;
  if (data.type === 'reward_redemption_submitted') return <>{t('notifications.pointsExchange')}</>;
  if (data.type === 'reward_redemption_outcome') return <>{t('notifications.exchangeUpdated')}</>;
  if (data.type === 'bravo_anomaly_spike') return <>{t('notifications.bravoAlert')}</>;
  return <>{t('notifications.notification')}</>;
}

interface TopBarProps {
  onMenuOpen?: () => void;
  onCreateBravo?: () => void;
}

export default function TopBar({ onMenuOpen, onCreateBravo }: TopBarProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';

  const { auth } = usePage<{
    auth: {
      user?: { id: number; name: string; email: string; avatar?: string; points_total?: number };
      unread_notifications_count?: number;
      recent_notifications?: RecentNotification[];
    };
  }>().props;

  const user = auth?.user;
  const unread = auth?.unread_notifications_count ?? 0;
  const recent = auth?.recent_notifications ?? [];

  return (
    <header className="sticky top-0 z-40 h-14 flex items-center bg-background border-b border-border shrink-0">

      {/* Desktop: zone logo 72px alignée avec le NavRail */}
      <div className="hidden md:flex items-center justify-center w-[72px] h-full border-r border-border shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-surface-container-low transition-all"
        >
          <img
            src="/assets/images/onepad-logo.png"
            alt="OnePAD"
            className="w-7 h-7 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </Link>
      </div>

      {/* Mobile: hamburger + nom de l'app */}
      <div className="flex md:hidden items-center gap-1 pl-2 shrink-0">
        {onMenuOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuOpen}
            className="text-on-surface-variant"
          >
            <Menu size={20} />
          </Button>
        )}
        <Link href="/dashboard" className="font-extrabold text-[15px] tracking-tight text-on-surface">
          OnePAD
        </Link>
      </div>

      {/* Barre de recherche centrale */}
      <div className="flex-1 flex items-center px-3 md:px-6 min-w-0">
        <div className="relative w-full max-w-lg">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 pointer-events-none" />
          <input
            type="text"
            placeholder={t('search.placeholder', 'Rechercher personnes, bravos, groupes...')}
            className="w-full h-9 pl-9 pr-4 bg-surface-container-low hover:bg-surface-container rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/50 border border-transparent focus:border-primary/20 focus:bg-surface-container focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Actions à droite */}
      <div className="flex items-center gap-1 pr-3 md:pr-4 shrink-0">

        {/* Bouton + Bravo (desktop) */}
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
              <div className="px-2 py-6 text-sm text-on-surface-variant text-center">
                {t('notifications.none')}
              </div>
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
                    {!n.read_at && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-on-surface block">
                        <NotifTitle data={n.data} />
                      </span>
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
                <Link
                  href="/notifications/read-all"
                  method="post"
                  className="w-full cursor-pointer text-xs font-semibold"
                >
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
            <span className="text-xs font-black text-primary">
              {(user.points_total ?? 0).toLocaleString()} pts
            </span>
          </div>
        )}

        {/* Avatar + menu utilisateur */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-full w-9 h-9 p-0">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden ring-2 ring-primary/20">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[12px] font-bold text-primary">
                    {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
                  </span>
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
