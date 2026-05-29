<?php

namespace App\Notifications;

use App\Models\AppSetting;
use App\Models\EventContribution;
use App\Models\EventContributionPayment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EventContributionNewPaymentNotification extends Notification implements ShouldQueue
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
        $contributorName = $this->payment->contributor?->name
            ?? $this->payment->contributor_name
            ?? 'Un participant';

        return (new MailMessage)
            ->subject("Nouvelle contribution : {$this->contribution->title}")
            ->greeting("Bonjour {$notifiable->name},")
            ->line("{$contributorName} a contribue a {$this->contribution->title}.")
            ->line('Montant : '.number_format((float) $this->payment->amount, 0, ',', ' ').' FCFA')
            ->action('Voir la cotisation', url('/event-contributions'));
    }

    public function toArray(object $notifiable): array
    {
        $contributorName = $this->payment->contributor?->name
            ?? $this->payment->contributor_name
            ?? 'Un participant';

        return [
            'type' => 'event_contribution_new_payment',
            'title' => 'Nouvelle contribution',
            'body' => "{$contributorName} a contribue a {$this->contribution->title}.",
            'contribution_id' => $this->contribution->id,
            'contribution_title' => $this->contribution->title,
            'payment_id' => $this->payment->id,
            'amount' => (float) $this->payment->amount,
            'payment_method' => $this->payment->payment_method,
        ];
    }
}
