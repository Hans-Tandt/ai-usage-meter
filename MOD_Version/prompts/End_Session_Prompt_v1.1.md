# End_Session_Prompt_v1.1.md — close every Claude session the safe way

Version 1.1 — 28 October 2026. Partner of `New_Session_Prompt_v1.3.md` (start). Works in any project:
data rooms, apps, reports, document sets. Paste the prompt below as the LAST message of a session.

**Goal:** nothing learned in this session is lost. After this check, a new session can continue
from the files alone (`CLAUDE.md`, `MEMORY.md`, session notes, `schema.md`), without this chat.

---

## When to use it

- Always before you close a session, also after a short one.
- At once when about 20 % of context is left before compaction (alarm at 80 %), or when Claude shows
  an alarm: a summary of older messages, a wrong path or column, the same mistake twice.
- Before a long pause (end of the day, weekend).

---

## The prompt

```text
Use the session-guard skill if it is available. Project folder: the folder we worked in during
this session (if that is not clear, ask me first).
We stop here. Do a complete end-of-session check. Read only first; change nothing until I say "go".
If context is low, keep answers short and save in this order: session notes first, then MEMORY.md,
then CLAUDE.md. If a summary of older messages appears during this check, stop, re-read CLAUDE.md,
MEMORY.md and the latest session note, and tell me.

STEP 1 – What happened in this session
- Every task done in this session, oldest first: what, result, files created or changed (exact paths).
- Every e-mail, letter or draft: sent, not sent, or must NOT be sent (and who decided).
- Every new fact (figure, date, name, finding) with its source document and page.
- Every decision or instruction I gave (who decided, date).
- Every new rule, path or way of working (for CLAUDE.md).
- Every open point and every question still waiting for an answer (from whom).
- Work still running or proposed elsewhere: other sessions, task cards, documents waiting for a reply.

STEP 2 – Compare with the files
- Read CLAUDE.md, MEMORY.md, ONLY the latest entry of the session notes, and schema.md if there
  is a database. CLAUDE.md says where the notes are and whether the newest entry is at the top
  or the bottom.
- For each item of STEP 1, say where it is already recorded, or "MISSING".
- Facts in MEMORY.md that this session proved wrong or out of date.
- Roles: no facts in CLAUDE.md, no rules or log in MEMORY.md. Say what is in the wrong file.
- Every path named in CLAUDE.md still exists on disk.
- Every deliverable of this session is in the project folder, not only in a temporary or scratch
  folder. List any file that would be lost when the session closes.
- No passwords, keys or private personal data in the .md files.

STEP 3 – Health check (on my computer, not in the cloud)
- Line count and size of CLAUDE.md (max 200 lines) and MEMORY.md (max 200 lines and 25 KB).
- Encoding and line endings of every .md file you will change (keep them as they are).
- If there is a search index: documents added or changed since the last build? Index row count
  vs schema.md. Say if the index must be rebuilt.
- If the session notes also exist as .docx (or another copy): is that copy older than the .md?
- Report PASS / WARN lines.

STEP 4 – Proposal (show it, do not write yet)
- Facts -> MEMORY.md (with source and "as of" date). Replace an old fact; never add a second version.
- Rules, paths, ways of working -> CLAUDE.md.
- The log of this session -> ONE new session-note entry, in this format:
    ## YYYY-MM-DD - <title>
    Done / Files changed or created / Verified how / Not done - open /
    Next step / New facts for MEMORY.md / New rules for CLAUDE.md / Session state
- Missing deliverables -> copy into the project folder (say where).
- IF MEMORY.md OR CLAUDE.md IS FULL (or would go over its limit):
    1. Propose which old or superseded parts move to docs/old_notes.md (moved unchanged, with a
       one-line pointer left behind). Never delete anything.
    2. If there is still no room: put the new facts or rules in the session-note entry under the
       heading "Waiting for MEMORY.md / CLAUDE.md (file full)", each with source and date, and add
       "First task next session: trim the file and move these items in" to "Next step".
- Show me the exact lines for each file, then wait for my "go".

STEP 5 – After my "go"
- Make a backup of every file before you change it (name_backup_YYYY-MM-DD.md, next to the file)
  and tell me where. Never delete a backup.
- Write the changes in the order: session notes, MEMORY.md, CLAUDE.md, other files.
  Keep encoding and line endings as they were.
- Check the result: line count and size again, the new session-note entry is at the right place,
  no old line was lost (compare with the backup).

STEP 6 – Final report (max 10 lines)
- Exact files, sections and line numbers changed, and the backup names.
- What is still open, and what is waiting for the next session (incl. drafts not to send).
- Anything not saved, and why.
- Then give me the exact first message for the next session.
- The very last line of your reply is ONE of these two, word for word:
    You are safe to close this session now
    !!! It's NOT safe to close this session, risk of losing data !!! – <reason>
  Use the first only when everything of this session is saved in the files.
```

---

## Notes

- **Nothing changes before "go".** The first answer is always the list and the proposal.
- **A full MEMORY.md is not a problem.** The facts wait safely in the session notes (no size limit);
  the next session moves them into MEMORY.md after trimming. They are never only in the chat.
- **Session notes first.** If the context runs out during the check, the log is already saved.
- **Our own reports are not proof.** Facts in MEMORY.md need a primary source (document and page).
- **Drafts that must not be sent** (e-mails, letters) are recorded with that warning, so a later
  session does not send them by mistake.
- If the skill's scripts are missing (for example after an app update), Claude does the same steps
  by hand and says so.

## Versions

- 1.1 — 28 Oct 2026: the last line is now a clear statement, not a question: "You are safe to close
  this session now" or "!!! It's NOT safe to close this session, risk of losing data !!!" with the
  reason; it comes after the first message for the next session. The project folder is the one of
  the session (nothing to fill in).
- 1.0 — 23 Oct 2026: first version (complete end-of-session check; full-file rule; save order;
  deliverables outside the project folder; index and .docx copy check).

*Licence: MIT — free to use, copy and adapt.*
