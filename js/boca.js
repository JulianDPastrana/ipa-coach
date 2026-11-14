// Corte lateral de la boca (mirando a la izquierda) dibujado en SVG a partir de unos pocos parámetros:
// apertura de la mandíbula, labios, forma de la lengua, velo del paladar, voz y salida del aire.

const NS = "http://www.w3.org/2000/svg";

// Lengua: punta, lámina, frente, dorso, posdorso y raíz (con la mandíbula cerrada).
export const LENGUAS = {
  reposo:      [[72, 160], [90, 151], [115, 144], [150, 141], [184, 152], [204, 198]],
  i:           [[70, 161], [84, 140], [106, 121], [138, 116], [176, 136], [208, 200]],
  "ɪ":         [[71, 161], [86, 143], [110, 127], [144, 123], [180, 141], [207, 200]],
  e:           [[71, 161], [87, 145], [111, 131], [145, 128], [181, 144], [206, 200]],
  "ɛ":         [[72, 161], [89, 148], [113, 137], [148, 135], [183, 148], [205, 200]],
  "æ":         [[72, 162], [90, 152], [114, 145], [149, 145], [184, 157], [201, 206]],
  a:           [[73, 162], [92, 154], [118, 149], [152, 147], [184, 157], [200, 208]],
  "ɑ":         [[74, 162], [94, 156], [122, 153], [156, 150], [186, 156], [197, 212]],
  "ʌ":         [[73, 161], [91, 150], [117, 143], [151, 138], [184, 147], [203, 204]],
  "ə":         [[72, 160], [90, 149], [115, 140], [150, 135], [184, 147], [204, 201]],
  "ɜ":         [[84, 140], [94, 139], [114, 137], [150, 134], [184, 145], [203, 203]],
  "ɔ":         [[74, 162], [93, 154], [120, 147], [154, 136], [186, 140], [200, 206]],
  o:           [[74, 162], [93, 153], [120, 143], [153, 128], [184, 128], [204, 202]],
  u:           [[74, 162], [94, 154], [121, 143], [153, 124], [182, 121], [206, 200]],
  "ʊ":         [[73, 162], [92, 152], [119, 140], [152, 128], [182, 128], [205, 201]],
  dental:      [[50, 154], [68, 150], [96, 145], [140, 142], [182, 152], [204, 199]],
  alveolar:    [[79, 132], [92, 137], [114, 141], [150, 141], [184, 151], [204, 199]],
  sibilante:   [[78, 137], [92, 138], [114, 142], [150, 141], [184, 151], [204, 199]],
  postalveolar:[[86, 142], [97, 129], [118, 134], [150, 138], [184, 150], [204, 199]],
  "oclusiva postalveolar": [[84, 140], [96, 121], [118, 126], [150, 136], [184, 150], [204, 199]],
  palatal:     [[74, 161], [86, 139], [106, 117], [138, 113], [176, 134], [208, 200]],
  velar:       [[73, 161], [92, 152], [122, 142], [158, 124], [184, 115], [205, 196]],
  uvular:      [[73, 161], [92, 153], [122, 146], [158, 133], [190, 134], [200, 196]],
  retroflejo:  [[90, 134], [96, 143], [116, 141], [150, 136], [184, 145], [203, 202]],
  "l oscura":  [[79, 132], [92, 138], [116, 146], [152, 140], [184, 135], [202, 199]],
  "español r": [[80, 133], [91, 140], [114, 143], [150, 141], [184, 151], [204, 199]],
};

// Qué hace cada forma de la lengua, en palabras.
export const LENGUA_TEXTO = {
  reposo: "relajada, en el piso de la boca",
  i: "alta y adelante, cerca del paladar sin tocarlo",
  "ɪ": "alta y adelante, pero un poco más baja y floja que en la i española",
  e: "a media altura, adelante",
  "ɛ": "a media altura, adelante, más baja que en la e",
  "æ": "baja y adelante, con la boca bien abierta",
  a: "baja, en el centro",
  "ɑ": "baja y hacia atrás, hacia la garganta",
  "ʌ": "en el centro, a media altura, relajada",
  "ə": "en el centro, quieta y relajada",
  "ɜ": "en el centro, con la punta levantada hacia atrás sin tocar nada",
  "ɔ": "atrás y a media altura",
  o: "atrás, a media altura",
  u: "atrás y alta, hacia el paladar blando",
  "ʊ": "atrás, un poco más baja y floja que en la u",
  dental: "la punta asoma entre los dientes",
  alveolar: "la punta toca la encía detrás de los dientes de arriba",
  sibilante: "la punta casi toca la encía de arriba, dejando un canal estrecho",
  postalveolar: "la punta un poco más atrás de la encía, sin tocarla",
  "oclusiva postalveolar": "la lengua toca el paladar justo detrás de la encía y corta el aire",
  palatal: "el centro de la lengua sube hasta casi tocar el paladar",
  velar: "la parte de atrás toca el paladar blando",
  uvular: "la parte de atrás se acerca a la campanilla",
  retroflejo: "la punta se curva hacia atrás sin tocar nada",
  "l oscura": "la punta en la encía y la parte de atrás levantada",
  "español r": "la punta golpea la encía (r española)",
};

const LABIOS_TEXTO = {
  neutros: "relajados",
  redondos: "redondeados y hacia adelante, como para dar un beso",
  "medio redondos": "un poco redondeados",
  estirados: "estirados hacia los lados",
  cerrados: "cerrados",
  dentilabial: "el labio de abajo toca los dientes de arriba",
};

const AIRE_TEXTO = {
  boca: "sale por la boca",
  nariz: "sale por la nariz",
  ambas: "sale por la boca y la nariz a la vez",
  roce: "sale rozando por un paso estrecho",
  golpe: "se frena y luego sale de golpe",
  ninguno: "",
};

// Una postura completa. Lo que no se diga queda en reposo.
export function postura(p = {}) {
  return { lengua: "reposo", mandibula: 0.15, labios: "neutros", velo: "arriba", voz: false, aire: "ninguno", ...p };
}

export function pasos(p) {
  return [
    ["Labios", LABIOS_TEXTO[p.labios]],
    ["Lengua", LENGUA_TEXTO[p.lengua]],
    ["Aire", [AIRE_TEXTO[p.aire], p.voz ? "con voz: la garganta vibra" : "sin voz: la garganta no vibra"].filter(Boolean).join(", ")],
  ];
}

/* ---------- Geometría ---------- */

const mezcla = (a, b, t) => a + (b - a) * t;
const mezclaPuntos = (a, b, t) => a.map((p, i) => [mezcla(p[0], b[i][0], t), mezcla(p[1], b[i][1], t)]);

// Curva suave que pasa por los puntos (Catmull-Rom convertida a Bézier).
function curva(pts, cerrar) {
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return cerrar ? d + "Z" : d;
}

// Valores numéricos de una postura, para poder animar entre dos.
function numeros(p) {
  const L = {
    neutros: { adelante: 0, abre: 0.5, cierra: 0, dentilabial: 0, ancho: 0.6 },
    redondos: { adelante: 1, abre: 0.25, cierra: 0, dentilabial: 0, ancho: 0.25 },
    "medio redondos": { adelante: 0.5, abre: 0.4, cierra: 0, dentilabial: 0, ancho: 0.4 },
    estirados: { adelante: -0.4, abre: 0.35, cierra: 0, dentilabial: 0, ancho: 1 },
    cerrados: { adelante: 0, abre: 0, cierra: 1, dentilabial: 0, ancho: 0.6 },
    dentilabial: { adelante: 0, abre: 0.2, cierra: 0, dentilabial: 1, ancho: 0.6 },
  }[p.labios];
  return {
    lengua: LENGUAS[p.lengua], mandibula: p.mandibula, velo: p.velo === "abajo" ? 1 : 0,
    voz: p.voz ? 1 : 0, ...L,
  };
}

function interpolar(a, b, t) {
  const r = {};
  for (const k of Object.keys(a)) r[k] = k === "lengua" ? mezclaPuntos(a.lengua, b.lengua, t) : mezcla(a[k], b[k], t);
  return r;
}

// Techo de la boca (encía, paladar duro y velo), de adelante hacia atrás.
const PALADAR = [[56, 152], [64, 134], [72, 127], [84, 128], [100, 118], [120, 110], [140, 106], [160, 106], [178, 110]];
const VELO_ARRIBA = [[192, 112], [206, 115], [222, 119]];
const VELO_ABAJO = [[190, 117], [199, 130], [205, 148]];

function techo(n) {
  return [...PALADAR, ...mezclaPuntos(VELO_ARRIBA, VELO_ABAJO, n.velo)];
}

// Altura de una línea quebrada en x (los puntos van de izquierda a derecha).
function alturaEn(pts, x) {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [a, b] = [pts[i - 1], pts[i]];
      return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0] || 1);
    }
  }
  return pts.at(-1)[1];
}

function lenguaPuntos(n) {
  const baja = n.mandibula * 26;
  return n.lengua.map(([x, y]) => [x, y + baja * Math.max(0, 1 - (x - 60) / 170)]);
}

function lenguaPath(n) {
  const pts = lenguaPuntos(n);
  const [tx, ty] = pts[0];
  const baja = n.mandibula * 26;
  const piso = [[200, 246], [150, 232], [104, 210], [Math.min(tx + 4, 84), Math.max(ty + 12, 178 + baja * 0.8)]];
  return curva([...pts, ...piso, pts[0]], true);
}

function geometria(n) {
  const baja = n.mandibula * 26;
  const adelante = n.adelante * 7;
  const juntos = n.cierra; // labios cerrados
  // Labio de arriba (relleno): de la nariz al borde, y de vuelta por detrás, pegado al diente.
  const bordeArriba = 150 + juntos * 4 - n.abre * 2;
  const ul = curva([[44, 117], [35 - adelante * 0.5, 121], [30 - adelante, 131], [29 - adelante, 141], [33 - adelante * 0.8, bordeArriba - 1],
    [43 - adelante * 0.4, bordeArriba + 1], [51, bordeArriba - 1], [50, 132], [48, 121], [44, 117]], true);
  // Labio de abajo: baja con la mandíbula; en f/v sube hasta el filo de los dientes de arriba.
  const topeAbajo = mezcla(juntos ? 155 : 157 + baja * 0.9 + n.abre * 5, 152, n.dentilabial);
  const frenteAbajo = mezcla(29 - adelante, 46, n.dentilabial);
  const atras = mezcla(53, 58, n.dentilabial);
  const ll = curva([[atras, topeAbajo + 1], [frenteAbajo + 8, topeAbajo - 1], [frenteAbajo + 1, topeAbajo + 6], [frenteAbajo + 1, topeAbajo + 14],
    [34 - adelante * 0.5, 178 + baja], [45, 183 + baja], [56, 177 + baja], [atras + 2, topeAbajo + 10], [atras, topeAbajo + 1]], true);
  const dientesAbajo = `M54 ${190 + baja} C55 ${176 + baja} 57 ${166 + baja} 60 ${157 + baja} Q63 ${153 + baja} 66 ${157 + baja} C68 ${168 + baja} 69 ${178 + baja} 69 ${190 + baja}Z`;
  const menton = `M44 ${184 + baja} C34 ${196 + baja} 32 ${212 + baja} 44 ${222 + baja} C70 ${234 + baja} 110 ${238 + baja * 0.5} 140 ${250} L158 290`;
  const velo = curva([[178, 110], ...mezclaPuntos(VELO_ARRIBA, VELO_ABAJO, n.velo)]);
  return { labioArriba: ul, labioAbajo: ll, dientesAbajo, menton, velo, lengua: lenguaPath(n), salida: [22 - adelante, (bordeArriba + topeAbajo) / 2] };
}

// Recorrido del aire: sube por la garganta y sigue el canal entre la lengua y el techo hasta los labios.
function caminoAire(n, g) {
  const lengua = lenguaPuntos(n);
  const arriba = techo(n);
  const pts = [[214, 262], [214, 214]];
  for (let x = 196; x > lengua[0][0]; x -= 12) {
    const suelo = alturaEn(lengua, x), cielo = alturaEn(arriba, x);
    pts.push([x, Math.min(suelo - 3, (suelo + cielo) / 2)]);
  }
  pts.push([Math.min(lengua[0][0] - 6, 50), (alturaEn(arriba, 54) + g.salida[1]) / 2 + 2], g.salida);
  return curva(pts);
}

const NARIZ_AIRE = [[214, 262], [215, 180], [214, 128], [200, 104], [150, 96], [90, 99], [40, 108], [18, 114]];

/* ---------- Dibujo ---------- */

const ESTATICO = `
  <path class="nariz" d="M30 112 C50 100 80 92 112 90 C152 88 196 92 226 104 L226 116 C200 106 160 100 120 102 C90 104 62 109 42 117Z"/>
  <path class="piel" d="M66 36 C60 54 52 70 48 84 L22 102 Q14 109 22 114 L42 117"/>
  <path class="cuello" d="M226 100 C228 160 228 220 226 290"/>
  <path class="paladar" d="${curva(PALADAR)}"/>
  <path class="dientes" d="M48 120 C47 132 52 145 56 153 Q60 157 63 153 C65 142 66 131 68 121Z"/>
  <path class="epiglotis" d="M204 244 C206 232 212 226 216 226"/>
`;

export function crearBoca(contenedor) {
  contenedor.innerHTML = `
    <svg viewBox="6 62 230 216" class="boca" role="img">
      <g class="anatomia">${ESTATICO}
        <path class="velo"/><path class="lengua"/><path class="dientes abajo"/>
        <path class="labio arriba"/><path class="labio abajo"/><path class="piel menton"/>
        <path class="fantasma lengua-f"/><path class="fantasma labios-f"/>
        <path class="aire"/><path class="aire nasal"/>
        <g class="cuerdas"><path d="M200 266 L226 266"/><path class="vibra" d="M203 262 l3 4 l3 -4 l3 4 l3 -4 l3 4 l3 -4"/></g>
      </g>
      <g class="nombres" aria-hidden="true">
        <text x="98" y="84">cavidad nasal</text><text x="124" y="101">paladar</text><text x="188" y="134">velo</text>
        <text x="64" y="121">encía</text><text x="18" y="196">labios</text><text x="66" y="206">dientes</text>
        <text x="122" y="176">lengua</text><text x="160" y="276">cuerdas vocales</text>
      </g>
      <g class="frente" transform="translate(176 66) scale(.85)">
        <rect width="62" height="44" rx="12"/>
        <path class="labios-frente"/>
        <path class="dientes-frente"/>
      </g>
    </svg>`;
  const svg = contenedor.firstElementChild;
  const el = (s) => svg.querySelector(s);
  let actual = null, animacion = 0;

  function pintar(n, fantasma, p) {
    const g = geometria(n);
    el(".velo").setAttribute("d", g.velo);
    el(".lengua").setAttribute("d", g.lengua);
    el(".dientes.abajo").setAttribute("d", g.dientesAbajo);
    el(".labio.arriba").setAttribute("d", g.labioArriba);
    el(".labio.abajo").setAttribute("d", g.labioAbajo);
    el(".menton").setAttribute("d", g.menton);
    el(".lengua-f").setAttribute("d", fantasma ? lenguaPath(numeros(fantasma)) : "");
    const gf = fantasma && geometria(numeros(fantasma));
    el(".labios-f").setAttribute("d", gf ? gf.labioArriba + gf.labioAbajo : "");
    svg.classList.toggle("con-voz", n.voz > 0.5);
    // Aire: desde la garganta hasta la salida
    const aire = p?.aire ?? "ninguno";
    const porBoca = ["boca", "ambas", "roce", "golpe"].includes(aire);
    const porNariz = aire === "nariz" || aire === "ambas";
    el(".aire:not(.nasal)").setAttribute("d", porBoca ? caminoAire(n, g) : "");
    el(".aire.nasal").setAttribute("d", porNariz ? curva(NARIZ_AIRE) : "");
    svg.dataset.aire = aire;
    // Vista de frente: la abertura de la boca
    const ancho = 14 + n.ancho * 12 - n.adelante * 2, alto = n.cierra ? 0.6 : 3 + n.mandibula * 12 + n.abre * 4;
    el(".labios-frente").setAttribute("d",
      `M${31 - ancho} 22 Q31 ${22 - alto - 6} ${31 + ancho} 22 Q31 ${22 + alto + 6} ${31 - ancho} 22Z M${31 - ancho + 3} 22 Q31 ${22 - alto} ${31 + ancho - 3} 22 Q31 ${22 + alto} ${31 - ancho + 3} 22Z`);
    el(".dientes-frente").setAttribute("d", n.dentilabial > 0.5 ? `M${31 - 7} ${22 - 2} h14 v4 h-14Z` : "");
  }

  // Lleva la boca de la postura actual a una lista de posturas, una tras otra.
  function animar(secuencia, { fantasma, alTerminar, alPaso } = {}) {
    cancelAnimationFrame(animacion);
    const reducir = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let k = 0, inicio = performance.now();
    let desde = actual ?? numeros(postura());
    const cuadro = (ahora) => {
      const paso = secuencia[k];
      const hacia = numeros(paso.p);
      const viaje = reducir ? 0 : paso.viaje ?? 450;
      const t = Math.min(1, (ahora - inicio) / Math.max(viaje, 1));
      const suave = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      actual = interpolar(desde, hacia, suave);
      pintar(actual, fantasma, t >= 1 ? paso.p : null);
      if (ahora - inicio >= viaje + (paso.queda ?? 900)) {
        k++;
        if (k >= secuencia.length) return alTerminar?.();
        desde = hacia;
        inicio = ahora;
        alPaso?.(k);
      }
      animacion = requestAnimationFrame(cuadro);
    };
    alPaso?.(0);
    animacion = requestAnimationFrame(cuadro);
  }

  function fijar(p, fantasma) {
    cancelAnimationFrame(animacion);
    actual = numeros(p);
    pintar(actual, fantasma, p);
  }

  const nombres = (si) => svg.classList.toggle("con-nombres", si);
  return { animar, fijar, nombres, svg };
}
