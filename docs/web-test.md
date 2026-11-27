# Mode test gratuit, sans téléphone (appel web Vapi)

Aucun numéro ni opérateur : on parle à l'agent depuis le navigateur. Utilise uniquement les crédits offerts par Vapi (0 €).

1. Vapi > Assistants > ouvrir « Nexura - Lea » > bouton **Talk / Test assistant** (appel web).
2. Autorise le micro. L'agent doit dire en premier qu'il est une IA.
3. Joue un scénario (voir ci-dessous), puis raccroche.
4. Après quelques secondes, une ligne apparaît dans l'onglet `Calls` (webhook `end-of-call-report`).

Dans un appel web il n'y a pas de variables (`first_name`, `company_name`…) : donne ton prénom et ton entreprise à l'oral, l'agent les extrait. Le lead n'existe pas dans `Leads` : la taille d'entreprise est inconnue (7 points neutres sur le score).

## Scénarios à filmer
| Scénario | Ce qu'il faut dire | Résultat attendu |
|---|---|---|
| SQL | Directeur IT décideur, ISO 27001, < 1 mois, budget validé | `SQL`, score élevé, RDV proposé |
| Nurturing | Stagiaire, pas de budget, dans 1 an | `Nurturing`, score faible |
| Refus IA | « Je ne veux pas parler à un robot » | `Nurturing`, score 0 |
| Opposition | « Ne me rappelez plus jamais » | `Opposition` |

Non testable sans téléphone : sonnerie, répondeur, transfert d'appel, SMS. Ils sont documentés mais optionnels.
