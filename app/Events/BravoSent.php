<?php

namespace App\Events;

use App\Models\Bravo;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BravoSent
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly Bravo $bravo) {}
}
