@php
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

        @if($surveyOg)
            <title>{{ $surveyOg['title'] }} — {{ config('app.name', 'BravoPAD') }}</title>
            <meta name="description" content="{{ $surveyOg['description'] }}">
            <meta property="og:type"        content="website">
            <meta property="og:site_name"   content="{{ config('app.name', 'BravoPAD') }}">
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

        <link rel="icon" href="/assets/images/pad-logo.png" type="image/png">
        <link rel="apple-touch-icon" href="/assets/images/pad-logo.png">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx'])
        <x-inertia::head>
            <title>BravoPAD</title>
            {{-- <title>{{ config('app.name', 'Laravel') }}</title> --}}
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>