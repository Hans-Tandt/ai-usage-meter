# French typography for content_FR.json: a non-breaking space (U+00A0) before : ; ! ? % and
# inside « », so punctuation never starts a line. Text values only; code spans (`...`) are left alone.
import json, re
from pathlib import Path

NBSP = " "
p = Path(__file__).with_name("content_FR.json")
data = json.loads(p.read_text(encoding="utf-8"))


def fix(text):
    parts = re.split(r"(`[^`]*`)", text)  # keep code spans as they are
    out = []
    for part in parts:
        if part.startswith("`"):
            out.append(part)
            continue
        part = re.sub(r" ([:;!?%»])", NBSP + r"\1", part)
        part = part.replace("« ", "«" + NBSP)
        out.append(part)
    return "".join(out)


def walk(node):
    if isinstance(node, dict):
        return {k: (walk(v) if k not in ("type", "path", "variant") else v) for k, v in node.items()}
    if isinstance(node, list):
        return [walk(v) for v in node]
    if isinstance(node, str):
        return fix(node)
    return node


fixed = walk(data)
p.write_text(json.dumps(fixed, ensure_ascii=False, indent=2), encoding="utf-8")
print("non-breaking spaces:", p.read_text(encoding="utf-8").count(NBSP))
