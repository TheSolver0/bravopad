<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class AppSetting extends Model
{
    protected $fillable = ['key', 'value', 'cast', 'description'];

    /**
     * Lit un paramètre et le caste au bon type. Retourne $default si absent.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = Cache::remember("app_setting:{$key}", 300, fn () =>
            static::where('key', $key)->first()
        );

        if (! $setting) {
            return $default;
        }

        return match ($setting->cast) {
            'int'     => (int) $setting->value,
            'float'   => (float) $setting->value,
            'boolean' => filter_var($setting->value, FILTER_VALIDATE_BOOLEAN),
            default   => $setting->value,
        };
    }

    /**
     * Sauvegarde ou met à jour un paramètre et invalide le cache.
     */
    public static function set(string $key, mixed $value, string $cast = 'string'): void
    {
        static::updateOrCreate(['key' => $key], [
            'value' => (string) $value,
            'cast'  => $cast,
        ]);

        Cache::forget("app_setting:{$key}");
    }
}
