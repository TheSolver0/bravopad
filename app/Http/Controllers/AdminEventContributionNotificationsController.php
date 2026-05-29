<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use App\Models\AuditLog;
use App\Models\EventContribution;
use App\Notifications\EventContributionDeadlineReminderNotification;
use App\Notifications\EventContributionInvitationNotification;
use App\Notifications\EventContributionNewPaymentNotification;
use App\Notifications\EventContributionThankYouNotification;
use Carbon\CarbonInterface;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminEventContributionNotificationsController extends Controller
{
    /** @return list<class-string> */
    protected function trackedTypes(): array
    {
        return [
            EventContributionInvitationNotification::class,
            EventContributionNewPaymentNotification::class,
            EventContributionThankYouNotification::class,
            EventContributionDeadlineReminderNotification::class,
        ];
    }

    public function index(Request $request): Response
    {
        Gate::authorize('view-event-contribution-stats');

        $typeFilter = $request->string('type')->toString();
        [$from, $to] = $this->parseOptionalDateRange($request);

        $baseQuery = $this->notificationsQuery($typeFilter, $from, $to);

        $notifications = (clone $baseQuery)
            ->orderByDesc('created_at')
            ->paginate(40)
            ->withQueryString();

        $notificationItems = collect($notifications->items())->map(fn ($item) => $this->mapNotificationRow($item));

        $chartFrom = $from ?? now()->subDays(29)->startOfDay();
        $chartTo = $to ?? now()->endOfDay();

        return Inertia::render('AdminEventContributionNotifications', [
            'stats' => $this->buildStats($typeFilter, $from, $to),
            'filters' => [
                'type' => $typeFilter,
                'from' => $from?->toDateString() ?? '',
                'to' => $to?->toDateString() ?? '',
            ],
            'types' => $this->trackedTypes(),
            'notifications' => [
                'data' => $notificationItems,
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'total' => $notifications->total(),
            ],
            'sends_per_day' => $this->sendsPerDay($typeFilter, $chartFrom, $chartTo),
            'reminder_audits' => $this->reminderAudits($from, $to),
            'mail_enabled' => $this->isMailEnabled(),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        Gate::authorize('view-event-contribution-stats');

        $typeFilter = $request->string('type')->toString();
        [$from, $to] = $this->parseOptionalDateRange($request);

        $rows = $this->notificationsQuery($typeFilter, $from, $to)
            ->orderByDesc('created_at')
            ->get();

        $fromLabel = $from?->format('Ymd') ?? 'all';
        $toLabel = $to?->format('Ymd') ?? 'all';
        $filename = "cotisations_notifications_{$fromLabel}_{$toLabel}.csv";

        return response()->streamDownload(function () use ($rows) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            fputcsv($handle, [
                'Date',
                'Type',
                'Canal',
                'Titre',
                'Message',
                'Cotisation ID',
                'Cotisation',
                'Jours restants',
                'Destinataire ID',
                'Lu le',
            ], ';');

            foreach ($rows as $item) {
                $mapped = $this->mapNotificationRow($item);
                fputcsv($handle, [
                    Carbon::parse($mapped['created_at'])->format('d/m/Y H:i'),
                    $this->typeLabel($mapped['type']),
                    $mapped['channel'],
                    $mapped['title'],
                    $mapped['body'] ?? '',
                    $mapped['contribution_id'] ?? '',
                    $mapped['contribution_title'] ?? '',
                    $mapped['days_left'] ?? '',
                    $mapped['notifiable_id'],
                    $mapped['read_at'] ? Carbon::parse($mapped['read_at'])->format('d/m/Y H:i') : '',
                ], ';');
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    protected function notificationsQuery(string $typeFilter, ?CarbonInterface $from, ?CarbonInterface $to): Builder
    {
        return DB::table('notifications')
            ->whereIn('type', $this->trackedTypes())
            ->when($typeFilter !== '', fn ($q) => $q->where('type', $typeFilter))
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('created_at', '<=', $to));
    }

    /** @return array{0: ?CarbonInterface, 1: ?CarbonInterface} */
    protected function parseOptionalDateRange(Request $request): array
    {
        $fromRaw = $request->string('from')->toString();
        $toRaw = $request->string('to')->toString();

        if ($fromRaw === '' && $toRaw === '') {
            return [null, null];
        }

        $from = $fromRaw !== '' ? Carbon::parse($fromRaw)->startOfDay() : now()->subDays(30)->startOfDay();
        $to = $toRaw !== '' ? Carbon::parse($toRaw)->endOfDay() : now()->endOfDay();

        if ($from->gt($to)) {
            $from = $to->copy()->subDays(30)->startOfDay();
        }

        return [$from, $to];
    }

    protected function mapNotificationRow(object $item): array
    {
        $payload = is_string($item->data) ? json_decode($item->data, true) : (array) $item->data;

        return [
            'id' => $item->id,
            'type' => $item->type,
            'channel' => 'in_app'.($this->isMailEnabled() ? ' + email' : ''),
            'title' => $payload['title'] ?? 'Notification cotisation',
            'body' => $payload['body'] ?? null,
            'contribution_id' => $payload['contribution_id'] ?? null,
            'contribution_title' => $payload['contribution_title'] ?? null,
            'days_left' => $payload['days_left'] ?? null,
            'created_at' => $item->created_at,
            'read_at' => $item->read_at,
            'notifiable_id' => $item->notifiable_id,
            'notifiable_type' => $item->notifiable_type,
        ];
    }

    protected function buildStats(string $typeFilter, ?CarbonInterface $from, ?CarbonInterface $to): array
    {
        $base = fn () => $this->notificationsQuery($typeFilter, $from, $to);

        return [
            'total_notifications' => $base()->count('*'),
            'invitations_sent' => $base()->where('type', EventContributionInvitationNotification::class)->count('*'),
            'new_payments_sent' => $base()->where('type', EventContributionNewPaymentNotification::class)->count('*'),
            'thank_you_sent' => $base()->where('type', EventContributionThankYouNotification::class)->count('*'),
            'deadline_reminders_sent' => $base()->where('type', EventContributionDeadlineReminderNotification::class)->count('*'),
            'contributions_total' => EventContribution::query()->count('*'),
        ];
    }

    /** @return list<array{name: string, count: int}> */
    protected function sendsPerDay(string $typeFilter, CarbonInterface $from, CarbonInterface $to): array
    {
        $driver = DB::getDriverName();
        $dateExpr = $driver === 'sqlite'
            ? "strftime('%Y-%m-%d', created_at)"
            : 'DATE(created_at)';

        $counts = $this->notificationsQuery($typeFilter, $from, $to)
            ->selectRaw("{$dateExpr} as day, count(*) as total")
            ->groupByRaw($dateExpr)
            ->orderBy('day')
            ->pluck('total', 'day');

        $days = [];
        $cursor = Carbon::parse($from)->startOfDay();
        $end = Carbon::parse($to)->startOfDay();

        while ($cursor->lte($end)) {
            $key = $cursor->toDateString();
            $days[] = [
                'name' => $cursor->format('d/m'),
                'count' => (int) ($counts[$key] ?? 0),
            ];
            $cursor->addDay();
        }

        return $days;
    }

    protected function reminderAudits(?CarbonInterface $from, ?CarbonInterface $to): Collection
    {
        return AuditLog::query()
            ->with('actor:id,name,email')
            ->where('action', 'event_contribution_deadline_reminder_sent')
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('created_at', '<=', $to))
            ->latest()
            ->limit(30)
            ->get()
            ->map(fn (AuditLog $log) => [
                'id' => $log->id,
                'created_at' => $log->created_at?->toIso8601String(),
                'actor' => $log->actor ? ['id' => $log->actor->id, 'name' => $log->actor->name] : null,
                'description' => $log->description,
                'context' => $log->context,
            ]);
    }

    protected function typeLabel(string $type): string
    {
        return match (true) {
            str_contains($type, 'Invitation') => 'Invitation',
            str_contains($type, 'NewPayment') => 'Nouvelle contribution',
            str_contains($type, 'ThankYou') => 'Remerciement',
            str_contains($type, 'DeadlineReminder') => 'Rappel date limite',
            default => $type,
        };
    }

    protected function isMailEnabled(): bool
    {
        return (bool) AppSetting::get('notify_event_contribution_by_email', true);
    }
}
