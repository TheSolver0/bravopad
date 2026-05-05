<?php

namespace Database\Seeders;

use App\Models\HrSurvey;
use Illuminate\Database\Seeder;

class FeteDuTravailSurveySeeder extends Seeder
{
    public function run(): void
    {
        $tr = static fn (string $fr, string $en): array => ['fr' => $fr, 'en' => $en];

        $questions = [
            // ── Identification ────────────────────────────────────────────────
            [
                'id'       => 'sexe',
                'section'  => 'Vos Informations',
                'section_i18n' => $tr('Vos Informations', 'Your Information'),
                'label'    => 'Quel est votre sexe ? (facultatif)',
                'label_i18n' => $tr('Quel est votre sexe ? (facultatif)', 'What is your gender? (optional)'),
                'type'     => 'radio',
                'options'  => ['Masculin', 'Féminin', 'Préfère ne pas répondre'],
                'options_i18n' => [
                    'fr' => ['Masculin', 'Féminin', 'Préfère ne pas répondre'],
                    'en' => ['Male', 'Female', 'Prefer not to answer'],
                ],
                'required' => false,
            ],
            [
                'id'       => 'experience',
                'section'  => 'Vos Informations',
                'section_i18n' => $tr('Vos Informations', 'Your Information'),
                'label'    => 'Votre expérience professionnelle (facultatif)',
                'label_i18n' => $tr('Votre expérience professionnelle (facultatif)', 'Your professional experience (optional)'),
                'type'     => 'radio',
                'options'  => ['Moins d\'un an', 'De 1 à 5 ans', 'De 5 à 10 ans', 'Plus de 10 ans'],
                'options_i18n' => [
                    'fr' => ['Moins d\'un an', 'De 1 à 5 ans', 'De 5 à 10 ans', 'Plus de 10 ans'],
                    'en' => ['Less than 1 year', '1 to 5 years', '5 to 10 years', 'More than 10 years'],
                ],
                'required' => false,
            ],

            // ── Section 1 : Organisation Générale ────────────────────────────
            [
                'id'       => 'q1',
                'section'  => 'Section 1 : Organisation Générale',
                'section_i18n' => $tr('Section 1 : Organisation Générale', 'Section 1: Overall Organization'),
                'label'    => 'Dans l\'ensemble, comment évaluez-vous l\'organisation de la cérémonie du 1er Mai (défilé et réception au Club PAD) ?',
                'label_i18n' => $tr(
                    'Dans l\'ensemble, comment évaluez-vous l\'organisation de la cérémonie du 1er Mai (défilé et réception au Club PAD) ?',
                    'Overall, how do you rate the organization of the May 1st ceremony (parade and reception at Club PAD)?'
                ),
                'type'     => 'rating',
                'options'  => [],
                'required' => true,
            ],
            [
                'id'       => 'q1_comment',
                'section'  => 'Section 1 : Organisation Générale',
                'section_i18n' => $tr('Section 1 : Organisation Générale', 'Section 1: Overall Organization'),
                'label'    => 'Avez-vous des remarques sur l\'organisation générale ?',
                'label_i18n' => $tr(
                    'Avez-vous des remarques sur l\'organisation générale ?',
                    'Do you have any comments on the overall organization?'
                ),
                'type'     => 'text',
                'options'  => [],
                'required' => false,
            ],
            [
                'id'       => 'q2',
                'section'  => 'Section 1 : Organisation Générale',
                'section_i18n' => $tr('Section 1 : Organisation Générale', 'Section 1: Overall Organization'),
                'label'    => 'Les informations communiquées avant l\'événement (date, programme, lieu…) étaient-elles suffisantes ?',
                'label_i18n' => $tr(
                    'Les informations communiquées avant l\'événement (date, programme, lieu…) étaient-elles suffisantes ?',
                    'Was the information shared before the event (date, agenda, venue, etc.) sufficient?'
                ),
                // Tout à fait suffisantes → Suffisantes → Insuffisantes → Aucune info
                // Remplacé par étoiles (1 = Aucune info reçue … 5 = Tout à fait suffisantes)
                'type'     => 'rating',
                'options'  => [],
                'required' => true,
            ],
            [
                'id'       => 'q2_comment',
                'section'  => 'Section 1 : Organisation Générale',
                'section_i18n' => $tr('Section 1 : Organisation Générale', 'Section 1: Overall Organization'),
                'label'    => 'Qu\'auriez-vous souhaité savoir à l\'avance ?',
                'label_i18n' => $tr('Qu\'auriez-vous souhaité savoir à l\'avance ?', 'What would you have liked to know in advance?'),
                'type'     => 'text',
                'options'  => [],
                'required' => false,
            ],

            // ── Section 2 : Accueil au Club PAD ──────────────────────────────
            [
                'id'       => 'q3',
                'section'  => 'Section 2 : Accueil au Club PAD',
                'section_i18n' => $tr('Section 2 : Accueil au Club PAD', 'Section 2: Welcome at Club PAD'),
                'label'    => 'Comment évaluez-vous l\'accueil qui vous a été réservé à votre arrivée au Club PAD ?',
                'label_i18n' => $tr(
                    'Comment évaluez-vous l\'accueil qui vous a été réservé à votre arrivée au Club PAD ?',
                    'How do you rate the welcome you received upon arrival at Club PAD?'
                ),
                // Excellent → Bien → Passable → Insuffisant  →  étoiles
                'type'     => 'rating',
                'options'  => [],
                'required' => true,
            ],
            [
                'id'       => 'q3_comment',
                'section'  => 'Section 2 : Accueil au Club PAD',
                'section_i18n' => $tr('Section 2 : Accueil au Club PAD', 'Section 2: Welcome at Club PAD'),
                'label'    => 'Avez-vous des suggestions pour améliorer l\'accueil des participants ?',
                'label_i18n' => $tr(
                    'Avez-vous des suggestions pour améliorer l\'accueil des participants ?',
                    'Do you have suggestions to improve participant reception?'
                ),
                'type'     => 'text',
                'options'  => [],
                'required' => false,
            ],

            // ── Section 3 : Les Conditions d'Installation ───────────────────
            [
                'id'       => 'q4a',
                'section'  => 'Section 3 : Les Conditions d\'Installation',
                'section_i18n' => $tr('Section 3 : Les Conditions d\'Installation', 'Section 3: Installation Conditions'),
                'label'    => 'Comment jugez-vous l\'installation et la mise en place de l\'espace de la cérémonie ?',
                'label_i18n' => $tr(
                    'Comment jugez-vous l\'installation et la mise en place de l\'espace de la cérémonie ?',
                    'How do you assess the setup and layout of the ceremony space?'
                ),
                'type'     => 'rating',
                'options'  => [],
                'required' => true,
            ],
            [
                'id'       => 'q4b',
                'section'  => 'Section 3 : Les Conditions d\'Installation',
                'section_i18n' => $tr('Section 3 : Les Conditions d\'Installation', 'Section 3: Installation Conditions'),
                'label'    => 'Avez-vous pu trouver une place assise facilement ?',
                'label_i18n' => $tr('Avez-vous pu trouver une place assise facilement ?', 'Were you able to find a seat easily?'),
                // Très facilement → Facilement → Difficilement → Pas trouvé  →  étoiles
                'type'     => 'rating',
                'options'  => [],
                'required' => true,
            ],
            [
                'id'       => 'q4c',
                'section'  => 'Section 3 : Les Conditions d\'Installation',
                'section_i18n' => $tr('Section 3 : Les Conditions d\'Installation', 'Section 3: Installation Conditions'),
                'label'    => 'Quelle note donnez-vous à la décoration et à la mise en scène de l\'espace ?',
                'label_i18n' => $tr(
                    'Quelle note donnez-vous à la décoration et à la mise en scène de l\'espace ?',
                    'What rating would you give to the decoration and staging of the venue?'
                ),
                'type'     => 'rating',
                'options'  => [],
                'required' => true,
            ],
            [
                'id'       => 'q4_comment',
                'section'  => 'Section 3 : Les Conditions d\'Installation',
                'section_i18n' => $tr('Section 3 : Les Conditions d\'Installation', 'Section 3: Installation Conditions'),
                'label'    => 'Avez-vous des remarques sur les conditions d\'installation ?',
                'label_i18n' => $tr(
                    'Avez-vous des remarques sur les conditions d\'installation ?',
                    'Do you have any comments regarding installation conditions?'
                ),
                'type'     => 'text',
                'options'  => [],
                'required' => false,
            ],

            // ── Section 4 : Restauration ─────────────────────────────────────
            [
                'id'       => 'q5a',
                'section'  => 'Section 4 : Restauration',
                'section_i18n' => $tr('Section 4 : Restauration', 'Section 4: Catering'),
                'label'    => 'Comment avez-vous trouvé la variété et la qualité des plats servis ?',
                'label_i18n' => $tr(
                    'Comment avez-vous trouvé la variété et la qualité des plats servis ?',
                    'How did you find the variety and quality of the dishes served?'
                ),
                'type'     => 'rating',
                'options'  => [],
                'required' => true,
            ],
            [
                'id'       => 'q5b',
                'section'  => 'Section 4 : Restauration',
                'section_i18n' => $tr('Section 4 : Restauration', 'Section 4: Catering'),
                'label'    => 'Les boissons proposées correspondaient-elles à vos attentes ?',
                'label_i18n' => $tr(
                    'Les boissons proposées correspondaient-elles à vos attentes ?',
                    'Did the beverages offered meet your expectations?'
                ),
                // Tout à fait → Plutôt oui → Plutôt non → Pas du tout  →  étoiles
                'type'     => 'rating',
                'options'  => [],
                'required' => true,
            ],
            [
                'id'       => 'q5c',
                'section'  => 'Section 4 : Restauration',
                'section_i18n' => $tr('Section 4 : Restauration', 'Section 4: Catering'),
                'label'    => 'Le service du repas était-il bien organisé (file d\'attente, temps de service…) ?',
                'label_i18n' => $tr(
                    'Le service du repas était-il bien organisé (file d\'attente, temps de service…) ?',
                    'Was meal service well organized (queue management, service time, etc.)?'
                ),
                'type'     => 'rating',
                'options'  => [],
                'required' => true,
            ],
            [
                'id'       => 'q5d',
                'section'  => 'Section 4 : Restauration',
                'section_i18n' => $tr('Section 4 : Restauration', 'Section 4: Catering'),
                'label'    => 'Les boissons étaient-elles disponibles et facilement accessibles tout au long de l\'événement ?',
                'label_i18n' => $tr(
                    'Les boissons étaient-elles disponibles et facilement accessibles tout au long de l\'événement ?',
                    'Were beverages available and easily accessible throughout the event?'
                ),
                'type'     => 'rating',
                'options'  => [],
                'required' => true,
            ],
            [
                'id'       => 'q5_comment',
                'section'  => 'Section 4 : Restauration',
                'section_i18n' => $tr('Section 4 : Restauration', 'Section 4: Catering'),
                'label'    => 'Avez-vous des suggestions pour améliorer la restauration lors des prochaines éditions ?',
                'label_i18n' => $tr(
                    'Avez-vous des suggestions pour améliorer la restauration lors des prochaines éditions ?',
                    'Do you have suggestions to improve catering in future editions?'
                ),
                'type'     => 'text',
                'options'  => [],
                'required' => false,
            ],

            // ── Section 5 : Animation ────────────────────────────────────────
            [
                'id'       => 'q6',
                'section'  => 'Section 5 : Animation',
                'section_i18n' => $tr('Section 5 : Animation', 'Section 5: Activities & Entertainment'),
                'label'    => 'Parmi les activités et animations proposées, lesquelles avez-vous le plus appréciées ? (Plusieurs réponses possibles)',
                'label_i18n' => $tr(
                    'Parmi les activités et animations proposées, lesquelles avez-vous le plus appréciées ? (Plusieurs réponses possibles)',
                    'Among the proposed activities and entertainment, which did you enjoy the most? (Multiple answers possible)'
                ),
                'type'     => 'checkbox',
                'options'  => [
                    'La sonorisation et la musique',
                    'Les jeux et activités ludiques',
                    'Le match sportif',
                    'Les discours et allocutions',
                    'L\'ambiance générale',
                ],
                'options_i18n' => [
                    'fr' => [
                        'La sonorisation et la musique',
                        'Les jeux et activités ludiques',
                        'Le match sportif',
                        'Les discours et allocutions',
                        'L\'ambiance générale',
                    ],
                    'en' => [
                        'Sound system and music',
                        'Games and fun activities',
                        'Sports match',
                        'Speeches and addresses',
                        'Overall atmosphere',
                    ],
                ],
                'required' => false,
            ],
            [
                'id'       => 'q6_rating',
                'section'  => 'Section 5 : Animation',
                'section_i18n' => $tr('Section 5 : Animation', 'Section 5: Activities & Entertainment'),
                'label'    => 'Quelle note globale donnez-vous à l\'ambiance et aux animations de l\'événement ?',
                'label_i18n' => $tr(
                    'Quelle note globale donnez-vous à l\'ambiance et aux animations de l\'événement ?',
                    'What overall rating would you give to the atmosphere and entertainment of the event?'
                ),
                'type'     => 'rating',
                'options'  => [],
                'required' => true,
            ],
            [
                'id'       => 'q6_comment',
                'section'  => 'Section 5 : Animation',
                'section_i18n' => $tr('Section 5 : Animation', 'Section 5: Activities & Entertainment'),
                'label'    => 'Avez-vous des idées d\'animations à proposer pour les prochaines éditions ?',
                'label_i18n' => $tr(
                    'Avez-vous des idées d\'animations à proposer pour les prochaines éditions ?',
                    'Do you have ideas for activities to suggest for future editions?'
                ),
                'type'     => 'text',
                'options'  => [],
                'required' => false,
            ],

            // ── Section 6 : Appréciation Globale ─────────────────────────────
            [
                'id'       => 'q7_rating',
                'section'  => 'Section 6 : Appréciation Globale',
                'section_i18n' => $tr('Section 6 : Appréciation Globale', 'Section 6: Overall Assessment'),
                'label'    => 'En tenant compte de tous les aspects, quelle note globale attribuez-vous à cette 140e édition de la Fête du Travail ?',
                'label_i18n' => $tr(
                    'En tenant compte de tous les aspects, quelle note globale attribuez-vous à cette 140e édition de la Fête du Travail ?',
                    'Considering all aspects, what overall score would you give this 140th Labor Day celebration?'
                ),
                'type'     => 'rating',
                'options'  => [],
                'required' => true,
            ],
            [
                'id'       => 'q7',
                'section'  => 'Section 6 : Appréciation Globale',
                'section_i18n' => $tr('Section 6 : Appréciation Globale', 'Section 6: Overall Assessment'),
                'label'    => 'Quelles améliorations concrètes proposez-vous pour que les prochaines éditions soient encore meilleures ?',
                'label_i18n' => $tr(
                    'Quelles améliorations concrètes proposez-vous pour que les prochaines éditions soient encore meilleures ?',
                    'What concrete improvements do you suggest to make future editions even better?'
                ),
                'type'     => 'text',
                'options'  => [],
                'required' => false,
            ],
        ];

        HrSurvey::query()->where('is_active', true)->update(['is_active' => false]);

        // Remove previous instance of this survey (no responses yet expected)
        HrSurvey::where('title', 'like', '%140e Fête du Travail%')->delete();

        HrSurvey::create([
            'title'       => 'La Division de la Qualité et du Développement Durable (DQDD), vous invite à renseigner le questionnaire ci-après, dans le cadre de l\'évaluation de l\'organisation des célébrations du 1er Mai 2026 par le PAD',
            'description' => '',
            // 'description' => 'La Division de la Qualité et du Développement Durable (DQDD), vous invite à renseigner le questionnaire ci-après, dans le cadre de l\'évaluation de l\'organisation des célébrations du 1er Mai 2026 par le PAD',
            'question'    => 'Questionnaire 140e Fête du Travail',
            'cover_image' => '/assets/images/surveys/fete_travail.jpeg',
            'options'     => [
                'initiative_by' => 'Division de la Qualité et du Développement Durable',
                'i18n' => [
                    'title' => $tr(
                        'La Division de la Qualité et du Développement Durable (DQDD), vous invite à renseigner le questionnaire ci-après, dans le cadre de l\'évaluation de l\'organisation des célébrations du 1er Mai 2026 par le PAD',
                        'The Quality and Sustainable Development Division (DQDD) invites you to complete the questionnaire below, as part of the evaluation of the organization of the May 1st, 2026 celebrations by the PAD'
                    ),
                    'description' => $tr(
                        '',
                        // 'La Division de la Qualité et du Développement Durable (DQDD), vous invite à renseigner le questionnaire ci-après, dans le cadre de l\'évaluation de l\'organisation des célébrations du 1er Mai 2026 par le PAD',
                        ''
                        // 'The Quality and Sustainable Development Division (DQDD) invites you to complete the questionnaire below, as part of the evaluation of the organization of the May 1st, 2026 celebrations by the PAD'
                    ),
                    'question' => $tr('Questionnaire 140e Fête du Travail', '140th Labor Day Questionnaire'),
                    'initiative_by' => $tr(
                        'Division de la Qualité et du Développement Durable',
                        'Quality and Sustainable Development Division'
                    ),
                ],
            ],
            'questions'   => $questions,
            'is_active'   => true,
            'starts_at'   => now(),
            'ends_at'     => '2026-05-31',
        ]);
    }
}