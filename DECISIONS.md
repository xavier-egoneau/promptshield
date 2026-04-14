# DECISIONS

## 2026-04-14

### Choix de départ
- Le projet s'appelle `promptshield`.
- Le projet vit dans `/home/egza/.openclaw/workspace/projects/promptshield`.
- La stack visée est Node + TypeScript.
- Le point d'entrée initial sera un CLI local avant toute intégration OpenClaw.
- Le but n'est pas de promettre une protection parfaite, mais une réduction de risque mesurable.

### Hypothèses produit
- Le contenu externe doit être traité comme non fiable par défaut.
- Le middleware doit produire une sortie structurée, pas seulement un texte nettoyé.
- La meilleure valeur initiale viendra d'un pipeline simple : fetch, extract, detect, score, output.

### Non-objectifs immédiats
- Pas de sandbox magique.
- Pas de plugin OpenClaw complet en V1.
- Pas de promesse marketing de sécurité totale.
