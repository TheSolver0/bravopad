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
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import type { Permission } from '@/pages/types';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  minPermission?: Permission;
}

export const navItems: NavItem[] = [
  { href: '/dashboard',  label: 'Accueil',    icon: Home },
  { href: '/history',    label: 'Mes Bravos', icon: History },
  { href: '/challenges', label: 'Défis',      icon: Trophy },
  { href: '/team',       label: 'Équipe',     icon: Users },
  { href: '/stats',      label: 'Stats',      icon: BarChart3 },
  { href: '/shop',       label: 'Boutique',   icon: ShoppingBag },
  { href: '/admin',      label: 'Admin',      icon: Shield, minPermission: 'admin' },
];

const PERM_RANK: Record<Permission, number> = { employee: 0, manager: 1, admin: 2 };

interface SidebarProps {
  collapsed?: boolean;
  onCollapseToggle?: () => void;
  onClose?: () => void;
  onCreateBravo?: () => void;
}

export default function Sidebar({ collapsed = false, onCollapseToggle, onClose, onCreateBravo }: SidebarProps) {
  const page = usePage();
  const currentUrl = page.url;
  const { permission } = usePermissions();
  const userRank = PERM_RANK[permission] ?? 0;

  const visibleItems = navItems.filter(item =>
    !item.minPermission || userRank >= PERM_RANK[item.minPermission]
  );

  return (
    <div className="flex flex-col h-full relative">
      {/* Logo */}
      <div className="p-3 flex items-center gap-3 border-b border-surface-container-high">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
          <img src="/assets/images/orbit-logo.png" alt="Logo" className="w-10 h-10 object-contain" />
        </div>
        {!collapsed && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <h2 className="font-extrabold text-lg leading-none tracking-tight text-primary">Bravo</h2>
          </div>
        )}
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="ml-auto h-7 w-7 text-on-surface-variant"
          >
            <X size={16} />
          </Button>
        )}
      </div>

      {/* CTA Envoyer un Bravo */}
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

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {visibleItems.map(item => {
          const isActive = currentUrl.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group relative ${
                isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              <item.icon
                size={20}
                className={isActive ? 'text-white' : 'group-hover:text-primary transition-colors'}
              />
              {!collapsed && (
                <span className="font-bold text-[13px] tracking-normal">{item.label}</span>
              )}
              {isActive && (
                <motion.div
                  layoutId="activeSidebarNav"
                  className="absolute left-0 w-1.5 h-6 bg-secondary rounded-r-full"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle — affiché uniquement en mode desktop */}
      {onCollapseToggle && (
        <button
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
