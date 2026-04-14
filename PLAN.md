# PLAN

## Vision

Construire un middleware local qui transforme du contenu web non fiable en contexte plus sûr pour les agents IA.

## Phase 1 - MVP CLI

- [ ] Initialiser projet Node + TypeScript
- [ ] Ajouter commande CLI `promptshield fetch <url>`
- [ ] Implémenter fetch HTTP
- [ ] Extraire le contenu principal avec Readability
- [ ] Nettoyer scripts, styles, commentaires, éléments cachés simples
- [ ] Détecter signaux heuristiques de prompt injection
- [ ] Produire un score de risque simple
- [ ] Retourner un JSON structuré
- [ ] Ajouter un mode texte nettoyé

## Phase 2 - Qualité de détection

- [ ] Enrichir les heuristiques
- [ ] Ajouter une liste de signaux et une pondération configurable
- [ ] Différencier contenu légitime et contenu suspect
- [ ] Ajouter des jeux d'exemples de pages piégées

## Phase 3 - Intégration agent

- [ ] Exposer une API locale
- [ ] Prévoir un tool ou plugin OpenClaw
- [ ] Remplacer ou précéder le fetch web brut
- [ ] Ajouter traces d'audit et zones retirées

## Phase 4 - Produit

- [ ] Définir packaging propre
- [ ] Prévoir config par politique
- [ ] Ajouter support markdown, email, OCR, HTML brut
- [ ] Explorer une UI légère si utile
