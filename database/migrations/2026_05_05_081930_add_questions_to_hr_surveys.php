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

        // Make option_key nullable
        DB::statement('ALTER TABLE hr_survey_responses MODIFY COLUMN option_key VARCHAR(40) NULL');
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

        DB::statement('ALTER TABLE hr_survey_responses MODIFY COLUMN option_key VARCHAR(40) NOT NULL DEFAULT \'\'');
    }
};
