<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }


    public function rules(): array
    {
        return [
            'yandex_url' => [
                'required',
                'string',
                'max:2048',
                'url',
                function (string $attribute, mixed $value, \Closure $fail) {

                    $host = strtolower((string) parse_url($value, PHP_URL_HOST));
                    $path = (string) parse_url($value, PHP_URL_PATH);


                    // Проверяем домен
                    if (!preg_match('/(^|\.)yandex\.(ru|com|by|kz|uz)$/i', $host)) {
                        $fail('Введите ссылку только на Яндекс.Карты.');
                        return;
                    }


                    // Проверяем структуру /maps/org/{name}/{id}
                    if (!preg_match(
                        '#^/maps/org/[a-zA-Z0-9_-]+/[0-9]+(?:/|$)#',
                        $path
                    )) {
                        $fail('Введите полную ссылку на организацию в Яндекс.Картах.');
                        return;
                    }

                },
            ],
        ];
    }


    public function messages(): array
    {
        return [
            'yandex_url.required' => 'Введите ссылку на Яндекс.Карты.',
            'yandex_url.url' => 'Введите корректный URL.',
            'yandex_url.max' => 'Ссылка слишком длинная.',
        ];
    }
}