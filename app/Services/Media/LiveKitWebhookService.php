<?php

namespace App\Services\Media;

use App\Models\MessengerCall;
use App\Models\MessengerCallEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class LiveKitWebhookService
{
    public function handle(Request $request): array
    {
        $this->verify($request);

        $payload = $request->all();
        $eventId = (string) ($payload['id'] ?? $payload['event_id'] ?? hash('sha256', json_encode($payload)));
        $type = (string) ($payload['event'] ?? $payload['type'] ?? 'unknown');
        $roomName = data_get($payload, 'room.name') ?? data_get($payload, 'room_name');

        $call = MessengerCall::query()
            ->where('media_room_name', $roomName)
            ->firstOrFail();

        $event = MessengerCallEvent::query()->firstOrCreate(
            ['source' => 'livekit', 'event_id' => $eventId],
            [
                'call_id' => $call->id,
                'user_id' => null,
                'type' => $type,
                'payload_json' => $payload,
                'occurred_at' => isset($payload['createdAt'])
                    ? Carbon::createFromTimestamp((int) $payload['createdAt'])
                    : now(),
            ],
        );

        if (! $event->wasRecentlyCreated) {
            return ['processed' => false, 'call_id' => $call->id];
        }

        $this->applyEvent($call, $type, $payload);

        return ['processed' => true, 'call_id' => $call->id];
    }

    private function verify(Request $request): void
    {
        $secret = (string) config('media.livekit.webhook_secret');

        if ($secret === '') {
            abort(503, 'LiveKit webhook secret is not configured.');
        }

        if (! hash_equals($secret, (string) $request->header('X-LiveKit-Webhook-Secret'))) {
            abort(403);
        }
    }

    private function applyEvent(MessengerCall $call, string $type, array $payload): void
    {
        if ($type === 'room_finished') {
            $call->forceFill([
                'status' => 'ended',
                'media_status' => 'ended',
                'ended_reason' => 'livekit_room_finished',
                'ended_at' => $call->ended_at ?? now(),
            ])->save();
        }

        if ($type === 'room_started') {
            $call->forceFill([
                'media_status' => 'active',
                'media_room_sid' => data_get($payload, 'room.sid', $call->media_room_sid),
            ])->save();
        }

        if ($type === 'egress_ended') {
            $call->forceFill([
                'recording_status' => 'ended',
                'recording_ended_at' => now(),
            ])->save();
        }
    }
}
