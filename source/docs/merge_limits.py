# One-off edit: merge the first two "Limits" bullets into one in every language,
# and set the appendix diagram width. Edits the JSON structure, not the text layout.
import json
from pathlib import Path

HERE = Path(__file__).parent
MERGED = {
    "EN": "It sees Claude Code sessions on this PC only (app and terminal), not cloud or WSL sessions or other computers.",
    "FR": "Il voit uniquement les sessions Claude Code de ce PC (application et terminal), pas celles du cloud, de WSL ou d'autres ordinateurs.",
    "NL": "Het ziet alleen Claude Code-sessies op deze pc (app en terminal), geen cloud- of WSL-sessies of andere computers.",
    "DE": "Es sieht nur Claude Code-Sitzungen auf diesem PC (App und Terminal), keine Cloud- oder WSL-Sitzungen und keine anderen Computer.",
}
for lang, text in MERGED.items():
    p = HERE / f"content_{lang}.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    blocks = data["blocks"]
    # the bullets block is the last "bullets" block in the document (the Limits section)
    i = max(k for k, b in enumerate(blocks) if b["type"] == "bullets")
    items = blocks[i]["items"]
    if len(items) == 3:
        blocks[i]["items"] = [text, items[2]]
    if lang != "EN":
        for b in blocks:
            if b["type"] == "figure" and b["path"].startswith("figures/how-it-works_"):
                b["width"] = 460
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(lang, "limits:", len(blocks[i]["items"]), "bullets")
