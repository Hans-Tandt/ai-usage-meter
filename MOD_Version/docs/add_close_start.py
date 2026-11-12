# One-off edit: chapter 5 "Close and start a session safely" in text_XX.json.
# Renumbers chapters 5-8 to 6-9, the pane figure to Figure 3, and the chapter references. Run once, then make_content.py.
import json
import re
from pathlib import Path

HERE = Path(__file__).parent

T = {
    "EN": {
        "chapters": ("Chapters 1 to 8", "Chapters 1 to 9"),
        "strip_ref": ("(chapter 7)", "(chapter 8)"),
        "h_cs": "5. Close and start a session safely",
        "p_cs": "Two buttons run two prompts that come with the mod. Close session checks everything this session did and saves it in CLAUDE.md, MEMORY.md and the session notes. Start session reads those files in the next session, or creates them in a new project, and continues where you stopped.",
        "fig3": "Figure 2. Close session in the band: first its progress, then the result.",
        "alt3": "Two bands: an orange line \"Closing session… step 3 of 6 · 50%\" with a bar, and a green line \"Now it's safe to end this session\".",
        "where_h": ["Button", "Where"],
        "where": [
            ["Close session", "In the band at red, in the /meter pane, or `/meter close-session`."],
            ["Start session", "In the band of a new session before your first message, in the /meter pane, or `/meter start-session`."],
        ],
        "msg_h": ["The band says", "What to do"],
        "msg": [
            ["Closing session… step 3 of 6 · 50%", "Wait: Claude is working through the check."],
            ["✓ Now it's safe to end this session", "Everything is saved. Close the session."],
            ["✓ Everything is ready to start this session", "Claude has read the files. Start your task."],
            ["It's NOT safe to close this session: <reason>", "Claude found a problem. Read its reply, fix it, and run Close session again."],
            ["Close session stopped at step 2 of 6", "The reply ended early. Check it, or run Close session again."],
        ],
        "go_t": "One click does it all",
        "go": "The button counts as your \"go\": Claude writes the changes without stopping to ask. In a git project it makes no backup copies of files that git already keeps.",
        "hand_t": "The hand-over",
        "hand": "Close session ends with the first message for the next session. The mod keeps it, and Start session in the next session of the same folder sends it along. Claude continues exactly where you stopped.",
    },
    "FR": {
        "chapters": ("Les chapitres 1 à 8", "Les chapitres 1 à 9"),
        "strip_ref": ("(chapitre 7)", "(chapitre 8)"),
        "h_cs": "5. Fermer et ouvrir une session en sécurité",
        "p_cs": "Deux boutons lancent deux prompts fournis avec le mod. Close session vérifie tout ce que la session a fait et l'enregistre dans CLAUDE.md, MEMORY.md et les notes de session. Start session lit ces fichiers dans la session suivante, ou les crée dans un nouveau projet, et reprend là où vous vous êtes arrêté.",
        "fig3": "Figure 2. Close session dans le bandeau : d'abord la progression, puis le résultat.",
        "alt3": "Deux bandeaux : une ligne orange « Closing session… step 3 of 6 · 50% » avec une jauge, et une ligne verte « Now it's safe to end this session ».",
        "where_h": ["Bouton", "Où"],
        "where": [
            ["Close session", "Dans le bandeau au rouge, dans le panneau /meter, ou `/meter close-session`."],
            ["Start session", "Dans le bandeau d'une nouvelle session avant votre premier message, dans le panneau /meter, ou `/meter start-session`."],
        ],
        "msg_h": ["Le bandeau dit", "Que faire"],
        "msg": [
            ["Closing session… step 3 of 6 · 50%", "Attendez : Claude fait la vérification."],
            ["✓ Now it's safe to end this session", "Tout est enregistré. Fermez la session."],
            ["✓ Everything is ready to start this session", "Claude a lu les fichiers. Commencez votre tâche."],
            ["It's NOT safe to close this session: <reason>", "Claude a trouvé un problème. Lisez sa réponse, corrigez, puis relancez Close session."],
            ["Close session stopped at step 2 of 6", "La réponse s'est arrêtée trop tôt. Vérifiez-la, ou relancez Close session."],
        ],
        "go_t": "Un seul clic fait tout",
        "go": "Le bouton vaut votre « go » : Claude écrit les modifications sans s'arrêter pour demander. Dans un projet git, il ne fait pas de copies de sauvegarde des fichiers que git garde déjà.",
        "hand_t": "Le passage de relais",
        "hand": "Close session se termine par le premier message pour la session suivante. Le mod le garde, et Start session dans la session suivante du même dossier l'envoie avec le prompt. Claude reprend exactement là où vous vous êtes arrêté.",
    },
    "NL": {
        "chapters": ("Hoofdstuk 1 tot 8", "Hoofdstuk 1 tot 9"),
        "strip_ref": ("(hoofdstuk 7)", "(hoofdstuk 8)"),
        "h_cs": "5. Sluit en start een sessie veilig",
        "p_cs": "Twee knoppen voeren twee prompts uit die bij de mod horen. Close session controleert alles wat deze sessie deed en bewaart het in CLAUDE.md, MEMORY.md en de sessienotities. Start session leest die bestanden in de volgende sessie, of maakt ze aan in een nieuw project, en gaat verder waar je stopte.",
        "fig3": "Figuur 2. Close session in de band: eerst de voortgang, dan het resultaat.",
        "alt3": "Twee banden: een oranje regel \"Closing session… step 3 of 6 · 50%\" met een balk, en een groene regel \"Now it's safe to end this session\".",
        "where_h": ["Knop", "Waar"],
        "where": [
            ["Close session", "In de band bij rood, in het paneel /meter, of `/meter close-session`."],
            ["Start session", "In de band van een nieuwe sessie voor je eerste bericht, in het paneel /meter, of `/meter start-session`."],
        ],
        "msg_h": ["De band zegt", "Wat je doet"],
        "msg": [
            ["Closing session… step 3 of 6 · 50%", "Wacht: Claude werkt de controle af."],
            ["✓ Now it's safe to end this session", "Alles is bewaard. Sluit de sessie."],
            ["✓ Everything is ready to start this session", "Claude heeft de bestanden gelezen. Begin aan je taak."],
            ["It's NOT safe to close this session: <reason>", "Claude vond een probleem. Lees het antwoord, los het op en start Close session opnieuw."],
            ["Close session stopped at step 2 of 6", "Het antwoord stopte te vroeg. Controleer het, of start Close session opnieuw."],
        ],
        "go_t": "Eén klik doet alles",
        "go": "De knop telt als je \"go\": Claude schrijft de wijzigingen zonder te stoppen om te vragen. In een git-project maakt hij geen reservekopieën van bestanden die git al bewaart.",
        "hand_t": "De overdracht",
        "hand": "Close session eindigt met het eerste bericht voor de volgende sessie. De mod bewaart het, en Start session in de volgende sessie van dezelfde map stuurt het mee. Claude gaat precies verder waar je stopte.",
    },
    "DE": {
        "chapters": ("Die Kapitel 1 bis 8", "Die Kapitel 1 bis 9"),
        "strip_ref": ("(Kapitel 7)", "(Kapitel 8)"),
        "h_cs": "5. Sitzungen sicher schließen und starten",
        "p_cs": "Zwei Schaltflächen führen zwei Prompts aus, die mit der Mod kommen. Close session prüft alles, was diese Sitzung getan hat, und speichert es in CLAUDE.md, MEMORY.md und den Sitzungsnotizen. Start session liest diese Dateien in der nächsten Sitzung oder legt sie in einem neuen Projekt an und macht dort weiter, wo Sie aufgehört haben.",
        "fig3": "Abbildung 2. Close session im Band: erst der Fortschritt, dann das Ergebnis.",
        "alt3": "Zwei Bänder: eine orange Zeile „Closing session… step 3 of 6 · 50%“ mit einem Balken und eine grüne Zeile „Now it's safe to end this session“.",
        "where_h": ["Schaltfläche", "Wo"],
        "where": [
            ["Close session", "Im Band bei Rot, im Bereich /meter oder mit `/meter close-session`."],
            ["Start session", "Im Band einer neuen Sitzung vor Ihrer ersten Nachricht, im Bereich /meter oder mit `/meter start-session`."],
        ],
        "msg_h": ["Das Band sagt", "Was Sie tun"],
        "msg": [
            ["Closing session… step 3 of 6 · 50%", "Warten: Claude arbeitet die Prüfung ab."],
            ["✓ Now it's safe to end this session", "Alles ist gespeichert. Schließen Sie die Sitzung."],
            ["✓ Everything is ready to start this session", "Claude hat die Dateien gelesen. Beginnen Sie Ihre Aufgabe."],
            ["It's NOT safe to close this session: <reason>", "Claude hat ein Problem gefunden. Lesen Sie die Antwort, beheben Sie es und starten Sie Close session erneut."],
            ["Close session stopped at step 2 of 6", "Die Antwort endete zu früh. Prüfen Sie sie oder starten Sie Close session erneut."],
        ],
        "go_t": "Ein Klick erledigt alles",
        "go": "Die Schaltfläche zählt als Ihr „go“: Claude schreibt die Änderungen, ohne anzuhalten und zu fragen. In einem Git-Projekt legt es keine Sicherungskopien von Dateien an, die Git schon aufbewahrt.",
        "hand_t": "Die Übergabe",
        "hand": "Close session endet mit der ersten Nachricht für die nächste Sitzung. Die Mod bewahrt sie auf, und Start session in der nächsten Sitzung desselben Ordners schickt sie mit. Claude macht genau dort weiter, wo Sie aufgehört haben.",
    },
}

FIG2 = re.compile(r"^(Figure|Figuur|Abbildung) 2\.")

for lang, t in T.items():
    p = HERE / f"text_{lang}.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    if "h_cs" in data:
        print(lang, "already has chapter 5, skipped")
        continue
    old, new = t["chapters"]
    assert old in data["use"], (lang, "chapters line")
    data["use"] = data["use"].replace(old, new)
    old, new = t["strip_ref"]
    assert old in data["which"], (lang, "strip reference")
    data["which"] = data["which"].replace(old, new)
    for k in ("h8", "h7", "h6", "h5"):
        n = int(data[k].split(".", 1)[0])
        data[k] = f"{n + 1}." + data[k].split(".", 1)[1]
    data["fig2"] = FIG2.sub(lambda m: f"{m.group(1)} 3.", data["fig2"])
    for k in ("h_cs", "p_cs", "fig3", "alt3", "where_h", "where", "msg_h", "msg", "go_t", "go", "hand_t", "hand"):
        data[k] = t[k]
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(lang, "done:", data["h5"], "|", data["fig2"][:12])
