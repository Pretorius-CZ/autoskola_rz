/**
 * Vyplnění úředního tiskopisu žádosti o přijetí k výuce a výcviku.
 *
 * Převzato z saas_autoskola (src/lib/zadost-pdf.ts). Rozdíl: tady PDF
 * vzniká přímo v prohlížeči návštěvníka. Údaje z formuláře nikam
 * neodcházejí, na server se nic neposílá ani neukládá.
 *
 * Tentýž soubor se načítá i ve zkušebním skriptu v Node
 * (scripts/zkusebni-zadost.js), proto knihovny pdf-lib a fontkit
 * nedostává importem, ale jako parametr.
 *
 * Tiskopis je z roku 2013 a je závazný, musí vypadat přesně takhle.
 * Nemá vyplnitelná pole (AcroForm je prázdný), takže vepisujeme hodnoty
 * do originálu na změřená místa. Kdyby ministerstvo tiskopis změnilo,
 * vymění se soubor a přeměří souřadnice; kód zůstane.
 *
 * Co se ZÁMĚRNĚ nevyplňuje:
 *   - čestné prohlášení (místo a datum) — vypisuje se rukou při podpisu
 *   - souhlas zákonného zástupce
 *   - CELÁ spodní část "vyplňuje provozovatel autoškoly"
 *   - razítka a podpisy
 *   - část pro vstupní školení u skupin C a D
 *
 * Souřadnice odpovídají A4 (595,25 × 841,9 bodu):
 *   x      = kde začíná tečkovaná linka
 *   yShora = účaří textu měřené od horního okraje stránky
 *   sirka  = kolik je místa, než se narazí do dalšího pole
 *
 * Konce linek přeměřeny z vykreslené stránky 30. 10. 2026; ostatní pole
 * z předlohy sedí na bod přesně.
 */

const VYSKA_STRANKY = 841.9;
const VELIKOST_PISMA = 9;
const NEJMENSI_PISMO = 5;

/**
 * O kolik bodů psát nad tečkovanou linku. Bez posunu by hodnota seděla
 * přímo na tečkách a špatně se četla. Řádky jsou od sebe asi 20 bodů,
 * takže do řádku nad se to nedostane.
 */
const NAD_LINKOU = 4;

const POLE = {
  skupina:          { x: 369, yShora: 83.6,  sirka: 139 },
  drzitelSkupiny:   { x: 272, yShora: 104.2, sirka: 86 },  // předloha má 103 a vjíždí do "číslo řidičského průkazu"
  cisloRidicskeho:  { x: 454, yShora: 104.2, sirka: 51 },
  jmeno:            { x: 89,  yShora: 145.8, sirka: 118 },
  prijmeni:         { x: 282, yShora: 145.8, sirka: 222 },
  datumNarozeni:    { x: 121, yShora: 166.4, sirka: 87 },
  mistoNarozeni:    { x: 249, yShora: 166.4, sirka: 78 },
  rodneCislo:       { x: 381, yShora: 166.4, sirka: 123 },
  obcanstvi:        { x: 122, yShora: 187.0, sirka: 84 },
  dokladCislo:      { x: 309, yShora: 187.0, sirka: 83 },
  telefon:          { x: 415, yShora: 187.0, sirka: 89 },
  adresa:           { x: 120, yShora: 207.9, sirka: 277 }, // předloha má 296 a vjíždí do "PSČ"
  psc:              { x: 421, yShora: 207.9, sirka: 83 },
  orpBydliste:      { x: 328, yShora: 228.6, sirka: 177 },
};

/**
 * Nejvyšší povolená délka každého údaje. Stejná čísla má formulář
 * v maxlength; tady se hlídají znovu, protože maxlength jde v prohlížeči
 * obejít.
 */
export const MAX_DELKA = {
  skupina: 30,
  drzitelSkupin: 30,
  cisloRidicskeho: 12,
  jmeno: 40,
  prijmeni: 50,
  titul: 20,
  datumNarozeni: 10,
  mistoNarozeni: 40,
  rodneCislo: 11,
  statniPrislusnost: 30,
  dokladCislo: 20,
  telefon: 20,
  ulice: 60,
  mesto: 40,
  psc: 6,
  orpBydliste: 40,
};

/** Ořízne mezery, odstraní řídicí znaky (i konce řádků) a zkrátí na limit. */
function ocisti(text, klic) {
  if (typeof text !== "string") return null;
  const cisty = text
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_DELKA[klic]);
  return cisty || null;
}

/** "2008-03-14" → "14. 3. 2008"; skládáme ručně, ať nezáleží na časovém pásmu. */
function formatDatum(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text ?? "");
  if (!m) return text;
  return `${Number(m[3])}. ${Number(m[2])}. ${m[1]}`;
}

/** Na tiskopise se rodné číslo píše s lomítkem, jak je zvykem. */
function formatRodneCislo(text) {
  if (!text) return text;
  const cislice = text.replace(/\D/g, "");
  return cislice.length === 10 || cislice.length === 9
    ? `${cislice.slice(0, 6)}/${cislice.slice(6)}`
    : text;
}

/**
 * Jen číslice telefonu, bez mezer a předvolby (+420, 00420, 420).
 * Mezery se mažou dřív než předvolba, jinak by "+420 777…" předvolbu
 * neschovalo. Platné číslo má po úpravě 9 číslic.
 */
export function cisliceTelefonu(text) {
  return String(text ?? "")
    .replace(/[\s\-–().\/]/g, "")
    .replace(/^(\+|00)?420(?=\d{9}$)/, "");
}

/** "+420777123456" → "777 123 456"; co nemá 9 číslic, zůstane, jak je. */
function formatTelefon(text) {
  if (!text) return text;
  const c = cisliceTelefonu(text);
  return /^\d{9}$/.test(c) ? `${c.slice(0, 3)} ${c.slice(3, 6)} ${c.slice(6)}` : text;
}

function slozAdresu(ulice, mesto) {
  const casti = [ulice, mesto].filter(Boolean);
  return casti.length ? casti.join(", ") : null;
}

/** Očištěné údaje z formuláře (objekt textů podle klíčů MAX_DELKA). */
export function ocistiUdaje(vstup) {
  const u = {};
  for (const klic of Object.keys(MAX_DELKA)) u[klic] = ocisti(vstup?.[klic], klic);
  return u;
}

/**
 * @param vstup   údaje z formuláře
 * @param zdroje  { sablona, pismo } jako ArrayBuffer/Uint8Array
 *                a knihovny { PDFLib, fontkit }
 * @returns       bajty hotového PDF
 */
export async function vyplnZadost(vstup, { sablona, pismo, PDFLib, fontkit }) {
  const { PDFDocument, rgb } = PDFLib;
  const u = ocistiUdaje(vstup);

  const doc = await PDFDocument.load(sablona);
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(pismo, { subset: true });
  const [strana] = doc.getPages();

  const inkoust = rgb(0, 0, 0);

  function napis(klic, text) {
    if (!text) return;
    const p = POLE[klic];

    // Když se text nevejde, zmenšíme ho. Radši drobněji než přes okraj.
    let velikost = VELIKOST_PISMA;
    while (velikost > NEJMENSI_PISMO && font.widthOfTextAtSize(text, velikost) > p.sirka) {
      velikost -= 0.5;
    }
    // Ani nejmenší písmo nestačí (předloha tenhle případ neřeší, tam
    // údaje kontroluje autoškola): zkrátit, ať nevjede do vedlejšího pole.
    if (font.widthOfTextAtSize(text, velikost) > p.sirka) {
      while (text.length > 1 && font.widthOfTextAtSize(text + "…", velikost) > p.sirka) {
        text = text.slice(0, -1);
      }
      text = text.trimEnd() + "…";
    }

    strana.drawText(text, {
      x: p.x,
      y: VYSKA_STRANKY - p.yShora + NAD_LINKOU,
      size: velikost,
      font,
      color: inkoust,
    });
  }

  napis("skupina", u.skupina);
  napis("drzitelSkupiny", u.drzitelSkupin);
  napis("cisloRidicskeho", u.cisloRidicskeho);

  napis("jmeno", u.jmeno);
  napis("prijmeni", u.titul ? `${u.prijmeni} (${u.titul})` : u.prijmeni);
  napis("datumNarozeni", formatDatum(u.datumNarozeni));
  napis("mistoNarozeni", u.mistoNarozeni);
  napis("rodneCislo", formatRodneCislo(u.rodneCislo));
  napis("obcanstvi", u.statniPrislusnost);
  napis("dokladCislo", u.dokladCislo);
  napis("telefon", formatTelefon(u.telefon));
  napis("adresa", slozAdresu(u.ulice, u.mesto));
  napis("psc", u.psc);
  napis("orpBydliste", u.orpBydliste);

  // Čestné prohlášení (místo a datum) schválně NEVYPLŇUJEME.
  // Žadatel ho vypisuje rukou ve chvíli, kdy se pod něj podepisuje.

  return doc.save();
}
