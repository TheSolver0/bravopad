import { useState, useRef, useEffect, useCallback } from 'react';
import { User } from '@/pages/types';

function getAvatar(user: { name: string; avatar?: string | null }): string {
    if (user.avatar && user.avatar.trim() !== '') return user.avatar;
    const initials = user.name.split(' ').slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=6366f1&color=ffffff&size=64&bold=true&format=svg`;
}

/** Detects an active @mention query in text before the cursor. */
function detectMentionAt(text: string, cursorPos: number): { query: string; start: number } | null {
    const before = text.slice(0, cursorPos);
    const match = before.match(/@([^@\n]*)$/);
    if (!match) return null;
    return { query: match[1], start: before.length - match[0].length };
}

/** Renders message text with @mentions highlighted as blue chips. */
export function renderWithMentions(text: string): React.ReactNode[] {
    const parts = text.split(/(@[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]*)/g);
    return parts.map((part, i) => {
        if (/^@[A-Za-zÀ-ÿ]/.test(part)) {
            return (
                <span key={i} className="inline-flex items-center text-[#0B3D7A] font-semibold bg-[#EEF4FF] rounded-full px-1.5 py-0 text-[0.85em]">
                    {part}
                </span>
            );
        }
        return <span key={i}>{part}</span>;
    });
}

/* ─── Textarea with @mention support ─── */

interface MentionTextareaProps {
    value: string;
    onChange: (value: string) => void;
    users: User[];
    placeholder?: string;
    className?: string;
    maxLength?: number;
}

export function MentionTextarea({ value, onChange, users, placeholder, className, maxLength }: MentionTextareaProps) {
    const [mentionState, setMentionState] = useState<{ query: string; start: number } | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredUsers = mentionState
        ? users.filter(u => u.name.toLowerCase().includes(mentionState.query.toLowerCase())).slice(0, 6)
        : [];

    const insertMention = useCallback((user: User) => {
        const textarea = textareaRef.current;
        if (!textarea || !mentionState) return;
        const cursor = textarea.selectionStart ?? value.length;
        const newText = value.slice(0, mentionState.start) + `@${user.name} ` + value.slice(cursor);
        onChange(newText);
        setMentionState(null);
        setTimeout(() => {
            textarea.focus();
            const pos = mentionState.start + user.name.length + 2;
            textarea.setSelectionRange(pos, pos);
        }, 0);
    }, [value, mentionState, onChange]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newVal = e.target.value;
        onChange(newVal);
        const cursor = e.target.selectionStart ?? newVal.length;
        const found = detectMentionAt(newVal, cursor);
        setMentionState(found);
        setActiveIndex(0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!mentionState || filteredUsers.length === 0) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filteredUsers.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
        else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(filteredUsers[activeIndex]); }
        else if (e.key === 'Escape') setMentionState(null);
    };

    const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        const el = e.currentTarget;
        const found = detectMentionAt(el.value, el.selectionStart ?? el.value.length);
        setMentionState(found);
        setActiveIndex(0);
    };

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                textareaRef.current && !textareaRef.current.contains(e.target as Node)
            ) setMentionState(null);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const showDropdown = mentionState !== null && filteredUsers.length > 0;

    return (
        <div className="relative">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onSelect={handleSelect}
                placeholder={placeholder}
                className={className}
                maxLength={maxLength}
            />
            {showDropdown && (
                <div ref={dropdownRef}
                    className="absolute z-50 bottom-full left-0 mb-1 w-64 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="px-3 py-1.5 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Identifier un collègue
                    </div>
                    {filteredUsers.map((user, i) => (
                        <button
                            key={user.id}
                            type="button"
                            className={`flex items-center gap-3 px-3 py-2.5 w-full text-left transition-colors ${i === activeIndex ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                            onMouseDown={e => { e.preventDefault(); insertMention(user); }}
                            onMouseEnter={() => setActiveIndex(i)}
                        >
                            <img src={getAvatar(user)} alt="" className="w-7 h-7 rounded-full shrink-0" referrerPolicy="no-referrer" />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                                <p className="text-xs text-gray-400 truncate">{user.department}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Single-line input with @mention support ─── */

interface MentionInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit?: () => void;
    users: User[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export function MentionInput({ value, onChange, onSubmit, users, placeholder, className, disabled }: MentionInputProps) {
    const [mentionState, setMentionState] = useState<{ query: string; start: number } | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredUsers = mentionState
        ? users.filter(u => u.name.toLowerCase().includes(mentionState.query.toLowerCase())).slice(0, 6)
        : [];

    const insertMention = useCallback((user: User) => {
        const input = inputRef.current;
        if (!input || !mentionState) return;
        const cursor = input.selectionStart ?? value.length;
        const newText = value.slice(0, mentionState.start) + `@${user.name} ` + value.slice(cursor);
        onChange(newText);
        setMentionState(null);
        setTimeout(() => {
            input.focus();
            const pos = mentionState.start + user.name.length + 2;
            input.setSelectionRange(pos, pos);
        }, 0);
    }, [value, mentionState, onChange]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        onChange(newVal);
        const cursor = e.target.selectionStart ?? newVal.length;
        const found = detectMentionAt(newVal, cursor);
        setMentionState(found);
        setActiveIndex(0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (mentionState && filteredUsers.length > 0) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filteredUsers.length - 1)); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); return; }
            if (e.key === 'Tab') { e.preventDefault(); insertMention(filteredUsers[activeIndex]); return; }
            if (e.key === 'Escape') { setMentionState(null); return; }
            if (e.key === 'Enter') { e.preventDefault(); insertMention(filteredUsers[activeIndex]); return; }
        }
        if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
            e.preventDefault();
            onSubmit();
        }
    };

    const handleSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
        const el = e.currentTarget;
        setMentionState(detectMentionAt(el.value, el.selectionStart ?? el.value.length));
        setActiveIndex(0);
    };

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                inputRef.current && !inputRef.current.contains(e.target as Node)
            ) setMentionState(null);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const showDropdown = mentionState !== null && filteredUsers.length > 0;

    return (
        <div className="relative flex-1">
            <input
                ref={inputRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onSelect={handleSelect}
                placeholder={placeholder}
                className={className}
                disabled={disabled}
            />
            {showDropdown && (
                <div ref={dropdownRef}
                    className="absolute z-50 bottom-full left-0 mb-1 w-60 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="px-3 py-1.5 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Identifier
                    </div>
                    {filteredUsers.map((user, i) => (
                        <button
                            key={user.id}
                            type="button"
                            className={`flex items-center gap-2.5 px-3 py-2 w-full text-left transition-colors ${i === activeIndex ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                            onMouseDown={e => { e.preventDefault(); insertMention(user); }}
                            onMouseEnter={() => setActiveIndex(i)}
                        >
                            <img src={getAvatar(user)} alt="" className="w-6 h-6 rounded-full shrink-0" referrerPolicy="no-referrer" />
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-800 truncate">{user.name}</p>
                                <p className="text-[10px] text-gray-400 truncate">{user.department}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
