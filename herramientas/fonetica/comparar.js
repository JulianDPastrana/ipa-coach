// Compara los fonemas que saca el navegador con esperado() de IPA-Coach (referencia.json).
// Motores: phonemizer.js (solo inglés, IPA corrido) y espeak-ng de echogarden (en y fr, separado con "_").
// Uso: python -X utf8 -B referencia.py && npm run comparar
import { readFileSync } from "node:fs";
import { phonemize } from "phonemizer";
import crearEspeak from "./dist/espeak-ng.js"; // copia recortada a en+fr (node recortar.js)
import { fonemas, prepararTexto } from "./tokenizar.js";

const ref = JSON.parse(readFileSync(new URL("referencia.json", import.meta.url), "utf8"));
const VOCES = { en: "en-us", fr: "fr" }; // en este espeak "fr-fr" no es un nombre de voz; "fr" es la misma (roa/fr)

const espeak = await crearEspeak();
const motorEspeak = new espeak.eSpeakNGWorker();
function leerTexto(ptr) {
  const h = espeak.HEAPU8;
  let fin = ptr.ptr;
  while (h[fin]) fin++;
  return new TextDecoder().decode(h.subarray(ptr.ptr, fin));
}

const motores = {
  "phonemizer.js": { idiomas: ["en"], salida: async (texto, lang) => (await phonemize(prepararTexto(texto), VOCES[lang])).join(" ") },
  "espeak-ng (echogarden)": {
    idiomas: ["en", "fr"],
    salida: async (texto, lang) => {
      if (motorEspeak.set_voice(VOCES[lang]) !== 0) throw new Error("voz no encontrada: " + VOCES[lang]);
      return leerTexto(motorEspeak.text_to_phonemes(prepararTexto(texto), 1));
    },
  },
};

const igual = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const GRUPOS = { lecciones: ["palabra", "par", "frase"], extra: ["extra"] };

for (const [nombre, motor] of Object.entries(motores)) {
  console.log(`\n=== ${nombre}`);
  for (const lang of motor.idiomas) {
    for (const [grupo, tipos] of Object.entries(GRUPOS)) {
      const casos = ref.casos.filter((c) => c.lang === lang && tipos.includes(c.tipo));
      const fallos = [];
      for (const c of casos) {
        const salida = await motor.salida(c.texto, lang);
        const js = fonemas(salida);
        if (!igual(js, c.fonemas)) fallos.push({ ...c, salida, js });
      }
      const pct = (100 * (casos.length - fallos.length)) / casos.length;
      console.log(`${lang} ${grupo}: ${casos.length - fallos.length}/${casos.length} iguales (${pct.toFixed(1)} %)`);
      for (const f of fallos) {
        console.log(`  [${f.tipo}] ${f.texto}`);
        console.log(`    py: ${f.fonemas.join(" ")}`);
        console.log(`    js: ${f.js.join(" ")}    <- ${f.salida}`);
      }
    }
  }
}
