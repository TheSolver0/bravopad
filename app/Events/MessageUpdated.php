<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Message $message,
        public string $action,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('messenger.conversation.'.$this->message->conversation_id);
    }

    public function broadcastAs(): string
    {
        return 'message.updated';
    }

    public function broadcastWith(): array
    {
        $this->message->loadMissing('sender:id,name,email,avatar,role');

        return [
            'action' => $this->action,
            'message' => [
                'id' => $this->message->id,
                'conversation_id' => $this->message->conversation_id,
                'sender_id' => $this->message->sender_id,
                'body' => $this->message->deleted_at ? '' : $this->message->body,
                'created_at' => $this->message->created_at?->toIso8601String(),
                'edited_at' => $this->message->edited_at?->toIso8601String(),
                'deleted_at' => $this->message->deleted_at?->toIso8601String(),
                'is_edited' => filled($this->message->edited_at),
                'is_deleted' => filled($this->message->deleted_at),
                'sender' => [
                    'id' => $this->message->sender->id,
                    'name' => $this->message->sender->name,
                    'email' => $this->message->sender->email,
                    'avatar' => $this->message->sender->avatar,
                    'role' => $this->message->sender->role,
                ],
            ],
        ];
    }
}
