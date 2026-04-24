<?php

namespace App\Services;

use App\Models\Bravo;
use App\Models\User;
use App\Models\UserBadge;
use App\Notifications\BadgeEarnedNotification;
use Illuminate\Support\Facades\DB;

class BadgeService
{
    // Badge definitions: type => [label, description, check closure]
    public static array $BADGES = [
        'premier_bravo_recu' => [
            'label'       => 'Premier Bravo',
            'description' => 'Recevoir son premier Bravo',
            'color'       => '#f59e0b',
            'emoji'       => '⭐',
        ],
        'premier_bravo_envoye' => [
            'label'       => 'Généreux',
            'description' => 'Envoyer son premier Bravo',
            'color'       => '#ec4899',
            'emoji'       => '💝',
        ],
        'pont_directions' => [
            'label'       => 'Pont entre directions',
            'description' => 'Envoyer un Bravo à quelqu\'un d\'une autre direction',
            'color'       => '#6366f1',
            'emoji'       => '🌉',
        ],
        'genereux_5' => [
            'label'       => 'Esprit généreux',
            'description' => 'Envoyer 5 Bravos',
            'color'       => '#ec4899',
            'emoji'       => '🤝',
        ],
        'genereux_10' => [
            'label'       => 'Super généreux',
            'description' => 'Envoyer 10 Bravos',
            'color'       => '#e11d48',
            'emoji'       => '💫',
        ],
        'reconnu_5' => [
            'label'       => 'Reconnu',
            'description' => 'Recevoir 5 Bravos',
            'color'       => '#10b981',
            'emoji'       => '🏅',
        ],
        'reconnu_10' => [
            'label'       => 'Bien reconnu',
            'description' => 'Recevoir 10 Bravos',
            'color'       => '#059669',
            'emoji'       => '🏆',
        ],
        'ambassadeur' => [
            'label'       => 'Ambassadeur',
            'description' => 'Envoyer des Bravos à 5 personnes différentes',
            'color'       => '#0ea5e9',
            'emoji'       => '🌟',
        ],
        'cap_500' => [
            'label'       => 'Cap 500',
            'description' => 'Atteindre 500 points',
            'color'       => '#8b5cf6',
            'emoji'       => '⚡',
        ],
        'cap_2000' => [
            'label'       => 'Cap 2000',
            'description' => 'Atteindre 2000 points',
            'color'       => '#f97316',
            'emoji'       => '🔥',
        ],
    ];

    /**
     * Check and award badges after a bravo is sent/received.
     * Called once for sender, once for receiver.
     */
    public function checkAfterBravo(Bravo $bravo): void
    {
        $this->checkForSender($bravo);
        $this->checkForReceiver($bravo);
    }

    private function checkForSender(Bravo $bravo): void
    {
        $sender = $bravo->sender;
        if (!$sender) return;

        $sentCount = Bravo::where('sender_id', $sender->id)->count();
        $uniqueRecipients = Bravo::where('sender_id', $sender->id)
            ->distinct('receiver_id')->count('receiver_id');

        $toCheck = [
            'premier_bravo_envoye' => $sentCount >= 1,
            'pont_directions'      => $this->hasSentCrossDepartment($bravo),
            'genereux_5'           => $sentCount >= 5,
            'genereux_10'          => $sentCount >= 10,
            'ambassadeur'          => $uniqueRecipients >= 5,
        ];

        foreach ($toCheck as $type => $earned) {
            if ($earned) {
                $this->awardBadge($sender, $type);
            }
        }
    }

    private function checkForReceiver(Bravo $bravo): void
    {
        $receiver = $bravo->receiver;
        if (!$receiver) return;

        $receivedCount = Bravo::where('receiver_id', $receiver->id)->count();

        $toCheck = [
            'premier_bravo_recu' => $receivedCount >= 1,
            'reconnu_5'          => $receivedCount >= 5,
            'reconnu_10'         => $receivedCount >= 10,
            'cap_500'            => $receiver->points_total >= 500,
            'cap_2000'           => $receiver->points_total >= 2000,
        ];

        foreach ($toCheck as $type => $earned) {
            if ($earned) {
                $this->awardBadge($receiver, $type);
            }
        }
    }

    private function hasSentCrossDepartment(Bravo $bravo): bool
    {
        $sender   = $bravo->sender;
        $receiver = $bravo->receiver;

        if (!$sender || !$receiver) return false;
        if (is_null($sender->department_id) || is_null($receiver->department_id)) return false;

        return $sender->department_id !== $receiver->department_id;
    }

    /**
     * Award a badge to a user if not already earned, then notify them.
     */
    public function awardBadge(User $user, string $badgeType): bool
    {
        $exists = UserBadge::where('user_id', $user->id)
            ->where('badge_type', $badgeType)
            ->exists();

        if ($exists) return false;

        UserBadge::create([
            'user_id'   => $user->id,
            'badge_type'=> $badgeType,
            'earned_at' => now(),
        ]);

        $meta = self::$BADGES[$badgeType] ?? null;
        if ($meta) {
            $user->notify(new BadgeEarnedNotification(
                $badgeType,
                $meta['label'],
                $meta['description']
            ));
        }

        return true;
    }
}
