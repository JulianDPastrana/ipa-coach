"""Copia lecciones.json de IPA-Coach y le agrega los fonemas de cada palabra (esperado() con espeak de Python).

Uso:  C:/Users/julia/.venvs/ipa-coach/Scripts/python.exe -X utf8 -B herramientas/lecciones.py
"""
import json
import sys
from pathlib import Path

ORIGEN = Path(r"C:\Users\julia\GitHub\IPA-Coach")
sys.dont_write_bytecode = True
sys.path.insert(0, str(ORIGEN))
import fonemas  # noqa: E402

lecciones = json.loads((ORIGEN / "lecciones.json").read_text(encoding="utf-8"))
ipa = {lang: {} for lang in lecciones}
for lang, lista in lecciones.items():
    for l in lista:
        for texto in l["palabras"] + l["par"]:
            ipa[lang][texto] = fonemas.esperado(texto, lang)

destino = Path(__file__).resolve().parent.parent / "datos" / "lecciones.json"
destino.write_text(json.dumps({"lecciones": lecciones, "ipa": ipa}, ensure_ascii=False, separators=(",", ":")),
                   encoding="utf-8")
print(f"{destino}: {sum(map(len, ipa.values()))} palabras")
