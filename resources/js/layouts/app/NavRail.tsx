import { Link, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
  Home, MessageCircle, Users, Trophy, Award,
  ShoppingBag, Bell, Settings,
  UserCog, ClipboardCheck, ClipboardList, KeyRound,
  ChevronLeft, CalendarDays,
  PartyPopper, Newspaper, BookUser, LayoutDashboard,
  ShieldCheck, TrendingUp, HandCoins, Anchor,
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

/* ── Rail Item ───────────────────────────────────────────────────────────── */
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

/* ── Section header ──────────────────────────────────────────────────────── */
function SectionLabel({ expanded, label }: { expanded: boolean; label: string }) {
  if (expanded) {
    return (
      <p className="px-3 pt-5 pb-7 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 truncate">
        {label}
      </p>
    );
  }
  return <div className="w-8 h-10px p-20 bg-border my-2 mx-auto shrink-0" />;
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
        admin_evenements?: boolean;
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
    nav.admin_config || nav.admin_users || nav.admin_roles || nav.audit ||
    nav.admin_evenements
  );

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 h-full bg-background border-r border-border relative overflow-hidden transition-[width] duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
        expanded ? 'w-[240px]' : 'w-[72px]'
      }`}
    >
      {/* ── Scrollable nav ── */}
      <div className="flex-1 flex flex-col gap-0.5 py-3 px-2 overflow-y-auto overflow-x-hidden nav-scrollbar">


        {/* ── Navigation principale (plate, sans sections) ── */}
        <RailItem href="/dashboard"   icon={Home}          label={t('nav.home', 'Accueil')}           active={isActive(path, '/dashboard')}   expanded={expanded} />
        <RailItem href="/feed"        icon={Newspaper}     label={t('nav.feed', "Fil d'actualité")}   active={isActive(path, '/feed')}         expanded={expanded} />
        <RailItem href="/history"     icon={Award}         label={t('nav.bravos', 'Bravos')}          active={isActive(path, '/history')}      expanded={expanded} />
        <RailItem href="/messages"    icon={MessageCircle} label={t('nav.messages', 'Messages')}      active={isActive(path, '/messages')}     badge={unread} expanded={expanded} />
        <RailItem href="/groups"      icon={Users}         label={t('nav.groups', 'Communautés')}     active={isActive(path, '/groups')}       expanded={expanded} />
        <RailItem href="/challenges"  icon={Trophy}        label={t('nav.challenges', 'Défis')}       active={isActive(path, '/challenges')}   expanded={expanded} />
        <RailItem href="/evenements"  icon={CalendarDays}  label={t('nav.evenements', 'Événements')}  active={isActive(path, '/evenements')}   expanded={expanded} />
        <RailItem href="/team"        icon={BookUser}      label={t('nav.team', 'Annuaire')}          active={isActive(path, '/team')}         expanded={expanded} />
        <RailItem href="/engagement"  icon={ClipboardList} label={t('nav.surveys', 'Sondages')}       active={isActive(path, '/engagement')}   expanded={expanded} />
        <RailItem href="/shop"        icon={ShoppingBag}   label={t('nav.shop', 'Boutique')}          active={isActive(path, '/shop')}         expanded={expanded} />
        <RailItem href="/event-contributions" icon={HandCoins} label={t('nav.eventContributions', 'Cotisations')} active={isActive(path, '/event-contributions')} expanded={expanded} />
        <RailItem href="/notifications" icon={Bell}        label={t('nav.notifications', 'Notifications')} active={isActive(path, '/notifications')} badge={unread} expanded={expanded} />

        {/* ── Section Administration ── */}
        {hasAdmin && (
          <>
            <SectionLabel expanded={expanded} label="Administration" />

            {nav.hr_dashboard && (
              <RailItem href="/hr/dashboard"     icon={LayoutDashboard} label={t('nav.hrDashboard', 'Tableau de bord')} active={isActive(path, '/hr/dashboard')}    expanded={expanded} />
            )}
            {nav.admin_users && (
              <RailItem href="/admin/users"      icon={UserCog}         label={t('nav.users', 'Utilisateurs')}          active={isActive(path, '/admin/users')}      expanded={expanded} />
            )}
            {nav.admin_roles && (
              <RailItem href="/admin/roles"      icon={KeyRound}        label={t('nav.rolesPermissions', 'Groupes & Rôles')} active={isActive(path, '/admin/roles')} expanded={expanded} />
            )}
            {nav.admin_config && (
              <RailItem href="/admin/config"     icon={Settings}        label={t('nav.config', 'Paramètres')}           active={isActive(path, '/admin/config')}     expanded={expanded} />
            )}
            {nav.admin_surveys && (
              <RailItem href="/admin/surveys"    icon={ClipboardCheck}  label={t('nav.manageSurveys', 'Sondages RH')}   active={isActive(path, '/admin/surveys')}    expanded={expanded} />
            )}
            {nav.admin_challenges && (
              <RailItem href="/admin/challenges" icon={Trophy}          label={t('nav.manageChallenges', 'Challenges')} active={isActive(path, '/admin/challenges')} expanded={expanded} />
            )}
            {nav.admin_evenements && (
              <RailItem href="/admin/evenements" icon={PartyPopper}     label={t('nav.manageEvenements', 'Événements')} active={isActive(path, '/admin/evenements')} expanded={expanded} />
            )}
            {nav.audit && (
              <RailItem href="/audit"            icon={ShieldCheck}     label={t('nav.audit', 'Modération')}            active={isActive(path, '/audit')}            expanded={expanded} />
            )}
            <RailItem   href="/stats"            icon={TrendingUp}      label={t('nav.stats', 'Statistiques')}          active={isActive(path, '/stats')}            expanded={expanded} />
          </>
        )}

      </div>

      {/* ── Toggle collapse/expand ── */}
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

      {/* ── Footer : Paramètres + Profil + bannière branding ── */}
      <div className={`flex flex-col gap-0.5 pt-2 pb-0 px-2 border-t border-border shrink-0 overflow-x-hidden ${expanded ? '' : 'items-center'}`}>
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

        {/* Bannière branding PAD (mode étendu uniquement) */}
        {expanded && (
          <div
            className="relative overflow-hidden mx-0 mt-2 mb-0 rounded-t-xl h-[88px] w-full"
            style={{ background: 'linear-gradient(135deg, #012d5a 0%, #014d9d 60%, #0369a1 100%)' }}
          >
            <Anchor
              className="absolute -right-3 -bottom-3 text-white/10"
              style={{ width: 80, height: 80 }}
              strokeWidth={0.6}
            />
            <div className="relative p-3 h-full flex flex-col justify-between">
              <div className="flex items-center gap-1.5">
                <img
                  src="/assets/images/onepad-logo.png"
                  alt="OnePAD"
                  className="w-5 h-5 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <span className="text-[9px] font-black text-white/70 uppercase tracking-widest">OnePAD</span>
              </div>
              <div>
                <p className="text-white text-[9.5px] font-black uppercase tracking-wide leading-snug">
                  CONNECTER · RECONNAÎTRE<br />
                  <span className="text-[#c6d00a]">VALORISER</span>
                </p>
                <p className="text-white/45 text-[8px] mt-0.5 font-medium">les talents du PAD</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
