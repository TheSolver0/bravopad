@php
    /* ── Événement inscription OG ── */
    $evenementOg = null;
    if (request()->routeIs('evenement.inscription')) {
        $slug = request()->route('slug');
        if ($slug) {
            $ev = \App\Models\Evenement::where('slug', $slug)->first();
            if ($ev) {
                $evImg = $ev->cover_image;
                if ($evImg && ! filter_var($evImg, FILTER_VALIDATE_URL)) {
                    $evImg = str_starts_with($evImg, '/') ? url($evImg) : asset('storage/' . $evImg);
                }
                $evDateInfo = '';
                if ($ev->date) {
                    $evDateInfo .= $ev->date->format('d/m/Y');
                    if ($ev->heure_debut) $evDateInfo .= ' à ' . substr($ev->heure_debut, 0, 5);
                    if ($ev->lieu)        $evDateInfo .= ' — ' . $ev->lieu;
                }
                $evDesc = $ev->description
                    ? \Illuminate\Support\Str::limit(strip_tags($ev->description), 160)
                    : 'Inscrivez-vous dès maintenant à cet événement du Port Autonome de Douala.';
                $evenementOg = [
                    'title'       => $ev->nom . ($evDateInfo ? ' · ' . $evDateInfo : ''),
                    'description' => $evDesc,
                    'image'       => $ev->cover_image ? route('evenement.og-image', $ev->slug) : null,
                    'url'         => request()->url(),
                ];
            }
        }
    }

    $surveyOg = null;
    if (request()->routeIs('surveys.show')) {
        $token = request()->route('token');
        if ($token) {
            $s = \App\Models\HrSurvey::where('token', $token)->where('is_active', true)->first();
            if ($s) {
                $img = $s->cover_image;
                if ($img && ! filter_var($img, FILTER_VALIDATE_URL)) {
                    $img = str_starts_with($img, '/') ? url($img) : asset('storage/' . $img);
                }
                $surveyOg = [
                    'title'       => $s->title,
                    'description' => $s->description ?? '',
                    'image'       => $img,
                    'url'         => request()->url(),
                ];
            }
        }
    }
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        @if($evenementOg)
            <title>{{ $evenementOg['title'] }} — {{ config('app.name', 'OnePAD') }}</title>
            <meta name="description" content="{{ $evenementOg['description'] }}">
            <meta property="og:type"        content="website">
            <meta property="og:site_name"   content="{{ config('app.name', 'OnePAD') }}">
            <meta property="og:url"         content="{{ $evenementOg['url'] }}">
            <meta property="og:title"       content="{{ $evenementOg['title'] }}">
            <meta property="og:description" content="{{ $evenementOg['description'] }}">
            @if($evenementOg['image'])
            <meta property="og:image"       content="{{ $evenementOg['image'] }}">
            <meta property="og:image:width" content="1200">
            <meta property="og:image:height" content="630">
            <meta property="og:image:alt"   content="{{ $evenementOg['title'] }}">
            @endif
            <meta name="twitter:card"        content="summary_large_image">
            <meta name="twitter:title"       content="{{ $evenementOg['title'] }}">
            <meta name="twitter:description" content="{{ $evenementOg['description'] }}">
            @if($evenementOg['image'])
            <meta name="twitter:image"       content="{{ $evenementOg['image'] }}">
            @endif
        @endif

        @if($surveyOg)
            <title>{{ $surveyOg['title'] }} — {{ config('app.name', 'OnePAD') }}</title>
            <meta name="description" content="{{ $surveyOg['description'] }}">
            <meta property="og:type"        content="website">
            <meta property="og:site_name"   content="{{ config('app.name', 'OnePAD') }}">
            <meta property="og:url"         content="{{ $surveyOg['url'] }}">
            <meta property="og:title"       content="{{ $surveyOg['title'] }}">
            <meta property="og:description" content="{{ $surveyOg['description'] }}">
            @if($surveyOg['image'])
            <meta property="og:image"       content="{{ $surveyOg['image'] }}">
            <meta property="og:image:width" content="1200">
            <meta property="og:image:height" content="630">
            @endif
            <meta name="twitter:card"        content="summary_large_image">
            <meta name="twitter:title"       content="{{ $surveyOg['title'] }}">
            <meta name="twitter:description" content="{{ $surveyOg['description'] }}">
            @if($surveyOg['image'])
            <meta name="twitter:image"       content="{{ $surveyOg['image'] }}">
            @endif
        @endif

        {{-- Fallback OG tags (toutes pages sans og:image spécifique) --}}
        @if(! $evenementOg && ! $surveyOg)
        <meta property="og:site_name" content="{{ config('app.name', 'OnePAD') }}">
        <meta property="og:image"     content="{{ asset('assets/images/onepad-logo.png') }}">
        <meta name="twitter:card"     content="summary">
        <meta name="twitter:image"    content="{{ asset('assets/images/onepad-logo.png') }}">
        @endif

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
        <link rel="icon" type="image/svg+xml" href="/favicon.svg">
        <link rel="shortcut icon" href="/favicon.ico">
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx'])
        <x-inertia::head>
            <title>OnePAD</title>
            {{-- <title>{{ config('app.name', 'Laravel') }}</title> --}}
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
