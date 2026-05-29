import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import type { BreadcrumbItem } from '@/types';
import NavRail, { RAIL_W_COLLAPSED, RAIL_W_EXPANDED } from './NavRail';
import ContextPanel from './ContextPanel';
import TopBar from './TopBar';
import MobileNav from './MobileNav';
import MobileDrawer from './MobileDrawer';
import CreateBravo from '@/pages/CreateBravo';
import ChatbotWidget from '@/components/ChatbotWidget';
import { User, BravoValue } from '@/pages/types';

interface AppSidebarLayoutProps {
  breadcrumbs?: BreadcrumbItem[];
  children: React.ReactNode;
}

const defaultBravoInsights = {
  concentration_alerts: [] as string[],
  balancing_suggestions: [] as { id: number; name: string; department?: string; reason: string; received_recent: number }[],
  quality: { score: 70, tips: [] as string[] },
};

export default function AppSidebarLayout({ children }: AppSidebarLayoutProps) {
  const page = usePage<{
    flash?: { success?: string; error?: string };
    users?: User[];
    team?: { data?: User[] };
    bravoValues?: BravoValue[];
    bravoInsights?: typeof defaultBravoInsights;
  }>();

  const { flash } = page.props;
  const isAgenda    = page.component === 'Agenda';
  const isDashboard = page.component === 'Dashboard';
  const isFeed      = page.component === 'Feed';

  const users: User[] =
    (page.props.users as User[] | undefined) ??
    (page.props.team?.data as User[] | undefined) ?? [];
  const bravoValues: BravoValue[] = (page.props.bravoValues as BravoValue[]) ?? [];
  const bravoInsights = page.props.bravoInsights ?? defaultBravoInsights;

  const isMessages = page.url.startsWith('/messages');

  const [navExpanded, setNavExpanded] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navRailWidth = navExpanded ? RAIL_W_EXPANDED : RAIL_W_COLLAPSED;

  return (
    <div className="flex flex-col h-screen bg-surface-container-lowest overflow-hidden">

      {/* ── TopBar pleine largeur ── */}
      <TopBar
        navRailWidth={navRailWidth}
        onMenuOpen={() => setDrawerOpen(true)}
        onCreateBravo={() => setShowCreateModal(true)}
      />

      {/* ── Corps : Rail | ContextPanel | Contenu ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* NavRail — desktop uniquement */}
        <NavRail
          expanded={navExpanded}
          onToggle={() => setNavExpanded(v => !v)}
          onCreateBravo={() => setShowCreateModal(true)}
        />

        {/* ContextPanel (messages / groupes) */}
        <ContextPanel />

        {/* Zone principale */}
        <div className={`flex-1 flex flex-col min-w-0 ${isMessages ? '' : 'pl-6'}`}>

          {/* Flash messages */}
          <AnimatePresence>
            {flash?.success && (
              <motion.div
                key="flash-success"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mx-4 mt-3 p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm font-medium shrink-0"
              >
                {flash.success}
              </motion.div>
            )}
            {flash?.error && (
              <motion.div
                key="flash-error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium shrink-0"
              >
                {flash.error}
              </motion.div>
            )}
          </AnimatePresence>

          <main className={
            isAgenda || isMessages
              ? 'flex-1 flex flex-col min-h-0 overflow-hidden'
              : `flex-1 overflow-y-auto pb-40 md:pb-24 ${isDashboard || isFeed ? '' : 'p-6 md:p-8'}`
          }>{children}</main>

          {!isAgenda && !isMessages && (
            <footer className={`fixed z-30 border-t border-surface-container-high bg-surface-container-lowest/95 px-6 py-4 text-center text-xs text-muted-foreground backdrop-blur-sm bottom-16 left-0 right-0 md:bottom-0 md:px-8 transition-[left] duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
              navExpanded ? 'md:left-[240px]' : 'md:left-[72px]'
            }`}>
              Powered by Kenny LOMIE
            </footer>
          )}
        </div>

      </div>

      {/* ── Mobile bottom nav ── */}
      <MobileNav onCreateBravo={() => setShowCreateModal(true)} />

      {/* ── Drawer mobile (hamburger) ── */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreateBravo={() => setShowCreateModal(true)}
      />

      {/* ── Modal Créer un Bravo ── */}
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
                  bravoInsights={bravoInsights}
                  isModal
                  onSuccess={() => { setShowCreateModal(false); router.reload(); }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ChatbotWidget />
    </div>
  );
}
