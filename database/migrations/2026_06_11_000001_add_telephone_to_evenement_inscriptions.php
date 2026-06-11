<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('evenement_inscriptions', function (Blueprint $table) {
            $table->string('telephone', 20)->nullable()->after('matricule');
        });
    }

    public function down(): void
    {
        Schema::table('evenement_inscriptions', function (Blueprint $table) {
            $table->dropColumn('telephone');
        });
    }
};
