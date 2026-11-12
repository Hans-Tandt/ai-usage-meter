# One-off edit: the one-command install (chapter 3), "Without the terminal" as the second way,
# a new chapter 9 "Check that everything works", and the remove chapter (now 10) with the uninstall commands.
# Run once, then make_content.py.
import json
from pathlib import Path

HERE = Path(__file__).parent
FOLDER = r"C:\Users\<you>\Documents\AI Usage Meter Mod"

T = {
    "EN": {
        "chapters": ("Chapters 1 to 9", "Chapters 1 to 10"),
        "p3": "The mod is a folder. Put it somewhere it can stay, for example `Documents\\AI Usage Meter Mod`: Claude Code reads the mod from that folder, so do not move or delete it later.",
        "steps3": [
            "Unzip the mod into that folder.",
            "Open a terminal (PowerShell on Windows).",
            "Type the command below, with your own folder between the quotes, and press Enter.",
            "Quit and restart the Claude desktop app, or start a new `claude` session in the terminal.",
            "Send one message. After Claude's reply, the band appears above the prompt.",
        ],
        "code3": "One command adds the mod and installs it for every session.",
        "try": f"In a terminal, type `claude --plugin-dir \"{FOLDER}\"`. The mod then loads for that session only, and nothing is installed.",
        "h3b": "Without the terminal",
        "p3b": "No `claude` command in your terminal? Then tell Claude Code where the folder is, in `settings.json`:",
        "steps3b": [
            "Open `%USERPROFILE%\\.claude\\settings.json` in a text editor.",
            "Find `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block. If it is not there, add it.",
            "Add the mod's folder to its value. Separate folders with a semicolon (`;`).",
            "Save the file and restart Claude Code.",
        ],
        "code3b": "The env block with the strip's add-on and the mod. In JSON every \\ is written twice.",
        "h_test": "9. Check that everything works",
        "p_test": "Ten minutes, no usage spent on the warnings: the demo figures show every colour and button. Use a test folder, not a real project. Do the steps in this order.",
        "test_tip_t": "Use a test folder",
        "test_tip": "Close session and Start session write CLAUDE.md, MEMORY.md and session notes. Try them first in an empty folder, for example `Documents\\Test`, and open a new Claude Code session there.",
        "test_h": ["Do this", "You should see"],
        "tests": [
            ["The band", [
                ["Open a new session; do not type yet", "Session, Week and Compress, Details at the right, and \"New session:\" with Start session"],
                ["Send one message", "The \"New session\" line disappears"],
            ]],
            ["The warnings (demo)", [
                ["`/meter demo here 85`", "Compress orange; \"finish the task and update your session notes\" with Write session notes"],
                ["`/meter demo here 93`", "Compress red; \"start a new session\" blinks; Close session and Compact"],
                ["`/meter demo 96`", "Session red, Week 48 %; a short message about the 5-hour limit"],
                ["`/meter demo context 92 A`", "\"other: demo-A 92%\" in the band"],
                ["`/meter demo off`", "Your real figures again"],
            ]],
            ["The details pane", [
                ["Click Details", "The pane opens: limits, Compress, the last turns, buttons, other sessions"],
                ["Click Details again", "The pane closes"],
            ]],
            ["The settings", [
                ["`/config`, the ai-usage-meter rows", "The levels, messages, Blink at red, colours"],
                ["Switch Blink at red off, then `/meter demo here 93`", "Red without blinking (switch it on again afterwards)"],
            ]],
            ["Close session and Start session", [
                ["Ask Claude a small task, for example: create hello.txt", "Claude does it"],
                ["Click Close session (pane, or band at red)", "\"Closing session… step 1 of 6\" up to 6, then \"✓ Now it's safe to end this session\""],
                ["Look in the test folder", "CLAUDE.md, MEMORY.md and the session notes, filled in"],
                ["Open a new session there; click Start session before typing", "\"Preparing session…\", then \"✓ Everything is ready to start this session\""],
                ["Read Claude's first answer", "It continues from the hand-over of Close session"],
            ]],
            ["Safety", [
                ["Click Close session, then press Esc to stop Claude", "Orange: \"Close session stopped at step … of 6\", never green"],
                ["Click Close session twice quickly", "A message that one is already running"],
            ]],
        ],
        "steps8": [
            "Type `claude plugin uninstall ai-usage-meter@ai-usage-meter`.",
            "Type `claude plugin marketplace remove ai-usage-meter`.",
            "Restart Claude Code. Now you can delete the mod's folder.",
        ],
        "p8": "Installed through `settings.json`? Then remove the folder, and the semicolon before it, from `CLAUDE_CODE_PLUGIN_DIRS` instead. The mod's figures stay in `%USERPROFILE%\\.claude` for the strip; session files older than 7 days are deleted.",
    },
    "FR": {
        "chapters": ("Les chapitres 1 à 9", "Les chapitres 1 à 10"),
        "p3": "Le mod est un dossier. Placez-le à un endroit où il peut rester, par exemple `Documents\\AI Usage Meter Mod` : Claude Code lit le mod dans ce dossier, ne le déplacez donc pas et ne le supprimez pas ensuite.",
        "steps3": [
            "Décompressez le mod dans ce dossier.",
            "Ouvrez un terminal (PowerShell sous Windows).",
            "Tapez la commande ci-dessous, avec votre dossier entre les guillemets, et appuyez sur Entrée.",
            "Quittez et relancez l'application Claude, ou démarrez une nouvelle session `claude` dans le terminal.",
            "Envoyez un message. Après la réponse de Claude, le bandeau apparaît au-dessus de la zone de saisie.",
        ],
        "code3": "Une seule commande ajoute le mod et l'installe pour toutes les sessions.",
        "try": f"Dans un terminal, tapez `claude --plugin-dir \"{FOLDER}\"`. Le mod se charge alors pour cette session seulement, et rien n'est installé.",
        "h3b": "Sans terminal",
        "p3b": "Pas de commande `claude` dans votre terminal ? Indiquez alors à Claude Code où se trouve le dossier, dans `settings.json` :",
        "steps3b": [
            "Ouvrez `%USERPROFILE%\\.claude\\settings.json` dans un éditeur de texte.",
            "Cherchez `CLAUDE_CODE_PLUGIN_DIRS` dans le bloc `env`. S'il n'y est pas, ajoutez-le.",
            "Ajoutez le dossier du mod à sa valeur. Séparez les dossiers par un point-virgule (`;`).",
            "Enregistrez le fichier et relancez Claude Code.",
        ],
        "code3b": "Le bloc env avec le module de la barre et le mod. En JSON, chaque \\ s'écrit deux fois.",
        "h_test": "9. Vérifier que tout fonctionne",
        "p_test": "Dix minutes, sans consommer d'utilisation pour les alertes : les chiffres de démonstration montrent chaque couleur et chaque bouton. Utilisez un dossier de test, pas un vrai projet. Suivez les étapes dans cet ordre.",
        "test_tip_t": "Utilisez un dossier de test",
        "test_tip": "Close session et Start session écrivent CLAUDE.md, MEMORY.md et les notes de session. Essayez-les d'abord dans un dossier vide, par exemple `Documents\\Test`, et ouvrez-y une nouvelle session Claude Code.",
        "test_h": ["Faites ceci", "Vous devez voir"],
        "tests": [
            ["Le bandeau", [
                ["Ouvrez une nouvelle session ; ne tapez rien encore", "Session, Week et Compress, Details à droite, et « New session: » avec Start session"],
                ["Envoyez un message", "La ligne « New session » disparaît"],
            ]],
            ["Les alertes (démonstration)", [
                ["`/meter demo here 85`", "Compress orange ; « finish the task and update your session notes » avec Write session notes"],
                ["`/meter demo here 93`", "Compress rouge ; « start a new session » clignote ; Close session et Compact"],
                ["`/meter demo 96`", "Session rouge, Week 48 % ; un court message sur la limite de 5 heures"],
                ["`/meter demo context 92 A`", "« other: demo-A 92% » dans le bandeau"],
                ["`/meter demo off`", "Vos vrais chiffres à nouveau"],
            ]],
            ["Le panneau de détails", [
                ["Cliquez sur Details", "Le panneau s'ouvre : limites, Compress, derniers échanges, boutons, autres sessions"],
                ["Cliquez de nouveau sur Details", "Le panneau se ferme"],
            ]],
            ["Les réglages", [
                ["`/config`, les lignes ai-usage-meter", "Les seuils, les messages, Blink at red, les couleurs"],
                ["Désactivez Blink at red, puis `/meter demo here 93`", "Rouge sans clignotement (réactivez-le ensuite)"],
            ]],
            ["Close session et Start session", [
                ["Donnez une petite tâche à Claude, par exemple : crée hello.txt", "Claude la fait"],
                ["Cliquez sur Close session (panneau, ou bandeau au rouge)", "« Closing session… step 1 of 6 » jusqu'à 6, puis « ✓ Now it's safe to end this session »"],
                ["Regardez dans le dossier de test", "CLAUDE.md, MEMORY.md et les notes de session, remplis"],
                ["Ouvrez-y une nouvelle session ; cliquez sur Start session avant de taper", "« Preparing session… », puis « ✓ Everything is ready to start this session »"],
                ["Lisez la première réponse de Claude", "Il reprend le passage de relais de Close session"],
            ]],
            ["Sécurité", [
                ["Cliquez sur Close session, puis appuyez sur Échap pour arrêter Claude", "Orange : « Close session stopped at step … of 6 », jamais vert"],
                ["Cliquez deux fois rapidement sur Close session", "Un message indique qu'il est déjà en cours"],
            ]],
        ],
        "steps8": [
            "Tapez `claude plugin uninstall ai-usage-meter@ai-usage-meter`.",
            "Tapez `claude plugin marketplace remove ai-usage-meter`.",
            "Relancez Claude Code. Vous pouvez ensuite supprimer le dossier du mod.",
        ],
        "p8": "Installé via `settings.json` ? Retirez alors plutôt le dossier, et le point-virgule qui le précède, de `CLAUDE_CODE_PLUGIN_DIRS`. Les chiffres du mod restent dans `%USERPROFILE%\\.claude` pour la barre ; les fichiers de session de plus de 7 jours sont supprimés.",
    },
    "NL": {
        "chapters": ("Hoofdstuk 1 tot 9", "Hoofdstuk 1 tot 10"),
        "p3": "De mod is een map. Zet hem op een plek waar hij kan blijven, bijvoorbeeld `Documents\\AI Usage Meter Mod`: Claude Code leest de mod uit die map, dus verplaats of verwijder hem later niet.",
        "steps3": [
            "Pak de mod uit in die map.",
            "Open een terminal (PowerShell in Windows).",
            "Typ de opdracht hieronder, met je eigen map tussen de aanhalingstekens, en druk op Enter.",
            "Sluit de Claude-app en start hem opnieuw, of start een nieuwe `claude`-sessie in de terminal.",
            "Stuur één bericht. Na het antwoord van Claude verschijnt de band boven het invoerveld.",
        ],
        "code3": "Eén opdracht voegt de mod toe en installeert hem voor elke sessie.",
        "try": f"Typ in een terminal `claude --plugin-dir \"{FOLDER}\"`. De mod laadt dan alleen voor die sessie, en er wordt niets geïnstalleerd.",
        "h3b": "Zonder terminal",
        "p3b": "Geen opdracht `claude` in je terminal? Vertel Claude Code dan waar de map staat, in `settings.json`:",
        "steps3b": [
            "Open `%USERPROFILE%\\.claude\\settings.json` in een teksteditor.",
            "Zoek `CLAUDE_CODE_PLUGIN_DIRS` in het blok `env`. Staat het er niet, voeg het dan toe.",
            "Voeg de map van de mod toe aan de waarde. Scheid mappen met een puntkomma (`;`).",
            "Sla het bestand op en start Claude Code opnieuw.",
        ],
        "code3b": "Het blok env met de add-on van de balk en de mod. In JSON schrijf je elke \\ twee keer.",
        "h_test": "9. Controleer of alles werkt",
        "p_test": "Tien minuten, zonder verbruik voor de waarschuwingen: de democijfers tonen elke kleur en elke knop. Gebruik een testmap, geen echt project. Doe de stappen in deze volgorde.",
        "test_tip_t": "Gebruik een testmap",
        "test_tip": "Close session en Start session schrijven CLAUDE.md, MEMORY.md en sessienotities. Probeer ze eerst in een lege map, bijvoorbeeld `Documents\\Test`, en open daar een nieuwe Claude Code-sessie.",
        "test_h": ["Doe dit", "Je ziet"],
        "tests": [
            ["De band", [
                ["Open een nieuwe sessie; typ nog niets", "Session, Week en Compress, Details rechts, en \"New session:\" met Start session"],
                ["Stuur één bericht", "De regel \"New session\" verdwijnt"],
            ]],
            ["De waarschuwingen (demo)", [
                ["`/meter demo here 85`", "Compress oranje; \"finish the task and update your session notes\" met Write session notes"],
                ["`/meter demo here 93`", "Compress rood; \"start a new session\" knippert; Close session en Compact"],
                ["`/meter demo 96`", "Session rood, Week 48 %; een korte melding over de limiet van 5 uur"],
                ["`/meter demo context 92 A`", "\"other: demo-A 92%\" in de band"],
                ["`/meter demo off`", "Weer je echte cijfers"],
            ]],
            ["Het detailpaneel", [
                ["Klik op Details", "Het paneel opent: limieten, Compress, laatste beurten, knoppen, andere sessies"],
                ["Klik nog eens op Details", "Het paneel sluit"],
            ]],
            ["De instellingen", [
                ["`/config`, de regels van ai-usage-meter", "De niveaus, de meldingen, Blink at red, de kleuren"],
                ["Zet Blink at red uit, dan `/meter demo here 93`", "Rood zonder knipperen (zet het daarna weer aan)"],
            ]],
            ["Close session en Start session", [
                ["Geef Claude een kleine taak, bijvoorbeeld: maak hello.txt", "Claude doet het"],
                ["Klik op Close session (paneel, of band bij rood)", "\"Closing session… step 1 of 6\" tot 6, dan \"✓ Now it's safe to end this session\""],
                ["Kijk in de testmap", "CLAUDE.md, MEMORY.md en de sessienotities, ingevuld"],
                ["Open daar een nieuwe sessie; klik op Start session voor je typt", "\"Preparing session…\", dan \"✓ Everything is ready to start this session\""],
                ["Lees het eerste antwoord van Claude", "Het gaat verder vanaf de overdracht van Close session"],
            ]],
            ["Veiligheid", [
                ["Klik op Close session en druk dan op Esc om Claude te stoppen", "Oranje: \"Close session stopped at step … of 6\", nooit groen"],
                ["Klik twee keer snel op Close session", "Een melding dat het al loopt"],
            ]],
        ],
        "steps8": [
            "Typ `claude plugin uninstall ai-usage-meter@ai-usage-meter`.",
            "Typ `claude plugin marketplace remove ai-usage-meter`.",
            "Start Claude Code opnieuw. Nu kun je de map van de mod verwijderen.",
        ],
        "p8": "Geïnstalleerd via `settings.json`? Haal dan in plaats daarvan de map, en de puntkomma ervoor, uit `CLAUDE_CODE_PLUGIN_DIRS`. De cijfers van de mod blijven in `%USERPROFILE%\\.claude` voor de balk; sessiebestanden ouder dan 7 dagen worden verwijderd.",
    },
    "DE": {
        "chapters": ("Die Kapitel 1 bis 9", "Die Kapitel 1 bis 10"),
        "p3": "Die Mod ist ein Ordner. Legen Sie ihn an einen Ort, an dem er bleiben kann, zum Beispiel `Documents\\AI Usage Meter Mod`: Claude Code liest die Mod aus diesem Ordner, verschieben oder löschen Sie ihn also später nicht.",
        "steps3": [
            "Entpacken Sie die Mod in diesen Ordner.",
            "Öffnen Sie ein Terminal (PowerShell unter Windows).",
            "Tippen Sie den Befehl unten, mit Ihrem eigenen Ordner zwischen den Anführungszeichen, und drücken Sie Enter.",
            "Beenden Sie die Claude-App und starten Sie sie neu, oder starten Sie eine neue `claude`-Sitzung im Terminal.",
            "Senden Sie eine Nachricht. Nach Claudes Antwort erscheint das Band über dem Eingabefeld.",
        ],
        "code3": "Ein Befehl fügt die Mod hinzu und installiert sie für jede Sitzung.",
        "try": f"Tippen Sie in einem Terminal `claude --plugin-dir \"{FOLDER}\"`. Die Mod wird dann nur für diese Sitzung geladen, und nichts wird installiert.",
        "h3b": "Ohne Terminal",
        "p3b": "Kein Befehl `claude` in Ihrem Terminal? Dann sagen Sie Claude Code in `settings.json`, wo der Ordner liegt:",
        "steps3b": [
            "Öffnen Sie `%USERPROFILE%\\.claude\\settings.json` in einem Texteditor.",
            "Suchen Sie `CLAUDE_CODE_PLUGIN_DIRS` im Block `env`. Fehlt der Eintrag, fügen Sie ihn hinzu.",
            "Fügen Sie den Ordner der Mod zum Wert hinzu. Trennen Sie Ordner mit einem Semikolon (`;`).",
            "Speichern Sie die Datei und starten Sie Claude Code neu.",
        ],
        "code3b": "Der Block env mit dem Add-on der Leiste und der Mod. In JSON wird jedes \\ doppelt geschrieben.",
        "h_test": "9. Prüfen, ob alles funktioniert",
        "p_test": "Zehn Minuten, ohne Nutzung für die Warnungen zu verbrauchen: Die Demowerte zeigen jede Farbe und jede Schaltfläche. Verwenden Sie einen Testordner, kein echtes Projekt. Gehen Sie die Schritte in dieser Reihenfolge durch.",
        "test_tip_t": "Verwenden Sie einen Testordner",
        "test_tip": "Close session und Start session schreiben CLAUDE.md, MEMORY.md und Sitzungsnotizen. Probieren Sie sie zuerst in einem leeren Ordner aus, zum Beispiel `Documents\\Test`, und öffnen Sie dort eine neue Claude Code-Sitzung.",
        "test_h": ["Tun Sie dies", "Sie sehen"],
        "tests": [
            ["Das Band", [
                ["Öffnen Sie eine neue Sitzung; tippen Sie noch nichts", "Session, Week und Compress, Details rechts, und „New session:“ mit Start session"],
                ["Senden Sie eine Nachricht", "Die Zeile „New session“ verschwindet"],
            ]],
            ["Die Warnungen (Demo)", [
                ["`/meter demo here 85`", "Compress orange; „finish the task and update your session notes“ mit Write session notes"],
                ["`/meter demo here 93`", "Compress rot; „start a new session“ blinkt; Close session und Compact"],
                ["`/meter demo 96`", "Session rot, Week 48 %; eine kurze Meldung zum 5-Stunden-Limit"],
                ["`/meter demo context 92 A`", "„other: demo-A 92%“ im Band"],
                ["`/meter demo off`", "Wieder Ihre echten Werte"],
            ]],
            ["Der Detailbereich", [
                ["Klicken Sie auf Details", "Der Bereich öffnet sich: Limits, Compress, letzte Runden, Schaltflächen, andere Sitzungen"],
                ["Klicken Sie noch einmal auf Details", "Der Bereich schließt sich"],
            ]],
            ["Die Einstellungen", [
                ["`/config`, die Zeilen von ai-usage-meter", "Die Stufen, die Meldungen, Blink at red, die Farben"],
                ["Schalten Sie Blink at red aus, dann `/meter demo here 93`", "Rot ohne Blinken (schalten Sie es danach wieder ein)"],
            ]],
            ["Close session und Start session", [
                ["Geben Sie Claude eine kleine Aufgabe, zum Beispiel: erstelle hello.txt", "Claude erledigt sie"],
                ["Klicken Sie auf Close session (Bereich, oder Band bei Rot)", "„Closing session… step 1 of 6“ bis 6, dann „✓ Now it's safe to end this session“"],
                ["Sehen Sie im Testordner nach", "CLAUDE.md, MEMORY.md und die Sitzungsnotizen, ausgefüllt"],
                ["Öffnen Sie dort eine neue Sitzung; klicken Sie vor dem Tippen auf Start session", "„Preparing session…“, dann „✓ Everything is ready to start this session“"],
                ["Lesen Sie Claudes erste Antwort", "Es macht bei der Übergabe von Close session weiter"],
            ]],
            ["Sicherheit", [
                ["Klicken Sie auf Close session und drücken Sie dann Esc, um Claude zu stoppen", "Orange: „Close session stopped at step … of 6“, nie grün"],
                ["Klicken Sie zweimal schnell auf Close session", "Eine Meldung, dass es schon läuft"],
            ]],
        ],
        "steps8": [
            "Tippen Sie `claude plugin uninstall ai-usage-meter@ai-usage-meter`.",
            "Tippen Sie `claude plugin marketplace remove ai-usage-meter`.",
            "Starten Sie Claude Code neu. Jetzt können Sie den Ordner der Mod löschen.",
        ],
        "p8": "Über `settings.json` installiert? Entfernen Sie dann stattdessen den Ordner und das Semikolon davor aus `CLAUDE_CODE_PLUGIN_DIRS`. Die Werte der Mod bleiben in `%USERPROFILE%\\.claude` für die Leiste; Sitzungsdateien, die älter als 7 Tage sind, werden gelöscht.",
    },
}

for lang, t in T.items():
    p = HERE / f"text_{lang}.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    if "h_test" in data:
        print(lang, "already done, skipped")
        continue
    old, new = t["chapters"]
    assert old in data["use"], (lang, "chapters line")
    data["use"] = data["use"].replace(old, new)
    n = int(data["h8"].split(".", 1)[0])
    data["h8"] = f"{n + 1}." + data["h8"].split(".", 1)[1]  # Remove it: 9 -> 10
    for k in ("p3", "steps3", "code3", "try", "h3b", "p3b", "steps3b", "code3b", "h_test", "p_test",
              "test_tip_t", "test_tip", "test_h", "tests", "steps8", "p8"):
        data[k] = t[k]
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(lang, "done:", data["h8"])
