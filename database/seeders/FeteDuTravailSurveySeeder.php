<?php

namespace Database\Seeders;

use App\Models\HrSurvey;
use Illuminate\Database\Seeder;

class FeteDuTravailSurveySeeder extends Seeder
{
    public function run(): void
    {
        $satisf4 = ['Très satisfaisante', 'Satisfaisante', 'Moyenne', 'Insatisfaisante'];
        $appre4  = ['Très bonne', 'Bonne', 'Moyenne', 'Mauvaise'];
        $clarte4 = ['Très claire', 'Assez claire', 'Peu claire', 'Pas du tout claire'];

        $questions = [
            // Section 1
            [
                'id'       => 'q1',
                'section'  => 'Section 1 : Organisation Générale',
                'label'    => 'Comment évaluez-vous l\'organisation globale des cérémonies du 1er Mai (Défilé et réception au club PAD) ?',
                'type'     => 'radio',
                'options'  => $satisf4,
                'required' => true,
            ],
            [
                'id'       => 'q1_comment',
                'section'  => 'Section 1 : Organisation Générale',
                'label'    => 'Commentaires sur l\'organisation globale',
                'type'     => 'text',
                'options'  => [],
                'required' => false,
            ],
            [
                'id'       => 'q2',
                'section'  => 'Section 1 : Organisation Générale',
                'label'    => 'Comment évaluez-vous la communication déployée autour de l\'organisation des cérémonies ?',
                'type'     => 'radio',
                'options'  => $clarte4,
                'required' => true,
            ],
            [
                'id'       => 'q2_comment',
                'section'  => 'Section 1 : Organisation Générale',
                'label'    => 'Commentaires sur la communication',
                'type'     => 'text',
                'options'  => [],
                'required' => false,
            ],
            // Section 2
            [
                'id'       => 'q3',
                'section'  => 'Section 2 : Accueil au Club PAD',
                'label'    => 'Quelle appréciation faites-vous de l\'accueil des participants à la cérémonie ?',
                'type'     => 'radio',
                'options'  => $appre4,
                'required' => true,
            ],
            [
                'id'       => 'q3_comment',
                'section'  => 'Section 2 : Accueil au Club PAD',
                'label'    => 'Commentaires sur l\'accueil',
                'type'     => 'text',
                'options'  => [],
                'required' => false,
            ],
            // Section 3
            [
                'id'       => 'q4a',
                'section'  => 'Section 3 : Les Conditions d\'Installations',
                'label'    => 'Mise en place des participants',
                'type'     => 'radio',
                'options'  => $appre4,
                'required' => true,
            ],
            [
                'id'       => 'q4b',
                'section'  => 'Section 3 : Les Conditions d\'Installations',
                'label'    => 'L\'accès aux places assises',
                'type'     => 'radio',
                'options'  => $appre4,
                'required' => true,
            ],
            [
                'id'       => 'q4c',
                'section'  => 'Section 3 : Les Conditions d\'Installations',
                'label'    => 'La décoration',
                'type'     => 'radio',
                'options'  => $appre4,
                'required' => true,
            ],
            [
                'id'       => 'q4_comment',
                'section'  => 'Section 3 : Les Conditions d\'Installations',
                'label'    => 'Commentaires sur les conditions d\'installations',
                'type'     => 'text',
                'options'  => [],
                'required' => false,
            ],
            // Section 4
            [
                'id'       => 'q5a',
                'section'  => 'Section 4 : Restauration',
                'label'    => 'L\'offre au menu',
                'type'     => 'radio',
                'options'  => $satisf4,
                'required' => true,
            ],
            [
                'id'       => 'q5b',
                'section'  => 'Section 4 : Restauration',
                'label'    => 'La nature des boissons',
                'type'     => 'radio',
                'options'  => $satisf4,
                'required' => true,
            ],
            [
                'id'       => 'q5c',
                'section'  => 'Section 4 : Restauration',
                'label'    => 'La gestion de l\'accès au menu',
                'type'     => 'radio',
                'options'  => $satisf4,
                'required' => true,
            ],
            [
                'id'       => 'q5d',
                'section'  => 'Section 4 : Restauration',
                'label'    => 'La gestion de l\'accès aux boissons',
                'type'     => 'radio',
                'options'  => $satisf4,
                'required' => true,
            ],
            [
                'id'       => 'q5_comment',
                'section'  => 'Section 4 : Restauration',
                'label'    => 'Commentaires sur la restauration',
                'type'     => 'text',
                'options'  => [],
                'required' => false,
            ],
            // Section 5
            [
                'id'       => 'q6',
                'section'  => 'Section 5 : Animation',
                'label'    => 'Comment évaluez-vous l\'ambiance et les animations (Sonorisation, jeux, match etc.) ?',
                'type'     => 'radio',
                'options'  => $satisf4,
                'required' => true,
            ],
            [
                'id'       => 'q6_comment',
                'section'  => 'Section 5 : Animation',
                'label'    => 'Commentaires sur l\'animation',
                'type'     => 'text',
                'options'  => [],
                'required' => false,
            ],
            // Section 6
            [
                'id'       => 'q7',
                'section'  => 'Section 6 : Appréciation Globale',
                'label'    => 'Quelles améliorations proposeriez-vous pour les prochaines éditions ?',
                'type'     => 'text',
                'options'  => [],
                'required' => false,
            ],
        ];

        // Deactivate all existing surveys before creating this one
        HrSurvey::query()->where('is_active', true)->update(['is_active' => false]);

        HrSurvey::create([
            'title'       => 'Perception de l\'organisation de la 140e Fête du Travail (1er Mai 2026)',
            'description' => 'Dans le cadre de l\'organisation des évènements par le groupe PAD. Vous êtes priés de bien vouloir renseigner ce questionnaire relatif à la célébration de la fête du travail édition 2026.',
            'question'    => 'Questionnaire 140e Fête du Travail',
            'options'     => [],
            'questions'   => $questions,
            'is_active'   => true,
            'starts_at'   => now(),
            'ends_at'     => '2026-05-31',
        ]);
    }
}
