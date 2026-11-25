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

/** Onglet Dashboard : KPI calculés par formules (aucun script requis). */
function buildDashboard_(ss) {
  var sh = ss.getSheetByName(CONFIG.SHEETS.DASH) || ss.insertSheet(CONFIG.SHEETS.DASH);
  sh.clear();
  var rows = [
    ['KPI', 'Valeur'],
    ['Leads total', '=COUNTA(Leads!A2:A)'],
    ['Appels traités', '=COUNTA(Calls!A2:A)'],
    ['SQL', '=COUNTIF(Calls!J2:J,"SQL")'],
    ['Nurturing', '=COUNTIF(Calls!J2:J,"Nurturing")'],
    ['Taux SQL', '=IFERROR(B4/B3,0)'],
    ['Score moyen', '=IFERROR(AVERAGE(Calls!K2:K),0)'],
    ['Durée moyenne (s)', '=IFERROR(AVERAGE(Calls!L2:L),0)'],
    ['Acceptation transparence IA', '=IFERROR(COUNTIF(Calls!N2:N,TRUE)/B3,0)'],
    ['Oppositions (ne plus appeler)', '=COUNTIF(Leads!L2:L,"Opposition")'],
    ['Sans réponse', '=COUNTIF(Leads!L2:L,"No answer")']
  ];
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
  sh.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#1a237e').setFontColor('#fff');
  sh.getRange('B6').setNumberFormat('0%');
  sh.getRange('B9').setNumberFormat('0%');
  sh.setColumnWidth(1, 260);
}
