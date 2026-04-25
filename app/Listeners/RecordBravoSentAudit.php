<?php

namespace App\Listeners;

use App\Events\BravoSent;
use App\Models\Bravo;
use App\Services\Audit\AuditLogger;

class RecordBravoSentAudit
{
    public function handle(BravoSent $event): void
    {
        $bravo = $event->bravo;

        AuditLogger::log(
            'bravo_sent',
            [
                'receiver_id' => $bravo->receiver_id,
                'points'      => $bravo->points,
                'value_ids'   => $bravo->values->pluck('id')->all(),
            ],
            $bravo->sender,
            Bravo::class,
            $bravo->id,
            'info',
            'Bravo publié sur le feed interne.',
        );
    }
}
