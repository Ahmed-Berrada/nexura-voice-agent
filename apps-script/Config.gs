/**
 * Config.gs — Configuration centrale.
 *
 * Les SECRETS ne sont JAMAIS écrits dans le code : ils sont stockés dans
 * Project Settings > Script Properties (voir README, étape 3).
 *
 * Propriétés attendues :
 *   WEBHOOK_SECRET        secret partagé (ajouté en ?secret=... à l'URL du webhook)
 *   VAPI_API_KEY          clé privée Vapi
 *   VAPI_ASSISTANT_ID     id de l'assistant Vapi
 *   VAPI_PHONE_NUMBER_ID  id du numéro Vapi (ou Twilio importé) utilisé pour sortir
 *   TWILIO_SID / TWILIO_TOKEN / TWILIO_FROM   (optionnel) SMS post-appel
 *   SALES_EMAIL           destinataire du récapitulatif horaire
 *   SALES_MOBILE          mobile du commercial (transfert d'appel), format E.164
 *   MAX_ATTEMPTS          (optionnel) tentatives max par lead, défaut 3
 */
var CONFIG = {
  SHEETS: { LEADS: 'Leads', CALLS: 'Calls', LOGS: 'Logs', DASH: 'Dashboard' },
  TIMEZONE: 'Europe/Paris',
  // Réglementation : lun-ven, 10h-13h et 14h-20h
  CALL_WINDOWS: [[10, 13], [14, 20]],
  SQL_THRESHOLD: 70,          // score >= 70 => SQL, sinon Nurturing
  RETRY_DELAY_MIN: 120,       // délai avant nouvel essai si pas de réponse
  CONSENT_MAX_AGE_DAYS: 365,  // validité du consentement : 1 an
  CONSENT_RETENTION_DAYS: 1095, // conservation de la preuve : 3 ans
  MEETING_DURATION_MIN: 30
};

/** Colonnes de l'onglet Leads (ordre = ordre dans la feuille). */
var LEAD_COLS = [
  'lead_id', 'created_at', 'first_name', 'last_name', 'company_name', 'phone',
  'email', 'company_activity', 'company_size', 'consent_given', 'consent_at',
  'status', 'attempts', 'next_attempt_at', 'last_call_id'
];

/** Colonnes de l'onglet Calls (le "dashboard" exigé par le sujet). */
var CALL_COLS = [
  'call_id', 'received_at', 'first_name', 'last_name', 'company_name',
  'need_summary', 'authority_level', 'timeline', 'budget_confirmed',
  'lead_status', 'score', 'duration_seconds', 'full_summary',
  'ai_transparency_accepted', 'meeting_at', 'sms_sent'
];

/** Lit une Script Property (chaîne vide si absente). */
function prop_(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}
