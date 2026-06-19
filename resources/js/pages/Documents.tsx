import { useState, useMemo } from 'react';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
  Search, FileText, FileSpreadsheet, Presentation,
  Image as ImageIcon, File, Download, ExternalLink,
  Filter, X, ChevronDown, Folder,
} from 'lucide-react';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';

/* ─────────────────────────────────── Types ── */
export interface Document {
  id: number;
  title: string;
  type: 'pdf' | 'word' | 'excel' | 'presentation' | 'image' | 'other';
  department?: string;
  owner?: string;
  created_at: string;
  updated_at?: string;
  url?: string;
  size_kb?: number;
  description?: string;
  tags?: string[];
}

interface DocumentsProps {
  documents: Document[];
  departments: string[];
}

/* ─────────────────────── Icône selon type ── */
function DocIcon({ type, size = 18 }: { type: Document['type']; size?: number }) {
  const props = { size, strokeWidth: 1.8 };
  switch (type) {
    case 'pdf':          return <FileText {...props} className="text-red-500" />;
    case 'excel':        return <FileSpreadsheet {...props} className="text-green-600" />;
    case 'word':         return <FileText {...props} className="text-blue-600" />;
    case 'presentation': return <Presentation {...props} className="text-orange-500" />;
    case 'image':        return <ImageIcon {...props} className="text-purple-500" />;
    default:             return <File {...props} className="text-[#64748B]" />;
  }
}

function typeLabel(type: Document['type']): string {
  return { pdf: 'PDF', word: 'Word', excel: 'Excel', presentation: 'Présentation', image: 'Image', other: 'Document' }[type] ?? 'Document';
}

function formatSize(kb?: number): string {
  if (!kb) return '';
  if (kb < 1024) return `${kb} Ko`;
  return `${(kb / 1024).toFixed(1)} Mo`;
}

function formatDate(str: string): string {
  return new Date(str).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ────────────────────────────── DocumentCard ── */
function DocumentCard({ doc }: { doc: Document }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E9EEF5] shadow-[0_1px_2px_rgba(16,42,67,.04)] p-4 flex items-start gap-4 hover:shadow-md hover:border-[#0B3D7A]/20 transition-all group">
      {/* Icône type */}
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-[#F1F5FA] group-hover:bg-[#E9EEF5] transition-colors">
        <DocIcon type={doc.type} />
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-[#0A2A4F] truncate group-hover:text-[#0B3D7A] transition-colors">
          {doc.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[11px] px-2 py-0.5 rounded-[6px] font-medium"
                style={{ background: '#F1F5FA', color: '#46586E' }}>
            {typeLabel(doc.type)}
          </span>
          {doc.department && (
            <span className="text-[11px] text-[#8A99AD]">{doc.department}</span>
          )}
          {doc.size_kb && (
            <span className="text-[11px] text-[#8A99AD]">{formatSize(doc.size_kb)}</span>
          )}
        </div>
        {doc.description && (
          <p className="text-[12px] text-[#64748B] mt-1 line-clamp-2">{doc.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2 text-[11px] text-[#8A99AD]">
          {doc.owner && <span>Par {doc.owner}</span>}
          <span>{formatDate(doc.created_at)}</span>
        </div>
        {doc.tags && doc.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {doc.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ background: '#F7FAEE', color: '#5E7320', border: '1px solid #E3EFBE' }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1.5 shrink-0">
        {doc.url && (
          <>
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:bg-[#F1F5FA] hover:text-[#0B3D7A] transition-colors"
              title="Ouvrir"
            >
              <ExternalLink size={14} />
            </a>
            <a
              href={doc.url}
              download
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:bg-[#F1F5FA] hover:text-[#0B3D7A] transition-colors"
              title="Télécharger"
            >
              <Download size={14} />
            </a>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ PAGE ══ */
export default function Documents({ documents = [], departments = [] }: Partial<DocumentsProps>) {
  const { t } = useTranslation();
  const [query,     setQuery]     = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const docTypes: { value: Document['type'] | ''; label: string }[] = [
    { value: '',             label: 'Tous les types' },
    { value: 'pdf',          label: 'PDF' },
    { value: 'word',         label: 'Word' },
    { value: 'excel',        label: 'Excel' },
    { value: 'presentation', label: 'Présentation' },
    { value: 'image',        label: 'Image' },
    { value: 'other',        label: 'Autre' },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter(doc => {
      const matchQ = !q || doc.title.toLowerCase().includes(q)
        || doc.description?.toLowerCase().includes(q)
        || doc.owner?.toLowerCase().includes(q)
        || doc.tags?.some(tag => tag.toLowerCase().includes(q));
      const matchT = !typeFilter || doc.type === typeFilter;
      const matchD = !deptFilter || doc.department === deptFilter;
      return matchQ && matchT && matchD;
    });
  }, [documents, query, typeFilter, deptFilter]);

  /* Statistiques rapides */
  const statsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    documents.forEach(d => { counts[d.type] = (counts[d.type] ?? 0) + 1; });
    return counts;
  }, [documents]);

  const hasFilters = !!query || !!typeFilter || !!deptFilter;

  return (
    <AppSidebarLayout>
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 animate-in fade-in duration-300">

        {/* ── En-tête ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#0A2A4F] flex items-center gap-2">
              <Folder size={20} className="text-[#0B3D7A]" />
              Documents
            </h1>
            <p className="text-sm text-[#64748B] mt-0.5">
              {documents.length} document{documents.length !== 1 ? 's' : ''} disponible{documents.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* ── Barre de recherche + filtres ── */}
        <div className="bg-white rounded-2xl border border-[#E9EEF5] shadow-[0_1px_2px_rgba(16,42,67,.04)] p-4 mb-6">
          <div className="flex gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A99AD] pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher par titre, auteur, tag…"
                className="w-full h-10 pl-9 pr-3 bg-[#F1F5FA] rounded-xl text-sm text-[#0A2A4F] placeholder:text-[#8A99AD] border border-transparent focus:border-[#0B3D7A]/20 focus:bg-white outline-none transition-all"
              />
              {query && (
                <button onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A99AD] hover:text-[#46586E]">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Toggle filtres */}
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 px-3 h-10 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                showFilters || hasFilters
                  ? 'bg-[#0B3D7A] text-white border-[#0B3D7A]'
                  : 'bg-[#F1F5FA] text-[#46586E] border-transparent hover:border-[#0B3D7A]/20'
              }`}
            >
              <Filter size={14} />
              Filtres
              {hasFilters && (
                <span className="w-4 h-4 rounded-full bg-white text-[#0B3D7A] text-[9px] font-black flex items-center justify-center">
                  {[!!typeFilter, !!deptFilter].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Panneau filtres */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-[#E9EEF5]">
              {/* Type */}
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="h-9 pl-3 pr-8 bg-[#F1F5FA] rounded-xl text-sm text-[#46586E] border border-transparent focus:border-[#0B3D7A]/20 outline-none appearance-none cursor-pointer"
                >
                  {docTypes.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A99AD] pointer-events-none" />
              </div>

              {/* Département */}
              {departments.length > 0 && (
                <div className="relative">
                  <select
                    value={deptFilter}
                    onChange={e => setDeptFilter(e.target.value)}
                    className="h-9 pl-3 pr-8 bg-[#F1F5FA] rounded-xl text-sm text-[#46586E] border border-transparent focus:border-[#0B3D7A]/20 outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Tous les départements</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A99AD] pointer-events-none" />
                </div>
              )}

              {/* Reset */}
              {hasFilters && (
                <button
                  onClick={() => { setQuery(''); setTypeFilter(''); setDeptFilter(''); }}
                  className="flex items-center gap-1 h-9 px-3 rounded-xl text-sm text-[#64748B] hover:text-red-500 hover:bg-red-50 border border-transparent transition-colors cursor-pointer"
                >
                  <X size={13} /> Réinitialiser
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Compteurs par type ── */}
        {!hasFilters && Object.keys(statsByType).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {docTypes.filter(t => t.value && statsByType[t.value]).map(dt => (
              <button
                key={dt.value}
                onClick={() => setTypeFilter(dt.value)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-[#E9EEF5] bg-white text-[#46586E] hover:border-[#0B3D7A]/30 hover:text-[#0B3D7A] transition-colors cursor-pointer"
              >
                <DocIcon type={dt.value as Document['type']} size={12} />
                {dt.label}
                <span className="text-[10px] font-bold text-[#8A99AD]">{statsByType[dt.value]}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Résultats ── */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E9EEF5] p-12 text-center">
            {hasFilters ? (
              <>
                <Search size={36} className="mx-auto mb-3 text-[#0B3D7A]/20" />
                <p className="font-bold text-[#46586E]">Aucun résultat</p>
                <p className="text-sm text-[#8A99AD] mt-1">
                  Essayez des termes différents ou réinitialisez les filtres.
                </p>
                <button
                  onClick={() => { setQuery(''); setTypeFilter(''); setDeptFilter(''); }}
                  className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-[#0B3D7A] border border-[#0B3D7A]/30 hover:bg-[#F1F5FA] transition-colors cursor-pointer"
                >
                  Réinitialiser
                </button>
              </>
            ) : (
              <>
                <Folder size={36} className="mx-auto mb-3 text-[#0B3D7A]/20" />
                <p className="font-bold text-[#46586E]">Aucun document disponible</p>
                <p className="text-sm text-[#8A99AD] mt-1">
                  Les documents partagés apparaîtront ici.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {hasFilters && (
              <p className="text-xs text-[#8A99AD] font-medium mb-1">
                {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
              </p>
            )}
            {filtered.map(doc => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </div>
    </AppSidebarLayout>
  );
}
