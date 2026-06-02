<?php

namespace App\Notifications;

use App\Models\AgendaEvent;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EventInvitationNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly AgendaEvent $event) {}

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
        $organizer = $this->event->organizer;
        $start     = $this->event->start_at->format('d/m/Y à H:i');

        return (new MailMessage)
            ->subject("Invitation : {$this->event->title}")
            ->greeting("Bonjour {$notifiable->name},")
            ->line("{$organizer?->name} vous invite à l'événement : **{$this->event->title}**")
            ->line("Date : $start")
            ->when($this->event->location, fn ($m) => $m->line("Lieu : {$this->event->location}"))
            ->action('Voir l\'agenda', url('/agenda'))
            ->line('Merci de confirmer votre présence.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'           => 'event_invitation',
            'event_id'       => $this->event->id,
            'event_title'    => $this->event->title,
            'start_at'       => $this->event->start_at?->toIso8601String(),
            'organizer_id'   => $this->event->organizer_id,
            'organizer_name' => $this->event->organizer?->name,
            'location'       => $this->event->location,
        ];
    }
}
