<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bravos', function (Blueprint $table) {
            $table->string('badge')->default('good_job')->after('value_id');
            // good_job=10pts, excellent=25pts, impressive=50pts
        });
    }

    public function down(): void
    {
        Schema::table('bravos', function (Blueprint $table) {
            $table->dropColumn('badge');
        });
    }
};
