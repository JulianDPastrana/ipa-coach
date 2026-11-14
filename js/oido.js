// Worker: descarga y guarda el modelo, y califica las grabaciones. Así la interfaz no se congela.
import * as ort from "../vendor/ort/ort.wasm.min.mjs";
import { Evaluador, prepararEntrada } from "./puntaje.js";

const MODELO = new URL("../modelo/", import.meta.url);
const hilos = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
ort.env.wasm.wasmPaths = new URL("../vendor/ort/", import.meta.url).href;
ort.env.wasm.numThreads = hilos;

let listo;

const avisar = (msg) => self.postMessage(msg);
const leerJSON = async (nombre) => (await fetch(new URL(nombre, MODELO))).json();

async function descargar(url, alAvanzar) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`No se pudo descargar ${url.pathname} (${resp.status})`);
  const lector = resp.body.getReader();
  const trozos = [];
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    trozos.push(value);
    alAvanzar(value.length);
  }
  return new Blob(trozos);
}

// Las partes quedan en Cache Storage; la segunda vez se leen de ahí, sin internet.
async function bytesDelModelo(info) {
  const nombreCache = "modelo-" + info.sha256.slice(0, 12);
  for (const viejo of await caches.keys()) {
    if (viejo.startsWith("modelo-") && viejo !== nombreCache) await caches.delete(viejo);
  }
  const cache = await caches.open(nombreCache);
  const urls = info.partes.map((p) => new URL(p, MODELO));
  const guardadas = await Promise.all(urls.map((u) => cache.match(u)));
  const faltan = guardadas.some((r) => !r);

  const bytes = new Uint8Array(info.bytes);
  let pos = 0, bajados = 0;
  for (const [k, url] of urls.entries()) {
    let blob = await guardadas[k]?.blob();
    if (!blob) {
      blob = await descargar(url, (n) => avisar({ tipo: "progreso", bajados: (bajados += n), total: info.bytes }));
      await cache.put(url, new Response(blob));
    } else {
      bajados += blob.size;
    }
    bytes.set(new Uint8Array(await blob.arrayBuffer()), pos);
    pos += blob.size;
  }

  if (faltan) {
    const huella = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
      .map((b) => b.toString(16).padStart(2, "0")).join("");
    if (huella !== info.sha256) {
      await caches.delete(nombreCache);
      throw new Error("El modelo llegó dañado. Vuelve a abrir la app para descargarlo otra vez.");
    }
  }
  return { bytes, descargado: faltan };
}

async function cargar() {
  const t0 = performance.now();
  const [info, vocab] = await Promise.all([leerJSON("info.json"), leerJSON("vocab.json")]);
  const { bytes, descargado } = await bytesDelModelo(info);
  const sesion = await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
  avisar({ tipo: "listo", ms: Math.round(performance.now() - t0), hilos, descargado });
  return { sesion, evaluador: new Evaluador(vocab) };
}

async function evaluar({ audio, objetivo, lang }) {
  const { sesion, evaluador } = await arrancar();
  const x = prepararEntrada(audio);
  const t0 = performance.now();
  const salida = await sesion.run({ audio: new ort.Tensor("float32", x, [1, x.length]) });
  const ms = Math.round(performance.now() - t0);
  const { data, dims } = salida.logits;
  return { ...evaluador.evaluar(data, dims[1], dims[2], objetivo, lang), ms };
}

// Si la carga falla (sin internet en la primera vez), el siguiente intento empieza de cero.
function arrancar() {
  listo ??= cargar().catch((e) => {
    listo = undefined;
    throw e;
  });
  return listo;
}

self.onmessage = async ({ data }) => {
  if (data.tipo === "cargar") {
    arrancar().catch((e) => avisar({ tipo: "error", mensaje: e.message }));
    return;
  }
  if (data.tipo === "evaluar") {
    try {
      await arrancar();
      avisar({ tipo: "resultado", id: data.id, ...(await evaluar(data)) });
    } catch (e) {
      avisar({ tipo: "error", id: data.id, mensaje: e.message });
    }
  }
};
