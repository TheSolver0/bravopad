<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class BadgeEarnedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $badgeType,
        public string $badgeLabel,
        public string $badgeDescription
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'              => 'badge_earned',
            'badge_type'        => $this->badgeType,
            'badge_label'       => $this->badgeLabel,
            'badge_description' => $this->badgeDescription,
        ];
    }
}
