import { useMemo } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { motion } from 'motion/react';
import {
  Trophy,
  History,
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
  label: string;
  icon: React.ElementType;
  minPermission?: Permission;
}

export const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Accueil', icon: Home },
  { href: '/history', label: 'Mes Bravos', icon: History },
  { href: '/challenges', label: 'Défis', icon: Trophy },
  { href: '/engagement', label: 'Sondages', icon: ClipboardList },
  { href: '/team', label: 'Personnel', icon: Users },
  // { href: '/stats', label: 'Stats', icon: BarChart3 },
  { href: '/shop', label: 'Boutique', icon: ShoppingBag },
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

type NavEntry = { href: string; label: string; icon: React.ElementType };

function pathWithoutQuery(url: string): string {
  const i = url.indexOf('?');
  return i === -1 ? url : url.slice(0, i);
}

function isLinkActive(path: string, href: string): boolean {
  if (href === '/dashboard') {
    return path === '/dashboard' || path === '/' || path === '';
  }
  return path === href || path.startsWith(`${href}/`);
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
  const path = pathWithoutQuery(currentUrl);
  const active = isLinkActive(path, item.href);

  return (
    <Link
      key={item.href}
      href={item.href}
      onClick={onClose}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group relative ${
        active
          ? 'bg-primary text-white shadow-lg shadow-primary/20'
          : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
      }`}
    >
      <item.icon size={20} className={active ? 'text-white' : 'group-hover:text-primary transition-colors'} />
      {!collapsed && <span className="font-bold text-[13px] tracking-normal">{item.label}</span>}
      {active && (
        <motion.div layoutId="activeSidebarNav" className="absolute left-0 w-1.5 h-6 bg-secondary rounded-r-full" />
      )}
    </Link>
  );
}

export default function Sidebar({ collapsed = false, onCollapseToggle, onClose, onCreateBravo }: SidebarProps) {
  const page = usePage<{ auth?: AuthShared & { user?: { id: number; name: string; email: string; avatar?: string } } }>();
  const currentUrl = page.url;
  const nav = page.props.auth?.nav ?? {};

  const adminLinks = useMemo((): NavEntry[] => {
    const links: NavEntry[] = [];
    if (nav.hr_dashboard) {
      links.push({ href: '/hr/dashboard', label: 'Tableau de board', icon: BarChart3 });
    }
    if (nav.admin_surveys) {
      links.push({ href: '/admin/surveys', label: 'Gérer les sondages', icon: ClipboardCheck });
    }
    if (nav.admin_challenges) {
      links.push({ href: '/admin/challenges', label: 'Gérer les défis', icon: Trophy });
    }
    if (nav.admin_config) {
      links.push({ href: '/admin/config', label: 'Configuration', icon: Settings });
    }
    if (nav.admin_users) {
      links.push({ href: '/admin/users', label: 'Utilisateurs', icon: UserCog });
    }
    if (nav.admin_roles) {
      links.push({ href: '/admin/roles', label: 'Rôles & permissions', icon: KeyRound });
    }
    if (nav.audit) {
      links.push({ href: '/audit', label: 'Audit', icon: Shield });
    }
    return links;
  }, [nav.hr_dashboard, nav.admin_config, nav.admin_users, nav.admin_roles, nav.audit, nav.admin_surveys, nav.admin_challenges]);

  const mainLinks: NavEntry[] = useMemo(
    () => [...navItems, { href: '/notifications', label: 'Notifications', icon: Bell }],
    [],
  );
  const user = page.props.auth?.user;
  const { permission } = usePermissions();
  const userRank = PERM_RANK[permission] ?? 0;

  const visibleItems = navItems.filter(item =>
    !item.minPermission || userRank >= PERM_RANK[item.minPermission]
  );

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-3 flex items-center gap-3 border-b border-surface-container-high">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
          <img src="/assets/images/pad-logo.png" alt="Logo" className="w-10 h-10 object-contain" />
        </div>
        {!collapsed && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <h2 className="font-extrabold text-lg leading-none tracking-tight text-primary">Bravo PAD</h2>
          </div>
        )}
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="ml-auto h-7 w-7 text-on-surface-variant">
            <X size={16} />
          </Button>
        )}
      </div>

      <div className="p-4 border-t border-surface-container-high">
        <Button
          onClick={onCreateBravo}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all ${
            collapsed ? 'p-3' : 'px-4'
          }`}
          style={{ cursor: 'pointer' }}
        >
          <PlusCircle size={18} />
          {!collapsed && <span>Envoyer un Bravo</span>}
        </Button>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {mainLinks.map((item) => (
          <NavLink key={item.href} item={item} currentUrl={currentUrl} collapsed={collapsed} onClose={onClose} />
        ))}

        {adminLinks.length > 0 && (
          <>
            {!collapsed && (
              <p className="pt-4 pb-1 px-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/80">
                Administration
              </p>
            )}
            {adminLinks.map((item) => (
              <NavLink key={item.href} item={item} currentUrl={currentUrl} collapsed={collapsed} onClose={onClose} />
            ))}
          </>
        )}
      </nav>

      {/* User + Logout */}
      <div className="p-3 border-t border-surface-container-high">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-primary">{user?.name?.charAt(0)?.toUpperCase()}</span>
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-on-surface truncate">{user?.name}</p>
              <p className="text-[10px] text-on-surface-variant truncate">{user?.email}</p>
            </div>
          )}
          <button
            onClick={() => router.post('/logout')}
            className="p-1.5 rounded-lg hover:bg-red-50 text-on-surface-variant hover:text-red-500 transition-colors shrink-0"
            title="Déconnexion"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {onCollapseToggle && (
        <button
          type="button"
          onClick={onCollapseToggle}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-surface-container-high rounded-full flex items-center justify-center shadow-sm hover:bg-surface-container-low transition-all z-10"
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
