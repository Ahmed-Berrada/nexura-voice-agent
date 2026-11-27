# Nexura Cloud — Agent vocal IA de qualification (appels sortants)

Un lead remplit le formulaire de démo → **Apps Script** vérifie le consentement et la plage légale → **Vapi** appelle en quelques secondes → l'agent « Léa » annonce qu'elle est une IA, qualifie en BANT → **webhook POST** vers `doPost` → score /100, statut **SQL / Nurturing**, écriture dans **Google Sheets**, SMS, RDV Calendar, email horaire. **Aucun outil no-code (Make, Zapier, n8n, IFTTT, Gumloop).**

![infographie](docs/infographic.svg)

## Structure
| Fichier | Rôle |
|---|---|
| `apps-script/Config.gs` | Constantes, colonnes, lecture des secrets |
| `apps-script/Setup.gs` | Crée les onglets + Dashboard KPI |
| `apps-script/Calls.gs` | Formulaire, file d'attente, appel Vapi, retries, conformité |
| `apps-script/Webhook.gs` | `doPost` : secret, dédoublonnage, écriture Calls |
| `apps-script/Scoring.gs` | Score /100 déterministe + routage |
| `apps-script/Integrations.gs` | Outils agent (RDV, opposition), SMS Twilio, email horaire |
| `apps-script/Utils.gs` | Logs, fenêtre légale, E.164, consentement |
| `agent/system-prompt.md`, `agent/vapi-assistant.json` | Prompt et config de l'assistant |
| `docs/payload-example.json`, `docs/form-fields.md` | Payload et formulaire |
| `tests/` | Tests scoring (node) et webhook (curl) |

## Installation pas à pas
1. **Google Sheet** : créer une feuille vide → *Extensions > Apps Script* → créer un fichier par `.gs` du dossier `apps-script/` (copier-coller).
2. Exécuter `setupSheet()` (autoriser les droits) : création des onglets `Leads`, `Calls`, `Logs`, `Dashboard`.
3. **Secrets** : copier `.env.example` en `.env` (ignoré par git, dépôt public), le remplir, puis `node tests/push-env.js` génère une fonction `loadEnv_()` à coller temporairement dans Apps Script, l'exécuter, puis la supprimer. Ou saisir à la main les **Script Properties** (*Paramètres du projet*) : `WEBHOOK_SECRET` (chaîne aléatoire longue), `SALES_EMAIL`, `SALES_MOBILE` (+33…), puis plus tard `VAPI_API_KEY`, `VAPI_ASSISTANT_ID`, `VAPI_PHONE_NUMBER_ID`, et optionnel `TWILIO_SID/TOKEN/FROM`.
4. **Déployer** : *Déployer > Nouveau déploiement > Application Web* — Exécuter en tant que *moi*, accès *Tout le monde*. Copier l'URL `…/exec`.
5. Tester : `./tests/test-webhook.sh "<URL>" "<SECRET>"` → une ligne SQL apparaît dans `Calls`.
6. **Vapi** (vapi.ai, 5 $ offerts) : créer un numéro (ou importer Twilio), créer l'assistant à partir de `agent/vapi-assistant.json` (remplacer `__WEBAPP_URL__` et `__SECRET__`, coller le prompt, choisir une voix ElevenLabs FR). Reporter les 3 ids dans les Script Properties.
7. **Google Form** : champs de `docs/form-fields.md`, le lier à la Sheet, ajouter le trigger *À l'envoi du formulaire → onFormSubmit*.
8. Exécuter `installTriggers()` (file d'attente 5 min, email horaire, purge consentements).

## Utilisation
Soumettre le formulaire (ou ajouter une ligne dans `Leads` avec `consent_given=TRUE`) : le téléphone sonne. Suivre les résultats dans `Calls` et `Dashboard`.

### Mode démo gratuit (sans numéro de téléphone)
Si `VAPI_PHONE_NUMBER_ID` est vide, le lead passe au statut `Ready (web call)`. Ensuite :
1. Dans `Leads`, sélectionner la ligne, puis menu **Nexura > Lancer l'appel**.
2. La page [`docs/call.html`](https://ahmed-berrada.github.io/nexura-voice-agent/call.html), hébergée sur GitHub Pages, s'ouvre avec les variables du lead. Elles passent dans le fragment `#` de l'URL, qui n'est jamais envoyé à un serveur.
3. Saisir une fois la **clé publique** Vapi et l'Assistant ID. Ils sont stockés uniquement dans le navigateur.
4. Lancer l'appel web, qui utilise le micro du navigateur. Le compte rendu arrive dans `Calls` comme pour un vrai appel.

Les règles de conformité restent appliquées : opposition, consentement et plage horaire (avec une alerte de confirmation hors plage).

## Score /100 (calculé côté code)
Autorité 30 · Budget 30 · Délai 25 · Cible 15. **≥ 70 ⇒ SQL**, sinon Nurturing. Micro-entreprise (< 5 salariés) ⇒ toujours Nurturing.

## Robustesse
Répondeur / pas de réponse → `No answer` + relance (max 3) · refus de l'IA ou opposition → statut `Opposition`, jamais rappelé · JSON invalide / payload incomplet → `try/catch` + onglet `Logs` · doublon de webhook → ignoré sur `call_id` · secret dans l'URL · hors plage légale → file d'attente jusqu'au prochain créneau · erreur API Vapi → relance 15 min.

## Conformité (démarchage téléphonique)
Lun–ven 10h–13h / 14h–20h (Europe/Paris) · consentement explicite horodaté, valable 1 an, preuve conservée 3 ans · opposition respectée immédiatement.

## Écarts avec le sujet
Le JSON du sujet n'a ni `last_name` ni score alors que le dashboard exige le nom : ajout de `contact.last_name`, `lead_id` et calcul du score dans Apps Script (non envoyé par le LLM).

## Souveraineté
Vapi (US) choisi pour sa simplicité d'API et ses webhooks natifs. Alternatives européennes à étudier : Parloa et Synthflow (Allemagne, hébergement UE). Les données sont stockées dans Google Sheets ; pour une production, privilégier un hébergement UE et un DPA signé.

## Optionnel non implémenté
Création d'un numéro par appel ; enrichissement automatique LinkedIn (le champ `Activité` du formulaire sert de source).

## Dépannage
| Symptôme | Cause probable | Solution |
|---|---|---|
| Webhook répond `unauthorized` | Secret absent/différent, ou `?secret=` oublié dans l'URL Vapi | Vérifier `WEBHOOK_SECRET` dans les Script Properties et l'URL du `serverUrl` |
| Rien n'arrive dans `Calls` | Déploiement obsolète ou accès non « Tout le monde » | *Déployer > Gérer les déploiements > Modifier > Nouvelle version* ; ouvrir l'URL `/exec` : doit afficher `alive` |
| Après modification du code, comportement inchangé | La Web App sert l'ancienne version | Redéployer une **nouvelle version** (l'URL reste la même) |
| `Onglet manquant : Leads` | `setupSheet()` non exécuté | Le lancer depuis l'éditeur |
| Erreur d'autorisation (Calendar, Mail, UrlFetch) | Scopes non accordés | Exécuter une fonction concernée à la main une fois (ex. `sendHourlyDigest`) et accepter |
| Lead bloqué en `Queued` | Hors plage légale, ou trigger absent | Normal hors 10h-13h / 14h-20h lun-ven ; sinon relancer `installTriggers()` |
| Lead en `No consent` | Case non cochée, ou consentement > 1 an | Obligatoire légalement : ne pas contourner |
| Lead en `Invalid phone` | Numéro non convertible en E.164 | Corriger le numéro puis remettre le statut à `New` |
| Vapi `401` dans `Logs` | Mauvaise `VAPI_API_KEY` (utiliser la clé **privée**) | Corriger la propriété |
| Vapi `400` à l'appel | `phoneNumberId` ou `assistantId` incorrect | Copier les ids depuis le dashboard Vapi |
| L'agent ne propose pas de créneaux | Réponse du tool-call non lue (redirection 302 des Web Apps sur POST) | Voir Logs Vapi : si la réponse est vide, ajouter un relais (ex. petit proxy qui suit la redirection) ; le webhook de fin d'appel, lui, est bien traité |
| Doublons dans `Calls` | Impossible : dédoublonnage sur `call_id` | Si `call_id` change à chaque envoi, vérifier la config Vapi |
| Pas d'email horaire | `SALES_EMAIL` vide, ou aucun appel dans l'heure | Normal sans appel ; sinon vérifier la propriété et le trigger |
| Pas de SMS | Twilio non configuré, ou numéro non vérifié (compte d'essai) | Voir `Logs` (`Twilio <code>`) |
| `Max attempts` | 3 tentatives sans réponse | Augmenter `MAX_ATTEMPTS` ou rappeler manuellement |

Toujours commencer par l'onglet **Logs** de la Sheet, puis *Exécutions* dans Apps Script, puis les *Logs* d'appel dans le dashboard Vapi.
