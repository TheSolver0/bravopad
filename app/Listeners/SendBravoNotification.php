<?php

namespace App\Listeners;

use App\Events\BravoSent;
use App\Models\User;
use App\Notifications\BravoReceived;

class SendBravoNotification
{
    public function handle(BravoSent $event): void
    {
        $receiver = User::find($event->bravo->receiver_id);

        $receiver?->notify(new BravoReceived($event->bravo));
    }
}
