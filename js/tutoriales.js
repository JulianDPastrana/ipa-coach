// Cómo se articula cada sonido de las lecciones: la secuencia que se anima en el corte de la boca
// y, cuando sirve, lo que suele hacer un hispanohablante (se dibuja en ámbar para comparar).
import { postura as P } from "./boca.js";

const vocal = (lengua, labios, mandibula) => P({ lengua, labios, mandibula, voz: true, aire: "boca" });
const nasal = (lengua, labios, mandibula) => P({ lengua, labios, mandibula, voz: true, aire: "ambas", velo: "abajo" });
const roce = (lengua, extra) => P({ lengua, aire: "roce", mandibula: 0.1, ...extra });

// Lo que hace un hispanohablante, para el contorno de comparación.
const ES = {
  i: P({ lengua: "i", labios: "estirados", mandibula: 0.05 }),
  e: P({ lengua: "e", mandibula: 0.2 }),
  a: P({ lengua: "a", mandibula: 0.5 }),
  o: P({ lengua: "o", labios: "medio redondos", mandibula: 0.25 }),
  u: P({ lengua: "u", labios: "redondos", mandibula: 0.1 }),
  t: P({ lengua: "alveolar", mandibula: 0.1 }),
  s: P({ lengua: "sibilante", mandibula: 0.1 }),
  b: P({ labios: "cerrados", mandibula: 0.05 }),
  ch: P({ lengua: "oclusiva postalveolar", mandibula: 0.1 }),
  y: P({ lengua: "palatal", mandibula: 0.1 }),
  jota: P({ lengua: "velar", mandibula: 0.15 }),
  n: P({ lengua: "alveolar", mandibula: 0.1, velo: "abajo" }),
  r: P({ lengua: "español r", mandibula: 0.1 }),
};

const SH = roce("postalveolar", { labios: "medio redondos" });
const ZH = roce("postalveolar", { labios: "medio redondos", voz: true });
const Z = roce("sibilante", { voz: true });
const V = P({ labios: "dentilabial", aire: "roce", voz: true, mandibula: 0.1 });

// secuencia: posturas que se recorren; principal: la que explican los pasos; espanol: [postura, nombre]
export const TUTORIALES = {
  en: {
    "ɪ": { secuencia: [vocal("ɪ", "neutros", 0.15)], espanol: [ES.i, "la i española"] },
    i: { secuencia: [vocal("i", "estirados", 0.05)] },
    "æ": { secuencia: [vocal("æ", "estirados", 0.6)], espanol: [ES.a, "la a española"] },
    "ʌ": { secuencia: [vocal("ʌ", "neutros", 0.35)], espanol: [ES.o, "la o española"] },
    "ɑ": { secuencia: [vocal("ɑ", "neutros", 0.7)], espanol: [ES.o, "la o española"] },
    "ə": { secuencia: [vocal("ə", "neutros", 0.2)], espanol: [ES.e, "la e"] },
    "ʊ": { secuencia: [vocal("ʊ", "medio redondos", 0.15)], espanol: [ES.u, "la u española"] },
    "ɜ": { secuencia: [vocal("ɜ", "neutros", 0.2)], espanol: [ES.e, "e + r"] },
    "θ": { secuencia: [roce("dental")], espanol: [ES.t, "la t o la s"] },
    "ð": { secuencia: [roce("dental", { voz: true })], espanol: [ES.t, "una d dura"] },
    v: { secuencia: [V], espanol: [ES.b, "la b (labios juntos)"] },
    z: { secuencia: [Z], nota: "Misma posición que la s: la diferencia es la voz. Pon la mano en la garganta y siente la vibración." },
    "ʃ": { secuencia: [SH], espanol: [ES.ch, "la ch"] },
    "dʒ": { secuencia: [{ p: P({ lengua: "oclusiva postalveolar", labios: "medio redondos", voz: true, mandibula: 0.1 }), queda: 350 }, { p: ZH, viaje: 150 }],
            principal: 1, espanol: [ES.y, "la y"] },
    "ʒ": { secuencia: [ZH], espanol: [ES.y, "la y"] },
    h: { secuencia: [P({ mandibula: 0.3, aire: "boca" })], espanol: [ES.jota, "la jota"] },
    "ŋ": { secuencia: [P({ lengua: "velar", velo: "abajo", aire: "nariz", voz: true, mandibula: 0.15 })], espanol: [ES.n, "la n"] },
    "ɹ": { secuencia: [P({ lengua: "retroflejo", labios: "medio redondos", voz: true, aire: "boca", mandibula: 0.15 })], espanol: [ES.r, "la r española"] },
    l: { secuencia: [P({ lengua: "l oscura", voz: true, aire: "boca", mandibula: 0.15 })], espanol: [P({ lengua: "alveolar", mandibula: 0.15 }), "la l española"] },
    s: { secuencia: [roce("sibilante"), { p: P({ lengua: "alveolar", aire: "golpe", mandibula: 0.1 }), queda: 500 }], principal: 0,
         espanol: [ES.e, "una e antes"] },
  },
  fr: {
    y: { secuencia: [vocal("i", "redondos", 0.05)], espanol: [ES.u, "la u española"],
         nota: "Lengua de i, labios de u." },
    u: { secuencia: [vocal("u", "redondos", 0.1)] },
    "ø": { secuencia: [vocal("e", "redondos", 0.15)], espanol: [ES.e, "la e española"], nota: "Lengua de e, labios de o." },
    "œ": { secuencia: [vocal("ɛ", "medio redondos", 0.35)], espanol: [ES.e, "la e española"] },
    "ə": { secuencia: [vocal("ə", "medio redondos", 0.2)], espanol: [ES.e, "la e española"] },
    e: { secuencia: [vocal("e", "estirados", 0.1)], espanol: [ES.e, "la e española"] },
    "ɛ": { secuencia: [vocal("ɛ", "neutros", 0.35)], espanol: [ES.e, "la e española"] },
    o: { secuencia: [vocal("o", "redondos", 0.15)] },
    "ɔ": { secuencia: [vocal("ɔ", "medio redondos", 0.35)], espanol: [ES.o, "la o española"] },
    "ɑ̃": { secuencia: [nasal("ɑ", "neutros", 0.55)], espanol: [ES.n, "a + n"] },
    "ɔ̃": { secuencia: [nasal("o", "redondos", 0.3)], espanol: [ES.n, "o + n"] },
    "ɛ̃": { secuencia: [nasal("ɛ", "neutros", 0.35)], espanol: [ES.n, "e + n"] },
    "ʁ": { secuencia: [roce("uvular", { voz: true })], espanol: [ES.r, "la r española"] },
    z: { secuencia: [Z], nota: "Misma posición que la s: la diferencia es la voz." },
    "ʒ": { secuencia: [ZH], espanol: [ES.y, "la y"] },
    "ʃ": { secuencia: [SH], espanol: [ES.ch, "la ch"] },
    v: { secuencia: [V], espanol: [ES.b, "la b (labios juntos)"] },
    "ɥ": { secuencia: [{ p: vocal("i", "redondos", 0.05), queda: 450 }, { p: vocal("i", "estirados", 0.05), viaje: 300 }], principal: 0,
           espanol: [ES.u, "la u española"], nota: "Empieza como la u francesa y resbala enseguida a la vocal que sigue." },
  },
};

// Cada paso de la secuencia puede venir como postura sola o como { p, queda, viaje }.
export function tutorial(lang, ipa) {
  const t = TUTORIALES[lang]?.[ipa];
  if (!t) return null;
  const secuencia = t.secuencia.map((s) => (s.p ? s : { p: s }));
  return { ...t, secuencia, principal: secuencia[t.principal ?? secuencia.length - 1].p };
}
