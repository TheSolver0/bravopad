<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('post_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained()->cascadeOnDelete();
            $table->string('path');          // chemin sur le disk (ex: posts/media/xyz.jpg)
            $table->string('url');           // URL publique
            $table->string('mime_type');     // image/jpeg, video/mp4, …
            $table->string('type')->default('image'); // 'image' | 'video'
            $table->unsignedBigInteger('size')->default(0); // taille en octets
            $table->unsignedTinyInteger('order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('post_media');
    }
};
