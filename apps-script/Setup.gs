/**
 * Setup.gs — Crée les onglets et les en-têtes de la Google Sheet.
 * À exécuter UNE fois depuis l'éditeur Apps Script : setupSheet().
 */
function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, CONFIG.SHEETS.LEADS, LEAD_COLS);
  ensureSheet_(ss, CONFIG.SHEETS.CALLS, CALL_COLS);
  ensureSheet_(ss, CONFIG.SHEETS.LOGS, ['timestamp', 'level', 'message', 'details']);
  // Téléphone en texte brut : sinon Sheets transforme "+336..." en nombre/formule.
  ss.getSheetByName(CONFIG.SHEETS.LEADS).getRange('F:F').setNumberFormat('@');
  buildDashboard_(ss);
  SpreadsheetApp.flush();
}

/** Crée l'onglet s'il n'existe pas, pose les en-têtes et les fige. */
function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#1a237e').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

/**
 * Onglet Dashboard : KPI calculés EN SCRIPT puis écrits comme valeurs.
 * (Les formules COUNTIF/IFERROR cassent selon la locale de la Sheet : virgule
 * ou point-virgule comme séparateur. Les valeurs sont indépendantes de la locale.)
 * Rafraîchi après chaque appel (saveCall_) et par processQueue.
 */
function buildDashboard_(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CONFIG.SHEETS.DASH) || ss.insertSheet(CONFIG.SHEETS.DASH);
  var leads = rows_(ss.getSheetByName(CONFIG.SHEETS.LEADS));
  var calls = rows_(ss.getSheetByName(CONFIG.SHEETS.CALLS));
  var count = function (arr, k, v) { return arr.filter(function (r) { return r[k] === v; }).length; };
  var avg = function (k) {
    var v = calls.map(function (r) { return Number(r[k]); }).filter(function (n) { return !isNaN(n); });
    return v.length ? Math.round(v.reduce(function (a, b) { return a + b; }, 0) / v.length * 10) / 10 : 0;
  };
  var n = calls.length, sql = count(calls, 'lead_status', 'SQL');
  var accepted = calls.filter(function (r) { return r.ai_transparency_accepted === true; }).length;
  var rows = [
    ['KPI', 'Valeur'],
    ['Leads total', leads.length],
    ['Appels traités', n],
    ['SQL', sql],
    ['Nurturing', count(calls, 'lead_status', 'Nurturing')],
    ['Taux SQL', n ? sql / n : 0],
    ['Score moyen', avg('score')],
    ['Durée moyenne (s)', avg('duration_seconds')],
    ['Acceptation transparence IA', n ? accepted / n : 0],
    ['Oppositions (ne plus appeler)', count(leads, 'status', 'Opposition')],
    ['Sans réponse', count(leads, 'status', 'No answer')],
    ['Dernière mise à jour', new Date()]
  ];
  sh.clear();
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
  sh.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#1a237e').setFontColor('#fff');
  sh.getRange('B6').setNumberFormat('0%');
  sh.getRange('B9').setNumberFormat('0%');
  sh.getRange('B12').setNumberFormat('dd/MM/yyyy HH:mm');
  sh.setColumnWidth(1, 260);
}
