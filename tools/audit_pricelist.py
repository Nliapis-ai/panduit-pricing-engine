"""Έλεγχος αποτελέσματος ενημέρωσης τιμών Panduit (RULES V3.1 §6).

Συγκρίνει το αρχικό SAP export με το ενημερωμένο αρχείο και βγάζει το
ΠΡΟΣ_ΕΛΕΓΧΟ.xlsx. Δεν υπολογίζει καμία τιμή· μόνο ελέγχει.

    python tools/audit_pricelist.py ΠΑΛΙΟ.xlsx ΝΕΟ.xlsx ΠΑΡΑΜΕΤΡΟΙ.xlsx ΕΞΟΔΟΣ.xlsx

Όλες οι στήλες βρίσκονται από το header, όχι από θέση.
"""
import re
import sys

import pandas as pd

SHEET = 'SAP PRICELIST'
H_MAT = 'Αρ.Εξαρτ.Κατασκευαστή'
H_PN = 'Αριθμός Υλικού Προμηθ.'
H_DESC = 'Περιγραφή Υλικού'
H_BASE = 'Βασική Μον.Μέτρησης'
H_P = 'Τιμή υπολογισμένη ανά'
H_PRICE = 'Αρχική τιμή'
H_ZA1 = 'Z.A1 Τιμ. %'
H_SRC = 'Πηγή & αναγωγή'

# Δικλείδα Δ1: καθαρό κόστος ανά μονάδα νέο/παλιό
HI, LO = 5.0, 0.2
# Δικλείδα Δ5: SPA → MSRP με αύξηση καθαρού κόστους
COST_UP = 1.25

LAT2GR = str.maketrans({'A': 'Α', 'B': 'Β', 'E': 'Ε', 'Z': 'Ζ', 'H': 'Η', 'I': 'Ι', 'K': 'Κ',
                        'M': 'Μ', 'N': 'Ν', 'O': 'Ο', 'P': 'Ρ', 'T': 'Τ', 'Y': 'Υ', 'X': 'Χ'})
PACK_RE = [r'(\d+)\s*ΤΕΜ', r'(\d+)\s*ΤΜΧ', r'ΣΥΣ\.?Κ?\.?\s*(\d+)', r'\((\d+)\s*Τ',
           r'(\d+)\s*ΤΕ$', r'(\d+)\s*ΤΜ$', r'(\d+)\s*Τ$']
COLOURS = ['ΜΠΛΕ', 'ΠΡΑΣ', 'ΚΟΚΚ', 'ΚΙΤΡ', 'ΓΚΡΙ', 'ΜΑΥΡ', 'ΠΟΡΤΟΚ', 'ΒΙΟΛ', 'ΜΩΒ', 'ΡΟΖ']


def gr(s):
    return str(s).upper().translate(LAT2GR)


def desc_pack(desc):
    d = gr(desc)
    for p in PACK_RE:
        m = re.search(p, d)
        if m and int(m.group(1)) > 1:
            return int(m.group(1))
    return 1


def src_kind(s):
    s = str(s)
    if 'NETKEY' in s:
        return 'NMM'
    if s.startswith('SPA'):
        return 'SPA'
    if s.startswith('MSRP'):
        return 'MSRP'
    return 'EOL'


def src_mult(s):
    m = re.search(r'×(\d+)', str(s))
    return int(m.group(1)) if m else 1


def near(a, b, tol=0.02):
    return b != 0 and abs(a / b - 1) <= tol


def load(path):
    df = pd.read_excel(path, sheet_name=SHEET, dtype={H_MAT: str})
    # Το changelog έχει δεύτερη στήλη «Υλικό»· κρατάμε μόνο ό,τι χρειάζεται.
    cols = {H_MAT: 'MAT', H_PN: 'PN', H_DESC: 'DESC', H_BASE: 'BASE', H_P: 'P',
            H_PRICE: 'PRICE', H_ZA1: 'ZA1'}
    if H_SRC in df.columns:
        cols[H_SRC] = 'SRC'
    missing = [h for h in cols if h not in df.columns]
    if missing:
        sys.exit(f'Λείπουν headers στο {path}: {missing}')
    return df[list(cols)].rename(columns=cols)


def load_params(path):
    pk = pd.read_excel(path, sheet_name='ΠΑΚΕΤΑ', header=1)
    return dict(zip(pk['Part Number'], pk['ΠΑΚΕΤΟ ή ΤΕΜΑΧΙΟ;'])), dict(zip(pk['Part Number'], pk['Κουτί (Inner)']))


def audit(old_path, new_path, params_path):
    old = load(old_path)
    new = load(new_path)
    pk_answer, pk_inner = load_params(params_path)
    m = new.merge(old[['MAT', 'P', 'PRICE', 'ZA1']], on='MAT', suffixes=('', '_old'))
    m['kind'] = m.SRC.map(src_kind)
    m['net_old'] = m.PRICE_old * (1 + m.ZA1_old / 100) / m.P_old
    m['net_new'] = m.PRICE * (1 + m.ZA1 / 100) / m.P
    m['ratio'] = m.net_new / m.net_old
    m['pack'] = m.DESC.map(desc_pack)
    m['xmult'] = m.SRC.map(src_mult)
    d = m.DESC.map(gr)
    m['terminal'] = d.str.contains('ΑΚΡΟΔΕΚΤΗΣ') | d.str.contains('ΚΩΣ ΠΡΕΣΑΣ')
    m['cable'] = d.str.match(r'^ΚΑΛ[ \.]') & (m.BASE.map(gr) == 'Μ')
    live = m[m.kind != 'EOL']

    rows = []

    def add(r, check, why, cand=None, cand_note=''):
        rows.append({'Part Number': r.PN, 'Υλικό (SAP)': r.MAT, 'Περιγραφή': r.DESC,
                     'Βάση': r.BASE, 'P': r.P, 'Παλιά τιμή': r.PRICE_old, 'Z.A1 παλιό': r.ZA1_old,
                     'Νέα τιμή': r.PRICE, 'Z.A1 νέο': r.ZA1, 'Πηγή & αναγωγή': r.SRC,
                     'Καθαρό/μον. νέο÷παλιό': round(r.ratio, 4), 'Έλεγχος': check, 'Γιατί': why,
                     'Υποψήφια τιμή': cand, 'Υποψήφια = ': cand_note, 'ΑΠΑΝΤΗΣΗ': None})

    for r in live.itertuples():
        flagged = False
        # Δ7: ακροδέκτης δηλωμένος ως ΠΑΚΕΤΟ στο ΠΑΡΑΜΕΤΡΟΙ (αντίφαση με §7)
        if r.terminal and r.pack == 1 and pk_answer.get(r.PN) == 'ΠΑΚΕΤΟ':
            n = int(pk_inner.get(r.PN, 1))
            add(r, 'Δ7 ΑΚΡΟΔΕΚΤΗΣ ως ΠΑΚΕΤΟ',
                f'Το ΠΑΚΕΤΑ λέει ΠΑΚΕΤΟ ×{n}, ο κανόνας λέει ακροδέκτες πάντα ανά τεμάχιο. '
                'Η περιγραφή δεν δηλώνει συσκευασία. Όλοι οι άλλοι LCA/LCC/LCD του ΠΑΚΕΤΑ είναι ΤΕΜΑΧΙΟ.',
                round(r.PRICE / n, 4), f'ανά τεμάχιο (÷{n})')
            flagged = True
        # Δ2: SPA σε καλώδιο χωρίς διαίρεση μονάδας → άγνωστη μονάδα SPA
        elif r.cable and r.kind in ('SPA', 'NMM') and '÷' not in str(r.SRC) and r.ratio >= HI:
            add(r, 'Δ2 SPA χωρίς μονάδα',
                'SPA χωρίς κωδικό στον κατάλογο → η μονάδα της SPA είναι άγνωστη και μπήκε ÷1. '
                f'Με ÷1000 το καθαρό κόστος αλλάζει {(r.ratio / 1000 - 1) * 100:+.0f}% αντί ×{r.ratio:.0f}.',
                round(r.PRICE / 1000, 2), 'SPA ανά 1000m (÷1000)')
            flagged = True
        # Δ6: πακέτο στην περιγραφή που δεν εφαρμόστηκε, και το κόστος έπεσε ακριβώς 1/N
        elif r.pack > 1 and not r.cable and r.xmult != r.pack and near(r.ratio, 1 / r.pack, 0.1):
            add(r, 'Δ6 ΠΑΚΕΤΟ ΠΕΡΙΓΡΑΦΗΣ ΑΓΝΟΗΘΗΚΕ',
                f'Η περιγραφή λέει {r.pack} τεμ. αλλά δεν εφαρμόστηκε ×{r.pack} '
                '(πιθανώς ο κατάλογος τιμολογεί ανά τεμάχιο, Numeric UOM = 1). '
                f'Νέο καθαρό ≈ παλιό ÷ {r.pack}.',
                round(r.PRICE * r.pack, 2), f'ανά κουτί (×{r.pack})')
            flagged = True
        # Δ1: ακραία μεταβολή καθαρού κόστους ανά μονάδα
        if not flagged and (r.ratio >= HI or r.ratio <= LO):
            cand, note, why = None, '', f'Καθαρό κόστος ανά μονάδα ×{r.ratio:.3g}.'
            if r.pack > 1 and r.xmult != r.pack and r.ratio <= LO:
                cand, note = round(r.PRICE * r.pack, 2), f'ανά κουτί (×{r.pack})'
                why += f' Η περιγραφή λέει {r.pack} τεμ. και δεν εφαρμόστηκε ×{r.pack}.'
            elif r.pack > 1 and near(r.ratio, r.pack, 0.1):
                cand, note = round(r.PRICE / r.pack, 4), f'ανά τεμάχιο (÷{r.pack})'
                why += f' Ταιριάζει ακριβώς με ×{r.pack} της περιγραφής.'
            elif r.P > 1 and near(r.ratio, r.P, 0.02):
                why += (f' Ακριβώς ×P ({r.P:g}): η ΠΑΛΙΑ τιμή ήταν ανά τεμάχιο σε γραμμή με P={r.P:g}. '
                        'Η νέα είναι μάλλον σωστή.')
                cand, note = r.PRICE, 'κράτα τη νέα'
            elif '÷' in str(r.SRC) and not r.cable and str(r.BASE).strip() in ('Μ', 'M'):
                reel = int(re.search(r'÷(\d+)', str(r.SRC)).group(1))
                cand, note = round(r.PRICE * reel, 2), f'ανά ρολό (×{reel})'
                why += (' Διαιρέθηκε με μήκος στροφείου επειδή η SAP βάση είναι Μ, αλλά δεν είναι καλώδιο '
                        'και η παλιά τιμή ήταν ανά ρολό. Ή η βάση Μ του SAP είναι λάθος ή η παλιά τιμή.')
            elif r.ZA1_old == 0 and r.kind == 'MSRP':
                why += ' Η παλιά ήταν καθαρή (Z.A1 = 0), η νέα MSRP. Πιθανόν η παλιά ήταν λάθος SPA/μονάδα.'
            add(r, 'Δ1 ΑΚΡΑΙΑ ΜΕΤΑΒΟΛΗ', why, cand, note)

    extreme = pd.DataFrame(rows)
    order = {'Δ7 ΑΚΡΟΔΕΚΤΗΣ ως ΠΑΚΕΤΟ': 0, 'Δ2 SPA χωρίς μονάδα': 1,
             'Δ6 ΠΑΚΕΤΟ ΠΕΡΙΓΡΑΦΗΣ ΑΓΝΟΗΘΗΚΕ': 2, 'Δ1 ΑΚΡΑΙΑ ΜΕΤΑΒΟΛΗ': 3}
    extreme = extreme.sort_values(['Έλεγχος', 'Part Number'], key=lambda s: s.map(order) if s.name == 'Έλεγχος' else s)

    # Δ5: SPA → MSRP, καθαρό κόστος ανέβηκε
    sw = live[(live.ZA1_old == 0) & (live.kind == 'MSRP') & (live.ratio >= COST_UP)
              & ~live.PN.isin(extreme['Part Number'])]
    cost_up = pd.DataFrame({
        'Part Number': sw.PN, 'Περιγραφή': sw.DESC, 'Παλιά τιμή (καθαρή, Z.A1 0)': sw.PRICE_old,
        'Νέα τιμή MSRP': sw.PRICE, 'Z.A1 νέο': sw.ZA1, 'Νέο καθαρό': (sw.PRICE * (1 + sw.ZA1 / 100)).round(2),
        'Καθαρό νέο÷παλιό': sw.ratio.round(3), 'Πηγή & αναγωγή': sw.SRC,
        'Γιατί MSRP;': [('χρωματιστό cord (κανόνας 3)' if 'χρωματιστό' in str(s) else
                         'λευκό cord εκτός μηκών ή χωρίς SPA (κανόνες 4/6)' if 'CΟRD' in gr(dsc) else
                         'δεν βρέθηκε SPA (κανόνας 6)') for s, dsc in zip(sw.SRC, sw.DESC)],
        'ΑΠΑΝΤΗΣΗ': None}).sort_values('Καθαρό νέο÷παλιό', ascending=False)

    # Z.A1 συνέπεια (Δ3, Δ4)
    za = pd.DataFrame([
        ('MSRP με Z.A1 = 0 (Δ3)', int(((live.kind == 'MSRP') & (live.ZA1 == 0)).sum())),
        ('SPA/NMM με Z.A1 ≠ 0 (Δ4)', int((live.kind.isin(['SPA', 'NMM']) & (live.ZA1 != 0)).sum())),
        ('Z.A1 εκτός {0, −36, −58}', int((~m.ZA1.isin([0, -36, -58])).sum())),
        ('MSRP −58', int(((live.kind == 'MSRP') & (live.ZA1 == -58)).sum())),
        ('MSRP −36', int(((live.kind == 'MSRP') & (live.ZA1 == -36)).sum())),
        ('SPA 0', int(((live.kind == 'SPA') & (live.ZA1 == 0)).sum())),
        ('NMM 0', int(((live.kind == 'NMM') & (live.ZA1 == 0)).sum())),
        ('EOL', int((m.kind == 'EOL').sum())),
        ('Γραμμές όπου άλλαξε το Z.A1', int((m.ZA1 != m.ZA1_old).sum())),
        ('Γραμμές όπου άλλαξε το P', int((m.P != m.P_old).sum())),
    ], columns=['Έλεγχος', 'Πλήθος'])

    cab = m[m.cable]
    cables = pd.DataFrame({'Part Number': cab.PN, 'Υλικό (SAP)': cab.MAT, 'Περιγραφή': cab.DESC,
                           'Κατάσταση': cab.kind.map(lambda k: 'EOL' if k == 'EOL' else 'ενεργό'),
                           'P τώρα': cab.P, 'P στο παλιό export': cab.P_old, 'Τιμή': cab.PRICE})
    cables = cables.sort_values(['Κατάσταση', 'P τώρα', 'Part Number'])
    return extreme, cost_up, za, cables


if __name__ == '__main__':
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    old_path, new_path, params_path, out_path = sys.argv[1:]
    extreme, cost_up, za, cables = audit(old_path, new_path, params_path)
    with pd.ExcelWriter(out_path, engine='openpyxl') as w:
        extreme.to_excel(w, sheet_name='ΓΡΑΜΜΕΣ', index=False)
        cost_up.to_excel(w, sheet_name='SPA→MSRP_ΚΟΣΤΟΣ', index=False)
        za.to_excel(w, sheet_name='Z.A1_ΕΛΕΓΧΟΣ', index=False)
        cables.to_excel(w, sheet_name='ΚΑΛΩΔΙΑ_ΟΛΑ', index=False)
    print(f'ΓΡΑΜΜΕΣ: {len(extreme)} · SPA→MSRP: {len(cost_up)} · καλώδια: {len(cables)}')
    print(extreme['Έλεγχος'].value_counts().to_string())
