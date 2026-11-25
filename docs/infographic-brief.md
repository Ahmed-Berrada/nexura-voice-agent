# Brief pour générer l'infographie (LLM d'images)

Usage : coller le prompt ci-dessous dans un générateur d'images (ChatGPT/DALL·E, Gemini, Midjourney…), en joignant si possible l'image d'exemple du sujet et `docs/infographic.svg` (exporté en PNG) comme références de mise en page. Format obligatoire : **16:9**.

## Prompt (à copier)

> Crée une infographie 16:9 (1920×1080), style flat design propre et professionnel, fond bleu très clair (#E8EAF6), accents indigo (#1A237E) et rouge (#C62828) pour la conformité. Titre en haut : « Nexura Cloud — Agent vocal IA de qualification (appels sortants) », sous-titre : « 100 % code : Google Apps Script + Vapi, sans Make / Zapier / n8n ». Texte en français, lisible, police sans-serif, grandes cases arrondies reliées par des flèches épaisses, numérotées de 1 à 9.
>
> Flux principal (3 lignes, lecture gauche → droite) :
> 1. **Google Form** — demande de démo + consentement
> 2. **Google Apps Script** — onFormSubmit : ajoute le lead, vérifie consentement et plage légale (lun-ven 10h-13h / 14h-20h)
> 3. **API Vapi** — appel sortant immédiat avec prénom, entreprise, activité
> 4. **Agent vocal « Léa »** (voix ElevenLabs) — annonce « Je suis une IA », qualification BANT
> 5. **Webhook POST** (JSON + secret) — fin d'appel
> 6. **doPost() Apps Script** — validation, dédoublonnage sur call_id, score /100 → SQL (≥ 70) ou Nurturing
> 7. **Google Sheets « tour de contrôle »** — onglets Leads, Calls, Logs, Dashboard
>
> Actions déclenchées depuis le script (4 cases en bas) :
> 8. **Google Calendar** — prise de rendez-vous · **SMS Twilio** — confirmation après un SQL · **Email horaire** (MailApp) — récap pour les commerciaux · **Transfert d'appel** — vers le mobile d'un commercial
>
> Encadré rouge à gauche : « Conformité » — consentement valable 1 an, preuve conservée 3 ans, opposition = plus jamais rappelé. Bandeau en bas : « Retries si pas de réponse · Secret partagé · Logs · Score calculé côté code ». Ajouter les logos officiels des outils (Google Forms, Sheets, Calendar, Apps Script, Vapi, ElevenLabs, Twilio) à côté de chaque case. Pas de texte inventé, pas de fautes d'orthographe, pas de personnages.

## Après génération
- Vérifier l'orthographe (les modèles d'images se trompent souvent) ; si besoin, corriger dans Canva/Figma ou garder `docs/infographic.svg` comme version de secours, fidèle au code.
- Exporter en PNG 1920×1080 et enregistrer sous `docs/infographic.png`, puis committer.
- Vérifier : 16:9, étapes numérotées, outils nommés, aucun outil interdit (Make, Zapier, n8n, IFTTT, Gumloop) affiché.
