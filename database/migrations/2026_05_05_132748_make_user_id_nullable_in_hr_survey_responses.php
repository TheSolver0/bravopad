<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hr_survey_responses', function (Blueprint $table) {
            // 1. Supprimer d'abord la FK (elle s'appuie sur l'index unique)
            $table->dropForeign(['user_id']);

            // 2. Maintenant on peut supprimer l'index unique
            $table->dropUnique(['survey_id', 'user_id']);

            // 3. Rendre nullable
            $table->unsignedBigInteger('user_id')->nullable()->change();

            // 4. Re-ajouter la FK
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();

            // 5. Ajouter session_id
            $table->string('session_id', 128)->nullable()->after('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('hr_survey_responses', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('session_id');
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['survey_id', 'user_id']);
        });
    }
};