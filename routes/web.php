<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AiController;
use App\Http\Controllers\BravoController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\StatsController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ChallengeController;
use App\Models\User;
use Inertia\Inertia;

Route::get('/', [DashboardController::class, 'index'])
    ->middleware(['auth'])
    ->name('home');

// Route::get('/dashboard', fn () => Inertia::render('Dashboard'));
Route::get('/team', fn () => Inertia::render('Team', [
    'users' => User::orderByDesc('points_total')->get(),
]));
Route::get('/history', [BravoController::class, 'history'])->middleware(['auth']);
Route::get('/shop', fn () => Inertia::render('Shop', [
    'userPoints' => (int) auth()->user()?->points_total ?? 0,
]))->middleware(['auth']);
Route::get('/create', [BravoController::class, 'create'])->middleware(['auth']);
Route::get('/stats', [StatsController::class, 'index'])->middleware(['auth']);
Route::get('/challenges', [ChallengeController::class, 'page'])->middleware(['auth']);
Route::post('/challenges', [ChallengeController::class, 'store'])->middleware(['auth']);
Route::post('/challenges/{id}/participate', [ChallengeController::class, 'participate'])->middleware(['auth']);

Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth'])
    ->name('dashboard');
Route::resource('bravos', BravoController::class)->middleware(['auth']);
Route::middleware(['auth'])->group(function () {
    Route::post('/bravos/{bravo}/comments', [CommentController::class, 'store']);
    Route::delete('/bravos/{bravo}/comments/{comment}', [CommentController::class, 'destroy']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
});
Route::post('/ai/rephrase', [AiController::class, 'rephrase'])->middleware(['auth']);
Route::middleware(['auth'])->group(function () {
    Route::get('/admin', [AdminController::class, 'index'])->name('admin');
    Route::patch('/admin/users/{user}/permission', [AdminController::class, 'updatePermission'])->name('admin.users.permission');
});
Route::get('/test', function () {
    return Inertia::render('');
});

require __DIR__.'/settings.php';
