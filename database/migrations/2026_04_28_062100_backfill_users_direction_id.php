<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $users = DB::table('users')
            ->whereNull('direction_id')
            ->whereNotNull('department_id')
            ->select('id', 'department_id')
            ->get();

        if ($users->isEmpty()) {
            return;
        }

        $departmentNameById = DB::table('departments')
            ->pluck('name', 'id');

        $directionIdByName = DB::table('directions')
            ->pluck('id', 'name');

        foreach ($users as $user) {
            $departmentName = $departmentNameById[$user->department_id] ?? null;
            if (! $departmentName) {
                continue;
            }

            $directionId = $directionIdByName[$departmentName] ?? null;
            if (! $directionId) {
                continue;
            }

            DB::table('users')
                ->where('id', $user->id)
                ->update(['direction_id' => $directionId]);
        }
    }

    public function down(): void
    {
        // no-op (data backfill)
    }
};
