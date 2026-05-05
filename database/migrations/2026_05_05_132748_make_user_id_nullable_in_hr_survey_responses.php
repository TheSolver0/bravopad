<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hr_survey_responses', function (Blueprint $table) {
            // Drop unique index before altering the column
            $table->dropUnique(['survey_id', 'user_id']);
            // Drop old foreign key
            $table->dropForeign(['user_id']);
            // Make nullable (anonymous responses)
            $table->unsignedBigInteger('user_id')->nullable()->change();
            // Re-add foreign key without constraint enforcement for nulls
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete()->nullOnDelete();
            // Add session_id column to deduplicate anonymous responses
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
