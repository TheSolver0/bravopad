import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Bell, BellOff, Check, Loader2, MessageCircle, Pencil, Search, Send, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { getEcho } from '@/lib/echo';

type MessengerUser = {
    id: number;
    name: string;
    email?: string | null;
    avatar?: string | null;
    role?: string | null;
};

type MessengerMessage = {
    id: number;
    conversation_id: number;
    sender_id: number;
    body: string;
    created_at: string;
    edited_at?: string | null;
    deleted_at?: string | null;
    is_edited?: boolean;
    is_deleted?: boolean;
    sender: MessengerUser;
};

type MessengerConversation = {
    id: number;
    type: 'direct';
    other_user: MessengerUser | null;
    participants: MessengerUser[];
    last_message: MessengerMessage | null;
    last_message_at: string | null;
    unread_count: number;
    read_at_by_user?: Record<string, string | null>;
};

type ConversationsResponse = {
    conversations: MessengerConversation[];
    unread_total: number;
};

type UsersResponse = {
    users: MessengerUser[];
};

type MessageSentPayload = {
    message: MessengerMessage;
    conversation?: Partial<MessengerConversation> & { id: number };
};

type MessageUpdatedPayload = {
    action: 'edited' | 'deleted';
    message: MessengerMessage;
};

type ConversationReadPayload = {
    conversation_id: number;
    user_id: number;
    read_at: string;
};

type TypingPayload = {
    user_id: number;
    name: string;
    is_typing: boolean;
};

type InboxUpdatedPayload = {
    conversation_id: number;
    unread_total: number;
    conversation?: Partial<MessengerConversation> & { id: number };
};

type PageProps = {
    auth?: {
        user?: MessengerUser;
    };
};

type DesktopNotificationPermission = NotificationPermission | 'unsupported';

type MessageMenuState = {
    messageId: number;
    x: number;
    y: number;
};

export default function MessengerWidget() {
    const { auth } = usePage<PageProps>().props;
    const currentUser = auth?.user;
    const [open, setOpen] = useState(false);
    const [conversations, setConversations] = useState<MessengerConversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<MessengerConversation | null>(null);
    const [messages, setMessages] = useState<MessengerMessage[]>([]);
    const [unreadTotal, setUnreadTotal] = useState(0);
    const [loadingConversations, setLoadingConversations] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [search, setSearch] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<MessengerUser[]>([]);
    const [body, setBody] = useState('');
    const [sendError, setSendError] = useState<string | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
    const [editingBody, setEditingBody] = useState('');
    const [typingName, setTypingName] = useState<string | null>(null);
    const [messageMenu, setMessageMenu] = useState<MessageMenuState | null>(null);
    const [desktopNotificationPermission, setDesktopNotificationPermission] = useState<DesktopNotificationPermission>(() => getDesktopNotificationPermission());
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const notifiedMessageIds = useRef<Set<number>>(new Set());
    const typingTimeoutRef = useRef<number | null>(null);
    const lastTypingWhisperRef = useRef(0);

    const activeId = activeConversation?.id ?? null;

    const fetchConversations = useCallback(async () => {
        setLoadingConversations(true);

        try {
            const response = await fetch('/messenger/conversations', {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                return;
            }

            const data = (await response.json()) as ConversationsResponse;
            setConversations(data.conversations ?? []);
            setUnreadTotal(data.unread_total ?? 0);
            setActiveConversation((current) => {
                if (!current) {
                    return current;
                }

                return data.conversations.find((conversation) => conversation.id === current.id) ?? current;
            });
        } finally {
            setLoadingConversations(false);
        }
    }, []);

    const markRead = useCallback(async (conversationId: number) => {
        const response = await fetch(`/messenger/conversations/${conversationId}/read`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: csrfHeaders(),
        });

        if (!response.ok) {
            return;
        }

        const data = (await response.json()) as { conversation: MessengerConversation; unread_total: number };
        setUnreadTotal(data.unread_total ?? 0);
        setConversations((current) => upsertConversation(current, data.conversation));
        setActiveConversation((current) => (current?.id === data.conversation.id ? data.conversation : current));
    }, []);

    const loadMessages = useCallback(async (conversation: MessengerConversation) => {
        setActiveConversation(conversation);
        setLoadingMessages(true);

        try {
            const response = await fetch(`/messenger/conversations/${conversation.id}/messages`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                return;
            }

            const data = (await response.json()) as { messages: MessengerMessage[] };
            setMessages(data.messages ?? []);
            await markRead(conversation.id);
        } finally {
            setLoadingMessages(false);
        }
    }, [markRead]);

    useEffect(() => {
        if (!currentUser?.id) {
            return;
        }

        void fetchConversations();
    }, [currentUser?.id, fetchConversations]);

    useEffect(() => {
        if (open) {
            void fetchConversations();
        }
    }, [fetchConversations, open]);

    useEffect(() => {
        if (!messageMenu) {
            return;
        }

        const closeMenu = () => setMessageMenu(null);
        const closeMenuOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeMenu();
            }
        };

        window.addEventListener('click', closeMenu);
        window.addEventListener('scroll', closeMenu, true);
        window.addEventListener('keydown', closeMenuOnEscape);

        return () => {
            window.removeEventListener('click', closeMenu);
            window.removeEventListener('scroll', closeMenu, true);
            window.removeEventListener('keydown', closeMenuOnEscape);
        };
    }, [messageMenu]);

    useEffect(() => {
        setMessageMenu(null);
    }, [activeId]);

    useEffect(() => {
        if (!currentUser?.id) {
            return;
        }

        const echo = getEcho();

        if (!echo) {
            return;
        }

        const channelName = `messenger.user.${currentUser.id}`;
        echo.private(channelName).listen('.messenger.inbox.updated', (payload: InboxUpdatedPayload) => {
            setUnreadTotal(payload.unread_total ?? 0);

            const summary = payload.conversation;

            if (summary) {
                setConversations((current) => updateConversationSummary(current, summary));
                setActiveConversation((current) => {
                    if (!current || current.id !== summary.id) {
                        return current;
                    }

                    return { ...current, ...summary };
                });

                const incomingMessage = summary.last_message;
                const shouldNotify = incomingMessage
                    && incomingMessage.sender_id !== currentUser.id
                    && !(open && activeId === summary.id)
                    && !notifiedMessageIds.current.has(incomingMessage.id);

                if (shouldNotify) {
                    notifiedMessageIds.current.add(incomingMessage.id);
                    const openIncomingConversation = () => {
                        setOpen(true);

                        if (isCompleteConversation(summary)) {
                            void loadMessages(summary);
                        } else {
                            void fetchConversations();
                        }
                    };

                    toast.message(incomingMessage.sender?.name ?? summary.other_user?.name ?? 'New message', {
                        description: previewText(incomingMessage.body),
                        action: {
                            label: 'Open',
                            onClick: openIncomingConversation,
                        },
                    });

                    showDesktopMessageNotification(incomingMessage, summary.other_user, openIncomingConversation);
                }
            }

            if (open) {
                void fetchConversations();
            }
        });

        return () => {
            echo.leave(channelName);
        };
    }, [activeId, currentUser?.id, fetchConversations, loadMessages, open]);

    useEffect(() => {
        if (!activeId) {
            return;
        }

        const echo = getEcho();

        if (!echo) {
            return;
        }

        const channelName = `messenger.conversation.${activeId}`;
        const channel = echo.private(channelName);

        channel.listen('.message.sent', (payload: MessageSentPayload) => {
            setMessages((current) => appendMessage(current, payload.message));

            const summary = payload.conversation;

            if (summary) {
                setConversations((current) => updateConversationSummary(current, summary));
                setActiveConversation((current) => (current?.id === summary.id ? { ...current, ...summary } : current));
            }

            if (open) {
                void markRead(payload.message.conversation_id);
            }
        });

        channel.listen('.message.updated', (payload: MessageUpdatedPayload) => {
            setMessages((current) => replaceMessage(current, payload.message));
            void fetchConversations();
        });

        channel.listen('.messenger.conversation.read', (payload: ConversationReadPayload) => {
            setActiveConversation((current) => {
                if (!current || current.id !== payload.conversation_id) {
                    return current;
                }

                return {
                    ...current,
                    read_at_by_user: {
                        ...(current.read_at_by_user ?? {}),
                        [String(payload.user_id)]: payload.read_at,
                    },
                };
            });
            setConversations((current) => current.map((conversation) => (
                conversation.id === payload.conversation_id
                    ? {
                        ...conversation,
                        read_at_by_user: {
                            ...(conversation.read_at_by_user ?? {}),
                            [String(payload.user_id)]: payload.read_at,
                        },
                    }
                    : conversation
            )));
        });

        channel.listenForWhisper('typing', (payload: TypingPayload) => {
            if (payload.user_id === currentUser?.id) {
                return;
            }

            if (!payload.is_typing) {
                setTypingName(null);
                return;
            }

            setTypingName(payload.name || 'Someone');

            if (typingTimeoutRef.current) {
                window.clearTimeout(typingTimeoutRef.current);
            }

            typingTimeoutRef.current = window.setTimeout(() => {
                setTypingName(null);
            }, 2500);
        });

        return () => {
            if (typingTimeoutRef.current) {
                window.clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
            setTypingName(null);
            echo.leave(channelName);
        };
    }, [activeId, currentUser?.id, fetchConversations, markRead, open]);

    useEffect(() => {
        const term = search.trim();

        if (!open || term.length < 1) {
            setSearchResults([]);
            setSearching(false);
            setSearchError(null);
            return;
        }

        const timeout = window.setTimeout(async () => {
            setSearching(true);
            setSearchError(null);

            try {
                const response = await fetch(`/messenger/users?search=${encodeURIComponent(term)}`, {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                });

                if (!response.ok) {
                    setSearchError('Unable to search people');
                    return;
                }

                const data = (await response.json()) as UsersResponse;
                setSearchResults(data.users ?? []);
            } finally {
                setSearching(false);
            }
        }, 250);

        return () => window.clearTimeout(timeout);
    }, [open, search]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages.length, activeId]);

    const sortedConversations = useMemo(
        () => [...conversations].sort((a, b) => (b.last_message_at ?? '').localeCompare(a.last_message_at ?? '')),
        [conversations],
    );

    const latestOwnMessageId = useMemo(() => (
        [...messages].reverse().find((message) => message.sender_id === currentUser?.id && !message.is_deleted)?.id ?? null
    ), [currentUser?.id, messages]);

    const otherReadAt = activeConversation?.other_user?.id
        ? activeConversation.read_at_by_user?.[String(activeConversation.other_user.id)] ?? null
        : null;

    const menuMessage = messageMenu
        ? messages.find((message) => message.id === messageMenu.messageId) ?? null
        : null;

    async function startDirectChat(user: MessengerUser) {
        const response = await fetch('/messenger/conversations/direct', {
            method: 'POST',
            credentials: 'same-origin',
            headers: csrfHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ user_id: user.id }),
        });

        if (!response.ok) {
            setSearchError(await responseError(response, 'Unable to open this conversation'));
            return;
        }

        const data = (await response.json()) as { conversation: MessengerConversation; unread_total: number };
        setConversations((current) => upsertConversation(current, data.conversation));
        setUnreadTotal(data.unread_total ?? 0);
        setSearch('');
        setSearchResults([]);
        await loadMessages(data.conversation);
    }

    async function sendMessage() {
        const text = body.trim();

        if (!activeConversation || !text || sending) {
            return;
        }

        setSending(true);
        setSendError(null);

        try {
            const response = await fetch(`/messenger/conversations/${activeConversation.id}/messages`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: csrfHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ body: text }),
            });

            if (!response.ok) {
                setSendError(await responseError(response, 'Unable to send this message'));
                return;
            }

            const data = (await response.json()) as {
                message: MessengerMessage;
                conversation: MessengerConversation;
                unread_total: number;
            };

            setMessages((current) => appendMessage(current, data.message));
            setConversations((current) => upsertConversation(current, data.conversation));
            setActiveConversation(data.conversation);
            setUnreadTotal(data.unread_total ?? 0);
            setBody('');
            getEcho()?.private(`messenger.conversation.${activeConversation.id}`).whisper('typing', {
                user_id: currentUser?.id,
                name: currentUser?.name,
                is_typing: false,
            });
        } finally {
            setSending(false);
        }
    }

    async function updateMessage(messageId: number) {
        const text = editingBody.trim();

        if (!activeConversation || !text) {
            return;
        }

        const response = await fetch(`/messenger/conversations/${activeConversation.id}/messages/${messageId}`, {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: csrfHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ body: text }),
        });

        if (!response.ok) {
            toast.error(await responseError(response, 'Unable to edit this message'));
            return;
        }

        const data = (await response.json()) as { message: MessengerMessage };
        setMessages((current) => replaceMessage(current, data.message));
        setEditingMessageId(null);
        setEditingBody('');
        void fetchConversations();
    }

    async function deleteMessage(message: MessengerMessage) {
        if (!activeConversation || message.is_deleted || !window.confirm('Delete this message?')) {
            return;
        }

        const response = await fetch(`/messenger/conversations/${activeConversation.id}/messages/${message.id}`, {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: csrfHeaders(),
        });

        if (!response.ok) {
            toast.error(await responseError(response, 'Unable to delete this message'));
            return;
        }

        const data = (await response.json()) as { message: MessengerMessage };
        setMessages((current) => replaceMessage(current, data.message));
        void fetchConversations();
    }

    function startEditingMessage(message: MessengerMessage) {
        setEditingMessageId(message.id);
        setEditingBody(message.body);
    }

    function cancelEditingMessage() {
        setEditingMessageId(null);
        setEditingBody('');
    }

    function openMessageMenu(event: MouseEvent, message: MessengerMessage) {
        if (message.sender_id !== currentUser?.id || message.is_deleted) {
            return;
        }

        event.preventDefault();
        setMessageMenu({
            messageId: message.id,
            x: Math.min(event.clientX, window.innerWidth - 176),
            y: Math.min(event.clientY, window.innerHeight - 96),
        });
    }

    function editMenuMessage(message: MessengerMessage) {
        setMessageMenu(null);
        startEditingMessage(message);
    }

    function deleteMenuMessage(message: MessengerMessage) {
        setMessageMenu(null);
        void deleteMessage(message);
    }

    function updateBodyWithTyping(nextBody: string) {
        setBody(nextBody);

        if (!activeConversation || !currentUser?.id) {
            return;
        }

        const now = Date.now();

        if (now - lastTypingWhisperRef.current < 1200) {
            return;
        }

        lastTypingWhisperRef.current = now;
        getEcho()?.private(`messenger.conversation.${activeConversation.id}`).whisper('typing', {
            user_id: currentUser.id,
            name: currentUser.name,
            is_typing: nextBody.trim().length > 0,
        });
    }

    async function requestDesktopNotifications() {
        if (!canUseDesktopNotifications()) {
            setDesktopNotificationPermission('unsupported');
            toast.error('Desktop notifications are unavailable on this browser or URL.');
            return;
        }

        if (Notification.permission === 'granted') {
            setDesktopNotificationPermission('granted');
            toast.success('Desktop notifications are enabled.');
            return;
        }

        if (Notification.permission === 'denied') {
            setDesktopNotificationPermission('denied');
            toast.error('Desktop notifications are blocked. Enable them in your browser site settings.');
            return;
        }

        const permission = await Notification.requestPermission();
        setDesktopNotificationPermission(permission);

        if (permission === 'granted') {
            toast.success('Desktop notifications enabled.');
        } else if (permission === 'denied') {
            toast.error('Desktop notifications blocked.');
        }
    }

    if (!currentUser?.id) {
        return null;
    }

    return (
        <div className="fixed right-4 bottom-24 z-[60] md:right-6 md:bottom-24">
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 18, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 18, scale: 0.98 }}
                        transition={{ duration: 0.18 }}
                        className="fixed inset-x-3 bottom-20 flex h-[min(78vh,640px)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-black/20 md:inset-x-auto md:right-6 md:bottom-6 md:h-[620px] md:w-[760px]"
                    >
                        <section className={`${activeConversation ? 'hidden md:flex' : 'flex'} w-full flex-col border-gray-100 md:w-[300px] md:border-r`}>
                            <WidgetHeader
                                title="Messages"
                                notificationPermission={desktopNotificationPermission}
                                onEnableNotifications={requestDesktopNotifications}
                                onClose={() => setOpen(false)}
                            />

                            <div className="border-b border-gray-100 p-3">
                                <label className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 focus-within:border-primary/40 focus-within:bg-white">
                                    <Search size={16} />
                                    <input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        className="min-w-0 flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                                        placeholder="Search people"
                                    />
                                    {searching && <Loader2 size={14} className="animate-spin" />}
                                </label>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto">
                                {search.trim().length >= 1 ? (
                                    <UserSearchResults users={searchResults} onSelect={startDirectChat} searching={searching} error={searchError} />
                                ) : (
                                    <ConversationList
                                        conversations={sortedConversations}
                                        activeId={activeConversation?.id}
                                        loading={loadingConversations}
                                        onSelect={loadMessages}
                                    />
                                )}
                            </div>
                        </section>

                        <section className={`${activeConversation ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`}>
                            {activeConversation ? (
                                <>
                                    <ChatHeader conversation={activeConversation} onBack={() => setActiveConversation(null)} onClose={() => setOpen(false)} />

                                    <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 px-4 py-4">
                                        {loadingMessages ? (
                                            <div className="flex h-full items-center justify-center text-sm text-gray-400">
                                                <Loader2 size={18} className="mr-2 animate-spin" />
                                                Loading messages
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {messages.length === 0 && (
                                                    <div className="py-16 text-center text-sm text-gray-400">No messages yet</div>
                                                )}
                                                {messages.map((message) => (
                                                    <MessageBubble
                                                        key={message.id}
                                                        message={message}
                                                        mine={message.sender_id === currentUser.id}
                                                        readStatus={message.id === latestOwnMessageId ? messageReadStatus(message, otherReadAt) : null}
                                                        editing={editingMessageId === message.id}
                                                        editingBody={editingBody}
                                                        onEditingBodyChange={setEditingBody}
                                                        onCancelEdit={cancelEditingMessage}
                                                        onSaveEdit={() => void updateMessage(message.id)}
                                                        onOpenMenu={(event) => openMessageMenu(event, message)}
                                                    />
                                                ))}
                                                <div ref={messagesEndRef} />
                                            </div>
                                        )}
                                    </div>

                                    {typingName && (
                                        <div className="border-t border-gray-100 bg-white px-4 py-1.5 text-xs font-medium text-gray-400">
                                            {typingName} is typing...
                                        </div>
                                    )}

                                    <form
                                        className="border-t border-gray-100 bg-white p-3"
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            void sendMessage();
                                        }}
                                    >
                                        {sendError && <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{sendError}</div>}
                                        <div className="flex items-end gap-2">
                                            <textarea
                                                value={body}
                                                onChange={(event) => updateBodyWithTyping(event.target.value.slice(0, 2000))}
                                                className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-primary/50"
                                                placeholder="Write a message"
                                                rows={1}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' && !event.shiftKey) {
                                                        event.preventDefault();
                                                        void sendMessage();
                                                    }
                                                }}
                                            />
                                            <button
                                                type="submit"
                                                disabled={sending || body.trim().length === 0}
                                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                                aria-label="Send message"
                                            >
                                                {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                                            </button>
                                        </div>
                                    </form>
                                </>
                            ) : (
                                <div className="flex flex-1 items-center justify-center px-8 text-center text-sm text-gray-400">
                                    Select a conversation or search for a teammate
                                </div>
                            )}
                        </section>
                        {messageMenu && menuMessage && (
                            <MessageContextMenu
                                x={messageMenu.x}
                                y={messageMenu.y}
                                onEdit={() => editMenuMessage(menuMessage)}
                                onDelete={() => deleteMenuMessage(menuMessage)}
                            />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {!open && (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-primary/30 transition hover:scale-105 hover:bg-primary/90"
                    aria-label="Open messages"
                >
                    <MessageCircle size={24} />
                    {unreadTotal > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1.5 text-[10px] font-black leading-none text-white">
                            {unreadTotal > 99 ? '99+' : unreadTotal}
                        </span>
                    )}
                </button>
            )}
        </div>
    );
}

function WidgetHeader({
    title,
    notificationPermission,
    onEnableNotifications,
    onClose,
}: {
    title: string;
    notificationPermission: DesktopNotificationPermission;
    onEnableNotifications: () => Promise<void>;
    onClose: () => void;
}) {
    const notificationsDisabled = notificationPermission === 'denied' || notificationPermission === 'unsupported';
    const notificationsGranted = notificationPermission === 'granted';

    return (
        <div className="flex h-14 items-center justify-between border-b border-gray-100 px-4">
            <div className="flex items-center gap-2 font-bold text-gray-900">
                <MessageCircle size={17} className="text-primary" />
                <span>{title}</span>
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => void onEnableNotifications()}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                        notificationsGranted
                            ? 'cursor-pointer bg-green-50 text-green-600 hover:bg-green-100'
                            : notificationsDisabled
                              ? 'cursor-pointer text-gray-300 hover:bg-gray-100 hover:text-gray-500'
                              : 'cursor-pointer text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                    }`}
                    aria-label="Enable desktop notifications"
                    title={
                        notificationsGranted
                            ? 'Desktop notifications enabled'
                            : notificationPermission === 'denied'
                              ? 'Desktop notifications blocked'
                              : notificationPermission === 'unsupported'
                                ? 'Desktop notifications unavailable'
                                : 'Enable desktop notifications'
                    }
                >
                    {notificationsDisabled ? <BellOff size={16} /> : <Bell size={16} />}
                </button>
                <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close messages">
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}

function ChatHeader({ conversation, onBack, onClose }: { conversation: MessengerConversation; onBack: () => void; onClose: () => void }) {
    const user = conversation.other_user;

    return (
        <div className="flex h-14 items-center justify-between border-b border-gray-100 px-3">
            <div className="flex min-w-0 items-center gap-2">
                <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 md:hidden" aria-label="Back to conversations">
                    <ArrowLeft size={16} />
                </button>
                <Avatar user={user} />
                <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-gray-900">{user?.name ?? 'Conversation'}</div>
                    {user?.role && <div className="truncate text-xs text-gray-400">{user.role}</div>}
                </div>
            </div>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close messages">
                <X size={16} />
            </button>
        </div>
    );
}

function ConversationList({
    conversations,
    activeId,
    loading,
    onSelect,
}: {
    conversations: MessengerConversation[];
    activeId?: number;
    loading: boolean;
    onSelect: (conversation: MessengerConversation) => Promise<void>;
}) {
    if (loading && conversations.length === 0) {
        return <div className="py-10 text-center text-sm text-gray-400">Loading conversations</div>;
    }

    if (conversations.length === 0) {
        return <div className="px-6 py-12 text-center text-sm text-gray-400">Search for a teammate to start a conversation</div>;
    }

    return (
        <div className="divide-y divide-gray-50">
            {conversations.map((conversation) => (
                <button
                    key={conversation.id}
                    onClick={() => void onSelect(conversation)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${activeId === conversation.id ? 'bg-primary/5' : ''}`}
                >
                    <Avatar user={conversation.other_user} />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-bold text-gray-900">{conversation.other_user?.name ?? 'Conversation'}</span>
                            {conversation.unread_count > 0 && (
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-white">
                                    {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                                </span>
                            )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-gray-500">{conversation.last_message?.body ?? 'No messages yet'}</p>
                    </div>
                </button>
            ))}
        </div>
    );
}

function UserSearchResults({
    users,
    searching,
    error,
    onSelect,
}: {
    users: MessengerUser[];
    searching: boolean;
    error: string | null;
    onSelect: (user: MessengerUser) => Promise<void>;
}) {
    if (error) {
        return <div className="px-6 py-12 text-center text-sm text-red-500">{error}</div>;
    }

    if (searching && users.length === 0) {
        return <div className="py-10 text-center text-sm text-gray-400">Searching people</div>;
    }

    if (users.length === 0) {
        return <div className="px-6 py-12 text-center text-sm text-gray-400">No matching teammates</div>;
    }

    return (
        <div className="divide-y divide-gray-50">
            {users.map((user) => (
                <button key={user.id} onClick={() => void onSelect(user)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50">
                    <Avatar user={user} />
                    <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-gray-900">{user.name}</div>
                        <div className="truncate text-xs text-gray-400">{user.email}</div>
                    </div>
                </button>
            ))}
        </div>
    );
}

function MessageBubble({
    message,
    mine,
    readStatus,
    editing,
    editingBody,
    onEditingBodyChange,
    onCancelEdit,
    onSaveEdit,
    onOpenMenu,
}: {
    message: MessengerMessage;
    mine: boolean;
    readStatus: string | null;
    editing: boolean;
    editingBody: string;
    onEditingBodyChange: (value: string) => void;
    onCancelEdit: () => void;
    onSaveEdit: () => void;
    onOpenMenu: (event: MouseEvent) => void;
}) {
    const bubbleClass = message.is_deleted
        ? 'rounded-2xl bg-gray-100 text-gray-400'
        : mine
            ? 'rounded-2xl rounded-br-md bg-primary text-white'
            : 'rounded-2xl rounded-bl-md bg-white text-gray-800';

    return (
        <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-[78%] px-3 py-2 text-sm shadow-sm ${mine && !message.is_deleted ? 'cursor-context-menu' : ''} ${bubbleClass}`}
                onContextMenu={onOpenMenu}
            >
                {editing ? (
                    <div className="w-64 max-w-[62vw] space-y-2">
                        <textarea
                            value={editingBody}
                            onChange={(event) => onEditingBodyChange(event.target.value.slice(0, 2000))}
                            className="max-h-32 min-h-20 w-full resize-none rounded-xl border border-primary/30 bg-white px-3 py-2 text-sm text-gray-800 outline-none"
                            autoFocus
                        />
                        <div className="flex justify-end gap-1">
                            <button
                                type="button"
                                onClick={onCancelEdit}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
                                aria-label="Cancel edit"
                            >
                                <X size={15} />
                            </button>
                            <button
                                type="button"
                                onClick={onSaveEdit}
                                disabled={editingBody.trim().length === 0}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="Save edit"
                            >
                                <Check size={15} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className={`whitespace-pre-wrap break-words leading-relaxed ${message.is_deleted ? 'italic' : ''}`}>
                            {message.is_deleted ? 'Message deleted' : message.body}
                        </p>
                        <div className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${mine && !message.is_deleted ? 'text-white/70' : 'text-gray-400'}`}>
                            <span>{formatTime(message.created_at)}</span>
                            {message.is_edited && !message.is_deleted && <span>edited</span>}
                            {readStatus && <span>{readStatus}</span>}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function MessageContextMenu({
    x,
    y,
    onEdit,
    onDelete,
}: {
    x: number;
    y: number;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <div
            className="fixed z-[90] w-40 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-xl shadow-black/15"
            style={{ left: x, top: y }}
            onClick={(event) => event.stopPropagation()}
        >
            <button
                type="button"
                onClick={onEdit}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 transition hover:bg-gray-50"
            >
                <Pencil size={14} />
                Modify
            </button>
            <button
                type="button"
                onClick={onDelete}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 transition hover:bg-red-50"
            >
                <Trash2 size={14} />
                Delete
            </button>
        </div>
    );
}

function Avatar({ user }: { user?: MessengerUser | null }) {
    const initials = (user?.name ?? '?')
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    if (user?.avatar) {
        return <img src={user.avatar} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />;
    }

    return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-black text-gray-500">
            {initials}
        </div>
    );
}

function appendMessage(messages: MessengerMessage[], message: MessengerMessage): MessengerMessage[] {
    if (messages.some((current) => current.id === message.id)) {
        return messages;
    }

    return [...messages, message];
}

function replaceMessage(messages: MessengerMessage[], message: MessengerMessage): MessengerMessage[] {
    return messages.map((current) => (current.id === message.id ? message : current));
}

function upsertConversation(conversations: MessengerConversation[], conversation: MessengerConversation): MessengerConversation[] {
    return [
        conversation,
        ...conversations.filter((current) => current.id !== conversation.id),
    ];
}

function updateConversationSummary(
    conversations: MessengerConversation[],
    summary: Partial<MessengerConversation> & { id: number },
): MessengerConversation[] {
    return conversations.map((conversation) => (
        conversation.id === summary.id ? { ...conversation, ...summary } : conversation
    ));
}

function isCompleteConversation(conversation: Partial<MessengerConversation> & { id: number }): conversation is MessengerConversation {
    return Boolean(conversation.type && Array.isArray(conversation.participants) && 'unread_count' in conversation);
}

function previewText(value: string): string {
    return value.length > 120 ? `${value.slice(0, 117)}...` : value;
}

function messageReadStatus(message: MessengerMessage, otherReadAt: string | null): string {
    if (!otherReadAt) {
        return 'Sent';
    }

    return new Date(otherReadAt).getTime() >= new Date(message.created_at).getTime() ? 'Seen' : 'Sent';
}

function canUseDesktopNotifications(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window && window.isSecureContext;
}

function getDesktopNotificationPermission(): DesktopNotificationPermission {
    if (!canUseDesktopNotifications()) {
        return 'unsupported';
    }

    return Notification.permission;
}

function showDesktopMessageNotification(
    message: MessengerMessage,
    fallbackUser: MessengerUser | null | undefined,
    onClick: () => void,
): void {
    if (!canUseDesktopNotifications() || Notification.permission !== 'granted') {
        return;
    }

    const notification = new Notification(message.sender?.name ?? fallbackUser?.name ?? 'New message', {
        body: previewText(message.body),
        tag: `messenger-message-${message.id}`,
        silent: false,
    });

    notification.onclick = () => {
        window.focus();
        notification.close();
        onClick();
    };
}

function formatTime(value: string): string {
    return new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function csrfHeaders(extra: HeadersInit = {}): HeadersInit {
    const token = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content ?? '';
    const xsrfToken = getCookie('XSRF-TOKEN');

    return {
        Accept: 'application/json',
        ...extra,
        ...(token ? { 'X-CSRF-TOKEN': token } : {}),
        ...(xsrfToken ? { 'X-XSRF-TOKEN': xsrfToken } : {}),
    };
}

function getCookie(name: string): string {
    const cookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${name}=`));

    return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : '';
}

async function responseError(response: Response, fallback: string): Promise<string> {
    try {
        const data = (await response.clone().json()) as { message?: string; errors?: Record<string, string[]> };
        const firstError = data.errors ? Object.values(data.errors).flat()[0] : null;

        return firstError ?? data.message ?? `${fallback} (${response.status})`;
    } catch {
        return `${fallback} (${response.status})`;
    }
}
