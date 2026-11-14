"""Exporta wav2vec2-xlsr-53-espeak-cv-ft a ONNX int8 y lo parte en trozos de 90 MB para GitHub Pages.

Uso:  python -X utf8 herramientas/exportar_modelo.py

Entrada del modelo: "audio", float32 [1, muestras], audio mono a 16 kHz YA NORMALIZADO como lo hace
el feature extractor de HF (preprocessor_config.json trae do_normalize=true):
    x = (x - media(x)) / sqrt(varianza(x) + 1e-7)
sobre toda la señal, después de añadir los 0,25 s de silencio a cada lado (igual que fonemas.py).
Salida: "logits", float32 [1, frames, 392] (un frame cada 20 ms). El blank de CTC es <pad> = 0.
"""
import hashlib
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

os.environ.setdefault("HF_HUB_OFFLINE", "1")

import onnx
import torch
from onnxruntime.quantization import QuantType, quantize_dynamic
from transformers import AutoModelForCTC, AutoProcessor

MODELO = "facebook/wav2vec2-xlsr-53-espeak-cv-ft"
RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "modelo"
TRABAJO = Path(tempfile.gettempdir()) / "ipa-coach-onnx"  # los .onnx grandes no van al repo
TROZO = 90_000_000  # GitHub Pages rechaza archivos de más de 100 MB


class SoloLogits(torch.nn.Module):
    def __init__(self, modelo):
        super().__init__()
        self.modelo = modelo

    def forward(self, audio):
        return self.modelo(audio).logits


def exportar_fp32():
    destino = TRABAJO / "fp32.onnx"
    if destino.exists():
        return destino
    TRABAJO.mkdir(exist_ok=True)
    modelo = AutoModelForCTC.from_pretrained(MODELO, attn_implementation="eager").eval()
    ejemplo = torch.randn(1, 32000)
    torch.onnx.export(SoloLogits(modelo), (ejemplo,), str(destino), input_names=["audio"], output_names=["logits"],
                      dynamic_axes={"audio": {1: "muestras"}, "logits": {1: "frames"}}, opset_version=17,
                      dynamo=False)
    return destino


def cuantizar(fp32, nombre, tipo=QuantType.QInt8, por_canal=False, solo_pesos=False):
    """Cuantización dinámica de los MatMul; los Conv quedan en float.

    solo_pesos: deja en float los MatMul entre activaciones (Q·K y atención·V de cada capa), la proyección
    de entrada y la capa final. No ahorran tamaño y son los que más error meten.
    """
    destino = TRABAJO / f"{nombre}.onnx"
    if destino.exists():
        return destino
    excluir = []
    if solo_pesos:
        grafo = onnx.load(str(fp32), load_external_data=False).graph
        pesos = {i.name for i in grafo.initializer}
        excluir = [n.name for n in grafo.node if n.op_type == "MatMul" and (
            n.input[1] not in pesos or "feature_projection" in n.name or "lm_head" in n.name)]
    quantize_dynamic(str(fp32), str(destino), weight_type=tipo, per_channel=por_canal,
                     op_types_to_quantize=["MatMul"], nodes_to_exclude=excluir)
    return destino


def partir(onnx):
    if SALIDA.exists():
        shutil.rmtree(SALIDA)
    SALIDA.mkdir()
    datos = onnx.read_bytes()
    partes = []
    for n, i in enumerate(range(0, len(datos), TROZO)):
        nombre = f"modelo.onnx.part{n}"
        (SALIDA / nombre).write_bytes(datos[i:i + TROZO])
        partes.append(nombre)

    tok = AutoProcessor.from_pretrained(MODELO).tokenizer
    vocab = dict(sorted(tok.get_vocab().items(), key=lambda x: x[1]))
    (SALIDA / "vocab.json").write_text(json.dumps({"pad": tok.pad_token_id, "vocab": vocab}, ensure_ascii=False))
    info = {
        "modelo": MODELO,
        "variante": onnx.stem,
        "partes": partes,
        "bytes": len(datos),
        "sha256": hashlib.sha256(datos).hexdigest(),
        "entrada": "audio float32 [1, muestras] a 16 kHz",
        "salida": "logits float32 [1, frames, 392], blank = 0",
        "normalizacion": "x = (x - media) / sqrt(varianza + 1e-7) sobre toda la señal, "
                         "después de añadir 4000 ceros (0,25 s) a cada lado",
    }
    (SALIDA / "info.json").write_text(json.dumps(info, ensure_ascii=False, indent=1))
    print(f"{onnx.name}: {len(datos) / 1e6:.0f} MB en {len(partes)} partes -> {SALIDA}")


if __name__ == "__main__":
    fp32 = exportar_fp32()
    # Ganadora en paridad.py: menos cambios de veredicto (1,4 %) y menor error medio.
    partir(cuantizar(fp32, "pesos_s8_canal", por_canal=True, solo_pesos=True))
