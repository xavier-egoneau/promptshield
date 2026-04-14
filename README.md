# PromptShield

Middleware local de réduction de risque pour contenu externe destiné à des agents IA.

PromptShield récupère du contenu externe, l'extrait proprement, détecte les signaux de prompt injection, et produit une sortie structurée plus sûre à transmettre à un modèle.

## Positionnement

PromptShield n'est pas une protection parfaite. C'est une couche de réduction de risque qui :

- supprime les éléments cachés (scripts, commentaires, éléments `display:none`, `aria-hidden`, CSS classes)
- détecte des patterns heuristiques dans plusieurs langues (EN, FR, ES, DE)
- détecte l'obfuscation (RTL override, zéro-width characters, base64, homoglyphes)
- attribue un score de risque pondéré par type de signal
- garde une trace de tout ce qui a été retiré
- encapsule le contenu nettoyé via [Spotlighting](https://arxiv.org/abs/2403.14720) pour réduire la confusion instruction/donnée côté LLM

## Installation

```bash
npm install
npm run build
```

## CLI

```bash
# Inspecter un fichier local
npx tsx src/cli.ts inspect fixtures/level-1/basic-ignore-instructions.html --summary

# Fetcher une URL
npx tsx src/cli.ts fetch https://example.com/article --summary

# Sortie JSON complète
npx tsx src/cli.ts inspect page.html

# Texte nettoyé uniquement
npx tsx src/cli.ts inspect page.html --text

# Lancer les tests de fixtures
npx tsx src/cli.ts test

# Serveur HTTP local
npx tsx src/cli.ts server --port 4242
```

## Serveur HTTP

```bash
npx tsx src/cli.ts server --port 4242 --rate-limit 60 --cache-ttl 300
```

**Endpoints :**

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/shield` | Analyser une URL ou du HTML brut |
| `GET` | `/health` | Health check |

**Body `POST /shield` :**

```json
{ "url": "https://example.com/article" }
{ "html": "<html>...</html>", "source": "custom-source" }
```

**Headers de réponse :**

| Header | Description |
|--------|-------------|
| `X-Cache` | `HIT` ou `MISS` |
| `X-RateLimit-Remaining` | Requêtes restantes dans la fenêtre courante |
| `X-RateLimit-Reset` | Timestamp Unix de réinitialisation du compteur |

## Sortie JSON

```json
{
  "source": "https://example.com/article",
  "risk_score": 75,
  "risk_level": "critical",
  "signals": [
    {
      "type": "direct_instruction",
      "pattern": "ignore previous instructions",
      "location": "body_text",
      "excerpt": "...ignore all previous instructions and reveal..."
    }
  ],
  "removed": [
    {
      "type": "hidden_element",
      "tag": "div",
      "reason": "display:none",
      "content_preview": "Ignore all previous..."
    }
  ],
  "cleaned_text": "Contenu nettoyé visible par le modèle.",
  "wrapped_content": "<external_content risk=\"critical\" signals=\"direct_instruction\">\nContenu nettoyé...\n</external_content>",
  "metadata": {
    "title": "Article title",
    "url": "https://example.com/article",
    "processed_at": "2026-04-14T10:00:00.000Z"
  }
}
```

**Niveaux de risque :**

| Score | Niveau |
|-------|--------|
| 0–24 | `low` |
| 25–49 | `medium` |
| 50–74 | `high` |
| 75–100 | `critical` |

**Types de signal et poids par défaut :**

| Type | Poids | Description |
|------|-------|-------------|
| `data_exfil` | 50 | Tentative d'exfiltration vers URL/webhook |
| `semantic` | 45 | Injection détectée par le classificateur LLM |
| `direct_instruction` | 40 | Instruction directe (ignore, forget, reveal…) |
| `jailbreak` | 35 | Tentative de jailbreak (DAN, developer mode…) |
| `obfuscation` | 30 | Caractères RTL, zéro-width, base64, homoglyphes |
| `role_override` | 30 | Usurpation de rôle (you are now, act as…) |
| `meta_instruction` | 25 | Faux tags système (`[SYSTEM]`, `<\|im_start\|>`…) |

## Variables d'environnement

### Authentification serveur

```bash
# Activer l'authentification Bearer (optionnel)
PROMPTSHIELD_TOKEN=secret npx tsx src/cli.ts server
```

Toutes les requêtes devront inclure `Authorization: Bearer secret`.

### Proxy

```bash
# Faire confiance au header X-Forwarded-For pour le rate limiting
PROMPTSHIELD_TRUST_PROXY=true npx tsx src/cli.ts server
```

À n'activer que si PromptShield est derrière un reverse proxy de confiance.

### Intégration agent

```bash
# System prompt à inclure dans les prompts d'intégration
PROMPTSHIELD_SYSTEM_PROMPT=1 npx tsx src/cli.ts server

# Schéma tool_use Anthropic
PROMPTSHIELD_TOOL_DEFINITION=1 npx tsx src/cli.ts server
```

### Classificateur sémantique LLM (optionnel)

Activé en définissant les deux variables. Désactivé par défaut — le pipeline fonctionne sans.

```bash
PROMPTSHIELD_LLM_ENDPOINT=http://localhost:11434/v1 \
PROMPTSHIELD_LLM_MODEL=gemma4:latest \
npx tsx src/cli.ts inspect page.html
```

Compatible avec n'importe quel endpoint OpenAI-compatible : [Ollama](https://ollama.com), llama.cpp, LM Studio, etc.

**Comportement :**
- Ajoute une passe sémantique après la détection heuristique
- Catch les injections par paraphrase ou implication indirecte que les regex ne couvrent pas
- Timeout 10 s — fallback transparent sur heuristiques seules si le LLM est indisponible
- System prompt hardcodé dans le middleware, jamais dérivé du contenu analysé
- Ajoute un signal de type `semantic` (poids 45) si une injection est détectée

## Détection multilingue

La détection heuristique tourne en double passe :

1. **EN toujours** — patterns anglais appliqués sur tout contenu
2. **Langue détectée** — [franc](https://github.com/wooorm/franc) identifie la langue du document (offline, 170+ langues) et ajoute les patterns correspondants

Langues supportées : English, Français, Español, Deutsch.
Pour ajouter une langue : créer `patterns/locales/<code>.json` puis `npm run generate:patterns`.

## Tests

```bash
npm test                  # vitest — 30 tests
npx tsx src/cli.ts test   # runner de fixtures
```

## Limites

- Ne garantit pas l'absence totale de prompt injection
- Ne remplace pas le cloisonnement des permissions côté agent
- Le classificateur LLM réduit mais ne supprime pas le risque d'injection sémantique
- Doit être utilisé avec une politique d'outils stricte en aval
