import { Link, usePage } from '@inertiajs/react';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;

    return (
        <div className="relative grid min-h-screen flex-col items-center justify-center lg:max-w-none lg:grid-cols-2">
            {/* Panneau gauche — branding PAD */}
            <div className="relative hidden h-full flex-col lg:flex" style={{ background: 'linear-gradient(160deg, #0a1f44 0%, #0d3b7a 50%, #0a5fa8 100%)' }}>
                {/* Motif vagues subtil */}
                <div className="absolute inset-0 overflow-hidden opacity-10">
                    <svg viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                        <path d="M0 400 Q200 300 400 400 Q600 500 800 400 L800 800 L0 800 Z" fill="white" />
                        <path d="M0 500 Q200 400 400 500 Q600 600 800 500 L800 800 L0 800 Z" fill="white" opacity="0.5" />
                    </svg>
                </div>

                {/* Contenu */}
                <div className="relative z-10 flex h-full flex-col items-center justify-center gap-10 p-12">
                    <Link href={home()} className="flex flex-col items-center gap-6">
                        <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-white p-4 shadow-2xl">
                            <img
                                src="/assets/images/pad-logo.png"
                                alt="PAD"
                                className="h-full w-full object-contain"
                            />
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-semibold uppercase tracking-widest text-blue-200">
                                PAD
                            </p>
                            {/* <p className="mt-1 text-sm text-blue-300 tracking-wider">
                                Port Authority of Douala
                            </p> */}
                        </div>
                    </Link>

                    <div className="max-w-xs text-center">
                        <h2 className="text-2xl font-bold text-white">BravoPAD</h2>
                        <p className="mt-3 text-sm leading-relaxed text-blue-200/80">
                            Plateforme de Reconnaissance entre employés de PAD
                        </p>
                    </div>

                    {/* Séparateur décoratif */}
                    <div className="flex items-center gap-3">
                        <div className="h-px w-12 bg-blue-400/40" />
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-400/60" />
                        <div className="h-px w-12 bg-blue-400/40" />
                    </div>
                </div>

                {/* Pied de page côté gauche */}
                <div className="relative z-10 p-6 text-center text-xs text-blue-300/60">
                    © {new Date().getFullYear()} PAD — Tous droits réservés
                </div>
            </div>

            {/* Panneau droit — formulaire */}
            <div className="flex h-full flex-col items-center bg-background px-8 py-12 sm:px-12">
                {/* Logo visible sur mobile uniquement */}
                <Link
                    href={home()}
                    className="mb-8 flex flex-col items-center gap-3 lg:hidden"
                >
                    <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white p-2 shadow-lg ring-1 ring-gray-200">
                        <img
                            src="/assets/images/pad-logo.png"
                            alt="PAD"
                            className="h-full w-full object-contain"
                        />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                        PAD
                    </span>
                </Link>

                <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm">
                    {/* En-tête du formulaire */}
                    <div className="mb-8 flex flex-col items-start gap-1 text-left">
                        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>

                    {children}
                </div>

                <div className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2 text-center text-xs text-muted-foreground">
                    Powered by Kenny LOMIE
                </div>
            </div>
        </div>
    );
}
