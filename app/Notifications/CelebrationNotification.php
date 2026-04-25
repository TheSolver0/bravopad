<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class CelebrationNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $celebrationType,  // birthday | anniversary_1 | anniversary_5 | anniversary_10 | anniversary_20
        public string $personName,
        public ?int   $years = null
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'             => 'celebration',
            'celebration_type' => $this->celebrationType,
            'person_name'      => $this->personName,
            'years'            => $this->years,
            'message'          => $this->buildMessage(),
        ];
    }

    private function buildMessage(): string
    {
        return match(true) {
            $this->celebrationType === 'birthday'
                => "Bon anniversaire {$this->personName} ! 🎂",
            str_starts_with($this->celebrationType, 'anniversary')
                => "Bravo {$this->personName} ! {$this->years} an" . ($this->years > 1 ? 's' : '') . " dans l'équipe 🎉",
            default => "Célébration pour {$this->personName} !",
        };
    }
}
