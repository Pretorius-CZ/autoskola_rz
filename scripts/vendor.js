// Zkopíruje knihovny pro prohlížeč z node_modules do vendor/.
// Spustit po každé aktualizaci pdf-lib nebo fontkitu: npm run vendor
import { copyFile, mkdir } from "node:fs/promises";
await mkdir("vendor", { recursive: true });
await copyFile("node_modules/pdf-lib/dist/pdf-lib.min.js", "vendor/pdf-lib.min.js");
await copyFile("node_modules/@pdf-lib/fontkit/dist/fontkit.umd.min.js", "vendor/fontkit.umd.min.js");
console.log("vendor/ aktualizováno");
