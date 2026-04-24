import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'motion/react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { X } from 'lucide-react';
import type { BreadcrumbItem } from '@/types';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileNav from './MobileNav';
import CreateBravo from '@/pages/CreateBravo';
import { User, BravoValue } from '@/pages/types';

interface AppSidebarLayoutProps {
  breadcrumbs?: BreadcrumbItem[];
  children: React.ReactNode;
}

export default function AppSidebarLayout({ breadcrumbs = [], children }: AppSidebarLayoutProps) {
  const page = usePage<{ flash?: { success?: string; error?: string }; users?: User[]; bravoValues?: BravoValue[] }>();
  const { flash } = page.props;
  const isDashboard = page.component === 'dashboard';
  const users: User[] = (page.props.users as User[]) ?? [];
  const bravoValues: BravoValue[] = (page.props.bravoValues as BravoValue[]) ?? [];

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface-container-lowest overflow-x-hidden">

      {/* Sidebar desktop floating */}
      <aside
        className={`
          fixed inset-y-4 left-4 z-40
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
          onCreateBravo={() => setShowCreateModal(true)}
        />
      </aside>

      {/* Sidebar mobile via Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 md:hidden">
          <Sidebar
            onClose={() => setMobileOpen(false)}
            onCreateBravo={() => { setShowCreateModal(true); setMobileOpen(false); }}
          />
        </SheetContent>
      </Sheet>

      {/* Zone principale */}
      <div
        className={`flex-1 flex flex-col transition-all duration-500 ${
          collapsed ? 'md:ml-[calc(72px+2rem)]' : 'md:ml-[calc(256px+2rem)]'
        }`}
      >
        {!isDashboard && <Header breadcrumbs={breadcrumbs} onMenuOpen={() => setMobileOpen(true)} />}

        {/* Bottom nav mobile — visible sur toutes les pages */}
        <MobileNav onCreateBravo={() => setShowCreateModal(true)} />

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

        <main className={`flex-1 overflow-y-auto pb-20 md:pb-0 ${isDashboard ? '' : 'p-6 md:p-8'}`}>{children}</main>
      </div>

      {/* ── Modal Créer un Bravo — rendu au niveau racine pour éviter le stacking context de la sidebar ── */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => setShowCreateModal(false)}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto bg-gray-50 rounded-2xl shadow-2xl modal-scroll"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-gray-400 hover:text-gray-700 shadow-sm border border-gray-100 transition-all cursor-pointer z-10"
              >
                <X size={16} />
              </button>
              <div className="px-4 py-6">
                <CreateBravo
                  users={users}
                  bravoValues={bravoValues}
                  isModal
                  onSuccess={() => { setShowCreateModal(false); router.reload(); }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
