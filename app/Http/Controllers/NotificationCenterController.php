<?php

namespace App\Http\Controllers;

use App\Services\Audit\AuditLogger;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationCenterController extends Controller
{
    public function index(Request $request): Response
    {
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('Notifications', [
            'notifications' => $notifications,
        ]);
    }

    public function markRead(Request $request, string $id)
    {
        $updated = $request->user()->notifications()->whereKey($id)->update(['read_at' => now()]);

        if ($updated) {
            AuditLogger::log(
                'notification_read',
                ['notification_id' => $id],
                $request->user(),
                null,
                null,
                'info',
                'Notification marquee comme lue.',
            );
        }

        return back();
    }

    public function markAllRead(Request $request)
    {
        $count = $request->user()->unreadNotifications()->count();
        $request->user()->unreadNotifications->markAsRead();

        if ($count > 0) {
            AuditLogger::log(
                'notifications_read_all',
                ['count' => $count],
                $request->user(),
                null,
                null,
                'info',
                'Toutes les notifications non lues ont ete marquees comme lues.',
            );
        }

        return back();
    }
}
