<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('manual_chunks', function (Blueprint $table) {
            $table->id();
            $table->string('manual_key');
            $table->string('file_name');
            $table->unsignedSmallInteger('page_number');
            $table->text('content');
            $table->timestamps();

            $table->index('manual_key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('manual_chunks');
    }
};
