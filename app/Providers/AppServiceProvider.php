<?php

namespace App\Providers;

use App\Events\BravoSent;
use App\Listeners\RecordAuthAudit;
use App\Listeners\DetectBravoAnomalies;
use App\Listeners\RecordBravoSentAudit;
use App\Listeners\SendBravoNotification;
use App\Models\BravoValue;
use App\Models\User;
use App\Models\Challenge;
use App\Models\Redemption;
use App\Models\Reward;
use App\Policies\BravoValuePolicy;
use App\Policies\ChallengePolicy;
use App\Policies\RedemptionPolicy;
use App\Policies\RewardPolicy;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->registerPolicies();
        $this->registerEvents();
        Schema::defaultStringLength(191);
    }

    protected function registerPolicies(): void
    {
        Gate::before(function ($user, string $ability) {
            if ($user instanceof User && $user->hasRole('super_admin')) {
                return true;
            }

            return null;
        });

        Gate::policy(Challenge::class, ChallengePolicy::class);
        Gate::policy(BravoValue::class, BravoValuePolicy::class);
        Gate::policy(Reward::class, RewardPolicy::class);
        Gate::policy(Redemption::class, RedemptionPolicy::class);

        Gate::define('view-hr-dashboard', fn ($user) => $user->isManager());
        Gate::define('configure-settings', fn ($user) => $user->isHr());
        Gate::define('manage-bravo-values', fn ($user) => $user->isHr());
        Gate::define('view-audit-log', fn ($user) => $user->isHr());
        Gate::define('manage-users', fn ($user) => $user->isHr());
        Gate::define('manage-roles-permissions', fn ($user) => $user->isAdmin());
    }

    protected function registerEvents(): void
    {
        $authAudit = app(RecordAuthAudit::class);
        Event::listen(Login::class, [$authAudit, 'handleLogin']);
        Event::listen(Logout::class, [$authAudit, 'handleLogout']);
        Event::listen(Failed::class, [$authAudit, 'handleFailed']);

        Event::listen(BravoSent::class, SendBravoNotification::class);
        Event::listen(BravoSent::class, RecordBravoSentAudit::class);
        Event::listen(BravoSent::class, DetectBravoAnomalies::class);
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
