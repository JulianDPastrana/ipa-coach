// Corre la prueba de paridad en el Chrome del celular (depuración USB) y mide la inferencia allá.
// Antes:  adb reverse tcp:8790 tcp:8790  y  adb forward tcp:9333 localabstract:chrome_devtools_remote
// Uso:    node herramientas/celular.mjs [origen]   (por defecto http://localhost:8790)
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const ORIGEN = process.argv[2] ?? "http://localhost:8790";
const navegador = await puppeteer.connect({ browserURL: "http://127.0.0.1:9333", defaultViewport: null });
const paginas = await navegador.pages();
const pagina = paginas.find((p) => p.url().startsWith(ORIGEN)) ?? (await navegador.newPage());
const log = (...a) => console.log(new Date().toLocaleTimeString(), ...a);

if (!pagina.url().startsWith(ORIGEN)) await pagina.goto(ORIGEN + "/", { waitUntil: "load" });
await pagina.waitForFunction(() => crossOriginIsolated, { timeout: 60000 }).catch(() => log("ojo: la app no quedó aislada"));
log("app abierta · aislada:", await pagina.evaluate(() => crossOriginIsolated));

// Esperar a que el modelo esté completo en la caché (la primera vez se descarga).
const t0 = Date.now();
for (;;) {
  const estado = await pagina.evaluate(async () => {
    const info = await (await fetch("modelo/info.json")).json();
    const nombre = (await caches.keys()).find((k) => k.startsWith("modelo-"));
    const guardadas = nombre ? (await (await caches.open(nombre)).keys()).length : 0;
    return { guardadas, total: info.partes.length, medidor: document.querySelector("#carga-medidor")?.textContent };
  });
  if (estado.guardadas === estado.total) break;
  log(`modelo: ${estado.guardadas}/${estado.total} partes · ${estado.medidor}`);
  await new Promise((r) => setTimeout(r, 10000));
}
log(`modelo en caché (${Math.round((Date.now() - t0) / 1000)} s de espera)`);
await new Promise((r) => setTimeout(r, 3000)); // que termine la verificación del sha256

await pagina.goto(ORIGEN + "/prueba/paridad.html", { waitUntil: "load" });
await pagina.waitForFunction(() => document.title === "LISTO", { timeout: 900000, polling: 2000 });
const res = await pagina.evaluate(() => ({ ...window.resultadoParidad, estado: document.querySelector("#estado").textContent }));
const destino = join(tmpdir(), "ipa-coach-celular.json");
writeFileSync(destino, JSON.stringify(res, null, 1));
log(res.estado);
console.log(JSON.stringify(res.resumen, null, 1));
for (const r of res.resultados) console.log(`${r.audio.padEnd(42)} ${String(r.segundos).padStart(5)} s audio  ${String(r.ms).padStart(6)} ms  Δp ${r.dpOnnx}  ≠ ${r.cambiosOnnx}`);
const porSegundo = res.resultados.map((r) => r.ms / (r.segundos + 0.5)).sort((a, b) => a - b);
console.log(`ms por segundo de audio (con los 0,5 s de relleno): mediana ${Math.round(porSegundo[porSegundo.length >> 1])}`);
await pagina.goto(ORIGEN + "/", { waitUntil: "load" });
await navegador.disconnect();
