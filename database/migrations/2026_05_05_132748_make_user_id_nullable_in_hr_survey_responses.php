<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Supprimer la FK en raw SQL (plus fiable sur MySQL strict)
        DB::statement('ALTER TABLE hr_survey_responses DROP FOREIGN KEY hr_survey_responses_user_id_foreign');

        // 2. Supprimer l'index unique dans un bloc séparé
        Schema::table('hr_survey_responses', function (Blueprint $table) {
            $table->dropUnique('hr_survey_responses_survey_id_user_id_unique');
        });

        // 3. Rendre nullable + re-ajouter FK + ajouter session_id
        Schema::table('hr_survey_responses', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->change();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->string('session_id', 128)->nullable()->after('user_id');
        });
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE hr_survey_responses DROP FOREIGN KEY hr_survey_responses_user_id_foreign');

        Schema::table('hr_survey_responses', function (Blueprint $table) {
            $table->dropColumn('session_id');
        });

        Schema::table('hr_survey_responses', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['survey_id', 'user_id']);
        });
    }
};