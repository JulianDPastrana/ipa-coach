// Guarda la app para usarla sin internet. El modelo lo guarda el worker (js/oido.js) en su propia caché.
const VERSION = "app-1";
const APP = [
  "./", "index.html", "estilo.css", "manifest.webmanifest",
  "js/app.js", "js/audio.js", "js/fonetica.js", "js/fonetica-tokens.js", "js/oido.js", "js/progreso.js", "js/puntaje.js", "js/voz.js",
  "datos/lecciones.json", "modelo/info.json", "modelo/vocab.json",
  "vendor/ort/ort.wasm.min.mjs", "vendor/ort/ort-wasm-simd-threaded.mjs", "vendor/ort/ort-wasm-simd-threaded.wasm",
  "vendor/espeak/espeak-ng.js", "vendor/espeak/espeak-ng.data",
  "fuentes/inter.woff2", "fuentes/noto-ipa.woff2",
  "iconos/icono-192.png", "iconos/icono-512.png", "iconos/icono-mascara-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(APP.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("app-") && k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

// Con estas dos cabeceras la página queda "aislada" y el modelo puede correr en varios hilos.
function aislar(resp) {
  if (!resp || resp.status === 0 || resp.type === "opaqueredirect") return resp;
  const h = new Headers(resp.headers);
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.set("Cross-Origin-Embedder-Policy", "require-corp");
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const guardada = await caches.match(req, { ignoreSearch: true });
    return aislar(guardada ?? (await fetch(req)));
  })());
});
