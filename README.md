# PromptShield

Middleware local de réduction de risque pour contenu externe destiné à des agents IA.

## But

PromptShield récupère du contenu externe, l'extrait proprement, détecte des signaux de prompt injection, puis produit une sortie structurée plus sûre à transmettre à un modèle.

## Positionnement

PromptShield n'est pas une protection parfaite.
C'est une couche de réduction de risque qui :
- transforme du contenu externe en données plutôt qu'en instructions
- supprime du bruit et des éléments cachés
- détecte des patterns suspects
- attribue un score de risque
- garde une trace de ce qui a été retiré

## MVP visé

Entrée :
- URL
- HTML brut
- plus tard markdown, email ou OCR

Sortie :
- JSON structuré
- texte nettoyé prêt pour un LLM
- score de risque et signaux détectés
- détails sur les éléments retirés ou marqués suspects

## Approche de validation

Le MVP doit être piloté par un corpus d'attaques et des tests, pas seulement par du code de fetch.

Le projet doit inclure :
- une taxonomie de prompt injections par niveaux et familles
- une collection de fixtures HTML représentant des cas réels ou plausibles
- des sorties attendues pour chaque cas
- des tests automatiques de non-régression

## Niveaux d'attaque envisagés

- Niveau 1 : injections grossières et explicites
- Niveau 2 : injections déguisées dans un contenu qui semble légitime
- Niveau 3 : injections cachées dans le HTML ou les métadonnées
- Niveau 4 : injections contextuelles mêlées au vrai contenu
- Niveau 5 : attaques adversariales plus subtiles ou multi-blocs

## Pipeline MVP

1. Charger une ressource ou une fixture HTML
2. Extraire le contenu principal en reader-mode
3. Nettoyer les éléments non utiles ou dangereux
4. Détecter des signaux heuristiques de prompt injection
5. Attribuer un score de risque
6. Générer une sortie structurée
7. Vérifier via tests que le contenu dangereux a été supprimé ou neutralisé avant passage au modèle

## Stack prévue

- Node.js
- TypeScript
- undici pour le fetch
- jsdom + @mozilla/readability pour l'extraction
- cheerio si besoin pour nettoyage complémentaire
- règles heuristiques maison pour la détection

## CLI envisagé

```bash
promptshield fetch https://example.com/article
promptshield inspect fixtures/html/level-1/basic-ignore-instructions.html
promptshield test
```

Sortie possible :
- résumé source
- score de risque
- signaux détectés
- texte nettoyé
- JSON complet
- résultat de test sur une fixture

## Cas d'usage

- agents web
- lecture de docs externes
- lecture de pages de support
- ingestion de contenu pour RAG
- middleware de fetch sécurisé pour OpenClaw ou autres agents

## Limites

- ne garantit pas l'absence totale de prompt injection
- ne remplace pas le cloisonnement des permissions
- doit être utilisé avec une politique outils stricte derrière
