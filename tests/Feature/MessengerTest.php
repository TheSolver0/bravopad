<?php

use App\Events\MessageSent;
use App\Events\MessageUpdated;
use App\Events\MessengerConversationRead;
use App\Events\MessengerInboxUpdated;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Event;

function messengerUser(array $attributes = []): User
{
    return User::factory()->create($attributes);
}

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

it('authorizes private messenger broadcast channels', function () {
    $me = messengerUser();
    $target = messengerUser();
    $outsider = messengerUser();
    $conversation = Conversation::createDirectBetween($me, $target);

    $conversationAuthorizer = Broadcast::getChannels()->get('messenger.conversation.{conversationId}');
    $userAuthorizer = Broadcast::getChannels()->get('messenger.user.{userId}');

    expect($conversationAuthorizer($me, $conversation->id))->toBeTrue();
    expect($conversationAuthorizer($outsider, $conversation->id))->toBeFalse();
    expect($userAuthorizer($me, $me->id))->toBeTrue();
    expect($userAuthorizer($outsider, $me->id))->toBeFalse();
});
