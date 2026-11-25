/**
 * Integrations.gs — Outils appelés par l'agent (RDV, opposition), SMS Twilio,
 * email récapitulatif horaire.
 */

/**
 * Gère les "tool-calls" Vapi. Réponse attendue :
 * { results: [ { toolCallId, result } ] }
 * Outils : book_meeting(start_iso, email), mark_opt_out(lead_id), get_slots()
 */
function handleToolCalls_(msg) {
  var results = (msg.toolCallList || msg.toolCalls || []).map(function (tc) {
    var fn = tc.function || tc;
    var args = fn.arguments || {};
    if (typeof args === 'string') { try { args = JSON.parse(args); } catch (e) { args = {}; } }
    // Le LLM ne connaît pas call_id / lead_id : on les prend dans le message Vapi.
    var call = msg.call || {};
    var vars = (call.assistantOverrides && call.assistantOverrides.variableValues) || {};
    args.call_id = call.id || args.call_id;
    args.lead_id = vars.lead_id || args.lead_id;
    args.company_name = args.company_name || vars.company_name;
    var out;
    try {
      if (fn.name === 'get_slots') out = getFreeSlots_(3);
      else if (fn.name === 'book_meeting') out = bookMeeting_(args);
      else if (fn.name === 'mark_opt_out') out = markOptOut_(args.lead_id);
      else out = 'Outil inconnu : ' + fn.name;
    } catch (err) { log_('ERROR', 'tool ' + fn.name, err.message); out = 'Erreur technique, proposer un rappel par un commercial.'; }
    return { toolCallId: tc.id, result: typeof out === 'string' ? out : JSON.stringify(out) };
  });
  return { results: results };
}

/** Renvoie N créneaux libres (lun-ven, plage légale, 2 prochains jours ouvrés+). */
function getFreeSlots_(n) {
  var cal = CalendarApp.getDefaultCalendar();
  var slots = [];
  var t = new Date(Date.now() + 24 * 3600000);
  t.setMinutes(0, 0, 0);
  for (var i = 0; i < 24 * 10 && slots.length < n; i++) {
    t = new Date(t.getTime() + 3600000);
    if (!isCallAllowed_(t)) continue;
    var end = new Date(t.getTime() + CONFIG.MEETING_DURATION_MIN * 60000);
    if (cal.getEvents(t, end).length === 0) {
      slots.push({ start_iso: t.toISOString(),
        label: Utilities.formatDate(t, CONFIG.TIMEZONE, "EEEE d MMMM 'à' HH'h'mm") });
    }
  }
  return slots;
}

/** Crée le RDV dans l'agenda et trace dans la Sheet. */
function bookMeeting_(a) {
  var start = new Date(a.start_iso);
  if (isNaN(start.getTime())) return 'Date invalide, proposer un autre créneau.';
  var end = new Date(start.getTime() + CONFIG.MEETING_DURATION_MIN * 60000);
  var cal = CalendarApp.getDefaultCalendar();
  if (cal.getEvents(start, end).length) return 'Créneau déjà pris, proposer un autre créneau.';
  var opts = { description: 'Démo Nexura Cloud — qualifiée par agent vocal IA.' };
  if (a.email) opts.guests = a.email;
  opts.sendInvites = !!a.email;
  cal.createEvent('Démo Nexura Cloud — ' + (a.company_name || ''), start, end, opts);
  // Le compte rendu d'appel (end-of-call-report) arrive APRÈS ce tool-call :
  // on mémorise le RDV 6 h dans le cache, saveCall_ le récupère.
  if (a.call_id) CacheService.getScriptCache().put('meeting_' + a.call_id, start.toISOString(), 21600);
  return 'Rendez-vous confirmé le ' + Utilities.formatDate(start, CONFIG.TIMEZONE, "EEEE d MMMM 'à' HH'h'mm");
}

/** Opposition : plus jamais rappelé. */
function markOptOut_(leadId) {
  var sh = sheet_(CONFIG.SHEETS.LEADS);
  var l = rows_(sh).filter(function (r) { return r.lead_id === leadId; })[0];
  if (l) updateRow_(sh, l._row, { status: 'Opposition', consent_given: false, next_attempt_at: '' });
  return "Opposition enregistrée, le contact ne sera plus appelé.";
}

/** SMS de confirmation via l'API REST Twilio (optionnel : ignoré si non configuré). */
function sendPostCallSms_(lead, firstName) {
  var sid = prop_('TWILIO_SID'), tok = prop_('TWILIO_TOKEN'), from = prop_('TWILIO_FROM');
  if (!sid || !tok || !from || !lead || !lead.phone) return false;
  var body = 'Bonjour ' + firstName + ', merci pour votre échange avec l\'assistant IA de Nexura Cloud. ' +
             'Un expert vous recontacte très vite. Répondez STOP pour ne plus être contacté.';
  var res = UrlFetchApp.fetch('https://api.twilio.com/2010-04-01/Accounts/' + sid + '/Messages.json', {
    method: 'post', muteHttpExceptions: true,
    headers: { Authorization: 'Basic ' + Utilities.base64Encode(sid + ':' + tok) },
    payload: { To: lead.phone, From: from, Body: body }
  });
  var ok = res.getResponseCode() < 300;
  if (!ok) log_('WARN', 'Twilio ' + res.getResponseCode(), res.getContentText());
  return ok;
}

/** Email horaire : récap des appels de la dernière heure (SQL en tête). */
function sendHourlyDigest() {
  var to = prop_('SALES_EMAIL');
  if (!to) return;
  var since = Date.now() - 3600000;
  var rows = rows_(sheet_(CONFIG.SHEETS.CALLS)).filter(function (r) { return new Date(r.received_at).getTime() >= since; });
  if (!rows.length) return;
  rows.sort(function (a, b) { return b.score - a.score; });
  var html = '<h3>Nexura — ' + rows.length + ' appel(s) sur la dernière heure</h3><table border="1" cellpadding="6" style="border-collapse:collapse">' +
    '<tr><th>Contact</th><th>Entreprise</th><th>Statut</th><th>Score</th><th>Besoin</th></tr>' +
    rows.map(function (r) {
      return '<tr><td>' + r.first_name + ' ' + r.last_name + '</td><td>' + r.company_name + '</td><td><b>' +
        r.lead_status + '</b></td><td>' + r.score + '</td><td>' + r.need_summary + '</td></tr>';
    }).join('') + '</table><p>À rappeler en priorité : les lignes SQL.</p>';
  MailApp.sendEmail({ to: to, subject: '[Nexura] ' + rows.filter(function (r) { return r.lead_status === 'SQL'; }).length + ' SQL cette heure', htmlBody: html });
}
