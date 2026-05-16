<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // hr_surveys columns already exist from a partial run — skip them if present
        if (! Schema::hasColumn('hr_surveys', 'description')) {
            Schema::table('hr_surveys', function (Blueprint $table) {
                $table->text('description')->nullable()->after('title');
            });
        }
        if (! Schema::hasColumn('hr_surveys', 'questions')) {
            Schema::table('hr_surveys', function (Blueprint $table) {
                $table->json('questions')->nullable()->after('options');
            });
        }
        if (! Schema::hasColumn('hr_surveys', 'token')) {
            Schema::table('hr_surveys', function (Blueprint $table) {
                $table->string('token', 64)->unique()->nullable()->after('questions');
            });
        }

        // Add answers column to responses
        if (! Schema::hasColumn('hr_survey_responses', 'answers')) {
            Schema::table('hr_survey_responses', function (Blueprint $table) {
                $table->json('answers')->nullable()->after('option_key');
            });
        }

        $this->makeOptionKeyNullable();
    }

    public function down(): void
    {
        Schema::table('hr_surveys', function (Blueprint $table) {
            $table->dropColumn(array_filter(
                ['description', 'questions', 'token'],
                fn ($col) => Schema::hasColumn('hr_surveys', $col),
            ));
        });

        if (Schema::hasColumn('hr_survey_responses', 'answers')) {
            Schema::table('hr_survey_responses', function (Blueprint $table) {
                $table->dropColumn('answers');
            });
        }

        $this->makeOptionKeyRequired();
    }

    private function makeOptionKeyNullable(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE hr_survey_responses MODIFY COLUMN option_key VARCHAR(40) NULL');

            return;
        }

        DB::statement('PRAGMA foreign_keys=OFF');
        DB::statement(<<<'SQL'
            CREATE TABLE hr_survey_responses_tmp (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                survey_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                option_key VARCHAR(40) NULL,
                answers TEXT NULL,
                created_at DATETIME NULL,
                updated_at DATETIME NULL,
                FOREIGN KEY (survey_id) REFERENCES hr_surveys(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        SQL);
        DB::statement(<<<'SQL'
            INSERT INTO hr_survey_responses_tmp (id, survey_id, user_id, option_key, answers, created_at, updated_at)
            SELECT id, survey_id, user_id, option_key, answers, created_at, updated_at
            FROM hr_survey_responses
        SQL);
        DB::statement('DROP TABLE hr_survey_responses');
        DB::statement('ALTER TABLE hr_survey_responses_tmp RENAME TO hr_survey_responses');
        DB::statement('CREATE UNIQUE INDEX hr_survey_responses_survey_id_user_id_unique ON hr_survey_responses (survey_id, user_id)');
        DB::statement('PRAGMA foreign_keys=ON');
    }

    private function makeOptionKeyRequired(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE hr_survey_responses MODIFY COLUMN option_key VARCHAR(40) NOT NULL DEFAULT \'\'');

            return;
        }

        DB::statement('PRAGMA foreign_keys=OFF');
        DB::statement(<<<'SQL'
            CREATE TABLE hr_survey_responses_tmp (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                survey_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                option_key VARCHAR(40) NOT NULL DEFAULT '',
                created_at DATETIME NULL,
                updated_at DATETIME NULL,
                FOREIGN KEY (survey_id) REFERENCES hr_surveys(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        SQL);
        DB::statement(<<<'SQL'
            INSERT INTO hr_survey_responses_tmp (id, survey_id, user_id, option_key, created_at, updated_at)
            SELECT id, survey_id, user_id, COALESCE(option_key, ''), created_at, updated_at
            FROM hr_survey_responses
        SQL);
        DB::statement('DROP TABLE hr_survey_responses');
        DB::statement('ALTER TABLE hr_survey_responses_tmp RENAME TO hr_survey_responses');
        DB::statement('CREATE UNIQUE INDEX hr_survey_responses_survey_id_user_id_unique ON hr_survey_responses (survey_id, user_id)');
        DB::statement('PRAGMA foreign_keys=ON');
    }
};
