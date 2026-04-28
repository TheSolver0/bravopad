<?php

namespace App\Http\Controllers;

use App\Models\Direction;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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
            ->with(['roles', 'direction:id,code,name', 'department:id,name']);

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
                'direction_id'  => $u->direction_id,
                'direction'     => $u->direction?->code ?? $u->direction?->name ?? $u->department?->name,
                'points_total'  => $u->points_total,
                'roles'         => $u->getRoleNames()->values()->all(),
            ];
        });

        return Inertia::render('AdminUsers', [
            'users'            => $paginator,
            'filters'          => ['q' => $request->string('q')->toString()],
            'assignable_roles' => $this->assignableRoleNames($request->user()),
            'directions'       => Direction::query()->orderBy('code')->get(['id', 'code', 'name']),
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
            'name'       => ['required', 'string', 'max:255'],
            'email'      => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'direction_id' => ['nullable', 'integer', 'exists:directions,id'],
            'role_label' => ['nullable', 'string', 'max:100'],
            'role'       => ['required', 'string', Rule::in($allowed)],
        ]);

        if ($validated['role'] === 'super_admin' && ! $actor->isSuperAdmin()) {
            abort(403);
        }

        $beforeRoles = $user->getRoleNames()->sort()->values()->all();
        $beforeProfile = [
            'name' => $user->name,
            'email' => $user->email,
            'direction_id' => $user->direction_id,
            'role_label' => $user->role,
        ];

        $user->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'direction_id' => $validated['direction_id'] ?? null,
            'role' => $validated['role_label'] ?? $user->role,
        ])->save();

        $user->syncRoles([$validated['role']]);

        AuditLogger::log(
            'user_updated',
            [
                'target_user_id' => $user->id,
                'before_roles'   => $beforeRoles,
                'after_roles'    => [$validated['role']],
                'before_profile' => $beforeProfile,
                'after_profile'  => [
                    'name' => $user->name,
                    'email' => $user->email,
                    'direction_id' => $user->direction_id,
                    'role_label' => $user->role,
                ],
            ],
            $actor,
            User::class,
            $user->id,
            'info',
            "Utilisateur admin modifie: {$user->email}.",
        );

        return redirect()->back()->with('success', 'Utilisateur mis à jour.');
    }

    public function store(Request $request)
    {
        Gate::authorize('manage-users');

        $actor = $request->user();
        $allowed = $this->assignableRoleNames($actor);

        $validated = $request->validate([
            'name'       => ['required', 'string', 'max:255'],
            'email'      => ['required', 'email', 'max:255', 'unique:users,email'],
            'direction_id' => ['nullable', 'integer', 'exists:directions,id'],
            'role_label' => ['nullable', 'string', 'max:100'],
            'role'       => ['required', 'string', Rule::in($allowed)],
            'password'   => ['required', 'string', 'min:8'],
        ]);

        if ($validated['role'] === 'super_admin' && ! $actor->isSuperAdmin()) {
            abort(403);
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'direction_id' => $validated['direction_id'] ?? null,
            'role' => $validated['role_label'] ?? 'Employe',
            'password' => Hash::make($validated['password']),
            'points_total' => 0,
        ]);
        $user->syncRoles([$validated['role']]);

        AuditLogger::log(
            'user_created',
            [
                'target_user_id' => $user->id,
                'role' => $validated['role'],
            ],
            $actor,
            User::class,
            $user->id,
            'info',
            "Nouvel utilisateur cree: {$user->email}.",
        );

        return redirect()->back()->with('success', 'Utilisateur cree.');
    }

    public function destroy(Request $request, User $user)
    {
        Gate::authorize('manage-users');

        if ($user->is_automation) {
            abort(404);
        }

        $actor = $request->user();
        if ($user->hasRole('super_admin') && ! $actor->isSuperAdmin()) {
            abort(403, 'Seul un super administrateur peut supprimer ce compte.');
        }

        if ($user->id === $actor->id) {
            abort(403, 'Suppression de son propre compte interdite ici.');
        }

        $email = $user->email;
        $id = $user->id;
        $roles = $user->getRoleNames()->values()->all();
        $user->delete();

        AuditLogger::log(
            'user_deleted_by_admin',
            [
                'target_user_id' => $id,
                'target_email' => $email,
                'roles' => $roles,
            ],
            $actor,
            User::class,
            $id,
            'warning',
            "Utilisateur supprime: {$email}.",
        );

        return redirect()->back()->with('success', 'Utilisateur supprime.');
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
