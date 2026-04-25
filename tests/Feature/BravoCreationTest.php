<?php

use App\Events\BravoSent;
use App\Models\AppSetting;
use App\Models\Bravo;
use App\Models\BravoValue;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Spatie\Permission\Models\Role;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEmployee(array $attrs = []): User
{
    Role::firstOrCreate(['name' => 'employee']);
    $user = User::factory()->create($attrs);
    $user->assignRole('employee');
    return $user;
}

function makeBravoValue(float $multiplier = 1.0): BravoValue
{
    return BravoValue::create([
        'name'       => fake()->word(),
        'multiplier' => $multiplier,
        'is_active'  => true,
    ]);
}

function seedDefaultSettings(): void
{
    AppSetting::set('base_points_per_bravo', 10, 'int');
    AppSetting::set('max_bravos_per_day', 5, 'int');
    AppSetting::set('max_points_per_day', 500, 'int');
    AppSetting::set('max_same_receiver_per_period', 2, 'int');
    AppSetting::set('same_receiver_window_hours', 24, 'int');
}

// ---------------------------------------------------------------------------
// Calcul des points — serveur uniquement
// ---------------------------------------------------------------------------

it("calcule les points côté serveur selon les multipliers des valeurs", function () {
    seedDefaultSettings();
    $sender   = makeEmployee();
    $receiver = makeEmployee();
    $val1     = makeBravoValue(2.0); // 10 * 2 = 20
    $val2     = makeBravoValue(1.5); // contribue 1.5

    $this->actingAs($sender);

    $response = $this->post('/bravos', [
        'receiver_id' => $receiver->id,
        'value_ids'   => [$val1->id, $val2->id],
        'message'     => 'Super boulot !',
    ]);

    $response->assertStatus(201);

    $bravo = Bravo::first();
    // base 10 × (2.0 + 1.5) = 35
    expect($bravo->points)->toBe(35);
});

it("refuse que le client envoie custom_points", function () {
    seedDefaultSettings();
    $sender   = makeEmployee();
    $receiver = makeEmployee();
    $value    = makeBravoValue(1.0);

    $this->actingAs($sender);

    // Même si on envoie custom_points, la réponse doit ignorer ce champ
    $response = $this->post('/bravos', [
        'receiver_id'  => $receiver->id,
        'value_ids'    => [$value->id],
        'custom_points'=> 9999,
    ]);

    $response->assertStatus(201);
    // Les points ne doivent pas être 9999
    expect(Bravo::first()->points)->toBe(10); // base 10 × multiplier 1
});

// ---------------------------------------------------------------------------
// Règle anti-abus : pas d'auto-attribution
// ---------------------------------------------------------------------------

it("interdit l'auto-attribution de Bravo", function () {
    seedDefaultSettings();
    $user  = makeEmployee();
    $value = makeBravoValue();

    $this->actingAs($user);

    $response = $this->post('/bravos', [
        'receiver_id' => $user->id,
        'value_ids'   => [$value->id],
    ]);

    $response->assertStatus(422)
        ->assertJsonFragment(['error' => 'bravo_rule_violation']);

    expect(Bravo::count())->toBe(0);
});

// ---------------------------------------------------------------------------
// Règle anti-abus : max Bravos/jour
// ---------------------------------------------------------------------------

it("bloque l'envoi au-delà de la limite quotidienne de Bravos", function () {
    seedDefaultSettings();
    AppSetting::set('max_bravos_per_day', 2, 'int');

    $sender   = makeEmployee();
    $receiver = makeEmployee();
    $value    = makeBravoValue();

    $this->actingAs($sender);

    // Premier bravo — OK
    $this->post('/bravos', ['receiver_id' => $receiver->id, 'value_ids' => [$value->id]])
        ->assertStatus(201);

    // Deuxième — OK (limite = 2)
    $this->post('/bravos', ['receiver_id' => $receiver->id, 'value_ids' => [$value->id]])
        ->assertStatus(201);

    // Troisième — BLOQUÉ
    $this->post('/bravos', ['receiver_id' => $receiver->id, 'value_ids' => [$value->id]])
        ->assertStatus(422)
        ->assertJsonFragment(['error' => 'bravo_rule_violation']);

    expect(Bravo::count())->toBe(2);
});

// ---------------------------------------------------------------------------
// Règle anti-abus : budget de points journalier
// ---------------------------------------------------------------------------

it("bloque si le budget de points journalier est dépassé", function () {
    seedDefaultSettings();
    AppSetting::set('max_points_per_day', 15, 'int'); // seulement 15 pts/jour
    AppSetting::set('base_points_per_bravo', 10, 'int');

    $sender   = makeEmployee();
    $receiver = makeEmployee();
    $value    = makeBravoValue(1.0); // 10 pts par bravo

    $this->actingAs($sender);

    // Premier bravo (10 pts) — OK
    $this->post('/bravos', ['receiver_id' => $receiver->id, 'value_ids' => [$value->id]])
        ->assertStatus(201);

    // Deuxième bravo (10 pts) → total 20 > 15 — BLOQUÉ
    $this->post('/bravos', ['receiver_id' => $receiver->id, 'value_ids' => [$value->id]])
        ->assertStatus(422)
        ->assertJsonFragment(['error' => 'bravo_rule_violation']);
});

// ---------------------------------------------------------------------------
// Règle anti-abus : envois répétés vers même personne
// ---------------------------------------------------------------------------

it("bloque les envois trop fréquents vers la même personne", function () {
    seedDefaultSettings();
    AppSetting::set('max_same_receiver_per_period', 1, 'int');

    $sender   = makeEmployee();
    $receiver = makeEmployee();
    $value    = makeBravoValue();

    $this->actingAs($sender);

    $this->post('/bravos', ['receiver_id' => $receiver->id, 'value_ids' => [$value->id]])
        ->assertStatus(201);

    $this->post('/bravos', ['receiver_id' => $receiver->id, 'value_ids' => [$value->id]])
        ->assertStatus(422)
        ->assertJsonFragment(['error' => 'bravo_rule_violation']);
});

it("autorise un Bravo vers une autre personne après avoir atteint la limite sur la première", function () {
    seedDefaultSettings();
    AppSetting::set('max_same_receiver_per_period', 1, 'int');

    $sender    = makeEmployee();
    $receiver1 = makeEmployee();
    $receiver2 = makeEmployee();
    $value     = makeBravoValue();

    $this->actingAs($sender);

    $this->post('/bravos', ['receiver_id' => $receiver1->id, 'value_ids' => [$value->id]])->assertStatus(201);
    $this->post('/bravos', ['receiver_id' => $receiver2->id, 'value_ids' => [$value->id]])->assertStatus(201);
});

// ---------------------------------------------------------------------------
// Mise à jour des points du destinataire
// ---------------------------------------------------------------------------

it("incrémente les points du destinataire après réception d'un Bravo", function () {
    seedDefaultSettings();
    $sender   = makeEmployee();
    $receiver = makeEmployee(['points_total' => 100]);
    $value    = makeBravoValue(1.0); // 10 pts

    $this->actingAs($sender);

    $this->post('/bravos', ['receiver_id' => $receiver->id, 'value_ids' => [$value->id]]);

    expect($receiver->fresh()->points_total)->toBe(110);
});

// ---------------------------------------------------------------------------
// Événement BravoSent dispatché
// ---------------------------------------------------------------------------

it("dispatche l'événement BravoSent lors de la création", function () {
    seedDefaultSettings();
    Event::fake();

    $sender   = makeEmployee();
    $receiver = makeEmployee();
    $value    = makeBravoValue();

    $this->actingAs($sender);

    $this->post('/bravos', ['receiver_id' => $receiver->id, 'value_ids' => [$value->id]]);

    Event::assertDispatched(BravoSent::class);
});

// ---------------------------------------------------------------------------
// Validation des champs
// ---------------------------------------------------------------------------

it("rejette un Bravo sans value_ids", function () {
    seedDefaultSettings();
    $sender   = makeEmployee();
    $receiver = makeEmployee();

    $this->actingAs($sender);

    $this->postJson('/bravos', ['receiver_id' => $receiver->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['value_ids']);
});

it("rejette un receiver_id inexistant", function () {
    seedDefaultSettings();
    $sender = makeEmployee();
    $value  = makeBravoValue();

    $this->actingAs($sender);

    $this->postJson('/bravos', ['receiver_id' => 99999, 'value_ids' => [$value->id]])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['receiver_id']);
});
