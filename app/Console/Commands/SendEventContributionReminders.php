<?php

namespace App\Console\Commands;

use App\Models\EventContribution;
use App\Models\User;
use App\Notifications\EventContributionDeadlineReminderNotification;
use App\Services\Audit\AuditLogger;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SendEventContributionReminders extends Command
{
    protected $signature = 'event-contributions:send-reminders {--dry-run : Afficher sans notifier}';

    protected $description = 'Envoie les rappels de date limite (J-3, J-1, J0) pour les cotisations.';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $contributions = EventContribution::query()
            ->with(['creator:id,name,email', 'invites:user_id,status', 'payments:contributor_user_id,event_contribution_id'])
            ->whereNotNull('deadline_at')
            ->whereDate('deadline_at', '>=', today())
            ->get();

        $sentCount = 0;

        foreach ($contributions as $contribution) {
            $daysLeft = today()->diffInDays($contribution->deadline_at, false);
            if (! in_array($daysLeft, [3, 1, 0], true)) {
                continue;
            }

            $targetIds = collect([$contribution->creator_id])
                ->merge($contribution->invites->whereIn('status', ['pending', 'accepted'])->pluck('user_id'))
                ->merge($contribution->payments->pluck('contributor_user_id')->filter())
                ->unique()
                ->values();

            $users = User::query()->whereKey($targetIds->all())->get();

            foreach ($users as $user) {
                $alreadySent = DB::table('notifications')
                    ->where('notifiable_type', User::class)
                    ->where('notifiable_id', $user->id)
                    ->where('type', EventContributionDeadlineReminderNotification::class)
                    ->where('data->contribution_id', $contribution->id)
                    ->where('data->days_left', $daysLeft)
                    ->whereDate('created_at', today())
                    ->exists();

                if ($alreadySent) {
                    continue;
                }

                if ($dryRun) {
                    $this->line("Rappel {$contribution->id} a {$user->email} (J-{$daysLeft})");
                    $sentCount++;

                    continue;
                }

                $user->notify(new EventContributionDeadlineReminderNotification($contribution, $daysLeft));
                $sentCount++;
            }

            if (! $dryRun) {
                AuditLogger::log(
                    'event_contribution_deadline_reminder_sent',
                    [
                        'event_contribution_id' => $contribution->id,
                        'days_left' => $daysLeft,
                        'recipients_count' => $users->count(),
                    ],
                    null,
                    EventContribution::class,
                    $contribution->id,
                    'info',
                    "Rappels de date limite envoyes pour la cotisation {$contribution->title}.",
                );
            }
        }

        $this->info($dryRun ? "Dry-run: {$sentCount} rappel(s) seraient envoyes." : "{$sentCount} rappel(s) envoyes.");

        return self::SUCCESS;
    }
}
