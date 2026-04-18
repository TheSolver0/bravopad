<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bravos', function (Blueprint $table) {
            $table->id();

            //  Utilisateurs
            $table->foreignId('sender_id')
                ->constrained('users')
                ->onDelete('cascade');

            $table->foreignId('receiver_id')
                ->constrained('users')
                ->onDelete('cascade');

            //  Valeur (autonomie, équipe, efficacité)
            $table->foreignId('value_id')
                ->constrained('bravo_values')
                ->onDelete('restrict');

            //  Challenge (optionnel mais important pour ton système RH)
            $table->foreignId('challenge_id')
                ->nullable()
                ->constrained('challenges')
                ->onDelete('set null');

            // essage type réseau social
            $table->text('message')->nullable();

            // Points attribués (calculés côté backend)
            $table->integer('points')->default(0);

            // Réactions type réseau social (option simple MVP)
            $table->integer('likes_count')->default(0);

            // Statut (utile si validation RH un jour)
            $table->string('status')->default('published'); 
            // published | hidden | archived

            $table->timestamps();

            // Index pour feed rapide (très important pour réseau social)
            $table->index(['receiver_id', 'created_at']);
            $table->index(['sender_id', 'created_at']);
            $table->index(['challenge_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bravos');
    }
};