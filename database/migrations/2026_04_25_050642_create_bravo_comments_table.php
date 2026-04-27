<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    // public function up(): void
    // {
    //     Schema::create('bravo_comments', function (Blueprint $table) {
    //         $table->id();
    //         $table->foreignId('bravo_id')->constrained()->cascadeOnDelete();
    //         $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    //         $table->text('content');
    //         $table->softDeletes(); // modération sans perte de données
    //         $table->timestamps();

    //         $table->index(['bravo_id', 'deleted_at']);
    //     });
    // }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bravo_comments');
    }
};
