import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'motion/react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Anchor, X } from 'lucide-react';
import type { BreadcrumbItem } from '@/types';
import Sidebar from './Sidebar';
import Header from './Header';
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
    <div className="flex min-h-screen bg-surface-container-lowest">

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

        <main className={`flex-1 overflow-y-auto ${isDashboard ? '' : 'p-6 md:p-8'}`}>{children}</main>
      </div>

      {/* ── Modal Créer un Bravo — rendu au niveau racine pour éviter le stacking context de la sidebar ── */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col"
          >
            <div className="relative bg-gradient-to-r from-[#003d7a] via-[#00529e] to-[#0066c2] px-5 py-4 flex items-center justify-between shrink-0">
              <div className="space-y-0.5">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/70">
                  <Anchor size={11} /> Port Autonome de Douala
                </span>
                <h2 className="text-xl font-extrabold text-white leading-tight tracking-tight">Envoyer un Bravo</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-surface-container-low/95 backdrop-blur-md">
              <div className="max-w-2xl mx-auto px-4 py-6">
                <CreateBravo
                  users={users}
                  bravoValues={bravoValues}
                  isModal
                  onSuccess={() => { setShowCreateModal(false); router.reload(); }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
