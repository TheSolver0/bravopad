<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('evenements', function (Blueprint $table) {
            $table->json('activites_options')->nullable()->after('programme');
        });

        Schema::table('evenement_inscriptions', function (Blueprint $table) {
            $table->json('activites')->nullable()->after('participera');
        });
    }

    public function down(): void
    {
        Schema::table('evenements', function (Blueprint $table) {
            $table->dropColumn('activites_options');
        });

        Schema::table('evenement_inscriptions', function (Blueprint $table) {
            $table->dropColumn('activites');
        });
    }
};
