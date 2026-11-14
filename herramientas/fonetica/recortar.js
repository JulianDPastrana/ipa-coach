// Arma dist/ con espeak-ng (echogarden) dejando solo los diccionarios de inglés y francés.
// El paquete trae los de ~100 idiomas (24 MB); así queda en ~1 MB y se sirve desde la misma web.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const ORIGEN = new URL("node_modules/@echogarden/espeak-ng-emscripten/", import.meta.url);
const DESTINO = new URL("dist/", import.meta.url);
const DICCIONARIOS = ["en_dict", "fr_dict"];

const js = readFileSync(new URL("espeak-ng.js", ORIGEN), "utf8");
const datos = readFileSync(new URL("espeak-ng.data", ORIGEN));

// El JS trae la lista de archivos del paquete: loadPackage({files:[{filename,start,end},...],remote_package_size:N})
const bloque = js.match(/loadPackage\((\{files:\[.*?\],remote_package_size:\d+\})\)/s)[1];
const meta = Function(`return ${bloque}`)();

const partes = [];
const archivos = [];
let pos = 0;
for (const f of meta.files) {
  const nombre = f.filename.split("/").pop();
  if (nombre.endsWith("_dict") && !DICCIONARIOS.includes(nombre)) continue;
  const trozo = datos.subarray(f.start, f.end);
  archivos.push({ filename: f.filename, start: pos, end: pos + trozo.length });
  partes.push(trozo);
  pos += trozo.length;
}

mkdirSync(DESTINO, { recursive: true });
const nuevo = `{files:${JSON.stringify(archivos)},remote_package_size:${pos}}`;
writeFileSync(new URL("espeak-ng.js", DESTINO), js.replace(bloque, () => nuevo));
writeFileSync(new URL("espeak-ng.data", DESTINO), Buffer.concat(partes));
copyFileSync(new URL("COPYING", ORIGEN), new URL("COPYING", DESTINO));
console.log(`dist/espeak-ng.data: ${archivos.length} archivos, ${(pos / 1e6).toFixed(2)} MB`);
