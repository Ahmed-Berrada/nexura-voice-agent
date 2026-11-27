/**
 * Calls.gs — Lancement des appels sortants + file d'attente + conformité.
 *
 * Flux : formulaire -> onFormSubmit -> addLead_ -> dispatchLead_ (appel immédiat si légal)
 *        trigger toutes les 5 min -> processQueue() : appelle les leads dont
 *        next_attempt_at est échu (hors plage légale, retries, no answer).
 */

/** Trigger "À l'envoi du formulaire". Colonnes du formulaire : voir docs/form-fields.md */
function onFormSubmit(e) {
  try {
    var v = e.namedValues; // { 'Prénom': ['Julien'], ... }
    var g = function (k) { return (v[k] && v[k][0]) || ''; };
    var lead = addLead_({
      first_name: g('Prénom'), last_name: g('Nom'), company_name: g('Entreprise'),
      phone: g('Téléphone'), email: g('Email'), company_size: g('Effectif'),
      company_activity: g('Activité'),
      consent_given: /oui|yes|true|accepte/i.test(g('Consentement')) // la case contient « J'accepte… » (apostrophe droite ou typographique)
    });
    dispatchLead_(lead);
  } catch (err) { log_('ERROR', 'onFormSubmit: ' + err.message, err.stack); }
}

/** Ajoute un lead dans l'onglet Leads et le retourne. */
function addLead_(d) {
  var sh = sheet_(CONFIG.SHEETS.LEADS);
  var id = 'lead_' + Utilities.getUuid().slice(0, 8);
  var phone = toE164_(d.phone);
  var now = new Date();
  var status = !phone ? 'Invalid phone' : (d.consent_given ? 'New' : 'No consent');
  sh.appendRow([id, now, d.first_name, d.last_name, d.company_name, phone, d.email,
    d.company_activity || '', d.company_size || '', !!d.consent_given,
    d.consent_given ? now : '', status, 0, '', '']);
  return rows_(sh).filter(function (r) { return r.lead_id === id; })[0];
}

/**
 * Décide d'appeler maintenant ou de mettre en file :
 * - pas de consentement valide / opposition / numéro invalide => jamais d'appel
 * - hors plage légale => next_attempt_at = prochain créneau autorisé
 */
function dispatchLead_(lead) {
  var sh = sheet_(CONFIG.SHEETS.LEADS);
  if (['Opposition', 'Invalid phone', 'No consent', 'Max attempts', 'SQL', 'Nurturing'].indexOf(lead.status) >= 0) return;
  if (!hasValidConsent_(lead)) { updateRow_(sh, lead._row, { status: 'No consent' }); return; }
  if (!isCallAllowed_(new Date())) {
    updateRow_(sh, lead._row, { status: 'Queued', next_attempt_at: nextAllowedTime_(new Date()) });
    log_('INFO', 'Hors plage légale, lead mis en file', lead.lead_id);
    return;
  }
  placeCall_(lead);
}

/** Appelle l'API Vapi POST /call (appel sortant). */
function placeCall_(lead) {
  var sh = sheet_(CONFIG.SHEETS.LEADS);
  var attempts = Number(lead.attempts || 0) + 1;
  var max = Number(prop_('MAX_ATTEMPTS') || 3);
  if (attempts > max) { updateRow_(sh, lead._row, { status: 'Max attempts' }); return; }
  // Mode démo gratuit : pas de numéro sortant => l'appel se lance en web depuis le menu Nexura.
  if (!prop_('VAPI_PHONE_NUMBER_ID')) {
    updateRow_(sh, lead._row, { status: 'Ready (web call)' });
    log_('INFO', 'Pas de numéro Vapi : lancer via menu Nexura > Lancer l\'appel', lead.lead_id);
    return;
  }

  var payload = {
    assistantId: prop_('VAPI_ASSISTANT_ID'),
    phoneNumberId: prop_('VAPI_PHONE_NUMBER_ID'),
    customer: { number: lead.phone, name: lead.first_name },
    assistantOverrides: {
      variableValues: {
        lead_id: lead.lead_id, first_name: lead.first_name, last_name: lead.last_name,
        company_name: lead.company_name, company_activity: lead.company_activity || '',
        sales_mobile: prop_('SALES_MOBILE')
      }
    }
  };
  var res = UrlFetchApp.fetch('https://api.vapi.ai/call', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + prop_('VAPI_API_KEY') },
    payload: JSON.stringify(payload)
  });
  var code = res.getResponseCode();
  if (code >= 200 && code < 300) {
    var id = JSON.parse(res.getContentText()).id;
    updateRow_(sh, lead._row, { status: 'Calling', attempts: attempts, last_call_id: id,
      next_attempt_at: new Date(Date.now() + CONFIG.RETRY_DELAY_MIN * 60000) });
  } else {
    log_('ERROR', 'Vapi ' + code, res.getContentText());
    updateRow_(sh, lead._row, { status: 'Queued', attempts: attempts,
      next_attempt_at: new Date(Date.now() + 15 * 60000) });
  }
}

/** Trigger 5 min : relance les leads en file ou sans réponse. */
function processQueue() {
  var now = new Date();
  try { buildDashboard_(); } catch (e) { log_('WARN', 'Dashboard', e.message); }
  rows_(sheet_(CONFIG.SHEETS.LEADS)).forEach(function (l) {
    var due = l.next_attempt_at && new Date(l.next_attempt_at) <= now;
    if (due && ['Queued', 'No answer', 'Calling'].indexOf(l.status) >= 0) dispatchLead_(l);
  });
}

/** Met à jour le lead après réception du compte rendu d'appel. */
function afterCallLeadUpdate_(lead, callId, status, optOut, noAnswer) {
  var sh = sheet_(CONFIG.SHEETS.LEADS);
  var f = { last_call_id: callId, status: status };
  if (noAnswer) f.next_attempt_at = new Date(Date.now() + CONFIG.RETRY_DELAY_MIN * 60000);
  else f.next_attempt_at = '';
  if (optOut) { f.status = 'Opposition'; f.consent_given = false; f.next_attempt_at = ''; }
  updateRow_(sh, lead._row, f);
}

/** Installe les triggers (à exécuter une fois). */
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('processQueue').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('sendHourlyDigest').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('purgeExpiredConsents').timeBased().everyDays(1).atHour(3).create();
}

/**
 * RGPD : les preuves de consentement sont conservées 3 ans ; passé 1 an le
 * consentement n'est plus valide (le lead n'est plus appelé).
 */
function purgeExpiredConsents() {
  var sh = sheet_(CONFIG.SHEETS.LEADS);
  rows_(sh).forEach(function (l) {
    if (l.consent_at && (Date.now() - new Date(l.consent_at).getTime()) / 86400000 > CONFIG.CONSENT_MAX_AGE_DAYS &&
        ['New', 'Queued', 'No answer'].indexOf(l.status) >= 0) {
      updateRow_(sh, l._row, { status: 'No consent', next_attempt_at: '' });
    }
  });
}
