import React from 'react';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';

import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Kudos';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),

    resolve: async (name) => {
        return resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx')
        ) as any;
    },

    setup({ el, App, props }) {
        return (
            <TooltipProvider delayDuration={0}>
                <App {...props} />
                <Toaster />
            </TooltipProvider>
        );
    },

    progress: {
        color: '#4B5563',
    },

    // 
    layout: (page: any) => {
        const name = page?.component || '';

        if (name === 'welcome') return page;

        if (name.startsWith('auth/')) {
            return <AuthLayout>{page}</AuthLayout>;
        }

        if (name.startsWith('settings/')) {
            return (
                <AppLayout>
                    <SettingsLayout>{page}</SettingsLayout>
                </AppLayout>
            );
        }

        return <AppLayout>{page}</AppLayout>;
    },
});

// Theme init (dark/light)
initializeTheme();