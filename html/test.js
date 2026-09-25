// Έλεγχος χωρίς browser: node test.js <SAP.xlsx> <SPA.xlsm> <Κατάλογος.xlsx> [ΠΑΡΑΜΕΤΡΟΙ.xlsx]
const fs = require('fs');
globalThis.XLSX = require('xlsx'); globalThis.JSZip = require('jszip');
require('./engine.js');
const E = globalThis.PanduitEngine, X = globalThis.XLSX;
const [sapF, spaF, catF, parF = __dirname + '/params/ΠΑΡΑΜΕΤΡΟΙ_v4.xlsx'] = process.argv.slice(2);
if (!catF) { console.error('Χρήση: node test.js <SAP.xlsx> <SPA.xlsm> <Κατάλογος.xlsx> [ΠΑΡΑΜΕΤΡΟΙ.xlsx]'); process.exit(1); }
(async () => {
  const buf = fs.readFileSync(sapF), wb = X.read(buf, { type: 'buffer' });
  const sap = E.parseSap(wb);
  const P = E.parseParams(X.read(fs.readFileSync(parF), { type: 'buffer' }));
  const res = E.run(sap, E.parseSpa(X.read(fs.readFileSync(spaF), { type: 'buffer' })), E.parseCatalog(X.read(fs.readFileSync(catF), { type: 'buffer' })), P);
  const tests = E.selfTests();
  const ch = res.rows.filter(r => r.newPrice !== r.oldPrice || r.newZ !== r.oldZ).map(r => ({ row: r.row, price: r.newPrice, za1: r.newZ }));
  const out = await E.patchXlsx(buf, sap.sheetName, sap.priceCol, sap.za1Col, ch);
  const probs = E.integrity(wb, X.read(out, { type: 'buffer' }), sap.sheetName, sap.priceCol, sap.za1Col, sap.headerRow);
  const bad = tests.filter(t => !t.ok).length + probs.length + P.warnings.length;
  console.log(`γραμμές ${res.rows.length} · άλλαξαν ${ch.length} · ΓΙΑ_ΕΛΕΓΧΟ ${res.rows.filter(r => r.review).length} · τεστ ${tests.every(t => t.ok) ? 'ΠΕΡΝΑ' : 'ΑΠΟΤΥΓΧΑΝΕΙ'} · ακεραιότητα ${probs.length ? probs.join(',') : 'ΠΕΡΝΑ'}`);
  if (P.warnings.length) console.log(P.warnings.join('\n'));
  process.exit(bad ? 1 : 0);
})();
