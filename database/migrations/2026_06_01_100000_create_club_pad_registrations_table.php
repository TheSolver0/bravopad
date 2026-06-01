<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('club_pad_registrations', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('matricule');
            $table->enum('sexe', ['M', 'F']);
            $table->foreignId('direction_id')->constrained('directions')->cascadeOnDelete();
            $table->boolean('participera')->default(true);
            $table->string('ip_address')->nullable();
            $table->timestamps();

            $table->unique('matricule');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('club_pad_registrations');
    }
};
