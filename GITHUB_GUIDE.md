# GitHub, Branching, and Not Breaking the Site — A Beginner's Guide

Written for the Couch Cinema Collective team. No prior knowledge assumed.

---

## 1. What is GitHub, actually?

Git is a **save-point system** for code. Every "commit" is a snapshot of the
entire project you can go back to — like save slots in a video game. GitHub
is the **shared online copy** of those save points, so two people can work on
the same project without emailing files back and forth.

Our project lives at:
**github.com/Couch-Cinema-Collective/development**

One thing makes our setup special, and it's the reason this whole guide
exists:

> ⚠️ **The `main` branch IS the live website.** Every push to `main`
> automatically deploys to couchcinemacollective.com within about a minute,
> via Vercel. Push broken code to `main` and the live site breaks.

Everything below is about making that impossible to do by accident.

---

## 2. The eight words you need

| Word | What it means |
|---|---|
| **Repository (repo)** | The project folder, with its full history. |
| **Commit** | One saved snapshot, with a message describing what changed. |
| **Branch** | A parallel copy of the code where you can work without touching the live version. Think "my own draft." |
| **`main`** | The one special branch that is the real, live site. |
| **Push** | Upload your commits to GitHub. |
| **Pull** | Download the latest commits from GitHub. |
| **Pull request (PR)** | "I'd like to merge my branch into `main` — someone look at it first." This is where you see what changed, comment, and approve. |
| **Merge** | Accept the PR; the branch's changes become part of `main` (and deploy). |

---

## 3. The golden rules

1. **Never work directly on `main`.** Always make a branch first. Even for
   tiny changes. This is the whole system.
2. **Pull before you start.** Someone else may have pushed since yesterday.
3. **One branch = one piece of work.** "Fix ballot bug" and "redesign
   homepage" are two branches, not one.
4. **Commit messages say what and why.** "Fix invite link showing localhost"
   beats "changes" or "stuff."
5. **The other person merges your PR.** Not a hard rule at our size, but
   reviewing each other's work is how you both learn the codebase — and how
   typos get caught before they're live.
6. **Never commit secrets.** `.env.local` holds our API keys and is
   deliberately ignored by git. If a key ever ends up in a commit, tell the
   team — it needs to be rotated, not just deleted.
7. **Delete branches after merging.** GitHub offers a button. The work is
   in `main`; the branch is trash now.

---

## 4. The everyday recipe

This is the loop you'll run every time you build something. Terminal
commands are typed inside the project folder.

**Start fresh:**

```bash
git checkout main        # go to the main branch
git pull                 # get the latest code
git checkout -b jack/fix-ballot-typo    # make YOUR branch (name/what-it-does)
```

**Work.** Edit files, run `npm run dev`, check it in the browser at
localhost:3000.

**Save and upload:**

```bash
git add -A                                  # stage everything you changed
git commit -m "Fix typo on the ballot header"   # snapshot with a message
git push -u origin jack/fix-ballot-typo     # upload the branch to GitHub
```

**Open the pull request.** The push prints a link — click it (or go to the
repo on github.com; a yellow banner offers "Compare & pull request"). Write
one or two sentences on what you changed and why. Click **Create pull
request**.

**Review and merge.** The other person opens the PR, clicks the **Files
changed** tab (green lines = added, red = removed), and if it looks right,
clicks **Merge pull request** → **Delete branch**.

**That merge deploys the site.** Give it a minute, then check
couchcinemacollective.com.

**Start your next task from step one** — back to `main`, pull, new branch.

---

## 5. Seeing what changed (your release log)

You don't need extra tools — GitHub already logs everything:

- **The commit list** (repo → the "commits" link on the Code tab, or press
  `.` history): every snapshot ever, newest first, with messages.
- **Closed pull requests** (Pull requests tab → Closed): the best
  human-readable changelog — each PR is one shipped feature or fix, with
  its description and discussion.
- **Optional — Releases:** when something notable ships (say, "Season 1
  launch"), go to the repo → Releases → **Draft a new release**, tag it
  (`v0.2`), and write a few bullets of what's new. This gives you a clean,
  dated release history on the repo's front page. Nice to have, not
  required.

---

## 6. When things go wrong (they will — it's fine)

**"My push was rejected."** Someone pushed before you. Run
`git pull --rebase`, then push again.

**Merge conflict.** You and the other dev changed the same lines. Git marks
the file with `<<<<<<<` / `=======` / `>>>>>>>` fences showing both
versions. Open the file, keep the right version, delete the fence lines,
then `git add -A` and `git commit` (or `git rebase --continue` if you were
rebasing). Conflicts feel scary; they're just git asking you to pick.

**"I accidentally committed to main but haven't pushed."** Run
`git checkout -b rescue-branch` — your commit moves to a new branch, then
`git checkout main` and `git pull`. Nothing bad happened.

**"I want to throw away my local changes."**
`git checkout -- .` discards edits you haven't committed. Careful — really
gone.

**Truly stuck?** Nothing you do on a *branch* can hurt the live site.
Worst case, delete the branch and start over. That's the safety the system
buys you.

---

## 7. One-time setup for a new developer

1. **Get added to the repo:** the owner goes to repo → Settings →
   Collaborators → Add people (your GitHub username).
2. **Install the tools:** [git](https://git-scm.com) and
   [Node.js](https://nodejs.org) (LTS version).
3. **Clone the project:**
   ```bash
   git clone https://github.com/Couch-Cinema-Collective/development.git
   cd development
   npm install
   ```
4. **Get the secrets:** copy `.env.example` to `.env.local` and ask Jack
   for the real values (they are never in git, on purpose).
5. **Run it:** `npm run dev` → open http://localhost:3000.
6. Tell git who you are (shows up on your commits):
   ```bash
   git config user.name "Your Name"
   git config user.email "you@example.com"
   ```

## 8. Recommended: protect `main`

In repo → Settings → Branches → **Add branch ruleset** for `main`, enable
"Require a pull request before merging." After that, git will physically
refuse direct pushes to `main` — the guardrail becomes automatic instead
of remembered. Highly recommended once both of you are pushing regularly.
