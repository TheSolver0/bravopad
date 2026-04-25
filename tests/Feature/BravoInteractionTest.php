<?php

use App\Models\Bravo;
use App\Models\BravoComment;
use App\Models\BravoLike;
use App\Models\BravoValue;
use App\Models\User;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::firstOrCreate(['name' => 'employee']);
    Role::firstOrCreate(['name' => 'admin']);
    Role::firstOrCreate(['name' => 'hr']);
});

function makeBravo(): Bravo
{
    $sender   = User::factory()->create();
    $receiver = User::factory()->create();
    $value    = BravoValue::factory()->create();

    return Bravo::factory()->create([
        'sender_id'   => $sender->id,
        'receiver_id' => $receiver->id,
        'points'      => 10,
        'likes_count' => 0,
    ]);
}

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------

it("un utilisateur peut liker un bravo", function () {
    $user  = User::factory()->create();
    $user->assignRole('employee');
    $bravo = makeBravo();

    $this->actingAs($user)
        ->postJson("/api/bravos/{$bravo->id}/like")
        ->assertOk()
        ->assertJson(['liked' => true, 'likes_count' => 1]);

    $this->assertDatabaseHas('bravo_likes', ['bravo_id' => $bravo->id, 'user_id' => $user->id]);
});

it("un deuxième like retire le like (toggle)", function () {
    $user  = User::factory()->create();
    $user->assignRole('employee');
    $bravo = makeBravo();

    BravoLike::create(['bravo_id' => $bravo->id, 'user_id' => $user->id]);
    $bravo->increment('likes_count');

    $this->actingAs($user)
        ->postJson("/api/bravos/{$bravo->id}/like")
        ->assertOk()
        ->assertJson(['liked' => false, 'likes_count' => 0]);

    $this->assertDatabaseMissing('bravo_likes', ['bravo_id' => $bravo->id, 'user_id' => $user->id]);
});

it("deux utilisateurs différents peuvent liker le même bravo", function () {
    $userA = User::factory()->create();
    $userA->assignRole('employee');
    $userB = User::factory()->create();
    $userB->assignRole('employee');
    $bravo = makeBravo();

    $this->actingAs($userA)->postJson("/api/bravos/{$bravo->id}/like");
    $this->actingAs($userB)->postJson("/api/bravos/{$bravo->id}/like");

    expect(BravoLike::where('bravo_id', $bravo->id)->count())->toBe(2);
    expect($bravo->fresh()->likes_count)->toBe(2);
});

it("un utilisateur non connecté ne peut pas liker", function () {
    $bravo = makeBravo();

    $this->postJson("/api/bravos/{$bravo->id}/like")->assertUnauthorized();
});

// ---------------------------------------------------------------------------
// Commentaires — lecture
// ---------------------------------------------------------------------------

it("on peut lire les commentaires d'un bravo", function () {
    $user  = User::factory()->create();
    $user->assignRole('employee');
    $bravo = makeBravo();

    BravoComment::create(['bravo_id' => $bravo->id, 'user_id' => $user->id, 'content' => 'Super !']);

    $this->actingAs($user)
        ->getJson("/api/bravos/{$bravo->id}/comments")
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonFragment(['content' => 'Super !']);
});

// ---------------------------------------------------------------------------
// Commentaires — ajout
// ---------------------------------------------------------------------------

it("un utilisateur connecté peut ajouter un commentaire", function () {
    $user  = User::factory()->create();
    $user->assignRole('employee');
    $bravo = makeBravo();

    $this->actingAs($user)
        ->postJson("/api/bravos/{$bravo->id}/comments", ['content' => 'Bravo mérité !'])
        ->assertStatus(201)
        ->assertJsonFragment(['content' => 'Bravo mérité !']);

    $this->assertDatabaseHas('bravo_comments', [
        'bravo_id' => $bravo->id,
        'user_id'  => $user->id,
        'content'  => 'Bravo mérité !',
    ]);
});

it("un commentaire vide est rejeté", function () {
    $user  = User::factory()->create();
    $user->assignRole('employee');
    $bravo = makeBravo();

    $this->actingAs($user)
        ->postJson("/api/bravos/{$bravo->id}/comments", ['content' => ''])
        ->assertStatus(422);
});

it("un commentaire trop long est rejeté", function () {
    $user  = User::factory()->create();
    $user->assignRole('employee');
    $bravo = makeBravo();

    $this->actingAs($user)
        ->postJson("/api/bravos/{$bravo->id}/comments", ['content' => str_repeat('a', 501)])
        ->assertStatus(422);
});

// ---------------------------------------------------------------------------
// Commentaires — suppression
// ---------------------------------------------------------------------------

it("l'auteur peut supprimer son propre commentaire", function () {
    $user    = User::factory()->create();
    $user->assignRole('employee');
    $bravo   = makeBravo();
    $comment = BravoComment::create(['bravo_id' => $bravo->id, 'user_id' => $user->id, 'content' => 'Test']);

    $this->actingAs($user)
        ->deleteJson("/api/bravos/{$bravo->id}/comments/{$comment->id}")
        ->assertOk();

    $this->assertSoftDeleted('bravo_comments', ['id' => $comment->id]);
});

it("un admin peut supprimer n'importe quel commentaire", function () {
    $admin   = User::factory()->create();
    $admin->assignRole('admin');
    $author  = User::factory()->create();
    $author->assignRole('employee');
    $bravo   = makeBravo();
    $comment = BravoComment::create(['bravo_id' => $bravo->id, 'user_id' => $author->id, 'content' => 'Commentaire']);

    $this->actingAs($admin)
        ->deleteJson("/api/bravos/{$bravo->id}/comments/{$comment->id}")
        ->assertOk();

    $this->assertSoftDeleted('bravo_comments', ['id' => $comment->id]);
});

it("un utilisateur ne peut pas supprimer le commentaire d'un autre", function () {
    $userA   = User::factory()->create();
    $userA->assignRole('employee');
    $userB   = User::factory()->create();
    $userB->assignRole('employee');
    $bravo   = makeBravo();
    $comment = BravoComment::create(['bravo_id' => $bravo->id, 'user_id' => $userA->id, 'content' => 'Test']);

    $this->actingAs($userB)
        ->deleteJson("/api/bravos/{$bravo->id}/comments/{$comment->id}")
        ->assertStatus(403);

    $this->assertDatabaseHas('bravo_comments', ['id' => $comment->id, 'deleted_at' => null]);
});

it("un utilisateur non connecté ne peut pas commenter", function () {
    $bravo = makeBravo();

    $this->postJson("/api/bravos/{$bravo->id}/comments", ['content' => 'Intrus'])
        ->assertUnauthorized();
});
