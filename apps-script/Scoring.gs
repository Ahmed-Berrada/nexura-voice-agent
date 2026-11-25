/**
 * Scoring.gs — Score /100 et routage SQL / Nurturing.
 *
 * Le score est calculé ICI (déterministe) et non par le LLM : plus robuste,
 * auditable et identique d'un appel à l'autre.
 *
 * Grille (100 pts) :
 *   Autorité  30  décideur=30, influenceur=18, utilisateur=8, inconnu=0
 *   Budget    30  confirmé=30, sinon 0
 *   Délai     25  <1 mois=25, 1-3 mois=18, 3-6 mois=8, >6 mois/inconnu=0
 *   Cible     15  PME/ETI (>=10 salariés)=15, 5-9=7, <5 (micro)=0
 * Règle : micro-entreprise (<5 salariés) => Nurturing quoi qu'il arrive.
 */
function scoreLead_(q, companySize) {
  var authority = String(q.authority_level || '').toLowerCase();
  var timeline = String(q.timeline || '').toLowerCase();
  var size = Number(companySize);
  var pts = 0;

  // --- Autorité ---
  if (/d[ée]cideur|directeur|dsi|rssi|ceo|dg|responsable|head|vp|cto|ciso/.test(authority)) pts += 30;
  else if (/influen|manager|chef|lead/.test(authority)) pts += 18;
  else if (/utilisateur|analyste|ing[ée]nieur|stagiaire/.test(authority)) pts += 8;

  // --- Budget ---
  if (q.budget_confirmed === true || String(q.budget_confirmed).toLowerCase() === 'true') pts += 30;

  // --- Délai ---
  if (/<\s*1|imm[ée]diat|ce mois|semaine|urgent/.test(timeline)) pts += 25;
  else if (/1\s*[-à]\s*3|trimestre|[123]\s*mois/.test(timeline)) pts += 18;
  else if (/3\s*[-à]\s*6|semestre|[456]\s*mois/.test(timeline)) pts += 8;

  // --- Cible (taille d'entreprise) ---
  if (!isNaN(size)) {
    if (size >= 10) pts += 15;
    else if (size >= 5) pts += 7;
  } else {
    pts += 7; // taille inconnue : neutre
  }

  var micro = !isNaN(size) && size < 5;
  var status = (!micro && pts >= CONFIG.SQL_THRESHOLD) ? 'SQL' : 'Nurturing';
  return { score: Math.min(100, pts), status: status };
}
