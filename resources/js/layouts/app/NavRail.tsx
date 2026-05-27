import { Link, usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
  Home, MessageCircle, Users, Trophy, Award,
  ShoppingBag, Bell, Bot, Hash, Settings,
  UserCog, ClipboardCheck, ClipboardList, KeyRound, Shield,
  BarChart3, History,
} from 'lucide-react';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';

function pathWithoutQuery(url: string) {
  const i = url.indexOf('?');
  return i === -1 ? url : url.slice(0, i);
}

function isActive(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`);
}

interface RailItemProps {
  href?: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  active?: boolean;
  onClick?: () => void;
}

function RailItem({ href, icon: Icon, label, badge, active, onClick }: RailItemProps) {
  const pill = (
    <span
      className={`
        relative flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-150 cursor-pointer
        ${active
          ? 'bg-primary text-white shadow-md shadow-primary/25'
          : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
        }
      `}
    >
      <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
      {!!badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-black bg-red-500 text-white rounded-full border-2 border-background">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </span>
  );

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          {href ? (
            <Link href={href} className="flex justify-center w-full">{pill}</Link>
          ) : (
            <button onClick={onClick} className="flex justify-center w-full">{pill}</button>
          )}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          <p className="text-xs font-semibold">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function RailDivider() {
  return <div className="w-8 h-px bg-border my-1 mx-auto shrink-0" />;
}

interface NavRailProps {
  onCreateBravo: () => void;
}

export default function NavRail({ onCreateBravo }: NavRailProps) {
  const { t } = useTranslation();
  const page = usePage<{
    auth?: {
      user?: { id: number; name: string; email: string; avatar?: string };
      nav?: {
        hr_dashboard?: boolean;
        admin_surveys?: boolean;
        admin_challenges?: boolean;
        admin_config?: boolean;
        admin_users?: boolean;
        admin_roles?: boolean;
        audit?: boolean;
      };
      unread_notifications_count?: number;
    };
  }>();

  const path = pathWithoutQuery(page.url);
  const user = page.props.auth?.user;
  const nav = page.props.auth?.nav ?? {};
  const unread = page.props.auth?.unread_notifications_count ?? 0;
  const hasAdmin = !!(
    nav.hr_dashboard || nav.admin_surveys || nav.admin_challenges ||
    nav.admin_config || nav.admin_users || nav.admin_roles || nav.audit
  );

  return (
    <aside className="hidden md:flex flex-col w-[72px] shrink-0 bg-background border-r border-border overflow-y-auto scrollbar-hide">
      {/* Nav items */}
      <div className="flex-1 flex flex-col items-center gap-1 py-3 px-2">

        {/* CTA Bravo */}
        <TooltipProvider delayDuration={400}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onCreateBravo}
                className="flex items-center justify-center w-11 h-11 rounded-2xl bg-primary text-white shadow-md shadow-primary/30 hover:bg-primary/90 active:scale-95 transition-all mb-1"
              >
                <Award size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <p className="text-xs font-semibold">{t('nav.sendBravo', 'Envoyer un Bravo')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <RailDivider />

        {/* Social / Communication */}
        <RailItem href="/feed" icon={Home} label={t('nav.feed', "Fil d'actualité")} active={isActive(path, '/feed')} />
        <RailItem href="/messages" icon={MessageCircle} label={t('nav.messages', 'Messages')} active={isActive(path, '/messages')} badge={unread} />
        <RailItem href="/groups" icon={Hash} label={t('nav.groups', 'Espaces')} active={isActive(path, '/groups')} />
        <RailItem href="/team" icon={Users} label={t('nav.team', 'Équipe')} active={isActive(path, '/team')} />

        <RailDivider />

        {/* Features */}
        <RailItem href="/dashboard" icon={Award} label={t('nav.home', 'Dashboard')} active={isActive(path, '/dashboard')} />
        <RailItem href="/history" icon={History} label={t('nav.myBravos', 'Mes Bravos')} active={isActive(path, '/history')} />
        <RailItem href="/challenges" icon={Trophy} label={t('nav.challenges', 'Challenges')} active={isActive(path, '/challenges')} />
        <RailItem href="/engagement" icon={ClipboardList} label={t('nav.surveys', 'Sondages')} active={isActive(path, '/engagement')} />
        <RailItem href="/shop" icon={ShoppingBag} label={t('nav.shop', 'Boutique')} active={isActive(path, '/shop')} />
        <RailItem
          href="/notifications"
          icon={Bell}
          label={t('nav.notifications', 'Notifications')}
          active={isActive(path, '/notifications')}
          badge={unread}
        />
        <RailItem href="/chatbot" icon={Bot} label="Assistant IA" active={isActive(path, '/chatbot')} />

        {/* Admin */}
        {hasAdmin && (
          <>
            <RailDivider />
            {nav.hr_dashboard && (
              <RailItem href="/hr/dashboard" icon={BarChart3} label={t('nav.hrDashboard', 'RH Dashboard')} active={isActive(path, '/hr/dashboard')} />
            )}
            {nav.admin_surveys && (
              <RailItem href="/admin/surveys" icon={ClipboardCheck} label={t('nav.manageSurveys', 'Sondages Admin')} active={isActive(path, '/admin/surveys')} />
            )}
            {nav.admin_challenges && (
              <RailItem href="/admin/challenges" icon={Trophy} label={t('nav.manageChallenges', 'Challenges Admin')} active={isActive(path, '/admin/challenges')} />
            )}
            {nav.admin_config && (
              <RailItem href="/admin/config" icon={Settings} label={t('nav.config', 'Configuration')} active={isActive(path, '/admin/config')} />
            )}
            {nav.admin_users && (
              <RailItem href="/admin/users" icon={UserCog} label={t('nav.users', 'Utilisateurs')} active={isActive(path, '/admin/users')} />
            )}
            {nav.admin_roles && (
              <RailItem href="/admin/roles" icon={KeyRound} label={t('nav.rolesPermissions', 'Rôles')} active={isActive(path, '/admin/roles')} />
            )}
            {nav.audit && (
              <RailItem href="/audit" icon={Shield} label={t('nav.audit', 'Audit')} active={isActive(path, '/audit')} />
            )}
          </>
        )}
      </div>

      {/* Bottom: Settings + User */}
      <div className="flex flex-col items-center gap-1 py-3 px-2 border-t border-border shrink-0">
        <RailItem
          href="/settings/profile"
          icon={Settings}
          label={t('nav.settings', 'Paramètres')}
          active={isActive(path, '/settings')}
        />

        <DropdownMenu>
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button className="relative flex items-center justify-center w-11 h-11 rounded-2xl hover:bg-surface-container-low transition-all">
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden ring-2 ring-primary/20">
                      {user?.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[12px] font-bold text-primary">
                          {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
                        </span>
                      )}
                    </div>
                    <span className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                <p className="text-xs font-semibold">{user?.name ?? 'Profil'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenuContent side="right" align="end" className="w-56 mb-1">
            <UserMenuContent user={user as any} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
