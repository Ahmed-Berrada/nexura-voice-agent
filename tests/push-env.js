// Génère un script Apps Script à coller dans l'éditeur : copie .env -> Script Properties.
// Usage : node tests/push-env.js   (affiche le code ; ne JAMAIS le committer)
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('.env', 'utf8').split(/\r?\n/)
  .filter(l => l && !l.startsWith('#') && l.includes('=')).map(l => [l.split('=')[0], l.slice(l.indexOf('=') + 1)]));
console.log('function loadEnv_(){PropertiesService.getScriptProperties().setProperties(' + JSON.stringify(env) + ');}');
