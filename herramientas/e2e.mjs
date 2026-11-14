// Prueba de punta a punta en Edge real: service worker, aislamiento (hilos), micrófono falso que reproduce
// un WAV, calificación, progreso, frase libre y uso sin internet.
// Uso:  node herramientas/e2e.mjs [url]   (por defecto http://127.0.0.1:8790/, servido con python -m http.server)
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const URL_APP = process.argv[2] ?? "http://127.0.0.1:8790/";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const AUDIO = fileURLToPath(new URL("../prueba/audio/", import.meta.url));
const PERFIL = join(tmpdir(), `ipa-coach-e2e-${Date.now()}`); // perfil nuevo: la primera visita es de verdad la primera
const FOTOS = join(tmpdir(), "ipa-coach-e2e-fotos");
mkdirSync(FOTOS, { recursive: true });

let fallos = 0;
function revisar(ok, texto) {
  console.log(`${ok ? "OK  " : "FALLA"} ${texto}`);
  if (!ok) fallos++;
}

const abiertos = [];
process.on("exit", () => abiertos.forEach((n) => n.process()?.kill()));

async function abrir(wav) {
  const navegador = await puppeteer.launch({
    executablePath: EDGE, headless: true, userDataDir: PERFIL,
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream",
           `--use-file-for-fake-audio-capture=${join(AUDIO, wav)}%noloop`, "--autoplay-policy=no-user-gesture-required"],
  });
  abiertos.push(navegador);
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  pagina.on("console", (m) => m.type() === "error" && console.log("   consola:", m.text()));
  pagina.on("pageerror", (e) => console.log("   error de página:", e.message));
  return { navegador, pagina };
}

async function cargarApp(pagina) {
  await pagina.goto(URL_APP, { waitUntil: "load" });
  await pagina.waitForFunction(() => crossOriginIsolated, { timeout: 60000 }).catch(() => {});
  await pagina.waitForSelector(".tarjeta.actual .ficha");
}

async function elegirSonido(pagina, ipa) {
  if (await pagina.$("#carga[open]")) await pagina.click("#carga-ver"); // primera vez: sigue mientras descarga
  await pagina.click("#btn-sonidos");
  await pagina.waitForSelector(`#sonidos .fila[data-ipa="${ipa}"]`, { visible: true });
  await pagina.click(`#sonidos .fila[data-ipa="${ipa}"]`);
  await pagina.waitForFunction((ipa) => document.querySelector("#glifo").textContent === ipa, {}, ipa);
  // Un sonido nuevo abre su tutorial: corte de la boca animado y los tres pasos.
  const tutorial = await pagina.waitForSelector("#hoja-como[open]", { timeout: 5000 }).catch(() => null);
  if (tutorial) {
    await new Promise((r) => setTimeout(r, 2500));
    const t = await pagina.evaluate(() => ({
      lengua: document.querySelector("#como-boca .lengua").getAttribute("d")?.length ?? 0,
      pasos: document.querySelectorAll("#como-pasos li").length,
      aire: document.querySelector("#como-boca .aire").getAttribute("d")?.length ?? 0,
    }));
    revisar(t.lengua > 50 && t.pasos === 3 && t.aire > 20, `tutorial de /${ipa}/ con diagrama, aire y 3 pasos`);
    await pagina.screenshot({ path: join(FOTOS, `tutorial-${ipa}.png`) });
    await pagina.click("#hoja-como .primario");
  }
  revisar(tutorial, `un sonido nuevo (/${ipa}/) abre su tutorial`);
  await new Promise((r) => setTimeout(r, 400));
}

// Graba lo que suena por el micrófono falso y espera la nota de la tarjeta actual.
async function grabarYCalificar(pagina, segundos) {
  const antes = await pagina.$eval(".tarjeta.actual .veredicto", (v) => v.textContent);
  await pagina.click("#btn-grabar");
  await new Promise((r) => setTimeout(r, segundos * 1000 + 800));
  const t0 = Date.now();
  await pagina.click("#btn-grabar");
  await pagina.waitForFunction((antes) => {
    const v = document.querySelector(".tarjeta.actual .veredicto").textContent;
    return v && v !== antes;
  }, { timeout: 900000 }, antes);
  const espera = Date.now() - t0;
  await new Promise((r) => setTimeout(r, 1000)); // que terminen de aparecer las fichas
  const resultado = await pagina.$eval(".tarjeta.actual", (t) => ({
    veredicto: t.querySelector(".veredicto").textContent,
    fichas: [...t.querySelectorAll(".ficha")].map((f) => `${f.querySelector("b").textContent}:${f.dataset.nivel}`),
    oido: t.querySelector(".oido").textContent,
    ocultas: t.querySelectorAll(".ficha.entra").length,
  }));
  revisar(!resultado.ocultas, "todas las fichas del resultado quedan visibles");
  return { ...resultado, espera };
}

const nivelDe = (f) => f.split(":")[1];

// 1) Primera visita con un nativo diciendo "very"
{
  const { navegador, pagina } = await abrir("andrew_very.wav");
  await cargarApp(pagina);
  const info = await pagina.evaluate(async () => ({
    aislado: crossOriginIsolated, sw: !!navigator.serviceWorker.controller, caches: await caches.keys(),
  }));
  revisar(info.sw, "el service worker controla la página");
  revisar(info.aislado, "la página queda aislada (el modelo puede usar varios hilos)");
  const descarga = await pagina.waitForSelector("#carga[open]", { timeout: 60000 }).catch(() => null);
  revisar(descarga, "la primera vez muestra la descarga del modelo");
  await pagina.screenshot({ path: join(FOTOS, "1-descarga.png") });

  await elegirSonido(pagina, "v");
  const r = await grabarYCalificar(pagina, 1.2);
  console.log("   very (Andrew):", r.veredicto, "|", r.fichas.join(" "), "|", r.oido, `| ${r.espera} ms`);
  revisar(nivelDe(r.fichas[0]) === "bien", "un nativo diciendo very saca la v bien");
  await pagina.screenshot({ path: join(FOTOS, "2-resultado-nativo.png") });

  const cache = await pagina.evaluate(async () => (await caches.keys()).filter((k) => k.startsWith("modelo-")).length);
  revisar(cache === 1, "el modelo quedó en Cache Storage");
  const historial = await pagina.evaluate(() => JSON.parse(localStorage.getItem("ipa-coach.historial") ?? "[]").length);
  revisar(historial >= 1, "el intento quedó en el historial");
  await navegador.close();
}

// 2) Segunda visita, sin internet, con acento colombiano diciendo "think"
{
  const { navegador, pagina } = await abrir("gonzalo_think.wav");
  await pagina.goto(URL_APP, { waitUntil: "load" }); // registra todo lo necesario estando en línea
  await pagina.setOfflineMode(true);
  await cargarApp(pagina);
  revisar(true, "la app abre sin internet");
  await elegirSonido(pagina, "θ");
  const r = await grabarYCalificar(pagina, 1.1);
  console.log("   think (Gonzalo):", r.veredicto, "|", r.fichas.join(" "), "|", r.oido, `| ${r.espera} ms`);
  revisar(nivelDe(r.fichas[0]) === "mal", "con acento, la θ de think sale mal");
  revisar(/θ/.test(r.veredicto), "el consejo nombra la θ");
  await pagina.screenshot({ path: join(FOTOS, "3-resultado-acento-offline.png") });

  await pagina.click("#btn-progreso");
  await pagina.waitForSelector("#progreso[open]");
  await new Promise((r) => setTimeout(r, 500));
  const racha = await pagina.$eval("#racha", (e) => e.textContent);
  revisar(/^1/.test(racha), `la racha cuenta hoy (${racha})`);
  await pagina.screenshot({ path: join(FOTOS, "4-progreso.png") });
  await pagina.click("#progreso [data-cerrar]");

  // Frase libre: espeak en wasm, también sin internet
  await pagina.click("#btn-sonidos");
  await pagina.waitForSelector("#frase-texto", { visible: true });
  await pagina.type("#frase-texto", "I thought the bottleneck was the data");
  await pagina.keyboard.press("Enter");
  await pagina.waitForFunction(() => document.querySelector("#foco").classList.contains("libre"), { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 400));
  const fichas = await pagina.$$eval(".tarjeta.actual .ficha b", (bs) => bs.map((b) => b.textContent).join(" "));
  const esperado = "aɪ θ ɔ t ð ə b ɑ t ə l n ɛ k w ʌ z ð ə d eɪ ɾ ə";
  revisar(fichas === esperado, `frase libre con el mismo IPA que Python (${fichas})`);
  await pagina.screenshot({ path: join(FOTOS, "5-frase.png") });

  await pagina.click("#idioma [data-lang='fr']");
  await pagina.waitForFunction(() => document.querySelector(".tarjeta.actual .palabra").lang === "fr");
  revisar(true, "cambia a francés");
  await pagina.screenshot({ path: join(FOTOS, "6-frances.png") });
  await navegador.close();
}

console.log(fallos ? `\n${fallos} prueba(s) fallaron` : "\nTodo bien", `· fotos en ${FOTOS}`);
process.exit(fallos ? 1 : 0);
