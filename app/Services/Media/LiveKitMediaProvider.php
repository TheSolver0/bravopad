<?php

namespace App\Services\Media;

use App\Models\MessengerCall;
use App\Models\MessengerCallEvent;
use App\Models\MessengerCallParticipant;
use App\Models\MessengerCallRecording;
use App\Models\User;
use Illuminate\Support\Str;

class LiveKitMediaProvider implements MediaProviderInterface
{
    public function __construct(
        private readonly LiveKitTokenService $tokenService,
    ) {}

    public function ensureRoom(MessengerCall $call): MessengerCall
    {
        if (! $call->media_room_name) {
            $call->forceFill([
                'media_provider' => 'livekit',
                'media_room_name' => "onepad-call-{$call->id}",
                'media_status' => 'ready',
            ])->save();
        }

        return $call->fresh(['participants']);
    }

    public function joinToken(MessengerCall $call, User $user): array
    {
        $call = $this->ensureRoom($call);
        $identity = "user-{$user->id}-call-{$call->id}";

        if ($call->isGroupCall()) {
            MessengerCallParticipant::query()
                ->where('call_id', $call->id)
                ->where('user_id', $user->id)
                ->update([
                    'media_identity' => $identity,
                    'last_joined_at' => now(),
                    'updated_at' => now(),
                ]);
        }

        return [
            'provider' => 'livekit',
            'server_url' => config('media.livekit.url'),
            'room_name' => $call->media_room_name,
            'participant_identity' => $identity,
            'token' => $this->tokenService->makeJoinToken($call, $user, $call->media_room_name, $identity),
            'ttl_seconds' => (int) config('media.token_ttl', 600),
            'limits' => [
                'max_video_participants' => (int) config('media.limits.video_participants', MessengerCall::VIDEO_PARTICIPANT_LIMIT),
                'max_audio_participants' => (int) config('media.limits.audio_participants', MessengerCall::AUDIO_PARTICIPANT_LIMIT),
            ],
            'recording' => [
                'enabled' => (bool) config('media.recording.enabled', false),
                'active' => in_array($call->recording_status, ['starting', 'active'], true),
                'requires_consent' => true,
                'user_consented' => $this->userHasRecordingConsent($call, $user),
            ],
        ];
    }

    public function startRecording(MessengerCall $call, User $user, string $layout): MessengerCallRecording
    {
        $providerId = 'egress-'.$call->id.'-'.Str::uuid()->toString();

        $recording = MessengerCallRecording::query()->create([
            'call_id' => $call->id,
            'provider_id' => $providerId,
            'layout' => $layout,
            'storage_disk' => config('media.recording.disk', 'private'),
            'storage_path' => "messenger/calls/{$call->id}/recordings/{$providerId}.mp4",
            'status' => 'starting',
            'started_by' => $user->id,
            'started_at' => now(),
        ]);

        $call->forceFill([
            'recording_status' => 'starting',
            'recording_started_at' => now(),
        ])->save();

        MessengerCallEvent::query()->create([
            'call_id' => $call->id,
            'user_id' => $user->id,
            'source' => 'laravel',
            'type' => 'recording_started',
            'event_id' => 'recording-started-'.$recording->id,
            'payload_json' => [
                'recording_id' => $recording->id,
                'provider_id' => $providerId,
                'layout' => $layout,
            ],
            'occurred_at' => now(),
        ]);

        return $recording;
    }

    public function stopRecording(MessengerCallRecording $recording): MessengerCallRecording
    {
        $recording->forceFill([
            'status' => 'stopping',
            'ended_at' => now(),
        ])->save();

        $recording->call()->update([
            'recording_status' => 'stopping',
            'recording_ended_at' => now(),
        ]);

        return $recording->fresh();
    }

    private function userHasRecordingConsent(MessengerCall $call, User $user): bool
    {
        if (! $call->isGroupCall()) {
            return false;
        }

        return $call->participants()
            ->where('user_id', $user->id)
            ->whereNotNull('recording_consented_at')
            ->exists();
    }
}
