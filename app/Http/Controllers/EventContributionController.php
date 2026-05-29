<?php

namespace App\Http\Controllers;

use App\Models\EventContribution;
use App\Models\EventContributionInvite;
use App\Models\EventContributionPayment;
use App\Models\User;
use App\Notifications\EventContributionInvitationNotification;
use App\Notifications\EventContributionNewPaymentNotification;
use App\Notifications\EventContributionThankYouNotification;
use App\Services\Audit\AuditLogger;
use App\Services\EventContribution\EventContributionDetailExporter;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EventContributionController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $scope = $request->string('scope')->toString();
        $q = $request->string('q')->toString();
        $status = $request->string('status')->toString();

        $contributions = EventContribution::query()
            ->with(['creator:id,name', 'invites', 'payments'])
            ->where(function ($query) use ($user) {
                $query
                    ->where('creator_id', $user->id)
                    ->orWhereHas('invites', fn ($q) => $q->where('user_id', $user->id)->where('status', '!=', 'declined'));
            })
            ->when($scope === 'created', fn ($query) => $query->where('creator_id', $user->id))
            ->when($scope === 'invited', fn ($query) => $query->where('creator_id', '!=', $user->id)->whereHas('invites', fn ($q) => $q->where('user_id', $user->id)->where('status', '!=', 'declined')))
            ->when($q !== '', function ($query) use ($q) {
                $query->where(function ($sub) use ($q) {
                    $sub->where('title', 'like', "%{$q}%")
                        ->orWhere('event_type', 'like', "%{$q}%")
                        ->orWhereHas('creator', fn ($c) => $c->where('name', 'like', "%{$q}%"));
                });
            })
            ->when($status !== '', function ($query) use ($status) {
                $today = now()->toDateString();
                if ($status === 'open') {
                    $query->where(function ($q) use ($today) {
                        $q->whereNull('deadline_at')->orWhereDate('deadline_at', '>=', $today);
                    });
                }
                if ($status === 'closing_soon') {
                    $query->whereNotNull('deadline_at')->whereBetween('deadline_at', [now()->toDateString(), now()->addDays(7)->toDateString()]);
                }
                if ($status === 'closed') {
                    $query->whereNotNull('deadline_at')->whereDate('deadline_at', '<', $today);
                }
            })
            ->latest()
            ->get()
            ->map(fn (EventContribution $contribution) => $this->serializeContribution($contribution, $user));

        return Inertia::render('EventContributions', [
            'contributions' => $contributions,
            'users' => User::query()->select(['id', 'name', 'email'])->orderBy('name', 'asc')->get(),
            'can_view_global_stats' => Gate::forUser($user)->allows('view-event-contribution-stats'),
            'global_stats' => Gate::forUser($user)->allows('view-event-contribution-stats')
                ? $this->globalStats()
                : null,
            'filters' => [
                'scope' => $scope,
                'q' => $q,
                'status' => $status,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:4000'],
            'event_type' => ['required', 'string', 'max:80'],
            'goal_amount' => ['nullable', 'numeric', 'min:0'],
            'deadline_at' => ['nullable', 'date', 'after_or_equal:today'],
            'banner' => ['nullable', 'image', 'max:4096'],
            'visibility' => ['required', Rule::in(['public', 'private'])],
            'amount_mode' => ['required', Rule::in(['global', 'per_participant'])],
            'amount_per_participant' => ['nullable', 'numeric', 'min:0', 'required_if:amount_mode,per_participant'],
            'payment_methods' => ['required', 'array', 'min:1'],
            'payment_methods.*' => [Rule::in(['orange_money', 'mtn_money', 'cash'])],
            'allow_view_total' => ['boolean'],
            'allow_view_participants' => ['boolean'],
            'allow_view_individual_amounts' => ['boolean'],
            'allow_view_participant_count' => ['boolean'],
            'invite_user_ids' => ['nullable', 'array'],
            'invite_user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $bannerPath = $request->file('banner')?->store('event-contributions', 'public');

        $contribution = EventContribution::create([
            'creator_id' => $request->user()->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'event_type' => $validated['event_type'],
            'goal_amount' => $validated['goal_amount'] ?? null,
            'amount_mode' => $validated['amount_mode'],
            'amount_per_participant' => $validated['amount_mode'] === 'per_participant'
                ? ($validated['amount_per_participant'] ?? null)
                : null,
            'deadline_at' => $validated['deadline_at'] ?? null,
            'banner_path' => $bannerPath,
            'visibility' => $validated['visibility'],
            'payment_methods' => array_values(array_unique($validated['payment_methods'])),
            'allow_view_total' => $validated['allow_view_total'] ?? true,
            'allow_view_participants' => $validated['allow_view_participants'] ?? true,
            'allow_view_individual_amounts' => $validated['allow_view_individual_amounts'] ?? false,
            'allow_view_participant_count' => $validated['allow_view_participant_count'] ?? true,
        ]);

        $this->syncInviteesAndNotify(
            $contribution,
            collect($validated['invite_user_ids'] ?? []),
            $request->user(),
            true,
        );

        if ($contribution->visibility === 'public') {
            $this->notifyPublicAudience($contribution, $request->user());
        }

        AuditLogger::log(
            'event_contribution_created',
            [
                'event_contribution_id' => $contribution->id,
                'visibility' => $contribution->visibility,
                'payment_methods' => $contribution->payment_methods,
                'invites_count' => count($validated['invite_user_ids'] ?? []),
            ],
            $request->user(),
            EventContribution::class,
            $contribution->id,
            'info',
            "Cotisation creee: {$contribution->title}",
        );

        return back()->with('success', 'Cotisation creee avec succes.');
    }

    public function update(Request $request, EventContribution $contribution)
    {
        $this->authorizeOwnerOrAdmin($request->user(), $contribution);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:4000'],
            'event_type' => ['required', 'string', 'max:80'],
            'goal_amount' => ['nullable', 'numeric', 'min:0'],
            'deadline_at' => ['nullable', 'date', 'after_or_equal:today'],
            'banner' => ['nullable', 'image', 'max:4096'],
            'visibility' => ['required', Rule::in(['public', 'private'])],
            'amount_mode' => ['required', Rule::in(['global', 'per_participant'])],
            'amount_per_participant' => ['nullable', 'numeric', 'min:0', 'required_if:amount_mode,per_participant'],
            'payment_methods' => ['required', 'array', 'min:1'],
            'payment_methods.*' => [Rule::in(['orange_money', 'mtn_money', 'cash'])],
            'allow_view_total' => ['boolean'],
            'allow_view_participants' => ['boolean'],
            'allow_view_individual_amounts' => ['boolean'],
            'allow_view_participant_count' => ['boolean'],
            'invite_user_ids' => ['nullable', 'array'],
            'invite_user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $bannerPath = $request->file('banner')?->store('event-contributions', 'public');

        $contribution->update([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'event_type' => $validated['event_type'],
            'goal_amount' => $validated['goal_amount'] ?? null,
            'amount_mode' => $validated['amount_mode'],
            'amount_per_participant' => $validated['amount_mode'] === 'per_participant'
                ? ($validated['amount_per_participant'] ?? null)
                : null,
            'deadline_at' => $validated['deadline_at'] ?? null,
            'banner_path' => $bannerPath ?? $contribution->banner_path,
            'visibility' => $validated['visibility'],
            'payment_methods' => array_values(array_unique($validated['payment_methods'])),
            'allow_view_total' => $validated['allow_view_total'] ?? true,
            'allow_view_participants' => $validated['allow_view_participants'] ?? true,
            'allow_view_individual_amounts' => $validated['allow_view_individual_amounts'] ?? false,
            'allow_view_participant_count' => $validated['allow_view_participant_count'] ?? true,
        ]);

        $this->syncInviteesAndNotify(
            $contribution,
            collect($validated['invite_user_ids'] ?? []),
            $request->user(),
            false,
        );

        if ($contribution->visibility === 'public') {
            $this->notifyPublicAudience($contribution, $request->user());
        }

        AuditLogger::log(
            'event_contribution_updated',
            [
                'event_contribution_id' => $contribution->id,
                'visibility' => $contribution->visibility,
                'payment_methods' => $contribution->payment_methods,
            ],
            $request->user(),
            EventContribution::class,
            $contribution->id,
            'info',
            "Cotisation mise a jour: {$contribution->title}",
        );

        return back()->with('success', 'Cotisation mise a jour.');
    }

    public function destroy(Request $request, EventContribution $contribution)
    {
        $this->authorizeOwnerOrAdmin($request->user(), $contribution);

        $title = $contribution->title;
        $id = $contribution->id;
        EventContribution::query()->whereKey($id)->delete();

        AuditLogger::log(
            'event_contribution_deleted',
            ['event_contribution_id' => $id, 'title' => $title],
            $request->user(),
            EventContribution::class,
            $id,
            'warning',
            "Cotisation supprimee: {$title}",
        );

        return back()->with('success', 'Cotisation supprimee.');
    }

    public function export(Request $request): StreamedResponse
    {
        $user = $request->user();
        $scope = $request->string('scope')->toString();
        $q = $request->string('q')->toString();
        $status = $request->string('status')->toString();

        $rows = EventContribution::query()
            ->with(['creator:id,name', 'invites', 'payments'])
            ->where(function ($query) use ($user) {
                $query
                    ->where('creator_id', $user->id)
                    ->orWhereHas('invites', fn ($q) => $q->where('user_id', $user->id)->where('status', '!=', 'declined'));
            })
            ->when($scope === 'created', fn ($query) => $query->where('creator_id', $user->id))
            ->when($scope === 'invited', fn ($query) => $query->where('creator_id', '!=', $user->id)->whereHas('invites', fn ($q) => $q->where('user_id', $user->id)->where('status', '!=', 'declined')))
            ->when($q !== '', function ($query) use ($q) {
                $query->where(function ($sub) use ($q) {
                    $sub->where('title', 'like', "%{$q}%")
                        ->orWhere('event_type', 'like', "%{$q}%")
                        ->orWhereHas('creator', fn ($c) => $c->where('name', 'like', "%{$q}%"));
                });
            })
            ->when($status !== '', function ($query) use ($status) {
                $today = now()->toDateString();
                if ($status === 'open') {
                    $query->where(function ($q) use ($today) {
                        $q->whereNull('deadline_at')->orWhereDate('deadline_at', '>=', $today);
                    });
                }
                if ($status === 'closing_soon') {
                    $query->whereNotNull('deadline_at')->whereBetween('deadline_at', [now()->toDateString(), now()->addDays(7)->toDateString()]);
                }
                if ($status === 'closed') {
                    $query->whereNotNull('deadline_at')->whereDate('deadline_at', '<', $today);
                }
            })
            ->latest()
            ->get();

        $filename = 'cotisations_'.now()->format('Ymd_His').'.csv';

        return response()->streamDownload(function () use ($rows, $user) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));
            fputcsv($handle, [
                'Titre',
                'Type',
                'Visibilite',
                'Mon role',
                'Objectif',
                'Collecte',
                'Participants',
                'Date limite',
                'Createur',
            ], ';');

            foreach ($rows as $contribution) {
                $data = $this->serializeContribution($contribution, $user);
                fputcsv($handle, [
                    $data['title'],
                    $data['event_type'],
                    $data['visibility'],
                    $data['viewer_role'],
                    $data['goal_amount'] ?? '',
                    $data['stats']['total_collected'] ?? '',
                    $data['stats']['participants_count'] ?? '',
                    $data['deadline_at'] ?? '',
                    $data['creator']['name'] ?? '',
                ], ';');
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function show(Request $request, EventContribution $contribution): Response
    {
        $user = $request->user();
        $this->authorizeAccess($user, $contribution);

        $contribution->load(['creator:id,name', 'invites.user:id,name', 'payments.contributor:id,name']);

        return Inertia::render('EventContributionDetail', [
            'contribution' => $this->serializeContribution($contribution, $user),
            'users' => User::query()->select(['id', 'name', 'email'])->orderBy('name', 'asc')->get(),
        ]);
    }

    public function exportDetailExcel(Request $request, EventContribution $contribution): StreamedResponse
    {
        $user = $request->user();
        $this->authorizeAccess($user, $contribution);
        $contribution->load(['creator:id,name', 'invites.user:id,name', 'payments.contributor:id,name']);

        $exporter = new EventContributionDetailExporter(
            $this->buildDetailExportPayload($contribution, $user),
        );

        return $exporter->excelDownload();
    }

    public function exportDetailPdf(Request $request, EventContribution $contribution)
    {
        $user = $request->user();
        $this->authorizeAccess($user, $contribution);
        $contribution->load(['creator:id,name', 'invites.user:id,name', 'payments.contributor:id,name']);

        $exporter = new EventContributionDetailExporter(
            $this->buildDetailExportPayload($contribution, $user),
        );

        return response($exporter->pdfBinary(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$exporter->pdfFilename().'"',
        ]);
    }

    public function contribute(Request $request, EventContribution $contribution)
    {
        $this->authorizeAccess($request->user(), $contribution);

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:100'],
            'payment_method' => ['required', Rule::in(['orange_money', 'mtn_money', 'cash'])],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $isCreator = (int) $contribution->creator_id === (int) $request->user()->id;
        if (! $isCreator && $validated['payment_method'] === 'cash') {
            return back()->with('error', 'Seul le createur peut contribuer en cash.');
        }

        if (! in_array($validated['payment_method'], $contribution->payment_methods ?? [], true)) {
            return back()->with('error', 'Ce mode de paiement n est pas active pour cette cotisation.');
        }

        $payment = EventContributionPayment::create([
            'event_contribution_id' => $contribution->id,
            'contributor_user_id' => $request->user()->id,
            'recorded_by' => $request->user()->id,
            'amount' => $validated['amount'],
            'payment_method' => $validated['payment_method'],
            'is_manual' => false,
            'note' => $validated['note'] ?? null,
            'paid_at' => now(),
        ]);

        $contribution->creator?->notify(new EventContributionNewPaymentNotification($contribution, $payment));
        $request->user()->notify(new EventContributionThankYouNotification($contribution, $payment));

        AuditLogger::log(
            'event_contribution_payment_recorded',
            [
                'event_contribution_id' => $contribution->id,
                'payment_id' => $payment->id,
                'amount' => (float) $payment->amount,
                'payment_method' => $payment->payment_method,
                'is_manual' => false,
            ],
            $request->user(),
            EventContributionPayment::class,
            $payment->id,
            'info',
            "Nouvelle contribution enregistree pour {$contribution->title}.",
        );

        return back()->with('success', 'Contribution enregistree.');
    }

    public function recordManualContribution(Request $request, EventContribution $contribution)
    {
        abort_unless((int) $contribution->creator_id === (int) $request->user()->id, 403);

        $validated = $request->validate([
            'contributor_user_ids' => ['required', 'array', 'min:1'],
            'contributor_user_ids.*' => ['integer', 'exists:users,id'],
            'amount' => ['required', 'numeric', 'min:100'],
            'payment_method' => ['required', Rule::in(['orange_money', 'mtn_money', 'cash'])],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        if (! in_array($validated['payment_method'], $contribution->payment_methods ?? [], true)) {
            return back()->with('error', 'Ce mode de paiement n est pas active pour cette cotisation.');
        }

        $eligibleIds = collect($this->participantUserIds($contribution));
        $userIds = collect($validated['contributor_user_ids'])
            ->map(static fn ($id) => (int) $id)
            ->unique()
            ->values();

        if ($contribution->visibility === 'private' && $userIds->diff($eligibleIds)->isNotEmpty()) {
            return back()->with('error', 'Un ou plusieurs participants ne sont pas invites a cette cotisation.');
        }

        $amount = (float) $validated['amount'];
        $created = 0;

        foreach ($userIds as $userId) {
            $payment = EventContributionPayment::create([
                'event_contribution_id' => $contribution->id,
                'contributor_user_id' => $userId,
                'recorded_by' => $request->user()->id,
                'contributor_name' => null,
                'amount' => $amount,
                'payment_method' => $validated['payment_method'],
                'is_manual' => true,
                'note' => $validated['note'] ?? null,
                'paid_at' => now(),
            ]);

            $contribution->creator?->notify(new EventContributionNewPaymentNotification($contribution, $payment));

            User::query()->find($userId)?->notify(
                new EventContributionThankYouNotification($contribution, $payment),
            );

            AuditLogger::log(
                'event_contribution_payment_recorded',
                [
                    'event_contribution_id' => $contribution->id,
                    'payment_id' => $payment->id,
                    'contributor_user_id' => $userId,
                    'amount' => $amount,
                    'payment_method' => $payment->payment_method,
                    'is_manual' => true,
                ],
                $request->user(),
                EventContributionPayment::class,
                $payment->id,
                'info',
                "Contribution enregistree pour {$contribution->title}.",
            );

            $created++;
        }

        return back()->with('success', $created > 1
            ? "{$created} contributions enregistrees."
            : 'Contribution enregistree.');
    }

    protected function authorizeAccess(User $user, EventContribution $contribution): void
    {
        if ($contribution->visibility === 'public') {
            return;
        }

        $isCreator = (int) $contribution->creator_id === (int) $user->id;
        $isInvited = $contribution->invites()
            ->where('user_id', $user->id)
            ->whereIn('status', ['pending', 'accepted'])
            ->exists();

        abort_unless($isCreator || $isInvited, 403);
    }

    protected function serializeContribution(EventContribution $contribution, User $viewer): array
    {
        $isCreator = (int) $contribution->creator_id === (int) $viewer->id;
        $isAdminViewer = $viewer->isAdmin() || $viewer->isSuperAdmin();
        $isInvited = $contribution->invites->contains(fn (EventContributionInvite $invite) => (int) $invite->user_id === (int) $viewer->id);
        $canSeePrivate = $isCreator || $isAdminViewer;
        $canSeeTotals = $canSeePrivate || $contribution->allow_view_total;
        $canSeeParticipants = $canSeePrivate || $contribution->allow_view_participants;
        $canSeeAmounts = $canSeePrivate || $contribution->allow_view_individual_amounts;
        $canSeeParticipantCount = $canSeePrivate || $contribution->allow_view_participant_count;

        $payments = $contribution->payments->sortByDesc('paid_at');
        $totalCollected = (float) $payments->sum('amount');
        $audienceCount = $contribution->visibility === 'public'
            ? max(0, (int) User::query()->where('is_automation', false)->count('*') - 1)
            : (int) $contribution->invites->count();
        $goalAmount = $contribution->goal_amount !== null ? (float) $contribution->goal_amount : null;
        $participantCountForPot = $contribution->visibility === 'private'
            ? (int) $contribution->invites->count()
            : $audienceCount;
        $potAmount = null;
        if ($contribution->amount_mode === 'per_participant' && $contribution->amount_per_participant !== null) {
            $potAmount = (float) $contribution->amount_per_participant * $participantCountForPot;
        } elseif ($goalAmount !== null) {
            $potAmount = $goalAmount;
        }
        $collectionProgress = $potAmount && $potAmount > 0
            ? min(100, (int) round(($totalCollected / $potAmount) * 100))
            : null;
        $goalProgress = $goalAmount && $goalAmount > 0 && $contribution->amount_mode !== 'per_participant'
            ? min(100, round(($totalCollected / $goalAmount) * 100))
            : null;
        $isClosed = $contribution->deadline_at !== null
            && $contribution->deadline_at->isPast();
        $contributionStatus = $this->resolveContributionStatus(
            $totalCollected,
            $potAmount,
            $collectionProgress,
            $isClosed,
        );

        return [
            'id' => $contribution->id,
            'title' => $contribution->title,
            'description' => $contribution->description,
            'event_type' => $contribution->event_type,
            'goal_amount' => $contribution->goal_amount,
            'amount_mode' => $contribution->amount_mode ?? 'global',
            'amount_per_participant' => $contribution->amount_per_participant,
            'deadline_at' => $contribution->deadline_at?->toDateString(),
            'banner_url' => $contribution->banner_path ? asset('storage/'.$contribution->banner_path) : null,
            'visibility' => $contribution->visibility,
            'viewer_role' => $isCreator ? 'creator' : ($isInvited ? 'invitee' : 'viewer'),
            'payment_methods' => $contribution->payment_methods,
            'creator' => [
                'id' => $contribution->creator->id,
                'name' => $contribution->creator->name,
            ],
            'stats' => [
                'total_collected' => $canSeeTotals ? $totalCollected : null,
                'participants_count' => $canSeeParticipantCount ? $audienceCount : null,
                'pot_amount' => $canSeeTotals ? $potAmount : null,
                'collection_progress_percent' => $canSeeTotals ? $collectionProgress : null,
                'contribution_status' => $canSeeTotals ? $contributionStatus : null,
                'goal_progress_percent' => $canSeeTotals && $contribution->amount_mode !== 'per_participant' ? $goalProgress : null,
            ],
            'invitees' => $canSeeParticipants
                ? $contribution->invites->map(fn (EventContributionInvite $invite) => [
                    'user_id' => $invite->user_id,
                    'name' => $invite->user?->name,
                    'status' => $invite->status,
                ])->values()
                : [],
            'participants' => $canSeeParticipants
                ? $this->buildParticipantRows($contribution, $payments, $canSeeAmounts)
                : [],
            'payments' => $canSeeParticipants
                ? $payments->map(fn (EventContributionPayment $payment) => [
                    'id' => $payment->id,
                    'amount' => $canSeeAmounts ? (float) $payment->amount : null,
                    'payment_method' => $payment->payment_method,
                    'is_manual' => (bool) $payment->is_manual,
                    'contributor_user_id' => $payment->contributor_user_id,
                    'contributor_name' => $payment->contributor?->name ?? $payment->contributor_name ?? 'Anonyme',
                    'paid_at' => $payment->paid_at?->toIso8601String(),
                    'note' => $payment->note,
                ])->values()
                : [],
            'can_record_manual' => $isCreator,
            'can_contribute' => ! $isCreator || in_array('orange_money', $contribution->payment_methods ?? [], true) || in_array('mtn_money', $contribution->payment_methods ?? [], true),
            'can_edit' => $isCreator || $isAdminViewer,
            'can_delete' => $isCreator || $isAdminViewer,
        ];
    }

    /**
     * @return list<int>
     */
    protected function participantUserIds(EventContribution $contribution): array
    {
        if ($contribution->visibility === 'private') {
            return $contribution->invites
                ->pluck('user_id')
                ->map(static fn ($id) => (int) $id)
                ->unique()
                ->values()
                ->all();
        }

        $invited = $contribution->invites
            ->pluck('user_id')
            ->map(static fn ($id) => (int) $id)
            ->unique()
            ->values();

        if ($invited->isNotEmpty()) {
            return $invited->all();
        }

        return User::query()
            ->where('is_automation', false)
            ->orderBy('name')
            ->limit(300)
            ->pluck('id')
            ->map(static fn ($id) => (int) $id)
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    protected function buildParticipantRows(
        EventContribution $contribution,
        Collection $payments,
        bool $canSeeAmounts,
    ): array {
        $userIds = $this->participantUserIds($contribution);
        if ($userIds === []) {
            return [];
        }

        $users = User::query()
            ->whereIn('id', $userIds)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->keyBy('id');

        $paidByUser = $payments
            ->filter(fn (EventContributionPayment $payment) => $payment->contributor_user_id !== null)
            ->groupBy('contributor_user_id')
            ->map(fn ($group) => (float) $group->sum('amount'));

        $targetPerPerson = $contribution->amount_mode === 'per_participant' && $contribution->amount_per_participant !== null
            ? (float) $contribution->amount_per_participant
            : null;

        return collect($userIds)->map(function (int $userId) use ($users, $paidByUser, $targetPerPerson, $canSeeAmounts) {
            $paid = (float) ($paidByUser[$userId] ?? 0);
            $progress = $targetPerPerson && $targetPerPerson > 0
                ? min(100, (int) round(($paid / $targetPerPerson) * 100))
                : null;

            $status = 'pending';
            if ($targetPerPerson !== null) {
                if ($paid >= $targetPerPerson) {
                    $status = 'complete';
                } elseif ($paid > 0) {
                    $status = 'partial';
                }
            } elseif ($paid > 0) {
                $status = 'partial';
            }

            return [
                'user_id' => $userId,
                'name' => $users[$userId]->name ?? 'Inconnu',
                'target_amount' => $canSeeAmounts ? $targetPerPerson : null,
                'paid_amount' => $canSeeAmounts ? $paid : null,
                'remaining_amount' => $canSeeAmounts && $targetPerPerson !== null
                    ? max(0, $targetPerPerson - $paid)
                    : null,
                'progress_percent' => $canSeeAmounts ? $progress : null,
                'is_fully_paid' => $targetPerPerson !== null && $paid >= $targetPerPerson,
                'contribution_status' => $canSeeAmounts ? $status : null,
            ];
        })->values()->all();
    }

    /**
     * @return array<string, mixed>
     */
    protected function buildDetailExportPayload(EventContribution $contribution, User $viewer): array
    {
        $data = $this->serializeContribution($contribution, $viewer);

        return [
            'title' => $data['title'],
            'event_type' => $data['event_type'],
            'visibility' => $data['visibility'] === 'public' ? 'Publique' : 'Privee',
            'creator_name' => $data['creator']['name'],
            'deadline_at' => $data['deadline_at']
                ? now()->parse($data['deadline_at'])->format('d/m/Y')
                : null,
            'amount_mode_label' => $data['amount_mode'] === 'per_participant'
                ? 'Montant fixe par personne'
                : 'Objectif global',
            'pot_amount' => $data['stats']['pot_amount'],
            'total_collected' => $data['stats']['total_collected'],
            'participants_count' => $data['stats']['participants_count'] ?? count($data['participants']),
            'exported_at' => now()->format('d/m/Y H:i'),
            'exporter_name' => $viewer->name,
            'participants' => collect($data['participants'])->map(fn (array $row) => [
                'name' => $row['name'],
                'target_amount' => $row['target_amount'],
                'paid_amount' => $row['paid_amount'],
                'remaining_amount' => $row['remaining_amount'],
                'progress_percent' => $row['progress_percent'],
                'status_label' => $this->participantStatusLabel($row['contribution_status'] ?? 'pending'),
            ])->values()->all(),
            'payments' => collect($data['payments'])->map(fn (array $row) => [
                'paid_at' => $row['paid_at']
                    ? now()->parse($row['paid_at'])->format('d/m/Y H:i')
                    : '',
                'contributor_name' => $row['contributor_name'],
                'amount' => $row['amount'],
                'payment_method_label' => $this->paymentMethodLabel($row['payment_method']),
                'is_manual' => (bool) $row['is_manual'],
                'note' => $row['note'] ?? '',
            ])->values()->all(),
        ];
    }

    protected function participantStatusLabel(string $status): string
    {
        return match ($status) {
            'complete' => 'A jour',
            'partial' => 'Partiel',
            default => 'En attente',
        };
    }

    protected function paymentMethodLabel(string $method): string
    {
        return match ($method) {
            'orange_money' => 'Orange Money',
            'mtn_money' => 'MTN Mobile Money',
            'cash' => 'Cash / Especes',
            default => $method,
        };
    }

    protected function resolveContributionStatus(
        float $totalCollected,
        ?float $potAmount,
        ?int $collectionProgress,
        bool $isClosed,
    ): string {
        if ($isClosed) {
            return 'closed';
        }
        if ($potAmount !== null && $potAmount > 0 && $totalCollected >= $potAmount) {
            return 'completed';
        }
        if ($totalCollected > 0) {
            return 'in_progress';
        }

        return 'pending';
    }

    protected function syncInviteesAndNotify(
        EventContribution $contribution,
        Collection $rawInviteIds,
        User $actor,
        bool $notifyAll,
    ): void {
        $inviteIds = $rawInviteIds
            ->map(static fn ($id) => (int) $id)
            ->reject(fn ($id) => $id === (int) $contribution->creator_id)
            ->unique()
            ->values();

        $existingInviteIds = $contribution->invites()->pluck('user_id')->map(static fn ($id) => (int) $id);
        $newInviteIds = $notifyAll ? $inviteIds : $inviteIds->diff($existingInviteIds)->values();

        $contribution->invites()->whereNotIn('user_id', $inviteIds)->delete();

        foreach ($inviteIds as $invitedUserId) {
            EventContributionInvite::updateOrCreate(
                [
                    'event_contribution_id' => $contribution->id,
                    'user_id' => $invitedUserId,
                ],
                [
                    'invited_by' => $actor->id,
                    'status' => 'pending',
                ],
            );
        }

        if ($newInviteIds->isEmpty()) {
            return;
        }

        User::query()
            ->whereKey($newInviteIds->all())
            ->get()
            ->each(fn (User $user) => $user->notify(new EventContributionInvitationNotification($contribution, $actor)));
    }

    protected function notifyPublicAudience(EventContribution $contribution, User $actor): void
    {
        User::query()
            ->where('is_automation', false)
            ->whereKeyNot($actor->id)
            ->whereDoesntHave('notifications', fn ($q) => $q
                ->where('type', EventContributionInvitationNotification::class)
                ->where('data->contribution_id', $contribution->id)
                ->where('data->is_public', true)
            )
            ->chunkById(200, function ($users) use ($contribution, $actor) {
                foreach ($users as $user) {
                    $user->notify(new EventContributionInvitationNotification($contribution, $actor, true));
                }
            });
    }

    protected function authorizeOwnerOrAdmin(User $user, EventContribution $contribution): void
    {
        $isOwnerOrAdmin = (int) $contribution->creator_id === (int) $user->id || $user->isAdmin() || $user->isSuperAdmin();
        abort_unless($isOwnerOrAdmin, 403);
    }

    protected function globalStats(): array
    {
        $query = EventContributionPayment::query();

        return [
            'total_contributions' => EventContribution::query()->count('*'),
            'total_collected' => (float) $query->sum('amount'),
            'total_participants' => EventContributionPayment::query()
                ->select('contributor_user_id', 'contributor_name')
                ->distinct()
                ->count('*'),
            'by_event_type' => EventContribution::query()
                ->selectRaw('event_type, count(*) as total')
                ->groupBy('event_type')
                ->orderByDesc('total')
                ->get()
                ->map(fn ($row) => ['event_type' => $row->event_type, 'total' => (int) $row->total]),
            'active_contributions' => EventContribution::query()
                ->withCount('payments')
                ->orderByDesc('payments_count')
                ->limit(5)
                ->get()
                ->map(fn (EventContribution $contribution) => [
                    'id' => $contribution->id,
                    'title' => $contribution->title,
                    'payments_count' => $contribution->payments_count,
                ]),
        ];
    }
}
