<?php

namespace App\Http\Controllers;

use App\Models\Challenge;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ChallengeController extends Controller
{
    /**
     * Page Inertia /challenges
     */
    public function page()
    {
        $challenges = Challenge::withCount('bravos')
            ->orderByRaw("CASE WHEN status = 'active' THEN 0 ELSE 1 END")
            ->orderBy('end_date')
            ->get()
            ->map(fn ($c) => [
                'id'           => $c->id,
                'name'         => $c->name,
                'description'  => $c->description,
                'start_date'   => $c->start_date,
                'end_date'     => $c->end_date,
                'points_bonus' => $c->points_bonus,
                'status'       => $c->status,
                'bravos_count' => $c->bravos_count,
                'days_left'    => max(0, (int) now()->diffInDays($c->end_date, false)),
            ]);

        return Inertia::render('Challenges', [
            'challenges' => $challenges,
        ]);
    }

    /**
     * Liste paginée (API)
     */
    public function index()
    {
        return response()->json(
            Challenge::withCount('bravos')->latest()->paginate(20)
        );
    }

    /**
     * Créer un challenge — RH/Admin uniquement
     */
    public function store(Request $request)
    {
        $this->authorize('create', Challenge::class);

        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'description'  => 'nullable|string',
            'start_date'   => 'required|date',
            'end_date'     => 'required|date|after_or_equal:start_date',
            'points_bonus' => 'nullable|integer|min:0',
        ]);

        $challenge = Challenge::create([
            ...$validated,
            'status'     => 'active',
            'created_by' => $request->user()->id,
        ]);

        AuditLogger::log(
            'challenge_created',
            [
                'name' => $challenge->name,
                'start_date' => $challenge->start_date,
                'end_date' => $challenge->end_date,
                'points_bonus' => $challenge->points_bonus,
            ],
            $request->user(),
            Challenge::class,
            $challenge->id,
            'info',
            'Creation d un challenge.',
        );

        return response()->json([
            'message' => 'Challenge créé avec succès',
            'data'    => $challenge,
        ], 201);
    }

    /**
     * Détail + stats d'un challenge (API)
     */
    public function show($id)
    {
        $challenge   = Challenge::with(['bravos.sender', 'bravos.receiver', 'bravos.values'])->findOrFail($id);
        $totalPoints = $challenge->bravos->sum('points');

        return response()->json([
            'challenge' => $challenge,
            'stats'     => [
                'total_bravos' => $challenge->bravos->count(),
                'total_points' => $totalPoints,
            ],
        ]);
    }

    /**
     * Activer un challenge — RH/Admin uniquement
     */
    public function activate($id)
    {
        $challenge = Challenge::findOrFail($id);
        $this->authorize('activate', $challenge);

        $challenge->update(['status' => 'active']);

        AuditLogger::log(
            'challenge_activated',
            ['name' => $challenge->name],
            request()->user(),
            Challenge::class,
            $challenge->id,
            'info',
            'Activation d un challenge.',
        );

        return response()->json(['message' => 'Challenge activé', 'data' => $challenge]);
    }

    /**
     * Terminer un challenge + calcul leaderboard — RH/Admin uniquement
     */
    public function finish($id)
    {
        return DB::transaction(function () use ($id) {
            $challenge = Challenge::with('bravos.receiver')->findOrFail($id);
            $this->authorize('finish', $challenge);

            $challenge->update(['status' => 'finished']);

            $leaderboard = $challenge->bravos
                ->groupBy('receiver_id')
                ->map(fn ($bravos) => [
                    'user_id'      => $bravos->first()->receiver_id,
                    'user_name'    => $bravos->first()->receiver?->name,
                    'total_points' => $bravos->sum('points'),
                    'total_bravos' => $bravos->count(),
                ])
                ->sortByDesc('total_points')
                ->values();

            AuditLogger::log(
                'challenge_finished',
                [
                    'name' => $challenge->name,
                    'total_entries' => $challenge->bravos->count(),
                ],
                request()->user(),
                Challenge::class,
                $challenge->id,
                'info',
                'Cloture d un challenge.',
            );

            return response()->json([
                'message'     => 'Challenge terminé',
                'leaderboard' => $leaderboard,
            ]);
        });
    }

    /**
     * Challenge actif en cours (API)
     */
    public function active()
    {
        $challenge = Challenge::where('status', 'active')
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now())
            ->withCount('bravos')
            ->first();

        return response()->json($challenge);
    }
}
