import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, router } from '@inertiajs/react';
import { MessageSquare, Award, PlusCircle, Search, XCircle, CheckCircle, Mic, MicOff, Sparkles, Loader2 } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { User, BravoValue } from './types';
import { BADGES } from './constants';

interface CreateBravoProps {
  users: User[];
  bravoValues: BravoValue[];
  onSuccess?: () => void;
  isModal?: boolean;
}

export default function CreateBravo({ users, bravoValues, onSuccess, isModal }: CreateBravoProps) {
  const [selectedRecipient, setSelectedRecipient] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRephrasing, setIsRephrasing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messageRef = useRef('');

  const { data, setData, post, processing, errors } = useForm({
    receiver_id: '' as string | number,
    badge: '' as string,
    value_ids: [] as number[],
    message: '',
  });

  // Keep ref in sync for voice handler (avoids stale closure)
  messageRef.current = data.message;

  const selectedBadge = BADGES.find(b => b.key === data.badge) ?? null;
  const selectedValues = bravoValues.filter(v => data.value_ids.includes(v.id));
  const valueBonus = Math.round(selectedValues.reduce((sum, v) => sum + 5 * v.multiplier, 0));
  const totalPoints = (selectedBadge?.points ?? 0) + valueBonus;

  // Filter users by search
  useEffect(() => {
    if (searchTerm.trim()) {
      setFilteredUsers(users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())));
    } else {
      setFilteredUsers([]);
    }
  }, [searchTerm, users]);

  const handleSelectRecipient = (user: User) => {
    setSelectedRecipient(user);
    setData('receiver_id', user.id);
    setSearchTerm('');
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

  // Voice dictation via Web Speech API
  const handleVoice = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("La dictée vocale n'est pas supportée par votre navigateur.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

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

  // AI rephrase via backend endpoint
  const handleRephrase = async () => {
    if (!data.message.trim()) return;
    setIsRephrasing(true);
    try {
      const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
      const resp = await fetch('/ai/rephrase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({ message: data.message }),
      });
      const json = await resp.json();
      if (json.message) setData('message', json.message);
    } catch {
      // silently fail — user keeps their original message
    } finally {
      setIsRephrasing(false);
    }
  };

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    post('/bravos', {
      onSuccess: () => {
        if (isModal && onSuccess) {
          onSuccess();
        } else {
          setSubmitted(true);
          setTimeout(() => router.visit('/dashboard'), 1800);
        }
      },
    });
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-24 space-y-6 animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-extrabold text-center">Bravo envoyé !</h2>
        <p className="text-on-surface-variant text-center">Votre collègue a été notifié. Redirection vers le dashboard…</p>
      </div>
    );
  }

  return (
    <div className={isModal ? 'space-y-8' : 'max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500'}>
      {!isModal && (
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight">Envoyer un Bravo</h1>
          <p className="text-sm text-on-surface-variant font-medium">Célébrez le travail exceptionnel d'un collègue.</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="p-6 space-y-6 border-none shadow-xl bg-white/80 backdrop-blur-md">

          {/* Destinataire */}
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
              Qui voulez-vous remercier ? <span className="text-red-500">*</span>
            </label>
            {selectedRecipient ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low border border-primary/30 shadow-sm relative">
                <img src={selectedRecipient.avatar} alt={selectedRecipient.name} className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                <div>
                  <span className="font-bold text-on-surface">{selectedRecipient.name}</span>
                  <p className="text-xs text-on-surface-variant">{selectedRecipient.role} · {selectedRecipient.department}</p>
                </div>
                <button type="button" onClick={handleRemoveRecipient} className="absolute top-1 right-1 text-on-surface-variant hover:text-red-500 transition-colors p-1 rounded-full">
                  <XCircle size={18} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60" size={16} />
                <input
                  type="text"
                  placeholder="Rechercher un collègue..."
                  className="w-full pl-12 pr-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-4 focus:ring-primary/5 text-sm font-medium transition-all placeholder:text-on-surface-variant/50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && filteredUsers.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-surface-container-high rounded-xl shadow-lg mt-2 max-h-60 overflow-y-auto">
                    {filteredUsers.map(user => (
                      <button
                        type="button"
                        key={user.id}
                        className="flex items-center gap-3 p-3 w-full text-left hover:bg-surface-container-low transition-colors"
                        onClick={() => handleSelectRecipient(user)}
                      >
                        <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                        <div>
                          <span className="font-medium text-on-surface">{user.name}</span>
                          <p className="text-xs text-on-surface-variant">{user.role}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchTerm && filteredUsers.length === 0 && (
                  <div className="absolute z-10 w-full bg-white border border-surface-container-high rounded-xl shadow-lg mt-2 p-4 text-center text-sm text-on-surface-variant">
                    Aucun collègue trouvé.
                  </div>
                )}
              </div>
            )}
            {errors.receiver_id && <p className="text-xs text-red-500 font-medium">{errors.receiver_id}</p>}
          </div>

          {/* Badge */}
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
              Badge <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {BADGES.map(badge => {
                const isSelected = data.badge === badge.key;
                return (
                  <button
                    type="button"
                    key={badge.key}
                    onClick={() => setData('badge', badge.key)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 font-bold text-sm transition-all ${
                      isSelected
                        ? 'text-white shadow-md border-transparent'
                        : 'bg-surface-container-low text-on-surface-variant border-transparent hover:border-primary/30'
                    }`}
                    style={isSelected ? { backgroundColor: badge.color } : {}}
                  >
                    <span className="text-2xl">{badge.emoji}</span>
                    <span>{badge.label}</span>
                    <span className={`text-xs font-black ${isSelected ? 'text-white/80' : 'text-primary'}`}>{badge.points} pts</span>
                  </button>
                );
              })}
            </div>
            {errors.badge && <p className="text-xs text-red-500 font-medium">{errors.badge}</p>}
          </div>

          {/* Valeurs illustrées — bonus */}
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
              Valeurs illustrées
              <span className="ml-2 normal-case font-medium text-[10px] text-on-surface-variant/60">bonus optionnels</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {bravoValues.map(val => {
                const isSelected = data.value_ids.includes(val.id);
                return (
                  <button
                    type="button"
                    key={val.id}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 flex items-center gap-1 ${
                      isSelected
                        ? 'text-white shadow-sm border-transparent'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-primary/10 hover:text-primary border-transparent'
                    }`}
                    style={isSelected ? { backgroundColor: val.color, borderColor: val.color } : {}}
                    onClick={() => handleToggleValue(val.id)}
                  >
                    {isSelected && <span className="text-[10px] leading-none">✓</span>}
                    {val.name}
                  </button>
                );
              })}
            </div>
            {errors.value_ids && <p className="text-xs text-red-500 font-medium">{errors.value_ids}</p>}
          </div>

          {/* Points total */}
          {selectedBadge && (
            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
              <Award size={20} className="text-secondary shrink-0" />
              <div className="flex-1 text-sm text-on-surface-variant">
                <span className="font-medium">{selectedBadge.label}</span>
                <span className="text-on-surface-variant/60"> ({selectedBadge.points} pts)</span>
                {valueBonus > 0 && <span className="text-green-600 font-semibold"> + {valueBonus} pts bonus</span>}
              </div>
              <span className="text-2xl font-black text-primary">{totalPoints} pts</span>
            </div>
          )}

          {/* Message */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Votre Message</label>
            <div className="relative">
              <MessageSquare className="absolute left-4 top-4 text-on-surface-variant/60" size={16} />
              <textarea
                placeholder="Décrivez pourquoi ce collègue mérite un bravo..."
                className="w-full pl-12 pr-4 pb-12 py-3 bg-surface-container-low rounded-xl border-none min-h-[120px] focus:ring-4 focus:ring-primary/5 text-sm font-medium transition-all placeholder:text-on-surface-variant/50"
                value={data.message}
                onChange={(e) => setData('message', e.target.value)}
              />
              {/* Voice + AI buttons inside textarea */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleVoice}
                  title={isListening ? 'Arrêter la dictée' : 'Dicter par voix'}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isListening
                      ? 'bg-red-100 text-red-600 animate-pulse'
                      : 'bg-white/80 border border-surface-container-high text-on-surface-variant hover:text-primary hover:border-primary/30'
                  }`}
                >
                  {isListening ? <MicOff size={13} /> : <Mic size={13} />}
                  <span>{isListening ? 'Stop' : 'Voix'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleRephrase}
                  disabled={isRephrasing || !data.message.trim()}
                  title="Reformuler avec l'IA"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/80 border border-surface-container-high text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isRephrasing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  <span>{isRephrasing ? 'IA…' : 'IA'}</span>
                </button>
              </div>
            </div>
            {isListening && (
              <p className="text-xs text-red-500 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
                Écoute en cours — parlez maintenant.
              </p>
            )}
            {errors.message && <p className="text-xs text-red-500 font-medium">{errors.message}</p>}
          </div>

          <div className="pt-2 space-y-4">
            <Button
              type="submit"
              className="w-full py-2.5 text-sm shadow-md shadow-primary/20"
              disabled={processing || !data.receiver_id || !data.badge}
            >
              <PlusCircle size={18} />
              {processing ? 'Envoi en cours…' : 'Envoyer le Bravo'}
            </Button>
            <p className="text-center text-[10px] text-on-surface-variant font-black uppercase tracking-widest">La personne remerciée recevra une notification immédiate.</p>
          </div>
        </Card>
      </form>
    </div>
  );
}
