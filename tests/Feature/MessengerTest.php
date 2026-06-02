<?php

use App\Events\MessageSent;
use App\Events\MessageUpdated;
use App\Events\MessengerCallUpdated;
use App\Events\MessengerConversationRead;
use App\Events\MessengerInboxUpdated;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessengerCall;
use App\Models\MessengerCallParticipant;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

function messengerUser(array $attributes = []): User
{
    return User::factory()->create($attributes);
}

it('renders the full screen messenger page for authenticated users only', function () {
    $this->withoutVite();

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
        ->assertJsonPath('conversations.0.participants.1.last_seen_at', fn (?string $value) => filled($value));
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

it('creates a named group conversation with the creator and selected members', function () {
    $creator = messengerUser();
    $firstMember = messengerUser();
    $secondMember = messengerUser();

    $conversation = $this->actingAs($creator)
        ->postJson('/messenger/conversations/groups', [
            'name' => 'Ops Squad',
            'user_ids' => [$firstMember->id, $secondMember->id],
        ])
        ->assertCreated()
        ->assertJsonPath('conversation.type', 'group')
        ->assertJsonPath('conversation.name', 'Ops Squad')
        ->assertJsonPath('conversation.other_user', null)
        ->assertJsonPath('conversation.is_creator', true)
        ->json('conversation');

    expect($conversation['participants'])->toHaveCount(3);
    expect(Conversation::query()->where('type', 'group')->where('name', 'Ops Squad')->count())->toBe(1);
    expect(Conversation::query()->find($conversation['id'])->participants()->pluck('users.id')->all())
        ->toEqualCanonicalizing([$creator->id, $firstMember->id, $secondMember->id]);
});

it('validates group creation inputs', function () {
    $creator = messengerUser();
    $member = messengerUser();
    $automation = messengerUser(['is_automation' => true]);

    $this->actingAs($creator)
        ->postJson('/messenger/conversations/groups', [
            'name' => '',
            'user_ids' => [$member->id],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['name']);

    $this->actingAs($creator)
        ->postJson('/messenger/conversations/groups', [
            'name' => 'No Members',
            'user_ids' => [],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['user_ids']);

    $this->actingAs($creator)
        ->postJson('/messenger/conversations/groups', [
            'name' => 'Self Only',
            'user_ids' => [$creator->id],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['user_ids']);

    $this->actingAs($creator)
        ->postJson('/messenger/conversations/groups', [
            'name' => 'Automation Group',
            'user_ids' => [$automation->id],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['user_ids']);
});

it('allows group participants to chat while blocking outsiders', function () {
    $creator = messengerUser();
    $member = messengerUser();
    $outsider = messengerUser();

    $conversation = $this->actingAs($creator)
        ->postJson('/messenger/conversations/groups', [
            'name' => 'Launch Team',
            'user_ids' => [$member->id],
        ])
        ->assertCreated()
        ->json('conversation');

    Event::fake([MessageSent::class, MessengerInboxUpdated::class]);

    $this->actingAs($member)
        ->postJson("/messenger/conversations/{$conversation['id']}/messages", ['body' => 'Hello group'])
        ->assertCreated()
        ->assertJsonPath('conversation.type', 'group')
        ->assertJsonPath('conversation.name', 'Launch Team');

    $this->actingAs($creator)
        ->getJson("/messenger/conversations/{$conversation['id']}/messages")
        ->assertOk()
        ->assertJsonPath('messages.0.body', 'Hello group');

    $this->actingAs($outsider)
        ->getJson("/messenger/conversations/{$conversation['id']}/messages")
        ->assertForbidden();

    Event::assertDispatched(MessageSent::class);
    Event::assertDispatched(MessengerInboxUpdated::class, 2);
});

it('allows the group creator to rename add remove members and delete the group', function () {
    $creator = messengerUser();
    $member = messengerUser();
    $newMember = messengerUser();

    $conversation = $this->actingAs($creator)
        ->postJson('/messenger/conversations/groups', [
            'name' => 'Project Alpha',
            'user_ids' => [$member->id],
        ])
        ->assertCreated()
        ->json('conversation');

    $this->actingAs($creator)
        ->patchJson("/messenger/conversations/{$conversation['id']}/group", ['name' => 'Project Beta'])
        ->assertOk()
        ->assertJsonPath('conversation.name', 'Project Beta');

    $this->actingAs($creator)
        ->postJson("/messenger/conversations/{$conversation['id']}/members", ['user_ids' => [$newMember->id]])
        ->assertOk()
        ->assertJsonPath('conversation.participants.2.id', $newMember->id);

    $this->actingAs($creator)
        ->postJson("/messenger/conversations/{$conversation['id']}/members", ['user_ids' => [$creator->id]])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['user_ids']);

    $this->actingAs($creator)
        ->deleteJson("/messenger/conversations/{$conversation['id']}/members/{$member->id}")
        ->assertOk();

    $this->actingAs($member)
        ->getJson("/messenger/conversations/{$conversation['id']}/messages")
        ->assertForbidden();

    $this->actingAs($creator)
        ->deleteJson("/messenger/conversations/{$conversation['id']}")
        ->assertOk()
        ->assertJsonPath('deleted', true);

    expect(Conversation::query()->whereKey($conversation['id'])->exists())->toBeFalse();
});

it('blocks non creators from managing or deleting groups', function () {
    $creator = messengerUser();
    $member = messengerUser();
    $candidate = messengerUser();

    $conversation = $this->actingAs($creator)
        ->postJson('/messenger/conversations/groups', [
            'name' => 'Private Group',
            'user_ids' => [$member->id],
        ])
        ->assertCreated()
        ->json('conversation');

    $this->actingAs($member)
        ->patchJson("/messenger/conversations/{$conversation['id']}/group", ['name' => 'Hacked'])
        ->assertForbidden();

    $this->actingAs($member)
        ->postJson("/messenger/conversations/{$conversation['id']}/members", ['user_ids' => [$candidate->id]])
        ->assertForbidden();

    $this->actingAs($member)
        ->deleteJson("/messenger/conversations/{$conversation['id']}/members/{$creator->id}")
        ->assertForbidden();

    $this->actingAs($member)
        ->deleteJson("/messenger/conversations/{$conversation['id']}")
        ->assertForbidden();

    expect(Conversation::query()->whereKey($conversation['id'])->exists())->toBeTrue();
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

it('sends media messages with a single uploaded file', function (string $kind, string $filename, string $mime) {
    Storage::fake('public');
    Event::fake([MessageSent::class, MessengerInboxUpdated::class]);

    $sender = messengerUser();
    $recipient = messengerUser();
    $conversation = Conversation::createDirectBetween($sender, $recipient);
    $file = UploadedFile::fake()->create($filename, 128, $mime);

    $this->actingAs($sender)
        ->postJson("/messenger/conversations/{$conversation->id}/messages", [
            'media' => $file,
        ])
        ->assertCreated()
        ->assertJsonPath('message.type', $kind)
        ->assertJsonPath('message.body', '')
        ->assertJsonPath('message.media_mime', $mime)
        ->assertJsonPath('message.media_url', fn (?string $value) => filled($value) && str_starts_with($value, '/storage/'));

    $message = Message::query()->firstOrFail();

    expect($message->type)->toBe($kind);
    expect($message->media_path)->not->toBeNull();
    Storage::disk('public')->assertExists($message->media_path);

    $this->actingAs($recipient)
        ->getJson("/messenger/conversations/{$conversation->id}/messages")
        ->assertOk()
        ->assertJsonPath('messages.0.type', $kind)
        ->assertJsonPath('messages.0.media_mime', $mime);
})->with([
    ['image', 'photo.jpg', 'image/jpeg'],
    ['video', 'clip.mp4', 'video/mp4'],
    ['audio', 'voice.webm', 'audio/webm'],
]);

it('rejects unsupported messenger media uploads', function () {
    Storage::fake('public');

    $sender = messengerUser();
    $recipient = messengerUser();
    $conversation = Conversation::createDirectBetween($sender, $recipient);
    $file = UploadedFile::fake()->create('document.pdf', 64, 'application/pdf');

    $this->actingAs($sender)
        ->postJson("/messenger/conversations/{$conversation->id}/messages", [
            'media' => $file,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['media']);

    expect(Message::query()->count())->toBe(0);
});

it('allows participants to reply to messages with quoted context', function () {
    Event::fake([MessageSent::class, MessengerInboxUpdated::class]);

    $sender = messengerUser(['name' => 'Sender']);
    $recipient = messengerUser(['name' => 'Recipient']);
    $outsider = messengerUser();
    $conversation = Conversation::createDirectBetween($sender, $recipient);
    $original = Message::query()->create([
        'conversation_id' => $conversation->id,
        'sender_id' => $sender->id,
        'body' => 'Original question',
    ]);
    $outsiderConversation = Conversation::createDirectBetween($sender, $outsider);
    $outsiderMessage = Message::query()->create([
        'conversation_id' => $outsiderConversation->id,
        'sender_id' => $sender->id,
        'body' => 'Private outsider message',
    ]);

    $this->actingAs($recipient)
        ->postJson("/messenger/conversations/{$conversation->id}/messages", [
            'body' => 'Here is the answer',
            'reply_to_id' => $original->id,
        ])
        ->assertCreated()
        ->assertJsonPath('message.reply_to.id', $original->id)
        ->assertJsonPath('message.reply_to.body', 'Original question')
        ->assertJsonPath('message.reply_to.sender.name', 'Sender');

    $this->actingAs($recipient)
        ->postJson("/messenger/conversations/{$conversation->id}/messages", [
            'body' => 'Wrong thread',
            'reply_to_id' => $outsiderMessage->id,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['reply_to_id']);
});

it('toggles likes on a message once per user', function () {
    Event::fake([MessageUpdated::class]);

    $sender = messengerUser();
    $recipient = messengerUser();
    $outsider = messengerUser();
    $conversation = Conversation::createDirectBetween($sender, $recipient);
    $message = Message::query()->create([
        'conversation_id' => $conversation->id,
        'sender_id' => $sender->id,
        'body' => 'Like this',
    ]);

    $this->actingAs($recipient)
        ->postJson("/messenger/conversations/{$conversation->id}/messages/{$message->id}/like")
        ->assertOk()
        ->assertJsonPath('message.likes_count', 1)
        ->assertJsonPath('message.user_has_liked', true);

    $this->actingAs($recipient)
        ->postJson("/messenger/conversations/{$conversation->id}/messages/{$message->id}/like")
        ->assertOk()
        ->assertJsonPath('message.likes_count', 0)
        ->assertJsonPath('message.user_has_liked', false);

    $this->actingAs($outsider)
        ->postJson("/messenger/conversations/{$conversation->id}/messages/{$message->id}/like")
        ->assertForbidden();

    Event::assertDispatched(MessageUpdated::class, 2);
});

it('lists global and conversation call history with durations for participants only', function () {
    $caller = messengerUser(['name' => 'Caller']);
    $callee = messengerUser(['name' => 'Callee']);
    $outsider = messengerUser();
    $conversation = Conversation::createDirectBetween($caller, $callee);
    $otherConversation = Conversation::createDirectBetween($caller, $outsider);

    $endedCall = MessengerCall::query()->create([
        'conversation_id' => $conversation->id,
        'started_by' => $caller->id,
        'callee_id' => $callee->id,
        'type' => 'audio',
        'status' => 'ended',
        'accepted_at' => now()->subMinutes(5),
        'ended_at' => now()->subMinutes(3),
    ]);
    MessengerCall::query()->create([
        'conversation_id' => $conversation->id,
        'started_by' => $callee->id,
        'callee_id' => $caller->id,
        'type' => 'video',
        'status' => 'declined',
        'accepted_at' => null,
        'ended_at' => now()->subMinute(),
    ]);
    MessengerCall::query()->create([
        'conversation_id' => $otherConversation->id,
        'started_by' => $outsider->id,
        'callee_id' => $caller->id,
        'type' => 'audio',
        'status' => 'ringing',
    ]);

    $this->actingAs($callee)
        ->getJson('/messenger/calls')
        ->assertOk()
        ->assertJsonCount(2, 'calls')
        ->assertJsonPath('calls.1.id', $endedCall->id)
        ->assertJsonPath('calls.1.duration_seconds', 120)
        ->assertJsonPath('calls.1.starter.name', 'Caller');

    $this->actingAs($callee)
        ->getJson("/messenger/conversations/{$conversation->id}/calls")
        ->assertOk()
        ->assertJsonCount(2, 'calls')
        ->assertJsonPath('calls.0.duration_seconds', 0);

    $this->actingAs($outsider)
        ->getJson("/messenger/conversations/{$conversation->id}/calls")
        ->assertForbidden();
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

it('starts a group call with invited participants and room metadata', function () {
    Event::fake([MessengerCallUpdated::class]);

    $starter = messengerUser();
    $firstMember = messengerUser();
    $secondMember = messengerUser();

    $conversation = $this->actingAs($starter)
        ->postJson('/messenger/conversations/groups', [
            'name' => 'Daily Standup',
            'user_ids' => [$firstMember->id, $secondMember->id],
        ])
        ->assertCreated()
        ->json('conversation');

    $call = $this->actingAs($starter)
        ->postJson("/messenger/conversations/{$conversation['id']}/calls", ['type' => 'video'])
        ->assertCreated()
        ->assertJsonPath('call.type', 'video')
        ->assertJsonPath('call.status', 'accepted')
        ->assertJsonPath('call.callee_id', null)
        ->assertJsonPath('call.started_by', $starter->id)
        ->assertJsonPath('call.joined_count', 1)
        ->assertJsonPath('call.max_participants', 4)
        ->assertJsonPath("call.participants.{$starter->id}.status", 'joined')
        ->assertJsonPath("call.participants.{$firstMember->id}.status", 'invited')
        ->assertJsonPath('call.room_key', fn (?string $value) => filled($value))
        ->json('call');

    expect(MessengerCallParticipant::query()->where('call_id', $call['id'])->count())->toBe(3);
    expect(MessengerCallParticipant::query()
        ->where('call_id', $call['id'])
        ->where('user_id', $starter->id)
        ->value('status'))->toBe('joined');
    expect(MessengerCallParticipant::query()
        ->where('call_id', $call['id'])
        ->where('user_id', $firstMember->id)
        ->value('status'))->toBe('invited');

    Event::assertDispatched(MessengerCallUpdated::class);
});

it('allows invited group participants to join decline leave and starter end all', function () {
    Event::fake([MessengerCallUpdated::class]);

    $starter = messengerUser();
    $firstMember = messengerUser();
    $secondMember = messengerUser();
    $outsider = messengerUser();

    $conversation = $this->actingAs($starter)
        ->postJson('/messenger/conversations/groups', [
            'name' => 'Ops Call',
            'user_ids' => [$firstMember->id, $secondMember->id],
        ])
        ->assertCreated()
        ->json('conversation');

    $call = $this->actingAs($starter)
        ->postJson("/messenger/conversations/{$conversation['id']}/calls", ['type' => 'audio'])
        ->assertCreated()
        ->json('call');

    $this->actingAs($outsider)
        ->patchJson("/messenger/conversations/{$conversation['id']}/calls/{$call['id']}", ['status' => 'accepted'])
        ->assertForbidden();

    $this->actingAs($firstMember)
        ->patchJson("/messenger/conversations/{$conversation['id']}/calls/{$call['id']}", ['status' => 'accepted'])
        ->assertOk()
        ->assertJsonPath('call.joined_count', 2)
        ->assertJsonPath("call.participants.{$firstMember->id}.status", 'joined');

    $this->actingAs($secondMember)
        ->patchJson("/messenger/conversations/{$conversation['id']}/calls/{$call['id']}", ['status' => 'declined'])
        ->assertOk()
        ->assertJsonPath("call.participants.{$secondMember->id}.status", 'declined');

    $this->actingAs($firstMember)
        ->patchJson("/messenger/conversations/{$conversation['id']}/calls/{$call['id']}", ['status' => 'left'])
        ->assertOk()
        ->assertJsonPath("call.participants.{$firstMember->id}.status", 'left')
        ->assertJsonPath('call.status', 'accepted');

    $this->actingAs($firstMember)
        ->patchJson("/messenger/conversations/{$conversation['id']}/calls/{$call['id']}", ['status' => 'ended'])
        ->assertForbidden();

    $this->actingAs($starter)
        ->patchJson("/messenger/conversations/{$conversation['id']}/calls/{$call['id']}", ['status' => 'ended'])
        ->assertOk()
        ->assertJsonPath('call.status', 'ended')
        ->assertJsonPath('call.ended_at', fn (?string $value) => filled($value));

    Event::assertDispatched(MessengerCallUpdated::class, 5);
});

it('enforces group call capacity and active call uniqueness', function () {
    $starter = messengerUser();
    $members = collect(range(1, 8))->map(fn () => messengerUser());

    $conversation = $this->actingAs($starter)
        ->postJson('/messenger/conversations/groups', [
            'name' => 'Large Call',
            'user_ids' => $members->pluck('id')->all(),
        ])
        ->assertCreated()
        ->json('conversation');

    $videoCall = $this->actingAs($starter)
        ->postJson("/messenger/conversations/{$conversation['id']}/calls", ['type' => 'video'])
        ->assertCreated()
        ->json('call');

    $this->actingAs($starter)
        ->postJson("/messenger/conversations/{$conversation['id']}/calls", ['type' => 'audio'])
        ->assertStatus(422);

    foreach ($members->take(3) as $member) {
        $this->actingAs($member)
            ->patchJson("/messenger/conversations/{$conversation['id']}/calls/{$videoCall['id']}", ['status' => 'accepted'])
            ->assertOk();
    }

    $this->actingAs($members[3])
        ->patchJson("/messenger/conversations/{$conversation['id']}/calls/{$videoCall['id']}", ['status' => 'accepted'])
        ->assertStatus(422);

    $this->actingAs($starter)
        ->patchJson("/messenger/conversations/{$conversation['id']}/calls/{$videoCall['id']}", ['status' => 'ended'])
        ->assertOk();

    $audioCall = $this->actingAs($starter)
        ->postJson("/messenger/conversations/{$conversation['id']}/calls", ['type' => 'audio'])
        ->assertCreated()
        ->assertJsonPath('call.max_participants', 8)
        ->json('call');

    foreach ($members->take(7) as $member) {
        $this->actingAs($member)
            ->patchJson("/messenger/conversations/{$conversation['id']}/calls/{$audioCall['id']}", ['status' => 'accepted'])
            ->assertOk();
    }

    $this->actingAs($members[7])
        ->patchJson("/messenger/conversations/{$conversation['id']}/calls/{$audioCall['id']}", ['status' => 'accepted'])
        ->assertStatus(422);
});

it('ends a group call when the last joined participant leaves', function () {
    $starter = messengerUser();
    $member = messengerUser();

    $conversation = $this->actingAs($starter)
        ->postJson('/messenger/conversations/groups', [
            'name' => 'Short Call',
            'user_ids' => [$member->id],
        ])
        ->assertCreated()
        ->json('conversation');

    $call = $this->actingAs($starter)
        ->postJson("/messenger/conversations/{$conversation['id']}/calls", ['type' => 'audio'])
        ->assertCreated()
        ->json('call');

    $this->actingAs($starter)
        ->patchJson("/messenger/conversations/{$conversation['id']}/calls/{$call['id']}", ['status' => 'left'])
        ->assertOk()
        ->assertJsonPath('call.status', 'ended')
        ->assertJsonPath('call.ended_at', fn (?string $value) => filled($value));
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
    $groupConversation = Conversation::query()->create([
        'type' => 'group',
        'name' => 'Calls',
        'created_by' => $me->id,
    ]);
    $groupConversation->participants()->attach($me->id, ['joined_at' => now()]);
    $groupConversation->participants()->attach($target->id, ['joined_at' => now()]);
    $groupCall = MessengerCall::query()->create([
        'conversation_id' => $groupConversation->id,
        'started_by' => $me->id,
        'callee_id' => null,
        'type' => 'audio',
        'status' => 'accepted',
        'room_key' => 'call-test-room',
        'accepted_at' => now(),
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
    expect($callAuthorizer($me, $groupCall->id))->toBeTrue();
    expect($callAuthorizer($target, $groupCall->id))->toBeTrue();
    expect($callAuthorizer($outsider, $groupCall->id))->toBeFalse();
});
