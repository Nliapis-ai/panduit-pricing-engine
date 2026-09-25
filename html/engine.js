/* Panduit pricing engine · RULES V3.2
 * Pure functions. Needs XLSX (SheetJS) and JSZip on the global scope (browser) or passed in (node).
 * Only "Αρχική τιμή" and "Z.A1 Τιμ. %" are ever written to the SAP file.
 */
(function (root) {
  'use strict';

  // ---------- text helpers ----------
  const LAT2GR = { A: 'Α', B: 'Β', E: 'Ε', Z: 'Ζ', H: 'Η', I: 'Ι', K: 'Κ', M: 'Μ', N: 'Ν', O: 'Ο', P: 'Ρ', T: 'Τ', Y: 'Υ', X: 'Χ' };
  const gr = s => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[ABEZHIKMNOPTYX]/g, c => LAT2GR[c]);
  const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const key = s => norm(s).toUpperCase();
  const num = v => {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return v;
    const t = String(v).trim().replace(/\s/g, '');
    if (!t) return null;
    const n = Number(/,\d+$/.test(t) && !/\.\d+,/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  };
  const round = x => {
    const d = Math.abs(x) < 1 ? 4 : 2, f = Math.pow(10, d);
    return Math.round((x + Math.sign(x) * Number.EPSILON * 10) * f) / f;
  };
  const fmt = x => (x == null ? '' : String(x).replace('.', ','));

  // ---------- default settings (ΡΥΘΜΙΣΕΙΣ) ----------
  const DEFAULT_SETTINGS = {
    'SPA_ΑΠΟΚΛΕΙΣΜΟΣ': 'INTERXION',
    'NMM_CUSTOMER': 'NETKEY MID MARKET',
    'ΜΗΚΗ_SPA': '0,5;1;2;3;5',
    'ΧΡΩΜΑΤΑ': 'ΜΠΛΕ;ΠΡΑΣ;ΚΟΚΚ;ΚΙΤΡ;ΜΑΥΡ;ΠΟΡΤΟΚ;ΒΙΟΛ;ΡΟΖ',
    'ΛΕΞΕΙΣ_ΑΚΡΟΔΕΚΤΗ': 'ΑΚΡΟΔΕΚΤΗΣ;ΚΩΣ ΠΡΕΣΑΣ',
    'ΟΡΙΟ_ΠΑΝΩ': '5',
    'ΟΡΙΟ_ΚΑΤΩ': '0,2',
    'ΚΟΣΤΟΣ_ΠΑΝΩ': '1,25',
  };
  const SETTINGS_HELP = {
    'SPA_ΑΠΟΚΛΕΙΣΜΟΣ': 'SPA customers που αγνοούνται (αρχή ονόματος, χωρισμένα με ;)',
    'NMM_CUSTOMER': 'Κείμενο στο όνομα customer που κάνει την SPA «NETKEY MID MARKET» (κανόνας 1)',
    'ΜΗΚΗ_SPA': 'Μήκη (m) λευκού/γκρι/μωβ patch cord που παίρνουν SPA (κανόνας 4)',
    'ΧΡΩΜΑΤΑ': 'Ρίζες χρωμάτων για τον κανόνα 3. ΛΕΥΚΟ, ΓΚΡΙ, ΜΩΒ ΔΕΝ είναι χρώματα',
    'ΛΕΞΕΙΣ_ΑΚΡΟΔΕΚΤΗ': 'Λέξεις περιγραφής για ακροδέκτες (κανόνας 2, πάντα MSRP, πάντα ανά τεμάχιο)',
    'ΟΡΙΟ_ΠΑΝΩ': 'Δ1: καθαρό νέο ÷ παλιό ≥ αυτό → δεν γράφεται, ΓΙΑ_ΕΛΕΓΧΟ',
    'ΟΡΙΟ_ΚΑΤΩ': 'Δ1: καθαρό νέο ÷ παλιό ≤ αυτό → δεν γράφεται, ΓΙΑ_ΕΛΕΓΧΟ',
    'ΚΟΣΤΟΣ_ΠΑΝΩ': 'Δ5: SPA → MSRP με καθαρό ↑ ≥ αυτό → λίστα SPA→MSRP_ΚΟΣΤΟΣ',
  };
  const splitList = s => String(s || '').split(';').map(x => x.trim()).filter(Boolean);

  // ---------- sheet helpers ----------
  function rows(ws) {
    return root.XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true });
  }
  function findHeader(aoa, must, maxRow) {
    for (let r = 0; r < Math.min(aoa.length, maxRow || 30); r++) {
      const hs = (aoa[r] || []).map(key);
      if (must.every(m => hs.includes(key(m)))) return r;
    }
    return -1;
  }
  function colMap(headerRow) {
    const m = {};
    (headerRow || []).forEach((h, i) => { const k = key(h); if (k && !(k in m)) m[k] = i; });
    return m;
  }
  function need(cm, names, where) {
    const out = {};
    const missing = [];
    for (const [alias, name] of Object.entries(names)) {
      const i = cm[key(name)];
      if (i == null) missing.push(name); else out[alias] = i;
    }
    if (missing.length) {
      const e = new Error(`${where}: δεν βρέθηκαν τα headers ${missing.map(x => '«' + x + '»').join(', ')}. Βρέθηκαν: ${Object.keys(cm).join(' | ')}`);
      e.userFacing = true; throw e;
    }
    return out;
  }
  function sheetByName(wb, names) {
    for (const n of names) { const hit = wb.SheetNames.find(s => key(s) === key(n)); if (hit) return wb.Sheets[hit]; }
    return null;
  }

  // ---------- parsers ----------
  const SAP_H = {
    mat: 'Αρ.Εξαρτ.Κατασκευαστή', pn: 'Αριθμός Υλικού Προμηθ.', desc: 'Περιγραφή Υλικού',
    base: 'Βασική Μον.Μέτρησης', p: 'Τιμή υπολογισμένη ανά', price: 'Αρχική τιμή', za1: 'Z.A1 Τιμ. %',
  };
  function parseSap(wb) {
    let ws = sheetByName(wb, ['SAP PRICELIST']);
    let name = ws ? wb.SheetNames.find(s => key(s) === 'SAP PRICELIST') : null;
    if (!ws) {
      name = wb.SheetNames.find(s => findHeader(rows(wb.Sheets[s]), [SAP_H.price, SAP_H.pn], 5) >= 0);
      ws = name ? wb.Sheets[name] : null;
    }
    if (!ws) { const e = new Error('Αρχείο SAP: δεν βρέθηκε φύλλο με «Αρχική τιμή» και «Αριθμός Υλικού Προμηθ.».'); e.userFacing = true; throw e; }
    const aoa = rows(ws);
    const h = findHeader(aoa, [SAP_H.price, SAP_H.pn], 5);
    const c = need(colMap(aoa[h]), SAP_H, 'Αρχείο SAP');
    // Το SAP export έχει headers μετατοπισμένα κατά μία στήλη (Προμηθευτής = κωδικός + όνομα).
    // Επιλέγουμε τη στήλη από τα ΔΕΔΟΜΕΝΑ: περιγραφή = κείμενο με κενά ≠ Part Number, βάση = σύντομος κωδικός μονάδας.
    const body = aoa.slice(h + 1).filter(a => a && norm(a[c.pn])).slice(0, 400);
    const score = (col, test) => body.reduce((n, a) => n + (test(a[col], a) ? 1 : 0), 0);
    const isDesc = (v, a) => { const t = norm(v); return t.length > 3 && /\s/.test(t) && t !== norm(a[c.pn]); };
    const isBase = v => /^[A-ZΑ-Ω]{1,3}$/.test(norm(v).toUpperCase());
    const shift = [];
    const dCands = [c.desc, c.desc + 1, c.desc - 1].filter(i => i >= 0);
    const dBest = dCands.reduce((b, i) => score(i, isDesc) > score(b, isDesc) ? i : b, c.desc);
    if (dBest !== c.desc) shift.push(`Περιγραφή: στήλη ${colLetter(dBest)} (το header «Περιγραφή Υλικού» είναι στη ${colLetter(c.desc)})`);
    c.desc = dBest;
    const bCands = [c.base, c.base + 1, c.base - 1].filter(i => i >= 0 && i !== c.desc);
    const bBest = bCands.reduce((b, i) => score(i, isBase) > score(b, isBase) ? i : b, bCands[0]);
    if (bBest !== c.base) shift.push(`Βασική μονάδα: στήλη ${colLetter(bBest)} (το header είναι στη ${colLetter(c.base)})`);
    c.base = bBest;
    const list = [];
    for (let r = h + 1; r < aoa.length; r++) {
      const a = aoa[r] || [];
      const pn = norm(a[c.pn]);
      if (!pn) continue;
      list.push({
        row: r + 1, mat: norm(a[c.mat]), pn, desc: norm(a[c.desc]), base: norm(a[c.base]),
        P: num(a[c.p]) || 1, oldPrice: num(a[c.price]), oldZ: num(a[c.za1]) || 0,
      });
    }
    return { sheetName: name, headerRow: h + 1, priceCol: c.price, za1Col: c.za1, rows: list, shift, cols: c };
  }

  function parseSpa(wb) {
    const ws = sheetByName(wb, ['CONNECTIVITY']) || wb.Sheets[wb.SheetNames[0]];
    const aoa = rows(ws);
    const h = findHeader(aoa, ['SPA CUSTOMER', 'NET PRICE', 'PART NUMBER'], 20);
    if (h < 0) { const e = new Error('Αρχείο SPA: δεν βρέθηκαν τα headers «SPA CUSTOMER», «NET PRICE», «PART NUMBER» (φύλλο CONNECTIVITY).'); e.userFacing = true; throw e; }
    const c = need(colMap(aoa[h]), { cust: 'SPA CUSTOMER', net: 'NET PRICE', pn: 'PART NUMBER' }, 'Αρχείο SPA');
    const out = [];
    for (let r = h + 1; r < aoa.length; r++) {
      const a = aoa[r] || [];
      const pn = norm(a[c.pn]), net = num(a[c.net]);
      if (pn && net != null) out.push({ pn, cust: norm(a[c.cust]), net });
    }
    return out;
  }

  const CAT_H = {
    cn: 'Catalog Number', mr: 'Meters/Reel', uom: 'Prc. UOM', nuom: 'Numeric Prc. UOM', msrp: 'MSRP',
    inner: 'Inner (PKG)', inc: 'Minimum Order Increment', status: 'Status',
    pc1: 'Pricing Category 1', pc2: 'Pricing Category 2', pc3: 'Pricing Category 3', sd: 'Short Description',
  };
  function parseCatalog(wb) {
    const ws = sheetByName(wb, ['English']) || wb.Sheets[wb.SheetNames[0]];
    const aoa = rows(ws);
    const h = findHeader(aoa, ['Catalog Number', 'MSRP'], 30);
    if (h < 0) { const e = new Error('Κατάλογος: δεν βρέθηκε γραμμή headers με «Catalog Number» και «MSRP» (φύλλο English).'); e.userFacing = true; throw e; }
    const c = need(colMap(aoa[h]), CAT_H, 'Κατάλογος');
    const items = new Map();
    for (let r = h + 1; r < aoa.length; r++) {
      const a = aoa[r] || [];
      const cn = norm(a[c.cn]);
      if (!cn || items.has(cn)) continue;
      items.set(cn, {
        cn, mr: num(a[c.mr]), uom: norm(a[c.uom]).toUpperCase(), nuom: num(a[c.nuom]) || 1, msrp: num(a[c.msrp]),
        inner: num(a[c.inner]) || 1, inc: num(a[c.inc]) || 1, status: norm(a[c.status]),
        pc: [norm(a[c.pc1]), norm(a[c.pc2]), norm(a[c.pc3])], sd: norm(a[c.sd]),
      });
    }
    const disc = new Map();
    const ds = sheetByName(wb, ['Discount Structure']);
    if (ds) {
      const da = rows(ds);
      const dh = findHeader(da, ['PRICING CATEGORY', 'DISCOUNT'], 20);
      if (dh >= 0) {
        const dc = colMap(da[dh]);
        for (let r = dh + 1; r < da.length; r++) {
          const a = da[r] || [];
          const cat = norm(a[dc['PRICING CATEGORY']]);
          if (!cat) continue;
          const d = a[dc['DISCOUNT']];
          for (const part of cat.split(' , ')) disc.set(part.split(' - ')[0].trim(), typeof d === 'number' ? d : norm(d));
        }
      }
    }
    return { items, disc, hasDiscountSheet: !!ds };
  }

  // ---------- parameters ----------
  const PARAM_SHEETS = {
    'ΠΑΚΕΤΑ': { cols: ['Part Number', 'Περιγραφή', 'Prc.UOM', 'Κουτί (Inner)', 'ΠΑΚΕΤΟ ή ΤΕΜΑΧΙΟ;', 'Πηγή'],
      help: 'Πόσα τεμάχια έχει 1 PC του SAP. ΠΑΚΕΤΟ → πακέτο = Κουτί (Inner). ΤΕΜΑΧΙΟ → πακέτο = 1. Υπερισχύει κάθε αυτόματης ανίχνευσης. Εδώ γράφεις τις απαντήσεις του ΓΙΑ_ΕΛΕΓΧΟ (ΤΕΜ/ΚΟΥΤΙ).' },
    'ΣΤΡΟΦΕΙΑ': { cols: ['Part Number', 'Περιγραφή', 'Μήκος (m)', 'Πηγή'],
      help: 'Μήκος στροφείου. Χρειάζεται μόνο όταν Prc.UOM = RL και SAP βάση = Μ. Σειρά: αυτό το φύλλο → Meters/Reel καταλόγου. Αν λείπουν και τα δύο: κράτηση παλιάς τιμής, ΓΙΑ_ΕΛΕΓΧΟ.' },
    'EOL_ΕΠΙΒΕΒΑΙΩΜΕΝΑ': { cols: ['Part Number', 'Λόγος', 'Πηγή'],
      help: 'Καταργημένοι κωδικοί. Κρατούν παλιά τιμή και Z.A1, δεν υπολογίζονται.' },
    'OVERRIDES': { cols: ['Part Number', 'Περιγραφή', 'Τι επιβάλλουμε', 'Γιατί', 'Πηγή'],
      help: 'Υπερισχύουν των πάντων. «Τι επιβάλλουμε» καταλαβαίνει: «πακέτο = N», «μονάδα = N», «ΑΠΟΔΟΧΗ ΑΠΟΚΛΙΣΗΣ» (περνά τη Δ1). Μπορείς να γράψεις πολλά χωρισμένα με ;' },
    'ΜΟΝΑΔΑ_SPA': { cols: ['Part Number', 'Διαιρέτης', 'Γιατί', 'Πηγή'],
      help: 'Διαιρέτης για SPA κωδικών που ΔΕΝ είναι στον κατάλογο (π.χ. 1000 = SPA ανά 1000m). Χωρίς εγγραφή → ΓΙΑ_ΕΛΕΓΧΟ.' },
    'ΕΚΠΤΩΣΕΙΣ': { cols: ['Κατηγορία', 'Z.A1', 'Πηγή'],
      help: 'Z.A1 για Pricing Category που λείπει από το φύλλο Discount Structure του καταλόγου (π.χ. TL5 → −58).' },
    'ΤΙΜΕΣ_PORTAL': { cols: ['Part Number', 'MSRP portal', 'ανά (μονάδα)', 'Z.A1', 'Πηγή'],
      help: 'Τιμές από το Stock & Price Check για κωδικούς ΕΚΤΟΣ καταλόγου χωρίς SPA. Νέα τιμή = MSRP portal ÷ μονάδα × P. Z.A1 κενό = −58. Ισχύουν μόνο αν ο κωδικός λείπει από τον κατάλογο.' },
    'ΡΥΘΜΙΣΕΙΣ': { cols: ['Κλειδί', 'Τιμή', 'Τι σημαίνει'],
      help: 'Σταθερές των κανόνων που αλλάζουν χωρίς νέο HTML.' },
  };

  function parseParams(wb) {
    const P = { pack: {}, reel: {}, eol: {}, over: {}, spaUnit: {}, disc: {}, portal: {}, settings: { ...DEFAULT_SETTINGS }, warnings: [] };
    const get = (name) => {
      const ws = sheetByName(wb, [name]);
      if (!ws) return null;
      const aoa = rows(ws);
      const h = findHeader(aoa, [PARAM_SHEETS[name].cols[0]], 5);
      if (h < 0) return null;
      const cm = colMap(aoa[h]);
      return aoa.slice(h + 1).filter(a => a && norm(a[0])).map(a => {
        const o = {}; for (const [k, i] of Object.entries(cm)) o[k] = a[i]; return o;
      });
    };
    const K = s => key(s);
    for (const r of get('ΠΑΚΕΤΑ') || []) {
      const ans = gr(norm(r[K('ΠΑΚΕΤΟ ή ΤΕΜΑΧΙΟ;')]));
      const pn = norm(r[K('Part Number')]);
      if (/^(ΡΑΚ|ΠΑΚ|ΚΟΥΤ|ΚΟΥΤΙ)/.test(ans)) P.pack[pn] = { box: true, inner: num(r[K('Κουτί (Inner)')]), uom: norm(r[K('Prc.UOM')]), desc: norm(r[K('Περιγραφή')]), src: norm(r[K('Πηγή')]) };
      else if (/^(ΤΕΜ)/.test(ans)) P.pack[pn] = { box: false, inner: num(r[K('Κουτί (Inner)')]), uom: norm(r[K('Prc.UOM')]), desc: norm(r[K('Περιγραφή')]), src: norm(r[K('Πηγή')]) };
      else if (ans) P.warnings.push(`ΠΑΚΕΤΑ ${pn}: άγνωστη απάντηση «${ans}» (θέλει ΠΑΚΕΤΟ ή ΤΕΜΑΧΙΟ)`);
    }
    for (const r of get('ΣΤΡΟΦΕΙΑ') || []) { const L = num(r[K('Μήκος (m)')]); if (L) P.reel[norm(r[K('Part Number')])] = { len: L, desc: norm(r[K('Περιγραφή')]), src: norm(r[K('Πηγή')]) }; }
    for (const r of get('EOL_ΕΠΙΒΕΒΑΙΩΜΕΝΑ') || []) P.eol[norm(r[K('Part Number')])] = { why: norm(r[K('Λόγος')]), src: norm(r[K('Πηγή')]) };
    for (const r of get('OVERRIDES') || []) {
      const pn = norm(r[K('Part Number')]), t = norm(r[K('Τι επιβάλλουμε')]);
      const o = { text: t, desc: norm(r[K('Περιγραφή')]), why: norm(r[K('Γιατί')]), src: norm(r[K('Πηγή')]) };
      const g = gr(t);
      let hit = false;
      let m1 = g.match(/ΡΑΚΕΤΟ\s*=\s*(\d+)|ΠΑΚΕΤΟ\s*=\s*(\d+)/); if (m1) { o.pack = Number(m1[1] || m1[2]); hit = true; }
      let m2 = g.match(/ΜΟΝΑΔΑ\s*=\s*(\d+)/); if (m2) { o.unit = Number(m2[1]); hit = true; }
      if (/ΑΡΟΔΟΧΗ|ΑΠΟΔΟΧΗ/.test(g)) { o.accept = true; hit = true; }
      if (!hit) P.warnings.push(`OVERRIDES ${pn}: δεν καταλαβαίνω «${t}» (δεκτά: πακέτο = N · μονάδα = N · ΑΠΟΔΟΧΗ ΑΠΟΚΛΙΣΗΣ)`);
      P.over[pn] = Object.assign(P.over[pn] || {}, o);
    }
    for (const r of get('ΜΟΝΑΔΑ_SPA') || []) { const d = num(r[K('Διαιρέτης')]); if (d) P.spaUnit[norm(r[K('Part Number')])] = { div: d, why: norm(r[K('Γιατί')]), src: norm(r[K('Πηγή')]) }; }
    for (const r of get('ΕΚΠΤΩΣΕΙΣ') || []) { const z = num(r[K('Z.A1')]); if (z != null) P.disc[norm(r[K('Κατηγορία')])] = { za1: z, src: norm(r[K('Πηγή')]) }; }
    for (const r of get('ΤΙΜΕΣ_PORTAL') || []) { const v = num(r[K('MSRP portal')]); if (v) P.portal[norm(r[K('Part Number')])] = { msrp: v, div: num(r[K('ανά (μονάδα)')]) || 1, za1: num(r[K('Z.A1')]), src: norm(r[K('Πηγή')]) }; }
    for (const r of get('ΡΥΘΜΙΣΕΙΣ') || []) { const k = norm(r[K('Κλειδί')]); if (k in DEFAULT_SETTINGS) P.settings[k] = norm(r[K('Τιμή')]); else if (k) P.warnings.push(`ΡΥΘΜΙΣΕΙΣ: άγνωστο κλειδί «${k}»`); }
    return P;
  }

  function paramsToWorkbook(P) {
    const XLSX = root.XLSX, wb = XLSX.utils.book_new();
    const add = (name, data) => {
      const s = PARAM_SHEETS[name];
      const ws = XLSX.utils.aoa_to_sheet([[s.help], s.cols, ...data]);
      ws['!cols'] = s.cols.map((c, i) => ({ wch: i === 0 ? 18 : Math.max(14, c.length + 4) }));
      XLSX.utils.book_append_sheet(wb, ws, name);
    };
    add('ΠΑΚΕΤΑ', Object.entries(P.pack).map(([pn, v]) => [pn, v.desc, v.uom, v.inner, v.box ? 'ΠΑΚΕΤΟ' : 'ΤΕΜΑΧΙΟ', v.src]));
    add('ΣΤΡΟΦΕΙΑ', Object.entries(P.reel).map(([pn, v]) => [pn, v.desc, v.len, v.src]));
    add('EOL_ΕΠΙΒΕΒΑΙΩΜΕΝΑ', Object.entries(P.eol).map(([pn, v]) => [pn, v.why, v.src]));
    add('OVERRIDES', Object.entries(P.over).map(([pn, v]) => [pn, v.desc, v.text, v.why, v.src]));
    add('ΜΟΝΑΔΑ_SPA', Object.entries(P.spaUnit).map(([pn, v]) => [pn, v.div, v.why, v.src]));
    add('ΕΚΠΤΩΣΕΙΣ', Object.entries(P.disc).map(([c, v]) => [c, v.za1, v.src]));
    add('ΤΙΜΕΣ_PORTAL', Object.entries(P.portal).map(([pn, v]) => [pn, v.msrp, v.div, v.za1, v.src]));
    add('ΡΥΘΜΙΣΕΙΣ', Object.keys(DEFAULT_SETTINGS).map(k => [k, P.settings[k], SETTINGS_HELP[k]]));
    return wb;
  }

  // ---------- rules ----------
  function spaTable(spaRows, S) {
    const excl = splitList(S['SPA_ΑΠΟΚΛΕΙΣΜΟΣ']).map(key);
    const nmmKey = key(S['NMM_CUSTOMER']);
    const by = new Map();
    let excluded = 0;
    for (const r of spaRows) {
      if (excl.some(x => key(r.cust).startsWith(x))) { excluded++; continue; }
      if (!by.has(r.pn)) by.set(r.pn, []);
      by.get(r.pn).push(r);
    }
    const out = new Map();
    for (const [pn, list] of by) {
      const nmm = list.filter(r => key(r.cust).includes(nmmKey));
      if (nmm.length) { out.set(pn, { price: Math.max(...nmm.map(r => r.net)), kind: 'NMM', n: nmm.length, cust: nmm[0].cust }); continue; }
      const v = list.map(r => r.net).sort((a, b) => b - a);
      const price = v.length >= 3 ? v[1] : v[0];
      out.set(pn, { price, kind: 'SPA', n: v.length, rule: v.length === 1 ? 'μία τιμή' : v.length === 2 ? 'η μεγαλύτερη από 2' : `η 2η μεγαλύτερη από ${v.length}`, cust: list.find(r => r.net === price).cust });
    }
    return { map: out, excluded };
  }

  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const CORD_RE = new RegExp('^(' + ['P CORD', 'P.CORD', 'P. CORD', 'PATCH CORD'].map(x => reEsc(gr(x))).join('|') + ')');
  const PACK_RE = [/(\d+)\s*ΤΕΜ/, /(\d+)\s*ΤΜΧ/, /ΣΥΣ\.?Κ?\.?\s*(\d+)/, /\((\d+)\s*Τ/, /(\d+)\s*ΤΕ$/, /(\d+)\s*ΤΜ$/, /(\d+)\s*Τ$/];
  function descPack(desc) {
    const d = gr(desc);
    for (const re of PACK_RE) { const m = d.match(re); if (m && Number(m[1]) > 1) return Number(m[1]); }
    return 1;
  }
  function cordLength(desc) {
    const m = gr(desc).match(/(\d+(?:[,.]\d+)?)\s*Μ(?![Α-ΩA-Z])/);
    return m ? Number(m[1].replace(',', '.')) : null;
  }

  function discountFor(cat, catalog, P) {
    if (!cat) return null;
    for (const pc of cat.pc) {
      if (!pc) continue;
      const d = catalog.disc.get(pc);
      if (typeof d === 'number') return { za1: -Math.round(d * 100), cat: pc, from: 'Discount Structure' };
    }
    for (const pc of cat.pc) if (pc && P.disc[pc]) return { za1: P.disc[pc].za1, cat: pc, from: 'ΕΚΠΤΩΣΕΙΣ' };
    return { za1: null, cat: cat.pc.filter(Boolean).join('/') };
  }

  function run(sap, spaRows, catalog, P) {
    const S = P.settings;
    const HI = num(S['ΟΡΙΟ_ΠΑΝΩ']), LO = num(S['ΟΡΙΟ_ΚΑΤΩ']), UP = num(S['ΚΟΣΤΟΣ_ΠΑΝΩ']);
    const lengths = splitList(S['ΜΗΚΗ_SPA']).map(num);
    const colours = splitList(S['ΧΡΩΜΑΤΑ']).map(gr);
    const termWords = splitList(S['ΛΕΞΕΙΣ_ΑΚΡΟΔΕΚΤΗ']).map(gr);
    const spa = spaTable(spaRows, S);
    const SPA = spa.map;

    // JACK BL/AW pairs
    const jackPair = new Map();
    for (const r of sap.rows) {
      if (!gr(r.desc).includes(gr('JACK')) || !r.pn.endsWith('BL')) continue;
      const aw = r.pn.slice(0, -2) + 'AW';
      const a = SPA.get(r.pn), b = SPA.get(aw);
      if (a && b && a.kind !== 'NMM' && b.kind !== 'NMM') { const mx = Math.max(a.price, b.price); jackPair.set(r.pn, mx); jackPair.set(aw, mx); }
    }

    const res = [];
    const pnCount = {};
    sap.rows.forEach(r => { pnCount[r.pn] = (pnCount[r.pn] || 0) + 1; });

    for (const r of sap.rows) {
      const d = gr(r.desc);
      const o = { ...r, newPrice: r.oldPrice, newZ: r.oldZ, source: 'EOL', how: '', flags: [], review: null, cands: null };
      const cat = catalog.items.get(r.pn);
      const ov = P.over[r.pn] || {};
      const sp = SPA.get(r.pn);
      const spaPrice = sp ? (jackPair.get(r.pn) ?? sp.price) : null;
      const isCable = /^ΚΑΛ[ .]/.test(d) && gr(r.base) === 'Μ';
      const isTerm = termWords.some(w => d.includes(w));
      const isCord = CORD_RE.test(d);
      const colour = colours.find(c => new RegExp('(^|[^Α-ΩA-Z0-9])' + c).test(d));
      const L = isCord ? cordLength(r.desc) : null;
      const dp = descPack(r.desc);
      o.cable = isCable; o.cat = cat || null; o.spa = sp || null;
      o.expired = cat && /^(OBSOLETE|USE UP)$/i.test(cat.status) ? cat.status : '';
      if (pnCount[r.pn] > 1) o.flags.push('ΔΙΠΛΟΕΓΓΡΑΦΗ');

      if (P.eol[r.pn]) { o.source = 'EOL'; o.how = 'EOL επιβεβαιωμένο: ' + (P.eol[r.pn].why || ''); res.push(o); continue; }

      // 1. source
      let src;
      if (sp && sp.kind === 'NMM') src = 'NMM';
      else if (isTerm) src = 'MSRP';
      else if (isCord) src = colour ? 'MSRP' : (sp && lengths.includes(L) ? 'SPA' : 'MSRP');
      else if (sp) src = 'SPA';
      else src = 'MSRP';
      if (src === 'MSRP' && !(cat && cat.msrp != null)) {
        const pp = P.portal[r.pn];
        if (pp) {
          const z = pp.za1 != null ? pp.za1 : -58;
          o.newPrice = round(pp.msrp / pp.div * r.P); o.newZ = z; o.source = 'MSRP';
          o.how = `PORTAL MSRP ${fmt(pp.msrp)} ÷${pp.div} ×${r.P} (${pp.src || 'ΤΙΜΕΣ_PORTAL'})`; o.zTxt = 'ΤΙΜΕΣ_PORTAL';
          const netOld = r.oldPrice ? r.oldPrice * (1 + r.oldZ / 100) / r.P : null;
          o.ratio = netOld ? o.newPrice * (1 + z / 100) / r.P / netOld : null;
          res.push(o); continue;
        }
        o.source = 'EOL';
        o.how = sp ? `υπάρχει SPA, αλλά ${isTerm ? 'κανόνας 2' : 'κανόνας 3/4'} → MSRP και ο κωδικός είναι εκτός καταλόγου → κράτηση παλιάς` : 'χωρίς SPA και εκτός καταλόγου → κράτηση παλιάς';
        res.push(o); continue;
      }
      const why = src === 'NMM' ? 'κανόνας 1 (NETKEY MID MARKET)' : isTerm ? 'κανόνας 2 (ακροδέκτης)' :
        isCord ? (colour ? `κανόνας 3 (χρώμα ${colour})` : src === 'SPA' ? `κανόνας 4 (cord ${fmt(L)}m)` : `κανόνας 4 (cord ${L == null ? 'χωρίς μήκος' : fmt(L) + 'm'} → MSRP)`) :
        src === 'SPA' ? 'κανόνας 5 (SPA)' : 'κανόνας 6 (MSRP)';
      const base = src === 'MSRP' ? cat.msrp : spaPrice;

      // 2. unit
      let unit, unitTxt;
      if (ov.unit) { unit = ov.unit; unitTxt = `μονάδα ${ov.unit} (OVERRIDE)`; }
      else if (cat) {
        if (cat.uom === 'RL') {
          if (gr(r.base) === 'Μ') {
            const len = (P.reel[r.pn] && P.reel[r.pn].len) || cat.mr;
            if (!len) { o.review = { check: 'ΣΤΡΟΦΕΙΟ ΧΩΡΙΣ ΜΗΚΟΣ', text: 'Prc.UOM = RL και βάση Μ, αλλά δεν βρέθηκε μήκος στροφείου (ΣΤΡΟΦΕΙΑ / Meters/Reel).', answer: 'Γράψε το μήκος στο ΣΤΡΟΦΕΙΑ.' }; o.source = src; o.how = why; res.push(o); continue; }
            unit = len; unitTxt = `÷${len} (στροφείο)`;
          } else { unit = 1; unitTxt = 'καρούλι = τεμάχιο'; }
        } else { unit = cat.nuom || 1; unitTxt = unit > 1 ? `÷${unit}` : ''; }
      } else if (P.spaUnit[r.pn]) { unit = P.spaUnit[r.pn].div; unitTxt = `÷${unit} (ΜΟΝΑΔΑ_SPA)`; }
      else if (!isCable) { unit = 1; unitTxt = '(SPA εκτός καταλόγου: ανά τεμάχιο)'; o.flags.push('SPA εκτός καταλόγου'); }
      else {
        o.source = src; o.how = why;
        o.review = { check: 'Δ2 SPA ΧΩΡΙΣ ΜΟΝΑΔΑ', text: `SPA ${fmt(base)} για κωδικό εκτός καταλόγου. Άγνωστη μονάδα.`, answer: 'Γράψε τον διαιρέτη (1 / 100 / 1000) στο ΜΟΝΑΔΑ_SPA.' };
        o.cands = [['÷1', round(base * r.P)], ['÷100', round(base / 100 * r.P)], ['÷1000', round(base / 1000 * r.P)]];
        res.push(o); continue;
      }

      // 3. pack
      let pack = 1, packTxt = '', packReview = null;
      if (isCable) pack = 1;
      else if (ov.pack) { pack = ov.pack; packTxt = `πακέτο ${ov.pack} (OVERRIDE)`; }
      else if (P.pack[r.pn]) { const pk = P.pack[r.pn]; pack = pk.box ? (pk.inner || (cat && cat.inner) || 1) : 1; packTxt = pk.box ? `×${pack} (ΠΑΚΕΤΑ: κουτί)` : '(ΠΑΚΕΤΑ: τεμάχιο)'; }
      else if (isTerm && dp === 1) pack = 1;
      else if (cat && cat.nuom > 1) {
        if (dp > 1) { pack = dp; packTxt = `×${dp} (περιγραφή)`; }
        else if (cat.inner > 1 && !isTerm) packReview = { n: cat.inner, assume: 1, text: `Η Panduit τιμολογεί ανά ${cat.nuom}, κουτί ${cat.inner}, η περιγραφή δεν δηλώνει πακέτο. Υποθέτω τεμάχιο.` };
      } else if (cat) {
        const N = Math.max(cat.inner || 1, cat.inc || 1);
        if (N > 1) packReview = { n: N, closest: true, text: `Η Panduit τιμολογεί ανά τεμάχιο αλλά πουλά ανά ${N}${dp > 1 ? ` (η περιγραφή λέει ${dp})` : ''}.` };
      }

      const mult = isCable ? r.P : pack * r.P;
      const calc = n => round(base / unit * n * r.P);
      let price = round(base / unit * mult);
      if (packReview) {
        const zTmp = src === 'MSRP' ? ((discountFor(cat, catalog, P) || {}).za1 ?? r.oldZ) : 0;
        const one = calc(1), box = calc(packReview.n);
        let pick = 1;
        if (packReview.closest && r.oldPrice) {
          const nOld = r.oldPrice * (1 + r.oldZ / 100);
          const d1 = Math.abs(Math.log(one * (1 + zTmp / 100) / nOld)), dN = Math.abs(Math.log(box * (1 + zTmp / 100) / nOld));
          pick = dN < d1 ? packReview.n : 1;
        }
        price = pick === 1 ? one : box;
        pack = pick;
        packTxt = pick > 1 ? `×${pick} (υπόθεση: κουτί)` : '(υπόθεση: τεμάχιο)';
        o.review = { check: 'ΤΕΜΑΧΙΟ Ή ΚΟΥΤΙ', text: packReview.text + (pick > 1 ? ' Έγραψα κουτί (πιο κοντά στην παλιά).' : ' Έγραψα τεμάχιο.'), answer: 'Γράψε ΤΕΜ ή ΚΟΥΤΙ. Μετά πέρασέ το στο ΠΑΚΕΤΑ.', pkt: packReview.n };
        o.cands = [['ΤΕΜΑΧΙΟ', one], [`ΚΟΥΤΙ ×${packReview.n}`, box]];
      }

      // 4. Z.A1
      let z = 0, zTxt = '';
      if (src === 'MSRP') {
        const dsc = discountFor(cat, catalog, P);
        if (dsc && dsc.za1 != null) { z = dsc.za1; zTxt = `${dsc.cat} (${dsc.from})`; if (r.oldZ && r.oldZ !== z) o.flags.push(`Z.A1 ${r.oldZ} → ${z}`); }
        else if (r.oldZ) { z = r.oldZ; zTxt = `κατηγορία ${dsc ? dsc.cat : '?'} χωρίς έκπτωση → κράτηση υπάρχοντος`; o.flags.push('Z.A1 χωρίς κατηγορία'); }
        else {
          o.source = src; o.how = why;
          o.review = { check: 'Z.A1 ΑΓΝΩΣΤΟ', text: `MSRP χωρίς έκπτωση για την κατηγορία ${dsc ? dsc.cat : '?'} και υπάρχον Z.A1 = 0.`, answer: 'Γράψε την κατηγορία και το Z.A1 στο ΕΚΠΤΩΣΕΙΣ.' };
          o.cands = [['MSRP', price]];
          res.push(o); continue;
        }
      }

      const label = src === 'NMM' ? 'SPA NETKEY MID MARKET' : src === 'SPA' ? 'SPA' : 'MSRP';
      o.how = [label, fmt(base), unitTxt, packTxt, isCable ? `×${r.P} (καλώδιο${r.P === 100 ? ', ανά 100m' : r.P === 1 ? ', ανά m' : ''})` : (r.P !== 1 ? `×P${r.P}` : ''), '·', why, sp && src !== 'MSRP' ? `· ${sp.rule || 'NMM'}${jackPair.has(r.pn) ? ' · ζεύγος JACK BL/AW (η μεγαλύτερη)' : ''}` : ''].filter(Boolean).join(' ');
      o.source = src; o.unit = unit; o.pack = pack; o.base = base; o.zTxt = zTxt;

      // 5. gates
      const netOld = r.oldPrice ? r.oldPrice * (1 + r.oldZ / 100) / r.P : null;
      const netNew = price * (1 + z / 100) / r.P;
      o.ratio = netOld ? netNew / netOld : null;
      if (!o.review && o.ratio != null && (o.ratio >= HI || o.ratio <= LO) && !ov.accept) {
        o.review = { check: 'Δ1 ΑΚΡΑΙΑ ΜΕΤΑΒΟΛΗ', text: `Καθαρό κόστος ανά μονάδα ×${o.ratio.toPrecision(3)}. Κράτησα την παλιά τιμή.`, answer: 'Αν η νέα είναι σωστή: OVERRIDES «ΑΠΟΔΟΧΗ ΑΠΟΚΛΙΣΗΣ». Αλλιώς διόρθωσε ΠΑΚΕΤΑ / ΜΟΝΑΔΑ_SPA / OVERRIDES.' };
        o.cands = [['νέα', price]];
        if (dp > 1 && !packTxt) o.cands.push([`×${dp} περιγραφής`, round(price * dp)]);
        o.gateBlocked = true;
      } else {
        if (o.review && o.review.check === 'ΤΕΜΑΧΙΟ Ή ΚΟΥΤΙ') { /* written, but listed */ }
        o.newPrice = price; o.newZ = z;
      }
      if (!o.gateBlocked && r.oldZ === 0 && src === 'MSRP' && o.ratio != null && o.ratio >= UP) o.flags.push('Δ5 SPA→MSRP');
      if (isCable && r.P !== 100) o.flags.push(`ΚΑΛΩΔΙΟ P = ${r.P}`);
      res.push(o);
    }
    return { rows: res, spaExcluded: spa.excluded, spaParts: SPA.size };
  }

  // ---------- self tests (arithmetic + rounding) ----------
  function selfTests() {
    const T = [
      ['PLT2S-C', 9.84, 100, 100, 1, 9.84],
      ['MLT2S-CP', 1128.68, 1000, 100, 1, 112.87],
      ['BT4LH-TL0', 470.79, 1000, 250, 1, 117.70],
      ['LCD6-14AF-L', 1171.50, 100, 1, 1, 11.71],
      ['FACCZ12-40', 3418.85, 1000, 1, 100, 341.88],
      ['PSL7A04WH-HED', 1664.57, 500, 1, 100, 332.91],
      ['NFY6C04BU-FEG', 208.37, 305, 1, 1, 0.6832],
    ];
    return T.map(([pn, price, unit, pack, P, exp]) => {
      const got = round(price / unit * pack * P);
      return { pn, exp, got, ok: Math.abs(got - exp) <= 0.0101 };
    });
  }

  // ---------- write back: patch only two columns in the original xlsx ----------
  function colLetter(i) { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function colIndex(letters) { let n = 0; for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; }

  async function patchXlsx(buf, sheetName, priceCol, za1Col, changes) {
    const JSZip = root.JSZip;
    const zip = await JSZip.loadAsync(buf);
    const wbXml = await zip.file('xl/workbook.xml').async('string');
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const sm = [...wbXml.matchAll(/<sheet\b[^>]*>/g)].map(x => x[0]).find(t => {
      const n = (t.match(/\bname="([^"]*)"/) || [])[1] || '';
      return n === esc(sheetName) || n === sheetName;
    });
    if (!sm) throw new Error('Δεν βρέθηκε το φύλλο στο workbook.xml');
    const rid = sm.match(/\br:id="([^"]+)"/)[1];
    const rels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
    const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map(x => x[0]).find(t => t.includes(`Id="${rid}"`));
    let target = rel.match(/Target="([^"]+)"/)[1];
    target = target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');
    let xml = await zip.file(target).async('string');
    const pL = colLetter(priceCol), zL = colLetter(za1Col);
    const byRow = new Map();
    for (const c of changes) byRow.set(c.row, c);
    let removedFormula = false;
    xml = xml.replace(/<row\b([^>]*?)(\/>|>([\s\S]*?)<\/row>)/g, (whole, attrs, tail, inner) => {
      const rn = Number((attrs.match(/\br="(\d+)"/) || [])[1]);
      const ch = byRow.get(rn);
      if (!ch) return whole;
      let cells = inner || '';
      const set = (L, val) => {
        const ref = L + rn;
        const re = new RegExp(`<c\\b[^>]*\\br="${ref}"[^>]*?(?:\\/>|>[\\s\\S]*?<\\/c>)`);
        const m = cells.match(re);
        const v = `<v>${val}</v>`;
        if (m) {
          const open = m[0].match(/^<c\b[^>]*?(?=\/?>)/)[0];
          if (/<f[\s>]/.test(m[0])) removedFormula = true;
          const s = (open.match(/\bs="(\d+)"/) || [])[1];
          cells = cells.replace(m[0], `<c r="${ref}"${s ? ` s="${s}"` : ''}>${v}</c>`);
        } else {
          const idx = colIndex(L);
          const all = [...cells.matchAll(/<c\b[^>]*\br="([A-Z]+)\d+"[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g)];
          const after = all.find(x => colIndex(x[1]) > idx);
          const cell = `<c r="${ref}">${v}</c>`;
          cells = after ? cells.slice(0, after.index) + cell + cells.slice(after.index) : cells + cell;
        }
      };
      set(pL, ch.price);
      set(zL, ch.za1);
      const a2 = attrs.replace(/\bspans="[^"]*"/, '');
      return `<row${a2}>${cells}</row>`;
    });
    zip.file(target, xml);
    if (removedFormula && zip.file('xl/calcChain.xml')) {
      zip.remove('xl/calcChain.xml');
      const ct = await zip.file('[Content_Types].xml').async('string');
      zip.file('[Content_Types].xml', ct.replace(/<Override[^>]*calcChain[^>]*\/>/, ''));
      zip.file('xl/_rels/workbook.xml.rels', rels.replace(/<Relationship[^>]*calcChain[^>]*\/>/, ''));
    }
    return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  }

  // ---------- control workbook ----------
  function controlWorkbook(result, meta, P) {
    const XLSX = root.XLSX, wb = XLSX.utils.book_new();
    const R = result.rows;
    const add = (name, head, data, widths) => {
      const ws = XLSX.utils.aoa_to_sheet([head, ...data]);
      ws['!cols'] = (widths || head.map(() => 14)).map(w => ({ wch: w }));
      ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: data.length, c: head.length - 1 } }) };
      XLSX.utils.book_append_sheet(wb, ws, name);
    };
    const changed = R.filter(r => r.newPrice !== r.oldPrice || r.newZ !== r.oldZ);
    const review = R.filter(r => r.review);
    const cnt = (f) => R.filter(f).length;
    const S = [
      ['ΕΝΗΜΕΡΩΣΗ ΤΙΜΩΝ PANDUIT · RULES V3.1', ''],
      ['Ημερομηνία', meta.date], ['Αρχείο SAP', meta.sap], ['SPA', meta.spa], ['Κατάλογος', meta.cat], ['Παράμετροι', meta.params], ['', ''],
      ['Γραμμές SAP', R.length], ['Άλλαξαν (τιμή ή Z.A1)', changed.length], ['ΓΙΑ_ΕΛΕΓΧΟ', review.length],
      ['   από αυτές με ΠΑΛΙΑ τιμή (δεν γράφτηκε νέα)', review.filter(r => r.newPrice === r.oldPrice && r.newZ === r.oldZ).length], ['', ''],
      ['SPA NETKEY MID MARKET', cnt(r => r.source === 'NMM')], ['SPA', cnt(r => r.source === 'SPA')], ['MSRP', cnt(r => r.source === 'MSRP')], ['EOL (κράτηση παλιάς)', cnt(r => r.source === 'EOL')],
      ['EXPIRED (Obsolete / USE UP)', cnt(r => r.expired)], ['Καλώδια', cnt(r => r.cable)], ['   με P ≠ 100', cnt(r => r.cable && r.P !== 100)], ['', ''],
      ['Δ3 MSRP με Z.A1 = 0 (πρέπει 0)', cnt(r => r.source === 'MSRP' && r.newZ === 0 && !r.review)],
      ['Δ4 SPA/NMM με Z.A1 ≠ 0 (πρέπει 0)', cnt(r => (r.source === 'SPA' || r.source === 'NMM') && r.newZ !== 0 && !r.review)],
      ['Δ5 SPA → MSRP με ανατίμηση', cnt(r => r.flags.includes('Δ5 SPA→MSRP'))],
      ['SPA γραμμές που αγνοήθηκαν (αποκλεισμός)', result.spaExcluded], ['', ''],
      ['Τεστ αριθμητικής (7 κωδικοί αναφοράς)', meta.tests.every(t => t.ok) ? 'ΠΕΡΝΑ' : 'ΑΠΟΤΥΓΧΑΝΕΙ'],
      ['Έλεγχος αρχείου: άλλαξαν μόνο «Αρχική τιμή» και «Z.A1»', meta.integrity],
    ];
    if (P.warnings.length) { S.push(['', '']); S.push(['ΠΡΟΕΙΔΟΠΟΙΗΣΕΙΣ ΠΑΡΑΜΕΤΡΩΝ', '']); P.warnings.forEach(w => S.push(['', w])); }
    add('ΣΥΝΟΨΗ', ['', ''], S, [52, 70]);
    add('ΓΙΑ_ΕΛΕΓΧΟ', ['Part Number', 'Υλικό (SAP)', 'Περιγραφή', 'Έλεγχος', 'Τι βρέθηκε', 'Παλιά τιμή', 'Τιμή στο αρχείο τώρα', 'Υποψήφια Α', 'Τιμή Α', 'Υποψήφια Β', 'Τιμή Β', 'Υποψήφια Γ', 'Τιμή Γ', 'Πώς απαντάς', 'ΑΠΑΝΤΗΣΗ'],
      review.map(r => { const c = r.cands || []; return [r.pn, r.mat, r.desc, r.review.check, r.review.text, r.oldPrice, r.newPrice, ...(c[0] || ['', '']), ...(c[1] || ['', '']), ...(c[2] || ['', '']), r.review.answer, '']; }),
      [16, 11, 38, 22, 60, 10, 12, 14, 10, 14, 10, 12, 10, 50, 16]);
    add('ΑΛΛΑΓΕΣ', ['Part Number', 'Υλικό (SAP)', 'Περιγραφή', 'P', 'Παλιά τιμή', 'Παλιό Z.A1', 'Νέα τιμή', 'Νέο Z.A1', 'Καθαρό νέο ÷ παλιό', 'Πηγή & αναγωγή', 'Z.A1 από', 'Σημειώσεις'],
      changed.map(r => [r.pn, r.mat, r.desc, r.P, r.oldPrice, r.oldZ, r.newPrice, r.newZ, r.ratio ? Number(r.ratio.toFixed(3)) : '', r.how, r.zTxt || '', r.flags.join(' · ')]),
      [16, 11, 38, 6, 10, 8, 10, 8, 10, 70, 24, 30]);
    add('ΟΛΕΣ_ΟΙ_ΓΡΑΜΜΕΣ', ['Γραμμή', 'Part Number', 'Υλικό (SAP)', 'Περιγραφή', 'Πηγή', 'P', 'Παλιά τιμή', 'Παλιό Z.A1', 'Νέα τιμή', 'Νέο Z.A1', 'Πηγή & αναγωγή', 'EXPIRED', 'Σημειώσεις'],
      R.map(r => [r.row, r.pn, r.mat, r.desc, r.source, r.P, r.oldPrice, r.oldZ, r.newPrice, r.newZ, r.how, r.expired, [r.review ? 'ΓΙΑ_ΕΛΕΓΧΟ: ' + r.review.check : '', ...r.flags].filter(Boolean).join(' · ')]),
      [7, 16, 11, 38, 7, 6, 10, 8, 10, 8, 70, 10, 40]);
    add('ΚΑΛΩΔΙΑ', ['Part Number', 'Υλικό (SAP)', 'Περιγραφή', 'Πηγή', 'P', 'Τιμή', 'Τιμή ισχύει ανά', 'Σημείωση'],
      R.filter(r => r.cable).map(r => [r.pn, r.mat, r.desc, r.source, r.P, r.newPrice, r.P === 100 ? '100 m' : r.P === 1 ? '1 m' : r.P + ' m', r.P !== 100 ? `P = ${r.P}` : '']), [16, 11, 40, 7, 6, 10, 12, 12]);
    add('ΜΕ_SPA', ['Part Number', 'Υλικό (SAP)', 'Περιγραφή', 'Πηγή', 'SPA customer', 'Κανόνας επιλογής', 'Τιμή SPA', 'Νέα τιμή', 'Z.A1'],
      R.filter(r => r.source === 'SPA' || r.source === 'NMM').map(r => [r.pn, r.mat, r.desc, r.source === 'NMM' ? 'NETKEY MID MARKET' : 'SPA', r.spa ? r.spa.cust : '', r.spa ? (r.spa.rule || 'NMM') : '', r.base, r.newPrice, r.newZ]),
      [16, 11, 38, 18, 36, 22, 10, 10, 6]);
    add('SPA→MSRP_ΚΟΣΤΟΣ', ['Part Number', 'Περιγραφή', 'Παλιά (καθαρή)', 'Νέα MSRP', 'Z.A1', 'Καθαρό νέο ÷ παλιό', 'Πηγή & αναγωγή'],
      R.filter(r => r.flags.includes('Δ5 SPA→MSRP')).map(r => [r.pn, r.desc, r.oldPrice, r.newPrice, r.newZ, Number(r.ratio.toFixed(3)), r.how]), [16, 38, 12, 10, 6, 12, 70]);
    add('EXPIRED', ['Part Number', 'Υλικό (SAP)', 'Περιγραφή', 'Status καταλόγου'], R.filter(r => r.expired).map(r => [r.pn, r.mat, r.desc, r.expired]), [16, 11, 40, 14]);
    add('EOL', ['Part Number', 'Υλικό (SAP)', 'Περιγραφή', 'Τιμή (παλιά)', 'Z.A1', 'Λόγος'], R.filter(r => r.source === 'EOL').map(r => [r.pn, r.mat, r.desc, r.oldPrice, r.oldZ, r.how]), [16, 11, 40, 10, 6, 50]);
    const dups = R.filter(r => r.flags.includes('ΔΙΠΛΟΕΓΓΡΑΦΗ'));
    add('ΔΙΠΛΟΕΓΓΡΑΦΕΣ', ['Part Number', 'Υλικό (SAP)', 'Περιγραφή', 'Βάση', 'P', 'Νέα τιμή'], dups.map(r => [r.pn, r.mat, r.desc, r.base, r.P, r.newPrice]), [16, 11, 40, 6, 6, 10]);
    return wb;
  }

  // ---------- integrity check: re-read output, compare every cell except the two columns ----------
  function integrity(inWb, outWb, sheetName, priceCol, za1Col, headerRow) {
    const XLSX = root.XLSX;
    const problems = [];
    if (JSON.stringify(inWb.SheetNames) !== JSON.stringify(outWb.SheetNames)) problems.push('Διαφορετικά φύλλα');
    for (const name of inWb.SheetNames) {
      const a = inWb.Sheets[name], b = outWb.Sheets[name];
      if (!b) continue;
      const ra = XLSX.utils.decode_range(a['!ref'] || 'A1'), rb = XLSX.utils.decode_range(b['!ref'] || 'A1');
      const R2 = Math.max(ra.e.r, rb.e.r), C2 = Math.max(ra.e.c, rb.e.c);
      for (let r = 0; r <= R2; r++) for (let c = 0; c <= C2; c++) {
        if (name === sheetName && r >= headerRow && (c === priceCol || c === za1Col)) continue;
        const ref = XLSX.utils.encode_cell({ r, c });
        const va = a[ref] ? a[ref].v : undefined, vb = b[ref] ? b[ref].v : undefined;
        if (va !== vb && !(va == null && vb == null)) { problems.push(`${name}!${ref}`); if (problems.length > 20) return problems; }
      }
    }
    return problems;
  }

  root.PanduitEngine = { gr, norm, num, round, parseSap, parseSpa, parseCatalog, parseParams, paramsToWorkbook, run, selfTests, patchXlsx, controlWorkbook, integrity, DEFAULT_SETTINGS, PARAM_SHEETS };
})(typeof window !== 'undefined' ? window : globalThis);
