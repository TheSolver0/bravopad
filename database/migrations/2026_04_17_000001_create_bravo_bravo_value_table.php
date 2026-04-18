<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bravo_bravo_value', function (Blueprint $table) {
            $table->foreignId('bravo_id')
                ->constrained('bravos')
                ->onDelete('cascade');

            $table->foreignId('bravo_value_id')
                ->constrained('bravo_values')
                ->onDelete('cascade');

            $table->primary(['bravo_id', 'bravo_value_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bravo_bravo_value');
    }
};
