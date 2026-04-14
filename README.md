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
- éventuellement HTML brut plus tard

Sortie :
- JSON structuré
- texte nettoyé prêt pour un LLM
- score de risque et signaux détectés

## Pipeline MVP

1. Fetch de la page
2. Extraction reader-mode du contenu principal
3. Nettoyage des éléments non utiles ou dangereux
4. Détection heuristique de prompt injection
5. Scoring de risque
6. Génération d'une sortie structurée

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
```

Sortie possible :
- résumé source
- score de risque
- signaux détectés
- texte nettoyé
- JSON complet

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
