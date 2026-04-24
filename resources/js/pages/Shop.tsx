import { useState, useMemo } from 'react';
import { ShoppingBag, Search, ShoppingCart } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { MOCK_REWARDS } from './constants';

interface ShopProps {
  userPoints: number;
}

export default function Shop({ userPoints }: ShopProps) {
  const [searchTerm, setSearchTerm]       = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [balance, setBalance]             = useState(userPoints);

  const categories = [
    { label: 'Tous',        key: 'Tous' },
    { label: 'Bons',        key: 'vouchers' },
    { label: 'Tickets',     key: 'tickets' },
    { label: 'Expériences', key: 'experiences' },
    { label: 'Équipement',  key: 'equipment' },
  ];

  const filteredRewards = useMemo(() => {
    return MOCK_REWARDS.filter(reward => {
      const matchesSearch    = reward.title.toLowerCase().includes(searchTerm.toLowerCase()) || reward.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory  = activeCategory === 'Tous' || reward.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, activeCategory]);

  const handlePurchase = (cost: number, title: string) => {
    if (balance >= cost) {
      setBalance(prev => prev - cost);
      alert(`Succès ! Vous avez échangé vos points contre : ${title}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Boutique</h1>
          <p className="text-sm text-on-surface-variant font-medium">Échangez vos points contre des cadeaux.</p>
        </div>
        <Card className="py-3 px-6 bg-primary border-none flex items-center gap-4 shadow-xl shadow-primary/30 shrink-0">
          <div className="p-2.5 bg-primary/80 rounded-xl backdrop-blur-sm border border-white/10">
            <ShoppingBag size={20} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-0.5">Solde actuel</p>
            <p className="text-xl font-bold text-white leading-none tracking-tight">
              {balance.toLocaleString()} <span className="text-sm font-medium opacity-70">pts</span>
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
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeCategory === cat.key ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-white text-on-surface-variant hover:text-primary border border-surface-container-high'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredRewards.map((reward) => (
          <Card key={reward.id} className="p-0 overflow-hidden group hover:shadow-xl transition-all duration-500 border-none bg-white">
            <div className="relative h-48 overflow-hidden">
              <img src={reward.image} alt={reward.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
              <div className="absolute top-4 left-4">
                <Badge variant="secondary">{reward.category}</Badge>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <p className="text-white text-xs font-medium leading-relaxed">{reward.description}</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <h3 className="font-bold text-base text-on-surface">{reward.title}</h3>
                <div className="flex items-center gap-1 text-primary font-bold mt-1 text-sm">
                  <ShoppingBag size={14} />
                  <span>{reward.cost} pts</span>
                </div>
              </div>
              <Button
                variant={balance >= reward.cost ? 'primary' : 'outline'}
                className="w-full py-2 text-xs"
                disabled={balance < reward.cost}
                onClick={() => handlePurchase(reward.cost, reward.title)}
              >
                <ShoppingCart size={14} />
                {balance >= reward.cost ? 'Échanger' : 'Points insuffisants'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
