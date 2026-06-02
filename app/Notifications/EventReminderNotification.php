<?php

namespace App\Notifications;

use App\Models\AgendaEvent;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EventReminderNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly AgendaEvent $event,
        private readonly int $minutesBefore
    ) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];
        if (\App\Models\AppSetting::get('notify_event_by_email', false)) {
            $channels[] = 'mail';
        }
        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $start = $this->event->start_at->format('d/m/Y à H:i');
        $delay = $this->minutesBefore >= 60
            ? ($this->minutesBefore / 60).'h'
            : $this->minutesBefore.' min';

        return (new MailMessage)
            ->subject("Rappel : {$this->event->title} dans $delay")
            ->greeting("Bonjour {$notifiable->name},")
            ->line("Rappel : **{$this->event->title}** commence dans $delay.")
            ->line("Date : $start")
            ->when($this->event->location, fn ($m) => $m->line("Lieu : {$this->event->location}"))
            ->when($this->event->meeting_url, fn ($m) => $m->action('Rejoindre la réunion', $this->event->meeting_url))
            ->line('Bonne réunion !');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'          => 'event_reminder',
            'event_id'      => $this->event->id,
            'event_title'   => $this->event->title,
            'start_at'      => $this->event->start_at?->toIso8601String(),
            'minutes_before'=> $this->minutesBefore,
            'meeting_url'   => $this->event->meeting_url,
        ];
    }
}
