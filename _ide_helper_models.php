<?php

// @formatter:off
// phpcs:ignoreFile
/**
 * A helper file for your Eloquent Models
 * Copy the phpDocs from this file to the correct Model,
 * And remove them from this file, to prevent double declarations.
 *
 * @author Barry vd. Heuvel <barryvdh@gmail.com>
 */


namespace App\Models{
/**
 * @property int $id
 * @property string $key
 * @property string|null $value
 * @property string $cast
 * @property string|null $description
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AppSetting newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AppSetting newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AppSetting query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AppSetting whereCast($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AppSetting whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AppSetting whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AppSetting whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AppSetting whereKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AppSetting whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AppSetting whereValue($value)
 */
	class AppSetting extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $action
 * @property int|null $actor_id
 * @property string|null $subject_type
 * @property int|null $subject_id
 * @property string $severity
 * @property array<array-key, mixed>|null $context
 * @property string|null $ip_address
 * @property string|null $description
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @property-read \App\Models\User|null $actor
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereAction($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereActorId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereContext($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereIpAddress($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereSeverity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereSubjectId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereSubjectType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereUpdatedAt($value)
 */
	class AuditLog extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string $type
 * @property string $rarity
 * @property int $level
 * @property string|null $description
 * @property int $visibility_score
 * @property array<array-key, mixed>|null $criteria
 * @property bool $is_active
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\User> $users
 * @property-read int|null $users_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Badge newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Badge newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Badge query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Badge whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Badge whereCriteria($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Badge whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Badge whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Badge whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Badge whereLevel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Badge whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Badge whereRarity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Badge whereSlug($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Badge whereType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Badge whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Badge whereVisibilityScore($value)
 */
	class Badge extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string|null $batch_id
 * @property int $sender_id
 * @property int $receiver_id
 * @property int|null $value_id
 * @property string $badge
 * @property int|null $challenge_id
 * @property string|null $message
 * @property int $points
 * @property int $likes_count
 * @property string $status
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @property-read \App\Models\Challenge|null $challenge
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\BravoComment> $comments
 * @property-read int|null $comments_count
 * @property-read bool $is_in_challenge
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\User> $likedBy
 * @property-read int|null $liked_by_count
 * @property-read \App\Models\User|null $receiver
 * @property-read \App\Models\User|null $sender
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\BravoValue> $values
 * @property-read int|null $values_count
 * @method static \Database\Factories\BravoFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bravo forUser($userId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bravo fromUser($userId)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bravo latest()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bravo newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bravo newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bravo query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bravo whereBadge($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bravo whereBatchId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bravo whereChallengeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bravo whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bravo whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bravo whereLikesCount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bravo whereMessage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bravo wherePoints($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bravo whereReceiverId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bravo whereSenderId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bravo whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bravo whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Bravo whereValueId($value)
 */
	class Bravo extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $bravo_id
 * @property int $user_id
 * @property string $content
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @property \Carbon\CarbonImmutable|null $deleted_at
 * @property-read \App\Models\Bravo|null $bravo
 * @property-read \App\Models\User|null $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoComment newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoComment newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoComment onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoComment query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoComment whereBravoId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoComment whereContent($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoComment whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoComment whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoComment whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoComment whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoComment whereUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoComment withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoComment withoutTrashed()
 */
	class BravoComment extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $bravo_id
 * @property int $user_id
 * @property \Carbon\CarbonImmutable $created_at
 * @property-read \App\Models\Bravo|null $bravo
 * @property-read \App\Models\User|null $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoLike newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoLike newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoLike query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoLike whereBravoId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoLike whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoLike whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoLike whereUserId($value)
 */
	class BravoLike extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $name
 * @property string|null $description
 * @property float $multiplier
 * @property string|null $color
 * @property string|null $icon
 * @property int $is_active
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Bravo> $bravos
 * @property-read int|null $bravos_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoValue active()
 * @method static \Database\Factories\BravoValueFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoValue newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoValue newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoValue query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoValue whereColor($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoValue whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoValue whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoValue whereIcon($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoValue whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoValue whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoValue whereMultiplier($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoValue whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BravoValue whereUpdatedAt($value)
 */
	class BravoValue extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $name
 * @property string|null $description
 * @property string $cover_image
 * @property string|null $category
 * @property string $start_date
 * @property string $end_date
 * @property int $points_bonus
 * @property string $status
 * @property int $for_all
 * @property int $created_by
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @property int|null $division_id
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Bravo> $bravos
 * @property-read int|null $bravos_count
 * @property-read \App\Models\User|null $creator
 * @property-read \App\Models\Department|null $division
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\ChallengeMedia> $media
 * @property-read int|null $media_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\User> $participants
 * @property-read int|null $participants_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Challenge active()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Challenge finished()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Challenge newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Challenge newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Challenge query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Challenge whereCategory($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Challenge whereCoverImage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Challenge whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Challenge whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Challenge whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Challenge whereDivisionId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Challenge whereEndDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Challenge whereForAll($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Challenge whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Challenge whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Challenge wherePointsBonus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Challenge whereStartDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Challenge whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Challenge whereUpdatedAt($value)
 */
	class Challenge extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $challenge_id
 * @property int $uploaded_by
 * @property string $file_path
 * @property string $file_type
 * @property string|null $caption
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @property-read \App\Models\Challenge|null $challenge
 * @property-read \App\Models\User|null $uploader
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChallengeMedia newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChallengeMedia newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChallengeMedia query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChallengeMedia whereCaption($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChallengeMedia whereChallengeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChallengeMedia whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChallengeMedia whereFilePath($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChallengeMedia whereFileType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChallengeMedia whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChallengeMedia whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChallengeMedia whereUploadedBy($value)
 */
	class ChallengeMedia extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $challenge_id
 * @property int $user_id
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @property-read \App\Models\Challenge|null $challenge
 * @property-read \App\Models\User|null $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChallengeParticipant newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChallengeParticipant newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChallengeParticipant query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChallengeParticipant whereChallengeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChallengeParticipant whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChallengeParticipant whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChallengeParticipant whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ChallengeParticipant whereUserId($value)
 */
	class ChallengeParticipant extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $name
 * @property string|null $description
 * @property int|null $manager_id
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\User> $employees
 * @property-read int|null $employees_count
 * @property-read \App\Models\User|null $manager
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Department newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Department newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Department query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Department whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Department whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Department whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Department whereManagerId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Department whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Department whereUpdatedAt($value)
 */
	class Department extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $name
 * @property string|null $name_en
 * @property string|null $code
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Direction newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Direction newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Direction query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Direction whereCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Direction whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Direction whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Direction whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Direction whereNameEn($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Direction whereUpdatedAt($value)
 */
	class Direction extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $title
 * @property string $question
 * @property array<array-key, mixed> $options
 * @property bool $is_active
 * @property int|null $created_by
 * @property \Carbon\CarbonImmutable|null $starts_at
 * @property \Carbon\CarbonImmutable|null $ends_at
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\HrSurveyResponse> $responses
 * @property-read int|null $responses_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HrSurvey newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HrSurvey newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HrSurvey query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HrSurvey whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HrSurvey whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HrSurvey whereEndsAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HrSurvey whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HrSurvey whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HrSurvey whereOptions($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HrSurvey whereQuestion($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HrSurvey whereStartsAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HrSurvey whereTitle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HrSurvey whereUpdatedAt($value)
 */
	class HrSurvey extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $survey_id
 * @property int $user_id
 * @property string $option_key
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @property-read \App\Models\HrSurvey|null $survey
 * @property-read \App\Models\User|null $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HrSurveyResponse newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HrSurveyResponse newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HrSurveyResponse query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HrSurveyResponse whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HrSurveyResponse whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HrSurveyResponse whereOptionKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HrSurveyResponse whereSurveyId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HrSurveyResponse whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|HrSurveyResponse whereUserId($value)
 */
	class HrSurveyResponse extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $voter_id
 * @property int $nominee_id
 * @property string $period
 * @property float $weight
 * @property bool $is_anonymous
 * @property string|null $comment
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @property-read \App\Models\User|null $nominee
 * @property-read \App\Models\User|null $voter
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PeerVote newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PeerVote newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PeerVote query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PeerVote whereComment($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PeerVote whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PeerVote whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PeerVote whereIsAnonymous($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PeerVote whereNomineeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PeerVote wherePeriod($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PeerVote whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PeerVote whereVoterId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PeerVote whereWeight($value)
 */
	class PeerVote extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $user_id
 * @property int $reward_id
 * @property int $points_spent
 * @property string $status
 * @property string|null $notes
 * @property int|null $approved_by
 * @property \Carbon\CarbonImmutable|null $approved_at
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @property-read \App\Models\User|null $approvedBy
 * @property-read \App\Models\Reward|null $reward
 * @property-read \App\Models\User|null $user
 * @method static \Database\Factories\RedemptionFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Redemption newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Redemption newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Redemption pending()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Redemption query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Redemption whereApprovedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Redemption whereApprovedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Redemption whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Redemption whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Redemption whereNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Redemption wherePointsSpent($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Redemption whereRewardId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Redemption whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Redemption whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Redemption whereUserId($value)
 */
	class Redemption extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $name
 * @property string|null $description
 * @property string $category
 * @property int $cost_points
 * @property string|null $image_url
 * @property int|null $stock
 * @property bool $is_active
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Redemption> $redemptions
 * @property-read int|null $redemptions_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reward active()
 * @method static \Database\Factories\RewardFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reward newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reward newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reward query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reward whereCategory($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reward whereCostPoints($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reward whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reward whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reward whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reward whereImageUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reward whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reward whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reward whereStock($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Reward whereUpdatedAt($value)
 */
	class Reward extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $name
 * @property string|null $role
 * @property string $permission
 * @property int|null $department_id
 * @property int|null $direction_id
 * @property string|null $avatar
 * @property \Carbon\CarbonImmutable|null $birth_date
 * @property string|null $hire_date
 * @property \Carbon\CarbonImmutable|null $hired_at
 * @property bool $is_automation
 * @property int $points_total
 * @property int $monthly_points_allowance
 * @property int $monthly_points_given
 * @property string $email
 * @property \Carbon\CarbonImmutable|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property \Carbon\CarbonImmutable|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Badge> $badges
 * @property-read int|null $badges_count
 * @property-read \App\Models\Department|null $department
 * @property-read \App\Models\Direction|null $direction
 * @property-read mixed $monthly_points_remaining
 * @property-read \Illuminate\Notifications\DatabaseNotificationCollection<int, \Illuminate\Notifications\DatabaseNotification> $notifications
 * @property-read int|null $notifications_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Spatie\Permission\Models\Permission> $permissions
 * @property-read int|null $permissions_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Bravo> $receivedBravos
 * @property-read int|null $received_bravos_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Spatie\Permission\Models\Role> $roles
 * @property-read int|null $roles_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Bravo> $sentBravos
 * @property-read int|null $sent_bravos_count
 * @method static \Database\Factories\UserFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User permission($permissions, bool $without = false)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User role($roles, ?string $guard = null, bool $without = false)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereAvatar($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereBirthDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereDepartmentId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereDirectionId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereEmailVerifiedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereHireDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereHiredAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereIsAutomation($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereMonthlyPointsAllowance($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereMonthlyPointsGiven($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePassword($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePermission($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePointsTotal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereRememberToken($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereRole($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereTwoFactorConfirmedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereTwoFactorRecoveryCodes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereTwoFactorSecret($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User withoutPermission($permissions)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User withoutRole($roles, ?string $guard = null)
 */
	class User extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $user_id
 * @property string $badge_type
 * @property \Carbon\CarbonImmutable $earned_at
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @property-read \App\Models\User|null $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|UserBadge newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|UserBadge newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|UserBadge query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|UserBadge whereBadgeType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|UserBadge whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|UserBadge whereEarnedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|UserBadge whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|UserBadge whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|UserBadge whereUserId($value)
 */
	class UserBadge extends \Eloquent {}
}

