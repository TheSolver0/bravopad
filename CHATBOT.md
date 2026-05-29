# Assistant documentaire OnePAD

Chatbot interne basé sur les manuels de procédure de l'entreprise.  
Répond aux questions du personnel en citant les pages sources, sans hallucination.

---

## Architecture

```
Question utilisateur
       │
       ▼
┌──────────────────┐
│  ManualRouter    │  ← lit manifest.json, score chaque manuel par mots-clés
│  (routing)       │    → choisit le manuel le plus pertinent
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  ManualRouter    │  ← cherche dans les chunks du manuel choisi
│  (retrieval)     │    → retourne les 3 passages les plus proches (TF-IDF simple)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  ChatbotService  │  ← assemble : extraits + historique (6 derniers msgs) + question
│  (prompt build)  │    → envoie à l'API LLM
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  GroqProvider    │  ← modèle llama-3.1-8b-instant
│  (LLM)          │    → réponse en français avec citation des pages
└────────┬─────────┘
         │
         ▼
  Réponse + badge source (titre manuel + pages)
```

### Pourquoi ce design en deux étapes (router → retriever) ?

La plupart des chatbots RAG naïfs envoient **tout le document** au LLM à chaque requête.  
Ici on fait d'abord un **routing sans LLM** (lecture du manifest + scoring de mots-clés),  
puis on ne charge que les **3 chunks pertinents** du bon manuel.

Avantages :
- Pas de coût LLM pour le routing
- Fenêtre de contexte maîtrisée (3 pages max au lieu du document entier)
- Scalable : 50 manuels ne coûtent pas plus qu'1

---

## Structure des fichiers

```
app/
├── Console/Commands/
│   └── IndexManualsCommand.php       # php artisan chatbot:index
├── Http/Controllers/
│   └── ChatbotController.php         # routes ask / history / clear
├── Models/
│   ├── ManualChunk.php               # chunk indexé (page d'un manuel)
│   └── ChatbotMessage.php            # historique par utilisateur
└── Services/Chatbot/
    ├── LLMProviderInterface.php      # contrat d'abstraction LLM
    ├── GroqProvider.php              # implémentation Groq (actuelle)
    ├── ManualIndexer.php             # PDF → OCR → chunks SQLite
    ├── ManualRouter.php              # routing + retrieval
    └── ChatbotService.php            # orchestration complète

public/assets/manuels/
├── manifest.json                     # métadonnées de chaque manuel
└── *.pdf                             # les manuels PDF

resources/js/components/
└── ChatbotWidget.tsx                 # widget flottant React (bas-gauche)

database/migrations/
├── ..._create_manual_chunks_table.php
└── ..._create_chatbot_messages_table.php
```

---

## Installation initiale

### 1. Dépendances PHP

```bash
composer require smalot/pdfparser --ignore-platform-reqs
```

### 2. Tesseract OCR (extraction texte des PDFs scannés)

Télécharger l'installeur Windows :  
**https://github.com/UB-Mannheim/tesseract/wiki**

- Cocher **"Additional language data" → French (fra)** pendant l'installation
- Chemin par défaut : `C:\Program Files\Tesseract-OCR\tesseract.exe`

### 3. Ghostscript (conversion PDF → images pour Tesseract)

Télécharger depuis :  
**https://ghostscript.com/releases/gsdnld.html** → `gsXX-w64.exe`

- Chemin par défaut : `C:\Program Files\gs\gsX.XX.X\bin\gswin64c.exe`

### 4. Variables d'environnement

Mettre à jour `.env` avec les chemins réels après installation :

```env
GHOSTSCRIPT_PATH="C:/Program Files/gs/gs10.05.0/bin/gswin64c.exe"
TESSERACT_PATH="C:/Program Files/Tesseract-OCR/tesseract.exe"
TESSERACT_LANG=fra
```

### 5. Migrations

```bash
php artisan migrate
```

### 6. Indexation des manuels

```bash
php artisan chatbot:index
```

---

## Ajouter un nouveau manuel

### Étape 1 — Copier le PDF

```
public/assets/manuels/MON-MANUEL.pdf
```

### Étape 2 — Déclarer dans le manifest

Ouvrir `public/assets/manuels/manifest.json` et ajouter une entrée :

```json
{
  "PD-ABP-01": { ... },

  "MA-CLE": {
    "title": "Titre lisible du manuel",
    "file":  "MON-MANUEL.pdf",
    "keywords": [
      "mot1", "mot2", "procédure", "..."
    ],
    "categories": ["rh", "finance", "...]
  }
}
```

**Règle pour les keywords** : penser aux mots qu'un employé utiliserait dans sa question.  
Ex. pour un manuel RH : `["congé", "arrêt maladie", "télétravail", "contrat", "prime"]`

### Étape 3 — Indexer

```bash
# Indexer uniquement ce nouveau manuel
php artisan chatbot:index --manual=MA-CLE

# Ou tout ré-indexer
php artisan chatbot:index
```

---

## Changer de modèle LLM (Groq → Ollama)

Le code utilise une interface `LLMProviderInterface`. Pour switcher :

**1.** Créer `app/Services/Chatbot/OllamaProvider.php` :

```php
<?php
namespace App\Services\Chatbot;

use Illuminate\Support\Facades\Http;

class OllamaProvider implements LLMProviderInterface
{
    public function complete(array $messages, int $maxTokens = 1024): string
    {
        $response = Http::post('http://localhost:11434/api/chat', [
            'model'    => 'mistral',
            'messages' => $messages,
            'stream'   => false,
        ]);

        return trim($response->json('message.content') ?? '');
    }
}
```

**2.** Changer le binding dans `app/Providers/AppServiceProvider.php` :

```php
// Avant
$this->app->bind(LLMProviderInterface::class, GroqProvider::class);

// Après
$this->app->bind(LLMProviderInterface::class, OllamaProvider::class);
```

C'est tout. Aucun autre fichier à toucher.

---

## Routes disponibles

| Méthode | URL | Rôle |
|---|---|---|
| `POST` | `/chatbot/ask` | Envoyer une question |
| `GET` | `/chatbot/history` | Charger l'historique de l'utilisateur connecté |
| `DELETE` | `/chatbot/clear` | Effacer l'historique |

Payload de `/chatbot/ask` :
```json
{
  "message":  "Comment passer un bon de commande ?",
  "category": "PD-ABP-01"   // optionnel — forcer un manuel spécifique
}
```

Réponse :
```json
{
  "answer":       "Pour passer un bon de commande...",
  "manual_key":   "PD-ABP-01",
  "manual_title": "Achat de biens, services et travaux par BC < 5M",
  "pages":        [3, 4]
}
```

---

## Tables de base de données

### `manual_chunks`
Contenu indexé des manuels, une ligne par page.

| Colonne | Type | Description |
|---|---|---|
| `manual_key` | string | Clé du manuel (`PD-ABP-01`) |
| `file_name` | string | Nom du fichier PDF |
| `page_number` | smallint | Numéro de page |
| `content` | text | Texte extrait de la page |

### `chatbot_messages`
Historique des conversations par utilisateur.

| Colonne | Type | Description |
|---|---|---|
| `user_id` | FK | Utilisateur connecté |
| `role` | string | `user` ou `assistant` |
| `content` | text | Contenu du message |
| `manual_key` | string\|null | Manuel utilisé pour cette réponse |
