<?php

namespace App\Events;

use App\Models\MessengerCall;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessengerCallUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public MessengerCall $call,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('messenger.call.'.$this->call->id),
            new PrivateChannel('messenger.user.'.$this->call->started_by),
            new PrivateChannel('messenger.user.'.$this->call->callee_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'messenger.call.updated';
    }

    public function broadcastWith(): array
    {
        $this->call->loadMissing([
            'conversation.participants:id,name,email,avatar,role',
            'starter:id,name,email,avatar,role',
            'callee:id,name,email,avatar,role',
        ]);

        return [
            'call' => [
                'id' => $this->call->id,
                'conversation_id' => $this->call->conversation_id,
                'started_by' => $this->call->started_by,
                'callee_id' => $this->call->callee_id,
                'type' => $this->call->type,
                'status' => $this->call->status,
                'accepted_at' => $this->call->accepted_at?->toIso8601String(),
                'ended_at' => $this->call->ended_at?->toIso8601String(),
                'created_at' => $this->call->created_at?->toIso8601String(),
                'starter' => $this->userPayload($this->call->starter),
                'callee' => $this->userPayload($this->call->callee),
            ],
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
        ];
    }
}
