<?php

namespace App\Listeners;

use App\Events\BravoSent;
use App\Services\Risk\BravoAnomalyDetector;

class DetectBravoAnomalies
{
    public function __construct(private readonly BravoAnomalyDetector $detector) {}

    public function handle(BravoSent $event): void
    {
        $sender = $event->bravo->sender ?? $event->bravo->sender()->first();
        if ($sender) {
            $this->detector->evaluateAfterSend($sender);
        }
    }
}
