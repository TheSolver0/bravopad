<?php

use App\Models\Redemption;
use App\Models\Reward;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::firstOrCreate(['name' => 'employee']);
    Role::firstOrCreate(['name' => 'hr']);
    Role::firstOrCreate(['name' => 'admin']);
});

// ---------------------------------------------------------------------------
// Échange réussi
// ---------------------------------------------------------------------------

it("débite les points de l'utilisateur lors d'un échange réussi", function () {
    $user = User::factory()->create(['points_total' => 1000]);
    $user->assignRole('employee');

    $reward = Reward::factory()->create([
        'cost_points' => 500,
        'is_active'   => true,
        'stock'       => null,
    ]);

    $this->actingAs($user)->postJson("/shop/{$reward->id}/redeem");

    expect($user->fresh()->points_total)->toBe(500);
});

it("crée une demande de remboursement en statut 'pending'", function () {
    $user = User::factory()->create(['points_total' => 500]);
    $user->assignRole('employee');

    $reward = Reward::factory()->create(['cost_points' => 500, 'is_active' => true, 'stock' => null]);

    $this->actingAs($user)->postJson("/shop/{$reward->id}/redeem");

    $this->assertDatabaseHas('redemptions', [
        'user_id'      => $user->id,
        'reward_id'    => $reward->id,
        'points_spent' => 500,
        'status'       => 'pending',
    ]);
});

// ---------------------------------------------------------------------------
// Points insuffisants
// ---------------------------------------------------------------------------

it("rejette l'échange si les points sont insuffisants", function () {
    $user = User::factory()->create(['points_total' => 100]);
    $user->assignRole('employee');

    $reward = Reward::factory()->create(['cost_points' => 500, 'is_active' => true, 'stock' => null]);

    $response = $this->actingAs($user)
        ->postJson("/shop/{$reward->id}/redeem")
        ->assertStatus(422);

    expect($response->json('message'))->toContain('Points insuffisants');

    expect($user->fresh()->points_total)->toBe(100);
    $this->assertDatabaseMissing('redemptions', ['user_id' => $user->id]);
});

// ---------------------------------------------------------------------------
// Récompense épuisée
// ---------------------------------------------------------------------------

it("rejette l'échange si la récompense est épuisée", function () {
    /** @var User $user */
    $user = User::factory()->create(['points_total' => 1000]);
    $user->assignRole('employee');

    $reward = Reward::factory()->create(['cost_points' => 500, 'is_active' => true, 'stock' => 1]);

    // Créer une redemption qui consomme le stock
    Redemption::factory()->create([
        'reward_id'    => $reward->id,
        'points_spent' => 500,
        'status'       => 'pending',
    ]);

    $response = $this->actingAs($user)
        ->postJson("/shop/{$reward->id}/redeem")
        ->assertStatus(422);

    expect($response->json('message'))->toContain('épuisée');
});

// ---------------------------------------------------------------------------
// Récompense inactive
// ---------------------------------------------------------------------------

it("rejette l'échange si la récompense est inactive", function () {
    $user = User::factory()->create(['points_total' => 1000]);
    $user->assignRole('employee');

    $reward = Reward::factory()->create(['cost_points' => 500, 'is_active' => false, 'stock' => null]);

    $this->actingAs($user)
        ->postJson("/shop/{$reward->id}/redeem")
        ->assertStatus(422);
});

// ---------------------------------------------------------------------------
// Guard race condition
// ---------------------------------------------------------------------------

it("ne débite pas les points si la garde atomique échoue", function () {
    $user = User::factory()->create(['points_total' => 100]);
    $user->assignRole('employee');

    $reward = Reward::factory()->create(['cost_points' => 500, 'is_active' => true, 'stock' => null]);

    // Tenter l'échange — devrait échouer à la validation avant même la transaction
    $this->actingAs($user)->postJson("/shop/{$reward->id}/redeem")->assertStatus(422);

    // Les points ne doivent pas avoir changé
    expect($user->fresh()->points_total)->toBe(100);
    $this->assertDatabaseMissing('redemptions', ['user_id' => $user->id]);
});

// ---------------------------------------------------------------------------
// RH : approuver / rejeter une demande
// ---------------------------------------------------------------------------

it("un RH peut approuver une demande en attente", function () {
    $hr = User::factory()->create(['points_total' => 0]);
    $hr->assignRole('hr');

    $employee = User::factory()->create(['points_total' => 0]);
    $employee->assignRole('employee');

    $reward = Reward::factory()->create(['cost_points' => 300, 'is_active' => true]);

    $redemption = Redemption::factory()->create([
        'user_id'      => $employee->id,
        'reward_id'    => $reward->id,
        'points_spent' => 300,
        'status'       => 'pending',
    ]);

    $this->actingAs($hr)
        ->patchJson("/api/rewards/redemptions/{$redemption->id}", ['status' => 'approved'])
        ->assertOk();

    expect($redemption->fresh()->status)->toBe('approved');
});

it("rejeter une demande rembourse les points à l'utilisateur", function () {
    $hr = User::factory()->create(['points_total' => 0]);
    $hr->assignRole('hr');

    $employee = User::factory()->create(['points_total' => 200]);
    $employee->assignRole('employee');

    $reward = Reward::factory()->create(['cost_points' => 300, 'is_active' => true]);

    $redemption = Redemption::factory()->create([
        'user_id'      => $employee->id,
        'reward_id'    => $reward->id,
        'points_spent' => 300,
        'status'       => 'pending',
    ]);

    $this->actingAs($hr)
        ->patchJson("/api/rewards/redemptions/{$redemption->id}", ['status' => 'rejected']);

    expect($employee->fresh()->points_total)->toBe(500); // 200 + 300 remboursés
    expect($redemption->fresh()->status)->toBe('rejected');
});

it("un employé ne peut pas modifier le statut d'une demande", function () {
    $employee = User::factory()->create(['points_total' => 0]);
    $employee->assignRole('employee');

    $reward = Reward::factory()->create(['cost_points' => 100, 'is_active' => true]);

    $redemption = Redemption::factory()->create([
        'user_id'      => $employee->id,
        'reward_id'    => $reward->id,
        'points_spent' => 100,
        'status'       => 'pending',
    ]);

    $this->actingAs($employee)
        ->patchJson("/api/rewards/redemptions/{$redemption->id}", ['status' => 'approved'])
        ->assertStatus(403);
});
