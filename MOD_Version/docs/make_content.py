# Writes the mod's manual, content_EN/FR/NL/DE.json, from one structure (below) and the text in text_XX.json.
# Build each with the general-report-builder skill:
#   py <skill>/tools/build_with_toc.py content_EN.json out/AI_Usage_Meter_Mod_Manual_EN
# French gets a non-breaking space before : ; ! ? % and inside « », as in the strip's manuals.
import json
import re
from pathlib import Path

HERE = Path(__file__).parent
NBSP = "\u00a0"

# The one-command install, tested 2026-10-26 in an empty Claude configuration (install, load, uninstall).
INSTALL = ['claude plugin install ai-usage-meter --marketplace "C:\\Users\\<you>\\Documents\\AI Usage Meter Mod"']

SETTINGS_JSON = [
    '"env": {',
    '  "CLAUDE_CODE_PLUGIN_DIRS": "C:\\\\Users\\\\<you>\\\\AppData\\\\Local\\\\AIUsageMeter\\\\plugin;C:\\\\Users\\\\<you>\\\\Documents\\\\AI Usage Meter Mod"',
    '}',
]


def blocks(lang, t):
    low = lang.lower()
    return [
        {"type": "h1", "text": t["h_use"]},
        {"type": "p", "text": t["use"]},
        {"type": "callout", "variant": "note", "title": t["unofficial_t"], "text": t["unofficial"]},
        {"type": "h1", "text": t["h1"]},
        {"type": "p", "text": t["p1"]},
        {"type": "figure", "path": f"figures/band-levels_{low}.png", "width": 560, "caption": t["fig1"], "alt": t["alt1"]},
        {"type": "table", "header": t["see_h"], "widths": [2, 3], "rows": t["see"]},
        {"type": "callout", "variant": "note", "title": t["robot_t"], "text": t["robot"]},
        {"type": "callout", "variant": "tip", "title": t["fold_t"], "text": t["fold"]},
        {"type": "h1", "text": t["h2"]},
        {"type": "p", "text": t["p2"]},
        {"type": "p", "text": t["p2b"]},
        {"type": "h1", "text": t["h3"]},
        {"type": "p", "text": t["p3"]},
        # The version comes before the steps: the install command fails on older versions.
        {"type": "callout", "variant": "note", "title": t["need_t"], "text": t["need"]},
        {"type": "numbers", "items": t["steps3"]},
        {"type": "code", "lines": INSTALL, "caption": t["code3"]},
        {"type": "callout", "variant": "trap", "title": t["mp_t"], "text": t["mp"]},
        {"type": "callout", "variant": "tip", "title": t["try_t"], "text": t["try"]},
        {"type": "callout", "variant": "trap", "title": t["key_t"], "text": t["key"]},
        {"type": "h2", "text": t["h3b"]},
        {"type": "p", "text": t["p3b"]},
        {"type": "numbers", "items": t["steps3b"]},
        {"type": "code", "lines": SETTINGS_JSON, "caption": t["code3b"]},
        {"type": "h1", "text": t["h4"]},
        {"type": "numbers", "items": t["steps4"]},
        {"type": "p", "text": t["p4"]},
        {"type": "callout", "variant": "tip", "title": t["new_t"], "text": t["new"]},
        {"type": "h1", "text": t["h_cs"]},
        {"type": "p", "text": t["p_cs"]},
        {"type": "table", "header": t["where_h"], "widths": [2, 5], "rows": t["where"]},
        {"type": "figure", "path": f"figures/band-routine_{low}.png", "width": 560, "caption": t["fig3"], "alt": t["alt3"]},
        {"type": "table", "header": t["msg_h"], "widths": [3, 4], "rows": t["msg"]},
        {"type": "callout", "variant": "note", "title": t["go_t"], "text": t["go"]},
        {"type": "callout", "variant": "tip", "title": t["hand_t"], "text": t["hand"]},
        {"type": "h1", "text": t["h5"]},
        {"type": "figure", "path": "figures/pane.png", "width": 330, "caption": t["fig2"], "alt": t["alt2"]},
        {"type": "table", "header": t["cmd_h"], "widths": [2, 3], "rows": t["cmd"]},
        {"type": "p", "text": t["p5"]},
        {"type": "h2", "text": t["h5b"]},
        {"type": "table", "header": t["cmd_h"], "widths": [2, 3], "rows": t["demo"]},
        {"type": "p", "text": t["term"]},
        {"type": "h1", "text": t["h6"]},
        {"type": "p", "text": t["p6"]},
        {"type": "table", "header": t["set_h"], "widths": [3, 2], "rows": t["set"], "keepWhole": 12},  # never cut in two
        {"type": "callout", "variant": "note", "title": t["which_t"], "text": t["which"]},
        {"type": "h1", "text": t["h7"]},
        {"type": "p", "text": t["p7"]},
        {"type": "bullets", "items": t["with"]},
        {"type": "h1", "text": t["h_test"]},
        {"type": "p", "text": t["p_test"]},
        {"type": "callout", "variant": "tip", "title": t["test_tip_t"], "text": t["test_tip"]},
        *[block for title, rows in t["tests"] for block in (
            {"type": "h2", "text": title},
            {"type": "table", "header": t["test_h"], "widths": [2, 3], "rows": rows},
        )],
        {"type": "h1", "text": t["h8"]},
        {"type": "numbers", "items": t["steps8"]},
        {"type": "p", "text": t["p8"]},
        {"type": "h1", "text": t["h9"]},
        {"type": "h2", "text": t["h9a"]},
        {"type": "bullets", "items": t["how"]},
        {"type": "h2", "text": t["h9b"]},
        {"type": "table", "header": t["store_h"], "widths": [2, 3], "rows": t["store"]},
        {"type": "p", "text": t["privacy"]},
        {"type": "h2", "text": t["h9c"]},
        {"type": "p", "text": t["check"]},
        {"type": "h2", "text": t["h9d"]},
        {"type": "bullets", "items": t["limits"]},
        {"type": "p", "text": t["history"]},
    ]


def french(text):
    parts = re.split(r"(`[^`]*`)", text)  # code spans stay as they are
    out = []
    for part in parts:
        if not part.startswith("`"):
            part = re.sub(r" ([:;!?%»])", NBSP + r"\1", part)
            part = part.replace("« ", "«" + NBSP)
        out.append(part)
    return "".join(out)


def walk(node, fn):
    if isinstance(node, dict):
        return {k: (walk(v, fn) if k not in ("type", "path", "variant", "lines") else v) for k, v in node.items()}
    if isinstance(node, list):
        return [walk(v, fn) for v in node]
    if isinstance(node, str):
        return fn(node)
    return node


for lang in ("EN", "FR", "NL", "DE"):
    source = HERE / f"text_{lang}.json"
    if not source.exists():
        print(lang, "no text yet, skipped")
        continue
    t = json.loads(source.read_text(encoding="utf-8"))
    data = {"meta": {**t["meta"], "author": "Hans Tandt"}, "blocks": blocks(lang, t)}
    if lang == "FR":
        data = walk(data, french)
    (HERE / f"content_{lang}.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(lang, len(data["blocks"]), "blocks")
