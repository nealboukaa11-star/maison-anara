# MAISON ANARA — Briefing du projet
*(Fichier de contexte : à faire lire à Claude au début de toute nouvelle conversation sur ce projet.)*

## La marque
- **Nom : Maison Anara** (de l'arabe أنار, "illuminer" — "celle qui illumine"). Nom verrouillé après vérification (l'ancien choix "Akari" a été abandonné : marque déposée du designer Noguchi dans les luminaires).
- **Produit** : lampes design faites main à Tétouan (Maroc) par un artisan partenaire qui fabrique à la demande, sur les designs du propriétaire. Coût de production ≈ 400 MAD/pièce.
- **Positionnement** : décoration premium marocaine. Prix de vente 699–1 099 MAD, sur mesure dès 1 200 MAD.
- **Modèle de vente** : paiement à la livraison (COD) partout au Maroc + **acompte de 200 MAD** (virement / CashPlus / Wafacash) car fabrication à la commande — l'acompte filtre les refus de colis. WhatsApp = vrai canal de commande. Cible B2B importante : architectes d'intérieur, riads, cafés, hôtels.
- **Instagram prévu** : @maisonanara.ma (à créer). **Numéro WhatsApp : PLACEHOLDER `212600000000` dans le code — à remplacer.**

## Contenu actuel du dossier
- `index.html` — page d'accueil complète (autonome, images intégrées en base64) : bandeau COD FR/AR, hero, bandeau réassurance, collection (Selma 849 MAD / paire 1 499 ; Rita 699 MAD ; carte Sur Mesure), section histoire, section Professionnels (fond sombre), footer.
- `produit-selma.html` — fiche produit : galerie, sélecteur de teintes (Rouge cerise / Ivoire / Vert sauge / Bleu nuit) injecté dans le message WhatsApp pré-rempli, specs, note acompte+COD, bouton "Commander sur WhatsApp", FAQ (livraison, casse, acompte, sur mesure).
- `images/` — photos produits en JPEG propres (pour les futures pages ; les HTML actuels ont leurs images intégrées).

## Design (validé, ne pas changer sans demande)
- Fond **blanc pur** (#FFFFFF), sections secondaires #F7F7F5, texte charbon neutre #26221E, lignes #E8E6E1.
- Accent **or/ambre** : #A87724 (texte/détails) et #E0A43A. Rouge produit #A6242A utilisé avec parcimonie.
- Typographies Google Fonts : **Fraunces** (titres serif), **Jost** (texte), **Noto Naskh Arabic** (mentions arabes : الدفع عند الاستلام / صنع يدوي في المغرب).
- Français d'abord, touches d'arabe pour la confiance. Mobile-first.
- NOTE : l'interrupteur "allumer la lampe" a été retiré à la demande du propriétaire — ne pas le réintroduire.

## Feuille de route (méthode : une étape à la fois, valider avant de passer à la suivante)
- ✅ Étape 1 — Marque : Maison Anara, verrouillée.
- ✅ Étape 2 — Storefront v1 (ce dossier). En attente de validation finale du design après mise en ligne provisoire.
- ⏭️ **Étape en cours — Mise en ligne provisoire** : GitHub + Netlify (déploiement auto à chaque modification) pour que le propriétaire voie les updates en temps réel. Adresse provisoire type maison-anara.netlify.app. Le domaine (maisonanara.ma probable) sera acheté à l'étape 6.
- Étape 3 — **Checkout COD** : formulaire de commande (nom, téléphone, ville, produit, teinte, quantité) → notification **email automatique** au propriétaire (Web3Forms ou Formspree, gratuit) + enregistrement Google Sheet → écran de confirmation avec bouton WhatsApp pré-rempli pour lancer la conversation de confirmation. (Option bonus : ping WhatsApp via CallMeBot.)
- Étape 4 — **Backend Supabase** (gratuit) : tables produits / commandes / événements analytics ; le storefront lit les produits depuis la base.
- Étape 5 — **Panneau admin** sur /admin (login email+mot de passe du propriétaire uniquement) : gérer les produits (ajout/édition/photos via Supabase Storage), tableau des commandes avec statuts (Nouveau → Confirmé → Acompte reçu → Expédié → Livré → Retourné), dashboard analytics (visites, vues produit, ajouts panier, checkouts, commandes — funnel de conversion).
- Étape 6 — Domaine + mise en production + test de commande de bout en bout.
- Étape 7 (optionnel) — Kit de lancement : Instagram, catalogue PDF pro, script d'appel de confirmation.

## Règles de travail avec le propriétaire
- Avancer **une étape / une décision à la fois**, attendre sa validation.
- Ton direct et honnête, signaler les risques (fragilité des colis, taux de retour COD, etc.).
- Toujours donner des instructions clic-par-clic pour les comptes externes (GitHub, Netlify, Supabase…) — il ne code pas.
