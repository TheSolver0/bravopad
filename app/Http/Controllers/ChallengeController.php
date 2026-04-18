<?php

namespace App\Http\Controllers;

use App\Models\Challenge;
use App\Models\Bravo;
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
            ->map(function ($challenge) {
                return [
                    'id'          => $challenge->id,
                    'name'        => $challenge->name,
                    'description' => $challenge->description,
                    'start_date'  => $challenge->start_date,
                    'end_date'    => $challenge->end_date,
                    'points_bonus' => $challenge->points_bonus,
                    'status'      => $challenge->status,
                    'bravos_count' => $challenge->bravos_count,
                    'days_left'   => max(0, (int) now()->diffInDays($challenge->end_date, false)),
                ];
            });

        return Inertia::render('Challenges', [
            'challenges' => $challenges,
        ]);
    }

    /**
     * Liste des challenges
     */
    public function index()
    {
        $challenges = Challenge::withCount('bravos')
            ->latest()
            ->paginate(20);

        return response()->json($challenges);
    }

    /**
     * Créer un challenge (RH only)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'points_bonus' => 'nullable|integer',
        ]);

        $challenge = Challenge::create([
            ...$validated,
            'status' => 'active',
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Challenge créé avec succès',
            'data' => $challenge
        ]);
    }

    /**
     * Afficher un challenge + stats
     */
    public function show($id)
    {
        $challenge = Challenge::with(['bravos.sender', 'bravos.receiver', 'bravos.value'])
            ->findOrFail($id);

        $totalPoints = $challenge->bravos->sum('points');

        return response()->json([
            'challenge' => $challenge,
            'stats' => [
                'total_bravos' => $challenge->bravos->count(),
                'total_points' => $totalPoints,
            ]
        ]);
    }

    /**
     * Activer un challenge
     */
    public function activate($id)
    {
        $challenge = Challenge::findOrFail($id);

        $challenge->update([
            'status' => 'active'
        ]);

        return response()->json([
            'message' => 'Challenge activé',
            'data' => $challenge
        ]);
    }

    /**
     * Terminer un challenge + calcul leaderboard
     */
    public function finish($id)
    {
        return DB::transaction(function () use ($id) {

            $challenge = Challenge::with('bravos.receiver')
                ->findOrFail($id);

            $challenge->update([
                'status' => 'finished'
            ]);

            // leaderboard par utilisateur
            $leaderboard = $challenge->bravos
                ->groupBy('receiver_id')
                ->map(function ($bravos) {
                    return [
                        'user_id' => $bravos->first()->receiver_id,
                        'total_points' => $bravos->sum('points'),
                        'total_bravos' => $bravos->count(),
                    ];
                })
                ->sortByDesc('total_points')
                ->values();

            return response()->json([
                'message' => 'Challenge terminé',
                'leaderboard' => $leaderboard
            ]);
        });
    }

    /**
     * Challenge actif (global RH)
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