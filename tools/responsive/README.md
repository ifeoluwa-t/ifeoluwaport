# Screen simulator

One-time setup, from this folder: `npm install`

| Command | What it does |
|---|---|
| `npm run screens -- --label after` | screenshots all 12 pages at all 23 screen sizes (fold + full page) into `screenshots/after/` and builds `index.html` (contact sheet) |
| `npm run screens -- --label after --dpr2` | the same, plus 2x retina shots of 390x844, 1512x860, 2560x1300 |
| `npm run screens -- --pages index,work --sizes 1366x630,320x568 --label try` | just some pages / sizes |
| `node refcheck.mjs <old-checkout-dir>` | proves the reference sizes (1512x860, 390x844, 375x812) did not move versus an older copy of the site |
| `node contact.mjs after` | rebuilds the sheets (`compare.html` shows before | after when a `before` run exists) |

Every shot is also measured for sideways overflow, text under 13px, overlapping fixed buttons and touch targets under 44px
(flagged in red on the sheet). Uses your installed Google Chrome; set `CHROME=/path` to use another. Output is gitignored.
