<?php

namespace App\Services\Audit;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class AuditLogger
{
    /** @var array<string, true> */
    private static array $inRequestFingerprints = [];

    public static function log(
        string $action,
        array $context = [],
        ?User $actor = null,
        ?string $subjectType = null,
        ?int $subjectId = null,
        string $severity = 'info',
        ?string $description = null,
    ): AuditLog {
        $request = request();
        $actorId = $actor?->id ?? Auth::id();
        $fingerprint = self::fingerprint($action, $context, $actorId, $subjectType, $subjectId, $severity, $request);

        // Prevent duplicate inserts caused by double event dispatch or repeated client calls.
        if (isset(self::$inRequestFingerprints[$fingerprint])) {
            return self::latestDuplicate($action, $actorId, $subjectType, $subjectId)
                ?? new AuditLog();
        }

        $cacheKey = 'audit:dedupe:' . $fingerprint;
        if (! Cache::add($cacheKey, 1, now()->addSeconds(2))) {
            return self::latestDuplicate($action, $actorId, $subjectType, $subjectId)
                ?? new AuditLog();
        }

        self::$inRequestFingerprints[$fingerprint] = true;

        return AuditLog::create([
            'action'       => $action,
            'actor_id'     => $actorId,
            'subject_type' => $subjectType,
            'subject_id'   => $subjectId,
            'severity'     => $severity,
            'context'      => $context ?: null,
            'ip_address'   => self::clientIp($request),
            'description'  => $description,
        ]);
    }

    private static function clientIp(?Request $request): ?string
    {
        if (! $request) {
            return null;
        }

        return $request->ip();
    }

    private static function fingerprint(
        string $action,
        array $context,
        ?int $actorId,
        ?string $subjectType,
        ?int $subjectId,
        string $severity,
        ?Request $request,
    ): string {
        $payload = [
            'action' => $action,
            'actor_id' => $actorId,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'severity' => $severity,
            'context' => $context,
            'path' => $request?->path(),
            'method' => $request?->method(),
            'ip' => $request?->ip(),
        ];

        return sha1(json_encode($payload));
    }

    private static function latestDuplicate(string $action, ?int $actorId, ?string $subjectType, ?int $subjectId): ?AuditLog
    {
        return AuditLog::query()
            ->where('action', $action)
            ->where('actor_id', $actorId)
            ->where('subject_type', $subjectType)
            ->where('subject_id', $subjectId)
            ->latest('id')
            ->first();
    }
}
