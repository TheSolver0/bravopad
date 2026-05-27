import { Link, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
  Home, MessageCircle, Users, Trophy, Award,
  ShoppingBag, Bell, Bot, Hash, Settings,
  UserCog, ClipboardCheck, ClipboardList, KeyRound, Shield,
  BarChart3, History, ChevronLeft, ChevronRight,
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

/* ── Item — collapsed (icône + tooltip) ou expanded (icône + label) ── */
interface RailItemProps {
  href?: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  active?: boolean;
  expanded: boolean;
  onClick?: () => void;
}

function RailItem({ href, icon: Icon, label, badge, active, expanded, onClick }: RailItemProps) {
  const activeClass = active
    ? 'bg-primary text-white shadow-md shadow-primary/20'
    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface';

  const content = expanded ? (
    /* Mode étendu : icône + label pleine largeur */
    <span className={`flex items-center gap-3 w-full px-3 h-10 rounded-xl transition-all duration-150 cursor-pointer ${activeClass}`}>
      <span className="relative shrink-0">
        <Icon size={18} strokeWidth={active ? 2.5 : 1.75} />
        {!!badge && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 flex items-center justify-center text-[8px] font-black bg-red-500 text-white rounded-full border-2 border-background">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span className="text-[13px] font-semibold flex-1 min-w-0 truncate">{label}</span>
      {!!badge && badge > 0 && (
        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </span>
  ) : (
    /* Mode réduit : icône centrée + tooltip */
    <span className={`relative flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-150 cursor-pointer ${activeClass}`}>
      <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
      {!!badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-black bg-red-500 text-white rounded-full border-2 border-background">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </span>
  );

  const element = href ? (
    <Link href={href} className={expanded ? 'block w-full min-w-0' : 'flex justify-center w-full'}>
      {content}
    </Link>
  ) : (
    <button onClick={onClick} className={expanded ? 'block w-full min-w-0 text-left' : 'flex justify-center w-full'}>
      {content}
    </button>
  );

  if (expanded) return element;

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>{element}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          <p className="text-xs font-semibold">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function RailDivider({ expanded, label }: { expanded: boolean; label?: string }) {
  if (expanded && label) {
    return (
      <p className="px-3 pt-3 pb-0.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 truncate">
        {label}
      </p>
    );
  }
  return <div className="w-8 h-px bg-border my-1 mx-auto shrink-0" />;
}

/* ── Props ── */
interface NavRailProps {
  expanded: boolean;
  onToggle: () => void;
  onCreateBravo: () => void;
}

const RAIL_W_COLLAPSED = 72;
const RAIL_W_EXPANDED = 240;

export { RAIL_W_COLLAPSED, RAIL_W_EXPANDED };

export default function NavRail({ expanded, onToggle, onCreateBravo }: NavRailProps) {
  const { t } = useTranslation();
  const page = usePage<{
    auth?: {
      user?: { id: number; name: string; email: string; avatar?: string };
      nav?: {
        hr_dashboard?: boolean; admin_surveys?: boolean; admin_challenges?: boolean;
        admin_config?: boolean; admin_users?: boolean; admin_roles?: boolean; audit?: boolean;
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
    <aside
      className={`hidden md:flex flex-col shrink-0 bg-background border-r border-border relative overflow-hidden transition-[width] duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
        expanded ? 'w-[240px]' : 'w-[72px]'
      }`}
    >
      {/* ── Nav items ── */}
      <div className="flex-1 flex flex-col gap-0.5 py-3 px-2 overflow-y-auto overflow-x-hidden nav-scrollbar">

        {/* CTA Bravo */}
        {expanded ? (
          <button
            onClick={onCreateBravo}
            className="flex items-center gap-2.5 w-full px-3 h-10 rounded-xl bg-primary text-white text-[13px] font-bold shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all mb-1"
          >
            <Award size={18} className="shrink-0" />
            <span className="truncate transition-opacity duration-200">
              {t('nav.sendBravo', 'Envoyer un Bravo')}
            </span>
          </button>
        ) : (
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onCreateBravo}
                  className="flex items-center justify-center w-11 h-11 mx-auto rounded-2xl bg-primary text-white shadow-md shadow-primary/30 hover:bg-primary/90 active:scale-95 transition-all mb-1"
                >
                  <Award size={20} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                <p className="text-xs font-semibold">{t('nav.sendBravo', 'Envoyer un Bravo')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <RailDivider expanded={expanded} label="Communication" />

        <RailItem href="/feed" icon={Home} label={t('nav.feed', "Fil d'actualité")} active={isActive(path, '/feed')} expanded={expanded} />
        <RailItem href="/messages" icon={MessageCircle} label={t('nav.messages', 'Messages')} active={isActive(path, '/messages')} badge={unread} expanded={expanded} />
        <RailItem href="/groups" icon={Hash} label={t('nav.groups', 'Espaces')} active={isActive(path, '/groups')} expanded={expanded} />
        <RailItem href="/team" icon={Users} label={t('nav.team', 'Équipe')} active={isActive(path, '/team')} expanded={expanded} />

        <RailDivider expanded={expanded} label="Reconnaissance" />

        <RailItem href="/dashboard" icon={Award} label={t('nav.home', 'Dashboard')} active={isActive(path, '/dashboard')} expanded={expanded} />
        <RailItem href="/history" icon={History} label={t('nav.myBravos', 'Mes Bravos')} active={isActive(path, '/history')} expanded={expanded} />
        <RailItem href="/challenges" icon={Trophy} label={t('nav.challenges', 'Challenges')} active={isActive(path, '/challenges')} expanded={expanded} />
        <RailItem href="/engagement" icon={ClipboardList} label={t('nav.surveys', 'Sondages')} active={isActive(path, '/engagement')} expanded={expanded} />

        <RailDivider expanded={expanded} label="Plus" />

        <RailItem href="/shop" icon={ShoppingBag} label={t('nav.shop', 'Boutique')} active={isActive(path, '/shop')} expanded={expanded} />
        <RailItem href="/notifications" icon={Bell} label={t('nav.notifications', 'Notifications')} active={isActive(path, '/notifications')} badge={unread} expanded={expanded} />
        <RailItem href="/chatbot" icon={Bot} label="Assistant IA" active={isActive(path, '/chatbot')} expanded={expanded} />

        {hasAdmin && (
          <>
            <RailDivider expanded={expanded} label="Administration" />
            {nav.hr_dashboard && <RailItem href="/hr/dashboard" icon={BarChart3} label={t('nav.hrDashboard', 'RH Dashboard')} active={isActive(path, '/hr/dashboard')} expanded={expanded} />}
            {nav.admin_surveys && <RailItem href="/admin/surveys" icon={ClipboardCheck} label={t('nav.manageSurveys', 'Sondages')} active={isActive(path, '/admin/surveys')} expanded={expanded} />}
            {nav.admin_challenges && <RailItem href="/admin/challenges" icon={Trophy} label={t('nav.manageChallenges', 'Challenges')} active={isActive(path, '/admin/challenges')} expanded={expanded} />}
            {nav.admin_config && <RailItem href="/admin/config" icon={Settings} label={t('nav.config', 'Config')} active={isActive(path, '/admin/config')} expanded={expanded} />}
            {nav.admin_users && <RailItem href="/admin/users" icon={UserCog} label={t('nav.users', 'Utilisateurs')} active={isActive(path, '/admin/users')} expanded={expanded} />}
            {nav.admin_roles && <RailItem href="/admin/roles" icon={KeyRound} label={t('nav.rolesPermissions', 'Rôles')} active={isActive(path, '/admin/roles')} expanded={expanded} />}
            {nav.audit && <RailItem href="/audit" icon={Shield} label={t('nav.audit', 'Audit')} active={isActive(path, '/audit')} expanded={expanded} />}
          </>
        )}

      </div>

      {/* ── Bouton toggle flottant sur la bordure droite ── */}
      <button
        onClick={onToggle}
        style={{
          left: `${(expanded ? RAIL_W_EXPANDED : RAIL_W_COLLAPSED) - 12}px`,
          transition: 'left 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className="fixed top-[72px] z-50 w-6 h-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-full flex items-center justify-center shadow-md hover:shadow-lg hover:scale-110 active:scale-95 transition-[transform,box-shadow] duration-150"
        title={expanded ? 'Réduire' : 'Étendre'}
      >
        <ChevronLeft
          size={12}
          className={`text-gray-500 dark:text-gray-400 transition-transform duration-300 ${expanded ? '' : 'rotate-180'}`}
        />
      </button>

      {/* ── Bottom: Settings + User ── */}
      <div className={`flex flex-col gap-0.5 py-3 px-2 border-t border-border shrink-0 overflow-x-hidden ${expanded ? '' : 'items-center'}`}>
        <RailItem href="/settings/profile" icon={Settings} label={t('nav.settings', 'Paramètres')} active={isActive(path, '/settings')} expanded={expanded} />

        <DropdownMenu>
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button className={`flex items-center gap-2.5 rounded-2xl hover:bg-surface-container-low transition-all ${expanded ? 'w-full px-2 py-2' : 'w-11 h-11 justify-center'}`}>
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden ring-2 ring-primary/20">
                        {user?.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[12px] font-bold text-primary">{user?.name?.charAt(0)?.toUpperCase() ?? 'U'}</span>
                        )}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />
                    </div>
                    {expanded && (
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-[12.5px] font-bold text-on-surface truncate leading-none">{user?.name ?? 'Utilisateur'}</p>
                        <p className="text-[10.5px] text-on-surface-variant truncate">{user?.email}</p>
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              {!expanded && (
                <TooltipContent side="right" sideOffset={8}>
                  <p className="text-xs font-semibold">{user?.name ?? 'Profil'}</p>
                </TooltipContent>
              )}
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
