import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Plus, Hash, Users, Phone, Video,
  Circle,
} from 'lucide-react';

const WORK_GROUPS = [
  { id: 1, name: 'Sécurité portuaire', color: '#e74c3c', letter: 'S', unread: 3, members: 12 },
  { id: 2, name: 'Direction Technique', color: '#3498db', letter: 'D', unread: 0, members: 8 },
  { id: 3, name: 'RH & Formation', color: '#2ecc71', letter: 'R', unread: 1, members: 15 },
  { id: 4, name: 'Logistique', color: '#f39c12', letter: 'L', unread: 0, members: 6 },
];

function pathWithoutQuery(url: string) {
  const i = url.indexOf('?');
  return i === -1 ? url : url.slice(0, i);
}

type PanelType = 'groups' | null;

function getPanelType(path: string): PanelType {
  if (path.startsWith('/groups')) return 'groups';
  return null;
}

/* ── Groups panel ── */
function GroupsPanel() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = WORK_GROUPS.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h2 className="text-sm font-bold text-on-surface">{t('nav.groups', 'Espaces')}</h2>
        <button
          className="flex items-center justify-center w-8 h-8 rounded-xl text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-all"
          title={t('groups.create', 'Créer un espace')}
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('groups.search', 'Rechercher un espace...')}
            className="w-full h-8 pl-8 pr-3 bg-surface-container-low rounded-lg text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Groups list */}
      <div className="flex-1 overflow-y-auto nav-scrollbar overflow-x-hidden px-2 pb-3">
        <p className="px-2 pb-2 text-[10px] font-black uppercase tracking-wider text-on-surface-variant/50">
          Mes espaces ({filtered.length})
        </p>
        <div className="space-y-1">
          {filtered.map(group => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-surface-container-low transition-all group"
            >
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[13px] font-bold shrink-0 shadow-sm"
                style={{ backgroundColor: group.color }}
              >
                {group.letter}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-on-surface truncate">{group.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-on-surface-variant flex items-center gap-1">
                    <Users size={9} /> {group.members}
                  </span>
                  {group.unread > 0 && (
                    <span className="text-[10px] text-primary font-bold flex items-center gap-1">
                      <Circle size={5} fill="currentColor" /> {group.unread} nouveau
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all"
                  title="Appel audio"
                  onClick={e => { e.preventDefault(); }}
                >
                  <Phone size={12} />
                </button>
                <button
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all"
                  title="Appel vidéo"
                  onClick={e => { e.preventDefault(); }}
                >
                  <Video size={12} />
                </button>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Join group */}
      <div className="px-3 py-2 border-t border-border shrink-0">
        <button className="flex items-center justify-center gap-2 w-full h-8 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary text-xs font-semibold transition-all">
          <Hash size={13} />
          {t('nav.joinGroup', 'Rejoindre un espace')}
        </button>
      </div>
    </div>
  );
}

/* ── Main ContextPanel ── */
export default function ContextPanel() {
  const page = usePage();
  const path = pathWithoutQuery(page.url);
  const panelType = getPanelType(path);

  return (
    <AnimatePresence initial={false}>
      {panelType && (
        <motion.aside
          key={panelType}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="hidden md:flex flex-col shrink-0 bg-background border-r border-border overflow-hidden"
          style={{ minWidth: 0 }}
        >
          <div className="w-[280px] h-full flex flex-col">
            {panelType === 'groups' && <GroupsPanel />}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
