import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, router, usePage } from '@inertiajs/react';
import {
  Search, X, Star, Smile, Paperclip, HelpCircle,
  Sparkles, Loader2, CheckCircle, RotateCcw, Mic, MicOff,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { User, BravoValue } from './types';
import { BADGES } from './constants';

interface CreateBravoProps {
  users: User[];
  bravoValues: BravoValue[];
  onSuccess?: () => void;
  isModal?: boolean;
}

function getAvatar(user: { name: string; avatar?: string | null }): string {
  if (user.avatar && user.avatar.trim() !== '') return user.avatar;
  const initials = user.name.split(' ').slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=6366f1&color=ffffff&size=64&bold=true&format=svg`;
}

export default function CreateBravo({ users, bravoValues, onSuccess, isModal }: CreateBravoProps) {
  const [selectedRecipient, setSelectedRecipient] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRephrasing, setIsRephrasing] = useState(false);
  const [originalMessage, setOriginalMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const messageRef = useRef('');
  const searchRef = useRef<HTMLDivElement>(null);

  const { data, setData, post, processing, errors } = useForm({
    receiver_id: '' as string | number,
    badge: '' as string,
    value_ids: [] as number[],
    message: '',
  });

  messageRef.current = data.message;

  const page = usePage<{ currentUser?: { monthly_points_remaining?: number; monthly_points_allowance?: number } }>();
  const monthlyRemaining = page.props.currentUser?.monthly_points_remaining ?? 100;

  const selectedBadge = BADGES.find(b => b.key === data.badge) ?? null;
  const selectedValues = bravoValues.filter(v => data.value_ids.includes(v.id));
  const valueBonus = Math.round(selectedValues.reduce((sum, v) => sum + 5 * v.multiplier, 0));
  const totalPoints = (selectedBadge?.points ?? 0) + valueBonus;
  const pointsAfter = monthlyRemaining - totalPoints;

  useEffect(() => {
    if (searchTerm.trim()) {
      setFilteredUsers(users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())));
    } else {
      setFilteredUsers([]);
    }
  }, [searchTerm, users]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setFilteredUsers([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelectRecipient = (user: User) => {
    setSelectedRecipient(user);
    setData('receiver_id', user.id);
    setSearchTerm('');
    setFilteredUsers([]);
  };

  const handleRemoveRecipient = () => {
    setSelectedRecipient(null);
    setData('receiver_id', '');
  };

  const handleToggleValue = (valueId: number) => {
    setData('value_ids',
      data.value_ids.includes(valueId)
        ? data.value_ids.filter(id => id !== valueId)
        : [...data.value_ids, valueId]
    );
  };

  const handleVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("La dictée vocale n'est pas supportée par votre navigateur."); return; }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const current = messageRef.current;
      setData('message', current ? `${current} ${transcript}` : transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const handleRephrase = async () => {
    if (!data.message.trim()) return;
    if (originalMessage === null) setOriginalMessage(data.message);
    setIsRephrasing(true);
    try {
      const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
      const resp = await fetch('/ai/rephrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify({ message: data.message }),
      });
      const json = await resp.json();
      if (json.message) setData('message', json.message);
    } catch { /* silently fail */ }
    finally { setIsRephrasing(false); }
  };

  const handleRestoreOriginal = () => {
    if (originalMessage !== null) { setData('message', originalMessage); setOriginalMessage(null); }
  };

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    post('/bravos', {
      onSuccess: () => {
        if (isModal && onSuccess) { onSuccess(); }
        else { setSubmitted(true); setTimeout(() => router.visit('/dashboard'), 1800); }
      },
    });
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6 animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-extrabold text-center">Bravo envoyé !</h2>
        <p className="text-gray-500 text-center">Votre collègue a été notifié. Redirection…</p>
      </div>
    );
  }

  return (
    <div className={isModal ? 'space-y-6' : 'max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500'}>

      {/* Titre */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reconnaître un collègue</h1>
        <p className="text-sm text-gray-500 mt-0.5">Envoyez un message de reconnaissance</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Destinataire */}
        <div ref={searchRef} className="relative">
          <div className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-xl bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <Search size={17} className="text-gray-400 shrink-0" />
            {selectedRecipient ? (
              <div className="flex items-center gap-2 bg-gray-100 rounded-full pl-1 pr-2 py-0.5">
                <img src={getAvatar(selectedRecipient)} alt="" className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
                <span className="text-sm font-medium text-gray-700">{selectedRecipient.name}</span>
                <button type="button" onClick={handleRemoveRecipient} className="text-gray-400 hover:text-gray-600 transition-colors ml-0.5">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <input
                placeholder="Rechercher un collègue..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400"
              />
            )}
          </div>
          {filteredUsers.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
              {filteredUsers.map(user => (
                <button
                  type="button"
                  key={user.id}
                  className="flex items-center gap-3 px-4 py-2.5 w-full text-left hover:bg-gray-50 transition-colors"
                  onClick={() => handleSelectRecipient(user)}
                >
                  <img src={getAvatar(user)} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.role} · {user.department}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {errors.receiver_id && <p className="text-xs text-red-500 mt-1">{errors.receiver_id}</p>}
        </div>

        {/* Sélection du niveau */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800">Choisir un niveau</h3>
          <div className="flex flex-wrap gap-2">
            {BADGES.map(badge => {
              const isSelected = data.badge === badge.key;
              return (
                <button
                  type="button"
                  key={badge.key}
                  onClick={() => setData('badge', badge.key)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all bg-white"
                  style={isSelected
                    ? { borderColor: badge.color, color: badge.color }
                    : { borderColor: '#e5e7eb', color: '#6b7280' }
                  }
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors"
                    style={{ backgroundColor: isSelected ? badge.color : '#e5e7eb' }}
                  >
                    <Star size={10} className="text-white fill-white" />
                  </div>
                  {badge.label}!
                </button>
              );
            })}
          </div>

          {/* Info points */}
          {selectedBadge && (
            <div className={`text-sm px-4 py-2.5 rounded-lg leading-relaxed ${pointsAfter < 0 ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
              <span className="font-semibold">{selectedBadge.label}</span> = {totalPoints} pts.
              {' '}Il vous restera{' '}
              <span className={`font-semibold ${pointsAfter < 0 ? 'text-red-600' : ''}`}>
                {pointsAfter < 0 ? '0' : pointsAfter} pt{pointsAfter !== 1 ? 's' : ''}
              </span> à donner ce mois-ci.
              {pointsAfter < 0 && <span className="block mt-1 text-xs font-medium">⚠ Quota mensuel insuffisant ({monthlyRemaining} pts restants).</span>}
            </div>
          )}
          {errors.badge && <p className="text-xs text-red-500">{errors.badge}</p>}
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-800">Écrire un message</h3>
          <div className="border border-gray-300 rounded-xl overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <textarea
              placeholder="Merci pour ton soutien ce mois-ci ! Ton aide fait vraiment la différence."
              className="w-full px-4 pt-4 pb-2 min-h-[160px] outline-none text-sm text-gray-700 resize-none placeholder-gray-400"
              value={data.message}
              onChange={e => setData('message', e.target.value)}
              maxLength={1000}
            />
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50/50">
              <button type="button" className="text-gray-400 hover:text-gray-600 transition-colors">
                <HelpCircle size={17} />
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleVoice}
                  title={isListening ? 'Arrêter' : 'Dicter'}
                  className={`transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {isListening ? <MicOff size={17} /> : <Mic size={17} />}
                </button>
                <button type="button" className="text-gray-400 hover:text-gray-600 transition-colors"><Smile size={17} /></button>
                <button type="button" className="text-gray-400 hover:text-gray-600 transition-colors"><Paperclip size={17} /></button>
                <button type="button" className="text-gray-400 hover:text-gray-600 transition-colors"><Sparkles size={17} /></button>
                <button type="button" className="border border-gray-300 rounded px-1.5 py-0.5 text-[10px] font-bold text-gray-500 hover:border-gray-400 transition-colors">GIF</button>
              </div>
            </div>
          </div>

          {/* Compteur + boutons AI */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRephrase}
                disabled={isRephrasing || !data.message.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:border-primary hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white"
              >
                {isRephrasing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Améliorer avec l'IA
              </button>
              {originalMessage !== null && (
                <button
                  type="button"
                  onClick={handleRestoreOriginal}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
                >
                  <RotateCcw size={13} />
                  Restaurer le message original
                </button>
              )}
            </div>
            <span className="text-xs text-gray-400">{data.message.length}/1000</span>
          </div>

          {isListening && (
            <p className="text-xs text-red-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
              Écoute en cours — parlez maintenant.
            </p>
          )}
          {errors.message && <p className="text-xs text-red-500">{errors.message}</p>}
        </div>

        {/* Qualités */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800">Choisir des qualités</h3>
          <div className="flex flex-wrap gap-2">
            {bravoValues.map(val => {
              const isSelected = data.value_ids.includes(val.id);
              return (
                <button
                  type="button"
                  key={val.id}
                  onClick={() => handleToggleValue(val.id)}
                  className="px-3 py-1.5 rounded-full border text-sm transition-all"
                  style={isSelected
                    ? { backgroundColor: val.color, borderColor: val.color, color: '#fff' }
                    : { backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#374151' }
                  }
                >
                  {val.name}
                </button>
              );
            })}
          </div>
          {errors.value_ids && <p className="text-xs text-red-500">{errors.value_ids}</p>}
        </div>

        {/* Soumettre */}
        <Button
          type="submit"
          className="w-full py-3 text-sm font-semibold"
          disabled={processing || !data.receiver_id || !data.badge || pointsAfter < 0}
        >
          {processing ? 'Envoi en cours…' : 'Envoyer le Bravo'}
        </Button>
        <p className="text-center text-[10px] text-gray-400 uppercase tracking-widest">
          La personne remerciée recevra une notification immédiate.
        </p>
      </form>
    </div>
  );
}
