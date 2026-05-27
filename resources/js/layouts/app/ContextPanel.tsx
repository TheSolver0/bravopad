import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Plus, Edit3, Hash, Users, Phone, Video,
  Circle, MessageCircle,
} from 'lucide-react';

const WORK_GROUPS = [
  { id: 1, name: 'Sécurité portuaire', color: '#e74c3c', letter: 'S', unread: 3, members: 12 },
  { id: 2, name: 'Direction Technique', color: '#3498db', letter: 'D', unread: 0, members: 8 },
  { id: 3, name: 'RH & Formation', color: '#2ecc71', letter: 'R', unread: 1, members: 15 },
  { id: 4, name: 'Logistique', color: '#f39c12', letter: 'L', unread: 0, members: 6 },
];

const MOCK_DMS = [
  { id: 1, name: 'Alice Mbeki', initials: 'AM', online: true, preview: 'Merci pour le bravo !', time: '2m', unread: 2 },
  { id: 2, name: 'Jean-Paul Ekotto', initials: 'JE', online: false, preview: 'Tu peux relire le rapport ?', time: '1h', unread: 0 },
  { id: 3, name: 'Sandra Ngono', initials: 'SN', online: true, preview: 'Réunion demain à 10h', time: '3h', unread: 0 },
];

function pathWithoutQuery(url: string) {
  const i = url.indexOf('?');
  return i === -1 ? url : url.slice(0, i);
}

type PanelType = 'messages' | 'groups' | null;

function getPanelType(path: string): PanelType {
  if (path.startsWith('/messages')) return 'messages';
  if (path.startsWith('/groups')) return 'groups';
  return null;
}

/* ── Messages panel ── */
function MessagesPanel() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'all' | 'unread' | 'groups'>('all');
  const [search, setSearch] = useState('');

  const tabs = [
    { key: 'all', label: t('messages.all', 'Tous') },
    { key: 'unread', label: t('messages.unread', 'Non-lus') },
    { key: 'groups', label: t('messages.groups', 'Groupes') },
  ] as const;

  const filteredDms = MOCK_DMS.filter(dm =>
    dm.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredGroups = WORK_GROUPS.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h2 className="text-sm font-bold text-on-surface">{t('nav.messages', 'Messages')}</h2>
        <Link
          href="/messages/new"
          className="flex items-center justify-center w-8 h-8 rounded-xl text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-all"
          title={t('messages.compose', 'Nouveau message')}
        >
          <Edit3 size={15} />
        </Link>
      </div>

      {/* Search */}
      <div className="px-3 py-2 shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('messages.search', 'Rechercher...')}
            className="w-full h-8 pl-8 pr-3 bg-surface-container-low rounded-lg text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 pb-2 shrink-0">
        {tabs.map(t2 => (
          <button
            key={t2.key}
            onClick={() => setTab(t2.key)}
            className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-all ${
              tab === t2.key
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            {t2.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto nav-scrollbar overflow-x-hidden px-2 pb-3">
        {/* DMs */}
        {(tab === 'all' || tab === 'unread') && (
          <div className="space-y-0.5">
            {filteredDms
              .filter(dm => tab === 'unread' ? dm.unread > 0 : true)
              .map(dm => (
                <Link
                  key={dm.id}
                  href={`/messages/${dm.id}`}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-surface-container-low transition-all group"
                >
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                      <span className="text-[11px] font-bold text-primary">{dm.initials}</span>
                    </div>
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${dm.online ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-[12.5px] truncate ${dm.unread > 0 ? 'font-bold text-on-surface' : 'font-medium text-on-surface'}`}>
                        {dm.name}
                      </p>
                      <span className="text-[10px] text-on-surface-variant shrink-0 ml-1">{dm.time}</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant truncate">{dm.preview}</p>
                  </div>
                  {dm.unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-black shrink-0">
                      {dm.unread}
                    </span>
                  )}
                </Link>
              ))}
          </div>
        )}

        {/* Groups */}
        {(tab === 'all' || tab === 'groups') && (
          <div className="mt-2">
            <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-wider text-on-surface-variant/50 flex items-center gap-1">
              <Hash size={9} />
              {tab === 'groups' ? 'Espaces de travail' : 'Groupes'}
            </p>
            <div className="space-y-0.5">
              {filteredGroups.map(group => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-surface-container-low transition-all"
                >
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[12px] font-bold shrink-0"
                    style={{ backgroundColor: group.color }}
                  >
                    {group.letter}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12.5px] truncate ${group.unread > 0 ? 'font-bold' : 'font-medium'} text-on-surface`}>
                      {group.name}
                    </p>
                    <p className="text-[11px] text-on-surface-variant flex items-center gap-1">
                      <Users size={9} /> {group.members} membres
                    </p>
                  </div>
                  {group.unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-black shrink-0">
                      {group.unread}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {filteredDms.length === 0 && filteredGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-on-surface-variant/50">
            <MessageCircle size={28} className="mb-2 opacity-40" />
            <p className="text-xs">{t('messages.noResults', 'Aucun résultat')}</p>
          </div>
        )}
      </div>

      {/* New message */}
      <div className="px-3 py-2 border-t border-border shrink-0">
        <Link
          href="/messages/new"
          className="flex items-center justify-center gap-2 w-full h-8 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary text-xs font-semibold transition-all"
        >
          <Plus size={13} />
          {t('messages.newMessage', 'Nouveau message')}
        </Link>
      </div>
    </div>
  );
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
            {panelType === 'messages' && <MessagesPanel />}
            {panelType === 'groups' && <GroupsPanel />}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
