import { Room, RoomEvent, Track, createLocalTracks    } from 'livekit-client';
import type {LocalTrack, RemoteParticipant, RemoteTrack} from 'livekit-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaJoinTokenResponse, MessengerCall } from '@/pages/types';

type MediaCallStatus = 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended';

function csrfHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const token = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content ?? '';

    return {
        Accept: 'application/json',
        'X-CSRF-TOKEN': token,
        ...extra,
    };
}

async function responseError(response: Response, fallback: string): Promise<string> {
    try {
        const data = (await response.json()) as { message?: string; errors?: Record<string, string[]> };
        const firstError = data.errors ? Object.values(data.errors).flat()[0] : null;

        return firstError ?? data.message ?? fallback;
    } catch {
        return fallback;
    }
}

export function useMediaCall() {
    const roomRef = useRef<Room | null>(null);
    const localTracksRef = useRef<LocalTrack[]>([]);
    const remoteStreamsRef = useRef<Record<number, MediaStream>>({});
    const remoteIdentityMapRef = useRef<Record<string, number>>({});
    const [status, setStatus] = useState<MediaCallStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [muted, setMuted] = useState(false);
    const [cameraOff, setCameraOff] = useState(false);
    const [screenSharing, setScreenSharing] = useState(false);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Record<number, MediaStream>>({});
    const [joinToken, setJoinToken] = useState<MediaJoinTokenResponse | null>(null);

    const disconnect = useCallback(() => {
        roomRef.current?.disconnect();
        roomRef.current = null;
        localTracksRef.current.forEach((track) => track.stop());
        localTracksRef.current = [];
        remoteStreamsRef.current = {};
        remoteIdentityMapRef.current = {};
        setLocalStream(null);
        setRemoteStream(null);
        setRemoteStreams({});
        setJoinToken(null);
        setMuted(false);
        setCameraOff(false);
        setScreenSharing(false);
        setStatus('ended');
    }, []);

    const connect = useCallback(async (call: MessengerCall) => {
        setStatus('connecting');
        setError(null);

        const response = await fetch(`/messenger/calls/${call.id}/join-token`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        });

        if (!response.ok) {
            const message = await responseError(response, 'Unable to join this media room');
            setError(message);

            throw new Error(message);
        }

        const tokenResponse = (await response.json()) as MediaJoinTokenResponse;
        setJoinToken(tokenResponse);

        const tracks = await createLocalTracks({
            audio: true,
            video: call.type === 'video',
        });
        localTracksRef.current = tracks;
        setLocalStream(new MediaStream(tracks.map((track) => track.mediaStreamTrack)));

        const room = new Room({
            adaptiveStream: true,
            dynacast: true,
        });
        roomRef.current = room;

        room
            .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _publication, participant: RemoteParticipant) => {
                const participantId = participantIdFromIdentity(participant.identity);

                if (!participantId) {
                    return;
                }

                remoteIdentityMapRef.current[participant.identity] = participantId;
                const stream = remoteStreamsRef.current[participantId] ?? new MediaStream();
                stream.addTrack(track.mediaStreamTrack);
                remoteStreamsRef.current = {
                    ...remoteStreamsRef.current,
                    [participantId]: stream,
                };
                setRemoteStreams(remoteStreamsRef.current);
                setRemoteStream(stream);
            })
            .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, _publication, participant: RemoteParticipant) => {
                const participantId = remoteIdentityMapRef.current[participant.identity] ?? participantIdFromIdentity(participant.identity);

                if (!participantId) {
                    return;
                }

                const stream = remoteStreamsRef.current[participantId];

                if (stream) {
                    stream.removeTrack(track.mediaStreamTrack);
                }

                if (!stream || stream.getTracks().length === 0) {
                    const next = { ...remoteStreamsRef.current };
                    delete next[participantId];
                    remoteStreamsRef.current = next;
                    setRemoteStreams(next);
                    setRemoteStream(Object.values(next)[0] ?? null);
                } else {
                    setRemoteStreams({ ...remoteStreamsRef.current });
                }
            })
            .on(RoomEvent.Disconnected, () => {
                setStatus((current) => (current === 'ended' ? current : 'ended'));
            })
            .on(RoomEvent.MediaDevicesError, (mediaError: Error) => {
                setError(mediaError.message);
            })
            .on(RoomEvent.ConnectionStateChanged, () => {
                if (room.state === 'connected') {
                    setStatus('connected');
                }
            });

        await room.connect(tokenResponse.server_url, tokenResponse.token);

        await Promise.all(tracks.map((track) => room.localParticipant.publishTrack(track)));
        setStatus('connected');
    }, []);

    const toggleMute = useCallback(() => {
        localTracksRef.current
            .filter((track) => track.source === Track.Source.Microphone)
            .forEach((track) => {
                if (muted) {
                    void track.unmute();
                } else {
                    void track.mute();
                }
            });
        setMuted((current) => !current);
    }, [muted]);

    const toggleCamera = useCallback(() => {
        localTracksRef.current
            .filter((track) => track.source === Track.Source.Camera)
            .forEach((track) => {
                if (cameraOff) {
                    void track.unmute();
                } else {
                    void track.mute();
                }
            });
        setCameraOff((current) => !current);
    }, [cameraOff]);

    const toggleScreenShare = useCallback(async () => {
        const room = roomRef.current;

        if (!room) {
            return;
        }

        const next = !screenSharing;
        await room.localParticipant.setScreenShareEnabled(next);
        setScreenSharing(next);
    }, [screenSharing]);

    const consentToRecording = useCallback(async (call: MessengerCall, consented: boolean) => {
        const response = await fetch(`/messenger/calls/${call.id}/recording-consent`, {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: csrfHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ consented }),
        });

        if (!response.ok) {
            throw new Error(await responseError(response, 'Unable to update recording consent'));
        }
    }, []);

    const startRecording = useCallback(async (call: MessengerCall) => {
        const response = await fetch(`/messenger/calls/${call.id}/recordings`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: csrfHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ layout: 'grid' }),
        });

        if (!response.ok) {
            throw new Error(await responseError(response, 'Unable to start recording'));
        }
    }, []);

    useEffect(() => disconnect, [disconnect]);

    return {
        status,
        error,
        muted,
        cameraOff,
        screenSharing,
        localStream,
        remoteStream,
        remoteStreams,
        joinToken,
        connect,
        disconnect,
        setStatus,
        setError,
        toggleMute,
        toggleCamera,
        toggleScreenShare,
        consentToRecording,
        startRecording,
    };
}

function participantIdFromIdentity(identity: string): number | null {
    const match = identity.match(/^user-(\d+)-call-\d+$/);

    return match ? Number(match[1]) : null;
}

