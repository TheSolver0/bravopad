<?php

namespace App\Notifications;

use App\Models\Redemption;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class RewardRedemptionOutcome extends Notification
{
    use Queueable;

    public function __construct(
        public readonly Redemption $redemption,
        public readonly string $status,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $reward = $this->redemption->reward;
        $name   = $reward?->name ?? 'Récompense';
        $label  = match ($this->status) {
            'approved'  => 'approuvée',
            'rejected'  => 'refusée',
            'delivered' => 'livrée',
            default     => $this->status,
        };

        return [
            'type'          => 'reward_redemption_outcome',
            'redemption_id' => $this->redemption->id,
            'status'        => $this->status,
            'reward_name'   => $name,
            'title'         => 'Mise à jour de votre échange',
            'body'          => "Votre demande pour « {$name} » a été {$label}.",
        ];
    }
}
