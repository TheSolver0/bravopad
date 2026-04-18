<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\BravoController;
use App\Http\Controllers\ChallengeController;

Route::prefix('bravos')->group(function () {

    // Feed global (réseau social)
    Route::get('/', [BravoController::class, 'index']);

    // Création d'un bravo
    Route::post('/', [BravoController::class, 'store']);

    // Bravos reçus par un utilisateur
    Route::get('/users/{id}/received', [BravoController::class, 'received']);

    // Bravos envoyés par un utilisateur
    Route::get('/users/{id}/sent', [BravoController::class, 'sent']);

    // Bravos filtrés par challenge
    Route::get('/challenges/{id}', [BravoController::class, 'byChallenge']);
});
Route::prefix('challenges')->group(function () {

    Route::get('/', [ChallengeController::class, 'index']);
    Route::post('/', [ChallengeController::class, 'store']);

    Route::get('/active', [ChallengeController::class, 'active']);

    Route::get('/{id}', [ChallengeController::class, 'show']);

    Route::post('/{id}/activate', [ChallengeController::class, 'activate']);
    Route::post('/{id}/finish', [ChallengeController::class, 'finish']);
});