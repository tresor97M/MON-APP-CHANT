# Cahier des charges — Maestro Studio (MON-APP-CHANT)

> Audit réalisé le 6 juillet 2026. Document de référence pour la feuille de route.
> On avance sprint par sprint : un sprint = une PR vérifiée et fonctionnelle avant de passer au suivant.

---

## 1. Diagnostic honnête de l'existant

### Ce qui est bien
- **L'idée est forte** : un "Duolingo du chant" avec détection de pitch en temps réel (autocorrélation Web Audio), c'est un vrai différenciateur.
- **Le design est soigné** : identité visuelle cohérente, sentier d'apprentissage gamifié, mascotte Maestro, visualiseur audio.
- **Le schéma de base de données existe** : 3 migrations Supabase avec tables (leçons, modules, progression, badges, stats, profils, rôles) et du RLS déclaré.
- **La stack est saine** : Next.js 14, Supabase, Tailwind, shadcn/ui.

### Ce qui ne va pas (par ordre de gravité)

#### CRITIQUE — L'app est une coquille visuelle
1. **Supabase n'est pas configuré** : aucune variable d'environnement. Tout tourne actuellement sur un client "placeholder". **Rien ne fonctionne réellement** : pas de connexion, pas de sauvegarde, pas de progression.
2. **Les migrations ne sont pas appliquées** : le schéma SQL existe dans `supabase/migrations/` mais la base est probablement vide ou désynchronisée.
3. **Beaucoup de pages sont des maquettes** : `messages`, `communaute/forum`, `admin` (dashboard) ne font **aucun appel** à la base — les données affichées sont inventées en dur dans le code.

#### GRAVE — Sécurité
4. **`/admin` n'est protégé par aucun contrôle de rôle** : n'importe quel utilisateur connecté (ou même non connecté) peut ouvrir l'espace admin.
5. **Aucun middleware / protection de routes** : les pages "protégées" ne le sont que visuellement côté client.
6. **Requêtes non scopées par utilisateur** : la page d'accueil lit `user_stats`, `user_progress`, `attempts` sans filtre `user_id`. Sans RLS actif, chaque utilisateur verrait les données de tout le monde.
7. **Toute la logique est côté client** : zéro route API, zéro Server Component. Les scores, l'XP et les badges sont calculés dans le navigateur → trivialement trichables.

#### MOYEN — Qualité et fiabilité
8. **Données de graphiques fabriquées** : le radar "Analyse Vocale" et la courbe "Activité XP" sont des formules mathématiques appliquées à une seule valeur, pas de vraies données historiques.
9. **Quiz codés en dur** : la banque de questions vit dans `lecon/[id]/page.tsx` au lieu de la base (l'admin a pourtant une page "créer un quiz" qui ne sert à rien).
10. **Fetching dans `useEffect`** partout, sans cache, sans gestion d'erreur, sans revalidation (SWR absent).
11. **Streak et XP hebdo jamais recalculés** : `streak_days` n'est jamais remis à zéro si tu rates un jour ; `weekly_xp` n'est jamais réinitialisé le lundi.
12. **Aucun test, aucune CI** : rien ne détecte une régression avant qu'un utilisateur la voie.

---

## 2. Ce que j'aurais fait à ta place (méthode)

1. **Brancher la base AVANT de construire l'UI.** Tu as construit un magnifique décor de cinéma ; il faut maintenant construire le bâtiment derrière la façade.
2. **Sécuriser dès le premier jour** : RLS + protection de routes + rôles, avant toute fonctionnalité.
3. **Une fonctionnalité = de bout en bout** : UI + base + sécurité + vérification navigateur, plutôt que 10 pages maquettes.
4. **Git discipliné** : une branche par sprint, une PR par sprint, jamais de push direct sur `main`.

---

## 3. Feuille de route — Sprint par sprint

### Sprint 0 — Fondations (BLOQUANT, tout dépend de ça)
- [ ] Connecter l'intégration Supabase dans v0 (variables `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- [ ] Appliquer les 3 migrations + les données de seed
- [ ] Vérifier inscription / connexion / déconnexion de bout en bout dans le navigateur
- [ ] Vérifier que le RLS est actif sur TOUTES les tables
- **Livrable : on peut créer un compte et se connecter pour de vrai.**

### Sprint 1 — Sécurité
- [ ] Middleware Next.js : redirection vers `/auth` si non connecté
- [ ] Garde de rôle sur `/admin/*` (layout serveur qui vérifie `role = 'admin'` ou `'instructor'`)
- [ ] Scoper toutes les requêtes par `user_id` + politiques RLS vérifiées une par une
- [ ] Déplacer l'écriture des scores/XP dans des routes API serveur (anti-triche)
- **Livrable : un élève ne peut ni voir l'admin, ni voir les données des autres, ni tricher sur son XP.**

### Sprint 2 — Le cœur : leçons et progression réelles
- [ ] Déplacer la banque de quiz en base (table `quiz_questions`), brancher la page admin "créer un quiz"
- [ ] Enregistrer chaque tentative (`attempts`) avec vrai score de pitch
- [ ] Calcul du streak côté serveur (cron ou à la connexion) + reset hebdo de `weekly_xp`
- [ ] Graphiques du dashboard alimentés par les vraies tentatives (historique réel, plus de formules inventées)
- [ ] CRUD complet des cours/leçons dans l'admin
- **Livrable : la boucle d'apprentissage complète fonctionne avec de vraies données.**

### Sprint 3 — Moteur vocal amélioré
- [ ] Fiabiliser la détection de pitch (fenêtrage, lissage médian, seuils de confiance)
- [ ] Exercices guidés : note cible jouée → l'élève reproduit → score justesse en cents
- [ ] Enregistrement des sessions audio (Vercel Blob) pour réécoute
- [ ] Feedback détaillé par exercice (justesse, stabilité, durée tenue)
- **Livrable : l'analyse vocale devient crédible et utile pédagogiquement.**

### Sprint 4 — Gamification et social réels
- [ ] Ligue hebdomadaire réelle (classement par `weekly_xp`, promotions/relégations)
- [ ] Attribution automatique des badges (triggers ou logique serveur)
- [ ] Forum communauté branché à la base (posts, réponses, votes)
- [ ] Messages privés réels (avec Supabase Realtime)
- **Livrable : plus aucune donnée inventée dans l'app.**

### Sprint 5 — Qualité, performance, mobile
- [ ] Migration du fetching vers SWR (cache, revalidation, états d'erreur)
- [ ] États de chargement/vide/erreur cohérents sur toutes les pages
- [ ] Audit mobile complet (le pitch detector sur iOS Safari a des pièges connus)
- [ ] Accessibilité (navigation clavier, contrastes, aria)
- [ ] CI GitHub Actions : typecheck + lint + build sur chaque PR
- **Livrable : app stable, rapide, utilisable sur téléphone.**

### Sprint 6 — Idées nouvelles (différenciation)
- [ ] **Coach IA** : feedback personnalisé généré par IA après chaque session (AI SDK + Gateway)
- [ ] **Défis entre amis** : duel sur un même exercice, comparaison des scores
- [ ] **Bibliothèque de chansons** : travailler la justesse sur de vraies mélodies
- [ ] **Rappels de pratique** : notifications (email ou push PWA)
- [ ] **Mode hors-ligne PWA** : échauffements disponibles sans connexion
- **Livrable : des fonctionnalités qu'aucun concurrent gratuit n'a.**

---

## 4. Workflow GitHub (enregistrement automatique)

- Ce chat v0 est connecté à `tresor97M/MON-APP-CHANT` (branche de travail : `supabase-url-error`).
- **Chaque modification que je fais est committée et poussée automatiquement** sur cette branche à chaque version.
- À la fin de chaque sprint : je crée une **Pull Request vers `main`**, tu la relis, on vérifie ensemble dans l'aperçu, puis on merge.
- Jamais de push direct sur `main` — c'est ta protection.

---

## 5. Règle de validation d'un sprint

Un sprint est terminé seulement si :
1. Le build passe (`typecheck` + `lint` sans erreur)
2. La fonctionnalité est vérifiée dans le navigateur (je fais des captures d'écran)
3. Tu as testé toi-même dans l'aperçu
4. La PR est mergée dans `main`
