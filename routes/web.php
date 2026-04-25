<?php

use App\Http\Controllers\AdminConfigController;
use App\Http\Controllers\AiController;
use App\Http\Controllers\BravoController;
use App\Http\Controllers\ChallengeController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HrDashboardController;
use App\Http\Controllers\RewardController;
use App\Http\Controllers\StatsController;
use App\Models\User;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth'])->group(function () {

    // Dashboard
    Route::get('/', [DashboardController::class, 'index'])->name('home');
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Bravo creation
    Route::get('/create', [BravoController::class, 'create']);
    Route::post('/bravos', [BravoController::class, 'store'])->name('bravos.store');
    Route::get('/history', [BravoController::class, 'history']);

    // IA
    Route::post('/ai/rephrase', [AiController::class, 'rephrase']);

    // Stats
    Route::get('/stats', [StatsController::class, 'index']);

    // Boutique (récompenses persistantes)
    Route::get('/shop', [RewardController::class, 'index'])->name('shop');
    Route::post('/shop/{reward}/redeem', [RewardController::class, 'redeem'])->name('shop.redeem');

    // Dashboard RH — managers, RH, admin
    Route::get('/hr/dashboard', [HrDashboardController::class, 'index'])->name('hr.dashboard');
    Route::get('/hr/dashboard/export', [HrDashboardController::class, 'export'])->name('hr.dashboard.export');

    // Admin configuration — RH, admin
    Route::get('/admin/config', [AdminConfigController::class, 'index'])->name('admin.config');
    Route::post('/admin/config/settings', [AdminConfigController::class, 'updateSettings']);
    Route::post('/admin/config/bravo-values', [AdminConfigController::class, 'createBravoValue']);
    Route::patch('/admin/config/bravo-values/{bravoValue}', [AdminConfigController::class, 'updateBravoValue']);
    Route::patch('/admin/config/bravo-values/{bravoValue}/toggle', [AdminConfigController::class, 'toggleBravoValue']);

});

// Pages accessibles sans auth
Route::get('/team', function () {
    $users = User::orderByDesc('points_total')->paginate(15)->withQueryString();

    return Inertia::render('Team', [
        'users'      => $users->items(),
        'pagination' => [
            'current_page' => $users->currentPage(),
            'last_page'    => $users->lastPage(),
            'per_page'     => $users->perPage(),
            'total'        => $users->total(),
        ],
    ]);
})->middleware(['auth']);

Route::get('/challenges', [ChallengeController::class, 'page']);

require __DIR__ . '/settings.php';
