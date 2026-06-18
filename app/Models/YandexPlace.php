<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class YandexPlace extends Model
{
    protected $fillable = [
        'user_id',
        'parse_job_id',
        'source_url',
        'title',
        'rating',
        'reviews_count',
        'ratings_count',
        'sync_status',
        'sync_error',
        'synced_at',
    ];


    protected $casts = [
        'rating' => 'decimal:2',
        'synced_at' => 'datetime',
    ];


    public function reviews()
    {
        return $this->hasMany(YandexReview::class);
    }


    public function user()
    {
        return $this->belongsTo(User::class);
    }


    public function parseJob()
    {
        return $this->belongsTo(ParseJob::class);
    }
}