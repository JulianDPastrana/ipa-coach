import { Grabadora, pico } from "./audio.js";
import { ipa } from "./fonetica.js";
import { aciertoPorSonido, calendario, guardar, intentos, racha } from "./progreso.js";
import { BIEN, CASI } from "./puntaje.js";
import { decir, hayVoz } from "./voz.js";

const $ = (s) => document.querySelector(s);
const NOMBRE_IDIOMA = { en: "inglés", fr: "francés" };
const PLACEHOLDER = { en: "Tu frase en inglés…", fr: "Tu frase en francés…" };
const SIN_DATO = 65; // los sonidos sin practicar van después de los flojos

const [{ lecciones: LECCIONES, ipa: IPA }, { vocab: VOCAB }] = await Promise.all(
  ["datos/lecciones.json", "modelo/vocab.json"].map(async (u) => (await fetch(u)).json()));

const est = { lang: leerLang(), leccion: null, tarjetas: [], i: 0, intentos: {}, grabando: false };
const modelo = { listo: false, pct: 0 };

function leerLang() {
  try {
    return localStorage.getItem("ipa-coach.lang") === "fr" ? "fr" : "en";
  } catch {
    return "en";
  }
}

const nivelDe = (p) => (p == null ? null : p >= 85 ? "bien" : p >= 50 ? "casi" : "mal");
const nivelFonema = (p) => (p >= BIEN ? "bien" : p >= CASI ? "casi" : "mal");
const colorDe = (nivel) => (nivel ? `var(--${nivel})` : "var(--capa-3)");
const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function porTrabajar(lang) {
  const acc = aciertoPorSonido(lang);
  return [...LECCIONES[lang]].sort((a, b) => (acc[a.ipa] ?? SIN_DATO) - (acc[b.ipa] ?? SIN_DATO));
}

function anunciar(texto) {
  $("#anuncio").textContent = texto;
}

let relojToast;
function toast(texto) {
  const t = $("#toast");
  t.textContent = texto;
  t.classList.add("ver");
  clearTimeout(relojToast);
  relojToast = setTimeout(() => t.classList.remove("ver"), 2600);
}

/* ---------- El modelo, en un worker ---------- */

const oido = new Worker(new URL("oido.js", import.meta.url), { type: "module" });
const pendientes = new Map();
let siguienteId = 0;

function evaluar(audio, objetivo) {
  return new Promise((ok, mal) => {
    pendientes.set(++siguienteId, { ok, mal });
    oido.postMessage({ tipo: "evaluar", id: siguienteId, audio, objetivo, lang: est.lang }, [audio.buffer]);
  });
}

oido.onmessage = ({ data }) => {
  if (data.tipo === "progreso") return progresoDescarga(data.bajados, data.total);
  if (data.tipo === "listo") return modeloListo(data);
  const p = pendientes.get(data.id);
  if (data.tipo === "error" && !p) return errorDescarga(data.mensaje);
  if (!p) return;
  pendientes.delete(data.id);
  data.tipo === "error" ? p.mal(new Error(data.mensaje)) : p.ok(data);
};

/* ---------- Modo foco ---------- */

function cargarLeccion(lec, eleccion) {
  est.leccion = lec;
  est.tarjetas = [
    ...lec.palabras.map((p) => ({ texto: p, fonemas: IPA[est.lang][p] })),
    { texto: lec.par.join(", "), par: lec.par, fonemas: [...IPA[est.lang][lec.par[0]], "|", ...IPA[est.lang][lec.par[1]]] },
  ];
  pintarCabeza(() => {
    const p = aciertoPorSonido(est.lang)[lec.ipa];
    $("#ceja").innerHTML = eleccion ? "Elegiste este sonido"
      : p == null ? "Sonido nuevo"
      : `<i style="background:${colorDe(nivelDe(p))}"></i>${p < 70 ? "Para trabajar" : "Vas bien"} · ${p} % de acierto`;
    $("#glifo").textContent = lec.ipa;
    $("#nombre").textContent = lec.nombre;
    $("#simbolo").setAttribute("aria-label", `Sonido ${lec.ipa}, ${lec.nombre}. Ver cómo se hace`);
  });
}

function cargarFrase(texto, fonemas) {
  est.leccion = null;
  est.tarjetas = [{ texto, fonemas }];
  pintarCabeza(() => {
    $("#ceja").textContent = `Tu frase en ${NOMBRE_IDIOMA[est.lang]}`;
    $("#nombre").textContent = "Práctica libre";
  });
}

function pintarCabeza(rellenar) {
  est.i = 0;
  est.intentos = {};
  const foco = $("#foco");
  foco.classList.add("cambiando");
  setTimeout(() => {
    foco.classList.toggle("libre", !est.leccion);
    rellenar();
    pintarTarjetas();
    foco.classList.remove("cambiando");
  }, 180);
}

function fichasHTML(fonemas, objetivo, resultado) {
  let k = 0;
  return fonemas.map((f) => {
    if (f === "|") return '<span class="corte" aria-hidden="true"></span>';
    const r = resultado?.[k++];
    const nivel = r && nivelFonema(r[2]);
    const pista = nivel === "mal" ? (r[1] !== f ? `sonó ${r[1]}` : "débil") : nivel === "casi" ? "casi" : "";
    const etiqueta = r ? `${f}: ${nivel === "bien" ? "bien" : nivel === "casi" ? "casi" : "mal, " + pista}` : f;
    return `<span class="ficha${f === objetivo ? " objetivo" : ""}${r ? " entra" : ""}" ${r ? `data-nivel="${nivel}"` : ""}
      style="transition-delay:${r ? k * 40 : 0}ms" role="listitem" aria-label="${esc(etiqueta)}"><b>${f}</b>${pista ? `<em class="ipa">${pista}</em>` : ""}</span>`;
  }).join("");
}

function pintarTarjetas() {
  const total = est.tarjetas.length;
  const objetivo = est.leccion?.ipa;
  $("#carrusel").innerHTML = est.tarjetas.map((t, k) => `
    <article class="tarjeta${k === 0 ? " actual" : ""}" role="group" aria-roledescription="palabra" aria-label="${k + 1} de ${total}: ${esc(t.texto)}">
      <small>${t.par ? "Par mínimo" : total > 1 ? `Palabra ${k + 1} de ${total - 1}` : "Tu frase"}</small>
      <h2 class="palabra${t.texto.length > 14 && !t.par ? " larga" : ""}" lang="${est.lang}">${t.par ? `${esc(t.par[0])}<span class="sep">·</span>${esc(t.par[1])}` : esc(t.texto)}</h2>
      <div class="fichas" role="list" aria-label="Sonidos">${fichasHTML(t.fonemas, objetivo)}</div>
      <p class="veredicto"></p>
      <p class="oido"></p>
    </article>`).join("");
  $("#puntos").innerHTML = total > 1 ? est.tarjetas.map((_, k) => `<i class="${k === 0 ? "actual" : ""}"></i>`).join("") : "";
  $("#carrusel").scrollLeft = 0;
  ponerPista();
}

function ponerPista(texto) {
  const t = est.tarjetas[est.i];
  const decir = !est.leccion ? "Toca y di la frase" : t?.par ? "Toca y di las dos palabras" : "Toca y di la palabra";
  $("#pista").textContent = texto ?? (est.intentos[est.i] ? "Toca para intentar de nuevo" : decir);
}

function marcarActual(i) {
  if (i === est.i && document.querySelector(".tarjeta.actual")) return;
  est.i = i;
  document.querySelectorAll(".tarjeta").forEach((t, k) => t.classList.toggle("actual", k === i));
  document.querySelectorAll(".puntos i").forEach((t, k) => t.classList.toggle("actual", k === i));
  ponerPista();
  anunciar(`Palabra ${i + 1} de ${est.tarjetas.length}: ${est.tarjetas[i].texto}`);
}

function irA(i) {
  const c = $("#carrusel"), t = c.children[i];
  if (!t) return;
  c.scrollTo({ left: t.offsetLeft - c.offsetLeft - 30, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  marcarActual(i);
}

$("#carrusel").addEventListener("scroll", () => {
  const c = $("#carrusel"), paso = c.children[0].offsetWidth + 10;
  marcarActual(Math.round(c.scrollLeft / paso));
}, { passive: true });

$("#carrusel").addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") irA(Math.min(est.i + 1, est.tarjetas.length - 1));
  if (e.key === "ArrowLeft") irA(Math.max(est.i - 1, 0));
});

function siguiente() {
  if (est.i < est.tarjetas.length - 1) return irA(est.i + 1);
  const orden = porTrabajar(est.lang);
  const prox = est.leccion ? orden[(orden.indexOf(est.leccion) + 1) % orden.length] : orden[0];
  toast(`Siguiente sonido: ${prox.ipa}`);
  cargarLeccion(prox);
}

/* ---------- Grabar y calificar ---------- */

const grabadora = new Grabadora();
const onda = $("#onda");
onda.innerHTML = "<i></i>".repeat(28);
const barras = [...onda.children];
const niveles = new Array(barras.length).fill(0);
let limite;

function modo(m) {
  document.body.dataset.modo = m;
  const grabando = m === "grabando";
  $("#btn-grabar").setAttribute("aria-label", grabando ? "Terminar grabación" : "Grabar");
  $("#btn-grabar").setAttribute("aria-pressed", grabando);
}

async function grabar() {
  if (est.grabando) return parar();
  window.speechSynthesis?.cancel();
  try {
    await grabadora.empezar((nivel) => {
      niveles.shift();
      niveles.push(nivel);
      barras.forEach((b, k) => (b.style.height = 4 + niveles[k] * 24 + "px"));
    });
  } catch (e) {
    if (e.name === "NotAllowedError") return abrir("error");
    return toast("No pude abrir el micrófono");
  }
  est.grabando = true;
  modo("grabando");
  anunciar("Grabando. Di la palabra y toca para terminar.");
  navigator.vibrate?.(12);
  limite = setTimeout(parar, 30000); // el modelo solo califica 30 s
}

async function parar() {
  if (!est.grabando) return;
  clearTimeout(limite);
  est.grabando = false;
  modo("analizando");
  const i = est.i, t = est.tarjetas[i], tarjeta = $("#carrusel").children[i];
  tarjeta.classList.add("pensando");
  try {
    const { blob, audio } = await grabadora.terminar();
    if (pico(audio) < 0.02) {
      ponerPista("No te oí. Acércate al micrófono");
      return;
    }
    if (!modelo.listo) ponerPista(modelo.pct ? `Esperando el modelo · ${modelo.pct} %` : "Cargando el modelo…");
    const r = await evaluar(audio, t.fonemas.filter((f) => f !== "|"));
    mostrarResultado(i, r, blob);
  } catch (e) {
    toast(e.message || "No se pudo calificar");
    ponerPista();
  } finally {
    tarjeta.classList.remove("pensando");
    modo("");
  }
}

function consejo(filas) {
  const obj = est.leccion?.ipa;
  const como = est.leccion ? est.leccion.como.split(". ")[0].replace(/\.?$/, ".") : "";
  if (filas.every(([, , p]) => p >= BIEN)) return "Suena natural. Pasa a la siguiente.";
  const delObjetivo = filas.filter(([f]) => f === obj).sort((a, b) => a[2] - b[2])[0];
  if (delObjetivo && delObjetivo[2] < CASI) {
    const [f, sono] = delObjetivo;
    return `${sono !== f ? `La ${f} sonó como ${sono}.` : `La ${f} casi no se oyó.`} ${como}`;
  }
  if (delObjetivo && delObjetivo[2] < BIEN) return `La ${obj} va cerca. ${como}`;
  const peor = [...filas].sort((a, b) => a[2] - b[2])[0];
  if (peor[2] < CASI) return peor[1] !== peor[0] ? `Revisa la ${peor[0]}: sonó como ${peor[1]}.` : `Revisa la ${peor[0]}: casi no se oyó.`;
  return "Casi. Revisa los sonidos en ámbar.";
}

function mostrarResultado(i, r, blob) {
  const t = est.tarjetas[i];
  const acierto = Math.round((100 * r.filas.filter(([, , p]) => p >= BIEN).length) / r.filas.length);
  guardar(est.lang, t.texto, r.filas, acierto);
  pintarRacha();

  const texto = consejo(r.filas);
  const tarjeta = $("#carrusel").children[i];
  tarjeta.querySelector(".fichas").innerHTML = fichasHTML(t.fonemas, est.leccion?.ipa, r.filas);
  const v = tarjeta.querySelector(".veredicto");
  v.dataset.nivel = nivelDe(acierto);
  v.innerHTML = `<strong>${acierto} %</strong>${esc(texto)}`;
  const urlVoz = URL.createObjectURL(blob);
  tarjeta.querySelector(".oido").innerHTML =
    `<span>Se oyó <span class="ipa">/${esc(r.oido.join("")) || "…"}/</span></span><button data-voz="${urlVoz}">▶ Mi voz</button>`;
  requestAnimationFrame(() => requestAnimationFrame(() =>
    tarjeta.querySelectorAll(".ficha.entra").forEach((f) => f.classList.remove("entra"))));

  est.intentos[i] = (est.intentos[i] ?? 0) + 1;
  if (i === est.i) ponerPista(acierto >= 85 ? "Bien. Desliza para seguir" : "Toca para intentar de nuevo");
  anunciar(`${acierto} por ciento. ${texto}`);
}

function escuchar(texto) {
  if (!hayVoz()) return toast("Este teléfono no puede leer en voz alta");
  decir(texto, est.lang);
}

/* ---------- Pantallas ---------- */

function abrir(id) {
  if (id === "sonidos") pintarSonidos();
  if (id === "progreso") pintarProgreso();
  if (id === "como") pintarComo();
  const d = $(id === "como" ? "#hoja-como" : "#" + id);
  if (!d.open) d.showModal();
}

document.querySelectorAll("dialog").forEach((d) => {
  d.addEventListener("click", (e) => {
    // Tocar el fondo cierra solo la hoja; en pantallas completas no
    if (e.target.closest("[data-cerrar]") || (e.target === d && d.classList.contains("hoja"))) d.close();
  });
});

function fila(lec, acc) {
  const p = acc[lec.ipa], nivel = nivelDe(p);
  return `<button class="fila" data-ipa="${lec.ipa}" aria-label="${lec.ipa}, ${esc(lec.nombre)}, ${p == null ? "sin practicar" : p + " por ciento"}">
    <span class="tile ipa">${lec.ipa}</span>
    <span><strong>${esc(lec.nombre)}</strong><span lang="${est.lang}">${lec.palabras.slice(0, 3).join(" · ")}</span></span>
    <span class="nota-fila" style="color:${p == null ? "var(--texto-3)" : colorDe(nivel)}">${p == null ? "Nuevo" : p + " %"}
      <span class="barrita"><i style="width:${p ?? 0}%;background:${colorDe(nivel)}"></i></span></span>
  </button>`;
}

function pintarSonidos() {
  const lista = porTrabajar(est.lang), acc = aciertoPorSonido(est.lang);
  const grupos = [
    ["Por trabajar", lista.filter((l) => acc[l.ipa] < 70)],
    ["Van bien", lista.filter((l) => acc[l.ipa] >= 70)],
    ["Sin practicar", lista.filter((l) => acc[l.ipa] == null)],
  ];
  $("#sonidos-idioma").textContent = `Sonidos del ${NOMBRE_IDIOMA[est.lang]}`;
  $("#sonidos-resumen").textContent = `${lista.length} sonidos · ${grupos[0][1].length} por trabajar`;
  $("#frase-texto").placeholder = PLACEHOLDER[est.lang];
  $("#frase-texto").lang = est.lang;
  $("#sonidos-grupos").innerHTML = grupos.filter((g) => g[1].length).map(([titulo, ls]) =>
    `<section class="grupo"><h3>${titulo}</h3><div class="lista">${ls.map((l) => fila(l, acc)).join("")}</div></section>`).join("");
}

function pintarProgreso() {
  const n = racha(), dias = calendario();
  const practicados = dias.filter((d) => d.si).length;
  $("#racha").innerHTML = `${n}<small>${n === 1 ? "día seguido" : "días seguidos"}</small>`;
  $("#racha-texto").textContent = practicados ? `Practicaste ${practicados} ${practicados === 1 ? "día" : "días"} en las últimas 4 semanas.` : "Aún no has practicado. Hoy es buen día.";
  $("#calendario").setAttribute("aria-label", `Días practicados en las últimas 4 semanas: ${practicados}`);
  $("#calendario").innerHTML = ["L", "M", "M", "J", "V", "S", "D"].map((d) => `<b aria-hidden="true">${d}</b>`).join("")
    + dias.map((d) => `<i class="${d.si ? "si" : ""}${d.hoy ? " hoy" : ""}"${d.futuro ? ' style="opacity:.35"' : ""}></i>`).join("");

  const serie = intentos(est.lang).map((i) => i.acierto);
  const caja = $("#tarjeta-promedio");
  if (!serie.length) {
    caja.innerHTML = `<p class="sub">Aún no hay intentos en ${NOMBRE_IDIOMA[est.lang]}.</p>`;
  } else {
    caja.innerHTML = '<p class="cifra" id="promedio"></p><p class="sube-baja" id="tendencia"></p><svg id="linea" viewBox="0 0 300 64" width="100%" height="64" style="margin-top:14px" role="img"></svg>';
    const media = (xs) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
    $("#promedio").innerHTML = `${media(serie.slice(-30))} %<small>promedio reciente</small>`;
    if (serie.length >= 20) {
      const d = media(serie.slice(-10)) - media(serie.slice(-20, -10));
      $("#tendencia").textContent = `${d >= 0 ? "+" : "−"}${Math.abs(d)} puntos frente a los 10 intentos anteriores`;
      $("#tendencia").style.color = d >= 0 ? "var(--bien)" : "var(--casi)";
    }
    const ult = serie.slice(-12);
    if (ult.length > 1) {
      const x = (k) => 6 + k * (288 / (ult.length - 1)), y = (v) => 58 - v * 0.52;
      const d = ult.map((v, k) => `${k ? "L" : "M"}${x(k).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
      $("#linea").setAttribute("aria-label", `Acierto de los últimos ${ult.length} intentos`);
      $("#linea").innerHTML = `<path d="${d} L${x(ult.length - 1)} 64 L6 64Z" fill="rgba(143,160,255,.08)"/>
        <path d="${d}" fill="none" stroke="var(--acento)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${x(ult.length - 1)}" cy="${y(ult.at(-1))}" r="4" fill="var(--acento)"/>`;
    }
  }

  const acc = aciertoPorSonido(est.lang);
  const flojos = porTrabajar(est.lang).filter((l) => acc[l.ipa] != null && acc[l.ipa] < 85).slice(0, 3);
  $("#trabajar").innerHTML = flojos.length ? flojos.map((l) => fila(l, acc)).join("")
    : '<p class="vacio">Cuando practiques, aquí aparecen los sonidos que más te cuestan.</p>';
}

function pintarRacha() {
  const n = racha();
  const semana = calendario().slice(-7).filter((d) => d.si).length;
  $("#racha-num").textContent = n;
  $("#racha-arco").style.strokeDashoffset = 100.5 * (1 - semana / 7);
  $("#btn-progreso").setAttribute("aria-label", `Progreso. Racha de ${n} ${n === 1 ? "día" : "días"}`);
}

function pintarComo() {
  const l = est.leccion;
  $("#como-titulo").innerHTML = `<span class="ipa">${l.ipa}</span> <span style="color:var(--texto-2);font-weight:500">${esc(l.nombre)}</span>`;
  $("#como-texto").textContent = l.como;
  $("#como-trampa").textContent = l.trampa;
  $("#como-par").innerHTML = l.par.map((p) => `<button data-decir="${esc(p)}" lang="${est.lang}" aria-label="Escuchar ${esc(p)}">${esc(p)}
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--acento)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6"/></svg></button>`).join("");
}

document.addEventListener("click", (e) => {
  const f = e.target.closest(".fila");
  if (f) {
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
    cargarLeccion(LECCIONES[est.lang].find((l) => l.ipa === f.dataset.ipa), true);
  }
  const d = e.target.closest("[data-decir]");
  if (d) escuchar(d.dataset.decir);
  const v = e.target.closest("[data-voz]");
  if (v) new Audio(v.dataset.voz).play();
});

$("#frase").addEventListener("submit", async (e) => {
  e.preventDefault();
  const texto = $("#frase-texto").value.trim();
  if (!texto) return;
  try {
    const fonemas = await ipa(texto, est.lang, VOCAB);
    if (!fonemas.length) return toast("No encontré sonidos en ese texto");
    $("#sonidos").close();
    cargarFrase(texto, fonemas);
  } catch {
    toast("No pude leer esa frase");
  }
});

/* ---------- Primera vez: descarga del modelo ---------- */

const GLIFOS = ["θ", "ɪ", "ʁ", "ɥ", "ɑ̃", "ð", "ʃ", "ŋ"];
let cargaVista = false, cuadros = 0;

function progresoDescarga(bajados, total) {
  modelo.pct = Math.floor((100 * bajados) / total);
  if (!cargaVista) {
    cargaVista = true;
    abrir("carga");
  }
  $("#carga-arco").style.strokeDashoffset = 351.9 * (1 - bajados / total);
  $("#carga-barra").firstElementChild.style.width = modelo.pct + "%";
  $("#carga-barra").setAttribute("aria-valuenow", modelo.pct);
  $("#carga-medidor").textContent = `${Math.round(bajados / 1e6)} de ${Math.round(total / 1e6)} MB`;
  if (++cuadros % 40 === 0) $("#carga-glifo").textContent = GLIFOS[(cuadros / 40) % GLIFOS.length];
}

function modeloListo({ descargado }) {
  modelo.listo = true;
  if (!descargado) return;
  navigator.storage?.persist?.(); // que Chrome no borre los 360 MB para liberar espacio
  $("#carga-titulo").textContent = "Listo, ya puedes practicar";
  $("#carga-texto").textContent = "El modelo quedó guardado en este teléfono. Desde ahora funciona sin internet.";
  $("#carga-aviso").textContent = "";
  $("#carga-medidor").textContent = "Descarga completa";
  $("#carga-glifo").textContent = "✓";
  $("#carga-listo").hidden = false;
  $("#carga-ver").hidden = true;
  if (!$("#carga").open) toast("El modelo ya está listo");
}

function errorDescarga(mensaje) {
  $("#carga-titulo").textContent = "No se pudo descargar";
  $("#carga-texto").textContent = navigator.onLine ? mensaje : "Parece que no hay internet. La primera vez se necesita para bajar el modelo.";
  $("#carga-listo").hidden = false;
  $("#carga-listo").textContent = "Reintentar";
  $("#carga-listo").onclick = () => {
    $("#carga-listo").onclick = () => $("#carga").close();
    $("#carga-listo").textContent = "Empezar";
    $("#carga-listo").hidden = true;
    $("#carga-titulo").textContent = "Preparando el oído de la app";
    oido.postMessage({ tipo: "cargar" });
  };
  abrir("carga");
}

$("#carga-listo").onclick = () => $("#carga").close();
$("#carga-ver").onclick = () => $("#carga").close();
$("#error-reintentar").onclick = () => {
  $("#error").close();
  grabar();
};

/* ---------- Eventos ---------- */

$("#btn-grabar").onclick = grabar;
$("#btn-siguiente").onclick = siguiente;
$("#btn-escuchar").onclick = () => {
  const t = est.tarjetas[est.i];
  escuchar(t.par ? t.par.join(". ") : t.texto);
};
$("#btn-sonidos").onclick = () => abrir("sonidos");
$("#btn-progreso").onclick = () => abrir("progreso");
$("#btn-como").onclick = $("#simbolo").onclick = () => abrir("como");

function cambiarIdioma(lang, inicio) {
  if (lang === est.lang && !inicio) return;
  est.lang = lang;
  try {
    localStorage.setItem("ipa-coach.lang", lang);
  } catch {}
  $("#idioma").dataset.lang = lang;
  document.querySelectorAll("#idioma button").forEach((b) => {
    const si = b.dataset.lang === lang;
    b.setAttribute("aria-checked", si);
    b.tabIndex = si ? 0 : -1;
  });
  cargarLeccion(porTrabajar(lang)[0]);
}
$("#idioma").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b) cambiarIdioma(b.dataset.lang);
});
$("#idioma").addEventListener("keydown", (e) => {
  if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
  const otro = est.lang === "en" ? "fr" : "en";
  cambiarIdioma(otro);
  $(`#idioma [data-lang="${otro}"]`).focus();
});

/* ---------- Arranque ---------- */

// El service worker deja la app offline y le pone a la página las cabeceras que permiten usar varios
// hilos en el modelo. La primera visita no pasa por él, así que se recarga una vez.
async function prepararServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  await navigator.serviceWorker.register("sw.js");
  if (crossOriginIsolated || sessionStorage.getItem("ipa-coach.recargado")) return;
  const controlado = navigator.serviceWorker.controller ? Promise.resolve()
    : new Promise((ok) => navigator.serviceWorker.addEventListener("controllerchange", ok, { once: true }));
  const tiempo = new Promise((ok) => setTimeout(() => ok("tarde"), 20000));
  if ((await Promise.race([controlado, tiempo])) === "tarde") return;
  sessionStorage.setItem("ipa-coach.recargado", "1");
  location.reload();
  await new Promise(() => {}); // no seguir mientras recarga
}

cambiarIdioma(est.lang, true);
pintarRacha();
try {
  await prepararServiceWorker();
} catch (e) {
  console.warn("Service worker:", e);
}
oido.postMessage({ tipo: "cargar" });
