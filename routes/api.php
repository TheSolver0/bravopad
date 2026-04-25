<?php

use App\Http\Controllers\BravoController;
use App\Http\Controllers\BravoInteractionController;
use App\Http\Controllers\ChallengeController;
use App\Http\Controllers\RewardController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {

    // -----------------------------------------------------------------------
    // Bravos — feed + création
    // -----------------------------------------------------------------------
    Route::prefix('bravos')->group(function () {
        Route::get('/', [BravoController::class, 'index']);
        Route::post('/', [BravoController::class, 'store'])->middleware('throttle:10,1');
        Route::get('/users/{id}/received', [BravoController::class, 'received']);
        Route::get('/users/{id}/sent', [BravoController::class, 'sent']);
        Route::get('/challenges/{id}', [BravoController::class, 'byChallenge']);

        // Interactions (like / commentaires)
        Route::post('/{bravo}/like', [BravoInteractionController::class, 'toggleLike']);
        Route::get('/{bravo}/comments', [BravoInteractionController::class, 'comments']);
        Route::post('/{bravo}/comments', [BravoInteractionController::class, 'addComment']);
        Route::delete('/{bravo}/comments/{comment}', [BravoInteractionController::class, 'deleteComment']);
    });

    // -----------------------------------------------------------------------
    // Challenges
    // -----------------------------------------------------------------------
    Route::prefix('challenges')->group(function () {
        Route::get('/', [ChallengeController::class, 'index']);
        Route::get('/active', [ChallengeController::class, 'active']);
        Route::get('/{id}', [ChallengeController::class, 'show']);

        Route::middleware('throttle:30,1')->group(function () {
            Route::post('/', [ChallengeController::class, 'store']);
            Route::post('/{id}/activate', [ChallengeController::class, 'activate']);
            Route::post('/{id}/finish', [ChallengeController::class, 'finish']);
        });
    });

    // -----------------------------------------------------------------------
    // Récompenses (RH admin)
    // -----------------------------------------------------------------------
    Route::prefix('rewards')->group(function () {
        Route::post('/', [RewardController::class, 'store']);
        Route::patch('/{reward}', [RewardController::class, 'update']);
        Route::get('/redemptions', [RewardController::class, 'redemptions']);
        Route::patch('/redemptions/{redemption}', [RewardController::class, 'processRedemption']);
    });
});
