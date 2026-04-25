<?php

namespace App\Http\Controllers;

use App\Events\BravoSent;
use App\Exceptions\BravoRuleException;
use App\Models\Bravo;
use App\Models\BravoValue;
use App\Models\Challenge;
use App\Models\User;
use App\Services\BravoPolicyService;
use App\Services\BravoPointsService;
use App\Services\Insights\BravoInsightsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class BravoController extends Controller
{
    public function __construct(
        private readonly BravoPointsService $pointsService,
        private readonly BravoPolicyService $policyService,
    ) {}

    /**
     * Feed global (API JSON, paginé)
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
     * Page Inertia /create
     */
    public function create(Request $request, BravoInsightsService $insightsService)
    {
        return Inertia::render('CreateBravo', [
            'users'         => User::query()->where('is_automation', false)->orderBy('name')->get(),
            'bravoValues'   => BravoValue::where('is_active', true)->get(),
            'bravoInsights' => $insightsService->forSender($request->user()),
        ]);
    }

    /**
     * Crée un Bravo — calcul points serveur + règles anti-abus
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'receiver_id' => 'required|exists:users,id',
            'value_ids'   => 'required|array|min:1',
            'value_ids.*' => 'exists:bravo_values,id',
            'message'     => 'nullable|string|max:1000',
        ]);

        $sender     = $request->user();
        $receiverId = (int) $validated['receiver_id'];
        $points     = $this->pointsService->calculate($validated['value_ids']);

        // Valide toutes les règles anti-abus (lance BravoRuleException si violation)
        $this->policyService->validate($sender, $receiverId, $points);

        return DB::transaction(function () use ($validated, $sender, $receiverId, $points, $request) {

            $primaryValue = BravoValue::findOrFail($validated['value_ids'][0]);

            $activeChallenge = Challenge::where('status', 'active')
                ->where('start_date', '<=', now())
                ->where('end_date', '>=', now())
                ->first();

            $bravo = Bravo::create([
                'sender_id'    => $sender->id,
                'receiver_id'  => $receiverId,
                'value_id'     => $primaryValue->id,
                'challenge_id' => $activeChallenge?->id,
                'message'      => $validated['message'] ?? null,
                'points'       => $points,
            ]);

            $bravo->values()->sync($validated['value_ids']);

            // Mise à jour points du destinataire
            User::where('id', $receiverId)->increment('points_total', $points);

            // Émet l'événement (notifications)
            event(new BravoSent($bravo->load(['sender', 'receiver', 'values'])));

            if ($request->hasHeader('X-Inertia')) {
                return redirect()->route('dashboard')
                    ->with('success', 'Bravo envoyé avec succès !');
            }

            return response()->json([
                'message' => 'Bravo envoyé avec succès',
                'data'    => $bravo,
            ], 201);
        });
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
                'sender'      => $b->sender   ? ['id' => $b->sender->id,   'name' => $b->sender->name,   'avatar' => $b->sender->avatar]   : null,
                'receiver'    => $b->receiver ? ['id' => $b->receiver->id, 'name' => $b->receiver->name, 'avatar' => $b->receiver->avatar] : null,
                'values'      => $b->values->map(fn ($v) => ['id' => $v->id, 'name' => $v->name, 'color' => $v->color])->values(),
            ]);

        $user        = $request->user();
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

    /**
     * Bravos reçus par un utilisateur (API)
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
     * Bravos envoyés par un utilisateur (API)
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
     * Feed filtré par challenge (API)
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
