<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class BravoAnomalyAlert extends Notification
{
    use Queueable;

    public function __construct(
        public readonly User $sender,
        public readonly int $count,
        public readonly int $windowMinutes,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'             => 'bravo_anomaly_spike',
            'sender_id'        => $this->sender->id,
            'sender_name'      => $this->sender->name,
            'count'            => $this->count,
            'window_minutes'   => $this->windowMinutes,
            'title'            => 'Alerte activité Bravo',
            'body'             => "{$this->sender->name} a envoyé {$this->count} Bravos en {$this->windowMinutes} minutes.",
        ];
    }
}
