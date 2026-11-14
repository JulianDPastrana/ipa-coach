"""Compara las notas por fonema de PyTorch contra las versiones ONNX (fp32 e int8) del modelo.

Uso:  python -X utf8 herramientas/paridad.py
Usa fonemas.py de IPA-Coach (solo lectura) para el IPA esperado, la alineación y la nota.
"""
import asyncio
import subprocess
import sys
import time

import edge_tts
import numpy as np
import onnxruntime as ort
import soundfile as sf
import torch

sys.path.insert(0, r"C:\Users\julia\GitHub\IPA-Coach")
import fonemas  # noqa: E402

from exportar_modelo import TRABAJO, QuantType, cuantizar, exportar_fp32  # noqa: E402

BIEN, CASI = 0.35, 0.15
PALABRAS = {"en": ["think", "ship", "very", "I thought the bottleneck was the data"],
            "fr": ["tu", "rouge", "Je ne comprends pas"]}
VOCES = {"en-US-AndrewNeural": "en", "en-US-JennyNeural": "en", "fr-FR-HenriNeural": "fr",
         "fr-FR-DeniseNeural": "fr", "es-CO-GonzaloNeural": None}  # Gonzalo lee los dos idiomas con acento


def clips():
    carpeta = TRABAJO / "clips"
    carpeta.mkdir(parents=True, exist_ok=True)
    lista = []
    for voz, lang in VOCES.items():
        for l in [lang] if lang else ["en", "fr"]:
            for texto in PALABRAS[l] if lang else [PALABRAS[l][0], PALABRAS[l][-1]]:
                wav = carpeta / f"{voz}_{texto[:20].replace(' ', '_')}.wav"
                if not wav.exists():
                    mp3 = wav.with_suffix(".mp3")
                    asyncio.run(edge_tts.Communicate(texto, voz).save(str(mp3)))
                    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp3), "-ac", "1", "-ar", "16000",
                                    str(wav)], check=True)
                lista.append((voz, l, texto, sf.read(wav, dtype="float32")[0]))
    return lista


def entrada(audio):
    """Lo mismo que hará el navegador: silencio a los lados y normalización media 0, varianza 1."""
    x = np.concatenate([np.zeros(4000, np.float32), audio, np.zeros(4000, np.float32)])
    return ((x - x.mean()) / np.sqrt(x.var() + 1e-7)).astype(np.float32)[None]


def con_torch(x):
    with torch.inference_mode():
        return fonemas._modelo(torch.from_numpy(x)).logits[0].numpy()


def con_onnx(ruta):
    sesion = ort.InferenceSession(str(ruta), providers=["CPUExecutionProvider"])
    return lambda x: sesion.run(None, {"audio": x})[0][0]


def notas(logits, audio, objetivo, lang):
    lp = torch.log_softmax(torch.from_numpy(logits), -1).numpy()
    fonemas._logprobs = lambda _: lp  # evaluar() de fonemas.py, pero con estos logits
    return np.array([p for _, _, p in fonemas.evaluar(audio, objetivo, lang)[0]])


def veredicto(p):
    return np.where(p >= BIEN, 2, np.where(p >= CASI, 1, 0))


def main():
    fonemas._cargar()
    datos = clips()
    # La normalización de entrada() debe coincidir con la del feature extractor de HF.
    ref = fonemas._proc(np.concatenate([np.zeros(4000), datos[0][3], np.zeros(4000)]), sampling_rate=16000,
                        return_tensors="np").input_values
    print(f"normalización: diferencia máx. con HF {np.abs(ref - entrada(datos[0][3])).max():.1e}")

    fp32 = exportar_fp32()
    variantes = {"pytorch": (con_torch, None), "onnx_fp32": (None, fp32),
                 "int8_s8": (None, cuantizar(fp32, "int8")),
                 "int8_u8": (None, cuantizar(fp32, "int8_u8", QuantType.QUInt8)),
                 "int8_s8_canal": (None, cuantizar(fp32, "int8_canal", por_canal=True)),
                 "pesos_s8": (None, cuantizar(fp32, "pesos_s8", solo_pesos=True)),
                 "pesos_s8_canal": (None, cuantizar(fp32, "pesos_s8_canal", por_canal=True, solo_pesos=True)),
                 "pesos_u8": (None, cuantizar(fp32, "pesos_u8", QuantType.QUInt8, solo_pesos=True))}

    base = {}
    for nombre, (fn, ruta) in variantes.items():
        fn = fn or con_onnx(ruta)
        fn(entrada(datos[0][3]))  # calentar
        dif_logit, dif_prob, cambios, total, tiempo = 0.0, [], 0, 0, 0.0
        for voz, lang, texto, audio in datos:
            x = entrada(audio)
            t = time.perf_counter()
            logits = fn(x)
            tiempo += time.perf_counter() - t
            objetivo = fonemas.esperado(texto, lang)
            p = notas(logits, audio, objetivo, lang)
            if nombre == "pytorch":
                base[voz, texto] = logits, p
                continue
            l0, p0 = base[voz, texto]
            dif_logit = max(dif_logit, float(np.abs(logits - l0).max()))
            dif_prob += list(np.abs(p - p0))
            distinto = veredicto(p) != veredicto(p0)
            cambios += int(distinto.sum())
            total += len(p)
            for k in np.flatnonzero(distinto):
                print(f"   {nombre}: {voz} «{texto}» /{objetivo[k]}/: {p0[k]:.2f} -> {p[k]:.2f}")
        mb = ruta.stat().st_size / 1e6 if ruta else 0
        linea = f"{nombre:14} {mb:6.0f} MB  {1000 * tiempo / len(datos):5.0f} ms/clip"
        if nombre != "pytorch":
            linea += (f"  logit máx {dif_logit:6.3f}  prob media {np.mean(dif_prob):.3f} máx {np.max(dif_prob):.2f}"
                      f"  veredictos cambiados {cambios}/{total} ({100 * cambios / total:.1f}%)")
        print(linea, flush=True)


if __name__ == "__main__":
    main()
