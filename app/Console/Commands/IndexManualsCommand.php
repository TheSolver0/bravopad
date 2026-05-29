<?php

namespace App\Console\Commands;

use App\Services\Chatbot\ManualIndexer;
use Illuminate\Console\Command;

class IndexManualsCommand extends Command
{
    protected $signature = 'chatbot:index {--manual= : Specific manual key to re-index}';

    protected $description = 'Index PDF manuals into the chatbot knowledge base';

    public function handle(ManualIndexer $indexer): int
    {
        $manualsDir   = public_path('assets/manuels');
        $manifestPath = $manualsDir . '/manifest.json';

        if (! file_exists($manifestPath)) {
            $this->error("manifest.json not found at {$manifestPath}");

            return 1;
        }

        $manifest  = json_decode(file_get_contents($manifestPath), true) ?? [];
        $targetKey = $this->option('manual');

        $toIndex = $targetKey
            ? (isset($manifest[$targetKey]) ? [$targetKey => $manifest[$targetKey]] : [])
            : $manifest;

        if (empty($toIndex)) {
            $this->error("Manual key '{$targetKey}' not found in manifest.");

            return 1;
        }

        foreach ($toIndex as $key => $meta) {
            $filePath = $this->resolveFilePath($manualsDir, $meta['file']);

            if ($filePath === null) {
                $this->warn("Fichier introuvable : {$meta['file']} — ignoré.");
                continue;
            }

            $this->info("Indexation de {$key} ({$meta['title']})...");
            $count = $indexer->index($key, $filePath);
            $this->info("  → {$count} pages indexées.");
        }

        $this->info('Terminé.');

        return 0;
    }

    /**
     * Find a file in $dir matching $name using Unicode-normalized comparison,
     * because Windows/PHP may store filenames in NFD while the manifest uses NFC.
     */
    private function resolveFilePath(string $dir, string $name): ?string
    {
        $exact = $dir . '/' . $name;
        if (file_exists($exact)) {
            return $exact;
        }

        // Normalize to NFC and scan directory for a match
        $nameNfc = \Normalizer::normalize($name, \Normalizer::FORM_C);

        foreach (scandir($dir) as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            $entryNfc = \Normalizer::normalize($entry, \Normalizer::FORM_C);
            if ($entryNfc === $nameNfc) {
                return $dir . '/' . $entry;
            }
        }

        return null;
    }
}
