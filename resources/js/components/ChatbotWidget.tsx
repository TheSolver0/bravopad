import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, X, Send, Trash2, BookOpen, FileText, HelpCircle, ChevronDown, Loader2, FileSearch } from 'lucide-react';

function getCsrf(): string {
    return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    manualTitle?: string;
    pages?: number[];
}

interface QuickCategory {
    key: string;
    label: string;
    icon: React.ReactNode;
    hint: string;
}

const QUICK_CATEGORIES: QuickCategory[] = [
    {
        key: 'PD-ABP-01',
        label: 'Procédures Achat',
        icon: <BookOpen size={14} />,
        hint: 'Comment passer une commande < 5M ?',
    },
    {
        key: '',
        label: 'Aide document',
        icon: <FileText size={14} />,
        hint: 'Quel document faut-il fournir pour… ?',
    },
    {
        key: '',
        label: 'Recherche libre',
        icon: <FileSearch size={14} />,
        hint: "Posez n'importe quelle question",
    },
    {
        key: '',
        label: 'Autres',
        icon: <HelpCircle size={14} />,
        hint: "Autre question sur l'entreprise",
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
    return Math.random().toString(36).slice(2);
}

function SourceBadge({ title, pages }: { title?: string; pages?: number[] }) {
    if (!title && (!pages || pages.length === 0)) return null;
    return (
        <div className="mt-1.5 flex flex-wrap gap-1">
            {title && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    <BookOpen size={9} />
                    {title}
                </span>
            )}
            {pages && pages.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                    p. {pages.join(', ')}
                </span>
            )}
        </div>
    );
}

function MessageBubble({ msg }: { msg: Message }) {
    const isUser = msg.role === 'user';
    return (
        <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                {!isUser && (
                    <div className="mb-1 flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                            <Bot size={11} />
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">Assistant OnePAD</span>
                    </div>
                )}
                <div
                    className={`rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                        isUser
                            ? 'rounded-tr-sm bg-primary text-white'
                            : 'rounded-tl-sm bg-slate-100 text-slate-800'
                    }`}
                >
                    {msg.content}
                </div>
                {!isUser && <SourceBadge title={msg.manualTitle} pages={msg.pages} />}
            </div>
        </div>
    );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export default function ChatbotWidget() {
    const [open, setOpen]                   = useState(false);
    const [messages, setMessages]           = useState<Message[]>([]);
    const [input, setInput]                 = useState('');
    const [loading, setLoading]             = useState(false);
    const [activeCategory, setCategory]     = useState<QuickCategory | null>(null);
    const [historyLoaded, setHistoryLoaded] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef  = useRef<HTMLTextAreaElement>(null);

    // Load history once on first open
    useEffect(() => {
        if (open && !historyLoaded) {
            fetch('/chatbot/history', { headers: { Accept: 'application/json' } })
                .then(r => r.json())
                .then((data) => {
                    const loaded: Message[] = (data.messages ?? []).map((m: {
                        id: number; role: 'user' | 'assistant'; content: string; manual_key?: string;
                    }) => ({
                        id:          String(m.id),
                        role:        m.role,
                        content:     m.content,
                        manualTitle: m.manual_key ?? undefined,
                    }));
                    setMessages(loaded);
                    setHistoryLoaded(true);
                });
        }
    }, [open, historyLoaded]);

    // Auto-scroll to latest message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    // Focus textarea when panel opens
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 200);
    }, [open]);

    const handleCategoryClick = useCallback((cat: QuickCategory) => {
        setCategory(prev => prev?.label === cat.label ? null : cat);
        setInput(cat.hint);
        inputRef.current?.focus();
    }, []);

    const sendMessage = useCallback(async () => {
        const text = input.trim();
        if (!text || loading) return;

        setMessages(prev => [...prev, { id: uid(), role: 'user', content: text }]);
        setInput('');
        setLoading(true);

        try {
            const res  = await fetch('/chatbot/ask', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': getCsrf() },
                body:    JSON.stringify({ message: text, category: activeCategory?.key || null }),
            });
            const data = await res.json();

            setMessages(prev => [...prev, {
                id:          uid(),
                role:        'assistant',
                content:     data.answer ?? "Aucune réponse reçue.",
                manualTitle: data.manual_title,
                pages:       data.pages,
            }]);
        } catch {
            setMessages(prev => [...prev, {
                id:      uid(),
                role:    'assistant',
                content: "Une erreur s'est produite. Veuillez réessayer.",
            }]);
        } finally {
            setLoading(false);
        }
    }, [input, loading, activeCategory]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    const clearHistory = async () => {
        await fetch('/chatbot/clear', { method: 'DELETE', headers: { 'X-CSRF-TOKEN': getCsrf() } });
        setMessages([]);
    };

    return (
        <>
            {/* ── Floating trigger button ── */}
            <div className="fixed right-4 bottom-20 z-[55] md:right-6">
                <button
                    onClick={() => setOpen(v => !v)}
                    className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 hover:scale-105 active:scale-95"
                    aria-label="Ouvrir l'assistant"
                >
                    <AnimatePresence mode="wait" initial={false}>
                        {open ? (
                            <motion.span key="close"
                                initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }}
                                exit={{ opacity: 0, rotate: 90 }} transition={{ duration: 0.15 }}>
                                <ChevronDown size={20} />
                            </motion.span>
                        ) : (
                            <motion.span key="bot"
                                initial={{ opacity: 0, rotate: 90 }} animate={{ opacity: 1, rotate: 0 }}
                                exit={{ opacity: 0, rotate: -90 }} transition={{ duration: 0.15 }}>
                                <Bot size={20} />
                            </motion.span>
                        )}
                    </AnimatePresence>
                    {!open && (
                        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                    )}
                </button>
            </div>

            {/* ── Chat panel ── */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        key="chatbot-panel"
                        initial={{ opacity: 0, y: 16, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.97 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="fixed right-3 bottom-20 z-[55] flex w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-primary/10 sm:right-6 sm:w-[360px] md:bottom-6"
                        style={{ height: 'min(72vh, 560px)' }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-primary/20 bg-primary px-4 py-3 text-white">
                            <div className="flex items-center gap-2">
                                <Bot size={18} />
                                <div>
                                    <p className="text-sm font-semibold leading-none">Assistant OnePAD</p>
                                    <p className="mt-0.5 text-[10px] text-white/60">Procédures & documentation interne</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={clearHistory}
                                    className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                                    title="Effacer la conversation"
                                >
                                    <Trash2 size={14} />
                                </button>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Quick categories */}
                        <div className="flex gap-1.5 overflow-x-auto border-b border-slate-100 bg-slate-50 px-3 py-2 scrollbar-none">
                            {QUICK_CATEGORIES.map(cat => (
                                <button
                                    key={cat.label}
                                    onClick={() => handleCategoryClick(cat)}
                                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                        activeCategory?.label === cat.label
                                            ? 'bg-primary text-white'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:border-primary/40 hover:text-primary'
                                    }`}
                                >
                                    {cat.icon}
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* Messages area */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                            {messages.length === 0 && !loading && (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                                    <Bot size={32} className="text-primary/20" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Comment puis-je vous aider ?</p>
                                        <p className="text-xs mt-1 text-slate-400">Choisissez une catégorie ou posez directement votre question.</p>
                                    </div>
                                </div>
                            )}
                            {messages.map(msg => (
                                <MessageBubble key={msg.id} msg={msg} />
                            ))}
                            {loading && (
                                <div className="flex items-center gap-2 text-slate-400">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                                        <Loader2 size={11} className="animate-spin text-primary" />
                                    </span>
                                    <span className="text-xs">Recherche dans les manuels…</span>
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input area */}
                        <div className="border-t border-slate-100 bg-white px-3 py-2">
                            {activeCategory && (
                                <div className="mb-1.5 flex items-center justify-between rounded-lg bg-primary/8 px-2.5 py-1">
                                    <span className="text-[10px] text-primary font-medium">
                                        Catégorie : {activeCategory.label}
                                    </span>
                                    <button onClick={() => setCategory(null)} className="text-primary/50 hover:text-primary">
                                        <X size={11} />
                                    </button>
                                </div>
                            )}
                            <div className="flex items-end gap-2">
                                <textarea
                                    ref={inputRef}
                                    rows={1}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Écrivez votre question…"
                                    className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-primary focus:bg-white transition-colors max-h-28 overflow-y-auto"
                                    style={{ minHeight: '38px' }}
                                    disabled={loading}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!input.trim() || loading}
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                                </button>
                            </div>
                            <p className="mt-1.5 text-[9px] text-slate-400 text-center">
                                Entrée pour envoyer · Maj+Entrée pour nouvelle ligne
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
