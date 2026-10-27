// Χτίζει το αυτόνομο HTML: node build.js <ΠΑΡΑΜΕΤΡΟΙ.xlsx> [έξοδος.html]
const fs = require('fs'), path = require('path');
globalThis.XLSX = require('xlsx');
require('./engine.js');
const E = globalThis.PanduitEngine;
const paramsFile = process.argv[2];
const out = process.argv[3] || path.join(__dirname, 'dist', 'Panduit_Τιμές.html');
if (!paramsFile) { console.error('Χρήση: node build.js <ΠΑΡΑΜΕΤΡΟΙ.xlsx> [έξοδος.html]'); process.exit(1); }
const P = E.parseParams(XLSX.read(fs.readFileSync(paramsFile), { type: 'buffer' }));
if (P.warnings.length) { console.error('Προειδοποιήσεις παραμέτρων:\n' + P.warnings.join('\n')); process.exit(1); }
P.warnings = [];
const ver = path.basename(paramsFile).replace(/\.xlsx$/i, '');
const safe = s => s.replace(/<\/script/gi, '<\\/script');
const lib = f => safe(fs.readFileSync(require.resolve(f), 'utf8'));
let html = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const put = (tag, val) => { html = html.split(tag).join(val); };
put('/*LIB_XLSX*/', lib('xlsx/dist/xlsx.core.min.js'));
put('/*LIB_JSZIP*/', lib('jszip/dist/jszip.min.js'));
put('/*ENGINE*/', safe(fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8')));
put('/*PARAMS*/null', safe(JSON.stringify(P)));
put("/*PVER*/''", JSON.stringify(ver));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(out, (html.length / 1024).toFixed(0) + ' KB');
