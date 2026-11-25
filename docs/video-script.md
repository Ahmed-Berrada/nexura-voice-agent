# Scripts de tournage des vidéos

Conseils généraux : enregistrer en 1080p (OBS ou Loom), zoom navigateur à 125 %, micro correct, parler lentement. Masquer les secrets à l'écran (flouter ou utiliser de fausses valeurs puis les régénérer). Chaque étape = un écran montré + une phrase dite. Durée visée : vidéo 1 ≈ 12-15 min, vidéo 2 ≈ 6-8 min.

---

## VIDÉO 1 — Installation (pas à pas)

**0:00 Intro (30 s)** — Montrer l'infographie `docs/infographic.svg`. Dire : « Cet outil appelle automatiquement chaque lead qui demande une démo Nexura Cloud, le qualifie, et écrit le résultat dans Google Sheets. Sans Make ni Zapier : uniquement Apps Script et Vapi. » Lister les prérequis : compte Google, compte Vapi, (option) Twilio, Node.js.

**1. Récupérer le code (1 min)** — Ouvrir https://github.com/Ahmed-Berrada/nexura-voice-agent, montrer l'arborescence, cloner ou télécharger le ZIP.

**2. Créer la Google Sheet (1 min)** — sheets.new, nommer « Nexura – Tour de contrôle ». *Extensions > Apps Script*.

**3. Coller le code (2 min)** — Créer un fichier par `.gs` (Config, Setup, Utils, Scoring, Webhook, Calls, Integrations) en copiant le contenu. Enregistrer. Expliquer en une phrase le rôle de chacun.

**4. Initialiser les onglets (1 min)** — Sélectionner `setupSheet`, Exécuter, autoriser (« Paramètres avancés > Accéder »). Montrer les onglets Leads, Calls, Logs, Dashboard et les colonnes du sujet (call_id, contact, qualification, métadonnées).

**5. Secrets (2 min)** — Copier `.env.example` en `.env`, expliquer pourquoi (dépôt public). Générer un `WEBHOOK_SECRET` long (`node -e "console.log(require('crypto').randomUUID())"`). `node tests/push-env.js`, coller la fonction, l'exécuter, la supprimer. Vérifier dans *Paramètres du projet > Propriétés du script*.

**6. Déployer le webhook (1 min 30)** — *Déployer > Nouveau déploiement > Application Web* ; exécuter en tant que moi, accès Tout le monde. Copier l'URL `/exec`. Ouvrir l'URL dans le navigateur : `{"ok":true}`.

**7. Tester le webhook (1 min 30)** — Terminal : `./tests/test-webhook.sh "<URL>" "<SECRET>"`. Montrer les 5 résultats (ligne créée, doublon, unauthorized, bad_json, payload incomplet) puis la ligne SQL dans `Calls` et le Dashboard qui bouge.

**8. Vapi (3 min)** — vapi.ai : créer le compte (5 $ offerts), clé API privée. *Phone Numbers* : créer/importer un numéro. *Assistants* : créer à partir de `agent/vapi-assistant.json` : coller le prompt `agent/system-prompt.md`, voix ElevenLabs française, transcripteur Deepgram `fr`, Server URL = URL Web App + `?secret=...`, activer end-of-call-report et tool-calls, Structured Data. Récupérer assistantId et phoneNumberId, les ajouter au `.env` et recharger les propriétés.

**9. Google Form (1 min 30)** — Créer le formulaire avec les champs exacts de `docs/form-fields.md`, le lier à la Sheet. Dans Apps Script : *Déclencheurs > Ajouter > onFormSubmit > À l'envoi du formulaire*.

**10. Triggers et options (1 min)** — Exécuter `installTriggers()`. Mentionner SMS Twilio (optionnel), agenda, `SALES_EMAIL` et `SALES_MOBILE` (transfert).

**Conclusion (20 s)** — Rappeler l'ordre : Sheet → script → secrets → déploiement → Vapi → formulaire → triggers.

---

## VIDÉO 2 — Utilisation et démonstration

**0:00 Intro (30 s)** — Cas d'usage : délai de rappel 32 h → appel en secondes, SDR protégés des leads hors cible.

**1. Le formulaire (30 s)** — Remplir avec ton propre numéro, cocher le consentement.

**2. Appel en direct (2-3 min)** — Filmer l'écran partagé avec le téléphone : la ligne apparaît dans `Leads` (statut Calling), le téléphone sonne. Décrocher : montrer l'annonce « Je suis une intelligence artificielle ». Dérouler une conversation SQL : décideur, < 1 mois, budget confirmé. Accepter un RDV, vérifier l'événement dans Google Calendar.

**3. Résultat dans la Sheet (1 min)** — Montrer la ligne dans `Calls` : call_id, résumé du besoin, autorité, délai, budget, statut SQL, score, durée, résumé, transparence IA. Montrer le Dashboard. Recevoir le SMS.

**4. Cas limites (2 min)** — Montrer rapidement :
- appel avec lead non-décideur sans budget → Nurturing ;
- micro-entreprise (effectif 2) → Nurturing automatique ;
- « Je ne veux plus être appelé » → statut Opposition, jamais rappelé ;
- refus de parler à une IA ;
- soumission un samedi ou à 21 h → statut Queued, appel au prochain créneau légal ;
- doublon de webhook (relancer curl) → ignoré ; onglet Logs.

**5. Email horaire et transfert (1 min)** — Lancer `sendHourlyDigest` à la main, montrer l'email. Option : demander un humain pendant l'appel, le mobile sonne.

**6. Conformité et conclusion (30 s)** — Plage horaire, consentement 1 an / preuve 3 ans, opposition immédiate. Rappeler le lien GitHub et le README.

---

## Checklist avant publication
- [ ] Aucun secret visible (régénérer les clés après tournage)
- [ ] Sous-titres ou texte à l'écran pour chaque paramètre
- [ ] Liens GitHub, Sheet (lecture seule) et infographie en description
- [ ] Vidéo 1 et vidéo 2 + infographie 16:9 + code rendus ensemble
