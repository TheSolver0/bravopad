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
use Illuminate\Http\RedirectResponse;
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

        // Tous les sondages actifs (dans leur fenêtre de dates)
        $activeSurveys = HrSurvey::query()
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            })
            ->orderByDesc('created_at')
            ->get();

        $surveyIds = $activeSurveys->pluck('id');

        $allStats = HrSurveyResponse::query()
            ->select('survey_id', 'option_key', DB::raw('COUNT(*) as total'))
            ->whereIn('survey_id', $surveyIds)
            ->groupBy('survey_id', 'option_key')
            ->get()
            ->groupBy('survey_id');

        $myResponses = HrSurveyResponse::query()
            ->where('user_id', $user->id)
            ->whereIn('survey_id', $surveyIds)
            ->pluck('option_key', 'survey_id');

        $surveysData = $activeSurveys->map(function (HrSurvey $s) use ($allStats, $myResponses) {
            $breakdown = $allStats->get($s->id, collect())
                ->pluck('total', 'option_key')
                ->all();
            return [
                'id'              => $s->id,
                'title'           => $s->title,
                'question'        => $s->question,
                'options'         => $s->options,
                'starts_at'       => $s->starts_at?->toIso8601String(),
                'ends_at'         => $s->ends_at?->toIso8601String(),
                'total_responses' => (int) array_sum($breakdown),
                'stats'           => $breakdown,
                'my_response'     => $myResponses[$s->id] ?? null,
            ];
        })->values();

        return Inertia::render('Engagement', [
            'period'                  => $period,
            'can_manage'              => $user->isHr(),
            'vote_candidates'         => User::query()
                ->where('is_automation', false)
                ->where('id', '!=', $user->id)
                ->orderBy('name')
                ->limit(200)
                ->with('department:id,name')
                ->get(['id', 'name', 'department_id', 'avatar'])
                ->map(fn ($u) => [
                    'id'         => $u->id,
                    'name'       => $u->name,
                    'department' => $u->department?->name,
                    'avatar'     => $u->avatar,
                ])
                ->values(),
            'my_vote'                 => $myVote ? [
                'nominee_id'  => $myVote->nominee_id,
                'is_anonymous' => $myVote->is_anonymous,
                'comment'     => $myVote->comment,
            ] : null,
            'employee_of_month_ranking' => $ranking,
            'surveys'                 => $surveysData,
        ]);
    }

    // ── Admin: liste complète pour la gestion RH ─────────────────────────────

    public function adminSurveys(Request $request): Response
    {
        if (! $request->user()->isHr()) {
            abort(403);
        }

        $surveys = HrSurvey::query()
            ->orderByDesc('created_at')
            ->get()
            ->map(function (HrSurvey $s) {
                return [
                    'id'              => $s->id,
                    'title'           => $s->title,
                    'question'        => $s->question,
                    'options'         => $s->options,
                    'is_active'       => $s->is_active,
                    'starts_at'       => $s->starts_at?->toIso8601String(),
                    'ends_at'         => $s->ends_at?->toIso8601String(),
                    'responses_count' => HrSurveyResponse::where('survey_id', $s->id)->count(),
                    'created_at'      => $s->created_at->toIso8601String(),
                ];
            });

        return Inertia::render('AdminSurveys', [
            'surveys' => $surveys,
        ]);
    }

    public function toggleSurvey(Request $request, HrSurvey $survey): RedirectResponse
    {
        if (! $request->user()->isHr()) {
            abort(403);
        }

        $survey->update(['is_active' => ! $survey->is_active]);

        AuditLogger::log(
            'hr_survey_toggled',
            ['title' => $survey->title, 'is_active' => $survey->is_active],
            $request->user(),
            HrSurvey::class,
            $survey->id,
            'info',
            'Changement de statut d un sondage RH.',
        );

        return back()->with('success', $survey->is_active ? 'Sondage activé.' : 'Sondage désactivé.');
    }

    public function destroySurvey(Request $request, HrSurvey $survey): RedirectResponse
    {
        if (! $request->user()->isHr()) {
            abort(403);
        }

        AuditLogger::log(
            'hr_survey_deleted',
            ['title' => $survey->title],
            $request->user(),
            HrSurvey::class,
            $survey->id,
            'warning',
            'Suppression d un sondage RH.',
        );

        $survey->delete();

        return back()->with('success', 'Sondage supprimé.');
    }

    public function exportSurvey(Request $request, HrSurvey $survey): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        if (! $request->user()->isHr()) {
            abort(403);
        }

        $stats = HrSurveyResponse::query()
            ->select('option_key', DB::raw('COUNT(*) as total'))
            ->where('survey_id', $survey->id)
            ->groupBy('option_key')
            ->pluck('total', 'option_key');

        $totalResponses = (int) $stats->sum();
        $filename = 'sondage-' . str($survey->title)->slug() . '-' . now()->format('Y-m-d') . '.csv';

        return response()->streamDownload(function () use ($survey, $stats, $totalResponses) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF)); // UTF-8 BOM for Excel
            fputcsv($handle, ['Option', 'Réponses', 'Pourcentage'], ';');
            foreach ($survey->options as $option) {
                $count = (int) ($stats[$option['key']] ?? 0);
                $pct = $totalResponses > 0 ? round(($count / $totalResponses) * 100, 1) : 0;
                fputcsv($handle, [$option['label'], $count, $pct . ' %'], ';');
            }
            fputcsv($handle, ['Total', $totalResponses, '100 %'], ';');
            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    // ── Vote employé du mois ─────────────────────────────────────────────────

    public function vote(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nominee_id'  => ['required', 'integer', 'exists:users,id'],
            'is_anonymous' => ['nullable', 'boolean'],
            'comment'     => ['nullable', 'string', 'max:300'],
        ]);

        if ((int) $validated['nominee_id'] === (int) $request->user()->id) {
            return back()->with('error', 'Auto-nomination interdite.');
        }

        $period = now()->format('Y-m');
        PeerVote::query()->updateOrCreate(
            ['voter_id' => $request->user()->id, 'period' => $period],
            [
                'nominee_id'   => $validated['nominee_id'],
                'is_anonymous' => (bool) ($validated['is_anonymous'] ?? true),
                'comment'      => $validated['comment'] ?? null,
                'weight'       => $this->voterWeight($request->user()),
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

        return back()->with('success', 'Vote enregistré.');
    }

    public function createSurvey(Request $request): RedirectResponse
    {
        if (! $request->user()->isHr()) {
            abort(403);
        }

        $validated = $request->validate([
            'title'             => ['required', 'string', 'max:120'],
            'question'          => ['required', 'string', 'max:300'],
            'options'           => ['required', 'array', 'min:2', 'max:6'],
            'options.*.key'     => ['required', 'string', 'max:40'],
            'options.*.label'   => ['required', 'string', 'max:120'],
            'ends_at'           => ['nullable', 'date'],
        ]);

        HrSurvey::query()->where('is_active', true)->update(['is_active' => false]);

        $survey = HrSurvey::query()->create([
            'title'      => $validated['title'],
            'question'   => $validated['question'],
            'options'    => $validated['options'],
            'is_active'  => true,
            'created_by' => $request->user()->id,
            'starts_at'  => now(),
            'ends_at'    => $validated['ends_at'] ?? null,
        ]);

        AuditLogger::log(
            'hr_survey_created',
            [
                'title'         => $validated['title'],
                'options_count' => count($validated['options']),
                'ends_at'       => $validated['ends_at'] ?? null,
            ],
            $request->user(),
            HrSurvey::class,
            $survey?->id,
            'info',
            'Creation d un sondage RH.',
        );

        return back()->with('success', 'Sondage RH créé et activé.');
    }

    public function respondSurvey(Request $request, HrSurvey $survey): RedirectResponse
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

        return back()->with('success', 'Merci pour votre retour !');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

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
            ->with('department:id,name')
            ->get(['id', 'name', 'department_id', 'avatar']);

        return $users
            ->map(function (User $u) use ($voteRows, $bravoRows, $maxPoints) {
                $votes = (int) ($voteRows[$u->id]->votes_count ?? 0);
                $weightedVotes = (float) ($voteRows[$u->id]->weighted_votes ?? 0);
                $bravoPoints = (int) ($bravoRows[$u->id]->points_sum ?? 0);
                $merit = round(($weightedVotes * 0.65) + (($bravoPoints / $maxPoints) * 10 * 0.35), 2);

                return [
                    'user' => [
                        'id'         => $u->id,
                        'name'       => $u->name,
                        'department' => $u->department?->name,
                        'avatar'     => $u->avatar,
                    ],
                    'votes_count'    => $votes,
                    'weighted_votes' => $weightedVotes,
                    'bravo_points'   => $bravoPoints,
                    'merit_score'    => $merit,
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
            $score >= 80  => 'Influenceur Positif',
            $score >= 40  => 'Contributeur Regulier',
            default       => 'Nouveau Talent',
        };
    }
}
