<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Rendre value_id nullable (les valeurs sont maintenant dans la table pivot)
        Schema::table('bravos', function (Blueprint $table) {
            $table->foreignId('value_id')->nullable()->change();
        });

        // Migrer les données existantes : insérer dans la table pivot
        $bravos = DB::table('bravos')->whereNotNull('value_id')->get();
        foreach ($bravos as $bravo) {
            DB::table('bravo_bravo_value')->insertOrIgnore([
                'bravo_id'      => $bravo->id,
                'bravo_value_id'=> $bravo->value_id,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('bravos', function (Blueprint $table) {
            $table->foreignId('value_id')->nullable(false)->change();
        });
    }
};
