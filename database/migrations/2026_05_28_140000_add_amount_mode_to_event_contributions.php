<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_contributions', function (Blueprint $table) {
            $table->enum('amount_mode', ['global', 'per_participant'])->default('global')->after('visibility');
            $table->decimal('amount_per_participant', 12, 2)->nullable()->after('goal_amount');
        });
    }

    public function down(): void
    {
        Schema::table('event_contributions', function (Blueprint $table) {
            $table->dropColumn(['amount_mode', 'amount_per_participant']);
        });
    }
};
