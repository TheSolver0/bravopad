<?php

namespace Database\Seeders;

use App\Models\Direction;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DirectionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $directions = [
            ['code' => 'CDA', 'name' => "Centre de Documentation et des Archives", 'name_en' => "Documentation and Archives Center"],
            ['code' => 'DAP', 'name' => "Direction des Aménagements Portuaires", 'name_en' => "Port Development Direction"],
            ['code' => 'CQN', 'name' => "Cellule Qualité et Normalisation", 'name_en' => "Quality and Standardization Unit"],
            ['code' => 'DAJ', 'name' => "Direction des Affaires Juridiques", 'name_en' => "Legal Affairs Directorate"],
            ['code' => 'DCRP', 'name' => "Division de la Communication et des Relations Publiques", 'name_en' => "Communication and Public Relations Division"],
            ['code' => 'DQDD', 'name' => "Division de la qualite et de la Développement Durable", 'name_en' => "Quality and Sustainable Development Division"],
            ['code' => 'DCAP', 'name' => "Direction de la Capitainerie", 'name_en' => "Harbor Master Directorate"],
            ['code' => 'DDLM', 'name' => "Direction du Dragage et de la Logistique Maritime", 'name_en' => "Dragging and Maritime Logistics Development Directorate"],
            ['code' => 'DFC', 'name' => "Direction des Finances et de la Comptabilité", 'name_en' => "Finance and Accounting Directorate"],
            ['code' => 'DSR', 'name' => "Division du Suivi et de la Relance", 'name_en' => "Follow-up and Recovery Division"],
            ['code' => 'DG', 'name' => "Direction Générale", 'name_en' => "General Directorate"],
            ['code' => 'DRH', 'name' => "Direction des Ressources Humaines", 'name_en' => "Human Resources Directorate"],
            ['code' => 'DEX', 'name' => "Direction de l'Exploitation", 'name_en' => "Exploitation Directorate"],
            ['code' => 'SAPF', 'name' => "Service de L'Accueil, du Protocole et de la Facilitation", 'name_en' => "Reception, Protocol and Facilitation Service"],
            ['code' => 'DSI', 'name' => "Direction des Systèmes d'Information", 'name_en' => "Information Systems Directorate"],
            ['code' => 'DAPC', 'name' => "Division de l'analyse , de la Prospective et de la coopération", 'name_en' => "Analysis, Prospects and Cooperation Division"],
            ['code' => 'DCG', 'name' => "Direction du Contrôle de Gestion", 'name_en' => "Management Control Directorate"],
            ['code' => 'DAI', 'name' => "Division de l'Audit Interne", 'name_en' => "Internal Audit Division"],
            ['code' => 'DAG', 'name' => "Direction des Affaires Générales", 'name_en' => "General Affairs Directorate"],
            ['code' => 'CTIPB', 'name' => "Cellule de la Traduction , de L'interpretation et la Promotion du Bilinguisme", 'name_en' => "Translation, Interpretation and Promotion of Bilingualism Cellule"],
            ['code' => 'CDDRCR', 'name' => "Cellule de Développement Durable et Responsabilité Civile et Réglementaire", 'name_en' => "Sustainable Development and Civil and Regulatory Responsibility Cellule"],
            ['code' => 'REP-PAD BANGUI', 'name' => "Représentation PAD - Bangui", 'name_en' => "PAD Representation - Bangui"],
            ['code' => "REP-PAD N'DJAMENA", 'name' => "Représentation PAD - N'Djamena", 'name_en' => "PAD Representation - N'Djamena"],
            ['code' => 'REP-PAD YOUNDE', 'name' => "Représentation PAD - Yaoundé", 'name_en' => "PAD Representation - Yaoundé"],
        ];

        foreach ($directions as $direction) {
            Direction::firstOrCreate([
                'code' => $direction['code'],
            ], [
                'name' => $direction['name'],
                'name_en' => $direction['name_en'] ?? $direction['name'],
            ]);
        }
    }
}
