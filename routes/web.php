<?php

use App\Http\Controllers\AdminConfigController;
use App\Http\Controllers\AdminRolesController;
use App\Http\Controllers\AdminUsersController;
use App\Http\Controllers\AiController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\BravoController;
use App\Http\Controllers\ChallengeController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EngagementController;
use App\Http\Controllers\HrDashboardController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\NotificationCenterController;
use App\Http\Controllers\RewardController;
use App\Http\Controllers\StatsController;
use App\Models\Department;
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

    // Admin — gestion des récompenses (boutique)
    Route::post('/admin/rewards', [RewardController::class, 'store'])->name('admin.rewards.store');
    Route::patch('/admin/rewards/{reward}', [RewardController::class, 'update'])->name('admin.rewards.update');
    Route::patch('/admin/rewards/{reward}/toggle', [RewardController::class, 'toggleActive'])->name('admin.rewards.toggle');
    Route::delete('/admin/rewards/{reward}', [RewardController::class, 'destroy'])->name('admin.rewards.destroy');

    Route::get('/admin/users', [AdminUsersController::class, 'index'])->name('admin.users.index');
    Route::patch('/admin/users/{user}', [AdminUsersController::class, 'update'])->name('admin.users.update');

    Route::get('/admin/roles', [AdminRolesController::class, 'index'])->name('admin.roles.index');
    Route::patch('/admin/roles/{role}', [AdminRolesController::class, 'update'])->name('admin.roles.update');

    Route::get('/notifications', [NotificationCenterController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/read-all', [NotificationCenterController::class, 'markAllRead'])->name('notifications.read-all');
    Route::post('/notifications/{id}/read', [NotificationCenterController::class, 'markRead'])->name('notifications.read');

    Route::get('/engagement', [EngagementController::class, 'index'])->name('engagement.index');
    Route::post('/engagement/vote', [EngagementController::class, 'vote'])->name('engagement.vote');
    Route::post('/engagement/surveys/{survey}/responses', [EngagementController::class, 'respondSurvey'])->name('engagement.surveys.respond');

    // Admin — gestion des sondages RH (HR uniquement)
    Route::get('/admin/surveys', [EngagementController::class, 'adminSurveys'])->name('admin.surveys.index');
    Route::post('/admin/surveys', [EngagementController::class, 'createSurvey'])->name('admin.surveys.create');
    Route::patch('/admin/surveys/{survey}/toggle', [EngagementController::class, 'toggleSurvey'])->name('admin.surveys.toggle');
    Route::delete('/admin/surveys/{survey}', [EngagementController::class, 'destroySurvey'])->name('admin.surveys.destroy');
    Route::get('/admin/surveys/{survey}/export', [EngagementController::class, 'exportSurvey'])->name('admin.surveys.export');

    Route::get('/audit', [AuditLogController::class, 'index'])->name('audit.index');

    Route::get('/team', function () {
        $users = User::query()
            ->where('is_automation', false)
            ->with('department:id,name')
            ->orderByDesc('points_total')
            ->paginate(15)
            ->withQueryString();

        $departments = Department::orderBy('name')->pluck('name');

        return Inertia::render('Team', [
            'users'       => $users->map(fn ($u) => [
                'id'           => $u->id,
                'name'         => $u->name,
                'role'         => $u->role,
                'department'   => $u->department?->name,
                'avatar'       => $u->avatar,
                'points_total' => $u->points_total,
            ]),
            'departments' => $departments,
            'pagination'  => [
                'current_page' => $users->currentPage(),
                'last_page'    => $users->lastPage(),
                'per_page'     => $users->perPage(),
                'total'        => $users->total(),
            ],
        ]);
    })->name('team');
});

Route::get('/challenges', [ChallengeController::class, 'page'])->middleware(['auth']);
Route::post('/challenges', [ChallengeController::class, 'store'])->middleware(['auth']);
Route::post('/challenges/{id}/participate', [ChallengeController::class, 'participate'])->middleware(['auth']);
Route::get('/challenges/{id}/media', [ChallengeController::class, 'getMedia'])->middleware(['auth']);
Route::post('/challenges/{id}/media', [ChallengeController::class, 'uploadMedia'])->middleware(['auth']);
Route::delete('/challenge-media/{mediaId}', [ChallengeController::class, 'deleteMedia'])->middleware(['auth']);

// Admin — gestion des défis (HR/Admin uniquement)
Route::middleware(['auth'])->group(function () {
    Route::get('/admin/challenges', [ChallengeController::class, 'adminPage'])->name('admin.challenges.index');
    Route::post('/admin/challenges', [ChallengeController::class, 'adminStore'])->name('admin.challenges.store');
    Route::patch('/admin/challenges/{id}', [ChallengeController::class, 'update'])->name('admin.challenges.update');
    Route::delete('/admin/challenges/{id}', [ChallengeController::class, 'destroy'])->name('admin.challenges.destroy');
    Route::post('/admin/challenges/{id}/activate', [ChallengeController::class, 'activate'])->name('admin.challenges.activate');
    Route::post('/admin/challenges/{id}/finish', [ChallengeController::class, 'finish'])->name('admin.challenges.finish');
});

Route::middleware(['auth'])->group(function () {
    Route::post('/bravos/{bravo}/comments', [CommentController::class, 'store']);
    Route::delete('/bravos/{bravo}/comments/{comment}', [CommentController::class, 'destroy']);
    Route::get('/admin', [AdminController::class, 'index'])->name('admin');
    Route::patch('/admin/users/{user}/permission', [AdminController::class, 'updatePermission'])->name('admin.users.permission');
});

require __DIR__ . '/settings.php';
