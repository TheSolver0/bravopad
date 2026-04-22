<?php

namespace App\Http\Controllers;

use App\Models\Bravo;
use App\Models\BravoValue;
use App\Models\Challenge;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class BravoController extends Controller
{
    /**
     * Feed type réseau social
     */
    public function index()
    {
        $bravos = Bravo::with(['sender', 'receiver', 'values', 'challenge'])
            ->latest()
            ->paginate(20);

        return response()->json($bravos);
    }

    public function show($id)
    {
        $bravo = Bravo::with(['sender', 'receiver', 'values', 'challenge'])
            ->findOrFail($id);

        return response()->json($bravo);
    }

    /**
     * Page Inertia /history — bravos de l'utilisateur connecté
     */
    public function history(Request $request)
    {
        $userId = $request->user()->id;

        $bravos = Bravo::with(['sender', 'receiver', 'values'])
            ->where(fn ($q) => $q->where('sender_id', $userId)->orWhere('receiver_id', $userId))
            ->latest()
            ->get()
            ->map(fn ($b) => [
                'id'          => $b->id,
                'sender_id'   => $b->sender_id,
                'receiver_id' => $b->receiver_id,
                'message'     => $b->message,
                'points'      => $b->points,
                'likes_count' => $b->likes_count,
                'created_at'  => $b->created_at->format('d/m/Y à H:i'),
                'sender'   => $b->sender   ? ['id' => $b->sender->id,   'name' => $b->sender->name,   'avatar' => $b->sender->avatar]   : null,
                'receiver' => $b->receiver ? ['id' => $b->receiver->id, 'name' => $b->receiver->name, 'avatar' => $b->receiver->avatar] : null,
                'badge'    => $b->badge,
                'values'   => $b->values->map(fn ($v) => ['id' => $v->id, 'name' => $v->name, 'color' => $v->color])->values(),
            ]);

        $user = $request->user();

        $pointsGiven = Bravo::where('sender_id', $userId)->sum('points');

        $badgeMeta = [
            'good_job'   => ['label' => 'Good Job',   'emoji' => '👍', 'color' => '#4CAF50'],
            'excellent'  => ['label' => 'Excellent',  'emoji' => '⭐', 'color' => '#2196F3'],
            'impressive' => ['label' => 'Impressive', 'emoji' => '🚀', 'color' => '#9C27B0'],
        ];

        $badgesSent = Bravo::selectRaw('badge, COUNT(*) as count')
            ->where('sender_id', $userId)
            ->whereNotNull('badge')
            ->groupBy('badge')
            ->get()
            ->map(fn($row) => [
                'key'   => $row->badge,
                'label' => $badgeMeta[$row->badge]['label'] ?? $row->badge,
                'emoji' => $badgeMeta[$row->badge]['emoji'] ?? '🏅',
                'color' => $badgeMeta[$row->badge]['color'] ?? '#6366f1',
                'count' => (int) $row->count,
            ])
            ->sortByDesc('count')
            ->values();

        $user->loadMissing('department');

        return Inertia::render('History', [
            'bravos'        => $bravos,
            'currentUserId' => $userId,
            'currentUser'   => [
                'id'                       => $user->id,
                'name'                     => $user->name,
                'avatar'                   => $user->avatar,
                'department'               => $user->department?->name ?? null,
                'role'                     => $user->role,
                'permission'               => $user->permission ?? 'employee',
                'points_total'             => $user->points_total,
                'monthly_points_remaining' => $user->monthly_points_remaining,
                'monthly_points_allowance' => $user->monthly_points_allowance ?? 100,
            ],
            'pointsGiven'   => (int) $pointsGiven,
            'badgesSent'    => $badgesSent,
        ]);
    }

    public function create()
    {
        $user = request()->user();
        return Inertia::render('CreateBravo', [
            'users'       => User::all(),
            'bravoValues' => BravoValue::where('is_active', true)->get(),
            'currentUser' => [
                'monthly_points_remaining' => $user->monthly_points_remaining,
                'monthly_points_allowance' => $user->monthly_points_allowance ?? 100,
            ],
        ]);
    }

    /**
     * Créer un bravo (Kudos)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'receiver_id' => 'required|exists:users,id',
            'badge'       => 'required|in:good_job,excellent,impressive',
            'value_ids'   => 'nullable|array',
            'value_ids.*' => 'exists:bravo_values,id',
            'message'     => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated, $request) {

            $sender = $request->user();

            $badgePoints = ['good_job' => 10, 'excellent' => 25, 'impressive' => 50];
            $basePoints  = $badgePoints[$validated['badge']];

            $valueBonus = 0;
            if (!empty($validated['value_ids'])) {
                $values = BravoValue::whereIn('id', $validated['value_ids'])->get();
                $valueBonus = (int) $values->sum(fn ($v) => round(5 * $v->multiplier));
            }

            $points = $basePoints + $valueBonus;

            // Vérification du quota mensuel
            $remaining = $sender->monthly_points_remaining;
            if ($points > $remaining) {
                $msg = "Quota mensuel insuffisant. Il vous reste {$remaining} pts à distribuer ce mois-ci.";
                if ($request->hasHeader('X-Inertia')) {
                    return back()->withErrors(['points' => $msg]);
                }
                return response()->json(['message' => $msg], 422);
            }

            // challenge actif (global)
            $challenge = Challenge::where('status', 'active')
                ->where('start_date', '<=', now())
                ->where('end_date', '>=', now())
                ->first();

            $valueIds = $validated['value_ids'] ?? [];

            $bravo = Bravo::create([
                'sender_id'   => $sender->id,
                'receiver_id' => $validated['receiver_id'],
                'badge'       => $validated['badge'],
                'value_id'    => $valueIds[0] ?? null,
                'challenge_id'=> $challenge?->id,
                'message'     => $validated['message'] ?? null,
                'points'      => $points,
            ]);

            // Attacher toutes les valeurs dans la table pivot
            $bravo->values()->sync($valueIds);

            // Déduire du quota mensuel de l'expéditeur
            $sender->monthly_points_given += $points;
            $sender->save();

            // update points utilisateur
            $receiver = User::findOrFail($validated['receiver_id']);
            $receiver->points_total += $points;
            $receiver->save();

            // Requête Inertia (formulaire web) → redirection
            if ($request->hasHeader('X-Inertia')) {
                return redirect()->route('dashboard')
                    ->with('success', 'Bravo envoyé avec succès ! 🎉');
            }

            return response()->json([
                'message' => 'Bravo envoyé avec succès',
                'data' => $bravo->load(['sender', 'receiver', 'values', 'challenge'])
            ]);
        });
    }

    /**
     * Profil utilisateur (bravos reçus)
     */
    public function received($userId)
    {
        $bravos = Bravo::with(['sender', 'values', 'challenge'])
            ->where('receiver_id', $userId)
            ->latest()
            ->paginate(20);

        return response()->json($bravos);
    }

    /**
     * Bravos envoyés
     */
    public function sent($userId)
    {
        $bravos = Bravo::with(['receiver', 'values', 'challenge'])
            ->where('sender_id', $userId)
            ->latest()
            ->paginate(20);

        return response()->json($bravos);
    }

    /**
     * Feed filtré par challenge
     */
    public function byChallenge($challengeId)
    {
        $bravos = Bravo::with(['sender', 'receiver', 'values'])
            ->where('challenge_id', $challengeId)
            ->latest()
            ->paginate(20);

        return response()->json($bravos);
    }
}