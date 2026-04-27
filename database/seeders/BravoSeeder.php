<?php

namespace Database\Seeders;

use App\Models\Bravo;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * BravoSeeder
 * -----------
 * Génère ~120 bravos réalistes entre les utilisateurs existants.
 *
 * Prérequis :
 *   - UserSeeder doit avoir tourné (on récupère les users en base)
 *   - La table `bravos` doit exister avec au minimum :
 *       sender_id, receiver_id, message, points, created_at
 *
 * Lancement :
 *   php artisan db:seed --class=BravoSeeder
 *
 * Ou ajoutez dans DatabaseSeeder::run() :
 *   $this->call(BravoSeeder::class);
 */
class BravoSeeder extends Seeder
{
    // ── Messages de bravo variés (contexte entreprise camerounaise) ──
    private static array $messages = [
        "Excellent travail sur le rapport de fin de trimestre, vraiment impressionnant !",
        "Merci pour ton aide précieuse lors de la réunion avec la direction. Tu as été brillant(e).",
        "Tu as géré ce dossier avec beaucoup de professionnalisme. Bravo !",
        "Ton implication dans le projet de digitalisation est remarquable. Continue ainsi !",
        "Merci pour ta réactivité et ta disponibilité. L'équipe te remercie.",
        "Félicitations pour la présentation d'hier. La DG a été très satisfaite.",
        "Tu as assuré une permanence exemplaire pendant les congés de l'équipe.",
        "Ton sens de l'initiative a vraiment fait avancer notre projet. Merci !",
        "La qualité de ton travail sur l'audit interne est à saluer. Bravo !",
        "Merci d'avoir pris en charge la formation des nouveaux arrivants avec autant d'enthousiasme.",
        "Ton rapport d'activité était clair, précis et bien structuré. Félicitations.",
        "Tu es toujours prêt(e) à aider tes collègues. C'est une vraie valeur pour notre équipe.",
        "Bravo pour avoir respecté les délais sur un dossier aussi complexe !",
        "Ton calme et ta rigueur pendant la crise ont été déterminants. Merci.",
        "Je voulais juste te dire que ton travail est remarqué et apprécié à sa juste valeur.",
        "Tu as représenté notre direction avec beaucoup d'honneur lors de l'atelier national.",
        "Bravo pour l'organisation irréprochable de la journée portes ouvertes.",
        "Merci d'avoir géré les réclamations des usagers avec tant de patience et d'efficacité.",
        "Ton engagement va au-delà de ce qu'on attendait. C'est vraiment appréciable.",
        "Tu es une source d'inspiration pour toute l'équipe. Continue comme ça !",
        "Félicitations pour ta promotion bien méritée. Tu l'as vraiment gagné(e) !",
        "Ton expertise technique a sauvé le projet in extremis. Merci pour ton professionnalisme.",
        "Merci pour ton écoute et ton soutien lors de cette période difficile.",
        "Ton travail de fond sur la base de données a grandement facilité notre audit.",
        "Bravo pour avoir livré le livrable en avance sur le planning. Très rare et très apprécié !",
    ];

    // ── Valeurs de points possibles ──────────────────────────────────
    private static array $pointValues = [10, 20, 25, 30, 50, 75, 100];

    public function run(): void
    {
        $users = User::all();

        if ($users->count() < 2) {
            $this->command->warn('Pas assez d\'utilisateurs pour générer des bravos. Lancez d\'abord UserSeeder.');
            return;
        }

        $userIds = $users->pluck('id')->toArray();
        $total   = 0;

        // Générer ~6 bravos par utilisateur (en tant qu'expéditeur)
        foreach ($userIds as $senderId) {
            $nbBravos = random_int(4, 8);

            // Destinataires potentiels : tout le monde sauf l'expéditeur
            $potentialReceivers = array_values(array_filter($userIds, fn($id) => $id !== $senderId));
            shuffle($potentialReceivers);
            $receivers = array_slice($potentialReceivers, 0, $nbBravos);

            foreach ($receivers as $receiverId) {
                $points  = self::$pointValues[array_rand(self::$pointValues)];
                $message = self::$messages[array_rand(self::$messages)];

                // Date aléatoire dans les 90 derniers jours
                $createdAt = Carbon::now()->subDays(random_int(0, 90))
                                          ->subHours(random_int(0, 23))
                                          ->subMinutes(random_int(0, 59));

                Bravo::create([
                    'sender_id'   => $senderId,
                    'receiver_id' => $receiverId,
                    'message'     => $message,
                    'points'      => $points,
                    'created_at'  => $createdAt,
                    'updated_at'  => $createdAt,
                ]);

                $total++;
            }
        }

        // Mettre à jour les points_total des utilisateurs
        foreach (User::all() as $user) {
            $received = Bravo::where('receiver_id', $user->id)->sum('points');
            // Adaptez selon votre logique métier :
            // $user->update(['points_total' => $received]);
        }

        $this->command->info("✅ {$total} bravos créés avec succès.");
    }
}