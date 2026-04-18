<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bravo_values', function (Blueprint $table) {
            $table->id();

            $table->string('name'); // autonomie, travail d'équipe, efficacité
            $table->text('description')->nullable();

            $table->float('multiplier')->default(1);

            $table->string('color')->nullable(); // couleur UI (ex: #FFAA00)
            $table->string('icon')->nullable();  // icône UI (lucide ou autre)

            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bravo_values');
    }
};