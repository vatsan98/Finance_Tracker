# Cash Runway

A deliberately small cashflow dashboard for my phone.

**The one question it answers:** what is the lowest my cash gets between now and
60 days from now, and on what day.

## How it works

- Enter what's in each bank account right now (**Balances**).
- Enter what you expect to move — salary, rent, card bills, SIPs, one-off dues (**In & Out**).
- The **Dashboard** walks forward day by day and shows the running balance, the
  low point, and where you land at the horizon.

Multi-currency: AED, INR and USD are projected as **separate cash pools**, because
you can't pay an AED bill with rupees sitting in an Indian account. Each pool's
numbers are exact. The combined total on top is converted using exchange rates you
type by hand in Settings — nothing is fetched, so there is no API key and no way
for a network failure to break the app.

## Running it

It's one file. Open `index.html` — locally, or from GitHub Pages, or anywhere.
No build step, no dependencies, no server, no account.

Data lives in `localStorage` on the device you use it on. It never leaves the phone.
That also means it dies if you clear browser data, so Settings has a **Backup** box:
copy that text somewhere safe, paste it back to restore.

## Deliberately not here

Bank sync. Login. Categories, budgets, tags. Transaction history and reconciliation.
Reports and analytics. Every one of those is why previous attempts got abandoned.
If something is genuinely missed after a month of real use, it gets added then.
