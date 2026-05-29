<?php

namespace App\Notifications;

use App\Models\AppSetting;
use App\Models\EventContribution;
use App\Models\EventContributionPayment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EventContributionThankYouNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly EventContribution $contribution,
        private readonly EventContributionPayment $payment,
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
        return (new MailMessage)
            ->subject("Merci pour votre contribution : {$this->contribution->title}")
            ->greeting("Bonjour {$notifiable->name},")
            ->line("Merci pour votre participation a {$this->contribution->title}.")
            ->line('Montant enregistre : '.number_format((float) $this->payment->amount, 0, ',', ' ').' FCFA')
            ->action('Voir la cotisation', url('/event-contributions'));
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'event_contribution_thank_you',
            'title' => 'Merci pour votre participation',
            'body' => "Votre contribution a {$this->contribution->title} a bien ete enregistree.",
            'contribution_id' => $this->contribution->id,
            'contribution_title' => $this->contribution->title,
            'payment_id' => $this->payment->id,
            'amount' => (float) $this->payment->amount,
        ];
    }
}
