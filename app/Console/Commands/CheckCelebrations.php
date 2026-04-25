<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\CelebrationNotification;
use Illuminate\Console\Command;

class CheckCelebrations extends Command
{
    protected $signature   = 'celebrations:check';
    protected $description = 'Envoie des notifications pour les anniversaires de naissance et professionnels du jour';

    private array $anniversaryYears = [1, 5, 10, 20];

    public function handle(): void
    {
        $today    = now();
        $month    = $today->month;
        $day      = $today->day;
        $year     = $today->year;

        $users = User::whereNotNull('birth_date')
            ->orWhereNotNull('hire_date')
            ->get();

        // Notify all users as audience for team celebrations
        $allUsers = User::all();

        foreach ($users as $user) {
            // Birthday
            if ($user->birth_date
                && $user->birth_date->month === $month
                && $user->birth_date->day === $day
            ) {
                foreach ($allUsers as $recipient) {
                    $recipient->notify(new CelebrationNotification('birthday', $user->name));
                }
                $this->info("Birthday notification sent for: {$user->name}");
            }

            // Professional anniversary
            if ($user->hire_date
                && $user->hire_date->month === $month
                && $user->hire_date->day === $day
            ) {
                $years = $year - $user->hire_date->year;
                if ($years > 0 && in_array($years, $this->anniversaryYears)) {
                    foreach ($allUsers as $recipient) {
                        $recipient->notify(new CelebrationNotification(
                            "anniversary_{$years}",
                            $user->name,
                            $years
                        ));
                    }
                    $this->info("Anniversary ({$years}y) notification sent for: {$user->name}");
                }
            }
        }

        $this->info('Celebrations check complete.');
    }
}
