# Builds the manual's composite figures from the screenshots in figures/.
# Usage: py make_figures.py en|fr|nl|de   -> figures/<name>_<lang>.png
# House palette: navy 1F3A5F, gold B7892B, green 2E7D32, red B23A3A, text 1A1A1A.
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
FIG = HERE / "figures"
NAVY, GOLD, TEXT, GREY = (31, 58, 95), (183, 137, 43), (26, 26, 26), (107, 124, 147)
S = 2  # draw at 2x for sharp print

T = {
    "en": {
        "cc": ["Claude Code", "(app or terminal)"], "addon": ["Add-on", "writes your figures"],
        "files": ["Files in your", ".claude folder"], "strip": ["AI Usage Meter", "shows them"],
        "update": "Once a day, optional: version file from hanstandt.be",
        "after": "after each reply", "every": "every 3 s",
        "green": "Green: below 80 % - keep working",
        "yellow": "Yellow: from 80 % - finish the task, update your notes",
        "red": "Red: from 90 % - start a new session",
        "horizontal": "Horizontal", "vertical": "Vertical", "square": "Square, one at a time",
    },
    "fr": {
        "cc": ["Claude Code", "(app ou terminal)"], "addon": ["Module", "écrit vos chiffres"],
        "files": ["Fichiers dans", "le dossier .claude"], "strip": ["AI Usage Meter", "les affiche"],
        "update": "Une fois par jour, en option : fichier de version sur hanstandt.be",
        "after": "après chaque réponse", "every": "toutes les 3 s",
        "green": "Vert : sous 80 % - continuez",
        "yellow": "Jaune : dès 80 % - terminez la tâche, mettez vos notes à jour",
        "red": "Rouge : dès 90 % - ouvrez une nouvelle session",
        "horizontal": "Horizontal", "vertical": "Vertical", "square": "Carré, un à la fois",
    },
    "nl": {
        "cc": ["Claude Code", "(app of terminal)"], "addon": ["Add-on", "schrijft je cijfers"],
        "files": ["Bestanden in je", "map .claude"], "strip": ["AI Usage Meter", "toont ze"],
        "update": "Eén keer per dag, optioneel: versiebestand van hanstandt.be",
        "after": "na elk antwoord", "every": "elke 3 s",
        "green": "Groen: onder 80 % - werk gewoon verder",
        "yellow": "Geel: vanaf 80 % - rond de taak af, werk je notities bij",
        "red": "Rood: vanaf 90 % - start een nieuwe sessie",
        "horizontal": "Horizontaal", "vertical": "Verticaal", "square": "Vierkant, één tegelijk",
    },
    "de": {
        "cc": ["Claude Code", "(App oder Terminal)"], "addon": ["Add-on", "schreibt Ihre Werte"],
        "files": ["Dateien in Ihrem", "Ordner .claude"], "strip": ["AI Usage Meter", "zeigt sie an"],
        "update": "Einmal täglich, optional: Versionsdatei von hanstandt.be",
        "after": "nach jeder Antwort", "every": "alle 3 s",
        "green": "Grün: unter 80 % - weiterarbeiten",
        "yellow": "Gelb: ab 80 % - Aufgabe abschließen, Notizen aktualisieren",
        "red": "Rot: ab 90 % - neue Sitzung starten",
        "horizontal": "Horizontal", "vertical": "Vertikal", "square": "Quadrat, eines nach dem anderen",
    },
}


def font(size, bold=False):
    return ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf", size * S)


def shot(name, scale=2):
    im = Image.open(FIG / name).convert("RGB")
    return im.resize((im.width * scale, im.height * scale), Image.LANCZOS)


def arrow(d, x1, y, x2, color=NAVY, width=3):
    d.line([(x1 * S, y * S), ((x2 - 9) * S, y * S)], fill=color, width=width * S)
    d.polygon([((x2) * S, y * S), ((x2 - 11) * S, (y - 6) * S), ((x2 - 11) * S, (y + 6) * S)], fill=color)


def box(d, x, y, w, h, lines, outline=NAVY, dashed=False):
    if dashed:
        for i in range(x, x + w, 12):
            d.line([(i * S, y * S), (min(i + 6, x + w) * S, y * S)], fill=outline, width=2 * S)
            d.line([(i * S, (y + h) * S), (min(i + 6, x + w) * S, (y + h) * S)], fill=outline, width=2 * S)
        for j in range(y, y + h, 12):
            d.line([(x * S, j * S), (x * S, min(j + 6, y + h) * S)], fill=outline, width=2 * S)
            d.line([((x + w) * S, j * S), ((x + w) * S, min(j + 6, y + h) * S)], fill=outline, width=2 * S)
    else:
        d.rounded_rectangle([x * S, y * S, (x + w) * S, (y + h) * S], radius=10 * S, outline=outline, width=3 * S, fill=(255, 255, 255))
    total = len(lines)
    for i, line in enumerate(lines):
        third = i == 2  # an optional third line: small and grey (timing)
        f = font(14 if third else 17, bold=(i == 0 and total > 1))
        tw = d.textlength(line, font=f)
        colour = NAVY if i == 0 else GREY if third else TEXT
        d.text(((x + w / 2) * S - tw / 2, (y + h / 2 - 12 * total + 24 * i) * S), line, font=f, fill=colour)


def how_it_works(t):
    # The timing sits inside the boxes (grey third line): the gaps are too narrow for arrow labels.
    W, H = 900, 250
    im = Image.new("RGB", (W * S, H * S), "white")
    d = ImageDraw.Draw(im)
    bw, bh, y = 180, 96, 20
    xs = [6, 244, 482, 714]
    texts = [t["cc"], t["addon"] + [t["after"]], t["files"], t["strip"] + [t["every"]]]
    for x, lines in zip(xs, texts):
        box(d, x, y, bw, bh, lines)
    for i in range(3):
        arrow(d, xs[i] + bw + 6, y + bh / 2, xs[i + 1] - 6)
    box(d, 440, 170, 454, 56, [t["update"]], outline=GOLD, dashed=True)
    d.line([((xs[3] + bw / 2) * S, (y + bh) * S), ((xs[3] + bw / 2) * S, 168 * S)], fill=GOLD, width=2 * S)
    return im


def session_levels(t):
    rows = [("session-green.jpg", t["green"]), ("session-yellow.jpg", t["yellow"]), ("session-red.jpg", t["red"])]
    shots = [shot(n) for n, _ in rows]
    gap, pad = 14 * S, 6 * S
    width = max(s.width for s in shots)
    f = font(15)
    height = sum(s.height + 26 * S + gap for s in shots)
    im = Image.new("RGB", (width + 2 * pad, height), "white")
    d = ImageDraw.Draw(im)
    y = pad
    for s, (_, label) in zip(shots, rows):
        im.paste(s, (pad, y))
        d.text((pad, y + s.height + 4 * S), label, font=f, fill=TEXT)
        y += s.height + 26 * S + gap
    return im


def layouts(t):
    strip, vert = shot("strip.jpg"), shot("vertical.jpg")
    squares = [shot(n) for n in ("square-session.jpg", "square-week.jpg", "square-compress.jpg")]
    f = font(15, bold=True)
    pad, gap = 8 * S, 22 * S
    sq_w = sum(s.width for s in squares) + 2 * 40 * S
    width = max(strip.width, vert.width + 60 * S + sq_w) + 2 * pad
    height = pad + 22 * S + strip.height + gap + 22 * S + vert.height + pad
    im = Image.new("RGB", (width, height), "white")
    d = ImageDraw.Draw(im)
    d.text((pad, pad), t["horizontal"], font=f, fill=NAVY)
    im.paste(strip, (pad, pad + 22 * S))
    y = pad + 22 * S + strip.height + gap
    d.text((pad, y), t["vertical"], font=f, fill=NAVY)
    im.paste(vert, (pad, y + 22 * S))
    x = pad + vert.width + 60 * S
    d.text((x, y), t["square"], font=f, fill=NAVY)
    sy = y + 22 * S + (vert.height - squares[0].height) // 2
    for i, s in enumerate(squares):
        im.paste(s, (x, sy))
        x += s.width
        if i < 2:
            mid = sy + s.height // 2
            d.line([(x + 8 * S, mid), (x + 30 * S, mid)], fill=GOLD, width=3 * S)
            d.polygon([(x + 34 * S, mid), (x + 24 * S, mid - 6 * S), (x + 24 * S, mid + 6 * S)], fill=GOLD)
            x += 40 * S
    return im


if __name__ == "__main__":
    lang = sys.argv[1] if len(sys.argv) > 1 else "en"
    t = T[lang]
    for name, make in (("how-it-works", how_it_works), ("session-levels", session_levels), ("layouts", layouts)):
        out = FIG / f"{name}_{lang}.png"
        make(t).save(out)
        print(out.name, Image.open(out).size)
