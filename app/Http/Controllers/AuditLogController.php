<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('view-audit-log');

        $logs = AuditLog::query()
            ->with('actor:id,name,email')
            ->when($request->string('action')->toString(), fn ($q, $a) => $q->where('action', $a))
            ->when($request->string('severity')->toString(), fn ($q, $s) => $q->where('severity', $s))
            ->latest()
            ->paginate(40)
            ->withQueryString();

        return Inertia::render('AuditLog', [
            'logs' => $logs,
            'filters' => [
                'action'   => $request->string('action')->toString(),
                'severity' => $request->string('severity')->toString(),
            ],
        ]);
    }
}
