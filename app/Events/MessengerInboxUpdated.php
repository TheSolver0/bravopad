<?php

namespace App\Events;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;

class MessengerInboxUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public User $user,
        public Conversation $conversation,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('messenger.user.'.$this->user->id);
    }

    public function broadcastAs(): string
    {
        return 'messenger.inbox.updated';
    }

    public function broadcastWith(): array
    {
        $this->conversation->loadMissing(['participants:id,name,email,avatar,role,last_seen_at', 'lastMessage.sender:id,name,email,avatar,role,last_seen_at']);
        $other = $this->conversation->participants->firstWhere('id', '!=', $this->user->id);

        return [
            'conversation_id' => $this->conversation->id,
            'unread_total' => $this->user->fresh()?->conversations()
                ->with(['participants:id,name,avatar,last_seen_at', 'messages'])
                ->get()
                ->sum(fn (Conversation $conversation) => $conversation->unreadCountFor($this->user)) ?? 0,
            'conversation' => [
                'id' => $this->conversation->id,
                'type' => $this->conversation->type,
                'other_user' => $other ? $this->userPayload($other) : null,
                'participants' => $this->conversation->participants
                    ->map(fn (User $participant) => $this->userPayload($participant))
                    ->values(),
                'last_message' => $this->conversation->lastMessage ? $this->messagePayload($this->conversation->lastMessage) : null,
                'unread_count' => $this->conversation->unreadCountFor($this->user),
                'last_message_at' => $this->conversation->last_message_at?->toIso8601String(),
                'read_at_by_user' => $this->conversation->participants
                    ->mapWithKeys(fn (User $participant) => [
                        (string) $participant->id => $participant->pivot->last_read_at
                            ? Carbon::parse($participant->pivot->last_read_at)->toIso8601String()
                            : null,
                    ]),
            ],
        ];
    }

    private function messagePayload($message): array
    {
        return [
            'id' => $message->id,
            'conversation_id' => $message->conversation_id,
            'sender_id' => $message->sender_id,
            'body' => $message->deleted_at ? '' : $message->body,
            'created_at' => $message->created_at?->toIso8601String(),
            'edited_at' => $message->edited_at?->toIso8601String(),
            'deleted_at' => $message->deleted_at?->toIso8601String(),
            'is_edited' => filled($message->edited_at),
            'is_deleted' => filled($message->deleted_at),
            'sender' => $this->userPayload($message->sender),
        ];
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'avatar' => $user->avatar,
            'role' => $user->role,
            'last_seen_at' => $user->last_seen_at?->toIso8601String(),
        ];
    }
}
