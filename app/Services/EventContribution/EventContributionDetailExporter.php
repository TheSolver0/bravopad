<?php

namespace App\Services\EventContribution;

use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EventContributionDetailExporter
{
    public function __construct(
        private readonly array $payload,
    ) {}

    public function excelDownload(): StreamedResponse
    {
        $slug = Str::slug($this->payload['title'] ?: 'cotisation');
        $filename = "cotisation_{$slug}_".now()->format('Ymd_His').'.csv';

        return response()->streamDownload(function () {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            $row = fn (array $cells) => fputcsv($handle, $cells, ';');

            $row(['Rapport de cotisation']);
            $row(['Genere le', $this->payload['exported_at']]);
            $row(['Par', $this->payload['exporter_name']]);
            $row([]);

            $row(['Informations']);
            $row(['Titre', $this->payload['title']]);
            $row(['Type', $this->payload['event_type']]);
            $row(['Visibilite', $this->payload['visibility']]);
            $row(['Organisateur', $this->payload['creator_name']]);
            $row(['Date limite', $this->payload['deadline_at'] ?? 'Sans limite']);
            $row(['Mode', $this->payload['amount_mode_label']]);
            $row(['Cagnotte', $this->formatAmount($this->payload['pot_amount'])]);
            $row(['Collecte', $this->formatAmount($this->payload['total_collected'])]);
            $row(['Participants', $this->payload['participants_count']]);
            $row([]);

            $row(['Suivi des participants']);
            $row(['Participant', 'Cotisation', 'Verse', 'Reste', 'Etat', 'Progression (%)']);
            foreach ($this->payload['participants'] as $participant) {
                $row([
                    $participant['name'],
                    $this->formatAmount($participant['target_amount']),
                    $this->formatAmount($participant['paid_amount']),
                    $this->formatAmount($participant['remaining_amount']),
                    $participant['status_label'],
                    $participant['progress_percent'] ?? '',
                ]);
            }
            $row([]);

            $row(['Historique des contributions']);
            $row(['Date', 'Contributeur', 'Montant', 'Paiement', 'Manuel', 'Note']);
            foreach ($this->payload['payments'] as $payment) {
                $row([
                    $payment['paid_at'],
                    $payment['contributor_name'],
                    $this->formatAmount($payment['amount']),
                    $payment['payment_method_label'],
                    $payment['is_manual'] ? 'Oui' : 'Non',
                    $payment['note'] ?? '',
                ]);
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function pdfBinary(): string
    {
        if (! defined('FPDF_FONTPATH')) {
            define('FPDF_FONTPATH', app_path('Support/font/'));
        }

        require_once app_path('Support/Fpdf.php');

        $pdf = new \FPDF('P', 'mm', 'A4');
        $pdf->SetAutoPageBreak(true, 18);
        $pdf->SetMargins(14, 14, 14);
        $pdf->AddPage();

        $this->drawPdfHeader($pdf);
        $this->drawPdfSummary($pdf);
        $this->drawPdfParticipantsTable($pdf);
        $this->drawPdfPaymentsTable($pdf);

        return $pdf->Output('S');
    }

    public function pdfFilename(): string
    {
        $slug = Str::slug($this->payload['title'] ?: 'cotisation');

        return "cotisation_{$slug}_".now()->format('Ymd').'.pdf';
    }

    private function drawPdfHeader(\FPDF $pdf): void
    {
        $pdf->SetFillColor(241, 245, 249);
        $pdf->Rect(14, 14, 182, 28, 'F');

        $pdf->SetFont('Helvetica', 'B', 16);
        $pdf->SetTextColor(30, 41, 59);
        $pdf->SetXY(18, 18);
        $pdf->Cell(0, 8, $this->t($this->payload['title']), 0, 1);

        $pdf->SetFont('Helvetica', '', 9);
        $pdf->SetTextColor(100, 116, 139);
        $pdf->SetX(18);
        $pdf->Cell(0, 5, $this->t("Export du {$this->payload['exported_at']} — {$this->payload['exporter_name']}"), 0, 1);
        $pdf->Ln(8);
    }

    private function drawPdfSummary(\FPDF $pdf): void
    {
        $cards = [
            ['Cagnotte', $this->formatAmount($this->payload['pot_amount'])],
            ['Collecte', $this->formatAmount($this->payload['total_collected'])],
            ['Participants', (string) $this->payload['participants_count']],
            ['Echeance', $this->payload['deadline_at'] ?? 'Sans limite'],
        ];

        $x = 14;
        $y = $pdf->GetY();
        $w = 43;
        $h = 18;

        foreach ($cards as $index => [$label, $value]) {
            $col = $index % 4;
            $cx = 14 + ($col * ($w + 3));
            $cy = $y + (int) floor($index / 4) * ($h + 4);

            $pdf->SetFillColor(248, 250, 252);
            $pdf->SetDrawColor(226, 232, 240);
            $pdf->Rect($cx, $cy, $w, $h, 'DF');

            $pdf->SetFont('Helvetica', '', 7);
            $pdf->SetTextColor(100, 116, 139);
            $pdf->SetXY($cx + 3, $cy + 3);
            $pdf->Cell($w - 6, 4, $this->t(strtoupper($label)), 0, 1);

            $pdf->SetFont('Helvetica', 'B', 9);
            $pdf->SetTextColor(15, 118, 110);
            $pdf->SetX($cx + 3);
            $pdf->Cell($w - 6, 5, $this->t($value), 0, 0);
        }

        $pdf->SetY($y + $h + 10);
        $pdf->SetTextColor(51, 65, 85);
    }

    private function drawPdfParticipantsTable(\FPDF $pdf): void
    {
        $pdf->SetFont('Helvetica', 'B', 11);
        $pdf->SetTextColor(30, 41, 59);
        $pdf->Cell(0, 8, $this->t('Suivi des participants'), 0, 1);

        $headers = ['Participant', 'Cotisation', 'Verse', 'Reste', 'Etat'];
        $widths = [52, 32, 32, 32, 34];

        $this->drawPdfTableHeader($pdf, $headers, $widths);

        $fill = false;
        foreach ($this->payload['participants'] as $participant) {
            $this->drawPdfTableRow($pdf, [
                $participant['name'],
                $this->formatAmount($participant['target_amount']),
                $this->formatAmount($participant['paid_amount']),
                $this->formatAmount($participant['remaining_amount']),
                $participant['status_label'],
            ], $widths, $fill);
            $fill = ! $fill;
        }

        if ($this->payload['participants'] === []) {
            $pdf->SetFont('Helvetica', 'I', 9);
            $pdf->SetTextColor(148, 163, 184);
            $pdf->Cell(0, 8, $this->t('Aucun participant.'), 0, 1);
        }

        $pdf->Ln(4);
    }

    private function drawPdfPaymentsTable(\FPDF $pdf): void
    {
        if ($pdf->GetY() > 240) {
            $pdf->AddPage();
        }

        $pdf->SetFont('Helvetica', 'B', 11);
        $pdf->SetTextColor(30, 41, 59);
        $pdf->Cell(0, 8, $this->t('Historique des contributions'), 0, 1);

        $headers = ['Date', 'Contributeur', 'Montant', 'Paiement'];
        $widths = [36, 62, 40, 44];

        $this->drawPdfTableHeader($pdf, $headers, $widths);

        $fill = false;
        foreach ($this->payload['payments'] as $payment) {
            if ($pdf->GetY() > 265) {
                $pdf->AddPage();
                $this->drawPdfTableHeader($pdf, $headers, $widths);
            }

            $this->drawPdfTableRow($pdf, [
                $payment['paid_at'],
                $payment['contributor_name'],
                $this->formatAmount($payment['amount']),
                $payment['payment_method_label'],
            ], $widths, $fill);
            $fill = ! $fill;
        }

        if ($this->payload['payments'] === []) {
            $pdf->SetFont('Helvetica', 'I', 9);
            $pdf->SetTextColor(148, 163, 184);
            $pdf->Cell(0, 8, $this->t('Aucune contribution enregistree.'), 0, 1);
        }
    }

    /**
     * @param  list<string>  $headers
     * @param  list<float>  $widths
     */
    private function drawPdfTableHeader(\FPDF $pdf, array $headers, array $widths): void
    {
        $pdf->SetFont('Helvetica', 'B', 8);
        $pdf->SetFillColor(226, 232, 240);
        $pdf->SetTextColor(71, 85, 105);
        $pdf->SetDrawColor(226, 232, 240);

        foreach ($headers as $index => $header) {
            $pdf->Cell($widths[$index], 7, $this->t($header), 1, 0, 'L', true);
        }
        $pdf->Ln();
    }

    /**
     * @param  list<string>  $cells
     * @param  list<float>  $widths
     */
    private function drawPdfTableRow(\FPDF $pdf, array $cells, array $widths, bool $fill): void
    {
        $pdf->SetFont('Helvetica', '', 8);
        $pdf->SetTextColor(51, 65, 85);
        $pdf->SetFillColor($fill ? 248 : 255, $fill ? 250 : 255, $fill ? 252 : 255);
        $pdf->SetDrawColor(241, 245, 249);

        foreach ($cells as $index => $cell) {
            $pdf->Cell($widths[$index], 7, $this->t($cell), 1, 0, 'L', true);
        }
        $pdf->Ln();
    }

    private function formatAmount(mixed $value): string
    {
        if ($value === null || $value === '') {
            return '—';
        }

        return number_format((float) $value, 0, ',', ' ').' FCFA';
    }

    private function t(?string $text): string
    {
        $text ??= '';
        $converted = @iconv('UTF-8', 'ISO-8859-1//TRANSLIT', $text);

        return $converted !== false ? $converted : $text;
    }
}
