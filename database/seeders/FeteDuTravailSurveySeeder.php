<?php

namespace Database\Seeders;

use App\Models\HrSurvey;
use Illuminate\Database\Seeder;

class FeteDuTravailSurveySeeder extends Seeder
{
    public function run(): void
    {
        $questions = [
            // ── Identification ────────────────────────────────────────────────
            [
                'id'        => 'nom',
                'section'   => 'Vos Informations',
                'label'     => 'Votre nom',
                'type'      => 'text',
                'options'   => [],
                'required'  => true,
                'multiline' => false,
            ],
            [
                'id'        => 'prenom',
                'section'   => 'Vos Informations',
                'label'     => 'Votre prénom',
                'type'      => 'text',
                'options'   => [],
                'required'  => true,
                'multiline' => false,
            ],
            [
                'id'        => 'matricule',
                'section'   => 'Vos Informations',
                'label'     => 'Votre matricule (facultatif)',
                'type'      => 'text',
                'options'   => [],
                'required'  => false,
                'multiline' => false,
            ],
            // ── Section 1 : Organisation Générale ────────────────────────────
            [
                'id'       => 'q1',
                'section'  => 'Section 1 : Organisation Générale',
                'label'    => 'Dans l\'ensemble, comment évaluez-vous l\'organisation de la cérémonie du 1er Mai (défilé et réception au Club PAD) ?',
                'type'     => 'rating',
                'options'  => [],
                'required' => true,
            ],
            [
                'id'       => 'q1_comment',
                'section'  => 'Section 1 : Organisation Générale',
                'label'    => 'Avez-vous des remarques sur l\'organisation générale ?',
                'type'     => 'text',
                'options'  => [],
                'required' => false,
            ],
            [
                'id'       => 'q2',
                'section'  => 'Section 1 : Organisation Générale',
                'label'    => 'Les informations communiquées avant l\'événement (date, programme, lieu…) étaient-elles suffisantes ?',
                'type'     => 'radio',
                'options'  => ['Tout à fait suffisantes', 'Suffisantes', 'Insuffisantes', 'Je n\'ai reçu aucune information'],
                'required' => true,
            ],
            [
                'id'       => 'q2_comment',
                'section'  => 'Section 1 : Organisation Générale',
                'label'    => 'Qu\'auriez-vous souhaité savoir à l\'avance ?',
                'type'     => 'text',
                'options'  => [],
                'required' => false,
            ],
            // ── Section 2 : Accueil au Club PAD ──────────────────────────────
            [
                'id'       => 'q3',
                'section'  => 'Section 2 : Accueil au Club PAD',
                'label'    => 'Comment évaluez-vous l\'accueil qui vous a été réservé à votre arrivée au Club PAD ?',
                'type'     => 'radio',
                'options'  => ['Excellent', 'Bien', 'Passable', 'Insuffisant'],
                'required' => true,
            ],
            [
                'id'       => 'q3_comment',
                'section'  => 'Section 2 : Accueil au Club PAD',
                'label'    => 'Avez-vous des suggestions pour améliorer l\'accueil des participants ?',
                'type'     => 'text',
                'options'  => [],
                'required' => false,
            ],
            // ── Section 3 : Les Conditions d'Installations ───────────────────
            [
                'id'       => 'q4a',
                'section'  => 'Section 3 : Les Conditions d\'Installation',
                'label'    => 'Comment jugez-vous l\'installation et la mise en place de l\'espace de la cérémonie ?',
                'type'     => 'rating',
                'options'  => [],
                'required' => true,
            ],
            [
                'id'       => 'q4b',
                'section'  => 'Section 3 : Les Conditions d\'Installation',
                'label'    => 'Avez-vous pu trouver une place assise facilement ?',
                'type'     => 'radio',
                'options'  => ['Très facilement', 'Facilement', 'Difficilement', 'Je n\'ai pas trouvé de place'],
                'required' => true,
            ],
            [
                'id'       => 'q4c',
                'section'  => 'Section 3 : Les Conditions d\'Installation',
                'label'    => 'Quelle note donnez-vous à la décoration et à la mise en scène de l\'espace ?',
                'type'     => 'rating',
                'options'  => [],
                'required' => true,
            ],
            [
                'id'       => 'q4_comment',
                'section'  => 'Section 3 : Les Conditions d\'Installation',
                'label'    => 'Avez-vous des remarques sur les conditions d\'installation ?',
                'type'     => 'text',
                'options'  => [],
                'required' => false,
            ],
            // ── Section 4 : Restauration ─────────────────────────────────────
            [
                'id'       => 'q5a',
                'section'  => 'Section 4 : Restauration',
                'label'    => 'Comment avez-vous trouvé la variété et la qualité des plats servis ?',
                'type'     => 'rating',
                'options'  => [],
                'required' => true,
            ],
            [
                'id'       => 'q5b',
                'section'  => 'Section 4 : Restauration',
                'label'    => 'Les boissons proposées correspondaient-elles à vos attentes ?',
                'type'     => 'radio',
                'options'  => ['Tout à fait', 'Plutôt oui', 'Plutôt non', 'Pas du tout'],
                'required' => true,
            ],
            [
                'id'       => 'q5c',
                'section'  => 'Section 4 : Restauration',
                'label'    => 'Le service du repas était-il bien organisé (file d\'attente, temps de service…) ?',
                'type'     => 'rating',
                'options'  => [],
                'required' => true,
            ],
            [
                'id'       => 'q5d',
                'section'  => 'Section 4 : Restauration',
                'label'    => 'Les boissons étaient-elles disponibles et facilement accessibles tout au long de l\'événement ?',
                'type'     => 'rating',
                'options'  => [],
                'required' => true,
            ],
            [
                'id'       => 'q5_comment',
                'section'  => 'Section 4 : Restauration',
                'label'    => 'Avez-vous des suggestions pour améliorer la restauration lors des prochaines éditions ?',
                'type'     => 'text',
                'options'  => [],
                'required' => false,
            ],
            // ── Section 5 : Animation ────────────────────────────────────────
            [
                'id'       => 'q6',
                'section'  => 'Section 5 : Animation',
                'label'    => 'Parmi les activités et animations proposées, lesquelles avez-vous le plus appréciées ? (Plusieurs réponses possibles)',
                'type'     => 'checkbox',
                'options'  => ['La sonorisation et la musique', 'Les jeux et activités ludiques', 'Le match sportif', 'Les discours et allocutions', 'L\'ambiance générale'],
                'required' => false,
            ],
            [
                'id'       => 'q6_rating',
                'section'  => 'Section 5 : Animation',
                'label'    => 'Quelle note globale donnez-vous à l\'ambiance et aux animations de l\'événement ?',
                'type'     => 'rating',
                'options'  => [],
                'required' => true,
            ],
            [
                'id'       => 'q6_comment',
                'section'  => 'Section 5 : Animation',
                'label'    => 'Avez-vous des idées d\'animations à proposer pour les prochaines éditions ?',
                'type'     => 'text',
                'options'  => [],
                'required' => false,
            ],
            // ── Section 6 : Appréciation Globale ────────────────────────────
            [
                'id'       => 'q7_rating',
                'section'  => 'Section 6 : Appréciation Globale',
                'label'    => 'En tenant compte de tous les aspects, quelle note globale attribuez-vous à cette 140e édition de la Fête du Travail ?',
                'type'     => 'rating',
                'options'  => [],
                'required' => true,
            ],
            [
                'id'       => 'q7',
                'section'  => 'Section 6 : Appréciation Globale',
                'label'    => 'Quelles améliorations concrètes proposez-vous pour que les prochaines éditions soient encore meilleures ?',
                'type'     => 'text',
                'options'  => [],
                'required' => false,
            ],
        ];

        HrSurvey::query()->where('is_active', true)->update(['is_active' => false]);

        // Remove previous instance of this survey (no responses yet expected)
        HrSurvey::where('title', 'like', '%140e Fête du Travail%')->delete();

        HrSurvey::create([
            'title'       => 'Perception de l\'organisation de la 140e Fête du Travail (1er Mai 2026)',
            'description' => 'Dans le cadre de l\'organisation des évènements par le groupe PAD. Vous êtes priés de bien vouloir renseigner ce questionnaire relatif à la célébration de la fête du travail édition 2026.',
            'question'    => 'Questionnaire 140e Fête du Travail',
            'cover_image' => '/assets/images/surveys/fete_travail.jpeg',
            'options'     => ['initiative_by' => 'Division de la Qualité et du Développement Durable'],
            'questions'   => $questions,
            'is_active'   => true,
            'starts_at'   => now(),
            'ends_at'     => '2026-05-31',
        ]);
    }
}
