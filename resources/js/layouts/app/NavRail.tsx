import { Link, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
  Home, MessageCircle, Users, BookUser,
  Trophy, Award, TrendingUp,
  CalendarDays, PartyPopper, HandCoins, ShoppingBag,
  Bell, ClipboardList, FileText, FolderKanban,
  LayoutDashboard, ClipboardCheck, KeyRound,
  Settings, UserCog, ShieldCheck, Lock,
  ChevronLeft, Anchor,
} from 'lucide-react';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';

/* ─────────────────────────────────────────── helpers ── */
function pathWithoutQuery(url: string) {
  const i = url.indexOf('?');
  return i === -1 ? url : url.slice(0, i);
}

function isActive(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`);
}

/** Couleur d'avatar dérivée du nom (palette variée, cohérente) */
function avatarColor(name: string): string {
  const palette = [
    '#0B3D7A', '#1E5BAB', '#5E7320', '#B5810A',
    '#C98A4B', '#6366f1', '#8b5cf6', '#ec4899',
    '#14b8a6', '#f97316',
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}

/* ─────────────────────────────────────────── NavItem ── */
interface NavItemProps {
  href?: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  active?: boolean;
  expanded: boolean;
  accent?: 'lime' | 'gold' | 'admin';
  onClick?: () => void;
}

function NavItem({
  href, icon: Icon, label, badge, active, expanded, accent, onClick,
}: NavItemProps) {
  const activeClass = active
    ? 'bg-[#0B3D7A] text-white shadow-sm'
    : accent === 'lime'
      ? 'text-[#46586E] hover:bg-[#F7FAEE] hover:text-[#5E7320]'
      : accent === 'admin'
        ? 'text-[#46586E] hover:bg-[#FBF1E7] hover:text-[#C98A4B]'
        : 'text-[#46586E] hover:bg-[#F1F5FA] hover:text-[#0B3D7A]';

  const inner = expanded ? (
    <span className={`flex items-center gap-3 w-full px-3 h-9 rounded-[10px] transition-colors duration-150 cursor-pointer ${activeClass}`}>
      <span className="relative shrink-0">
        <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
        {!!badge && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 flex items-center justify-center text-[8px] font-black bg-red-500 text-white rounded-full border border-background">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span className="text-[13px] font-semibold flex-1 min-w-0 truncate leading-none">{label}</span>
      {!!badge && badge > 0 && (
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </span>
  ) : (
    <span className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-colors duration-150 cursor-pointer ${activeClass}`}>
      <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
      {!!badge && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-0.5 flex items-center justify-center text-[8px] font-black bg-red-500 text-white rounded-full border border-background">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </span>
  );

  const element = href ? (
    <Link href={href} className={expanded ? 'block w-full' : 'flex justify-center w-full'}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={expanded ? 'block w-full text-left' : 'flex justify-center w-full'}>
      {inner}
    </button>
  );

  if (expanded) return element;

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>{element}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10} className="text-xs font-semibold">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ──────────────────────────────────── Group label ── */
function GroupLabel({ label, expanded }: { label: string; expanded: boolean }) {
  if (expanded) {
    return (
      <p className="px-3 pt-4 pb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#8A99AD] truncate select-none">
        {label}
      </p>
    );
  }
  return <div className="my-2 mx-auto w-6 border-t border-[#E9EEF5]" />;
}

/* ──────────────────────────────────── Admin header ── */
function AdminGroupHeader({ expanded }: { expanded: boolean }) {
  if (!expanded) return <div className="my-2 mx-auto w-6 border-t border-[#E9EEF5]" />;
  return (
    <div className="px-3 pt-4 pb-1 flex items-center gap-1.5">
      <Lock size={10} className="text-[#C98A4B] shrink-0" strokeWidth={2.5} />
      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#C98A4B] flex-1 truncate select-none">
        Administration
      </span>
      <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-[4px] bg-[#FBF1E7] text-[#C98A4B] border border-[#F0D9B5] shrink-0">
        RESTREINT
      </span>
    </div>
  );
}

/* ─────────────────────────────── Constants (export) ── */
export const RAIL_W_COLLAPSED = 72;
export const RAIL_W_EXPANDED  = 246;

/* ─────────────────────────────────────── NavRail ── */
interface NavRailProps {
  expanded: boolean;
  onToggle: () => void;
  onCreateBravo: () => void;
}

export default function NavRail({ expanded, onToggle }: NavRailProps) {
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
        admin_evenements?: boolean;
      };
      unread_notifications_count?: number;
    };
  }>();

  const path  = pathWithoutQuery(page.url);
  const user  = page.props.auth?.user;
  const nav   = page.props.auth?.nav ?? {};
  const unread= page.props.auth?.unread_notifications_count ?? 0;

  const hasAdmin = !!(
    nav.hr_dashboard || nav.admin_surveys || nav.admin_challenges ||
    nav.admin_config || nav.admin_users  || nav.admin_roles ||
    nav.audit || nav.admin_evenements
  );

  const initials    = user ? getInitials(user.name) : 'U';
  const bgColor     = user ? avatarColor(user.name) : '#0B3D7A';

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 h-full bg-white border-r border-[#E4EAF2] relative overflow-hidden transition-[width] duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
        expanded ? 'w-[246px]' : 'w-[72px]'
      }`}
    >
      {/* ── Zone scrollable ── */}
      <div className="flex-1 flex flex-col gap-0.5 pt-2 pb-3 px-2 overflow-y-auto overflow-x-hidden nav-scrollbar">

        {/* ══ GROUPE 1 : PRINCIPAL ══ */}
        <GroupLabel label="Principal" expanded={expanded} />
        <NavItem href="/dashboard" icon={Home} label={t('nav.home', 'Accueil')} active={isActive(path, '/dashboard') || path === '/'} expanded={expanded} />
        <NavItem href="/messages"    icon={MessageCircle} label={t('nav.messages', 'Messages')}   active={isActive(path, '/messages')}  badge={unread} expanded={expanded} />
        {/* <NavItem href="/groups"      icon={Users}         label={t('nav.channels', 'Canaux')}     active={isActive(path, '/groups')}    expanded={expanded} /> */}
        <NavItem href="/team"        icon={BookUser}      label={t('nav.team', 'Collègues')}      active={isActive(path, '/team')}      expanded={expanded} />

        {/* ══ GROUPE 2 : RECONNAISSANCE ══ */}
        <GroupLabel label="Reconnaissance" expanded={expanded} />
        <NavItem href="/history"     icon={Award}         label={t('nav.bravos', 'Mes Bravos')}  active={isActive(path, '/history')}    accent="lime" expanded={expanded} />
        {/* <NavItem href="/stats"       icon={TrendingUp}    label={t('nav.ranking', 'Classement')} active={isActive(path, '/stats')}      accent="lime" expanded={expanded} /> */}
        <NavItem href="/challenges"  icon={Trophy}        label={t('nav.challenges', 'Défis')}   active={isActive(path, '/challenges')} accent="lime" expanded={expanded} />

        {/* ══ GROUPE 3 : ESPACE DE TRAVAIL ══ */}
        <GroupLabel label="Espace de travail" expanded={expanded} />
        <NavItem href="/agenda"            icon={FolderKanban}  label={t('nav.projects', 'Agenda')}           active={isActive(path, '/agenda')}              expanded={expanded} />
        <NavItem href="/evenements"        icon={CalendarDays}  label={t('nav.evenements', 'Événements')}      active={isActive(path, '/evenements')}          expanded={expanded} />
        <NavItem href="/event-contributions" icon={HandCoins}   label={t('nav.cotisations', 'Cotisations')}   active={isActive(path, '/event-contributions')} expanded={expanded} />
        <NavItem href="/shop"              icon={ShoppingBag}   label={t('nav.shop', 'Boutique')}              active={isActive(path, '/shop')}                expanded={expanded} />
        {/* <NavItem href="/documents"         icon={FileText}      label={t('nav.documents', 'Documents')}        active={isActive(path, '/documents')}            expanded={expanded} /> */}
        <NavItem href="/engagement"        icon={ClipboardList} label={t('nav.surveys', 'Sondages')}           active={isActive(path, '/engagement')}           expanded={expanded} />
        <NavItem href="/notifications"     icon={Bell}          label={t('nav.notifications', 'Notifications')} active={isActive(path, '/notifications')} badge={unread} expanded={expanded} />

        {/* ══ GROUPE 4 : ADMINISTRATION (gated) ══ */}
        {hasAdmin && (
          <>
            <AdminGroupHeader expanded={expanded} />

            {/* Conteneur admin légèrement distinct */}
            <div className={`flex flex-col gap-0.5 ${expanded ? 'bg-[#FBFCFE] rounded-xl p-1 mx-0' : ''}`}>

              {nav.hr_dashboard && (
                <NavItem href="/hr/dashboard"      icon={LayoutDashboard} label={t('nav.hrDashboard', 'Tableau de bord RH')} active={isActive(path, '/hr/dashboard')}    accent="admin" expanded={expanded} />
              )}
              {nav.admin_surveys && (
                <NavItem href="/admin/surveys"     icon={ClipboardCheck}  label={t('nav.manageSurveys', 'Gérer les sondages')}  active={isActive(path, '/admin/surveys')}    accent="admin" expanded={expanded} />
              )}
              {nav.admin_challenges && (
                <NavItem href="/admin/challenges"  icon={Trophy}          label={t('nav.manageChallenges', 'Gérer les défis')}   active={isActive(path, '/admin/challenges')} accent="admin" expanded={expanded} />
              )}
              {nav.admin_evenements && (
                <NavItem href="/admin/evenements"  icon={PartyPopper}     label={t('nav.manageEvenements', 'Gérer les événements')} active={isActive(path, '/admin/evenements')} accent="admin" expanded={expanded} />
              )}
              {nav.admin_config && (
                <NavItem href="/admin/config"      icon={Settings}        label={t('nav.config', 'Configuration')}               active={isActive(path, '/admin/config')}     accent="admin" expanded={expanded} />
              )}
              {nav.admin_users && (
                <NavItem href="/admin/users"       icon={UserCog}         label={t('nav.users', 'Utilisateurs')}                  active={isActive(path, '/admin/users')}      accent="admin" expanded={expanded} />
              )}
              {nav.admin_roles && (
                <NavItem href="/admin/roles"       icon={KeyRound}        label={t('nav.rolesPermissions', 'Rôles & permissions')} active={isActive(path, '/admin/roles')}     accent="admin" expanded={expanded} />
              )}
              {nav.audit && (
                <NavItem href="/audit"             icon={ShieldCheck}     label={t('nav.audit', 'Audit')}                         active={isActive(path, '/audit')}            accent="admin" expanded={expanded} />
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Bouton toggle collapse/expand ── */}
      <button
        onClick={onToggle}
        style={{
          left: `${(expanded ? RAIL_W_EXPANDED : RAIL_W_COLLAPSED) - 12}px`,
          transition: 'left 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className="fixed top-[76px] z-50 w-6 h-6 bg-white border border-[#E4EAF2] rounded-full flex items-center justify-center shadow-[0_1px_4px_rgba(11,61,122,0.12)] hover:shadow-md hover:scale-110 active:scale-95 transition-[transform,box-shadow] duration-150"
        title={expanded ? 'Réduire' : 'Étendre'}
      >
        <ChevronLeft
          size={11}
          className={`text-[#64748B] transition-transform duration-300 ${expanded ? '' : 'rotate-180'}`}
        />
      </button>

      {/* ── Footer : Paramètres + Profil ── */}
      <div className={`flex flex-col gap-0.5 pt-2 pb-3 px-2 border-t border-[#E4EAF2] shrink-0 overflow-x-hidden ${expanded ? '' : 'items-center'}`}>
        <NavItem
          href="/settings/profile"
          icon={Settings}
          label={t('nav.settings', 'Paramètres')}
          active={isActive(path, '/settings')}
          expanded={expanded}
        />

        {/* Bloc profil */}
        <DropdownMenu>
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`flex items-center gap-2.5 rounded-[10px] hover:bg-[#F1F5FA] transition-colors ${
                      expanded ? 'w-full px-2 py-2' : 'w-10 h-10 justify-center'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden text-white ring-2 ring-[#E4EAF2]"
                        style={user?.avatar ? {} : { backgroundColor: bgColor }}
                      >
                        {user?.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[11px] font-bold">{initials}</span>
                        )}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
                    </div>

                    {/* Infos (mode étendu) */}
                    {expanded && (
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-[12.5px] font-bold text-[#0A2A4F] truncate leading-none">
                          {user?.name ?? 'Utilisateur'}
                        </p>
                        <p className="text-[10.5px] text-[#64748B] truncate mt-0.5">{user?.email}</p>
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              {!expanded && (
                <TooltipContent side="right" sideOffset={10}>
                  <p className="text-xs font-semibold">{user?.name ?? 'Profil'}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          <DropdownMenuContent side="right" align="end" className="w-56 mb-1">
            <UserMenuContent user={user as any} />
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Branding PAD (mode étendu uniquement) */}
        {expanded && (
          <div
            className="relative overflow-hidden mx-0 mt-1 rounded-xl h-[72px] w-full"
            style={{ background: 'linear-gradient(135deg, #0A2E5C 0%, #0B3D7A 60%, #1A5BA8 100%)' }}
          >
            <Anchor
              className="absolute -right-2 -bottom-2 text-white/8"
              style={{ width: 64, height: 64 }}
              strokeWidth={0.6}
            />
            <div className="relative p-3 h-full flex flex-col justify-between">
              <div className="flex items-center gap-1.5">
                <img
                  src="/assets/images/onepad-logo.png"
                  alt="OnePAD"
                  className="w-5 h-5 rounded object-contain bg-white shrink-0"
                />
                <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">OnePAD</span>
              </div>
              <p className="text-white text-[8.5px] font-black uppercase tracking-wide leading-snug">
                Port Autonome de Douala<br />
                <span className="text-[#C6E25A]">Connecter · Valoriser</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
