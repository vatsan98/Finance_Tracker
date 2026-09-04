# Cash Runway

A monthly cashflow control sheet for my phone, ported from the Excel I actually use.

**The question it answers:** after everything still outstanding in the month
I'm looking at, how much is left in each currency — and is that above the
minimum balance I keep?

## Picking a month

A picker at the top of every tab — `‹ August 2026 ›` — moves the whole app one
month at a time, backwards or forwards as far as you like. The middle button
names the month you're on and jumps straight back to the current one.

**Every month holds its own figures.** Balances, card outstandings, and each
income/due line's paid status all belong to a single month. Ticking rent off in
August leaves it outstanding in September, and typing a balance for March 2027
changes nothing about any other month.

**A month you haven't touched assumes the conservative case** rather than
showing a blank: every account sits at its own minimum balance, every card is
paid off, and every line is still outstanding. That's an assumption, not a
projection from the month before — a bad August never quietly poisons
September's starting point. The moment you type one figure, only that figure
stops being assumed; everything else on the month stays assumed until you
touch it. An **AUTO** tag on the Accounts tab marks what's still assumed.

Clearing a figure back to its assumption removes it entirely, so a month you've
emptied is indistinguishable from one you never opened.

**One-off lines belong to one month.** A due that doesn't repeat carries the
month it's for, set when you add it and changeable from its edit screen; it
appears in that month only. Repeating lines appear in every month.

## The model

Per currency, mirroring the spreadsheet's `Monthly Control` sheet line for line:

```
  bank balances
+ income outstanding        salary, deductions, transfers in
− card outstanding          what's sitting on the credit cards
− dues outstanding          EMIs, rent, family, one-offs
− spending provision        monthly budget × days left in the cycle ÷ 30
= net available
− set aside to invest
= balance after set-aside   measured against the minimum balance
```

**Outstanding is the whole idea.** Every income and due line carries a
paid/pending status *per month*, and a line ticked paid drops out of that
month's sum — so the number always reflects what is still to come, not what
already happened. Ticking lines off as they clear is the daily loop; it's one
tap per line.

**Currencies are separate pools.** AED, INR and USD each run the waterfall on
their own, because you can't pay an AED bill with rupees in an Indian account.
When a pool falls below its minimum balance, the app works out what to move
from whichever pool has the most spare, and what will actually land after the
transfer fee.

**Any other month** reruns the same arithmetic against that month's own
figures — whatever you've typed for it, and its assumptions for whatever you
haven't. The spending provision is the one line that differs: only the month
actually running is part-spent, so it's the only one pro-rated to the days
left; every other month budgets a full thirty.

## Two deliberate changes from the spreadsheet

- **The exchange rate and the transfer fee are separate fields.** The sheet
  baked a `*0.9975` haircut into the INR rate itself, which meant the fee was
  also applied when merely valuing INR in AED. Here the rate is the market rate
  and the haircut applies only when money actually moves. Enter ~26.07, not the
  fee-adjusted 26.00.
- **The spending provision rolls to the next cycle date.** The sheet measured
  to the current month's cycle day, so the provision fell to zero for the rest
  of the month once that date passed. This counts to the next occurrence, so it
  refills instead of vanishing.

## Running it

One file, no build step, no dependencies, no server, no account. Open
`index.html` locally or from GitHub Pages. Fonts are inlined, so it makes zero
network requests and works offline.

There are tests, and they need nothing installed either:

```
node test/run.js
```

They lift the `<script>` straight out of `index.html` and run it against a
stubbed DOM and `localStorage`, so what's under test is the shipped file rather
than a copy of it — including the click handler, which the tests fire through
the app's own event delegation. Three suites: upgrading a v2 device, month
arithmetic and the defaulting rule, and the editing interactions.

Data lives in `localStorage` on the device you use it on and never leaves the
phone — which also means it dies if you clear browser data. Settings has a
**Backup** box: copy that text somewhere safe, paste it back to restore.

## Syncing between devices

Optional. Off unless you fill it in, and the app works exactly as before without it.

State lives as one `state.json` in a **private GitHub repo of your own** — no new
service, no third party holding your balances, and every save is a commit you can
read back or roll back.

**Setting it up**

1. Create a private repo, e.g. `vatsan98/cashflow-data`. It can be empty; the
   first sync writes the file.
2. Make a **fine-grained personal access token** (GitHub → Settings → Developer
   settings → Personal access tokens → Fine-grained): repository access limited
   to that one repo, permission **Contents: read and write**. Nothing else.
3. In the app, Settings → *Sync across devices* → paste the repo and the token.
   Repeat on each device.

The token is held under its own storage key on that device. It never reaches a
backup, and never reaches the synced file.

**How clashes are handled.** The app records which remote version the local state
came from. If the remote has moved on since — because another device wrote —
and this device also has unsent edits, the write is refused and you are asked
which copy wins. Nothing is merged behind your back and nothing is overwritten
silently. Clock skew between devices is irrelevant; it compares lineage, not
timestamps.

Syncing happens when the app opens, when it returns to the foreground, and a
second or so after any edit.

## Deliberately not here

Bank sync. Login. Categories, budgets, tags. Transaction history and
reconciliation. Reports and analytics. A day-by-day timeline — the model is
status-driven, not date-driven, and carrying dates as well would double the
data entry for no gain.
