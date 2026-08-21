# Cash Runway

A monthly cashflow control sheet for my phone, ported from the Excel I actually use.

**The question it answers:** after everything still outstanding this month, how
much is left in each currency — and is that above the minimum balance I keep?

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
paid/pending status, and a line ticked paid drops out of the sum — so the
number always reflects what is still to come, not what already happened.
Ticking lines off as they clear is the daily loop; it's one tap per line.

**Currencies are separate pools.** AED, INR and USD each run the waterfall on
their own, because you can't pay an AED bill with rupees in an Indian account.
When a pool falls below its minimum balance, the app works out what to move
from whichever pool has the most spare, and what will actually land after the
transfer fee.

**Next month** reruns the same arithmetic: opening from this month's closing on
the assumption that you invest what was free and leave the minimum balance
behind, with every repeating line pending again, one-offs dropped, and cards
back to zero.

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

Data lives in `localStorage` on the device you use it on and never leaves the
phone — which also means it dies if you clear browser data. Settings has a
**Backup** box: copy that text somewhere safe, paste it back to restore.

## Deliberately not here

Bank sync. Login. Categories, budgets, tags. Transaction history and
reconciliation. Reports and analytics. A day-by-day timeline — the model is
status-driven, not date-driven, and carrying dates as well would double the
data entry for no gain.
