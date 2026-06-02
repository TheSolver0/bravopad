<?php

namespace App\Services\Survey;

use App\Events\BravoSent;
use App\Models\Bravo;
use App\Models\BravoValue;
use App\Models\HrSurvey;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;

class SurveyParticipationBravoService
{
    public function award(HrSurvey $survey, User $participant): ?Bravo
    {
        $points = (int) ($survey->auto_bravo_points ?? 0);
        if ($points <= 0 || $participant->is_automation) {
            return null;
        }

        $bot = User::query()->where('is_automation', true)->first();
        if (! $bot) {
            return null;
        }

        $marker = "[Automatisation] Participation au sondage #{$survey->id}";

        $alreadyAwarded = Bravo::query()
            ->where('sender_id', $bot->id)
            ->where('receiver_id', $participant->id)
            ->where('message', 'like', $marker.'%')
            ->exists();

        if ($alreadyAwarded) {
            return null;
        }

        return DB::transaction(function () use ($survey, $participant, $bot, $points, $marker): Bravo {
            $valueId = BravoValue::query()
                ->where('is_active', true)
                ->orderBy('id')
                ->value('id');

            $bravo = Bravo::create([
                'sender_id' => $bot->id,
                'receiver_id' => $participant->id,
                'value_id' => $valueId,
                'challenge_id' => null,
                'message' => "{$marker} - {$survey->title}",
                'points' => $points,
            ]);

            if ($valueId) {
                $bravo->values()->sync([$valueId]);
            }

            User::whereKey($participant->id)->increment('points_total', $points);

            event(new BravoSent($bravo->load(['sender', 'receiver', 'values'])));

            AuditLogger::log(
                'hr_survey_auto_bravo_awarded',
                ['survey_id' => $survey->id, 'receiver_id' => $participant->id, 'points' => $points],
                $bot,
                Bravo::class,
                $bravo->id,
                'info',
                'Bravo automatique pour participation a un sondage RH.',
            );

            return $bravo;
        });
    }
}
