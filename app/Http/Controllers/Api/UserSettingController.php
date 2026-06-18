<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateUserSettingRequest;
use App\Models\UserSetting;
use Illuminate\Http\Request;

class UserSettingController extends Controller
{
    public function show(Request $request)
    {
        $setting = $request->user()->setting;

        return response()->json([
            'data' => $setting,
        ]);
    }

    public function store(UpdateUserSettingRequest $request)
    {
        $data = $request->validated();

        $setting = UserSetting::updateOrCreate(
            ['user_id' => $request->user()->id],
            [
                'yandex_url' => $data['yandex_url'],
                'last_synced_at' => null,
            ]
        );

        return response()->json([
            'message' => 'Настройки сохранены',
            'data' => $setting,
        ]);
    }
}