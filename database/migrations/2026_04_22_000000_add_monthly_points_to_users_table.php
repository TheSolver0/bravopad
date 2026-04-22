<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedInteger('monthly_points_allowance')->default(100)->after('points_total');
            $table->unsignedInteger('monthly_points_given')->default(0)->after('monthly_points_allowance');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['monthly_points_allowance', 'monthly_points_given']);
        });
    }
};
