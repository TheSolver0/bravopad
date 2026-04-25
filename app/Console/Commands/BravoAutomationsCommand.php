<?php

namespace App\Console\Commands;

use App\Events\BravoSent;
use App\Models\AppSetting;
use App\Models\Bravo;
use App\Models\BravoValue;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class BravoAutomationsCommand extends Command
{
    protected $signature = 'bravo:automations {--dry-run : Afficher sans créer}';

    protected $description = 'Bravos automatiques : anniversaires de naissance et d\'ancienneté (PAD).';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');

        $bot = User::query()->where('is_automation', true)->first();
        if (! $bot) {
            $this->error('Aucun utilisateur système (is_automation). Lancez les seeders.');

            return self::FAILURE;
        }

        $valueId = BravoValue::query()->where('is_active', true)->orderBy('id')->value('id');
        if (! $valueId) {
            $this->error('Aucune valeur Bravo active.');

            return self::FAILURE;
        }

        $birthPoints = (int) AppSetting::get('automation_birth_points', 50);
        $hirePoints  = (int) AppSetting::get('automation_hire_points', 75);

        $today = today();

        $users = User::query()
            ->where('is_automation', false)
            ->where(function ($q): void {
                $q->whereNotNull('birth_date')->orWhereNotNull('hired_at');
            })
            ->get();

        $created = 0;

        foreach ($users as $user) {
            if ($user->is_automation) {
                continue;
            }

            if ($user->birth_date) {
                $d = Carbon::parse($user->birth_date);
                if ((int) $d->month === (int) $today->month && (int) $d->day === (int) $today->day) {
                    $msg = '[Automatisation] Joyeux anniversaire de la part de PAD — merci pour votre engagement.';
                    if ($this->createIfNeeded($dry, $bot, $user, $valueId, $birthPoints, $msg, 'automation_birthday')) {
                        $created++;
                    }
                }
            }

            if ($user->hired_at) {
                $h = Carbon::parse($user->hired_at);
                if ((int) $h->month === (int) $today->month && (int) $h->day === (int) $today->day) {
                    $years = $h->diffInYears($today);
                    if ($years < 1) {
                        continue;
                    }
                    $msg = "[Automatisation] Bon anniversaire d'ancienneté ({$years} an(s)) — PAD vous remercie.";
                    if ($this->createIfNeeded($dry, $bot, $user, $valueId, $hirePoints, $msg, 'automation_tenure')) {
                        $created++;
                    }
                }
            }
        }

        $this->info($dry ? "Dry-run : {$created} Bravo(s) seraient créés." : "{$created} Bravo(s) créés.");

        return self::SUCCESS;
    }

    private function createIfNeeded(
        bool $dry,
        User $bot,
        User $receiver,
        int $valueId,
        int $points,
        string $message,
        string $auditKind,
    ): bool {
        $exists = Bravo::query()
            ->where('sender_id', $bot->id)
            ->where('receiver_id', $receiver->id)
            ->whereDate('created_at', today())
            ->where('message', 'like', '[Automatisation]%')
            ->exists();

        if ($exists) {
            return false;
        }

        if ($dry) {
            $this->line("→ {$auditKind} pour {$receiver->name} ({$points} pts)");

            return true;
        }

        DB::transaction(function () use ($bot, $receiver, $valueId, $points, $message, $auditKind): void {
            $bravo = Bravo::create([
                'sender_id'    => $bot->id,
                'receiver_id'  => $receiver->id,
                'value_id'     => $valueId,
                'challenge_id' => null,
                'message'      => $message,
                'points'       => $points,
            ]);

            $bravo->values()->sync([$valueId]);

            User::whereKey($receiver->id)->increment('points_total', $points);

            event(new BravoSent($bravo->load(['sender', 'receiver', 'values'])));

            AuditLogger::log(
                $auditKind,
                ['receiver_id' => $receiver->id, 'points' => $points],
                $bot,
                Bravo::class,
                $bravo->id,
                'info',
                'Bravo automatique RH.',
            );
        });

        return true;
    }
}
