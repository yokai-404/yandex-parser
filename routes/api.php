<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserSettingController;
use App\Http\Controllers\Api\ParserController;
use App\Services\YandexMapsParserService;
use App\Http\Controllers\Api\YandexPlaceController;
use App\Http\Controllers\Api\HistoryController;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    // Авторизация 
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Сохранение ссылки
    Route::get('/settings', [UserSettingController::class, 'show']);
    Route::post('/settings', [UserSettingController::class, 'store']);

    // Парсер
    Route::get('/parser/jobs', [ParserController::class, 'index']);
    Route::post('/parser/run', [ParserController::class, 'run']);
    Route::get('/parser/jobs/{parseJob}', [ParserController::class, 'show']);

    // Отображение данных
    Route::post('/yandex/sync', [YandexPlaceController::class, 'sync']);
    Route::get('/yandex/place', [YandexPlaceController::class, 'show']);
    Route::get('/yandex/place/reviews', [YandexPlaceController::class, 'reviews']);

    // История запросов
    Route::get('/history', [HistoryController::class, 'index']);
});  
