import { router, usePage } from '@inertiajs/react';
import { Home, Trophy, History, ShoppingBag, PlusCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const navItems = [
  { href: '/dashboard',  labelKey: 'nav.home',       icon: Home },
  { href: '/history',    labelKey: 'nav.myBravos',   icon: History },
  { href: '/challenges', labelKey: 'nav.challenges', icon: Trophy },
  { href: '/shop',       labelKey: 'nav.shop',       icon: ShoppingBag },
];

interface MobileNavProps {
  onCreateBravo: () => void;
}

export default function MobileNav({ onCreateBravo }: MobileNavProps) {
  const { t } = useTranslation();
  const page = usePage();
  const currentUrl = page.url;

  const left = navItems.slice(0, 2);
  const right = navItems.slice(2);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Ombre douce au-dessus */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

      <div className="bg-white/95 backdrop-blur-xl flex items-center px-4 pb-safe" style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
        {/* Items gauche */}
        {left.map(item => {
          const active = currentUrl.startsWith(item.href);
          return (
            <button
              key={item.href}
              onClick={() => router.visit(item.href)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all ${active ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-primary/10' : ''}`}>
                <item.icon size={20} strokeWidth={active ? 2.5 : 1.75} />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest ${active ? 'text-primary' : ''}`}>{t(item.labelKey)}</span>
            </button>
          );
        })}

        {/* Bouton central CTA */}
        <button
          onClick={onCreateBravo}
          className="flex-none flex flex-col items-center mx-1 -mt-6 cursor-pointer"
          aria-label={t('nav.sendBravo')}
        >
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/40 border-4 border-white active:scale-90 transition-transform">
            <PlusCircle size={26} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-primary mt-1">{t('nav.bravo')}</span>
        </button>

        {/* Items droite */}
        {right.map(item => {
          const active = currentUrl.startsWith(item.href);
          return (
            <button
              key={item.href}
              onClick={() => router.visit(item.href)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all ${active ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-primary/10' : ''}`}>
                <item.icon size={20} strokeWidth={active ? 2.5 : 1.75} />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest ${active ? 'text-primary' : ''}`}>{t(item.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
