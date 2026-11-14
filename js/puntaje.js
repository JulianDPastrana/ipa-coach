// Nota por fonema a partir de los logits de wav2vec2. Es el mismo cálculo de fonemas.py en IPA-Coach.

export const BIEN = 0.35, CASI = 0.15; // calibrados con voces nativas

// Variantes que un nativo usa sin que sea error (además de la versión larga con ː de cada vocal).
const ALOFONOS = {
  en: { t: ["ɾ", "ʔ"], d: ["ɾ"], "ɔ": ["ɑ"], "ɑ": ["ɔ", "a"], "ə": ["ɐ", "ʌ", "ɪ", "ᵻ"], "ɐ": ["ə", "ʌ"],
        "ɪ": ["ᵻ", "ə"], l: ["ɫ"], "ɹ": ["ɻ"], "oʊ": ["o", "əʊ"], "eɪ": ["e"], "ɛ": ["e"], "ɜ": ["ɚ"] },
  fr: { "ʁ": ["χ", "ʀ", "ɣ"], "ə": ["ø", "œ"], "ɛ": ["e"], e: ["ɛ"], "ɔ": ["ʌ"], a: ["ɑ"], "œ̃": ["ɛ̃"] },
};

export const limpiar = (f) => f.normalize("NFC").replace(/[ːˈˌ]/g, "");

// 0,25 s de silencio a cada lado y normalización media 0, varianza 1 (lo que hace el feature extractor de HF).
export function prepararEntrada(audio) {
  const x = new Float32Array(audio.length + 8000);
  x.set(audio, 4000);
  let suma = 0;
  for (const v of x) suma += v;
  const media = suma / x.length;
  let varianza = 0;
  for (const v of x) varianza += (v - media) ** 2;
  const escala = 1 / Math.sqrt(varianza / x.length + 1e-7);
  for (let i = 0; i < x.length; i++) x[i] = (x[i] - media) * escala;
  return x;
}

export function logSoftmax(logits, T, V) {
  const lp = new Float32Array(T * V);
  for (let t = 0; t < T; t++) {
    const o = t * V;
    let max = -Infinity;
    for (let v = 0; v < V; v++) max = Math.max(max, logits[o + v]);
    let suma = 0;
    for (let v = 0; v < V; v++) suma += Math.exp(logits[o + v] - max);
    const log = max + Math.log(suma);
    for (let v = 0; v < V; v++) lp[o + v] = logits[o + v] - log;
  }
  return lp;
}

// Alineación forzada CTC (Viterbi): qué frames le corresponden a cada fonema esperado.
export function alinear(lp, T, V, ids, blank = 0) {
  if (!ids.length || !T) return ids.map(() => []);
  const estados = [blank];
  for (const i of ids) estados.push(i, blank);
  const S = estados.length, NEG = -1e9;
  const dp = new Float64Array(T * S).fill(NEG);
  const atras = new Uint8Array(T * S);
  dp[0] = lp[estados[0]];
  dp[1] = lp[estados[1]];
  for (let t = 1; t < T; t++) {
    const ant = (t - 1) * S, act = t * S;
    for (let s = 0; s < S; s++) {
      let mejor = dp[ant + s], k = 0;
      const uno = s >= 1 ? dp[ant + s - 1] : NEG;
      if (uno > mejor) [mejor, k] = [uno, 1];
      const saltable = s >= 2 && estados[s] !== blank && estados[s] !== estados[s - 2];
      const dos = saltable ? dp[ant + s - 2] : NEG;
      if (dos > mejor) [mejor, k] = [dos, 2];
      dp[act + s] = mejor + lp[t * V + estados[s]];
      atras[act + s] = k;
    }
  }
  const fin = (T - 1) * S;
  let s = dp[fin + S - 1] >= dp[fin + S - 2] ? S - 1 : S - 2;
  const frames = ids.map(() => []);
  for (let t = T - 1; t >= 0; t--) {
    if (s % 2 === 1) frames[(s - 1) / 2].push(t);
    s -= atras[t * S + s];
  }
  return frames;
}

export class Evaluador {
  constructor({ pad, vocab }) {
    this.blank = pad;
    this.vocab = vocab;
    this.tokens = [];
    for (const [tok, i] of Object.entries(vocab)) this.tokens[i] = tok;
    this.cacheAceptables = {};
  }

  // Ids del modelo que cuentan como haber dicho bien el fonema f.
  aceptables(f, lang) {
    const clave = lang + f;
    if (!this.cacheAceptables[clave]) {
      const nombres = [f, ...(ALOFONOS[lang][f] ?? [])];
      this.cacheAceptables[clave] = this.tokens.flatMap((tok, i) => (nombres.includes(tok.replaceAll("ː", "")) ? [i] : []));
    }
    return this.cacheAceptables[clave];
  }

  conoce(f) {
    return f in this.vocab;
  }

  // Para cada fonema esperado: [fonema, a qué sonó, probabilidad de que lo dijeras bien], y lo que se oyó.
  evaluar(logits, T, V, objetivo, lang) {
    const lp = logSoftmax(logits, T, V);
    const ids = objetivo.map((f) => this.vocab[f]);
    const alineados = alinear(lp, T, V, ids, this.blank);
    const filas = objetivo.map((f, k) => {
      const fr = alineados[k];
      let prob = 0, sono = f;
      if (fr.length) {
        const buenos = this.aceptables(f, lang);
        for (const t of fr) {
          const o = t * V;
          const habla = 1 - Math.exp(lp[o + this.blank]);
          let suma = 0;
          for (const i of buenos) suma += Math.exp(lp[o + i]);
          prob = Math.max(prob, suma / Math.max(habla, 1e-6));
        }
        prob = Math.min(prob, 1);
        if (prob < 0.5) {
          // El sonido más probable en esos frames, sin contar el silencio.
          let mejor = -Infinity, cual = this.blank;
          for (const t of fr) {
            for (let v = 0; v < V; v++) {
              if (v !== this.blank && lp[t * V + v] > mejor) [mejor, cual] = [lp[t * V + v], v];
            }
          }
          sono = this.tokens[cual].replaceAll("ː", "");
        }
      }
      return [f, sono, Math.round(prob * 100) / 100];
    });
    return { filas, oido: this.decodificar(lp, T, V) };
  }

  // Decodificación codiciosa de CTC: el token más probable por frame, sin repetidos ni blanks.
  decodificar(lp, T, V) {
    const oido = [];
    let previo = -1;
    for (let t = 0; t < T; t++) {
      let mejor = 0;
      for (let v = 1; v < V; v++) if (lp[t * V + v] > lp[t * V + mejor]) mejor = v;
      if (mejor !== previo && mejor !== this.blank) {
        const f = limpiar(this.tokens[mejor]);
        if (f) oido.push(f);
      }
      previo = mejor;
    }
    return oido;
  }
}
