// node add_reels.js <ΠΑΡΑΜΕΤΡΟΙ_vN.xlsx> <out.xlsx> <batch1.tsv> <batch2.tsv> ...
const fs = require('fs');
const XLSX = require('xlsx');

const [, , inFile, outFile, ...batches] = process.argv;
if (!inFile || !outFile || !batches.length) {
  console.error('χρήση: node add_reels.js <in.xlsx> <out.xlsx> <batch1.tsv> [batch2.tsv ...]');
  process.exit(1);
}

function readTsv(path) {
  const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/).filter(l => l.trim());
  const rows = lines.slice(1).map(l => l.split('\t'));
  return rows.map(([pn, desc, metres, source]) => [pn.trim(), desc.trim(), Number(String(metres).replace(',', '.')), source.trim()]);
}

const wb = XLSX.readFile(inFile);
const SHEET = 'ΣΤΡΟΦΕΙΑ';
const ws = wb.Sheets[SHEET];
if (!ws) { console.error(`Δεν βρέθηκε το φύλλο ${SHEET}`); process.exit(1); }

const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
// row 0 = help text, row 1 = headers, rows 2+ = data
const existing = new Set(aoa.slice(2).filter(r => r && r[0]).map(r => String(r[0]).trim().toUpperCase()));

let added = 0, skipped = 0;
for (const batch of batches) {
  for (const row of readTsv(batch)) {
    const key = row[0].toUpperCase();
    if (existing.has(key)) { skipped++; continue; }
    aoa.push(row);
    existing.add(key);
    added++;
  }
}

const newWs = XLSX.utils.aoa_to_sheet(aoa);
newWs['!cols'] = ws['!cols'];
wb.Sheets[SHEET] = newWs;

XLSX.writeFile(wb, outFile);
console.log(`ΣΤΡΟΦΕΙΑ: πριν ${aoa.length - added - 2}, προστέθηκαν ${added}, παραλείφθηκαν (ήδη υπήρχαν) ${skipped}, μετά ${aoa.length - 2}`);
