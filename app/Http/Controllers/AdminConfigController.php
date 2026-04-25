<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use App\Models\BravoValue;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class AdminConfigController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('configure-settings', User::class);

        $settings = AppSetting::orderBy('key')->get()->map(fn ($s) => [
            'id'          => $s->id,
            'key'         => $s->key,
            'value'       => $s->value,
            'cast'        => $s->cast,
            'description' => $s->description,
        ]);

        $bravoValues = BravoValue::orderBy('name')->get()->map(fn ($v) => [
            'id'          => $v->id,
            'name'        => $v->name,
            'description' => $v->description,
            'multiplier'  => $v->multiplier,
            'color'       => $v->color,
            'icon'        => $v->icon,
            'is_active'   => $v->is_active,
        ]);

        return Inertia::render('AdminConfig', [
            'settings'    => $settings,
            'bravoValues' => $bravoValues,
        ]);
    }

    /**
     * Mettre à jour un ou plusieurs paramètres
     */
    public function updateSettings(Request $request)
    {
        $this->authorize('configure-settings', User::class);

        $validated = $request->validate([
            'settings'              => 'required|array',
            'settings.*.key'        => 'required|string|exists:app_settings,key',
            'settings.*.value'      => 'required|string',
        ]);

        foreach ($validated['settings'] as $item) {
            AppSetting::where('key', $item['key'])->update(['value' => $item['value']]);
            Cache::forget("app_setting:{$item['key']}");
        }

        return response()->json(['message' => 'Paramètres mis à jour.']);
    }

    /**
     * Activer / désactiver une valeur Bravo
     */
    public function toggleBravoValue(Request $request, BravoValue $bravoValue)
    {
        $this->authorize('configure-settings', User::class);

        $bravoValue->update(['is_active' => ! $bravoValue->is_active]);

        return response()->json([
            'message'   => $bravoValue->is_active ? 'Valeur activée.' : 'Valeur désactivée.',
            'is_active' => $bravoValue->is_active,
        ]);
    }

    /**
     * Créer une nouvelle valeur Bravo
     */
    public function createBravoValue(Request $request)
    {
        $this->authorize('manage-bravo-values', User::class);

        $validated = $request->validate([
            'name'        => 'required|string|max:100|unique:bravo_values,name',
            'description' => 'nullable|string',
            'multiplier'  => 'required|numeric|min:0.1|max:10',
            'color'       => 'nullable|string|max:20',
            'icon'        => 'nullable|string|max:50',
        ]);

        $bravoValue = BravoValue::create(array_merge($validated, ['is_active' => true]));

        return response()->json(['message' => 'Valeur créée.', 'data' => $bravoValue], 201);
    }

    /**
     * Modifier une valeur Bravo
     */
    public function updateBravoValue(Request $request, BravoValue $bravoValue)
    {
        $this->authorize('manage-bravo-values', User::class);

        $validated = $request->validate([
            'name'        => 'sometimes|string|max:100|unique:bravo_values,name,' . $bravoValue->id,
            'description' => 'nullable|string',
            'multiplier'  => 'sometimes|numeric|min:0.1|max:10',
            'color'       => 'nullable|string|max:20',
            'icon'        => 'nullable|string|max:50',
        ]);

        $bravoValue->update($validated);

        return response()->json(['message' => 'Valeur mise à jour.', 'data' => $bravoValue]);
    }
}
