# Champs du Google Form (intitulés EXACTS, utilisés par `onFormSubmit`)

| Intitulé | Type | Obligatoire |
|---|---|---|
| Prénom | Réponse courte | oui |
| Nom | Réponse courte | oui |
| Entreprise | Réponse courte | oui |
| Téléphone | Réponse courte | oui |
| Email | Réponse courte | oui |
| Effectif | Réponse courte (nombre) | non |
| Activité | Réponse courte (ex : « édition de logiciels RH ») | non |
| Consentement | Cases à cocher : « J'accepte d'être rappelé(e) par téléphone par un assistant IA de Nexura Cloud » | oui |

Le consentement est horodaté dans `Leads.consent_at` (preuve conservée 3 ans, valable 1 an).
Lier le formulaire à la Sheet puis créer le trigger via `installTriggers()` + un trigger manuel *À l'envoi du formulaire* → `onFormSubmit`.
