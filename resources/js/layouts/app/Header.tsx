import { usePage } from '@inertiajs/react';
import { Bell, Menu, Trophy } from 'lucide-react';
import type { BreadcrumbItem } from '@/types';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { UserMenuContent } from '@/components/user-menu-content';
import { UserInfo } from '@/components/user-info';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface HeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  onMenuOpen?: () => void;
}

export default function Header({ breadcrumbs = [], onMenuOpen }: HeaderProps) {
  const { auth } = usePage<{
    auth: { user?: { id: number; name: string; email: string; avatar?: string; role?: string; points_total?: number } };
  }>().props;

  const user = auth?.user;

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border px-4 md:px-6 h-14 flex items-center gap-3">

      {/* Burger mobile */}
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

      {/* Breadcrumbs */}
      <Breadcrumbs breadcrumbs={breadcrumbs} />

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2">

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative text-on-surface-variant">
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse" />
        </Button>

        {/* Points badge */}
        {user && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 rounded-xl border border-primary/10">
            <Trophy size={14} className="text-secondary" />
            <span className="text-xs font-black text-primary">
              {(user.points_total ?? 0).toLocaleString()} pts
            </span>
          </div>
        )}

        <Separator orientation="vertical" className="h-6 hidden sm:block" />

        {/* Avatar + dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2 h-9 rounded-xl focus-visible:ring-0"
            >
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
