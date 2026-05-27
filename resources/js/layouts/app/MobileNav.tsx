import { router, usePage } from '@inertiajs/react';
import { Home, MessageCircle, Users, Bell, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LEFT_ITEMS = [
  { href: '/feed',     labelKey: 'nav.feed',     icon: Home },
  { href: '/messages', labelKey: 'nav.messages',  icon: MessageCircle },
];

const RIGHT_ITEMS = [
  { href: '/team',          labelKey: 'nav.team',          icon: Users },
  { href: '/notifications', labelKey: 'nav.notifications', icon: Bell },
];

interface MobileNavProps {
  onCreateBravo: () => void;
  unreadCount?: number;
}

export default function MobileNav({ onCreateBravo, unreadCount = 0 }: MobileNavProps) {
  const { t } = useTranslation();
  const page = usePage<{
    auth?: { unread_notifications_count?: number };
  }>();
  const currentUrl = page.url;
  const notifCount = page.props.auth?.unread_notifications_count ?? unreadCount;

  function isActive(href: string) {
    return currentUrl === href || currentUrl.startsWith(`${href}/`);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-bottom">
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div
        className="bg-background/95 backdrop-blur-xl flex items-center px-2"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
      >
        {/* Items gauche */}
        {LEFT_ITEMS.map(item => {
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              onClick={() => router.visit(item.href)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 transition-all ${
                active ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              <div className={`relative p-1.5 rounded-xl transition-all ${active ? 'bg-primary/10' : ''}`}>
                <item.icon size={20} strokeWidth={active ? 2.5 : 1.75} />
                {/* Badge messages non-lus */}
                {item.href === '/messages' && notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border border-background" />
                )}
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${active ? 'text-primary' : ''}`}>
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}

        {/* Bouton central CTA */}
        <button
          onClick={onCreateBravo}
          className="flex-none flex flex-col items-center mx-2 -mt-5 cursor-pointer"
          aria-label={t('nav.sendBravo', 'Envoyer un Bravo')}
        >
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/40 border-4 border-background active:scale-90 transition-transform">
            <Award size={24} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-primary mt-1 leading-none">
            Bravo
          </span>
        </button>

        {/* Items droite */}
        {RIGHT_ITEMS.map(item => {
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              onClick={() => router.visit(item.href)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 transition-all ${
                active ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              <div className={`relative p-1.5 rounded-xl transition-all ${active ? 'bg-primary/10' : ''}`}>
                <item.icon size={20} strokeWidth={active ? 2.5 : 1.75} />
                {/* Badge notifications */}
                {item.href === '/notifications' && notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 flex items-center justify-center text-[8px] font-black bg-red-500 text-white rounded-full border border-background">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${active ? 'text-primary' : ''}`}>
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
