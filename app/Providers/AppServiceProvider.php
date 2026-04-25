<?php

namespace App\Providers;

use App\Events\BravoSent;
use App\Listeners\SendBravoNotification;
use App\Models\BravoValue;
use App\Models\Challenge;
use App\Models\Redemption;
use App\Models\Reward;
use App\Policies\BravoValuePolicy;
use App\Policies\ChallengePolicy;
use App\Policies\RedemptionPolicy;
use App\Policies\RewardPolicy;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str as SupportStr;
use Illuminate\Validation\Rules\Password;
use Pest\Support\Str;

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
        Gate::policy(Challenge::class, ChallengePolicy::class);
        Gate::policy(BravoValue::class, BravoValuePolicy::class);
        Gate::policy(Reward::class, RewardPolicy::class);
        Gate::policy(Redemption::class, RedemptionPolicy::class);

        // Gates basées sur permissions Spatie (abilities string)
        Gate::define('view-hr-dashboard', fn ($user) => $user->isManager());
        Gate::define('configure-settings', fn ($user) => $user->isHr());
        Gate::define('manage-bravo-values', fn ($user) => $user->isHr());
    }

    protected function registerEvents(): void
    {
        Event::listen(BravoSent::class, SendBravoNotification::class);
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
