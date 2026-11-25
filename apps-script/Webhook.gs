/**
 * Webhook.gs — Point d'entrée HTTP (déployé en Web App).
 *
 * L'agent vocal envoie un POST à : <URL Web App>?secret=<WEBHOOK_SECRET>
 * Formats acceptés :
 *   1. Payload "sujet" (voir docs/payload-example.json) :
 *      { call_id, contact, qualification, call_metadata }
 *   2. Messages serveur Vapi : end-of-call-report, tool-calls (book_meeting, mark_opt_out)
 *
 * Robustesse : secret vérifié, JSON validé, try/catch global, dédoublonnage
 * sur call_id (LockService contre les doubles livraisons simultanées).
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    if (!e || !e.parameter || e.parameter.secret !== prop_('WEBHOOK_SECRET') || !prop_('WEBHOOK_SECRET')) {
      log_('WARN', 'Webhook refusé : secret invalide', '');
      return json_({ ok: false, error: 'unauthorized' });
    }
    var body;
    try { body = JSON.parse(e.postData.contents); }
    catch (err) { log_('ERROR', 'JSON invalide', e.postData && e.postData.contents); return json_({ ok: false, error: 'bad_json' }); }

    lock.waitLock(20000);
    var msg = body.message;
    if (msg && msg.type) return json_(handleVapiMessage_(msg));
    return json_(saveCall_(body));
  } catch (err) {
    log_('ERROR', 'doPost: ' + err.message, err.stack);
    return json_({ ok: false, error: 'server_error' });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

/** Test rapide dans le navigateur : GET => "alive". */
function doGet() { return json_({ ok: true, service: 'nexura-voice-webhook' }); }

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/** Route les messages serveur Vapi. */
function handleVapiMessage_(msg) {
  switch (msg.type) {
    case 'end-of-call-report':
      return saveCall_(vapiToPayload_(msg));
    case 'tool-calls':
      return handleToolCalls_(msg);
    default:
      return { ok: true, ignored: msg.type };
  }
}

/**
 * Convertit un end-of-call-report Vapi vers le payload du sujet.
 * Les champs qualification viennent de analysisPlan.structuredDataPlan (voir agent/vapi-assistant.json).
 */
function vapiToPayload_(msg) {
  var call = msg.call || {};
  var meta = (call.assistantOverrides && call.assistantOverrides.variableValues) || {};
  var sd = (msg.analysis && msg.analysis.structuredData) || {};
  return {
    call_id: call.id,
    lead_id: meta.lead_id,
    ended_reason: msg.endedReason,
    contact: {
      first_name: meta.first_name, last_name: meta.last_name, company_name: meta.company_name
    },
    qualification: {
      need_summary: sd.need_summary, authority_level: sd.authority_level, timeline: sd.timeline,
      budget_confirmed: sd.budget_confirmed
    },
    call_metadata: {
      duration_seconds: Math.round(msg.durationSeconds || 0),
      full_summary: (msg.analysis && msg.analysis.summary) || msg.summary || '',
      ai_transparency_accepted: sd.ai_transparency_accepted,
      opt_out: sd.opt_out
    }
  };
}

/**
 * Enregistre un appel : validation, dédoublonnage, score, écriture Calls,
 * mise à jour du lead, SMS. Retourne un objet JSON de réponse.
 */
function saveCall_(p) {
  if (!p || !p.call_id) { log_('ERROR', 'Payload sans call_id', p); return { ok: false, error: 'missing_call_id' }; }
  var calls = sheet_(CONFIG.SHEETS.CALLS);
  var existing = rows_(calls).filter(function (r) { return r.call_id === p.call_id; });
  if (existing.length) { log_('INFO', 'Doublon ignoré', p.call_id); return { ok: true, duplicate: true }; }

  var c = p.contact || {}, q = p.qualification || {}, m = p.call_metadata || {};
  var lead = findLead_(p.lead_id, c.first_name, c.company_name) || {};
  var firstName = c.first_name || lead.first_name || '';
  var company = c.company_name || lead.company_name || '';

  var transparency = m.ai_transparency_accepted === true || String(m.ai_transparency_accepted).toLowerCase() === 'true';
  var optOut = m.opt_out === true || String(m.opt_out).toLowerCase() === 'true' || !transparency && /refus|opposition|stop/i.test(String(m.full_summary));
  var duration = Number(m.duration_seconds) || 0;
  var noAnswer = /voicemail|no-answer|busy|did-not-answer/i.test(String(p.ended_reason || '')) || (duration < 5 && !q.need_summary);

  var s = scoreLead_(q, lead.company_size);
  var status = optOut ? 'Opposition' : (noAnswer ? 'No answer' : s.status);

  calls.appendRow([
    p.call_id, new Date(), firstName, c.last_name || lead.last_name || '', company,
    q.need_summary || '', q.authority_level || '', q.timeline || '',
    q.budget_confirmed === true || String(q.budget_confirmed).toLowerCase() === 'true',
    status, noAnswer ? 0 : s.score, duration, m.full_summary || '', transparency, '', false
  ]);

  if (lead._row) afterCallLeadUpdate_(lead, p.call_id, status, optOut, noAnswer);
  if (status === 'SQL') { try { sendPostCallSms_(lead, firstName); } catch (e) { log_('WARN', 'SMS échoué', e.message); } }
  return { ok: true, call_id: p.call_id, status: status, score: s.score };
}

/** Retrouve le lead par lead_id, sinon par prénom+entreprise. */
function findLead_(leadId, first, company) {
  var rows = rows_(sheet_(CONFIG.SHEETS.LEADS));
  var hit = rows.filter(function (r) { return leadId && r.lead_id === leadId; })[0];
  if (hit) return hit;
  return rows.filter(function (r) { return r.first_name === first && r.company_name === company; })[0];
}
