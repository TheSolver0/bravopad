import { Link, usePage } from '@inertiajs/react';
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
  Medal,
  Shield,
  LayoutDashboard,
  Settings,
  UserCog,
  KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';

export const navItems = [
  { href: '/dashboard', label: 'Accueil', icon: Home },
  { href: '/history', label: 'Mes Bravos', icon: History },
  { href: '/challenges', label: 'Défis', icon: Trophy },
  { href: '/engagement', label: 'Engagement', icon: Medal },
  { href: '/team', label: 'Équipe', icon: Users },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
  { href: '/shop', label: 'Boutique', icon: ShoppingBag },
];

type AuthNav = {
  hr_dashboard?: boolean;
  admin_config?: boolean;
  admin_users?: boolean;
  admin_roles?: boolean;
  audit?: boolean;
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

type NavEntry = { href: string; label: string; icon: typeof Home };

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
  const page = usePage<{ auth?: AuthShared }>();
  const currentUrl = page.url;
  const nav = page.props.auth?.nav ?? {};

  const adminLinks = useMemo((): NavEntry[] => {
    const links: NavEntry[] = [];
    if (nav.hr_dashboard) {
      links.push({ href: '/hr/dashboard', label: 'Tableau RH', icon: LayoutDashboard });
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
  }, [nav.hr_dashboard, nav.admin_config, nav.admin_users, nav.admin_roles, nav.audit]);

  const mainLinks: NavEntry[] = useMemo(
    () => [...navItems, { href: '/notifications', label: 'Notifications', icon: Bell }],
    [],
  );

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-3 flex items-center gap-3 border-b border-surface-container-high">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
          <img src="/assets/images/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
        </div>
        {!collapsed && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <h2 className="font-extrabold text-lg leading-none tracking-tight text-primary">BravoPAD</h2>
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
