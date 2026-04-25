<?php

namespace App\Exceptions;

use App\Services\Audit\AuditLogger;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class BravoRuleException extends Exception
{
    public function render(Request $request): JsonResponse|RedirectResponse
    {
        AuditLogger::log(
            'bravo_rule_blocked',
            [
                'reason'       => $this->getMessage(),
                'receiver_id'  => $request->input('receiver_id'),
                'value_ids'    => $request->input('value_ids'),
            ],
            $request->user(),
            null,
            null,
            'warning',
            'Envoi de Bravo refusé par une règle métier.',
        );

        if ($request->header('X-Inertia')) {
            return redirect()->back()->with('error', $this->getMessage());
        }

        return response()->json([
            'message' => $this->getMessage(),
            'error'   => 'bravo_rule_violation',
        ], 422);
    }
}
