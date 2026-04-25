import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useForm, router } from '@inertiajs/react';
import { MessageSquare, Award, PlusCircle, Search, XCircle, CheckCircle, Mic, MicOff, Sparkles, Loader2, Lightbulb } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { User, BravoValue } from './types';

export interface BravoInsights {
  concentration_alerts: string[];
  balancing_suggestions: {
    id: number;
    name: string;
    department?: string;
    reason: string;
    received_recent: number;
  }[];
  quality: { score: number; tips: string[] };
}

interface CreateBravoProps {
  users: User[];
  bravoValues: BravoValue[];
  bravoInsights?: BravoInsights;
  onSuccess?: () => void;
  isModal?: boolean;
}

const emptyInsights: BravoInsights = {
  concentration_alerts: [],
  balancing_suggestions: [],
  quality: { score: 70, tips: [] },
};

export default function CreateBravo({ users, bravoValues, bravoInsights = emptyInsights, onSuccess, isModal }: CreateBravoProps) {
  const [selectedRecipient, setSelectedRecipient] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRephrasing, setIsRephrasing] = useState(false);
  const [pointsManuallySet, setPointsManuallySet] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messageRef = useRef('');

  const { data, setData, post, processing, errors } = useForm({
    receiver_id: '' as string | number,
    value_ids: [] as number[],
    message: '',
    custom_points: 10,
  });

  // Keep ref in sync for voice handler (avoids stale closure)
  messageRef.current = data.message;

  const selectedValues = bravoValues.filter(v => data.value_ids.includes(v.id));
  const suggestedPoints = selectedValues.length > 0
    ? Math.round(selectedValues.reduce((sum, v) => sum + 10 * v.multiplier, 0))
    : 10;

  // Filter users by search
  useEffect(() => {
    if (searchTerm.trim()) {
      setFilteredUsers(users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())));
    } else {
      setFilteredUsers([]);
    }
  }, [searchTerm, users]);

  // Auto-suggest points when values change, unless user manually set them
  useEffect(() => {
    if (!pointsManuallySet) {
      setData('custom_points', suggestedPoints);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.value_ids.join(',')]);

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

  const handlePointsChange = (val: number) => {
    setPointsManuallySet(true);
    setData('custom_points', Math.max(1, Math.min(1000, val)));
  };


  const handleUseSuggestion = () => {
    setPointsManuallySet(false);
    setData('custom_points', suggestedPoints);
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

  const liveQualityScore = useMemo(() => {
    let score = Math.round(bravoInsights.quality.score * 0.55);
    const len = (data.message || '').trim().length;
    if (len >= 120) score += 25;
    else if (len >= 60) score += 15;
    else if (len >= 20) score += 8;
    if (data.value_ids.length >= 2) score += 15;
    if (data.value_ids.length >= 3) score += 8;
    if (selectedRecipient) score += 7;
    return Math.min(100, Math.max(0, score));
  }, [bravoInsights.quality.score, data.message, data.value_ids, selectedRecipient]);

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

      {(bravoInsights.concentration_alerts.length > 0 ||
        bravoInsights.balancing_suggestions.length > 0 ||
        bravoInsights.quality.tips.length > 0) && (
        <Card className="p-5 space-y-4 border-none shadow-lg bg-gradient-to-br from-amber-50/90 via-white to-sky-50/80">
          <div className="flex items-center gap-2 text-amber-900">
            <Lightbulb size={18} />
            <span className="text-xs font-black uppercase tracking-widest">Anti-biais & qualité</span>
          </div>
          {bravoInsights.concentration_alerts.length > 0 && (
            <div className="space-y-2">
              {bravoInsights.concentration_alerts.map((a, i) => (
                <p key={i} className="text-xs font-semibold text-amber-950 bg-amber-100/80 rounded-lg px-3 py-2">
                  {a}
                </p>
              ))}
            </div>
          )}
          {bravoInsights.balancing_suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-on-surface-variant">Suggestions cross-équipe (faible visibilité récente)</p>
              <div className="flex flex-wrap gap-2">
                {bravoInsights.balancing_suggestions.slice(0, 5).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      const u = users.find((x) => x.id === s.id);
                      if (u) handleSelectRecipient(u);
                    }}
                    className="text-left text-[11px] font-bold px-3 py-2 rounded-xl bg-white border border-sky-200 text-sky-900 hover:border-primary/40 transition-colors"
                  >
                    {s.name}
                    <span className="block font-medium text-on-surface-variant mt-0.5">
                      {s.department ?? '—'} · {s.received_recent} reçus (90j)
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-amber-200/50">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Score qualité (aperçu)</p>
              <p className="text-2xl font-black text-primary">{liveQualityScore}</p>
            </div>
            <div className="flex-1 space-y-1">
              {(bravoInsights.quality.tips.length > 0 ? bravoInsights.quality.tips : ['Ajoutez un message personnalisé et plusieurs valeurs pour renforcer la reconnaissance.']).map(
                (t, i) => (
                  <p key={i} className="text-[11px] text-on-surface-variant leading-snug">
                    · {t}
                  </p>
                ),
              )}
            </div>
          </div>
        </Card>
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

          {/* Valeurs illustrées — multi-sélection */}
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
              Valeurs illustrées <span className="text-red-500">*</span>
              <span className="ml-2 normal-case font-medium text-[10px] text-on-surface-variant/60">plusieurs choix possibles</span>
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
            {selectedValues.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {selectedValues.map(v => (
                  <Badge key={v.id} variant="primary" className="text-white border-none text-xs" style={{ backgroundColor: v.color }}>
                    {v.name}
                  </Badge>
                ))}
                <span className="text-xs text-on-surface-variant">
                  → Points totaux &nbsp;
                  <strong className="text-primary">{suggestedPoints} pts</strong>
                </span>
              </div>
            )}
            {errors.value_ids && <p className="text-xs text-red-500 font-medium">{errors.value_ids}</p>}
          </div>

          {/* Points personnalisés */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
                Points attribués <span className="text-red-500">*</span>
              </label>
              {pointsManuallySet && selectedValues.length > 0 && (
                <button
                  type="button"
                  onClick={handleUseSuggestion}
                  className="text-[10px] text-primary font-bold hover:underline"
                >
                  Utiliser la suggestion ({suggestedPoints} pts)
                </button>
              )}
            </div>
            <div className="flex flex-col gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
              <div className="flex items-center gap-3">
                <Award size={20} className="text-secondary shrink-0" />
                <input
                  type="number"
                  disabled
                  min={1}
                  max={1000}
                  value={data.custom_points}
                  onChange={(e) => handlePointsChange(Number(e.target.value))}
                  className="w-24 text-center text-2xl font-black text-primary bg-white rounded-lg border border-primary/20 focus:ring-2 focus:ring-primary/20 focus:outline-none py-1"
                />
                <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">pts</span>
              </div>
            </div>
            {errors.custom_points && <p className="text-xs text-red-500 font-medium">{errors.custom_points}</p>}
          </div>

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
              disabled={processing || !data.receiver_id || data.value_ids.length === 0}
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
