<?php

namespace App\Events;

use App\Models\MessengerCall;
use App\Models\MessengerCallParticipant;
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
        $channels = [
            new PrivateChannel('messenger.call.'.$this->call->id),
            new PrivateChannel('messenger.user.'.$this->call->started_by),
        ];

        if ($this->call->callee_id !== null) {
            $channels[] = new PrivateChannel('messenger.user.'.$this->call->callee_id);

            return $channels;
        }

        $this->call->loadMissing('participants');

        foreach ($this->call->participants as $participant) {
            $channels[] = new PrivateChannel('messenger.user.'.$participant->user_id);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'messenger.call.updated';
    }

    public function broadcastWith(): array
    {
        $this->call->loadMissing([
            'conversation.participants:id,name,email,avatar,role,last_seen_at',
            'starter:id,name,email,avatar,role,last_seen_at',
            'callee:id,name,email,avatar,role,last_seen_at',
            'participants.user:id,name,email,avatar,role,last_seen_at',
        ]);

        return [
            'call' => [
                'id' => $this->call->id,
                'conversation_id' => $this->call->conversation_id,
                'started_by' => $this->call->started_by,
                'callee_id' => $this->call->callee_id,
                'type' => $this->call->type,
                'status' => $this->call->status,
                'room_key' => $this->call->room_key,
                'joined_count' => $this->call->isGroupCall() ? $this->call->participants->where('status', 'joined')->count() : null,
                'max_participants' => $this->call->isGroupCall() ? $this->call->participantLimit() : null,
                'accepted_at' => $this->call->accepted_at?->toIso8601String(),
                'ended_at' => $this->call->ended_at?->toIso8601String(),
                'created_at' => $this->call->created_at?->toIso8601String(),
                'starter' => $this->userPayload($this->call->starter),
                'callee' => $this->call->callee ? $this->userPayload($this->call->callee) : null,
                'participants' => $this->call->isGroupCall()
                    ? $this->call->participants
                        ->mapWithKeys(fn (MessengerCallParticipant $participant) => [
                            (string) $participant->user_id => [
                                'user_id' => $participant->user_id,
                                'status' => $participant->status,
                                'joined_at' => $participant->joined_at?->toIso8601String(),
                                'left_at' => $participant->left_at?->toIso8601String(),
                                'user' => $participant->user ? $this->userPayload($participant->user) : null,
                            ],
                        ])
                    : [],
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
            'last_seen_at' => $user->last_seen_at?->toIso8601String(),
        ];
    }
}
