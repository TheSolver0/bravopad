<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles & permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // -----------------------------------------------------------------------
        // Permissions granulaires
        // -----------------------------------------------------------------------
        $permissions = [
            'send-bravo',
            'view-feed',
            'view-stats',
            'manage-bravo-values',
            'manage-challenges',
            'configure-settings',
            'view-hr-dashboard',
            'manage-users',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm]);
        }

        // -----------------------------------------------------------------------
        // Rôles
        // -----------------------------------------------------------------------
        $employee = Role::firstOrCreate(['name' => 'employee']);
        $employee->syncPermissions(['send-bravo', 'view-feed', 'view-stats']);

        $manager = Role::firstOrCreate(['name' => 'manager']);
        $manager->syncPermissions(['send-bravo', 'view-feed', 'view-stats', 'view-hr-dashboard']);

        $hr = Role::firstOrCreate(['name' => 'hr']);
        $hr->syncPermissions([
            'send-bravo',
            'view-feed',
            'view-stats',
            'manage-bravo-values',
            'manage-challenges',
            'configure-settings',
            'view-hr-dashboard',
        ]);

        $admin = Role::firstOrCreate(['name' => 'admin']);
        $admin->syncPermissions($permissions); // tout

        $superAdmin = Role::firstOrCreate(['name' => 'super_admin']);
        $superAdmin->syncPermissions($permissions); // tout + accès prioritaire applicatif
    }
}
