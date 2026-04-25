<?php

namespace App\Notifications;

use App\Models\Redemption;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class RewardRedemptionSubmitted extends Notification
{
    use Queueable;

    public function __construct(public readonly Redemption $redemption) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $reward = $this->redemption->reward;
        $name  = $reward?->name ?? 'Récompense';

        return [
            'type'          => 'reward_redemption_submitted',
            'redemption_id' => $this->redemption->id,
            'reward_name'   => $name,
            'points_spent'  => $this->redemption->points_spent,
            'title'         => 'Demande d’échange enregistrée',
            'body'          => "Votre demande pour « {$name} » ({$this->redemption->points_spent} pts) est en traitement.",
        ];
    }
}
