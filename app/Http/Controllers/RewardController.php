<?php

namespace App\Http\Controllers;

use App\Models\Redemption;
use App\Models\Reward;
use App\Models\User;
use App\Notifications\RewardRedemptionOutcome;
use App\Notifications\RewardRedemptionSubmitted;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class RewardController extends Controller
{
    /**
     * Page Boutique — données réelles depuis la DB
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $rewards = Reward::active()
            ->orderBy('cost_points')
            ->get()
            ->map(fn ($r) => [
                'id'          => $r->id,
                'name'        => $r->name,
                'description' => $r->description,
                'category'    => $r->category,
                'cost_points' => $r->cost_points,
                'image_url'   => $r->image_url,
                'stock'       => $r->stock,
                'has_stock'   => $r->hasStock(),
                'affordable'  => $user->points_total >= $r->cost_points,
            ]);

        $redemptions = Redemption::with('reward')
            ->where('user_id', $user->id)
            ->latest()
            ->take(5)
            ->get()
            ->map(fn ($rd) => [
                'id'           => $rd->id,
                'reward_name'  => $rd->reward->name,
                'points_spent' => $rd->points_spent,
                'status'       => $rd->status,
                'created_at'   => $rd->created_at->format('d/m/Y'),
            ]);

        return Inertia::render('Shop', [
            'rewards'     => $rewards,
            'redemptions' => $redemptions,
            'userPoints'  => (int) $user->points_total,
        ]);
    }

    /**
     * Échanger des points contre une récompense (transactionnel)
     */
    public function redeem(Request $request, Reward $reward)
    {
        $user = $request->user();

        if (! $reward->is_active) {
            return response()->json(['message' => 'Cette récompense n\'est plus disponible.'], 422);
        }

        if (! $reward->hasStock()) {
            return response()->json(['message' => 'Cette récompense est épuisée.'], 422);
        }

        if ($user->points_total < $reward->cost_points) {
            return response()->json([
                'message' => "Points insuffisants. Il vous faut {$reward->cost_points} pts, vous en avez {$user->points_total}.",
            ], 422);
        }

        $redemption = DB::transaction(function () use ($user, $reward) {
            // Débit atomique des points
            User::where('id', $user->id)
                ->where('points_total', '>=', $reward->cost_points) // guard contre race condition
                ->decrement('points_total', $reward->cost_points);

            $user->refresh();

            return Redemption::create([
                'user_id'      => $user->id,
                'reward_id'    => $reward->id,
                'points_spent' => $reward->cost_points,
                'status'       => 'pending',
            ]);
        });

        $redemption->load('reward');
        $user->notify(new RewardRedemptionSubmitted($redemption));

        AuditLogger::log(
            'redemption_requested',
            ['reward_id' => $reward->id, 'points_spent' => $redemption->points_spent],
            $user,
            Redemption::class,
            $redemption->id,
            'info',
            'Demande d’échange de récompense.',
        );

        if ($request->hasHeader('X-Inertia')) {
            return redirect()->route('shop')->with('success', "Échange demandé ! Votre demande est en cours de traitement.");
        }

        return response()->json([
            'message'    => 'Échange effectué avec succès.',
            'redemption' => $redemption,
            'new_balance'=> $user->fresh()->points_total,
        ], 201);
    }

    // -------------------------------------------------------------------------
    // Admin CRUD
    // -------------------------------------------------------------------------

    public function store(Request $request)
    {
        $this->authorize('create', Reward::class);

        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'category'    => 'required|in:vouchers,tickets,experiences,equipment',
            'cost_points' => 'required|integer|min:1',
            'image_url'   => 'nullable|url',
            'stock'       => 'nullable|integer|min:1',
            'is_active'   => 'boolean',
        ]);

        $reward = Reward::create($validated);

        AuditLogger::log(
            'reward_created',
            ['name' => $reward->name, 'cost_points' => $reward->cost_points, 'category' => $reward->category],
            $request->user(),
            Reward::class,
            $reward->id,
            'info',
            'Creation d une recompense.',
        );

        return response()->json(['message' => 'Récompense créée.', 'data' => $reward], 201);
    }

    public function update(Request $request, Reward $reward)
    {
        $this->authorize('update', $reward);

        $validated = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'category'    => 'sometimes|in:vouchers,tickets,experiences,equipment',
            'cost_points' => 'sometimes|integer|min:1',
            'image_url'   => 'nullable|url',
            'stock'       => 'nullable|integer|min:1',
            'is_active'   => 'boolean',
        ]);

        $reward->update($validated);

        AuditLogger::log(
            'reward_updated',
            ['changes' => array_keys($validated)],
            $request->user(),
            Reward::class,
            $reward->id,
            'info',
            'Mise a jour d une recompense.',
        );

        return response()->json(['message' => 'Récompense mise à jour.', 'data' => $reward]);
    }

    /**
     * Liste des demandes de récompenses (RH)
     */
    public function redemptions(Request $request)
    {
        $this->authorize('viewAny', Redemption::class);

        $redemptions = Redemption::with(['user', 'reward', 'approvedBy'])
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->latest()
            ->paginate(30);

        return response()->json($redemptions);
    }

    /**
     * Approuver / rejeter une demande (RH)
     */
    public function processRedemption(Request $request, Redemption $redemption)
    {
        $this->authorize('update', $redemption);

        $validated = $request->validate([
            'status' => 'required|in:approved,rejected,delivered',
            'notes'  => 'nullable|string',
        ]);

        if ($validated['status'] === 'rejected' && $redemption->status === 'pending') {
            // Remboursement des points si rejet
            User::where('id', $redemption->user_id)
                ->increment('points_total', $redemption->points_spent);
        }

        $redemption->update([
            'status'      => $validated['status'],
            'notes'       => $validated['notes'] ?? null,
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        $redemption->loadMissing(['user', 'reward']);
        $redemption->user?->notify(new RewardRedemptionOutcome($redemption->fresh(), $validated['status']));

        AuditLogger::log(
            'redemption_processed',
            [
                'status' => $validated['status'],
                'notes'  => $validated['notes'] ?? null,
            ],
            $request->user(),
            Redemption::class,
            $redemption->id,
            $validated['status'] === 'rejected' ? 'warning' : 'info',
            'Traitement RH d’une demande d’échange.',
        );

        return response()->json(['message' => 'Demande mise à jour.', 'data' => $redemption]);
    }
}
