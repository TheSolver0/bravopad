<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calendar_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('calendar_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('permission', ['view', 'edit', 'admin'])->default('view');
            $table->timestamps();

            $table->unique(['calendar_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendar_user');
    }
};
