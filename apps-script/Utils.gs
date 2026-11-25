/**
 * Utils.gs — Fonctions utilitaires : logs, accès feuilles, fenêtre légale.
 */

/** Écrit une ligne dans l'onglet Logs (ne doit jamais faire échouer l'appelant). */
function log_(level, message, details) {
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.LOGS);
    if (!sh) return;
    sh.appendRow([new Date(), level, message,
      typeof details === 'string' ? details : JSON.stringify(details || '')]);
  } catch (e) { console.error(e); }
}

/** Retourne la feuille par nom ; lève une erreur claire si absente. */
function sheet_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Onglet manquant : ' + name + ' (lancer setupSheet)');
  return sh;
}

/** Convertit une feuille en tableau d'objets {colonne: valeur} + n° de ligne. */
function rows_(sh) {
  var v = sh.getDataRange().getValues();
  var h = v.shift();
  return v.map(function (r, i) {
    var o = { _row: i + 2 };
    h.forEach(function (c, j) { o[c] = r[j]; });
    return o;
  });
}

/** Met à jour des champs d'une ligne identifiée par son n° (via en-têtes). */
function updateRow_(sh, row, fields) {
  var h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  Object.keys(fields).forEach(function (k) {
    var c = h.indexOf(k);
    if (c >= 0) sh.getRange(row, c + 1).setValue(fields[k]);
  });
}

/**
 * Vrai si `d` est dans la plage légale de démarchage :
 * lundi-vendredi, 10h-13h et 14h-20h (heure de Paris).
 */
function isCallAllowed_(d) {
  d = d || new Date();
  var dow = Number(Utilities.formatDate(d, CONFIG.TIMEZONE, 'u')); // 1=lundi .. 7=dimanche
  var hour = Number(Utilities.formatDate(d, CONFIG.TIMEZONE, 'H')) +
             Number(Utilities.formatDate(d, CONFIG.TIMEZONE, 'm')) / 60;
  if (dow > 5) return false;
  return CONFIG.CALL_WINDOWS.some(function (w) { return hour >= w[0] && hour < w[1]; });
}

/** Prochain instant autorisé pour appeler (avance par pas de 15 min, max 8 jours). */
function nextAllowedTime_(from) {
  var t = new Date((from || new Date()).getTime());
  for (var i = 0; i < 8 * 24 * 4; i++) {
    if (isCallAllowed_(t)) return t;
    t = new Date(t.getTime() + 15 * 60000);
  }
  return t;
}

/** Normalise un numéro français en E.164 (06... -> +336...). */
function toE164_(p) {
  p = String(p || '').replace(/[\s.\-()]/g, '');
  if (/^\+\d{8,15}$/.test(p)) return p;
  if (/^00\d{8,15}$/.test(p)) return '+' + p.slice(2);
  if (/^0\d{9}$/.test(p)) return '+33' + p.slice(1);
  return '';
}

/** Le consentement est-il valide (donné, et de moins d'un an) ? */
function hasValidConsent_(lead) {
  if (String(lead.consent_given).toUpperCase() !== 'TRUE' && lead.consent_given !== true) return false;
  var at = new Date(lead.consent_at);
  if (isNaN(at.getTime())) return false;
  return (Date.now() - at.getTime()) / 86400000 <= CONFIG.CONSENT_MAX_AGE_DAYS;
}
