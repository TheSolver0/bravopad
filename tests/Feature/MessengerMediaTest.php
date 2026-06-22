<?php

use App\Models\Conversation;
use App\Models\MessengerCall;
use App\Models\MessengerCallEvent;
use App\Models\MessengerCallParticipant;
use App\Models\MessengerCallRecording;
use App\Models\User;
use Illuminate\Support\Facades\Event;

function messengerMediaUser(array $attributes = []): User
{
    return User::factory()->create($attributes);
}

function decodeJwtPayload(string $jwt): array
{
    $payload = explode('.', $jwt)[1] ?? '';
    $payload = strtr($payload, '-_', '+/');
    $payload .= str_repeat('=', (4 - strlen($payload) % 4) % 4);

    return json_decode(base64_decode($payload), true, flags: JSON_THROW_ON_ERROR);
}

beforeEach(function () {
    config()->set('media.enabled', true);
    config()->set('media.provider', 'livekit');
    config()->set('media.livekit.url', 'wss://media.onepad.test');
    config()->set('media.livekit.api_key', 'test-key');
    config()->set('media.livekit.api_secret', 'test-secret');
    config()->set('media.livekit.webhook_secret', 'test-webhook-secret');
    config()->set('media.token_ttl', 600);
    config()->set('media.limits.video_participants', 4);
    config()->set('media.limits.audio_participants', 8);
    config()->set('media.recording.enabled', true);
});

it('issues a room scoped LiveKit join token for an accepted direct call participant', function () {
    $caller = messengerMediaUser(['name' => 'Caller']);
    $callee = messengerMediaUser(['name' => 'Callee']);
    $conversation = Conversation::createDirectBetween($caller, $callee);
    $call = MessengerCall::query()->create([
        'conversation_id' => $conversation->id,
        'started_by' => $caller->id,
        'callee_id' => $callee->id,
        'type' => 'video',
        'status' => 'accepted',
        'accepted_at' => now(),
    ]);

    $response = $this->actingAs($caller)
        ->postJson("/messenger/calls/{$call->id}/join-token")
        ->assertOk()
        ->assertJsonPath('provider', 'livekit')
        ->assertJsonPath('server_url', 'wss://media.onepad.test')
        ->assertJsonPath('ttl_seconds', 600)
        ->assertJsonPath('limits.max_video_participants', 4)
        ->assertJsonPath('limits.max_audio_participants', 8)
        ->assertJsonPath('recording.enabled', true)
        ->assertJsonPath('recording.requires_consent', true);

    $token = $response->json('token');
    $payload = decodeJwtPayload($token);

    expect($response->json('room_name'))->toBe("onepad-call-{$call->id}");
    expect($response->json('participant_identity'))->toBe("user-{$caller->id}-call-{$call->id}");
    expect($payload['iss'])->toBe('test-key');
    expect($payload['sub'])->toBe("user-{$caller->id}-call-{$call->id}");
    expect($payload['video']['room'])->toBe("onepad-call-{$call->id}");
    expect($payload['video']['roomJoin'])->toBeTrue();
    expect($payload['video']['canPublish'])->toBeTrue();
    expect($payload['video']['canSubscribe'])->toBeTrue();

    $call->refresh();
    expect($call->media_room_name)->toBe("onepad-call-{$call->id}");
    expect($call->media_status)->toBe('ready');
});

it('refuses media tokens for outsiders ended calls and removed group members', function () {
    $starter = messengerMediaUser();
    $member = messengerMediaUser();
    $outsider = messengerMediaUser();

    $conversation = Conversation::query()->create([
        'type' => 'group',
        'name' => 'Media Group',
        'created_by' => $starter->id,
    ]);
    $conversation->participants()->attach($starter->id, ['joined_at' => now()]);
    $conversation->participants()->attach($member->id, ['joined_at' => now()]);

    $activeCall = MessengerCall::query()->create([
        'conversation_id' => $conversation->id,
        'started_by' => $starter->id,
        'callee_id' => null,
        'type' => 'audio',
        'status' => 'accepted',
        'room_key' => 'group-room',
        'accepted_at' => now(),
    ]);
    MessengerCallParticipant::query()->create([
        'call_id' => $activeCall->id,
        'user_id' => $starter->id,
        'status' => 'joined',
        'joined_at' => now(),
    ]);
    MessengerCallParticipant::query()->create([
        'call_id' => $activeCall->id,
        'user_id' => $member->id,
        'status' => 'invited',
    ]);

    $this->actingAs($outsider)
        ->postJson("/messenger/calls/{$activeCall->id}/join-token")
        ->assertForbidden();

    $conversation->participants()->detach($member->id);

    $this->actingAs($member)
        ->postJson("/messenger/calls/{$activeCall->id}/join-token")
        ->assertForbidden();

    $endedCall = MessengerCall::query()->create([
        'conversation_id' => $conversation->id,
        'started_by' => $starter->id,
        'callee_id' => null,
        'type' => 'audio',
        'status' => 'ended',
        'room_key' => 'ended-room',
        'accepted_at' => now()->subMinute(),
        'ended_at' => now(),
    ]);
    MessengerCallParticipant::query()->create([
        'call_id' => $endedCall->id,
        'user_id' => $starter->id,
        'status' => 'joined',
    ]);

    $this->actingAs($starter)
        ->postJson("/messenger/calls/{$endedCall->id}/join-token")
        ->assertStatus(422)
        ->assertJsonValidationErrors(['call']);
});

it('requires joined participant recording consent before starting a recording', function () {
    Event::fake();

    $starter = messengerMediaUser();
    $member = messengerMediaUser();
    $conversation = Conversation::query()->create([
        'type' => 'group',
        'name' => 'Recording Group',
        'created_by' => $starter->id,
    ]);
    $conversation->participants()->attach($starter->id, ['joined_at' => now()]);
    $conversation->participants()->attach($member->id, ['joined_at' => now()]);
    $call = MessengerCall::query()->create([
        'conversation_id' => $conversation->id,
        'started_by' => $starter->id,
        'callee_id' => null,
        'type' => 'video',
        'status' => 'accepted',
        'room_key' => 'recording-room',
        'media_room_name' => 'onepad-call-recording',
        'media_status' => 'ready',
        'accepted_at' => now(),
    ]);
    $starterParticipant = MessengerCallParticipant::query()->create([
        'call_id' => $call->id,
        'user_id' => $starter->id,
        'status' => 'joined',
        'joined_at' => now(),
        'recording_consented_at' => now(),
    ]);
    $memberParticipant = MessengerCallParticipant::query()->create([
        'call_id' => $call->id,
        'user_id' => $member->id,
        'status' => 'joined',
        'joined_at' => now(),
    ]);

    $this->actingAs($starter)
        ->postJson("/messenger/calls/{$call->id}/recordings")
        ->assertStatus(422)
        ->assertJsonValidationErrors(['recording']);

    $memberParticipant->forceFill(['recording_consented_at' => now()])->save();

    $recording = $this->actingAs($starter)
        ->postJson("/messenger/calls/{$call->id}/recordings", ['layout' => 'grid'])
        ->assertCreated()
        ->assertJsonPath('recording.status', 'starting')
        ->assertJsonPath('recording.layout', 'grid')
        ->json('recording');

    expect(MessengerCallRecording::query()->whereKey($recording['id'])->exists())->toBeTrue();
    expect(MessengerCallEvent::query()->where('call_id', $call->id)->where('type', 'recording_started')->exists())->toBeTrue();
    expect($call->fresh()->recording_status)->toBe('starting');
    expect($starterParticipant->fresh()->recording_consented_at)->not->toBeNull();
});

it('processes LiveKit webhooks idempotently and ends calls by room name', function () {
    $starter = messengerMediaUser();
    $callee = messengerMediaUser();
    $conversation = Conversation::createDirectBetween($starter, $callee);
    $call = MessengerCall::query()->create([
        'conversation_id' => $conversation->id,
        'started_by' => $starter->id,
        'callee_id' => $callee->id,
        'type' => 'audio',
        'status' => 'accepted',
        'media_provider' => 'livekit',
        'media_room_name' => 'onepad-call-webhook',
        'media_status' => 'active',
        'accepted_at' => now()->subMinutes(2),
    ]);

    $payload = [
        'id' => 'evt-room-finished-1',
        'event' => 'room_finished',
        'room' => ['name' => 'onepad-call-webhook', 'sid' => 'RM_test'],
        'createdAt' => now()->timestamp,
    ];

    $this->postJson('/media/livekit/webhooks', $payload, [
        'X-LiveKit-Webhook-Secret' => 'test-webhook-secret',
    ])->assertOk()
        ->assertJsonPath('processed', true);

    $this->postJson('/media/livekit/webhooks', $payload, [
        'X-LiveKit-Webhook-Secret' => 'test-webhook-secret',
    ])->assertOk()
        ->assertJsonPath('processed', false);

    expect(MessengerCallEvent::query()->where('event_id', 'evt-room-finished-1')->count())->toBe(1);
    expect($call->fresh()->status)->toBe('ended');
    expect($call->fresh()->media_status)->toBe('ended');
    expect($call->fresh()->ended_reason)->toBe('livekit_room_finished');
});
