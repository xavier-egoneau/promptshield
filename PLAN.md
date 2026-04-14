# PLAN

## Vision

Construire un middleware local qui transforme du contenu web non fiable en contexte plus sûr pour les agents IA.

## Phase 1 - Corpus et protocole de test

- [x] Définir une taxonomie de prompt injections par niveaux et familles
- [x] Créer une arborescence de fixtures HTML
- [x] Ajouter des cas de base niveau 1 à 3
- [x] Définir un format `expected.json` pour les sorties attendues
- [x] Mettre en place des tests automatiques de non-régression
- [x] Vérifier que le contenu dangereux ne ressort pas dans la sortie destinée au modèle

## Phase 2 - MVP CLI

- [x] Ajouter commande CLI `promptshield fetch <url>`
- [x] Ajouter commande CLI `promptshield inspect <file>`
- [x] Ajouter commande CLI `promptshield test`
- [x] Implémenter fetch HTTP
- [x] Extraire le contenu principal avec Readability
- [x] Nettoyer scripts, styles, commentaires, éléments cachés simples
- [x] Détecter signaux heuristiques de prompt injection
- [x] Produire un score de risque simple
- [x] Retourner un JSON structuré
- [x] Ajouter un mode texte nettoyé

## Phase 3 - Qualité de détection

- [x] Enrichir les heuristiques
- [x] Ajouter une liste de signaux et une pondération configurable
- [x] Différencier contenu légitime et contenu suspect
- [x] Ajouter des cas niveau 4 et 5
- [x] Ajouter des fixtures adversariales et ambiguës

## Phase 4 - Intégration agent

- [x] Exposer une API locale
- [x] Prévoir un tool ou plugin OpenClaw
- [x] Remplacer ou précéder le fetch web brut
- [x] Ajouter traces d'audit et zones retirées

## Phase 6 - Mesurabilité et serveur production-ready (fait)

- [x] Benchmark sur corpus réel (25 URLs) — precision/recall/F1
- [x] `benchmark/clean-urls.json` — 5 catégories de vraies pages
- [x] `promptshield benchmark crawl` — crawler et sauvegarder snapshots HTML
- [x] `promptshield benchmark run` — pipeline complet + métriques
- [x] Serveur HTTP production-ready : auth Bearer, rate limiting par IP, cache LRU, logs JSON structurés
- [x] `PROMPTSHIELD_TOKEN` pour authentification optionnelle
- [x] Headers `X-Cache`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- [x] `wrapped_content` — Spotlighting (encapsulation `<external_content>`)
- [x] `PROMPTSHIELD_SYSTEM_PROMPT` — system prompt d'intégration agent
- [x] `PROMPTSHIELD_TOOL_DEFINITION` — schéma Anthropic tool_use
- [x] `prompts/system-prompt.md` — guide d'intégration lisible

## Phase 7 - Classificateur sémantique LLM (optionnel)

- [x] Type signal `semantic` ajouté (poids 45)
- [x] `src/pipeline/classify.ts` — appel OpenAI-compatible (ollama, llama.cpp, LM Studio…)
- [x] `PROMPTSHIELD_LLM_ENDPOINT` + `PROMPTSHIELD_LLM_MODEL` pour activer la passe sémantique
- [x] Désactivé par défaut — retourne `[]` sans les variables d'environnement
- [x] Timeout 10 s + fallback gracieux sur heuristiques seules (erreur réseau, JSON invalide, HTTP 5xx)
- [x] System prompt hardcodé, jamais dérivé du contenu web
- [x] Output contraint `{"injection": bool, "reason": "..."}` pour réduire la surface d'attaque
- [x] Tests vitest avec mock undici (7 cas : désactivé, injection, propre, HTTP 5xx, réseau, JSON invalide, endpoint)
- [x] Mention dans README
