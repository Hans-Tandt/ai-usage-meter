# Check that everything works

About ten minutes. The demo figures show every colour and button without using your limits.
Use a **test folder** (for example `Documents\Test`), not a real project: Close session and Start session
write `CLAUDE.md`, `MEMORY.md` and session notes. Open a **new** Claude Code session in that folder.

The same list, in English, French, Dutch and German, is chapter 9 of the manual (`docs/out`).

## 0. Claude Code and the install

| Do this | You should see |
|---|---|
| In PowerShell: `claude --version` | 2.1.287 or later (older: `claude update`, then open a new PowerShell) |
| `claude plugin list` | `ai-usage-meter@ai-usage-meter`, the version, `Status: ✔ enabled`. "userConfig options not yet set" is normal |

## 1. The band

| Do this | You should see |
|---|---|
| Open a new session; do not type yet | **Details** at the left, then Session, Week and Compress, and "New session:" with **Start session** |
| Look at the robot beside **Details**, then send a message | It blinks now and then; while Claude works, its eyes scan |
| Pick Haiku in the model menu under the prompt (terminal: `/model`), then send a message | The Haiku robot (short antenna); the bar under it shows the effort |
| Send one message | The "New session" line disappears |
| Click Claude Code's `[-]` at the right end of the band | The band folds away to `[+]` |
| Click `[+]` (or press `ctrl+x ctrl+a`) | The band is back |

## 2. The warnings (demo)

| Do this | You should see |
|---|---|
| `/meter demo here 85` | Compress orange; "finish the task and update your session notes" with **Write session notes** |
| `/meter demo here 93` | Compress red; "start a new session" blinks; **Close session** and **Compact** |
| `/meter demo 96` | Session red, Week 48 %; a short message about the 5-hour limit |
| `/meter demo context 92 A` | "other: demo-A 92%" in the band |
| `/meter demo off` | Your real figures again |

## 3. The details pane

| Do this | You should see |
|---|---|
| Click **Details** | The pane opens: limits, Compress, the last turns, buttons, other sessions |
| Click **Details** again | The pane closes |
| Open it, close it with its own close mark, click **Details** | It opens again |

## 4. The settings

| Do this | You should see |
|---|---|
| Type `/meter settings` (or click **Details**, then **Settings**) | The settings at the bottom of the pane, each with a button |
| Click **−** next to **Cache clock: cache lifetime** | 5 min (set it back to 60 with **+** afterwards) |
| Switch **Blink at red** off, then `/meter demo here 93` | Red without blinking (switch it on again afterwards) |
| Switch **Little robot in the band** off | The robot is gone (switch it on again afterwards) |
| Set **Robot size** to 4 | A larger robot |
| Click **On** next to Haiku reader in the pane, then ask Claude to search the whole project | The runs count up; the band shows `Haiku … %` |
| Click **Details** next to it | Tokens per model, this session and this week |
| Set **Context: yellow from (tokens)** to 50000, then `/meter demo here 40` | `64k tokens: finish the task and update your session notes` (set it back afterwards) |
| After Claude's reply, look at the band | `cache 59m`, counting down; **Keep warm** in the pane |
| Switch on **Search helpers (Explore) on Haiku**, ask for a big search | Reader Details: search helpers started on Haiku: 1 or more |
| The bottom of the pane | With the strip installed: "The AI Usage Meter strip's Settings decide them" |

## 5. Close session and Start session

| Do this | You should see |
|---|---|
| Ask Claude a small task, for example: create `hello.txt` | Claude does it |
| Click **Close session** (pane, or band at red) | "Closing session… step 1 of 6" up to 6, then "✓ Now it's safe to end this session" |
| Look in the test folder | `CLAUDE.md`, `MEMORY.md` and the session notes, filled in |
| In the same session, do one more small task, then click **Close session** again | Still one note for this session, updated; its open steps kept word for word |
| Open a new session there; click **Start session** before typing | "Preparing session…", then "✓ Everything is ready to start this session" |
| Read Claude's first answer | It continues from the hand-over of Close session |

## 6. Safety

| Do this | You should see |
|---|---|
| Click **Close session**, then press Esc to stop Claude | Orange: "Close session stopped at step … of 6", never green |
| Click **Close session** twice quickly | A message that one is already running |
| Type `/meter close-session` | The same as the button |

## 7. Terminal (optional)

Run the same steps in a terminal session (`claude` in the test folder). The bars are lines there.
With `/tui fullscreen` and a window at least 110 columns wide, `/meter` opens the pane beside the conversation.

## For developers

In this folder: `claude plugin validate .` checks the plugin the way Claude Code loads it, and
`claude plugin test .` runs the automated tests (`tests/meter.test.tsx`) on the terminal and desktop surfaces.
