<?php

use App\Events\MessageSent;
use App\Events\MessageUpdated;
use App\Events\MessengerCallUpdated;
use App\Events\MessengerConversationRead;
use App\Events\MessengerInboxUpdated;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessengerCall;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

function messengerUser(array $attributes = []): User
{
    return User::factory()->create($attributes);
}

it('renders the full screen messenger page for authenticated users only', function () {
    $user = messengerUser();

    $this->get('/messages')
        ->assertRedirect('/login');

    $this->actingAs($user)
        ->get('/messages')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Messages'));
});

it('searches non automation users for direct messages', function () {
    $me = messengerUser(['name' => 'Current User']);
    $target = messengerUser(['name' => 'Alice Martin']);
    messengerUser(['name' => 'Automation Bot', 'is_automation' => true]);
    messengerUser(['name' => 'Bob Smith']);

    $this->actingAs($me)
        ->getJson('/messenger/users?search=ali')
        ->assertOk()
        ->assertJsonPath('users.0.id', $target->id)
        ->assertJsonMissing(['name' => 'Automation Bot'])
        ->assertJsonMissing(['name' => 'Current User']);
});

it('updates the authenticated user messenger presence heartbeat', function () {
    $user = messengerUser();

    $this->actingAs($user)
        ->postJson('/messenger/presence/heartbeat')
        ->assertOk()
        ->assertJsonPath('user.id', $user->id)
        ->assertJsonPath('user.last_seen_at', fn (?string $value) => filled($value));

    expect($user->fresh()->last_seen_at)->not->toBeNull();
});

it('includes last seen timestamps in messenger user payloads', function () {
    $me = messengerUser();
    $target = messengerUser([
        'name' => 'Alice Martin',
        'last_seen_at' => now()->subMinutes(3),
    ]);

    $conversation = Conversation::createDirectBetween($me, $target);

    $this->actingAs($me)
        ->getJson('/messenger/users?search=ali')
        ->assertOk()
        ->assertJsonPath('users.0.id', $target->id)
        ->assertJsonPath('users.0.last_seen_at', fn (?string $value) => filled($value));

    $this->actingAs($me)
        ->getJson('/messenger/conversations')
        ->assertOk()
        ->assertJsonPath('conversations.0.id', $conversation->id)
        ->assertJsonPath('conversations.0.other_user.last_seen_at', fn (?string $value) => filled($value))
        ->assertJsonPath("conversations.0.participants.1.last_seen_at", fn (?string $value) => filled($value));
});

it('authorizes messenger presence channel with safe user metadata', function () {
    $user = messengerUser([
        'name' => 'Current User',
        'email' => 'current@example.com',
        'last_seen_at' => now(),
    ]);

    $presenceAuthorizer = Broadcast::getChannels()->get('messenger.presence');
    $payload = $presenceAuthorizer($user);

    expect($payload)->toMatchArray([
        'id' => $user->id,
        'name' => 'Current User',
        'avatar' => null,
        'role' => null,
    ]);
    expect($payload)->toHaveKey('last_seen_at');
    expect($payload)->not->toHaveKey('email');
});

it('creates and reuses a direct conversation between two users', function () {
    $me = messengerUser();
    $target = messengerUser();

    $payload = ['user_id' => $target->id];

    $first = $this->actingAs($me)
        ->postJson('/messenger/conversations/direct', $payload)
        ->assertCreated()
        ->json('conversation');

    $second = $this->actingAs($me)
        ->postJson('/messenger/conversations/direct', $payload)
        ->assertOk()
        ->json('conversation');

    expect($second['id'])->toBe($first['id']);
    expect(Conversation::count())->toBe(1);
    expect(Conversation::first()->participants)->toHaveCount(2);
});

it('rejects direct conversations with self and automation users', function () {
    $me = messengerUser();
    $automation = messengerUser(['is_automation' => true]);

    $this->actingAs($me)
        ->postJson('/messenger/conversations/direct', ['user_id' => $me->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['user_id']);

    $this->actingAs($me)
        ->postJson('/messenger/conversations/direct', ['user_id' => $automation->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['user_id']);
});

it('allows participants to send and list messages while blocking outsiders', function () {
    Event::fake([MessageSent::class, MessengerInboxUpdated::class]);

    $me = messengerUser();
    $target = messengerUser();
    $outsider = messengerUser();

    $conversation = $this->actingAs($me)
        ->postJson('/messenger/conversations/direct', ['user_id' => $target->id])
        ->assertCreated()
        ->json('conversation');

    $this->actingAs($me)
        ->postJson("/messenger/conversations/{$conversation['id']}/messages", ['body' => 'Hello there'])
        ->assertCreated()
        ->assertJsonPath('message.body', 'Hello there')
        ->assertJsonPath('conversation.unread_count', 0);

    $this->actingAs($target)
        ->getJson("/messenger/conversations/{$conversation['id']}/messages")
        ->assertOk()
        ->assertJsonPath('messages.0.body', 'Hello there');

    $this->actingAs($outsider)
        ->getJson("/messenger/conversations/{$conversation['id']}/messages")
        ->assertForbidden();

    Event::assertDispatched(MessageSent::class);
    Event::assertDispatched(MessengerInboxUpdated::class, 2);
});

it('allows the recipient to open, reuse, and reply to an existing direct conversation', function () {
    Event::fake([MessageSent::class, MessengerInboxUpdated::class]);

    $sender = messengerUser(['name' => 'Super Admin']);
    $recipient = messengerUser(['name' => 'RH PAD']);

    $conversation = $this->actingAs($sender)
        ->postJson('/messenger/conversations/direct', ['user_id' => $recipient->id])
        ->assertCreated()
        ->json('conversation');

    $this->actingAs($sender)
        ->postJson("/messenger/conversations/{$conversation['id']}/messages", ['body' => 'Hello RH'])
        ->assertCreated();

    $this->actingAs($recipient)
        ->getJson('/messenger/conversations')
        ->assertOk()
        ->assertJsonPath('conversations.0.id', $conversation['id'])
        ->assertJsonPath('conversations.0.other_user.id', $sender->id);

    $this->actingAs($recipient)
        ->getJson("/messenger/conversations/{$conversation['id']}/messages")
        ->assertOk()
        ->assertJsonPath('messages.0.body', 'Hello RH');

    $this->actingAs($recipient)
        ->postJson('/messenger/conversations/direct', ['user_id' => $sender->id])
        ->assertOk()
        ->assertJsonPath('conversation.id', $conversation['id']);

    $this->actingAs($recipient)
        ->postJson("/messenger/conversations/{$conversation['id']}/messages", ['body' => 'Hello Super Admin'])
        ->assertCreated()
        ->assertJsonPath('message.body', 'Hello Super Admin');

    expect(Conversation::count())->toBe(1);
});

it('includes message preview data in inbox update payloads for notifications', function () {
    $sender = messengerUser(['name' => 'Super Admin']);
    $recipient = messengerUser(['name' => 'RH PAD']);
    $conversation = Conversation::createDirectBetween($sender, $recipient);

    $message = Message::create([
        'conversation_id' => $conversation->id,
        'sender_id' => $sender->id,
        'body' => 'Please check this update',
    ]);

    $conversation->forceFill([
        'last_message_id' => $message->id,
        'last_message_at' => $message->created_at,
    ])->save();

    $payload = (new MessengerInboxUpdated($recipient, $conversation->fresh()))->broadcastWith();

    expect($payload['conversation']['id'])->toBe($conversation->id);
    expect($payload['conversation']['other_user']['id'])->toBe($sender->id);
    expect($payload['conversation']['last_message']['id'])->toBe($message->id);
    expect($payload['conversation']['last_message']['body'])->toBe('Please check this update');
    expect($payload['conversation']['last_message']['sender']['name'])->toBe('Super Admin');
});

it('lists conversations with unread counts and can mark one as read', function () {
    Event::fake([MessengerConversationRead::class, MessengerInboxUpdated::class]);

    $me = messengerUser();
    $target = messengerUser();

    $conversation = Conversation::createDirectBetween($me, $target);
    Message::create([
        'conversation_id' => $conversation->id,
        'sender_id' => $target->id,
        'body' => 'Unread hello',
    ]);
    $conversation->forceFill(['last_message_at' => now()])->save();

    $this->actingAs($me)
        ->getJson('/messenger/conversations')
        ->assertOk()
        ->assertJsonPath('unread_total', 1)
        ->assertJsonPath('conversations.0.unread_count', 1);

    $this->actingAs($me)
        ->postJson("/messenger/conversations/{$conversation->id}/read")
        ->assertOk()
        ->assertJsonPath('conversation.unread_count', 0)
        ->assertJsonPath("conversation.read_at_by_user.{$me->id}", fn (?string $value) => filled($value));

    $this->actingAs($me)
        ->getJson('/messenger/conversations')
        ->assertOk()
        ->assertJsonPath('unread_total', 0);

    Event::assertDispatched(MessengerConversationRead::class);
});

it('allows message authors to edit and delete their own messages', function () {
    Event::fake([MessageUpdated::class, MessengerInboxUpdated::class]);

    $author = messengerUser();
    $recipient = messengerUser();
    $conversation = Conversation::createDirectBetween($author, $recipient);
    $message = Message::create([
        'conversation_id' => $conversation->id,
        'sender_id' => $author->id,
        'body' => 'Original message',
    ]);
    $conversation->forceFill([
        'last_message_id' => $message->id,
        'last_message_at' => $message->created_at,
    ])->save();

    $this->actingAs($recipient)
        ->patchJson("/messenger/conversations/{$conversation->id}/messages/{$message->id}", ['body' => 'Hacked'])
        ->assertForbidden();

    $this->actingAs($author)
        ->patchJson("/messenger/conversations/{$conversation->id}/messages/{$message->id}", ['body' => 'Updated message'])
        ->assertOk()
        ->assertJsonPath('message.body', 'Updated message')
        ->assertJsonPath('message.is_edited', true);

    $this->actingAs($recipient)
        ->deleteJson("/messenger/conversations/{$conversation->id}/messages/{$message->id}")
        ->assertForbidden();

    $this->actingAs($author)
        ->deleteJson("/messenger/conversations/{$conversation->id}/messages/{$message->id}")
        ->assertOk()
        ->assertJsonPath('message.body', '')
        ->assertJsonPath('message.is_deleted', true);

    Event::assertDispatched(MessageUpdated::class, 2);
});

it('starts and updates direct audio and video calls between participants', function () {
    Event::fake([MessengerCallUpdated::class]);

    $caller = messengerUser();
    $callee = messengerUser();
    $outsider = messengerUser();
    $conversation = Conversation::createDirectBetween($caller, $callee);

    $call = $this->actingAs($caller)
        ->postJson("/messenger/conversations/{$conversation->id}/calls", ['type' => 'video'])
        ->assertCreated()
        ->assertJsonPath('call.type', 'video')
        ->assertJsonPath('call.status', 'ringing')
        ->assertJsonPath('call.started_by', $caller->id)
        ->assertJsonPath('call.callee_id', $callee->id)
        ->json('call');

    $this->actingAs($outsider)
        ->patchJson("/messenger/conversations/{$conversation->id}/calls/{$call['id']}", ['status' => 'accepted'])
        ->assertForbidden();

    $this->actingAs($caller)
        ->patchJson("/messenger/conversations/{$conversation->id}/calls/{$call['id']}", ['status' => 'accepted'])
        ->assertForbidden();

    $this->actingAs($callee)
        ->patchJson("/messenger/conversations/{$conversation->id}/calls/{$call['id']}", ['status' => 'accepted'])
        ->assertOk()
        ->assertJsonPath('call.status', 'accepted')
        ->assertJsonPath('call.accepted_at', fn (?string $value) => filled($value));

    $this->actingAs($caller)
        ->patchJson("/messenger/conversations/{$conversation->id}/calls/{$call['id']}", ['status' => 'ended'])
        ->assertOk()
        ->assertJsonPath('call.status', 'ended')
        ->assertJsonPath('call.ended_at', fn (?string $value) => filled($value));

    expect(MessengerCall::query()->where('type', 'video')->count())->toBe(1);
    Event::assertDispatched(MessengerCallUpdated::class, 3);
});

it('authorizes private messenger broadcast channels', function () {
    $me = messengerUser();
    $target = messengerUser();
    $outsider = messengerUser();
    $conversation = Conversation::createDirectBetween($me, $target);
    $call = MessengerCall::query()->create([
        'conversation_id' => $conversation->id,
        'started_by' => $me->id,
        'callee_id' => $target->id,
        'type' => 'audio',
        'status' => 'ringing',
    ]);

    $conversationAuthorizer = Broadcast::getChannels()->get('messenger.conversation.{conversationId}');
    $userAuthorizer = Broadcast::getChannels()->get('messenger.user.{userId}');
    $callAuthorizer = Broadcast::getChannels()->get('messenger.call.{callId}');

    expect($conversationAuthorizer($me, $conversation->id))->toBeTrue();
    expect($conversationAuthorizer($outsider, $conversation->id))->toBeFalse();
    expect($userAuthorizer($me, $me->id))->toBeTrue();
    expect($userAuthorizer($outsider, $me->id))->toBeFalse();
    expect($callAuthorizer($me, $call->id))->toBeTrue();
    expect($callAuthorizer($target, $call->id))->toBeTrue();
    expect($callAuthorizer($outsider, $call->id))->toBeFalse();
});
