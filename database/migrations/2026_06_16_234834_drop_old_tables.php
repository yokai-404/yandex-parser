<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('reviews');
        Schema::dropIfExists('organizations');
    }

    public function down(): void
    {
        //
    }
};