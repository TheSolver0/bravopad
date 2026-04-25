<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AdminRolesController extends Controller
{
    public function index(): Response
    {
        Gate::authorize('manage-roles-permissions');

        $permissions = Permission::query()->orderBy('name')->pluck('name')->all();

        $pivotTable = config('permission.table_names.model_has_roles');

        $roles = Role::query()
            ->with('permissions:name')
            ->orderBy('name')
            ->get()
            ->map(function (Role $r) use ($pivotTable) {
                $usersCount = (int) DB::table($pivotTable)
                    ->where('role_id', $r->id)
                    ->where('model_type', User::class)
                    ->count();

                return [
                    'id'               => $r->id,
                    'name'             => $r->name,
                    'users_count'      => $usersCount,
                    'permission_names' => $r->permissions->pluck('name')->values()->all(),
                ];
            });

        return Inertia::render('AdminRoles', [
            'roles'       => $roles,
            'permissions' => $permissions,
        ]);
    }

    public function update(Request $request, Role $role)
    {
        Gate::authorize('manage-roles-permissions');

        if ($role->name === 'super_admin' && ! $request->user()->isSuperAdmin()) {
            abort(403);
        }

        $all = Permission::query()->pluck('name')->all();

        $validated = $request->validate([
            'permission_names'   => ['required', 'array'],
            'permission_names.*' => ['string', Rule::in($all)],
        ]);

        $before = $role->permissions->pluck('name')->sort()->values()->all();
        $role->syncPermissions($validated['permission_names']);

        AuditLogger::log(
            'role_permissions_updated',
            [
                'role'   => $role->name,
                'before' => $before,
                'after'  => collect($validated['permission_names'])->sort()->values()->all(),
            ],
            $request->user(),
            Role::class,
            $role->id,
            'info',
            "Permissions du rôle « {$role->name} » mises à jour.",
        );

        return redirect()->back()->with('success', 'Permissions du rôle enregistrées.');
    }
}
