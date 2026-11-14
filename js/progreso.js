// Historial de intentos en el teléfono (localStorage). Nada sale del celular.
import { BIEN } from "./puntaje.js";

const CLAVE = "ipa-coach.historial";
const MAXIMO = 2000;

function leer() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) ?? [];
  } catch {
    return [];
  }
}

export function guardar(lang, texto, filas, acierto) {
  const todos = leer();
  todos.push({ t: Date.now(), lang, texto, acierto, notas: filas.map(([f, , p]) => [f, p]) });
  try {
    localStorage.setItem(CLAVE, JSON.stringify(todos.slice(-MAXIMO)));
  } catch {}
}

export const intentos = (lang) => leer().filter((i) => i.lang === lang);

// % de veces que el sonido salió bien en sus últimas 40 apariciones; null si nunca lo has dicho.
export function aciertoPorSonido(lang) {
  const veces = {};
  for (const i of intentos(lang)) for (const [f, p] of i.notas) (veces[f] ??= []).push(p >= BIEN);
  const res = {};
  for (const [f, v] of Object.entries(veces)) {
    const ult = v.slice(-40);
    res[f] = Math.round((100 * ult.filter(Boolean).length) / ult.length);
  }
  return res;
}

const dia = (t) => new Date(t).toDateString();

// Días seguidos practicando, contando hoy o ayer como último día.
export function racha() {
  const dias = new Set(leer().map((i) => dia(i.t)));
  const d = new Date();
  if (!dias.has(d.toDateString())) d.setDate(d.getDate() - 1);
  let n = 0;
  while (dias.has(d.toDateString())) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

// Las últimas 4 semanas, de lunes a domingo, terminando en la semana actual.
export function calendario() {
  const dias = new Set(leer().map((i) => dia(i.t)));
  const hoy = new Date();
  const inicio = new Date(hoy);
  inicio.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7) - 21);
  return Array.from({ length: 28 }, (_, k) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + k);
    return { si: dias.has(d.toDateString()), hoy: d.toDateString() === hoy.toDateString(), futuro: d > hoy };
  });
}
