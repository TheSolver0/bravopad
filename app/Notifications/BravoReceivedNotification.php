<?php

namespace App\Notifications;

use App\Models\Bravo;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class BravoReceivedNotification extends Notification
{
    use Queueable;

    public function __construct(public Bravo $bravo) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $sender = $this->bravo->sender;
        $badgeLabels = ['good_job' => 'Good Job', 'excellent' => 'Excellent', 'impressive' => 'Impressive'];

        return [
            'type'       => 'bravo_received',
            'bravo_id'   => $this->bravo->id,
            'sender_id'  => $sender?->id,
            'sender_name'=> $sender?->name,
            'badge'      => $this->bravo->badge,
            'badge_label'=> $badgeLabels[$this->bravo->badge] ?? $this->bravo->badge,
            'points'     => $this->bravo->points,
            'message'    => $this->bravo->message,
        ];
    }
}
