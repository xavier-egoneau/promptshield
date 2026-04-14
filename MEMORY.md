# MEMORY.md

## PromptShield

- Projet de middleware local anti prompt injection orienté réduction de risque.
- Vise surtout le contenu web, avec extension possible vers email, markdown, OCR et HTML brut.
- Doit servir d'étape de sanitation avant qu'un agent lise du contenu externe.
- Positionnement assumé : couche défensive utile, pas protection parfaite.
- Xavier veut quelque chose de proche d'un antivirus procédural pour injections de prompt, avant de redonner le contenu à l'IA.
- La première version doit être un CLI local simple.
