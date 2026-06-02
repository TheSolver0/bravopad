<?php

use App\Events\BravoSent;
use App\Models\Bravo;
use App\Models\BravoValue;
use App\Models\HrSurvey;
use App\Models\HrSurveyResponse;
use App\Models\User;
use Illuminate\Support\Facades\Event;

function makeAutoBravoSurvey(array $attributes = []): HrSurvey
{
    return HrSurvey::query()->create(array_merge([
        'title' => 'Sondage test',
        'description' => 'Merci de participer.',
        'question' => 'Sondage test',
        'options' => [],
        'questions' => [
            [
                'id' => 'q1',
                'label' => 'Votre avis ?',
                'type' => 'text',
                'options' => [],
                'required' => true,
            ],
        ],
        'is_active' => true,
        'starts_at' => now(),
        'ends_at' => null,
        'auto_bravo_points' => 25,
    ], $attributes));
}

function makeSurveyAutomationContext(): array
{
    $bot = User::factory()->create([
        'name' => 'Automatisations PAD',
        'email' => 'automations@bravo.internal',
        'is_automation' => true,
        'points_total' => 0,
    ]);

    $participant = User::factory()->create([
        'is_automation' => false,
        'points_total' => 10,
    ]);

    $value = BravoValue::query()->create([
        'name' => "Esprit d'équipe",
        'description' => 'Participation collective.',
        'multiplier' => 1,
        'is_active' => true,
    ]);

    return [$bot, $participant, $value];
}

it('attribue un Bravo automatique a un participant identifie', function () {
    Event::fake([BravoSent::class]);
    [$bot, $participant, $value] = makeSurveyAutomationContext();
    $survey = makeAutoBravoSurvey(['auto_bravo_points' => 30]);

    $this->actingAs($participant)
        ->post(route('surveys.respond', $survey->token), [
            'answers' => ['q1' => 'Tres bien'],
        ])
        ->assertRedirect();

    $bravo = Bravo::query()->first();

    expect(HrSurveyResponse::query()->count())->toBe(1)
        ->and($bravo)->not->toBeNull()
        ->and($bravo->sender_id)->toBe($bot->id)
        ->and($bravo->receiver_id)->toBe($participant->id)
        ->and($bravo->value_id)->toBe($value->id)
        ->and($bravo->points)->toBe(30)
        ->and($participant->fresh()->points_total)->toBe(40);

    Event::assertDispatched(BravoSent::class);
});

it('n attribue pas de Bravo automatique aux reponses anonymes', function () {
    makeSurveyAutomationContext();
    $survey = makeAutoBravoSurvey(['auto_bravo_points' => 30]);

    $this->post(route('surveys.respond', $survey->token), [
        'answers' => ['q1' => 'Anonyme'],
    ])->assertRedirect();

    expect(HrSurveyResponse::query()->count())->toBe(1)
        ->and(Bravo::query()->count())->toBe(0);
});

it('attribue le Bravo une seule fois pour un sondage du widget engagement', function () {
    Event::fake([BravoSent::class]);
    makeSurveyAutomationContext();
    $participant = User::query()->where('is_automation', false)->firstOrFail();
    $survey = makeAutoBravoSurvey([
        'questions' => null,
        'options' => [
            ['key' => 'yes', 'label' => 'Oui'],
            ['key' => 'no', 'label' => 'Non'],
        ],
        'auto_bravo_points' => 15,
    ]);

    $this->actingAs($participant)
        ->post(route('engagement.surveys.respond', $survey), ['option_key' => 'yes'])
        ->assertRedirect();

    $this->actingAs($participant)
        ->post(route('engagement.surveys.respond', $survey), ['option_key' => 'no'])
        ->assertRedirect();

    expect(Bravo::query()->count())->toBe(1)
        ->and(HrSurveyResponse::query()->count())->toBe(1)
        ->and($participant->fresh()->points_total)->toBe(25);
});
