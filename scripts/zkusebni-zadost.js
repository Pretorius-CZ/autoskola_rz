// Vyrobí zkušební žádosti s vymyšlenými údaji, ať jde ověřit, že text
// sedí na linkách. Použití: node scripts/zkusebni-zadost.js [výstupní složka]
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import * as PDFLib from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { vyplnZadost } from "../js/zadost-pdf.js";

const vystup = process.argv[2] ?? "zkusebni-zadosti";
await mkdir(vystup, { recursive: true });

const [sablona, pismo] = await Promise.all([
  readFile("tiskopisy/zadost-2013.pdf"),
  readFile("tiskopisy/LiberationSans-Regular.ttf"),
]);

const VZORY = {
  bezna: {
    skupina: "B", jmeno: "Jiří", prijmeni: "Novák", datumNarozeni: "2007-03-14",
    mistoNarozeni: "Jablonec n. N.", rodneCislo: "0703140123", statniPrislusnost: "ČR",
    dokladCislo: "123456789", telefon: "777 123 456", ulice: "Žitná 12",
    mesto: "Jablonec nad Nisou", psc: "466 01", orpBydliste: "Jablonec nad Nisou",
  },
  dlouha: {
    skupina: "AM, A1, A2, A, B", drzitelSkupin: "AM, A1, A2, B1, B, BE, T", cisloRidicskeho: "EK 123456",
    jmeno: "Maximilián Bořivoj", prijmeni: "Šťastný-Žluťoučký von Křižíkovičová", titul: "Ing. Mgr.",
    datumNarozeni: "1999-12-31", mistoNarozeni: "Ústí nad Orlicí", rodneCislo: "995231/1234",
    statniPrislusnost: "Česká republika", dokladCislo: "ŘÉ-987654321", telefon: "+420 777 946 063",
    ulice: "Třída Čeňka Ďáblíka Řeřichovského 1234/56b", mesto: "Frýdlant nad Ostravicí",
    psc: "739 11", orpBydliste: "Frýdek-Místek – Čeladná",
  },
  extremni: {
    skupina: "W".repeat(40), jmeno: "Ž".repeat(60), prijmeni: "WWWWŠŠŠŠ".repeat(10),
    cisloRidicskeho: "WWWWWWWWWWWWWWW", ulice: "Ř".repeat(100), mesto: "x\nnový řádek\u0000",
    psc: "1234567890", telefon: 12345,
  },
};

for (const [nazev, udaje] of Object.entries(VZORY)) {
  const pdf = await vyplnZadost(udaje, { sablona, pismo, PDFLib, fontkit });
  const soubor = path.join(vystup, `zadost-${nazev}.pdf`);
  await writeFile(soubor, pdf);
  console.log(soubor, pdf.length, "B");
}
