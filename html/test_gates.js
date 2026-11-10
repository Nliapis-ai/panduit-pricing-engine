// Συνθετικά τεστ για τις δικλείδες Δ5 (επέκταση) και Δ8: node test_gates.js
// Δεν χρειάζονται αρχεία εισόδου εκτός από το ΠΑΡΑΜΕΤΡΟΙ_v6.xlsx του repo.
const fs = require('fs'), assert = require('assert');
globalThis.XLSX = require('xlsx'); globalThis.JSZip = require('jszip');
require('./engine.js');
const E = globalThis.PanduitEngine, X = globalThis.XLSX;
const P = E.parseParams(X.read(fs.readFileSync(__dirname + '/params/ΠΑΡΑΜΕΤΡΟΙ_v6.xlsx'), { type: 'buffer' }));

const cat = (msrp, pc, extra = {}) => ({ cn: '', mr: null, uom: 'PC', nuom: 1, msrp, inner: 1, inc: 1, status: 'ACTIVE', pc: [pc, '', ''], sd: '', ...extra });
const sapRow = (row, pn, desc, oldPrice, oldZ) => ({ row, mat: String(1000 + row), pn, desc, base: 'PC', P: 1, oldPrice, oldZ });
const catalog = {
  items: new Map([
    ['E36F13L', cat(4204.61, 'IM1A')],      // PDU, SPA υπάρχει, παλιό Z.A1 -58 (αναφορά 15/10/2026)
    ['P32F10G', cat(3691.09, 'IM1A')],      // PDU, χωρίς SPA, παλιό Z.A1 -58 → ΔΕΝ είναι «χαμένο SPA»
    ['RK-SMALL', cat(100, 'IM1A')],         // rack με SPA, μικρή μεταβολή → όχι Δ5
    ['XYZ1', cat(100, 'IM1A')],             // κανονικό υλικό, παλιά καθαρή τιμή, πάει MSRP με ανατίμηση (παλιά Δ5)
  ]),
  disc: new Map([['IM1A', 0.36]]), hasDiscountSheet: true,
};
const sap = {
  rows: [
    sapRow(2, 'E36F13L', 'RACK PDU 32A 3Φ 18C13/15', 4204.61, -58),
    sapRow(3, 'P32F10G', 'RACK PDU KAΘETO 32A 1PH', 3583.58, -58),
    sapRow(4, 'RK-SMALL', 'RACK ΜΙΚΡΟ', 100, -30),
    sapRow(5, 'XYZ1', 'ΥΛΙΚΟ ΓΕΝΙΚΟ', 40, 0),
  ],
};
const spa = [
  { pn: 'E36F13L', cust: 'FORTHNET SA', net: 1789.3 },
  { pn: 'RK-SMALL', cust: 'ΠΕΛΑΤΗΣ Α', net: 60 },
  { pn: 'PLD08BL', cust: 'FORTHNET SA', net: 146.48 },   // δεν υπάρχει στο SAP
];

const res = E.run(sap, spa, catalog, P);
const by = pn => res.rows.find(r => r.pn === pn);

// 1. Το E36F13L μένει MSRP (απόφαση Νίκου) και μπαίνει στη λίστα ελέγχου Δ5, με το SPA που αγνοήθηκε
assert.strictEqual(by('E36F13L').source, 'MSRP');
assert.strictEqual(by('E36F13L').newPrice, 4204.61);
assert.strictEqual(by('E36F13L').newZ, -36);
assert.ok(by('E36F13L').flags.includes('Δ5 SPA→MSRP'), 'E36F13L πρέπει να έχει Δ5');
assert.strictEqual(by('E36F13L').spaIgnored.price, 1789.3);
// 2. Χωρίς SPA και με παλιό Z.A1 ≠ 0 δεν σημαίνεται (δεν ξέρουμε ότι χάθηκε SPA)
assert.ok(!by('P32F10G').flags.includes('Δ5 SPA→MSRP'), 'P32F10G χωρίς SPA δεν πρέπει να έχει Δ5');
// 3. Μικρή μεταβολή με SPA δεν σημαίνεται
assert.ok(!by('RK-SMALL').flags.includes('Δ5 SPA→MSRP'), 'RK-SMALL κάτω από το όριο');
// 4. Η παλιά Δ5 (παλιά καθαρή τιμή, Z.A1 = 0) συνεχίζει να δουλεύει
assert.ok(by('XYZ1').flags.includes('Δ5 SPA→MSRP'), 'XYZ1 παλιά Δ5');
// 5. Δ8: SPA κωδικός που δεν υπάρχει στο SAP
assert.deepStrictEqual(res.spaNotInSap.map(x => x.pn), ['PLD08BL']);
assert.strictEqual(res.spaNotInSap[0].price, 146.48);
console.log('test_gates: ΠΕΡΝΑ');
