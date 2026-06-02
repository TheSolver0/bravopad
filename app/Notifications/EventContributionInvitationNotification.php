<?php

namespace App\Notifications;

use App\Models\AppSetting;
use App\Models\EventContribution;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EventContributionInvitationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly EventContribution $contribution,
        private readonly User $inviter,
        private readonly bool $isPublicAnnouncement = false,
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
        $subjectPrefix = $this->isPublicAnnouncement ? 'Nouvelle cotisation publique' : 'Invitation cotisation';
        $line = $this->isPublicAnnouncement
            ? "{$this->inviter->name} a lance une cotisation publique : {$this->contribution->title}."
            : "{$this->inviter->name} vous invite a participer a la cotisation : {$this->contribution->title}.";

        return (new MailMessage)
            ->subject("{$subjectPrefix} : {$this->contribution->title}")
            ->greeting("Bonjour {$notifiable->name},")
            ->line($line)
            ->action('Voir la cotisation', url('/event-contributions'))
            ->line('Merci pour votre participation.');
    }

    public function toArray(object $notifiable): array
    {
        $title = $this->isPublicAnnouncement ? 'Nouvelle cotisation publique' : 'Invitation a une cotisation';
        $body = $this->isPublicAnnouncement
            ? "{$this->inviter->name} a ouvert {$this->contribution->title} a tout le monde."
            : "{$this->inviter->name} vous a invite a participer a {$this->contribution->title}.";

        return [
            'type' => 'event_contribution_invitation',
            'title' => $title,
            'body' => $body,
            'contribution_id' => $this->contribution->id,
            'contribution_title' => $this->contribution->title,
            'inviter_id' => $this->inviter->id,
            'inviter_name' => $this->inviter->name,
            'is_public' => $this->isPublicAnnouncement,
        ];
    }
}
