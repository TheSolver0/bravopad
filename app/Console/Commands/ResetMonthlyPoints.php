<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class ResetMonthlyPoints extends Command
{
    protected $signature = 'points:reset-monthly';
    protected $description = 'Remet à zéro les points mensuels à distribuer pour tous les employés';

    public function handle(): void
    {
        $count = User::query()->update(['monthly_points_given' => 0]);
        $this->info("Points mensuels réinitialisés pour {$count} utilisateurs.");
    }
}
