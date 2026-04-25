<?php

namespace App\Notifications;

use App\Models\Bravo;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class BravoReceived extends Notification
{
    use Queueable;

    public function __construct(private readonly Bravo $bravo) {}

    /**
     * Canaux de diffusion : in-app (database) + email optionnel.
     */
    public function via(object $notifiable): array
    {
        $channels = ['database'];

        // L'email est activé seulement si le paramètre est vrai
        if (\App\Models\AppSetting::get('notify_bravo_by_email', false)) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $sender      = $this->bravo->sender;
        $points      = $this->bravo->points;
        $valueNames  = $this->bravo->values->pluck('name')->join(', ');

        return (new MailMessage)
            ->subject("🎉 {$sender->name} vous a envoyé un Bravo !")
            ->greeting("Bonjour {$notifiable->name},")
            ->line("{$sender->name} vous a félicité pour : **{$valueNames}** (+{$points} points).")
            ->when($this->bravo->message, fn ($mail) =>
                $mail->line("Message : *{$this->bravo->message}*")
            )
            ->action('Voir mon Bravo', url('/history'))
            ->line('Continuez votre excellent travail !');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'        => 'bravo_received',
            'bravo_id'    => $this->bravo->id,
            'sender_id'   => $this->bravo->sender_id,
            'sender_name' => $this->bravo->sender?->name,
            'points'      => $this->bravo->points,
            'values'      => $this->bravo->values->pluck('name'),
            'message'     => $this->bravo->message,
        ];
    }
}
