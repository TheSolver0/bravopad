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
use App\Services\Survey\SamplingService;
use App\Services\Survey\SurveyStatsService;
use App\Services\Survey\SurveyTemplateService;
use Carbon\Carbon;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class EngagementController extends Controller
{
    private function resolveCoverImage(?string $value): ?string
    {
        if (! $value) {
            return null;
        }
        if (filter_var($value, FILTER_VALIDATE_URL)) {
            return $value;
        }
        if (str_starts_with($value, '/')) {
            return $value;
        }
        return asset('storage/' . $value);
    }

    public function index(Request $request, BadgeProgressService $badges): Response
    {
        $period = now()->format('Y-m');
        $user = $request->user();

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

        // Only single-question surveys appear in the engagement widget
        $activeSurveys = HrSurvey::query()
            ->where('is_active', true)
            ->whereNull('questions')
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

        // Active multi-question surveys shown as banners with link
        $activeMultiSurveys = HrSurvey::query()
            ->where('is_active', true)
            ->whereNotNull('questions')
            ->where(function ($q) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            })
            ->orderByDesc('created_at')
            ->get()
            ->map(function (HrSurvey $s) use ($user) {
                $hasAnswered = HrSurveyResponse::where('survey_id', $s->id)
                    ->where('user_id', $user->id)
                    ->exists();
                return [
                    'id'              => $s->id,
                    'title'           => $s->title,
                    'description'     => $s->description,
                    'cover_image'     => $this->resolveCoverImage($s->cover_image),
                    'token'           => $s->token,
                    'ends_at'         => $s->ends_at?->toIso8601String(),
                    'has_answered'    => $hasAnswered,
                    'questions_count' => count($s->questions ?? []),
                ];
            })->values();

        return Inertia::render('Engagement', [
            'period'                    => $period,
            'can_manage'                => $user->isHr(),
            'vote_candidates'           => User::query()
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
            'my_vote'                   => $myVote ? [
                'nominee_id'   => $myVote->nominee_id,
                'is_anonymous' => $myVote->is_anonymous,
                'comment'      => $myVote->comment,
            ] : null,
            'employee_of_month_ranking' => $ranking,
            'surveys'                   => $surveysData,
            'multi_surveys'             => $activeMultiSurveys,
        ]);
    }

    // ── Admin: liste complète ─────────────────────────────────────────────────

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
                    'description'     => $s->description,
                    'cover_image'     => $this->resolveCoverImage($s->cover_image),
                    'question'        => $s->question,
                    'options'         => $s->options,
                    'questions'       => $s->questions,
                    'token'           => $s->token,
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

    public function surveyCreatePage(Request $request): Response
    {
        if (! $request->user()->isHr()) {
            abort(403);
        }

        return Inertia::render('AdminSurveyCreate');
    }

    public function createSurvey(Request $request): RedirectResponse
    {
        if (! $request->user()->isHr()) {
            abort(403);
        }

        $validated = $request->validate([
            'title'                    => ['required', 'string', 'max:180'],
            'description'              => ['nullable', 'string', 'max:500'],
            'cover_image'              => ['nullable', 'image', 'max:4096'],
            'questions'                => ['required', 'array', 'min:1', 'max:50'],
            'questions.*.id'           => ['required', 'string', 'max:40'],
            'questions.*.label'        => ['required', 'string', 'max:400'],
            'questions.*.type'         => ['required', 'in:radio,checkbox,text,rating'],
            'questions.*.section'      => ['nullable', 'string', 'max:120'],
            'questions.*.required'     => ['boolean'],
            'questions.*.options'      => ['nullable', 'array'],
            'questions.*.options.*'    => ['string', 'max:160'],
            'ends_at'                  => ['nullable', 'date'],
        ]);

        $coverPath = null;
        if ($request->hasFile('cover_image')) {
            $coverPath = $request->file('cover_image')->store('surveys/covers', 'public');
        }

        $survey = HrSurvey::query()->create([
            'title'       => $validated['title'],
            'description' => $validated['description'] ?? null,
            'cover_image' => $coverPath,
            'question'    => $validated['title'],
            'options'     => [],
            'questions'   => $validated['questions'],
            'is_active'   => true,
            'created_by'  => $request->user()->id,
            'starts_at'   => now(),
            'ends_at'     => $validated['ends_at'] ?? null,
        ]);

        AuditLogger::log(
            'hr_survey_created',
            [
                'title'           => $validated['title'],
                'questions_count' => count($validated['questions']),
                'ends_at'         => $validated['ends_at'] ?? null,
            ],
            $request->user(),
            HrSurvey::class,
            $survey?->id,
            'info',
            'Creation d un sondage RH multi-questions.',
        );

        return redirect('/admin/surveys')->with('success', 'Sondage créé et activé. Partagez le lien pour collecter des réponses.');
    }

    public function surveyEditPage(Request $request, HrSurvey $survey): Response
    {
        if (! $request->user()->isHr()) {
            abort(403);
        }

        return Inertia::render('AdminSurveyEdit', [
            'survey' => [
                'id'          => $survey->id,
                'title'       => $survey->title,
                'description' => $survey->description,
                'cover_image' => $this->resolveCoverImage($survey->cover_image),
                'questions'   => $survey->questions ?? [],
                'ends_at'     => $survey->ends_at?->format('Y-m-d'),
            ],
        ]);
    }

    public function updateSurvey(Request $request, HrSurvey $survey): RedirectResponse
    {
        if (! $request->user()->isHr()) {
            abort(403);
        }

        $validated = $request->validate([
            'title'                    => ['required', 'string', 'max:180'],
            'description'              => ['nullable', 'string', 'max:500'],
            'cover_image'              => ['nullable', 'image', 'max:4096'],
            'remove_cover'             => ['nullable', 'boolean'],
            'questions'                => ['required', 'array', 'min:1', 'max:50'],
            'questions.*.id'           => ['required', 'string', 'max:40'],
            'questions.*.label'        => ['required', 'string', 'max:400'],
            'questions.*.type'         => ['required', 'in:radio,checkbox,text,rating'],
            'questions.*.section'      => ['nullable', 'string', 'max:120'],
            'questions.*.required'     => ['boolean'],
            'questions.*.options'      => ['nullable', 'array'],
            'questions.*.options.*'    => ['string', 'max:160'],
            'ends_at'                  => ['nullable', 'date'],
        ]);

        $coverPath = $survey->cover_image;

        if ($request->boolean('remove_cover')) {
            $coverPath = null;
        }

        if ($request->hasFile('cover_image')) {
            $coverPath = $request->file('cover_image')->store('surveys/covers', 'public');
        }

        $survey->update([
            'title'       => $validated['title'],
            'description' => $validated['description'] ?? null,
            'cover_image' => $coverPath,
            'question'    => $validated['title'],
            'questions'   => $validated['questions'],
            'ends_at'     => $validated['ends_at'] ?? null,
        ]);

        AuditLogger::log(
            'hr_survey_updated',
            ['title' => $validated['title'], 'questions_count' => count($validated['questions'])],
            $request->user(),
            HrSurvey::class,
            $survey->id,
            'info',
            'Modification d un sondage RH.',
        );

        return redirect('/admin/surveys')->with('success', 'Sondage mis à jour.');
    }

    public function surveyPreview(Request $request, HrSurvey $survey): Response
    {
        if (! $request->user()->isHr()) {
            abort(403);
        }

        return Inertia::render('SurveyForm', [
            'survey' => [
                'id'          => $survey->id,
                'title'       => $survey->title,
                'description' => $survey->description,
                'cover_image' => $this->resolveCoverImage($survey->cover_image),
                'questions'   => $survey->questions ?? [],
                'options'     => $survey->options ?? [],
                'token'       => $survey->token,
                'ends_at'     => $survey->ends_at?->toIso8601String(),
            ],
            'has_answered' => false,
            'is_preview'   => true,
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

    // ── Templates & AI generation ────────────────────────────────────────────

    public function getTemplates(Request $request): JsonResponse
    {
        if (! $request->user()->isHr()) {
            abort(403);
        }

        return response()->json(app(SurveyTemplateService::class)->all());
    }

    public function generateSurvey(Request $request): JsonResponse
    {
        if (! $request->user()->isHr()) {
            abort(403);
        }

        $request->validate(['purpose' => ['required', 'string', 'max:1000']]);

        $apiKey = config('services.groq.key');
        if (! $apiKey) {
            return response()->json(['error' => 'Clé API Groq non configurée dans .env (GROQ_API_KEY).'], 503);
        }

        $systemPrompt = 'Tu es un expert RH. Tu génères UNIQUEMENT du JSON valide, sans texte ni markdown autour.';

        $userPrompt = <<<PROMPT
Génère un sondage RH professionnel en français pour : {$request->purpose}

Réponds UNIQUEMENT avec ce JSON (sans code block, sans texte autour) :
{
  "title": "...",
  "description": "...",
  "questions": [
    {
      "id": "q_ai_1",
      "section": "Nom de section",
      "label": "Question ?",
      "type": "radio",
      "options": ["Option A", "Option B", "Option C"],
      "required": true
    }
  ]
}

Contraintes :
- Entre 6 et 12 questions
- Mix de types : rating, radio, checkbox, text
- options = [] pour rating et text
- IDs : q_ai_1, q_ai_2, …
- Questions neutres, professionnelles, en français
- Sections logiques regroupant les questions
PROMPT;

        $groqHttp = Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
            'Content-Type'  => 'application/json',
        ])->timeout(30);

        if (app()->environment('local')) {
            $groqHttp = $groqHttp->withoutVerifying();
        }

        try {
            $resp = $groqHttp->post('https://api.groq.com/openai/v1/chat/completions', [
                'model'       => 'llama-3.3-70b-versatile',
                'max_tokens'  => 2500,
                'temperature' => 0.6,
                'messages'    => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user',   'content' => $userPrompt],
                ],
            ]);
        } catch (ConnectionException $e) {
            return response()->json(['error' => 'Impossible de contacter l\'API Groq.'], 502);
        }

        if ($resp->failed()) {
            return response()->json(['error' => 'Erreur lors de la génération IA.'], 502);
        }

        $content = trim($resp->json('choices.0.message.content') ?? '');

        // Strip optional markdown code block
        if (preg_match('/```(?:json)?\s*(\{.*\})\s*```/s', $content, $m)) {
            $content = $m[1];
        }

        $survey = json_decode($content, true);

        if (! $survey || ! isset($survey['questions']) || ! is_array($survey['questions'])) {
            return response()->json(['error' => 'La réponse IA n\'a pas pu être analysée. Réessayez.'], 500);
        }

        return response()->json($survey);
    }

    public function calculateSample(Request $request): JsonResponse
    {
        if (! $request->user()->isHr()) {
            abort(403);
        }

        $validated = $request->validate([
            'confidence_level' => ['required', 'integer', 'in:90,95,99'],
            'margin_of_error'  => ['required', 'numeric', 'in:1,2,3,5'],
            'stratify_by'      => ['nullable', 'string', 'in:none,department,seniority'],
        ]);

        $service    = app(SamplingService::class);
        $population = User::where('is_automation', false)->count();

        $result = $service->calculateSampleSize(
            $population,
            (float) $validated['margin_of_error'],
            (int) $validated['confidence_level'],
        );

        $stratifyBy = $validated['stratify_by'] ?? 'none';
        $sample     = $stratifyBy !== 'none'
            ? $service->getStratifiedSample($result['sample_size'], $stratifyBy)
            : [];

        return response()->json([
            ...$result,
            'sample'      => $sample,
            'stratify_by' => $stratifyBy,
        ]);
    }

    // ── Survey form (employee-facing) ─────────────────────────────────────────

    public function showSurvey(Request $request, string $token): Response
    {
        $survey = HrSurvey::where('token', $token)->firstOrFail();

        if (! $survey->is_active) {
            abort(404, 'Ce sondage n\'est plus actif.');
        }

        $user = $request->user();
        $sessionKey = "survey_responded_{$survey->id}";

        if ($user) {
            $hasAnswered = HrSurveyResponse::where('survey_id', $survey->id)
                ->where('user_id', $user->id)
                ->exists();
        } else {
            $hasAnswered = $request->session()->has($sessionKey);
        }

        return Inertia::render('SurveyForm', [
            'survey' => [
                'id'          => $survey->id,
                'title'       => $survey->title,
                'description' => $survey->description,
                'cover_image' => $this->resolveCoverImage($survey->cover_image),
                'questions'   => $survey->questions,
                'options'     => $survey->options ?? [],
                'token'       => $survey->token,
                'ends_at'     => $survey->ends_at?->toIso8601String(),
            ],
            'has_answered' => $hasAnswered,
        ]);
    }

    public function respondSurveyByToken(Request $request, string $token): RedirectResponse
    {
        $survey = HrSurvey::where('token', $token)->firstOrFail();

        if (! $survey->is_active) {
            return back()->with('error', 'Ce sondage n\'est plus actif.');
        }

        $validated = $request->validate([
            'answers' => ['required', 'array'],
        ]);

        $answers = $validated['answers'];
        $user = $request->user();
        $sessionKey = "survey_responded_{$survey->id}";

        // Check duplicate by user_id (authenticated) or session (anonymous)
        if ($user) {
            $alreadyAnswered = HrSurveyResponse::where('survey_id', $survey->id)
                ->where('user_id', $user->id)
                ->exists();
        } else {
            $alreadyAnswered = $request->session()->has($sessionKey);
        }

        if ($alreadyAnswered) {
            return back()->with('error', 'Vous avez déjà répondu à ce sondage.');
        }

        // Validate required questions are answered
        foreach (($survey->questions ?? []) as $q) {
            if (($q['required'] ?? false) && empty($answers[$q['id']])) {
                return back()->with('error', "La question « {$q['label']} » est obligatoire.");
            }
        }

        $sessionId = $user ? null : $request->session()->getId();

        HrSurveyResponse::create([
            'survey_id'  => $survey->id,
            'user_id'    => $user?->id,
            'session_id' => $sessionId,
            'answers'    => $answers,
            'option_key' => null,
        ]);

        // Mark in session for anonymous users
        if (! $user) {
            $request->session()->put($sessionKey, true);
        }

        if ($user) {
            AuditLogger::log(
                'hr_survey_answered',
                ['survey_id' => $survey->id, 'token' => $token],
                $user,
                HrSurvey::class,
                $survey->id,
                'info',
                'Réponse à un sondage multi-questions.',
            );
        }

        return back()->with('success', 'Merci pour votre participation !');
    }

    // ── Survey report (admin) ─────────────────────────────────────────────────

    public function surveyReport(Request $request, HrSurvey $survey): Response
    {
        if (! $request->user()->isHr()) {
            abort(403);
        }

        $statsService = app(SurveyStatsService::class);

        $responses = HrSurveyResponse::where('survey_id', $survey->id)
            ->with('user:id,name,avatar')
            ->get();

        $totalResponses = $responses->count();
        $totalUsers     = User::where('is_automation', false)->count();

        $responsesOverTime = HrSurveyResponse::where('survey_id', $survey->id)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($r) => ['date' => $r->date, 'count' => (int) $r->count])
            ->values();

        $questionsReport = [];
        $npsData         = null;

        foreach (($survey->questions ?? []) as $q) {
            $qId   = $q['id'];
            $type  = $q['type'];
            $entry = [
                'id'      => $qId,
                'label'   => $q['label'],
                'type'    => $type,
                'section' => $q['section'] ?? null,
            ];

            if ($type === 'text') {
                $texts = $responses
                    ->map(fn ($r) => $r->answers[$qId] ?? null)
                    ->filter()
                    ->values()
                    ->all();
                $entry['responses'] = $texts;

            } elseif ($type === 'radio') {
                $options = $q['options'] ?? [];
                $counts  = array_fill_keys($options, 0);
                foreach ($responses as $r) {
                    $val = $r->answers[$qId] ?? null;
                    if ($val !== null && isset($counts[$val])) {
                        $counts[$val]++;
                    }
                }
                $answered          = array_sum($counts);
                $entry['options']  = $options;
                $entry['counts']   = $counts;
                $entry['answered'] = $answered;
                $entry['chi2']     = $statsService->chiSquareTest(array_values($counts), $answered);

            } elseif ($type === 'checkbox') {
                $options = $q['options'] ?? [];
                $counts  = array_fill_keys($options, 0);
                foreach ($responses as $r) {
                    $vals = $r->answers[$qId] ?? [];
                    if (is_array($vals)) {
                        foreach ($vals as $v) {
                            if (isset($counts[$v])) {
                                $counts[$v]++;
                            }
                        }
                    }
                }
                $answered          = $responses->filter(fn ($r) => ! empty($r->answers[$qId]))->count();
                $entry['options']  = $options;
                $entry['counts']   = $counts;
                $entry['answered'] = $answered;
                $entry['chi2']     = $statsService->chiSquareTest(array_values($counts), (int) array_sum($counts));

            } elseif ($type === 'rating') {
                $vals = $responses
                    ->map(fn ($r) => isset($r->answers[$qId]) ? (int) $r->answers[$qId] : null)
                    ->filter()
                    ->values()
                    ->all();

                $distribution = [];
                for ($i = 1; $i <= 5; $i++) {
                    $distribution[$i] = count(array_filter($vals, fn ($v) => $v === $i));
                }

                $stats            = $statsService->ratingStats($vals, $totalResponses);
                $entry['average']      = $stats['average'];
                $entry['median']       = $stats['median'];
                $entry['std_dev']      = $stats['std_dev'];
                $entry['mode']         = $stats['mode'];
                $entry['ci95']         = $stats['confidence_interval'];
                $entry['distribution'] = $distribution;
                $entry['answered']     = $stats['answered'];

                // Use the last (or most complete) rating question for global NPS
                $enps = $statsService->computeEnps($vals);
                if ($enps && ($npsData === null || $stats['answered'] > ($npsData['total'] ?? 0))) {
                    $npsData = $enps;
                }
            }

            $questionsReport[] = $entry;
        }

        return Inertia::render('AdminSurveyReport', [
            'survey' => [
                'id'          => $survey->id,
                'title'       => $survey->title,
                'description' => $survey->description,
                'token'       => $survey->token,
                'is_active'   => $survey->is_active,
                'created_at'  => $survey->created_at->toIso8601String(),
                'ends_at'     => $survey->ends_at?->toIso8601String(),
            ],
            'total_responses'     => $totalResponses,
            'total_users'         => $totalUsers,
            'questions_report'    => $questionsReport,
            'responses_over_time' => $responsesOverTime,
            'nps'                 => $npsData,
        ]);
    }

    public function exportSurvey(Request $request, HrSurvey $survey): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        if (! $request->user()->isHr()) {
            abort(403);
        }

        $filename = 'sondage-' . str($survey->title)->slug() . '-' . now()->format('Y-m-d') . '.csv';

        if ($survey->isMultiQuestion()) {
            $responses = HrSurveyResponse::where('survey_id', $survey->id)
                ->with('user:id,name')
                ->get();

            return response()->streamDownload(function () use ($survey, $responses) {
                $handle = fopen('php://output', 'w');
                fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));

                $questions = $survey->questions ?? [];
                $headers   = ['Nom', 'Date'];
                foreach ($questions as $q) {
                    $headers[] = $q['label'];
                }
                fputcsv($handle, $headers, ';');

                foreach ($responses as $r) {
                    $row = [$r->user?->name ?? 'Anonyme', $r->created_at->format('d/m/Y H:i')];
                    foreach ($questions as $q) {
                        $val = $r->answers[$q['id']] ?? '';
                        $row[] = is_array($val) ? implode(', ', $val) : $val;
                    }
                    fputcsv($handle, $row, ';');
                }
                fclose($handle);
            }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
        }

        // Legacy single-question export
        $stats = HrSurveyResponse::query()
            ->select('option_key', DB::raw('COUNT(*) as total'))
            ->where('survey_id', $survey->id)
            ->groupBy('option_key')
            ->pluck('total', 'option_key');

        $totalResponses = (int) $stats->sum();

        return response()->streamDownload(function () use ($survey, $stats, $totalResponses) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));
            fputcsv($handle, ['Option', 'Réponses', 'Pourcentage'], ';');
            foreach ($survey->options as $option) {
                $count = (int) ($stats[$option['key']] ?? 0);
                $pct   = $totalResponses > 0 ? round(($count / $totalResponses) * 100, 1) : 0;
                fputcsv($handle, [$option['label'], $count, $pct . ' %'], ';');
            }
            fputcsv($handle, ['Total', $totalResponses, '100 %'], ';');
            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    // ── Legacy single-question respond (Engagement widget) ────────────────────

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

    // ── Vote employé du mois ─────────────────────────────────────────────────

    public function vote(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nominee_id'   => ['required', 'integer', 'exists:users,id'],
            'is_anonymous' => ['nullable', 'boolean'],
            'comment'      => ['nullable', 'string', 'max:300'],
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
        $end   = $start->copy()->endOfMonth();

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
                $votes         = (int) ($voteRows[$u->id]->votes_count ?? 0);
                $weightedVotes = (float) ($voteRows[$u->id]->weighted_votes ?? 0);
                $bravoPoints   = (int) ($bravoRows[$u->id]->points_sum ?? 0);
                $merit         = round(($weightedVotes * 0.65) + (($bravoPoints / $maxPoints) * 10 * 0.35), 2);

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
