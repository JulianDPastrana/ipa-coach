// Voz de ejemplo con la síntesis del propio teléfono (Web Speech). Prefiere voces locales para que funcione offline.
const IDIOMA = { en: "en-US", fr: "fr-FR" };
const VELOCIDAD = { en: 0.85, fr: 0.8 };

function elegirVoz(lang) {
  const voces = speechSynthesis.getVoices();
  const del = voces.filter((v) => v.lang.replace("_", "-").startsWith(IDIOMA[lang]));
  const base = del.length ? del : voces.filter((v) => v.lang.startsWith(lang));
  return base.find((v) => v.localService) ?? base[0];
}

export function hayVoz() {
  return "speechSynthesis" in window;
}

export function decir(texto, lang) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = IDIOMA[lang];
  u.rate = VELOCIDAD[lang];
  const voz = elegirVoz(lang);
  if (voz) u.voice = voz;
  speechSynthesis.speak(u);
}

if (hayVoz()) speechSynthesis.getVoices(); // Chrome carga la lista de voces en segundo plano
