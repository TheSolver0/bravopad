<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class AdminUsersController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('manage-users');

        $query = User::query()
            ->where('is_automation', false)
            ->with(['roles', 'department:id,name']);

        if (! $request->user()->isAdmin()) {
            $query->whereDoesntHave('roles', fn ($q) => $q->whereIn('name', ['hr', 'admin', 'super_admin']));
        }

        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $query->where(function ($q) use ($term): void {
                $q->where('name', 'like', $term)->orWhere('email', 'like', $term);
            });
        }

        $paginator = $query->orderBy('name')->paginate(20)->withQueryString();

        $paginator->getCollection()->transform(function (User $u) {
            return [
                'id'            => $u->id,
                'name'          => $u->name,
                'email'         => $u->email,
                'role_label'    => $u->role,
                'department'    => $u->department?->name,
                'points_total'  => $u->points_total,
                'roles'         => $u->getRoleNames()->values()->all(),
            ];
        });

        return Inertia::render('AdminUsers', [
            'users'            => $paginator,
            'filters'          => ['q' => $request->string('q')->toString()],
            'assignable_roles' => $this->assignableRoleNames($request->user()),
        ]);
    }

    public function update(Request $request, User $user)
    {
        Gate::authorize('manage-users');

        if ($user->is_automation) {
            abort(404);
        }

        $actor = $request->user();
        if ($user->hasRole('super_admin') && ! $actor->isSuperAdmin()) {
            abort(403, 'Seul un super administrateur peut modifier ce compte.');
        }

        $allowed = $this->assignableRoleNames($actor);
        $validated = $request->validate([
            'role' => ['required', 'string', Rule::in($allowed)],
        ]);

        if ($validated['role'] === 'super_admin' && ! $actor->isSuperAdmin()) {
            abort(403);
        }

        $before = $user->getRoleNames()->sort()->values()->all();
        $user->syncRoles([$validated['role']]);

        AuditLogger::log(
            'user_role_updated',
            [
                'target_user_id' => $user->id,
                'before'         => $before,
                'after'          => [$validated['role']],
            ],
            $actor,
            User::class,
            $user->id,
            'info',
            "Rôle Spatie mis à jour pour {$user->email}.",
        );

        return redirect()->back()->with('success', 'Rôle mis à jour.');
    }

    /**
     * @return list<string>
     */
    private function assignableRoleNames(User $actor): array
    {
        if ($actor->isSuperAdmin()) {
            return Role::query()->orderBy('name')->pluck('name')->all();
        }

        if ($actor->isAdmin()) {
            return ['employee', 'manager', 'hr', 'admin'];
        }

        return ['employee', 'manager'];
    }
}
