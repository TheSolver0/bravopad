<?php

namespace App\Http\Middleware;

use App\Models\BravoValue;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        $nav = $user
            ? [
                'hr_dashboard'   => Gate::forUser($user)->allows('view-hr-dashboard'),
                'admin_config'   => Gate::forUser($user)->allows('configure-settings'),
                'admin_users'    => Gate::forUser($user)->allows('manage-users'),
                'admin_roles'    => Gate::forUser($user)->allows('manage-roles-permissions'),
                'audit'          => Gate::forUser($user)->allows('view-audit-log'),
                'admin_surveys'  => $user->isHr(),
                'admin_challenges' => $user->isHr(),
            ]
            : [
                'hr_dashboard'   => false,
                'admin_config'   => false,
                'admin_users'    => false,
                'admin_roles'    => false,
                'audit'          => false,
                'admin_surveys'  => false,
                'admin_challenges' => false,
            ];

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user'        => $user,
                'roles'       => $user ? $user->getRoleNames() : [],
                'is_hr'       => $user?->isHr() ?? false,
                'is_manager'  => $user?->isManager() ?? false,
                'is_admin'    => $user?->isAdmin() ?? false,
                'is_super_admin' => $user?->isSuperAdmin() ?? false,
                'nav'         => $nav,
                'unread_notifications_count' => $user
                    ? $user->unreadNotifications()->count()
                    : 0,
                'recent_notifications' => $user
                    ? $user->notifications()->latest()->limit(8)->get()->map(static fn ($n) => [
                        'id'         => $n->id,
                        'read_at'    => $n->read_at?->toIso8601String(),
                        'created_at' => $n->created_at->toIso8601String(),
                        'data'       => $n->data,
                    ])->values()->all()
                    : [],
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'flash' => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
            ],
            // Partagé globalement pour le modal "Envoyer un Bravo" accessible depuis toutes les pages
            'bravoValues'   => fn () => BravoValue::where('is_active', true)->get(),
            'users'         => fn () => $request->user() ? User::orderBy('name')->get() : [],
            'unreadCount'   => fn () => $request->user()?->unreadNotifications()->count() ?? 0,
        ];
    }
}
