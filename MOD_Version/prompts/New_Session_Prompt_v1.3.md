# New_Session_Prompt.md — start every Claude session the safe way

Works in any project: data rooms, apps, reports, document sets. Copy one of the prompts below and
paste it as the FIRST message of the new session. **Nothing to fill in or edit:** Claude first asks
you the questions it needs (which folder, which task), waits for your answers and works with them.

Version 1.3 · 28 October 2026 · changes at the bottom.

**Run it BEFORE the first task of a new project.** The memory files must exist before the work
starts, not after. When the memory files already exist, use Prompt A at the start and Prompt D at
the end of every session.

**Not sure which prompt? Use Prompt 0.** It finds out by itself whether the project is new, a normal
re-start, or a broken session. Prompts A-E are for when you already know.

| Situation | Prompt |
|---|---|
| New project folder, no `CLAUDE.md` / `MEMORY.md` yet | 0 or C — before the first task |
| Memory files exist, normal start | A |
| Previous session broke down ("memory loss") | B |
| Closing a session | D |
| Work already started in THIS session, but no memory files yet | E — before you close it |

---

## Best practice in 7 rules

1. **One task at a time.** End the session on a context warning (about 20 % before compaction) or a
   hard alarm, not after a number of tasks.
2. **End before you start.** Finish the old session with a session-note entry (what was done, what is
   open, the next step). The new session reads only that last entry.
3. **The memory lives in files, not in the chat.** `CLAUDE.md` = rules and paths. `MEMORY.md` = current
   facts with source and date. Session notes = the log. `schema.md` = the database, if there is one.
4. **Nothing changes until you say "go".** The first answer is always a short status, never an edit.
5. **Check, don't trust.** Counts, paths and figures are re-checked on disk, not taken from memory.
6. **Stop on alarms.** A summary of older messages appears, Claude uses a path or column that does
   not exist, or you correct the same mistake twice: stop and start a new session.
7. **Memory first, then work.** A new project starts with Prompt 0 or C. Memory files that already
   exist are never replaced: they are read, and only updated after your "go". Forgot at the start?
   Use Prompt E in the same session, before closing: what was only said in the chat cannot be
   recovered by a new session.

---

## Prompt 0 — universal start (new project OR re-start, it checks first)

```text
Use the session-guard skill if it is available.

Before anything else, ask me these questions in ONE short message and wait for my answers:
1. Project folder: is it the folder this session runs in? Show me that folder; I answer "yes" or
   give another one.
2. Today's task: one task, or "propose the next step"?
If this message already gives an answer (for example in lines added below it), use it and do not
ask that question again. Then continue below with my answers.

First find out which case this is. Read only; change nothing.
- Look for CLAUDE.md, MEMORY.md, a session-notes file (Session_Notes.md or *SESSION_NOTES*.md;
  CLAUDE.md may say where it is) and schema.md.
- Case NEW: none of these files exist (empty folder, or files but no memory files).
  -> Look at the folder: main subfolders, file count and types, any database or index.
     Propose the missing files with only what you can verify; mark the rest <to fill in>.
     Never overwrite an existing file.
- Case RE-START: the files exist.
  -> Read CLAUDE.md, then MEMORY.md, then ONLY the latest session-note entry (top or bottom:
     CLAUDE.md says which). Read schema.md before any SQL. Run the health check on my computer
     (not in the cloud). Do NOT create new memory files next to them and do NOT rewrite them:
     new facts or rules are proposed as exact lines and added only after my go.
- Case BROKEN: the files exist, but the latest note is cut off, older than our last working day,
  or MEMORY.md and the log disagree.
  -> Tell me what you found and propose the repair steps (split CLAUDE.md / MEMORY.md, fill the
     log gap) as a list. Change NO fact.

Then tell me in max 5 lines: the case you found and why, where we stand, every WARN line of the
health check, and the next step. Wait for my "go" before you change any file; after that, wait for
my go after each step.

Rules for this session:
- Before you overwrite or delete anything: look at it first, make a backup, and tell me where.
- Keep line endings and encoding of existing files as they are.
- Verify every figure against the source; name the source; mark what you cannot confirm [UNSURE].
- A source that disagrees with what I know from the field: I win, note the source as possibly stale.
- Give me clear confirmations: exact file, section and line changed.
- At the end, give me a prefilled session-note entry and ask before writing it. New facts for
  MEMORY.md or new rules for CLAUDE.md: show me the exact lines and ask first.
```

---

## Prompt A — normal start (use this most of the time)

```text
Use the session-guard skill if it is available.

Before anything else, ask me these questions in ONE short message and wait for my answers:
1. Project folder: is it the folder this session runs in? Show me that folder; I answer "yes" or
   give another one.
2. Today's task: one task, or "propose the next step from the latest note"?
If this message already gives an answer, use it and do not ask that question again.

1. Read CLAUDE.md, then MEMORY.md, then ONLY the latest entry of the session notes
   (the notes file may have another name, e.g. *_SESSION_NOTES.md; CLAUDE.md says where it is
   and whether the newest entry is at the top or the bottom). Read schema.md before any SQL.
2. Run the health check on my computer (not in the cloud): file count, index count, file sizes,
   CLAUDE.md / MEMORY.md limits (200 lines, MEMORY.md max 25 KB). Do not change anything.
3. Tell me in max 5 lines: where we stand, the open points, every WARN line, and the next step
   for today's task.

Rules for this session:
- Change no file until I say "go". Then work step by step and wait for my go after each step.
- Before you overwrite or delete anything: look at it first, make a backup, and tell me where.
- Keep line endings and encoding of existing files as they are.
- Verify every figure against the source; name the source; mark what you cannot confirm [UNSURE].
- A source that disagrees with what I know from the field: I win, note the source as possibly stale.
- Give me clear confirmations: exact file, section and line changed.
- At the end, give me a prefilled session-note entry and ask before writing it. New facts for
  MEMORY.md or new rules for CLAUDE.md: show me the exact lines and ask first.
```

---

## Prompt B — after a broken or confused session ("memory loss")

```text
Use the session-guard skill if it is available. The previous session broke down.

Before anything else, ask me these questions in ONE short message and wait for my answers:
1. Project folder: is it the folder this session runs in? Show me that folder; I answer "yes" or
   give another one.
2. Did I make backups of the memory files? Which files, or "none"?
If this message already gives an answer, use it and do not ask that question again.

1. Read CLAUDE.md, MEMORY.md and ONLY the latest session-note entry. Tell me if the log stops
   before the last day we worked, and where facts and log disagree.
2. Run the health check on my computer. Report the PASS/WARN lines. Explain each WARN in one line
   (check it with a read-only query; do not guess).
3. Check that CLAUDE.md holds only rules and paths, MEMORY.md only current facts (with source and
   date), and the log only history. Propose a split if needed: a list of each line that moves,
   from where, to where. Change NO fact. Old parts go to docs/old_notes.md, never deleted.
4. Write the result as CLAUDE_new.md and MEMORY_new.md next to the originals. I swap them myself.

Do not change any other file. Wait for my go after each step.
```

---

## Prompt C — first session in a NEW project (setup)

```text
Use the session-guard skill if it is available. This is a NEW project.

Before anything else, ask me these questions in ONE short message and wait for my answers:
1. Project folder: is it the folder this session runs in? Show me that folder; I answer "yes" or
   give another one.
2. What is the project, in one or two sentences?
If this message already gives an answer, use it and do not ask that question again.

1. Look at the folder (read-only): main subfolders, file count and types, any database or index.
2. Check which of CLAUDE.md, MEMORY.md, Session_Notes.md (or another notes file), schema.md exist.
3. For each missing file, propose its content: only what you can verify in the folder.
   Mark the rest <to fill in>. Never overwrite an existing file.
4. Show me the list of files you want to create and wait for my go.
```

---

## Prompt D — end of a session (use before you close it)

```text
We stop here. Give me the session-note entry for this session (done / files changed / verified how /
open / next step / new facts for MEMORY.md / new rules for CLAUDE.md / session state).
Only facts checked in this session. Ask before you write it, keep the file's line endings.
Then give me the exact first message for the next session.
```

For the complete check-up before closing (all .md files, full MEMORY.md, deliverables, index), use
`End_Session_Prompt_v1.1.md` in the same folder. Prompt D is the short version.

---

## Prompt E — late setup: work already done in this session, no memory files yet

Use it in the SAME session, before you close it. A new session cannot recover what was only said
in the chat (decisions, corrections, field facts).

```text
Use the session-guard skill if it is available.
We worked in this session without memory files. Create them now, before we close.
Project folder: the folder we worked in during this session. If that is not clear, ask me first.

1. Check which of CLAUDE.md, MEMORY.md, Session_Notes.md (or another notes file), schema.md
   exist. Never overwrite an existing file: if one exists, propose only the lines to add.
2. Draft the missing files from the folder AND from this session:
   - CLAUDE.md: paths, tools, rules and conventions we used.
   - MEMORY.md: current facts only, each with source and date. Use my LATEST corrections,
     not the first versions. Mark what is not confirmed [UNSURE].
   - Session_Notes.md: one entry for this session (done / files / verified how / open / next step).
3. Put the drafts in a scratch folder, show them to me, and wait for my go.
4. After my go: write them, run the health check, and give me the first message for the next
   session.
```

---

## Notes

- **Claude Code** loads `CLAUDE.md` by itself at the start. **Cowork** does not: the prompts above
  ask to read the files explicitly, so they work in both.
- **A WARN about a long session-notes file is normal** in a project that has run for a while. It only
  means "read the last entry, not the whole log". It is not an error and needs no fix.
- **"On my computer"** matters when the data is on your PC. The check must run where the data is.
  Never upload a data folder to the cloud only to count it.
- **Tools on Windows:** if a script needs Python libraries, check WHICH Python runs it (another
  program, e.g. Inkscape, can put its own Python first on the PATH). Write the right one in CLAUDE.md.
- **Search index:** after moving files, or after a run on another PC, re-check the index for
  duplicate rows and stale paths before trusting a search result.
- **Our own reports are not proof.** A search hit in our own notes or reports points to the source;
  it never replaces it.

---

## Changes

- **v1.3 · 28 October 2026** — Nothing to fill in or edit: every prompt first asks its questions
  (project folder, today's task; backups in B, what the project is in C), waits for the answers
  and works with them. An answer already given in the message is not asked again.
- **v1.2 · 27 October 2026** — Run the prompt BEFORE the first task of a new project; table
  "which prompt when"; rule 7 "memory first, then work"; Prompt 0 RE-START never creates or
  rewrites existing memory files; new Prompt E for a late setup in the same session.
- **v1.1 · 23 October 2026** — previous version (`New_Session_Prompt_v1.1.md`, kept unchanged).

*Licence: MIT — free to use, copy and adapt.*
