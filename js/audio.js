// Audio a 16 kHz mono, que es lo que espera el modelo.
const MAX_SEGUNDOS = 30;

export async function a16k(blob) {
  const ctx = new OfflineAudioContext(1, 1, 16000); // decodeAudioData remuestrea a la tasa del contexto
  const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
  const n = Math.min(buf.length, 16000 * MAX_SEGUNDOS);
  const mono = new Float32Array(n);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const canal = buf.getChannelData(c);
    for (let i = 0; i < n; i++) mono[i] += canal[i] / buf.numberOfChannels;
  }
  return mono;
}

// Graba con MediaRecorder y entrega el nivel de la voz mientras tanto (para la onda en pantalla).
export class Grabadora {
  async empezar(alNivel) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.trozos = [];
    this.rec = new MediaRecorder(this.stream);
    this.rec.ondataavailable = (e) => e.data.size && this.trozos.push(e.data);
    this.rec.start();

    this.ctx = new AudioContext();
    const analizador = this.ctx.createAnalyser();
    analizador.fftSize = 512;
    this.ctx.createMediaStreamSource(this.stream).connect(analizador);
    const muestras = new Float32Array(analizador.fftSize);
    const medir = () => {
      analizador.getFloatTimeDomainData(muestras);
      let suma = 0;
      for (const v of muestras) suma += v * v;
      alNivel?.(Math.min(1, Math.sqrt(suma / muestras.length) * 6));
      this.cuadro = requestAnimationFrame(medir);
    };
    medir();
  }

  get activa() {
    return this.rec?.state === "recording";
  }

  async terminar() {
    cancelAnimationFrame(this.cuadro);
    const parado = new Promise((ok) => (this.rec.onstop = ok));
    this.rec.stop();
    await parado;
    this.stream.getTracks().forEach((t) => t.stop());
    this.ctx.close();
    const blob = new Blob(this.trozos, { type: this.rec.mimeType });
    return { blob, audio: await a16k(blob) };
  }
}

// Pico de la señal: si es muy bajo, no hubo voz y no vale la pena calificar.
export function pico(audio) {
  let max = 0;
  for (const v of audio) max = Math.max(max, Math.abs(v));
  return max;
}
