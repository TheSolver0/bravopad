<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hr_surveys', function (Blueprint $table) {
            $table->unsignedInteger('auto_bravo_points')->default(0)->after('ends_at');
        });
    }

    public function down(): void
    {
        Schema::table('hr_surveys', function (Blueprint $table) {
            $table->dropColumn('auto_bravo_points');
        });
    }
};
