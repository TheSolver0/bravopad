<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('challenges', function (Blueprint $table) {
            $table->id();

            // Infos challenge
            $table->string('name');
            $table->text('description')->nullable();

            // période obligatoire
            $table->date('start_date');
            $table->date('end_date');

            // bonus global RH
            $table->integer('points_bonus')->default(0);

            // statut du challenge
            $table->string('status')->default('active');
            // active | finished | archived

            // RH / admin créateur
            $table->foreignId('created_by')
                ->constrained('users')
                ->onDelete('cascade');

            $table->timestamps();

            // performance (feed + dashboard RH)
            $table->index(['status', 'start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('challenges');
    }
};