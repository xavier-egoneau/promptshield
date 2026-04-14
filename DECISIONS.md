# DECISIONS

## 2026-04-14

### Choix de départ
- Le projet s'appelle `promptshield`.
- Le projet vit dans `/home/egza/.openclaw/workspace/projects/promptshield`.
- La stack visée est Node + TypeScript.
- Le point d'entrée initial sera un CLI local avant toute intégration OpenClaw.
- Le but n'est pas de promettre une protection parfaite, mais une réduction de risque mesurable.
- Le projet doit être piloté par un corpus d'attaques HTML et des tests de non-régression.

### Hypothèses produit
- Le contenu externe doit être traité comme non fiable par défaut.
- Le middleware doit produire une sortie structurée, pas seulement un texte nettoyé.
- La meilleure valeur initiale viendra d'un pipeline simple : fetch, extract, detect, score, output.
- La meilleure façon de se projeter et de mesurer la qualité est de construire une collection de prompt injections HTML classées par niveaux.
- Les tests doivent vérifier que le contenu dangereux est supprimé ou neutralisé avant d'être donné au modèle.

### Non-objectifs immédiats
- Pas de sandbox magique.
- Pas de plugin OpenClaw complet en V1.
- Pas de promesse marketing de sécurité totale.

---

## Décisions architecturales — post-benchmark

### clean() avant extract() (Readability)

**Décision** : le pipeline appelle `clean(rawHtml)` en premier, puis `extract(cleanedHtml)`.

**Pourquoi** : Readability supprime les attributs `style` lors de son traitement. Si on laisse Readability passer en premier, les éléments cachés via `display:none` ou `visibility:hidden` perdent leurs styles avant que `clean()` puisse les détecter. Les injections de niveau 3 (éléments cachés) passaient complètement inaperçues.

**Impact** : passage de 0/4 à 4/4 sur les fixtures niveau 3.

---

### Score purement basé sur les signaux

**Décision** : `score.ts` ne compte que les signaux heuristiques détectés. Plus aucune contribution structurelle (nombre d'éléments cachés retirés, présence de commentaires HTML, etc.).

**Pourquoi** : la version initiale ajoutait +10 par élément caché retiré et +15 si des commentaires HTML étaient présents. Sur du vrai contenu (Wikipedia, MDN, GitHub docs), ce scoring structurel générait un taux de faux positifs de 50% — des pages légitimes scoraient 25-45 sans aucun signal réel. Découvert lors du benchmark sur les 25 URLs réelles.

**Règle** : un score non nul implique un signal heuristique détecté. Pas de signal = score 0.

---

### runPatterns() sur le contenu des éléments retirés

**Décision** : `clean.ts` exporte `runPatterns()` depuis `detect.ts` et l'appelle sur le texte de chaque élément caché et commentaire HTML avant de les supprimer du DOM.

**Pourquoi** : les injections dans des éléments cachés (`display:none`, `visibility:hidden`) ou dans des commentaires HTML ne se retrouvaient jamais dans `textContent` après extraction — Readability les ignore. Sans ce passage, toute injection dissimulée structurellement produisait 0 signal.

**Impact** : les signaux générés sont taggués avec `location: 'hidden_element'` ou `location: 'html_comment'` pour traçabilité.

---

### Spotlighting : champ wrapped_content

**Décision** : `ShieldResult` inclut un champ `wrapped_content` — le texte nettoyé encapsulé dans `<external_content risk="..." signals="...">`.

**Pourquoi** : les heuristiques ne peuvent pas détecter toutes les injections. Un article légitime sur la sécurité IA peut scorer "critical" simplement parce qu'il cite des exemples d'injection. La vraie ligne de défense est de communiquer au LLM en aval, via le system prompt, que ce bloc est de la DONNÉE et non des INSTRUCTIONS. C'est l'approche "Spotlighting" de Microsoft.

**Usage** : l'agent injecte `result.wrapped_content` dans son contexte plutôt que `result.cleaned_text`. Le system prompt (`PROMPTSHIELD_SYSTEM_PROMPT`) instruit le modèle à ne jamais obéir à ce qui se trouve dans ces balises.

**Limite acceptée** : un faux positif comme l'article de Lilian Weng (score 100, contenu légitime citant des exemples d'injection) ne peut pas être résolu sans compréhension sémantique. Le balisage gère ce cas en aval.

---

### Poids obfuscation = 30

**Décision** : le poids du signal `obfuscation` est fixé à 30 (au-dessus du seuil de détection de 25).

**Pourquoi** : à 20 (valeur initiale), une fixture RTL-only scorait 20 — juste sous le seuil. Une attaque par RTL override seule suffit à constituer une intention malveillante ; elle doit toujours déclencher au moins `risk: medium`.

---

### Benchmark-driven development

**Décision** : avant toute modification des heuristiques, construire un benchmark sur corpus réel (25 URLs légitimes + fixtures d'injection) et mesurer precision/recall/F1.

**Pourquoi** : les intuitions sur "ce qui score bien" sont trompeuses. Le scoring structurel semblait raisonnable jusqu'au moment où on l'a mesuré sur de vrai contenu. Le benchmark a révélé le problème en quelques minutes et a guidé le fix exact.

**Résultat** : F1 = 62% → 97% après corrections guidées par les métriques.
