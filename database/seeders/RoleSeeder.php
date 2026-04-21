<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'manage-users',
            'manage-challenges',
            'send-bravo',
            'view-stats',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        $admin = Role::firstOrCreate(['name' => 'admin']);
        $admin->syncPermissions($permissions);

        $manager = Role::firstOrCreate(['name' => 'manager']);
        $manager->syncPermissions(['manage-challenges', 'send-bravo', 'view-stats']);

        $employee = Role::firstOrCreate(['name' => 'employee']);
        $employee->syncPermissions(['send-bravo', 'view-stats']);
    }
}
