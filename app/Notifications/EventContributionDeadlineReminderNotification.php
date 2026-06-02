<?php

namespace App\Notifications;

use App\Models\AppSetting;
use App\Models\EventContribution;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EventContributionDeadlineReminderNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly EventContribution $contribution,
        private readonly int $daysLeft,
    ) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];
        if (AppSetting::get('notify_event_contribution_by_email', true)) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $delayLabel = $this->daysLeft === 0 ? "aujourd'hui" : "dans {$this->daysLeft} jour(s)";

        return (new MailMessage)
            ->subject("Rappel cotisation : {$this->contribution->title}")
            ->greeting("Bonjour {$notifiable->name},")
            ->line("La cotisation {$this->contribution->title} se termine {$delayLabel}.")
            ->action('Voir la cotisation', url('/event-contributions'));
    }

    public function toArray(object $notifiable): array
    {
        $delayLabel = $this->daysLeft === 0 ? "aujourd'hui" : "dans {$this->daysLeft} jour(s)";

        return [
            'type' => 'event_contribution_deadline_reminder',
            'title' => 'Rappel avant date limite',
            'body' => "La cotisation {$this->contribution->title} se termine {$delayLabel}.",
            'contribution_id' => $this->contribution->id,
            'contribution_title' => $this->contribution->title,
            'days_left' => $this->daysLeft,
            'deadline_at' => $this->contribution->deadline_at?->toDateString(),
        ];
    }
}
