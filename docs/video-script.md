# Scripts de tournage des vidéos

**Contrainte : 0 €.** Pas de numéro de téléphone ni de SMS payant. La démo se fait en **appel web Vapi** (micro du navigateur). Le chemin « vrai appel sortant » (`placeCall_` → `POST api.vapi.ai/call`) est codé et montré à l'écran, mais il n'est pas exécuté.

Conseils généraux :
- Enregistrer en 1080p (OBS, Loom ou Xbox Game Bar `Win+Alt+R`), zoom navigateur à 125 %, parler lentement.
- **Ne montrer aucun secret à l'écran** : WEBHOOK_SECRET, clé privée Vapi, URL avec `?secret=`. Flouter au montage, ou régénérer le secret après le tournage.
- Durées visées : vidéo 1 ≈ 10-12 min, vidéo 2 ≈ 6-8 min.
- **Crédits Vapi** : environ 4,95 $, soit 30 à 40 minutes d'appel au total. Écrire les répliques avant de filmer, puis faire une ou deux prises par scène, pas plus.

## Préparation (avant d'appuyer sur REC)
- [ ] Micro OK : sur la page d'appel, la barre « Micro » doit bouger quand on parle.
- [ ] Onglets `Calls` et `Leads` vidés (garder les en-têtes). Logs vidés. Menu **Nexura > Rafraîchir le dashboard**.
- [ ] Assistant Vapi : premier message et prompt avec les variables `{{first_name}}`, `{{company_name}}` et `{{company_activity}}` (voir l'annexe).
- [ ] Page d'appel déjà ouverte une fois, avec la **clé publique** Vapi et l'Assistant ID saisis : ils sont mémorisés dans le navigateur.
- [ ] Formulaire Google prêt et relié à la Sheet. Déclencheur `onFormSubmit` installé.
- [ ] Filmer **en semaine entre 10h-13h ou 14h-20h**, sinon l'outil affiche (à raison) l'alerte « hors plage légale ».

---

## VIDÉO 1 — Installation (pas à pas)

**0:00 Intro (30 s)** — Montrer l'infographie. Dire : « Chaque demande de démo Nexura Cloud est rappelée par une IA vocale qui qualifie le lead et écrit le résultat dans Google Sheets. Sans Make ni Zapier : du code Apps Script et l'API Vapi. » Prérequis : un compte Google et un compte Vapi (crédits offerts). Node.js est optionnel.

**1. Récupérer le code (45 s)** — Ouvrir https://github.com/Ahmed-Berrada/nexura-voice-agent. Présenter l'arborescence : `apps-script/` (backend), `agent/` (prompt), `docs/` (page d'appel, formulaire), `tests/`.

**2. Google Sheet + Apps Script (2 min)** — `sheets.new`, nommer « Nexura – Tour de contrôle », puis *Extensions > Apps Script*. Coller les fichiers `.gs` (Config, Utils, Scoring, Setup, Webhook, Calls, Integrations, Launcher) et donner le rôle de chacun en une phrase. Enregistrer.

**3. Initialiser (1 min)** — Exécuter `setupSheet` et autoriser le script (*Paramètres avancés > Accéder*). Montrer les onglets Leads, Calls, Logs et Dashboard, et dans `Calls` les colonnes exigées : call_id, contact, qualification, métadonnées.

**4. Secrets (1 min 30)** — Expliquer : « Le dépôt est public, donc aucun secret dans le code. Ils sont dans `.env` (non versionné) et dans les Propriétés du script. » Montrer `.env.example`. *Paramètres du projet > Propriétés du script* : `WEBHOOK_SECRET`, `SALES_EMAIL`, `VAPI_ASSISTANT_ID` (**valeurs floutées**).

**5. Déployer le webhook (1 min)** — *Déployer > Nouveau déploiement > Application Web*, exécuter en tant que moi, accès « Tout le monde ». Ouvrir l'URL `/exec` : la page affiche `{"ok":true,...}`.

**6. Tester le webhook (1 min 30)** — Lancer `./tests/test-webhook.sh "<URL>" "<SECRET>"` (terminal hors champ pour le secret, ou flouté). Montrer les 5 réponses : SQL, doublon ignoré, unauthorized, bad_json, payload incomplet. Montrer ensuite la ligne dans `Calls` et le Dashboard. **Supprimer ces lignes de test.**

**7. Vapi (3 min)** — Sur dashboard.vapi.ai, *Assistants > Create* :
- **Model** : coller `agent/system-prompt.md`. Premier message : il annonce l'IA et contient `{{first_name}}`.
- **Voice** : voix française. **Transcriber** : français.
- **Advanced > Server URL** : URL Web App + `?secret=…` (flouté). **Server Messages** : `end-of-call-report` et `tool-calls`.
- **Structured Outputs** : créer « qualification » (first_name, last_name, company_name, need_summary, authority_level, timeline, budget_confirmed, ai_transparency_accepted, opt_out) et l'attacher à l'assistant.
- Copier l'Assistant ID dans les Propriétés du script.
- Dire : « En production, on ajoute un numéro (`VAPI_PHONE_NUMBER_ID`) et l'appel part tout seul vers le mobile du lead. Sans numéro, l'outil passe en mode démo : appel web lancé depuis la Sheet. »

**8. Page d'appel (45 s)** — Recharger la Sheet : le menu **Nexura** apparaît. Ouvrir la page d'appel et saisir la **clé PUBLIQUE** Vapi et l'Assistant ID, stockés uniquement dans le navigateur.

**9. Google Form (1 min 30)** — Créer le formulaire avec les champs de `docs/form-fields.md`, dont la case de consentement, puis le lier à la Sheet. Dans Apps Script : *Déclencheurs > Ajouter > onFormSubmit > À l'envoi du formulaire*.

**10. Triggers (30 s)** — Exécuter `installTriggers()` et montrer les 3 déclencheurs : file d'attente toutes les 5 min, récap email horaire, purge des consentements expirés.

**Conclusion (20 s)** — Rappeler l'ordre : Sheet → code → secrets → déploiement → Vapi → formulaire → triggers. Tout est dans le README, section Dépannage comprise.

---

## VIDÉO 2 — Démonstration

**0:00 Intro (30 s)** — Le problème : les demandes de démo sont rappelées en 32 h en moyenne, et les SDR perdent du temps sur des leads hors cible. La solution : un rappel en quelques secondes, et seuls les leads SQL arrivent au commercial.

**1. Le formulaire (45 s)** — Remplir en tant que « Julien Martin, Acme Logistique, activité : transport et logistique, effectif 120 », avec le consentement coché. Basculer sur la Sheet : la ligne apparaît dans `Leads`. Statut `Ready (web call)` en mode démo (`Calling` en production).

**2. Lancer l'appel (30 s)** — Sélectionner la ligne, puis *Nexura > Lancer l'appel* et *Ouvrir la page d'appel*. Montrer que les champs sont pré-remplis avec les données du lead. Cliquer sur *Démarrer l'appel*.

**3. Appel SQL (2 min)** — Montrer :
- l'annonce **« Je suis une intelligence artificielle »** ;
- la salutation **« Bonjour Julien »** ;
- l'accroche **« Acme est spécialisée dans le transport et la logistique ? »**.

Répliques suggérées :
- « Oui pas de souci. »
- « On doit se mettre en conformité NIS2, l'audit est dans deux mois. »
- « Je suis le DSI, c'est moi qui décide. »
- « Le plus vite possible, sous un mois. »
- « Oui, le budget est validé. »

Si les outils RDV sont branchés, accepter un créneau. Raccrocher.

**4. Résultat (1 min)** — Dans `Calls` (environ 10 à 20 s après la fin de l'appel), lire la ligne : call_id, besoin, autorité, délai, budget, **SQL**, **score supérieur ou égal à 70**, durée, résumé, transparence IA = TRUE. Dans `Leads`, le statut est passé à SQL. Le Dashboard s'est mis à jour.

**5. Cas limites (2 min 30)** — Relancer l'appel sur 2 ou 3 autres leads, avec des réponses courtes :
- « Je suis stagiaire, pas de budget, peut-être l'an prochain » → **Nurturing**, score faible ;
- lead à 2 salariés → **Nurturing** même avec de bonnes réponses ;
- « Je ne veux pas parler à un robot » → transparence FALSE, score 0 ;
- « Ne m'appelez plus » → **Opposition**. Relancer *Lancer l'appel* sur ce lead : l'outil refuse.
- Robustesse, sans appel : relancer le script curl (doublon ignoré, mauvais secret refusé) et ouvrir l'onglet `Logs`.

**6. Récap horaire (30 s)** — *Nexura > Envoyer le récap horaire maintenant*, puis ouvrir l'email reçu (tableau des appels).

**7. Ce qui marche en production (45 s)** — Montrer rapidement dans le code :
- `placeCall_` : appel sortant Vapi sur le mobile ;
- `sendPostCallSms_` : SMS Twilio aux leads SQL ;
- l'outil `transferCall` vers le mobile du commercial.

Dire : « Désactivés ici pour rester à 0 €, il suffit d'ajouter un numéro et les clés. »

**8. Conformité et conclusion (30 s)** :
- appels uniquement du lundi au vendredi, 10h-13h et 14h-20h (montrer l'alerte hors plage si on veut) ;
- consentement valable 1 an, preuve conservée 3 ans ;
- opposition prise en compte immédiatement ;
- annonce IA systématique.

Terminer sur le lien GitHub.

---

## Annexe — Réglages Vapi pour la personnalisation

**First Message** :
> Bonjour {{first_name}}, ici Léa, l'assistante virtuelle de Nexura Cloud. Je suis une intelligence artificielle. Vous avez demandé une démo il y a quelques instants, avez-vous deux minutes pour quelques questions ?

**System Prompt** : coller `agent/system-prompt.md` tel quel (il utilise `{{first_name}}`, `{{company_name}}` et `{{company_activity}}`). Ces variables sont remplies par la page d'appel. En production, c'est `placeCall_` qui les remplit.

## Checklist avant publication
- [ ] Aucun secret visible (sinon régénérer `WEBHOOK_SECRET` et redéployer)
- [ ] Texte à l'écran pour chaque paramètre important
- [ ] Liens GitHub, Sheet (lecture seule) et infographie en description
- [ ] Vidéo 1 + vidéo 2 + infographie 16:9 + code rendus ensemble
