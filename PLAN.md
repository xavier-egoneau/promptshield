# PLAN

## Vision

Construire un middleware local qui transforme du contenu web non fiable en contexte plus sûr pour les agents IA.

## Phase 1 - Corpus et protocole de test

- [ ] Définir une taxonomie de prompt injections par niveaux et familles
- [ ] Créer une arborescence de fixtures HTML
- [ ] Ajouter des cas de base niveau 1 à 3
- [ ] Définir un format `expected.json` pour les sorties attendues
- [ ] Mettre en place des tests automatiques de non-régression
- [ ] Vérifier que le contenu dangereux ne ressort pas dans la sortie destinée au modèle

## Phase 2 - MVP CLI

- [ ] Ajouter commande CLI `promptshield fetch <url>`
- [ ] Ajouter commande CLI `promptshield inspect <file>`
- [ ] Ajouter commande CLI `promptshield test`
- [ ] Implémenter fetch HTTP
- [ ] Extraire le contenu principal avec Readability
- [ ] Nettoyer scripts, styles, commentaires, éléments cachés simples
- [ ] Détecter signaux heuristiques de prompt injection
- [ ] Produire un score de risque simple
- [ ] Retourner un JSON structuré
- [ ] Ajouter un mode texte nettoyé

## Phase 3 - Qualité de détection

- [ ] Enrichir les heuristiques
- [ ] Ajouter une liste de signaux et une pondération configurable
- [ ] Différencier contenu légitime et contenu suspect
- [ ] Ajouter des cas niveau 4 et 5
- [ ] Ajouter des fixtures adversariales et ambiguës

## Phase 4 - Intégration agent

- [ ] Exposer une API locale
- [ ] Prévoir un tool ou plugin OpenClaw
- [ ] Remplacer ou précéder le fetch web brut
- [ ] Ajouter traces d'audit et zones retirées

## Phase 5 - Produit

- [ ] Définir packaging propre
- [ ] Prévoir config par politique
- [ ] Ajouter support markdown, email, OCR, HTML brut
- [ ] Explorer une UI légère si utile
