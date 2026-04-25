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
                'values'   => $b->values->map(fn ($v) => ['id' => $v->id, 'name' => $v->name, 'color' => $v->color])->values(),
            ]);

        $user = $request->user();

        $pointsGiven = Bravo::where('sender_id', $userId)->sum('points');

        return Inertia::render('History', [
            'bravos'        => $bravos,
            'currentUserId' => $userId,
            'currentUser'   => [
                'id'           => $user->id,
                'name'         => $user->name,
                'avatar'       => $user->avatar,
                'department'   => $user->department,
                'role'         => $user->role,
                'points_total' => $user->points_total,
            ],
            'pointsGiven'   => (int) $pointsGiven,
        ]);
    }

    public function create()
    {
        return Inertia::render('CreateBravo', [
            'users' => User::all(),
            'bravoValues' => BravoValue::where('is_active', true)->get(),
        ]);
    }

    /**
     * Créer un bravo (Kudos)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'receiver_id'  => 'required|exists:users,id',
            'value_ids'    => 'required|array|min:1',
            'value_ids.*'  => 'exists:bravo_values,id',
            'custom_points'=> 'required|integer|min:1|max:1000',
            'message'      => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated, $request) {

            $sender = $request->user();

            // Primary value (first selected) stored in the FK column
            $primaryValue = BravoValue::findOrFail($validated['value_ids'][0]);

            $points = $validated['custom_points'];

            // challenge actif (global)
            $challenge = Challenge::where('status', 'active')
                ->where('start_date', '<=', now())
                ->where('end_date', '>=', now())
                ->first();

            $bravo = Bravo::create([
                'sender_id'   => $sender->id,
                'receiver_id' => $validated['receiver_id'],
                'value_id'    => $primaryValue->id,
                'challenge_id'=> $challenge?->id,
                'message'     => $validated['message'] ?? null,
                'points'      => $points,
            ]);

            // Attacher toutes les valeurs dans la table pivot
            $bravo->values()->sync($validated['value_ids']);

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