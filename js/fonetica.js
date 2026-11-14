// IPA de cualquier frase con espeak-ng en wasm. Solo se carga si usas "Tu frase".
import { fonemas, prepararTexto } from "./fonetica-tokens.js";

const VOCES = { en: "en-us", fr: "fr" }; // en este espeak "fr" es la voz fr-fr
let motor;

async function cargar() {
  const { default: crearEspeak } = await import("../vendor/espeak/espeak-ng.js");
  const espeak = await crearEspeak();
  return { espeak, worker: new espeak.eSpeakNGWorker() };
}

export async function ipa(texto, lang, vocab) {
  motor ??= cargar();
  const { espeak, worker } = await motor;
  if (worker.set_voice(VOCES[lang]) !== 0) throw new Error("Falta la voz de espeak: " + lang);
  const ptr = worker.text_to_phonemes(prepararTexto(texto), 1).ptr;
  let fin = ptr;
  while (espeak.HEAPU8[fin]) fin++;
  const salida = new TextDecoder().decode(espeak.HEAPU8.subarray(ptr, fin));
  // Un sonido que el modelo no conoce se parte en sus símbolos; lo que siga sin existir se descarta.
  return fonemas(salida).flatMap((f) => (f in vocab ? [f] : [...f].filter((s) => s in vocab)));
}
