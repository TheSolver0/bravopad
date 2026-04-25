<?php

use App\Models\Challenge;
use App\Models\User;
use Spatie\Permission\Models\Role;

function makeUser(string $role): User
{
    Role::firstOrCreate(['name' => $role]);
    $user = User::factory()->create();
    $user->assignRole($role);
    return $user;
}

function makeChallenge(): Challenge
{
    return Challenge::create([
        'name'       => 'Test Challenge',
        'start_date' => now()->subDay(),
        'end_date'   => now()->addDays(7),
        'status'     => 'active',
        'created_by' => User::factory()->create()->id,
    ]);
}

// ---------------------------------------------------------------------------
// Création de challenge
// ---------------------------------------------------------------------------

it("interdit à un employee de créer un challenge", function () {
    $employee = makeUser('employee');
    $this->actingAs($employee);

    $this->postJson('/api/challenges', [
        'name'       => 'Hack attempt',
        'start_date' => now()->toDateString(),
        'end_date'   => now()->addDays(5)->toDateString(),
    ])->assertStatus(403);
});

it("autorise RH à créer un challenge", function () {
    $hr = makeUser('hr');
    $this->actingAs($hr);

    $this->postJson('/api/challenges', [
        'name'       => 'Q2 Challenge',
        'start_date' => now()->toDateString(),
        'end_date'   => now()->addDays(30)->toDateString(),
    ])->assertStatus(201);
});

it("autorise admin à créer un challenge", function () {
    $admin = makeUser('admin');
    $this->actingAs($admin);

    $this->postJson('/api/challenges', [
        'name'       => 'Admin Challenge',
        'start_date' => now()->toDateString(),
        'end_date'   => now()->addDays(30)->toDateString(),
    ])->assertStatus(201);
});

// ---------------------------------------------------------------------------
// Activation / Clôture de challenge
// ---------------------------------------------------------------------------

it("interdit à un employee d'activer un challenge", function () {
    $employee  = makeUser('employee');
    $challenge = makeChallenge();
    $this->actingAs($employee);

    $this->postJson("/api/challenges/{$challenge->id}/activate")
        ->assertStatus(403);
});

it("interdit à un employee de clôturer un challenge", function () {
    $employee  = makeUser('employee');
    $challenge = makeChallenge();
    $this->actingAs($employee);

    $this->postJson("/api/challenges/{$challenge->id}/finish")
        ->assertStatus(403);
});

it("autorise RH à clôturer un challenge", function () {
    $hr        = makeUser('hr');
    $challenge = makeChallenge();
    $this->actingAs($hr);

    $this->postJson("/api/challenges/{$challenge->id}/finish")
        ->assertStatus(200)
        ->assertJsonFragment(['message' => 'Challenge terminé']);

    expect($challenge->fresh()->status)->toBe('finished');
});

// ---------------------------------------------------------------------------
// Non authentifié
// ---------------------------------------------------------------------------

it("redirige les non-authentifiés sur les routes protégées", function () {
    $this->postJson('/api/challenges', [
        'name'       => 'Hack',
        'start_date' => now()->toDateString(),
        'end_date'   => now()->addDay()->toDateString(),
    ])->assertStatus(401);
});
