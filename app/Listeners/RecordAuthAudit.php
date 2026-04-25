<?php

namespace App\Listeners;

use App\Services\Audit\AuditLogger;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;

class RecordAuthAudit
{
    public function handleLogin(Login $event): void
    {
        AuditLogger::log(
            'auth_login',
            ['guard' => $event->guard],
            $event->user,
            null,
            null,
            'info',
            'Connexion utilisateur reussie.',
        );
    }

    public function handleLogout(Logout $event): void
    {
        AuditLogger::log(
            'auth_logout',
            ['guard' => $event->guard],
            $event->user,
            null,
            null,
            'info',
            'Deconnexion utilisateur.',
        );
    }

    public function handleFailed(Failed $event): void
    {
        AuditLogger::log(
            'auth_login_failed',
            [
                'guard' => $event->guard,
                'email' => $event->credentials['email'] ?? null,
            ],
            null,
            null,
            null,
            'warning',
            'Tentative de connexion echouee.',
        );
    }
}
