<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            $this->rebuildSqliteTable(userIdNullable: true, includeSessionId: true);

            return;
        }

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
        if (DB::getDriverName() === 'sqlite') {
            $this->rebuildSqliteTable(userIdNullable: false, includeSessionId: false);

            return;
        }

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

    private function rebuildSqliteTable(bool $userIdNullable, bool $includeSessionId): void
    {
        $userIdDefinition = $userIdNullable ? 'user_id INTEGER NULL' : 'user_id INTEGER NOT NULL';
        $sessionColumn = $includeSessionId ? 'session_id VARCHAR(128) NULL,' : '';
        $sessionInsertColumn = $includeSessionId ? 'session_id,' : '';
        $sessionSelectColumn = $includeSessionId
            ? (Schema::hasColumn('hr_survey_responses', 'session_id') ? 'session_id,' : 'NULL,')
            : '';
        $userForeignKey = $userIdNullable
            ? 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL'
            : 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE';

        DB::statement('PRAGMA foreign_keys=OFF');
        DB::statement(<<<SQL
            CREATE TABLE hr_survey_responses_tmp (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                survey_id INTEGER NOT NULL,
                {$userIdDefinition},
                {$sessionColumn}
                option_key VARCHAR(40) NULL,
                answers TEXT NULL,
                created_at DATETIME NULL,
                updated_at DATETIME NULL,
                FOREIGN KEY (survey_id) REFERENCES hr_surveys(id) ON DELETE CASCADE,
                {$userForeignKey}
            )
        SQL);
        DB::statement(<<<SQL
            INSERT INTO hr_survey_responses_tmp (
                id,
                survey_id,
                user_id,
                {$sessionInsertColumn}
                option_key,
                answers,
                created_at,
                updated_at
            )
            SELECT
                id,
                survey_id,
                user_id,
                {$sessionSelectColumn}
                option_key,
                answers,
                created_at,
                updated_at
            FROM hr_survey_responses
            WHERE user_id IS NOT NULL OR {$this->sqliteBoolean($userIdNullable)}
        SQL);
        DB::statement('DROP TABLE hr_survey_responses');
        DB::statement('ALTER TABLE hr_survey_responses_tmp RENAME TO hr_survey_responses');
        DB::statement('CREATE UNIQUE INDEX hr_survey_responses_survey_id_user_id_unique ON hr_survey_responses (survey_id, user_id)');
        DB::statement('PRAGMA foreign_keys=ON');
    }

    private function sqliteBoolean(bool $value): string
    {
        return $value ? '1 = 1' : '1 = 0';
    }
};
