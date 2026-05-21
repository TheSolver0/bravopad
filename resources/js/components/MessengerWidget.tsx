import { type MouseEvent, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import {
    ArrowLeft,
    Bell,
    BellOff,
    Check,
    Image,
    Loader2,
    Maximize2,
    MessageCircle,
    Mic,
    MicOff,
    MoreHorizontal,
    Pencil,
    Phone,
    PhoneOff,
    Search,
    Send,
    ThumbsUp,
    Trash2,
    Video,
    VideoOff,
    X,
} from 'lucide-react';
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

type MessengerCall = {
    id: number;
    conversation_id: number;
    started_by: number;
    callee_id: number;
    type: 'audio' | 'video';
    status: 'ringing' | 'accepted' | 'declined' | 'ended';
    accepted_at?: string | null;
    ended_at?: string | null;
    created_at?: string | null;
    starter: MessengerUser;
    callee: MessengerUser;
};

type CallUpdatedPayload = {
    call: MessengerCall;
};

type WebRtcSessionPayload = {
    from: number;
    sdp: RTCSessionDescriptionInit;
};

type WebRtcIcePayload = {
    from: number;
    candidate: RTCIceCandidateInit;
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

type MessengerWidgetProps = {
    variant?: 'floating' | 'fullscreen';
};

export default function MessengerWidget({ variant = 'floating' }: MessengerWidgetProps) {
    const { auth } = usePage<PageProps>().props;
    const fullscreen = variant === 'fullscreen';
    const currentUser = auth?.user;
    const [open, setOpen] = useState(fullscreen);
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
    const [incomingCall, setIncomingCall] = useState<MessengerCall | null>(null);
    const [activeCall, setActiveCall] = useState<MessengerCall | null>(null);
    const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'connecting' | 'connected' | 'ended'>('idle');
    const [callError, setCallError] = useState<string | null>(null);
    const [callMuted, setCallMuted] = useState(false);
    const [cameraOff, setCameraOff] = useState(false);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [desktopNotificationPermission, setDesktopNotificationPermission] = useState<DesktopNotificationPermission>(() => getDesktopNotificationPermission());
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
    const notifiedMessageIds = useRef<Set<number>>(new Set());
    const typingTimeoutRef = useRef<number | null>(null);
    const lastTypingWhisperRef = useRef(0);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
    const startedOfferForCallRef = useRef<number | null>(null);
    const ringtoneContextRef = useRef<AudioContext | null>(null);
    const ringtoneTimerRef = useRef<number | null>(null);

    const activeId = activeConversation?.id ?? null;
    const activeCallRef = useRef<MessengerCall | null>(null);

    useEffect(() => {
        activeCallRef.current = activeCall;
    }, [activeCall]);

    useEffect(() => {
        localStreamRef.current = localStream;
    }, [localStream]);

    useEffect(() => {
        if (fullscreen) {
            setOpen(true);
        }
    }, [fullscreen]);

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
        const channel = echo.private(channelName);

        channel.listen('.messenger.inbox.updated', (payload: InboxUpdatedPayload) => {
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

        channel.listen('.messenger.call.updated', (payload: CallUpdatedPayload) => {
            void handleCallUpdate(payload.call);
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
        if (!activeCall?.id || !currentUser?.id) {
            return;
        }

        const echo = getEcho();

        if (!echo) {
            return;
        }

        const channelName = `messenger.call.${activeCall.id}`;
        const channel = echo.private(channelName);

        channel.listen('.messenger.call.updated', (payload: CallUpdatedPayload) => {
            void handleCallUpdate(payload.call);
        });

        channel.listenForWhisper('webrtc-offer', (payload: WebRtcSessionPayload) => {
            void handleWebRtcOffer(payload);
        });

        channel.listenForWhisper('webrtc-answer', (payload: WebRtcSessionPayload) => {
            void handleWebRtcAnswer(payload);
        });

        channel.listenForWhisper('ice-candidate', (payload: WebRtcIcePayload) => {
            void handleWebRtcIceCandidate(payload);
        });

        channel.listenForWhisper('call-ready', (payload: { from: number }) => {
            void handleCallReady(payload);
        });

        return () => {
            echo.leave(channelName);
        };
    }, [activeCall?.id, currentUser?.id]);

    useEffect(() => {
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    useEffect(() => {
        const audio = remoteAudioRef.current;

        if (!audio) {
            return;
        }

        audio.srcObject = remoteStream;

        if (remoteStream) {
            void audio.play().catch(() => {
                setCallError('Audio playback was blocked. Click the call window and check browser sound permissions.');
            });
        }
    }, [remoteStream]);

    useEffect(() => () => {
        cleanupCallMedia();
    }, []);

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

    async function sendMessage(quickBody?: string) {
        const text = (quickBody ?? body).trim();

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

    async function startCall(type: MessengerCall['type']) {
        if (!activeConversation || activeCall) {
            return;
        }

        setCallError(null);

        const supportError = callSupportError(type);

        if (supportError) {
            setCallError(supportError);
            toast.error(supportError);
            return;
        }

        try {
            const response = await fetch(`/messenger/conversations/${activeConversation.id}/calls`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: csrfHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ type }),
            });

            if (!response.ok) {
                toast.error(await responseError(response, 'Unable to start this call'));
                return;
            }

            const data = (await response.json()) as { call: MessengerCall };
            getEcho()?.private(`messenger.call.${data.call.id}`);
            setActiveCall(data.call);
            setCallStatus('ringing');
            await waitForCallSubscription(data.call.id);
            startRingtone('outgoing');

            try {
                await preparePeerConnection(data.call);
            } catch (error) {
                const message = callErrorMessage(error);
                setCallError(message);
                toast.error(message);
                await fetch(`/messenger/conversations/${data.call.conversation_id}/calls/${data.call.id}`, {
                    method: 'PATCH',
                    credentials: 'same-origin',
                    headers: csrfHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ status: 'ended' }),
                });
                cleanupCallMedia();
            }
        } catch (error) {
            setCallError(callErrorMessage(error));
        }
    }

    async function acceptCall(call: MessengerCall) {
        setCallError(null);
        setIncomingCall(null);
        setOpen(true);
        getEcho()?.private(`messenger.call.${call.id}`);
        setActiveCall(call);
        setCallStatus('connecting');
        stopRingtone();

        const supportError = callSupportError(call.type);

        if (supportError) {
            setCallError(supportError);
            toast.error(supportError);
            await declineCall(call);
            cleanupCallMedia();
            return;
        }

        try {
            await waitForCallSubscription(call.id);
            await preparePeerConnection(call);
        } catch (error) {
            const message = callErrorMessage(error);
            setCallError(message);
            toast.error(message);
            await declineCall(call);
            cleanupCallMedia();
            return;
        }

        try {
            const response = await fetch(`/messenger/conversations/${call.conversation_id}/calls/${call.id}`, {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: csrfHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ status: 'accepted' }),
            });

            if (!response.ok) {
                toast.error(await responseError(response, 'Unable to accept this call'));
                return;
            }

            const data = (await response.json()) as { call: MessengerCall };
            setActiveCall(data.call);
            setCallStatus('connecting');
            whisperCall(data.call.id, 'call-ready', {});
        } catch (error) {
            setCallError(callErrorMessage(error));
        }
    }

    async function declineCall(call: MessengerCall) {
        setIncomingCall(null);
        stopRingtone();

        await fetch(`/messenger/conversations/${call.conversation_id}/calls/${call.id}`, {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: csrfHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ status: 'declined' }),
        });
    }

    async function endCall() {
        const call = activeCallRef.current;
        cleanupCallMedia();

        if (!call || call.status === 'ended' || call.status === 'declined') {
            return;
        }

        await fetch(`/messenger/conversations/${call.conversation_id}/calls/${call.id}`, {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: csrfHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ status: 'ended' }),
        });
    }

    async function handleCallUpdate(call: MessengerCall) {
        if (!currentUser?.id) {
            return;
        }

        const currentCall = activeCallRef.current;

        if (call.status === 'ringing' && call.callee_id === currentUser.id && !currentCall) {
            setIncomingCall(call);
            startRingtone('incoming');
            toast.message(`${call.starter.name} is calling`, {
                description: call.type === 'video' ? 'Incoming video call' : 'Incoming audio call',
                action: {
                    label: 'Accept',
                    onClick: () => void acceptCall(call),
                },
            });
            return;
        }

        if (currentCall?.id !== call.id) {
            return;
        }

        setActiveCall(call);

        if (call.status === 'accepted') {
            stopRingtone();
            setCallStatus(peerConnectionRef.current?.connectionState === 'connected' ? 'connected' : 'connecting');

            if (call.started_by === currentUser.id && startedOfferForCallRef.current !== call.id) {
                await preparePeerConnection(call);
                window.setTimeout(() => {
                    void createAndSendOffer(call);
                }, 500);
            }
        }

        if (call.status === 'declined' || call.status === 'ended') {
            cleanupCallMedia();
        }
    }

    async function preparePeerConnection(call: MessengerCall): Promise<RTCPeerConnection> {
        if (peerConnectionRef.current) {
            return peerConnectionRef.current;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('Calls are not available in this browser.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: call.type === 'video',
        });
        const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        stream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, stream);
        });

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                whisperCall(call.id, 'ice-candidate', { candidate: event.candidate.toJSON() });
            }
        };

        peerConnection.ontrack = (event) => {
            setRemoteStream(event.streams[0] ?? null);
            setCallStatus('connected');
        };

        peerConnection.onconnectionstatechange = () => {
            if (peerConnection.connectionState === 'connected') {
                setCallStatus('connected');
            }

            if (['failed', 'closed', 'disconnected'].includes(peerConnection.connectionState)) {
                setCallStatus((current) => (current === 'ended' ? current : 'ended'));
            }
        };

        peerConnectionRef.current = peerConnection;
        pendingIceCandidatesRef.current = [];
        setLocalStream(stream);
        setCallMuted(false);
        setCameraOff(false);

        return peerConnection;
    }

    async function createAndSendOffer(call: MessengerCall) {
        const peerConnection = await preparePeerConnection(call);
        startedOfferForCallRef.current = call.id;
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        if (peerConnection.localDescription) {
            whisperCall(call.id, 'webrtc-offer', { sdp: peerConnection.localDescription });
        }
    }

    async function handleWebRtcOffer(payload: WebRtcSessionPayload) {
        if (!currentUser?.id || payload.from === currentUser.id) {
            return;
        }

        const call = activeCallRef.current;

        if (!call) {
            return;
        }

        const peerConnection = await preparePeerConnection(call);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        await flushPendingIceCandidates(peerConnection);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        if (peerConnection.localDescription) {
            whisperCall(call.id, 'webrtc-answer', { sdp: peerConnection.localDescription });
        }
        setCallStatus('connecting');
    }

    async function handleWebRtcAnswer(payload: WebRtcSessionPayload) {
        if (!currentUser?.id || payload.from === currentUser.id || !peerConnectionRef.current) {
            return;
        }

        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        await flushPendingIceCandidates(peerConnectionRef.current);
        setCallStatus('connecting');
    }

    async function handleWebRtcIceCandidate(payload: WebRtcIcePayload) {
        if (!currentUser?.id || payload.from === currentUser.id || !payload.candidate) {
            return;
        }

        const peerConnection = peerConnectionRef.current;

        if (!peerConnection?.remoteDescription) {
            pendingIceCandidatesRef.current.push(payload.candidate);
            return;
        }

        await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
    }

    async function handleCallReady(payload: { from: number }) {
        if (!currentUser?.id || payload.from === currentUser.id) {
            return;
        }

        const call = activeCallRef.current;

        if (!call || call.started_by !== currentUser.id || call.status !== 'accepted' || startedOfferForCallRef.current === call.id) {
            return;
        }

        await createAndSendOffer(call);
    }

    async function flushPendingIceCandidates(peerConnection: RTCPeerConnection) {
        for (const candidate of pendingIceCandidatesRef.current) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }

        pendingIceCandidatesRef.current = [];
    }

    function whisperCall(callId: number, event: string, payload: Record<string, unknown>) {
        if (!currentUser?.id) {
            return;
        }

        getEcho()?.private(`messenger.call.${callId}`).whisper(event, {
            ...payload,
            from: currentUser.id,
        });
    }

    async function waitForCallSubscription(callId: number) {
        const echo = getEcho();

        if (!echo) {
            return;
        }

        const channel = echo.private(`messenger.call.${callId}`) as {
            subscribed?: (callback: () => void) => unknown;
        };

        await new Promise<void>((resolve) => {
            let settled = false;
            let timeout: number | undefined;
            const finish = () => {
                if (settled) {
                    return;
                }

                settled = true;
                if (timeout) {
                    window.clearTimeout(timeout);
                }
                resolve();
            };
            timeout = window.setTimeout(finish, 700);

            if (typeof channel.subscribed === 'function') {
                channel.subscribed(finish);
            }
        });
    }

    function toggleMute() {
        localStream?.getAudioTracks().forEach((track) => {
            track.enabled = callMuted;
        });
        setCallMuted((current) => !current);
    }

    function toggleCamera() {
        localStream?.getVideoTracks().forEach((track) => {
            track.enabled = cameraOff;
        });
        setCameraOff((current) => !current);
    }

    function startRingtone(kind: 'incoming' | 'outgoing') {
        stopRingtone();

        if (typeof window === 'undefined') {
            return;
        }

        const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        if (!AudioContextClass) {
            return;
        }

        const audioContext = ringtoneContextRef.current ?? new AudioContextClass();
        ringtoneContextRef.current = audioContext;

        const playTone = () => {
            if (audioContext.state === 'suspended') {
                void audioContext.resume();
            }

            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.value = kind === 'incoming' ? 880 : 520;
            gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(kind === 'incoming' ? 0.08 : 0.04, audioContext.currentTime + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.28);
            oscillator.connect(gain);
            gain.connect(audioContext.destination);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
        };

        try {
            playTone();
            ringtoneTimerRef.current = window.setInterval(playTone, kind === 'incoming' ? 950 : 1450);
        } catch {
            stopRingtone();
        }
    }

    function stopRingtone() {
        if (ringtoneTimerRef.current) {
            window.clearInterval(ringtoneTimerRef.current);
            ringtoneTimerRef.current = null;
        }
    }

    function cleanupCallMedia() {
        stopRingtone();
        peerConnectionRef.current?.close();
        peerConnectionRef.current = null;
        pendingIceCandidatesRef.current = [];
        startedOfferForCallRef.current = null;
        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        setLocalStream(null);
        setRemoteStream(null);
        setActiveCall(null);
        setIncomingCall(null);
        setCallMuted(false);
        setCameraOff(false);
        setCallStatus('ended');
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

    const panelContent = activeConversation ? (
        <section className="flex h-full min-w-0 flex-col">
            <ChatHeader
                conversation={activeConversation}
                calling={Boolean(activeCall)}
                onBack={() => setActiveConversation(null)}
                onClose={!fullscreen ? () => setOpen(false) : undefined}
                onStartCall={startCall}
            />

            <div className="min-h-0 flex-1 overflow-y-auto bg-background px-3 py-3 sm:px-4">
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
                <div className="border-t border-primary/10 bg-white px-4 py-1.5 text-xs font-medium text-gray-400">
                    {typingName} is typing...
                </div>
            )}

            <form
                className="border-t border-primary/10 bg-white p-3"
                onSubmit={(event) => {
                    event.preventDefault();
                    void sendMessage();
                }}
            >
                {sendError && <div className="mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300">{sendError}</div>}
                <div className="flex items-center gap-1.5">
                    <div className="flex shrink-0 items-center gap-0.5 text-primary">
                        <span className="flex h-9 w-8 items-center justify-center rounded-full hover:bg-primary/10">
                            <Mic size={18} />
                        </span>
                        <span className="flex h-9 w-8 items-center justify-center rounded-full hover:bg-primary/10">
                            <Image size={18} />
                        </span>
                    </div>
                    <div className="flex min-h-10 flex-1 items-center rounded-full bg-primary/8 px-3 ring-1 ring-primary/10 focus-within:ring-primary/30">
                        <textarea
                            value={body}
                            onChange={(event) => updateBodyWithTyping(event.target.value.slice(0, 2000))}
                            className="max-h-24 min-h-6 flex-1 resize-none bg-transparent py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                            placeholder="Aa"
                            rows={1}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault();
                                    void sendMessage();
                                }
                            }}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => void sendMessage(body.trim().length === 0 ? '\u{1F44D}' : undefined)}
                        disabled={sending}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={body.trim().length === 0 ? 'Like' : 'Send message'}
                    >
                        {sending ? <Loader2 size={18} className="animate-spin" /> : body.trim().length === 0 ? <ThumbsUp size={20} /> : <Send size={18} />}
                    </button>
                </div>
            </form>
        </section>
    ) : (
        <section className="flex h-full w-full flex-col">
            <WidgetHeader
                title={fullscreen ? 'Messages' : 'Discussions'}
                notificationPermission={desktopNotificationPermission}
                onEnableNotifications={requestDesktopNotifications}
                onExpand={!fullscreen ? () => router.visit('/messages') : undefined}
                onClose={!fullscreen ? () => setOpen(false) : undefined}
            />

            <div className="px-3 pb-2 sm:px-4">
                <label className="flex h-9 items-center gap-2 rounded-full bg-primary/8 px-3 text-sm text-gray-500 ring-1 ring-primary/10 focus-within:bg-white focus-within:ring-primary/30">
                    <Search size={18} />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                        placeholder="Search Messenger"
                    />
                    {searching && <Loader2 size={14} className="animate-spin" />}
                </label>
            </div>

            <div className="flex gap-1.5 px-3 pb-2 sm:px-4">
                <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">Tout</span>
                <span className="rounded-full px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-primary/5">Non lu</span>
                <span className="rounded-full px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-primary/5">Groupes</span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
                {search.trim().length >= 1 ? (
                    <UserSearchResults users={searchResults} onSelect={startDirectChat} searching={searching} error={searchError} />
                ) : (
                    <ConversationList
                        conversations={sortedConversations}
                        activeId={activeId ?? undefined}
                        loading={loadingConversations}
                        onSelect={loadMessages}
                    />
                )}
            </div>
        </section>
    );

    const contextMenu = messageMenu && menuMessage ? (
        <MessageContextMenu
            x={messageMenu.x}
            y={messageMenu.y}
            onEdit={() => editMenuMessage(menuMessage)}
            onDelete={() => deleteMenuMessage(menuMessage)}
        />
    ) : null;

    const callPanels = (
        <>
            <AnimatePresence>
                {incomingCall && !activeCall && (
                    <IncomingCallCard
                        call={incomingCall}
                        currentUserId={currentUser.id}
                        onAccept={() => void acceptCall(incomingCall)}
                        onDecline={() => void declineCall(incomingCall)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {activeCall && (
                    <CallWindow
                        call={activeCall}
                        currentUserId={currentUser.id}
                        status={callStatus}
                        error={callError}
                        muted={callMuted}
                        cameraOff={cameraOff}
                        localVideoRef={localVideoRef}
                        remoteVideoRef={remoteVideoRef}
                        remoteAudioRef={remoteAudioRef}
                        remoteStream={remoteStream}
                        onToggleMute={toggleMute}
                        onToggleCamera={toggleCamera}
                        onEnd={() => void endCall()}
                    />
                )}
            </AnimatePresence>
        </>
    );

    if (fullscreen) {
        return (
            <div className="relative h-full min-h-0 overflow-hidden rounded-2xl border border-primary/10 bg-white text-gray-900 shadow-sm">
                {panelContent}
                {contextMenu}
                {callPanels}
            </div>
        );
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
                        className={`fixed inset-x-3 bottom-20 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-primary/10 bg-white text-gray-900 shadow-2xl shadow-primary/20 sm:inset-x-auto sm:right-5 sm:w-[360px] md:right-6 md:bottom-6 ${
                            activeConversation ? 'h-[min(70vh,590px)] sm:h-[590px] md:w-[370px]' : 'h-[min(68vh,540px)] sm:h-[540px]'
                        }`}
                    >
                        {panelContent}
                        {contextMenu}
                    </motion.div>
                )}
            </AnimatePresence>

            {callPanels}

            {!open && (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="relative flex h-13 w-13 items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-primary/30 transition hover:scale-105 hover:bg-primary/90 sm:h-14 sm:w-14"
                    aria-label="Open messages"
                >
                    <MessageCircle size={22} />
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
    onExpand,
    onClose,
}: {
    title: string;
    notificationPermission: DesktopNotificationPermission;
    onEnableNotifications: () => Promise<void>;
    onExpand?: () => void;
    onClose?: () => void;
}) {
    const notificationsDisabled = notificationPermission === 'denied' || notificationPermission === 'unsupported';
    const notificationsGranted = notificationPermission === 'granted';

    return (
        <div className="flex items-center justify-between px-4 pb-3 pt-5">
            <div className="text-2xl font-black tracking-tight text-primary">
                <span>{title}</span>
            </div>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => void onEnableNotifications()}
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                        notificationsGranted
                            ? 'cursor-pointer bg-secondary/20 text-primary hover:bg-secondary/30'
                            : notificationsDisabled
                              ? 'cursor-pointer text-gray-300 hover:bg-primary/5 hover:text-gray-500'
                              : 'cursor-pointer text-gray-500 hover:bg-primary/5 hover:text-primary'
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
                <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-primary/5 hover:text-primary" aria-label="More options">
                    <MoreHorizontal size={19} />
                </button>
                {onExpand && (
                    <button type="button" onClick={onExpand} className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-primary/5 hover:text-primary" aria-label="Expand messages">
                        <Maximize2 size={17} />
                    </button>
                )}
                {onClose && (
                    <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-primary/5 hover:text-primary" aria-label="Close messages">
                        <X size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}

function ChatHeader({
    conversation,
    calling,
    onBack,
    onClose,
    onStartCall,
}: {
    conversation: MessengerConversation;
    calling: boolean;
    onBack: () => void;
    onClose?: () => void;
    onStartCall: (type: MessengerCall['type']) => void;
}) {
    const user = conversation.other_user;

    return (
        <div className="flex h-14 items-center justify-between border-b border-primary/10 bg-white px-3">
            <div className="flex min-w-0 items-center gap-2">
                <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-primary/5 hover:text-primary" aria-label="Back to conversations">
                    <ArrowLeft size={16} />
                </button>
                <Avatar user={user} />
                <div className="min-w-0">
                    <div className="truncate text-base font-bold text-gray-900">{user?.name ?? 'Conversation'}</div>
                    <div className="truncate text-xs text-gray-400">{user?.role ?? 'Active recently'}</div>
                </div>
            </div>
            <div className="flex items-center gap-1 text-primary">
                <button
                    type="button"
                    onClick={() => onStartCall('audio')}
                    disabled={calling}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Start audio call"
                >
                    <Phone size={18} />
                </button>
                <button
                    type="button"
                    onClick={() => onStartCall('video')}
                    disabled={calling}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Start video call"
                >
                    <Video size={18} />
                </button>
                {onClose && (
                    <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-primary/5" aria-label="Close messages">
                        <X size={22} />
                    </button>
                )}
            </div>
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
        <div className="space-y-1">
            {conversations.map((conversation) => (
                <button
                    key={conversation.id}
                    onClick={() => void onSelect(conversation)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-primary/5 ${activeId === conversation.id ? 'bg-primary/8' : ''}`}
                >
                    <Avatar user={conversation.other_user} size="lg" />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-[15px] font-semibold text-gray-900">{conversation.other_user?.name ?? 'Conversation'}</span>
                            {conversation.unread_count > 0 && (
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-white">
                                    {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                                </span>
                            )}
                        </div>
                        <p className={`mt-0.5 truncate text-sm ${conversation.unread_count > 0 ? 'font-semibold text-primary' : 'text-gray-500'}`}>
                            {conversation.last_message?.body ? previewText(conversation.last_message.body) : 'No messages yet'}
                        </p>
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
        <div className="space-y-1">
            {users.map((user) => (
                <button key={user.id} onClick={() => void onSelect(user)} className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-primary/5">
                    <Avatar user={user} size="lg" />
                    <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-gray-900">{user.name}</div>
                        <div className="truncate text-xs text-gray-400">{user.email}</div>
                    </div>
                </button>
            ))}
        </div>
    );
}

function IncomingCallCard({
    call,
    currentUserId,
    onAccept,
    onDecline,
}: {
    call: MessengerCall;
    currentUserId: number;
    onAccept: () => void;
    onDecline: () => void;
}) {
    const caller = callParticipant(call, currentUserId);

    return (
        <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed right-4 bottom-40 z-[80] w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-primary/10 bg-white p-4 shadow-2xl shadow-primary/20 md:right-6"
        >
            <div className="flex items-center gap-3">
                <Avatar user={caller} size="lg" />
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-gray-900">{caller.name}</div>
                    <div className="text-xs font-semibold text-primary">
                        Incoming {call.type === 'video' ? 'video' : 'audio'} call
                    </div>
                </div>
            </div>
            <div className="mt-4 flex gap-2">
                <button
                    type="button"
                    onClick={onDecline}
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-red-50 text-sm font-bold text-red-600 transition hover:bg-red-100"
                >
                    <PhoneOff size={16} />
                    Decline
                </button>
                <button
                    type="button"
                    onClick={onAccept}
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90"
                >
                    {call.type === 'video' ? <Video size={16} /> : <Phone size={16} />}
                    Accept
                </button>
            </div>
        </motion.div>
    );
}

function CallWindow({
    call,
    currentUserId,
    status,
    error,
    muted,
    cameraOff,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    remoteStream,
    onToggleMute,
    onToggleCamera,
    onEnd,
}: {
    call: MessengerCall;
    currentUserId: number;
    status: 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended';
    error: string | null;
    muted: boolean;
    cameraOff: boolean;
    localVideoRef: RefObject<HTMLVideoElement | null>;
    remoteVideoRef: RefObject<HTMLVideoElement | null>;
    remoteAudioRef: RefObject<HTMLAudioElement | null>;
    remoteStream: MediaStream | null;
    onToggleMute: () => void;
    onToggleCamera: () => void;
    onEnd: () => void;
}) {
    const otherUser = callParticipant(call, currentUserId);
    const isVideo = call.type === 'video';
    const statusText = error ?? (
        status === 'ringing'
            ? 'Ringing...'
            : status === 'connected'
                ? 'Connected'
                : 'Connecting...'
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed right-4 bottom-40 z-[85] w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-primary/10 bg-white shadow-2xl shadow-primary/25 md:right-6"
        >
            <div className="bg-primary px-4 py-3 text-white">
                <div className="flex items-center gap-3">
                    <Avatar user={otherUser} />
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black">{otherUser.name}</div>
                        <div className="text-xs font-medium text-white/75">{statusText}</div>
                    </div>
                    <div className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold">
                        {isVideo ? 'Video' : 'Audio'}
                    </div>
                </div>
            </div>

            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-primary/8">
                {!isVideo && <audio ref={remoteAudioRef} autoPlay className="hidden" />}
                {isVideo && remoteStream ? (
                    <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
                ) : (
                    <div className="flex flex-col items-center gap-3 text-center">
                        <Avatar user={otherUser} size="lg" />
                        <div>
                            <div className="text-sm font-black text-gray-900">{otherUser.name}</div>
                            <div className="text-xs font-semibold text-gray-500">{statusText}</div>
                        </div>
                    </div>
                )}

                {isVideo && (
                    <div className="absolute right-3 bottom-3 h-24 w-20 overflow-hidden rounded-2xl border-2 border-white bg-gray-900 shadow-lg">
                        {cameraOff ? (
                            <div className="flex h-full w-full items-center justify-center bg-primary/90 text-white">
                                <VideoOff size={18} />
                            </div>
                        ) : (
                            <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center justify-center gap-3 bg-white p-4">
                <button
                    type="button"
                    onClick={onToggleMute}
                    className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                        muted ? 'bg-primary text-white' : 'bg-primary/10 text-primary hover:bg-primary/15'
                    }`}
                    aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
                >
                    {muted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                {isVideo && (
                    <button
                        type="button"
                        onClick={onToggleCamera}
                        className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                            cameraOff ? 'bg-primary text-white' : 'bg-primary/10 text-primary hover:bg-primary/15'
                        }`}
                        aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'}
                    >
                        {cameraOff ? <VideoOff size={18} /> : <Video size={18} />}
                    </button>
                )}
                <button
                    type="button"
                    onClick={onEnd}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/25 transition hover:bg-red-600"
                    aria-label="End call"
                >
                    <PhoneOff size={19} />
                </button>
            </div>
        </motion.div>
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
            : 'rounded-2xl rounded-bl-md bg-white text-gray-900 ring-1 ring-primary/10';

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
                            className="max-h-32 min-h-20 w-full resize-none rounded-xl border border-primary/30 bg-white px-3 py-2 text-sm text-gray-900 outline-none"
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
            className="fixed z-[90] w-40 overflow-hidden rounded-xl border border-primary/10 bg-white py-1 text-sm shadow-xl shadow-primary/20"
            style={{ left: x, top: y }}
            onClick={(event) => event.stopPropagation()}
        >
            <button
                type="button"
                onClick={onEdit}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 transition hover:bg-primary/5"
            >
                <Pencil size={14} />
                Modify
            </button>
            <button
                type="button"
                onClick={onDelete}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-300 transition hover:bg-red-500/10"
            >
                <Trash2 size={14} />
                Delete
            </button>
        </div>
    );
}

function Avatar({ user, size = 'md' }: { user?: MessengerUser | null; size?: 'md' | 'lg' }) {
    const initials = (user?.name ?? '?')
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
    const sizeClass = size === 'lg' ? 'h-12 w-12 text-sm' : 'h-9 w-9 text-xs';

    if (user?.avatar) {
        return <img src={user.avatar} alt="" className={`${sizeClass} shrink-0 rounded-full object-cover`} />;
    }

    return (
        <div className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-primary/10 font-black text-primary`}>
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

function callParticipant(call: MessengerCall, currentUserId: number): MessengerUser {
    return call.started_by === currentUserId ? call.callee : call.starter;
}

function callErrorMessage(error: unknown): string {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
        return 'Camera or microphone permission was denied.';
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'Unable to start the call.';
}

function callSupportError(type: MessengerCall['type']): string | null {
    if (typeof window === 'undefined') {
        return 'Calls are not available in this browser.';
    }

    if (!window.isSecureContext) {
        return 'Calls need HTTPS, localhost, or a trusted local browser setting for microphone and camera access.';
    }

    if (!navigator.mediaDevices?.getUserMedia) {
        return 'Microphone and camera access is not available in this browser.';
    }

    if (!window.RTCPeerConnection) {
        return `${type === 'video' ? 'Video' : 'Audio'} calls are not available in this browser.`;
    }

    return null;
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
