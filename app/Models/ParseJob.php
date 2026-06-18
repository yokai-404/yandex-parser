<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ParseJob extends Model
{

    protected $fillable = [
        'user_id',
        'yandex_url',
        'status',
        'progress',
        'result',
        'error_message',
        'started_at',
        'finished_at',
    ];


    protected $casts = [
        'progress' => 'integer',
        'result' => 'array',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];


    public function user()
    {
        return $this->belongsTo(User::class);
    }


    public function place()
    {
        return $this->hasOne(YandexPlace::class);
    }

}