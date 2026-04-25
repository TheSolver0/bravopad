<?php

namespace App\Http\Controllers;

use App\Models\Challenge;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class ChallengeController extends Controller
{
    public function page(Request $request)
    {
        $userId = $request->user()?->id;

        $challenges = Challenge::withCount(['bravos', 'participants'])
            ->with(['participants' => function ($q) use ($userId) {
                $q->where('users.id', $userId);
            }])
            ->orderByRaw("CASE WHEN status = 'active' THEN 0 ELSE 1 END")
            ->orderBy('end_date')
            ->get()
            ->map(function ($challenge) {
                return [
                    'id'                 => $challenge->id,
                    'name'               => $challenge->name,
                    'description'        => $challenge->description,
                    'start_date'         => $challenge->start_date,
                    'end_date'           => $challenge->end_date,
                    'points_bonus'       => $challenge->points_bonus,
                    'status'             => $challenge->status,
                    'for_all'            => (bool) $challenge->for_all,
                    'bravos_count'       => $challenge->bravos_count,
                    'participants_count' => $challenge->participants_count,
                    'is_participating'   => $challenge->participants->isNotEmpty(),
                    'days_left'          => max(0, (int) now()->diffInDays($challenge->end_date, false)),
                ];
            });

        $user = $request->user();
        $user?->loadMissing('department');

        return Inertia::render('Challenges', [
            'challenges'  => $challenges,
            'currentUser' => $user ? [
                'id'         => $user->id,
                'name'       => $user->name,
                'avatar'     => $user->avatar,
                'role'       => $user->role,
                'permission' => $user->permission ?? 'employee',
                'department' => $user->department?->name ?? null,
                'points_total' => $user->points_total,
            ] : null,
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('manage-challenges');

        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'description'  => 'nullable|string',
            'start_date'   => 'required|date',
            'end_date'     => 'required|date|after_or_equal:start_date',
            'points_bonus' => 'nullable|integer|min:0',
            'for_all'      => 'boolean',
        ]);

        Challenge::create([
            ...$validated,
            'status'     => 'active',
            'for_all'    => $validated['for_all'] ?? true,
            'created_by' => $request->user()->id,
        ]);

        return redirect('/challenges')->with('success', 'Défi créé avec succès !');
    }

    public function participate(Request $request, $id)
    {
        $challenge = Challenge::where('status', 'active')->findOrFail($id);
        $user = $request->user();

        $already = $challenge->participants()->where('users.id', $user->id)->exists();

        if ($already) {
            $challenge->participants()->detach($user->id);
            $participating = false;
        } else {
            $challenge->participants()->attach($user->id);
            $participating = true;
        }

        return back()->with([
            'participating' => $participating,
            'challenge_id'  => $challenge->id,
        ]);
    }

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
            'stats' => [
                'total_bravos'  => $challenge->bravos->count(),
                'total_points'  => $totalPoints,
            ]
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

