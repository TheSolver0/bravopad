import React from 'react';
import { LayoutDashboard, Trophy, History, PlusCircle } from 'lucide-react';
import { View } from '../../pages/types';

interface MobileNavProps {
  currentView: View;
  setCurrentView: (v: View) => void;
}

export const MobileNav = ({ currentView, setCurrentView }: MobileNavProps) => {
  const topNavItems = [
    { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard },
    { id: 'challenges', label: 'Défis', icon: Trophy },
    { id: 'history', label: 'Mes Bravos', icon: History },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-surface-container-high px-8 py-4 flex justify-between md:hidden shadow-2xl">
      {topNavItems.map(item => (
        <button
          key={item.id}
          onClick={() => setCurrentView(item.id as View)}
          className={`flex flex-col items-center gap-1.5 transition-all cursor-pointer ${currentView === item.id ? 'text-primary scale-110' : 'text-on-surface-variant'}`}
        >
          <item.icon size={22} className={currentView === item.id ? 'fill-primary/10' : ''} />
          <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
        </button>
      ))}
      <button
        onClick={() => setCurrentView('create')}
        className="flex flex-col items-center -mt-10 cursor-pointer"
      >
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-primary/40 border-4 border-white rotate-3 active:scale-90 transition-all">
          <PlusCircle size={32} />
        </div>
      </button>
    </nav>
  );
};
