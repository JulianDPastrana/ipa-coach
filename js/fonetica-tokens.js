// Salida IPA de espeak-ng -> lista de fonemas del modelo, igual que esperado() en IPA-Coach/fonemas.py.
// Sirve para salida separada con "_" (espeak con separador de fonemas) y para IPA corrido
// (phonemizer.js), que se parte con las unidades que espeak usa en en-us y fr-fr.

// Mismas marcas que quita phonemizer (Python) antes de llamar a espeak.
const PUNTUACION = /(\s*[;:,.!?¡¿—…"«»“”(){}[\]]+\s*)+/g;

// espeak junta algunos sonidos en un símbolo; el modelo los tiene separados.
const PARTIR = { "əl": ["ə", "l"], "əɹ": ["ɚ"], "ɝ": ["ɚ"], "ɑɹ": ["ɑ", "ɹ"], "ɔɹ": ["ɔ", "ɹ"] };

// Sonidos de varios símbolos que espeak entrega como uno solo. Los más largos primero.
const UNIDADES = ["aɪə", "aɪɚ", "aɪ", "aʊ", "eɪ", "oʊ", "ɔɪ", "tʃ", "dʒ", "iə", "əl"];
// Vocal + ɹ en una unidad, solo si después no viene vocal (very = v ɛ ɹ i, share = ʃ ɛɹ).
const CON_R = ["ɑːɹ", "ɔːɹ", "oːɹ", "ɪɹ", "ɛɹ", "ʊɹ"];
const VOCAL = /^[aeiouyæɐɑɒɔəɘɚɛɜɝɞɤɨɪʉʊʌʏøœɶᵻ]/;

export function prepararTexto(texto) {
  return texto.replace(PUNTUACION, " ").trim();
}

// Un símbolo es la letra base con sus diacríticos (ɑ̃, n̩) y su ː.
function simbolos(palabra) {
  return palabra.match(/.[̀-ͯː]*/gu) ?? [];
}

function partirCorrido(palabra) {
  // phonemizer.js escribe oːɹ (more, four) donde espeak en Python da ɔːɹ.
  const s = simbolos(palabra.replaceAll("oːɹ", "ɔːɹ"));
  const unidades = [];
  for (let i = 0; i < s.length; ) {
    const resto = s.slice(i).join("");
    const conR = CON_R.find((u) => resto.startsWith(u) && !VOCAL.test(resto.slice(u.length)));
    const u = conR ?? UNIDADES.find((u) => resto.startsWith(u)) ?? s[i];
    unidades.push(u);
    i += simbolos(u).length;
  }
  return unidades;
}

export function fonemas(salida) {
  const limpia = salida
    .normalize("NFC")
    .replace(/\(.+?\)/g, "") // banderas de cambio de idioma, p. ej. (en)
    .replace(/[ˈˌ'-]+/g, "")
    .replaceAll("|", " "); // separador de cláusulas
  const separada = limpia.includes("_");
  const lista = [];
  for (const palabra of limpia.split(/\s+/)) {
    for (let f of separada ? palabra.split("_") : partirCorrido(palabra)) {
      f = f.replaceAll("ː", "");
      if (f === "ɹ" && lista.at(-1) === "ɚ") lista[lista.length - 1] = "ə"; // around: espeak escribe ɚɹ
      if (f) lista.push(...(PARTIR[f] ?? [f]));
    }
  }
  return lista;
}
