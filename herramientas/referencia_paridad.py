"""Notas de referencia para prueba/paridad.html: lo que da fonemas.py de IPA-Coach sobre los mismos audios.

Guarda dos referencias por audio: con PyTorch (la app del PC) y con el ONNX int8 que usa la web.
La web debe calcar al ONNX (eso prueba el port a JS); contra PyTorch se ve lo que cambia la cuantización.

Uso:  C:/Users/julia/.venvs/ipa-coach/Scripts/python.exe -X utf8 -B herramientas/referencia_paridad.py
"""
import asyncio
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import edge_tts
import numpy as np
import onnxruntime as ort
import soundfile as sf
import torch

sys.dont_write_bytecode = True
sys.path.insert(0, r"C:\Users\julia\GitHub\IPA-Coach")
import fonemas  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
AUDIO = RAIZ / "prueba" / "audio"
# Nativos y una voz colombiana leyendo inglés y francés (para tener errores reales que detectar).
CLIPS = [
    ("en-US-AndrewNeural", "en", ["think", "ship", "very", "I thought the bottleneck was the data"]),
    ("en-US-JennyNeural", "en", ["think", "ship", "very", "I thought the bottleneck was the data"]),
    ("es-CO-GonzaloNeural", "en", ["think", "ship", "very", "she", "vision", "I thought the bottleneck was the data"]),
    ("fr-FR-DeniseNeural", "fr", ["tu", "rouge", "Je ne comprends pas"]),
    ("fr-FR-HenriNeural", "fr", ["tu", "rouge", "vin", "Je ne comprends pas"]),
    ("es-CO-SalomeNeural", "fr", ["tu", "rouge", "vin", "Je ne comprends pas"]),
]


def clip(voz, texto):
    wav = AUDIO / f"{voz.split('-')[2].removesuffix('Neural').lower()}_{texto[:24].replace(' ', '_')}.wav"
    if not wav.exists():
        with tempfile.TemporaryDirectory() as tmp:
            mp3 = Path(tmp) / "a.mp3"
            asyncio.run(edge_tts.Communicate(texto, voz).save(str(mp3)))
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp3), "-ac", "1", "-ar", "16000",
                            "-c:a", "pcm_s16le", str(wav)], check=True)
    return wav


def modelo_onnx():
    info = json.loads((RAIZ / "modelo" / "info.json").read_text(encoding="utf-8"))
    datos = b"".join((RAIZ / "modelo" / p).read_bytes() for p in info["partes"])
    return ort.InferenceSession(datos, providers=["CPUExecutionProvider"])


def notas(audio, objetivo, lang, logits):
    lp = torch.log_softmax(torch.from_numpy(logits), -1).numpy()
    fonemas._logprobs = lambda _: lp
    filas, oido = fonemas.evaluar(audio, objetivo, lang)
    return {"filas": [list(f) for f in filas], "oido": oido}


def main():
    AUDIO.mkdir(parents=True, exist_ok=True)
    fonemas._cargar()
    original = fonemas._logprobs
    sesion = modelo_onnx()
    casos = []
    for voz, lang, textos in CLIPS:
        for texto in textos:
            wav = clip(voz, texto)
            audio = sf.read(wav, dtype="float32")[0]
            objetivo = fonemas.esperado(texto, lang)
            x = np.concatenate([np.zeros(4000, np.float32), audio, np.zeros(4000, np.float32)])
            x = ((x - x.mean()) / np.sqrt(x.var() + 1e-7)).astype(np.float32)[None]
            fonemas._logprobs = original
            pt = fonemas.evaluar(audio, objetivo, lang)
            casos.append({"audio": f"audio/{wav.name}", "voz": voz, "lang": lang, "texto": texto, "objetivo": objetivo,
                          "pytorch": {"filas": [list(f) for f in pt[0]], "oido": pt[1]},
                          "onnx": notas(audio, objetivo, lang, sesion.run(None, {"audio": x})[0][0])})
            print(f"{wav.name}: {' '.join(f'{f}={p}' for f, _, p in casos[-1]['onnx']['filas'])}")
    destino = RAIZ / "prueba" / "referencia.json"
    destino.write_text(json.dumps({"casos": casos}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(casos)} casos -> {destino}")


if __name__ == "__main__":
    main()
