<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evenements', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->date('date');
            $table->time('heure_debut')->nullable();
            $table->time('heure_fin')->nullable();
            $table->string('lieu')->nullable();
            $table->string('cover_image')->nullable();
            $table->json('programme')->nullable(); // tableau d'activités
            $table->enum('statut', ['brouillon', 'ouvert', 'ferme', 'termine'])->default('brouillon');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evenements');
    }
};
