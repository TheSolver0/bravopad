import { Link, router, usePage } from '@inertiajs/react';
import { Bell, Menu, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BreadcrumbItem } from '@/types';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { UserMenuContent } from '@/components/user-menu-content';
import { UserInfo } from '@/components/user-info';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import NotificationPanel from '@/components/NotificationPanel';
import LanguageToggle from '@/components/LanguageToggle';

interface HeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  onMenuOpen?: () => void;
}

interface RecentNotification {
  id: string;
  read_at: string | null;
  created_at: string;
  data: Record<string, unknown>;
}

function PreviewTitle({ data }: { data: Record<string, unknown> }) {
  const { t } = useTranslation();
  if (typeof data.title === 'string') return <>{data.title}</>;
  if (data.type === 'bravo_received') return <>{t('notifications.bravoReceived')}</>;
  if (data.type === 'reward_redemption_submitted') return <>{t('notifications.pointsExchange')}</>;
  if (data.type === 'reward_redemption_outcome') return <>{t('notifications.exchangeUpdated')}</>;
  if (data.type === 'bravo_anomaly_spike') return <>{t('notifications.bravoAlert')}</>;
  return <>{t('notifications.notification')}</>;
}

export default function Header({ breadcrumbs = [], onMenuOpen }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';
  const { auth, unreadCount } = usePage<{
    auth: {
      user?: { id: number; name: string; email: string; avatar?: string; role?: string; points_total?: number };
      unread_notifications_count?: number;
      recent_notifications?: RecentNotification[];
    };
    unreadCount: number;
  }>().props;

  const user = auth?.user;
  const unread = auth?.unread_notifications_count ?? 0;
  const recent = auth?.recent_notifications ?? [];

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border px-4 md:px-6 h-14 flex items-center gap-3">
      {onMenuOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0 text-on-surface-variant"
          onClick={onMenuOpen}
        >
          <Menu size={20} />
        </Button>
      )}

      <Breadcrumbs breadcrumbs={breadcrumbs} />

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <LanguageToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-on-surface-variant">
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-black bg-red-500 text-white rounded-full border border-white">
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
              <div className="px-2 py-4 text-sm text-on-surface-variant text-center">{t('notifications.none')}</div>
            ) : (
              recent.map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  className="flex flex-col items-start gap-0.5 cursor-pointer"
                  onSelect={() => {
                    if (!n.read_at) {
                      router.post(`/notifications/${n.id}/read`, {}, { preserveScroll: true });
                    }
                  }}
                >
                  <span className="text-xs font-bold text-on-surface"><PreviewTitle data={n.data} /></span>
                  {typeof n.data.body === 'string' && (
                    <span className="text-[11px] text-on-surface-variant line-clamp-2">{n.data.body}</span>
                  )}
                  <span className="text-[10px] text-on-surface-variant/70">
                    {new Date(n.created_at).toLocaleString(locale)}
                  </span>
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

        {user && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 rounded-xl border border-primary/10">
            <Trophy size={14} className="text-secondary" />
            <span className="text-xs font-black text-primary">
              {(user.points_total ?? 0).toLocaleString()} pts
            </span>
          </div>
        )}

        <Separator orientation="vertical" className="h-6 hidden sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 h-9 rounded-xl focus-visible:ring-0">
              {user && <UserInfo user={user as any} />}
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
