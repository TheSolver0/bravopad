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
        // Cache a plain array (not an Eloquent model) to avoid unserialize failures
        $data = Cache::remember("app_setting:{$key}", 300, fn () =>
            static::where('key', $key)->select('value', 'cast')->first()?->toArray()
        );

        if (! $data) {
            return $default;
        }

        return match ($data['cast']) {
            'int'     => (int) $data['value'],
            'float'   => (float) $data['value'],
            'boolean' => filter_var($data['value'], FILTER_VALIDATE_BOOLEAN),
            default   => $data['value'],
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
