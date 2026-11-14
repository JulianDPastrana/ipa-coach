"""Salida de referencia: esperado() de IPA-Coach para las palabras de las lecciones y las frases de prueba.

Uso: python -X utf8 -B referencia.py   (-B para no dejar __pycache__ en IPA-Coach)
"""
import json
import os
import sys
from pathlib import Path

AQUI = Path(__file__).parent
ORIGEN = Path(os.environ.get("IPA_COACH", r"C:\Users\julia\GitHub\IPA-Coach"))
sys.dont_write_bytecode = True
sys.path.insert(0, str(ORIGEN))
import fonemas  # noqa: E402
from phonemizer.backend import EspeakBackend  # noqa: E402
from phonemizer.separator import Separator  # noqa: E402

lecciones = json.loads((ORIGEN / "lecciones.json").read_text(encoding="utf8"))
frases = json.loads((AQUI / "frases.json").read_text(encoding="utf8"))
extra = json.loads((AQUI / "palabras_extra.json").read_text(encoding="utf8"))  # prueba de estrés del tokenizador

casos = []
for lang in ("en", "fr"):
    textos = []
    for l in lecciones[lang]:
        textos += [("palabra", p) for p in l["palabras"]] + [("par", p) for p in l.get("par", [])]
    textos += [("frase", f) for f in frases[lang]] + [("extra", p) for p in extra[lang]]
    vistos = set()
    for tipo, texto in textos:
        if texto in vistos:
            continue
        vistos.add(texto)
        crudo = fonemas._backends[lang].phonemize([texto], separator=Separator(phone="_", word=" "), strip=True)[0]
        casos.append({"lang": lang, "tipo": tipo, "texto": texto, "crudo": crudo, "fonemas": fonemas.esperado(texto, lang)})

salida = {"espeak": ".".join(map(str, EspeakBackend.version())), "casos": casos}
(AQUI / "referencia.json").write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf8")
print(f"{len(casos)} casos, espeak-ng {salida['espeak']}")
