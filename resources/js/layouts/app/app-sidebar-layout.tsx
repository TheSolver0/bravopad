import { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'motion/react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import type { BreadcrumbItem } from '@/types';
import Sidebar from './Sidebar';
import Header from './Header';

interface AppSidebarLayoutProps {
  breadcrumbs?: BreadcrumbItem[];
  children: React.ReactNode;
}

export default function AppSidebarLayout({ breadcrumbs = [], children }: AppSidebarLayoutProps) {
  const { flash } = usePage<{
    flash?: { success?: string; error?: string };
  }>().props;

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface-container-lowest">

      {/* Sidebar desktop floating */}
      <aside
        className={`
          fixed inset-y-4 left-4 z-50
          hidden md:flex flex-col
          bg-white/95 backdrop-blur-xl
          border border-surface-container-high
          rounded-2xl shadow-2xl shadow-black/10
          transition-all duration-500
          ${collapsed ? 'w-[72px]' : 'w-64'}
        `}
      >
        <Sidebar
          collapsed={collapsed}
          onCollapseToggle={() => setCollapsed(v => !v)}
        />
      </aside>

      {/* Sidebar mobile via Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 md:hidden">
          <Sidebar onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Zone principale */}
      <div
        className={`flex-1 flex flex-col transition-all duration-500 ${
          collapsed ? 'md:ml-[calc(72px+2rem)]' : 'md:ml-[calc(256px+2rem)]'
        }`}
      >
        <Header breadcrumbs={breadcrumbs} onMenuOpen={() => setMobileOpen(true)} />

        {/* Flash messages */}
        <AnimatePresence>
          {flash?.success && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm font-medium"
            >
              {flash.success}
            </motion.div>
          )}
          {flash?.error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium"
            >
              {flash.error}
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
