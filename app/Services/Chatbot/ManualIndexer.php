<?php

namespace App\Services\Chatbot;

use App\Models\ManualChunk;
use RuntimeException;

class ManualIndexer
{
    private string $gsPath;
    private string $tesseractPath;
    private string $lang;

    public function __construct()
    {
        $this->gsPath        = config('services.chatbot.ghostscript_path', 'gswin64c');
        $this->tesseractPath = config('services.chatbot.tesseract_path',  'tesseract');
        $this->lang          = config('services.chatbot.tesseract_lang',  'fra');
    }

    public function index(string $manualKey, string $filePath): int
    {
        ManualChunk::where('manual_key', $manualKey)->delete();

        $tempDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'chatbot_ocr_' . uniqid();
        mkdir($tempDir, 0755, true);

        try {
            $pageFiles = $this->pdfToImages($filePath, $tempDir);

            if (empty($pageFiles)) {
                throw new RuntimeException("Aucune page extraite du PDF : {$filePath}");
            }

            $count = 0;
            foreach ($pageFiles as $pageIndex => $imageFile) {
                $text = $this->ocrImage($imageFile);
                if (trim($text) === '') {
                    continue;
                }

                ManualChunk::create([
                    'manual_key'  => $manualKey,
                    'file_name'   => basename($filePath),
                    'page_number' => $pageIndex + 1,
                    'content'     => $text,
                ]);
                $count++;
            }

            return $count;
        } finally {
            $this->cleanTempDir($tempDir);
        }
    }

    /**
     * Convert each PDF page to a PNG image using Ghostscript.
     * Returns an array of image file paths sorted by page order.
     */
    private function pdfToImages(string $pdfPath, string $outDir): array
    {
        $pattern = $outDir . DIRECTORY_SEPARATOR . 'page-%03d.png';
        $cmd     = sprintf(
            '"%s" -dNOPAUSE -dBATCH -dSAFER -sDEVICE=png16m -r200 -sOutputFile="%s" "%s" 2>&1',
            $this->gsPath,
            $pattern,
            $pdfPath,
        );

        exec($cmd, $output, $exitCode);

        if ($exitCode !== 0) {
            throw new RuntimeException("Ghostscript a échoué (code {$exitCode}) : " . implode("\n", $output));
        }

        $files = glob($outDir . DIRECTORY_SEPARATOR . 'page-*.png');
        sort($files);

        return $files;
    }

    /**
     * Run Tesseract OCR on a single image and return the extracted text.
     */
    private function ocrImage(string $imagePath): string
    {
        $outputBase = $imagePath . '_ocr';
        $cmd        = sprintf(
            '"%s" "%s" "%s" -l %s 2>&1',
            $this->tesseractPath,
            $imagePath,
            $outputBase,
            $this->lang,
        );

        exec($cmd, $output, $exitCode);

        $txtFile = $outputBase . '.txt';
        if (! file_exists($txtFile)) {
            return '';
        }

        $text = file_get_contents($txtFile);
        unlink($txtFile);

        return $text !== false ? trim($text) : '';
    }

    private function cleanTempDir(string $dir): void
    {
        foreach (glob($dir . DIRECTORY_SEPARATOR . '*') as $file) {
            @unlink($file);
        }
        @rmdir($dir);
    }
}
