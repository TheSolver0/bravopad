<?php

namespace App\Http\Controllers;

use App\Models\Bravo;
use App\Models\BravoValue;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class HrDashboardController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('view-hr-dashboard', User::class);

        [$from, $to] = $this->parseDateRange($request);

        return Inertia::render('HrDashboard', [
            'from'            => $from->toDateString(),
            'to'              => $to->toDateString(),
            'kpis'            => $this->kpis($from, $to),
            'topGivers'       => $this->topGivers($from, $to),
            'topReceivers'    => $this->topReceivers($from, $to),
            'byDepartment'    => $this->byDepartment($from, $to),
            'valueDistribution' => $this->valueDistribution($from, $to),
            'weeklyTrend'     => $this->weeklyTrend($from, $to),
        ]);
    }

    /**
     * Export CSV — toutes les données de la période
     */
    public function export(Request $request)
    {
        $this->authorize('view-hr-dashboard', User::class);

        [$from, $to] = $this->parseDateRange($request);

        $bravos = Bravo::with(['sender:id,name,department', 'receiver:id,name,department', 'values:name'])
            ->whereBetween('created_at', [$from->startOfDay(), $to->endOfDay()])
            ->latest()
            ->get();

        $filename = 'bravos_' . $from->format('Ymd') . '_' . $to->format('Ymd') . '.csv';

        return response()->streamDownload(function () use ($bravos) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, ['Date', 'Émetteur', 'Département émetteur', 'Destinataire', 'Département destinataire', 'Points', 'Valeurs', 'Message']);

            foreach ($bravos as $b) {
                fputcsv($handle, [
                    $b->created_at->format('d/m/Y H:i'),
                    $b->sender?->name,
                    $b->sender?->department,
                    $b->receiver?->name,
                    $b->receiver?->department,
                    $b->points,
                    $b->values->pluck('name')->join(', '),
                    $b->message,
                ]);
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    // -------------------------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------------------------

    private function parseDateRange(Request $request): array
    {
        $from = $request->from ? Carbon::parse($request->from)->startOfDay() : now()->subDays(30)->startOfDay();
        $to   = $request->to   ? Carbon::parse($request->to)->endOfDay()     : now()->endOfDay();

        if ($from->gt($to)) {
            $from = $to->copy()->subDays(30);
        }

        return [$from, $to];
    }

    private function kpis(Carbon $from, Carbon $to): array
    {
        $base = Bravo::whereBetween('created_at', [$from, $to]);

        return [
            'total_bravos'   => (clone $base)->count(),
            'total_points'   => (int) (clone $base)->sum('points'),
            'active_givers'  => (clone $base)->distinct('sender_id')->count('sender_id'),
            'active_receivers'=> (clone $base)->distinct('receiver_id')->count('receiver_id'),
            'total_users'    => User::count(),
        ];
    }

    private function topGivers(Carbon $from, Carbon $to, int $limit = 10): array
    {
        return Bravo::select('sender_id', DB::raw('COUNT(*) as bravo_count'), DB::raw('SUM(points) as points_given'))
            ->with('sender:id,name,avatar,department')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('sender_id')
            ->orderByDesc('bravo_count')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'user'         => $row->sender ? ['id' => $row->sender->id, 'name' => $row->sender->name, 'avatar' => $row->sender->avatar, 'department' => $row->sender->department] : null,
                'bravo_count'  => $row->bravo_count,
                'points_given' => $row->points_given,
            ])
            ->toArray();
    }

    private function topReceivers(Carbon $from, Carbon $to, int $limit = 10): array
    {
        return Bravo::select('receiver_id', DB::raw('COUNT(*) as bravo_count'), DB::raw('SUM(points) as points_received'))
            ->with('receiver:id,name,avatar,department')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('receiver_id')
            ->orderByDesc('points_received')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'user'            => $row->receiver ? ['id' => $row->receiver->id, 'name' => $row->receiver->name, 'avatar' => $row->receiver->avatar, 'department' => $row->receiver->department] : null,
                'bravo_count'     => $row->bravo_count,
                'points_received' => $row->points_received,
            ])
            ->toArray();
    }

    private function byDepartment(Carbon $from, Carbon $to): array
    {
        return Bravo::select('users.department', DB::raw('COUNT(*) as bravo_count'), DB::raw('SUM(bravos.points) as total_points'))
            ->join('users', 'bravos.receiver_id', '=', 'users.id')
            ->whereBetween('bravos.created_at', [$from, $to])
            ->whereNotNull('users.department')
            ->groupBy('users.department')
            ->orderByDesc('bravo_count')
            ->get()
            ->map(fn ($r) => [
                'department'  => $r->department,
                'bravo_count' => $r->bravo_count,
                'total_points'=> $r->total_points,
            ])
            ->toArray();
    }

    private function valueDistribution(Carbon $from, Carbon $to): array
    {
        return BravoValue::select('bravo_values.id', 'bravo_values.name', 'bravo_values.color', DB::raw('COUNT(bravo_bravo_value.bravo_id) as usage_count'))
            ->leftJoin('bravo_bravo_value', 'bravo_values.id', '=', 'bravo_bravo_value.bravo_value_id')
            ->leftJoin('bravos', function ($join) use ($from, $to) {
                $join->on('bravos.id', '=', 'bravo_bravo_value.bravo_id')
                    ->whereBetween('bravos.created_at', [$from, $to]);
            })
            ->groupBy('bravo_values.id', 'bravo_values.name', 'bravo_values.color')
            ->orderByDesc('usage_count')
            ->get()
            ->map(fn ($v) => [
                'name'        => $v->name,
                'color'       => $v->color ?? '#3b82f6',
                'usage_count' => (int) $v->usage_count,
            ])
            ->toArray();
    }

    private function weeklyTrend(Carbon $from, Carbon $to): array
    {
        $weeks = [];
        $cursor = $from->copy()->startOfWeek();

        while ($cursor->lte($to)) {
            $weekEnd = $cursor->copy()->endOfWeek();
            $count = Bravo::whereBetween('created_at', [$cursor, min($weekEnd, $to)])->count();

            $weeks[] = [
                'label'  => 'S' . $cursor->isoWeek(),
                'bravos' => $count,
            ];

            $cursor->addWeek();
        }

        return $weeks;
    }
}
