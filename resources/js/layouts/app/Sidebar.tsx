import { useMemo, useState } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  Trophy,
  Users,
  ShoppingBag,
  BarChart3,
  PlusCircle,
  X,
  ChevronRight,
  Home,
  Bell,
  ClipboardList,
  ClipboardCheck,
  Shield,
  Settings,
  UserCog,
  KeyRound,
  LogOut,
  User,
  Award,
  MessageCircle,
  Bot,
  Hash,
  FolderOpen,
  ChevronDown,
  Search,
  MoreHorizontal,
  CalendarRange,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import type { Permission } from '@/pages/types';

const PERM_RANK: Record<string, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
};

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ElementType;
  minPermission?: Permission;
  badge?: string | number;
  badgeVariant?: 'red' | 'blue' | 'gray';
}

export const navItems: NavItem[] = [
  { href: '/feed', labelKey: 'nav.feed', icon: Home },
  { href: '/dashboard', labelKey: 'nav.home', icon: Award },
  { href: '/history', labelKey: 'nav.myBravos', icon: User },
  { href: '/agenda', labelKey: 'nav.agenda', icon: CalendarRange },
  { href: '/challenges', labelKey: 'nav.challenges', icon: Trophy },
  { href: '/engagement', labelKey: 'nav.surveys', icon: ClipboardList },
  { href: '/team', labelKey: 'nav.team', icon: Users },
  { href: '/shop', labelKey: 'nav.shop', icon: ShoppingBag },
];

type AuthNav = {
  hr_dashboard?: boolean;
  admin_config?: boolean;
  admin_users?: boolean;
  admin_roles?: boolean;
  audit?: boolean;
  admin_surveys?: boolean;
  admin_challenges?: boolean;
};

type AuthShared = {
  nav?: AuthNav;
};

interface SidebarProps {
  collapsed?: boolean;
  onCollapseToggle?: () => void;
  onClose?: () => void;
  onCreateBravo?: () => void;
}

type NavEntry = { href: string; labelKey: string; icon: React.ElementType; badge?: string | number; badgeVariant?: 'red' | 'blue' | 'gray' };

const WORK_GROUPS = [
  { id: 1, name: 'Sécurité portuaire', color: '#e74c3c', letter: 'S', unread: 3 },
  { id: 2, name: 'Direction Technique', color: '#3498db', letter: 'D', unread: 0 },
  { id: 3, name: 'RH & Formation', color: '#2ecc71', letter: 'R', unread: 1 },
  { id: 4, name: 'Logistique', color: '#f39c12', letter: 'L', unread: 0 },
];

function pathWithoutQuery(url: string): string {
  const i = url.indexOf('?');
  return i === -1 ? url : url.slice(0, i);
}

function isLinkActive(path: string, href: string): boolean {
  return path === href || path.startsWith(`${href}/`);
}

function NavBadge({ value, variant = 'gray' }: { value: string | number; variant?: 'red' | 'blue' | 'gray' }) {
  const styles = {
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    gray: 'bg-surface-container text-on-surface-variant border border-surface-container-high',
  };
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${styles[variant]}`}>
      {value}
    </span>
  );
}

function NavLink({
  item,
  currentUrl,
  collapsed,
  onClose,
}: {
  item: NavEntry;
  currentUrl: string;
  collapsed: boolean;
  onClose?: () => void;
}) {
  const { t } = useTranslation();
  const path = pathWithoutQuery(currentUrl);
  const active = isLinkActive(path, item.href);

  return (
    <Link
      href={item.href}
      onClick={onClose}
      title={collapsed ? t(item.labelKey) : undefined}
      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-150 group relative ${
        active
          ? 'bg-primary/10 text-primary'
          : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
      }`}
    >
      {active && (
        <motion.div
          layoutId="activeSidebarNav"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full"
        />
      )}
      <item.icon
        size={17}
        className={`shrink-0 transition-colors ${active ? 'text-primary' : 'group-hover:text-primary'}`}
      />
      {!collapsed && (
        <>
          <span className={`text-[13px] font-semibold flex-1 ${active ? 'text-primary' : ''}`}>
            {t(item.labelKey)}
          </span>
          {item.badge !== undefined && (
            <NavBadge value={item.badge} variant={item.badgeVariant} />
          )}
        </>
      )}
      {collapsed && item.badge !== undefined && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
      )}
    </Link>
  );
}

function SectionLabel({
  labelKey,
  defaultLabel,
  collapsed,
  collapsible,
  open,
  onToggle,
}: {
  labelKey: string;
  defaultLabel: string;
  collapsed: boolean;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  const { t } = useTranslation();
  if (collapsed) return <div className="my-2 mx-auto w-6 h-px bg-surface-container-high" />;

  if (collapsible) {
    return (
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-2.5 pt-4 pb-1 group"
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 group-hover:text-on-surface-variant transition-colors">
          {t(labelKey, defaultLabel)}
        </span>
        <ChevronDown
          size={11}
          className={`text-on-surface-variant/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
    );
  }

  return (
    <p className="px-2.5 pt-4 pb-1 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
      {t(labelKey, defaultLabel)}
    </p>
  );
}

function MessagingSection({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const page = usePage<{ url: string }>();
  const currentUrl = page.url;
  const path = pathWithoutQuery(currentUrl);

  const totalUnread = WORK_GROUPS.reduce((sum, g) => sum + g.unread, 0);

  if (collapsed) {
    return (
      <div className="space-y-0.5 pt-1">
        <Link
          href="/messages"
          title="Messages"
          className={`w-full flex items-center justify-center p-2 rounded-xl transition-all relative ${
            isLinkActive(path, '/messages')
              ? 'bg-primary/10 text-primary'
              : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
          }`}
        >
          <MessageCircle size={17} />
          {totalUnread > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
          )}
        </Link>
        {/* <Link
          href="/chatbot"
          title="Assistant IA"
          className={`w-full flex items-center justify-center p-2 rounded-xl transition-all ${
            isLinkActive(path, '/chatbot')
              ? 'bg-primary/10 text-primary'
              : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
          }`}
        >
          <Bot size={17} />
        </Link> */}
      </div>
    );
  }

  return (
    <div>
      <SectionLabel
        labelKey="nav.messaging"
        defaultLabel="Messagerie"
        collapsed={collapsed}
        collapsible
        open={open}
        onToggle={() => setOpen(o => !o)}
      />

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5 mt-0.5">
              {/* Messages directs */}
              <Link
                href="/messages"
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all group ${
                  isLinkActive(path, '/messages')
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <MessageCircle size={17} className={`shrink-0 ${isLinkActive(path, '/messages') ? 'text-primary' : 'group-hover:text-primary transition-colors'}`} />
                <span className="font-semibold text-[13px] flex-1">{t('nav.messages', 'Messages')}</span>
                {totalUnread > 0 && (
                  <NavBadge value={totalUnread} variant="red" />
                )}
              </Link>

              {/* Assistant IA */}
              {/* <Link
                href="/chatbot"
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all group ${
                  isLinkActive(path, '/chatbot')
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <Bot size={17} className={`shrink-0 ${isLinkActive(path, '/chatbot') ? 'text-primary' : 'group-hover:text-primary transition-colors'}`} />
                <span className="font-semibold text-[13px] flex-1">{t('nav.chatbot', 'Assistant IA')}</span>
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  Beta
                </span>
              </Link> */}

              {/* Groupes de travail */}
              <div className="pt-2">
                <p className="px-2.5 pb-1 text-[10px] font-black uppercase tracking-wider text-on-surface-variant/50 flex items-center gap-1.5">
                  <FolderOpen size={10} />
                  {t('nav.groups', 'Groupes de travail')}
                </p>
                <div className="space-y-0.5">
                  {WORK_GROUPS.map(group => (
                    <Link
                      key={group.id}
                      href={`/groups/${group.id}`}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-all group ${
                        isLinkActive(path, `/groups/${group.id}`)
                          ? 'bg-surface-container text-on-surface'
                          : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                        style={{ backgroundColor: group.color }}
                      >
                        {group.letter}
                      </span>
                      <span className="font-medium text-[12.5px] flex-1 truncate">{group.name}</span>
                      {group.unread > 0 && (
                        <span className="w-4.5 h-4.5 min-w-[18px] px-1 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-bold">
                          {group.unread}
                        </span>
                      )}
                    </Link>
                  ))}

                  {/* Rejoindre un groupe */}
                  <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-on-surface-variant/50 hover:text-primary hover:bg-surface-container-low transition-all text-[12px] font-medium">
                    <span className="w-6 h-6 rounded-lg border border-dashed border-on-surface-variant/30 flex items-center justify-center">
                      <PlusCircle size={11} />
                    </span>
                    {t('nav.joinGroup', 'Rejoindre un groupe')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Sidebar({ collapsed = false, onCollapseToggle, onClose, onCreateBravo }: SidebarProps) {
  const { t } = useTranslation();
  const page = usePage<{ auth?: AuthShared & { user?: { id: number; name: string; email: string; avatar?: string } } }>();
  const currentUrl = page.url;
  const nav = page.props.auth?.nav ?? {};

  const adminLinks = useMemo((): NavEntry[] => {
    const links: NavEntry[] = [];
    if (nav.hr_dashboard) links.push({ href: '/hr/dashboard', labelKey: 'nav.hrDashboard', icon: BarChart3 });
    if (nav.admin_surveys) links.push({ href: '/admin/surveys', labelKey: 'nav.manageSurveys', icon: ClipboardCheck });
    if (nav.admin_challenges) links.push({ href: '/admin/challenges', labelKey: 'nav.manageChallenges', icon: Trophy });
    if (nav.admin_config) links.push({ href: '/admin/config', labelKey: 'nav.config', icon: Settings });
    if (nav.admin_users) links.push({ href: '/admin/users', labelKey: 'nav.users', icon: UserCog });
    if (nav.admin_roles) links.push({ href: '/admin/roles', labelKey: 'nav.rolesPermissions', icon: KeyRound });
    if (nav.audit) links.push({ href: '/audit', labelKey: 'nav.audit', icon: Shield });
    return links;
  }, [nav]);

  const mainLinks: NavEntry[] = useMemo(
    () => [
      ...navItems,
      { href: '/notifications', labelKey: 'nav.notifications', icon: Bell },
    ],
    [],
  );

  const user = page.props.auth?.user;
  const { permission } = usePermissions();
  const userRank = PERM_RANK[permission] ?? 0;

  const visibleItems = mainLinks.filter(item =>
    !('minPermission' in item) || userRank >= PERM_RANK[(item as NavItem).minPermission!]
  );

  return (
    <div className="flex flex-col h-full relative bg-surface-container-lowest">

      {/* ── Header: Logo + workspace ── */}
      <div className="px-3 pt-3 pb-2 border-b border-surface-container-high">
        <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
          {/* Logo */}
          <div className="w-12 h-12  flex items-center justify-center shrink-0 ">
            <img
              src="/assets/images/onepad-logo.png"
              alt="OnePAD"
              className="w-6 h-6 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-w-0"
              >
                <h2 className="font-extrabold text-[15px] leading-none tracking-tight text-on-surface">
                  OnePAD
                </h2>
                <p className="text-[10px] text-on-surface-variant mt-0.5 font-medium truncate">
                  Port Autonome de Douala
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          
        </div>

        {/* Search bar — expanded only */}
        
      </div>

      {/* ── Send Bravo CTA ── */}
      <div className={`px-3 pt-3 pb-1 ${collapsed ? 'flex justify-center' : ''}`}>
        <Button
          onClick={onCreateBravo}
          className={`flex items-center justify-center gap-2 rounded-xl bg-primary text-white font-bold text-[12.5px] shadow-md shadow-primary/25 hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 ${
            collapsed ? 'w-9 h-9 p-0' : 'w-full py-2.5 px-4'
          }`}
        >
          <Award size={15} className="shrink-0" />
          {!collapsed && <span>{t('nav.sendBravo', 'Envoyer un Bravo')}</span>}
        </Button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto scrollbar-hide space-y-0.5">

        {/* Section: Principal */}
        <SectionLabel labelKey="nav.mainSection" defaultLabel="Principal" collapsed={collapsed} />

        {visibleItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            currentUrl={currentUrl}
            collapsed={collapsed}
            onClose={onClose}
          />
        ))}

        {/* Section: Messagerie + Groupes */}
        {!collapsed && <div className="pt-1" />}
        <MessagingSection collapsed={collapsed} />

        {/* Section: Administration */}
        {adminLinks.length > 0 && (
          <>
            <SectionLabel labelKey="nav.administration" defaultLabel="Administration" collapsed={collapsed} />
            {adminLinks.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                currentUrl={currentUrl}
                collapsed={collapsed}
                onClose={onClose}
              />
            ))}
          </>
        )}
      </nav>

      {/* ── User footer ── */}
      <div className="p-2.5 border-t border-surface-container-high">
        <div className={`flex items-center gap-2.5 p-2 rounded-xl hover:bg-surface-container-low transition-all group ${collapsed ? 'justify-center' : ''}`}>
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden ring-2 ring-primary/20">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[12px] font-bold text-primary">
                  {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
                </span>
              )}
            </div>
            {/* Online indicator */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-surface-container-lowest" />
          </div>

          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-bold text-on-surface truncate leading-none mb-0.5">
                  {user?.name ?? 'Utilisateur'}
                </p>
                <p className="text-[10.5px] text-on-surface-variant truncate">{user?.email}</p>
              </div>

              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                  title={t('nav.more', 'Plus')}
                >
                  <MoreHorizontal size={13} />
                </button>
                <button
                  onClick={() => router.post('/logout')}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-red-500 hover:bg-red-50 transition-colors"
                  title={t('nav.logout', 'Déconnexion')}
                >
                  <LogOut size={13} />
                </button>
              </div>
            </>
          )}

          {collapsed && (
            <button
              onClick={() => router.post('/logout')}
              className="sr-only"
              title={t('nav.logout', 'Déconnexion')}
            >
              <LogOut size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Collapse toggle ── */}
      {onCollapseToggle && (
        <button
          type="button"
          onClick={onCollapseToggle}
          className="absolute -right-3 top-20 w-6 h-6 bg-surface-container-lowest border border-surface-container-high rounded-full flex items-center justify-center shadow-sm hover:bg-surface-container-low transition-all z-10"
          aria-label={collapsed ? 'Déplier la sidebar' : 'Replier la sidebar'}
        >
          <ChevronRight
            size={12}
            className={`transition-transform duration-300 text-on-surface-variant ${collapsed ? '' : 'rotate-180'}`}
          />
        </button>
      )}
    </div>
  );
}