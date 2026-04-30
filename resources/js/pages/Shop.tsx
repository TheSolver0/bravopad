import { useState, useMemo } from 'react';
import { ShoppingBag, Search, ShoppingCart, Clock, CheckCircle, XCircle, Truck, ChevronLeft, ChevronRight } from 'lucide-react';
import { router } from '@inertiajs/react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Reward, Redemption } from './types';

const ITEMS_PER_PAGE = 8;

interface ShopProps {
  rewards: Reward[];
  redemptions: Redemption[];
  userPoints: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  Tous: 'Tous',
  vouchers: 'Bons',
  tickets: 'Tickets',
  experiences: 'Expériences',
  equipment: 'Équipement',
};

const STATUS_CONFIG = {
  pending:   { label: 'En attente',  icon: Clock,         color: 'text-orange-500' },
  approved:  { label: 'Approuvé',    icon: CheckCircle,   color: 'text-green-500'  },
  rejected:  { label: 'Refusé',      icon: XCircle,       color: 'text-red-500'    },
  delivered: { label: 'Livré',       icon: Truck,         color: 'text-blue-500'   },
} as const;

export default function Shop({ rewards = [], redemptions = [], userPoints = 0 }: ShopProps) {
  const [searchTerm, setSearchTerm]         = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [redeeming, setRedeeming]           = useState<number | null>(null);
  const [page, setPage]                     = useState(1);

  const categories = ['Tous', 'vouchers', 'tickets', 'experiences', 'equipment'];

  const filtered = useMemo(() => {
    setPage(1);
    return (rewards || []).filter(r => {
      const matchSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.description ?? '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = activeCategory === 'Tous' || r.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [rewards, searchTerm, activeCategory]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated   = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleRedeem = (reward: Reward) => {
    if (redeeming) return;
    setRedeeming(reward.id);

    router.post(`/shop/${reward.id}/redeem`, {}, {
      preserveScroll: true,
      onFinish: () => setRedeeming(null),
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header + solde */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Boutique</h1>
          <p className="text-sm text-on-surface-variant font-medium">Échangez vos points contre des cadeaux.</p>
        </div>
        <Card className="py-3 px-6 bg-primary border-none flex items-center gap-4 shadow-xl shadow-primary/30 shrink-0">
          <div className="p-2.5 bg-primary/80 rounded-xl border border-white/10">
            <ShoppingBag size={20} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-0.5">Solde actuel</p>
            <p className="text-xl font-bold text-white leading-none tracking-tight">
              {userPoints.toLocaleString()} <span className="text-sm font-medium opacity-70">pts</span>
            </p>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60" size={18} />
          <input
            type="text"
            placeholder="Rechercher une récompense..."
            className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border-none shadow-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium text-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-white text-on-surface-variant hover:text-primary border border-surface-container-high'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Catalogue */}
      {filtered.length === 0 ? (
        <p className="text-center text-on-surface-variant py-16">Aucune récompense disponible.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginated.map(reward => (
            <Card key={reward.id} className="p-0 overflow-hidden group hover:shadow-xl transition-all duration-500 border-none bg-white">
              <div className="relative h-48 overflow-hidden bg-surface-container-low">
                {reward.image_url ? (
                  <img
                    src={reward.image_url}
                    alt={reward.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-on-surface-variant/30">
                    <ShoppingBag size={48} />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <Badge variant="secondary">{CATEGORY_LABELS[reward.category]}</Badge>
                </div>
                {reward.description && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <p className="text-white text-xs font-medium leading-relaxed line-clamp-3">{reward.description}</p>
                  </div>
                )}
                {!reward.has_stock && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">Épuisé</span>
                  </div>
                )}
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <h3 className="font-bold text-base text-on-surface">{reward.name}</h3>
                  <div className="flex items-center gap-1 text-primary font-bold mt-1 text-sm">
                    <ShoppingBag size={14} />
                    <span>{reward.cost_points.toLocaleString()} pts</span>
                  </div>
                </div>
                <Button
                  variant={reward.affordable && reward.has_stock ? 'primary' : 'outline'}
                  className="w-full py-2 text-xs"
                  disabled={!reward.affordable || !reward.has_stock || redeeming === reward.id}
                  onClick={() => handleRedeem(reward)}
                >
                  <ShoppingCart size={14} />
                  {redeeming === reward.id
                    ? 'Traitement...'
                    : !reward.has_stock
                    ? 'Épuisé'
                    : !reward.affordable
                    ? 'Points insuffisants'
                    : 'Échanger'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg bg-white border border-surface-container-high disabled:opacity-40 hover:bg-surface-container-low transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                p === page
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-white border border-surface-container-high hover:bg-surface-container-low text-on-surface-variant'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg bg-white border border-surface-container-high disabled:opacity-40 hover:bg-surface-container-low transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Historique des échanges */}
      {redemptions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-black tracking-tight">Mes derniers échanges</h2>
          <div className="space-y-2">
            {redemptions.map(r => {
              const cfg = STATUS_CONFIG[r.status];
              const Icon = cfg.icon;
              return (
                <div key={r.id} className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={cfg.color} />
                    <div>
                      <p className="font-bold text-sm">{r.reward_name}</p>
                      <p className="text-xs text-on-surface-variant">{r.created_at}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-primary">-{r.points_spent.toLocaleString()} pts</p>
                    <p className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
