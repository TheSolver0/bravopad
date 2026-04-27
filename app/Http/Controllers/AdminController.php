<?php

namespace App\Http\Controllers;

use App\Models\Bravo;
use App\Models\Department;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class AdminController extends Controller
{
    public function index()
    {
        Gate::authorize('manage-users');

        $users = User::with('department')
            ->orderBy('name')
            ->get()
            ->map(fn ($u) => [
                'id'         => $u->id,
                'name'       => $u->name,
                'email'      => $u->email,
                'role'       => $u->role,
                'permission' => $u->permission ?? 'employee',
                'department' => $u->department?->name ?? null,
                'avatar'     => $u->avatar,
                'points_total' => $u->points_total,
            ]);

        $departments = Department::withCount('employees')->get();

        $stats = [
            'total_users'      => User::count(),
            'total_bravos'     => Bravo::count(),
            'total_points'     => (int) User::sum('points_total'),
            'admins'           => User::where('permission', 'admin')->count(),
            'managers'         => User::where('permission', 'manager')->count(),
            'employees'        => User::where('permission', 'employee')->count(),
        ];

        return Inertia::render('Admin', compact('users', 'departments', 'stats'));
    }

    public function updatePermission(Request $request, User $user)
    {
        Gate::authorize('manage-users');

        $request->validate([
            'permission' => 'required|in:admin,manager,employee',
        ]);

        $user->update(['permission' => $request->permission]);

        return back()->with('success', "Permission de {$user->name} mise à jour.");
    }
}
