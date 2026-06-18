<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class YandexReview extends Model
{
    protected $fillable = [
        'yandex_place_id',
        'external_id',
        'author',
        'published_at',
        'text',
        'rating',
        'raw_payload',
    ];

    protected $casts = [
        'published_at' => 'date',
        'raw_payload' => 'array',
    ];

    public function place()
    {
        return $this->belongsTo(YandexPlace::class, 'yandex_place_id');
    }
}