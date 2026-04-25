<?php

namespace App\Http\Controllers;

use App\Models\Badge;
use App\Models\Bravo;
use App\Models\HrSurvey;
use App\Models\HrSurveyResponse;
use App\Models\PeerVote;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Engagement\BadgeProgressService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class EngagementController extends Controller
{
    public function index(Request $request, BadgeProgressService $badges): Response
    {
        $period = now()->format('Y-m');
        $user = $request->user();

        // Recalcule periodique pour garder les badges frais sans cout excessif.
        if (Cache::add('badges:sync:' . now()->format('YmdH'), true, 3600)) {
            $batch = User::query()->where('is_automation', false)->get(['id', 'hired_at', 'points_total']);
            $badges->syncForUsers($batch);
        } else {
            $badges->syncForUser($user);
        }

        $myVote = PeerVote::query()
            ->where('voter_id', $user->id)
            ->where('period', $period)
            ->first();

        $ranking = $this->employeeOfMonthRanking($period);

        $activeSurvey = HrSurvey::query()
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            })
            ->latest()
            ->first();

        $surveyStats = null;
        $mySurveyResponse = null;
        if ($activeSurvey) {
            $surveyStats = HrSurveyResponse::query()
                ->select('option_key', DB::raw('COUNT(*) as total'))
                ->where('survey_id', $activeSurvey->id)
                ->groupBy('option_key')
                ->pluck('total', 'option_key')
                ->all();

            $mySurveyResponse = HrSurveyResponse::query()
                ->where('survey_id', $activeSurvey->id)
                ->where('user_id', $user->id)
                ->value('option_key');
        }

        $myBadges = $user->badges()
            ->orderByDesc('visibility_score')
            ->get(['badges.id', 'badges.name', 'badges.rarity', 'badges.level', 'badges.description'])
            ->map(fn ($b) => [
                'id' => $b->id,
                'name' => $b->name,
                'rarity' => $b->rarity,
                'level' => $b->level,
                'description' => $b->description,
                'progress' => (int) $b->pivot->progress,
                'awarded_at' => $b->pivot->awarded_at,
            ])
            ->values();

        $badgeLeaderboard = User::query()
            ->where('is_automation', false)
            ->with(['badges' => fn ($q) => $q->orderByDesc('visibility_score')])
            ->orderByDesc('points_total')
            ->limit(10)
            ->get()
            ->map(function (User $u) {
                $earned = $u->badges->filter(fn ($b) => $b->pivot->awarded_at !== null);
                $visibility = $earned->sum('visibility_score');
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'department' => $u->department,
                    'avatar' => $u->avatar,
                    'points_total' => (int) $u->points_total,
                    'badge_count' => $earned->count(),
                    'visibility_score' => $visibility,
                    'status' => $this->statusFromVisibility($visibility),
                ];
            });

        return Inertia::render('Engagement', [
            'period' => $period,
            'can_manage' => $request->user()->isHr(),
            'vote_candidates' => User::query()
                ->where('is_automation', false)
                ->where('id', '!=', $request->user()->id)
                ->orderBy('name')
                ->limit(200)
                ->get(['id', 'name', 'department']),
            'my_vote' => $myVote ? [
                'nominee_id' => $myVote->nominee_id,
                'is_anonymous' => $myVote->is_anonymous,
                'comment' => $myVote->comment,
            ] : null,
            'employee_of_month_ranking' => $ranking,
            'my_badges' => $myBadges,
            'badge_leaderboard' => $badgeLeaderboard,
            'badges_catalog' => Badge::query()
                ->where('is_active', true)
                ->orderByDesc('visibility_score')
                ->get(['id', 'name', 'rarity', 'level', 'description', 'type', 'criteria']),
            'active_survey' => $activeSurvey ? [
                'id' => $activeSurvey->id,
                'title' => $activeSurvey->title,
                'question' => $activeSurvey->question,
                'options' => $activeSurvey->options,
                'starts_at' => $activeSurvey->starts_at?->toIso8601String(),
                'ends_at' => $activeSurvey->ends_at?->toIso8601String(),
            ] : null,
            'survey_stats' => $surveyStats,
            'my_survey_response' => $mySurveyResponse,
        ]);
    }

    public function vote(Request $request): \Illuminate\Http\RedirectResponse
    {
        $validated = $request->validate([
            'nominee_id' => ['required', 'integer', 'exists:users,id'],
            'is_anonymous' => ['nullable', 'boolean'],
            'comment' => ['nullable', 'string', 'max:300'],
        ]);

        if ((int) $validated['nominee_id'] === (int) $request->user()->id) {
            return back()->with('error', 'Auto-nomination interdite.');
        }

        $period = now()->format('Y-m');
        PeerVote::query()->updateOrCreate(
            ['voter_id' => $request->user()->id, 'period' => $period],
            [
                'nominee_id' => $validated['nominee_id'],
                'is_anonymous' => (bool) ($validated['is_anonymous'] ?? true),
                'comment' => $validated['comment'] ?? null,
                'weight' => $this->voterWeight($request->user()),
            ]
        );

        AuditLogger::log(
            'employee_of_month_voted',
            ['period' => $period, 'nominee_id' => (int) $validated['nominee_id']],
            $request->user(),
            null,
            null,
            'info'
        );

        return back()->with('success', 'Vote enregistre.');
    }

    public function createSurvey(Request $request): \Illuminate\Http\RedirectResponse
    {
        if (! $request->user()->isHr()) {
            abort(403);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'question' => ['required', 'string', 'max:300'],
            'options' => ['required', 'array', 'min:2', 'max:6'],
            'options.*.key' => ['required', 'string', 'max:40'],
            'options.*.label' => ['required', 'string', 'max:120'],
            'ends_at' => ['nullable', 'date'],
        ]);

        HrSurvey::query()->where('is_active', true)->update(['is_active' => false]);

        $survey = HrSurvey::query()->create([
            'title' => $validated['title'],
            'question' => $validated['question'],
            'options' => $validated['options'],
            'is_active' => true,
            'created_by' => $request->user()->id,
            'starts_at' => now(),
            'ends_at' => $validated['ends_at'] ?? null,
        ]);

        AuditLogger::log(
            'hr_survey_created',
            [
                'title' => $validated['title'],
                'options_count' => count($validated['options']),
                'ends_at' => $validated['ends_at'] ?? null,
            ],
            $request->user(),
            HrSurvey::class,
            $survey?->id,
            'info',
            'Creation d un sondage RH.',
        );

        return back()->with('success', 'Sondage RH cree.');
    }

    public function respondSurvey(Request $request, HrSurvey $survey): \Illuminate\Http\RedirectResponse
    {
        $validated = $request->validate([
            'option_key' => ['required', 'string', 'max:40'],
        ]);

        $allowed = collect($survey->options)->pluck('key');
        if (! $allowed->contains($validated['option_key'])) {
            return back()->with('error', 'Option de vote invalide.');
        }

        HrSurveyResponse::query()->updateOrCreate(
            ['survey_id' => $survey->id, 'user_id' => $request->user()->id],
            ['option_key' => $validated['option_key']]
        );

        AuditLogger::log(
            'hr_survey_answered',
            ['survey_id' => $survey->id, 'option_key' => $validated['option_key']],
            $request->user(),
            HrSurvey::class,
            $survey->id,
            'info',
            'Reponse a un sondage RH.',
        );

        return back()->with('success', 'Merci pour votre retour.');
    }

    private function voterWeight(User $user): float
    {
        $distinctReceivers = Bravo::query()
            ->where('sender_id', $user->id)
            ->where('created_at', '>=', now()->subDays(90))
            ->distinct('receiver_id')
            ->count('receiver_id');

        return round(1 + min(1.5, log(1 + max(1, $distinctReceivers), 2) / 2), 2);
    }

    private function employeeOfMonthRanking(string $period): array
    {
        $start = Carbon::parse($period . '-01')->startOfMonth();
        $end = $start->copy()->endOfMonth();

        $voteRows = PeerVote::query()
            ->where('period', $period)
            ->select('nominee_id', DB::raw('COUNT(*) as votes_count'), DB::raw('SUM(weight) as weighted_votes'))
            ->groupBy('nominee_id')
            ->get()
            ->keyBy('nominee_id');

        $bravoRows = Bravo::query()
            ->whereBetween('created_at', [$start, $end])
            ->select('receiver_id', DB::raw('SUM(points) as points_sum'))
            ->groupBy('receiver_id')
            ->get()
            ->keyBy('receiver_id');

        $maxPoints = max(1, (int) $bravoRows->max('points_sum'));
        $nomineeIds = collect($voteRows->keys())->merge($bravoRows->keys())->unique()->values();
        if ($nomineeIds->isEmpty()) {
            return [];
        }

        $users = User::query()
            ->whereIn('id', $nomineeIds)
            ->get(['id', 'name', 'department', 'avatar']);

        return $users
            ->map(function (User $u) use ($voteRows, $bravoRows, $maxPoints) {
                $votes = (int) ($voteRows[$u->id]->votes_count ?? 0);
                $weightedVotes = (float) ($voteRows[$u->id]->weighted_votes ?? 0);
                $bravoPoints = (int) ($bravoRows[$u->id]->points_sum ?? 0);
                $merit = round(($weightedVotes * 0.65) + (($bravoPoints / $maxPoints) * 10 * 0.35), 2);

                return [
                    'user' => [
                        'id' => $u->id,
                        'name' => $u->name,
                        'department' => $u->department,
                        'avatar' => $u->avatar,
                    ],
                    'votes_count' => $votes,
                    'weighted_votes' => $weightedVotes,
                    'bravo_points' => $bravoPoints,
                    'merit_score' => $merit,
                ];
            })
            ->sortByDesc('merit_score')
            ->take(10)
            ->values()
            ->all();
    }

    private function statusFromVisibility(int $score): string
    {
        return match (true) {
            $score >= 180 => 'Ambassadeur Legend',
            $score >= 120 => 'Leader Reconnaissance',
            $score >= 80 => 'Influenceur Positif',
            $score >= 40 => 'Contributeur Regulier',
            default => 'Nouveau Talent',
        };
    }
}
