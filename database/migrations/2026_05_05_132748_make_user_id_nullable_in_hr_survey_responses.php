<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Supprimer les DEUX FK qui bloquent l'index unique
        DB::statement('ALTER TABLE hr_survey_responses DROP FOREIGN KEY hr_survey_responses_user_id_foreign');
        DB::statement('ALTER TABLE hr_survey_responses DROP FOREIGN KEY hr_survey_responses_survey_id_foreign');

        // 2. Supprimer l'index unique (maintenant plus rien ne le bloque)
        DB::statement('ALTER TABLE hr_survey_responses DROP INDEX hr_survey_responses_survey_id_user_id_unique');

        // 3. Rendre user_id nullable
        DB::statement('ALTER TABLE hr_survey_responses MODIFY COLUMN user_id BIGINT UNSIGNED NULL');

        // 4. Ajouter session_id
        Schema::table('hr_survey_responses', function (Blueprint $table) {
            $table->string('session_id', 128)->nullable()->after('user_id');
        });

        // 5. Re-ajouter les deux FK
        DB::statement('ALTER TABLE hr_survey_responses ADD CONSTRAINT hr_survey_responses_survey_id_foreign FOREIGN KEY (survey_id) REFERENCES hr_surveys(id) ON DELETE CASCADE');
        DB::statement('ALTER TABLE hr_survey_responses ADD CONSTRAINT hr_survey_responses_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL');
    }

    public function down(): void
    {
        // 1. Supprimer les FK
        DB::statement('ALTER TABLE hr_survey_responses DROP FOREIGN KEY hr_survey_responses_user_id_foreign');
        DB::statement('ALTER TABLE hr_survey_responses DROP FOREIGN KEY hr_survey_responses_survey_id_foreign');

        // 2. Supprimer session_id
        Schema::table('hr_survey_responses', function (Blueprint $table) {
            $table->dropColumn('session_id');
        });

        // 3. Remettre user_id NOT NULL
        DB::statement('ALTER TABLE hr_survey_responses MODIFY COLUMN user_id BIGINT UNSIGNED NOT NULL');

        // 4. Re-ajouter l'index unique et les FK originales
        DB::statement('ALTER TABLE hr_survey_responses ADD UNIQUE KEY hr_survey_responses_survey_id_user_id_unique (survey_id, user_id)');
        DB::statement('ALTER TABLE hr_survey_responses ADD CONSTRAINT hr_survey_responses_survey_id_foreign FOREIGN KEY (survey_id) REFERENCES hr_surveys(id) ON DELETE CASCADE');
        DB::statement('ALTER TABLE hr_survey_responses ADD CONSTRAINT hr_survey_responses_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
    }
};