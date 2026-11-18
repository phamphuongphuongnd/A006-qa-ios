import type { ReceiptReading } from '@/domain/receiptSignal';
import type { Region } from '@/domain/types';

/**
 * Receipt parser (P1-12): raw on-device OCR lines → total / merchant / date with a confidence per field.
 * Same TypeScript for ML Kit (Android) and Vision (iOS). Never guesses loudly: a field it is unsure of gets a
 * confidence under OCR_FILL_CONFIDENCE so the capture screen leaves it alone.
 */

/** Structural copy of modules/receipt-ocr's OcrRaw (kept here so Jest never loads the native module). */
export interface RawLine {
  text: string;
  confidence?: number;
  box: { x: number; y: number; w: number; h: number } | null;
}
export interface RawOcr {
  text: string;
  lines: RawLine[];
}

export interface ParsedReceipt extends ReceiptReading {
  /** Time printed next to the date, minutes after midnight (null if none). */
  minutes: number | null;
}

export const EMPTY_READING: ParsedReceipt = {
  amountMinor: null,
  merchant: null,
  date: null,
  minutes: null,
  confidence: { amount: 0, merchant: 0, date: 0 },
};

interface Line {
  i: number;
  text: string;
  up: string;
  box: RawLine['box'];
  /** ML Kit / Vision line confidence (0..1; 0 or missing = not given). */
  conf: number;
}

/** Lines in reading order (top to bottom, then left to right) when boxes are known. */
function prepare(raw: RawOcr): Line[] {
  const lines = raw.lines
    .map((l, i) => ({ i, text: l.text.replace(/\s+/g, ' ').trim(), up: '', box: l.box, conf: l.confidence ?? 0 }))
    .filter((l) => l.text !== '');
  const boxed = lines.every((l) => l.box);
  if (boxed) lines.sort((a, b) => a.box!.y + a.box!.h / 2 - (b.box!.y + b.box!.h / 2) || a.box!.x - b.box!.x);
  lines.forEach((l, i) => {
    l.i = i;
    l.up = l.text.toUpperCase();
  });
  return lines;
}

// ---------------------------------------------------------------- amount

interface Money {
  minor: number;
  /** Position in the line (rightmost wins when a line has several). */
  at: number;
  /** OCR confidence of the line the figure was read from (set where rows are paired). */
  conf?: number;
}

// Whole part: "1,250" (comma thousands), "1.575" before ",01" (dot thousands, comma decimal — QA-100 B-102 r22), or plain.
const MONEY_RE = /([£$€]?)\s?(\d{1,3}(?:,\d{3})+|\d{1,3}(?:\.\d{3})+(?=,\d{2}(?!\d))|\d{1,6})(?:\.\s?|,)(\d{2})(?!\d)/g;
/** Whole amounts after a currency sign ("$5400", "$5,000", "£5") — never a bare number, never one with decimals. */
const WHOLE_RE = /([£$€])\s?(\d{1,3}(?:,\d{3})+|\d{1,6})(?![\dOoA-Za-z]|[.,][\dOo])/g;

/** Amounts in one line, skipping dates (12.11.26), litres (45.20L), rates (20.00%) and per-unit prices. */
export function moneyIn(raw: string): Money[] {
  // OCR slips seen on a real Shell receipt (A13): "£72.4O" (letter O for 0) and "£72.4" (last 0 dropped). Only fixed
  // after a currency sign, so "45.2L" or a reference number never turns into money.
  const text = raw
    .replace(/([£$€]\s?\d{1,6}[.,]\d?)[Oo](?![A-Za-z])/g, (_m, a: string) => `${a}0`)
    .replace(/([£$€]\s?\d{1,6}[.,])[Oo](\d)/g, (_m, a: string, b: string) => `${a}0${b}`)
    .replace(/([£$€]\s?\d{1,6}[.,]\d)(?![\d%A-Za-z])/g, (_m, a: string) => `${a}0`);
  const out: Money[] = [];
  for (const m of text.matchAll(MONEY_RE)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const before = text.slice(Math.max(0, start - 2), start);
    const after = text.slice(end, end + 6);
    if (/\d[./-]$/.test(before) || /^[./-]\d/.test(after)) continue;
    if (/^\s?(%|l\b|ltr|lit|gal|kg|p\/|\/)/i.test(after)) continue;
    // "1,250.50" groups thousands; a lone "72,40" is a decimal comma; "1.575,01" groups with dots.
    const whole = Number(m[2].replace(/[.,]/g, ''));
    out.push({ minor: whole * 100 + Number(m[3]), at: start });
  }
  for (const m of text.matchAll(WHOLE_RE)) {
    const start = m.index ?? 0;
    const after = text.slice(start + m[0].length, start + m[0].length + 6);
    if (/^\s?(%|l\b|ltr|lit|gal|kg|p\/|\/|[:\/-]\d)/i.test(after)) continue;
    out.push({ minor: Number(m[2].replace(/,/g, '')) * 100, at: start });
  }
  return out.filter((x) => x.minor > 0).sort((a, b) => a.at - b.at);
}

const TOTAL_STRONG = /\b(GRAND\s*TOTAL|AMOUNT\s*DUE|BALANCE\s*DUE|TOTAL\s*(TO\s*PAY|DUE|PAID)|AMOUNT\s*TO\s*PAY|TO\s*PAY)\b/;
const TOTAL = /\b(TOTAL|AMOUNT|BALANCE|TOTAL\s*SALE|SALE\s*TOTAL|PAYMENT|FARE|TARIFF)\b/;
const PAID_BY = /\b(VISA|MASTER\s*CARD|MASTERCARD|MAESTRO|AMEX|DEBIT|CREDIT|CARD|CONTACTLESS|APPLE\s*PAY|GOOGLE\s*PAY|CHIP\s*&?\s*PIN|PAID)\b/;
/** Lines whose amount is never the total paid. */
const NOT_TOTAL = /\b(SUB\s*-?\s*TOTAL|CHANGE|CASH\s*BACK|CASHBACK|TENDER(ED)?|SAVING|SAVINGS|DISCOUNT|YOU\s*SAVED|POINTS|ITEMS?|QTY|NET|EXCL?|EX\.?\s*VAT|DEPOSIT|PER\s*(LITRE|LITER|GALLON)|PRICE\s*\/)\b/;
/** VAT / tax lines are the tax figure unless they say the total includes it ("TOTAL INC VAT"). */
const TAX = /\b(VAT|TAX|GST)\b/;
const INCL = /\b(INC|INCL|INCLUDING|INC\.)\b/;

const centre = (l: Line) => l.box!.y + l.box!.h / 2;
/** Letters left once currency marks are gone ("E33.50" — £ read as E — still counts as a bare figure). */
const wordsIn = (l: Line) => l.up.replace(/GBP|USD|EUR|[£$€]/g, '').replace(/[^A-Z]/g, '');
const isFigure = (l: Line) => wordsIn(l).length <= 1 && moneyIn(l.text).length > 0;
const isLabel = (l: Line) => /[A-Z]{2}/.test(l.up) && !moneyIn(l.text).length;

/**
 * QA-100 B-102 (real A13 reads of two Tesco receipts): on a photo taken a few degrees off, the whole right-hand figure
 * column sits ~0.6 of a line below its labels, so "TOTAL: £33.50"'s figure ended up nearer the "Cash" label under it
 * and was thrown away. Estimate that column shift once from all label/figure pairs (the shift that lines up the most
 * figures with a label; the smallest one on a tie), then compare rows after taking it off.
 */
function columnShift(lines: Line[]): number {
  const boxed = lines.filter((l) => l.box);
  const figs = boxed.filter(isFigure);
  const labels = boxed.filter(isLabel);
  if (figs.length < 2 || !labels.length) return 0;
  const hs = boxed.map((l) => l.box!.h).sort((a, b) => a - b);
  const h = hs[Math.floor(hs.length / 2)];
  const shifts = figs.map((f) => labels.filter((l) => l.box!.x < f.box!.x).map((l) => centre(f) - centre(l)));
  // At most ~0.9 of a line: real tilted photos shifted 0.55–0.7 line. On an evenly spaced till roll a shift of 1.5 lines
  // lines up just as many pairs — every figure with the label one row off (r03 took "£0.95" as its TOTAL that way).
  const cands = [0, ...shifts.flat().filter((d) => Math.abs(d) <= 0.9 * h)];
  let best = 0;
  let bestScore = -1;
  for (const s of cands) {
    const score = shifts.filter((ds) => ds.some((d) => Math.abs(d - s) < 0.3 * h)).length;
    if (score > bestScore || (score === bestScore && Math.abs(s) < Math.abs(best))) {
      best = s;
      bestScore = score;
    }
  }
  return best;
}

/** Amounts printed on the same row as `line` (a label on the left, the figure in another OCR block on the right). */
function rowAmounts(line: Line, lines: Line[], shift: number): Money[] {
  const own = moneyIn(line.text);
  if (own.length) return own.map((m) => ({ ...m, conf: line.conf }));
  if (!line.box) {
    const next = lines[line.i + 1];
    return next && !/[A-Z]{3}/.test(next.up.replace(/GBP|USD|EUR/g, '')) ? moneyIn(next.text) : [];
  }
  const near = rowFigure(line, lines, shift, (o) => moneyIn(o.text).length > 0);
  return near ? moneyIn(near.text).map((m) => ({ ...m, conf: near.conf })) : figureBelow(line, lines);
}

/**
 * The figure block on `line`'s row once the column shift is taken off: nearest centre within about a line, never one
 * that another label's row claims more closely.
 */
function rowFigure(line: Line, lines: Line[], shift: number, ok: (o: Line) => boolean): Line | null {
  const b = line.box!;
  const cy = centre(line) + shift;
  const tol = Math.max(b.h, 0.01);
  const right = b.x + b.w * 0.5;
  const dy = (o: Line) => Math.abs(centre(o) - cy);
  const near = lines.filter((o) => o !== line && o.box && dy(o) <= tol && o.box.x >= right && ok(o)).sort((p, q) => dy(p) - dy(q))[0];
  if (!near) return null;
  const nearCy = centre(near);
  const closerLabel = lines.some(
    (o) => o !== line && o.box && o.box.x < right && !moneyIn(o.text).length && Math.abs(centre(o) + shift - nearCy) < dy(near) * 0.6,
  );
  return closerLabel ? null : near;
}

/**
 * QA-100 B-102: a label with its figure printed underneath ("FUEL TOTAL" over "$ 20.00", "TOTAL :" over "$ 150.00").
 * Only a figure-only line starting within about two line heights below the label and overlapping its column (or to
 * its right); a line that carries its own words is another row, not this one.
 */
function figureBelow(line: Line, lines: Line[]): Money[] {
  const b = line.box!;
  const bottom = b.y + b.h;
  const below = lines
    .filter((o) => {
      if (o === line || !o.box) return false;
      const gap = o.box.y - bottom;
      if (gap < -b.h * 0.3 || gap > b.h * 2) return false;
      if (o.box.x + o.box.w < b.x) return false;
      if (!isFigure(o)) return false;
      // The figure of the next row ("CASH  £80.00" under a tilted "TOTAL") has its own label beside it: not ours.
      const ob = o.box;
      const cy = ob.y + ob.h / 2;
      return !lines.some((l) => l !== line && l.box && isLabel(l) && Math.abs(centre(l) - cy) < ob.h * 0.6);
    })
    .sort((p, q) => p.box!.y - q.box!.y);
  return below.length ? moneyIn(below[0].text).map((m) => ({ ...m, conf: below[0].conf })) : [];
}

const rightmost = (ms: Money[]) => ms.reduce((a, b) => (b.at > a.at ? b : a));
/** OCR splits words ("Subtota l", "TOTA L"): labels are also checked with the spaces taken out. */
const squash = (s: string) => s.replace(/\s+/g, '');
const isSubtotal = (l: Line) => /SUB-?TOTAL/.test(squash(l.up));

/**
 * QA-100 B-102 (FreshHarvest on the A13): a big-font total lost its point ("2174" next to "Total"). Read a bare
 * 3–6 digit figure on the total row as pence/cents only when the receipt proves it: subtotal + tax, or a paid-by line.
 */
function lostPointTotal(
  line: Line,
  lines: Line[],
  shift: number,
  sum: { sub: number | null; tax: number | null },
  paid: number[],
): number | null {
  if (!line.box) return null;
  const fig = rowFigure(line, lines, shift, (o) => /^[£$€E]?\s?\d{3,6}$/.test(o.text.trim()));
  if (!fig) return null;
  const minor = Number(fig.text.replace(/\D/g, ''));
  if (sum.sub !== null && sum.tax !== null && sum.sub + sum.tax === minor) return minor;
  return paid.includes(minor) ? minor : null;
}

function readAmount(lines: Line[]): { minor: number | null; confidence: number } {
  const shift = columnShift(lines);
  type Cand = { minor: number; score: number; kind: 'strong' | 'total' | 'paid'; conf?: number };
  const cands: Cand[] = [];
  const totalRows: Line[] = [];
  // QA-100 B-102 r01: below "CHANGE DUE" the till prints a VAT/GST summary whose own "Total" (net + tax columns) is not
  // what was paid — it only counts when nothing above the change line does.
  const changeAt = lines.findIndex((l) => /\bCHANGE\b/.test(l.up));
  for (const l of lines) {
    if (NOT_TOTAL.test(l.up) || isSubtotal(l)) continue;
    if (TAX.test(l.up) && !INCL.test(l.up)) continue;
    const kind = TOTAL_STRONG.test(l.up) ? 'strong' : TOTAL.test(l.up) || /TOTAL/.test(squash(l.up)) ? 'total' : PAID_BY.test(l.up) ? 'paid' : null;
    if (!kind) continue;
    const ms = rowAmounts(l, lines, shift);
    if (!ms.length) {
      if (kind !== 'paid') totalRows.push(l);
      continue;
    }
    const base = kind === 'strong' ? 0.95 : kind === 'total' ? 0.9 : 0.75;
    cands.push({ minor: rightmost(ms).minor, conf: rightmost(ms).conf, score: changeAt >= 0 && l.i > changeAt && kind !== 'paid' ? 0.7 : base, kind });
  }

  if (!cands.some((c) => c.kind !== 'paid') && totalRows.length) {
    const first = (pick: (l: Line) => boolean) => {
      const l = lines.find(pick);
      const ms = l ? rowAmounts(l, lines, shift) : [];
      return ms.length ? rightmost(ms).minor : null;
    };
    const sum = { sub: first(isSubtotal), tax: first((l) => TAX.test(l.up) && !INCL.test(l.up)) };
    const paid = cands.map((c) => c.minor);
    for (const l of totalRows) {
      const minor = lostPointTotal(l, lines, shift, sum, paid);
      if (minor !== null) cands.push({ minor, score: 0.85, kind: 'total' });
    }
  }

  if (cands.length) {
    // Prefer the strongest label; among equals the larger figure (a later "TOTAL" after a voided line).
    const best = cands.reduce((a, b) => (b.score > a.score || (b.score === a.score && b.minor > a.minor) ? b : a));
    const agree = cands.filter((c) => c.minor === best.minor && c.kind !== best.kind).length > 0;
    // Two different "totals" disagree: only trust it if the paid-by line confirms one of them.
    const rivals = cands.filter((c) => c.kind !== 'paid' && c.minor !== best.minor && c.score === best.score).length > 0;
    let confidence = best.score;
    if (agree) confidence = Math.min(0.98, confidence + 0.05);
    if (rivals && !agree) confidence = 0.5;
    return { minor: best.minor, confidence };
  }

  // No label at all (parking ticket, till slip): a single figure is probably it; several → not sure.
  const all = lines.filter((l) => !NOT_TOTAL.test(l.up) && !isSubtotal(l) && !TAX.test(l.up)).flatMap((l) => moneyIn(l.text));
  if (!all.length) return { minor: null, confidence: 0 };
  const distinct = new Set(all.map((m) => m.minor));
  const max = Math.max(...distinct);
  // QA-100 A13-6: the receipt HAS a TOTAL label but its figure wasn't read — then the lone price left ("£7.00" twice on a
  // £55.30 Tesco receipt) is an item, not the total. Offer it, never fill it.
  if (totalRows.length) return { minor: max, confidence: 0.4 };
  return { minor: max, confidence: distinct.size === 1 ? 0.65 : 0.4 };
}

// ---------------------------------------------------------------- merchant

/** Chains drivers use, matched anywhere on the receipt → printed name. First match wins (order: fuel, food, retail). */
const BRANDS: [RegExp, string][] = [
  [/\bSHELL\b/, 'Shell'],
  [/\bBP\b|\bB\.P\.\b/, 'BP'],
  [/\bESSO\b/, 'Esso'],
  [/\bTEXACO\b/, 'Texaco'],
  [/\bJET\b(?!\s*WASH)/, 'Jet'],
  [/\bGULF\b/, 'Gulf'],
  [/\bAPPLEGREEN\b/, 'Applegreen'],
  [/\bEURO\s*GARAGES\b|\bEG\s+ON\s+THE\s+MOVE\b/, 'Euro Garages'],
  [/\bMOTO\b/, 'Moto'],
  [/\bWELCOME\s*BREAK\b/, 'Welcome Break'],
  [/\bROADCHEF\b/, 'Roadchef'],
  [/\bCHEVRON\b/, 'Chevron'],
  [/\bEXXON\b/, 'Exxon'],
  [/\bMOBIL\b/, 'Mobil'],
  [/\bSPEEDWAY\b/, 'Speedway'],
  [/\bSUNOCO\b/, 'Sunoco'],
  [/\bMARATHON\b/, 'Marathon'],
  [/\bWAWA\b/, 'Wawa'],
  [/\bSHEETZ\b/, 'Sheetz'],
  [/\bCIRCLE\s*K\b/, 'Circle K'],
  [/\b7[\s-]?ELEVEN\b/, '7-Eleven'],
  [/\bPILOT\b|\bFLYING\s*J\b/, 'Pilot Flying J'],
  [/\bLOVE'?S\s+TRAVEL\b/, "Love's"],
  [/\bRINGGO\b/, 'RingGo'],
  [/\bJUSTPARK\b/, 'JustPark'],
  [/\bNCP\b/, 'NCP'],
  [/\bAPCOA\b/, 'APCOA'],
  [/\bDART\s*CHARGE\b/, 'Dart Charge'],
  [/\bTESCO\b/, 'Tesco'],
  [/\bSAINSBURY'?S?\b/, "Sainsbury's"],
  [/\bASDA\b/, 'Asda'],
  [/\bMORRISONS\b/, 'Morrisons'],
  [/\bALDI\b/, 'Aldi'],
  [/\bLIDL\b/, 'Lidl'],
  [/\bCO-?OP\b/, 'Co-op'],
  [/\bWAITROSE\b/, 'Waitrose'],
  [/\bM\s*&\s*S\b|\bMARKS\s*(&|AND)\s*SPENCER\b/, 'M&S'],
  [/\bGREGGS\b/, 'Greggs'],
  [/\bCOSTA\b/, 'Costa'],
  [/\bSTARBUCKS\b/, 'Starbucks'],
  [/\bPRET\b/, 'Pret'],
  [/\bMCDONALD'?S\b/, "McDonald's"],
  [/\bBURGER\s*KING\b/, 'Burger King'],
  [/\bKFC\b/, 'KFC'],
  [/\bSUBWAY\b/, 'Subway'],
  [/\bDUNKIN'?\b/, "Dunkin'"],
  [/\bHALFORDS\b/, 'Halfords'],
  [/\bSCREWFIX\b/, 'Screwfix'],
  [/\bTOOLSTATION\b/, 'Toolstation'],
  [/\bB\s*&\s*Q\b/, 'B&Q'],
  [/\bEURO\s*CAR\s*PARTS\b/, 'Euro Car Parts'],
  [/\bKWIK\s*FIT\b/, 'Kwik Fit'],
  [/\bAUTOZONE\b/, 'AutoZone'],
  [/\bO'?REILLY\b/, "O'Reilly"],
  [/\bNAPA\b/, 'NAPA'],
  [/\bWALMART\b|\bWAL-MART\b/, 'Walmart'],
  [/\bCOSTCO\b/, 'Costco'],
  [/\bTARGET\b/, 'Target'],
  [/\bHOME\s*DEPOT\b/, 'Home Depot'],
  [/\bLOWE'?S\b/, "Lowe's"],
  [/\bWALGREENS\b/, 'Walgreens'],
  [/\bCVS\b/, 'CVS'],
  [/\bBOOTS\b/, 'Boots'],
  [/\bWHSMITH\b|\bWH\s*SMITH\b/, 'WHSmith'],
  [/\bSTAPLES\b/, 'Staples'],
  [/\bCURRYS\b/, 'Currys'],
  [/\bARGOS\b/, 'Argos'],
];

const NOT_NAME =
  /(\bVAT\b|\bREG\b|\bTEL\b|\bPHONE\b|\bWWW\.|\.CO\b|\.COM\b|@|\bRECEIPT\b|\bINVOICE\b|\bWELCOME\b|\bCOPY\b|\bCUSTOMER\b|\bMERCHANT\b|\bTERMINAL\b|\bTILL\b|\bCASHIER\b|\bSTORE\s*(NO|#)|\bTRANS|\bAUTH|\bROAD\b|\bRD\b|\bSTREET\b|\bST\b\.?$|\bLANE\b|\bAVE(NUE)?\b|\bWAY\b|\bUNIT\b|\bPARK\b|\bESTATE\b|\bBLVD\b|\bSUITE\b|\bHIGHWAY\b|\bHWY\b|\bDRIVE\b|\bTHANK)/;
/** Template / sample text that is never a shop ("Shop Name", "Lorem Ipsum" on receipt mock-ups). */
const PLACEHOLDER = /\b(LOREM|IPSUM|SHOP\s*NAME|COMPANY\s*NAME|STORE\s*NAME|BUSINESS\s*NAME|YOUR\s*(SHOP|STORE|COMPANY)|MM\/DD|DD\/MM|YYYY)\b/;
/** Upper case without accents ("IESÇO" → "IESCO"). */
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const LOGO_SLIPS: [RegExp, string][] = [
  [/(^|\s)[TI1]ESC[O0Q](\s|$)/, 'Tesco'],
  [/(^|\s)SHE[L1I]\s?[L1I](\s|$)/, 'Shell'],
];
const POSTCODE =/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b|\b\d{5}(-\d{4})?\b/;

/** "TESCO EXPRESS" → "Tesco Express"; mixed case is kept as printed. */
function tidyName(s: string): string {
  const t = s.replace(/[*#|_~=]+/g, ' ').replace(/\s+/g, ' ').replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9')]+$/g, '').trim();
  const name = t === t.toUpperCase() ? t.toLowerCase().replace(/(^|[\s&/-])([a-z])/g, (_m, p: string, c: string) => p + c.toUpperCase()) : t;
  return name.slice(0, 40);
}

function readMerchant(lines: Line[]): { name: string | null; confidence: number } {
  const n = lines.length;
  if (!n) return { name: null, confidence: 0 };
  const topCut = Math.max(3, Math.ceil(n * 0.35));
  for (const [re, name] of BRANDS) {
    const hit = lines.find((l) => re.test(l.up));
    if (hit) return { name, confidence: hit.i < topCut ? 0.92 : 0.8 };
  }
  // QA-100 B-102: logos read with a slip ("Iesço" for TESCO, "ShelI" for Shell) — only for these two, near the top.
  for (const [re, name] of LOGO_SLIPS) {
    const hit = lines.slice(0, topCut).find((l) => re.test(plain(l.up)));
    if (hit) return { name, confidence: 0.8 };
  }
  // No known chain: the first plausible name in the top lines (biggest text = shop name on most till rolls).
  const top = lines.slice(0, Math.min(n, Math.max(4, Math.ceil(n * 0.2))));
  const named = top.filter((l) => {
    // "UNITED PACIFIC 5651" (first line): a trailing store number doesn't make the name a reference line. Item lines
    // further down ("MILK GALLON 895426") keep their code and stay out.
    const t = l.i <= 1 ? l.text.replace(/\s*#?\d{1,6}$/, '') : l.text;
    // "250 TIBURON BLVD": a line starting with a house number is the address.
    if (/^\d{1,5}\s+[A-Za-z]/.test(l.text)) return false;
    // "Date:" / "Tel:" — a field label, not a name.
    if (/:\s*$/.test(l.text)) return false;
    const letters = (t.match(/[A-Za-z]/g) ?? []).length;
    const digits = (t.match(/\d/g) ?? []).length;
    return letters >= 3 && digits <= letters * 0.3 && l.text.length <= 40 && !NOT_NAME.test(l.up) && !PLACEHOLDER.test(l.up) && !POSTCODE.test(l.up) && !moneyIn(l.text).length && !findDate(l.text, 'UK');
  });
  if (!named.length) return { name: null, confidence: 0 };
  const tallest = named.every((l) => l.box) ? named.reduce((a, b) => (b.box!.h > a.box!.h * 1.35 ? b : a)) : named[0];
  return { name: tidyName(tallest.text.replace(/\s*#?\d{1,6}$/, '')) || null, confidence: tallest === named[0] || tallest.i <= 1 ? 0.62 : 0.6 };
}

// ---------------------------------------------------------------- date

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MON = '(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC)[A-Z]*\\.?';

interface FoundDate {
  y: number | null;
  m: number;
  d: number;
  confidence: number;
}

/** Two-digit years: "26" → 2026, but "94" → 1994 (never a year further ahead than next year). */
const year4 = (y: string) => {
  if (y.length !== 2) return Number(y);
  const n = 2000 + Number(y);
  return n > new Date().getFullYear() + 1 ? n - 100 : n;
};
const validDay = (y: number, m: number, d: number) => m >= 1 && m <= 12 && d >= 1 && d <= new Date(y, m, 0).getDate();

/** First date in a line. UK reads 03/04/26 as 3 Apr, US as Mar 4; an impossible order is swapped either way. */
function findDate(text: string, region: Region): FoundDate | null {
  // OCR reads the O of OCT / NOV as a zero ("06 0CT 2026", QA-100 B-102 r06).
  const up = text.toUpperCase().replace(/(^|[\s\d-])0CT\b/g, '$1OCT').replace(/\bN0V\b/g, 'NOV');
  let m = up.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (m) return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]), confidence: 0.92 };

  // "DATE06/21/06": a label glued to the date (no word break before the digits).
  m = up.match(/(?<!\d)(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})(?![\d.])/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    let dayFirst = region !== 'US';
    if (a > 12 && b <= 12) dayFirst = true;
    else if (b > 12 && a <= 12) dayFirst = false;
    return { y: year4(m[3]), m: dayFirst ? b : a, d: dayFirst ? a : b, confidence: m[3].length === 4 ? 0.9 : 0.85 };
  }

  m = up.match(new RegExp(`\\b(\\d{1,2})(?:ST|ND|RD|TH)?[\\s-]*${MON}[\\s,-]*(\\d{4}|\\d{2})?\\b`));
  if (m) return { y: m[3] ? year4(m[3]) : null, m: MONTHS.indexOf(m[2].slice(0, 3)) + 1, d: Number(m[1]), confidence: m[3] ? 0.9 : 0.75 };

  m = up.match(new RegExp(`\\b${MON}\\s*(\\d{1,2})(?:ST|ND|RD|TH)?,?\\s*(\\d{4})?\\b`));
  if (m) return { y: m[3] ? Number(m[3]) : null, m: MONTHS.indexOf(m[1].slice(0, 3)) + 1, d: Number(m[2]), confidence: m[3] ? 0.9 : 0.75 };
  return null;
}

const TIME_RE = /\b([01]?\d|2[0-3])[:.]([0-5]\d)(?::[0-5]\d)?\s?([AP]\.?M\.?)?(?![\d.])/i;

function findTime(text: string): number | null {
  const m = text.match(TIME_RE);
  if (!m) return null;
  let h = Number(m[1]);
  const pm = m[3]?.toUpperCase().startsWith('P');
  if (m[3] && h > 12) return null;
  if (m[3]) h = (h % 12) + (pm ? 12 : 0);
  return h * 60 + Number(m[2]);
}

const DAY_MS = 24 * 60 * 60 * 1000;

function readDate(lines: Line[], region: Region, now: number): { date: number | null; minutes: number | null; confidence: number } {
  // QA-100 B-102 r12: "DATE 3/10/26" on a dollar receipt is March 10th even when the app is set to the UK — the receipt's
  // own currency says which way round its dates are. Only a clear sign switches (dollars and no pounds, or the reverse).
  const all = lines.map((l) => l.text).join(' ');
  const dollars = /\$\s?\d/.test(all);
  const pounds = /£\s?\d/.test(all);
  const order: Region = dollars && !pounds ? 'US' : pounds && !dollars ? 'UK' : region;
  // A date printed with its time is the transaction; "TOTAL UP TO 22/04/12" (points statement) and expiry lines are not.
  const usable = lines.filter((l) => !/\bEXP|\bEXPIRY|\bEXPIRES|\bVALID\b|\bUP\s*TO\b|\bPOINTS\b|\bDUE\b/.test(l.up) && findDate(l.text, order));
  const withTime = usable.find((l) => findTime(l.text.replace(/(?<!\d)\d{1,4}[-/.]\d{1,2}[-/.]\d{2,4}(?!\d)/, ' ')) !== null);
  for (const l of withTime ? [withTime, ...usable.filter((x) => x !== withTime)] : usable) {
    const f = findDate(l.text, order);
    if (!f) continue;
    const today = new Date(now);
    let y = f.y ?? today.getFullYear();
    // No year printed: the most recent such day that is not in the future.
    if (f.y === null && new Date(y, f.m - 1, f.d).getTime() > now + DAY_MS) y -= 1;
    if (!validDay(y, f.m, f.d)) continue;
    const date = new Date(y, f.m - 1, f.d).getTime();
    let confidence = f.confidence;
    if (date > now + DAY_MS) confidence = 0.2;
    // No age limit (Phương, 18/11): a driver catching up before the 31 Jan deadline enters receipts 600+ days old, and
    // "Now" put them in the wrong tax year. An old date is filled like any other (highlighted "from receipt").
    // Time on the date line, else the first time on the line just below / above.
    const near = [l, lines[l.i + 1], lines[l.i - 1]].filter(Boolean) as Line[];
    const timeText = near.map((x) => (x === l ? x.text.replace(/\b\d{1,4}[-/.]\d{1,2}[-/.]\d{2,4}\b/, ' ') : x.text));
    const minutes = timeText.map(findTime).find((v) => v !== null) ?? null;
    return { date, minutes, confidence };
  }
  return { date: null, minutes: null, confidence: 0 };
}

// ---------------------------------------------------------------- entry point

export function parseReceipt(raw: RawOcr | null, region: Region, now = Date.now()): ParsedReceipt {
  if (!raw || !raw.lines?.length) return EMPTY_READING;
  const lines = prepare(raw);
  const amount = readAmount(lines);
  const merchant = readMerchant(lines);
  const date = readDate(lines, region, now);
  return {
    amountMinor: amount.minor,
    merchant: merchant.name,
    date: date.date,
    minutes: date.minutes,
    confidence: { amount: amount.confidence, merchant: merchant.confidence, date: date.confidence },
  };
}
