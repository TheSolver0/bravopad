<?php

namespace App\Services\Survey;

class SurveyTemplateService
{
    public function all(): array
    {
        return [
            $this->engagementTemplate(),
            $this->onboardingTemplate(),
            $this->exitTemplate(),
            $this->feedback360Template(),
            $this->wellbeingTemplate(),
            $this->trainingTemplate(),
            $this->climateTemplate(),
            $this->pulseTemplate(),
        ];
    }

    public function find(string $id): ?array
    {
        return collect($this->all())->firstWhere('id', $id);
    }

    private function engagementTemplate(): array
    {
        return [
            'id'          => 'engagement',
            'name'        => 'Engagement collaborateur',
            'description' => 'Mesure l\'engagement, la motivation et la satisfaction globale de vos équipes.',
            'category'    => 'engagement',
            'icon'        => 'heart',
            'color'       => 'rose',
            'questions'   => [
                ['id' => 'q_eng_1', 'section' => 'Engagement global', 'label' => 'Sur une échelle de 1 à 5, quel est votre niveau d\'engagement au travail en ce moment ?', 'type' => 'rating', 'options' => [], 'required' => true],
                ['id' => 'q_eng_2', 'section' => 'Engagement global', 'label' => 'Recommanderiez-vous votre entreprise comme lieu de travail à vos proches ?', 'type' => 'radio', 'options' => ['Certainement', 'Probablement', 'Probablement pas', 'Certainement pas'], 'required' => true],
                ['id' => 'q_eng_3', 'section' => 'Motivation', 'label' => 'Qu\'est-ce qui vous motive le plus dans votre travail actuellement ?', 'type' => 'checkbox', 'options' => ['Reconnaissance de mes efforts', 'Évolution de carrière', 'Cohésion d\'équipe', 'Rémunération', 'Autonomie', 'Impact de mon travail'], 'required' => true],
                ['id' => 'q_eng_4', 'section' => 'Motivation', 'label' => 'Comment évaluez-vous la qualité de la communication interne ?', 'type' => 'rating', 'options' => [], 'required' => true],
                ['id' => 'q_eng_5', 'section' => 'Satisfaction', 'label' => 'Êtes-vous satisfait(e) de l\'équilibre entre vie professionnelle et vie personnelle ?', 'type' => 'radio', 'options' => ['Très satisfait(e)', 'Satisfait(e)', 'Insatisfait(e)', 'Très insatisfait(e)'], 'required' => true],
                ['id' => 'q_eng_6', 'section' => 'Satisfaction', 'label' => 'Avez-vous des suggestions pour améliorer votre expérience au travail ?', 'type' => 'text', 'options' => [], 'required' => false],
            ],
        ];
    }

    private function onboardingTemplate(): array
    {
        return [
            'id'          => 'onboarding',
            'name'        => 'Expérience d\'intégration',
            'description' => 'Évaluez le processus d\'accueil et d\'intégration des nouveaux collaborateurs.',
            'category'    => 'onboarding',
            'icon'        => 'user-plus',
            'color'       => 'emerald',
            'questions'   => [
                ['id' => 'q_on_1', 'section' => 'Accueil', 'label' => 'Comment évaluez-vous la qualité de votre accueil lors de votre arrivée ?', 'type' => 'rating', 'options' => [], 'required' => true],
                ['id' => 'q_on_2', 'section' => 'Accueil', 'label' => 'Disposiez-vous de tous les équipements nécessaires dès votre premier jour ?', 'type' => 'radio', 'options' => ['Oui, tout était prêt', 'La plupart des équipements', 'Seulement l\'essentiel', 'Non, il manquait beaucoup'], 'required' => true],
                ['id' => 'q_on_3', 'section' => 'Formation & accompagnement', 'label' => 'Avez-vous reçu une formation adéquate pour démarrer votre poste ?', 'type' => 'rating', 'options' => [], 'required' => true],
                ['id' => 'q_on_4', 'section' => 'Formation & accompagnement', 'label' => 'Quels aspects de votre intégration ont été les plus utiles ?', 'type' => 'checkbox', 'options' => ['Présentation de l\'équipe', 'Formation aux outils', 'Découverte de la culture d\'entreprise', 'Accompagnement par un mentor', 'Visite des locaux'], 'required' => false],
                ['id' => 'q_on_5', 'section' => 'Intégration dans l\'équipe', 'label' => 'Vous sentez-vous bien intégré(e) au sein de votre équipe ?', 'type' => 'rating', 'options' => [], 'required' => true],
                ['id' => 'q_on_6', 'section' => 'Amélioration', 'label' => 'Qu\'aurions-nous pu faire mieux pour faciliter votre intégration ?', 'type' => 'text', 'options' => [], 'required' => false],
            ],
        ];
    }

    private function exitTemplate(): array
    {
        return [
            'id'          => 'exit-interview',
            'name'        => 'Entretien de départ',
            'description' => 'Recueillez les retours des collaborateurs qui quittent l\'entreprise.',
            'category'    => 'exit',
            'icon'        => 'log-out',
            'color'       => 'orange',
            'questions'   => [
                ['id' => 'q_ex_1', 'section' => 'Motif de départ', 'label' => 'Quelle est la raison principale de votre départ ?', 'type' => 'radio', 'options' => ['Opportunité de carrière externe', 'Rémunération insuffisante', 'Qualité du management', 'Manque de perspectives d\'évolution', 'Raisons personnelles', 'Ambiance de travail', 'Autre'], 'required' => true],
                ['id' => 'q_ex_2', 'section' => 'Expérience globale', 'label' => 'Comment évaluez-vous votre expérience globale au sein de l\'entreprise ?', 'type' => 'rating', 'options' => [], 'required' => true],
                ['id' => 'q_ex_3', 'section' => 'Management', 'label' => 'Comment évaluez-vous la qualité du management que vous avez reçu ?', 'type' => 'rating', 'options' => [], 'required' => true],
                ['id' => 'q_ex_4', 'section' => 'Points forts', 'label' => 'Quels sont les aspects que vous avez le plus appréciés dans l\'entreprise ?', 'type' => 'text', 'options' => [], 'required' => false],
                ['id' => 'q_ex_5', 'section' => 'Axes d\'amélioration', 'label' => 'Quels changements auraient pu vous faire rester ?', 'type' => 'text', 'options' => [], 'required' => false],
                ['id' => 'q_ex_6', 'section' => 'Recommandation', 'label' => 'Recommanderiez-vous cette entreprise à un ami ou collègue ?', 'type' => 'radio', 'options' => ['Oui, sans hésitation', 'Oui, avec quelques réserves', 'Non', 'Je préfère ne pas répondre'], 'required' => true],
            ],
        ];
    }

    private function feedback360Template(): array
    {
        return [
            'id'          => '360-feedback',
            'name'        => 'Feedback 360°',
            'description' => 'Évaluation multi-sources — pairs, collaborateurs et managers.',
            'category'    => 'feedback',
            'icon'        => 'refresh-cw',
            'color'       => 'violet',
            'questions'   => [
                ['id' => 'q_360_1', 'section' => 'Compétences professionnelles', 'label' => 'Comment évaluez-vous les compétences techniques de ce collaborateur ?', 'type' => 'rating', 'options' => [], 'required' => true],
                ['id' => 'q_360_2', 'section' => 'Compétences professionnelles', 'label' => 'Ce collaborateur fait-il preuve d\'initiative dans son travail ?', 'type' => 'radio', 'options' => ['Toujours', 'Souvent', 'Parfois', 'Rarement'], 'required' => true],
                ['id' => 'q_360_3', 'section' => 'Collaboration', 'label' => 'Comment évaluez-vous la qualité de la collaboration avec ce collaborateur ?', 'type' => 'rating', 'options' => [], 'required' => true],
                ['id' => 'q_360_4', 'section' => 'Collaboration', 'label' => 'Ce collaborateur contribue-t-il à une bonne ambiance d\'équipe ?', 'type' => 'radio', 'options' => ['Oui, fortement', 'Oui, modérément', 'Peu', 'Non'], 'required' => true],
                ['id' => 'q_360_5', 'section' => 'Communication', 'label' => 'Comment évaluez-vous ses capacités de communication ?', 'type' => 'rating', 'options' => [], 'required' => true],
                ['id' => 'q_360_6', 'section' => 'Points de développement', 'label' => 'Quels sont les axes de développement prioritaires selon vous ?', 'type' => 'text', 'options' => [], 'required' => false],
            ],
        ];
    }

    private function wellbeingTemplate(): array
    {
        return [
            'id'          => 'wellbeing',
            'name'        => 'Bien-être au travail',
            'description' => 'Évaluez le niveau de bien-être, la charge de travail et la santé mentale.',
            'category'    => 'wellbeing',
            'icon'        => 'smile',
            'color'       => 'teal',
            'questions'   => [
                ['id' => 'q_wb_1', 'section' => 'Bien-être général', 'label' => 'Comment évaluez-vous votre bien-être global au travail en ce moment ?', 'type' => 'rating', 'options' => [], 'required' => true],
                ['id' => 'q_wb_2', 'section' => 'Charge de travail', 'label' => 'Comment percevez-vous votre charge de travail actuelle ?', 'type' => 'radio', 'options' => ['Très gérable', 'Gérable', 'Parfois excessive', 'Régulièrement excessive', 'Insoutenable'], 'required' => true],
                ['id' => 'q_wb_3', 'section' => 'Charge de travail', 'label' => 'Arrivez-vous à déconnecter du travail pendant vos temps de repos ?', 'type' => 'radio', 'options' => ['Oui, facilement', 'La plupart du temps', 'Difficilement', 'Non, rarement'], 'required' => true],
                ['id' => 'q_wb_4', 'section' => 'Relations au travail', 'label' => 'Comment évaluez-vous la qualité des relations avec vos collègues ?', 'type' => 'rating', 'options' => [], 'required' => true],
                ['id' => 'q_wb_5', 'section' => 'Facteurs de stress', 'label' => 'Quels facteurs affectent le plus votre bien-être au travail ?', 'type' => 'checkbox', 'options' => ['Charge de travail', 'Manque de reconnaissance', 'Relations avec le manager', 'Environnement de travail', 'Manque d\'autonomie', 'Incertitude sur l\'avenir'], 'required' => false],
                ['id' => 'q_wb_6', 'section' => 'Actions prioritaires', 'label' => 'Qu\'attendez-vous de l\'entreprise pour améliorer votre bien-être au travail ?', 'type' => 'text', 'options' => [], 'required' => false],
            ],
        ];
    }

    private function trainingTemplate(): array
    {
        return [
            'id'          => 'training',
            'name'        => 'Évaluation de formation',
            'description' => 'Mesurez la satisfaction et l\'impact d\'une formation ou d\'un programme de développement.',
            'category'    => 'training',
            'icon'        => 'book-open',
            'color'       => 'blue',
            'questions'   => [
                ['id' => 'q_tr_1', 'section' => 'Contenu', 'label' => 'Comment évaluez-vous la qualité du contenu de la formation ?', 'type' => 'rating', 'options' => [], 'required' => true],
                ['id' => 'q_tr_2', 'section' => 'Contenu', 'label' => 'Le contenu était-il adapté à vos besoins professionnels ?', 'type' => 'radio', 'options' => ['Parfaitement adapté', 'Globalement adapté', 'Partiellement adapté', 'Pas du tout adapté'], 'required' => true],
                ['id' => 'q_tr_3', 'section' => 'Formateur', 'label' => 'Comment évaluez-vous la qualité de l\'animation / du formateur ?', 'type' => 'rating', 'options' => [], 'required' => true],
                ['id' => 'q_tr_4', 'section' => 'Organisation', 'label' => 'Comment évaluez-vous l\'organisation logistique de la formation ?', 'type' => 'rating', 'options' => [], 'required' => true],
                ['id' => 'q_tr_5', 'section' => 'Impact', 'label' => 'Pensez-vous pouvoir appliquer directement ce que vous avez appris dans votre travail ?', 'type' => 'radio', 'options' => ['Oui, immédiatement', 'Oui, dans les prochaines semaines', 'Partiellement', 'Non'], 'required' => true],
                ['id' => 'q_tr_6', 'section' => 'Retour global', 'label' => 'Quels aspects de la formation souhaiteriez-vous voir améliorés ?', 'type' => 'text', 'options' => [], 'required' => false],
            ],
        ];
    }

    private function climateTemplate(): array
    {
        return [
            'id'          => 'climate',
            'name'        => 'Enquête climatique annuelle',
            'description' => 'Bilan annuel sur le climat social, la culture d\'entreprise et la stratégie.',
            'category'    => 'climate',
            'icon'        => 'sun',
            'color'       => 'amber',
            'questions'   => [
                ['id' => 'q_cl_1', 'section' => 'Vision & stratégie', 'label' => 'Comprenez-vous clairement la stratégie et les objectifs de l\'entreprise ?', 'type' => 'rating', 'options' => [], 'required' => true],
                ['id' => 'q_cl_2', 'section' => 'Vision & stratégie', 'label' => 'Êtes-vous confiant(e) dans l\'avenir de l\'entreprise ?', 'type' => 'radio', 'options' => ['Très confiant(e)', 'Confiant(e)', 'Peu confiant(e)', 'Pas confiant(e)'], 'required' => true],
                ['id' => 'q_cl_3', 'section' => 'Culture d\'entreprise', 'label' => 'Les valeurs de l\'entreprise sont-elles reflétées dans les pratiques quotidiennes ?', 'type' => 'rating', 'options' => [], 'required' => true],
                ['id' => 'q_cl_4', 'section' => 'Management', 'label' => 'Comment évaluez-vous la qualité du management dans l\'entreprise ?', 'type' => 'rating', 'options' => [], 'required' => true],
                ['id' => 'q_cl_5', 'section' => 'Développement', 'label' => 'Disposez-vous des ressources nécessaires pour développer vos compétences ?', 'type' => 'radio', 'options' => ['Oui, pleinement', 'Partiellement', 'Rarement', 'Non'], 'required' => true],
                ['id' => 'q_cl_6', 'section' => 'Développement', 'label' => 'Êtes-vous satisfait(e) des opportunités d\'évolution de carrière disponibles ?', 'type' => 'rating', 'options' => [], 'required' => true],
                ['id' => 'q_cl_7', 'section' => 'NPS Employé', 'label' => 'Sur une échelle de 1 à 5, dans quelle mesure recommanderiez-vous cette entreprise comme lieu de travail ?', 'type' => 'rating', 'options' => [], 'required' => true],
                ['id' => 'q_cl_8', 'section' => 'Libre expression', 'label' => 'Quelles améliorations prioritaires proposeriez-vous pour l\'entreprise ?', 'type' => 'text', 'options' => [], 'required' => false],
            ],
        ];
    }

    private function pulseTemplate(): array
    {
        return [
            'id'          => 'pulse',
            'name'        => 'Pulse Survey (court)',
            'description' => 'Sondage rapide 5 min pour prendre le pouls de votre équipe chaque semaine ou chaque mois.',
            'category'    => 'pulse',
            'icon'        => 'activity',
            'color'       => 'pink',
            'questions'   => [
                ['id' => 'q_pu_1', 'section' => '', 'label' => 'Comment vous sentez-vous au travail cette semaine ?', 'type' => 'rating', 'options' => [], 'required' => true],
                ['id' => 'q_pu_2', 'section' => '', 'label' => 'Avez-vous eu les ressources nécessaires pour accomplir votre travail cette semaine ?', 'type' => 'radio', 'options' => ['Oui, pleinement', 'Partiellement', 'Non'], 'required' => true],
                ['id' => 'q_pu_3', 'section' => '', 'label' => 'Votre manager vous a-t-il/elle apporté le soutien dont vous aviez besoin ?', 'type' => 'radio', 'options' => ['Oui, tout à fait', 'Partiellement', 'Non'], 'required' => true],
                ['id' => 'q_pu_4', 'section' => '', 'label' => 'Y a-t-il quelque chose qui a bloqué votre productivité cette semaine ?', 'type' => 'text', 'options' => [], 'required' => false],
            ],
        ];
    }
}
