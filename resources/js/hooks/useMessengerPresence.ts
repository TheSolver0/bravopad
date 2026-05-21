import { useEffect, useState } from 'react';
import { getEcho } from '@/lib/echo';

type PresenceUser = {
    id: number;
};

type PresenceChannel = {
    here: (callback: (users: PresenceUser[]) => void) => PresenceChannel;
    joining: (callback: (user: PresenceUser) => void) => PresenceChannel;
    leaving: (callback: (user: PresenceUser) => void) => PresenceChannel;
    error?: (callback: () => void) => PresenceChannel;
};

export function useMessengerPresence(enabled: boolean): Set<number> {
    const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(() => new Set());

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const echo = getEcho();

        if (!echo) {
            return;
        }

        const heartbeat = () => {
            void fetch('/messenger/presence/heartbeat', {
                method: 'POST',
                credentials: 'same-origin',
                headers: csrfHeaders(),
            });
        };

        const channel = echo.join('messenger.presence') as unknown as PresenceChannel;

        heartbeat();
        channel
            .here((users) => {
                setOnlineUserIds(new Set(users.map((user) => user.id)));
            })
            .joining((user) => {
                setOnlineUserIds((current) => new Set(current).add(user.id));
            })
            .leaving((user) => {
                setOnlineUserIds((current) => {
                    const next = new Set(current);
                    next.delete(user.id);

                    return next;
                });
            });

        channel.error?.(() => {
            setOnlineUserIds(new Set());
        });

        const interval = window.setInterval(heartbeat, 60_000);
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                heartbeat();
            }
        };

        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            echo.leave('messenger.presence');
            setOnlineUserIds(new Set());
        };
    }, [enabled]);

    return onlineUserIds;
}

function csrfHeaders(): HeadersInit {
    const token = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content ?? '';
    const xsrfToken = getCookie('XSRF-TOKEN');

    return {
        Accept: 'application/json',
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
