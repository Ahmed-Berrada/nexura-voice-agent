/**
 * Launcher.gs — Menu "Nexura" dans la Sheet : lance l'appel web de démo
 * pour le lead sélectionné (onglet Leads).
 *
 * Mode démo gratuit : sans numéro Vapi (VAPI_PHONE_NUMBER_ID vide), l'appel
 * sortant est remplacé par un appel web (docs/call.html, hébergé sur GitHub
 * Pages). Les variables du lead passent dans le fragment d'URL (#...), qui
 * n'est jamais envoyé à un serveur.
 *
 * Propriété optionnelle : LAUNCHER_URL (sinon CONFIG.LAUNCHER_URL).
 */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Nexura')
    .addItem("Lancer l'appel (lead sélectionné)", 'launchCallForSelection')
    .addItem('Rafraîchir le dashboard', 'refreshDashboard')
    .addItem('Envoyer le récap horaire maintenant', 'sendHourlyDigest')
    .addToUi();
}

function refreshDashboard() { buildDashboard_(); }

function launchCallForSelection() {
  var ui = SpreadsheetApp.getUi();
  var sh = SpreadsheetApp.getActiveSheet();
  var row = sh.getActiveRange() && sh.getActiveRange().getRow();
  if (sh.getName() !== CONFIG.SHEETS.LEADS || !row || row < 2) {
    ui.alert("Sélectionne une ligne de l'onglet Leads, puis relance.");
    return;
  }
  var lead = rows_(sh).filter(function (r) { return r._row === row; })[0];
  if (!lead || !lead.lead_id) { ui.alert('Ligne vide.'); return; }
  if (lead.status === 'Opposition') { ui.alert('Ce lead a demandé à ne plus être appelé (Opposition).'); return; }
  if (!hasValidConsent_(lead)) { ui.alert('Pas de consentement valide : appel interdit.'); return; }
  if (!isCallAllowed_(new Date())) {
    var go = ui.alert('Hors plage légale (lun-ven 10h-13h / 14h-20h). En production, le lead serait mis en file.\n' +
      'Lancer quand même cet appel de TEST ?', ui.ButtonSet.YES_NO);
    if (go !== ui.Button.YES) return;
  }

  var params = {
    lead_id: lead.lead_id, first_name: lead.first_name, last_name: lead.last_name,
    company_name: lead.company_name, company_activity: lead.company_activity || '',
    assistant: prop_('VAPI_ASSISTANT_ID')
  };
  var frag = Object.keys(params).map(function (k) {
    return k + '=' + encodeURIComponent(params[k] || '');
  }).join('&');
  var url = (prop_('LAUNCHER_URL') || CONFIG.LAUNCHER_URL) + '#' + frag;

  updateRow_(sh, row, { status: 'Calling', attempts: Number(lead.attempts || 0) + 1 });
  log_('INFO', 'Appel web lancé depuis la Sheet', lead.lead_id);

  var html = HtmlService.createHtmlOutput(
    '<div style="font:15px system-ui;padding:8px">' +
    '<p>Appel de <b>' + escapeHtml_(lead.first_name) + '</b> (' + escapeHtml_(lead.company_name) + ')</p>' +
    '<p><a id="go" href="' + escapeHtml_(url) + '" target="_blank" rel="noopener" ' +
    'style="display:inline-block;background:#1a237e;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">' +
    "Ouvrir la page d'appel</a></p>" +
    '<p style="color:#666;font-size:13px">Le compte rendu arrivera dans l\'onglet Calls à la fin de l\'appel.</p>' +
    '<script>document.getElementById("go").onclick=function(){setTimeout(function(){google.script.host.close()},300)};</script>' +
    '</div>').setWidth(380).setHeight(190);
  ui.showModalDialog(html, "Lancer l'appel");
}

function escapeHtml_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
