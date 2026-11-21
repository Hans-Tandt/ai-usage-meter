# Draws the manual's figures of the mod inside Claude Code (version 1.7), with demo data:
# the band above the prompt at green, yellow and red, and the /meter pane.
# The mod's own words are English in every manual (product words); the labels under the bands are translated.
# Usage: py make_mod_figures.py en|fr|nl|de   -> figures/band-levels_<lang>.png and figures/pane.png
# Colours: the Claude desktop app's dark panel, and the strip's default green, orange and red.
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
FIG = HERE / "figures"
# The translated labels under the bands come from the strip's figure script.
sys.path.insert(0, str(HERE.parent.parent / "source" / "docs"))
from make_figures import T, TEXT  # noqa: E402

S = 2  # draw at 2x for sharp print
BG, EDGE, DIM, WHITE, TRACK = (37, 37, 37), (25, 25, 25), (161, 161, 161), (236, 236, 236), (74, 78, 84)
OK, WARN, DANGER = (63, 185, 80), (240, 136, 62), (248, 81, 73)
FONTS = "C:/Windows/Fonts/"


def font(size, bold=False):
    return ImageFont.truetype(FONTS + ("segoeuib.ttf" if bold else "segoeui.ttf"), size * S)


def symbol(size):
    return ImageFont.truetype(FONTS + "seguisym.ttf", size * S)


# The band's little pixel robot, as hooks/robot.tsx draws it (a frame without blink or hop):
# the Opus robot (a crown), at effort high (3 of 5 chest lights), size medium (3 screen pixels per pixel).
ROBOT = [
    "...k.AA.k...",
    "...kkkkkk...",
    "..HHHHHHHH..",
    "..HVVVVVVH..",
    "..HVEVVEVH..",
    "..HVVVVVVH..",
    "..HHHHHHHH..",
    "...bbbbbb...",
    "..abbmmbba..",
    "..abbbbbba..",
    "...bbbbbb...",
    "...bb..bb...",
    "...ww..ww...",
]
ROBOT_COLOURS = {"s": (138, 154, 166), "H": (201, 162, 39), "V": (27, 39, 48), "E": (93, 224, 230),
                 "b": (47, 74, 122), "m": (224, 195, 90), "a": (62, 94, 150), "w": (61, 75, 84),
                 "k": (224, 184, 60), "L": (93, 224, 230), "l": (36, 49, 58)}
ROBOT_EFFORT = 3


def robot_rows(state):
    f = [list(r) for r in ROBOT]

    def arms(top):
        for r, c in ((8, 2), (9, 2), (8, 9), (9, 9)):
            f[r][c] = "."
        for r in (top, top + 1):
            f[r][1] = f[r][10] = "a"

    if state == "yellow":
        f[3][4] = f[3][7] = "E"
    elif state == "red":
        for r in (3, 5):
            f[r][4] = f[r][7] = "E"
        arms(7)
    elif state == "happy":
        for c in range(3, 9):
            f[4][c] = "V"
        for r, c in ((4, 3), (3, 4), (4, 5), (4, 6), (3, 7), (4, 8)):
            f[r][c] = "E"
        arms(6)
    for i in range(5):
        f[9][3 + i] = "L" if i < ROBOT_EFFORT else "l"
    return ["".join(r) for r in f]


class Pen:
    """Writes left to right on one line, like the band's row of boxes."""

    def __init__(self, d, x, y):
        self.d, self.x, self.y = d, x, y

    def robot(self, state, antenna, gap=16):
        px = 3  # as in the band at Robot size 3: 36 x 42 screen pixels, the effort bar 6 below
        top = self.y - 27
        for y, row in enumerate(robot_rows(state)):
            for x, ch in enumerate(row):
                fill = antenna if ch == "A" else ROBOT_COLOURS.get(ch)
                if fill:
                    x0, y0 = (self.x + x * px) * S, (top + (y + 1) * px) * S
                    self.d.rectangle([x0, y0, x0 + px * S - 1, y0 + px * S - 1], fill=fill)
        # The effort bar under the robot: 5 marks, the first ROBOT_EFFORT lit
        mark, step, bar_y = 2 * px, 2.5 * px, top + 14 * px + 4
        for i in range(5):
            x0 = (self.x + i * step) * S
            self.d.rectangle([x0, bar_y * S, x0 + mark * S - 1, (bar_y + mark) * S - 1],
                             fill=ROBOT_COLOURS["L"] if i < ROBOT_EFFORT else ROBOT_COLOURS["l"])
        self.x += 12 * px + gap

    def text(self, s, colour=DIM, size=14, bold=False, gap=6, sym=False):
        f = symbol(size) if sym else font(size, bold)
        self.d.text((self.x * S, self.y * S), s, font=f, fill=colour, anchor="lm")
        self.x += self.d.textlength(s, font=f) / S + gap

    def bar(self, pct, colour, w=44, h=8, gap=6):
        x, y = self.x, self.y - h / 2
        self.d.rounded_rectangle([x * S, y * S, (x + w) * S, (y + h) * S], radius=h / 2 * S, fill=TRACK)
        f = max(h, round(w * pct / 100))
        self.d.rounded_rectangle([x * S, y * S, (x + f) * S, (y + h) * S], radius=h / 2 * S, fill=colour)
        self.x += w + gap

    def button(self, label, primary=False, gap=8):
        f = font(13, bold=primary)
        tw = self.d.textlength(label, font=f) / S
        x, y = self.x, self.y - 13
        fill = (217, 119, 87) if primary else (58, 58, 58)
        self.d.rounded_rectangle([x * S, y * S, (x + tw + 20) * S, (y + 26) * S], radius=6 * S, fill=fill)
        self.d.text(((x + 10) * S, self.y * S), label, font=f, fill=WHITE, anchor="lm")
        self.x += tw + 20 + gap


def gauge(p, label, pct, colour, tail):
    p.text(label)
    p.bar(pct, colour)
    p.text(f"{pct}%", colour, bold=colour != OK, gap=5)
    if tail.startswith("↻"):
        p.text("↻", sym=True, gap=1)
        p.text(tail[1:], gap=16)
    elif tail:
        p.text(tail, gap=16)
    else:
        p.x += 18


def band(ctx, colour, warning=None, buttons=(), turns="~9 turns"):
    W = 860
    H = 62 if not warning else 108  # room for the robot at size 3 and its effort bar
    im = Image.new("RGB", (W * S, H * S), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W * S - 1, H * S - 1], outline=EDGE, width=2 * S)
    p = Pen(d, 14, 31)
    p.button("Details", gap=16)  # a fixed place at the left, away from Claude Code's [-]
    p.robot({OK: "idle", WARN: "yellow", DANGER: "red"}[colour], colour)
    gauge(p, "Session", 34, OK, "↻3h 04m")
    gauge(p, "Week", 21, OK, "↻4d 5h")
    gauge(p, "Compress", ctx, colour, turns)
    p.text("cache 42m", DIM, 13)  # the cache clock (1.9.0), one of the band's dim notes
    Pen(d, W - 34, 31).text("[-]", DIM)  # Claude Code's own mark: folds the band away
    if warning:
        # The warning row sits one line lower, so the full-size buttons don't touch the gauges
        p = Pen(d, 14, 84)
        p.text(("■ " if colour == DANGER else "▲ ") + warning, colour, bold=True, gap=12)
        for i, b in enumerate(buttons):
            p.button(b, primary=i == 0)
    return im


def band_levels(t):
    rows = [
        (band(46, OK, turns=""), t["green"]),
        (band(84, WARN, "84% to compaction: finish the task and update your session notes", ["Write session notes"], "~6 turns"), t["yellow"]),
        (band(93, DANGER, "93% to compaction: start a new session", ["Close session", "Compact"], "~2 turns"), t["red"]),
    ]
    pad, gap = 6 * S, 14 * S
    f = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 15 * S)
    width = max(b.width for b, _ in rows) + 2 * pad
    height = sum(b.height + 26 * S + gap for b, _ in rows)
    im = Image.new("RGB", (width, height), "white")
    d = ImageDraw.Draw(im)
    y = pad
    for b, label in rows:
        im.paste(b, (pad, y))
        d.text((pad, y + b.height + 4 * S), label, font=f, fill=TEXT)
        y += b.height + 26 * S + gap
    return im


def pane():
    W, H = 470, 960
    im = Image.new("RGB", (W * S, H * S), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W * S - 1, H * S - 1], outline=EDGE, width=2 * S)
    y = 24

    def line(parts, step=22):
        nonlocal y
        p = Pen(d, 18, y)
        for kind, *args in parts:
            getattr(p, kind)(*args)
        y += step

    for title, pct, reset, pace in (
        ("Session (5-hour limit)", 34, "Resets 14:30, in 3h 04m", "At this pace the reset comes first"),
        ("Week (weekly limit)", 21, "Resets Thu 17:00, in 4d 5h", "At this pace the reset comes first"),
    ):
        line([("text", title, WHITE, 14, True)])
        line([("bar", pct, OK, 220, 9, 8), ("text", f"{pct}%", OK, 14, True)])
        line([("text", reset)])
        line([("text", pace)], 34)
    line([("text", "Limits updated 2m ago")], 34)
    line([("text", "Compress (this session's context)", WHITE, 14, True)])
    line([("bar", 84, WARN, 220, 9, 8), ("text", "84%", WARN, 14, True), ("text", "to compaction")])
    line([("text", "134k tokens of 160k (compaction point) · window 200k")])
    # what the last turns added, as small columns
    p = Pen(d, 18, y)
    p.text("Last turns")
    for i, v in enumerate((4, 7, 5, 12, 9, 16, 11)):
        bh = 2 + v
        d.rounded_rectangle([(p.x + i * 7) * S, (y + 8 - bh) * S, (p.x + i * 7 + 5) * S, (y + 8) * S], radius=1 * S, fill=WARN)
    p.x += 7 * 7 + 6
    p.text("about 6 more turns like these before compaction")
    y += 22
    line([("text", "Not compacted yet in this session  ·  cost so far $4.12 (API prices)")], 34)
    line([("text", "84% to compaction: finish the task and update your session notes", WARN, 13, True)], 32)
    line([("text", "Session", WHITE, 14, True)], 30)
    line([("button", "Close session", True), ("button", "Start session"), ("button", "Write session notes")], 34)
    line([("button", "Compact"), ("button", "Hide the band")], 32)
    line([("text", "Close session checks and updates CLAUDE.md, MEMORY.md and the", DIM, 13)], 18)
    line([("text", "session notes, then says when it is safe to close.", DIM, 13)], 34)
    # The cache clock (1.9.0): minutes left, with Keep warm while it is still warm
    line([("text", "Cache", WHITE, 14, True), ("text", "warm for 42m", DIM, 14), ("button", "Keep warm")], 24)
    line([("text", "Keep warm asks one tiny question, which re-reads 134k tokens", DIM, 13)], 18)
    line([("text", "from the cache: cheaper than new input, but it counts.", DIM, 13)], 34)
    line([("text", "Haiku reader", WHITE, 14, True), ("button", "On"), ("text", "Haiku 19 % · 7 runs", DIM, 13), ("button", "Details")], 36)
    line([("text", "Other sessions on this PC", WHITE, 14, True)])
    line([("text", " 93%", DANGER, 14, True), ("text", "WebsiteRedesign", WHITE), ("text", "· 4m ago")])
    line([("text", " 37%", OK, 14, True), ("text", "MealPlanner", WHITE), ("text", "· 1h 12m ago")], 32)
    line([("text", "Levels: limits 80/95%, context 80/90%.", DIM, 13), ("button", "Settings")], 36)
    line([("text", "Session Pilot 2.0.1 · Hans Tandt · hanstandt.be", DIM, 13)])
    return im.crop((0, 0, W * S, (y + 6) * S))


# Close session in the band: while it runs, and when it is done. The labels under them are translated.
ROUTINE = {
    "en": ("While Close session runs: the step and the progress", "When it is done: the session can be closed"),
    "fr": ("Pendant Close session : l'étape et la progression", "Quand c'est fini : la session peut être fermée"),
    "nl": ("Terwijl Close session loopt: de stap en de voortgang", "Als het klaar is: de sessie mag dicht"),
    "de": ("Während Close session läuft: der Schritt und der Fortschritt", "Wenn es fertig ist: die Sitzung kann geschlossen werden"),
}


def routine_band(text, colour, pct=None):
    W, H = 860, 108
    im = Image.new("RGB", (W * S, H * S), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W * S - 1, H * S - 1], outline=EDGE, width=2 * S)
    p = Pen(d, 14, 31)
    p.button("Details", gap=16)
    p.robot("happy" if text.startswith("✓") else "red", OK if text.startswith("✓") else DANGER)
    gauge(p, "Session", 34, OK, "↻3h 04m")
    gauge(p, "Week", 21, OK, "↻4d 5h")
    gauge(p, "Compress", 93, DANGER, "next turn")
    Pen(d, W - 34, 31).text("[-]", DIM)
    p = Pen(d, 14, 84)
    if pct is not None:
        p.bar(pct, colour, w=56)
    if text.startswith("✓"):  # Segoe UI Bold has no check mark
        p.text("✓", colour, sym=True, gap=4)
        text = text[1:].lstrip()
    p.text(text, colour, bold=True)
    return im


def band_routine(lang):
    running, done = ROUTINE[lang]
    rows = [
        (routine_band("Closing session… step 3 of 6 · 50% · files compared", WARN, 50), running),
        (routine_band("✓ Now it's safe to end this session", OK), done),
    ]
    pad, gap = 6 * S, 14 * S
    f = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 15 * S)
    width = max(b.width for b, _ in rows) + 2 * pad
    height = sum(b.height + 26 * S + gap for b, _ in rows)
    im = Image.new("RGB", (width, height), "white")
    d = ImageDraw.Draw(im)
    y = pad
    for b, label in rows:
        im.paste(b, (pad, y))
        d.text((pad, y + b.height + 4 * S), label, font=f, fill=TEXT)
        y += b.height + 26 * S + gap
    return im


if __name__ == "__main__":
    lang = sys.argv[1] if len(sys.argv) > 1 else "en"
    out = FIG / f"band-levels_{lang}.png"
    band_levels(T[lang]).save(out)
    print(out.name, Image.open(out).size)
    out = FIG / f"band-routine_{lang}.png"
    band_routine(lang).save(out)
    print(out.name, Image.open(out).size)
    if lang == "en":
        pane().save(FIG / "pane.png")
        print("pane.png", Image.open(FIG / "pane.png").size)
