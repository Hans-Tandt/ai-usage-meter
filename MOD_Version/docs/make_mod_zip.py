# Builds the mod's download zip for the website: dist\AIUsageMeter-Mod-<version>.zip, with only the files a
# user needs, under the folder "AI Usage Meter Mod". Step 5 of RELEASE.md.
# Usage (from the project folder): py MOD_Version\docs\make_mod_zip.py
# It stops when the version number is not the same everywhere, or a file is missing; it never publishes.
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path

MOD = Path(__file__).resolve().parent.parent
DIST = MOD.parent / "dist"
TOP = "AI Usage Meter Mod"

# What the user gets: no tests, no type stubs of Claude Code, no manual sources.
FILES = [
    ".claude-plugin/marketplace.json",
    ".claude-plugin/plugin.json",
    "LICENSE",
    "README.md",
    "CHANGELOG.md",
    "TESTING.md",
    "hooks/hooks.json",
    "types/index.d.ts",
]
FOLDERS = {"hooks": "*.ts*", "images": "*.png", "prompts": "*.md", "docs/out": "*.pdf"}


def version_everywhere():
    version = json.loads((MOD / ".claude-plugin/plugin.json").read_text(encoding="utf-8"))["version"]
    found = {
        "hooks/draw.tsx VERSION": re.search(r"VERSION = '([\d.]+)'", (MOD / "hooks/draw.tsx").read_text(encoding="utf-8")),
        "README.md": re.search(r"^Version ([\d.]+) ·", (MOD / "README.md").read_text(encoding="utf-8"), re.M),
        "CHANGELOG.md (newest)": re.search(r"^## ([\d.]+) ", (MOD / "CHANGELOG.md").read_text(encoding="utf-8"), re.M),
        "docs/make_mod_figures.py": re.search(r"AI Usage Meter mod ([\d.]+) ·", (MOD / "docs/make_mod_figures.py").read_text(encoding="utf-8")),
    }
    for lang in ("EN", "FR", "NL", "DE"):
        text = json.loads((MOD / f"docs/text_{lang}.json").read_text(encoding="utf-8"))
        found[f"docs/text_{lang}.json"] = re.search(r"([\d.]+)$", text["meta"]["version"] if "meta" in text else "")
    wrong = {k: (m.group(1) if m else "not found") for k, m in found.items() if not m or m.group(1) != version}
    return version, wrong


def main():
    version, wrong = version_everywhere()
    if wrong:
        print(f"plugin.json says {version}, but:")
        for k, v in wrong.items():
            print(f"  {k}: {v}")
        sys.exit(1)
    files = [MOD / f for f in FILES]
    for folder, pattern in FOLDERS.items():
        files += sorted((MOD / folder).glob(pattern))
    missing = [str(f) for f in files if not f.is_file()]
    if missing:
        print("missing:", *missing, sep="\n  ")
        sys.exit(1)
    DIST.mkdir(exist_ok=True)
    out = DIST / f"AIUsageMeter-Mod-{version}.zip"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for f in files:
            z.write(f, f"{TOP}/{f.relative_to(MOD).as_posix()}")
    digest = hashlib.sha256(out.read_bytes()).hexdigest()
    print(f"{out}  ({len(files)} files, {out.stat().st_size // 1024} KB)")
    print(f"SHA-256 {digest}")


if __name__ == "__main__":
    main()
