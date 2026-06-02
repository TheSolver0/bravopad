<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evenement_inscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evenement_id')->constrained('evenements')->cascadeOnDelete();
            $table->string('nom');
            $table->string('matricule');
            $table->enum('sexe', ['M', 'F']);
            $table->foreignId('direction_id')->constrained('directions')->cascadeOnDelete();
            $table->boolean('participera')->default(true);
            $table->string('ip_address')->nullable();
            $table->timestamps();

            $table->unique(['evenement_id', 'matricule']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evenement_inscriptions');
    }
};
