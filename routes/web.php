<?php

use App\Http\Controllers\AdminConfigController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AdminEvenementController;
use App\Http\Controllers\AdminEventContributionNotificationsController;
use App\Http\Controllers\AdminRolesController;
use App\Http\Controllers\AdminUsersController;
use App\Http\Controllers\AgendaController;
use App\Http\Controllers\AiController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\BravoController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\ChallengeController;
use App\Http\Controllers\ChatbotController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EngagementController;
use App\Http\Controllers\EvenementPublicController;
use App\Http\Controllers\EventContributionController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\HrDashboardController;
use App\Http\Controllers\MessengerController;
use App\Http\Controllers\NotificationCenterController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\RewardController;
use App\Http\Controllers\StatsController;
use App\Http\Controllers\StoryController;
use App\Http\Controllers\UserProfileController;
use App\Models\Direction;
use App\Models\User;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::post('/media/livekit/webhooks', [MessengerController::class, 'livekitWebhook'])->name('media.livekit.webhooks');

Route::middleware(['auth'])->group(function () {

    // Dashboard
    Route::get('/', fn () => redirect()->route('feed'))->name('home');
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/messages', fn () => Inertia::render('Messages'))->name('messages.index');

    // Stories
    Route::get('/stories', [StoryController::class, 'index'])->name('stories.index');
    Route::post('/stories', [StoryController::class, 'store'])->name('stories.store');
    Route::delete('/stories/{story}', [StoryController::class, 'destroy'])->name('stories.destroy');
    Route::post('/stories/{story}/view', [StoryController::class, 'markViewed'])->name('stories.view');

    // Fil social — Posts & Actualités
    Route::get('/feed', [PostController::class, 'index'])->name('feed');
    Route::post('/posts', [PostController::class, 'store'])->name('posts.store');
    Route::post('/posts/{post}/republish', [PostController::class, 'republish'])->name('posts.republish');
    Route::put('/posts/{post}', [PostController::class, 'update'])->name('posts.update');
    Route::delete('/posts/{post}', [PostController::class, 'destroy'])->name('posts.destroy');
    Route::post('/posts/{post}/like', [PostController::class, 'like'])->name('posts.like');
    Route::post('/posts/{post}/comments', [PostController::class, 'storeComment'])->name('posts.comments.store');
    Route::delete('/posts/{post}/comments/{comment}', [PostController::class, 'destroyComment'])->name('posts.comments.destroy');

    // Bravo creation
    Route::get('/create', [BravoController::class, 'create']);
    Route::post('/bravos', [BravoController::class, 'store'])->name('bravos.store');
    Route::get('/history', [BravoController::class, 'history']);

    // IA
    Route::post('/ai/rephrase', [AiController::class, 'rephrase']);

    // Chatbot documentaire
    Route::post('/chatbot/ask', [ChatbotController::class, 'ask']);
    Route::get('/chatbot/history', [ChatbotController::class, 'history']);
    Route::delete('/chatbot/clear', [ChatbotController::class, 'clear']);

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
    Route::post('/admin/users', [AdminUsersController::class, 'store'])->name('admin.users.store');
    Route::patch('/admin/users/{user}', [AdminUsersController::class, 'update'])->name('admin.users.update');
    Route::delete('/admin/users/{user}', [AdminUsersController::class, 'destroy'])->name('admin.users.destroy');

    Route::get('/admin/roles', [AdminRolesController::class, 'index'])->name('admin.roles.index');
    Route::patch('/admin/roles/{role}', [AdminRolesController::class, 'update'])->name('admin.roles.update');
    Route::get('/admin/event-contributions/notifications', [AdminEventContributionNotificationsController::class, 'index'])
        ->name('admin.event-contributions.notifications.index');
    Route::get('/admin/event-contributions/notifications/export', [AdminEventContributionNotificationsController::class, 'export'])
        ->name('admin.event-contributions.notifications.export');

    Route::get('/notifications', [NotificationCenterController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/read-all', [NotificationCenterController::class, 'markAllRead'])->name('notifications.read-all');
    Route::post('/notifications/{id}/read', [NotificationCenterController::class, 'markRead'])->name('notifications.read');

    Route::prefix('messenger')->name('messenger.')->group(function () {
        Route::get('/conversations', [MessengerController::class, 'conversations'])->name('conversations.index');
        Route::get('/calls', [MessengerController::class, 'calls'])->name('calls.index');
        Route::get('/users', [MessengerController::class, 'users'])->name('users.index');
        Route::post('/presence/heartbeat', [MessengerController::class, 'heartbeat'])->name('presence.heartbeat');
        Route::post('/conversations/direct', [MessengerController::class, 'direct'])->name('conversations.direct');
        Route::post('/conversations/groups', [MessengerController::class, 'group'])->name('conversations.groups.store');
        Route::patch('/conversations/{conversation}/group', [MessengerController::class, 'updateGroup'])->name('conversations.groups.update');
        Route::post('/conversations/{conversation}/members', [MessengerController::class, 'addMembers'])->name('conversations.members.store');
        Route::delete('/conversations/{conversation}/members/{member}', [MessengerController::class, 'removeMember'])->name('conversations.members.destroy');
        Route::delete('/conversations/{conversation}', [MessengerController::class, 'deleteConversation'])->name('conversations.destroy');
        Route::get('/conversations/{conversation}/messages', [MessengerController::class, 'messages'])->name('conversations.messages');
        Route::post('/conversations/{conversation}/messages', [MessengerController::class, 'sendMessage'])->name('conversations.messages.store');
        Route::patch('/conversations/{conversation}/messages/{message}', [MessengerController::class, 'updateMessage'])->name('conversations.messages.update');
        Route::delete('/conversations/{conversation}/messages/{message}', [MessengerController::class, 'deleteMessage'])->name('conversations.messages.destroy');
        Route::post('/conversations/{conversation}/messages/{message}/like', [MessengerController::class, 'toggleMessageLike'])->name('conversations.messages.like');
        Route::post('/conversations/{conversation}/read', [MessengerController::class, 'markRead'])->name('conversations.read');
        Route::get('/conversations/{conversation}/calls', [MessengerController::class, 'conversationCalls'])->name('conversations.calls.index');
        Route::post('/conversations/{conversation}/calls', [MessengerController::class, 'startCall'])->name('conversations.calls.store');
        Route::patch('/conversations/{conversation}/calls/{call}', [MessengerController::class, 'updateCall'])->name('conversations.calls.update');
        Route::post('/calls/{call}/join-token', [MessengerController::class, 'joinCallToken'])->name('calls.join-token');
        Route::patch('/calls/{call}/recording-consent', [MessengerController::class, 'updateRecordingConsent'])->name('calls.recording-consent');
        Route::post('/calls/{call}/recordings', [MessengerController::class, 'startRecording'])->name('calls.recordings.store');
        Route::patch('/calls/{call}/recordings/{recording}', [MessengerController::class, 'updateRecording'])->name('calls.recordings.update');
        Route::get('/calls/{call}/events', [MessengerController::class, 'callEvents'])->name('calls.events');
    });

    Route::get('/engagement', [EngagementController::class, 'index'])->name('engagement.index');
    Route::post('/engagement/vote', [EngagementController::class, 'vote'])->name('engagement.vote');
    Route::post('/engagement/surveys/{survey}/responses', [EngagementController::class, 'respondSurvey'])->name('engagement.surveys.respond');

    Route::get('/event-contributions', [EventContributionController::class, 'index'])->name('event-contributions.index');
    Route::get('/event-contributions/export', [EventContributionController::class, 'export'])->name('event-contributions.export');
    Route::get('/event-contributions/{contribution}/export/excel', [EventContributionController::class, 'exportDetailExcel'])->name('event-contributions.detail.export.excel');
    Route::get('/event-contributions/{contribution}/export/pdf', [EventContributionController::class, 'exportDetailPdf'])->name('event-contributions.detail.export.pdf');
    Route::get('/event-contributions/{contribution}', [EventContributionController::class, 'show'])->name('event-contributions.show');
    Route::post('/event-contributions', [EventContributionController::class, 'store'])->name('event-contributions.store');
    Route::patch('/event-contributions/{contribution}', [EventContributionController::class, 'update'])->name('event-contributions.update');
    Route::delete('/event-contributions/{contribution}', [EventContributionController::class, 'destroy'])->name('event-contributions.destroy');
    Route::post('/event-contributions/{contribution}/contribute', [EventContributionController::class, 'contribute'])->name('event-contributions.contribute');
    Route::post('/event-contributions/{contribution}/manual', [EventContributionController::class, 'recordManualContribution'])->name('event-contributions.manual');

    // Admin — gestion des sondages RH (HR uniquement)
    Route::get('/admin/surveys', [EngagementController::class, 'adminSurveys'])->name('admin.surveys.index');
    Route::get('/admin/surveys/templates', [EngagementController::class, 'getTemplates'])->name('admin.surveys.templates');
    Route::post('/admin/surveys/generate', [EngagementController::class, 'generateSurvey'])->name('admin.surveys.generate');
    Route::post('/admin/surveys/sample', [EngagementController::class, 'calculateSample'])->name('admin.surveys.sample');
    Route::get('/admin/surveys/create', [EngagementController::class, 'surveyCreatePage'])->name('admin.surveys.create.page');
    Route::post('/admin/surveys', [EngagementController::class, 'createSurvey'])->name('admin.surveys.create');
    Route::get('/admin/surveys/{survey}/edit', [EngagementController::class, 'surveyEditPage'])->name('admin.surveys.edit.page');
    Route::put('/admin/surveys/{survey}', [EngagementController::class, 'updateSurvey'])->name('admin.surveys.update');
    Route::get('/admin/surveys/{survey}/preview', [EngagementController::class, 'surveyPreview'])->name('admin.surveys.preview');
    Route::patch('/admin/surveys/{survey}/toggle', [EngagementController::class, 'toggleSurvey'])->name('admin.surveys.toggle');
    Route::delete('/admin/surveys/{survey}', [EngagementController::class, 'destroySurvey'])->name('admin.surveys.destroy');
    Route::get('/admin/surveys/{survey}/export', [EngagementController::class, 'exportSurvey'])->name('admin.surveys.export');
    Route::get('/admin/surveys/{survey}/report', [EngagementController::class, 'surveyReport'])->name('admin.surveys.report');

    Route::get('/audit', [AuditLogController::class, 'index'])->name('audit.index');

    // Événements organisationnels — admin
    Route::get('/admin/evenements', [AdminEvenementController::class, 'index'])->name('admin.evenements.index');
    Route::post('/admin/evenements', [AdminEvenementController::class, 'store'])->name('admin.evenements.store');
    Route::get('/admin/evenements/{evenement}', [AdminEvenementController::class, 'dashboard'])->name('admin.evenements.dashboard');
    Route::put('/admin/evenements/{evenement}', [AdminEvenementController::class, 'update'])->name('admin.evenements.update');
    Route::delete('/admin/evenements/{evenement}', [AdminEvenementController::class, 'destroy'])->name('admin.evenements.destroy');
    Route::patch('/admin/evenements/{evenement}/statut', [AdminEvenementController::class, 'updateStatut'])->name('admin.evenements.statut');
    Route::post('/admin/evenements/{evenement}/posts', [AdminEvenementController::class, 'storePost'])->name('admin.evenements.posts.store');
    Route::delete('/admin/evenements/{evenement}/posts/{post}', [AdminEvenementController::class, 'destroyPost'])->name('admin.evenements.posts.destroy');

    // ── Agenda professionnel ──────────────────────────────────────────────────
    Route::prefix('agenda')->name('agenda.')->group(function () {
        // Dashboard principal
        Route::get('/', [AgendaController::class, 'index'])->name('index');

        // Événements (API JSON)
        Route::get('/events', [EventController::class, 'index'])->name('events.index');
        Route::post('/events', [EventController::class, 'store'])->name('events.store');
        Route::put('/events/{event}', [EventController::class, 'update'])->name('events.update');
        Route::delete('/events/{event}', [EventController::class, 'destroy'])->name('events.destroy');
        Route::post('/events/{event}/rsvp', [EventController::class, 'rsvp'])->name('events.rsvp');
        Route::post('/events/{event}/checkin', [EventController::class, 'checkIn'])->name('events.checkin');
        Route::get('/free-slots', [EventController::class, 'freeSlots'])->name('free-slots');

        // Calendriers (API JSON)
        Route::get('/calendars', [CalendarController::class, 'index'])->name('calendars.index');
        Route::post('/calendars', [CalendarController::class, 'store'])->name('calendars.store');
        Route::put('/calendars/{calendar}', [CalendarController::class, 'update'])->name('calendars.update');
        Route::delete('/calendars/{calendar}', [CalendarController::class, 'destroy'])->name('calendars.destroy');
        Route::post('/calendars/{calendar}/members', [CalendarController::class, 'addMember'])->name('calendars.members.add');
        Route::delete('/calendars/{calendar}/members', [CalendarController::class, 'removeMember'])->name('calendars.members.remove');
    });

    // Profil public (bureau)
    Route::get('/users/{user}', [UserProfileController::class, 'show'])->name('users.show');
    Route::post('/users/{user}/follow', [UserProfileController::class, 'follow'])->name('users.follow');

    Route::get('/team', function () {
        $authUser = auth()->user();

        $users = User::query()
            ->where('is_automation', false)
            ->with(['direction:id,name', 'department:id,name'])
            ->orderByDesc('points_total')
            ->paginate(15)
            ->withQueryString();

        $departments = Direction::orderBy('code')->pluck('code');
        $followingIds = $authUser ? $authUser->following()->pluck('users.id')->toArray() : [];

        return Inertia::render('Team', [
            'users' => $users->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'role' => $u->role,
                'department' => $u->direction?->code ?? $u->direction?->name ?? $u->department?->name,
                'avatar' => $u->avatar,
                'points_total' => $u->points_total,
            ]),
            'departments' => $departments,
            'followingIds' => $followingIds,
            'authUserId' => $authUser?->id,
            'pagination' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    })->name('team');
});

// Sondages RH — accessibles sans compte (réponse libre)
Route::get('/surveys/{token}', [EngagementController::class, 'showSurvey'])->name('surveys.show');
Route::post('/surveys/{token}/respond', [EngagementController::class, 'respondSurveyByToken'])->name('surveys.respond');

// Événements — liste publique (connecté) et formulaire d'inscription (sans compte)
Route::get('/evenements', [EvenementPublicController::class, 'index'])->name('evenements.index')->middleware('auth');
Route::get('/inscrire/{slug}', [EvenementPublicController::class, 'show'])->name('evenement.inscription');
Route::post('/inscrire/{slug}', [EvenementPublicController::class, 'store'])->name('evenement.inscription.store');
Route::get('/og-image/evenement/{slug}', [EvenementPublicController::class, 'ogImage'])->name('evenement.og-image');

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

require __DIR__.'/settings.php';
