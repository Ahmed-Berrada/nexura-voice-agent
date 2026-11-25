// Test local (node tests/test-scoring.js) : charge Config.gs + Scoring.gs et vérifie la grille.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const ctx = {}; vm.createContext(ctx);
['Config.gs', 'Scoring.gs'].forEach(f => vm.runInContext(fs.readFileSync(__dirname + '/../apps-script/' + f, 'utf8'), ctx));
const s = (q, size) => ctx.scoreLead_(q, size);

// Cas du sujet : décideur, < 1 mois, budget, PME => SQL 100
let r = s({ authority_level: 'Directeur IT (décideur)', timeline: '< 1 mois', budget_confirmed: true }, 50);
assert.strictEqual(r.status, 'SQL'); assert.strictEqual(r.score, 100);

// Micro-entreprise => Nurturing même avec bon score
r = s({ authority_level: 'CEO décideur', timeline: '< 1 mois', budget_confirmed: true }, 2);
assert.strictEqual(r.status, 'Nurturing');

// Pas de budget, utilisateur, délai long => Nurturing, score faible
r = s({ authority_level: 'utilisateur', timeline: '> 6 mois', budget_confirmed: false }, 30);
assert.strictEqual(r.status, 'Nurturing'); assert.ok(r.score < 40);

// "non décideur" ne doit pas compter comme décideur (30) mais comme influenceur (18)
r = s({ authority_level: 'Responsable IT, non décideur', timeline: '< 1 mois', budget_confirmed: true }, 50);
assert.strictEqual(r.score, 88); // 18 + 30 + 25 + 15

// "12 mois" / "> 6 mois" => 0 point de délai
assert.strictEqual(s({ authority_level: 'x', timeline: '12 mois', budget_confirmed: false }, 50).score, 15);
assert.strictEqual(s({ authority_level: 'x', timeline: '> 6 mois', budget_confirmed: false }, 50).score, 15);
assert.strictEqual(s({ authority_level: 'x', timeline: '1-3 mois', budget_confirmed: false }, 50).score, 33);

// Payload vide ne plante pas
r = s({}, undefined); assert.strictEqual(r.status, 'Nurturing');

console.log('OK : tous les tests de scoring passent');
